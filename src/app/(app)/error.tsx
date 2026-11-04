"use client";
// T059 / FR-028; caso límite «Ruta inexistente o error de render»: estado de error dentro del AppShell (lo pone el
// layout de (app)), con el aviso de versión base, Reintentar y salida hacia Inicio. Nunca el mensaje técnico crudo
// (docs/CONVENTIONS.md B.1).
import Link from "next/link";
import { PageHeader } from "@/components/shell/app-shell";
import { exitLinkClass } from "@/components/shell/exit-link";
import { ExitState } from "@/components/shell/provisional-state";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/es";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <PageHeader />
      <ExitState
        danger
        icon="warning-circle"
        headingLevel={1}
        title={copy.states.error}
        description={copy.states.errorDescription}
        actions={
          <>
            <Button variant="secondary" onClick={() => reset()}>{copy.states.retry}</Button>
            <Link href="/" className={exitLinkClass}>{copy.states.home}</Link>
          </>
        }
      />
    </>
  );
}
