// 004 PR C (T045) / SC-010: carga de Metas con el Skeleton de la geometría final (CLS = 0, maestro §15.7).
import { PageHeader } from "@/components/shell/app-shell";
import { GoalsSkeleton } from "@/features/goals/goals-skeleton";
import { copy } from "@/lib/copy/es";

export default function GoalsLoading() {
  return (
    <>
      <PageHeader title={copy.nav.goals} />
      <GoalsSkeleton />
    </>
  );
}
