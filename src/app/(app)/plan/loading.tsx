// 004 PR B (T033) / SC-010 (Plan): la carga de Plan con la geometría final, sin cifras (CLS = 0; T040, laboratorio).
import { PageHeader } from "@/components/shell/app-shell";
import { PlanSkeleton } from "@/features/plan/plan-skeleton";
import { copy } from "@/lib/copy/es";

export default function PlanLoading() {
  return (
    <>
      <PageHeader title={copy.nav.plan} />
      <PlanSkeleton />
    </>
  );
}
