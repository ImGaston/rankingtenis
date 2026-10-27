import Link from "next/link";
import { notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import type {
  ClasificacionFila,
  Fase,
  Ingesta,
  Jugador,
  ResultadoOficial,
} from "@/lib/dominio/tipos";
import { formatearSets } from "@/lib/dominio/sets";
import { TablaClasificacion } from "@/componentes/tabla-clasificacion";
import { formatearNombre, formatearTelefono } from "@/lib/dominio/nombres";
import { formatearDia } from "@/lib/mensajes/franjas";

export const metadata = { title: "Revisar fase" };

interface GrupoDetalle {
  id: string;
  letra: string;
  grupo_jugadores: { jugador: Jugador }[];
  partidos: {
    id: string;
    id_partido: string;
    jornada: number;
    semana: string;
    local: { nombre: string };
    visitante: { nombre: string };
    resultados_enviados: { id: string }[];
    propuestas_horario: { id: string }[];
    walkovers: { id: string; con_sancion: boolean }[] | { id: string; con_sancion: boolean } | null;
    resultados_oficiales: ResultadoOficial | ResultadoOficial[] | null;
  }[];
  clasificacion_grupo: (ClasificacionFila & { jugador: { id: string; nombre: string } })[];
}

function oficialDe(p: GrupoDetalle["partidos"][number]): ResultadoOficial | null {
  const r = p.resultados_oficiales;
  if (!r) return null;
  return Array.isArray(r) ? (r[0] ?? null) : r;
}

export default async function RevisarFase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const [{ data: fase }, { data: grupos }, { data: ingesta }] = await Promise.all([
    supabase.from("fases").select("*").eq("id", id).maybeSingle<Fase>(),
    supabase
      .from("grupos")
      .select(
        `id, letra,
         grupo_jugadores ( jugador:jugadores ( id, nombre, nombre_normalizado, telefono, email ) ),
         partidos ( id, id_partido, jornada, semana,
           local:jugadores!partidos_local_id_fkey ( nombre ),
           visitante:jugadores!partidos_visitante_id_fkey ( nombre ),
           resultados_enviados ( id ), propuestas_horario ( id ), walkovers ( id, con_sancion ),
           resultados_oficiales ( partido_id, ganador_id, sets, sets_local, sets_visitante, actualizado_at ) ),
         clasificacion_grupo ( *, jugador:jugadores ( id, nombre ) )`,
      )
      .eq("fase_id", id)
      .order("letra"),
    supabase
      .from("ingestas")
      .select("*")
      .order("creado_at", { ascending: false })
      .limit(1)
      .maybeSingle<Ingesta>(),
  ]);
  if (!fase) notFound();
  const lista = (grupos ?? []) as unknown as GrupoDetalle[];

  return (
    <div className="space-y-6">
      <Link href="/admin/fases" className="text-sm text-primario underline">
        ← Fases
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          {fase.numero}ª fase {fase.temporada}
        </h1>
        <span
          className={`chip ${fase.publicada ? "bg-primario-suave text-primario" : "bg-fondo text-texto-suave"}`}
        >
          {fase.publicada ? "Publicada" : "Sin publicar"}
        </span>
        {fase.es_actual && <span className="chip bg-acento-suave text-acento">Actual</span>}
      </header>

      {ingesta && ingesta.avisos.length > 0 && (
        <section className="tarjeta border-acento/40 space-y-2">
          <h2 className="font-semibold">Avisos de la última ingesta</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {ingesta.avisos.map((a, i) => (
              <li key={i}>
                <span className="font-medium">{a.tipo}</span>
                {a.nombre ? ` · ${a.nombre}` : ""}
                {a.id_partido ? ` · partido ${a.id_partido}` : ""}
                {a.valor ? ` · ${a.valor}` : ""}
                {a.detalle ? ` — ${a.detalle}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lista.length === 0 && (
        <div className="tarjeta text-texto-suave">Esta fase no tiene grupos cargados.</div>
      )}

      {lista.map((g) => {
        const jugadores = g.grupo_jugadores
          .map((gj) => gj.jugador)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        const partidos = [...g.partidos].sort(
          (a, b) => a.jornada - b.jornada || a.id_partido.localeCompare(b.id_partido),
        );
        const clasificacion = [...g.clasificacion_grupo].sort((a, b) => a.posicion - b.posicion);
        const conOficial = partidos.filter((p) => oficialDe(p) !== null).length;
        return (
          <section key={g.id} className="tarjeta space-y-4">
            <h2 className="text-lg font-semibold">
              Grupo {g.letra}{" "}
              <span className="text-sm font-normal text-texto-suave">
                · {jugadores.length} jugadores · {partidos.length} partidos · {conOficial} con
                resultado oficial
              </span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-texto-suave">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Jugador</th>
                    <th className="py-1 pr-3 font-medium">Teléfono</th>
                    <th className="py-1 font-medium">Correo</th>
                  </tr>
                </thead>
                <tbody>
                  {jugadores.map((j) => (
                    <tr key={j.id} className="border-t border-borde">
                      <td className="py-1 pr-3">{formatearNombre(j.nombre)}</td>
                      <td className="py-1 pr-3">
                        {j.telefono ? (
                          formatearTelefono(j.telefono)
                        ) : (
                          <span className="text-peligro">falta</span>
                        )}
                      </td>
                      <td className="py-1">
                        {j.email ?? <span className="text-peligro">falta</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details>
              <summary className="cursor-pointer text-sm text-primario">Ver clasificación</summary>
              <div className="mt-2">
                <TablaClasificacion filas={clasificacion} />
              </div>
            </details>
            <details>
              <summary className="cursor-pointer text-sm text-primario">Ver calendario</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-texto-suave">
                    <tr>
                      <th className="py-1 pr-3 font-medium">J</th>
                      <th className="py-1 pr-3 font-medium">Semana</th>
                      <th className="py-1 pr-3 font-medium">Local</th>
                      <th className="py-1 pr-3 font-medium">Visitante</th>
                      <th className="py-1 pr-3 font-medium">Id</th>
                      <th className="py-1 pr-3 font-medium">Oficial</th>
                      <th className="py-1 font-medium">App</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partidos.map((p) => (
                      <tr key={p.id} className="border-t border-borde">
                        <td className="py-1 pr-3">{p.jornada}</td>
                        <td className="py-1 pr-3 whitespace-nowrap">
                          {formatearDia(p.semana, { corto: true })}
                        </td>
                        <td className="py-1 pr-3">{formatearNombre(p.local.nombre)}</td>
                        <td className="py-1 pr-3">{formatearNombre(p.visitante.nombre)}</td>
                        <td className="py-1 pr-3">{p.id_partido}</td>
                        <td className="py-1 pr-3 whitespace-nowrap">
                          {(() => {
                            const r = oficialDe(p);
                            return r
                              ? `${r.sets_local}-${r.sets_visitante} (${formatearSets(r.sets)})`
                              : "";
                          })()}
                        </td>
                        <td className="py-1 text-texto-suave">
                          {(() => {
                            const wo = Array.isArray(p.walkovers) ? p.walkovers[0] : p.walkovers;
                            if (wo) return `W.O. ${wo.con_sancion ? "con sanción" : "sin sanción"}`;
                            if (p.resultados_enviados.length > 0) return "resultado";
                            if (p.propuestas_horario.length > 0) return "propuesto";
                            return "";
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
