import { crearClienteServidor } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/dominio/tipos";
import { formatearNombre } from "@/lib/dominio/nombres";
import {
  aprobarVinculo,
  asignarJugador,
  cambiarRol,
  desvincular,
  rechazarVinculo,
} from "../acciones";

export const metadata = { title: "Usuarios" };

interface UsuarioDetalle extends Usuario {
  jugador: { nombre: string } | null;
  solicitado: { nombre: string } | null;
}

const ESTADOS: Record<Usuario["estado_vinculo"], string> = {
  sin_vincular: "Sin vincular",
  automatico: "Vinculado por email",
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export default async function AdminUsuarios() {
  const supabase = await crearClienteServidor();
  const [{ data: usuarios }, { data: jugadores }] = await Promise.all([
    supabase
      .from("usuarios")
      .select(
        "*, jugador:jugadores!usuarios_jugador_id_fkey ( nombre ), solicitado:jugadores!usuarios_jugador_solicitado_id_fkey ( nombre )",
      )
      .order("creado_at", { ascending: false }),
    supabase.from("jugadores").select("id, nombre").order("nombre"),
  ]);
  const lista = (usuarios ?? []) as unknown as UsuarioDetalle[];
  const opciones = (jugadores ?? []) as { id: string; nombre: string }[];
  const pendientes = lista.filter((u) => u.estado_vinculo === "pendiente");
  const resto = lista.filter((u) => u.estado_vinculo !== "pendiente");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-texto-suave">
          Cuentas que entraron con Google y su vínculo con un jugador del directorio.
        </p>
      </header>

      {pendientes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Pendientes de aprobar ({pendientes.length})</h2>
          {pendientes.map((u) => (
            <article
              key={u.id}
              className="tarjeta border-acento/40 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium">{u.email}</p>
                <p className="text-sm text-texto-suave">
                  {u.nombre_google ? `${u.nombre_google} · ` : ""}pide ser{" "}
                  <strong className="text-texto">
                    {u.solicitado ? formatearNombre(u.solicitado.nombre) : "?"}
                  </strong>
                </p>
              </div>
              <div className="flex gap-2">
                <form action={aprobarVinculo}>
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" className="boton-primario">
                    Aprobar
                  </button>
                </form>
                <form action={rechazarVinculo}>
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" className="boton-secundario">
                    Rechazar
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Todos ({lista.length})</h2>
        {resto.length === 0 && pendientes.length === 0 && (
          <div className="tarjeta text-texto-suave">Nadie ha entrado todavía.</div>
        )}
        {resto.map((u) => (
          <article key={u.id} className="tarjeta space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {u.email}
                  {u.rol === "admin" && (
                    <span className="ml-2 chip bg-acento-suave text-acento">admin</span>
                  )}
                </p>
                <p className="text-sm text-texto-suave">
                  {ESTADOS[u.estado_vinculo]}
                  {u.jugador ? ` · ${formatearNombre(u.jugador.nombre)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {u.jugador_id && (
                  <form action={desvincular}>
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className="boton-secundario">
                      Desvincular
                    </button>
                  </form>
                )}
                <form action={cambiarRol}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="rol" value={u.rol === "admin" ? "jugador" : "admin"} />
                  <button type="submit" className="boton-secundario">
                    {u.rol === "admin" ? "Quitar admin" : "Hacer admin"}
                  </button>
                </form>
              </div>
            </div>
            <form action={asignarJugador} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={u.id} />
              <label className="grow">
                <span className="etiqueta">Asignar jugador a mano</span>
                <select name="jugador" className="campo" defaultValue={u.jugador_id ?? ""} required>
                  <option value="" disabled>
                    Elige un jugador
                  </option>
                  {opciones.map((j) => (
                    <option key={j.id} value={j.id}>
                      {formatearNombre(j.nombre)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="boton-secundario">
                Guardar
              </button>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
