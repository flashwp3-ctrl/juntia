import "server-only";
// 004 PR E (T073, T075) / FR-021–FR-024, FR-063, FR-085; contracts/server-actions.md §4. Lecturas de Análisis con el
// cliente de la petición (vistas `security_invoker`), nunca con la clave secreta (FR-006). Todo con el `context` de la
// pantalla en la consulta, no filtrado después: en Nosotros no se pide nada personal (FR-085).
// - `metric_months` del contexto, todos sus meses en una lectura (la única fuente de las cinco métricas), el capítulo 3
//   y los límites del selector de mes. El cliente no recalcula ninguna métrica (FR-063).
// - `budget_months` del mes y del anterior: el desglose por categoría con su límite vigente, y la comparación (Q10), que
//   calcula el dominio (`monthComparison`).
// - Solo en Nosotros, `goal_activity` del mes: los aportes de cada integrante a metas compartidas. El desglose se suma en el
//   dominio (`aporte_a_metas`) y solo se enseña si cuadra con `aporte_a_metas` de `metric_months`; si no (una escritura entre
//   las dos lecturas), se omite en vez de enseñar dos cifras que no concilian.
import { redirect } from "next/navigation";
import { monthComparison } from "@/domain/analysis";
import { aporte_a_metas } from "@/domain/metrics";
import { shiftMonth, type CategoryId } from "@/domain/transactions";
import { budgetMonths, firstBudgetMonth } from "@/lib/db/budgets";
import { DbError, mapDbError } from "@/lib/db/errors";
import { goalActivity } from "@/lib/db/goals";
import { metricMonths } from "@/lib/db/metrics";
import type { BudgetMonthTransport, MetricMonthTransport } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisContext, AnalysisData } from "./types";

type Loaded<T> = { ok: true; value: T } | { ok: false };
export type AnalysisPerson = { userId: string; name: string };

const HISTORY = 6;
const monthOf = (row: { month: string }) => row.month.slice(0, 7);
const positive = (minor: string) => BigInt(minor) > 0n;
const spending = (rows: readonly BudgetMonthTransport[]) =>
  rows.filter((row) => row.category_id !== "income").map((row) => ({ categoryId: row.category_id, amountMinor: BigInt(row.consumed_minor) }));

/**
 * El primer mes navegable del contexto: el primero con alguna métrica (`metric_months`) o con un límite vigente
 * (`budget_months`), el que llegue antes (revisión F71-1 del PR #71: un mes con presupuesto y sin gastos ni metas se puede
 * ver). Sin ninguno, el mes en curso.
 */
export function firstMonth(metrics: readonly MetricMonthTransport[], budgetMonth: string | null, current: string) {
  return [...metrics.map(monthOf), ...(budgetMonth ? [budgetMonth.slice(0, 7)] : [])].filter((value) => value <= current).sort()[0] ?? current;
}

/** El mes que se puede enseñar: entre el primero navegable y el mes en curso. */
export function clampMonth(month: string, first: string, current: string) {
  return month > current ? current : month < first ? first : month;
}

/**
 * Análisis de `month` (`AAAA-MM`, ya validado) en `context`. `people`: en Nosotros, los dos integrantes activos que el
 * servidor ya comprobó, para nombrar el desglose de lo apartado; en Yo, vacío.
 */
export async function loadAnalysis(context: AnalysisContext, month: string, today: string, people: readonly AnalysisPerson[]): Promise<Loaded<AnalysisData>> {
  const volver = `/plan/analisis?mes=${month}`;
  try {
    const client = await createClient();
    const current = today.slice(0, 7);
    const [all, budgetMonth] = await Promise.all([metricMonths(client, context), firstBudgetMonth(client, context)]);
    const first = firstMonth(all, budgetMonth, current);
    const shown = clampMonth(month, first, current);
    const previous = shiftMonth(shown, -1);
    const [rows, before, entries] = await Promise.all([
      budgetMonths(client, context, `${shown}-01`),
      budgetMonths(client, context, `${previous}-01`),
      context === "us" ? goalActivity(client, "us", `${shown}-01`) : Promise.resolve([]),
    ]);
    const row = all.find((item) => monthOf(item) === shown);
    const metrics = row ? {
      spentMinor: row.gasto_consumo, contributedMinor: row.aporte_a_metas, withdrawnMinor: row.retiro_de_metas,
      fundedMinor: row.gasto_financiado_con_meta, netMinor: row.total_destinado_neto,
    } : null;
    const comparison = monthComparison(spending(rows), spending(before));
    const history = all.filter((item) => monthOf(item) <= shown && positive(item.gasto_consumo))
      .sort((a, b) => monthOf(a).localeCompare(monthOf(b))).slice(-HISTORY)
      .map((item) => ({ month: monthOf(item), spentMinor: item.gasto_consumo }));

    let contributors: AnalysisData["contributors"] = null;
    if (context === "us" && metrics) {
      const dated = entries.map((entry) => ({ kind: entry.kind === "contribution" ? "contribution" as const : "withdrawal" as const, amountMinor: BigInt(entry.amount_minor), date: entry.effective_date, voided: entry.voided || entry.kind === "usage", member: entry.member_user_id }));
      const parts = people.map((person) => ({ name: person.name, amountMinor: aporte_a_metas(dated.filter((entry) => entry.member === person.userId), shown) }));
      const sum = parts.reduce((total, part) => total + part.amountMinor, 0n);
      contributors = sum === BigInt(metrics.contributedMinor) ? parts.filter((part) => part.amountMinor > 0n).map((part) => ({ name: part.name, amountMinor: part.amountMinor.toString() })) : null;
    }

    return {
      ok: true,
      value: {
        context, month: shown, today,
        navigation: { previous: shown > first ? previous : null, next: shown < current ? shiftMonth(shown, 1) : null },
        metrics,
        categories: rows.filter((item) => item.category_id !== "income" && (positive(item.consumed_minor) || item.limit_minor !== null))
          .map((item) => ({ categoryId: item.category_id as CategoryId, consumedMinor: item.consumed_minor, limitMinor: item.limit_minor })),
        comparison: comparison ? { previousMonth: previous, differenceMinor: comparison.differenceMinor.toString(), percent: comparison.percent, categories: comparison.categories as CategoryId[] } : null,
        history,
        contributors,
      },
    };
  } catch (error) {
    if ((error instanceof DbError ? error : mapDbError(error)).kind === "notAuthenticated") redirect(`/entrar?volver=${encodeURIComponent(volver)}`);
    return { ok: false };
  }
}
