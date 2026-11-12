// @vitest-environment node
// F13 de la auditoría de Impeccable (decisión de los fundadores del 11 de noviembre de 2026): con el texto ampliado, todo el
// texto escala. Los tamaños de texto van en rem (base 16 px, idénticos al píxel a la escala por defecto) para que la letra
// del sistema o del navegador los agrande todos, no solo los botones.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css)$/.test(name) ? [path] : [];
});

// Excepciones con motivo: la inicial de la meta sin foto es una marca de agua decorativa (aria-hidden) recortada por la
// tarjeta, y las cifras que se ajustan al ancho de su contenedor (unidades cqi: Anotar y el saldo de Balance) guardan en
// px el tamaño de la escala por defecto como suelo, para no desbordar; su tope sí escala.
const ALLOWED = [
  /text-\[248px\]/,
  /text-\[min\(\d+vw,\d+px\)\]/,
  /text-\[[^\]]*cqi[^\]]*\]/,
  // El tope del título de la tarjeta de meta (F79-2): resta en px el relleno y la reserva del ícono, que van en px; su mínimo es rem.
  /text-\[min\(clamp\(1\.625rem,[^\]]*var\(--title-em\)\)\)\]/,
];

it("los tamaños de texto de src/ van en rem, no en px", () => {
  const offenders = files("src").filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx")).flatMap((file) => {
    const text = readFileSync(file, "utf8");
    const classes = [...text.matchAll(/text-\[[^\]]*\]|\[--[a-z-]*size[a-z-]*:[^\]]*\]/g)].map(([match]) => match).filter((match) => /\d(px)\b/.test(match));
    const declarations = [...text.matchAll(/(?:font-size|--[a-z0-9-]+-size)\s*:\s*[^;]*\d+px[^;]*;/g)].map(([match]) => match);
    return [...classes, ...declarations].filter((match) => !ALLOWED.some((pattern) => pattern.test(match))).map((match) => `${file}: ${match}`);
  });
  expect(offenders).toEqual([]);
});

it("los tokens de tamaño de texto equivalen al píxel de DESIGN_SYSTEM §1.4 con la raíz a 16 px", () => {
  const css = readFileSync("src/styles/tokens.css", "utf8");
  const sizes = Object.fromEntries([...css.matchAll(/--([a-z0-9-]+)-size:\s*([\d.]+)rem;/g)].map(([, name, rem]) => [name, Number(rem) * 16]));
  expect(sizes).toEqual({
    "display-xl": 56, "display-l": 38, "title-l": 26, "title-m": 21,
    "money-xl": 52, "money-l": 40, "money-m": 26, "money-s": 15,
    "body-l": 16, "body-m": 15, "body-s": 13, "label-m": 13, "label-s": 12, "overline": 11, "meta-mono": 11,
  });
});
