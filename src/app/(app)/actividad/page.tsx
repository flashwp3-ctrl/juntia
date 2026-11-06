// T067 / FR-046–FR-049; US-6. Actividad del mes de `?mes=AAAA-MM` (o el mes en curso en Bogotá), con flechas, búsqueda,
// filtros, lista por día y, desde 1280, la tabla con el panel. Sustituye el estado vacío provisional de la 001.
import { ActivityScreen } from "@/features/activity/activity-screen";
import { loadMonth, monthParam, today } from "@/features/activity/load";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const now = today();
  const month = monthParam((await searchParams).mes, now);
  const data = await loadMonth(month, now, `/actividad?mes=${month}`);
  return <ActivityScreen data={data} month={month} today={now} />;
}
