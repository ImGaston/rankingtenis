import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Jugador, Usuario } from "@/lib/dominio/tipos";
import { crearClienteServidor } from "@/lib/supabase/server";

export interface Contexto {
  /** Fila de public.usuarios del usuario autenticado. */
  usuario: Usuario;
  /** Jugador vinculado, si lo hay. */
  jugador: Jugador | null;
}

/**
 * Usuario autenticado y su jugador vinculado. Se memoriza por petición.
 * Devuelve null si no hay sesión.
 */
export const obtenerContexto = cache(async (): Promise<Contexto | null> => {
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", auth.user.id)
    .maybeSingle<Usuario>();
  if (!usuario) {
    // El trigger de alta no corrió todavía (carrera en el primer login) o
    // falló. Reintentar en la siguiente petición.
    return null;
  }

  let jugador: Jugador | null = null;
  if (usuario.jugador_id) {
    const { data } = await supabase
      .from("jugadores")
      .select("id, nombre, nombre_normalizado, telefono, email")
      .eq("id", usuario.jugador_id)
      .maybeSingle<Jugador>();
    jugador = data ?? null;
  }
  return { usuario, jugador };
});

/** Exige sesión; si no la hay, manda al inicio. */
export async function exigirSesion(): Promise<Contexto> {
  const ctx = await obtenerContexto();
  if (!ctx) redirect("/");
  return ctx;
}

/** Exige sesión con jugador vinculado; si no, manda a vincular. */
export async function exigirJugador(): Promise<Contexto & { jugador: Jugador }> {
  const ctx = await exigirSesion();
  if (!ctx.jugador) redirect("/vincular");
  return ctx as Contexto & { jugador: Jugador };
}

/** Exige rol admin; si no, 404 para no revelar la ruta. */
export async function exigirAdmin(): Promise<Contexto> {
  const ctx = await exigirSesion();
  if (ctx.usuario.rol !== "admin") redirect("/partidos");
  return ctx;
}
