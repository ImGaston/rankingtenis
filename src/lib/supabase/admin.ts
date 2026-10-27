import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service role key: salta la RLS. Solo para tareas de
 * servidor que ya verificaron permisos (acciones de admin, cron).
 */
export function crearClienteAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
