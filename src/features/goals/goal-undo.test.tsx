// 004 PR C, T042 / FR-042, FR-095; contracts/server-actions.md §3 — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T042): «el deshacer único con tres orígenes». Un solo «Deshacer» pendiente en toda la app
// (F57-8, F57-9 de la 003): mientras el de un aporte sigue sin confirmar, los «Deshacer» de un retiro y de una liquidación
// quedan bloqueados, también desde el teclado; el resultado se aplica por la identidad de la intención y «Comprobar estado»
// consulta `write_status` con la clave del aporte, sin repetir nada. P0-3 añade los orígenes aporte y retiro (el gasto con
// meta llega en el PR D); la liquidación es el origen ya existente de la 003.
import { act, configure, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AnnotateProvider, useAnnotate } from "@/features/expenses/annotate-provider";
import type { SharedActions } from "@/features/expenses/shared-types";
import type { SavedSettlement } from "@/features/balance/types";
import { copy } from "@/lib/copy/es";
import type { GoalActions, SavedEntry } from "./types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/metas" }));

const contribution: SavedEntry = { id: "11111111-1111-4111-8111-111111111111", goalId: "99999999-9999-4999-8999-999999999999", amountMinor: "50000000", availableMinor: "662000000" };
const withdrawal: SavedEntry = { id: "22222222-2222-4222-8222-222222222222", goalId: contribution.goalId, amountMinor: "20000000", availableMinor: "85000000" };
const settlement: SavedSettlement = {
  id: "33333333-3333-4333-8333-333333333333", fromUserId: "a", toUserId: "b", amountMinor: "42990000", settlementDate: "2026-10-26", note: null,
  version: 1, createdAt: "2026-10-26T15:00:00.000Z", createdBy: "b", pendingBeforeMinor: "42990000", pendingAfterMinor: "0",
};

function Offers() {
  const annotate = useAnnotate();
  return (
    <>
      <button type="button" onClick={() => annotate.offerGoalUndo({ kind: "contribution", saved: contribution, message: copy.goals.contribute.done("$500.000", "Japón") })}>aporte</button>
      <button type="button" onClick={() => annotate.offerGoalUndo({ kind: "withdrawal", saved: withdrawal, message: copy.goals.withdrawSheet.done("$200.000", "Japón") })}>retiro</button>
      <button type="button" onClick={() => annotate.offerSettlementUndo(settlement)}>liquidación</button>
    </>
  );
}

describe("Deshacer único con tres orígenes (FR-095)", { timeout: 20000 }, () => {
  it("con el deshacer de un aporte sin confirmar, los de un retiro y una liquidación quedan bloqueados; se resuelve por write_status", async () => {
    const user = userEvent.setup();
    const voidEntry = vi.fn<GoalActions["voidEntry"]>(async () => ({ status: "unknown" }));
    const check = vi.fn<GoalActions["check"]>(async () => ({ state: "completed", value: { entryId: contribution.id } }));
    const goalActions: GoalActions = { create: vi.fn(), update: vi.fn(), complete: vi.fn(), archive: vi.fn(), contribute: vi.fn(), withdraw: vi.fn(), voidEntry, check };
    const voidSettlement = vi.fn<NonNullable<SharedActions["voidSettlement"]>>(async () => ({ status: "ok", value: { id: settlement.id, version: 2 } }));
    const sharedActions: SharedActions = { create: vi.fn(), update: vi.fn(), voidShared: vi.fn(), check: vi.fn(), voidSettlement };
    render(
      <AnnotateProvider actions={{ create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() }} today="2026-10-26" context="us" sharedActions={sharedActions} goalActions={goalActions}>
        <Offers />
      </AnnotateProvider>,
    );

    // Origen 1, aporte: «Deshacer» anula con `undo` y su propia clave; sin respuesta, queda el aviso fijo.
    await user.click(screen.getByRole("button", { name: "aporte" }));
    expect(screen.getByRole("status").textContent).toContain(copy.goals.contribute.done("$500.000", "Japón"));
    await user.click(screen.getByRole("button", { name: copy.annotate.undo }));
    expect(voidEntry).toHaveBeenCalledWith(expect.objectContaining({ entryId: contribution.id, reason: "undo" }));
    const key = voidEntry.mock.calls[0][0].idempotencyKey;
    expect(await screen.findByText(copy.writes.undoUnknown)).toBeTruthy();

    // Origen 2, retiro: su «Deshacer» está bloqueado y no envía nada.
    await user.click(screen.getByRole("button", { name: "retiro" }));
    const blockedWithdrawal = screen.getByRole("button", { name: copy.annotate.undo });
    expect(blockedWithdrawal.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(copy.writes.undoBlocked)).toBeTruthy();
    blockedWithdrawal.focus();
    await user.keyboard("{Enter}");
    expect(voidEntry).toHaveBeenCalledTimes(1);

    // Origen 3, liquidación (003): también bloqueado.
    await user.click(screen.getByRole("button", { name: "liquidación" }));
    const blockedSettlement = screen.getByRole("button", { name: copy.annotate.undo });
    expect(blockedSettlement.getAttribute("aria-disabled")).toBe("true");
    await user.click(blockedSettlement);
    expect(voidSettlement).not.toHaveBeenCalled();

    // «Comprobar estado» consulta la intención del aporte, con su clave, sin repetir el envío.
    await user.click(screen.getByRole("button", { name: copy.writes.check }));
    expect(check).toHaveBeenCalledWith({ action: "void_goal_entry", idempotencyKey: key });
    expect(voidEntry).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(copy.goals.contribute.undone)).toBeTruthy();

    // Resuelto el aporte, el «Deshacer» de la liquidación vuelve a funcionar.
    await user.click(screen.getByRole("button", { name: "liquidación" }));
    await act(async () => { await user.click(screen.getByRole("button", { name: copy.annotate.undo })); });
    expect(voidSettlement).toHaveBeenCalledTimes(1);
  });

  it("deshacer un retiro fuera de la ventana del servidor: rechazo confirmado con su texto (JT225)", async () => {
    const user = userEvent.setup();
    const voidEntry = vi.fn<GoalActions["voidEntry"]>(async () => ({ status: "rejected", error: "goalUndoNotAvailable" }));
    const goalActions: GoalActions = { create: vi.fn(), update: vi.fn(), complete: vi.fn(), archive: vi.fn(), contribute: vi.fn(), withdraw: vi.fn(), voidEntry, check: vi.fn() };
    render(
      <AnnotateProvider actions={{ create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() }} today="2026-10-26" context="me" goalActions={goalActions}>
        <Offers />
      </AnnotateProvider>,
    );
    await user.click(screen.getByRole("button", { name: "retiro" }));
    await user.click(screen.getByRole("button", { name: copy.annotate.undo }));
    expect(await screen.findByText(copy.goals.errors.undoNotAvailable)).toBeTruthy();
    expect(screen.queryByText(copy.writes.undoUnknown)).toBeNull();
  });
});
