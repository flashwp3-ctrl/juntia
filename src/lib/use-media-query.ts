"use client";
// Consulta de medios sin desajuste de hidratación: en el servidor y en el primer render vale `false`.
import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string) {
  const subscribe = useCallback((onChange: () => void) => {
    if (typeof window.matchMedia !== "function") return () => {};
    const list = window.matchMedia(query);
    list.addEventListener?.("change", onChange);
    return () => list.removeEventListener?.("change", onChange);
  }, [query]);
  return useSyncExternalStore(subscribe, () => typeof window.matchMedia === "function" && window.matchMedia(query).matches, () => false);
}
