"use client";
// T056 / FR-031, FR-031a; data-model.md «AnnotateNoticeState»; caso límite «Cambio de ancho con el aviso abierto».
// Anotar abre un aviso sin campos (maestro §15.10, «Anotar») en el contenedor real: hoja por debajo de 768 px y
// diálogo de 520 px desde 768 px. Se abre también con `N` fuera de los campos de texto.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Modal } from "@/components/ui/modal";
import { copy } from "@/lib/copy/es";

const WIDE = "(min-width: 768px)";

function subscribeWide(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(WIDE);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}
const readWide = () => typeof window.matchMedia === "function" && window.matchMedia(WIDE).matches;

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
  const openRef = useRef(false);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const openFrom = useCallback((trigger: HTMLElement | null) => {
    if (openRef.current) return; // un solo aviso a la vez
    returnFocusTo.current = trigger;
    openRef.current = true;
    setOpen(true);
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    openRef.current = next;
    setOpen(next);
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
      <AnnotateNotice open={open} onOpenChange={onOpenChange} returnFocusTo={returnFocusTo} />
    </AnnotateContext.Provider>
  );
}

export function useAnnotate() {
  const state = useContext(AnnotateContext);
  if (!state) throw new Error("Anotar necesita AnnotateProvider");
  return state;
}

type AnnotateNoticeProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusTo: { current: HTMLElement | null };
};

export function AnnotateNotice({ open, onOpenChange, returnFocusTo }: AnnotateNoticeProps) {
  const wide = useSyncExternalStore(subscribeWide, readWide, () => false);
  // El foco vuelve al disparador (o a lo enfocado antes de `N`), también si el contenedor cambió con el aviso abierto.
  // Si cruza 768 px, el contenedor saliente devuelve el foco aquí y el entrante lo vuelve a llevar dentro.
  const onCloseAutoFocus = useCallback(
    (event: Event) => {
      const target = returnFocusTo.current;
      if (target && target.isConnected && target !== document.body) {
        event.preventDefault();
        target.focus();
      }
    },
    [returnFocusTo],
  );
  const props = {
    open,
    onOpenChange,
    title: copy.annotate.title,
    description: copy.annotate.description,
    closeLabel: copy.annotate.close,
    onCloseAutoFocus,
  };
  return wide ? <Modal {...props} /> : <BottomSheet {...props} />;
}
