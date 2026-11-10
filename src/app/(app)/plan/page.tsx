// 004 PR B (T033) / FR-015, FR-020, FR-085–FR-087; US-1, US-2; maestro §15.3: Plan en Yo y en Nosotros. Deja el estado
// provisional de la 001 (FR-048 de la 003). El contexto lo decide la cookie (F44-1): sin ella o con una no válida, el
// servidor no lee nada y pinta el Skeleton hasta que el cliente resuelve la preferencia. En Nosotros, el servidor comprueba
// la pareja activa antes de leer nada del grupo (FR-038 de la 003) y solo pide lo de Nosotros (FR-085); sin pareja,
// «todavía no disponible», como en P0-1. En Yo, solo lo propio. Un fallo de lectura muestra el error con Reintentar.
import { PageHeader } from "@/components/shell/app-shell";
import { loadAccount } from "@/features/account/load-account";
import { today } from "@/features/activity/load";
import { ContextView } from "@/features/context/context-view";
import { LoadError } from "@/features/context/load-error";
import { UsUnavailable } from "@/features/context/us-unavailable";
import { activeCouple } from "@/features/couple/shared-load";
import { checkBudgetWriteAction, createBudgetAction, updateBudgetAction } from "@/features/plan/actions";
import { loadPlan } from "@/features/plan/load";
import { PlanScreen } from "@/features/plan/plan-screen";
import { PlanSkeleton } from "@/features/plan/plan-skeleton";
import type { PlanActions } from "@/features/plan/types";
import { copy } from "@/lib/copy/es";
import { serverContext } from "@/lib/server-context";

export const metadata = { title: `${copy.nav.plan} · ${copy.shell.brand}` };

const actions: PlanActions = { create: createBudgetAction, update: updateBudgetAction, check: checkBudgetWriteAction };

async function meView(now: string) {
  const account = await loadAccount();
  const data = account ? await loadPlan("me", now, new Map([[account.userId, account.profile.displayName]]), account.userId) : { ok: false as const };
  return data.ok ? <PlanScreen data={data.value} actions={actions} /> : <LoadError />;
}

async function usView(now: string) {
  const members = await activeCouple();
  if (!members) return <UsUnavailable />;
  const me = members.find((member) => member.isMe);
  if (!me) return <LoadError />;
  const data = await loadPlan("us", now, new Map(members.map((member) => [member.userId, member.name])), me.userId);
  return data.ok ? <PlanScreen data={data.value} actions={actions} /> : <LoadError />;
}

export default async function PlanPage() {
  const context = await serverContext();
  const now = today();
  const me = context === "me" ? await meView(now) : null;
  const us = context === "us" ? await usView(now) : undefined;
  return (
    <>
      <PageHeader title={copy.nav.plan} />
      <ContextView server={context} pending={<PlanSkeleton />} me={me} us={us} />
    </>
  );
}
