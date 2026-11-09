export type BudgetVersion = Readonly<{ effectiveMonth: string; changedAt: string; limitMinor: bigint | null }>;
export type BudgetMonth = Readonly<{ limitMinor: bigint | null; consumedMinor: bigint }>;
export function budgetState(consumed: bigint, limit: bigint | null): "none" | "within" | "near" | "over" {
  if (limit === null) return "none";
  if (limit <= 0n || consumed < 0n) throw new RangeError("invalidBudget");
  return consumed > limit ? "over" : consumed * 100n >= limit * 85n ? "near" : "within";
}
export function displayedPercent(consumed: bigint, limit: bigint | null): number | null {
  if (limit === null) return null;
  budgetState(consumed, limit);
  return Number(consumed * 100n / limit);
}
export function limitInForce(versions: readonly BudgetVersion[], month: string): bigint | null {
  return versions.filter(v => v.effectiveMonth <= month)
    .sort((a,b) => b.effectiveMonth.localeCompare(a.effectiveMonth) || b.changedAt.localeCompare(a.changedAt))[0]?.limitMinor ?? null;
}
/** 004 PR B / FR-018: qué fue cada cambio del historial de un presupuesto. */
export type BudgetChangeKind = "create" | "raise" | "lower" | "keep" | "deactivate" | "reactivate";
/**
 * El tipo de un cambio a partir del límite anterior del mismo presupuesto (`previous_limit_minor`, `null` al crearlo o tras
 * desactivarlo), el nuevo (`null` = desactivado) y si es su primera versión. Comparación exacta en unidades menores.
 */
export function budgetChangeKind(previous: bigint | null, limit: bigint | null, first: boolean): BudgetChangeKind {
  if (limit === null) return "deactivate";
  if (previous === null) return first ? "create" : "reactivate";
  return limit > previous ? "raise" : limit < previous ? "lower" : "keep";
}
