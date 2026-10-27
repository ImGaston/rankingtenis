import Link from "next/link";
import { notFound } from "next/navigation";
import { marcarWalkover } from "@/app/(app)/acciones";
import { exigirJugador } from "@/lib/consultas/sesion";
import { obtenerPartido, rivalDe, soyLocal } from "@/lib/consultas/partidos";
import { formatearNombre } from "@/lib/dominio/nombres";
import { MOTIVOS_WALKOVER } from "@/lib/dominio/walkover";
import { formatearDia } from "@/lib/mensajes/franjas";

export const metadata = { title: "Marcar W.O." };

export default async function MarcarWo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { jugador } = await exigirJugador();
  const partido = await obtenerPartido(id);
  if (!partido || (partido.local_id !== jugador.id && partido.visitante_id !== jugador.id))
    notFound();

  const rival = rivalDe(partido, jugador.id);
  const yo = soyLocal(partido, jugador.id) ? "local" : "visitante";
  const ladoRival = yo === "local" ? "visitante" : "local";
  const previo = partido.walkover;
  const ausentePrevio = previo
    ? previo.ausente_id === partido.local_id
      ? "local"
      : "visitante"
    : ladoRival;

  return (
    <div className="space-y-6">
      <Link href="/partidos" className="text-sm text-primario underline">
        ← Mis partidos
      </Link>
      <header>
        <p className="text-sm text-texto-suave">
          Jornada {partido.jornada} · semana del {formatearDia(partido.semana)} · Grupo{" "}
          {partido.grupo.letra} · Id {partido.id_partido}
        </p>
        <h1 className="text-2xl font-bold">Marcar W.O. contra {formatearNombre(rival.nombre)}</h1>
        <p className="mt-1 text-sm text-texto-suave">
          Para cuando la liga avisa de que un jugador no puede disputar el partido y lo da por
          perdido 0-6 0-6. No se manda ningún mail: la coordinación ya lo tiene.
        </p>
      </header>

      {previo && (
        <div className="tarjeta border-primario/40 bg-primario-suave text-sm">
          Este partido ya tiene un W.O. registrado. Si lo guardas de nuevo, se sustituye.
        </div>
      )}

      <form action={marcarWalkover} className="tarjeta space-y-5">
        <input type="hidden" name="partidoId" value={partido.id} />

        <fieldset className="space-y-2">
          <legend className="etiqueta">¿Quién no juega?</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="ausente"
              value={ladoRival}
              defaultChecked={ausentePrevio === ladoRival}
              className="accent-primario"
            />
            {formatearNombre(rival.nombre)} (ganas tú)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="ausente"
              value={yo}
              defaultChecked={ausentePrevio === yo}
              className="accent-primario"
            />
            {formatearNombre(jugador.nombre)} (pierdes tú)
          </label>
        </fieldset>

        <label className="block max-w-xs">
          <span className="etiqueta">Motivo</span>
          <select name="motivo" className="campo" defaultValue={previo?.motivo ?? "lesion"}>
            {MOTIVOS_WALKOVER.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="conSancion"
            defaultChecked={previo?.con_sancion ?? false}
            className="mt-1 accent-primario"
          />
          <span>
            Con sanción. Déjalo sin marcar si el aviso de la liga dice «sin sanción alguna» (lo
            habitual con una lesión).
          </span>
        </label>

        <label className="block">
          <span className="etiqueta">Nota (opcional)</span>
          <textarea
            name="nota"
            className="campo"
            rows={3}
            maxLength={1000}
            defaultValue={previo?.nota ?? ""}
            placeholder="Puedes pegar el aviso de la liga"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="boton-primario">
            {previo ? "Guardar cambios" : "Marcar W.O."}
          </button>
          <Link href="/partidos" className="boton-secundario">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
