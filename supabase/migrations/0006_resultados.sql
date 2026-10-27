-- Resultados oficiales, clasificación de grupo y ranking general que comunica
-- la liga. El resultado oficial es el de la liga; lo que mandan los jugadores
-- desde la app (resultados_enviados) es provisional y se contrasta al cargar.

-- Tablas ---------------------------------------------------------------------

create table public.resultados_oficiales (
  partido_id uuid primary key references public.partidos (id) on delete cascade,
  ganador_id uuid not null references public.jugadores (id),
  -- [[6,1],[1,6],[6,2]] como en resultados_enviados. Sin validación estricta:
  -- la liga anota el super tie-break como 1-0.
  sets jsonb not null default '[]'::jsonb,
  sets_local int not null check (sets_local between 0 and 3),
  sets_visitante int not null check (sets_visitante between 0 and 3),
  ingesta_id uuid references public.ingestas (id) on delete set null,
  actualizado_at timestamptz not null default now()
);

create table public.clasificacion_grupo (
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  jugador_id uuid not null references public.jugadores (id) on delete cascade,
  posicion int not null check (posicion >= 1),
  jugados int not null default 0,
  ganados int not null default 0,
  empatados int not null default 0,
  perdidos int not null default 0,
  sets_favor int not null default 0,
  sets_contra int not null default 0,
  puntos_sancion int not null default 0,
  puntos int not null default 0,
  sanciones int,
  no_presentados int not null default 0,
  ingesta_id uuid references public.ingestas (id) on delete set null,
  actualizado_at timestamptz not null default now(),
  primary key (grupo_id, jugador_id)
);
create index clasificacion_grupo_orden_idx on public.clasificacion_grupo (grupo_id, posicion);

create table public.ranking_general (
  temporada text not null,
  tipo text not null check (tipo in ('general', 'femenino')),
  jugador_id uuid not null references public.jugadores (id) on delete cascade,
  posicion int not null check (posicion >= 1),
  puntos int not null default 0,
  -- {"1": 1000, "2": 850}
  por_fase jsonb not null default '{}'::jsonb,
  fecha_corte date,
  ingesta_id uuid references public.ingestas (id) on delete set null,
  actualizado_at timestamptz not null default now(),
  primary key (temporada, tipo, jugador_id)
);
create index ranking_general_orden_idx on public.ranking_general (temporada, tipo, posicion);

-- RLS ------------------------------------------------------------------------

alter table public.resultados_oficiales enable row level security;
alter table public.clasificacion_grupo enable row level security;
alter table public.ranking_general enable row level security;

create policy resultados_oficiales_select on public.resultados_oficiales
  for select to authenticated using (
    public.es_admin()
    or exists (select 1 from public.partidos p where p.id = partido_id and public.es_mi_grupo(p.grupo_id))
  );

create policy clasificacion_grupo_select on public.clasificacion_grupo
  for select to authenticated using (public.es_admin() or public.es_mi_grupo(grupo_id));

-- El ranking general lo ve cualquier jugador vinculado, pero los nombres de
-- fuera de su grupo no están en jugadores (RLS): se leen con listar_ranking.
create policy ranking_general_select on public.ranking_general
  for select to authenticated using (public.es_admin() or public.mi_jugador_id() is not null);

-- Ranking general con nombres (sin teléfono ni email) para jugadores vinculados.
create or replace function public.listar_ranking(p_temporada text default null)
returns table (
  temporada text,
  tipo text,
  posicion int,
  jugador_id uuid,
  nombre text,
  puntos int,
  por_fase jsonb,
  fecha_corte date
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.temporada, r.tipo, r.posicion, r.jugador_id, j.nombre, r.puntos, r.por_fase, r.fecha_corte
  from public.ranking_general r
  join public.jugadores j on j.id = r.jugador_id
  where auth.uid() is not null
    and (public.es_admin() or public.mi_jugador_id() is not null)
    and r.temporada = coalesce(p_temporada, (select max(x.temporada) from public.ranking_general x))
  order by r.tipo, r.posicion;
$$;
grant execute on function public.listar_ranking(text) to authenticated;
revoke execute on function public.listar_ranking(text) from anon;

-- Apoyo ----------------------------------------------------------------------

-- '6-1 1-6 6-2' a partir de [[6,1],[1,6],[6,2]].
create or replace function public.sets_a_texto(p_sets jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(string_agg((s ->> 0) || '-' || (s ->> 1), ' ' order by o), '')
  from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) with ordinality as t(s, o);
$$;

-- Dos resultados cuentan como el mismo si tienen los mismos sets, salvo en el
-- tercero, donde basta que lo gane el mismo lado: la liga anota el super
-- tie-break como 1-0 y el jugador puede haber puesto 10-7.
create or replace function public.sets_equivalentes(a jsonb, b jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  n int := jsonb_array_length(coalesce(a, '[]'::jsonb));
  i int;
  sa jsonb;
  sb jsonb;
begin
  if n <> jsonb_array_length(coalesce(b, '[]'::jsonb)) then
    return false;
  end if;
  for i in 0 .. n - 1 loop
    sa := a -> i;
    sb := b -> i;
    if i < 2 then
      if sa <> sb then
        return false;
      end if;
    elsif sign((sa ->> 0)::int - (sa ->> 1)::int) <> sign((sb ->> 0)::int - (sb ->> 1)::int) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- RPC de ingesta ---------------------------------------------------------------
-- Misma firma que en 0002 (la 0005 la ocupa otra rama). Añade al payload:
--   "resultados": [{"fase": 1, "grupo": "E",
--      "clasificacion": [{"posicion": 1, "nombre": "…", "j": 7, "g": 7, "e": 0, "p": 0,
--                         "gf": 14, "gc": 2, "ps": 0, "pt": 14, "s": null, "np": 0}],
--      "partidos": [{"vuelta": 1, "jornada": 1, "local": "…", "visitante": "…",
--                    "sets_local": 2, "sets_visitante": 1, "ganador": "local",
--                    "sets": [[6,1],[1,6],[6,2]], "id_partido": "108999" (opcional)}]}],
--   "ranking": {"tipo": "general", "temporada": "2026-27", "fecha_corte": "2026-10-20",
--      "posiciones": [{"posicion": 1, "nombre": "…", "puntos": 1000, "por_fase": {"1": 1000}}]}
--   ("ranking" también puede ser un array: general y femenino en el mismo PDF).
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
  v_resultado jsonb;
  v_fila jsonb;
  v_ranking jsonb;
  v_rankings jsonb;
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
  v_partido_id uuid;
  v_ganador uuid;
  v_sets jsonb;
  v_sets_local int;
  v_sets_visitante int;
  v_lado text;
  v_previo record;
  v_enviado record;
  v_tipo text;
  v_temp_ranking text;
  v_fecha_corte date;
  n_contactos int := 0;
  n_jug_nuevos int := 0;
  n_jug_actualizados int := 0;
  n_jug_creados_sin_contacto int := 0;
  n_grupos int := 0;
  n_partidos_nuevos int := 0;
  n_partidos_actualizados int := 0;
  n_res_nuevos int := 0;
  n_res_modificados int := 0;
  n_res_sin_partido int := 0;
  n_res_discrepantes int := 0;
  n_clasif int := 0;
  n_ranking int := 0;
  v_ingesta_id uuid := gen_random_uuid();
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

  -- 0. Registro de la ingesta (se completa al final; si algo falla, se deshace todo)
  insert into public.ingestas (id, origen, gmail_message_id, asunto_mail, recibido_at, archivos)
  values (
    v_ingesta_id,
    v_origen,
    v_msg,
    payload ->> 'asunto_mail',
    (payload ->> 'recibido_at')::timestamptz,
    coalesce(payload -> 'archivos', '[]'::jsonb)
  );

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

  -- 3. Resultados oficiales y clasificación por grupo ---------------------------
  -- Solo sobre fases y grupos ya cargados con su calendario: un PDF de
  -- resultados no crea fases ni jugadores.
  for v_resultado in select * from jsonb_array_elements(coalesce(payload -> 'resultados', '[]'::jsonb))
  loop
    v_fase_num := (v_resultado ->> 'fase')::int;
    v_grupo_letra := upper(trim(coalesce(v_resultado ->> 'grupo', '')));
    if v_fase_num is null or v_grupo_letra !~ '^[A-Z]$' then
      raise exception 'Resultados sin fase o grupo válidos: %', v_resultado;
    end if;

    select g.id into v_grupo_id
    from public.grupos g
    join public.fases f on f.id = g.fase_id
    where f.temporada = v_temporada and f.numero = v_fase_num and g.letra = v_grupo_letra;

    if v_grupo_id is null then
      v_avisos := v_avisos || jsonb_build_object(
        'tipo', 'grupo_no_encontrado', 'valor', format('%sª fase grupo %s', v_fase_num, v_grupo_letra),
        'detalle', 'No hay calendario cargado para ese grupo; carga primero el calendario');
      continue;
    end if;

    -- 3a. Partidos
    for v_partido in select * from jsonb_array_elements(coalesce(v_resultado -> 'partidos', '[]'::jsonb))
    loop
      select j.id into v_local from public.jugadores j
      where j.nombre_normalizado = public.normalizar_nombre(v_partido ->> 'local');
      select j.id into v_visitante from public.jugadores j
      where j.nombre_normalizado = public.normalizar_nombre(v_partido ->> 'visitante');

      v_partido_id := null;
      if nullif(trim(coalesce(v_partido ->> 'id_partido', '')), '') is not null then
        select p.id into v_partido_id from public.partidos p
        where p.id_partido = trim(v_partido ->> 'id_partido') and p.grupo_id = v_grupo_id;
      end if;
      if v_partido_id is null and v_local is not null and v_visitante is not null then
        select p.id into v_partido_id from public.partidos p
        where p.grupo_id = v_grupo_id
          and p.vuelta = coalesce((v_partido ->> 'vuelta')::int, 1)
          and p.jornada = (v_partido ->> 'jornada')::int
          and p.local_id = v_local
          and p.visitante_id = v_visitante;
      end if;

      if v_partido_id is null then
        n_res_sin_partido := n_res_sin_partido + 1;
        v_avisos := v_avisos || jsonb_build_object(
          'tipo', 'partido_no_encontrado',
          'valor', format('V%s J%s %s vs %s', coalesce(v_partido ->> 'vuelta', '1'), v_partido ->> 'jornada',
                          trim(v_partido ->> 'local'), trim(v_partido ->> 'visitante')),
          'detalle', 'No hay un partido del calendario con esa vuelta, jornada y jugadores');
        continue;
      end if;

      select p.local_id, p.visitante_id, p.id_partido into v_previo
      from public.partidos p where p.id = v_partido_id;
      v_local := v_previo.local_id;
      v_visitante := v_previo.visitante_id;

      v_sets := coalesce(v_partido -> 'sets', '[]'::jsonb);
      if jsonb_typeof(v_sets) <> 'array' then
        raise exception 'Sets inválidos en el partido %: %', v_previo.id_partido, v_sets;
      end if;
      v_sets_local := coalesce((v_partido ->> 'sets_local')::int,
        (select count(*) from jsonb_array_elements(v_sets) s where (s ->> 0)::int > (s ->> 1)::int));
      v_sets_visitante := coalesce((v_partido ->> 'sets_visitante')::int,
        (select count(*) from jsonb_array_elements(v_sets) s where (s ->> 0)::int < (s ->> 1)::int));
      v_lado := lower(coalesce(v_partido ->> 'ganador', ''));
      if v_lado not in ('local', 'visitante') then
        v_lado := case
          when v_sets_local > v_sets_visitante then 'local'
          when v_sets_visitante > v_sets_local then 'visitante'
        end;
      end if;
      if v_lado is null then
        raise exception 'Partido % sin ganador', v_previo.id_partido;
      end if;
      v_ganador := case v_lado when 'local' then v_local else v_visitante end;

      insert into public.resultados_oficiales
        (partido_id, ganador_id, sets, sets_local, sets_visitante, ingesta_id)
      values (v_partido_id, v_ganador, v_sets, v_sets_local, v_sets_visitante, v_ingesta_id)
      on conflict (partido_id) do update
        set ganador_id = excluded.ganador_id,
            sets = excluded.sets,
            sets_local = excluded.sets_local,
            sets_visitante = excluded.sets_visitante,
            ingesta_id = excluded.ingesta_id,
            actualizado_at = now()
        where (resultados_oficiales.ganador_id, resultados_oficiales.sets,
               resultados_oficiales.sets_local, resultados_oficiales.sets_visitante)
              is distinct from
              (excluded.ganador_id, excluded.sets, excluded.sets_local, excluded.sets_visitante)
      returning (xmax = 0) into v_creado;
      if v_creado then
        n_res_nuevos := n_res_nuevos + 1;
      elsif found then
        n_res_modificados := n_res_modificados + 1;
      end if;

      -- Contraste con lo que mandaron los jugadores desde la app
      for v_enviado in
        select re.sets, re.ganador_id, coalesce(j.nombre, u.email) as quien
        from public.resultados_enviados re
        join public.usuarios u on u.id = re.usuario_id
        left join public.jugadores j on j.id = u.jugador_id
        where re.partido_id = v_partido_id
      loop
        if v_enviado.ganador_id <> v_ganador or not public.sets_equivalentes(v_enviado.sets, v_sets) then
          n_res_discrepantes := n_res_discrepantes + 1;
          v_avisos := v_avisos || jsonb_build_object(
            'tipo', 'resultado_discrepante',
            'id_partido', v_previo.id_partido,
            'nombre', v_enviado.quien,
            'detalle', format('Enviado desde la app: %s (ganó %s). Liga: %s (ganó %s)',
              public.sets_a_texto(v_enviado.sets),
              (select x.nombre from public.jugadores x where x.id = v_enviado.ganador_id),
              public.sets_a_texto(v_sets),
              (select x.nombre from public.jugadores x where x.id = v_ganador)));
        end if;
      end loop;
    end loop;

    -- 3b. Clasificación del grupo (la tabla del PDF es completa: se reemplaza)
    if jsonb_array_length(coalesce(v_resultado -> 'clasificacion', '[]'::jsonb)) > 0 then
      delete from public.clasificacion_grupo where grupo_id = v_grupo_id;
      for v_fila in select * from jsonb_array_elements(v_resultado -> 'clasificacion')
      loop
        select j.id into v_jugador from public.jugadores j
        where j.nombre_normalizado = public.normalizar_nombre(v_fila ->> 'nombre');
        if v_jugador is null or not exists (
          select 1 from public.grupo_jugadores gj where gj.grupo_id = v_grupo_id and gj.jugador_id = v_jugador
        ) then
          v_avisos := v_avisos || jsonb_build_object(
            'tipo', 'jugador_no_en_grupo', 'nombre', trim(v_fila ->> 'nombre'),
            'detalle', format('Figura en la clasificación de la %sª fase grupo %s pero no en su calendario',
                              v_fase_num, v_grupo_letra));
          continue;
        end if;
        insert into public.clasificacion_grupo
          (grupo_id, jugador_id, posicion, jugados, ganados, empatados, perdidos, sets_favor, sets_contra,
           puntos_sancion, puntos, sanciones, no_presentados, ingesta_id)
        values (
          v_grupo_id, v_jugador,
          (v_fila ->> 'posicion')::int,
          coalesce((v_fila ->> 'j')::int, 0),
          coalesce((v_fila ->> 'g')::int, 0),
          coalesce((v_fila ->> 'e')::int, 0),
          coalesce((v_fila ->> 'p')::int, 0),
          coalesce((v_fila ->> 'gf')::int, 0),
          coalesce((v_fila ->> 'gc')::int, 0),
          coalesce((v_fila ->> 'ps')::int, 0),
          coalesce((v_fila ->> 'pt')::int, 0),
          (v_fila ->> 's')::int,
          coalesce((v_fila ->> 'np')::int, 0),
          v_ingesta_id
        );
        n_clasif := n_clasif + 1;
      end loop;
    end if;
  end loop;

  -- 4. Ranking general (puntos por fase) ----------------------------------------
  v_rankings := coalesce(payload -> 'ranking', '[]'::jsonb);
  if jsonb_typeof(v_rankings) = 'object' then
    v_rankings := jsonb_build_array(v_rankings);
  end if;
  for v_ranking in select * from jsonb_array_elements(v_rankings)
  loop
    v_tipo := lower(coalesce(nullif(trim(v_ranking ->> 'tipo'), ''), 'general'));
    if v_tipo not in ('general', 'femenino') then
      raise exception 'Tipo de ranking inválido: %', v_tipo;
    end if;
    v_temp_ranking := coalesce(nullif(trim(v_ranking ->> 'temporada'), ''), v_temporada);
    v_fecha_corte := (v_ranking ->> 'fecha_corte')::date;
    if jsonb_array_length(coalesce(v_ranking -> 'posiciones', '[]'::jsonb)) = 0 then
      continue;
    end if;
    delete from public.ranking_general where temporada = v_temp_ranking and tipo = v_tipo;
    for v_fila in select * from jsonb_array_elements(v_ranking -> 'posiciones')
    loop
      select p_id, p_creado into v_jugador, v_creado
      from public.obtener_o_crear_jugador(v_fila ->> 'nombre');
      if v_creado then
        n_jug_creados_sin_contacto := n_jug_creados_sin_contacto + 1;
        v_avisos := v_avisos || jsonb_build_object(
          'tipo', 'jugador_sin_contacto', 'nombre', trim(v_fila ->> 'nombre'),
          'detalle', 'Aparece en el ranking general pero no en el directorio de contactos');
      end if;
      insert into public.ranking_general
        (temporada, tipo, jugador_id, posicion, puntos, por_fase, fecha_corte, ingesta_id)
      values (
        v_temp_ranking, v_tipo, v_jugador,
        (v_fila ->> 'posicion')::int,
        coalesce((v_fila ->> 'puntos')::int, 0),
        coalesce(v_fila -> 'por_fase', '{}'::jsonb),
        v_fecha_corte,
        v_ingesta_id
      )
      on conflict (temporada, tipo, jugador_id) do update
        set posicion = excluded.posicion,
            puntos = excluded.puntos,
            por_fase = excluded.por_fase,
            fecha_corte = excluded.fecha_corte,
            ingesta_id = excluded.ingesta_id,
            actualizado_at = now();
      n_ranking := n_ranking + 1;
    end loop;
  end loop;

  -- 5. Re-cruzar usuarios sin vínculo por email -------------------------------
  update public.usuarios u
  set jugador_id = j.id,
      estado_vinculo = 'automatico',
      jugador_solicitado_id = null
  from public.jugadores j
  where u.jugador_id is null
    and j.email_normalizado = u.email;

  -- 6. Resumen ----------------------------------------------------------------
  v_resumen := jsonb_build_object(
    'contactos_leidos', n_contactos,
    'jugadores_nuevos', n_jug_nuevos,
    'jugadores_actualizados', n_jug_actualizados,
    'jugadores_creados_sin_contacto', n_jug_creados_sin_contacto,
    'grupos', n_grupos,
    'partidos_nuevos', n_partidos_nuevos,
    'partidos_modificados', n_partidos_actualizados,
    'resultados_nuevos', n_res_nuevos,
    'resultados_modificados', n_res_modificados,
    'resultados_sin_partido', n_res_sin_partido,
    'resultados_discrepantes', n_res_discrepantes,
    'clasificacion_filas', n_clasif,
    'ranking_posiciones', n_ranking
  );

  update public.ingestas
  set resumen = v_resumen, avisos = v_avisos
  where id = v_ingesta_id;

  return jsonb_build_object(
    'estado', 'ok',
    'ingesta_id', v_ingesta_id,
    'resumen', v_resumen,
    'avisos', v_avisos
  );
end;
$$;

revoke all on function public.cargar_ingesta(jsonb) from public, anon, authenticated;
grant execute on function public.cargar_ingesta(jsonb) to service_role;
revoke all on function public.sets_equivalentes(jsonb, jsonb) from public, anon;
revoke all on function public.sets_a_texto(jsonb) from public, anon;
