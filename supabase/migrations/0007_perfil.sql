-- Perfil del usuario: apodo con el que quiere aparecer y baja de la cuenta.

-- Apodo opcional ("Gaston", "Juanjo"). Si está vacío se usa el nombre de pila
-- de la lista de la liga. Lo edita el propio usuario desde /perfil; la RLS
-- sigue sin dejarle tocar su fila (protege rol y vínculo), así que la app lo
-- escribe con la clave de servicio tras comprobar la sesión.
alter table public.usuarios
  add column apodo text
  check (apodo is null or (apodo = btrim(apodo) and length(apodo) between 1 and 40));

-- Al borrar la cuenta (auth.users → usuarios en cascada) no se pierde lo que
-- afecta al rival: el resultado enviado y el W.O. se conservan sin autor.
-- Las propuestas de horario sí se van con la cuenta (solo las ve quien las hizo).
-- Nota: el contraste de resultados en cargar_ingesta hace inner join con
-- usuarios, así que un resultado sin autor no genera aviso de discrepancia.
alter table public.resultados_enviados
  alter column usuario_id drop not null,
  drop constraint resultados_enviados_usuario_id_fkey,
  add constraint resultados_enviados_usuario_id_fkey
    foreign key (usuario_id) references public.usuarios (id) on delete set null;

alter table public.walkovers
  alter column usuario_id drop not null,
  drop constraint walkovers_usuario_id_fkey,
  add constraint walkovers_usuario_id_fkey
    foreign key (usuario_id) references public.usuarios (id) on delete set null;
