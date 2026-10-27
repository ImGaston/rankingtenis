-- Pruebas de migraciones, cargar_ingesta y RLS contra la base local.
-- Se ejecuta con scripts/db-local.sh test. Cualquier assert fallido corta.
\set ON_ERROR_STOP on
\set payload `cat agente/ejemplos/fase2.json`

-- Usuarios de prueba (dispara handle_new_user)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'corbalan.gaston@gmail.com', '{"full_name":"Gaston Admin"}'),
  ('00000000-0000-0000-0000-000000000002', 'roberto.gaston.corbalan.lugo@example.com', '{"full_name":"Gaston Jugador"}'),
  ('00000000-0000-0000-0000-000000000003', 'nadie@example.com', '{"full_name":"Sin Vinculo"}');

do $$ begin
  assert (select rol from public.usuarios where id = '00000000-0000-0000-0000-000000000001') = 'admin', 'admin por semilla';
  assert (select estado_vinculo from public.usuarios where id = '00000000-0000-0000-0000-000000000002') = 'sin_vincular', 'aún no hay jugadores';
end $$;

-- Carga de la fase 2 (como service role: la función es security definer; aquí postgres)
create temp table cargas (nombre text primary key, r jsonb);
insert into cargas select 'primera', cargar_ingesta(:'payload'::jsonb);
select r as primera_carga from cargas where nombre = 'primera';

do $$
declare r jsonb := (select c.r from cargas c where c.nombre = 'primera');
begin
  assert r ->> 'estado' = 'ok', 'estado ok';
  assert (r -> 'resumen' ->> 'contactos_leidos')::int = 80, 'contactos';
  assert (r -> 'resumen' ->> 'jugadores_nuevos')::int = 80, 'jugadores nuevos';
  assert (r -> 'resumen' ->> 'jugadores_creados_sin_contacto')::int = 0, 'todos los del calendario cruzan con el directorio (acentos)';
  assert (r -> 'resumen' ->> 'partidos_nuevos')::int = 28, 'partidos';
  assert (select count(*) from public.jugadores) = 80, 'directorio 80';
  assert (select count(*) from public.grupo_jugadores) = 8, 'grupo H con 8';
  assert (select count(*) from public.fases where numero = 2 and not publicada) = 1, 'fase 2 sin publicar';
  -- re-cruce de usuario por email tras la carga
  assert (select estado_vinculo from public.usuarios where id = '00000000-0000-0000-0000-000000000002') = 'automatico', 're-cruce email';
end $$;

-- Idempotencia: mismo mensaje → duplicada; mismo contenido con otro id → sin cambios
insert into cargas select 'segunda', cargar_ingesta(:'payload'::jsonb);
insert into cargas select 'tercera', cargar_ingesta((:'payload'::jsonb) || '{"gmail_message_id":"otro-mensaje"}'::jsonb);
do $$
declare
  s jsonb := (select c.r from cargas c where c.nombre = 'segunda');
  t jsonb := (select c.r from cargas c where c.nombre = 'tercera');
begin
  assert s ->> 'estado' = 'duplicada', 'duplicada';
  assert t ->> 'estado' = 'ok', 'tercera ok';
  assert (t -> 'resumen' ->> 'jugadores_nuevos')::int = 0, 'sin jugadores nuevos';
  assert (t -> 'resumen' ->> 'jugadores_actualizados')::int = 0, 'sin actualizados';
  assert (t -> 'resumen' ->> 'partidos_nuevos')::int = 0 and (t -> 'resumen' ->> 'partidos_modificados')::int = 0, 'sin cambios en partidos';
  assert (select count(*) from public.partidos) = 28, 'siguen 28';
  assert (select count(*) from public.ingestas) = 2, 'dos ingestas registradas';
end $$;

-- Normalización de nombres y teléfonos
do $$ begin
  assert normalizar_nombre('  JUAN JOSÉ RUÍZ  VÁZQUEZ ') = 'JUAN JOSE RUIZ VAZQUEZ', 'acentos';
  assert normalizar_nombre('ENRIQUE FER´NANDEZ PASTOR') = 'ENRIQUE FERNANDEZ PASTOR', 'acento suelto';
  assert normalizar_nombre('IGNACIO RODRIGUEZ GARCIA-CEBADERA') = 'IGNACIO RODRIGUEZ GARCIA CEBADERA', 'guion';
  assert normalizar_telefono('612 345 678') = '+34612345678', 'tel 9 dígitos';
  assert normalizar_telefono('+34 612345678') = '+34612345678', 'tel +34';
  assert normalizar_telefono('0034612345678') = '+34612345678', 'tel 0034';
  assert normalizar_telefono('12345') is null, 'tel inválido';
end $$;

-- RLS: antes de publicar nadie ve nada --------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', false);
do $$ begin
  assert (select count(*) from public.partidos) = 0, 'sin publicar: 0 partidos';
  assert (select count(*) from public.jugadores) = 0, 'sin publicar: 0 jugadores';
  assert (select count(*) from public.usuarios) = 1, 'veo solo mi usuario';
end $$;
-- cargar_ingesta no es ejecutable por authenticated
do $$ begin
  begin
    perform cargar_ingesta('{}'::jsonb);
    raise exception 'authenticated no debería poder ejecutar cargar_ingesta';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- El admin publica la fase 2 y la marca actual
update public.fases set publicada = true, es_actual = true where numero = 2;

-- Jugador vinculado (Gaston, grupo H)
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', false);
do $$
declare v_partido uuid; v_otro uuid; v_yo uuid := mi_jugador_id();
begin
  assert v_yo is not null, 'tengo jugador';
  assert (select count(*) from public.partidos) = 28, 'veo los 28 partidos del grupo';
  assert (select count(*) from public.partidos where v_yo in (local_id, visitante_id)) = 7, 'juego 7';
  assert (select count(*) from public.partidos where local_id = v_yo) = 4, '4 de local';
  assert (select count(*) from public.jugadores) = 8, 'veo 8 contactos (mi grupo)';
  assert (select count(*) from public.grupos) = 1, 'un grupo';
  assert (select count(*) from public.fases) = 1, 'una fase publicada';
  assert (select count(*) from public.ingestas) = 0, 'no veo ingestas';
  -- propuesta en un partido mío de local: ok
  select id into v_partido from public.partidos where local_id = v_yo order by jornada limit 1;
  insert into public.propuestas_horario (partido_id, usuario_id, franjas, texto)
  values (v_partido, auth.uid(), '[{"fecha":"2026-10-27","inicio":"18:00","fin":"20:00"}]', 'hola');
  -- resultado con ganador válido: ok
  insert into public.resultados_enviados (partido_id, usuario_id, fecha_partido, sets, ganador_id, asunto, cuerpo)
  values (v_partido, auth.uid(), '2026-10-27', '[[6,0],[6,0]]', v_yo, 'a', 'b');
  -- propuesta en un partido ajeno: debe fallar por RLS
  select id into v_otro from public.partidos where v_yo not in (local_id, visitante_id) limit 1;
  begin
    insert into public.propuestas_horario (partido_id, usuario_id, franjas, texto) values (v_otro, auth.uid(), '[]', 'x');
    raise exception 'no debería poder proponer en partido ajeno';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Usuario sin vínculo: no ve nada, pero puede listar nombres y solicitar
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', false);
do $$ begin
  assert (select count(*) from public.partidos) = 0, 'sin vínculo: 0 partidos';
  assert (select count(*) from public.jugadores) = 0, 'sin vínculo: 0 jugadores';
  assert (select count(*) from listar_jugadores_fase()) = 8, 'lista 8 nombres de la fase actual';
  perform solicitar_vinculo((select id from listar_jugadores_fase() limit 1));
  assert (select estado_vinculo from public.usuarios where id = auth.uid()) = 'pendiente', 'pendiente';
end $$;

-- Admin ve todo
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$ begin
  assert es_admin(), 'soy admin';
  assert (select count(*) from public.jugadores) = 80, 'admin ve 80';
  assert (select count(*) from public.ingestas) = 2, 'admin ve ingestas';
  assert (select count(*) from public.usuarios) = 3, 'admin ve usuarios';
  -- aprueba el vínculo pendiente
  update public.usuarios set jugador_id = jugador_solicitado_id, estado_vinculo = 'aprobado'
  where id = '00000000-0000-0000-0000-000000000003';
  assert (select jugador_id from public.usuarios where id = '00000000-0000-0000-0000-000000000003') is not null, 'aprobado';
end $$;
reset role;

\echo TODAS LAS PRUEBAS SQL PASARON
