// T045, T053 / FR-019, FR-030: Actividad con su estado vacío (ícono «Sin movimientos», DESIGN_SYSTEM.md §3; comp 04·6).
import { PageHeader } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/shell/provisional-state";
import { copy } from "@/lib/copy/es";

export default function ActivityPage() {
  return (
    <>
      <PageHeader title={copy.nav.activity} />
      <EmptyState icon="tray" title={copy.empty.activity.title} description={copy.empty.activity.description} />
    </>
  );
}
