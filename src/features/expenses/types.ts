// P0-1, PR D (T081, T082) / FR-008, FR-030–FR-039; contracts/errors.md. Lo que cruza entre la hoja de Anotar, el detalle y
// las Server Actions. Los importes viajan como texto en las dos direcciones (FR-008; ADR-013 §4): `amountPesos` son los
// pesos enteros que escribió la persona y `amountMinor` las unidades menores que devolvió la función.
import type { CategoryId, Transaction, TransactionType } from "@/domain/transactions";

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
export type ExpenseActionError = "sessionExpired" | "saveFailed" | "network" | "invalid" | "versionConflict" | "alreadyDeleted" | "notFound" | "unexpected"
  /** 004 PR D (T063; Q17, JT213): bajar el monto de un gasto con meta por debajo de lo ya usado. */
  | "belowGoalUsage";
/** Lo que devuelve anular un movimiento; `reactivatedGoals`, si devolvió fondos a una meta archivada (F64-1). */
export type VoidedTransaction = { id: string; version: number; reactivatedGoals?: { goalId: string; name: string; returnedMinor: string }[] };
export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: ExpenseActionError };

/**
 * Un fallo tras el que el primer intento pudo llegar al servidor (red, guardado fallido o inesperado): el resultado es
 * desconocido. Los demás errores son rechazos del servidor y no escribieron nada (JT001, JT008).
 */
export const isAmbiguousError = (error: ExpenseActionError) => error === "network" || error === "saveFailed" || error === "unexpected";

/**
 * Una creación en vuelo que Inicio y Actividad pintan al instante (UX lote 1, cambio 3), marcada «Guardando…». Solo existe
 * mientras la petición viaja: si el servidor rechaza o el resultado se desconoce, la fila se retira y vuelve la hoja. Vive en
 * el proveedor, con estado propio por clave; nunca en la base ni en el almacenamiento del navegador.
 */
export type PendingRow = {
  key: string;
  /** `saving`: la petición viaja. `confirmed`: el servidor ya la guardó (`savedId`) y se espera a que la lista traiga la real. */
  state: "saving" | "confirmed";
  transaction: Transaction;
  /** Id real, cuando el servidor ya confirmó: la fila temporal se esconde en cuanto la lista trae la real (nunca las dos). */
  savedId?: string;
};

export type ExpenseActions = {
  create: (payload: CreatePayload) => Promise<ActionResult<SavedTransaction>>;
  update: (payload: UpdatePayload) => Promise<ActionResult<SavedTransaction>>;
  /** 004 PR D (T063; F64-1): la anulación devuelve las metas archivadas que volvieron a estar activas. */
  voidTransaction: (payload: VoidPayload) => Promise<ActionResult<VoidedTransaction>>;
};
