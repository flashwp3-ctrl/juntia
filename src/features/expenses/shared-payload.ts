// T046, T047, T050 (spec 003, PR C) / FR-007, FR-018, FR-019, FR-019a, FR-031; contracts/database.md («Partes» y
// «Validación del reparto»). Lo que llega a una Server Action de gasto compartido viene del navegador y no se cree: se
// comprueba la forma de cada campo, y las partes se calculan aquí con `splitAmount` a partir del modo, los participantes y
// los valores, con el orden de ingreso de `couple_members`. La función SQL las vuelve a calcular y rechaza cualquier
// discrepancia con JT110. Importes solo como texto de dígitos: un `number` nunca se acepta como importe (FR-007).
import { splitAmount, type Allocation, type SplitMode } from "@/domain/allocations";
import { moneyFromPesos, parseAmountMinor, type Money } from "@/domain/money";
import { CATEGORY_CATALOG, validateDraft, type CategoryId } from "@/domain/transactions";
import type { SharedTransaction } from "@/lib/db/types";
import { isUuid, normalizeDescription } from "./payload";
import type { ReclassifyPayload, SavedShared, SharedCreatePayload, SharedSplitPayload, SharedUpdatePayload, SharedVoidPayload, UndoReclassifyPayload } from "./shared-types";

const PESOS = /^[1-9][0-9]{0,8}$/;
const PART_PESOS = /^(0|[1-9][0-9]{0,8})$/;
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MAX_VERSION = 2_147_483_647;
const MODES: readonly SplitMode[] = ["equal", "percent", "amount"];
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isVersion = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_VERSION;
const isCategory = (value: unknown): value is CategoryId => typeof value === "string" && CATEGORY_CATALOG.some(({ id, kind }) => id === value && kind === "expense");

function splitFrom(input: Record<string, unknown>, withPayer: boolean): (SharedSplitPayload | Omit<SharedSplitPayload, "payerUserId">) | null {
  const { payerUserId, splitMode, participants, percents, amountsPesos } = input;
  if (withPayer && !isUuid(payerUserId)) return null;
  if (typeof splitMode !== "string" || !MODES.includes(splitMode as SplitMode)) return null;
  if (!Array.isArray(participants) || participants.length < 1 || participants.length > 2 || !participants.every(isUuid) || new Set(participants).size !== participants.length) return null;
  const mode = splitMode as SplitMode;
  let parsedPercents: Record<string, number> | null = null;
  let parsedAmounts: Record<string, string> | null = null;
  if (mode === "percent") {
    if (!isObject(percents) || Object.keys(percents).length !== participants.length) return null;
    if (!participants.every((id) => Number.isInteger(percents[id]) && (percents[id] as number) >= 0 && (percents[id] as number) <= 100)) return null;
    parsedPercents = Object.fromEntries(participants.map((id) => [id, percents[id] as number]));
  } else if (percents !== null) return null;
  if (mode === "amount") {
    if (!isObject(amountsPesos) || Object.keys(amountsPesos).length !== participants.length) return null;
    if (!participants.every((id) => typeof amountsPesos[id] === "string" && PART_PESOS.test(amountsPesos[id] as string))) return null;
    parsedAmounts = Object.fromEntries(participants.map((id) => [id, amountsPesos[id] as string]));
  } else if (amountsPesos !== null) return null;
  const split = { splitMode: mode, participants: participants as string[], percents: parsedPercents, amountsPesos: parsedAmounts };
  return withPayer ? { ...split, payerUserId: payerUserId as string } : split;
}

function fieldsFrom(input: Record<string, unknown>) {
  const { amountPesos, categoryId, transactionDate, description } = input;
  if (typeof amountPesos !== "string" || !PESOS.test(amountPesos) || !isCategory(categoryId)) return null;
  if (typeof transactionDate !== "string" || !DATE.test(transactionDate)) return null;
  if (description !== null && typeof description !== "string") return null;
  const normalized = normalizeDescription(description as string | null);
  if (validateDraft({ type: "expense", amount: moneyFromPesos(BigInt(amountPesos)), categoryId, transactionDate, description: normalized }).length > 0) return null;
  return { amountPesos, categoryId, transactionDate, description: normalized };
}

export function parseSharedCreate(input: unknown): SharedCreatePayload | null {
  if (!isObject(input) || !isUuid(input.idempotencyKey)) return null;
  const fields = fieldsFrom(input);
  const split = splitFrom(input, true) as SharedSplitPayload | null;
  return fields && split ? { idempotencyKey: input.idempotencyKey, ...fields, ...split } : null;
}

export function parseSharedUpdate(input: unknown): SharedUpdatePayload | null {
  if (!isObject(input) || !isUuid(input.transactionId) || !isVersion(input.expectedVersion)) return null;
  const base = parseSharedCreate(input);
  return base ? { ...base, transactionId: input.transactionId, expectedVersion: input.expectedVersion } : null;
}

export function parseSharedVoid(input: unknown): SharedVoidPayload | null {
  if (!isObject(input) || !isUuid(input.idempotencyKey) || !isUuid(input.transactionId) || !isVersion(input.expectedVersion)) return null;
  if (input.reason !== "delete" && input.reason !== "undo") return null;
  return { idempotencyKey: input.idempotencyKey, transactionId: input.transactionId, expectedVersion: input.expectedVersion, reason: input.reason };
}

export function parseReclassify(input: unknown): ReclassifyPayload | null {
  if (!isObject(input) || !isUuid(input.idempotencyKey) || !isUuid(input.transactionId) || !isVersion(input.expectedVersion)) return null;
  const split = splitFrom(input, false);
  return split ? { idempotencyKey: input.idempotencyKey, transactionId: input.transactionId, expectedVersion: input.expectedVersion, ...split } : null;
}

export function parseUndoReclassify(input: unknown): UndoReclassifyPayload | null {
  if (!isObject(input) || !isUuid(input.idempotencyKey) || !isUuid(input.sharedTransactionId) || !isVersion(input.expectedVersion)) return null;
  return { idempotencyKey: input.idempotencyKey, sharedTransactionId: input.sharedTransactionId, expectedVersion: input.expectedVersion };
}

/**
 * Las partes del reparto con `splitAmount` (ADR-002, versión 1) y el orden de ingreso real de la pareja. Un participante:
 * 100 % para esa persona (FR-019a); `src/lib/db/shared-expenses.ts` lo envía como `percent` 100/0. Dos: `equal` reparte
 * entre los dos, `percent` con los porcentajes enteros y `amount` con los importes escritos, que deben sumar el total.
 * Devuelve `null` si el reparto no cuadra o si un participante no es integrante: la Server Action lo rechaza.
 */
export function allocationsFor(amount: Money, split: Omit<SharedSplitPayload, "payerUserId">, members: readonly { user_id: string; join_order: number }[]): { allocations: Allocation[]; splitPercents: number[] | null; splitMode: SplitMode } | null {
  const people = split.participants.map((id) => members.find((member) => member.user_id === id));
  if (people.some((person) => !person)) return null;
  const ordered = (people as { user_id: string; join_order: number }[]).map((person) => ({ userId: person.user_id, joinOrder: person.join_order }));
  try {
    if (ordered.length === 1) return { allocations: splitAmount(amount, "equal", ordered), splitPercents: null, splitMode: "equal" };
    if (split.splitMode === "equal") return { allocations: splitAmount(amount, "equal", ordered), splitPercents: null, splitMode: "equal" };
    if (split.splitMode === "percent") {
      const allocations = splitAmount(amount, "percent", ordered, split.percents ?? {});
      const byOrder = [...members].sort((a, b) => a.join_order - b.join_order).map((member) => split.percents?.[member.user_id] ?? 0);
      return { allocations, splitPercents: byOrder, splitMode: "percent" };
    }
    const values = Object.fromEntries(Object.entries(split.amountsPesos ?? {}).map(([id, pesos]) => [id, BigInt(pesos) * 100n]));
    return { allocations: splitAmount(amount, "amount", ordered, values), splitPercents: null, splitMode: "amount" };
  } catch {
    return null;
  }
}

/** Un gasto compartido del dominio, como lo ve la interfaz (sin `bigint`). */
export function toSavedShared(row: SharedTransaction): SavedShared {
  return {
    id: row.id, categoryId: row.categoryId, transactionDate: row.transactionDate, description: row.description, amountMinor: row.amount.amountMinor.toString(),
    payerUserId: row.payerUserId, splitMode: row.splitMode, splitPercents: row.splitPercents, parts: Object.fromEntries(row.allocations.map((a) => [a.userId, a.amount.amountMinor.toString()])),
    version: row.version, createdBy: row.createdBy, updatedBy: row.updatedBy, updatedAt: row.updatedAt, movedFromMe: row.movedFromMe,
  };
}

/** De vuelta: lo que la interfaz guarda en memoria, como fila del dominio para las listas. */
export function fromSavedShared(saved: SavedShared, createdAt: string): SharedTransaction {
  return {
    id: saved.id, transactionDate: saved.transactionDate, createdAt, updatedAt: saved.updatedAt, categoryId: saved.categoryId, description: saved.description,
    amount: parseAmountMinor(saved.amountMinor), payerUserId: saved.payerUserId, splitMode: saved.splitMode, splitPercents: saved.splitPercents,
    allocations: Object.entries(saved.parts).map(([userId, value]) => ({ userId, amount: parseAmountMinor(value) })), status: "active", version: saved.version,
    createdBy: saved.createdBy, updatedBy: saved.updatedBy, movedFromMe: saved.movedFromMe,
  };
}
