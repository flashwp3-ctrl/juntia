// T078 / FR-038; US-4.1, US-4.2, US-4.5; Q14, Q15 — capa: componentes (Vitest + RTL + user-event).
// Criterio literal (tasks.md, T078): «la edición no permite cambiar el tipo; `JT011` explica que cambió y ofrece
// recargar; `JT012` explica que ya se eliminó». La edición reusa la hoja de Anotar con la `version` leída (T082).
import { configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider } from "./annotate-provider";
import { TransactionActions } from "./transaction-actions";
import type { ExpenseActions, SavedTransaction } from "./types";

configure({ asyncUtilTimeout: 5000 });

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/actividad/x" }));

const expense: SavedTransaction = {
  id: "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", type: "expense", categoryId: "market", transactionDate: "2026-10-03",
  description: "Carulla Laureles", amountMinor: "4500000", version: 2,
};

function setup(update: ExpenseActions["update"] = vi.fn(async (payload) => ({ status: "ok" as const, value: { ...expense, version: 3, amountMinor: `${payload.amountPesos}00` } })), transaction = expense) {
  const user = userEvent.setup();
  const actions = { create: vi.fn(), update: vi.fn(update), voidTransaction: vi.fn() };
  render(<AnnotateProvider actions={actions} today="2026-11-05"><TransactionActions transaction={transaction} backHref="/actividad?mes=2026-10" /></AnnotateProvider>);
  return { user, actions, trigger: screen.getByRole("button", { name: copy.detail.edit }) };
}

const amount = () => screen.getByRole("textbox", { name: copy.annotate.amount });

afterEach(() => { router.refresh.mockReset(); });

describe("Edición de un movimiento (T078)", { timeout: 15000 }, () => {
  it("US-4.1: abre la hoja con los valores del movimiento, sin selector de tipo (Q14) ni texto de pareja", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: copy.annotate.editTitle.expense });
    expect(within(dialog).queryByRole("radiogroup", { name: copy.annotate.type })).toBeNull();
    expect(within(dialog).queryByRole("radio", { name: copy.annotate.income })).toBeNull();
    expect((amount() as HTMLInputElement).value).toBe("45.000");
    expect(within(dialog).getByRole("radio", { name: copy.categories.market }).getAttribute("aria-checked")).toBe("true");
    expect((within(dialog).getByRole("textbox", { name: copy.annotate.description }) as HTMLInputElement).value).toBe("Carulla Laureles");
    expect((within(dialog).getByLabelText(copy.annotate.date) as HTMLInputElement).value).toBe("2026-10-03");
    expect(within(dialog).queryByText(/tu pareja|Tomás verá/i)).toBeNull();
    // Un ingreso no ofrece categorías de gasto: el tipo sigue fijo.
    expect(within(dialog).queryByRole("radio", { name: copy.categories.income })).toBeNull();
  });

  it("US-4.2: Guardar cambios envía la versión leída y nunca el tipo", async () => {
    const { user, trigger, actions } = setup();
    await user.click(trigger);
    await screen.findByRole("dialog", { name: copy.annotate.editTitle.expense });
    const save = screen.getByRole("button", { name: copy.annotate.saveChanges });
    expect(save.getAttribute("aria-disabled")).toBe("true");
    await user.clear(amount());
    await user.type(amount(), "47000");
    await user.click(save);
    await waitFor(() => expect(actions.update).toHaveBeenCalledTimes(1));
    const payload = actions.update.mock.calls[0][0];
    expect(payload).toMatchObject({ transactionId: expense.id, expectedVersion: 2, amountPesos: "47000", categoryId: "market", transactionDate: "2026-10-03", description: "Carulla Laureles" });
    expect("type" in payload).toBe(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await screen.findByRole("status")).textContent).toContain(copy.annotate.saved.edit);
  });

  it("Q15 / JT011: la segunda edición con versión vieja falla, lo explica y ofrece recargar sin perder lo escrito", async () => {
    const { user, trigger } = setup(async () => ({ status: "rejected", error: "versionConflict" }));
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.clear(amount());
    await user.type(amount(), "50000");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(copy.transaction.errors.versionConflict);
    expect((amount() as HTMLInputElement).value).toBe("50.000");
    await user.click(within(alert).getByRole("button", { name: copy.annotate.reload }));
    expect(router.refresh).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("JT012: editar un movimiento ya eliminado lo explica", async () => {
    const { user, trigger } = setup(async () => ({ status: "rejected", error: "alreadyDeleted" }));
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.type(within(screen.getByRole("dialog")).getByRole("textbox", { name: copy.annotate.description }), " 2");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    expect((await screen.findByRole("alert")).textContent).toContain(copy.transaction.errors.alreadyDeleted);
  });

  it("un ingreso se edita como ingreso: título, categoría «Ingresos» y nada de categorías de gasto", async () => {
    const { user, trigger } = setup(undefined, { ...expense, type: "income", categoryId: "income", description: "Reembolso" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: copy.annotate.editTitle.income });
    expect(within(dialog).getByRole("radio", { name: copy.categories.income }).getAttribute("aria-checked")).toBe("true");
    expect(within(dialog).queryByRole("radio", { name: copy.categories.market })).toBeNull();
  });
});
