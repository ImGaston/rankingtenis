import { describe, expect, it } from "vitest";
import { diaSemanaDe, hoyEnMadrid, nombrePista, turnosDelDia } from "@/lib/dominio/pistas";

function resumen(dia: Parameters<typeof turnosDelDia>[0], sede: "cerro" | "sureste") {
  return turnosDelDia(dia)
    .filter((t) => t.sede === sede)
    .map((t) => `${t.inicio}-${t.fin} ${t.pistas.join(",")}`);
}

describe("pistas de ranking", () => {
  it("entre semana el Cerro da la 5 y la semicubierta por la mañana y solo la 5 por la tarde", () => {
    expect(resumen(0, "cerro")).toEqual([
      "09:00-11:00 5,6",
      "11:00-13:00 5,6",
      "13:00-15:00 5,6",
      "15:00-17:00 6",
      "16:00-18:00 5",
      "18:00-20:00 5",
      "20:00-22:00 5",
    ]);
  });
  it("el viernes por la mañana el Cerro suma la pista 4", () => {
    expect(resumen(4, "cerro").slice(0, 4)).toEqual([
      "09:00-11:00 4,5,6",
      "11:00-13:00 4,5,6",
      "13:00-15:00 4,5,6",
      "15:00-17:00 4,6",
    ]);
  });
  it("el fin de semana el Cerro da la 4, 5 y 6 sin el turno de 15 a 17", () => {
    expect(resumen(6, "cerro")).toHaveLength(6);
    expect(resumen(5, "cerro").every((t) => t.endsWith("4,5,6"))).toBe(true);
  });
  it("Parque Sureste da la 1 entre semana y la 1 y 2 el fin de semana", () => {
    expect(resumen(2, "sureste")).toHaveLength(6);
    expect(resumen(2, "sureste")[0]).toBe("09:00-11:00 1");
    expect(resumen(5, "sureste")[5]).toBe("20:00-22:00 1,2");
  });
  it("calcula el día de la semana con lunes = 0", () => {
    expect(diaSemanaDe("2026-11-02")).toBe(0);
    expect(diaSemanaDe("2026-11-05")).toBe(3);
    expect(diaSemanaDe("2026-11-08")).toBe(6);
  });
  it("nombra la semicubierta solo en el Cerro", () => {
    expect(nombrePista("cerro", "6")).toBe("Pista 6 (semicubierta)");
    expect(nombrePista("sureste", "1")).toBe("Pista 1");
  });
  it("usa la fecha de Madrid aunque en UTC sea otro día", () => {
    expect(hoyEnMadrid(new Date("2026-11-05T23:30:00Z"))).toBe("2026-11-06");
  });
});
