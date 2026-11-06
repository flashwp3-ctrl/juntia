"use client";
// T066 / FR-043; US-5.3 (Q5). Nosotros, en todos los destinos, enseña «todavía no disponible» sin ninguna cifra ni dato
// privado; Yo enseña la pantalla real. F44-1 (revisión del PR #44, dos rondas): el servidor pinta según la cookie
// `juntia_context` (`server`) y solo construye la vista privada (`me`) cuando la cookie dice Yo.
// - `server` es `null` sin cookie o con una no válida: antes de hidratar se pinta `pending` (el Skeleton con la
//   geometría final) y, al lado, el estado de Nosotros; CSS enseña uno según el contexto recordado (<html data-context>,
//   globals.css). Al hidratar, el cliente resuelve la preferencia, escribe la cookie y pide la página otra vez.
// - Si la elección del dispositivo no coincide con lo que pintó el servidor (cookie de otra pestaña, enlace precargado
//   en el otro contexto), se reescribe la cookie y se pide la página otra vez; mientras tanto, Yo enseña `pending`.
//   Nosotros nunca enseña lo que trajo una respuesta de Yo.
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useContextChoice } from "@/components/shell/context-selector";
import { UsUnavailable } from "./us-unavailable";
import { writeContextCookie, type ContextChoice } from "@/lib/context-preference";

type ContextViewProps = { me: ReactNode; server: ContextChoice | null; pending?: ReactNode; us?: ReactNode };

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
  const unavailable = us ?? <UsUnavailable />;
  if (!hydrated) {
    if (server === "us") return <div key="us">{unavailable}</div>;
    return (
      <>
        <div key="me" data-context-view="me">{server === "me" ? me : pending}</div>
        <div key="us-css" data-context-view="us">{unavailable}</div>
      </>
    );
  }
  if (value === "us") return <div key="us">{unavailable}</div>;
  return <div key="me" data-context-view="me">{server === "me" ? me : pending}</div>;
}
