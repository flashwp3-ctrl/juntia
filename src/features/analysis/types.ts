// 004 PR E (T073; FR-021–FR-024, FR-063; contracts/server-actions.md §4). Lo que Análisis recibe del servidor. Los importes
// viajan como texto de dígitos (unidades menores; FR-005, ADR-013 §4) y el cliente los convierte a `bigint` solo para
// formatearlos y dibujar: nunca recalcula una métrica (FR-063). Análisis solo lee; no tiene escrituras.
import type { CategoryId } from "@/domain/transactions";

export type AnalysisContext = "me" | "us";

/** Las cinco métricas DEC-G04 del mes en el contexto (`metric_months`), tal como las calcula el servidor. */
export type AnalysisMetrics = {
  spentMinor: string;
  contributedMinor: string;
  withdrawnMinor: string;
  fundedMinor: string;
  /** `total_destinado_neto`: solo para la PlanningNote; nunca héroe ni «Total gastado» (DEC-G04). Puede ser negativo. */
  netMinor: string;
};

/** Una categoría del mes (`budget_months`): lo consumido y, si había un presupuesto vigente, su límite (`null` no es 0). */
export type AnalysisCategory = { categoryId: CategoryId; consumedMinor: string; limitMinor: string | null };

/** Q10, calculada en el dominio (`monthComparison`): solo existe si el mes anterior tiene gastos en el contexto. */
export type AnalysisComparison = { previousMonth: string; differenceMinor: string; percent: number; categories: CategoryId[] };

/** Un mes con gasto para el capítulo 3 (`AAAA-MM`). */
export type AnalysisMonth = { month: string; spentMinor: string };

/** Lo que aportó cada integrante a metas compartidas en el mes (solo Nosotros). */
export type AnalysisContributor = { name: string; amountMinor: string };

export type AnalysisData = {
  context: AnalysisContext;
  /** `AAAA-MM`. */
  month: string;
  /** Hoy en Bogotá (`AAAA-MM-DD`). */
  today: string;
  navigation: { previous: string | null; next: string | null };
  /** `null`: el mes no tiene ninguna métrica en este contexto (ni gasto ni movimientos de metas). */
  metrics: AnalysisMetrics | null;
  categories: AnalysisCategory[];
  comparison: AnalysisComparison | null;
  /** Hasta seis meses con gasto, del más antiguo al seleccionado; nunca meses sin datos (Q10). */
  history: AnalysisMonth[];
  /** Nosotros: el desglose por persona de `aporte_a_metas`; `null` en Yo o si no se pudo leer de forma consistente. */
  contributors: AnalysisContributor[] | null;
};
