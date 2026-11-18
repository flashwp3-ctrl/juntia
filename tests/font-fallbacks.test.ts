// 005 · PR B, corrección 1 (FR-050, maestro §15.7: «CLS = 0 en cargas con esqueleto») y corrección 2 (FR-051, Firefox a 390).
// Causa medida en el run 44349192421 y el parcial 44355668184: en el runner Linux, `local("Arial")` y `local("Georgia")` no
// resuelven (Chromium y Firefox comparan el nombre exacto de la fuente y no siguen los alias de fontconfig), el texto se pinta
// con la fuente por defecto y, al llegar Onest, el selector Yo/Nosotros —alineado a la derecha— crece 4 px (10 px en
// Firefox) y se desplaza. WebKit, que sí sigue los alias (Arial → Liberation Sans), dio 0 desplazamientos.
// Criterio: cada cara de respaldo nombra también una fuente con las mismas métricas que exista en Linux, para que el ancho
// del respaldo iguale al de la fuente en cualquier sistema donde se mide el gate.
// jsdom no carga fuentes ni calcula diseño: la capa más baja que ve el fallo es leer las declaraciones. El efecto (CLS = 0)
// lo mide el tramo `cls-*` del job `release`.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");

type Face = { family: string; style: string; weight: string; sources: string[]; sizeAdjust: number };
const faces: Face[] = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
  const prop = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(body)?.[1].trim() ?? "";
  return {
    family: prop("font-family").replace(/"/g, ""),
    style: prop("font-style") || "normal",
    weight: prop("font-weight"),
    sources: [...prop("src").matchAll(/local\("([^"]+)"\)/g)].map((match) => match[1]),
    sizeAdjust: Number.parseFloat(prop("size-adjust")),
  };
});
const of = (family: string) => faces.filter((face) => face.family === family);

// Fuentes con las métricas de cada referencia que trae Linux (paquete fonts-liberation, presente en el runner).
const LINUX = { Arial: "Liberation Sans", "Times New Roman": "Liberation Serif", "Courier New": "Liberation Mono" };

describe("respaldos de fuente que resuelven también en Linux (corrección 1 del PR B)", () => {
  it("Onest: cada cara con Arial nombra Liberation Sans, del mismo peso", () => {
    const onest = of("Onest Fallback");
    expect(onest.map((face) => face.weight)).toEqual(["400", "500", "600"]);
    for (const face of onest) {
      const bold = face.weight === "600";
      expect(face.sources).toEqual(bold
        ? ["Arial Bold", "Arial-BoldMT", `${LINUX.Arial} Bold`, "LiberationSans-Bold"]
        : ["Arial", "ArialMT", LINUX.Arial, "LiberationSans"]);
    }
  });

  it("Brygada: tras Georgia, una familia calibrada contra Times New Roman / Liberation Serif con las ocho caras", () => {
    const times = of("Brygada Fallback Times");
    expect(times.map((face) => `${face.style} ${face.weight}`)).toEqual(
      ["normal 400", "normal 500", "normal 600", "normal 700", "italic 400", "italic 500", "italic 600", "italic 700"]);
    for (const face of times) {
      expect(face.sources.some((name) => name.startsWith(LINUX["Times New Roman"]))).toBe(true);
      expect(face.sources.some((name) => name.startsWith("Times New Roman"))).toBe(true);
      // Brygada es más ancha que Times en todas sus caras (medido sobre las cadenas de es.ts): el ajuste nunca es ≤ 100 %.
      expect(face.sizeAdjust).toBeGreaterThan(100);
    }
    expect(layout).toMatch(/fallback: \["Brygada Fallback", "Brygada Fallback Times"\]/);
  });

  it("Spline Sans Mono: respaldo monoespaciado (Courier New / Liberation Mono, mismo avance de 0,6 em), no el Arial de next/font", () => {
    const mono = of("Spline Mono Fallback");
    expect(mono).toHaveLength(1);
    expect(mono[0].sources).toEqual(["Courier New", "CourierNewPSMT", LINUX["Courier New"], "LiberationMono"]);
    expect(mono[0].sizeAdjust).toBe(100);
    expect(layout).toMatch(/Spline_Sans_Mono\(\{[^)]*adjustFontFallback: false[^)]*fallback: \["Spline Mono Fallback"\]/);
  });
});
