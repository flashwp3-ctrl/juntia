"use client";
// 004 PR C (T049) / FR-076; MOTION_SYSTEM §4, «Teclado»: Enter abre, Escape cierra, el foco va al título y al cerrar vuelve a
// la tarjeta de origen. La tarjeta de origen se recuerda en memoria del módulo (nunca en el almacenamiento del navegador,
// FR-094): sobrevive a la navegación dentro de la app y se pierde al recargar, como debe.
// Las View Transitions con App Router (§15.6.2 punto 1, [V] T052): React 19.3 anima los `<ViewTransition name>` en las
// navegaciones del router. Sin la API (`document.startViewTransition`), el respaldo es el `layoutId` de Motion.
import { useSyncExternalStore } from "react";

let origin: { goalId: string } | null = null;

export function rememberOrigin(goalId: string) {
  origin = { goalId };
}

/** Al volver a Metas: la tarjeta que hay que enfocar, una sola vez. */
export function takeReturnFocus(): string | null {
  const id = origin?.goalId ?? null;
  origin = null;
  return id;
}

const noop = () => () => {};
/** `true` cuando el navegador tiene View Transitions; en el servidor, `true` (no hay respaldo que preparar). */
export function useViewTransitionsSupported() {
  return useSyncExternalStore(noop, () => typeof document !== "undefined" && "startViewTransition" in document, () => true);
}
