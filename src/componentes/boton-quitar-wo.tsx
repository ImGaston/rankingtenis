"use client";

import { useState, useTransition } from "react";
import { quitarWalkover } from "@/app/(app)/acciones";

/** Quita el W.O. registrado y el partido vuelve a quedar pendiente. */
export function BotonQuitarWo({ partidoId }: { partidoId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function quitar() {
    if (!window.confirm("Se quita el W.O. y el partido vuelve a quedar pendiente. ¿Seguir?"))
      return;
    setError(null);
    iniciar(async () => {
      const r = await quitarWalkover(partidoId);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={quitar}
        disabled={pendiente}
        className="boton-secundario text-texto-suave"
      >
        {pendiente ? "Quitando…" : "Quitar W.O."}
      </button>
      {error && (
        <p className="basis-full text-sm text-peligro" role="alert">
          No se pudo quitar: {error}
        </p>
      )}
    </>
  );
}
