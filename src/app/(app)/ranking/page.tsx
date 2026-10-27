import Link from "next/link";
import { exigirJugador } from "@/lib/consultas/sesion";
import { listarRanking } from "@/lib/consultas/clasificacion";
import { formatearNombre } from "@/lib/dominio/nombres";
import type { RankingFila, TipoRanking } from "@/lib/dominio/tipos";
import { formatearDia } from "@/lib/mensajes/franjas";

export const metadata = { title: "Ranking general" };

const TITULOS: Record<TipoRanking, string> = {
  general: "Ranking general",
  femenino: "Ranking femenino",
};

function Tabla({ filas, destacarId }: { filas: RankingFila[]; destacarId: string }) {
  const fases = [...new Set(filas.flatMap((f) => Object.keys(f.por_fase)))].sort(
    (a, b) => Number(a) - Number(b),
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-texto-suave">
          <tr>
            <th className="py-1 pr-2 font-medium">Pos</th>
            <th className="py-1 pr-3 font-medium">Jugador</th>
            <th className="py-1 pr-3 text-right font-medium">Puntos</th>
            {fases.map((f) => (
              <th key={f} className="py-1 pr-2 text-right font-medium whitespace-nowrap">
                F{f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const yo = f.jugador_id === destacarId;
            return (
              <tr
                key={f.jugador_id}
                className={`border-t border-borde ${yo ? "bg-primario-suave font-semibold" : ""}`}
              >
                <td className="py-1 pr-2 tabular-nums">{f.posicion}</td>
                <td className="py-1 pr-3">{formatearNombre(f.nombre)}</td>
                <td className="py-1 pr-3 text-right tabular-nums font-semibold">{f.puntos}</td>
                {fases.map((k) => (
                  <td key={k} className="py-1 pr-2 text-right tabular-nums text-texto-suave">
                    {f.por_fase[k] ?? ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function Ranking() {
  const { jugador } = await exigirJugador();
  const filas = await listarRanking();
  const tipos = (["general", "femenino"] as TipoRanking[]).filter((t) =>
    filas.some((f) => f.tipo === t),
  );
  const corte = filas.find((f) => f.fecha_corte)?.fecha_corte ?? null;
  const miPosicion = filas.find((f) => f.tipo === "general" && f.jugador_id === jugador.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Ranking general</h1>
          <p className="text-texto-suave">
            {filas[0] ? `Temporada ${filas[0].temporada}` : "Puntos acumulados por fase"}
            {corte ? ` · publicado el ${formatearDia(corte)}` : ""}
          </p>
        </div>
        <Link href="/clasificacion" className="text-sm text-primario underline">
          ← Mi grupo
        </Link>
      </header>

      {filas.length === 0 ? (
        <div className="tarjeta text-texto-suave">
          La liga todavía no publicó el ranking de esta temporada.
        </div>
      ) : (
        <>
          {miPosicion && (
            <div className="tarjeta border-primario/40 bg-primario-suave text-sm">
              Vas <strong>{miPosicion.posicion}º</strong> con{" "}
              <strong>{miPosicion.puntos} puntos</strong>.
            </div>
          )}
          {tipos.map((t) => (
            <section key={t} className="tarjeta space-y-3">
              <h2 className="font-semibold">{TITULOS[t]}</h2>
              <Tabla filas={filas.filter((f) => f.tipo === t)} destacarId={jugador.id} />
            </section>
          ))}
          <p className="text-xs text-texto-suave">
            Datos oficiales de la liga. Los puntos de cada fase se suman al cerrarse.
          </p>
        </>
      )}
    </div>
  );
}
