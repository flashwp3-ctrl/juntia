// 004 PR C (T045) / FR-035, FR-036, FR-085–FR-087; US-4; Q11; 04·3, 04·6. Metas en Yo y en Nosotros, que sustituye el estado
// vacío provisional de la 001. F44-1 y FR-085: el servidor pinta según la cookie de contexto y solo lee lo de ese contexto;
// en Nosotros, con la pareja activa comprobada antes de leer, únicamente metas compartidas (`goal_scope = 'shared'`), y
// sin cookie o con una no válida no lee nada (Skeleton). Sin pareja activa, Nosotros sigue «todavía no disponible».
import { PageHeader } from "@/components/shell/app-shell";
import { ContextView } from "@/features/context/context-view";
import { LoadError } from "@/features/context/load-error";
import { UsUnavailable } from "@/features/context/us-unavailable";
import { activeCouple } from "@/features/couple/shared-load";
import { today } from "@/features/activity/load";
import { goalActions } from "@/features/goals/goal-actions";
import { GoalsScreen } from "@/features/goals/goals-screen";
import { GoalsSkeleton } from "@/features/goals/goals-skeleton";
import { goalPeople, loadGoalsScreen } from "@/features/goals/load";
import { copy } from "@/lib/copy/es";
import { serverContext } from "@/lib/server-context";

export default async function GoalsPage() {
  const context = await serverContext();
  const now = today();
  const members = context === "us" ? await activeCouple() : null;
  const people = context === null || (context === "us" && !members) ? [] : await goalPeople();
  const data = context === "me" ? await loadGoalsScreen("me", people, "/metas") : context === "us" && members ? await loadGoalsScreen("us", people, "/metas") : null;
  const view = data ? (data.ok ? <GoalsScreen data={data.value} people={people} today={now} actions={goalActions} /> : <LoadError />) : null;
  return (
    <>
      <PageHeader title={copy.nav.goals} />
      <ContextView server={context} pending={<GoalsSkeleton />} me={context === "me" ? view : null} us={context !== "us" ? undefined : !members ? <UsUnavailable /> : view} />
    </>
  );
}
