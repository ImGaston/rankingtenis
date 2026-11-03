"use client";

import { useState, useTransition } from "react";
import { eliminarCuenta } from "@/app/(app)/acciones";

/** Borra la cuenta del usuario (auth + fila de usuarios) tras confirmar. */
export function BotonEliminarCuenta() {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function eliminar() {
    if (
      !window.confirm(
        "Vas a eliminar tu cuenta de la app. Se cierra la sesión y se borran tus propuestas de horario; tu ficha en el ranking y los resultados registrados se conservan. ¿Seguir?",
      )
    )
      return;
    setError(null);
    iniciar(async () => {
      const r = await eliminarCuenta();
      if (r && !r.ok) setError(r.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={eliminar}
        disabled={pendiente}
        className="boton-secundario border-peligro/60 text-peligro"
      >
        {pendiente ? "Eliminando…" : "Eliminar mi cuenta"}
      </button>
      {error && (
        <p className="text-sm text-peligro" role="alert">
          No se pudo eliminar: {error}
        </p>
      )}
    </>
  );
}
