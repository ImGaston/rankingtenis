import Link from "next/link";
import { exigirJugador } from "@/lib/consultas/sesion";
import { faseActual } from "@/lib/consultas/fases";
import { misPartidos, nombreFase } from "@/lib/consultas/partidos";
import { clasificacionDeGrupo, oficialDe, partidosDeGrupo } from "@/lib/consultas/clasificacion";
import { formatearNombre } from "@/lib/dominio/nombres";
import { formatearSets } from "@/lib/dominio/sets";
import { formatearDia } from "@/lib/mensajes/franjas";
import { TablaClasificacion } from "@/componentes/tabla-clasificacion";

export const metadata = { title: "Clasificación" };

export default async function Clasificacion() {
  const { jugador } = await exigirJugador();
  const [fase, mios] = await Promise.all([faseActual(), misPartidos(jugador.id)]);

  if (!fase || mios.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Clasificación</h1>
        <div className="tarjeta text-texto-suave">
          Cuando la fase esté publicada verás aquí la clasificación de tu grupo.
        </div>
      </div>
    );
  }

  const grupo = mios[0].grupo;
  const [clasificacion, partidos] = await Promise.all([
    clasificacionDeGrupo(grupo.id),
    partidosDeGrupo(grupo.id),
  ]);
  const jugados = partidos.filter((p) => oficialDe(p) !== null);
  const porJornada = new Map<number, typeof partidos>();
  for (const p of partidos) {
    const lista = porJornada.get(p.jornada) ?? [];
    lista.push(p);
    porJornada.set(p.jornada, lista);
  }
  const actualizado = clasificacion[0]?.actualizado_at ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Clasificación</h1>
          <p className="text-texto-suave">
            {nombreFase(grupo.fase)} · Grupo {grupo.letra}
          </p>
        </div>
        <Link href="/ranking" className="text-sm text-primario underline">
          Ranking general →
        </Link>
      </header>

      <section className="tarjeta space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Grupo {grupo.letra}</h2>
          {actualizado && (
            <p className="text-xs text-texto-suave">
              Según la liga, actualizado el {formatearDia(actualizado.slice(0, 10))}
            </p>
          )}
        </div>
        <TablaClasificacion filas={clasificacion} destacarId={jugador.id} />
        <p className="text-xs text-texto-suave">
          Datos oficiales de la liga. Si falta un partido que ya jugaste, es que la liga aún no lo
          publicó.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">
          Resultados del grupo{" "}
          <span className="text-sm font-normal text-texto-suave">
            · {jugados.length} de {partidos.length} partidos
          </span>
        </h2>
        {[...porJornada.entries()].map(([jornada, lista]) => (
          <article key={jornada} className="tarjeta space-y-2">
            <p className="text-sm text-texto-suave">
              Jornada {jornada} · semana del {formatearDia(lista[0].semana)}
            </p>
            <ul className="divide-y divide-borde">
              {lista.map((p) => {
                const r = oficialDe(p);
                const mio = p.local_id === jugador.id || p.visitante_id === jugador.id;
                const ganaLocal = r?.ganador_id === p.local_id;
                return (
                  <li
                    key={p.id}
                    className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 text-sm ${mio ? "font-semibold" : ""}`}
                  >
                    <span className={`text-right ${r && !ganaLocal ? "text-texto-suave" : ""}`}>
                      {formatearNombre(p.local.nombre)}
                    </span>
                    <span className="text-center">
                      {r ? (
                        <>
                          <span className="chip bg-primario-suave text-primario tabular-nums">
                            {r.sets_local}-{r.sets_visitante}
                          </span>
                          <span className="mt-0.5 block text-xs text-texto-suave tabular-nums">
                            {formatearSets(r.sets)}
                          </span>
                        </>
                      ) : (
                        <span className="chip bg-fondo text-texto-suave">pendiente</span>
                      )}
                    </span>
                    <span className={r && ganaLocal ? "text-texto-suave" : ""}>
                      {formatearNombre(p.visitante.nombre)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
