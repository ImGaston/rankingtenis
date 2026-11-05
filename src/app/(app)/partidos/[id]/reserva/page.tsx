import Link from "next/link";
import { notFound } from "next/navigation";
import { quitarReserva } from "@/app/(app)/acciones";
import { exigirJugador } from "@/lib/consultas/sesion";
import { obtenerPartido, rivalDe } from "@/lib/consultas/partidos";
import { formatearNombre } from "@/lib/dominio/nombres";
import { hoyEnMadrid } from "@/lib/dominio/pistas";
import { diasDeSemana, formatearDia } from "@/lib/mensajes/franjas";
import { FormularioReserva } from "@/componentes/formulario-reserva";

export const metadata = { title: "Anotar reserva" };

export default async function AnotarReserva({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { jugador } = await exigirJugador();
  const partido = await obtenerPartido(id);
  if (!partido || (partido.local_id !== jugador.id && partido.visitante_id !== jugador.id))
    notFound();

  const rival = rivalDe(partido, jugador.id);
  // Por defecto, hoy si cae en la semana del partido; si no, el lunes de esa semana.
  const hoy = hoyEnMadrid();
  const fechaInicial = diasDeSemana(partido.semana).includes(hoy) ? hoy : partido.semana;
  const previa = partido.reserva;

  return (
    <div className="space-y-6">
      <Link href="/partidos" className="text-sm text-primario underline">
        ← Mis partidos
      </Link>
      <header>
        <p className="text-sm text-texto-suave">
          Jornada {partido.jornada} · semana del {formatearDia(partido.semana)} · Grupo{" "}
          {partido.grupo.letra}
        </p>
        <h1 className="titulo-pagina banderin">
          {previa ? "Cambiar reserva" : "Anotar reserva"} contra {formatearNombre(rival.nombre)}
        </h1>
        <p className="mt-1 text-sm text-texto-suave">
          Cuando ya tengas pista, anótala aquí y le aparecerá también a tu rival en su tarjeta del
          partido. Los turnos de cada día están en{" "}
          <Link href="/pistas" className="text-primario underline">
            Pistas
          </Link>
          .
        </p>
      </header>

      <FormularioReserva partidoId={partido.id} fechaInicial={fechaInicial} previa={previa} />

      {previa && (
        <form action={quitarReserva}>
          <input type="hidden" name="partidoId" value={partido.id} />
          <button type="submit" className="boton-secundario text-texto-suave">
            Quitar reserva
          </button>
        </form>
      )}
    </div>
  );
}
