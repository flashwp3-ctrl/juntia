// 005 · FR-051; contracts/cls-comparator.md §4 (F85-5, F85-11). Comparador de CLS por fotogramas: PURO y sin E/S. Entrada:
// la salida del grabador de una carga (`window.__clsFrames`, recorder.js). Salida: el resultado por carga y, con
// `summarize`, el resultado por ruta y motor. Lo prueba tests/cls-frames.test.ts.
//
// Regla: para cada par de fotogramas consecutivos entre el primero con esqueleto y el primero final, ambos incluidos, un
// bloque presente en los dos cuya x o y, en la coordenada de su clase, cambió en ≥ 1 px CSS es un desplazamiento. No lo
// es: aparecer o desaparecer; cambiar solo de tamaño con la esquina superior izquierda fija; un sticky entre fotogramas
// con distinto scroll; una transformación (el grabador mide por offsetTop/offsetLeft, que no la incluyen).

const sameBoxes = (a, b) => {
  if (a.boxes.length !== b.boxes.length) return false;
  const key = (frame) => JSON.stringify([...frame.boxes].sort((x, y) => x[0] - y[0]));
  return key(a) === key(b);
};

/** Índices de la ventana: el primer fotograma con esqueleto y el primer fotograma final (§3.5), o null. */
export function windowOf(frames) {
  const from = frames.findIndex((frame) => frame.skeleton);
  if (from < 0) return { window: null, incomplete: false };
  for (let i = from; i < frames.length - 1; i++) {
    const frame = frames[i], next = frames[i + 1];
    // Final: sin esqueleto, con el `main` de la ruta y dos fotogramas seguidos sin cambios de caja.
    if (!frame.skeleton && frame.main && !next.skeleton && next.main && sameBoxes(frame, next)) return { window: { desde: from, hasta: i }, incomplete: false };
  }
  return { window: null, incomplete: true };
}

/**
 * Resultado de una carga: `{ ruta, motor, tema, ancho, fotogramas, ventana, desplazamientos }` (§4). `meta` pone ruta,
 * motor, tema y ancho; `paths` (opcional) la ruta del nodo de cada id, `etiqueta.clase` de sus antepasados, sin texto.
 * @param {{ frames: { t: number, scroll: number[], skeleton: boolean, main: boolean, boxes: [number, string, number, number, number, number][] }[] }} load
 * @param {Record<string, unknown>} [meta]
 * @param {Record<string | number, string>} [paths]
 */
export function compareLoad(load, meta = {}, paths = {}) {
  const frames = load.frames ?? [];
  const { window, incomplete } = windowOf(frames);
  const result = { ...meta, fotogramas: frames.length, ventana: window, desplazamientos: [] };
  if (incomplete) result.incompleta = true;
  if (!window) return result;
  for (let i = window.desde; i < window.hasta; i++) {
    const before = new Map(frames[i].boxes.map((box) => [box[0], box]));
    const sameScroll = JSON.stringify(frames[i].scroll) === JSON.stringify(frames[i + 1].scroll);
    for (const box of frames[i + 1].boxes) {
      const previous = before.get(box[0]);
      // Aparece o desaparece: no cuenta. Si cambió de clase, sus coordenadas no son comparables.
      if (!previous || previous[1] !== box[1]) continue;
      if (box[1] === "sticky" && !sameScroll) continue;
      const dx = box[2] - previous[2], dy = box[3] - previous[3];
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
        result.desplazamientos.push({ id: box[0], clase: box[1], desde: i, hasta: i + 1, dx, dy, ruta: paths[box[0]] ?? null });
      }
    }
  }
  return result;
}

/**
 * Por ruta y motor: «CLS = 0 por fotogramas» si y solo si ninguna carga tiene desplazamientos. Una carga incompleta (sin
 * fotograma final) no demuestra nada, así que tampoco deja dar la ruta por buena.
 * @param {ReturnType<typeof compareLoad>[]} results
 */
export function summarize(results) {
  const groups = new Map();
  for (const result of results) {
    const key = `${result.ruta}\u0000${result.motor}`;
    const group = groups.get(key) ?? { ruta: result.ruta, motor: result.motor, cargas: 0, conDesplazamientos: 0, incompletas: 0 };
    group.cargas++;
    if (result.desplazamientos.length) group.conDesplazamientos++;
    if (result.incompleta) group.incompletas++;
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ ...group, clsCeroPorFotogramas: group.conDesplazamientos === 0 && group.incompletas === 0 }));
}
