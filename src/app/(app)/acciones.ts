"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirJugador, exigirSesion } from "@/lib/consultas/sesion";
import { obtenerPartido, rivalDe } from "@/lib/consultas/partidos";
import { setsSchema, validarSets } from "@/lib/dominio/sets";
import type { Set } from "@/lib/dominio/tipos";
import { formatearNombre } from "@/lib/dominio/nombres";
import { armarMailResultado } from "@/lib/mensajes/resultado";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function solicitarVinculo(formData: FormData) {
  await exigirSesion();
  const jugador = z.string().uuid().parse(formData.get("jugador"));
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("solicitar_vinculo", { jugador });
  if (error) throw new Error(`No se pudo registrar la solicitud: ${error.message}`);
  revalidatePath("/vincular");
  redirect("/vincular");
}

const franjaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  inicio: z.string().regex(/^\d{2}:\d{2}$/),
  fin: z.string().regex(/^\d{2}:\d{2}$/),
});

const propuestaSchema = z.object({
  partidoId: z.string().uuid(),
  franjas: z.array(franjaSchema).max(42),
  texto: z.string().min(1).max(2000),
});

export type EntradaPropuesta = z.infer<typeof propuestaSchema>;

/** Registra que el jugador propuso horarios (el WhatsApp se abre en el cliente). */
export async function guardarPropuesta(
  entrada: EntradaPropuesta,
): Promise<{ ok: boolean; error?: string }> {
  const { usuario } = await exigirJugador();
  const datos = propuestaSchema.parse(entrada);
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("propuestas_horario").insert({
    partido_id: datos.partidoId,
    usuario_id: usuario.id,
    franjas: datos.franjas,
    texto: datos.texto,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/partidos");
  return { ok: true };
}

const resultadoSchema = z.object({
  partidoId: z.string().uuid(),
  fechaPartido: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sets: setsSchema,
  estricto: z.boolean(),
  /** Solo se usa en modo no estricto para fijar al ganador. */
  ganador: z.enum(["local", "visitante"]).optional(),
  observaciones: z.string().max(1000).optional(),
});

export type EntradaResultado = z.infer<typeof resultadoSchema>;

/**
 * Valida el resultado, arma el mail con la plantilla oficial y lo registra.
 * Devuelve asunto y cuerpo para que el cliente abra el correo.
 */
export async function guardarResultado(
  entrada: EntradaResultado,
): Promise<
  { ok: true; asunto: string; cuerpo: string; cc: string | null } | { ok: false; error: string }
> {
  const { usuario, jugador } = await exigirJugador();
  const datos = resultadoSchema.parse(entrada);
  const partido = await obtenerPartido(datos.partidoId);
  if (!partido) return { ok: false, error: "Partido no encontrado" };
  if (partido.local_id !== jugador.id && partido.visitante_id !== jugador.id) {
    return { ok: false, error: "No juegas este partido" };
  }

  const sets = datos.sets as Set[];
  const validacion = validarSets(sets, { estricto: datos.estricto });
  const lado = datos.estricto ? validacion.ganador : (datos.ganador ?? validacion.ganador);
  if (!validacion.ok && datos.estricto) return { ok: false, error: validacion.errores.join(". ") };
  if (!lado) return { ok: false, error: "Indica quién ganó" };

  const ganador = lado === "local" ? partido.local : partido.visitante;
  const mail = armarMailResultado({
    idPartido: partido.id_partido,
    fechaPartido: datos.fechaPartido,
    grupo: partido.grupo.letra,
    fase: partido.grupo.fase.numero,
    jornada: partido.jornada,
    local: partido.local.nombre,
    visitante: partido.visitante.nombre,
    sets,
    ganador: ganador.nombre,
    observaciones: datos.observaciones,
    firma: formatearNombre(jugador.nombre),
  });

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("resultados_enviados").insert({
    partido_id: partido.id,
    usuario_id: usuario.id,
    fecha_partido: datos.fechaPartido,
    sets,
    ganador_id: ganador.id,
    observaciones: datos.observaciones?.trim() || null,
    asunto: mail.asunto,
    cuerpo: mail.cuerpo,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/partidos");
  return {
    ok: true,
    asunto: mail.asunto,
    cuerpo: mail.cuerpo,
    cc: rivalDe(partido, jugador.id).email,
  };
}

/**
 * Borra los resultados registrados de un partido para que vuelva a aparecer
 * como pendiente (p. ej. tras una prueba). Solo pueden hacerlo los dos
 * jugadores del partido; el borrado salta la RLS porque esa tabla no tiene
 * política de delete.
 */
export async function reiniciarResultado(
  partidoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { jugador } = await exigirJugador();
  const id = z.string().uuid().parse(partidoId);
  const partido = await obtenerPartido(id);
  if (!partido) return { ok: false, error: "Partido no encontrado" };
  if (partido.local_id !== jugador.id && partido.visitante_id !== jugador.id) {
    return { ok: false, error: "No juegas este partido" };
  }
  const admin = crearClienteAdmin();
  const { error } = await admin.from("resultados_enviados").delete().eq("partido_id", partido.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/partidos");
  revalidatePath(`/partidos/${partido.id}/resultado`);
  return { ok: true };
}
