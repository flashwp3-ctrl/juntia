// La hoja de Anotar como máquina pura (T081, T082; FR-031a, FR-036, FR-062). Una sola hoja a la vez. Cada apertura es una
// sesión con su modo, su clave de idempotencia (nace al abrir y se reusa en cada reintento) y el contexto de la app en ese
// momento, que la hoja usa como inicial de su propio selector y que no cambia si el de la app cambia con la hoja abierta.
// Fases: cerrada; abierta; oculta, mientras la creación privada viaja con su fila «Guardando…» (UX lote 1, cambio 3). La hoja
// oculta sigue ocupada y montada, con lo escrito y su clave: si el servidor rechaza o el resultado se desconoce, vuelve.
import type { ContextChoice } from "@/lib/context-preference";
import type { SavedTransaction } from "../types";
import type { SavedShared } from "../shared-types";

export type SheetMode = { kind: "create" } | { kind: "edit"; transaction: SavedTransaction; onReload: () => void }
  | { kind: "editShared"; expense: SavedShared; onReload: () => void };

export type SheetState = {
  phase: "closed" | "open" | "hidden";
  /** La hoja se monta con la primera apertura y desde ahí sigue montada (animación de salida y retorno del foco). */
  mounted: boolean;
  mode: SheetMode;
  key: string;
  context: ContextChoice;
};

export type SheetEvent =
  | { type: "open"; mode: SheetMode; key: string; context: ContextChoice }
  /** La creación privada se envía: la hoja se oculta y sigue ocupada. */
  | { type: "hide" }
  /** Rechazo o resultado desconocido de esa creación: la hoja vuelve, con lo escrito y la misma clave. */
  | { type: "restore" }
  | { type: "close" };

export const initialSheet: SheetState = { phase: "closed", mounted: false, mode: { kind: "create" }, key: "", context: "me" };

export function reduceSheet(state: SheetState, event: SheetEvent): SheetState {
  switch (event.type) {
    case "open":
      // Una sola hoja a la vez: ni una segunda apertura ni `N` con la hoja abierta u oculta.
      return state.phase === "closed" ? { phase: "open", mounted: true, mode: event.mode, key: event.key, context: event.context } : state;
    case "hide":
      return state.phase === "open" ? { ...state, phase: "hidden" } : state;
    case "restore":
      return state.mounted && state.phase !== "open" ? { ...state, phase: "open" } : state;
    case "close":
      return state.phase === "closed" ? state : { ...state, phase: "closed" };
  }
}

/** Ocupada: abierta u oculta con una creación en vuelo. */
export const isBusy = (state: SheetState) => state.phase !== "closed";
