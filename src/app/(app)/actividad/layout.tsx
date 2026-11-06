// T068 / FR-047, FR-048; research R8.7. Lista o tabla de Actividad y su detalle comparten la búsqueda y los filtros: al
// abrir o cerrar el detalle en el panel de escritorio (04·7) no se pierden.
import type { ReactNode } from "react";
import { ActivityFiltersProvider } from "@/features/activity/activity-filters";

export default function ActivityLayout({ children }: { children: ReactNode }) {
  return <ActivityFiltersProvider>{children}</ActivityFiltersProvider>;
}
