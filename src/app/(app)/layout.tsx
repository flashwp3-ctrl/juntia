// T048, T058 / FR-018, FR-022, FR-025, FR-031. Las rutas de producto dentro del AppShell, con el contexto Yo/Nosotros
// compartido y el aviso de Anotar. `#contenido` es el destino de «Ir al contenido».
import type { ReactNode } from "react";
import { AnnotateProvider } from "@/components/shell/annotate-notice";
import { AppShell } from "@/components/shell/app-shell";
import { ContextProvider } from "@/components/shell/context-selector";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ContextProvider>
      <AnnotateProvider>
        <AppShell>
          <main id="contenido">{children}</main>
        </AppShell>
      </AnnotateProvider>
    </ContextProvider>
  );
}
