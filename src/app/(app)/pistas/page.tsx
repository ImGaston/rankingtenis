import Link from "next/link";
import { exigirSesion } from "@/lib/consultas/sesion";
import {
  INICIALES_DIAS,
  NOMBRES_DIAS,
  ORDEN_SEDES,
  SEDES,
  diaSemanaDe,
  hoyEnMadrid,
  nombrePista,
  turnosDelDia,
  TELEFONO_RESERVAS,
  type DiaSemana,
} from "@/lib/dominio/pistas";
import { formatearTelefono } from "@/lib/dominio/nombres";

export const metadata = { title: "Pistas" };

export default async function Pistas({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const [, { dia: diaParam }] = await Promise.all([exigirSesion(), searchParams]);
  const hoy = diaSemanaDe(hoyEnMadrid());
  const pedido = Number(diaParam);
  const dia = (Number.isInteger(pedido) && pedido >= 0 && pedido <= 6 ? pedido : hoy) as DiaSemana;
  const turnos = turnosDelDia(dia);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="titulo-pagina banderin">Pistas</h1>
        <p className="text-texto-suave">
          Turnos de 2 horas reservados para el ranking. Se reserva por teléfono desde las 9:00 y con
          2 semanas de antelación como máximo.
        </p>
        <a href={`tel:${TELEFONO_RESERVAS}`} className="boton-primario">
          📞 Llamar para reservar · {formatearTelefono(TELEFONO_RESERVAS)}
        </a>
      </header>

      <nav aria-label="Día de la semana" className="grid grid-cols-7 gap-1">
        {INICIALES_DIAS.map((inicial, i) => (
          <Link
            key={inicial}
            href={`/pistas?dia=${i}`}
            aria-current={i === dia ? "true" : undefined}
            aria-label={NOMBRES_DIAS[i]}
            className={`flex min-h-11 items-center justify-center rounded-[2px] border text-sm font-bold ${
              i === dia
                ? "border-texto bg-texto text-superficie"
                : "border-borde bg-superficie hover:bg-superficie-elevada"
            }`}
          >
            {inicial}
          </Link>
        ))}
      </nav>
      <p className="rotulo">
        {NOMBRES_DIAS[dia]}
        {dia === hoy ? " · hoy" : ""}
      </p>

      {ORDEN_SEDES.map((sede) => (
        <section key={sede} className="tarjeta">
          <h2 className="font-bold">{SEDES[sede]}</h2>
          <ul className="mt-2">
            {turnos
              .filter((t) => t.sede === sede)
              .map((t) => (
                <li
                  key={t.inicio}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-superficie-elevada py-2 text-sm"
                >
                  <span className="cifra font-bold">
                    {t.inicio} – {t.fin}
                  </span>
                  <span className="flex flex-wrap justify-end gap-1">
                    {t.pistas.map((p) => (
                      <span key={p} className="chip bg-exito-suave text-exito">
                        {nombrePista(sede, p)}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <div className="tarjeta border-rivas-amarillo bg-acento-suave text-sm text-acento">
        Si las pistas de ranking están ocupadas en la franja que quieres, puedes reservar cualquier
        otra pista libre para el mismo día o el siguiente (el miércoles se llama para el miércoles o
        el jueves). Los festivos cuentan como domingo.
      </div>
    </div>
  );
}
