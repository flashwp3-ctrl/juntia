"use client";
// T066 / FR-043; US-5.3 (Q5). Nosotros, en todos los destinos, enseña «todavía no disponible» sin ninguna cifra ni dato
// privado; Yo enseña la pantalla real. Antes de hidratar se pintan las dos y CSS deja ver solo la del contexto recordado
// (<html data-context>, que fija el script de tema; globals.css). Al hidratar se monta solo la elegida: los movimientos
// privados nunca se renderizan en Nosotros (handoff, «Reglas de negocio de la UI»).
import type { ReactNode } from "react";
import { useContextChoice } from "@/components/shell/context-selector";
import { UnavailableState } from "@/components/shell/provisional-state";
import { copy } from "@/lib/copy/es";

export function ContextView({ me, us }: { me: ReactNode; us?: ReactNode }) {
  const { value, hydrated } = useContextChoice();
  const unavailable = us ?? <UnavailableState icon="users-three" title={copy.us.title} description={copy.us.description} />;
  return (
    <>
      {!hydrated || value === "me" ? <div key="me" data-context-view="me">{me}</div> : null}
      {!hydrated || value === "us" ? <div key="us" data-context-view="us">{unavailable}</div> : null}
    </>
  );
}
