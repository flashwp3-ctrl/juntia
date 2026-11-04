// T059 / FR-028; casos límite «Ruta inexistente o error de render» y «Rutas de Mi cuenta que todavía no existen».
// Fuera del grupo (app): monta él mismo el contexto, Anotar y el AppShell (research R6). Es también lo que ve una visita
// a /interno/primitivos cerrada. Con el aviso de versión base y salida hacia Inicio; sin mensaje técnico.
import Link from "next/link";
import { AnnotateProvider } from "@/components/shell/annotate-notice";
import { AppShell, PageHeader } from "@/components/shell/app-shell";
import { ContextProvider } from "@/components/shell/context-selector";
import { ExitState } from "@/components/shell/provisional-state";
import { copy } from "@/lib/copy/es";
import { exitLinkClass } from "@/components/shell/exit-link";

export default function NotFound() {
  return (
    <ContextProvider>
      <AnnotateProvider>
        <AppShell>
          <main id="contenido">
            <PageHeader />
            <ExitState
              icon="warning"
              headingLevel={1}
              title={copy.states.notFound}
              description={copy.states.notFoundDescription}
              actions={<Link href="/" className={exitLinkClass}>{copy.states.home}</Link>}
            />
          </main>
        </AppShell>
      </AnnotateProvider>
    </ContextProvider>
  );
}
