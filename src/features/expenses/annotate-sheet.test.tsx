// T077 / FR-030–FR-033, FR-035, FR-036; US-2.1–2.3, US-2.7, US-3.1 — capa: componentes (Vitest + RTL + user-event).
// Criterios literales (tasks.md, T077): «foco en el monto; Guardar solo con monto y categoría; E2 sin «Pagó»,
// «Participan» ni «Reparto» y contexto fijo en Yo; el selector de tipo cambia título, categoría («Ingresos» elegida) y
// botón; E4 bloquea los campos; un error de guardado deja la hoja abierta con los datos y reintenta con la misma clave;
// JT001 muestra la sesión caducada sin perder lo escrito; N fuera de un campo, Enter guarda, Escape cierra; confirmación
// de cambios sin guardar». Y los casos de concurrencia del PR D: doble envío, Deshacer dos veces, Deshacer después de
// editar, promesas rechazadas, respuestas fuera de orden y estado que sobrevive a la navegación.
import { act, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "./annotate-provider";
import type { ActionResult, CreatePayload, ExpenseActions, SavedTransaction, VoidPayload } from "./types";

// La hoja llega en un chunk aparte en su primera apertura (como el aviso de la 001).
configure({ asyncUtilTimeout: 5000 });

const saved = (overrides: Partial<SavedTransaction> = {}): SavedTransaction => ({
  id: "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", type: "expense", categoryId: "market", transactionDate: "2026-11-05",
  description: null, amountMinor: "4500000", version: 1, ...overrides,
});

function deferred<T>() {
  let resolve!: (value: T) => void; let reject!: (error: unknown) => void;
  const promise = new Promise<T>((ok, ko) => { resolve = ok; reject = ko; });
  return { promise, resolve, reject };
}

// Cada acción es un mock que delega en la implementación del caso (o en la de éxito por defecto).
function mockActions(overrides: Partial<ExpenseActions> = {}) {
  return {
    create: vi.fn<ExpenseActions["create"]>(overrides.create ?? (async () => ({ ok: true, value: saved() }))),
    update: vi.fn<ExpenseActions["update"]>(overrides.update ?? (async () => ({ ok: true, value: saved({ version: 2 }) }))),
    voidTransaction: vi.fn<ExpenseActions["voidTransaction"]>(overrides.voidTransaction ?? (async () => ({ ok: true, value: { id: saved().id, version: 2 } }))),
  };
}

function Trigger() {
  const { openFrom, highlightId } = useAnnotate();
  return (
    <>
      <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>
      <span data-testid="highlight">{highlightId ?? ""}</span>
    </>
  );
}

// Simula una navegación del App Router: el layout (y el proveedor) persisten y cambia la página que envuelven.
function Pages() {
  const [page, setPage] = useState("inicio");
  return (
    <>
      <Trigger />
      <p>{page}</p>
      <button type="button" onClick={() => setPage("actividad")}>{copy.nav.activity}</button>
      <input aria-label={copy.activity.searchLabel} />
    </>
  );
}

function setup(actions = mockActions()) {
  const user = userEvent.setup();
  render(<AnnotateProvider actions={actions} recentCategories={["market", "restaurants"]} today="2026-11-05"><Pages /></AnnotateProvider>);
  return { user, actions, trigger: screen.getByRole("button", { name: copy.nav.annotate }) };
}

const sheet = () => screen.findByRole("dialog", { name: copy.annotate.title.expense });
const amount = () => screen.getByRole("textbox", { name: copy.annotate.amount });
const saveButton = () => screen.getByRole("button", { name: /^Guardar/ });
const isDisabled = (element: HTMLElement) => element.getAttribute("aria-disabled") === "true" || element.matches(":disabled");

async function fillMinimum(user: ReturnType<typeof userEvent.setup>, pesos = "45000") {
  await user.type(amount(), pesos);
  await user.click(screen.getByRole("button", { name: copy.categories.market }));
}

afterEach(() => { vi.useRealTimers(); });

// La primera apertura importa el chunk de la hoja; con la suite en paralelo puede pasar de los 5 s por defecto.
describe("Hoja de Anotar (T077)", { timeout: 15000 }, () => {
  it("US-2.1: abre con el foco en el monto, con teclado numérico", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await sheet();
    await waitFor(() => expect(document.activeElement).toBe(amount()));
    expect(amount().getAttribute("inputmode")).toBe("numeric");
  });

  it("US-2.2: Guardar solo se habilita con monto y categoría, sin abrir los detalles", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await sheet();
    expect(isDisabled(saveButton())).toBe(true);
    await user.type(amount(), "45000");
    expect(isDisabled(saveButton())).toBe(true);
    await user.click(screen.getByRole("button", { name: copy.categories.market }));
    expect(isDisabled(saveButton())).toBe(false);
    expect(saveButton().textContent).toContain("$45.000");
    // El resumen dice la fecha (hoy) y que es solo tuyo; nada de pareja (Q2).
    expect(screen.getByText(copy.dates.today)).toBeTruthy();
  });

  it("monto 0 no se puede guardar y lo dice", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await sheet();
    await user.type(amount(), "0");
    await user.click(screen.getByRole("button", { name: copy.categories.market }));
    expect(isDisabled(saveButton())).toBe(true);
    expect(screen.getByText(copy.annotate.errors.amountOutOfRange)).toBeTruthy();
  });

  it("US-2.3: E2 sin «Pagó», «Participan» ni «Reparto», y el contexto fijo en Yo", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    await user.click(within(dialog).getByRole("button", { name: copy.annotate.details }));
    expect(within(dialog).getByRole("textbox", { name: copy.annotate.description })).toBeTruthy();
    expect(within(dialog).getByLabelText(copy.annotate.date)).toBeTruthy();
    expect(within(dialog).getByText(copy.annotate.contextValue)).toBeTruthy();
    for (const word of [/Pagó/, /Participan/, /Reparto/, new RegExp(copy.context.us)]) expect(within(dialog).queryByText(word)).toBeNull();
    // El contexto no es un control: no hay radios ni botones de Yo/Nosotros dentro de la hoja.
    expect(within(dialog).queryByRole("radio", { name: copy.context.me })).toBeNull();
    expect(within(dialog).queryByRole("radio", { name: copy.context.us })).toBeNull();
  });

  it("US-3.1: el selector «Gasto · Ingreso» cambia título, categoría («Ingresos» elegida) y botón", async () => {
    const { user, trigger, actions } = setup();
    await user.click(trigger);
    await sheet();
    const group = screen.getByRole("radiogroup", { name: copy.annotate.type });
    await user.click(within(group).getByRole("radio", { name: copy.annotate.income }));
    expect(await screen.findByRole("dialog", { name: copy.annotate.title.income })).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.categories.income }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("button", { name: copy.categories.market })).toBeNull();
    await user.type(amount(), "86000");
    expect(saveButton().textContent).toContain(copy.annotate.save.income);
    await user.click(saveButton());
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    expect(actions.create.mock.calls[0][0]).toMatchObject({ type: "income", categoryId: "income", amountPesos: "86000", transactionDate: "2026-11-05" });
  });

  it("FR-008: el importe sale como texto de dígitos, nunca como number", async () => {
    const { user, trigger, actions } = setup();
    await user.click(trigger);
    await sheet();
    await fillMinimum(user, "999999999");
    await user.click(saveButton());
    await waitFor(() => expect(actions.create).toHaveBeenCalled());
    const payload = actions.create.mock.calls[0][0];
    expect(typeof payload.amountPesos).toBe("string");
    expect(payload.amountPesos).toBe("999999999");
    expect(payload.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("E4: mientras guarda, los campos quedan bloqueados y el botón dice «Guardando…»", async () => {
    const pending = deferred<ActionResult<SavedTransaction>>();
    const { user, trigger } = setup(mockActions({ create: vi.fn(() => pending.promise) }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    expect(amount().matches(":disabled")).toBe(true);
    expect(isDisabled(screen.getByRole("button", { name: copy.categories.restaurants }))).toBe(true);
    expect(screen.getByRole("button", { name: copy.annotate.saving }).getAttribute("aria-busy")).toBe("true");
    await act(async () => pending.resolve({ ok: true, value: saved() }));
  });

  it("FR-036: doble clic en Guardar envía una sola petición", async () => {
    const pending = deferred<ActionResult<SavedTransaction>>();
    const create = vi.fn(() => pending.promise);
    const { user, trigger } = setup(mockActions({ create }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.dblClick(saveButton());
    await user.keyboard("{Enter}");
    expect(create).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({ ok: true, value: saved() }));
  });

  it("US-2.7: un error de guardado deja la hoja abierta con los datos y Reintentar usa la misma clave", async () => {
    const create = vi.fn<ExpenseActions["create"]>().mockResolvedValueOnce({ ok: false, error: "saveFailed" }).mockResolvedValueOnce({ ok: true, value: saved() });
    const { user, trigger } = setup(mockActions({ create }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(copy.errors.saveFailed);
    // «Reintentar» es un botón aparte, no texto pegado al mensaje (MOTION_SYSTEM.md, Expense Flow; contracts/errors.md).
    const retry = within(alert).getByRole("button", { name: copy.annotate.retry });
    expect(copy.errors.saveFailed).not.toContain(copy.annotate.retry);
    expect(screen.getByRole("dialog", { name: copy.annotate.title.expense })).toBeTruthy();
    expect((amount() as HTMLInputElement).value).toBe("45.000");
    await user.click(retry);
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][0].idempotencyKey).toBe(create.mock.calls[0][0].idempotencyKey);
  });

  it("decisión del fundador: tras un fallo ambiguo los campos quedan bloqueados y solo se reintenta lo mismo", async () => {
    const create = vi.fn<ExpenseActions["create"]>().mockResolvedValueOnce({ ok: false, error: "saveFailed" }).mockResolvedValueOnce({ ok: true, value: saved() });
    const { user, trigger } = setup(mockActions({ create }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await screen.findByRole("alert");
    expect(amount().matches(":disabled")).toBe(true);
    expect(isDisabled(screen.getByRole("button", { name: copy.categories.restaurants }))).toBe(true);
    expect(isDisabled(within(screen.getByRole("radiogroup", { name: copy.annotate.type })).getByRole("radio", { name: copy.annotate.income }))).toBe(true);
    // Guardar sigue disponible: es el mismo reintento que el botón del aviso.
    await user.click(saveButton());
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][0]).toEqual(create.mock.calls[0][0]);
  });

  it("JT001 no bloquea: el servidor no escribió nada y se puede corregir", async () => {
    const { user, trigger } = setup(mockActions({ create: vi.fn(async () => ({ ok: false as const, error: "sessionExpired" as const })) }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await screen.findByRole("alert");
    expect(amount().matches(":disabled")).toBe(false);
  });

  it("una promesa rechazada (sin red hasta el servidor) se trata como error de red y se puede reintentar", async () => {
    const create = vi.fn<ExpenseActions["create"]>().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce({ ok: true, value: saved() });
    const { user, trigger } = setup(mockActions({ create }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(copy.errors.network);
    await user.click(within(alert).getByRole("button", { name: copy.annotate.retry }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][0].idempotencyKey).toBe(create.mock.calls[0][0].idempotencyKey);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("JT001: la sesión caducada se dice sin perder lo escrito", async () => {
    const { user, trigger } = setup(mockActions({ create: vi.fn(async () => ({ ok: false as const, error: "sessionExpired" as const })) }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(copy.errors.sessionExpired);
    const link = within(alert).getByRole("link", { name: copy.account.signInAgain });
    expect(link.getAttribute("target")).toBe("_blank");
    expect((amount() as HTMLInputElement).value).toBe("45.000");
    expect(screen.getByRole("button", { name: copy.categories.market }).getAttribute("aria-pressed")).toBe("true");
  });

  it("FR-035: `N` fuera de un campo abre la hoja; dentro de un campo escribe la letra", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("textbox", { name: copy.activity.searchLabel }));
    await user.keyboard("n");
    expect(screen.queryByRole("dialog")).toBeNull();
    (document.activeElement as HTMLElement).blur();
    await user.keyboard("n");
    expect(await sheet()).toBeTruthy();
  });

  it("FR-035: Enter guarda y Escape cierra la hoja vacía devolviendo el foco", async () => {
    const { user, trigger, actions } = setup();
    await user.click(trigger);
    await sheet();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(amount());
    await user.keyboard("{Enter}");
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
  });

  it("FR-035: Enter con el foco en una categoría la elige y guarda (el recorrido N → monto → categoría → Enter)", async () => {
    const { user, trigger, actions } = setup();
    await user.click(trigger);
    await sheet();
    await user.type(amount(), "45000");
    screen.getByRole("button", { name: copy.categories.restaurants }).focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    expect(actions.create.mock.calls[0][0]).toMatchObject({ categoryId: "restaurants", amountPesos: "45000" });
  });

  it("FR-031a de la 001: con cambios sin guardar, cerrar pide confirmación", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await sheet();
    await user.type(amount(), "12000");
    await user.keyboard("{Escape}");
    const confirm = await screen.findByRole("alertdialog", { name: copy.annotate.discard.expense });
    await waitFor(() => expect(document.activeElement).toBe(within(confirm).getByRole("button", { name: copy.annotate.discard.keep })));
    await user.click(within(confirm).getByRole("button", { name: copy.annotate.discard.keep }));
    expect((amount() as HTMLInputElement).value).toBe("12.000");
    await user.click(screen.getByRole("button", { name: copy.annotate.close }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: copy.annotate.discard.confirm }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("E5: guardar cierra la hoja, resalta la fila nueva y muestra «Gasto guardado» con Deshacer", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const toast = await screen.findByRole("status");
    expect(toast.textContent).toContain(copy.annotate.saved.expense);
    expect(within(toast).getByRole("button", { name: copy.annotate.undo })).toBeTruthy();
    expect(screen.getByTestId("highlight").textContent).toBe(saved().id);
  });

  it("US-2.5: Deshacer anula con motivo `undo` y la versión devuelta; dos clics, una petición", async () => {
    const pending = deferred<ActionResult<{ id: string; version: number }>>();
    const voidTransaction = vi.fn<(payload: VoidPayload) => Promise<ActionResult<{ id: string; version: number }>>>(() => pending.promise);
    const { user, trigger } = setup(mockActions({ voidTransaction }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    const undo = await screen.findByRole("button", { name: copy.annotate.undo });
    await user.dblClick(undo);
    expect(voidTransaction).toHaveBeenCalledTimes(1);
    expect(voidTransaction.mock.calls[0][0]).toMatchObject({ transactionId: saved().id, expectedVersion: 1, reason: "undo" });
    await act(async () => pending.resolve({ ok: true, value: { id: saved().id, version: 2 } }));
    expect((await screen.findByRole("status")).textContent).toContain(copy.annotate.undone.expense);
    expect(screen.getByTestId("highlight").textContent).toBe("");
  });

  it("Deshacer después de editar: la versión cambió y se explica, sin anular nada", async () => {
    const { user, trigger } = setup(mockActions({ voidTransaction: vi.fn(async () => ({ ok: false as const, error: "versionConflict" as const })) }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    expect((await screen.findByRole("alert")).textContent).toContain(copy.annotate.undoChanged);
  });

  it("un Deshacer rechazado ofrece Reintentar con la misma clave", async () => {
    const voidTransaction = vi.fn<ExpenseActions["voidTransaction"]>().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce({ ok: true, value: { id: saved().id, version: 2 } });
    const { user, trigger } = setup(mockActions({ voidTransaction }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(copy.annotate.undoFailed);
    await user.click(within(alert).getByRole("button", { name: copy.annotate.retry }));
    await waitFor(() => expect(voidTransaction).toHaveBeenCalledTimes(2));
    expect(voidTransaction.mock.calls[1][0].idempotencyKey).toBe(voidTransaction.mock.calls[0][0].idempotencyKey);
  });

  it("orden de respuestas: un Deshacer que responde tarde no pisa el toast del guardado siguiente", async () => {
    const late = deferred<ActionResult<{ id: string; version: number }>>();
    const second = saved({ id: "0c5e1f3a-8f1d-4b5a-9c39-2a7d3e9b8c11" });
    const create = vi.fn<ExpenseActions["create"]>().mockResolvedValueOnce({ ok: true, value: saved() }).mockResolvedValueOnce({ ok: true, value: second });
    const { user, trigger } = setup(mockActions({ create, voidTransaction: vi.fn(() => late.promise) }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user, "8000");
    await user.click(saveButton());
    await waitFor(() => expect(screen.getByTestId("highlight").textContent).toBe(second.id));
    await act(async () => late.resolve({ ok: true, value: { id: saved().id, version: 2 } }));
    const toast = screen.getByRole("status");
    expect(toast.textContent).toContain(copy.annotate.saved.expense);
    expect(screen.getByTestId("highlight").textContent).toBe(second.id);
  });

  it("estado que sobrevive a la navegación: el toast y el resaltado siguen, y la hoja siguiente nace vacía con otra clave", async () => {
    const { user, trigger, actions } = setup();
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await screen.findByRole("button", { name: copy.annotate.undo });
    await user.click(screen.getByRole("button", { name: copy.nav.activity }));
    expect(screen.getByText("actividad")).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.annotate.undo })).toBeTruthy();
    expect(screen.getByTestId("highlight").textContent).toBe(saved().id);
    await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
    await sheet();
    expect((amount() as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: copy.categories.market }).getAttribute("aria-pressed")).toBe("false");
    await fillMinimum(user, "1000");
    await user.click(saveButton());
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(2));
    expect(actions.create.mock.calls[1][0].idempotencyKey).not.toBe(actions.create.mock.calls[0][0].idempotencyKey);
  });

  it("Toast: con acción dura 6 s y se pausa mientras tiene el foco", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user, trigger } = setup();
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    const undo = await screen.findByRole("button", { name: copy.annotate.undo });
    act(() => undo.focus());
    await act(async () => { vi.advanceTimersByTime(8000); });
    expect(screen.getByRole("button", { name: copy.annotate.undo })).toBeTruthy();
    act(() => undo.blur());
    await act(async () => { vi.advanceTimersByTime(6100); });
    await waitFor(() => expect(screen.queryByRole("button", { name: copy.annotate.undo })).toBeNull());
  });
});

export type { CreatePayload };
