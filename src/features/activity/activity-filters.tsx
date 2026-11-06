"use client";
// T067 / FR-047. Búsqueda y filtros de Actividad, en cliente sobre las filas del mes (research R8.9). Viven en el layout
// de /actividad para que abrir y cerrar el detalle en el panel de escritorio no los borre. Al cambiar de mes se
// conserva el texto y el tipo; la categoría vuelve a «todas», porque puede no existir en el mes nuevo.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CategoryId, TransactionType } from "@/domain/transactions";

export type ActivityFilters = { query: string; type: TransactionType | "all"; categoryId: CategoryId | null };
type State = ActivityFilters & {
  month: string | null;
  setQuery: (query: string) => void;
  setType: (type: ActivityFilters["type"]) => void;
  setCategory: (categoryId: CategoryId | null, month: string) => void;
  clear: () => void;
};

const Context = createContext<State | null>(null);
const initial: ActivityFilters & { month: string | null } = { query: "", type: "all", categoryId: null, month: null };

function useFilterState(): State {
  const [state, setState] = useState(initial);
  return useMemo(() => ({
    ...state,
    setQuery: (query) => setState((previous) => ({ ...previous, query })),
    setType: (type) => setState((previous) => ({ ...previous, type })),
    setCategory: (categoryId, month) => setState((previous) => ({ ...previous, categoryId, month })),
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
