"use client";
// 004 PR C (T049) / FR-076; MOTION_SYSTEM §4, «Teclado»: Enter abre, Escape cierra, el foco va al título y al cerrar vuelve a
// la tarjeta de origen. La tarjeta de origen se recuerda en memoria del módulo (nunca en el almacenamiento del navegador,
// FR-094): sobrevive a la navegación dentro de la app y se pierde al recargar, como debe.
// Las View Transitions con App Router (§15.6.2 punto 1, [V] T052): React 19.3 anima los `<ViewTransition name>` en las
// navegaciones del router. Sin la API (`document.startViewTransition`), el respaldo es el `layoutId` de Motion.
import { useSyncExternalStore } from "react";

// F80-1 (revisión de ChatGPT del PR #80): el destino de vuelta no es solo la tarjeta de la pila. Toda entrada a una meta en
// Metas (tarjeta o fila de «Archivadas») lleva `data-goal-return` con su id. Si la meta cerrada no está en la pantalla (otro
// contexto, o ya no se lista), el foco va al título de la página, nunca a BODY. Sin teclado, sin anillo (como F04).
type Origin = { goalId: string; keyboard: boolean };
let origin: Origin | null = null;

/** `keyboard`: se cerró con el teclado (Escape, o Enter sobre la ×); entonces el destino sí pinta el anillo. */
export function rememberOrigin(goalId: string, keyboard = false) {
  origin = { goalId, keyboard };
}

/** Al volver a Metas: la meta de la que se vuelve, una sola vez. */
export function takeReturnFocus(): Origin | null {
  const taken = origin;
  origin = null;
  return taken;
}

/** Enfoca el destino de vuelta: la entrada de esa meta (la visible, si hay varias) o, si no está, el título de la página. */
export function restoreReturnFocus(): HTMLElement | null {
  const taken = takeReturnFocus();
  if (!taken) return null;
  const options = taken.keyboard ? {} : { focusVisible: false };
  const entries = [...document.querySelectorAll<HTMLElement>(`[data-goal-return="${taken.goalId}"]`)];
  const entry = entries.find((node) => node.getClientRects().length > 0) ?? entries[0];
  if (entry) {
    entry.focus({ preventScroll: false, ...options });
    return entry;
  }
  const title = document.querySelector<HTMLElement>("main h1") ?? document.querySelector<HTMLElement>("h1");
  if (!title) return null;
  if (!title.hasAttribute("tabindex")) title.tabIndex = -1;
  title.focus({ preventScroll: false, ...options });
  return title;
}

const noop = () => () => {};
/** `true` cuando el navegador tiene View Transitions; en el servidor, `true` (no hay respaldo que preparar). */
export function useViewTransitionsSupported() {
  return useSyncExternalStore(noop, () => typeof document !== "undefined" && "startViewTransition" in document, () => true);
}
