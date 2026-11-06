"use client";
// T066 / FR-042; US-5.5; COMPONENT_SPECIFICATIONS.md §Skeleton (02·1): la geometría de Inicio en Yo (héroe, Anotar en
// móvil, filas de 60 con ficha de 40, desglose), con `aria-busy` y «Cargando movimientos». Aparece pasados 300 ms y es
// estático con movimiento reducido. El encabezado es el real (HomeHeader): no se mueve al llegar los datos.
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { copy } from "@/lib/copy/es";

export function RowsSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col">
      {[...Array(count).keys()].map((index) => (
        <div key={index} className="grid min-h-[60px] grid-cols-[40px_minmax(0,1fr)_72px] items-center gap-3 py-2.5">
          <Skeleton width={40} height={40} radius="32%" />
          <div className="flex flex-col gap-1.5"><Skeleton width="62%" height={14} /><Skeleton width="38%" height={11} /></div>
          <Skeleton height={14} />
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <SkeletonGroup label={copy.home.loading} className="flex flex-col gap-6 pt-5 lg:gap-10 lg:pt-8">
      <div className="flex flex-col gap-1.5 lg:gap-2.5">
        <Skeleton width={260} height={19} className="hidden lg:block" />
        <Skeleton width="58%" height={28} className="lg:!h-10 lg:!w-[420px]" />
        <Skeleton width="48%" height={40} className="lg:!h-[52px] lg:!w-[300px]" />
      </div>
      <Skeleton height={76} radius="var(--radius-xl)" className="lg:hidden" />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-10">
        <div className="flex flex-col gap-3 lg:order-2"><Skeleton width={150} height={24} /><Skeleton height={154} radius={16} /></div>
        <div className="flex flex-col gap-1 lg:order-1"><Skeleton width={180} height={24} /><RowsSkeleton count={5} /></div>
      </div>
    </SkeletonGroup>
  );
}

export function ActivitySkeleton() {
  return (
    <SkeletonGroup label={copy.activity.loading} className="flex flex-col gap-4 pt-5 lg:gap-5 lg:pt-8">
      <div className="flex items-center gap-2"><Skeleton width={44} height={44} radius="var(--radius-md)" /><Skeleton width={152} height={24} /><Skeleton width={44} height={44} radius="var(--radius-md)" /></div>
      <Skeleton height={48} radius="var(--radius-md)" />
      <Skeleton height={124} radius="var(--radius-xl)" />
      <div className="flex flex-col gap-1.5"><Skeleton width={90} height={14} /><RowsSkeleton count={6} /></div>
    </SkeletonGroup>
  );
}
