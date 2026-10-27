import type { MotivoWalkover, Set } from "./tipos";
import { formatearNombre } from "./nombres";
import type { Lado } from "./sets";

export const MOTIVOS_WALKOVER: ReadonlyArray<{ valor: MotivoWalkover; etiqueta: string }> = [
  { valor: "lesion", etiqueta: "Lesión" },
  { valor: "baja", etiqueta: "Baja de la fase" },
  { valor: "incomparecencia", etiqueta: "No se presentó" },
  { valor: "otro", etiqueta: "Otro motivo" },
];

export function etiquetaMotivo(motivo: MotivoWalkover): string {
  return MOTIVOS_WALKOVER.find((m) => m.valor === motivo)?.etiqueta ?? motivo;
}

/** Resultado oficial de un W.O. con los juegos del local primero. */
export function setsWalkover(ausente: Lado): Set[] {
  return ausente === "local"
    ? [
        [0, 6],
        [0, 6],
      ]
    : [
        [6, 0],
        [6, 0],
      ];
}

export interface DatosWalkover {
  /** Nombre del jugador que no juega. */
  ausente: string;
  /** Nombre del que gana por W.O. */
  ganador: string;
  motivo: MotivoWalkover;
  conSancion: boolean;
  /** Id del jugador que lee el texto, para ponerlo en primera persona. */
  perspectiva: "ganador" | "ausente" | "ninguno";
}

const MOTIVO_EN_FRASE: Record<MotivoWalkover, string> = {
  lesion: "por lesión",
  baja: "por baja de la fase",
  incomparecencia: "por no presentarse",
  otro: "",
};

/**
 * "Ganado por W.O.: Javier Baeza no juega por lesión. La liga lo da 6-0 6-0 sin sanción."
 */
export function describirWalkover(d: DatosWalkover): string {
  const motivo = MOTIVO_EN_FRASE[d.motivo];
  const sancion = d.conSancion ? "con sanción" : "sin sanción";
  const ausente = formatearNombre(d.ausente);
  const ganador = formatearNombre(d.ganador);
  const resultado = d.perspectiva === "ausente" ? "0-6 0-6" : "6-0 6-0";
  const inicio =
    d.perspectiva === "ganador"
      ? `Ganado por W.O.: ${ausente} no juega${motivo ? ` ${motivo}` : ""}.`
      : d.perspectiva === "ausente"
        ? `Perdido por W.O.: no juegas${motivo ? ` ${motivo}` : ""}.`
        : `W.O.: ${ausente} no juega${motivo ? ` ${motivo}` : ""}.`;
  const fin =
    d.perspectiva === "ganador"
      ? `La liga te lo da ${resultado} ${sancion}.`
      : d.perspectiva === "ausente"
        ? `La liga se lo da a ${ganador} ${resultado} ${sancion}.`
        : `La liga se lo da a ${ganador} ${resultado} ${sancion}.`;
  return `${inicio} ${fin}`;
}
