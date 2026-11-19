// 005 · PR B (FR-050; afinado de la calibración de D-01 para las cifras, aprobado por el gestor el 19 nov 2026). Parcial
// 44439996119: en Plan, Balance y Metas los importes alineados a la derecha se movían 19–29 px al llegar Onest (y una fila de
// Balance cambiaba de corte, 39 px). Con `tabular-nums` (en `html`), las cifras de Onest miden 0,672 em y las de «Onest Fallback»
// (Arial ajustada, calibrada con texto) 0,583 em en 400/500 y 0,551 en 600. Criterio: una cara de «Onest Fallback» solo para
// cifras (U+0030–0039), sobre Verdana (0,636 em; 0,711 en negrita), con size-adjust = cifra de Onest / cifra de Verdana y las
// sobreescrituras verticales de Onest (970 y 305 sobre 1000) divididas por ese ajuste, así que la línea no cambia de alto.
// Declarada DESPUÉS de las caras generales: para las cifras gana ella, y donde no hay Verdana (Android) el navegador cae a la de
// Arial, como hoy. El ancho real lo mide el arnés (tramos `cls-*`); aquí, la declaración.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");
type Face = { index: number; weight: string; range: string; sources: string[]; size: number; ascent: number; descent: number };
const faces: Face[] = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)]
  .map(([, body], index) => {
    const prop = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(body)?.[1].trim() ?? "";
    return { family: prop("font-family").replace(/"/g, ""), index, weight: prop("font-weight"), range: prop("unicode-range"),
      sources: [...prop("src").matchAll(/local\("([^"]+)"\)/g)].map((match) => match[1]), size: Number.parseFloat(prop("size-adjust")),
      ascent: Number.parseFloat(prop("ascent-override")), descent: Number.parseFloat(prop("descent-override")) };
  })
  .filter((face) => face.family === "Onest Fallback");

const ONEST_DIGIT = { "400": 0.672, "500": 0.672, "600": 0.673 } as const;
const VERDANA_DIGIT = { "400": 0.6357, "500": 0.6357, "600": 0.7109 } as const;

describe("cifras del respaldo de Onest (afinado de D-01, PR B)", () => {
  const general = faces.filter((face) => face.range === "");
  const digits = faces.filter((face) => face.range !== "");

  it("hay una cara de cifras por peso (400, 500, 600), solo U+0030–0039, sobre Verdana", () => {
    expect(digits.map((face) => face.weight)).toEqual(["400", "500", "600"]);
    for (const face of digits) {
      expect(face.range).toBe("U+0030-0039");
      expect(face.sources).toEqual(face.weight === "600" ? ["Verdana Bold", "Verdana-Bold"] : ["Verdana"]);
    }
  });

  it("van después de las caras generales (para las cifras gana ella; sin Verdana, la de Arial)", () => {
    expect(Math.min(...digits.map((face) => face.index))).toBeGreaterThan(Math.max(...general.map((face) => face.index)));
    expect(general.map((face) => face.sources[0])).toEqual(["Arial", "Arial", "Arial Bold"]);
  });

  it("el ajuste iguala la cifra de Verdana a la de Onest y la línea conserva el alto de Onest (970 y 305)", () => {
    for (const face of digits) {
      const w = face.weight as keyof typeof ONEST_DIGIT;
      expect(face.size / 100).toBeCloseTo(ONEST_DIGIT[w] / VERDANA_DIGIT[w], 3);
      expect((face.ascent * face.size) / 100).toBeCloseTo(97, 1);
      expect((face.descent * face.size) / 100).toBeCloseTo(30.5, 1);
    }
  });
});
