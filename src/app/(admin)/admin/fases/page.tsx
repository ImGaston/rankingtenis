import Link from "next/link";
import { listarFases } from "@/lib/consultas/fases";
import { cambiarPublicacion, marcarActual } from "../acciones";

export const metadata = { title: "Fases" };

export default async function AdminFases() {
  const fases = await listarFases();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Fases</h1>
        <p className="text-texto-suave">
          Los jugadores solo ven la fase marcada como actual y publicada. Revisa los datos antes de
          publicar.
        </p>
      </header>
      {fases.length === 0 ? (
        <div className="tarjeta text-texto-suave">
          Todavía no hay fases. Llegarán con la primera ingesta del agente.
        </div>
      ) : (
        <ul className="space-y-3">
          {fases.map((f) => (
            <li key={f.id} className="tarjeta flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">
                  {f.numero}ª fase <span className="text-texto-suave">{f.temporada}</span>
                </p>
                <div className="mt-1 flex gap-2">
                  <span
                    className={`chip ${f.publicada ? "bg-primario-suave text-primario" : "bg-fondo text-texto-suave"}`}
                  >
                    {f.publicada ? "Publicada" : "Sin publicar"}
                  </span>
                  {f.es_actual && <span className="chip bg-acento-suave text-acento">Actual</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/fases/${f.id}`} className="boton-secundario">
                  Revisar
                </Link>
                {!f.es_actual && (
                  <form action={marcarActual}>
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="boton-secundario">
                      Marcar como actual
                    </button>
                  </form>
                )}
                <form action={cambiarPublicacion}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="publicada" value={f.publicada ? "false" : "true"} />
                  <button
                    type="submit"
                    className={f.publicada ? "boton-secundario" : "boton-primario"}
                  >
                    {f.publicada ? "Despublicar" : "Publicar"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
