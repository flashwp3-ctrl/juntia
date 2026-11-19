// 004 PR C (T049) / FR-037, FR-075–FR-077, FR-085; US-4.5; MOTION_SYSTEM §4. La meta inmersiva es una ruta propia (nunca un
// diálogo). En Nosotros solo existe una meta compartida: el id de una personal ahí no se lee ni se pinta (FR-085). En Yo,
// las personales y las compartidas de su pareja. Inexistente, de otro contexto o de otra persona: «No encontramos esta meta».
import Link from "next/link";
import { exitLinkClass } from "@/components/shell/exit-link";
import { StableLabel } from "@/components/ui/stable-label";
import { ExitState } from "@/components/shell/provisional-state";
import { ContextView } from "@/features/context/context-view";
import { LoadError } from "@/features/context/load-error";
import { UsUnavailable } from "@/features/context/us-unavailable";
import { activeCouple } from "@/features/couple/shared-load";
import { today } from "@/features/activity/load";
import { goalActions } from "@/features/goals/goal-actions";
import { GoalImmersive } from "@/features/goals/goal-immersive";
import { GoalSkeleton } from "@/features/goals/goals-skeleton";
import { goalPeople, loadGoalDetail } from "@/features/goals/load";
import { copy } from "@/lib/copy/es";
import { serverContext } from "@/lib/server-context";

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, serverContext()]);
  const now = today();
  const members = context === "us" ? await activeCouple() : null;
  const readable = context === "me" || (context === "us" && members);
  const people = readable ? await goalPeople() : [];
  const loaded = readable ? await loadGoalDetail(id, context, people, `/metas/${id}`) : null;
  const view = !loaded ? null : !loaded.ok ? <LoadError /> : loaded.value ? (
    <GoalImmersive goal={loaded.value.goal} members={loaded.value.members} entries={loaded.value.entries} people={people} today={now} context={context!} actions={goalActions} requests={loaded.value.requests} />
  ) : (
    <ExitState icon="flag-banner" headingLevel={1} title={copy.goals.immersive.notFound.title} description={copy.goals.immersive.notFound.description}
      actions={<Link href="/metas" className={exitLinkClass}><StableLabel text={copy.goals.immersive.back} /></Link>} />
  );
  return <ContextView server={context} pending={<GoalSkeleton />} me={context === "me" ? view : null} us={context !== "us" ? undefined : !members ? <UsUnavailable /> : view} />;
}
