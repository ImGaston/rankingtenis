// Tipos de dominio alineados con las tablas de supabase/migrations.

export type Rol = "jugador" | "admin";

export type EstadoVinculo = "sin_vincular" | "automatico" | "pendiente" | "aprobado" | "rechazado";

export interface Fase {
  id: string;
  temporada: string;
  numero: number;
  publicada: boolean;
  es_actual: boolean;
  creado_at: string;
}

export interface Grupo {
  id: string;
  fase_id: string;
  letra: string;
}

export interface Jugador {
  id: string;
  nombre: string;
  nombre_normalizado: string;
  telefono: string | null;
  email: string | null;
}

export interface Partido {
  id: string;
  grupo_id: string;
  id_partido: string;
  vuelta: number;
  jornada: number;
  /** Lunes de la semana en que toca jugar, formato YYYY-MM-DD. */
  semana: string;
  local_id: string;
  visitante_id: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre_google: string | null;
  rol: Rol;
  jugador_id: string | null;
  estado_vinculo: EstadoVinculo;
  jugador_solicitado_id: string | null;
  creado_at: string;
}

export interface Franja {
  /** YYYY-MM-DD */
  fecha: string;
  /** HH:MM */
  inicio: string;
  /** HH:MM */
  fin: string;
}

export interface PropuestaHorario {
  id: string;
  partido_id: string;
  usuario_id: string;
  franjas: Franja[];
  texto: string;
  creado_at: string;
}

/** Un set como [juegos del local, juegos del visitante]. */
export type Set = [number, number];

export interface ResultadoEnviado {
  id: string;
  partido_id: string;
  usuario_id: string;
  fecha_partido: string;
  sets: Set[];
  ganador_id: string;
  observaciones: string | null;
  asunto: string;
  cuerpo: string;
  creado_at: string;
}

/** Resultado oficial comunicado por la liga (manda sobre lo enviado desde la app). */
export interface ResultadoOficial {
  partido_id: string;
  ganador_id: string;
  /** Tal como lo anota la liga: el super tie-break viene como 1-0. */
  sets: Set[];
  sets_local: number;
  sets_visitante: number;
  actualizado_at: string;
}

/** Fila de la tabla "Clasificación" del PDF de grupo. */
export interface ClasificacionFila {
  grupo_id: string;
  jugador_id: string;
  posicion: number;
  jugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  sets_favor: number;
  sets_contra: number;
  puntos_sancion: number;
  puntos: number;
  sanciones: number | null;
  no_presentados: number;
  actualizado_at: string;
}

export type TipoRanking = "general" | "femenino";

/** Fila de listar_ranking(): ranking general con nombre, sin datos de contacto. */
export interface RankingFila {
  temporada: string;
  tipo: TipoRanking;
  posicion: number;
  jugador_id: string;
  nombre: string;
  puntos: number;
  por_fase: Record<string, number>;
  fecha_corte: string | null;
}

export interface Ingesta {
  id: string;
  origen: "agente" | "manual";
  gmail_message_id: string | null;
  asunto_mail: string | null;
  recibido_at: string | null;
  archivos: string[];
  resumen: Record<string, number>;
  avisos: Array<Record<string, string>>;
  creado_at: string;
}
