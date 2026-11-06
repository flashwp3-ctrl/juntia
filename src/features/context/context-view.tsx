"use client";
// T066 / FR-043; US-5.3 (Q5). Nosotros, en todos los destinos, enseña «todavía no disponible» sin ninguna cifra ni dato
// privado; Yo enseña la pantalla real. F44-1 (revisión del PR #44): el servidor pinta solo el contexto de la cookie
// `juntia_context` (`server`) y, en Nosotros, la página ni siquiera lee los movimientos (`me` llega vacío).
// - Antes de hidratar, si el servidor pintó Yo, el estado de Nosotros va al lado y CSS enseña solo el del contexto
//   recordado (<html data-context>, globals.css): sin cookie y con Nosotros en localStorage no se ve nada privado.
// - Al hidratar se monta solo el elegido. Si la elección del dispositivo no coincide con lo que pintó el servidor
//   (cookie ausente, borrada o de otra pestaña), se reescribe la cookie y se pide la página otra vez; mientras tanto,
//   Yo enseña `pending` (su Skeleton), nunca datos de otra respuesta.
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useContextChoice } from "@/components/shell/context-selector";
import { UnavailableState } from "@/components/shell/provisional-state";
import { copy } from "@/lib/copy/es";
import { writeContextCookie, type ContextChoice } from "@/lib/context-preference";

type ContextViewProps = { me: ReactNode; server: ContextChoice; pending?: ReactNode; us?: ReactNode };

export function ContextView({ me, server, pending = null, us }: ContextViewProps) {
  const { value, hydrated } = useContextChoice();
  const router = useRouter();
  const asked = useRef<ContextChoice | null>(null);
  useEffect(() => {
    if (!hydrated || value === server || asked.current === value) return;
    asked.current = value;
    writeContextCookie(value);
    router.refresh();
  }, [hydrated, value, server, router]);
  const unavailable = us ?? <UnavailableState icon="users-three" title={copy.us.title} description={copy.us.description} />;
  if (!hydrated) {
    if (server === "us") return <div key="us">{unavailable}</div>;
    return (
      <>
        <div key="me" data-context-view="me">{me}</div>
        <div key="us-css" data-context-view="us">{unavailable}</div>
      </>
    );
  }
  if (value === "us") return <div key="us">{unavailable}</div>;
  return <div key="me" data-context-view="me">{server === "me" ? me : pending}</div>;
}
