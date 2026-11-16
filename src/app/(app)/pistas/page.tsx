import { exigirSesion } from "@/lib/consultas/sesion";
import { ORDEN_SEDES, TELEFONO_RESERVAS, diaSemanaDe, hoyEnMadrid } from "@/lib/dominio/pistas";
import { GrillaSede, RAYADO } from "@/componentes/grilla-pistas";
import { formatearTelefono } from "@/lib/dominio/nombres";

export const metadata = { title: "Pistas" };

export default async function Pistas() {
  await exigirSesion();
  const hoy = diaSemanaDe(hoyEnMadrid());

  return (
    <div className="space-y-6">
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

      {ORDEN_SEDES.map((sede) => (
        <GrillaSede key={sede} sede={sede} hoy={hoy} />
      ))}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-suave">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-3 rounded-[2px] bg-exito-suave ring-1 ring-exito/30"
          />
          Pistas de ranking (la 6 es la semicubierta)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-3 rounded-[2px] ${RAYADO}`} />
          Sin pista de ranking
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-[2px] bg-texto" />
          Hoy
        </li>
      </ul>

      <div className="tarjeta border-rivas-amarillo bg-acento-suave text-sm text-acento">
        Si las pistas de ranking están ocupadas en la franja que quieres, puedes reservar cualquier
        otra pista libre para el mismo día o el siguiente (el miércoles se llama para el miércoles o
        el jueves). Los festivos cuentan como domingo.
      </div>
    </div>
  );
}
