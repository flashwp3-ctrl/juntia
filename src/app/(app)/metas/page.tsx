// T045, T053 / FR-019, FR-030: Metas con su estado vacío, sin «Crear meta» (comp 04·6 sin su botón).
// P0-1, PR C (FR-043): en Nosotros, «todavía no disponible» como en Inicio y Actividad (Q5).
import { PageHeader } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/shell/provisional-state";
import { ContextView } from "@/features/context/context-view";
import { copy } from "@/lib/copy/es";
import { serverContext } from "@/lib/server-context";

export default async function GoalsPage() {
  const context = await serverContext();
  return (
    <>
      <PageHeader title={copy.nav.goals} />
      <ContextView server={context} me={<EmptyState icon="flag-banner" title={copy.empty.goals.title} description={copy.empty.goals.description} />} />
    </>
  );
}
