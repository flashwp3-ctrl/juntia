// @vitest-environment node
// 005 · T029 y T034 (FR-051; F85-5, F85-11). contracts/cls-comparator.md §4: «entre el primer fotograma con esqueleto y el
// primer fotograma con el contenido final, ningún bloque que sigue en la página cambia de posición de layout». Fotogramas
// sintéticos en el formato de §3.4 (`{ t, scroll, skeleton, main, boxes: [[id, clase, x, y, w, h]] }`); el comparador es
// puro y sin E/S (scripts/cls-frames/compare.mjs). Proyecto `components` de Vitest (interpretación I2).
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compareLoad, summarize } from "../scripts/cls-frames/compare.mjs";

type Box = [number, "normal" | "fixed" | "sticky", number, number, number, number];
type Frame = { t: number; scroll: number[]; skeleton: boolean; main: boolean; boxes: Box[] };
const frame = (t: number, boxes: Box[], { skeleton = false, main = true, scroll = [0] }: Partial<Frame> = {}): Frame => ({ t, scroll, skeleton, main, boxes });
/** Carga: un fotograma previo sin esqueleto, la ventana y dos fotogramas finales iguales. */
const load = (window: Frame[], final: Box[]) => ({ frames: [frame(0, [], { main: false }), ...window, frame(900, final), frame(916, final)] });
const MAIN: Box = [1, "normal", 0, 64, 390, 600];
const LIST: Box = [2, "normal", 0, 200, 390, 300];
const SKELETON: Box = [3, "normal", 0, 200, 390, 80];

describe("comparador de CLS por fotogramas (§4)", () => {
  it("un bloque normal que se mueve 1 px entre dos fotogramas se detecta, con su dx y dy", () => {
    const result = compareLoad(load([frame(16, [MAIN, LIST], { skeleton: true }), frame(32, [MAIN, [2, "normal", 0, 201, 390, 300]], { skeleton: true })], [MAIN, [2, "normal", 0, 201, 390, 300]]));
    expect(result.desplazamientos).toEqual([expect.objectContaining({ id: 2, clase: "normal", dx: 0, dy: 1 })]);
  });

  it("un bloque que aparece o desaparece no cuenta", () => {
    const result = compareLoad(load([frame(16, [MAIN, SKELETON], { skeleton: true }), frame(32, [MAIN, LIST])], [MAIN, LIST]));
    expect(result.desplazamientos).toEqual([]);
  });

  it("un bloque que solo cambia de tamaño con la esquina fija no cuenta; los bloques que empuja, sí", () => {
    const grows: Box = [3, "normal", 0, 200, 390, 140];
    const below = (y: number): Box => [4, "normal", 0, y, 390, 50];
    const result = compareLoad(load([frame(16, [MAIN, SKELETON, below(290)], { skeleton: true }), frame(32, [MAIN, grows, below(350)], { skeleton: true })], [MAIN, grows, below(350)]));
    expect(result.desplazamientos.map((shift: { id: number }) => shift.id)).toEqual([4]);
    expect(result.desplazamientos[0]).toMatchObject({ dy: 60 });
  });

  it("el scroll del documento no mueve un bloque normal: su coordenada es la del documento", () => {
    const result = compareLoad(load([frame(16, [MAIN, LIST], { skeleton: true, scroll: [0] }), frame(32, [MAIN, LIST], { skeleton: true, scroll: [200] })], [MAIN, LIST]));
    expect(result.desplazamientos).toEqual([]);
  });

  it("un bloque fixed se compara en coordenadas del viewport: quieto con scroll no cuenta, movido sí", () => {
    const bar = (y: number): Box => [5, "fixed", 0, y, 390, 64];
    const still = compareLoad(load([frame(16, [MAIN, bar(780)], { skeleton: true, scroll: [0] }), frame(32, [MAIN, bar(780)], { skeleton: true, scroll: [120] })], [MAIN, bar(780)]));
    expect(still.desplazamientos).toEqual([]);
    const moved = compareLoad(load([frame(16, [MAIN, bar(780)], { skeleton: true }), frame(32, [MAIN, bar(760)], { skeleton: true })], [MAIN, bar(760)]));
    expect(moved.desplazamientos).toEqual([expect.objectContaining({ id: 5, clase: "fixed", dy: -20 })]);
  });

  it("un bloque sticky solo se compara entre fotogramas con el mismo scroll (documento y contenedores)", () => {
    const header = (y: number): Box => [6, "sticky", 0, y, 390, 56];
    const scrolled = compareLoad(load([frame(16, [MAIN, header(0)], { skeleton: true, scroll: [0, 0] }), frame(32, [MAIN, header(200)], { skeleton: true, scroll: [200, 0] })], [MAIN, header(200)]));
    expect(scrolled.desplazamientos).toEqual([]);
    const container = compareLoad(load([frame(16, [MAIN, header(0)], { skeleton: true, scroll: [0, 0] }), frame(32, [MAIN, header(40)], { skeleton: true, scroll: [0, 40] })], [MAIN, header(40)]));
    expect(container.desplazamientos).toEqual([]);
    const shifted = compareLoad(load([frame(16, [MAIN, header(0)], { skeleton: true, scroll: [0, 0] }), frame(32, [MAIN, header(30)], { skeleton: true, scroll: [0, 0] })], [MAIN, header(30)]));
    expect(shifted.desplazamientos).toEqual([expect.objectContaining({ id: 6, clase: "sticky", dy: 30 })]);
  });

  it("solo cuentan los pares entre el primer fotograma con esqueleto y el primer fotograma final, ambos incluidos", () => {
    const moving = (y: number): Box => [2, "normal", 0, y, 390, 300];
    // Antes del esqueleto se mueve (no cuenta); en la ventana se mueve una vez; después del final se mueve otra (no cuenta).
    const frames = [
      frame(0, [MAIN, moving(100)]), frame(16, [MAIN, moving(150)]),
      frame(32, [MAIN, moving(150)], { skeleton: true }), frame(48, [MAIN, moving(170)], { skeleton: true }),
      frame(64, [MAIN, moving(170)]), frame(80, [MAIN, moving(170)]),
      frame(96, [MAIN, moving(400)]), frame(112, [MAIN, moving(400)]),
    ];
    const result = compareLoad({ frames });
    expect(result.ventana).toEqual({ desde: 2, hasta: 4 });
    expect(result.desplazamientos).toEqual([expect.objectContaining({ id: 2, desde: 2, hasta: 3, dy: 20 })]);
    // El último par de la ventana (el que llega al primer fotograma final) también cuenta.
    const late = compareLoad({ frames: [frame(0, [MAIN, moving(150)], { skeleton: true }), frame(16, [MAIN, moving(160)]), frame(32, [MAIN, moving(160)])] });
    expect(late.desplazamientos).toEqual([expect.objectContaining({ desde: 0, hasta: 1, dy: 10 })]);
  });

  it("el primer fotograma final exige el main de la ruta y dos fotogramas seguidos sin cambios de caja", () => {
    const frames = [frame(0, [LIST], { skeleton: true, main: false }), frame(16, [LIST], { main: false }), frame(32, [LIST], { main: false }), frame(48, [MAIN, LIST]), frame(64, [MAIN, LIST])];
    expect(compareLoad({ frames }).ventana).toEqual({ desde: 0, hasta: 3 });
  });

  it("forma del resultado por carga (§4) y CLS = 0 por fotogramas por ruta y motor si y solo si ninguna carga tiene desplazamientos", () => {
    const meta = { ruta: "inicio-yo", motor: "webkit", tema: "claro", ancho: 390 };
    const quiet = compareLoad(load([frame(16, [MAIN, LIST], { skeleton: true })], [MAIN, LIST]), meta);
    expect(quiet).toEqual({ ...meta, fotogramas: 4, ventana: { desde: 1, hasta: 2 }, desplazamientos: [] });
    const shifted = compareLoad(load([frame(16, [MAIN, LIST], { skeleton: true }), frame(32, [MAIN, [2, "normal", 0, 240, 390, 300]], { skeleton: true })], [MAIN, [2, "normal", 0, 240, 390, 300]]), meta, { 2: "main>section.grid" });
    expect(shifted.desplazamientos).toEqual([{ id: 2, clase: "normal", desde: 1, hasta: 2, dx: 0, dy: 40, ruta: "main>section.grid" }]);
    expect(summarize([quiet, quiet])).toEqual([{ ruta: "inicio-yo", motor: "webkit", cargas: 2, conDesplazamientos: 0, incompletas: 0, clsCeroPorFotogramas: true }]);
    expect(summarize([quiet, shifted])).toEqual([{ ruta: "inicio-yo", motor: "webkit", cargas: 2, conDesplazamientos: 1, incompletas: 0, clsCeroPorFotogramas: false }]);
  });

  it("una carga sin esqueleto no tiene ventana y no puede tener desplazamientos; una sin fotograma final se marca incompleta", () => {
    expect(compareLoad({ frames: [frame(0, [MAIN]), frame(16, [MAIN])] })).toMatchObject({ ventana: null, desplazamientos: [] });
    expect(compareLoad({ frames: [frame(0, [MAIN], { skeleton: true }), frame(16, [MAIN], { skeleton: true })] })).toMatchObject({ ventana: null, incompleta: true });
  });
});

// T034 · contrato §3.6 («sin texto»), sobre una salida real del grabador con el dataset de prueba: ningún valor tiene letras,
// salvo los nombres de las claves y de las clases de bloque.
const BLOCK_CLASSES = new Set(["normal", "fixed", "sticky"]);
function lettersInValues(value: unknown, path = "$"): string[] {
  if (typeof value === "string") return BLOCK_CLASSES.has(value) || !/\p{L}/u.test(value) ? [] : [path];
  if (Array.isArray(value)) return value.flatMap((item, index) => lettersInValues(item, `${path}[${index}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => lettersInValues(item, `${path}.${key}`));
  return [];
}
describe("sin texto en una salida real del grabador (§3.6)", () => {
  const fixtures = readdirSync("tests/fixtures/cls-frames").filter((name) => name.endsWith(".json"));
  it("hay al menos una fixture real, con fotogramas y cajas", () => {
    expect(fixtures.length).toBeGreaterThan(0);
    for (const name of fixtures) {
      const output = JSON.parse(readFileSync(`tests/fixtures/cls-frames/${name}`, "utf8"));
      expect(output.frames.length, name).toBeGreaterThan(2);
      expect(output.frames.some((f: Frame) => f.boxes.length > 0), name).toBe(true);
    }
  });
  it.each(fixtures)("%s: ningún valor tiene letras salvo las clases de bloque", (name) => {
    expect(lettersInValues(JSON.parse(readFileSync(`tests/fixtures/cls-frames/${name}`, "utf8")))).toEqual([]);
  });
  it("la comprobación detecta un texto inyectado", () => {
    const output = JSON.parse(readFileSync(`tests/fixtures/cls-frames/${fixtures[0]}`, "utf8"));
    output.frames[0].boxes.push([999, "normal", 0, 0, 10, 10, "Sara pagó"]);
    expect(lettersInValues(output)).not.toEqual([]);
  });
});
