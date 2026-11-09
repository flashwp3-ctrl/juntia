// T067 / FR-046–FR-049; US-6. Actividad del mes de `?mes=AAAA-MM` (o el mes en curso en Bogotá), con flechas, búsqueda,
// filtros, lista por día y, desde 1280, la tabla con el panel. Sustituye el estado vacío provisional de la 001.
// F44-1: en Nosotros no se lee nada privado. F44-4: un mes fuera del intervalo navegable redirige al límite más cercano.
// PR C de la 003 (T049; FR-037, FR-038, FR-046): en Nosotros con la pareja activa, los gastos compartidos y las liquidaciones
// del mes por cursor, con las flechas de `couple_transaction_months`.
import { redirect } from "next/navigation";
import { ActivityScreen } from "@/features/activity/activity-screen";
import { loadMonth, monthParam, today } from "@/features/activity/load";
import { activeCouple, loadCoupleMonth } from "@/features/couple/shared-load";
import { serverContext } from "@/lib/server-context";
import { goalPeople, loadGoalActivity } from "@/features/goals/load";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [context, query] = await Promise.all([serverContext(), searchParams]);
  const now = today();
  const month = monthParam(query.mes, now);
  const volver = `/actividad?mes=${month}`;
  const data = context === "me" ? await loadMonth(month, now, volver) : null;
  if (data?.ok && data.value.month !== query.mes && typeof query.mes === "string") redirect(`/actividad?mes=${data.value.month}`);
  const members = context === "us" ? await activeCouple() : null;
  const coupleData = members ? await loadCoupleMonth(month, now, volver) : null;
  if (coupleData?.ok && coupleData.value.month !== query.mes && typeof query.mes === "string") redirect(`/actividad?mes=${coupleData.value.month}`);
  // 004 PR C (T050; FR-044, FR-071): los asientos de metas del mes que se enseña, del mismo contexto (en Nosotros, solo de
  // metas compartidas). Un fallo de esa lectura no tumba Actividad: los movimientos se ven sin los asientos.
  const shownMonth = data?.ok ? data.value.month : coupleData?.ok ? coupleData.value.month : null;
  const goalsContext = context === "me" ? "me" : members ? "us" : null;
  const [goals, people] = goalsContext && shownMonth ? await Promise.all([loadGoalActivity(goalsContext, shownMonth, volver), goalPeople()]) : [null, []];
  return <ActivityScreen server={context} data={data} today={now} couple={members && coupleData ? { data: coupleData, members } : null} goals={goals?.ok ? goals.value : null} goalPeople={people} />;
}
