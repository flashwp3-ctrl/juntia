// T048, T049 (spec 003, PR C) / FR-046; 04·1 y 04·7. Textos de una fila o un detalle compartido, sin React y sin «use client»:
// los usan componentes de servidor (el detalle) y de cliente (las filas).
import { copy } from "@/lib/copy/es";
import type { SharedTransaction } from "@/lib/db/types";

export type MemberRef = { userId: string; name: string; joinOrder: 1 | 2; isMe: boolean };

export const memberName = (members: readonly MemberRef[], userId: string) => members.find((member) => member.userId === userId)?.name ?? "";

/** El reparto de una fila: «50/50», «55/45», «Importe» o «100 %» con un solo participante (04·1, 04·7). */
export function rowMode(row: Pick<SharedTransaction, "splitMode" | "splitPercents" | "allocations">) {
  const positive = row.allocations.filter((part) => part.amount.amountMinor > 0n);
  if (positive.length === 1) return "100 %";
  if (row.splitMode === "equal") return copy.shared.mode.equal;
  if (row.splitMode === "percent" && row.splitPercents) return copy.shared.mode.percentOf(row.splitPercents);
  return copy.shared.mode.amount;
}
