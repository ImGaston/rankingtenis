import { formatearNombre } from "@/lib/dominio/nombres";
import type { ClasificacionDetalle } from "@/lib/consultas/clasificacion";

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
        La liga todavía no comunicó la clasificación de este grupo.
      </p>
    );
  }
  const haySanciones = filas.some((f) => f.puntos_sancion > 0 || f.no_presentados > 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-texto-suave">
          <tr>
            <th className="py-1 pr-2 font-medium">Pos</th>
            <th className="py-1 pr-3 font-medium">Jugador</th>
            <th className="py-1 pr-2 text-right font-medium" title="Jugados">
              J
            </th>
            <th className="py-1 pr-2 text-right font-medium" title="Ganados">
              G
            </th>
            <th className="py-1 pr-2 text-right font-medium" title="Perdidos">
              P
            </th>
            <th className="py-1 pr-2 text-right font-medium" title="Sets a favor / en contra">
              Sets
            </th>
            {haySanciones && (
              <th className="py-1 pr-2 text-right font-medium" title="Puntos de sanción">
                PS
              </th>
            )}
            {haySanciones && (
              <th className="py-1 pr-2 text-right font-medium" title="No presentados">
                NP
              </th>
            )}
            <th className="py-1 text-right font-medium" title="Puntos">
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
                className={`border-t border-borde ${yo ? "bg-primario-suave font-semibold" : ""}`}
              >
                <td className="py-1 pr-2">{f.posicion}</td>
                <td className="py-1 pr-3">{formatearNombre(f.jugador.nombre)}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{f.jugados}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{f.ganados}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{f.perdidos}</td>
                <td className="py-1 pr-2 text-right tabular-nums whitespace-nowrap">
                  {f.sets_favor}-{f.sets_contra}
                </td>
                {haySanciones && (
                  <td className="py-1 pr-2 text-right tabular-nums">{f.puntos_sancion}</td>
                )}
                {haySanciones && (
                  <td className="py-1 pr-2 text-right tabular-nums">{f.no_presentados}</td>
                )}
                <td className="py-1 text-right tabular-nums font-semibold">{f.puntos}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
