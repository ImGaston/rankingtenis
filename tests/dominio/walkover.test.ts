import { describe, expect, it } from "vitest";
import { describirWalkover, setsWalkover } from "@/lib/dominio/walkover";

describe("setsWalkover", () => {
  it("da 0-6 0-6 al ausente con los juegos del local primero", () => {
    expect(setsWalkover("local")).toEqual([
      [0, 6],
      [0, 6],
    ]);
    expect(setsWalkover("visitante")).toEqual([
      [6, 0],
      [6, 0],
    ]);
  });
});

describe("describirWalkover", () => {
  const base = { ausente: "JAVIER BAEZA ESCUDERO", ganador: "ANA PRUEBA EJEMPLO 01" };
  it("habla en primera persona al que gana", () => {
    expect(
      describirWalkover({ ...base, motivo: "lesion", conSancion: false, perspectiva: "ganador" }),
    ).toBe(
      "Ganado por W.O.: Javier Baeza Escudero no juega por lesión. La liga te lo da 6-0 6-0 sin sanción.",
    );
  });
  it("habla en primera persona al ausente", () => {
    expect(
      describirWalkover({ ...base, motivo: "baja", conSancion: true, perspectiva: "ausente" }),
    ).toBe(
      "Perdido por W.O.: no juegas por baja de la fase. La liga se lo da a Ana Prueba Ejemplo 01 0-6 0-6 con sanción.",
    );
  });
  it("omite el motivo cuando es «otro»", () => {
    expect(
      describirWalkover({ ...base, motivo: "otro", conSancion: false, perspectiva: "ninguno" }),
    ).toBe(
      "W.O.: Javier Baeza Escudero no juega. La liga se lo da a Ana Prueba Ejemplo 01 6-0 6-0 sin sanción.",
    );
  });
});
