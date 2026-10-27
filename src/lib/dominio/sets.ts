import { z } from "zod";
import type { Set } from "./tipos";

export type Lado = "local" | "visitante";

const setSchema = z.tuple([
  z.coerce.number().int().min(0).max(99),
  z.coerce.number().int().min(0).max(99),
]);

export const setsSchema = z.array(setSchema).min(1).max(3);

/** ¿Es un set válido de tenis a 6 juegos (6-0..6-4, 7-5, 7-6)? */
export function esSetValido([a, b]: Set): boolean {
  const [mayor, menor] = a > b ? [a, b] : [b, a];
  if (mayor === 6) return menor <= 4;
  if (mayor === 7) return menor === 5 || menor === 6;
  return false;
}

/** ¿Es un super tie-break válido (a 10, con diferencia de 2)? */
export function esSuperTieBreakValido([a, b]: Set): boolean {
  const [mayor, menor] = a > b ? [a, b] : [b, a];
  return mayor >= 10 && mayor - menor >= 2;
}

export interface ResultadoValidacion {
  ok: boolean;
  ganador?: Lado;
  errores: string[];
}

/**
 * Valida los sets y determina el ganador. En modo estricto exige sets de
 * tenis reales y que el partido termine al ganar dos sets. En modo no
 * estricto (abandono, W.O.) solo exige que un lado haya ganado más sets.
 */
export function validarSets(
  sets: Set[],
  opciones: { estricto?: boolean } = {},
): ResultadoValidacion {
  const estricto = opciones.estricto ?? true;
  const errores: string[] = [];
  if (sets.length === 0) return { ok: false, errores: ["Introduce al menos un set"] };

  let local = 0;
  let visitante = 0;
  sets.forEach((set, i) => {
    const [a, b] = set;
    if (a === b) {
      errores.push(`El set ${i + 1} no puede quedar empatado`);
      return;
    }
    if (estricto) {
      const esTercero = i === 2;
      const valido = esSetValido(set) || (esTercero && esSuperTieBreakValido(set));
      if (!valido) {
        errores.push(
          esTercero
            ? `El set ${i + 1} debe ser 6-x, 7-5, 7-6 o un super tie-break a 10`
            : `El set ${i + 1} debe ser 6-0 a 6-4, 7-5 o 7-6`,
        );
      }
    }
    if (a > b) local += 1;
    else visitante += 1;
  });

  if (estricto) {
    if (sets.length === 3 && (local === 0 || visitante === 0)) {
      errores.push("Si un jugador gana los dos primeros sets no hay tercer set");
    }
    if (sets.length < 3 && local < 2 && visitante < 2) {
      errores.push("El partido se juega al mejor de tres sets: falta un set");
    }
  }
  if (local === visitante) errores.push("No se puede determinar el ganador");

  if (errores.length > 0) return { ok: false, errores };
  return { ok: true, ganador: local > visitante ? "local" : "visitante", errores: [] };
}

/** "6-0 / 6-0" con los juegos del local primero. */
export function formatearSets(sets: Set[]): string {
  return sets.map(([a, b]) => `${a}-${b}`).join(" / ");
}
