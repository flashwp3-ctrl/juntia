// T048, T058 / FR-018, FR-022, FR-025, FR-031 de la 001. Las rutas de producto dentro del AppShell, con el contexto
// Yo/Nosotros compartido y el aviso de Anotar. `#contenido` es el destino de «Ir al contenido».
// P0-1, PR B (T043, T046, T047 / FR-026, FR-027, FR-050, FR-052): con sesión validada y perfil. proxy.ts ya redirige sin
// sesión; esto es la defensa del propio layout. El perfil alimenta AccountButton, el perfil del sidebar y ThemeSync.
// P0-1, PR D (T081): Anotar es la hoja real, con sus Server Actions, las categorías recientes y el día de hoy en Bogotá.
// PR B de la 003 (T034, T035): el estado de la pareja para el shell (color por orden de ingreso, «con Tomás», Nosotros
// sin pareja) y el retorno a /invitacion cuando este dispositivo guarda una invitación vigente (research R5).
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ContextProvider } from "@/components/shell/context-selector";
import { AccountProvider } from "@/features/account/account-context";
import { loadAccount } from "@/features/account/load-account";
import { InvitationReturn } from "@/features/couple/invitation-return";
import { loadCoupleForShell, partnerOf, personOf } from "@/features/couple/load";
import { createTransactionAction, updateTransactionAction, voidTransactionAction } from "@/features/expenses/actions";
import { AnnotateProvider } from "@/features/expenses/annotate-provider";
import { loadRecentCategories } from "@/features/expenses/load";
import { todayInBogota } from "@/domain/transactions";

const actions = { create: createTransactionAction, update: updateTransactionAction, voidTransaction: voidTransactionAction };

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [account, recentCategories, couple] = await Promise.all([loadAccount(), loadRecentCategories(), loadCoupleForShell()]);
  if (!account) redirect("/entrar");
  if (!account.profile.firstEntryCompleted) redirect("/primera-entrada");
  return (
    <AccountProvider displayName={account.profile.displayName} theme={account.profile.theme} person={personOf(couple)} partnerName={partnerOf(couple)} couple={couple?.status ?? null}>
      <InvitationReturn />
      <ContextProvider>
        <AnnotateProvider actions={actions} recentCategories={recentCategories} today={todayInBogota()}>
          <AppShell>
            <main id="contenido">{children}</main>
          </AppShell>
        </AnnotateProvider>
      </ContextProvider>
    </AccountProvider>
  );
}
