// Revisión de ChatGPT F57 (PR #57, sobre 6c2cbbd) — capa: componentes (Vitest + RTL).
// F57-1: el reparto de un gasto guardado se reconstruye desde su modo (equal siempre los dos; percent desde los
//        porcentajes; amount desde las partes), no desde las partes positivas: un equal de $1 (Sara $1, Tomás $0) sigue
//        siendo equal entre los dos al editar otro campo.
// F57-3: con un borrado en `unknown`, cerrar pide «¿Cerrar sin confirmar?» y «Seguir aquí» conserva la intención.
// F57-4: «Deshacer» de un compartido y de Mover a Pareja usa la máquina del PR B: 15 s y después `unknown`, texto
//        neutro, «Comprobar estado» con `write_status` y reintento con la misma clave; nunca «No pudimos deshacer».
import { act, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "./annotate-provider";
import { SharedTransactionActions } from "./shared-transaction-actions";
import { lastFromSaved, splitFromSaved } from "./split-state";
import type { ExpenseActions } from "./types";
import type { CoupleForSheet, MoveResult, SavedShared, SharedActions } from "./shared-types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/actividad" }));

const SARA = "11111111-1111-4111-8111-111111111111";
const TOMAS = "22222222-2222-4222-8222-222222222222";
const members = [{ userId: SARA, name: "Sara", joinOrder: 1 as const, isMe: true }, { userId: TOMAS, name: "Tomás", joinOrder: 2 as const, isMe: false }];
const couple: CoupleForSheet = { members, last: null };
const expense = (overrides: Partial<SavedShared> = {}): SavedShared => ({
  id: "9d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", categoryId: "market", transactionDate: "2026-11-05", description: "Chicle",
  amountMinor: "100", payerUserId: SARA, splitMode: "equal", splitPercents: null, parts: { [SARA]: "100", [TOMAS]: "0" },
  version: 2, createdBy: SARA, updatedBy: null, updatedAt: "2026-11-05T15:00:00.000Z", movedFromMe: false, ...overrides,
});
const noPrivate: ExpenseActions = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
function sharedActions(overrides: Partial<SharedActions> = {}): SharedActions {
  return {
    create: vi.fn(async () => ({ status: "ok" as const, value: expense({ id: "aa1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", version: 1, amountMinor: "4500000", parts: { [SARA]: "2250000", [TOMAS]: "2250000" } }) })),
    update: vi.fn(async () => ({ status: "ok" as const, value: expense({ version: 3 }) })),
    voidShared: vi.fn(async () => ({ status: "ok" as const, value: { id: expense().id, version: 3 } })),
    check: vi.fn(async () => ({ state: "not_found" as const })),
    ...overrides,
  };
}

afterEach(() => { vi.useRealTimers(); Object.values(router).forEach((fn) => fn.mockClear()); });

describe("F57-1: el reparto guardado sale de su modo, no de las partes positivas", () => {
  it("equal de $1 (Sara $1, Tomás $0): los dos siguen participando, al editar y como lo último usado", () => {
    expect(splitFromSaved(expense(), members)).toMatchObject({ mode: "equal", participants: [SARA, TOMAS] });
    expect(lastFromSaved(expense(), members)).toMatchObject({ splitMode: "equal", participants: [SARA, TOMAS] });
  });

  it("percent 99/1 de $50 (Tomás redondea a $0): sigue siendo percent con los dos", () => {
    const small = expense({ amountMinor: "5000", splitMode: "percent", splitPercents: [99, 1], parts: { [SARA]: "5000", [TOMAS]: "0" } });
    expect(splitFromSaved(small, members)).toMatchObject({ mode: "percent", participants: [SARA, TOMAS], percents: { [SARA]: "99", [TOMAS]: "1" } });
    expect(lastFromSaved(small, members)).toMatchObject({ splitMode: "percent", participants: [SARA, TOMAS], percents: { [SARA]: 99, [TOMAS]: 1 } });
  });

  it("percent 100/0 (un participante guardado así): solo participa quien tiene porcentaje", () => {
    const single = expense({ amountMinor: "8000000", splitMode: "percent", splitPercents: [0, 100], parts: { [SARA]: "0", [TOMAS]: "8000000" } });
    expect(splitFromSaved(single, members)).toMatchObject({ participants: [TOMAS] });
    expect(lastFromSaved(single, members)).toMatchObject({ participants: [TOMAS] });
  });

  it("amount con una parte de 0: esa persona no participa (FR-019a)", () => {
    const amount = expense({ amountMinor: "8000000", splitMode: "amount", parts: { [SARA]: "8000000", [TOMAS]: "0" } });
    expect(splitFromSaved(amount, members)).toMatchObject({ participants: [SARA] });
  });

  it("editar la descripción de un equal de $1 sin tocar Reparto envía equal con los dos", async () => {
    const shared = sharedActions();
    const user = userEvent.setup();
    function Edit() {
      const { openEditShared } = useAnnotate();
      return <button type="button" onClick={(event) => openEditShared(expense(), event.currentTarget, () => {})}>{copy.detail.edit}</button>;
    }
    render(<AnnotateProvider actions={noPrivate} sharedActions={shared} couple={couple} context="us" today="2026-11-05"><Edit /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: copy.detail.edit }));
    const sheet = await screen.findByRole("dialog", { name: copy.annotate.editTitle.expense });
    const description = within(sheet).getByRole("textbox", { name: copy.annotate.description });
    await user.clear(description);
    await user.type(description, "Chicle y menta");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    await waitFor(() => expect(shared.update).toHaveBeenCalledTimes(1));
    expect(vi.mocked(shared.update).mock.calls[0][0]).toMatchObject({ splitMode: "equal", participants: [SARA, TOMAS], percents: null, amountsPesos: null });
  });
});

describe("F57-3: borrar con resultado desconocido", () => {
  it("«Cerrar» pide «¿Cerrar sin confirmar?»; «Seguir aquí» conserva la intención y se comprueba con la misma clave", async () => {
    const voidShared = vi.fn(async () => ({ status: "unknown" as const }));
    const check = vi.fn<SharedActions["check"]>(async () => ({ state: "not_found" }));
    const user = userEvent.setup();
    render(<AnnotateProvider actions={noPrivate} sharedActions={sharedActions({ voidShared, check })} couple={couple} context="us" today="2026-11-05"><SharedTransactionActions expense={expense()} backHref="/actividad?mes=2026-11" /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: copy.remove.action.expense }));
    const dialog = await screen.findByRole("alertdialog", { name: copy.remove.title.expense });
    await user.click(within(dialog).getByRole("button", { name: copy.remove.confirm }));
    await within(dialog).findByText(copy.writes.unknown);
    await user.click(within(dialog).getByRole("button", { name: copy.annotate.uncertain.close }));
    const confirm = await screen.findByRole("alertdialog", { name: copy.writes.close.title });
    await user.click(within(confirm).getByRole("button", { name: copy.writes.close.keep }));
    expect(screen.getByRole("alertdialog", { name: copy.remove.title.expense })).toBeTruthy();
    await user.click(within(screen.getByRole("alertdialog", { name: copy.remove.title.expense })).getByRole("button", { name: copy.writes.check }));
    await waitFor(() => expect(check).toHaveBeenCalledWith({ action: "void_shared_expense", idempotencyKey: (voidShared.mock.calls[0] as unknown as [{ idempotencyKey: string }])[0].idempotencyKey }));
  });
});

describe("F57-4: «Deshacer» con los tres resultados", () => {
  function Annotate() {
    const { openFrom } = useAnnotate();
    return <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>;
  }
  async function saveShared(shared: SharedActions) {
    const user = vi.isFakeTimers() ? userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) }) : userEvent.setup();
    render(<AnnotateProvider actions={noPrivate} sharedActions={shared} couple={couple} context="us" today="2026-11-05"><Annotate /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
    await screen.findByRole("dialog", { name: copy.annotate.title.expense });
    await user.type(screen.getByRole("textbox", { name: copy.annotate.amount }), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    return user;
  }

  it("respuesta perdida tras un deshacer confirmado: texto neutro y «Comprobar estado» con completed lo da por deshecho", async () => {
    const voidShared = vi.fn(async () => ({ status: "unknown" as const }));
    const check = vi.fn<SharedActions["check"]>(async () => ({ state: "completed", value: { id: "aa1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", version: 2 } }));
    const user = await saveShared(sharedActions({ voidShared, check }));
    expect(await screen.findByText(copy.writes.undoUnknown)).toBeTruthy();
    expect(screen.queryByText(copy.annotate.undoFailed)).toBeNull();
    await user.click(screen.getByRole("button", { name: copy.writes.check }));
    await waitFor(() => expect(check).toHaveBeenCalledWith({ action: "void_shared_expense", idempotencyKey: (voidShared.mock.calls[0] as unknown as [{ idempotencyKey: string }])[0].idempotencyKey }));
    expect(await screen.findByText(copy.annotate.undone.expense)).toBeTruthy();
  });

  it("not_found: dice que todavía no consta y «Reintentar» repite con la misma clave", async () => {
    const voidShared = vi.fn<SharedActions["voidShared"]>().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "ok", value: { id: "aa1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", version: 2 } });
    const user = await saveShared(sharedActions({ voidShared }));
    await user.click(await screen.findByRole("button", { name: copy.writes.check }));
    expect(await screen.findByText(copy.writes.notFound)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: copy.writes.retry }));
    await waitFor(() => expect(voidShared).toHaveBeenCalledTimes(2));
    expect(voidShared.mock.calls[1][0]).toEqual(voidShared.mock.calls[0][0]);
    expect(await screen.findByText(copy.annotate.undone.expense)).toBeTruthy();
  });

  it("una promesa colgada más de 15 s pasa a desconocido; la respuesta tardía no pisa nada", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let resolveLate!: (value: Awaited<ReturnType<SharedActions["voidShared"]>>) => void;
    const voidShared = vi.fn(() => new Promise<Awaited<ReturnType<SharedActions["voidShared"]>>>((resolve) => { resolveLate = resolve; }));
    await saveShared(sharedActions({ voidShared }));
    await act(async () => { vi.advanceTimersByTime(15_000); });
    expect(await screen.findByText(copy.writes.undoUnknown)).toBeTruthy();
    await act(async () => { resolveLate({ status: "ok", value: { id: "aa1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", version: 2 } }); });
    expect(screen.queryByText(copy.annotate.undone.expense)).toBeNull();
    expect(screen.getByText(copy.writes.undoUnknown)).toBeTruthy();
  });

  it("«Deshacer» de Mover a Pareja con la respuesta perdida consulta undo_reclassify_to_shared", async () => {
    const moved: MoveResult = { voidedPrivateId: "5d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", shared: expense({ id: "6d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", version: 1, movedFromMe: true, amountMinor: "6400000", parts: { [SARA]: "3200000", [TOMAS]: "3200000" } }) };
    const undoReclassify = vi.fn(async () => ({ status: "unknown" as const }));
    const check = vi.fn<SharedActions["check"]>(async () => ({ state: "completed", value: { restoredPrivateId: "8d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10" } }));
    const reclassify = vi.fn(async () => ({ status: "ok" as const, value: moved }));
    const previewMove = vi.fn(async () => ({ ok: true as const, value: { month: "2026-11", privateMinor: "6400000", sharedPartMinor: "0", coupleTotalMinor: "0", balance: [{ userId: SARA, netMinor: "0" }, { userId: TOMAS, netMinor: "0" }] } }));
    const user = userEvent.setup();
    function Move() {
      const { openMove } = useAnnotate();
      return <button type="button" onClick={(event) => openMove({ id: moved.voidedPrivateId, type: "expense", categoryId: "health", transactionDate: "2026-11-05", description: "Farmacia", amountMinor: "6400000", version: 1 }, event.currentTarget)}>{copy.move.action}</button>;
    }
    render(<AnnotateProvider actions={noPrivate} sharedActions={sharedActions({ reclassify, undoReclassify, check, previewMove })} couple={couple} context="me" today="2026-11-05"><Move /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: copy.move.action }));
    const dialog = await screen.findByRole("dialog", { name: copy.move.action });
    await user.click(within(dialog).getByRole("button", { name: copy.move.review }));
    await within(dialog).findByRole("list");
    await user.click(within(dialog).getByRole("button", { name: copy.move.confirm }));
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    expect(await screen.findByText(copy.writes.undoUnknown)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: copy.writes.check }));
    await waitFor(() => expect(check).toHaveBeenCalledWith({ action: "undo_reclassify_to_shared", idempotencyKey: (undoReclassify.mock.calls[0] as unknown as [{ idempotencyKey: string }])[0].idempotencyKey }));
    expect(await screen.findByText(copy.move.undone)).toBeTruthy();
  });
});
