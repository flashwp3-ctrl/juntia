"use client";
// Revisión del PR #74 (F74-2), como F69-7 en ContextView: mientras Actividad enseña su Skeleton (loading.tsx), la página se
// registra como lista en carga de su mes (`?mes=`) y del contexto de la app, todavía sin ids. Así E5, que acaba de llevar a la
// persona a Actividad del mes, sabe que la lista real puede traer el gasto (y un filtro que lo oculte, #54) y espera.
import { useSearchParams } from "next/navigation";
import { useOptionalContextChoice } from "@/components/shell/context-selector";
import { useListScope } from "@/features/expenses/annotate-provider";
import type { ContextChoice } from "@/lib/context-preference";

const NO_IDS: readonly string[] = [];
const ONLY: Record<ContextChoice, readonly ContextChoice[]> = { me: ["me"], us: ["us"] };

function PendingList({ month, context }: { month: string; context: ContextChoice }) {
  useListScope(month, NO_IDS, ONLY[context]);
  return null;
}

/** No pinta nada. Sin `?mes=` válido no registra nada: E5 siempre lleva a Actividad con el mes. */
export function ActivityLoadingScope() {
  const month = useSearchParams().get("mes");
  const context = useOptionalContextChoice()?.value ?? "me";
  return month && /^\d{4}-\d{2}$/.test(month) ? <PendingList month={month} context={context} /> : null;
}
