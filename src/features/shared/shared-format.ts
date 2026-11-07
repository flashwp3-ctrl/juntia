// T048, T049 (spec 003, PR C) / FR-046; 04·1 y 04·7. Textos de una fila o un detalle compartido, sin React y sin «use client»:
// los usan componentes de servidor (el detalle) y de cliente (las filas).
import { copy } from "@/lib/copy/es";
import type { SharedTransaction } from "@/lib/db/types";

export type MemberRef = { userId: string; name: string; joinOrder: 1 | 2; isMe: boolean };

export const memberName = (members: readonly MemberRef[], userId: string) => members.find((member) => member.userId === userId)?.name ?? "";

/**
 * El reparto de una fila o un detalle (04·1, 04·7). F57-5 (revisión del PR #57): sale del modo guardado, no de las partes
 * positivas. `equal` es «50/50» aunque el redondeo deje a alguien en $0; `percent`, los porcentajes declarados («55/45»,
 * o «100 %» con 100/0); `amount`, «100 %» solo si una única parte es positiva y si no «Importe».
 */
export function rowMode(row: Pick<SharedTransaction, "splitMode" | "splitPercents" | "allocations">) {
  if (row.splitMode === "equal") return copy.shared.mode.equal;
  if (row.splitMode === "percent" && row.splitPercents) return row.splitPercents.includes(100) ? "100 %" : copy.shared.mode.percentOf(row.splitPercents);
  return row.allocations.filter((part) => part.amount.amountMinor > 0n).length === 1 ? "100 %" : copy.shared.mode.amount;
}
