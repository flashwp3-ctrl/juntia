// 004 PR D, revisión de ChatGPT del PR #69 (F69-1, F69-4) — capa: componentes (Vitest + RTL).
// F69-1: editar y eliminar un gasto privado (con o sin meta) siguen el contrato común de escrituras (FR-093): ok, rechazo
// confirmado o resultado desconocido; con desconocido, «Reintentar» con la misma clave y «Comprobar estado» por write_status
// (update_transaction, void_transaction), y cerrar la eliminación pregunta «¿Cerrar sin confirmar?». La creación no cambia.
// F69-4: tras un desconocido al anotar con meta, Guardar no se habilita; solo quedan «Reintentar» y «Comprobar estado».
import { configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "./annotate-provider";
import { TransactionActions } from "./transaction-actions";
import type { ExpenseActions, SavedTransaction } from "./types";
import type { GoalFundingActions } from "./goal-funding/types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/actividad/x" }));
afterEach(() => vi.clearAllMocks());
const isDisabled = (element: HTMLElement) => element.getAttribute("aria-disabled") === "true" || element.matches(":disabled");

const EXPENSE = "66666666-6666-4666-8666-666666666666";
const expense: SavedTransaction = { id: EXPENSE, type: "expense", categoryId: "market", transactionDate: "2026-11-03", description: "Mercado", amountMinor: "4500000", version: 2 };

function actionsWith(overrides: Partial<ExpenseActions>): ExpenseActions {
  return {
    create: vi.fn(),
    update: vi.fn<ExpenseActions["update"]>(async () => ({ status: "ok", value: { ...expense, version: 3 } })),
    voidTransaction: vi.fn<ExpenseActions["voidTransaction"]>(async () => ({ status: "ok", value: { id: EXPENSE, version: 3, reactivatedGoals: [] } })),
    check: vi.fn<NonNullable<ExpenseActions["check"]>>(async () => ({ state: "not_found" })),
    ...overrides,
  };
}
function setup(actions: ExpenseActions) {
  const user = userEvent.setup();
  render(<AnnotateProvider actions={actions} context="me" today="2026-11-05"><TransactionActions transaction={expense} backHref="/actividad?mes=2026-11" /></AnnotateProvider>);
  return user;
}

describe("F69-1: editar un privado con el contrato común", { timeout: 15000 }, () => {
  it("respuesta perdida después del commit → desconocido; «Comprobar estado» lee write_status y termina en guardado", async () => {
    const actions = actionsWith({
      update: vi.fn<ExpenseActions["update"]>().mockRejectedValueOnce(new TypeError("Failed to fetch")),
      check: vi.fn<NonNullable<ExpenseActions["check"]>>(async () => ({ state: "completed", value: { ...expense, amountMinor: "4700000", version: 3 } })),
    });
    const user = setup(actions);
    await user.click(screen.getByRole("button", { name: copy.detail.edit }));
    const amount = await screen.findByRole("textbox", { name: copy.annotate.amount });
    await user.clear(amount);
    await user.type(amount, "47000");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(copy.writes.unknown);
    expect(screen.getByRole("textbox", { name: copy.annotate.amount }).matches(":disabled")).toBe(true);
    expect(isDisabled(screen.getByRole("button", { name: copy.annotate.saveChanges }))).toBe(true);
    await user.click(within(alert).getByRole("button", { name: copy.writes.check }));
    const key = vi.mocked(actions.update).mock.calls[0][0].idempotencyKey;
    expect(actions.check).toHaveBeenCalledWith({ action: "update_transaction", idempotencyKey: key });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await screen.findByRole("status")).textContent).toContain(copy.annotate.saved.edit);
    expect(actions.update).toHaveBeenCalledTimes(1);
  });

  it("rechazo confirmado: lo dice, sin «Reintentar» ni «Comprobar estado», y los campos siguen editables", async () => {
    const actions = actionsWith({ update: vi.fn<ExpenseActions["update"]>(async () => ({ status: "rejected", error: "alreadyDeleted" })) });
    const user = setup(actions);
    await user.click(screen.getByRole("button", { name: copy.detail.edit }));
    await user.type(within(await screen.findByRole("dialog")).getByRole("textbox", { name: copy.annotate.description }), " 2");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    expect((await screen.findByRole("alert")).textContent).toContain(copy.transaction.errors.alreadyDeleted);
    expect(screen.queryByRole("button", { name: copy.writes.retry })).toBeNull();
    expect(screen.queryByRole("button", { name: copy.writes.check })).toBeNull();
    expect(screen.getByRole("textbox", { name: copy.annotate.amount }).matches(":disabled")).toBe(false);
  });
});

describe("F69-1: eliminar un privado con el contrato común", { timeout: 15000 }, () => {
  it("respuesta perdida después del commit → desconocido; «Comprobar estado» por void_transaction trae la reactivación", async () => {
    const actions = actionsWith({
      voidTransaction: vi.fn<ExpenseActions["voidTransaction"]>().mockRejectedValueOnce(new TypeError("Failed to fetch")),
      check: vi.fn<NonNullable<ExpenseActions["check"]>>(async () => ({ state: "completed", value: { id: EXPENSE, version: 3, reactivatedGoals: [{ goalId: "g", name: "Casco", returnedMinor: "20000000" }] } })),
    });
    const user = setup(actions);
    await user.click(screen.getByRole("button", { name: copy.remove.action.expense }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: copy.remove.confirm }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert.textContent).toContain(copy.writes.unknown);
    expect(within(dialog).queryByRole("button", { name: copy.remove.confirm })).toBeNull();
    await user.click(within(alert).getByRole("button", { name: copy.writes.check }));
    expect(actions.check).toHaveBeenCalledWith({ action: "void_transaction", idempotencyKey: vi.mocked(actions.voidTransaction).mock.calls[0][0].idempotencyKey });
    expect((await screen.findByRole("status")).textContent).toBe(`${copy.remove.done.expense}. ${copy.goalExpense.reactivated("Casco", "$200.000")}`);
    expect(router.push).toHaveBeenCalledWith("/actividad?mes=2026-11");
  });

  it("cerrar con un desconocido pregunta «¿Cerrar sin confirmar?»; «Seguir aquí» conserva la intención", async () => {
    const actions = actionsWith({ voidTransaction: vi.fn<ExpenseActions["voidTransaction"]>(async () => ({ status: "unknown" })) });
    const user = setup(actions);
    await user.click(screen.getByRole("button", { name: copy.remove.action.expense }));
    const dialog = await screen.findByRole("alertdialog", { name: copy.remove.title.expense });
    await user.click(within(dialog).getByRole("button", { name: copy.remove.confirm }));
    await within(dialog).findByRole("alert");
    await user.click(within(dialog).getByRole("button", { name: copy.annotate.uncertain.close }));
    const confirm = await screen.findByRole("alertdialog", { name: copy.writes.close.title });
    await user.click(within(confirm).getByRole("button", { name: copy.writes.close.keep }));
    await user.click(within(screen.getByRole("alertdialog", { name: copy.remove.title.expense })).getByRole("button", { name: copy.writes.retry }));
    await waitFor(() => expect(actions.voidTransaction).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(actions.voidTransaction).mock.calls.map(([payload]) => payload.idempotencyKey);
    expect(second).toBe(first);
  });

  it("rechazo confirmado: lo dice sin ofrecer reintentar", async () => {
    const actions = actionsWith({ voidTransaction: vi.fn<ExpenseActions["voidTransaction"]>(async () => ({ status: "rejected", error: "unexpected" })) });
    const user = setup(actions);
    await user.click(screen.getByRole("button", { name: copy.remove.action.expense }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: copy.remove.confirm }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain(copy.errors.unexpected);
    expect(within(dialog).queryByRole("button", { name: copy.writes.retry })).toBeNull();
  });
});

describe("F69-4: tras un desconocido al anotar con meta, solo quedan las acciones de recuperación", { timeout: 15000 }, () => {
  it("Guardar deshabilitado; «Reintentar» y «Comprobar estado» siguen", async () => {
    const user = userEvent.setup();
    const funding: GoalFundingActions = {
      loadGoals: vi.fn(async () => ({ ok: true as const, goals: [{ id: "44444444-4444-4444-8444-444444444444", name: "Bici", goalType: "other" as const, status: "active" as const, version: 1, balanceMinor: "100000000", targetMinor: "300000000", progressPercent: 33, members: [{ userId: "11111111-1111-4111-8111-111111111111", availableMinor: "100000000" }] }] })),
      create: vi.fn(async () => ({ status: "unknown" as const })), approve: vi.fn(), reject: vi.fn(), cancel: vi.fn(), removeUsage: vi.fn(), undoExpense: vi.fn(),
      check: vi.fn(async () => ({ state: "not_found" as const })),
    };
    function Trigger() {
      const { openFrom } = useAnnotate();
      return <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>;
    }
    render(<AnnotateProvider actions={actionsWith({})} context="me" today="2026-11-05" goalFunding={funding}><Trigger /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
    await user.type(await screen.findByRole("textbox", { name: copy.annotate.amount }), "40000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await user.click(screen.getByRole("button", { name: new RegExp(`^${copy.goalExpense.paidWith.label}:`) }));
    await user.click(within(screen.getByRole("radiogroup", { name: copy.goalExpense.paidWith.label })).getByRole("radio", { name: copy.goalExpense.paidWith.goal }));
    await user.click(await screen.findByRole("radio", { name: /^Bici/ }));
    const save = screen.getByRole("button", { name: copy.goalExpense.submit.own("$40.000") });
    await user.click(save);
    const alert = await screen.findByRole("alert");
    expect(isDisabled(screen.getByRole("button", { name: copy.goalExpense.submit.own("$40.000") }))).toBe(true);
    expect(within(alert).getByRole("button", { name: copy.writes.retry }).matches(":disabled")).toBe(false);
    expect(within(alert).getByRole("button", { name: copy.writes.check }).matches(":disabled")).toBe(false);
    await user.click(screen.getByRole("button", { name: copy.goalExpense.submit.own("$40.000") }));
    expect(funding.create).toHaveBeenCalledTimes(1);
  });
});
