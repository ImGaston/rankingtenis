-- Emails con rol admin al primer login. Editar antes de aplicar en producción
-- o insertar después por SQL: insert into public.admins_semilla values ('otro@mail.com');
insert into public.admins_semilla (email) values
  ('corbalan.gaston@gmail.com')
on conflict do nothing;
