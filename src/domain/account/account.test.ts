// T041 / FR-051: «validación del nombre visible (recortado, 1–60, sin saltos de línea)».
// T041 / FR-027; research R8.7 (revisión del PR #38, F38-1): «`volver` solo acepta un destino interno: empieza por una
// sola `/` seguida de algo que no es `/` ni `\`; ninguna barra invertida; ningún carácter de control ni espacio; se
// decodifica una vez y se vuelve a comprobar todo; y como última comprobación `new URL(value, base).origin ===
// base.origin`, devolviendo solo `pathname + search + hash`. Cualquier otro valor cae a `/`».
import { displayNameError, normalizeDisplayName, safeReturnPath, initialOf } from "./index";

describe("nombre visible", () => {
  it("recorta los espacios y acepta de 1 a 60 caracteres", () => {
    expect(normalizeDisplayName("  Sara  ")).toBe("Sara");
    expect(displayNameError("Sara")).toBeNull();
    expect(displayNameError("a".repeat(60))).toBeNull();
    // 60 caracteres que no caben en 60 unidades UTF-16: cuenta puntos de código, como char_length de PostgreSQL.
    expect(displayNameError("😀".repeat(60))).toBeNull();
  });
  it("rechaza el vacío, más de 60 y los saltos de línea", () => {
    for (const value of ["", "   ", "a".repeat(61), "Sara\nTomás", "Sara\r", "\nSara"]) expect(displayNameError(value)).toBe("invalidDisplayName");
  });
  it("usa la inicial en mayúscula", () => {
    expect(initialOf("sara")).toBe("S");
    expect(initialOf("  Ángela")).toBe("Á");
    expect(initialOf("")).toBe("?");
  });
});

describe("ruta volver", () => {
  it("acepta destinos internos y conserva solo pathname, search y hash", () => {
    expect(safeReturnPath("/actividad?mes=2026-10")).toBe("/actividad?mes=2026-10");
    expect(safeReturnPath("/cuenta/perfil#x")).toBe("/cuenta/perfil#x");
    expect(safeReturnPath("/")).toBe("/");
  });
  it("cae a / con cualquier destino externo, codificado o con controles", () => {
    const negatives = [
      "//evil", "/\\evil", "/%5Cevil", "/%2F%2Fevil", "/%2f%2fevil", "https://evil", "javascript:alert(1)",
      "\t/actividad", "\n/actividad", "", "actividad", "/actividad\\x", "/ actividad", "/actividad%09", "/%0a",
      "/%E0%A4%A", "/\u0000", "/\u007f", "///evil",
    ];
    for (const value of negatives) expect(safeReturnPath(value), JSON.stringify(value)).toBe("/");
    expect(safeReturnPath(null)).toBe("/");
    expect(safeReturnPath(undefined)).toBe("/");
  });
});
