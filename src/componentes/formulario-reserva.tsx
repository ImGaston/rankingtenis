"use client";

import { useMemo, useState } from "react";
import { guardarReserva } from "@/app/(app)/acciones";
import {
  NOMBRES_DIAS,
  SEDES,
  diaSemanaDe,
  nombrePista,
  turnosDelDia,
  type ReservaPista,
  type Turno,
} from "@/lib/dominio/pistas";

interface Props {
  partidoId: string;
  fechaInicial: string;
  previa: Pick<ReservaPista, "fecha" | "inicio" | "fin" | "sede" | "pista"> | null;
}

const OTRA = "otra";

function claveTurno(t: Pick<Turno, "sede" | "inicio">) {
  return `${t.sede}|${t.inicio}`;
}

/**
 * Elige día, turno de ranking y pista. Solo ofrece los turnos de ese día de
 * la semana; «Otra pista» cubre las reservas de última hora en pistas que no
 * son de ranking (el PDF lo permite para el mismo día o el siguiente).
 */
export function FormularioReserva({ partidoId, fechaInicial, previa }: Props) {
  const [fecha, setFecha] = useState(previa?.fecha ?? fechaInicial);
  const turnos = useMemo(() => (fecha ? turnosDelDia(diaSemanaDe(fecha)) : []), [fecha]);
  const [clave, setClave] = useState(previa ? claveTurno(previa) : "");
  const turno = turnos.find((t) => claveTurno(t) === clave) ?? null;
  // Una reserva previa en una pista que no es de ranking vuelve como «Otra pista».
  const previaEsOtra = previa !== null && turno !== null && !turno.pistas.includes(previa.pista);
  const [otra, setOtra] = useState(previaEsOtra ? previa.pista : "");
  const [elegida, setElegida] = useState(previaEsOtra ? OTRA : (previa?.pista ?? ""));

  const pistaFinal = elegida === OTRA ? otra.trim() : elegida;
  const listo = Boolean(fecha && turno && pistaFinal);

  return (
    <form action={guardarReserva} className="tarjeta space-y-5">
      <input type="hidden" name="partidoId" value={partidoId} />
      <input type="hidden" name="sede" value={turno?.sede ?? ""} />
      <input type="hidden" name="inicio" value={turno?.inicio ?? ""} />
      <input type="hidden" name="fin" value={turno?.fin ?? ""} />
      <input type="hidden" name="pista" value={pistaFinal} />

      <label className="block max-w-xs">
        <span className="etiqueta">Día</span>
        <input
          type="date"
          name="fecha"
          className="campo"
          value={fecha}
          required
          onChange={(e) => {
            setFecha(e.target.value);
            setClave("");
            setElegida("");
          }}
        />
        {fecha && (
          <span className="mt-1 block text-xs text-texto-suave">
            {NOMBRES_DIAS[diaSemanaDe(fecha)]}
          </span>
        )}
      </label>

      <label className="block">
        <span className="etiqueta">Turno</span>
        <select
          className="campo"
          value={clave}
          required
          onChange={(e) => {
            setClave(e.target.value);
            setElegida("");
          }}
        >
          <option value="" disabled>
            Elige sede y hora
          </option>
          {(["cerro", "sureste"] as const).map((sede) => (
            <optgroup key={sede} label={SEDES[sede]}>
              {turnos
                .filter((t) => t.sede === sede)
                .map((t) => (
                  <option key={claveTurno(t)} value={claveTurno(t)}>
                    {t.inicio} – {t.fin} · {SEDES[sede]}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>

      {turno && (
        <fieldset className="space-y-2">
          <legend className="etiqueta">Pista</legend>
          <div className="flex flex-wrap gap-2">
            {[...turno.pistas, OTRA].map((p) => (
              <label
                key={p}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[2px] border px-3 text-sm font-bold ${
                  elegida === p ? "border-texto bg-texto text-superficie" : "border-borde"
                }`}
              >
                <input
                  type="radio"
                  name="pistaElegida"
                  value={p}
                  checked={elegida === p}
                  onChange={() => setElegida(p)}
                  className="sr-only"
                />
                {p === OTRA ? "Otra pista" : nombrePista(turno.sede, p)}
              </label>
            ))}
          </div>
          {elegida === OTRA && (
            <label className="block max-w-xs">
              <span className="etiqueta">Número de pista</span>
              <input
                className="campo"
                value={otra}
                maxLength={40}
                required
                onChange={(e) => setOtra(e.target.value)}
                placeholder="3"
              />
              <span className="mt-1 block text-xs text-texto-suave">
                Para cuando las de ranking están ocupadas y reservas otra el mismo día o el
                anterior.
              </span>
            </label>
          )}
        </fieldset>
      )}

      <button type="submit" className="boton-primario" disabled={!listo}>
        {previa ? "Guardar cambios" : "Guardar reserva"}
      </button>
    </form>
  );
}
