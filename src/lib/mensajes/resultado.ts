import type { Set } from "@/lib/dominio/tipos";
import { formatearNombre } from "@/lib/dominio/nombres";
import { formatearSets } from "@/lib/dominio/sets";
import { formatearFecha } from "./franjas";

export interface DatosResultado {
  idPartido: string;
  /** YYYY-MM-DD */
  fechaPartido: string;
  grupo: string;
  fase: number;
  jornada: number;
  local: string;
  visitante: string;
  /** Juegos del local primero en cada set. */
  sets: Set[];
  ganador: string;
  observaciones?: string | null;
  firma: string;
}

export interface MailResultado {
  asunto: string;
  cuerpo: string;
}

/**
 * Plantilla oficial de la liga para comunicar un resultado. El texto sigue
 * el formato que pide la coordinación; cambiar aquí si la liga lo modifica.
 */
export function armarMailResultado(d: DatosResultado): MailResultado {
  const asunto = `resultado partido ${d.idPartido}`;
  const observaciones = (d.observaciones ?? "").trim() || "-";
  const cuerpo = [
    `Fecha de Partido: ${formatearFecha(d.fechaPartido)}`,
    `Grupo: ${d.grupo} (${d.fase}ª fase)`,
    `Jornada: J${d.jornada}`,
    `Rankista Local vs. Rankista Visitante: ${formatearNombre(d.local)} vs ${formatearNombre(d.visitante)} ${d.idPartido}`,
    `Resultado: ${formatearSets(d.sets)}`,
    `Victoria: ${formatearNombre(d.ganador)}`,
    `Observaciones: ${observaciones}`,
    "",
    d.firma,
  ].join("\n");
  return { asunto, cuerpo };
}

export interface DestinatariosMail {
  para: string;
  cc?: string | null;
}

/** Enlace mailto: con asunto, cuerpo y copia. */
export function urlMailto(dest: DestinatariosMail, mail: MailResultado): string {
  const params = new URLSearchParams();
  if (dest.cc) params.set("cc", dest.cc);
  params.set("subject", mail.asunto);
  params.set("body", mail.cuerpo);
  // URLSearchParams codifica los espacios como "+", que mailto no interpreta.
  return `mailto:${dest.para}?${params.toString().replace(/\+/g, "%20")}`;
}

/** Enlace para abrir el redactor de Gmail web con el mail listo. */
export function urlGmail(dest: DestinatariosMail, mail: MailResultado): string {
  const params = new URLSearchParams({ view: "cm", fs: "1", to: dest.para });
  if (dest.cc) params.set("cc", dest.cc);
  params.set("su", mail.asunto);
  params.set("body", mail.cuerpo);
  return `https://mail.google.com/mail/?${params.toString()}`;
}
