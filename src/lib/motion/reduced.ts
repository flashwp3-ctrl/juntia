"use client";
// PR D de la 003 (T063, T064) / FR-050, FR-051; MOTION_SYSTEM.md, «Reglas técnicas»: prefers-reduced-motion leído del
// navegador con useSyncExternalStore. A diferencia de `useReducedMotion` de Motion, que guarda la preferencia una sola vez
// para toda la página, este hook la vuelve a leer en cada suscripción: S1, S4 y el contador la consultan al decidir si
// animan, y las pruebas de componentes pueden fijarla por caso.
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(QUERY);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}
const read = () => typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;

/** `true` con movimiento reducido. En el servidor, `false`: nada anima en la primera pintura de todos modos. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, read, () => false);
}
