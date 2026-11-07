// PR D de la 003 (T061–T063) / FR-007, FR-027, FR-028; contracts/server-actions.md §1. Lo que cruza entre Balance, la hoja de
// liquidación, el detalle y sus Server Actions. Los importes viajan como texto (FR-007; ADR-013 §4): `amountPesos` son los
// pesos enteros que escribió la persona; los `…Minor`, unidades menores que devolvió la función. La dirección nunca la
// manda el navegador: `register_settlement` la deriva del saldo bajo el bloqueo del grupo (contracts/database.md).
import type { Settlement } from "@/domain/balances";

/** Un integrante de la pareja activa tal como lo ve Balance: nombre visible y orden de ingreso, nunca el correo. */
export type BalanceMember = { userId: string; name: string; joinOrder: 1 | 2; isMe: boolean };

export type SettlePayload = { idempotencyKey: string; amountPesos: string; settlementDate: string; note: string | null };
export type VoidSettlementPayload = { idempotencyKey: string; settlementId: string; expectedVersion: number; reason: "void" | "undo" };

/** La liquidación recién registrada, con el saldo pendiente de antes y de después que calculó la función (S4). */
export type SavedSettlement = {
  id: string; fromUserId: string; toUserId: string; amountMinor: string; settlementDate: string; note: string | null;
  version: number; createdAt: string; createdBy: string; pendingBeforeMinor: string; pendingAfterMinor: string;
};

/** Una liquidación leída de `couple_settlements` (activa o anulada), para el detalle y el historial. */
export type SettlementView = Settlement & {
  id: string; settlementDate: string; createdAt: string; note: string | null; version: number;
  createdBy: string; voidedBy: string | null; voidedAt: string | null;
};
