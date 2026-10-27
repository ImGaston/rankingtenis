import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirJugador } from "@/lib/consultas/sesion";
import { obtenerPartido, rivalDe } from "@/lib/consultas/partidos";
import { formatearNombre } from "@/lib/dominio/nombres";
import { formatearDia } from "@/lib/mensajes/franjas";
import { FormularioResultado } from "@/componentes/formulario-resultado";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { ResultadoEnviado } from "@/lib/dominio/tipos";

export const metadata = { title: "Enviar resultado" };

const LIGA_EMAIL_POR_DEFECTO = "ligasmunicipales@rivasciudad.es";

export default async function Resultado({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { jugador } = await exigirJugador();
  const partido = await obtenerPartido(id);
  if (!partido || (partido.local_id !== jugador.id && partido.visitante_id !== jugador.id))
    notFound();

  const rival = rivalDe(partido, jugador.id);
  const supabase = await crearClienteServidor();
  const { data: previo } = await supabase
    .from("resultados_enviados")
    .select("*")
    .eq("partido_id", partido.id)
    .order("creado_at", { ascending: false })
    .limit(1)
    .maybeSingle<ResultadoEnviado>();

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
        <h1 className="text-2xl font-bold">
          {formatearNombre(partido.local.nombre)} <span className="text-texto-suave">vs</span>{" "}
          {formatearNombre(partido.visitante.nombre)}
        </h1>
        <p className="mt-1 text-sm text-texto-suave">
          El mail va a la liga con copia a {formatearNombre(rival.nombre)}
          {rival.email ? "" : " (sin correo en la lista: añádelo a mano si lo tienes)"}.
        </p>
      </header>
      <FormularioResultado
        partidoId={partido.id}
        idPartido={partido.id_partido}
        local={partido.local.nombre}
        visitante={partido.visitante.nombre}
        grupo={partido.grupo.letra}
        fase={partido.grupo.fase.numero}
        jornada={partido.jornada}
        firma={formatearNombre(jugador.nombre)}
        ligaEmail={process.env.LIGA_EMAIL ?? LIGA_EMAIL_POR_DEFECTO}
        rivalEmail={rival.email}
        previo={
          previo
            ? {
                sets: previo.sets,
                fechaPartido: previo.fecha_partido,
                observaciones: previo.observaciones ?? "",
                asunto: previo.asunto,
                cuerpo: previo.cuerpo,
              }
            : null
        }
      />
    </div>
  );
}
