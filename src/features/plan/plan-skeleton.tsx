// 004 PR B (T033) / SC-010 (Plan); COMPONENT_SPECIFICATIONS.md §Skeleton: la carga de Plan con la geometría de PlanScreen
// (el resumen y la lista de presupuestos con sus barras de 8 px), sin cifras. Las mismas columnas desde 1024.
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { copy } from "@/lib/copy/es";

export function PlanSkeleton() {
  return (
    <SkeletonGroup label={copy.plan.loading} className="flex flex-col gap-7 pt-4 pb-6 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-x-14 lg:pt-8">
      <div className="flex flex-col gap-3">
        <Skeleton width={120} height={14} />
        <Skeleton width="80%" height={31} />
        <Skeleton width="95%" height={42} />
      </div>
      <div className="flex flex-col">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex flex-col gap-1.5 border-b-[length:var(--border-hairline)] border-border py-3">
            <div className="flex items-center justify-between gap-3"><Skeleton width="45%" height={32} /><Skeleton width={120} height={20} /></div>
            <Skeleton height={8} radius={999} />
            <Skeleton width={110} height={15} />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
