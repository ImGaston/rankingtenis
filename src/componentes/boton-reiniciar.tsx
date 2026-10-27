"use client";

import { useState, useTransition } from "react";
import { reiniciarResultado } from "@/app/(app)/acciones";

/** Vuelve a dejar el partido como pendiente borrando el resultado registrado. */
export function BotonReiniciar({ partidoId }: { partidoId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function reiniciar() {
    if (
      !window.confirm(
        "Se borra el resultado registrado y el partido vuelve a quedar pendiente. El mail que ya enviaste a la liga no se toca. ¿Seguir?",
      )
    )
      return;
    setError(null);
    iniciar(async () => {
      const r = await reiniciarResultado(partidoId);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={reiniciar}
        disabled={pendiente}
        className="boton-secundario text-texto-suave"
      >
        {pendiente ? "Reiniciando…" : "Reiniciar partido"}
      </button>
      {error && (
        <p className="basis-full text-sm text-peligro" role="alert">
          No se pudo reiniciar: {error}
        </p>
      )}
    </>
  );
}
