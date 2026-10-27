-- W.O. (walkover) decidido por la liga: un jugador no puede disputar el
-- partido (lesión, baja de la fase, incomparecencia) y la coordinación lo da
-- por perdido 0-6 0-6, con o sin sanción. Como el aviso solo llega a los
-- jugadores del grupo, lo registra cualquiera de los dos jugadores del
-- partido para que deje de aparecer como pendiente. No se manda mail de
-- resultado: la liga ya lo tiene.

create table public.walkovers (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null unique references public.partidos (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  -- Jugador que no juega; el otro gana el partido.
  ausente_id uuid not null references public.jugadores (id),
  motivo text not null check (motivo in ('lesion', 'baja', 'incomparecencia', 'otro')),
  con_sancion boolean not null default false,
  nota text check (nota is null or length(nota) <= 1000),
  creado_at timestamptz not null default now()
);
create index walkovers_ausente_idx on public.walkovers (ausente_id);

-- El ausente tiene que ser uno de los dos jugadores del partido.
create or replace function public.validar_walkover()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.partidos p
    where p.id = new.partido_id
      and new.ausente_id in (p.local_id, p.visitante_id)
  ) then
    raise exception 'El jugador ausente no juega este partido';
  end if;
  return new;
end;
$$;

create trigger walkovers_validar before insert or update on public.walkovers
  for each row execute function public.validar_walkover();

-- RLS: lo ven los del grupo (en fases publicadas) y el admin; lo registran,
-- corrigen o quitan los dos jugadores del partido y el admin.
alter table public.walkovers enable row level security;

create policy walkovers_select on public.walkovers
  for select to authenticated using (
    public.es_admin()
    or exists (select 1 from public.partidos p where p.id = partido_id and public.es_mi_grupo(p.grupo_id))
  );

create policy walkovers_insert on public.walkovers
  for insert to authenticated with check (
    usuario_id = auth.uid()
    and (
      public.es_admin()
      or exists (
        select 1 from public.partidos p
        where p.id = partido_id
          and public.es_mi_grupo(p.grupo_id)
          and public.mi_jugador_id() in (p.local_id, p.visitante_id)
      )
    )
  );

create policy walkovers_update on public.walkovers
  for update to authenticated
  using (
    public.es_admin()
    or exists (
      select 1 from public.partidos p
      where p.id = partido_id
        and public.es_mi_grupo(p.grupo_id)
        and public.mi_jugador_id() in (p.local_id, p.visitante_id)
    )
  )
  with check (
    usuario_id = auth.uid()
    and (
      public.es_admin()
      or exists (
        select 1 from public.partidos p
        where p.id = partido_id
          and public.es_mi_grupo(p.grupo_id)
          and public.mi_jugador_id() in (p.local_id, p.visitante_id)
      )
    )
  );

create policy walkovers_delete on public.walkovers
  for delete to authenticated using (
    public.es_admin()
    or exists (
      select 1 from public.partidos p
      where p.id = partido_id
        and public.es_mi_grupo(p.grupo_id)
        and public.mi_jugador_id() in (p.local_id, p.visitante_id)
    )
  );
