"use client";
// T056 / FR-031, FR-031a; data-model.md «AnnotateNoticeState»; caso límite «Cambio de ancho con el aviso abierto».
// Anotar abre un aviso sin campos (maestro §15.10, «Anotar») en el contenedor real: hoja por debajo de 768 px y
// diálogo de 520 px desde 768 px. Se abre también con `N` fuera de los campos de texto.
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Rendimiento (auditoría de Impeccable, 4 de noviembre de 2026): el diálogo, Radix y su animación no viajan con cada
// ruta. Se precargan cuando el navegador queda libre y se montan con la primera apertura; desde ahí siguen montados
// para conservar la animación de salida y el retorno del foco.
const loadNotice = () => import("./annotate-notice-dialog");
const AnnotateNotice = lazy(loadNotice);

// `N` escribe la letra en cualquier campo editable; solo fuera de ellos abre el aviso.
function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest("[contenteditable]:not([contenteditable='false'])")) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

type AnnotateState = { open: boolean; openFrom: (trigger: HTMLElement | null) => void };

const AnnotateContext = createContext<AnnotateState | null>(null);

export function AnnotateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const openRef = useRef(false);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const openFrom = useCallback((trigger: HTMLElement | null) => {
    if (openRef.current) return; // un solo aviso a la vez
    returnFocusTo.current = trigger;
    openRef.current = true;
    setMounted(true);
    setOpen(true);
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    openRef.current = next;
    setOpen(next);
  }, []);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 1));
    idle(() => void loadNotice());
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "n" && event.key !== "N") return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.defaultPrevented) return;
      if (openRef.current || isEditable(event.target)) return;
      event.preventDefault();
      openFrom(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openFrom]);

  const state = useMemo(() => ({ open, openFrom }), [open, openFrom]);
  return (
    <AnnotateContext.Provider value={state}>
      {children}
      {mounted ? (
        <Suspense fallback={null}>
          <AnnotateNotice open={open} onOpenChange={onOpenChange} returnFocusTo={returnFocusTo} />
        </Suspense>
      ) : null}
    </AnnotateContext.Provider>
  );
}

export function useAnnotate() {
  const state = useContext(AnnotateContext);
  if (!state) throw new Error("Anotar necesita AnnotateProvider");
  return state;
}

