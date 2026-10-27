import { describe, expect, it } from "vitest";
import {
  describirFranjas,
  diasDeSemana,
  formatearDia,
  formatearFecha,
  formatearFranja,
} from "@/lib/mensajes/franjas";

describe("franjas", () => {
  it("genera los 7 días de la semana desde el lunes del partido", () => {
    expect(diasDeSemana("2026-10-26")).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });
  it("formatea días y fechas en español", () => {
    expect(formatearDia("2026-10-27")).toBe("martes 27/10");
    expect(formatearDia("2026-11-01", { corto: true })).toBe("dom 01/11");
    expect(formatearFecha("2026-10-27")).toBe("27/10/2026");
    expect(formatearFranja({ fecha: "2026-10-27", inicio: "18:00", fin: "20:00" })).toBe(
      "martes 27/10 de 18:00 a 20:00",
    );
  });
  it("agrupa las franjas por día y las ordena", () => {
    expect(
      describirFranjas([
        { fecha: "2026-10-28", inicio: "20:00", fin: "22:00" },
        { fecha: "2026-10-27", inicio: "20:00", fin: "22:00" },
        { fecha: "2026-10-27", inicio: "18:00", fin: "20:00" },
      ]),
    ).toEqual(["martes 27/10: 18:00-20:00 o 20:00-22:00", "miércoles 28/10: 20:00-22:00"]);
  });
});
