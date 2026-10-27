import { redirect } from "next/navigation";
import { exigirSesion } from "@/lib/consultas/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { formatearNombre } from "@/lib/dominio/nombres";
import { SelectorJugador } from "@/componentes/selector-jugador";
import { solicitarVinculo } from "../acciones";

export const metadata = { title: "Vincular cuenta" };

export default async function Vincular() {
  const { usuario, jugador } = await exigirSesion();
  if (jugador) redirect("/partidos");

  const supabase = await crearClienteServidor();
  const { data: nombres } = await supabase.rpc("listar_jugadores_fase");
  const lista = (nombres ?? []) as { id: string; nombre: string }[];

  let solicitado: string | null = null;
  if (usuario.estado_vinculo === "pendiente" && usuario.jugador_solicitado_id) {
    solicitado = lista.find((j) => j.id === usuario.jugador_solicitado_id)?.nombre ?? null;
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">¿Quién eres en el ranking?</h1>
        <p className="text-texto-suave">
          Tu correo <strong className="text-texto">{usuario.email}</strong> no coincide con ninguno
          de la lista de la liga. Elige tu nombre y el administrador lo confirmará.
        </p>
      </header>

      {usuario.estado_vinculo === "pendiente" && (
        <div className="tarjeta border-acento/40 bg-acento-suave space-y-1">
          <p className="font-semibold">Solicitud enviada</p>
          <p className="text-sm text-texto-suave">
            Pediste vincularte como{" "}
            <strong className="text-texto">
              {solicitado ? formatearNombre(solicitado) : "un jugador"}
            </strong>
            . En cuanto el administrador lo apruebe verás tus partidos. Si te equivocaste, elige
            otro nombre abajo.
          </p>
        </div>
      )}
      {usuario.estado_vinculo === "rechazado" && (
        <div className="tarjeta border-peligro/40 space-y-1">
          <p className="font-semibold">Solicitud rechazada</p>
          <p className="text-sm text-texto-suave">
            El administrador no pudo confirmar ese nombre. Vuelve a elegir o escríbele directamente.
          </p>
        </div>
      )}

      {lista.length === 0 ? (
        <div className="tarjeta text-sm text-texto-suave">
          Todavía no hay una fase cargada. Vuelve a entrar cuando la liga publique el calendario.
        </div>
      ) : (
        <form action={solicitarVinculo} className="tarjeta space-y-4">
          <SelectorJugador jugadores={lista} />
          <button type="submit" className="boton-primario w-full">
            Pedir vinculación
          </button>
        </form>
      )}
    </div>
  );
}
