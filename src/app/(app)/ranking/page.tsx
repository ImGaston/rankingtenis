import Link from "next/link";
import { exigirJugador } from "@/lib/consultas/sesion";
import { listarRanking } from "@/lib/consultas/clasificacion";
import { formatearNombre } from "@/lib/dominio/nombres";
import type { RankingFila, TipoRanking } from "@/lib/dominio/tipos";
import { formatearDia } from "@/lib/mensajes/franjas";
import { CeldaPosicion, EtiquetaTu } from "@/componentes/posicion";

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
        <thead className="rotulo text-left">
          <tr>
            <th scope="col" className="py-2 pr-2 font-bold">
              Pos
            </th>
            <th scope="col" className="py-2 pr-3 font-bold">
              Jugador
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-bold">
              Puntos
            </th>
            {fases.map((f) => (
              <th key={f} scope="col" className="py-2 pr-2 text-right font-bold whitespace-nowrap">
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
                className={`border-t border-borde ${yo ? "bg-primario-suave font-bold" : ""}`}
              >
                <CeldaPosicion posicion={f.posicion} />
                <td className="py-2 pr-3 font-bold">
                  {formatearNombre(f.nombre)}
                  {yo && <EtiquetaTu />}
                </td>
                <td className="py-2 pr-3 text-right cifra font-display text-lg">{f.puntos}</td>
                {fases.map((k) => (
                  <td key={k} className="py-2 pr-2 text-right cifra text-texto-suave">
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
          <h1 className="titulo-pagina banderin">Ranking general</h1>
          <p className="mt-2 text-texto-suave">
            {filas[0] ? `Temporada ${filas[0].temporada}` : "Puntos acumulados por fase"}
            {corte ? ` · publicado el ${formatearDia(corte)}` : ""}
          </p>
        </div>
        <Link
          href="/clasificacion"
          className="text-sm font-bold text-primario underline underline-offset-4"
        >
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
            <div className="flex items-stretch overflow-hidden rounded-[4px] bg-[#171717] text-white">
              <div className="flex flex-col justify-center bg-rivas-rojo px-5 py-3 text-black">
                <span className="text-xs font-bold tracking-[0.06em] uppercase">Puesto</span>
                <span className="cifra font-display text-5xl leading-none sm:text-6xl">
                  {miPosicion.posicion}
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-center gap-1 px-5 py-3">
                <p className="text-lg font-bold">Estás en el puesto {miPosicion.posicion}</p>
                <p className="text-sm text-white/75">
                  <span className="cifra font-bold text-white">{miPosicion.puntos}</span> puntos en
                  el ranking general
                </p>
              </div>
            </div>
          )}
          {tipos.map((t) => (
            <section key={t} className="tarjeta space-y-3">
              <h2 className="text-xl font-bold">{TITULOS[t]}</h2>
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
