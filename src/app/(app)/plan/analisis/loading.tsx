// 004 PR E (T073) / SC-010 (Análisis): la carga de Análisis con la geometría final, sin cifras (CLS = 0; T079, laboratorio).
import { PageHeader } from "@/components/shell/app-shell";
import { AnalysisSkeleton } from "@/features/analysis/analysis-skeleton";
import { copy } from "@/lib/copy/es";

export default function AnalysisLoading() {
  return (
    <>
      <PageHeader title={copy.analysis.title} variant="back" backHref="/plan" />
      <AnalysisSkeleton />
    </>
  );
}
