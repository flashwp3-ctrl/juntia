// T061 (spec 003, PR D) / FR-047; SC-010 (D); COMPONENT_SPECIFICATIONS.md §Skeleton: la carga de Balance con la geometría
// final (badge, titular, importe, las dos filas con barras de 28 px y las acciones), sin cifras. Sin CLS.
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { copy } from "@/lib/copy/es";

export function BalanceSkeleton() {
  return (
    <SkeletonGroup label={copy.balance.loading} className="flex flex-col gap-9 pt-4 lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-12 lg:pt-8">
      <div className="flex flex-col gap-4">
        <Skeleton width={110} height={24} radius={8} />
        <Skeleton width="72%" height={29} />
        <Skeleton width={200} height={40} />
        <Skeleton width="85%" height={19} />
        <div className="flex flex-col gap-4 rounded-[var(--radius-xl)] bg-raised px-4 py-[18px]">
          {[0, 1].map((row) => (
            <div key={row} className="flex flex-col gap-2">
              <Skeleton width="55%" height={24} />
              <Skeleton height={28} radius={10} />
              <Skeleton width="65%" height={15} />
            </div>
          ))}
        </div>
        <div className="flex gap-2"><Skeleton height={52} radius={18} /><Skeleton width={110} height={52} radius={18} /></div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton width="50%" height={26} />
        {[0, 1, 2, 3].map((row) => <Skeleton key={row} height={44} />)}
      </div>
    </SkeletonGroup>
  );
}
