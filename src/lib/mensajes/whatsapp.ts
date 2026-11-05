import type { Franja } from "@/lib/dominio/tipos";
import { nombreDePila } from "@/lib/dominio/nombres";
import { describirFranjas, formatearDia } from "./franjas";

export interface DatosPropuesta {
  /** Cómo quiere presentarse quien escribe (ver nombreVisible), tal cual. */
  yo: string;
  rival: string;
  jornada: number;
  grupo: string;
  franjas: Franja[];
}

/** Texto de la propuesta de horario para el rival (el local propone). */
export function armarMensajeWhatsapp(d: DatosPropuesta): string {
  const lineas = describirFranjas(d.franjas);
  const disponibilidad =
    lineas.length === 0
      ? "¿Qué días y horas te vienen bien?"
      : `Me va bien:\n${lineas.map((l) => `- ${l}`).join("\n")}\n¿Cuál te viene mejor?`;
  return [
    `Hola ${nombreDePila(d.rival)}, soy ${d.yo}, tu rival de la jornada ${d.jornada} del Ranking de Tenis (grupo ${d.grupo}).`,
    disponibilidad,
    "En cuanto me digas reservo la pista.",
  ].join("\n");
}

export interface DatosReserva {
  yo: string;
  rival: string;
  jornada: number;
  fecha: string;
  inicio: string;
  fin: string;
  sede: string;
  pista: string;
}

/** Aviso al rival de la pista reservada. */
export function armarMensajeReserva(d: DatosReserva): string {
  return [
    `Hola ${nombreDePila(d.rival)}, soy ${d.yo}. Ya tenemos pista para el partido de la jornada ${d.jornada} del Ranking de Tenis:`,
    `${formatearDia(d.fecha)} de ${d.inicio} a ${d.fin} en ${d.sede}, ${d.pista}.`,
    "¡Nos vemos allí!",
  ].join("\n");
}

/**
 * Enlace wa.me para abrir WhatsApp con el mensaje (o solo el chat si no hay
 * texto). El teléfono va en E.164 sin el signo más.
 */
export function urlWhatsapp(telefonoE164: string, texto = ""): string {
  const numero = telefonoE164.replace(/[^0-9]/g, "");
  const base = `https://wa.me/${numero}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}
