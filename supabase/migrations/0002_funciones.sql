-- Funciones de apoyo, trigger de alta de usuario y RPC de ingesta.

-- ¿El usuario autenticado es admin?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.rol = 'admin'
  );
$$;

-- Jugador vinculado al usuario autenticado (null si no está vinculado).
create or replace function public.mi_jugador_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.jugador_id from public.usuarios u where u.id = auth.uid();
$$;

-- ¿El grupo pertenece a una fase publicada y el usuario es miembro?
create or replace function public.es_mi_grupo(grupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.grupo_jugadores gj
    join public.grupos g on g.id = gj.grupo_id
    join public.fases f on f.id = g.fase_id
    where gj.grupo_id = grupo
      and gj.jugador_id = public.mi_jugador_id()
      and f.publicada
  );
$$;

-- Alta de usuario: crea la fila en usuarios, cruza el email con el
-- directorio de jugadores y aplica el rol admin si figura en la semilla.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(new.email));
  v_jugador uuid;
  v_rol text := 'jugador';
begin
  select j.id into v_jugador
  from public.jugadores j
  where j.email_normalizado = v_email
  order by j.creado_at
  limit 1;

  if exists (select 1 from public.admins_semilla a where a.email = v_email) then
    v_rol := 'admin';
  end if;

  insert into public.usuarios (id, email, nombre_google, rol, jugador_id, estado_vinculo)
  values (
    new.id,
    v_email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    v_rol,
    v_jugador,
    case when v_jugador is null then 'sin_vincular' else 'automatico' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nombres (solo id y nombre) de la fase actual, para que un usuario sin
-- vínculo elija el suyo. No expone teléfono ni email.
create or replace function public.listar_jugadores_fase()
returns table (id uuid, nombre text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct j.id, j.nombre
  from public.jugadores j
  join public.grupo_jugadores gj on gj.jugador_id = j.id
  join public.grupos g on g.id = gj.grupo_id
  join public.fases f on f.id = g.fase_id
  where f.es_actual
    and auth.uid() is not null
  order by j.nombre;
$$;

-- Un usuario sin vínculo solicita ser un jugador concreto. Queda pendiente
-- de aprobación del admin.
create or replace function public.solicitar_vinculo(jugador uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not exists (select 1 from public.jugadores j where j.id = jugador) then
    raise exception 'Jugador inexistente';
  end if;
  update public.usuarios
  set jugador_solicitado_id = jugador,
      estado_vinculo = 'pendiente'
  where id = auth.uid()
    and jugador_id is null;
  if not found then
    raise exception 'El usuario ya está vinculado';
  end if;
end;
$$;

-- Devuelve el id del jugador con ese nombre; lo crea si no existe.
-- Se usa desde cargar_ingesta.
create or replace function public.obtener_o_crear_jugador(p_nombre text, out p_id uuid, out p_creado boolean)
language plpgsql
set search_path = ''
as $$
declare
  v_nombre text := regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
begin
  if public.normalizar_nombre(v_nombre) is null then
    raise exception 'Nombre de jugador vacío';
  end if;
  p_creado := false;
  select j.id into p_id from public.jugadores j
  where j.nombre_normalizado = public.normalizar_nombre(v_nombre);
  if p_id is null then
    insert into public.jugadores (nombre) values (v_nombre) returning id into p_id;
    p_creado := true;
  end if;
end;
$$;

-- RPC única para el agente de ingesta. Transaccional e idempotente.
-- Payload:
-- {
--   "origen": "agente" | "manual",
--   "gmail_message_id": "…" (opcional, da idempotencia),
--   "asunto_mail": "…", "recibido_at": "2026-10-20T10:00:00Z", "archivos": ["a.pdf"],
--   "temporada": "2026-27",
--   "contactos": [{"nombre": "…", "telefono": "6XXXXXXXX", "email": "…"}],
--   "calendarios": [{"fase": 2, "grupo": "H", "partidos": [
--      {"id_partido": "108999", "vuelta": 1, "jornada": 1, "semana": "2026-10-26",
--       "local": "NOMBRE LOCAL", "visitante": "NOMBRE VISITANTE"}]}]
-- }
create or replace function public.cargar_ingesta(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_msg text := nullif(trim(payload ->> 'gmail_message_id'), '');
  v_origen text := coalesce(payload ->> 'origen', 'agente');
  v_temporada text := coalesce(nullif(trim(payload ->> 'temporada'), ''), '2026-27');
  v_avisos jsonb := '[]'::jsonb;
  v_contacto jsonb;
  v_calendario jsonb;
  v_partido jsonb;
  v_nombre text;
  v_tel text;
  v_email text;
  v_jugador uuid;
  v_fase_id uuid;
  v_fase_num int;
  v_grupo_id uuid;
  v_grupo_letra text;
  v_local uuid;
  v_visitante uuid;
  v_creado boolean;
  n_contactos int := 0;
  n_jug_nuevos int := 0;
  n_jug_actualizados int := 0;
  n_jug_creados_sin_contacto int := 0;
  n_grupos int := 0;
  n_partidos_nuevos int := 0;
  n_partidos_actualizados int := 0;
  v_ingesta_id uuid;
  v_resumen jsonb;
begin
  if v_origen not in ('agente', 'manual') then
    raise exception 'origen inválido: %', v_origen;
  end if;

  if v_msg is not null and exists (select 1 from public.ingestas i where i.gmail_message_id = v_msg) then
    return jsonb_build_object(
      'estado', 'duplicada',
      'mensaje', 'Este mail ya fue procesado; no se cambió nada'
    );
  end if;

  -- 1. Directorio de contactos ------------------------------------------------
  for v_contacto in select * from jsonb_array_elements(coalesce(payload -> 'contactos', '[]'::jsonb))
  loop
    v_nombre := regexp_replace(trim(coalesce(v_contacto ->> 'nombre', '')), '\s+', ' ', 'g');
    if public.normalizar_nombre(v_nombre) is null then
      continue;
    end if;
    n_contactos := n_contactos + 1;

    v_tel := public.normalizar_telefono(v_contacto ->> 'telefono');
    if nullif(trim(coalesce(v_contacto ->> 'telefono', '')), '') is not null and v_tel is null then
      v_avisos := v_avisos || jsonb_build_object(
        'tipo', 'telefono_invalido', 'nombre', v_nombre, 'valor', v_contacto ->> 'telefono');
    end if;

    v_email := lower(nullif(trim(coalesce(v_contacto ->> 'email', '')), ''));
    if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      v_avisos := v_avisos || jsonb_build_object(
        'tipo', 'email_invalido', 'nombre', v_nombre, 'valor', v_email);
      v_email := null;
    end if;

    select j.id into v_jugador from public.jugadores j
    where j.nombre_normalizado = public.normalizar_nombre(v_nombre);

    if v_jugador is null then
      insert into public.jugadores (nombre, telefono, email)
      values (v_nombre, v_tel, v_email);
      n_jug_nuevos := n_jug_nuevos + 1;
    else
      update public.jugadores
      set telefono = coalesce(v_tel, telefono),
          email = coalesce(v_email, email)
      where id = v_jugador
        and (telefono is distinct from coalesce(v_tel, telefono)
             or email is distinct from coalesce(v_email, email));
      if found then
        n_jug_actualizados := n_jug_actualizados + 1;
      end if;
    end if;
  end loop;

  -- 2. Calendarios por grupo --------------------------------------------------
  for v_calendario in select * from jsonb_array_elements(coalesce(payload -> 'calendarios', '[]'::jsonb))
  loop
    v_fase_num := (v_calendario ->> 'fase')::int;
    v_grupo_letra := upper(trim(coalesce(v_calendario ->> 'grupo', '')));
    if v_fase_num is null or v_grupo_letra !~ '^[A-Z]$' then
      raise exception 'Calendario sin fase o grupo válidos: %', v_calendario;
    end if;

    insert into public.fases (temporada, numero)
    values (v_temporada, v_fase_num)
    on conflict (temporada, numero) do update set temporada = excluded.temporada
    returning id into v_fase_id;

    insert into public.grupos (fase_id, letra)
    values (v_fase_id, v_grupo_letra)
    on conflict (fase_id, letra) do update set letra = excluded.letra
    returning id into v_grupo_id;
    n_grupos := n_grupos + 1;

    for v_partido in select * from jsonb_array_elements(coalesce(v_calendario -> 'partidos', '[]'::jsonb))
    loop
      select p_id, p_creado into v_local, v_creado
      from public.obtener_o_crear_jugador(v_partido ->> 'local');
      if v_creado then
        n_jug_creados_sin_contacto := n_jug_creados_sin_contacto + 1;
        v_avisos := v_avisos || jsonb_build_object(
          'tipo', 'jugador_sin_contacto', 'nombre', trim(v_partido ->> 'local'),
          'detalle', 'Aparece en un calendario pero no en el directorio de contactos');
      end if;

      select p_id, p_creado into v_visitante, v_creado
      from public.obtener_o_crear_jugador(v_partido ->> 'visitante');
      if v_creado then
        n_jug_creados_sin_contacto := n_jug_creados_sin_contacto + 1;
        v_avisos := v_avisos || jsonb_build_object(
          'tipo', 'jugador_sin_contacto', 'nombre', trim(v_partido ->> 'visitante'),
          'detalle', 'Aparece en un calendario pero no en el directorio de contactos');
      end if;

      if v_local = v_visitante then
        raise exception 'Partido % con el mismo jugador de local y visitante', v_partido ->> 'id_partido';
      end if;

      insert into public.grupo_jugadores (grupo_id, jugador_id)
      values (v_grupo_id, v_local), (v_grupo_id, v_visitante)
      on conflict do nothing;

      if exists (select 1 from public.partidos p where p.id_partido = trim(v_partido ->> 'id_partido')) then
        update public.partidos
        set grupo_id = v_grupo_id,
            vuelta = coalesce((v_partido ->> 'vuelta')::int, 1),
            jornada = (v_partido ->> 'jornada')::int,
            semana = (v_partido ->> 'semana')::date,
            local_id = v_local,
            visitante_id = v_visitante
        where id_partido = trim(v_partido ->> 'id_partido')
          and (grupo_id, vuelta, jornada, semana, local_id, visitante_id) is distinct from
              (v_grupo_id, coalesce((v_partido ->> 'vuelta')::int, 1), (v_partido ->> 'jornada')::int,
               (v_partido ->> 'semana')::date, v_local, v_visitante);
        if found then
          n_partidos_actualizados := n_partidos_actualizados + 1;
          v_avisos := v_avisos || jsonb_build_object(
            'tipo', 'partido_modificado', 'id_partido', trim(v_partido ->> 'id_partido'));
        end if;
      else
        insert into public.partidos (grupo_id, id_partido, vuelta, jornada, semana, local_id, visitante_id)
        values (
          v_grupo_id,
          trim(v_partido ->> 'id_partido'),
          coalesce((v_partido ->> 'vuelta')::int, 1),
          (v_partido ->> 'jornada')::int,
          (v_partido ->> 'semana')::date,
          v_local,
          v_visitante
        );
        n_partidos_nuevos := n_partidos_nuevos + 1;
      end if;
    end loop;
  end loop;

  -- 3. Re-cruzar usuarios sin vínculo por email -------------------------------
  update public.usuarios u
  set jugador_id = j.id,
      estado_vinculo = 'automatico',
      jugador_solicitado_id = null
  from public.jugadores j
  where u.jugador_id is null
    and j.email_normalizado = u.email;

  -- 4. Registro ---------------------------------------------------------------
  v_resumen := jsonb_build_object(
    'contactos_leidos', n_contactos,
    'jugadores_nuevos', n_jug_nuevos,
    'jugadores_actualizados', n_jug_actualizados,
    'jugadores_creados_sin_contacto', n_jug_creados_sin_contacto,
    'grupos', n_grupos,
    'partidos_nuevos', n_partidos_nuevos,
    'partidos_modificados', n_partidos_actualizados
  );

  insert into public.ingestas (origen, gmail_message_id, asunto_mail, recibido_at, archivos, resumen, avisos)
  values (
    v_origen,
    v_msg,
    payload ->> 'asunto_mail',
    (payload ->> 'recibido_at')::timestamptz,
    coalesce(payload -> 'archivos', '[]'::jsonb),
    v_resumen,
    v_avisos
  )
  returning id into v_ingesta_id;

  return jsonb_build_object(
    'estado', 'ok',
    'ingesta_id', v_ingesta_id,
    'resumen', v_resumen,
    'avisos', v_avisos
  );
end;
$$;

-- Solo el service role (agente vía MCP, servidor) puede cargar datos.
revoke all on function public.cargar_ingesta(jsonb) from public, anon, authenticated;
revoke all on function public.obtener_o_crear_jugador(text) from public, anon, authenticated;
grant execute on function public.cargar_ingesta(jsonb) to service_role;
grant execute on function public.obtener_o_crear_jugador(text) to service_role;
