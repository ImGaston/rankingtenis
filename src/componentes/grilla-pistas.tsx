import {
  INICIALES_DIAS,
  NOMBRES_DIAS,
  SEDES,
  grillaSemanal,
  nombrePista,
  type Sede,
} from "@/lib/dominio/pistas";

/** Celda sin pista de ranking: rayado gris, como las casillas vacías del PDF. */
export const RAYADO =
  "bg-[repeating-linear-gradient(45deg,var(--fondo),var(--fondo)_4px,var(--superficie-elevada)_4px,var(--superficie-elevada)_8px)]";

export function GrillaSede({ sede, hoy }: { sede: Sede; hoy: number }) {
  const filas = grillaSemanal(sede);
  return (
    <section className="space-y-1">
      <h2 className="border-b-[3px] border-rivas-rojo py-1 font-display text-sm uppercase">
        {SEDES[sede]}
      </h2>
      <table className="w-full table-fixed border-separate border-spacing-0.5 text-xs sm:text-sm">
        <caption className="sr-only">
          Pistas de ranking en {SEDES[sede]} por turno y día de la semana
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-12 sm:w-28">
              <span className="sr-only">Turno</span>
            </th>
            {INICIALES_DIAS.map((inicial, i) => (
              <th
                key={inicial}
                scope="col"
                className={`rounded-[2px] py-1 font-bold ${
                  i === hoy ? "bg-texto text-superficie" : "text-texto-suave"
                }`}
              >
                <abbr title={NOMBRES_DIAS[i]} className="no-underline">
                  {inicial}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.inicio}>
              <th
                scope="row"
                className="cifra pr-1 text-left font-bold whitespace-nowrap text-texto-suave"
              >
                <span className="sm:hidden">
                  {f.inicio.slice(0, 2)}–{f.fin.slice(0, 2)}
                </span>
                <span className="hidden sm:inline">
                  {f.inicio} – {f.fin}
                </span>
              </th>
              {f.porDia.map((pistas, i) => (
                <td
                  key={i}
                  title={
                    pistas.length
                      ? `${NOMBRES_DIAS[i]}: ${pistas.map((p) => nombrePista(sede, p)).join(", ")}`
                      : `${NOMBRES_DIAS[i]}: sin pista de ranking`
                  }
                  className={`h-8 rounded-[2px] text-center font-bold ${
                    pistas.length ? "bg-exito-suave text-exito" : RAYADO
                  } ${i === hoy ? "outline-2 -outline-offset-2 outline-texto" : ""}`}
                >
                  {pistas.length ? pistas.join("·") : <span className="sr-only">Sin pista</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
