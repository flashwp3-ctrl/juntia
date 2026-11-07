// PR D de la 003 (T062) / FR-007: una liquidación de src/lib/db como la ve la interfaz, sin `bigint` (los importes viajan
// como texto entre el servidor y el navegador). Sin «use server»: la usan las Server Actions y «Comprobar estado».
import { settlement } from "@/lib/db/settlements";
import type { SettlementTransport } from "@/lib/db/types";
import type { SavedSettlement, SettlementView } from "./types";

type DbSettlement = ReturnType<typeof settlement>;

export function toSavedSettlement(row: DbSettlement): SavedSettlement {
  return {
    id: row.id, fromUserId: row.fromUserId, toUserId: row.toUserId, amountMinor: row.amount.amountMinor.toString(), settlementDate: row.settlementDate,
    note: row.note, version: row.version, createdAt: row.createdAt, createdBy: row.createdBy,
    pendingBeforeMinor: (row.pendingBefore?.amountMinor ?? 0n).toString(), pendingAfterMinor: (row.pendingAfter?.amountMinor ?? 0n).toString(),
  };
}

/** El resultado guardado de `register_settlement` que devuelve `write_status` (la misma forma que la respuesta). */
export const savedFromTransport = (row: SettlementTransport) => toSavedSettlement(settlement(row));

export function toSettlementView(row: DbSettlement): SettlementView {
  return {
    id: row.id, settlementDate: row.settlementDate, createdAt: row.createdAt, fromUserId: row.fromUserId, toUserId: row.toUserId, amount: row.amount,
    status: row.status, note: row.note, version: row.version, createdBy: row.createdBy, voidedBy: row.voidedBy, voidedAt: row.voidedAt,
  };
}
