// 004 PR E (T073) / SC-010 (Análisis; T079, laboratorio); COMPONENT_SPECIFICATIONS «Skeleton»: la carga de Análisis con la
// geometría de AnalysisScreen (el selector de mes y los cuatro capítulos, en dos columnas desde 1024), sin cifras.
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { copy } from "@/lib/copy/es";

function Heading() {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton width={72} height={14} />
      <Skeleton width={140} height={26} />
    </div>
  );
}

export function AnalysisSkeleton() {
  return (
    <SkeletonGroup label={copy.analysis.loading} className="flex flex-col gap-8 pt-4 pb-10 lg:gap-12 lg:pt-8">
      <div className="flex items-center gap-2 lg:max-w-[360px]">
        <Skeleton width={44} height={44} radius="var(--radius-md)" />
        <span className="flex flex-1 justify-center"><Skeleton width={150} height={26} /></span>
        <Skeleton width={44} height={44} radius="var(--radius-md)" />
      </div>
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-x-16 lg:gap-y-14">
        <div className="flex flex-col gap-4"><Heading /><Skeleton width={110} height={21} /><Skeleton width="60%" height={40} /></div>
        <div className="flex flex-col gap-4 lg:row-span-2">
          <Heading />
          <div className="flex flex-wrap gap-2">{[0, 1, 2, 3].map((tile) => <Skeleton key={tile} width={tile === 0 ? "100%" : 104} height={80} radius="16px" />)}</div>
        </div>
        <div className="flex flex-col gap-4"><Heading /><Skeleton height={176} /></div>
        <div className="flex flex-col gap-4"><Heading /><Skeleton width="90%" height={24} /><Skeleton height={112} radius="16px" /></div>
      </div>
    </SkeletonGroup>
  );
}
