// T048, T058 / FR-018, FR-022, FR-025, FR-031 de la 001. Las rutas de producto dentro del AppShell, con el contexto
// Yo/Nosotros compartido y el aviso de Anotar. `#contenido` es el destino de «Ir al contenido».
// P0-1, PR B (T043, T046, T047 / FR-026, FR-027, FR-050, FR-052): con sesión validada y perfil. proxy.ts ya redirige sin
// sesión; esto es la defensa del propio layout. El perfil alimenta AccountButton, el perfil del sidebar y ThemeSync.
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AnnotateProvider } from "@/components/shell/annotate-notice";
import { AppShell } from "@/components/shell/app-shell";
import { ContextProvider } from "@/components/shell/context-selector";
import { AccountProvider } from "@/features/account/account-context";
import { loadAccount } from "@/features/account/load-account";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const account = await loadAccount();
  if (!account) redirect("/entrar");
  if (!account.profile.firstEntryCompleted) redirect("/primera-entrada");
  return (
    <AccountProvider displayName={account.profile.displayName} theme={account.profile.theme}>
      <ContextProvider>
        <AnnotateProvider>
          <AppShell>
            <main id="contenido">{children}</main>
          </AppShell>
        </AnnotateProvider>
      </ContextProvider>
    </AccountProvider>
  );
}
