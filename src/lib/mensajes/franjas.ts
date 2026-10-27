import type { Franja } from "@/lib/dominio/tipos";

/**
 * Franjas de alquiler de pista del ranking (2 horas), según el PDF de
 * horarios del Ayuntamiento. Son sugerencias para el mensaje al rival.
 */
export const FRANJAS: ReadonlyArray<readonly [string, string]> = [
  ["09:00", "11:00"],
  ["11:00", "13:00"],
  ["13:00", "15:00"],
  ["16:00", "18:00"],
  ["18:00", "20:00"],
  ["20:00", "22:00"],
];

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function aFechaUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function aIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Los 7 días (YYYY-MM-DD) de la semana del partido, empezando por el lunes dado. */
export function diasDeSemana(lunes: string): string[] {
  const base = aFechaUtc(lunes);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    return aIso(d);
  });
}

/** "martes 27/10" */
export function formatearDia(iso: string, opciones: { corto?: boolean } = {}): string {
  const fecha = aFechaUtc(iso);
  const nombre = (opciones.corto ? DIAS_CORTOS : DIAS)[fecha.getUTCDay()];
  const dd = String(fecha.getUTCDate()).padStart(2, "0");
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${nombre} ${dd}/${mm}`;
}

/** "27/10/2026" */
export function formatearFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "martes 27/10 de 18:00 a 20:00" */
export function formatearFranja(f: Franja): string {
  return `${formatearDia(f.fecha)} de ${f.inicio} a ${f.fin}`;
}

/** Ordena franjas por fecha y hora de inicio. */
export function ordenarFranjas(franjas: Franja[]): Franja[] {
  return [...franjas].sort((a, b) =>
    a.fecha === b.fecha ? a.inicio.localeCompare(b.inicio) : a.fecha.localeCompare(b.fecha),
  );
}

/** Lista legible: agrupa por día ("martes 27/10: 18:00-20:00 o 20:00-22:00"). */
export function describirFranjas(franjas: Franja[]): string[] {
  const porDia = new Map<string, string[]>();
  for (const f of ordenarFranjas(franjas)) {
    const lista = porDia.get(f.fecha) ?? [];
    lista.push(`${f.inicio}-${f.fin}`);
    porDia.set(f.fecha, lista);
  }
  return [...porDia.entries()].map(
    ([fecha, horas]) => `${formatearDia(fecha)}: ${horas.join(" o ")}`,
  );
}
