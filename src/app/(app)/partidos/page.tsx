import Link from "next/link";
import { exigirJugador } from "@/lib/consultas/sesion";
import { faseActual } from "@/lib/consultas/fases";
import { misPartidos, nombreFase, rivalDe, soyLocal } from "@/lib/consultas/partidos";
import { formatearNombre, formatearTelefono } from "@/lib/dominio/nombres";
import { formatearDia } from "@/lib/mensajes/franjas";

export const metadata = { title: "Mis partidos" };

export default async function Partidos() {
  const { jugador } = await exigirJugador();
  const [fase, partidos] = await Promise.all([faseActual(), misPartidos(jugador.id)]);

  if (!fase || partidos.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Mis partidos</h1>
        <div className="tarjeta text-texto-suave">
          {fase
            ? "La fase está publicada pero no tienes partidos cargados. Avisa al administrador."
            : "La nueva fase todavía no está publicada. En cuanto llegue el calendario de la liga lo verás aquí."}
        </div>
      </div>
    );
  }

  const grupo = partidos[0].grupo;
  const hoy = new Date().toISOString().slice(0, 10);
  const pendientes = partidos.filter((p) => p.resultados_enviados.length === 0);
  const jugados = partidos.filter((p) => p.resultados_enviados.length > 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Mis partidos</h1>
          <p className="text-texto-suave">
            {nombreFase(grupo.fase)} · Grupo {grupo.letra} · {formatearNombre(jugador.nombre)}
          </p>
        </div>
        <p className="text-xs text-texto-suave">
          Local: propones tú en 48 h. Resultado: antes de 7 días.
        </p>
      </header>

      <section className="space-y-3">
        {pendientes.map((p) => {
          const local = soyLocal(p, jugador.id);
          const rival = rivalDe(p, jugador.id);
          const propuesto = p.propuestas_horario.length > 0;
          const enCurso = p.semana <= hoy;
          return (
            <article
              key={p.id}
              className={`tarjeta space-y-3 ${local ? "border-acento/50" : ""} ${enCurso ? "ring-1 ring-primario/30" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-texto-suave">
                    Jornada {p.jornada} · semana del {formatearDia(p.semana)}
                    {enCurso && (
                      <span className="ml-2 chip bg-primario-suave text-primario">esta semana</span>
                    )}
                  </p>
                  <h2 className="text-lg font-semibold">{formatearNombre(rival.nombre)}</h2>
                </div>
                <span
                  className={`chip ${local ? "bg-acento-suave text-acento" : "bg-fondo text-texto-suave"}`}
                >
                  {local ? "Juegas de local" : "Juegas de visitante"}
                </span>
              </div>

              {local && (
                <p className="text-sm text-acento">
                  {propuesto
                    ? "Ya le propusiste horario."
                    : "Te toca escribirle para fijar día y hora."}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {local && (
                  <Link
                    href={`/partidos/${p.id}/proponer`}
                    className={propuesto ? "boton-secundario" : "boton-acento"}
                  >
                    {propuesto ? "Volver a proponer" : "Proponer horario"}
                  </Link>
                )}
                <Link href={`/partidos/${p.id}/resultado`} className="boton-primario">
                  Enviar resultado
                </Link>
              </div>

              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-texto-suave">
                {rival.telefono && (
                  <div>
                    <dt className="sr-only">Teléfono</dt>
                    <dd>
                      <a href={`tel:${rival.telefono}`} className="underline">
                        {formatearTelefono(rival.telefono)}
                      </a>
                    </dd>
                  </div>
                )}
                {rival.email && (
                  <div>
                    <dt className="sr-only">Correo</dt>
                    <dd>
                      <a href={`mailto:${rival.email}`} className="underline">
                        {rival.email}
                      </a>
                    </dd>
                  </div>
                )}
                {!rival.telefono && !rival.email && (
                  <dd>Sin datos de contacto en la lista de la liga.</dd>
                )}
                <div>
                  <dt className="sr-only">Id partido</dt>
                  <dd>Id {p.id_partido}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>

      {jugados.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-suave">
            Resultado enviado
          </h2>
          {jugados.map((p) => (
            <article
              key={p.id}
              className="tarjeta flex flex-wrap items-center justify-between gap-2 opacity-80"
            >
              <div>
                <p className="text-sm text-texto-suave">
                  Jornada {p.jornada} · semana del {formatearDia(p.semana)}
                </p>
                <p className="font-medium">{formatearNombre(rivalDe(p, jugador.id).nombre)}</p>
              </div>
              <Link href={`/partidos/${p.id}/resultado`} className="text-sm underline">
                Ver o reenviar
              </Link>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
