// T045, T053 / FR-019, FR-030; DEC-R01: Plan sin «Crear presupuesto» y sin sugerir que el presupuesto sea obligatorio.
import { PageHeader } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/shell/provisional-state";
import { copy } from "@/lib/copy/es";

export default function PlanPage() {
  return (
    <>
      <PageHeader title={copy.nav.plan} />
      <EmptyState icon="chart-pie-slice" title={copy.empty.plan.title} description={copy.empty.plan.description} />
    </>
  );
}
