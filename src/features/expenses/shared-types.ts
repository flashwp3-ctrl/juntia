// PR C de la 003 (T045–T050) / FR-007, FR-018–FR-024, FR-031–FR-036, FR-059; contracts/server-actions.md §1–§2. Lo que
// cruza entre la hoja de Anotar en Nosotros, el detalle compartido, Mover a Pareja y sus Server Actions. Los importes viajan
// como texto (FR-007; ADR-013 §4): `amountPesos` son los pesos enteros que escribió la persona; `amountMinor` y las partes,
// unidades menores que devolvió la función. Las partes nunca las decide el navegador: la Server Action las calcula con
// `splitAmount` a partir del modo, los participantes y los valores (contracts/database.md, «Partes»).
import type { SplitMode } from "@/domain/allocations";
import type { CategoryId } from "@/domain/transactions";
import type { WriteAction, WriteOutcome, WriteStatusOutcome } from "@/features/shared/write-result";

/** Un integrante de la pareja activa tal como lo ve la hoja: nombre visible y orden de ingreso, nunca el correo. */
export type SheetMember = { userId: string; name: string; joinOrder: 1 | 2; isMe: boolean };

/**
 * Lo último que usó esta persona en Nosotros (Q5; decisión 1 de los fundadores del 7 nov 2026: pagador, reparto y
 * participantes). Sale del último gasto compartido que anotó, leído por el layout: es memoria del uso, no una preferencia
 * guardada, y nunca vive en el almacenamiento del navegador.
 */
export type LastSplit = { payerUserId: string; splitMode: SplitMode; percents: Record<string, number> | null; participants: string[] };
export type CoupleForSheet = { members: SheetMember[]; last: LastSplit | null };

/** El reparto que manda la hoja: modo, participantes y, según el modo, porcentajes enteros o importes en pesos. */
export type SharedSplitPayload = {
  payerUserId: string; splitMode: SplitMode; participants: string[];
  percents: Record<string, number> | null; amountsPesos: Record<string, string> | null;
};
export type SharedCreatePayload = SharedSplitPayload & {
  idempotencyKey: string; amountPesos: string; categoryId: CategoryId; transactionDate: string; description: string | null;
};
export type SharedUpdatePayload = SharedCreatePayload & { transactionId: string; expectedVersion: number };
export type SharedVoidPayload = { idempotencyKey: string; transactionId: string; expectedVersion: number; reason: "delete" | "undo" };
export type ReclassifyPayload = Omit<SharedSplitPayload, "payerUserId"> & { idempotencyKey: string; transactionId: string; expectedVersion: number };
export type UndoReclassifyPayload = { idempotencyKey: string; sharedTransactionId: string; expectedVersion: number };

/** Un gasto compartido guardado, como lo ve la interfaz: sin `bigint`, con las partes y la `version` para la siguiente escritura. */
export type SavedShared = {
  id: string; categoryId: CategoryId; transactionDate: string; description: string | null; amountMinor: string;
  payerUserId: string; splitMode: SplitMode; splitPercents: readonly number[] | null; parts: Record<string, string>;
  version: number; createdBy: string; updatedBy: string | null; updatedAt: string; movedFromMe: boolean;
};
export type MoveResult = { voidedPrivateId: string; shared: SavedShared };

/**
 * ChangePreview (A3; decisión 20.3, FR-041): las cifras de antes, solo de quien mira, leídas por una Server Action al
 * pedir la vista previa (no viajan con la página de Yo). El después lo calcula el cliente con el reparto elegido.
 */
export type MovePreviewBase = {
  month: string; privateMinor: string; sharedPartMinor: string; coupleTotalMinor: string;
  balance: { userId: string; netMinor: string }[];
};

export type SharedActions = {
  create: (payload: SharedCreatePayload) => Promise<WriteOutcome<SavedShared>>;
  update: (payload: SharedUpdatePayload) => Promise<WriteOutcome<SavedShared>>;
  voidShared: (payload: SharedVoidPayload) => Promise<WriteOutcome<{ id: string; version: number }>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cada acción devuelve su propio resultado guardado.
  check: (input: { action: WriteAction; idempotencyKey: string }) => Promise<WriteStatusOutcome<any>>;
  reclassify?: (payload: ReclassifyPayload) => Promise<WriteOutcome<MoveResult>>;
  undoReclassify?: (payload: UndoReclassifyPayload) => Promise<WriteOutcome<{ restoredPrivateId: string }>>;
  previewMove?: (input: { transactionId: string }) => Promise<{ ok: true; value: MovePreviewBase } | { ok: false }>;
};
