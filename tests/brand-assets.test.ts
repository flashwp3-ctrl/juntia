// @vitest-environment node
// Marca 1c (comp 09b, fundadores 23 nov 2026): los iconos y la imagen para compartir de src/app existen, miden lo debido y
// salen de la geometría de src/components/brand/logo-geometry.ts. La tarjeta es una sola para toda la app: ningún
// segmento por debajo de la raíz trae su propia imagen ni sus etiquetas, así que /invitacion no puede llevar datos.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { SMALL } from "../src/components/brand/logo-geometry";
import { copy } from "../src/lib/copy/es";

const APP = "src/app";
const read = (name: string) => readFileSync(join(APP, name));

type Png = { width: number; height: number; colorType: number; pixels: Buffer };

/** Decodificador PNG mínimo (8 bits, RGB o RGBA, sin entrelazado): lo justo para medir y leer el canal alfa. */
function decodePng(data: Buffer): Png {
  expect(data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  let offset = 8, width = 0, height = 0, colorType = 0;
  const idat: Buffer[] = [];
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    const body = data.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      expect(body[8], "8 bits por canal").toBe(8);
      colorType = body[9];
      expect(body[12], "sin entrelazado").toBe(0);
    }
    if (type === "IDAT") idat.push(body);
    offset += 12 + length;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  expect(channels, `tipo de color ${colorType}`).toBeGreaterThan(0);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const a = x >= channels ? pixels[y * stride + x - channels] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const predictor = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      pixels[y * stride + x] = (value + predictor) & 0xff;
    }
  }
  return { width, height, colorType, pixels: channels === 4 ? pixels : Buffer.alloc(0) };
}

const opaque = (png: Png) => png.colorType === 2 || png.pixels.every((value, i) => i % 4 !== 3 || value === 255);

describe("iconos de la marca 1c", () => {
  it("favicon.ico trae 16 y 32 px, PNG dentro, sobre baldosa bosque", () => {
    const ico = read("favicon.ico");
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2), "tipo icono").toBe(1);
    expect(ico.readUInt16LE(4), "dos tamaños").toBe(2);
    const sizes = [0, 1].map((i) => {
      const entry = 6 + 16 * i;
      const size = ico.readUInt8(entry);
      const png = decodePng(ico.subarray(ico.readUInt32LE(entry + 12), ico.readUInt32LE(entry + 12) + ico.readUInt32LE(entry + 8)));
      expect([png.width, png.height]).toEqual([size, size]);
      // La baldosa llena el centro: un .ico no cambia con el tema y el bosque no se vería sin su propio fondo.
      const center = ((size / 2) * size + 1) * 4;
      expect(png.pixels[center + 3], `${size} px: centro opaco`).toBe(255);
      return size;
    });
    expect(sizes).toEqual([16, 32]);
  });

  it("icon.svg es la versión pequeña, con colores por tema", () => {
    const svg = read("icon.svg").toString("utf8");
    expect(svg).toContain(`viewBox="0 0 ${SMALL.viewBox} ${SMALL.viewBox}"`);
    expect(svg).toContain(`d="${SMALL.stem}"`);
    expect(svg).toContain(`d="${SMALL.curve}"`);
    expect(svg).toMatch(/@media \(prefers-color-scheme:\s*dark\)/);
  });

  it("apple-icon.png mide 180 × 180 y no tiene transparencia", () => {
    const png = decodePng(read("apple-icon.png"));
    expect([png.width, png.height]).toEqual([180, 180]);
    expect(opaque(png)).toBe(true);
  });
});

describe("imagen para compartir", () => {
  it("opengraph-image.png mide 1200 × 630, es opaca y la de Twitter es el mismo archivo", () => {
    const og = read("opengraph-image.png");
    const png = decodePng(og);
    expect([png.width, png.height]).toEqual([1200, 630]);
    expect(opaque(png)).toBe(true);
    expect(og.length).toBeLessThan(5 * 1024 * 1024);
    expect(read("twitter-image.png").equals(og)).toBe(true);
  });

  it("el texto alternativo es el del módulo de copy", () => {
    expect(read("opengraph-image.alt.txt").toString("utf8")).toBe(copy.share.imageAlt);
    expect(read("twitter-image.alt.txt").toString("utf8")).toBe(copy.share.imageAlt);
  });

  it("es la única: ningún segmento (tampoco /invitacion) trae su imagen ni sus etiquetas Open Graph o Twitter", () => {
    const files: string[] = [];
    const walk = (dir: string) => readdirSync(dir).forEach((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else files.push(relative(APP, path).replaceAll("\\", "/"));
    });
    walk(APP);
    expect(files.filter((f) => /(^|\/)(opengraph|twitter)-image\./.test(f) && f.includes("/"))).toEqual([]);
    const withSocial = files.filter((f) => /\.(tsx?)$/.test(f) && f !== "layout.tsx" && /\b(openGraph|twitter)\s*:/.test(readFileSync(join(APP, f), "utf8")));
    expect(withSocial).toEqual([]);
  });
});
