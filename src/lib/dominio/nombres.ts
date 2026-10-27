const PARTICULAS = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "y",
  "e",
  "da",
  "do",
  "dos",
  "van",
  "von",
]);

/**
 * Convierte un nombre en mayúsculas del PDF ("ROBERTO GASTÓN CORBALÁN LUGO")
 * a formato de lectura ("Roberto Gastón Corbalán Lugo"), respetando las
 * partículas y los apellidos con guion.
 */
export function formatearNombre(nombre: string): string {
  return nombre
    .trim()
    .toLocaleLowerCase("es")
    .split(/\s+/)
    .map((palabra, i) => {
      if (i > 0 && PARTICULAS.has(palabra)) return palabra;
      return palabra
        .split("-")
        .map((parte) => parte.charAt(0).toLocaleUpperCase("es") + parte.slice(1))
        .join("-");
    })
    .join(" ");
}

/** Nombre de pila (primer token) en formato de lectura, para saludos. */
export function nombreDePila(nombre: string): string {
  return formatearNombre(nombre).split(" ")[0] ?? "";
}

/**
 * Misma normalización que public.normalizar_nombre en la base: mayúsculas,
 * sin diacríticos ni signos, espacios colapsados.
 */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[´`'’]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** Misma lógica que public.normalizar_telefono: devuelve E.164 o null. */
export function normalizarTelefono(entrada: string | null | undefined): string | null {
  let digitos = (entrada ?? "").replace(/[^0-9+]/g, "");
  if (!digitos) return null;
  if (digitos.startsWith("00")) digitos = "+" + digitos.slice(2);
  if (digitos.startsWith("+")) {
    digitos = digitos.slice(1);
    if (/^34[6-9][0-9]{8}$/.test(digitos)) return "+" + digitos;
    if (/^[0-9]{8,15}$/.test(digitos)) return "+" + digitos;
    return null;
  }
  if (/^34[6-9][0-9]{8}$/.test(digitos)) return "+" + digitos;
  if (/^[6-9][0-9]{8}$/.test(digitos)) return "+34" + digitos;
  return null;
}

/** Teléfono legible: +34 612 345 678. */
export function formatearTelefono(e164: string): string {
  const m = /^\+34(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+34 ${m[1]} ${m[2]} ${m[3]}` : e164;
}
