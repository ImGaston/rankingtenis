import { describe, expect, it } from "vitest";
import {
  formatearNombre,
  formatearTelefono,
  nombreDePila,
  normalizarNombre,
  normalizarTelefono,
} from "@/lib/dominio/nombres";

describe("formatearNombre", () => {
  it("pasa de mayúsculas a formato de lectura respetando partículas y guiones", () => {
    expect(formatearNombre("ROBERTO GASTÓN CORBALÁN LUGO")).toBe("Roberto Gastón Corbalán Lugo");
    expect(formatearNombre("JAVIER DE MIGUEL DEL VALLE")).toBe("Javier de Miguel del Valle");
    expect(formatearNombre("IGNACIO RODRIGUEZ GARCIA-CEBADERA")).toBe(
      "Ignacio Rodriguez Garcia-Cebadera",
    );
  });
  it("saca el nombre de pila", () => {
    expect(nombreDePila("JOSÉ VILLÉN ALTAMIRANO")).toBe("José");
  });
});

describe("normalizarNombre (igual que la función SQL)", () => {
  it("ignora acentos, signos y espacios", () => {
    expect(normalizarNombre("  JUAN JOSÉ RUÍZ  VÁZQUEZ ")).toBe("JUAN JOSE RUIZ VAZQUEZ");
    expect(normalizarNombre("Juan Jose Ruiz Vazquez")).toBe("JUAN JOSE RUIZ VAZQUEZ");
    expect(normalizarNombre("ENRIQUE FER´NANDEZ PASTOR")).toBe("ENRIQUE FERNANDEZ PASTOR");
    expect(normalizarNombre("IGNACIO RODRIGUEZ GARCIA-CEBADERA")).toBe(
      "IGNACIO RODRIGUEZ GARCIA CEBADERA",
    );
  });
});

describe("normalizarTelefono", () => {
  it("convierte números españoles a E.164", () => {
    expect(normalizarTelefono("612 345 678")).toBe("+34612345678");
    expect(normalizarTelefono("+34 612345678")).toBe("+34612345678");
    expect(normalizarTelefono("0034612345678")).toBe("+34612345678");
    expect(normalizarTelefono("34612345678")).toBe("+34612345678");
  });
  it("rechaza lo que no reconoce", () => {
    expect(normalizarTelefono("12345")).toBeNull();
    expect(normalizarTelefono("")).toBeNull();
    expect(normalizarTelefono(null)).toBeNull();
  });
  it("formatea para lectura", () => {
    expect(formatearTelefono("+34612345678")).toBe("+34 612 345 678");
  });
});
