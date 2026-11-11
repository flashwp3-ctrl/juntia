"use client";
// T067 / FR-047. Búsqueda y filtros de Actividad, en cliente sobre las filas del mes (research R8.9). Viven en el layout
// de /actividad para que abrir y cerrar el detalle en el panel de escritorio no los borre. Al cambiar de mes se
// conserva el texto y el tipo; la categoría vuelve a «todas», porque puede no existir en el mes nuevo.
// #54 (F51-14; decisión del fundador del 11 nov 2026, opción A): cuando E5 revela un movimiento recién guardado que un filtro
// oculta, se quitan solo los filtros que lo excluyen (`reveal`). La navegación ordinaria los conserva como siempre.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { matchesSearch, type CategoryId, type TransactionType } from "@/domain/transactions";

/** 004 PR C (FR-071): `goals` es el filtro «Aportes», que deja solo los asientos de metas. */
export type ActivityFilters = { query: string; type: TransactionType | "all" | "goals"; categoryId: CategoryId | null };
export type FilterKind = "type" | "category" | "query";
type State = ActivityFilters & {
  month: string | null;
  setQuery: (query: string) => void;
  setType: (type: ActivityFilters["type"]) => void;
  setCategory: (categoryId: CategoryId | null, month: string) => void;
  /** #54: quita solo estos filtros, en un paso. */
  reveal: (kinds: readonly FilterKind[]) => void;
  clear: () => void;
};

/** #54: los filtros que dejan fuera este movimiento (tipo, categoría o búsqueda), con los filtros ya normalizados por la vista. */
export function excludingFilters(row: { type: TransactionType; categoryId: CategoryId; description: string | null }, filters: ActivityFilters): FilterKind[] {
  const kinds: FilterKind[] = [];
  if (filters.type === "goals" || (filters.type !== "all" && filters.type !== row.type)) kinds.push("type");
  if (filters.categoryId !== null && filters.categoryId !== row.categoryId) kinds.push("category");
  if (!matchesSearch(row.description, filters.query)) kinds.push("query");
  return kinds;
}

const Context = createContext<State | null>(null);
const initial: ActivityFilters & { month: string | null } = { query: "", type: "all", categoryId: null, month: null };

function useFilterState(): State {
  const [state, setState] = useState(initial);
  return useMemo(() => ({
    ...state,
    setQuery: (query) => setState((previous) => ({ ...previous, query })),
    setType: (type) => setState((previous) => ({ ...previous, type })),
    setCategory: (categoryId, month) => setState((previous) => ({ ...previous, categoryId, month })),
    reveal: (kinds) => setState((previous) => ({
      ...previous,
      ...(kinds.includes("type") ? { type: "all" as const } : {}),
      ...(kinds.includes("category") ? { categoryId: null } : {}),
      ...(kinds.includes("query") ? { query: "" } : {}),
    })),
    clear: () => setState(initial),
  }), [state]);
}

export function ActivityFiltersProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={useFilterState()}>{children}</Context.Provider>;
}

/** Los filtros del layout; sin él (pruebas de componentes), un estado local equivalente. */
export function useActivityFilters(month: string): State {
  const shared = useContext(Context);
  const local = useFilterState();
  const state = shared ?? local;
  // La categoría elegida en otro mes no se aplica a este.
  return state.month === month || state.categoryId === null ? state : { ...state, categoryId: null };
}
