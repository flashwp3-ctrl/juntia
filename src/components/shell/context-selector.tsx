"use client";
// T046 / FR-025, FR-026, FR-027; research R5; COMPONENT_SPECIFICATIONS.md §Tabs / Segmented.
// Un estado compartido por todas las instancias del selector y una única región viva para el anuncio.
// Sin Context Transition (decisión 10; Clarifications Q2): solo se desliza la perilla del Segmented.
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Segmented } from "@/components/ui/segmented";
import { copy } from "@/lib/copy/es";
import {
  readStoredContext,
  serverStoredContext,
  subscribeStoredContext,
  writeStoredContext,
  type ContextChoice,
} from "@/lib/context-preference";

type ContextState = { value: ContextChoice; choose: (next: ContextChoice) => void; hydrated: boolean };

const ContextChoiceContext = createContext<ContextState | null>(null);

const noop = () => () => {};

export function ContextProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(subscribeStoredContext, readStoredContext, serverStoredContext);
  // La elección de la visita. Si no se pudo guardar, prevalece sobre lo almacenado: lo que se ve, aria-checked y el
  // anuncio dicen siempre lo mismo (F19-2, revisión del PR #19).
  const [visit, setVisit] = useState<{ value: ContextChoice; saved: boolean } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const value = visit && !visit.saved ? visit.value : (stored ?? visit?.value ?? "me");

  const choose = useCallback(
    (next: ContextChoice) => {
      if (next === value) return;
      setVisit({ value: next, saved: writeStoredContext(next) });
      setAnnouncement(copy.context.announce(next === "us" ? copy.context.us : copy.context.me));
    },
    [value],
  );

  const state = useMemo(() => ({ value, choose, hydrated }), [value, choose, hydrated]);
  return (
    <ContextChoiceContext.Provider value={state}>
      {children}
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </ContextChoiceContext.Provider>
  );
}

export function useContextChoice() {
  const state = useContext(ContextChoiceContext);
  if (!state) throw new Error("ContextSelector necesita ContextProvider");
  return state;
}

/** PR C de la 003: el contexto de la app donde no siempre hay ContextProvider (pruebas de componentes, superficie interna). */
export function useOptionalContextChoice() {
  return useContext(ContextChoiceContext);
}

const options = [
  { value: "me", label: copy.context.me },
  { value: "us", label: copy.context.us },
] as const;

type ContextSelectorProps = { stretch?: boolean; className?: string };

export function ContextSelector({ stretch = false, className = "" }: ContextSelectorProps) {
  const { value, choose, hydrated } = useContextChoice();
  return (
    // Antes de hidratar, React pinta «Yo» (instantánea del servidor) y la perilla visible sale de <html data-context>
    // por CSS (globals.css, research R5). Al hidratar, el Segmented se vuelve a montar con la clave nueva: la perilla
    // aparece ya en su sitio, sin deslizarse al cargar.
    <div data-context-selector="" data-hydrated={hydrated ? "" : undefined} className={className}>
      <Segmented
        key={hydrated ? "client" : "server"}
        role="radiogroup"
        label={copy.context.label}
        options={options}
        value={value}
        onValueChange={choose}
        stretch={stretch}
        fixedWidth
      />
    </div>
  );
}
