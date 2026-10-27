# Brief para el agente: mantener fases, partidos y tabla de posiciones

Este es el texto que recibe el agente (sesión de Claude Code en este repo o tarea programada) cada vez que
la liga manda novedades. Complementa al skill `.claude/skills/ingesta-ranking/SKILL.md`, que describe cómo
leer los PDFs y armar el payload; aquí está el **qué hacer en cada corrida, con qué acceso y qué informar**.

## 1. Contexto en tres líneas

- La app (https://rankingrivastenis.vercel.app) muestra a cada jugador sus partidos de la fase, el contacto
  del rival, el WhatsApp para proponer horario y el mail de resultado. Los datos viven en Supabase.
- La liga (`ligasmunicipales@rivasciudad.es`) manda PDFs por mail: contactos, calendario de cada grupo,
  ranking general con puntos por fase y horarios de pistas. Ese mail **no llega** a la cuenta de Gmail
  conectada a Claude, así que Gaston pasa los PDFs a mano (los arrastra al chat o los deja en
  `pdfs-reales/`, carpeta ignorada por git).
- Toda escritura en la base pasa por la RPC `public.cargar_ingesta(payload jsonb)`. Es transaccional e
  idempotente por `gmail_message_id`. No se escribe en tablas a mano.

## 2. Acceso a Supabase

El conector MCP de Supabase de Claude **no ve este proyecto** (está en otra organización). Se usa la API
REST con la clave secreta que está en `.env.local` (no está en git; nunca imprimirla ni pegarla en el chat):

```bash
set -a; source .env.local; set +a   # carga NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
```

Comprobar si un mail o carga ya se procesó:

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/ingestas?select=id,asunto_mail,creado_at,resumen&gmail_message_id=eq.<id>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Ejecutar la ingesta (el cuerpo envuelve el payload en la clave `payload`, que es el nombre del parámetro):

```bash
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/cargar_ingesta" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" --data-binary @payload.json
```

donde `payload.json` es `{"payload": { ...payload del skill... }}`. Guardar el payload en el scratchpad de la
sesión, no en el repo (tiene datos personales). La respuesta es `{"estado":"ok","ingesta_id":…,
"resumen":{…},"avisos":[…]}` o `{"estado":"duplicada",…}`.

Para leer el texto de los PDFs no hay `pdftotext` en el Mac: crear un venv con `pypdf` en el scratchpad y
ejecutarlo con `python -I`.

## 3. Qué se carga y con qué clave del payload

| Dato                                           | Llega en                                                                        | Clave del payload                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| Directorio de contactos                        | `CONTACTOS RANKING TENIS 26-27.pdf`                                             | `contactos`                         |
| Fase, grupos y partidos (calendario)           | `RANKING DE TENIS Nª FASE GRUPO X.pdf` (tabla Partidos con `IdPartido`)         | `calendarios`                       |
| Resultados oficiales y clasificación del grupo | `RANKING DE TENIS Nª FASE GRUPO X.pdf` (secciones "Clasificación" y "Partidos") | `resultados` (migración 0006)       |
| Ranking general y femenino (puntos por fase)   | `RANKING TENIS GENERAL FASE N.pdf`                                              | `ranking` (migración 0006)          |
| Horarios de alquiler de pistas                 | `Horarios…RANKING TENIS 26-27.pdf`                                              | No se carga; se anota en `archivos` |

La RPC ignora en silencio cualquier clave del payload que no conozca. `resultados` y `ranking` existen desde
la migración `0006_resultados.sql`: antes de mandarlos por primera vez, comprobar que está aplicada
(`select 1 from information_schema.tables where table_name = 'resultados_oficiales'`, o por REST
`GET /rest/v1/resultados_oficiales?select=partido_id&limit=1` sin error). Si no lo está, pedirle a Gaston
que la pegue en el SQL Editor del dashboard y no cargar resultados hasta entonces.

## 4. Rutina en cada corrida

1. **Recoger las novedades.** PDFs que pasó Gaston o, si algún día el mail llega a la casilla conectada,
   mails de `ligasmunicipales@rivasciudad.es` con adjuntos de los últimos 30 días.
2. **Identificar la carga.** Si viene de un mail, `gmail_message_id` es el id del mensaje. Si es manual,
   usar la convención `manual-YYYY-MM-DD-faseN-grupoX` (la fase 2 grupo H se cargó como
   `manual-2026-10-27-fase2-grupoH`). Comprobar en `ingestas` que no exista; si existe, informar y parar.
3. **Clasificar cada PDF** por el título de la primera página con la tabla del skill y extraer solo lo que
   corresponde. Nombres tal cual (mayúsculas, acentos, incluso erratas como `FER´NANDEZ`): la base
   normaliza para cruzar.
4. **Armar el payload** siguiendo el skill y `agente/ejemplos/fase2.json`. Un mail (o un lote manual) es
   una llamada. Si trae varios grupos, todos van en `calendarios`.
5. **Ejecutar la RPC** y **verificar**: `contactos_leidos` ≈ filas del PDF de contactos (80 en 2026-27),
   `partidos_nuevos` = 28 por grupo de 8, `jugadores_creados_sin_contacto` = 0. Un calendario que ya estaba
   cargado y vuelve con cambios da `partidos_modificados` > 0 y avisos `partido_modificado`: listarlos.
   Con resultados: `resultados_nuevos` + `resultados_modificados` = partidos con resultado en el PDF,
   `resultados_sin_partido` = 0 (si no, revisar los avisos `partido_no_encontrado`: casi siempre es un
   nombre mal unido entre dos líneas), `clasificacion_filas` = jugadores del grupo, y leer cada
   `resultado_discrepante`: dice quién envió qué desde la app y qué dice la liga. La liga manda.
6. **Informar** (sección 7). Recordar que una fase nueva queda **sin publicar**: Gaston la revisa en
   `/admin/fases`, la marca actual y la publica.

Cuando llega una **fase nueva** (cambio de grupos): se carga igual que la fase 2. La fase anterior no se
borra ni se toca; el cambio de "fase actual" lo hace Gaston en la app.

## 5. Formato de los PDFs que ya conocemos

- **Calendario de grupo**: columnas V, J, Local, Visitante, Instalación, Fecha, Hora, IdPartido. La fecha es
  el lunes de la semana. Los nombres se parten en dos líneas; la segunda (sin V/J/fecha/id) continúa el
  nombre. Instalación y hora vienen vacías (`00:00`): no significan nada.
- **Ranking general** (`RANKING DE TENIS 2026/2027`): columnas POSICIÓN, RANKISTA, PUNTOS, FASE 1 … FASE 5.
  Los tres primeros no llevan ordinal; del 4º en adelante `Nº`. La columna `x2` del encabezado es un
  artefacto del PDF. La segunda página mezcla el final del ranking masculino con una sección
  `RANKING FEMENINO 2026/2027` (ordinales con `ª`) y el texto sale desordenado: reconstruir cada tabla por
  su posición y comprobar que los puntos sean decrecientes. Hay nombres repetidos entre ambas tablas (las
  jugadoras figuran en las dos).
- **Resultados y clasificación del grupo** (`RANKING DE TENIS 1ª FASE GRUPO E.pdf`, ejemplo real de la fase 1):
  lleva **el mismo título que el calendario**, así que hay que distinguirlos por el contenido. El
  calendario tiene la columna `IdPartido`; el de resultados tiene dos secciones:
  - `Clasificación`: columnas Pos, Equipo, J, G, E, P, GF, GC, PS, PT, S, NP. `Equipo` es el jugador;
    GF/GC son sets ganados y perdidos; PT son los puntos del grupo (2 por victoria, 0 por derrota);
    E, PS, S y NP salen a 0 o vacíos (empates, puntos de sanción, sanciones, no presentados). Guardar las
    columnas tal cual, sin recalcular.
  - `Partidos`: columnas V, J, Local, (sets local), Visitante, (sets visitante), Resultado, Parcial.
    `Resultado` es `Gana Local` o `Gana Visitante` y `Parcial` los sets entre paréntesis:
    `(6-3, 4-6, 1-0)`. **No trae IdPartido**: el partido se identifica por fase, grupo, vuelta, jornada y
    los dos nombres. Un tercer set `1-0` es un super tie-break; se guarda tal como viene. Los nombres
    largos siguen partidos en dos líneas, igual que en el calendario.
    La liga manda este PDF al cerrar la fase; también puede llegar a mitad de fase con las jornadas jugadas
    hasta la fecha. **El resultado oficial es el de la liga**; lo que los jugadores mandan desde la app
    (`resultados_enviados`) es provisional y sirve para contrastar.

## 6. Resultados y posiciones: contrato del payload (migración 0006)

`resultados_enviados` guarda lo que cada jugador manda desde la app; es provisional. La migración
`0006_resultados.sql` añade lo oficial:

- `resultados_oficiales` (una fila por partido, upsert por `partido_id`): `sets` jsonb
  (`[[6,3],[4,6],[1,0]]`, mismo formato que `resultados_enviados`, sin validación estricta porque el
  super tie-break viene como `1-0`), `ganador_id` tomado de `Gana Local/Visitante` (si falta, se deduce de
  los sets), `sets_local`, `sets_visitante`, `ingesta_id`. El partido se resuelve por `id_partido` si viene,
  y si no por (fase, grupo, vuelta, jornada, local, visitante) con nombres normalizados; si no cuadra, aviso
  `partido_no_encontrado` y ese resultado no se carga. Un PDF de resultados **no crea** fases, grupos ni
  jugadores: si el grupo no tiene calendario cargado, aviso `grupo_no_encontrado`.
- `clasificacion_grupo` (una fila por jugador y grupo): la tabla del PDF es completa, así que se reemplaza
  entera en cada carga. Un nombre que no esté en el calendario del grupo da `jugador_no_en_grupo`.
- `ranking_general`: temporada, tipo (`general`/`femenino`), fecha de corte, posición, `jugador_id`,
  puntos totales y puntos por fase. Se reemplaza entero por (temporada, tipo). Un nombre que no esté en el
  directorio se crea sin contacto (aviso `jugador_sin_contacto`), igual que en los calendarios.
- Las dos claves nuevas del payload (`ranking` admite un objeto o un array con general y femenino):

```json
"resultados": [
  { "fase": 1, "grupo": "E",
    "clasificacion": [
      { "posicion": 1, "nombre": "DANIEL DE LA TORRE BARAJAS", "j": 7, "g": 7, "e": 0, "p": 0,
        "gf": 14, "gc": 2, "ps": 0, "pt": 14, "s": null, "np": 0 }
    ],
    "partidos": [
      { "vuelta": 1, "jornada": 1, "local": "MARTA UGARTE LÓPEZ", "visitante": "BORJA DE LA FUENTE MUÑOZ",
        "sets_local": 2, "sets_visitante": 1, "ganador": "local", "sets": [[6, 1], [1, 6], [6, 2]] }
    ]
  }
],
"ranking": {
  "tipo": "general", "temporada": "2026-27", "fecha_corte": "2026-10-20",
  "posiciones": [
    { "posicion": 1, "nombre": "SERGIO VALDIVIA YUPANQUI", "puntos": 1000, "por_fase": { "1": 1000 } }
  ]
}
```

- En la app: en `/partidos` el resultado oficial manda y el partido queda cerrado; si solo hay uno enviado
  por un jugador se muestra como pendiente de que la liga lo publique. `/clasificacion` muestra la tabla y
  todos los resultados del grupo; `/ranking`, el general y el femenino. Al cargar, la RPC cruza
  `resultados_enviados` con el oficial y devuelve avisos `resultado_discrepante` (quién lo envió, qué puso
  y qué dice la liga). Un tercer set `1-0` de la liga y un `10-7` del jugador cuentan como el mismo.
- Ejemplo completo con nombres ficticios: `agente/ejemplos/resultados-fase2.json` (es el que corre en
  `pnpm db:test`).

## 7. Informe al terminar

Pocas líneas, en español:

- Qué se procesó (mail o lote manual, `gmail_message_id`, archivos).
- `resumen` tal cual y los `avisos` agrupados por tipo (`jugador_sin_contacto`, `telefono_invalido`,
  `email_invalido`, `partido_modificado`, `partido_no_encontrado`, `grupo_no_encontrado`,
  `jugador_no_en_grupo`, `resultado_discrepante`).
- Archivos que no se cargaron y por qué (ranking, horarios, PDF ilegible, formato desconocido).
- Qué le toca a Gaston: publicar la fase, aprobar vínculos en `/admin/usuarios`, decidir sobre la
  migración de resultados/posiciones.

## 8. Nunca

- Marcar una fase como publicada o actual, borrar o modificar filas a mano, tocar RLS o el esquema.
- Imprimir la clave secreta ni guardar payloads con datos personales dentro del repo.
- Inventar nombres, teléfonos, emails, resultados o puntos que no estén en los documentos.
- Cargar exparticipantes, el ranking general o los horarios como contactos o calendarios.
- Mandar `resultados` o `ranking` sin comprobar que la migración 0006 está aplicada, y dar la carga por buena.
- Corregir un resultado oficial "porque el jugador dice otra cosa": la liga manda; la discrepancia se informa.

## Prompt para pegar

> Eres el agente de datos del Ranking de Tenis de Rivas. Lee `agente/BRIEF.md` y
> `.claude/skills/ingesta-ranking/SKILL.md` de este repo y síguelos al pie de la letra. Procesa los PDFs
> que te paso (o los mails nuevos de ligasmunicipales@rivasciudad.es si tienes Gmail): comprueba en
> `ingestas` que no estén cargados, arma el payload, ejecuta `cargar_ingesta` por REST con las claves de
> `.env.local` sin mostrarlas, verifica los contadores y respóndeme con el informe de la sección 7. Un PDF de
> grupo con "Clasificación" y "Partidos" va en `resultados`; el ranking general y femenino, en `ranking`
> (sección 6). Lee con atención los avisos `resultado_discrepante` y `partido_no_encontrado` y dímelos.
