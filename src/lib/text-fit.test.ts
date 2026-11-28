// PR 119 y su continuación (paso 4b sobre a21b1a9) — capa: unidad. El tamaño del título de las hojas (SheetTitle), sin navegador.
// Referencia: el ancho real de cada palabra de los 14 títulos, medido en el DOM con Brygada 1918 500 y el tracking −0,015 em del
// título (Chromium, Windows, nov 2026; arnés `tests/evidence/desbordes-117.capture.ts`, caso 10), en em; y la columna del título
// medida al 200 % (raíz de 32 px): 102 px a 390, 72 a 360 y 32 a 320, y 134 / 104 / 64 en las dos hojas con la columna ancha
// («Invitar a mi pareja» y «Enlace nuevo»). Linux: en el run 46098875205, el mismo texto se pintó hasta 0,547 px más ancho POR
// LETRA (redondeo por glifo de FreeType). La geometría real en cada plataforma la comprueba `tests/a11y/routes.a11y.ts`.
import { describe, expect, it } from "vitest";
import { SHEET_TITLE_CAP_REM, SHEET_TITLE_GLYPH_RESERVE_PX, sheetTitleFontPx, sheetTitleSize, sheetTitleWords } from "./text-fit";

const REFERENCE_EM: Record<string, number> = {
  Anotar: 3.15, gasto: 2.408, ingreso: 3.418, Editar: 2.849, Invitar: 3.114, a: 0.52, mi: 1.234, pareja: 2.877, Enlace: 3.064, nuevo: 2.743,
  Exportar: 4.071, mis: 1.689, datos: 2.474, Registrar: 4.241, "liquidación": 5.178, Crear: 2.595, presupuesto: 5.636, Nueva: 2.819, meta: 2.31,
  aporte: 2.973, Retirar: 3.254, de: 1.109, la: 0.819,
};
const SHEET_TITLES = ["Anotar gasto", "Anotar ingreso", "Editar gasto", "Editar ingreso", "Invitar a mi pareja", "Enlace nuevo", "Exportar mis datos",
  "Registrar liquidación", "Crear presupuesto", "Editar presupuesto", "Nueva meta", "Editar meta", "Registrar aporte", "Retirar de la meta"];
const WIDE = new Set(["Invitar a mi pareja", "Enlace nuevo"]);
const COLUMNS: Record<number, [number, number]> = { 390: [102, 134], 360: [72, 104], 320: [32, 64] };
const ROOT_200 = 32;
/** El peor caso medido en Linux: hasta 0,547 px más por letra que el ancho real local. */
const LINUX_MAX_PER_GLYPH = 0.547;
const CASES = SHEET_TITLES.flatMap((title) => [390, 360, 320].map((width) => ({ title, width, column: COLUMNS[width][WIDE.has(title) ? 1 : 0] })));
const painted = (title: string, fontPx: number, perGlyph: number) => Math.max(...title.split(/\s+/).map((word) => REFERENCE_EM[word] * fontPx + perGlyph * [...word].length));

describe("SheetTitle: reserva por letra (continuación del PR 119)", () => {
  it("son las 42 combinaciones: 14 títulos × 320, 360 y 390 al 200 %", () => {
    expect(CASES).toHaveLength(42);
  });

  it.each(CASES)("«$title» a $width al 200 %: cada palabra, a su ancho real más 0,6 px por letra, cabe en su columna ($column px)", ({ title, column }) => {
    const font = sheetTitleFontPx(title, column, ROOT_200);
    expect(painted(title, font, SHEET_TITLE_GLYPH_RESERVE_PX)).toBeLessThanOrEqual(column + 1e-9);
  });

  it.each(CASES)("«$title» a $width al 200 %: el peor caso medido en Linux (ancho local + 0,547 px por letra) cabe en su columna", ({ title, column }) => {
    const font = sheetTitleFontPx(title, column, ROOT_200);
    expect(painted(title, font, LINUX_MAX_PER_GLYPH)).toBeLessThanOrEqual(column + 1e-9);
  });

  it("regresión negativa: con la fórmula del PR 119 (suma + 2 %, sin reserva por letra), el peor caso de Linux no cabía en 16 de las 42", () => {
    const before = (title: string, column: number) => Math.min(SHEET_TITLE_CAP_REM * ROOT_200, ...sheetTitleWords(title).map(({ em }) => column / (Math.ceil(em * 1.02 * 100) / 100)));
    const overflowing = CASES.filter(({ title, column }) => painted(title, before(title, column), LINUX_MAX_PER_GLYPH) > column);
    expect(overflowing.length).toBeGreaterThanOrEqual(16);
  });

  it("al 100 % manda el tope (23 px) en todas las hojas: la reserva no cambia nada a la escala normal", () => {
    // Columnas al 100 % medidas en el arnés (caso 11): la más estrecha, 230 px a 360 en las hojas con icono.
    for (const title of SHEET_TITLES) expect(sheetTitleFontPx(title, 230, 16), title).toBe(SHEET_TITLE_CAP_REM * 16);
  });

  it("el CSS lleva el tope y un término por palabra, con la reserva en px", () => {
    expect(sheetTitleSize("Registrar liquidación")).toBe("min(1.4375rem, calc((100cqi - 5.4px) / 4.29), calc((100cqi - 6.6px) / 5.18))");
  });

  it("un carácter fuera de la tabla cuenta como uno ancho, para que un título nuevo nunca se quede corto", () => {
    expect(sheetTitleWords("ẞ")[0].em).toBeGreaterThanOrEqual(0.98);
  });
});
