-- Row Level Security. Regla general: un jugador ve solo su grupo (en fases
-- publicadas) y los contactos de sus rivales; el admin ve todo.

alter table public.admins_semilla enable row level security;
alter table public.fases enable row level security;
alter table public.grupos enable row level security;
alter table public.jugadores enable row level security;
alter table public.grupo_jugadores enable row level security;
alter table public.partidos enable row level security;
alter table public.usuarios enable row level security;
alter table public.propuestas_horario enable row level security;
alter table public.resultados_enviados enable row level security;
alter table public.ingestas enable row level security;

-- admins_semilla: solo admin la ve; se edita por SQL/migración.
create policy admins_semilla_admin on public.admins_semilla
  for select to authenticated using (public.es_admin());

-- fases
create policy fases_select on public.fases
  for select to authenticated using (publicada or public.es_admin());
create policy fases_admin_update on public.fases
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy fases_admin_delete on public.fases
  for delete to authenticated using (public.es_admin());

-- grupos
create policy grupos_select on public.grupos
  for select to authenticated using (public.es_admin() or public.es_mi_grupo(id));
create policy grupos_admin_delete on public.grupos
  for delete to authenticated using (public.es_admin());

-- grupo_jugadores
create policy grupo_jugadores_select on public.grupo_jugadores
  for select to authenticated using (public.es_admin() or public.es_mi_grupo(grupo_id));

-- partidos
create policy partidos_select on public.partidos
  for select to authenticated using (public.es_admin() or public.es_mi_grupo(grupo_id));

-- jugadores: los de mi(s) grupo(s) en fases publicadas, o todos si admin.
create policy jugadores_select on public.jugadores
  for select to authenticated using (
    public.es_admin()
    or exists (
      select 1 from public.grupo_jugadores gj
      where gj.jugador_id = jugadores.id and public.es_mi_grupo(gj.grupo_id)
    )
  );
create policy jugadores_admin_update on public.jugadores
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- usuarios: cada uno la suya; el admin todas y puede editarlas.
create policy usuarios_select on public.usuarios
  for select to authenticated using (id = auth.uid() or public.es_admin());
create policy usuarios_admin_update on public.usuarios
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- propuestas_horario: propias, o de partidos de mi grupo (para ver si el
-- rival ya propuso); el admin todas.
create policy propuestas_select on public.propuestas_horario
  for select to authenticated using (
    usuario_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.partidos p where p.id = partido_id and public.es_mi_grupo(p.grupo_id))
  );
create policy propuestas_insert on public.propuestas_horario
  for insert to authenticated with check (
    usuario_id = auth.uid()
    and exists (
      select 1 from public.partidos p
      where p.id = partido_id
        and public.es_mi_grupo(p.grupo_id)
        and public.mi_jugador_id() in (p.local_id, p.visitante_id)
    )
  );

-- resultados_enviados: misma regla.
create policy resultados_select on public.resultados_enviados
  for select to authenticated using (
    usuario_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.partidos p where p.id = partido_id and public.es_mi_grupo(p.grupo_id))
  );
create policy resultados_insert on public.resultados_enviados
  for insert to authenticated with check (
    usuario_id = auth.uid()
    and exists (
      select 1 from public.partidos p
      where p.id = partido_id
        and public.es_mi_grupo(p.grupo_id)
        and public.mi_jugador_id() in (p.local_id, p.visitante_id)
        and ganador_id in (p.local_id, p.visitante_id)
    )
  );

-- ingestas: solo lectura para el admin. Escribe cargar_ingesta (service role).
create policy ingestas_admin_select on public.ingestas
  for select to authenticated using (public.es_admin());

-- Permisos de ejecución de las RPC de usuario.
grant execute on function public.es_admin() to authenticated;
grant execute on function public.mi_jugador_id() to authenticated;
grant execute on function public.es_mi_grupo(uuid) to authenticated;
grant execute on function public.listar_jugadores_fase() to authenticated;
grant execute on function public.solicitar_vinculo(uuid) to authenticated;
revoke execute on function public.listar_jugadores_fase() from anon;
revoke execute on function public.solicitar_vinculo(uuid) from anon;
