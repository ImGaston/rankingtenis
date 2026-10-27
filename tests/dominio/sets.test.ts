import { describe, expect, it } from "vitest";
import { formatearSets, validarSets } from "@/lib/dominio/sets";

describe("validarSets", () => {
  it("acepta un 2-0 y determina al ganador", () => {
    expect(
      validarSets([
        [6, 0],
        [6, 0],
      ]),
    ).toEqual({ ok: true, ganador: "local", errores: [] });
    expect(
      validarSets([
        [3, 6],
        [5, 7],
      ]),
    ).toEqual({ ok: true, ganador: "visitante", errores: [] });
  });
  it("acepta un tercer set normal o un super tie-break", () => {
    expect(
      validarSets([
        [6, 4],
        [4, 6],
        [7, 6],
      ]).ganador,
    ).toBe("local");
    expect(
      validarSets([
        [6, 4],
        [4, 6],
        [8, 10],
      ]).ganador,
    ).toBe("visitante");
    expect(
      validarSets([
        [6, 4],
        [4, 6],
        [12, 10],
      ]).ganador,
    ).toBe("local");
  });
  it("rechaza sets imposibles", () => {
    expect(
      validarSets([
        [6, 5],
        [6, 0],
      ]).ok,
    ).toBe(false);
    expect(
      validarSets([
        [8, 6],
        [6, 0],
      ]).ok,
    ).toBe(false);
    expect(
      validarSets([
        [6, 6],
        [6, 0],
      ]).ok,
    ).toBe(false);
    expect(
      validarSets([
        [9, 7],
        [4, 6],
        [6, 4],
      ]).ok,
    ).toBe(false);
  });
  it("rechaza partidos incompletos o con sets de más", () => {
    expect(validarSets([[6, 0]]).ok).toBe(false);
    expect(
      validarSets([
        [6, 0],
        [3, 6],
      ]).ok,
    ).toBe(false);
    expect(
      validarSets([
        [6, 0],
        [6, 0],
        [6, 0],
      ]).ok,
    ).toBe(false);
  });
  it("en modo no estricto (abandono) solo pide un ganador", () => {
    expect(
      validarSets(
        [
          [6, 0],
          [3, 2],
        ],
        { estricto: false },
      ).ganador,
    ).toBe("local");
    expect(validarSets([[3, 3]], { estricto: false }).ok).toBe(false);
  });
});

describe("formatearSets", () => {
  it("usa el formato de la liga", () => {
    expect(
      formatearSets([
        [6, 0],
        [6, 0],
      ]),
    ).toBe("6-0 / 6-0");
  });
});
