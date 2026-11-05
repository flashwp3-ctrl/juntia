// T041 / FR-027, FR-051; research R8.7. Reglas puras de la cuenta: nombre visible y destino de «volver».

/** Recorta los espacios de los extremos, como `btrim` de la base: solo espacios, así un salto de línea no se recorta y se rechaza. */
export const normalizeDisplayName = (value: string) => value.replace(/^ +| +$/g, "");

/** 1–60 caracteres (puntos de código, como `char_length`), sin saltos de línea. `JT014` en la base. */
export function displayNameError(value: string): "invalidDisplayName" | null {
  const name = normalizeDisplayName(value);
  const length = [...name].length;
  return length < 1 || length > 60 || /[\r\n]/.test(name) ? "invalidDisplayName" : null;
}

/** Inicial del avatar: el primer carácter del nombre, en mayúscula. */
export const initialOf = (value: string) => [...value.trim()][0]?.toLocaleUpperCase("es-CO") ?? "?";

// Base ficticia: solo sirve para comparar orígenes; nunca se navega a ella.
const BASE = new URL("https://juntia.invalid");
// Una sola `/` inicial seguida de algo que no es `/` ni `\` (o nada), sin `\`, sin controles ni espacios.
const SHAPE = /^\/(?![/\\])[^\\\s\u0000-\u001f\u007f]*$/;

/**
 * Destino interno para `?volver=` (research R8.7, corregida en la revisión del PR #38). Cualquier valor que no cumple
 * todas las reglas, antes y después de decodificar una vez, cae a `/`.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (typeof value !== "string" || !SHAPE.test(value)) return "/";
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "/";
  }
  if (!SHAPE.test(decoded)) return "/";
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return "/";
  }
  if (url.origin !== BASE.origin) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
