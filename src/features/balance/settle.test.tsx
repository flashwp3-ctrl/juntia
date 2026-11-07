// T059 y T063 (spec 003, PR D) / FR-027–FR-029, FR-051, FR-059; US-6; precisión F47-4 — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T059): «hoja con la dirección fija, «Todo» y «Otro», el máximo en el error, fecha futura
// rechazada; `unknown` sin animación y sin afirmar nada; detalle con «Anular» y el «Deshacer» de 6 s; la liquidación como
// «Liquidado · no es un gasto» en Actividad». Y de T063: «anima solo con `ok`; … con `rejected` o `unknown`, nada».
// Cifras del dataset dorado: `beforeSettlement` (Tomás le debe a Sara 429.900) y la liquidación parcial de 200.000.
import { act, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { computeBalance } from "@/domain/balances";
import { beforeSettlement } from "@/domain/golden/october-2026";
import { moneyFromPesos } from "@/domain/money";
import { AnnotateProvider, useAnnotate } from "@/features/expenses/annotate-provider";
import type { SharedActions } from "@/features/expenses/shared-types";
import { SettlementRow } from "@/features/shared/shared-row";
import { copy } from "@/lib/copy/es";
import { BalancePanel } from "./balance-panel";
import { SettleSheet } from "./settle-sheet";
import { SettlementDetail } from "./settlement-detail";
import type { SavedSettlement, SettlementView } from "./types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/balance" }));

const SARA = "11111111-1111-4111-8111-111111111111";
const TOMAS = "22222222-2222-4222-8222-222222222222";
const KEY = "33333333-3333-4333-8333-333333333333";
const members = [{ userId: SARA, name: "Sara", joinOrder: 1 as const, isMe: true }, { userId: TOMAS, name: "Tomás", joinOrder: 2 as const, isMe: false }];
const ids = { sara: SARA, tomas: TOMAS } as const;
const golden = computeBalance(
  beforeSettlement.expenses.map((row) => ({ ...row, payerUserId: ids[row.payerUserId as "sara" | "tomas"], allocations: row.allocations.map((part) => ({ ...part, userId: ids[part.userId as "sara" | "tomas"] })) })),
  [], [{ userId: SARA, joinOrder: 1 }, { userId: TOMAS, joinOrder: 2 }],
);
const saved = (pesos: bigint): SavedSettlement => ({
  id: "44444444-4444-4444-8444-444444444444", fromUserId: TOMAS, toUserId: SARA, amountMinor: (pesos * 100n).toString(), settlementDate: "2026-10-25", note: null,
  version: 1, createdAt: "2026-10-25T15:00:00.000Z", createdBy: SARA, pendingBeforeMinor: "42990000", pendingAfterMinor: ((429900n - pesos) * 100n).toString(),
});
function actions(overrides: Partial<SharedActions> = {}): SharedActions {
  return {
    create: vi.fn(), update: vi.fn(), voidShared: vi.fn(),
    check: vi.fn(async () => ({ state: "not_found" as const })),
    settle: vi.fn(async () => ({ status: "ok" as const, value: saved(429900n) })),
    voidSettlement: vi.fn(async () => ({ status: "ok" as const, value: { id: saved(1n).id, version: 2 } })),
    ...overrides,
  };
}
const debtor = members[1];
const creditor = members[0];
const sheet = (props: Partial<Parameters<typeof SettleSheet>[0]> = {}) => {
  const onDone = vi.fn();
  const writes = props.actions ?? actions();
  render(<SettleSheet open onClose={vi.fn()} debtor={debtor} creditor={creditor} pending={moneyFromPesos(429900n)} today="2026-10-26" idempotencyKey={KEY} actions={writes} onDone={onDone} {...props} />);
  return { onDone, writes, dialog: screen.getByRole("dialog", { name: copy.balance.settle.title }) };
};

describe("Hoja de liquidación (US-6.1)", { timeout: 15000 }, () => {
  it("la dirección es fija (deudor → acreedor), con el saldo pendiente, «Todo» y «Otro», fecha, nota y el aviso de que no mueve dinero", () => {
    const { dialog } = sheet();
    expect(within(dialog).getByText(copy.balance.settle.direction("Tomás", "Sara"))).toBeTruthy();
    expect(within(dialog).getByText(copy.balance.settle.pending("$429.900"))).toBeTruthy();
    expect(within(dialog).getByRole("radio", { name: copy.balance.settle.all }).getAttribute("aria-checked")).toBe("true");
    expect(within(dialog).getByRole("radio", { name: copy.balance.settle.other })).toBeTruthy();
    expect(within(dialog).getByLabelText(copy.balance.settle.date)).toBeTruthy();
    expect(within(dialog).getByLabelText(copy.balance.settle.note)).toBeTruthy();
    expect(within(dialog).getByText(copy.balance.settle.disclaimer)).toBeTruthy();
    expect(within(dialog).getByText(copy.balance.settle.afterAll)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: copy.balance.settle.submit("$429.900") })).toBeTruthy();
    // No hay forma de invertir la dirección: ningún control elige quién paga a quién.
    expect(within(dialog).queryByRole("radio", { name: /Sara le pagó/ })).toBeNull();
  });

  it("«Otro» por encima del saldo: no se envía y el error dice el máximo (§5.1, US-6.3)", async () => {
    const user = userEvent.setup();
    const { dialog, writes } = sheet();
    await user.click(within(dialog).getByRole("radio", { name: copy.balance.settle.other }));
    const amount = within(dialog).getByRole("textbox", { name: copy.balance.settle.otherAmount });
    await user.type(amount, "500000");
    await user.click(within(dialog).getByRole("button", { name: copy.balance.settle.submit("$500.000") }));
    expect(within(dialog).getByText(copy.balance.settle.errors.exceedsPending("$429.900"))).toBeTruthy();
    expect(writes.settle).not.toHaveBeenCalled();
  });

  it("fecha futura rechazada; hoy y pasada sí (Q10, US-6.10)", async () => {
    const user = userEvent.setup();
    const { dialog, writes } = sheet();
    const date = within(dialog).getByLabelText(copy.balance.settle.date) as HTMLInputElement;
    expect(date.value).toBe("2026-10-26");
    expect(date.max).toBe("2026-10-26");
    await user.clear(date);
    await user.type(date, "2026-10-27");
    await user.click(within(dialog).getByRole("button", { name: copy.balance.settle.submit("$429.900") }));
    expect(within(dialog).getByText(copy.balance.settle.errors.date)).toBeTruthy();
    expect(writes.settle).not.toHaveBeenCalled();
    await user.clear(date);
    await user.type(date, "2026-10-25");
    await user.click(within(dialog).getByRole("button", { name: copy.balance.settle.submit("$429.900") }));
    await waitFor(() => expect(writes.settle).toHaveBeenCalledWith({ idempotencyKey: KEY, amountPesos: "429900", settlementDate: "2026-10-25", note: null }));
  });

  it("«Otro» con 200.000: envía el monto en pesos con la clave de la hoja y dice cómo queda (US-6.2)", async () => {
    const user = userEvent.setup();
    const settle = vi.fn(async () => ({ status: "ok" as const, value: saved(200000n) }));
    const { dialog, onDone } = sheet({ actions: actions({ settle }) });
    await user.click(within(dialog).getByRole("radio", { name: copy.balance.settle.other }));
    await user.type(within(dialog).getByRole("textbox", { name: copy.balance.settle.otherAmount }), "200000");
    expect(within(dialog).getByText(copy.balance.settle.afterPartial("Tomás", "Sara", "$229.900"))).toBeTruthy();
    await user.type(within(dialog).getByLabelText(copy.balance.settle.note), "Transferencia");
    await user.click(within(dialog).getByRole("button", { name: copy.balance.settle.submit("$200.000") }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(saved(200000n)));
    expect(settle).toHaveBeenCalledWith({ idempotencyKey: KEY, amountPesos: "200000", settlementDate: "2026-10-26", note: "Transferencia" });
  });

  it("resultado desconocido: no afirma nada, bloquea los campos y reintenta con la misma clave (FR-059, US-6.5)", async () => {
    const user = userEvent.setup();
    const settle = vi.fn(async () => ({ status: "unknown" as const }));
    const { dialog, onDone } = sheet({ actions: actions({ settle }) });
    await user.click(within(dialog).getByRole("button", { name: copy.balance.settle.submit("$429.900") }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert.textContent).toContain(copy.writes.unknown);
    expect(dialog.textContent).not.toContain(copy.balance.settle.rejected);
    expect(within(dialog).getByRole("radio", { name: copy.balance.settle.other })).toHaveProperty("disabled", true);
    expect(within(dialog).getByLabelText(copy.balance.settle.date)).toHaveProperty("disabled", true);
    await user.click(within(alert).getByRole("button", { name: copy.writes.retry }));
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(2));
    expect(settle.mock.calls.map((call) => (call as unknown as [{ idempotencyKey: string }])[0].idempotencyKey)).toEqual([KEY, KEY]);
    expect(onDone).not.toHaveBeenCalled();
  });

  // Revisión del gestor del PR #60 (3): con el rechazo por saldo, el pendiente que se ve puede ser viejo: el aviso no da cifra.
  it("rechazo confirmado: dice que no se registró, sin un máximo viejo, y los campos siguen editables", async () => {
    const user = userEvent.setup();
    const settle = vi.fn(async () => ({ status: "rejected" as const, error: "exceedsPending" as const }));
    const { dialog } = sheet({ actions: actions({ settle }) });
    await user.click(within(dialog).getByRole("button", { name: copy.balance.settle.submit("$429.900") }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert.textContent).toBe(copy.balance.settle.errors.changed);
    expect(alert.textContent).not.toContain("$");
    expect(within(dialog).getByRole("radio", { name: copy.balance.settle.other })).toHaveProperty("disabled", false);
    // El saldo pudo cambiar: se pide la página otra vez para traer el máximo vigente.
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe("S4 · solo con la confirmación del servidor (T063, FR-051)", () => {
  async function settleFrom(writes: SharedActions) {
    const user = userEvent.setup();
    render(<AnnotateProvider actions={{ create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() }} sharedActions={writes} couple={{ members, last: null }}><BalancePanel balance={golden} members={members} today="2026-10-26" /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: copy.balance.actions.settle }));
    await user.click(within(screen.getByRole("dialog", { name: copy.balance.settle.title })).getByRole("button", { name: copy.balance.settle.submit("$429.900") }));
    return user;
  }
  const balanceRoot = () => document.querySelector("[data-shared-balance]")!;

  it("con `ok`: anima, el saldo llega a «Al día» con LIQUIDADO y se anuncia (MOTION_SYSTEM §3)", async () => {
    await settleFrom(actions());
    await waitFor(() => expect(balanceRoot().getAttribute("data-s4")).toBe("animating"));
    expect(within(balanceRoot() as HTMLElement).getByText(copy.balance.settledBadge)).toBeTruthy();
    expect(document.querySelector('[aria-live="polite"][data-settle-announce]')?.textContent).toBe(copy.balance.settle.announceSettled("Tomás", "Sara"));
    // El aviso con «Deshacer» vive en el proveedor.
    expect(screen.getByRole("status").textContent).toContain(copy.balance.settle.done);
  });

  it("con `unknown`: nada se anima y el saldo sigue igual", async () => {
    await settleFrom(actions({ settle: vi.fn(async () => ({ status: "unknown" as const })) }));
    await screen.findByRole("alert");
    expect(balanceRoot().getAttribute("data-s4")).toBeNull();
    expect(document.querySelector("[data-balance-amount]")?.getAttribute("data-balance-amount")).toBe("$429.900");
  });

  it("con `rejected`: nada se anima y el saldo sigue igual", async () => {
    await settleFrom(actions({ settle: vi.fn(async () => ({ status: "rejected" as const, error: "nothingToSettle" as const })) }));
    await screen.findByText(copy.balance.settle.errors.changed);
    expect(balanceRoot().getAttribute("data-s4")).toBeNull();
    expect(document.querySelector("[data-balance-amount]")?.getAttribute("data-balance-amount")).toBe("$429.900");
  });
});

describe("Cerrar con un registro sin confirmar (revisión del gestor del PR #60, 2)", () => {
  it("cerrar confirmándolo pide la página otra vez: el saldo que se ve puede ser viejo", async () => {
    const user = userEvent.setup();
    router.refresh.mockClear();
    const writes = actions({ settle: vi.fn(async () => ({ status: "unknown" as const })) });
    render(<AnnotateProvider actions={{ create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() }} sharedActions={writes} couple={{ members, last: null }}><BalancePanel balance={golden} members={members} today="2026-10-26" /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: copy.balance.actions.settle }));
    const dialog = screen.getByRole("dialog", { name: copy.balance.settle.title });
    await user.click(within(dialog).getByRole("button", { name: copy.balance.settle.submit("$429.900") }));
    await within(dialog).findByRole("alert");
    expect(router.refresh).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: copy.annotate.close }));
    const close = screen.getByRole("alertdialog", { name: copy.writes.close.title });
    await user.click(within(close).getByRole("button", { name: copy.writes.close.confirm }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: copy.balance.settle.title })).toBeNull());
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe("«Deshacer» de 6 s (US-6.8, Q11)", () => {
  function Offer({ value }: { value: SavedSettlement }) {
    const { offerSettlementUndo } = useAnnotate();
    return <button type="button" onClick={() => offerSettlementUndo(value)}>registrada</button>;
  }
  it("el aviso «Liquidación registrada» ofrece «Deshacer», que anula con `undo` y la versión que devolvió el registro", async () => {
    const user = userEvent.setup();
    const writes = actions();
    render(<AnnotateProvider actions={{ create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() }} sharedActions={writes} couple={{ members, last: null }}><Offer value={saved(200000n)} /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: "registrada" }));
    const toast = screen.getByRole("status");
    expect(toast.textContent).toContain(copy.balance.settle.done);
    await user.click(within(toast).getByRole("button", { name: copy.annotate.undo }));
    await waitFor(() => expect(writes.voidSettlement).toHaveBeenCalledWith(expect.objectContaining({ settlementId: saved(1n).id, expectedVersion: 1, reason: "undo" })));
    expect(await screen.findByText(copy.balance.settle.undone)).toBeTruthy();
  });
});

describe("Detalle de liquidación con «Anular» (US-6.9, enmienda de ADR-007)", () => {
  const view: SettlementView = { id: saved(1n).id, settlementDate: "2026-10-25", createdAt: "2026-10-25T15:00:00.000Z", fromUserId: TOMAS, toUserId: SARA, amount: moneyFromPesos(200000n), status: "active", note: "Transferencia", version: 1, createdBy: SARA, voidedBy: null, voidedAt: null };

  it("«Liquidado · no es un gasto», quién la registró y «Anular» con la confirmación en la opción segura", async () => {
    const user = userEvent.setup();
    const writes = actions();
    render(<SettlementDetail settlement={view} members={members} actions={writes} closeHref="/balance" />);
    expect(screen.getByText(copy.shared.row.settlement)).toBeTruthy();
    expect(screen.getByText("Transferencia")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: copy.balance.settlement.void.action }));
    const confirm = screen.getByRole("alertdialog", { name: copy.balance.settlement.void.title });
    expect(within(confirm).getByRole("button", { name: copy.balance.settlement.void.keep })).toBe(document.activeElement);
    await user.click(within(confirm).getByRole("button", { name: copy.balance.settlement.void.confirm }));
    await waitFor(() => expect(writes.voidSettlement).toHaveBeenCalledWith(expect.objectContaining({ settlementId: view.id, expectedVersion: 1, reason: "void" })));
    expect(router.refresh).toHaveBeenCalled();
  });

  it("Escape cancela sin anular nada", async () => {
    const user = userEvent.setup();
    const writes = actions();
    render(<SettlementDetail settlement={view} members={members} actions={writes} closeHref="/balance" />);
    await user.click(screen.getByRole("button", { name: copy.balance.settlement.void.action }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(writes.voidSettlement).not.toHaveBeenCalled();
  });

  it("una anulada sigue en el historial, marcada, y ya no ofrece «Anular»", () => {
    render(<SettlementDetail settlement={{ ...view, status: "voided", voidedBy: TOMAS, voidedAt: "2026-10-26T15:00:00.000Z", version: 2 }} members={members} actions={actions()} closeHref="/balance" />);
    expect(screen.getByText(copy.balance.settlement.voidedBadge)).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.balance.settlement.void.action })).toBeNull();
  });

  // Revisión del gestor del PR #60 (1), como F57-3: con la anulación sin confirmar, «Cancelar» y Escape no tiran la intención.
  it("con la anulación sin confirmar, cerrar pregunta antes; «Seguir aquí» conserva la clave para reintentar", async () => {
    const user = userEvent.setup();
    router.refresh.mockClear();
    const voidSettlement = vi.fn(async () => ({ status: "unknown" as const }));
    render(<SettlementDetail settlement={view} members={members} actions={actions({ voidSettlement })} closeHref="/balance" />);
    await user.click(screen.getByRole("button", { name: copy.balance.settlement.void.action }));
    const confirm = screen.getByRole("alertdialog", { name: copy.balance.settlement.void.title });
    await user.click(within(confirm).getByRole("button", { name: copy.balance.settlement.void.confirm }));
    await within(confirm).findByRole("alert");
    await user.click(within(confirm).getByRole("button", { name: copy.balance.settlement.void.keep }));
    const close = screen.getByRole("alertdialog", { name: copy.writes.close.title });
    await user.click(within(close).getByRole("button", { name: copy.writes.close.keep }));
    const still = screen.getByRole("alertdialog", { name: copy.balance.settlement.void.title });
    await user.click(within(still).getByRole("button", { name: copy.writes.retry }));
    await waitFor(() => expect(voidSettlement).toHaveBeenCalledTimes(2));
    const keys = voidSettlement.mock.calls.map((call) => (call as unknown as [{ idempotencyKey: string }])[0].idempotencyKey);
    expect(keys[0]).toBe(keys[1]);
    // Cerrar confirmándolo: se va el diálogo y se pide la página (la anulación pudo haberse hecho).
    await user.keyboard("{Escape}");
    await user.click(within(screen.getByRole("alertdialog", { name: copy.writes.close.title })).getByRole("button", { name: copy.writes.close.confirm }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(router.refresh).toHaveBeenCalled();
  });

  it("anular con resultado desconocido no afirma nada y ofrece comprobar el estado", async () => {
    const user = userEvent.setup();
    const writes = actions({ voidSettlement: vi.fn(async () => ({ status: "unknown" as const })) });
    render(<SettlementDetail settlement={view} members={members} actions={writes} closeHref="/balance" />);
    await user.click(screen.getByRole("button", { name: copy.balance.settlement.void.action }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: copy.balance.settlement.void.confirm }));
    const alert = await within(screen.getByRole("alertdialog")).findByRole("alert");
    expect(alert.textContent).toContain(copy.writes.unknown);
    expect(within(alert).getByRole("button", { name: copy.writes.check })).toBeTruthy();
    expect(document.body.textContent).not.toContain(copy.balance.settlement.void.rejected);
  });
});

describe("La liquidación en Actividad (FR-029)", () => {
  it("«Liquidado · no es un gasto», con enlace a su detalle; anulada, marcada", async () => {
    const row = { id: saved(1n).id, fromUserId: TOMAS, toUserId: SARA, amount: moneyFromPesos(200000n), status: "active" as const };
    const { rerender } = render(<SettlementRow settlement={row} members={members} dateLabel="25 oct" href={`/actividad/${row.id}?mes=2026-10`} />);
    const link = screen.getByRole("link", { name: /Tomás → Sara/ });
    expect(link.getAttribute("href")).toBe(`/actividad/${row.id}?mes=2026-10`);
    expect(link.textContent).toContain(copy.shared.row.settlement);
    expect(link.textContent).not.toMatch(/Pagado/);
    await act(async () => rerender(<SettlementRow settlement={{ ...row, status: "voided" }} members={members} dateLabel="25 oct" href="/x" />));
    expect(screen.getByRole("link").textContent).toContain(copy.balance.settlements.voided);
  });
});
