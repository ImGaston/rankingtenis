import { describe, expect, it } from "vitest";
import { armarMensajeReserva, armarMensajeWhatsapp, urlWhatsapp } from "@/lib/mensajes/whatsapp";

describe("mensaje de WhatsApp", () => {
  it("arma el texto con las franjas", () => {
    const texto = armarMensajeWhatsapp({
      yo: "Roberto Gastón Corbalán Lugo",
      rival: "JOSÉ VILLÉN ALTAMIRANO",
      jornada: 1,
      grupo: "H",
      franjas: [{ fecha: "2026-10-27", inicio: "18:00", fin: "20:00" }],
    });
    expect(texto).toBe(
      [
        "Hola José, soy Roberto Gastón Corbalán Lugo, tu rival de la jornada 1 del Ranking de Tenis (grupo H).",
        "Me va bien:",
        "- martes 27/10: 18:00-20:00",
        "¿Cuál te viene mejor?",
        "En cuanto me digas reservo la pista.",
      ].join("\n"),
    );
  });
  it("se presenta con el nombre visible tal cual (apodo del perfil)", () => {
    const texto = armarMensajeWhatsapp({
      yo: "Gaston",
      rival: "JUAN JOSE RUIZ VAZQUEZ",
      jornada: 3,
      grupo: "H",
      franjas: [],
    });
    expect(texto).toContain("Hola Juan, soy Gaston, tu rival de la jornada 3");
  });
  it("pregunta por la disponibilidad si no hay franjas", () => {
    const texto = armarMensajeWhatsapp({
      yo: "A B",
      rival: "C D",
      jornada: 2,
      grupo: "H",
      franjas: [],
    });
    expect(texto).toContain("¿Qué días y horas te vienen bien?");
  });
  it("genera el enlace wa.me sin el signo más", () => {
    expect(urlWhatsapp("+34612345678", "Hola, ¿qué tal?")).toBe(
      "https://wa.me/34612345678?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F",
    );
  });
});

describe("aviso de reserva", () => {
  it("cuenta al rival día, hora, sede y pista", () => {
    const texto = armarMensajeReserva({
      yo: "Gaston",
      rival: "LOPEZ GARCIA, MARTIN",
      jornada: 3,
      fecha: "2026-11-05",
      inicio: "18:00",
      fin: "20:00",
      sede: "Cerro del Telégrafo",
      pista: "Pista 5",
    });
    expect(texto).toContain("jornada 3");
    expect(texto).toContain("jueves 05/11 de 18:00 a 20:00 en Cerro del Telégrafo, Pista 5.");
  });
});
