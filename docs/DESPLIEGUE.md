# Despliegue y puesta en marcha

Pasos manuales, en orden. Los que dicen "yo" los hace Claude desde una sesión con los conectores de
Supabase y GitHub; el resto los hace Gaston.

## 1. Supabase (Gaston, 5 min)

1. En https://supabase.com/dashboard crear un proyecto nuevo en la organización actual.
   - Nombre: `rankingtenis`. **Región: Frankfurt (eu-central-1)**. Plan Free.
2. En _Project Settings → API_ copiar:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secreta; solo en Vercel, nunca en el cliente)
3. Pasárselas a Claude (o ponerlas en `.env.local`).

Yo entonces aplico `supabase/migrations/*.sql` en orden con el MCP de Supabase (`apply_migration`), reviso
`get_advisors` (seguridad y rendimiento) y hago una carga de prueba con `agente/ejemplos/fase2.json`.

Las migraciones posteriores (p. ej. `0006_resultados.sql`: resultados oficiales, clasificación y ranking) se
pegan en el SQL Editor del dashboard en orden; `cargar_ingesta` se redefine entera en cada una.

Antes de aplicar `0004_semilla.sql`, confirmar que el email admin es el correcto (hoy:
`corbalan.gaston@gmail.com`). Añadir otro: `insert into public.admins_semilla values ('otro@mail.com');`.

## 2. Google login (Gaston, 10 min)

1. https://console.cloud.google.com → proyecto nuevo "Ranking Tenis Rivas".
2. _APIs y servicios → Pantalla de consentimiento OAuth_: tipo **Externo**, nombre de la app, email de
   soporte, dominio de la app (el de Vercel). Scopes: ninguno extra (quedan `openid`, `email`, `profile`,
   que no son sensibles: no hace falta verificación ni hay tope de 100 usuarios).
   Publicar la app (estado "En producción") para que no caduquen los accesos.
3. _Credenciales → Crear credenciales → ID de cliente OAuth → Aplicación web_.
   - Orígenes autorizados: `https://<tu-app>.vercel.app` (y `http://localhost:3000` para desarrollo).
   - URI de redirección: `https://<ref>.supabase.co/auth/v1/callback` (la muestra Supabase en el paso 4).
4. Supabase → _Authentication → Providers → Google_: activar, pegar Client ID y Client Secret.
5. Supabase → _Authentication → URL Configuration_:
   - Site URL: `https://<tu-app>.vercel.app`
   - Redirect URLs: `https://<tu-app>.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`.

## 3. Vercel (Gaston, 5 min)

1. https://vercel.com/new → importar `ImGaston/rankingtenis`. Framework: Next.js (lo detecta).
2. Variables de entorno (Production y Preview): las de `.env.example`.
   - `NEXT_PUBLIC_SITE_URL` = `https://<tu-app>.vercel.app`
   - `CRON_SECRET` = una cadena aleatoria larga (`openssl rand -hex 32`).
   - `LIGA_EMAIL` = `ligasmunicipales@rivasciudad.es`
3. Deploy. El cron semanal de `vercel.json` (lunes 07:00 UTC → `/api/cron/ping`) evita que Supabase
   pause el proyecto por inactividad.

## 4. Gmail (Gaston, 2 min)

El mail de la liga llega a la casilla personal, pero el conector de Gmail de Claude está en la de trabajo
(`gaston@blackbirdhm.com`). Dos opciones:

- **A. Conectar la personal.** En claude.ai → Configuración → Conectores → Gmail, añadir la cuenta personal.
- **B. Reenviar.** En el Gmail personal: _Configuración → Reenvío_ añadir `gaston@blackbirdhm.com` y
  confirmar; luego un filtro `from:ligasmunicipales@rivasciudad.es` → "Reenviar a". El agente buscará
  en la casilla de trabajo.

## 5. Agente de ingesta (Claude + Gaston)

El skill está en `.claude/skills/ingesta-ranking/SKILL.md` y el brief operativo (acceso por REST, rutina,
qué se carga y qué no, informe) en `agente/BRIEF.md`. Se ejecuta de dos formas:

- **Tarea programada** (semanal, p. ej. martes 08:30 Europe/Madrid), sesión nueva por corrida con los
  conectores **Gmail** y **Supabase**. Prompt:

  > Ejecuta el skill de ingesta del Ranking de Tenis de Rivas (`.claude/skills/ingesta-ranking/SKILL.md`
  > del repo ImGaston/rankingtenis). Busca mails nuevos de ligasmunicipales@rivasciudad.es con PDFs,
  > carga los que no estén en `public.ingestas` con `cargar_ingesta` y responde con el resumen y los
  > avisos. Si no hay mails nuevos, responde "sin novedades".

- **A mano**: abrir un chat con Claude con los conectores activos (o arrastrar los PDFs) y pedir
  "ejecuta la ingesta del ranking".

Primera corrida: hacerla a mano con los 4 PDFs de la fase 2 para comprobar que el conector de Gmail
entrega el contenido de los adjuntos. Si solo da metadatos, el camino es el manual (arrastrar PDFs).

## 6. Primer uso (Gaston)

1. Entrar en la app con Google usando el email admin.
2. `/admin/fases`: revisar la fase 2 (8 jugadores en el grupo H con teléfono y email, 28 partidos),
   marcarla **actual** y **publicar**.
3. `/partidos`: comprobar los 7 partidos (4 de local destacados), el WhatsApp y el mail de resultado.
4. Antes de invitar al resto del grupo: avisar a la coordinación de la liga de que existe la app y qué
   datos usa (están en `/privacidad`). Al guardar datos de terceros, Gaston es el responsable del tratamiento.
5. Invitar a los 7 del grupo: entran con el email que tienen en la lista de la liga y quedan vinculados solos.
   Si alguien usa otro email, elige su nombre y Gaston lo aprueba en `/admin/usuarios`.

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local   # y completar
pnpm dev                      # http://localhost:3000
pnpm test                     # unitarios (plantillas, sets, franjas, nombres)
pnpm db:test                  # PostgreSQL local: migraciones + RPC + RLS
pnpm lint && pnpm typecheck && pnpm build
```

Para probar sin Google en local, activar el proveedor Email en Supabase Auth y crear un usuario de prueba
cuyo email coincida con un jugador cargado; el trigger lo vincula solo.

## Fin de temporada

Borrar los datos personales: `truncate public.propuestas_horario, public.resultados_enviados,
public.partidos, public.grupo_jugadores, public.grupos, public.fases, public.ingestas; delete from
public.jugadores;` y despublicar. Los usuarios (solo email) se pueden conservar o borrar desde Auth.
