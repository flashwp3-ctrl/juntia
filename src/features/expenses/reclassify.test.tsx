// T044 (spec 003, PR C) / FR-031–FR-036, FR-041; US-8; precisión F47-4 — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T044): «A1 sin el botón en un ingreso ni sin pareja activa; A2 con importe y pagador fijos;
// A3 con ChangePreview solo con cifras de Sara; A4 con «movido desde Yo» y «Deshacer»; A5 en sus dos variantes (rechazo
// confirmado frente a resultado desconocido con «Comprobar estado»)». Cifras del escenario hipotético de Q18 (04·10):
// Farmacia Pasteur $64.000 al 50/50 sobre octubre — privados 412.900 → 348.900, parte 1.500.000 → 1.532.000, Nosotros
// 2.840.000 → 2.904.000 y «Tomás le debe a Sara» 429.900 → 461.900.
import { configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider } from "./annotate-provider";
import { MoveToCouple } from "./reclassify-move";
import type { ExpenseActions, SavedTransaction } from "./types";
import type { CoupleForSheet, MovePreviewBase, SavedShared, SharedActions } from "./shared-types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/actividad/x" }));

const SARA = "11111111-1111-4111-8111-111111111111";
const TOMAS = "22222222-2222-4222-8222-222222222222";
const couple: CoupleForSheet = { members: [{ userId: SARA, name: "Sara", joinOrder: 1, isMe: true }, { userId: TOMAS, name: "Tomás", joinOrder: 2, isMe: false }], last: null };
const pharmacy: SavedTransaction = { id: "5d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", type: "expense", categoryId: "health", transactionDate: "2026-10-23", description: "Farmacia Pasteur", amountMinor: "6400000", version: 1 };
const base: MovePreviewBase = { month: "2026-10", privateMinor: "41290000", sharedPartMinor: "150000000", coupleTotalMinor: "284000000", balance: [{ userId: SARA, netMinor: "42990000" }, { userId: TOMAS, netMinor: "-42990000" }] };
const moved: SavedShared = {
  id: "6d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", categoryId: "health", transactionDate: "2026-10-23", description: "Farmacia Pasteur", amountMinor: "6400000",
  payerUserId: SARA, splitMode: "equal", splitPercents: null, parts: { [SARA]: "3200000", [TOMAS]: "3200000" }, version: 1, createdBy: SARA, updatedBy: null, updatedAt: "2026-11-05T15:00:00.000Z", movedFromMe: true,
};
const noPrivate: ExpenseActions = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
function sharedActions(overrides: Partial<SharedActions> = {}): SharedActions {
  return {
    create: vi.fn(), update: vi.fn(), voidShared: vi.fn(),
    check: vi.fn(async () => ({ state: "not_found" as const })),
    reclassify: vi.fn(async () => ({ status: "ok" as const, value: { voidedPrivateId: pharmacy.id, shared: moved } })),
    undoReclassify: vi.fn(async () => ({ status: "ok" as const, value: { restoredPrivateId: "8d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10" } })),
    previewMove: vi.fn(async () => ({ ok: true as const, value: base })),
    ...overrides,
  };
}

function setup({ transaction = pharmacy, shared = sharedActions(), withCouple = true }: { transaction?: SavedTransaction; shared?: SharedActions; withCouple?: boolean } = {}) {
  const user = userEvent.setup();
  render(
    <AnnotateProvider actions={noPrivate} sharedActions={shared} couple={withCouple ? couple : null} context="me" today="2026-11-05">
      <MoveToCouple transaction={transaction} />
    </AnnotateProvider>,
  );
  return { user, shared };
}
const startMove = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: copy.move.action }));
  return screen.findByRole("dialog", { name: copy.move.action });
};
const toPreview = async (user: ReturnType<typeof userEvent.setup>) => {
  const dialog = await startMove(user);
  await user.click(within(dialog).getByRole("button", { name: copy.move.review }));
  return within(dialog).findByRole("list", { name: copy.move.preview.title("octubre") });
};

afterEach(() => { Object.values(router).forEach((fn) => fn.mockClear()); });

describe("A1 (US-8.1, FR-032)", () => {
  it("un gasto privado propio con pareja activa tiene «Mover a Pareja» con su explicación", () => {
    setup();
    expect(screen.getByRole("button", { name: copy.move.action })).toBeTruthy();
    expect(screen.getByText(copy.move.explain("Tomás"))).toBeTruthy();
  });

  it("un ingreso no tiene el botón", () => {
    setup({ transaction: { ...pharmacy, type: "income", categoryId: "income" } });
    expect(screen.queryByRole("button", { name: copy.move.action })).toBeNull();
  });

  it("sin pareja activa no hay botón", () => {
    setup({ withCouple: false });
    expect(screen.queryByRole("button", { name: copy.move.action })).toBeNull();
  });
});

describe("A2 (US-8.2): importe y pagador fijos", () => {
  it("el importe y «Pagó Sara» dicen «Se mantiene»; se eligen participantes y reparto", async () => {
    const { user } = setup();
    const dialog = await startMove(user);
    expect(within(dialog).getByText("$64.000")).toBeTruthy();
    expect(within(dialog).getAllByText(copy.move.kept)).toHaveLength(2);
    expect(within(dialog).queryByRole("textbox", { name: copy.annotate.amount })).toBeNull();
    expect((within(dialog).getByRole("checkbox", { name: /^Tomás/ }) as HTMLInputElement).checked).toBe(true);
    expect((within(dialog).getByRole("radio", { name: copy.shared.mode.equal }))?.getAttribute("aria-checked")).toBe("true");
    expect(within(dialog).getByText(copy.shared.summary.parts([["Sara", "$32.000"], ["Tomás", "$32.000"]]))).toBeTruthy();
  });
});

describe("A3 (US-8.3, FR-041): ChangePreview solo con cifras de Sara", () => {
  it("privados, parte, Nosotros y saldo, antes y después, y «Tomás verá Farmacia Pasteur en Nosotros»", async () => {
    const { user } = setup();
    const list = await toPreview(user);
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      copy.move.preview.row(copy.move.preview.private, "$412.900", "$348.900"),
      copy.move.preview.row(copy.move.preview.sharedPart, "$1.500.000", "$1.532.000"),
      copy.move.preview.row(copy.move.preview.couple, "$2.840.000", "$2.904.000"),
      copy.move.preview.row(copy.move.preview.owes("Tomás", "Sara"), "$429.900", "$461.900"),
    ]);
    expect(screen.getByText(copy.move.preview.visibility("Tomás", "Farmacia Pasteur"))).toBeTruthy();
    expect(screen.getByText(copy.move.preview.paidNote("Sara", "$64.000", "$32.000"))).toBeTruthy();
  });
});

describe("A4 (US-8.4–8.6)", () => {
  it("confirmar mueve con la versión, avisa con «Deshacer», pasa a Nosotros y lleva a Actividad del mes", async () => {
    const { user, shared } = setup();
    await toPreview(user);
    await user.click(screen.getByRole("button", { name: copy.move.confirm }));
    await waitFor(() => expect(shared.reclassify).toHaveBeenCalledWith(expect.objectContaining({ transactionId: pharmacy.id, expectedVersion: 1, splitMode: "equal", participants: [SARA, TOMAS] })));
    expect(await screen.findByText(copy.move.done("Tomás", "Sara", "$461.900"))).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.annotate.undo })).toBeTruthy();
    expect(router.push).toHaveBeenCalledWith("/actividad?mes=2026-10");
  });

  it("«Deshacer» llama a la operación propia con la versión del compartido", async () => {
    const { user, shared } = setup();
    await toPreview(user);
    await user.click(screen.getByRole("button", { name: copy.move.confirm }));
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    await waitFor(() => expect(shared.undoReclassify).toHaveBeenCalledWith(expect.objectContaining({ sharedTransactionId: moved.id, expectedVersion: 1 })));
    expect(await screen.findByText(copy.move.undone)).toBeTruthy();
  });

  it("si el servidor rechaza el deshacer (JT117), lo explica", async () => {
    const { user } = setup({ shared: sharedActions({ undoReclassify: vi.fn(async () => ({ status: "rejected" as const, error: "undoNotAvailable" as const })) }) });
    await toPreview(user);
    await user.click(screen.getByRole("button", { name: copy.move.confirm }));
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    expect(await screen.findByText(copy.move.errors.undoNotAvailable)).toBeTruthy();
  });
});

describe("A5 en sus dos variantes (US-8.8, US-8.9; F47-4)", () => {
  it("rechazo confirmado: dice que no se movió, que sigue en Yo y que no se creó nada en Nosotros", async () => {
    const { user } = setup({ shared: sharedActions({ reclassify: vi.fn(async () => ({ status: "rejected" as const, error: "versionConflict" as const })) }) });
    await toPreview(user);
    await user.click(screen.getByRole("button", { name: copy.move.confirm }));
    expect(await screen.findByText(copy.move.rejected("Farmacia Pasteur"))).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.annotate.close })).toBeTruthy();
  });

  it("resultado desconocido: nunca afirma que no se movió; Reintentar idéntico y Comprobar estado con completed lleva a A4", async () => {
    const reclassify = vi.fn<NonNullable<SharedActions["reclassify"]>>().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "unknown" });
    const check = vi.fn<SharedActions["check"]>(async () => ({ state: "completed", value: { voidedPrivateId: pharmacy.id, shared: moved } }));
    const { user } = setup({ shared: sharedActions({ reclassify, check }) });
    await toPreview(user);
    await user.click(screen.getByRole("button", { name: copy.move.confirm }));
    const alert = await screen.findByRole("alert");
    expect(document.body.textContent ?? "").not.toMatch(/no se movió/i);
    // La intención queda bloqueada: no se puede volver a cambiar el reparto.
    expect(screen.queryByRole("button", { name: copy.move.back })).toBeNull();
    await user.click(within(alert).getByRole("button", { name: copy.writes.retry }));
    await waitFor(() => expect(reclassify).toHaveBeenCalledTimes(2));
    expect(reclassify.mock.calls[1][0]).toEqual(reclassify.mock.calls[0][0]);
    await user.click(within(await screen.findByRole("alert")).getByRole("button", { name: copy.writes.check }));
    await waitFor(() => expect(check).toHaveBeenCalledWith({ action: "reclassify_to_shared", idempotencyKey: reclassify.mock.calls[0][0].idempotencyKey }));
    expect(await screen.findByText(copy.move.done("Tomás", "Sara", "$461.900"))).toBeTruthy();
  });

  it("con el resultado desconocido, cerrar pregunta «¿Cerrar sin confirmar?»", async () => {
    const { user } = setup({ shared: sharedActions({ reclassify: vi.fn(async () => ({ status: "unknown" as const })) }) });
    await toPreview(user);
    await user.click(screen.getByRole("button", { name: copy.move.confirm }));
    await screen.findByRole("alert");
    await user.keyboard("{Escape}");
    expect(await screen.findByRole("alertdialog", { name: copy.writes.close.title })).toBeTruthy();
  });
});
