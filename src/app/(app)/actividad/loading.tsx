// T067 / FR-042, FR-049: carga de Actividad con el Skeleton de su geometría (mes, búsqueda, resumen y filas).
import { PageHeader } from "@/components/shell/app-shell";
import { ActivitySkeleton } from "@/features/home/home-skeleton";
import { copy } from "@/lib/copy/es";

export default function ActivityLoading() {
  return (
    <>
      <PageHeader title={copy.nav.activity} />
      <ActivitySkeleton />
    </>
  );
}
