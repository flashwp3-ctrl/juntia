// 004 PR C (T045) / SC-010: carga de Metas con el Skeleton de la geometría final (CLS = 0, maestro §15.7).
// Revisión del PR #68 (T052, decisión del gestor, opción b): la lista vive en el grupo de rutas `(lista)` para que este
// límite de carga cubra solo `/metas`. Así `/metas/[id]` no suspende en el Skeleton de la lista: la navegación desde la
// tarjeta espera a la meta y se pinta en un solo commit, que es lo que necesita la View Transition de Goal Journey.
import { PageHeader } from "@/components/shell/app-shell";
import { GoalsSkeleton } from "@/features/goals/goals-skeleton";
import { copy } from "@/lib/copy/es";

export default function GoalsLoading() {
  return (
    <>
      <PageHeader title={copy.nav.goals} />
      <GoalsSkeleton />
    </>
  );
}
