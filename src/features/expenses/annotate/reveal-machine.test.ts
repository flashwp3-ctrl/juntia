// E5 (MOTION_SYSTEM.md §2; F45-2, F51-13, F69-5, F69-6, F69-7) — capa: componentes (función pura, sin DOM). La tabla de estados
// de E5: cada fila es un cuadro con lo que la pantalla sabe en ese momento y lo que E5 hace. Las pruebas del proveedor
// (`annotate-sheet.test.tsx`, `reveal-context.test.tsx`, `reveal-navigation.test.tsx`, `home-reveal.test.tsx`) recorren las
// mismas filas de punta a punta con cuadros controlados.
import { describe, expect, it } from "vitest";
import type { ContextChoice } from "@/lib/context-preference";
import { REVEAL_SAFETY_MS, revealStep, SETTLE_FRAMES, type ListSnapshot, type RevealFrame, type RevealStep } from "./reveal-machine";

const ID = "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10";
const HOME = "/";
const list = (month: string, contexts: ContextChoice[], ids: string[] = [], hidden: string[] = []): ListSnapshot => ({ key: `lista-${month}-${contexts.join("-")}`, month, contexts, ids: new Set(ids), hidden: new Set(hidden) });
/** Un cuadro: por defecto, un privado de noviembre anotado en Inicio de Yo, recién empezado. */
const frame = (overrides: Partial<RevealFrame> & { context?: ContextChoice; date?: string } = {}): RevealFrame => {
  const { context = "me", date = "2026-11-05", ...rest } = overrides;
  return { target: { id: ID, transactionDate: date, context, route: HOME }, page: "me", route: HOME, lists: [], shown: false, elapsed: 0, settled: 0, unfiltered: false, reached: false, leaving: false, ...rest };
};

const ACTIVITY = "/actividad?mes=2026-11";
/** Un cuadro después de que E5 llevara a la persona a Actividad del mes. */
const following = (overrides: Partial<RevealFrame>) => frame({ ...overrides, target: { ...frame().target, route: ACTIVITY, follow: true } });

type Row ={ state: string; frame: RevealFrame; step: RevealStep };
const TABLE: Row[] = [
  // Mismo contexto y mes.
  { state: "mismo contexto y mes · la lista trae el id y la fila se ve → resalta ahí", frame: frame({ lists: [list("2026-11", ["me"], [ID])], shown: true }), step: { kind: "highlight", context: "me" } },
  { state: "mismo contexto y mes · la lista trae el id y la fila no se ve (fuera de los 5 recientes), primer cuadro → espera", frame: frame({ lists: [list("2026-11", ["me"], ["a", ID])] }), step: { kind: "wait", settled: 1 } },
  { state: `mismo contexto y mes · la lista trae el id y la fila sigue sin verse al cuadro ${SETTLE_FRAMES} → Actividad del mes`, frame: frame({ lists: [list("2026-11", ["me"], ["a", ID])], settled: SETTLE_FRAMES - 1 }), step: { kind: "toActivity", month: "2026-11" } },
  // F69-5: la lista todavía no trae el id.
  { state: "la lista aún no trae el id (árbol ajeno o refresco lento), a 9,9 s → espera", frame: frame({ lists: [list("2026-11", ["me"], ["previo"])], elapsed: REVEAL_SAFETY_MS - 100 }), step: { kind: "wait", settled: 0 } },
  { state: "la lista aún no trae el id al llegar al tope de 10 s → Actividad del mes", frame: frame({ lists: [list("2026-11", ["me"], ["previo"])], elapsed: REVEAL_SAFETY_MS }), step: { kind: "toActivity", month: "2026-11" } },
  // Otro mes y rutas sin lista.
  { state: "otro mes (gasto de octubre, Inicio de noviembre) → Actividad de su mes, sin esperar", frame: frame({ date: "2026-10-20", lists: [list("2026-11", ["me"], ["a"])] }), step: { kind: "toActivity", month: "2026-10" } },
  { state: "ruta sin lista (Metas, Plan, Balance) y el contexto coincide → Actividad del mes", frame: frame({ lists: [] }), step: { kind: "toActivity", month: "2026-11" } },
  { state: "ruta sin lista y el gasto es de otro contexto → termina sin navegar", frame: frame({ context: "us", lists: [] }), step: { kind: "stop", reason: "otherContext" } },
  // F69-6: otro contexto.
  { state: "un compartido desde una vista de Yo que no pinta lo compartido → termina sin navegar", frame: frame({ context: "us", lists: [list("2026-11", ["me"], [])] }), step: { kind: "stop", reason: "otherContext" } },
  { state: "un privado desde Inicio en Nosotros → termina sin navegar", frame: frame({ page: "us", lists: [list("2026-11", ["us"], [])] }), step: { kind: "stop", reason: "otherContext" } },
  { state: "compartido desde Inicio en Yo, que pinta tu parte de lo compartido, aún sin el id → espera", frame: frame({ context: "us", lists: [list("2026-11", ["me", "us"], [])] }), step: { kind: "wait", settled: 0 } },
  { state: "compartido desde Inicio en Yo, que pinta tu parte, y la parte se ve → la resalta en Yo", frame: frame({ context: "us", lists: [list("2026-11", ["me", "us"], [ID])], shown: true }), step: { kind: "highlight", context: "me" } },
  { state: "compartido desde Inicio en Yo, traído fuera de los 5 recientes al cuadro 3 → termina sin ir a Actividad de Yo", frame: frame({ context: "us", lists: [list("2026-11", ["me", "us"], ["a", ID])], settled: SETTLE_FRAMES - 1 }), step: { kind: "stop", reason: "otherContext" } },
  // F69-7: lista en carga.
  { state: "lista en carga (Skeleton de Yo tras Nosotros → Yo, sin ids) → espera", frame: frame({ lists: [list("2026-11", ["me"])] }), step: { kind: "wait", settled: 0 } },
  // Cambio de contexto durante la espera.
  { state: "cambio a Nosotros durante la espera de un privado; Nosotros no pinta privados → termina sin navegar", frame: frame({ page: "us", lists: [list("2026-11", ["us"], ["b"])], elapsed: 2000 }), step: { kind: "stop", reason: "otherContext" } },
  { state: "cambio a Yo durante la espera de un compartido; la vista nueva pinta tu parte y se ve → la resalta en Yo", frame: frame({ context: "us", page: "me", lists: [list("2026-11", ["me", "us"], [ID])], shown: true, elapsed: 2000 }), step: { kind: "highlight", context: "me" } },
  { state: "cambio a Yo durante la espera de un compartido; la vista nueva solo pinta Yo → termina sin navegar", frame: frame({ context: "us", page: "me", lists: [list("2026-11", ["me"], ["a"])], elapsed: 2000 }), step: { kind: "stop", reason: "otherContext" } },
  // La persona navega mientras E5 espera: se respeta su navegación.
  { state: "la persona va a otra ruta durante la espera → termina sin llevarla a Actividad", frame: frame({ route: "/metas", lists: [], elapsed: 3000 }), step: { kind: "stop", reason: "navigated" } },
  { state: "la persona va a Actividad de otro mes durante la espera → termina sin volver a llevarla", frame: frame({ route: "/actividad?mes=2026-09", lists: [list("2026-09", ["me"], ["c"])], elapsed: 3000 }), step: { kind: "stop", reason: "navigated" } },
  { state: "la persona va a otra ruta que sí enseña la fila → la resalta ahí", frame: frame({ route: "/actividad?mes=2026-11", lists: [list("2026-11", ["me"], [ID])], shown: true }), step: { kind: "highlight", context: "me" } },
  { state: "la misma ruta al tope de 10 s sigue llevando a Actividad (el cambio de ruta es lo único que lo evita)", frame: frame({ lists: [list("2026-11", ["me"])], elapsed: REVEAL_SAFETY_MS + 1 }), step: { kind: "toActivity", month: "2026-11" } },
  // #54 (F51-14): un filtro activo de Actividad oculta el gasto recién guardado.
  { state: "#54 · la lista de Actividad trae el id y un filtro activo lo oculta → quita solo los filtros que lo excluyen", frame: frame({ route: ACTIVITY, target: { ...frame().target, route: ACTIVITY }, lists: [list("2026-11", ["me"], [ID], [ID])] }), step: { kind: "unfilter", list: "lista-2026-11-me" } },
  { state: "#54 · ya pidió quitar los filtros y la fila aún no se pinta → espera unos cuadros", frame: frame({ route: ACTIVITY, target: { ...frame().target, route: ACTIVITY }, lists: [list("2026-11", ["me"], [ID], [ID])], unfiltered: true }), step: { kind: "wait", settled: 1 } },
  { state: "#54 · tras quitar los filtros, la fila se ve → la resalta ahí", frame: frame({ route: ACTIVITY, target: { ...frame().target, route: ACTIVITY }, lists: [list("2026-11", ["me"], [ID])], unfiltered: true, shown: true }), step: { kind: "highlight", context: "me" } },
  { state: "#54 · un id que el filtro oculta pero que es de otra lista (Nosotros) no quita filtros de esta", frame: frame({ lists: [list("2026-11", ["us"], [ID], [ID]), list("2026-11", ["me"], ["a"])] }), step: { kind: "wait", settled: 0 } },
  // E5 llevó a la persona a Actividad del mes y sigue mirando ahí (follow), por si un filtro lo oculta (#54).
  { state: "tras llevarla a Actividad, la URL todavía no cambió → espera (no es una navegación de la persona)", frame: following({ route: HOME, reached: false, elapsed: 300 }), step: { kind: "wait", settled: 0 } },
  { state: "ya en Actividad, un filtro que se conserva entre meses lo oculta → quita esos filtros", frame: following({ route: ACTIVITY, reached: true, lists: [list("2026-11", ["me"], [ID], [ID])] }), step: { kind: "unfilter", list: "lista-2026-11-me" } },
  { state: "ya en Actividad y no se ve tras unos cuadros → termina sin volver a navegar", frame: following({ route: ACTIVITY, reached: true, lists: [list("2026-11", ["me"], [ID])], settled: SETTLE_FRAMES - 1, unfiltered: true }), step: { kind: "stop", reason: "arrived" } },
  { state: "ya en Actividad, la persona se va a otra ruta → termina", frame: following({ route: "/metas", reached: true }), step: { kind: "stop", reason: "navigated" } },
  { state: "siguiendo, la URL no llega a Actividad antes de 10 s → para sin otra navegación", frame: following({ route: HOME, reached: false, elapsed: REVEAL_SAFETY_MS }), step: { kind: "stop", reason: "arrived" } },
  { state: "siguiendo, ya en Actividad y la lista no trae el id en 10 s → para sin una segunda navegación", frame: following({ route: ACTIVITY, reached: true, lists: [list("2026-11", ["me"], ["a"])], elapsed: REVEAL_SAFETY_MS }), step: { kind: "stop", reason: "arrived" } },
  // «No robar la navegación»: la persona empezó a navegar y su página aún carga (la URL no cambió todavía).
  { state: "la persona hace clic en un enlace mientras E5 espera (la página nueva aún carga) → termina sin navegar", frame: frame({ leaving: true, lists: [list("2026-11", ["me"])], elapsed: REVEAL_SAFETY_MS }), step: { kind: "stop", reason: "navigated" } },
  { state: "la persona hace clic en un enlace con la lista que ya trae el id al cuadro 3 → termina sin navegar", frame: frame({ leaving: true, lists: [list("2026-11", ["me"], [ID])], settled: SETTLE_FRAMES - 1 }), step: { kind: "stop", reason: "navigated" } },
  { state: "siguiendo, la persona hace clic en un enlace antes de que llegue la URL → termina", frame: following({ route: HOME, reached: false, leaving: true }), step: { kind: "stop", reason: "navigated" } },
];

describe("E5 · tabla de estados", () => {
  it.each(TABLE)("$state", ({ frame: input, step }) => {
    expect(revealStep(input)).toEqual(step);
  });

  it("los cuadros de asentamiento solo cuentan con una lista que ya trae el id: un árbol sin él no los adelanta", () => {
    let settled = 0;
    for (let index = 0; index < 50; index++) {
      const step = revealStep(frame({ lists: [list("2026-11", ["me"], ["previo"])], elapsed: index * 16, settled }));
      expect(step.kind).toBe("wait");
      if (step.kind === "wait") settled = step.settled;
    }
    expect(settled).toBe(0);
  });
});
