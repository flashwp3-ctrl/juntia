"use client";
// PR #117 (autorizado por los fundadores el 27 nov 2026, «opcion 1»; maestro, decisión 30): al cerrar el detalle de Actividad
// (la × del panel o de la columna, o «Volver» por debajo de 1280), el enlace pulsado desaparece y el foco caía en `body`. Al
// pasar de `/actividad/{id}` a `/actividad`, el foco vuelve a la fila de ese movimiento (gasto, gasto compartido o
// liquidación, por su id) con el anillo visible. Si la fila ya no está (otro filtro, un movimiento eliminado), va al título de
// Actividad, nunca a `body`. Solo actúa si nadie tiene el foco: no se lo quita a nada ni cambia la navegación.
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { copy } from "@/lib/copy/es";

const DETAIL = /^\/actividad\/([^/]+)$/;
// La lista del mes llega del servidor tras la navegación. Mientras se VE su Skeleton («Cargando movimientos»), se espera sin
// decidir (hasta 15 s desde el cierre, por si la carga no termina); cuando deja de verse, hasta 2 s más a la fila antes de ir al
// título. Ronda 3 (F117-8): si vuelve a verse una carga, la cuenta de esos 2 s empieza de nuevo al terminar; un Skeleton oculto no
// cuenta; y el foco solo se da por puesto si el destino es de verdad `document.activeElement`.
const LOADING_MAX_MS = 15_000;
const SETTLE_MS = 2000;

const visible = (node: Element) => node.getClientRects().length > 0;
const loading = () => [...document.querySelectorAll<HTMLElement>('main [aria-busy="true"]')].some((node) => visible(node) && (node.textContent ?? "").includes(copy.activity.loading));
const unfocused = () => !document.activeElement || document.activeElement === document.body || document.activeElement === document.documentElement;

export function ReturnFocusToRow() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  useEffect(() => {
    const from = DETAIL.exec(previous.current ?? "");
    previous.current = pathname;
    if (!from || pathname !== "/actividad") return;
    const id = CSS.escape(decodeURIComponent(from[1]));
    const started = performance.now();
    let loadedAt: number | null = null;
    let frame = 0;
    const place = (target: HTMLElement) => {
      target.focus({ focusVisible: true } as FocusOptions);
      return document.activeElement === target;
    };
    const attempt = () => {
      if (!unfocused()) return;
      const now = performance.now();
      const row = [...document.querySelectorAll<HTMLElement>(`main a[data-transaction-id="${id}"], main a[data-settlement-id="${id}"]`)]
        .find((node) => visible(node) && !node.closest("aside"));
      if (row && place(row)) return;
      if (loading()) {
        loadedAt = null;
        if (now - started < LOADING_MAX_MS) {
          frame = requestAnimationFrame(attempt);
          return;
        }
      }
      loadedAt ??= now;
      if (now - loadedAt < SETTLE_MS) {
        frame = requestAnimationFrame(attempt);
        return;
      }
      const heading = [...document.querySelectorAll<HTMLElement>("main h1")].find(visible);
      if (heading) {
        if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
        place(heading);
      }
    };
    frame = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}
