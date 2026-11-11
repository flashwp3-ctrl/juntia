// T067 / FR-042, FR-049: carga de Actividad con el Skeleton de su geometría (mes, búsqueda, resumen y filas).
// F74-2 (revisión del PR #74): el Skeleton cuenta como lista en carga de su mes para E5 (ActivityLoadingScope).
import { PageHeader } from "@/components/shell/app-shell";
import { ActivityLoadingScope } from "@/features/activity/activity-loading-scope";
import { ActivitySkeleton } from "@/features/home/home-skeleton";
import { copy } from "@/lib/copy/es";

export default function ActivityLoading() {
  return (
    <>
      <PageHeader title={copy.nav.activity} />
      <ActivitySkeleton />
      <ActivityLoadingScope />
    </>
  );
}
