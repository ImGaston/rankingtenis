import { describe, expect, it } from "vitest";
import { armarMailResultado, urlGmail, urlMailto } from "@/lib/mensajes/resultado";

const datos = {
  idPartido: "108999",
  fechaPartido: "2026-10-27",
  grupo: "H",
  fase: 2,
  jornada: 1,
  local: "ROBERTO GASTÓN CORBALÁN LUGO",
  visitante: "JOSÉ VILLÉN ALTAMIRANO",
  sets: [
    [6, 0],
    [6, 0],
  ] as [number, number][],
  ganador: "ROBERTO GASTÓN CORBALÁN LUGO",
  observaciones: "",
  firma: "Roberto Gastón Corbalán Lugo",
};

describe("mail de resultado", () => {
  it("sigue la plantilla oficial de la liga", () => {
    const mail = armarMailResultado(datos);
    expect(mail.asunto).toBe("resultado partido 108999");
    expect(mail.cuerpo).toBe(
      [
        "Fecha de Partido: 27/10/2026",
        "Grupo: H (2ª fase)",
        "Jornada: J1",
        "Rankista Local vs. Rankista Visitante: Roberto Gastón Corbalán Lugo vs José Villén Altamirano 108999",
        "Resultado: 6-0 / 6-0",
        "Victoria: Roberto Gastón Corbalán Lugo",
        "Observaciones: -",
        "",
        "Roberto Gastón Corbalán Lugo",
      ].join("\n"),
    );
  });
  it("incluye las observaciones cuando las hay", () => {
    const mail = armarMailResultado({
      ...datos,
      observaciones: "Partido aplazado una semana de mutuo acuerdo",
    });
    expect(mail.cuerpo).toContain("Observaciones: Partido aplazado una semana de mutuo acuerdo");
  });
  it("arma los enlaces mailto y Gmail con destinatario, copia, asunto y cuerpo", () => {
    const mail = { asunto: "resultado partido 108999", cuerpo: "línea 1\nlínea 2" };
    const mailto = urlMailto({ para: "liga@example.com", cc: "rival@example.com" }, mail);
    expect(mailto.startsWith("mailto:liga@example.com?")).toBe(true);
    expect(mailto).toContain("cc=rival%40example.com");
    expect(mailto).toContain("subject=resultado%20partido%20108999");
    expect(mailto).toContain("body=l%C3%ADnea%201%0Al%C3%ADnea%202");
    expect(mailto).not.toContain("+");

    const gmail = new URL(urlGmail({ para: "liga@example.com", cc: null }, mail));
    expect(gmail.origin + gmail.pathname).toBe("https://mail.google.com/mail/");
    expect(gmail.searchParams.get("view")).toBe("cm");
    expect(gmail.searchParams.get("to")).toBe("liga@example.com");
    expect(gmail.searchParams.get("cc")).toBeNull();
    expect(gmail.searchParams.get("su")).toBe(mail.asunto);
    expect(gmail.searchParams.get("body")).toBe(mail.cuerpo);
  });
});
