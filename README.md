# Ranking Tenis Rivas

Web app para los jugadores del Ranking de Tenis de las ligas municipales de Rivas-Vaciamadrid. Muestra tus
partidos de la fase, el contacto del rival, arma el WhatsApp para proponer horario y el mail de resultado con
la plantilla oficial de la liga.

- **Datos**: un agente de Claude lee los mails de `ligasmunicipales@rivasciudad.es`, extrae los PDFs y
  carga Supabase con la RPC `cargar_ingesta` (ver `.claude/skills/ingesta-ranking/SKILL.md`).
- **Acceso**: login con Google (solo email). La app te reconoce por el email que figura en la lista de la
  liga; si no coincide, eliges tu nombre y el administrador lo aprueba.
- **Privacidad**: cada jugador ve solo los contactos de su grupo (RLS). Nada es público ni se indexa.

## Stack

Next.js 16 (App Router) · Tailwind 4 · Supabase (Postgres, Auth, RLS) · Vercel · Vitest.

## Estructura

```
src/app/(publico)     landing, privacidad
src/app/(app)         vincular, partidos, proponer horario, resultado, marcar W.O.
src/app/(admin)       fases, usuarios, ingestas
src/lib/dominio       tipos, nombres, validación de sets
src/lib/mensajes      WhatsApp, mail de resultado, franjas horarias
src/lib/consultas     lecturas tipadas con el cliente de servidor
supabase/migrations   esquema, funciones, RLS, semilla, walkovers (W.O.)
scripts/db-local.sh   PostgreSQL local para probar migraciones y RLS (pnpm db:test)
agente/ejemplos       payload de ejemplo para cargar_ingesta
docs/DESPLIEGUE.md    pasos de puesta en marcha
```

## Comandos

```bash
pnpm dev        # desarrollo
pnpm test       # unitarios
pnpm db:test    # migraciones + RPC + RLS en PostgreSQL local
pnpm lint && pnpm typecheck && pnpm build
```

Ver `docs/DESPLIEGUE.md` para Supabase, Google OAuth, Vercel y la tarea programada del agente.
