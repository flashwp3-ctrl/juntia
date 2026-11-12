// 004 PR D (T061) / FR-051, FR-090; Q16; COMPONENT_SPECIFICATIONS.md §FundingLedger. El estado de FundingLedger, puro: la
// propuesta y la validación que bloquea Guardar. La interfaz solo muestra; el servidor recalcula y la función SQL vuelve a
// validar (FR-090). Los importes de la hoja son pesos enteros (`number`, como el monto de Anotar); las cuentas, en `bigint`.
// F20 (auditoría de Impeccable; propuesta aprobada por los fundadores el 11 de noviembre de 2026; antes, Q16 opción i,
// proporcional a lo disponible, que daba cifras como $160.676): «Tus fondos» empieza en TU PARTE DEL REPARTO del gasto
// (50/50 de $300.000 → $150.000) y el otro aportante pone el resto; sin reparto (Yo, o un aportante solo), lo proporcional
// redondeado a mil. Nunca por encima de lo disponible de nadie: lo que no cabe en uno pasa al otro. Solo es la propuesta: la
// persona puede cambiarla y el servidor valida lo que se envía.
// F77-3 (revisión del PR #77): la regla, la misma en los tres modos del reparto (igual, porcentaje y montos fijos): el uso se
// reparte en proporción a lo ASIGNADO a cada integrante en el reparto del gasto (en montos fijos, esos montos; en igual y
// porcentaje, las partes que ya calculó el dominio), en pesos enteros con mayor residuo y desempate por orden de ingreso
// (`proposeFunding`, ADR-002). Con un uso igual al gasto, cada uno pone exactamente su parte. Después, los topes de disponible.
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

/** F20/F77-3: lo asignado a cada integrante en el reparto del gasto, en pesos, con su orden de ingreso. `null` sin reparto. */
export type SplitShares = { userId: string; joinOrder: number; pesos: bigint }[] | null;

const pesosOf = (minor: string) => BigInt(minor) / 100n;
const min = (a: bigint, b: bigint) => (a < b ? a : b);
/** A mil pesos, la mitad hacia arriba. */
const toThousand = (pesos: bigint) => ((pesos + 500n) / 1000n) * 1000n;

/**
 * La propuesta de fondos (F20). Con reparto, tu parte del uso; sin él, lo proporcional a lo disponible redondeado a mil; con
 * un solo aportante, todo el uso. Cada parte con su tope en lo disponible; si el uso supera lo disponible de todos, nada.
 */
export function proposeFunds(contributors: readonly Contributor[], usagePesos: number | null, shares: SplitShares = null): Funds {
  const empty = Object.fromEntries(contributors.map(({ userId }) => [userId, null]));
  if (!usagePesos || usagePesos <= 0 || contributors.length === 0) return empty;
  const usage = BigInt(usagePesos);
  const total = contributors.reduce((sum, { availableMinor }) => sum + pesosOf(availableMinor), 0n);
  if (usage > total) return empty;
  const me = contributors.find(({ isMe }) => isMe);
  const others = contributors.filter(({ isMe }) => !isMe);
  if (contributors.length > 2 || others.length > 1) return proportional(contributors, usagePesos, empty);
  const other = others[0];
  const myAvailable = me ? pesosOf(me.availableMinor) : 0n;
  const fromSplit = me && other ? myPartOfUsage(shares, me.userId, usage) : null;
  const target = !me ? 0n
    : !other ? usage
    : fromSplit !== null ? fromSplit
    : toThousand((usage * myAvailable) / total);
  let mine = min(min(target, myAvailable), usage);
  let theirs = usage - mine;
  const theirAvailable = other ? pesosOf(other.availableMinor) : 0n;
  if (theirs > theirAvailable) { mine += theirs - theirAvailable; theirs = theirAvailable; }
  if (mine > myAvailable) return empty;
  return { ...empty, ...(me ? { [me.userId]: Number(mine) } : {}), ...(other ? { [other.userId]: Number(theirs) } : {}) };
}

/** F77-3: tu parte del uso según el reparto (mayor residuo por `proposeFunding`), o `null` si el reparto no sirve (uso > gasto). */
function myPartOfUsage(shares: SplitShares, myUserId: string, usage: bigint): bigint | null {
  const weights = (shares ?? []).filter(({ pesos }) => pesos > 0n);
  if (weights.length === 0) return null;
  try {
    const parts = proposeFunding(weights.map(({ userId, joinOrder, pesos }) => ({ userId, joinOrder, amountMinor: pesos * 100n })), usage * 100n);
    return (parts.find(({ userId }) => userId === myUserId)?.amountMinor ?? 0n) / 100n;
  } catch {
    return null;
  }
}

/** Más de dos aportantes (no ocurre en P0, que valida dos integrantes): lo proporcional con mayor residuo (ADR-002). */
function proportional(contributors: readonly Contributor[], usagePesos: number, empty: Funds): Funds {
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
  if (expensePesos !== null && BigInt(usagePesos) > BigInt(expensePesos)) return { kind: "exceedsExpense" };
  for (const contributor of contributors) {
    const value = funds[contributor.userId] ?? 0;
    if (minorOf(value) > BigInt(contributor.availableMinor)) return { kind: "exceedsAvailable", userId: contributor.userId, availableMinor: contributor.availableMinor };
  }
  // Las cuentas, en bigint (revisión del gestor del PR #69, 9); a `number` solo los pesos que se muestran (≤ 99.999.999).
  const usage = BigInt(usagePesos);
  const sum = contributors.reduce((total, { userId }) => total + BigInt(funds[userId] ?? 0), 0n);
  if (sum < usage) return { kind: "missing", pesos: Number(usage - sum) };
  if (sum > usage) return { kind: "over", pesos: Number(sum - usage) };
  const own = contributors.filter(({ isMe }) => isMe).reduce((total, { userId }) => total + BigInt(funds[userId] ?? 0), 0n);
  return { kind: "ok", ownPesos: Number(own), requestedPesos: Number(sum - own) };
}
