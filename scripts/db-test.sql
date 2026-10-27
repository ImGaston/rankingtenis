-- Pruebas de migraciones, cargar_ingesta y RLS contra la base local.
-- Se ejecuta con scripts/db-local.sh test. Cualquier assert fallido corta.
\set ON_ERROR_STOP on
\set payload `cat agente/ejemplos/fase2.json`
\set resultados `cat agente/ejemplos/resultados-fase2.json`

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


-- Resultados oficiales, clasificación y ranking (0006) ------------------------
do $$ begin
  assert sets_a_texto('[[6,1],[1,6],[6,2]]') = '6-1 1-6 6-2', 'sets a texto';
  assert sets_equivalentes('[[6,1],[1,6],[1,0]]', '[[6,1],[1,6],[10,7]]'), 'super tie-break 1-0 equivale a 10-7';
  assert not sets_equivalentes('[[6,1],[1,6],[1,0]]', '[[6,1],[1,6],[7,10]]'), 'tercer set con otro ganador';
  assert not sets_equivalentes('[[6,0],[6,0]]', '[[6,1],[6,0]]'), 'sets distintos';
  assert not sets_equivalentes('[[6,0],[6,0]]', '[[6,0],[6,0],[1,0]]'), 'distinto número de sets';
end $$;

insert into cargas select 'resultados', cargar_ingesta(:'resultados'::jsonb);
select r as carga_resultados from cargas where nombre = 'resultados';

do $$
declare
  r jsonb := (select c.r from cargas c where c.nombre = 'resultados');
  v_yo uuid := (select jugador_id from public.usuarios where id = '00000000-0000-0000-0000-000000000002');
  v_partido uuid := (select id from public.partidos where id_partido = '108999');
  v_ingesta uuid := (r ->> 'ingesta_id')::uuid;
begin
  assert r ->> 'estado' = 'ok', 'resultados ok';
  assert (r -> 'resumen' ->> 'resultados_nuevos')::int = 8, 'ocho resultados nuevos';
  assert (r -> 'resumen' ->> 'resultados_sin_partido')::int = 1, 'uno sin partido (jugador inexistente)';
  assert (r -> 'resumen' ->> 'resultados_discrepantes')::int = 1, 'una discrepancia con lo enviado por el jugador';
  assert (r -> 'resumen' ->> 'clasificacion_filas')::int = 8, 'clasificación de 8';
  assert (r -> 'resumen' ->> 'ranking_posiciones')::int = 6, 'ranking general 4 + femenino 2';
  assert (r -> 'resumen' ->> 'jugadores_creados_sin_contacto')::int = 0, 'nadie nuevo: los nombres cruzan aunque cambie el acento (RUÍZ)';
  assert (r -> 'resumen' ->> 'partidos_nuevos')::int = 0 and (r -> 'resumen' ->> 'grupos')::int = 0, 'no toca el calendario';
  assert (select count(*) from jsonb_array_elements(r -> 'avisos') a where a ->> 'tipo' = 'partido_no_encontrado') = 1, 'aviso partido_no_encontrado';
  assert (select count(*) from jsonb_array_elements(r -> 'avisos') a
          where a ->> 'tipo' = 'resultado_discrepante' and a ->> 'id_partido' = '108999'
            and a ->> 'detalle' like 'Enviado desde la app: 6-0 6-0 %Liga: 6-1 1-6 0-1 %') = 1, 'aviso resultado_discrepante con detalle';
  -- el oficial manda: Gaston perdió 1-2 aunque él envió 6-0 6-0
  assert (select ganador_id from public.resultados_oficiales where partido_id = v_partido) <> v_yo, 'ganador oficial es el visitante';
  assert (select sets_local || '-' || sets_visitante from public.resultados_oficiales where partido_id = v_partido) = '1-2', 'sets 1-2';
  assert (select count(*) from public.resultados_oficiales where ingesta_id = v_ingesta) = 8, 'ingesta_id en los resultados';
  assert (select posicion from public.clasificacion_grupo where jugador_id = v_yo) = 6, 'Gaston sexto en el grupo';
  assert (select count(*) from public.ranking_general where tipo = 'general') = 4 and (select count(*) from public.ranking_general where tipo = 'femenino') = 2, 'ranking por tipo';
  assert (select resumen ->> 'resultados_nuevos' from public.ingestas where id = v_ingesta) = '8', 'resumen guardado en la ingesta';
end $$;

-- Idempotencia de resultados: duplicada por id; recarga con otro id no cambia nada
insert into cargas select 'resultados_dup', cargar_ingesta(:'resultados'::jsonb);
insert into cargas select 'resultados_bis', cargar_ingesta((:'resultados'::jsonb) || '{"gmail_message_id":"otro-resultados"}'::jsonb);
do $$
declare
  d jsonb := (select c.r from cargas c where c.nombre = 'resultados_dup');
  b jsonb := (select c.r from cargas c where c.nombre = 'resultados_bis');
begin
  assert d ->> 'estado' = 'duplicada', 'resultados duplicada';
  assert b ->> 'estado' = 'ok', 'recarga ok';
  assert (b -> 'resumen' ->> 'resultados_nuevos')::int = 0 and (b -> 'resumen' ->> 'resultados_modificados')::int = 0, 'recarga sin cambios en resultados';
  assert (b -> 'resumen' ->> 'clasificacion_filas')::int = 8, 'la clasificación se reemplaza';
  assert (select count(*) from public.clasificacion_grupo) = 8, 'siguen 8 filas de clasificación';
  assert (select count(*) from public.ranking_general) = 6, 'siguen 6 en el ranking';
  assert (select count(*) from public.resultados_oficiales) = 8, 'siguen 8 resultados';
end $$;

-- Corrección de un resultado por la liga: cuenta como modificado
insert into cargas select 'resultados_corr', cargar_ingesta(
  '{"gmail_message_id":"correccion","temporada":"2026-27","resultados":[{"fase":2,"grupo":"H","partidos":[
     {"id_partido":"108999","vuelta":1,"jornada":1,"local":"ROBERTO GASTÓN CORBALÁN LUGO","visitante":"JOSÉ VILLÉN ALTAMIRANO",
      "ganador":"local","sets":[[6,0],[6,0]]}]}]}'::jsonb);
do $$
declare c jsonb := (select x.r from cargas x where x.nombre = 'resultados_corr');
begin
  assert (c -> 'resumen' ->> 'resultados_modificados')::int = 1, 'resultado corregido';
  assert (c -> 'resumen' ->> 'resultados_discrepantes')::int = 0, 'ahora coincide con lo enviado';
  assert (select sets_local from public.resultados_oficiales ro join public.partidos p on p.id = ro.partido_id where p.id_partido = '108999') = 2, 'sets recalculados desde el array';
end $$;

-- Resultados de un grupo sin calendario: aviso y nada cargado
insert into cargas select 'resultados_sin_grupo', cargar_ingesta(
  '{"gmail_message_id":"sin-grupo","temporada":"2026-27","resultados":[{"fase":9,"grupo":"Z","partidos":[]}]}'::jsonb);
do $$
declare c jsonb := (select x.r from cargas x where x.nombre = 'resultados_sin_grupo');
begin
  assert (select count(*) from jsonb_array_elements(c -> 'avisos') a where a ->> 'tipo' = 'grupo_no_encontrado') = 1, 'aviso grupo_no_encontrado';
  assert (select count(*) from public.fases where numero = 9) = 0, 'no crea fases';
end $$;

-- RLS de las tablas nuevas
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000004', 'cuarto@example.com');
set role authenticated;
-- Jugador vinculado del grupo H
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', false);
do $$ begin
  assert (select count(*) from public.resultados_oficiales) = 8, 'veo los resultados oficiales de mi grupo';
  assert (select count(*) from public.clasificacion_grupo) = 8, 'veo la clasificación de mi grupo';
  assert (select count(*) from listar_ranking()) = 6, 'veo el ranking general con nombres';
  assert (select nombre from listar_ranking() where tipo = 'general' and posicion = 1) = 'ANA PRUEBA EJEMPLO 01', 'nombre de fuera de mi grupo vía RPC';
  assert (select count(*) from public.jugadores) = 8, 'pero jugadores sigue limitado a mi grupo';
end $$;
-- Usuario sin vínculo: nada
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}', false);
do $$ begin
  assert (select count(*) from public.resultados_oficiales) = 0, 'sin vínculo: 0 resultados';
  assert (select count(*) from public.clasificacion_grupo) = 0, 'sin vínculo: 0 clasificación';
  assert (select count(*) from public.ranking_general) = 0, 'sin vínculo: 0 ranking';
  assert (select count(*) from listar_ranking()) = 0, 'sin vínculo: ranking vacío';
end $$;
-- Nadie escribe en las tablas nuevas desde la app
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', false);
do $$ begin
  begin
    insert into public.clasificacion_grupo (grupo_id, jugador_id, posicion)
    select grupo_id, jugador_id, 1 from public.grupo_jugadores limit 1;
    raise exception 'no debería poder escribir la clasificación';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Despublicar la fase oculta también los resultados
update public.fases set publicada = false where numero = 2;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', false);
do $$ begin
  assert (select count(*) from public.resultados_oficiales) = 0, 'fase despublicada: 0 resultados';
  assert (select count(*) from public.clasificacion_grupo) = 0, 'fase despublicada: 0 clasificación';
end $$;
reset role;
update public.fases set publicada = true where numero = 2;

\echo TODAS LAS PRUEBAS SQL PASARON
