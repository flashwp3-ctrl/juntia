// «Deshacer» de una creación privada en el deshacer único — capa: componentes (Vitest + RTL). Revisión del PR #74 (decisión del
// gestor del 11 nov 2026): alineación con el contrato de la 003/004 (contracts/server-actions.md §1–§2), como compartidos, metas
// y gasto con meta. Tope de 15 s; un desconocido pasa al aviso fijo con «Reintentar» (la misma clave) y «Comprobar estado»
// (`write_status` con `void_transaction`); cerrarlo pide «¿Cerrar sin confirmar?»; mientras, los demás «Deshacer» se bloquean; un
// rechazo confirmado no ofrece reintento. Cambia el aviso de un deshacer privado desconocido, que antes caducaba.
import { act, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WRITE_TIMEOUT_MS } from "@/features/shared/use-write";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "../annotate-provider";
import type { ExpenseActions, SavedTransaction } from "../types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const FIRST = "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10";
const SECOND = "0c5e1f3a-8f1d-4b5a-9c39-2a7d3e9b8c11";
const saved = (id: string): SavedTransaction => ({ id, type: "expense", categoryId: "market", transactionDate: "2026-11-05", description: null, amountMinor: "4500000", version: 1 });

function Trigger() {
  const { openFrom } = useAnnotate();
  return <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>;
}

function setup(overrides: Partial<ExpenseActions> = {}) {
  const actions: ExpenseActions = {
    create: vi.fn<ExpenseActions["create"]>().mockResolvedValueOnce({ ok: true, value: saved(FIRST) }).mockResolvedValueOnce({ ok: true, value: saved(SECOND) }),
    update: vi.fn(),
    voidTransaction: vi.fn<ExpenseActions["voidTransaction"]>(() => new Promise(() => {})),
    check: vi.fn(async () => ({ state: "completed" as const, value: { id: FIRST, version: 2 } })),
    ...overrides,
  };
  render(<AnnotateProvider actions={actions} context="me" today="2026-11-05"><Trigger /></AnnotateProvider>);
  return { actions, user: userEvent.setup() };
}

async function annotate(user: ReturnType<typeof userEvent.setup>, pesos = "45000") {
  await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
  const sheet = await screen.findByRole("dialog", { name: copy.annotate.title.expense });
  await user.type(within(sheet).getByRole("textbox", { name: copy.annotate.amount }), pesos);
  await user.click(within(sheet).getByRole("radio", { name: copy.categories.market }));
  await user.click(within(sheet).getByRole("button", { name: /^Guardar/ }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

/** Pulsa «Deshacer» y deja pasar los 15 s sin respuesta: el resultado es desconocido. */
async function undoUntilTimeout() {
  const undo = await screen.findByRole("button", { name: copy.annotate.undo });
  vi.useFakeTimers();
  fireEvent.click(undo);
  await act(async () => { await vi.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS + 100); });
  vi.useRealTimers();
}
const pendingNotice = () => screen.getByText(copy.writes.undoUnknown).closest<HTMLElement>("[data-write-unknown]")!;

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Deshacer de una creación privada en el deshacer único", { timeout: 20000 }, () => {
  it("sin respuesta en 15 s: el aviso fijo, con «Reintentar» y «Comprobar estado»; «Reintentar» lleva la misma clave", async () => {
    const { user, actions } = setup();
    await annotate(user);
    await undoUntilTimeout();
    const notice = pendingNotice();
    expect(within(notice).getByRole("button", { name: copy.writes.retry })).toBeTruthy();
    expect(within(notice).getByRole("button", { name: copy.writes.check })).toBeTruthy();
    // No caduca: el aviso con «Deshacer» de esa intención se retiró y no dice ni «deshecho» ni «no se deshizo».
    expect(screen.queryByText(copy.annotate.undone.expense)).toBeNull();
    expect(screen.queryByText(copy.annotate.undoFailed)).toBeNull();
    await user.click(within(notice).getByRole("button", { name: copy.writes.retry }));
    await waitFor(() => expect(actions.voidTransaction).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(actions.voidTransaction).mock.calls.map(([payload]) => payload);
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(second).toMatchObject({ transactionId: FIRST, expectedVersion: 1, reason: "undo" });
  });

  it("«Comprobar estado» con `void_transaction` completado: dice que se deshizo y libera la reserva", async () => {
    const { user, actions } = setup();
    await annotate(user);
    await undoUntilTimeout();
    await user.click(within(pendingNotice()).getByRole("button", { name: copy.writes.check }));
    await waitFor(() => expect(screen.queryByText(copy.writes.undoUnknown)).toBeNull());
    expect(actions.check).toHaveBeenCalledWith({ action: "void_transaction", idempotencyKey: vi.mocked(actions.voidTransaction).mock.calls[0][0].idempotencyKey });
    expect(screen.getByText(copy.annotate.undone.expense)).toBeTruthy();
  });

  it("cerrar el aviso fijo pide «¿Cerrar sin confirmar?»; «Seguir aquí» lo conserva", async () => {
    const { user } = setup();
    await annotate(user);
    await undoUntilTimeout();
    await user.click(within(pendingNotice()).getByRole("button", { name: copy.writes.dismiss }));
    const confirm = await screen.findByRole("alertdialog", { name: copy.writes.close.title });
    await user.click(within(confirm).getByRole("button", { name: copy.writes.close.keep }));
    expect(screen.getByText(copy.writes.undoUnknown)).toBeTruthy();
    await user.click(within(pendingNotice()).getByRole("button", { name: copy.writes.dismiss }));
    await user.click(within(await screen.findByRole("alertdialog", { name: copy.writes.close.title })).getByRole("button", { name: copy.writes.close.confirm }));
    await waitFor(() => expect(screen.queryByText(copy.writes.undoUnknown)).toBeNull());
  });

  it("mientras está reservado, el «Deshacer» de otro gasto queda bloqueado y no envía nada", async () => {
    const { user, actions } = setup();
    await annotate(user);
    await undoUntilTimeout();
    await annotate(user, "8000");
    const blocked = await screen.findByRole("button", { name: copy.annotate.undo });
    expect(blocked.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(copy.writes.undoBlocked)).toBeTruthy();
    await user.click(blocked);
    expect(actions.voidTransaction).toHaveBeenCalledTimes(1);
  });

  it("también mientras corre (antes de los 15 s): la reserva empieza al enviar", async () => {
    const { user, actions } = setup();
    await annotate(user);
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    await annotate(user, "8000");
    const blocked = await screen.findByRole("button", { name: copy.annotate.undo });
    expect(blocked.getAttribute("aria-disabled")).toBe("true");
    await user.click(blocked);
    expect(actions.voidTransaction).toHaveBeenCalledTimes(1);
  });

  it("un rechazo confirmado (la versión cambió) se dice sin ofrecer reintento y libera la reserva", async () => {
    const { user, actions } = setup({ voidTransaction: vi.fn(async () => ({ status: "rejected" as const, error: "versionConflict" as const })) });
    await annotate(user);
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(copy.annotate.undoChanged);
    expect(within(alert).queryByRole("button", { name: copy.annotate.retry })).toBeNull();
    expect(screen.queryByText(copy.writes.undoUnknown)).toBeNull();
    expect(actions.voidTransaction).toHaveBeenCalledTimes(1);
  });
});
