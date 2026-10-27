#!/usr/bin/env bash
# Base de datos PostgreSQL local para probar las migraciones y la RLS sin
# Docker ni Supabase CLI. Emula lo mínimo del entorno Supabase: esquema auth
# con auth.users y auth.uid(), esquema extensions y los roles anon,
# authenticated y service_role.
#
#   scripts/db-local.sh start   # inicia el clúster en .pgdata (puerto 54329)
#   scripts/db-local.sh reset   # recrea la base y aplica las migraciones
#   scripts/db-local.sh test    # start + reset + scripts/db-test.sql
#   scripts/db-local.sh psql    # abre psql
#   scripts/db-local.sh stop
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN=${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)}
PGDATA=${PGDATA:-$PWD/.pgdata}
PGPORT=${PGPORT:-54329}
DB=rankingtenis
export PGHOST=/tmp PGPORT PGUSER=postgres PGDATABASE=$DB

# El servidor no puede correr como root: si hace falta, se delega al usuario
# de sistema "postgres" (existe con el paquete postgresql).
como_pg() {
  if [ "$(id -u)" = "0" ]; then
    runuser -u postgres -- "$@"
  else
    "$@"
  fi
}

start() {
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    mkdir -p "$PGDATA"
    [ "$(id -u)" = "0" ] && chown postgres:postgres "$PGDATA"
    como_pg "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
  fi
  if ! como_pg "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    como_pg "$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PGPORT -k /tmp -c listen_addresses=''" -l "$PGDATA/log" start >/dev/null
  fi
}

stop() { como_pg "$PGBIN/pg_ctl" -D "$PGDATA" stop >/dev/null 2>&1 || true; }

reset() {
  psql -d postgres -v ON_ERROR_STOP=1 -q <<SQL
drop database if exists $DB;
create database $DB;
SQL
  psql -v ON_ERROR_STOP=1 -q <<'SQL'
-- Emulación mínima de Supabase
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists extensions;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;
grant usage on schema public, extensions, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
SQL
  for f in supabase/migrations/*.sql; do
    echo "aplicando $f"
    psql -v ON_ERROR_STOP=1 -q -f "$f"
  done
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  reset) start; reset ;;
  psql) start; shift; psql "$@" ;;
  test) start; reset; psql -v ON_ERROR_STOP=1 -q -f scripts/db-test.sql ;;
  *) echo "uso: $0 {start|stop|reset|psql|test}"; exit 1 ;;
esac
