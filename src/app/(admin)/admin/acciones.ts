"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/consultas/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

const uuid = z.string().uuid();

function revalidarAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/fases");
  revalidatePath("/admin/usuarios");
  revalidatePath("/partidos");
  revalidatePath("/vincular");
}

export async function cambiarPublicacion(formData: FormData) {
  await exigirAdmin();
  const id = uuid.parse(formData.get("id"));
  const publicada = formData.get("publicada") === "true";
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("fases").update({ publicada }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidarAdmin();
}

/** Marca una fase como la actual (solo puede haber una). */
export async function marcarActual(formData: FormData) {
  await exigirAdmin();
  const id = uuid.parse(formData.get("id"));
  const supabase = await crearClienteServidor();
  const quitar = await supabase.from("fases").update({ es_actual: false }).eq("es_actual", true);
  if (quitar.error) throw new Error(quitar.error.message);
  const poner = await supabase.from("fases").update({ es_actual: true }).eq("id", id);
  if (poner.error) throw new Error(poner.error.message);
  revalidarAdmin();
}

export async function aprobarVinculo(formData: FormData) {
  await exigirAdmin();
  const id = uuid.parse(formData.get("id"));
  const supabase = await crearClienteServidor();
  const { data: u, error: e1 } = await supabase
    .from("usuarios")
    .select("jugador_solicitado_id")
    .eq("id", id)
    .single<{ jugador_solicitado_id: string | null }>();
  if (e1 || !u?.jugador_solicitado_id)
    throw new Error("El usuario no tiene una solicitud pendiente");
  const { error } = await supabase
    .from("usuarios")
    .update({
      jugador_id: u.jugador_solicitado_id,
      estado_vinculo: "aprobado",
      jugador_solicitado_id: null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidarAdmin();
}

export async function rechazarVinculo(formData: FormData) {
  await exigirAdmin();
  const id = uuid.parse(formData.get("id"));
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("usuarios")
    .update({ estado_vinculo: "rechazado", jugador_solicitado_id: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidarAdmin();
}

/** Asigna (o cambia) a mano el jugador de un usuario. */
export async function asignarJugador(formData: FormData) {
  await exigirAdmin();
  const id = uuid.parse(formData.get("id"));
  const jugador = uuid.parse(formData.get("jugador"));
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("usuarios")
    .update({ jugador_id: jugador, estado_vinculo: "aprobado", jugador_solicitado_id: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidarAdmin();
}

export async function desvincular(formData: FormData) {
  await exigirAdmin();
  const id = uuid.parse(formData.get("id"));
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("usuarios")
    .update({ jugador_id: null, estado_vinculo: "sin_vincular", jugador_solicitado_id: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidarAdmin();
}

export async function cambiarRol(formData: FormData) {
  const { usuario } = await exigirAdmin();
  const id = uuid.parse(formData.get("id"));
  const rol = z.enum(["jugador", "admin"]).parse(formData.get("rol"));
  if (id === usuario.id) throw new Error("No puedes cambiar tu propio rol");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("usuarios").update({ rol }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidarAdmin();
}
