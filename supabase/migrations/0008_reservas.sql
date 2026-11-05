-- Reserva de pista de un partido: cuando uno de los dos jugadores llama al
-- polideportivo y consigue pista, la anota para que el partido muestre día,
-- hora, sede y pista. Una sola reserva por partido; si cambia, se sustituye.

create table public.reservas_pista (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null unique references public.partidos (id) on delete cascade,
  -- null si quien la anotó borró su cuenta (la reserva le sigue sirviendo al rival).
  usuario_id uuid references public.usuarios (id) on delete set null,
  fecha date not null,
  inicio text not null check (inicio ~ '^\d{2}:\d{2}$'),
  fin text not null check (fin ~ '^\d{2}:\d{2}$' and fin > inicio),
  sede text not null check (sede in ('cerro', 'sureste')),
  pista text not null check (length(pista) between 1 and 40),
  creado_at timestamptz not null default now()
);

-- RLS: la ven los del grupo (en fases publicadas) y el admin; la anotan,
-- cambian o quitan los dos jugadores del partido y el admin.
alter table public.reservas_pista enable row level security;

create policy reservas_select on public.reservas_pista
  for select to authenticated using (
    public.es_admin()
    or exists (select 1 from public.partidos p where p.id = partido_id and public.es_mi_grupo(p.grupo_id))
  );

create policy reservas_insert on public.reservas_pista
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

create policy reservas_update on public.reservas_pista
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

create policy reservas_delete on public.reservas_pista
  for delete to authenticated using (
    public.es_admin()
    or exists (
      select 1 from public.partidos p
      where p.id = partido_id
        and public.es_mi_grupo(p.grupo_id)
        and public.mi_jugador_id() in (p.local_id, p.visitante_id)
    )
  );
