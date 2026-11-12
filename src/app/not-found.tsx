// T059 / FR-028; casos límite «Ruta inexistente o error de render» y «Rutas de Mi cuenta que todavía no existen».
// Fuera del grupo (app): monta él mismo el contexto, Anotar y el AppShell (research R6). Es también lo que ve una visita
// a /interno/primitivos cerrada. Con el aviso de versión base y salida hacia Inicio; sin mensaje técnico.
// F21 (auditoría Impeccable, nov 2026): «no encontrado» no es una advertencia, así que usa la brújula (`compass`) y no
// `warning`. Con sesión, carga la cuenta como el layout de (app), para que el sidebar conserve el avatar y el nombre. Sin
// sesión, o si la lectura falla, se queda con el acceso mínimo: una ruta inexistente nunca debe romper.
import Link from "next/link";
import type { ReactNode } from "react";
import { createTransactionAction, privateWriteStatusAction, updateTransactionAction, voidTransactionAction } from "@/features/expenses/actions";
import { AnnotateProvider } from "@/features/expenses/annotate-provider";
import { AccountProvider } from "@/features/account/account-context";
import { loadAccount } from "@/features/account/load-account";
import { loadCoupleForShell, partnerOf, personOf } from "@/features/couple/load";

const actions = { create: createTransactionAction, update: updateTransactionAction, voidTransaction: voidTransactionAction, check: privateWriteStatusAction };
import { AppShell, PageHeader } from "@/components/shell/app-shell";
import { ContextProvider } from "@/components/shell/context-selector";
import { ExitState } from "@/components/shell/provisional-state";
import { copy } from "@/lib/copy/es";
import { exitLinkClass } from "@/components/shell/exit-link";

async function withAccount(children: ReactNode) {
  try {
    const account = await loadAccount();
    if (!account) return children;
    const couple = await loadCoupleForShell();
    return (
      <AccountProvider displayName={account.profile.displayName} theme={account.profile.theme} person={personOf(couple)} partnerName={partnerOf(couple)} couple={couple?.status ?? null}>
        {children}
      </AccountProvider>
    );
  } catch {
    return children;
  }
}

export default async function NotFound() {
  return withAccount(
    <ContextProvider>
      <AnnotateProvider actions={actions}>
        <AppShell>
          <main id="contenido">
            <PageHeader />
            <ExitState
              icon="compass"
              headingLevel={1}
              title={copy.states.notFound}
              description={copy.states.notFoundDescription}
              actions={<Link href="/" className={exitLinkClass}>{copy.states.home}</Link>}
            />
          </main>
        </AppShell>
      </AnnotateProvider>
    </ContextProvider>,
  );
}
