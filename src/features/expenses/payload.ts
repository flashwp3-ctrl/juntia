// P0-1, PR D (T081, T082) / FR-008, FR-013, FR-032; contracts/database.md. Lo que llega a una Server Action viene del
// navegador y no se cree: se comprueba la forma de cada campo antes de construir el borrador del dominio, y el dominio
// valida el resto (validateDraft). Importes solo como texto de dígitos: un `number` nunca se acepta (FR-008).
import { moneyFromPesos } from "@/domain/money";
import { CATEGORY_CATALOG, validateDraft, type CategoryId, type TransactionDraft } from "@/domain/transactions";
import type { CreatePayload, UpdatePayload, VoidPayload } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 1 a 999.999.999 pesos (COMPONENT_SPECIFICATIONS.md §AmountInput), sin ceros a la izquierda.
const PESOS = /^[1-9][0-9]{0,8}$/;
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MAX_VERSION = 2_147_483_647; // integer de PostgreSQL

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);
const isVersion = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_VERSION;
const isCategory = (value: unknown): value is CategoryId => typeof value === "string" && CATEGORY_CATALOG.some(({ id }) => id === value);

/** Descripción vacía o solo espacios se guarda como `null` (contracts/database.md, `p_description`). */
export function normalizeDescription(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function draftFrom(input: Record<string, unknown>, type: unknown): TransactionDraft | null {
  const { amountPesos, categoryId, transactionDate, description } = input;
  if (type !== "expense" && type !== "income") return null;
  if (typeof amountPesos !== "string" || !PESOS.test(amountPesos)) return null;
  if (!isCategory(categoryId) || typeof transactionDate !== "string" || !DATE.test(transactionDate)) return null;
  if (description !== null && typeof description !== "string") return null;
  const draft: TransactionDraft = { type, amount: moneyFromPesos(BigInt(amountPesos)), categoryId, transactionDate, description: normalizeDescription(description) };
  return validateDraft(draft).length === 0 ? draft : null;
}

export function parseCreatePayload(input: unknown): (TransactionDraft & { idempotencyKey: string }) | null {
  if (!isObject(input) || !isUuid(input.idempotencyKey)) return null;
  const draft = draftFrom(input, input.type);
  return draft ? { ...draft, idempotencyKey: input.idempotencyKey } : null;
}

/**
 * Edición: el tipo no viaja (Q14). Para validar la categoría se usa el tipo que implica: «Ingresos» solo vale para un
 * ingreso y las demás solo para un gasto (FR-014); la función SQL vuelve a comprobarlo contra el tipo guardado.
 */
export function parseUpdatePayload(input: unknown): (Omit<TransactionDraft, "type"> & { idempotencyKey: string; transactionId: string; expectedVersion: number }) | null {
  if (!isObject(input) || "type" in input) return null;
  if (!isUuid(input.idempotencyKey) || !isUuid(input.transactionId) || !isVersion(input.expectedVersion)) return null;
  const draft = draftFrom(input, input.categoryId === "income" ? "income" : "expense");
  if (!draft) return null;
  const { type: _type, ...rest } = draft;
  return { ...rest, idempotencyKey: input.idempotencyKey, transactionId: input.transactionId, expectedVersion: input.expectedVersion };
}

export function parseVoidPayload(input: unknown): VoidPayload | null {
  if (!isObject(input) || !isUuid(input.idempotencyKey) || !isUuid(input.transactionId) || !isVersion(input.expectedVersion)) return null;
  if (input.reason !== "delete" && input.reason !== "undo") return null;
  return { idempotencyKey: input.idempotencyKey, transactionId: input.transactionId, expectedVersion: input.expectedVersion, reason: input.reason };
}

/** Lo que manda la hoja: pesos enteros del AmountInput como texto de dígitos. */
export function toPayloadPesos(pesos: number): string {
  if (!Number.isSafeInteger(pesos) || pesos < 0) throw new RangeError("amount");
  return String(pesos);
}

export type { CreatePayload, UpdatePayload };
