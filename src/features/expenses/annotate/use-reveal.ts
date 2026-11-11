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

/**
 * El inicio de una navegación de la persona dentro de la app: un clic primario, sin teclas modificadoras, en un enlace interno
 * que no abre otra pestaña ni descarga, y que va a otra página (un ancla de la misma página, como «Ir al contenido», no cuenta).
 * Se mira en captura, antes de que Next cancele el clic para hacer su navegación de cliente.
 */
export function startsNavigation(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
  if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return false;
  const next = new URL(link.href, window.location.href);
  if (next.origin !== window.location.origin) return false;
  return next.pathname + next.search !== window.location.pathname + window.location.search || next.hash === "";
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
    let unfiltered = false;
    let reached = false;
    let leaving = false;
    let handle = 0;
    // «No robar la navegación»: la persona empezó a navegar aunque la URL todavía no haya cambiado.
    const onClick = (event: MouseEvent) => { if (startsNavigation(event)) leaving = true; };
    const onPopState = () => { leaving = true; };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    const started = performance.now();
    const frame = () => {
      const row = shownRow(target.id);
      const route = currentRoute();
      reached ||= route === target.route;
      const step = revealStep({ target, page: hooks.current.page(), route, lists: registry.snapshot(), shown: row !== null, elapsed: performance.now() - started, settled, unfiltered, reached, leaving });
      switch (step.kind) {
        case "wait":
          settled = step.settled;
          handle = requestAnimationFrame(frame);
          return;
        case "unfilter":
          // #54: la lista quita solo los filtros que lo excluyen; se vuelve a contar desde cero para darle tiempo a pintarse.
          unfiltered = true;
          settled = 0;
          registry.unhide(step.list, target.id);
          handle = requestAnimationFrame(frame);
          return;
        case "highlight":
          row?.scrollIntoView?.({ block: "nearest" });
          if (target.context !== step.context) hooks.current.onHighlight(target.id, step.context);
          setTarget(null);
          return;
        case "toActivity": {
          const destination = `/actividad?mes=${step.month}`;
          // Se sigue mirando en Actividad del mes, por si un filtro que se conserva entre meses (tipo, búsqueda) lo oculta (#54).
          setTarget({ ...target, route: destination, follow: true });
          hooks.current.onActivity(step.month);
          return;
        }
        case "stop":
          setTarget(null);
      }
    };
    handle = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(handle);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [target, registry]);

  /** `route`: la ruta en la que estaba la persona al enviar (la creación privada se envía con la hoja ya oculta). */
  return useCallback((next: Omit<RevealTarget, "route" | "follow">, route: string = currentRoute()) => setTarget({ ...next, route }), []);
}
