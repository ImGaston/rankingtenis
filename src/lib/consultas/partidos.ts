import "server-only";

import type { Fase, Jugador, Partido, Walkover } from "@/lib/dominio/tipos";
import { crearClienteServidor } from "@/lib/supabase/server";

export interface PartidoDetalle extends Partido {
  grupo: {
    id: string;
    letra: string;
    fase: Pick<Fase, "id" | "numero" | "temporada" | "es_actual">;
  };
  local: Jugador;
  visitante: Jugador;
  propuestas_horario: { id: string; creado_at: string; usuario_id: string }[];
  resultados_enviados: { id: string; creado_at: string; usuario_id: string }[];
  /** W.O. registrado para el partido, si lo hay. */
  walkover: Pick<
    Walkover,
    "id" | "ausente_id" | "motivo" | "con_sancion" | "nota" | "creado_at"
  > | null;
}

const SELECT = `
  *,
  grupo:grupos!inner ( id, letra, fase:fases!inner ( id, numero, temporada, es_actual ) ),
  local:jugadores!partidos_local_id_fkey ( id, nombre, nombre_normalizado, telefono, email ),
  visitante:jugadores!partidos_visitante_id_fkey ( id, nombre, nombre_normalizado, telefono, email ),
  propuestas_horario ( id, creado_at, usuario_id ),
  resultados_enviados ( id, creado_at, usuario_id ),
  walkover:walkovers ( id, ausente_id, motivo, con_sancion, nota, creado_at )
`;

/**
 * PostgREST devuelve la relación con walkovers como objeto (partido_id es
 * único) pero, por si cambia la detección, se acepta también un array.
 */
function normalizar(fila: Record<string, unknown>): PartidoDetalle {
  const wo = fila.walkover;
  return {
    ...fila,
    walkover: Array.isArray(wo) ? (wo[0] ?? null) : (wo ?? null),
  } as PartidoDetalle;
}

/** Partidos del jugador en la fase actual (la RLS ya limita a fases publicadas). */
export async function misPartidos(jugadorId: string): Promise<PartidoDetalle[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("partidos")
    .select(SELECT)
    .eq("grupo.fase.es_actual", true)
    .or(`local_id.eq.${jugadorId},visitante_id.eq.${jugadorId}`)
    .order("semana", { ascending: true })
    .order("jornada", { ascending: true });
  if (error) throw new Error(`No se pudieron cargar los partidos: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizar);
}

/** Un partido con sus jugadores; null si no existe o no es visible. */
export async function obtenerPartido(id: string): Promise<PartidoDetalle | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("partidos").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo cargar el partido: ${error.message}`);
  return data ? normalizar(data as Record<string, unknown>) : null;
}

/** Rival de un jugador en un partido. */
export function rivalDe(partido: PartidoDetalle, jugadorId: string): Jugador {
  return partido.local_id === jugadorId ? partido.visitante : partido.local;
}

export function soyLocal(partido: PartidoDetalle, jugadorId: string): boolean {
  return partido.local_id === jugadorId;
}

/** ¿El partido ya está resuelto (resultado enviado o W.O.)? */
export function estaCerrado(partido: PartidoDetalle): boolean {
  return partido.walkover !== null || partido.resultados_enviados.length > 0;
}

export function nombreFase(fase: Pick<Fase, "numero">): string {
  return `${fase.numero}ª fase`;
}
