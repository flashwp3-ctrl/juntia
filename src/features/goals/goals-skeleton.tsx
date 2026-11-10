"use client";
// 004 PR C (T045) / FR-101; SC-010 (CLS = 0 en Metas, maestro §15.7); COMPONENT_SPECIFICATIONS §Skeleton: la geometría de
// Metas (total, pila con la tarjeta de 228 y sus dos capas, pie con «Ver todas»), con `aria-busy` y «Cargando metas».
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { copy } from "@/lib/copy/es";

export function GoalsSkeleton() {
  return (
    <SkeletonGroup label={copy.goals.loading} className="flex flex-col gap-8 pt-5 pb-6 lg:gap-10 lg:pt-8">
      <div className="flex flex-col gap-1"><Skeleton width={190} height={14} /><Skeleton width={200} height={40} /><Skeleton width={260} height={14} /></div>
      <div className="flex flex-col gap-2">
        <div className="relative lg:h-[244px]">
          <Skeleton height={228} radius={26} className="absolute inset-x-0 top-0 scale-x-[.92] lg:hidden" />
          <Skeleton height={228} radius={26} className="absolute inset-x-0 top-3 scale-x-[.96] lg:hidden" />
          <Skeleton height={228} radius={26} className="relative mt-[72px] lg:mt-0 lg:!w-[min(320px,40%)]" />
        </div>
        <div className="flex min-h-11 items-center justify-between"><Skeleton width={70} height={14} /><Skeleton width={80} height={14} /></div>
      </div>
    </SkeletonGroup>
  );
}

/** La meta inmersiva mientras carga: el fallback a pantalla completa y el panel. */
export function GoalSkeleton() {
  return (
    <SkeletonGroup label={copy.goals.loading} className="-mx-4 flex flex-col sm:-mx-6 lg:mx-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-10 lg:pt-6">
      <Skeleton height={460} radius={0} className="lg:!h-[min(78vh,720px)] lg:!rounded-[38px]" />
      <div className="flex flex-col gap-4 px-5 pt-6"><Skeleton width={120} height={48} /><Skeleton height={16} radius={999} /><Skeleton width="70%" height={14} /><Skeleton height={52} radius="var(--radius-md)" /></div>
    </SkeletonGroup>
  );
}
