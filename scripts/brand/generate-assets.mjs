// Genera los iconos y la imagen para compartir de la marca 1c en src/app (comp 09b, aprobado el 23 nov 2026).
// No corre en el build ni en CI: los archivos resultantes se versionan y son estáticos. Se vuelve a ejecutar solo si cambia
// la marca:  node scripts/brand/generate-assets.mjs
// Necesita red (Brygada 1918 y Onest desde Google Fonts, las mismas que carga next/font) y Chromium de Playwright.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { BRAND_PRIMITIVES, LOCKUP, MASTER, SMALL, TILE_16, TILE_32 } from "../../src/components/brand/logo-geometry.ts";

const app = fileURLToPath(new URL("../../src/app/", import.meta.url));
// Los colores salen de los primitivos de tokens.css: los hex solo viven allí (ADR-011 §6, regla 7).
const tokens = await readFile(new URL("../../src/styles/tokens.css", import.meta.url), "utf8");
const C = Object.fromEntries(Object.entries(BRAND_PRIMITIVES).map(([key, name]) => {
  const hex = tokens.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
  if (!hex) throw new Error(`tokens.css no define --${name}`);
  return [key, hex];
}));
const FONTS = "https://fonts.googleapis.com/css2?family=Brygada+1918:ital,wght@0,400;1,400;1,500&family=Onest:wght@600&display=block";

const paths = (g, stem, curve) => `<path d="${g.stem}" fill="${stem}"/><path d="${g.curve}" fill="${curve}"/>`;
const svg = (g, size, stem, curve, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${g.viewBox} ${g.viewBox}">${extra}${paths(g, stem, curve)}</svg>`;
const tile = (g, size) => svg(g, size, C.linen, C.sand, `<rect width="${g.viewBox}" height="${g.viewBox}" rx="${g.radius}" fill="${C.forest}"/>`);

// icon.svg: versión pequeña, con colores por tema dentro del propio SVG (el arena 600 llega a 4,3:1 en la pestaña blanca).
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 ${SMALL.viewBox} ${SMALL.viewBox}">
<style>.s{fill:${C.forest}}.c{fill:${C.sand600}}@media (prefers-color-scheme:dark){.s{fill:${C.forestDark}}.c{fill:${C.sandDark}}}</style>
<path class="s" d="${SMALL.stem}"/><path class="c" d="${SMALL.curve}"/>
</svg>
`;

const page = (w, h, body) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}">
<style>*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;background:transparent;-webkit-font-smoothing:antialiased}</style></head><body>${body}</body></html>`;

// Frase A, elegida por los fundadores el 23 nov 2026. Sin nombres, montos ni datos: la misma imagen para todos los enlaces.
const og = page(1200, 630, `<div style="width:1200px;height:630px;background:${C.forest};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:46px">
<div style="display:flex;align-items:center;gap:32px">${svg(MASTER, 116, C.linen, C.sand)}<span style="font:italic 500 126px/1 'Brygada 1918',serif;letter-spacing:-0.005em;color:${C.linen}">Juntia</span></div>
<div style="display:flex;flex-direction:column;align-items:center;gap:22px"><span style="font:400 58px/1.08 'Brygada 1918',serif;letter-spacing:-0.01em;color:${C.linen}">Lo tuyo, lo mío y <i>lo nuestro.</i></span>
<span style="font:600 20px 'Onest',sans-serif;letter-spacing:.12em;color:${C.sandLight}">FINANZAS EN PAREJA</span></div></div>`);

const apple = page(180, 180, `<div style="width:180px;height:180px;background:${C.forest};display:grid;place-items:center">${svg(MASTER, 108, C.linen, C.sand)}</div>`);

/** ICO con entradas PNG (soportado por todos los navegadores actuales). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size, e);
    header.writeUInt8(size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const browser = await chromium.launch();
try {
  const shot = async (w, h, html, transparent = false) => {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    const data = await p.screenshot({ omitBackground: transparent, type: "png" });
    await p.close();
    return data;
  };
  await writeFile(`${app}icon.svg`, iconSvg);
  await writeFile(`${app}apple-icon.png`, await shot(180, 180, apple));
  const ogPng = await shot(1200, 630, og);
  await writeFile(`${app}opengraph-image.png`, ogPng);
  await writeFile(`${app}twitter-image.png`, ogPng);
  const t16 = await shot(16, 16, page(16, 16, tile(TILE_16, 16)), true);
  const t32 = await shot(32, 32, page(32, 32, tile(TILE_32, 32)), true);
  await writeFile(`${app}favicon.ico`, ico([{ size: 16, data: t16 }, { size: 32, data: t32 }]));

  // Ancho de «Juntia» en Brygada 1918 Medium Itálica, en em: lo usa <Logo> como textLength para que el ancho no cambie al
  // llegar la fuente (CLS). Se imprime para comprobar la constante del componente.
  const p = await browser.newPage();
  await p.setContent(page(800, 200, `<span id="w" style="font:italic 500 100px/1 'Brygada 1918',serif;letter-spacing:-0.005em">Juntia</span>`), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const width = await p.evaluate(() => document.getElementById("w").getBoundingClientRect().width / 100);
  console.log(`«Juntia» mide ${width.toFixed(4)} em (lockup: isotipo ${LOCKUP.isotype} em, separación ${LOCKUP.gap} em)`);
} finally {
  await browser.close();
}
