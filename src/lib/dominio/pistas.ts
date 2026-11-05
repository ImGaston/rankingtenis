/**
 * Pistas reservadas para el ranking, según el PDF «Ranking de tenis -
 * Alquiler de pistas» de la temporada 26-27. Turnos de 2 horas.
 */

/** Teléfono único de reserva de pistas del ranking (todas las sedes). */
export const TELEFONO_RESERVAS = "+34916665033";

export type Sede = "cerro" | "sureste";

export const SEDES: Record<Sede, string> = {
  cerro: "Cerro del Telégrafo",
  sureste: "Parque Sureste",
};

export const ORDEN_SEDES: Sede[] = ["cerro", "sureste"];

export interface Turno {
  sede: Sede;
  inicio: string;
  fin: string;
  /** Números de pista ("6" es la semicubierta). */
  pistas: string[];
}

/** Lunes = 0 … domingo = 6. */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const NOMBRES_DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const INICIALES_DIAS = ["L", "M", "X", "J", "V", "S", "D"] as const;

const MANANA = ["09:00", "11:00", "13:00"];
const TARDE = ["16:00", "18:00", "20:00"];

function sumarDosHoras(hora: string): string {
  return `${String(Number(hora.slice(0, 2)) + 2).padStart(2, "0")}:00`;
}

function turno(sede: Sede, inicio: string, pistas: string[]): Turno {
  return { sede, inicio, fin: sumarDosHoras(inicio), pistas };
}

/**
 * El PDF tiene dos tablas para el Cerro que se solapan por la mañana: la
 * primera (9 a 17 h, entre semana) da la semicubierta 6 —y la 4 el viernes—,
 * y la segunda (todo el día) da la 5 entre semana y la 4, 5 y 6 el fin de
 * semana. Aquí se combinan por franja.
 */
function turnosCerro(dia: DiaSemana): Turno[] {
  if (dia >= 5) {
    return [...MANANA, ...TARDE].map((h) => turno("cerro", h, ["4", "5", "6"]));
  }
  const viernes = dia === 4;
  return [
    ...MANANA.map((h) => turno("cerro", h, viernes ? ["4", "5", "6"] : ["5", "6"])),
    turno("cerro", "15:00", viernes ? ["4", "6"] : ["6"]),
    ...TARDE.map((h) => turno("cerro", h, ["5"])),
  ];
}

function turnosSureste(dia: DiaSemana): Turno[] {
  const pistas = dia >= 5 ? ["1", "2"] : ["1"];
  return [...MANANA, ...TARDE].map((h) => turno("sureste", h, pistas));
}

/** Turnos de ranking de un día de la semana, por sede y hora. */
export function turnosDelDia(dia: DiaSemana): Turno[] {
  return [...turnosCerro(dia), ...turnosSureste(dia)];
}

/** Día de la semana (lunes = 0) de una fecha YYYY-MM-DD. */
export function diaSemanaDe(iso: string): DiaSemana {
  const [y, m, d] = iso.split("-").map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) as DiaSemana;
}

/** "Pista 5", "Pista 6 (semicubierta)". */
export function nombrePista(sede: Sede, pista: string): string {
  return sede === "cerro" && pista === "6" ? "Pista 6 (semicubierta)" : `Pista ${pista}`;
}

/** Hoy en Madrid como YYYY-MM-DD. */
export function hoyEnMadrid(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(ahora);
}

/** Reserva de pista anotada para un partido. */
export interface ReservaPista {
  id: string;
  partido_id: string;
  /** null si quien la anotó borró su cuenta. */
  usuario_id: string | null;
  fecha: string;
  inicio: string;
  fin: string;
  sede: Sede;
  pista: string;
  creado_at: string;
}
