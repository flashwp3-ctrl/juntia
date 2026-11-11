// 004 PR D, revisión de ChatGPT del PR #69 (F69-3) — capa: unidad (Vitest, proyecto components). Una eliminación que
// reactiva una meta archivada (F64-1): lo que recupera «Comprobar estado» es igual a la respuesta normal, metas reactivadas
// incluidas, en un compartido (`void_shared_expense`) y en un privado (`void_transaction`). La anulación de una liquidación
// no cambia. El resultado guardado copia la forma de `void_shared_expense`/`void_transaction`: id, status, version y
// `reactivated_goals` cuando las hay.
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ result: {} as Record<string, unknown>, status: { state: "not_found" } as unknown }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/db/write-status", () => ({ writeStatus: vi.fn(async () => db.status) }));
vi.mock("@/lib/db/shared-expenses", async (original) => ({ ...(await original<object>()), voidSharedExpense: vi.fn(async () => db.result) }));
vi.mock("@/lib/db/transactions", async (original) => ({ ...(await original<object>()), voidTransaction: vi.fn(async () => db.result) }));

const { sharedWriteStatusAction, voidSharedExpenseAction } = await import("./shared-actions");
const { privateWriteStatusAction, voidTransactionAction } = await import("./actions");

const KEY = "33333333-3333-4333-8333-333333333333";
const TX = "66666666-6666-4666-8666-666666666666";
const saved = { id: TX, status: "voided", version: 3, reactivated_goals: [{ goal_id: "44444444-4444-4444-8444-444444444444", name: "Casco", returned_minor: "20000000" }] };
const payload = { idempotencyKey: KEY, transactionId: TX, expectedVersion: 2, reason: "delete" };

beforeEach(() => { db.result = saved; db.status = { state: "completed", result: saved }; });

describe("F69-3: la anulación recuperada es igual a la respuesta normal", () => {
  it("compartido: respuesta y «Comprobar estado» traen la misma meta reactivada", async () => {
    const normal = await voidSharedExpenseAction(payload);
    const recovered = await sharedWriteStatusAction({ action: "void_shared_expense", idempotencyKey: KEY });
    expect(normal).toEqual({ status: "ok", value: { id: TX, version: 3, reactivatedGoals: [{ goalId: "44444444-4444-4444-8444-444444444444", name: "Casco", returnedMinor: "20000000" }] } });
    expect(recovered).toEqual({ state: "completed", value: normal.status === "ok" ? normal.value : null });
  });

  it("privado: respuesta y «Comprobar estado» traen la misma meta reactivada", async () => {
    const normal = await voidTransactionAction(payload);
    const recovered = await privateWriteStatusAction({ action: "void_transaction", idempotencyKey: KEY });
    expect(normal.status).toBe("ok");
    expect(recovered).toEqual({ state: "completed", value: normal.status === "ok" ? normal.value : null });
  });

  it("la anulación de una liquidación no cambia: solo id y versión", async () => {
    db.status = { state: "completed", result: { id: TX, status: "voided", version: 2 } };
    expect(await sharedWriteStatusAction({ action: "void_settlement", idempotencyKey: KEY })).toEqual({ state: "completed", value: { id: TX, version: 2 } });
  });
});
