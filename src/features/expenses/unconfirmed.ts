// F51-1 (revisión de ChatGPT del PR #51) / FR-036; ADR-013 §3. Las intenciones de creación que todavía no se sabe si llegaron al
// servidor: la clave de idempotencia (que nace con la intención), el payload exacto y cuándo se guardó. Viven en `localStorage`
// para sobrevivir a una recarga; el proveedor de Anotar las reenvía tal cual, con la MISMA clave, hasta que el servidor las
// confirme (`create_transaction` es idempotente: devuelve el resultado original, con el id real, sin crear otro) o las rechace.
// Nunca se concilia comparando importe, fecha y categoría: dos gastos legítimos pueden coincidir.
//
// Privacidad (revisión previa a la 2.ª ronda): cada usuario tiene su propia clave de almacenamiento, con su id de usuario
// autenticado (nunca el correo), y el proveedor solo lee la del usuario de la sesión actual: una intención de A no se reenvía
// jamás con la sesión de B (el servidor la crearía como un gasto nuevo de B, porque la clave de idempotencia es por actor). Lo
// de otro usuario no se lee, no se envía y no se toca. Contiene importe y descripción de gastos privados, así que se borra al
// cerrar sesión, al llegar a Entrar sin sesión y cuando el servidor dice que la sesión ya no vale.
//
// Caducidad: 24 h. `idempotency_records` (supabase/migrations/20261105000200_controlled_tables.sql) no tiene hoy columna de
// caducidad ni purga: el servidor conserva la clave sin límite, así que no hay retención que acotar. Si alguna vez se añade una
// purga, tendría que conservar las claves al menos 24 h: pasado ese plazo el cliente suelta la intención sin reenviarla.
import { CATEGORY_CATALOG, type Transaction } from "@/domain/transactions";
import { moneyFromPesos } from "@/domain/money";
import type { CreatePayload, PendingRow } from "./types";

export const UNCONFIRMED_STORAGE_PREFIX = "juntia:unconfirmed-writes:";
/** La clave de almacenamiento de un usuario: su id de Auth, no su correo. */
export const unconfirmedStorageKey = (userId: string) => `${UNCONFIRMED_STORAGE_PREFIX}${userId}`;
export const UNCONFIRMED_TTL_MS = 24 * 60 * 60 * 1000;

export type StoredIntention = { key: string; payload: CreatePayload; savedAt: number };

const isPayload = (value: unknown): value is CreatePayload => {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return typeof p.idempotencyKey === "string" && p.idempotencyKey.length > 0
    && (p.type === "expense" || p.type === "income")
    && typeof p.amountPesos === "string" && /^[0-9]{1,9}$/.test(p.amountPesos)
    && typeof p.categoryId === "string" && CATEGORY_CATALOG.some(({ id, kind }) => id === p.categoryId && kind === p.type)
    && typeof p.transactionDate === "string" && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(p.transactionDate)
    && (p.description === null || typeof p.description === "string");
};

const isStored = (value: unknown): value is StoredIntention => {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return typeof s.key === "string" && typeof s.savedAt === "number" && isPayload(s.payload) && s.payload.idempotencyKey === s.key;
};

function write(userId: string, list: readonly StoredIntention[]) {
  try {
    if (list.length === 0) window.localStorage.removeItem(unconfirmedStorageKey(userId));
    else window.localStorage.setItem(unconfirmedStorageKey(userId), JSON.stringify(list));
  } catch { /* sin almacenamiento (ventana privada, datos bloqueados): la intención sigue en memoria mientras la pestaña viva */ }
}

/** Lo guardado y vigente de ESE usuario; descarta (y borra) lo caducado o malformado. */
export function readIntentions(userId: string, now: number = Date.now()): StoredIntention[] {
  let raw: unknown = null;
  try { raw = JSON.parse(window.localStorage.getItem(unconfirmedStorageKey(userId)) ?? "null"); } catch { raw = null; }
  const all = Array.isArray(raw) ? raw : [];
  const kept = all.filter((entry): entry is StoredIntention => isStored(entry) && now - entry.savedAt < UNCONFIRMED_TTL_MS);
  if (kept.length !== all.length) write(userId, kept);
  return kept;
}

/** Guarda la intención (una vez por clave: reenviarla no cambia cuándo nació). */
export function addIntention(userId: string, payload: CreatePayload, now: number = Date.now()) {
  const current = readIntentions(userId, now);
  if (current.some(({ key }) => key === payload.idempotencyKey)) return;
  write(userId, [...current, { key: payload.idempotencyKey, payload, savedAt: now }]);
}

/** La intención se confirmó o se rechazó: ya no hay nada que reconciliar. */
export function removeIntention(userId: string, key: string) {
  const current = readIntentions(userId);
  if (current.some((entry) => entry.key === key)) write(userId, current.filter((entry) => entry.key !== key));
}

/** Borra todas las intenciones de un usuario (la sesión ya no vale). */
export function clearIntentions(userId: string) {
  try { window.localStorage.removeItem(unconfirmedStorageKey(userId)); } catch { /* sin almacenamiento */ }
}

/** Borra las de todos los usuarios de este dispositivo: al cerrar sesión o llegar a Entrar no queda nadie con sesión. */
export function clearAllIntentions() {
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(UNCONFIRMED_STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch { /* sin almacenamiento */ }
}

/** La fila temporal de una intención, con el mismo aspecto que la de una creación en vuelo. Su id nunca es el real. */
export function rowFromPayload(payload: CreatePayload, state: PendingRow["state"], now: string = new Date().toISOString()): PendingRow {
  const transaction: Transaction = {
    id: `pending:${payload.idempotencyKey}`, type: payload.type, amount: moneyFromPesos(BigInt(payload.amountPesos)), categoryId: payload.categoryId,
    transactionDate: payload.transactionDate, description: payload.description, status: "active", version: 1, createdAt: now, updatedAt: now,
  };
  return { key: payload.idempotencyKey, state, transaction, payload };
}
