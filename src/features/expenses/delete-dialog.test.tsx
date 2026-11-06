// T078 / FR-039; US-4.3, US-4.4; Q4 — capa: componentes (Vitest + RTL + user-event).
// Criterio literal (tasks.md, T078): «el diálogo es `alertdialog` con foco inicial en Cancelar, Escape cancela y el foco
// vuelve; […] `JT012` explica que ya se eliminó». Más los casos de concurrencia: doble clic en Eliminar, versión vieja
// (otra pestaña editó) y promesa rechazada con Reintentar y la misma clave.
import { act, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider } from "./annotate-provider";
import { TransactionActions } from "./transaction-actions";
import type { ActionResult, ExpenseActions, SavedTransaction } from "./types";

configure({ asyncUtilTimeout: 5000 });

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/actividad/x" }));

const transaction: SavedTransaction = {
  id: "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", type: "expense", categoryId: "market", transactionDate: "2026-10-03",
  description: "Carulla Laureles", amountMinor: "18640000", version: 3,
};

function setup(voidTransaction: ExpenseActions["voidTransaction"] = vi.fn(async () => ({ ok: true as const, value: { id: transaction.id, version: 4 } }))) {
  const user = userEvent.setup();
  const actions = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn(voidTransaction) };
  render(<AnnotateProvider actions={actions} today="2026-11-05"><TransactionActions transaction={transaction} backHref="/actividad?mes=2026-10" /></AnnotateProvider>);
  return { user, actions, trigger: screen.getByRole("button", { name: copy.remove.action.expense }) };
}

afterEach(() => { router.push.mockReset(); router.refresh.mockReset(); });

describe("Diálogo de eliminar (T078)", () => {
  it("es un `alertdialog` con el foco inicial en Cancelar y dice qué se elimina", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await screen.findByRole("alertdialog", { name: copy.remove.title.expense });
    expect(dialog.textContent).toContain(copy.remove.description("Carulla Laureles", "$186.400"));
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: copy.remove.cancel })));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("US-4.4: Escape cancela sin cambiar nada y el foco vuelve al botón", async () => {
    const { user, trigger, actions } = setup();
    await user.click(trigger);
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await user.click(trigger);
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: copy.remove.cancel }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(actions.voidTransaction).not.toHaveBeenCalled();
  });

  it("US-4.3: Eliminar anula con motivo `delete` y la versión leída, vuelve a Actividad y lo dice, sin Deshacer (Q4)", async () => {
    const { user, trigger, actions } = setup();
    await user.click(trigger);
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: copy.remove.confirm }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/actividad?mes=2026-10"));
    expect(actions.voidTransaction.mock.calls[0][0]).toMatchObject({ transactionId: transaction.id, expectedVersion: 3, reason: "delete" });
    const toast = await screen.findByRole("status");
    expect(toast.textContent).toContain(copy.remove.done.expense);
    expect(within(toast).queryByRole("button", { name: copy.annotate.undo })).toBeNull();
  });

  it("doble clic en Eliminar envía una sola petición", async () => {
    let resolve!: (value: ActionResult<{ id: string; version: number }>) => void;
    const { user, trigger, actions } = setup(() => new Promise((ok) => { resolve = ok; }));
    await user.click(trigger);
    const confirm = within(await screen.findByRole("alertdialog")).getByRole("button", { name: copy.remove.confirm });
    await user.dblClick(confirm);
    expect(actions.voidTransaction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: copy.remove.deleting }).getAttribute("aria-busy")).toBe("true");
    await act(async () => resolve({ ok: true, value: { id: transaction.id, version: 4 } }));
  });

  it("JT012: explica que ya se eliminó", async () => {
    const { user, trigger } = setup(async () => ({ ok: false, error: "alreadyDeleted" }));
    await user.click(trigger);
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: copy.remove.confirm }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain(copy.transaction.errors.alreadyDeleted);
    expect(within(dialog).getByRole("link", { name: copy.remove.backToActivity }).getAttribute("href")).toBe("/actividad?mes=2026-10");
  });

  it("JT011: si otra pestaña lo editó, lo explica y ofrece recargar", async () => {
    const { user, trigger } = setup(async () => ({ ok: false, error: "versionConflict" }));
    await user.click(trigger);
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: copy.remove.confirm }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert.textContent).toContain(copy.transaction.errors.versionConflict);
    await user.click(within(alert).getByRole("button", { name: copy.annotate.reload }));
    expect(router.refresh).toHaveBeenCalled();
  });

  it("una promesa rechazada ofrece Reintentar con la misma clave", async () => {
    const voidTransaction = vi.fn<ExpenseActions["voidTransaction"]>().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce({ ok: true, value: { id: transaction.id, version: 4 } });
    const { user, trigger, actions } = setup(voidTransaction);
    await user.click(trigger);
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: copy.remove.confirm }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert.textContent).toContain(copy.remove.failed);
    await user.click(within(alert).getByRole("button", { name: copy.annotate.retry }));
    await waitFor(() => expect(actions.voidTransaction).toHaveBeenCalledTimes(2));
    expect(actions.voidTransaction.mock.calls[1][0].idempotencyKey).toBe(actions.voidTransaction.mock.calls[0][0].idempotencyKey);
  });
});
