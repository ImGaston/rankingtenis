-- Ranking Tenis Rivas: esquema base.
-- Convención: nombres en español, uuid como clave, timestamps con zona.

create extension if not exists unaccent with schema extensions;

-- Normaliza un nombre para usarlo como clave de cruce entre PDFs con
-- acentuación inconsistente: mayúsculas, sin diacríticos ni signos,
-- espacios colapsados. IMMUTABLE para poder usarla en columnas generadas.
create or replace function public.normalizar_nombre(entrada text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    trim(
      regexp_replace(
        regexp_replace(
          upper(extensions.unaccent('extensions.unaccent', coalesce(entrada, ''))),
          '[´`''’]', '', 'g'
        ),
        '[^A-Z0-9]+', ' ', 'g'
      )
    ),
    ''
  );
$$;

-- Normaliza un teléfono español a E.164 (+34XXXXXXXXX). Devuelve null si no
-- se reconoce el formato.
create or replace function public.normalizar_telefono(entrada text)
returns text
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  digitos text := regexp_replace(coalesce(entrada, ''), '[^0-9+]', '', 'g');
begin
  if digitos = '' then
    return null;
  end if;
  if left(digitos, 2) = '00' then
    digitos := '+' || substr(digitos, 3);
  end if;
  if left(digitos, 1) = '+' then
    digitos := substr(digitos, 2);
    if digitos ~ '^34[6-9][0-9]{8}$' then
      return '+' || digitos;
    end if;
    if digitos ~ '^[0-9]{8,15}$' then
      return '+' || digitos;
    end if;
    return null;
  end if;
  if digitos ~ '^34[6-9][0-9]{8}$' then
    return '+' || digitos;
  end if;
  if digitos ~ '^[6-9][0-9]{8}$' then
    return '+34' || digitos;
  end if;
  return null;
end;
$$;

-- Emails con permiso de administración. El trigger de alta de usuario los lee.
create table public.admins_semilla (
  email text primary key check (email = lower(email))
);

create table public.fases (
  id uuid primary key default gen_random_uuid(),
  temporada text not null,
  numero int not null check (numero between 1 and 12),
  publicada boolean not null default false,
  es_actual boolean not null default false,
  creado_at timestamptz not null default now(),
  unique (temporada, numero)
);
create unique index fases_actual_unica on public.fases (es_actual) where es_actual;

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  fase_id uuid not null references public.fases (id) on delete cascade,
  letra text not null check (letra ~ '^[A-Z]$'),
  unique (fase_id, letra)
);

-- Directorio de jugadores de la temporada. La clave de cruce es el nombre
-- normalizado porque los PDFs de la liga no traen ningún identificador.
create table public.jugadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nombre_normalizado text generated always as (public.normalizar_nombre(nombre)) stored,
  telefono text check (telefono is null or telefono ~ '^\+[0-9]{8,15}$'),
  email text,
  email_normalizado text generated always as (lower(trim(email))) stored,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  unique (nombre_normalizado)
);
create index jugadores_email_normalizado_idx on public.jugadores (email_normalizado);

create table public.grupo_jugadores (
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  jugador_id uuid not null references public.jugadores (id) on delete cascade,
  primary key (grupo_id, jugador_id)
);
create index grupo_jugadores_jugador_idx on public.grupo_jugadores (jugador_id);

create table public.partidos (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  id_partido text not null unique,
  vuelta int not null default 1,
  jornada int not null check (jornada between 1 and 30),
  semana date not null,
  local_id uuid not null references public.jugadores (id),
  visitante_id uuid not null references public.jugadores (id),
  check (local_id <> visitante_id)
);
create index partidos_grupo_idx on public.partidos (grupo_id);
create index partidos_local_idx on public.partidos (local_id);
create index partidos_visitante_idx on public.partidos (visitante_id);

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre_google text,
  rol text not null default 'jugador' check (rol in ('jugador', 'admin')),
  jugador_id uuid references public.jugadores (id) on delete set null,
  estado_vinculo text not null default 'sin_vincular'
    check (estado_vinculo in ('sin_vincular', 'automatico', 'pendiente', 'aprobado', 'rechazado')),
  jugador_solicitado_id uuid references public.jugadores (id) on delete set null,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now()
);
create index usuarios_jugador_idx on public.usuarios (jugador_id);

create table public.propuestas_horario (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  franjas jsonb not null default '[]'::jsonb,
  texto text not null,
  creado_at timestamptz not null default now()
);
create index propuestas_partido_idx on public.propuestas_horario (partido_id);

create table public.resultados_enviados (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  fecha_partido date not null,
  sets jsonb not null,
  ganador_id uuid not null references public.jugadores (id),
  observaciones text,
  asunto text not null,
  cuerpo text not null,
  creado_at timestamptz not null default now()
);
create index resultados_partido_idx on public.resultados_enviados (partido_id);

-- Registro de cada corrida del agente de ingesta (o carga manual).
create table public.ingestas (
  id uuid primary key default gen_random_uuid(),
  origen text not null check (origen in ('agente', 'manual')),
  gmail_message_id text unique,
  asunto_mail text,
  recibido_at timestamptz,
  archivos jsonb not null default '[]'::jsonb,
  resumen jsonb not null default '{}'::jsonb,
  avisos jsonb not null default '[]'::jsonb,
  creado_at timestamptz not null default now()
);

create or replace function public.tocar_actualizado_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_at := now();
  return new;
end;
$$;

create trigger jugadores_actualizado before update on public.jugadores
  for each row execute function public.tocar_actualizado_at();
create trigger usuarios_actualizado before update on public.usuarios
  for each row execute function public.tocar_actualizado_at();
