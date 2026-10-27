"use client";

import { useMemo, useState } from "react";
import { formatearNombre, normalizarNombre } from "@/lib/dominio/nombres";

export function SelectorJugador({
  jugadores,
  nombreCampo = "jugador",
  seleccionado,
}: {
  jugadores: { id: string; nombre: string }[];
  nombreCampo?: string;
  seleccionado?: string | null;
}) {
  const [filtro, setFiltro] = useState("");
  const visibles = useMemo(() => {
    const f = normalizarNombre(filtro);
    return f ? jugadores.filter((j) => normalizarNombre(j.nombre).includes(f)) : jugadores;
  }, [filtro, jugadores]);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="etiqueta">Busca tu nombre</span>
        <input
          type="search"
          className="campo"
          placeholder="Escribe tu nombre o apellido"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          autoComplete="off"
        />
      </label>
      <div className="max-h-72 overflow-y-auto rounded-lg border border-borde divide-y divide-borde">
        {visibles.length === 0 && (
          <p className="p-3 text-sm text-texto-suave">Ningún nombre coincide.</p>
        )}
        {visibles.map((j) => (
          <label
            key={j.id}
            className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-fondo"
          >
            <input
              type="radio"
              name={nombreCampo}
              value={j.id}
              defaultChecked={j.id === seleccionado}
              required
              className="accent-primario"
            />
            <span>{formatearNombre(j.nombre)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
