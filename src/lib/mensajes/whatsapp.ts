import type { Franja } from "@/lib/dominio/tipos";
import { formatearNombre, nombreDePila } from "@/lib/dominio/nombres";
import { describirFranjas } from "./franjas";

export interface DatosPropuesta {
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
    `Hola ${nombreDePila(d.rival)}, soy ${formatearNombre(d.yo)}, tu rival de la jornada ${d.jornada} del Ranking de Tenis (grupo ${d.grupo}).`,
    disponibilidad,
    "En cuanto me digas reservo la pista.",
  ].join("\n");
}

/**
 * Enlace wa.me para abrir WhatsApp con el mensaje. El teléfono va en E.164
 * sin el signo más.
 */
export function urlWhatsapp(telefonoE164: string, texto: string): string {
  const numero = telefonoE164.replace(/[^0-9]/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
