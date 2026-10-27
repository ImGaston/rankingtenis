import "server-only";

import type { Fase } from "@/lib/dominio/tipos";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function faseActual(): Promise<Fase | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("fases")
    .select("*")
    .eq("es_actual", true)
    .maybeSingle<Fase>();
  return data ?? null;
}

export async function listarFases(): Promise<Fase[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("fases")
    .select("*")
    .order("temporada", { ascending: false })
    .order("numero", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Fase[];
}
