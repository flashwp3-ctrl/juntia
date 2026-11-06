// T045, T053 / FR-019, FR-030; DEC-R01: Plan sin «Crear presupuesto» y sin sugerir que el presupuesto sea obligatorio.
// P0-1, PR C (FR-043): en Nosotros, «todavía no disponible» como en Inicio y Actividad (Q5).
import { PageHeader } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/shell/provisional-state";
import { ContextView } from "@/features/context/context-view";
import { copy } from "@/lib/copy/es";

export default function PlanPage() {
  return (
    <>
      <PageHeader title={copy.nav.plan} />
      <ContextView me={<EmptyState icon="chart-pie-slice" title={copy.empty.plan.title} description={copy.empty.plan.description} />} />
    </>
  );
}
