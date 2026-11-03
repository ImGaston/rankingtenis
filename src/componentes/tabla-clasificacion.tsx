import { formatearNombre } from "@/lib/dominio/nombres";
import type { ClasificacionDetalle } from "@/lib/consultas/clasificacion";
import { CeldaPosicion, EtiquetaTu } from "@/componentes/posicion";

/**
 * Tabla de clasificación de un grupo tal como la publica la liga. Columnas:
 * J jugados, G ganados, P perdidos, SF/SC sets a favor y en contra, PT puntos.
 */
export function TablaClasificacion({
  filas,
  destacarId,
}: {
  filas: ClasificacionDetalle[];
  destacarId?: string | null;
}) {
  if (filas.length === 0) {
    return (
      <p className="text-sm text-texto-suave">
        Todavía no hay jugadores clasificados en este grupo.
      </p>
    );
  }
  const haySanciones = filas.some((f) => f.puntos_sancion > 0 || f.no_presentados > 0);
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
            <th scope="col" className="py-2 pr-2 text-right font-bold" title="Jugados">
              J
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-bold" title="Ganados">
              G
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-bold" title="Perdidos">
              P
            </th>
            <th
              scope="col"
              className="py-2 pr-2 text-right font-bold"
              title="Sets a favor / en contra"
            >
              Sets
            </th>
            {haySanciones && (
              <th scope="col" className="py-2 pr-2 text-right font-bold" title="Puntos de sanción">
                PS
              </th>
            )}
            {haySanciones && (
              <th scope="col" className="py-2 pr-2 text-right font-bold" title="No presentados">
                NP
              </th>
            )}
            <th scope="col" className="py-2 text-right font-bold" title="Puntos">
              PT
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const yo = destacarId != null && f.jugador_id === destacarId;
            return (
              <tr
                key={f.jugador_id}
                className={`border-t border-borde ${yo ? "bg-primario-suave font-bold" : ""}`}
              >
                <CeldaPosicion posicion={f.posicion} />
                <td className="py-2 pr-3 font-bold">
                  {formatearNombre(f.jugador.nombre)}
                  {yo && <EtiquetaTu />}
                </td>
                <td className="py-2 pr-2 text-right cifra">{f.jugados}</td>
                <td className="py-2 pr-2 text-right cifra">{f.ganados}</td>
                <td className="py-2 pr-2 text-right cifra">{f.perdidos}</td>
                <td className="py-2 pr-2 text-right cifra whitespace-nowrap">
                  {f.sets_favor}-{f.sets_contra}
                </td>
                {haySanciones && <td className="py-2 pr-2 text-right cifra">{f.puntos_sancion}</td>}
                {haySanciones && <td className="py-2 pr-2 text-right cifra">{f.no_presentados}</td>}
                <td className="py-2 text-right cifra font-display text-lg">{f.puntos}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
