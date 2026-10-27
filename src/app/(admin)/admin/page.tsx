import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Fase, Ingesta } from "@/lib/dominio/tipos";

export const metadata = { title: "Admin" };

export default async function AdminResumen() {
  const supabase = await crearClienteServidor();
  const [fases, pendientes, ingestas] = await Promise.all([
    supabase.from("fases").select("*").order("numero", { ascending: false }),
    supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .eq("estado_vinculo", "pendiente"),
    supabase.from("ingestas").select("*").order("creado_at", { ascending: false }).limit(3),
  ]);
  const listaFases = (fases.data ?? []) as Fase[];
  const sinPublicar = listaFases.filter((f) => !f.publicada);
  const actual = listaFases.find((f) => f.es_actual);
  const ultimas = (ingestas.data ?? []) as Ingesta[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resumen</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/fases" className="tarjeta space-y-1 hover:border-primario">
          <p className="text-sm text-texto-suave">Fase actual</p>
          <p className="text-xl font-semibold">
            {actual ? `${actual.numero}ª fase ${actual.temporada}` : "Ninguna"}
          </p>
          <p className="text-sm text-texto-suave">
            {sinPublicar.length === 0 ? "Todo publicado" : `${sinPublicar.length} sin publicar`}
          </p>
        </Link>
        <Link href="/admin/usuarios" className="tarjeta space-y-1 hover:border-primario">
          <p className="text-sm text-texto-suave">Vínculos pendientes</p>
          <p className="text-xl font-semibold">{pendientes.count ?? 0}</p>
          <p className="text-sm text-texto-suave">Usuarios esperando aprobación</p>
        </Link>
        <Link href="/admin/ingestas" className="tarjeta space-y-1 hover:border-primario">
          <p className="text-sm text-texto-suave">Última ingesta</p>
          <p className="text-xl font-semibold">
            {ultimas[0] ? new Date(ultimas[0].creado_at).toLocaleDateString("es-ES") : "Ninguna"}
          </p>
          <p className="text-sm text-texto-suave">
            {ultimas[0] ? `${ultimas[0].avisos.length} avisos` : "El agente todavía no cargó datos"}
          </p>
        </Link>
      </div>

      <section className="tarjeta space-y-2 text-sm text-texto-suave">
        <h2 className="font-semibold text-texto">Cómo entran los datos</h2>
        <p>
          El agente de Claude lee los mails de la liga y llama a <code>cargar_ingesta</code>. Las
          fases nuevas llegan sin publicar: revísalas en{" "}
          <Link href="/admin/fases" className="underline">
            Fases
          </Link>
          , márcalas como actual y publícalas para que los jugadores las vean.
        </p>
      </section>
    </div>
  );
}
