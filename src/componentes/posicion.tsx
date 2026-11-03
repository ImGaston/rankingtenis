/**
 * Celda de posición de una tabla: el número lidera la fila. El podio lleva una
 * marca amarilla (el color nunca es el único indicador: el número ya lo dice).
 */
export function CeldaPosicion({ posicion }: { posicion: number }) {
  const podio = posicion <= 3;
  return (
    <td className="py-2 pr-3 align-middle">
      <span
        className={`cifra inline-flex h-8 min-w-8 items-center justify-center font-display text-lg leading-none ${
          podio ? "rounded-[2px] bg-rivas-amarillo px-1 text-black" : ""
        }`}
      >
        {posicion}
      </span>
    </td>
  );
}

/** Etiqueta textual de la fila propia, además del fondo. */
export function EtiquetaTu() {
  return <span className="chip ml-2 bg-primario text-white uppercase">Tú</span>;
}
