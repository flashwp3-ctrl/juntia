// T045, T053 / FR-019, FR-030: Inicio con su estado vacío diseñado; ningún dato de ejemplo (decisión 9).
import { PageHeader } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/shell/provisional-state";
import { copy } from "@/lib/copy/es";

export default function HomePage() {
  return (
    <>
      <PageHeader title={copy.nav.home} />
      <EmptyState icon="house-simple" title={copy.empty.home.title} description={copy.empty.home.description} />
    </>
  );
}
