// T067 / FR-046–FR-049; US-6. Actividad del mes de `?mes=AAAA-MM` (o el mes en curso en Bogotá), con flechas, búsqueda,
// filtros, lista por día y, desde 1280, la tabla con el panel. Sustituye el estado vacío provisional de la 001.
// F44-1: en Nosotros no se lee nada. F44-4: un mes fuera del intervalo navegable redirige al límite más cercano.
import { redirect } from "next/navigation";
import { ActivityScreen } from "@/features/activity/activity-screen";
import { loadMonth, monthParam, today } from "@/features/activity/load";
import { serverContext } from "@/lib/server-context";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [context, query] = await Promise.all([serverContext(), searchParams]);
  const now = today();
  const month = monthParam(query.mes, now);
  const data = context === "me" ? await loadMonth(month, now, `/actividad?mes=${month}`) : null;
  if (data?.ok && data.value.month !== query.mes && typeof query.mes === "string") redirect(`/actividad?mes=${data.value.month}`);
  return <ActivityScreen server={context} data={data} today={now} />;
}
