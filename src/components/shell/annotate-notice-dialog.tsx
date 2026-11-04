"use client";
// T056 / FR-031, FR-031a: el contenedor real del aviso de Anotar, hoja por debajo de 768 px y diálogo de 520 px
// desde 768 px. Lo carga AnnotateProvider bajo demanda (annotate-notice.tsx).
import { useCallback, useSyncExternalStore } from "react";
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

type AnnotateNoticeProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusTo: { current: HTMLElement | null };
};

export default function AnnotateNotice({ open, onOpenChange, returnFocusTo }: AnnotateNoticeProps) {
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
