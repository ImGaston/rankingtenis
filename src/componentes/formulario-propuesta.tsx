"use client";

import { useMemo, useState, useTransition } from "react";
import { guardarPropuesta } from "@/app/(app)/acciones";
import type { Franja } from "@/lib/dominio/tipos";
import { FRANJAS, diasDeSemana, formatearDia } from "@/lib/mensajes/franjas";
import { armarMensajeWhatsapp, urlWhatsapp } from "@/lib/mensajes/whatsapp";

interface Props {
  partidoId: string;
  semana: string;
  jornada: number;
  grupo: string;
  yo: string;
  rival: string;
  telefonoRival: string | null;
}

function clave(f: Franja) {
  return `${f.fecha}|${f.inicio}`;
}

export function FormularioPropuesta(p: Props) {
  const dias = useMemo(() => diasDeSemana(p.semana), [p.semana]);
  const [seleccion, setSeleccion] = useState<Map<string, Franja>>(new Map());
  const [textoEditado, setTextoEditado] = useState<string | null>(null);
  const [estado, setEstado] = useState<"inicial" | "guardando" | "guardado" | "error">("inicial");
  const [pendiente, iniciar] = useTransition();

  const franjas = useMemo(() => [...seleccion.values()], [seleccion]);
  const textoAuto = useMemo(
    () =>
      armarMensajeWhatsapp({
        yo: p.yo,
        rival: p.rival,
        jornada: p.jornada,
        grupo: p.grupo,
        franjas,
      }),
    [p.yo, p.rival, p.jornada, p.grupo, franjas],
  );
  const texto = textoEditado ?? textoAuto;

  function alternar(f: Franja) {
    setSeleccion((prev) => {
      const siguiente = new Map(prev);
      const k = clave(f);
      if (siguiente.has(k)) siguiente.delete(k);
      else siguiente.set(k, f);
      return siguiente;
    });
  }

  function registrar() {
    setEstado("guardando");
    iniciar(async () => {
      const r = await guardarPropuesta({ partidoId: p.partidoId, franjas, texto });
      setEstado(r.ok ? "guardado" : "error");
    });
  }

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    registrar();
  }

  return (
    <div className="space-y-6">
      <section className="tarjeta space-y-3">
        <h2 className="font-semibold">1. Marca cuándo te va bien</h2>
        <p className="text-sm text-texto-suave">
          Las pistas del ranking se alquilan en bloques de 2 horas. Puedes marcar varias franjas.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="text-left font-medium text-texto-suave">Hora</th>
                {dias.map((d) => (
                  <th key={d} className="font-medium text-texto-suave">
                    {formatearDia(d, { corto: true })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FRANJAS.map(([inicio, fin]) => (
                <tr key={inicio}>
                  <th className="whitespace-nowrap text-left font-normal text-texto-suave">
                    {inicio}–{fin}
                  </th>
                  {dias.map((fecha) => {
                    const f = { fecha, inicio, fin };
                    const activa = seleccion.has(clave(f));
                    return (
                      <td key={fecha}>
                        <button
                          type="button"
                          aria-pressed={activa}
                          aria-label={`${formatearDia(fecha)} de ${inicio} a ${fin}`}
                          onClick={() => alternar(f)}
                          className={`h-9 w-full rounded-md border transition ${
                            activa
                              ? "border-primario bg-primario text-white dark:text-fondo"
                              : "border-borde bg-superficie hover:bg-fondo"
                          }`}
                        >
                          {activa ? "✓" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tarjeta space-y-3">
        <h2 className="font-semibold">2. Revisa el mensaje</h2>
        <textarea
          className="campo min-h-40 font-mono text-sm"
          value={texto}
          onChange={(e) => setTextoEditado(e.target.value)}
        />
        {textoEditado !== null && (
          <button
            type="button"
            className="text-sm text-primario underline"
            onClick={() => setTextoEditado(null)}
          >
            Volver al texto automático
          </button>
        )}
      </section>

      <section className="tarjeta space-y-3">
        <h2 className="font-semibold">3. Envíalo</h2>
        <div className="flex flex-wrap gap-2">
          {p.telefonoRival ? (
            <a
              href={urlWhatsapp(p.telefonoRival, texto)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={registrar}
              className="boton-acento"
            >
              Abrir WhatsApp
            </a>
          ) : (
            <p className="text-sm text-peligro">
              Tu rival no tiene teléfono en la lista de la liga. Copia el texto y mándaselo por
              correo.
            </p>
          )}
          <button type="button" className="boton-secundario" onClick={copiar} disabled={pendiente}>
            Copiar texto
          </button>
        </div>
        <p className="text-xs text-texto-suave" aria-live="polite">
          {estado === "guardando" && "Registrando la propuesta…"}
          {estado === "guardado" &&
            "Propuesta registrada. Te la marcamos como enviada en tus partidos."}
          {estado === "error" && "El mensaje se abrió, pero no se pudo registrar la propuesta."}
        </p>
      </section>
    </div>
  );
}
