// T061 (spec 003, PR D) / FR-037–FR-041, FR-047; US-5; §15.3: Balance. En móvil se llega desde Inicio en Nosotros («Ver
// balance»); desde 1024 es destino del rail y del sidebar. El contexto lo decide la cookie y, en Nosotros, el servidor
// comprueba además la membresía activa antes de leer nada del grupo (FR-038). En Yo no se lee nada: el balance es de los
// dos y vive en Nosotros. Sin pareja, «todavía no disponible», como en P0-1. `?mes=AAAA-MM` elige el mes del desglose; el
// saldo es acumulado (Q9). Un fallo de lectura muestra el error con Reintentar; la carga, loading.tsx con la geometría final.
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/app-shell";
import { UnavailableState } from "@/components/shell/provisional-state";
import { monthParam, today } from "@/features/activity/load";
import { BalanceScreen } from "@/features/balance/balance-screen";
import { BalanceSkeleton } from "@/features/balance/balance-skeleton";
import { activeCouple, loadBalance } from "@/features/couple/shared-load";
import { ContextView } from "@/features/context/context-view";
import { LoadError } from "@/features/context/load-error";
import { UsUnavailable } from "@/features/context/us-unavailable";
import { copy } from "@/lib/copy/es";
import { serverContext } from "@/lib/server-context";

export const metadata = { title: `${copy.nav.balance} · ${copy.shell.brand}` };

export default async function BalancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [context, query] = await Promise.all([serverContext(), searchParams]);
  const now = today();
  const month = monthParam(query.mes, now);
  const members = context === null ? null : await activeCouple();
  const data = context === "us" && members ? await loadBalance(month, now, `/balance?mes=${month}`) : null;
  if (data?.ok && typeof query.mes === "string" && data.value.month !== query.mes) redirect(`/balance?mes=${data.value.month}`);
  const me = context !== "me" ? null : members
    ? <UnavailableState icon="scales" title={copy.balance.inMe.title} description={copy.balance.inMe.description} />
    : <UnavailableState icon="scales" title={copy.balance.title} description={copy.balance.description} />;
  const us = context !== "us" ? undefined : !members || !data ? <UsUnavailable /> : data.ok ? <BalanceScreen data={data.value} members={members} today={now} /> : <LoadError />;
  return (
    <>
      <PageHeader title={copy.nav.balance} variant="back" />
      <ContextView server={context} pending={<BalanceSkeleton />} me={me} us={us} />
    </>
  );
}
