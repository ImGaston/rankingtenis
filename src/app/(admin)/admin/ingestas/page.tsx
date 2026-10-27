import { crearClienteServidor } from "@/lib/supabase/server";
import type { Ingesta } from "@/lib/dominio/tipos";

export const metadata = { title: "Ingestas" };

const ETIQUETAS: Record<string, string> = {
  contactos_leidos: "contactos leídos",
  jugadores_nuevos: "jugadores nuevos",
  jugadores_actualizados: "jugadores actualizados",
  jugadores_creados_sin_contacto: "creados sin contacto",
  grupos: "grupos",
  partidos_nuevos: "partidos nuevos",
  partidos_modificados: "partidos modificados",
  resultados_nuevos: "resultados nuevos",
  resultados_modificados: "resultados corregidos",
  resultados_sin_partido: "resultados sin partido",
  resultados_discrepantes: "discrepancias con la app",
  clasificacion_filas: "filas de clasificación",
  ranking_posiciones: "posiciones de ranking",
};

export default async function AdminIngestas() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("ingestas")
    .select("*")
    .order("creado_at", { ascending: false })
    .limit(50);
  const ingestas = (data ?? []) as Ingesta[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Ingestas</h1>
        <p className="text-texto-suave">
          Cada corrida del agente que cargó datos desde los mails de la liga.
        </p>
      </header>
      {ingestas.length === 0 && (
        <div className="tarjeta text-texto-suave">Todavía no hay ingestas registradas.</div>
      )}
      {ingestas.map((i) => (
        <article key={i.id} className="tarjeta space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">
              {new Date(i.creado_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
              <span className="ml-2 chip bg-fondo text-texto-suave">{i.origen}</span>
            </p>
            {i.asunto_mail && <p className="text-sm text-texto-suave">{i.asunto_mail}</p>}
          </div>
          {i.archivos.length > 0 && (
            <p className="text-sm text-texto-suave">Archivos: {i.archivos.join(", ")}</p>
          )}
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {Object.entries(i.resumen)
              .filter(([, v]) => v !== 0)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="inline text-texto-suave">{ETIQUETAS[k] ?? k}: </dt>
                  <dd className="inline font-medium">{v}</dd>
                </div>
              ))}
          </dl>
          {i.avisos.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm text-acento">
                {i.avisos.length} avisos
              </summary>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {i.avisos.map((a, k) => (
                  <li key={k}>
                    <span className="font-medium">{a.tipo}</span>
                    {a.nombre ? ` · ${a.nombre}` : ""}
                    {a.id_partido ? ` · ${a.id_partido}` : ""}
                    {a.valor ? ` · ${a.valor}` : ""}
                    {a.detalle ? ` — ${a.detalle}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </article>
      ))}
    </div>
  );
}
