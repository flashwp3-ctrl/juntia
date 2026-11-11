"use client";
// E5 (F45-2; MOTION_SYSTEM.md §2): resalta la fila nueva «en la misma pantalla». Cada cuadro pregunta a `revealStep` qué
// hacer con lo que la pantalla sabe en ese momento; este hook solo lee esas entradas y aplica la respuesta. El aviso y el
// resaltado viven en el proveedor y siguen ahí si se navega. No cambia el total del mes ni los 5 recientes.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ContextChoice } from "@/lib/context-preference";
import type { ListRegistry } from "./flights";
import { revealStep, type RevealTarget } from "./reveal-machine";

/** Visible para la persona: ni ella ni ningún antepasado con `display: none` (copias ocultas de rutas, `xl:hidden`). */
function isShown(node: HTMLElement) {
  for (let current: HTMLElement | null = node; current; current = current.parentElement) {
    if (current.hidden || getComputedStyle(current).display === "none") return false;
  }
  return true;
}

/** La fila real a la vista (la temporal confirmada lleva `data-temp` y no cuenta). */
function shownRow(id: string) {
  return [...document.querySelectorAll<HTMLElement>(`[data-transaction-id="${id}"]:not([data-temp])`)].find(isShown) ?? null;
}

/** La ruta en la que está la persona, con su consulta (Actividad cambia de mes por `?mes=`). */
export const currentRoute = () => `${window.location.pathname}${window.location.search}`;

type RevealHooks = {
  registry: ListRegistry;
  /** El contexto de la página, leído en cada cuadro. */
  page: () => ContextChoice;
  /** La página lo pinta en otro contexto que el de la escritura (la parte compartida en Inicio de Yo): se resalta en ese. */
  onHighlight: (id: string, context: ContextChoice) => void;
  /** La pantalla no lo enseña: otra revalidación (F51-12: la fila temporal no se retira por el plazo) y Actividad del mes. */
  onActivity: (month: string) => void;
};

export function useReveal({ registry, page, onHighlight, onActivity }: RevealHooks) {
  const [target, setTarget] = useState<RevealTarget | null>(null);
  const hooks = useRef({ page, onHighlight, onActivity });
  useEffect(() => { hooks.current = { page, onHighlight, onActivity }; });

  useEffect(() => {
    if (!target) return;
    let settled = 0;
    let handle = 0;
    const started = performance.now();
    const frame = () => {
      const row = shownRow(target.id);
      const step = revealStep({ target, page: hooks.current.page(), route: currentRoute(), lists: registry.snapshot(), shown: row !== null, elapsed: performance.now() - started, settled });
      switch (step.kind) {
        case "wait":
          settled = step.settled;
          handle = requestAnimationFrame(frame);
          return;
        case "highlight":
          row?.scrollIntoView?.({ block: "nearest" });
          if (target.context !== step.context) hooks.current.onHighlight(target.id, step.context);
          setTarget(null);
          return;
        case "toActivity":
          setTarget(null);
          hooks.current.onActivity(step.month);
          return;
        case "stop":
          setTarget(null);
      }
    };
    handle = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(handle);
  }, [target, registry]);

  /** `route`: la ruta en la que estaba la persona al enviar (la creación privada se envía con la hoja ya oculta). */
  return useCallback((next: Omit<RevealTarget, "route">, route: string = currentRoute()) => setTarget({ ...next, route }), []);
}
