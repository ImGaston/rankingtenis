import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirJugador } from "@/lib/consultas/sesion";
import { obtenerPartido, rivalDe, soyLocal } from "@/lib/consultas/partidos";
import { formatearNombre } from "@/lib/dominio/nombres";
import { formatearDia } from "@/lib/mensajes/franjas";
import { FormularioPropuesta } from "@/componentes/formulario-propuesta";

export const metadata = { title: "Proponer horario" };

export default async function Proponer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { jugador } = await exigirJugador();
  const partido = await obtenerPartido(id);
  if (!partido || (partido.local_id !== jugador.id && partido.visitante_id !== jugador.id))
    notFound();

  const rival = rivalDe(partido, jugador.id);
  const local = soyLocal(partido, jugador.id);

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
        <h1 className="text-2xl font-bold">Proponer horario a {formatearNombre(rival.nombre)}</h1>
        {!local && (
          <p className="mt-1 text-sm text-acento">
            Juegas de visitante: le toca proponer a tu rival, pero puedes adelantarte si quieres.
          </p>
        )}
      </header>
      <FormularioPropuesta
        partidoId={partido.id}
        semana={partido.semana}
        jornada={partido.jornada}
        grupo={partido.grupo.letra}
        yo={jugador.nombre}
        rival={rival.nombre}
        telefonoRival={rival.telefono}
      />
    </div>
  );
}
