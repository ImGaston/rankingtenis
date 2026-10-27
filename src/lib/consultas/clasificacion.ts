import "server-only";

import type {
  ClasificacionFila,
  Jugador,
  RankingFila,
  ResultadoOficial,
} from "@/lib/dominio/tipos";
import { crearClienteServidor } from "@/lib/supabase/server";

export interface ClasificacionDetalle extends ClasificacionFila {
  jugador: Pick<Jugador, "id" | "nombre">;
}

/** Clasificación oficial de un grupo, ordenada por posición. Vacía si la liga aún no la mandó. */
export async function clasificacionDeGrupo(grupoId: string): Promise<ClasificacionDetalle[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("clasificacion_grupo")
    .select("*, jugador:jugadores ( id, nombre )")
    .eq("grupo_id", grupoId)
    .order("posicion", { ascending: true });
  if (error) throw new Error(`No se pudo cargar la clasificación: ${error.message}`);
  return (data ?? []) as unknown as ClasificacionDetalle[];
}

export interface PartidoConResultado {
  id: string;
  id_partido: string;
  jornada: number;
  semana: string;
  local_id: string;
  visitante_id: string;
  local: Pick<Jugador, "id" | "nombre">;
  visitante: Pick<Jugador, "id" | "nombre">;
  resultados_oficiales: ResultadoOficial | ResultadoOficial[] | null;
}

/** Todos los partidos de un grupo con su resultado oficial (si lo hay). */
export async function partidosDeGrupo(grupoId: string): Promise<PartidoConResultado[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("partidos")
    .select(
      `id, id_partido, jornada, semana, local_id, visitante_id,
       local:jugadores!partidos_local_id_fkey ( id, nombre ),
       visitante:jugadores!partidos_visitante_id_fkey ( id, nombre ),
       resultados_oficiales ( partido_id, ganador_id, sets, sets_local, sets_visitante, actualizado_at )`,
    )
    .eq("grupo_id", grupoId)
    .order("jornada", { ascending: true })
    .order("id_partido", { ascending: true });
  if (error) throw new Error(`No se pudieron cargar los partidos del grupo: ${error.message}`);
  return (data ?? []) as unknown as PartidoConResultado[];
}

export function oficialDe(p: PartidoConResultado): ResultadoOficial | null {
  const r = p.resultados_oficiales;
  if (!r) return null;
  return Array.isArray(r) ? (r[0] ?? null) : r;
}

/** Ranking general y femenino de la última temporada cargada, con nombres. */
export async function listarRanking(): Promise<RankingFila[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("listar_ranking");
  if (error) throw new Error(`No se pudo cargar el ranking: ${error.message}`);
  return (data ?? []) as RankingFila[];
}
