// 004 PR D, revisión del gestor del PR #69 (2) — capa: unidad (Vitest, proyecto components). «Comprobar estado» de un gasto
// con meta (FR-093) resuelve en los dos contextos. Los payloads copian la forma real que guarda `create_expense_with_goal`:
// en Yo, `to_jsonb(tx)` menos sus campos internos (trae `payer_user_id`, `split_mode` y `split_percents` con `null` y no
// trae `parts`); en Nosotros, `shared_payload(tx)` con el pagador, el modo y las partes. La forma real la confirma la prueba
// de integración `tests/integration/planning-adapters.test.ts`.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fundedContext } from "./funded-context";

const status = vi.hoisted(() => ({ value: { state: "not_found" } as unknown }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/db/write-status", () => ({ writeStatus: vi.fn(async () => status.value) }));

const { goalFundingWriteStatusAction } = await import("./actions");

const KEY = "33333333-3333-4333-8333-333333333333";
const TX = "66666666-6666-4666-8666-666666666666";
const GOAL = "44444444-4444-4444-8444-444444444444";
const SARA = "11111111-1111-4111-8111-111111111111";
const TOMAS = "22222222-2222-4222-8222-222222222222";
const common = { id: TX, type: "expense", amount_minor: "40000000", category_id: "shopping", transaction_date: "2026-11-03", description: "Repuestos", currency: "COP", version: 1, created_at: "2026-11-03T15:00:00Z", updated_at: "2026-11-03T15:00:00Z" };
const privatePayload = { ...common, payer_user_id: null, split_mode: null, split_percents: null, updated_by: null, goal_id: GOAL, own_usage_entry_id: "77777777-7777-4777-8777-777777777777", request_id: null };
const sharedPayload = {
  ...common, created_by: SARA, status: "active", payer_user_id: TOMAS, split_mode: "equal", split_percents: null, updated_by: SARA, moved_from_me: false,
  parts: { [SARA]: "20000000", [TOMAS]: "20000000" }, goal_id: GOAL, own_usage_entry_id: null, request_id: "88888888-8888-4888-8888-888888888888",
};

beforeEach(() => { status.value = { state: "not_found" }; });

describe("«Comprobar estado» de create_expense_with_goal", () => {
  it("en Yo: el payload privado (con payer_user_id y split_mode en null) se resuelve como gasto privado", async () => {
    expect(fundedContext(privatePayload)).toBe("me");
    status.value = { state: "completed", result: privatePayload };
    const outcome = await goalFundingWriteStatusAction({ action: "create_expense_with_goal", idempotencyKey: KEY });
    expect(outcome).toEqual({ state: "completed", value: { context: "me", goalId: GOAL, requestId: null, transaction: { id: TX, type: "expense", categoryId: "shopping", transactionDate: "2026-11-03", description: "Repuestos", amountMinor: "40000000", version: 1 } } });
  });

  it("en Nosotros: el payload compartido se resuelve con su reparto y su solicitud", async () => {
    expect(fundedContext(sharedPayload)).toBe("us");
    status.value = { state: "completed", result: sharedPayload };
    const outcome = await goalFundingWriteStatusAction({ action: "create_expense_with_goal", idempotencyKey: KEY });
    expect(outcome).toMatchObject({ state: "completed", value: { context: "us", goalId: GOAL, requestId: "88888888-8888-4888-8888-888888888888", transaction: { id: TX, payerUserId: TOMAS, parts: { [SARA]: "20000000", [TOMAS]: "20000000" } } } });
  });

  it("todavía no consta: not_found, sin afirmar nada", async () => {
    expect(await goalFundingWriteStatusAction({ action: "create_expense_with_goal", idempotencyKey: KEY })).toEqual({ state: "not_found" });
  });
});
