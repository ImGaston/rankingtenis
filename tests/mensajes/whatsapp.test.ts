import { describe, expect, it } from "vitest";
import { armarMensajeWhatsapp, urlWhatsapp } from "@/lib/mensajes/whatsapp";

describe("mensaje de WhatsApp", () => {
  it("arma el texto con las franjas", () => {
    const texto = armarMensajeWhatsapp({
      yo: "ROBERTO GASTÓN CORBALÁN LUGO",
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
