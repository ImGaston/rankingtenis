"use client";

import { useMemo, useState, useTransition } from "react";
import { guardarResultado } from "@/app/(app)/acciones";
import { formatearNombre } from "@/lib/dominio/nombres";
import { validarSets, type Lado } from "@/lib/dominio/sets";
import type { Set } from "@/lib/dominio/tipos";
import { armarMailResultado, urlGmail, urlMailto } from "@/lib/mensajes/resultado";

interface Props {
  partidoId: string;
  idPartido: string;
  local: string;
  visitante: string;
  grupo: string;
  fase: number;
  jornada: number;
  firma: string;
  ligaEmail: string;
  rivalEmail: string | null;
  previo: {
    sets: Set[];
    fechaPartido: string;
    observaciones: string;
    asunto: string;
    cuerpo: string;
  } | null;
}

type SetTexto = [string, string];

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

export function FormularioResultado(p: Props) {
  const [fecha, setFecha] = useState(p.previo?.fechaPartido ?? hoyIso());
  const [sets, setSets] = useState<SetTexto[]>(
    p.previo
      ? p.previo.sets.map(([a, b]) => [String(a), String(b)] as SetTexto)
      : [
          ["", ""],
          ["", ""],
        ],
  );
  const [estricto, setEstricto] = useState(true);
  const [ganadorManual, setGanadorManual] = useState<Lado | "">("");
  const [observaciones, setObservaciones] = useState(p.previo?.observaciones ?? "");
  const [cc, setCc] = useState(p.rivalEmail ?? "");
  const [estado, setEstado] = useState<{
    tipo: "inicial" | "guardando" | "guardado" | "error";
    mensaje?: string;
  }>({
    tipo: "inicial",
  });
  const [pendiente, iniciar] = useTransition();

  const setsNumericos = useMemo<Set[]>(
    () =>
      sets
        .filter(([a, b]) => a !== "" && b !== "")
        .map(([a, b]) => [Number(a), Number(b)] as Set)
        .filter(([a, b]) => Number.isInteger(a) && Number.isInteger(b)),
    [sets],
  );
  const validacion = useMemo(
    () => validarSets(setsNumericos, { estricto }),
    [setsNumericos, estricto],
  );
  const lado: Lado | undefined = estricto
    ? validacion.ganador
    : ganadorManual || validacion.ganador;
  const ganador = lado === "local" ? p.local : lado === "visitante" ? p.visitante : null;
  const listo = setsNumericos.length > 0 && (estricto ? validacion.ok : Boolean(lado));

  const mail = useMemo(
    () =>
      ganador
        ? armarMailResultado({
            idPartido: p.idPartido,
            fechaPartido: fecha,
            grupo: p.grupo,
            fase: p.fase,
            jornada: p.jornada,
            local: p.local,
            visitante: p.visitante,
            sets: setsNumericos,
            ganador,
            observaciones,
            firma: p.firma,
          })
        : null,
    [ganador, p, fecha, setsNumericos, observaciones],
  );

  const destinatarios = { para: p.ligaEmail, cc: cc.trim() || null };

  function cambiarSet(i: number, j: 0 | 1, valor: string) {
    setSets((prev) =>
      prev.map((s, k) => (k === i ? ((j === 0 ? [valor, s[1]] : [s[0], valor]) as SetTexto) : s)),
    );
  }

  function registrar() {
    if (!listo) return;
    setEstado({ tipo: "guardando" });
    iniciar(async () => {
      const r = await guardarResultado({
        partidoId: p.partidoId,
        fechaPartido: fecha,
        sets: setsNumericos,
        estricto,
        ganador: estricto ? undefined : lado,
        observaciones,
      });
      setEstado(r.ok ? { tipo: "guardado" } : { tipo: "error", mensaje: r.error });
    });
  }

  async function copiar() {
    if (!mail) return;
    await navigator.clipboard.writeText(`Asunto: ${mail.asunto}\n\n${mail.cuerpo}`);
    registrar();
  }

  return (
    <div className="space-y-6">
      {p.previo && (
        <div className="tarjeta border-primario/40 bg-primario-suave text-sm">
          Ya generaste un resultado para este partido. Puedes revisarlo y volver a abrir el mail.
        </div>
      )}

      <section className="tarjeta space-y-4">
        <h2 className="font-semibold">1. Resultado</h2>
        <label className="block max-w-xs">
          <span className="etiqueta">Fecha del partido</span>
          <input
            type="date"
            className="campo"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </label>

        <div className="space-y-2">
          <p className="etiqueta">Sets (juegos del local primero)</p>
          <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 text-sm sm:max-w-md">
            <span />
            <span className="truncate text-texto-suave">{formatearNombre(p.local)}</span>
            <span />
            <span className="truncate text-texto-suave">{formatearNombre(p.visitante)}</span>
            {sets.map((s, i) => (
              <SetFila key={i} indice={i} valores={s} onCambio={(j, v) => cambiarSet(i, j, v)} />
            ))}
          </div>
          <div className="flex gap-3 text-sm">
            {sets.length < 3 && (
              <button
                type="button"
                className="text-primario underline"
                onClick={() => setSets([...sets, ["", ""]])}
              >
                Añadir tercer set
              </button>
            )}
            {sets.length > 2 && (
              <button
                type="button"
                className="text-texto-suave underline"
                onClick={() => setSets(sets.slice(0, 2))}
              >
                Quitar tercer set
              </button>
            )}
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={!estricto}
            onChange={(e) => setEstricto(!e.target.checked)}
            className="mt-1 accent-primario"
          />
          <span>
            Resultado no estándar (abandono, lesión, W.O.). Se anotan los juegos tal cual y eliges
            al ganador.
          </span>
        </label>
        {!estricto && (
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <legend className="etiqueta">Ganador</legend>
            {(["local", "visitante"] as Lado[]).map((l) => (
              <label key={l} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ganador"
                  checked={lado === l}
                  onChange={() => setGanadorManual(l)}
                  className="accent-primario"
                />
                {formatearNombre(l === "local" ? p.local : p.visitante)}
              </label>
            ))}
          </fieldset>
        )}

        {setsNumericos.length > 0 && !validacion.ok && estricto && (
          <ul className="list-disc pl-5 text-sm text-peligro">
            {validacion.errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {ganador && (
          <p className="text-sm">
            Victoria: <strong>{formatearNombre(ganador)}</strong>
          </p>
        )}

        <label className="block">
          <span className="etiqueta">Observaciones (opcional)</span>
          <textarea
            className="campo"
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </label>
      </section>

      <section className="tarjeta space-y-3">
        <h2 className="font-semibold">2. Mail para la liga</h2>
        <label className="block max-w-md">
          <span className="etiqueta">Copia al rival</span>
          <input
            type="email"
            className="campo"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="correo del rival"
          />
        </label>
        {mail ? (
          <div className="rounded-lg border border-borde bg-fondo p-3 text-sm">
            <p className="text-texto-suave">
              Para: {p.ligaEmail}
              {destinatarios.cc ? ` · CC: ${destinatarios.cc}` : ""}
            </p>
            <p className="font-semibold">Asunto: {mail.asunto}</p>
            <pre className="mt-2 whitespace-pre-wrap font-sans">{mail.cuerpo}</pre>
          </div>
        ) : (
          <p className="text-sm text-texto-suave">Completa el resultado para ver el mail.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <a
            href={mail ? urlGmail(destinatarios, mail) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={registrar}
            aria-disabled={!listo}
            className={`boton-primario ${listo ? "" : "pointer-events-none opacity-50"}`}
          >
            Abrir en Gmail
          </a>
          <a
            href={mail ? urlMailto(destinatarios, mail) : undefined}
            onClick={registrar}
            aria-disabled={!listo}
            className={`boton-secundario ${listo ? "" : "pointer-events-none opacity-50"}`}
          >
            Abrir en mi app de correo
          </a>
          <button
            type="button"
            className="boton-secundario"
            onClick={copiar}
            disabled={!listo || pendiente}
          >
            Copiar texto
          </button>
        </div>
        <p className="text-xs text-texto-suave" aria-live="polite">
          {estado.tipo === "guardando" && "Registrando el resultado…"}
          {estado.tipo === "guardado" &&
            "Resultado registrado. Recuerda pulsar Enviar en tu correo."}
          {estado.tipo === "error" &&
            `No se pudo registrar: ${estado.mensaje ?? "error desconocido"}`}
        </p>
      </section>
    </div>
  );
}

function SetFila({
  indice,
  valores,
  onCambio,
}: {
  indice: number;
  valores: SetTexto;
  onCambio: (j: 0 | 1, valor: string) => void;
}) {
  return (
    <>
      <span className="text-texto-suave">Set {indice + 1}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={30}
        className="campo"
        aria-label={`Set ${indice + 1}, juegos del local`}
        value={valores[0]}
        onChange={(e) => onCambio(0, e.target.value)}
      />
      <span className="text-center text-texto-suave">–</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={30}
        className="campo"
        aria-label={`Set ${indice + 1}, juegos del visitante`}
        value={valores[1]}
        onChange={(e) => onCambio(1, e.target.value)}
      />
    </>
  );
}
