// 004 PR E (T073, T075) / FR-021–FR-025, FR-085; US-3; Q5: Análisis (S3), ruta hija de Plan con el mes en la URL
// (`?mes=AAAA-MM`, como Actividad). Sin destino de navegación nuevo: Plan sigue marcado en la barra y en la sidebar.
// El contexto lo decide la cookie (F44-1): sin ella o con una no válida, el servidor no lee nada y pinta el Skeleton hasta que
// el cliente resuelve la preferencia. En Nosotros, la pareja activa se comprueba antes de leer nada del grupo y solo se pide
// lo de Nosotros (FR-085); sin pareja, «todavía no disponible». Un mes fuera del intervalo con datos lleva al límite más
// cercano. Un fallo de lectura muestra el error con Reintentar.
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/app-shell";
import { monthParam, today } from "@/features/activity/load";
import { AnalysisScreen } from "@/features/analysis/analysis-screen";
import { AnalysisSkeleton } from "@/features/analysis/analysis-skeleton";
import { loadAnalysis } from "@/features/analysis/load";
import { ContextView } from "@/features/context/context-view";
import { LoadError } from "@/features/context/load-error";
import { UsUnavailable } from "@/features/context/us-unavailable";
import { activeCouple } from "@/features/couple/shared-load";
import { copy } from "@/lib/copy/es";
import { serverContext } from "@/lib/server-context";

export const metadata = { title: copy.analysis.title };

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [context, query] = await Promise.all([serverContext(), searchParams]);
  const now = today();
  const month = monthParam(query.mes, now);
  let me = null;
  let us = undefined;
  if (context === "me") {
    const data = await loadAnalysis("me", month, now, []);
    if (data.ok && typeof query.mes === "string" && data.value.month !== query.mes) redirect(`/plan/analisis?mes=${data.value.month}`);
    me = data.ok ? <AnalysisScreen data={data.value} /> : <LoadError />;
  }
  if (context === "us") {
    const members = await activeCouple();
    if (!members) us = <UsUnavailable />;
    else {
      const data = await loadAnalysis("us", month, now, members.map(({ userId, name }) => ({ userId, name })));
      if (data.ok && typeof query.mes === "string" && data.value.month !== query.mes) redirect(`/plan/analisis?mes=${data.value.month}`);
      us = data.ok ? <AnalysisScreen data={data.value} /> : <LoadError />;
    }
  }
  return (
    <>
      <PageHeader title={copy.analysis.title} variant="back" backHref="/plan" />
      <ContextView server={context} pending={<AnalysisSkeleton />} me={me} us={us} />
    </>
  );
}
