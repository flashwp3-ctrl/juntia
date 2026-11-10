// 004 PR D (T061) / FR-051, FR-090; Q16; COMPONENT_SPECIFICATIONS.md §FundingLedger. El estado de FundingLedger, puro: la
// propuesta (proporcional a lo disponible, en pesos enteros con mayor residuo; `proposeFunding` del dominio, ADR-002) y la
// validación que bloquea Guardar. La interfaz solo muestra; el servidor recalcula y la función SQL vuelve a validar
// (FR-090). Los importes de la hoja son pesos enteros (`number`, como el monto de Anotar); las cuentas, en `bigint`.
import { proposeFunding } from "@/domain/goals";
import type { Contributor } from "./types";

export type Funds = Record<string, number | null>;

export type FundingStatus =
  | { kind: "ok"; ownPesos: number; requestedPesos: number }
  /** Sin uso escrito (o 0): no se puede registrar con la meta. */
  | { kind: "noUsage" }
  | { kind: "exceedsExpense" }
  | { kind: "exceedsAvailable"; userId: string; availableMinor: string }
  | { kind: "missing"; pesos: number }
  | { kind: "over"; pesos: number };

const minorOf = (pesos: number) => BigInt(pesos) * 100n;

/** Propuesta proporcional a lo disponible (Q16, opción i). Si el uso supera lo disponible de todos, no propone nada. */
export function proposeFunds(contributors: readonly Contributor[], usagePesos: number | null): Funds {
  const empty = Object.fromEntries(contributors.map(({ userId }) => [userId, null]));
  if (!usagePesos || usagePesos <= 0 || contributors.length === 0) return empty;
  try {
    const parts = proposeFunding(contributors.map(({ userId, joinOrder, availableMinor }) => ({ userId, joinOrder, amountMinor: BigInt(availableMinor) })), minorOf(usagePesos));
    return Object.fromEntries(parts.map(({ userId, amountMinor }) => [userId, Number(amountMinor / 100n)]));
  } catch {
    return empty;
  }
}

/** Lo que dice el pie de FundingLedger y si Guardar se habilita. Orden: uso, tope del gasto, topes por aportante y suma. */
export function evaluateFunding({ expensePesos, usagePesos, funds, contributors }: { expensePesos: number | null; usagePesos: number | null; funds: Funds; contributors: readonly Contributor[] }): FundingStatus {
  if (!usagePesos || usagePesos <= 0) return { kind: "noUsage" };
  if (expensePesos !== null && usagePesos > expensePesos) return { kind: "exceedsExpense" };
  for (const contributor of contributors) {
    const value = funds[contributor.userId] ?? 0;
    if (minorOf(value) > BigInt(contributor.availableMinor)) return { kind: "exceedsAvailable", userId: contributor.userId, availableMinor: contributor.availableMinor };
  }
  const sum = contributors.reduce((total, { userId }) => total + (funds[userId] ?? 0), 0);
  if (sum < usagePesos) return { kind: "missing", pesos: usagePesos - sum };
  if (sum > usagePesos) return { kind: "over", pesos: sum - usagePesos };
  const own = contributors.filter(({ isMe }) => isMe).reduce((total, { userId }) => total + (funds[userId] ?? 0), 0);
  return { kind: "ok", ownPesos: own, requestedPesos: sum - own };
}
