// PR #119, ronda 2 (F119-1) — capa: unidad. La estimación del ancho del título de las hojas (SheetTitle), sin navegador.
// Referencia: el ancho real de cada palabra de los 14 títulos de SheetTitle, medido en el DOM con Brygada 1918 500 y el tracking
// −0,015 em del título (Chromium, Windows, nov 2026; arnés `tests/evidence/desbordes-117.capture.ts`, caso 10), en em.
// `sheetTitleEm` debe reservar sobre esa referencia el margen entre plataformas (SHEET_TITLE_MARGIN). La estimación anterior,
// `longestWordEm`, no lo reservaba para «Invitar» ni para «Anotar»: es la regresión negativa que se conserva. La geometría real en
// cada plataforma la comprueba `tests/a11y/routes.a11y.ts` («hojas con SheetTitle al 200 %…»).
import { describe, expect, it } from "vitest";
import { longestWordEm, SHEET_TITLE_MARGIN, sheetTitleEm } from "./text-fit";

const REFERENCE_EM: Record<string, number> = {
  Anotar: 3.15, gasto: 2.408, ingreso: 3.418, Editar: 2.849, Invitar: 3.114, a: 0.52, mi: 1.234, pareja: 2.877, Enlace: 3.064, nuevo: 2.743,
  Exportar: 4.071, mis: 1.689, datos: 2.474, Registrar: 4.241, "liquidación": 5.178, Crear: 2.595, presupuesto: 5.636, Nueva: 2.819, meta: 2.31,
  aporte: 2.973, Retirar: 3.254, de: 1.109, la: 0.819,
};
const SHEET_TITLES = ["Anotar gasto", "Anotar ingreso", "Editar gasto", "Editar ingreso", "Invitar a mi pareja", "Enlace nuevo", "Exportar mis datos",
  "Registrar liquidación", "Crear presupuesto", "Editar presupuesto", "Nueva meta", "Editar meta", "Registrar aporte", "Retirar de la meta"];
const reference = (title: string) => Math.max(...title.split(/\s+/).map((word) => REFERENCE_EM[word]));

describe("sheetTitleEm (PR 119, F119-1)", () => {
  it.each(SHEET_TITLES)("«%s»: la estimación reserva el margen entre plataformas sobre el ancho real de su palabra más ancha", (title) => {
    expect(sheetTitleEm(title)).toBeGreaterThanOrEqual(reference(title) * (1 + SHEET_TITLE_MARGIN));
  });

  it("regresión negativa: la estimación anterior (por clases de letra) no reservaba el margen para «Invitar» ni para «Anotar»", () => {
    for (const title of ["Invitar a mi pareja", "Anotar gasto"]) expect(longestWordEm(title), title).toBeLessThan(reference(title) * (1 + SHEET_TITLE_MARGIN));
  });

  it("un carácter fuera de la tabla cuenta como uno ancho, para que un título nuevo nunca se quede corto", () => {
    expect(sheetTitleEm("ẞ")).toBeGreaterThanOrEqual(1);
  });
});
