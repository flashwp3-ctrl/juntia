// P0-1, PR D (T081, T082) / FR-008, FR-030–FR-039; contracts/errors.md. Lo que cruza entre la hoja de Anotar, el detalle y
// las Server Actions. Los importes viajan como texto en las dos direcciones (FR-008; ADR-013 §4): `amountPesos` son los
// pesos enteros que escribió la persona y `amountMinor` las unidades menores que devolvió la función.
import type { CategoryId, TransactionType } from "@/domain/transactions";

/** Un movimiento guardado, tal como lo ve la interfaz: sin `bigint` y con la `version` que espera la siguiente escritura. */
export type SavedTransaction = {
  id: string; type: TransactionType; categoryId: CategoryId; transactionDate: string;
  description: string | null; amountMinor: string; version: number;
};

export type CreatePayload = {
  idempotencyKey: string; type: TransactionType; amountPesos: string; categoryId: CategoryId;
  transactionDate: string; description: string | null;
};
/** Sin `type`: el tipo no cambia al editar (Q14). */
export type UpdatePayload = Omit<CreatePayload, "type"> & { transactionId: string; expectedVersion: number };
export type VoidPayload = { idempotencyKey: string; transactionId: string; expectedVersion: number; reason: "delete" | "undo" };

/**
 * Error de una acción, ya traducido a lo que la interfaz dice (contracts/errors.md). `saveFailed` y `network` se
 * ofrecen reintentar con la misma clave; `invalid` no debería llegar, porque la hoja valida antes.
 */
export type ExpenseActionError = "sessionExpired" | "saveFailed" | "network" | "invalid" | "versionConflict" | "alreadyDeleted" | "notFound" | "unexpected";
export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: ExpenseActionError };

export type ExpenseActions = {
  create: (payload: CreatePayload) => Promise<ActionResult<SavedTransaction>>;
  update: (payload: UpdatePayload) => Promise<ActionResult<SavedTransaction>>;
  voidTransaction: (payload: VoidPayload) => Promise<ActionResult<{ id: string; version: number }>>;
};
