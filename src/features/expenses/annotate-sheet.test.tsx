// T077 / FR-030–FR-033, FR-035, FR-036; US-2.1–2.3, US-2.7, US-3.1 — capa: componentes (Vitest + RTL + user-event).
// Criterios literales (tasks.md, T077): «foco en el monto; Guardar solo con monto y categoría; E2 sin «Pagó»,
// «Participan» ni «Reparto» y contexto fijo en Yo; el selector de tipo cambia título, categoría («Ingresos» elegida) y
// botón; E4 bloquea los campos; un error de guardado deja la hoja abierta con los datos y reintenta con la misma clave;
// JT001 muestra la sesión caducada sin perder lo escrito; N fuera de un campo, Enter guarda, Escape cierra; confirmación
// de cambios sin guardar». Y los casos de concurrencia del PR D: doble envío, Deshacer dos veces, Deshacer después de
// editar, promesas rechazadas, respuestas fuera de orden y estado que sobrevive a la navegación.
import { act, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import type { WriteOutcome } from "@/features/shared/write-result";
import { AnnotateProvider, useAnnotate, usePendingRows } from "./annotate-provider";
import type { ActionResult, CreatePayload, ExpenseActions, SavedTransaction, VoidPayload } from "./types";

// La hoja llega en un chunk aparte en su primera apertura (como el aviso de la 001).
configure({ asyncUtilTimeout: 5000 });

// F45-2: el proveedor lleva a Actividad cuando la fila nueva no está a la vista.
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

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
    update: vi.fn<ExpenseActions["update"]>(overrides.update ?? (async () => ({ status: "ok", value: saved({ version: 2 }) }))),
    voidTransaction: vi.fn<ExpenseActions["voidTransaction"]>(overrides.voidTransaction ?? (async () => ({ status: "ok", value: { id: saved().id, version: 2 } }))),
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

// Lo que Inicio y Actividad pintan con las filas en vuelo (UX lote 1, cambio 3).
function PendingList() {
  const rows = usePendingRows().filter((row) => row.state === "saving");
  return <ul>{rows.map((row) => <li key={row.key} data-testid="pending-row" data-state={row.state} data-amount={row.transaction.amount.amountMinor.toString()}>{copy.row.pending.saving}</li>)}</ul>;
}

// Simula una navegación del App Router: el layout (y el proveedor) persisten y cambia la página que envuelven.
// `rows`: los movimientos que la página enseña (como ExpenseRow, con `data-transaction-id`).
function Pages({ rows = [] }: { rows?: string[] }) {
  const [page, setPage] = useState("inicio");
  return (
    <>
      <Trigger />
      <p>{page}</p>
      <PendingList />
      <button type="button" onClick={() => setPage("actividad")}>{copy.nav.activity}</button>
      <input aria-label={copy.activity.searchLabel} />
      {rows.map((id) => <a key={id} href={`/actividad/${id}`} data-transaction-id={id}>{id}</a>)}
    </>
  );
}

// Revisión del PR #69: `revalidate` simula la llegada del árbol revalidado tras la Server Action (el layout entrega unos
// `children` nuevos al proveedor), con las filas que traiga la página.
function setup(actions = mockActions(), rows: string[] = []) {
  const user = userEvent.setup();
  const view = render(<AnnotateProvider actions={actions} today="2026-11-05"><Pages rows={rows} /></AnnotateProvider>);
  const revalidate = (next: string[] = rows) => act(() => { view.rerender(<AnnotateProvider actions={actions} today="2026-11-05"><Pages rows={next} /></AnnotateProvider>); });
  return { user, actions, revalidate, trigger: screen.getByRole("button", { name: copy.nav.annotate }) };
}

const sheet = () => screen.findByRole("dialog", { name: copy.annotate.title.expense });
const amount = () => screen.getByRole("textbox", { name: copy.annotate.amount });
const saveButton = () => screen.getByRole("button", { name: /^Guardar/ });
const isDisabled = (element: HTMLElement) => element.getAttribute("aria-disabled") === "true" || element.matches(":disabled");

async function fillMinimum(user: ReturnType<typeof userEvent.setup>, pesos = "45000") {
  await user.type(amount(), pesos);
  await user.click(screen.getByRole("radio", { name: copy.categories.market }));
}

afterEach(() => { vi.useRealTimers(); router.push.mockReset(); });

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
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
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
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    expect(isDisabled(saveButton())).toBe(true);
    expect(screen.getByText(copy.annotate.errors.amountOutOfRange)).toBeTruthy();
  });

  it("US-2.3: la hoja trae todo a la vista, sin «Pagó», «Participan» ni «Reparto», y el contexto fijo en Yo", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    // Sin «Editar detalles» ni «Más…»: descripción, fecha y contexto ya están (comp 06, opción 1c).
    expect(within(dialog).queryByRole("button", { name: /Editar detalles|Más/ })).toBeNull();
    expect(within(dialog).getByRole("textbox", { name: copy.annotate.description })).toBeTruthy();
    expect(within(dialog).getByLabelText(copy.annotate.date)).toBeTruthy();
    expect(within(dialog).getByText(copy.annotate.onlyYou)).toBeTruthy();
    for (const word of [/Pagó/, /Participan/, /Reparto/, new RegExp(copy.context.us)]) expect(within(dialog).queryByText(word)).toBeNull();
    // El contexto no es un control: no hay radios ni botones de Yo/Nosotros dentro de la hoja.
    expect(within(dialog).queryByRole("radio", { name: copy.context.me })).toBeNull();
    expect(within(dialog).queryByRole("radio", { name: copy.context.us })).toBeNull();
  });

  // UX lote 1, cambio 1. Decisión de los fundadores (petición del PR): «La X de cerrar va a la DERECHA en la hoja de Anotar»;
  // sustituye a la comp 02·5, que la ponía a la izquierda.
  it("UX 1: la × de cerrar está a la derecha del título, y sigue cerrando la hoja", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const close = within(dialog).getByRole("button", { name: copy.annotate.close });
    const title = within(dialog).getByRole("heading", { name: copy.annotate.title.expense });
    expect(title.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // En la misma fila del encabezado y en su última columna: nada después de ella.
    const header = title.parentElement!;
    expect(header.contains(close)).toBe(true);
    expect(header.lastElementChild).toBe(close);
    await user.click(close);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: copy.annotate.title.expense })).toBeNull());
  });

  // UX lote 1, cambio 2 (definitivo, aprobado el 6 nov 2026: comp «06 Categoría en Anotar gasto», opción 1c «Rejilla fija de
  // 3 × 3»). Las 9 categorías siempre visibles, en el mismo orden y casilla; la rejilla es un grupo de radio; debajo, SIEMPRE
  // la descripción de una línea; la fecha («Hoy») abre el selector de fecha y «Solo tú» es solo un indicador.
  const ORDER = ["market", "restaurants", "home", "transport", "health", "entertainment", "shopping", "services", "other"] as const;
  const grid = (dialog: HTMLElement) => within(dialog).getByRole("radiogroup", { name: copy.annotate.category });
  const cells = (dialog: HTMLElement) => within(grid(dialog)).getAllByRole("radio");

  it("UX 2: las 9 categorías están a la vista sin interactuar, en la rejilla de 3 × 3 y en el orden de la comp", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    expect(cells(dialog).map((cell) => cell.textContent)).toEqual(ORDER.map((id) => copy.categories[id]));
    expect(grid(dialog).className).toMatch(/grid-cols-3/);
    expect(grid(dialog).className).toMatch(/auto-rows-\[64px\]/); // 3 × 64 + 2 × 8 = 208 px
    expect(grid(dialog).className).not.toMatch(/overflow-x-auto|flex-wrap/);
    // Cada celda: icono encima y nombre debajo, con el color de su categoría; ninguna seleccionada al abrir.
    for (const cell of cells(dialog)) {
      expect(cell.className).toMatch(/flex-col/);
      expect(cell.querySelector("[data-icon]")).toBeTruthy();
      expect(cell.getAttribute("aria-checked")).toBe("false");
    }
    expect(within(dialog).queryByRole("button", { name: /Editar detalles|Más/ })).toBeNull();
  });

  it("UX 2: «Otra» no usa el icono ··· (se lee como «más»): usa Tag de Phosphor", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const other = within(grid(dialog)).getByRole("radio", { name: copy.categories.other });
    expect(other.querySelector("[data-icon]")?.getAttribute("data-icon")).toBe("tag");
    expect(dialog.innerHTML).not.toMatch(/dots-three/);
  });

  it("UX 2: es un grupo de radio: Tab entra en la elegida y las flechas, Inicio y Fin se mueven por la rejilla", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const radio = (id: (typeof ORDER)[number]) => within(grid(dialog)).getByRole("radio", { name: copy.categories[id] });
    const stops = () => cells(dialog).filter((cell) => cell.tabIndex === 0).map((cell) => cell.textContent);
    // Sin elegir, la rejilla entra por la primera.
    expect(stops()).toEqual([copy.categories.market]);
    await user.click(radio("home"));
    expect(radio("home").getAttribute("aria-checked")).toBe("true");
    expect(stops()).toEqual([copy.categories.home]); // Tab entra en la categoría elegida
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(radio("transport"));
    expect(radio("transport").getAttribute("aria-checked")).toBe("true");
    await user.keyboard("{ArrowDown}"); // +3: Transporte → Compras (misma columna)
    expect(document.activeElement).toBe(radio("shopping"));
    await user.keyboard("{ArrowDown}"); // sin fila debajo: se queda
    expect(document.activeElement).toBe(radio("shopping"));
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(radio("transport"));
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(radio("market"));
    await user.keyboard("{ArrowUp}"); // sin fila arriba: se queda
    expect(document.activeElement).toBe(radio("market"));
    await user.keyboard("{ArrowLeft}"); // da la vuelta: Mercado → Otra
    expect(document.activeElement).toBe(radio("other"));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(radio("market"));
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(radio("other"));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(radio("market"));
    expect(radio("market").getAttribute("aria-checked")).toBe("true");
    expect(stops()).toEqual([copy.categories.market]);
  });

  it("UX 2: la descripción está siempre a la vista, se guarda y no es obligatoria", async () => {
    const { user, trigger, actions } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const field = within(dialog).getByRole("textbox", { name: copy.annotate.description });
    expect(field.getAttribute("placeholder")).toBe(copy.annotate.descriptionPlaceholder);
    await fillMinimum(user);
    // Sin descripción se puede guardar.
    expect(isDisabled(saveButton())).toBe(false);
    await user.type(field, "Mercado de la esquina");
    await user.click(saveButton());
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    expect(actions.create.mock.calls[0][0]).toMatchObject({ categoryId: "market", description: "Mercado de la esquina" });
  });

  it("UX 2 (fecha): el chip muestra la fecha, cambiarla desde el chip la guarda", async () => {
    const { user, trigger, actions } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const date = within(dialog).getByLabelText(copy.annotate.date) as HTMLInputElement;
    expect(date.type).toBe("date");
    expect(date.value).toBe("2026-11-05");
    const chip = date.closest("label")!;
    expect(chip.textContent).toContain(copy.dates.today);
    fireEvent.change(date, { target: { value: "2026-11-04" } });
    expect(chip.textContent).toContain(copy.dates.yesterday);
    fireEvent.change(date, { target: { value: "2026-10-04" } });
    expect(chip.textContent).toContain("4 oct");
    fireEvent.change(date, { target: { value: "2026-11-04" } });
    await fillMinimum(user);
    await user.click(saveButton());
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    expect(actions.create.mock.calls[0][0].transactionDate).toBe("2026-11-04");
  });

  it("UX 2 (fecha): vaciar la fecha muestra «Elige una fecha válida.» y no deja guardar", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    await fillMinimum(user);
    fireEvent.change(within(dialog).getByLabelText(copy.annotate.date), { target: { value: "" } });
    expect(within(dialog).getByText(copy.annotate.errors.date)).toBeTruthy();
    expect(isDisabled(saveButton())).toBe(true);
  });

  // Revisión del gestor del PR #51 contra la comp 1c: la hoja abre ajustada al contenido (665 px en 390, no a la altura máxima) y
  // conserva el arrastre hacia arriba; «Guardar sube con el teclado»: va fijo al pie del área desplazable.
  it("UX 2: la hoja móvil abre ajustada al contenido (parada «content», no «full») y sigue siendo arrastrable", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await sheet();
    const bottomSheet = document.querySelector("[data-bottom-sheet]")!;
    expect(bottomSheet.getAttribute("data-stop")).toBe("content");
    expect(document.querySelector("[data-sheet-handle]")).toBeTruthy();
  });

  it("UX 2: Guardar va fijo al pie del área desplazable de la hoja (sticky), con el fondo de la hoja y el safe area", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const dock = saveButton().parentElement!;
    expect(dock.className).toMatch(/max-md:sticky/);
    expect(dock.className).toMatch(/max-md:bottom-0/);
    expect(dock.className).toMatch(/max-md:bg-overlay/);
    expect(dock.className).toMatch(/safe-area-inset-bottom/);
    expect(dialog.contains(dock)).toBe(true);
  });

  // F51-3 (revisión de ChatGPT): el mensaje de fecha inválida se asocia al campo y el chip se activa con ratón y teclado.
  it("F51-3: la fecha inválida asocia su mensaje al campo con aria-describedby y aria-invalid", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const date = within(dialog).getByLabelText(copy.annotate.date);
    expect(date.getAttribute("aria-describedby")).toBeNull();
    fireEvent.change(date, { target: { value: "" } });
    const message = within(dialog).getByText(copy.annotate.errors.date);
    expect(message.id).toBeTruthy();
    expect(date.getAttribute("aria-describedby")).toBe(message.id);
    expect(date.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(date, { target: { value: "2026-11-04" } });
    expect(date.getAttribute("aria-describedby")).toBeNull();
  });

  it("F51-3: pulsar el chip llama a showPicker() cuando existe, y no falla cuando no existe", async () => {
    const showPicker = vi.fn();
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const date = within(dialog).getByLabelText(copy.annotate.date) as HTMLInputElement;
    await user.click(date); // sin showPicker (jsdom): no lanza
    expect(date.value).toBe("2026-11-05");
    Object.defineProperty(date, "showPicker", { configurable: true, value: showPicker });
    await user.click(date);
    expect(showPicker).toHaveBeenCalledTimes(1);
    // Aunque showPicker lance (sin gesto del usuario), el campo nativo sigue usable.
    showPicker.mockImplementationOnce(() => { throw new DOMException("sin gesto", "NotAllowedError"); });
    await user.click(date);
    expect(showPicker).toHaveBeenCalledTimes(2);
  });

  it("F51-3: Tab llega al chip de fecha y Enter o Espacio lo activan", async () => {
    const showPicker = vi.fn();
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const date = within(dialog).getByLabelText(copy.annotate.date) as HTMLInputElement;
    Object.defineProperty(date, "showPicker", { configurable: true, value: showPicker });
    await user.click(within(dialog).getByRole("textbox", { name: copy.annotate.description }));
    await user.tab();
    expect(document.activeElement).toBe(date);
    await user.keyboard("{Enter}");
    expect(showPicker).toHaveBeenCalledTimes(1);
    await user.keyboard(" ");
    expect(showPicker).toHaveBeenCalledTimes(2);
    expect(date.value).toBe("2026-11-05");
  });

  // F51-10 (segunda ronda de ChatGPT): Enter y Espacio solo cancelan la acción nativa si showPicker() existe y no lanza.
  it("F51-10: con showPicker, Enter y Espacio se cancelan (abrieron el selector)", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const date = within(dialog).getByLabelText(copy.annotate.date) as HTMLInputElement;
    Object.defineProperty(date, "showPicker", { configurable: true, value: vi.fn() });
    for (const key of ["Enter", " "]) expect(fireEvent.keyDown(date, { key }), `${key}: cancelado`).toBe(false);
  });

  it("F51-10: sin showPicker, Enter y Espacio conservan su acción nativa", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const date = within(dialog).getByLabelText(copy.annotate.date) as HTMLInputElement;
    expect("showPicker" in date).toBe(false);
    for (const key of ["Enter", " "]) expect(fireEvent.keyDown(date, { key }), `${key}: sin cancelar`).toBe(true);
  });

  it("F51-10: si showPicker lanza, Enter y Espacio conservan su acción nativa", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const date = within(dialog).getByLabelText(copy.annotate.date) as HTMLInputElement;
    Object.defineProperty(date, "showPicker", { configurable: true, value: vi.fn(() => { throw new DOMException("sin gesto", "NotAllowedError"); }) });
    for (const key of ["Enter", " "]) expect(fireEvent.keyDown(date, { key }), `${key}: sin cancelar`).toBe(true);
  });

  it("UX 2: «Solo tú» es un indicador con candado, sin interacción ni flechas de desplegable", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await sheet();
    const label = within(dialog).getByText(copy.annotate.onlyYou);
    const chip = label.closest("span")!;
    expect(chip.querySelector("[data-icon]")?.getAttribute("data-icon")).toBe("lock-simple");
    expect(label.closest("button")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: copy.annotate.onlyYou })).toBeNull();
    expect(dialog.innerHTML).not.toMatch(/caret-down/);
  });

  it("US-3.1: el selector «Gasto · Ingreso» cambia título, categoría («Ingresos» elegida) y botón", async () => {
    const { user, trigger, actions } = setup();
    await user.click(trigger);
    await sheet();
    const group = screen.getByRole("radiogroup", { name: copy.annotate.type });
    await user.click(within(group).getByRole("radio", { name: copy.annotate.income }));
    expect(await screen.findByRole("dialog", { name: copy.annotate.title.income })).toBeTruthy();
    expect(screen.getByRole("radio", { name: copy.categories.income }).getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByRole("radio", { name: copy.categories.market })).toBeNull();
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

  // UX lote 1, cambio 3 sustituye a E4 en la creación: ya no se espera al servidor con la hoja a la vista. Al guardar, la
  // hoja se oculta, la fila aparece al instante marcada «Guardando…» y nada se puede enviar dos veces. E4 sigue igual al editar.
  it("E4 (creación, UX lote 1): al guardar la hoja se oculta y la fila aparece al instante, marcada «Guardando…»", async () => {
    const pending = deferred<ActionResult<SavedTransaction>>();
    const { user, trigger, actions } = setup(mockActions({ create: vi.fn(() => pending.promise) }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    expect(actions.create).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: copy.annotate.title.expense })).toBeNull());
    const row = await screen.findByTestId("pending-row");
    expect(row.getAttribute("data-state")).toBe("saving");
    expect(row.textContent).toContain(copy.row.pending.saving);
    // Todavía no se afirma que se guardó: ni aviso de guardado ni resaltado.
    expect(screen.queryByText(copy.annotate.saved.expense)).toBeNull();
    expect(screen.getByTestId("highlight").textContent).toBe("");
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
    expect(isDisabled(screen.getByRole("radio", { name: copy.categories.restaurants }))).toBe(true);
    expect(isDisabled(within(screen.getByRole("radiogroup", { name: copy.annotate.type })).getByRole("radio", { name: copy.annotate.income }))).toBe(true);
    // Guardar sigue disponible: es el mismo reintento que el botón del aviso.
    await user.click(saveButton());
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][0]).toEqual(create.mock.calls[0][0]);
  });

  it("F45-1: tras un fallo ambiguo, cerrar no afirma que no se guardó; ofrece Reintentar (misma clave) o Cerrar", async () => {
    // El servidor guardó y la respuesta se perdió: para la hoja es un error de red.
    const create = vi.fn<ExpenseActions["create"]>().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce({ ok: true, value: saved() });
    const { user, trigger } = setup(mockActions({ create }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await screen.findByRole("alert");
    await user.keyboard("{Escape}");
    const confirm = await screen.findByRole("alertdialog", { name: copy.annotate.uncertain.title });
    expect(confirm.textContent).toContain(copy.annotate.uncertain.description);
    expect(confirm.textContent).not.toContain(copy.annotate.discard.description);
    expect(document.body.textContent).not.toContain("no se guardará");
    const retry = within(confirm).getByRole("button", { name: copy.annotate.uncertain.retry });
    await waitFor(() => expect(document.activeElement).toBe(retry));
    await user.click(retry);
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][0].idempotencyKey).toBe(create.mock.calls[0][0].idempotencyKey);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("F45-1: «Cerrar» en la confirmación incierta cierra la hoja sin otro envío", async () => {
    const create = vi.fn<ExpenseActions["create"]>().mockResolvedValue({ ok: false, error: "saveFailed" });
    const { user, trigger } = setup(mockActions({ create }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: copy.annotate.close }));
    await user.click(within(await screen.findByRole("alertdialog", { name: copy.annotate.uncertain.title })).getByRole("button", { name: copy.annotate.uncertain.close }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("F45-2: un gasto del mes anterior no se ve en Inicio: lleva a Actividad de su mes con el aviso y el resaltado", async () => {
    const previous = saved({ transactionDate: "2026-10-20" });
    const { user, trigger, revalidate } = setup(mockActions({ create: vi.fn(async () => ({ ok: true as const, value: previous })) }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await screen.findByRole("button", { name: copy.annotate.undo });
    revalidate();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/actividad?mes=2026-10"));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain(copy.annotate.saved.expense);
    expect(screen.getByTestId("highlight").textContent).toBe(previous.id);
  });

  it("F45-2: un gasto del mes en curso que no entra en los 5 recientes lleva a Actividad del mes", async () => {
    const { user, trigger, revalidate } = setup(mockActions(), ["otro-1", "otro-2", "otro-3", "otro-4", "otro-5"]);
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await screen.findByRole("button", { name: copy.annotate.undo });
    revalidate();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/actividad?mes=2026-11"));
  });

  it("F45-2: si la fila nueva ya está a la vista, no se navega (cuadros controlados, sin esperas)", async () => {
    // F51-4: el proveedor mira la fila durante REVEAL_FRAMES cuadros. Se toma el control de requestAnimationFrame y se avanzan
    // cuadro a cuadro: la fila está a la vista, así que no se navega ni al agotar el plazo.
    const frames: FrameRequestCallback[] = [];
    const { user, trigger } = setup(mockActions(), [saved().id]);
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    await user.click(saveButton());
    await screen.findByRole("button", { name: copy.annotate.undo });
    for (let step = 0; step < 70; step++) act(() => { frames.splice(0).forEach((callback) => callback(step * 16)); });
    expect(router.push).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  // Revisión del PR #69: E5 espera el árbol revalidado, no un número de cuadros. Traza en juntia-dev: la acción responde a
  // ~0,4 s y el árbol llega a ~1,4–1,5 s; con 60 cuadros (~1 s) la app llevaba a Actividad aunque la fila iba a salir en Inicio.
  it("E5 con un refresco lento: sin el árbol revalidado no navega aunque pasen 100 cuadros; cuando llega con la fila, la resalta ahí", async () => {
    const frames: FrameRequestCallback[] = [];
    const { user, trigger, revalidate } = setup(mockActions(), []);
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    await user.click(saveButton());
    await screen.findByRole("button", { name: copy.annotate.undo });
    for (let step = 0; step < 100; step++) act(() => { frames.splice(0).forEach((callback) => callback(step * 16)); });
    expect(router.push).not.toHaveBeenCalled();
    revalidate([saved().id]);
    for (let step = 0; step < 10; step++) act(() => { frames.splice(0).forEach((callback) => callback(1600 + step * 16)); });
    expect(router.push).not.toHaveBeenCalled();
    expect(frames).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it("E5: cuando el árbol revalidado llega sin la fila, lleva a Actividad del mes a los pocos cuadros, ni antes de que llegue", async () => {
    const frames: FrameRequestCallback[] = [];
    const { user, trigger, revalidate } = setup(mockActions(), []);
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    await user.click(saveButton());
    await screen.findByRole("button", { name: copy.annotate.undo });
    for (let step = 0; step < 70; step++) act(() => { frames.splice(0).forEach((callback) => callback(step * 16)); });
    expect(router.push).not.toHaveBeenCalled();
    revalidate([]);
    for (let step = 0; step < 5; step++) act(() => { frames.splice(0).forEach((callback) => callback(1200 + step * 16)); });
    expect(router.push).toHaveBeenCalledWith("/actividad?mes=2026-11");
    expect(router.push).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it("E5: si el árbol revalidado no llega nunca, el tope de seguridad (10 s) pide otro y lleva a Actividad", async () => {
    const frames: FrameRequestCallback[] = [];
    const { user, trigger } = setup(mockActions(), []);
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    await user.click(saveButton());
    await screen.findByRole("button", { name: copy.annotate.undo });
    now = 9_900;
    act(() => { frames.splice(0).forEach((callback) => callback(now)); });
    expect(router.push).not.toHaveBeenCalled();
    now = 10_100;
    act(() => { frames.splice(0).forEach((callback) => callback(now)); });
    expect(router.push).toHaveBeenCalledWith("/actividad?mes=2026-11");
    expect(router.refresh).toHaveBeenCalled();
    vi.restoreAllMocks();
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
    expect(screen.getByRole("radio", { name: copy.categories.market }).getAttribute("aria-checked")).toBe("true");
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
    screen.getByRole("radio", { name: copy.categories.restaurants }).focus();
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
    const pending = deferred<WriteOutcome<{ id: string; version: number }>>();
    const voidTransaction = vi.fn<(payload: VoidPayload) => Promise<WriteOutcome<{ id: string; version: number }>>>(() => pending.promise);
    const { user, trigger } = setup(mockActions({ voidTransaction }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    const undo = await screen.findByRole("button", { name: copy.annotate.undo });
    await user.dblClick(undo);
    expect(voidTransaction).toHaveBeenCalledTimes(1);
    expect(voidTransaction.mock.calls[0][0]).toMatchObject({ transactionId: saved().id, expectedVersion: 1, reason: "undo" });
    await act(async () => pending.resolve({ status: "ok", value: { id: saved().id, version: 2 } }));
    expect((await screen.findByRole("status")).textContent).toContain(copy.annotate.undone.expense);
    expect(screen.getByTestId("highlight").textContent).toBe("");
  });

  it("Deshacer después de editar: la versión cambió y se explica, sin anular nada", async () => {
    const { user, trigger } = setup(mockActions({ voidTransaction: vi.fn(async () => ({ status: "rejected" as const, error: "versionConflict" as const })) }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    expect((await screen.findByRole("alert")).textContent).toContain(copy.annotate.undoChanged);
  });

  it("un Deshacer rechazado ofrece Reintentar con la misma clave", async () => {
    const voidTransaction = vi.fn<ExpenseActions["voidTransaction"]>().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce({ status: "ok", value: { id: saved().id, version: 2 } });
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
    const late = deferred<WriteOutcome<{ id: string; version: number }>>();
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
    await act(async () => late.resolve({ status: "ok", value: { id: saved().id, version: 2 } }));
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
    expect(screen.getByRole("radio", { name: copy.categories.market }).getAttribute("aria-checked")).toBe("false");
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

// UX lote 1, cambio 3 — fila optimista. Criterios literales (petición de los fundadores): «al guardar un gasto, aparece al
// instante en la lista (Inicio y Actividad) sin esperar a que el servidor revalide. Respeta el contrato de escrituras de la
// 002 (idempotencia y versión): si el servidor rechaza, la fila desaparece y se muestra el error de siempre; si el resultado
// es desconocido, la fila queda marcada como pendiente y nunca se afirma que se guardó o que no se guardó; nunca debe
// quedar una fila duplicada ni fantasma al navegar».
describe("Fila optimista (UX lote 1, cambio 3)", { timeout: 15000 }, () => {
  const pendingRows = () => screen.queryAllByTestId("pending-row");

  it("confirmada: la fila en vuelo desaparece (la real llega con la revalidación), con el aviso y el resaltado de E5", async () => {
    const pending = deferred<ActionResult<SavedTransaction>>();
    const { user, trigger } = setup(mockActions({ create: vi.fn(() => pending.promise) }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    expect(await screen.findAllByTestId("pending-row")).toHaveLength(1);
    expect(pendingRows()[0].getAttribute("data-amount")).toBe("4500000");
    await act(async () => pending.resolve({ ok: true, value: saved() }));
    await waitFor(() => expect(pendingRows()).toHaveLength(0));
    expect(await screen.findByText(copy.annotate.saved.expense)).toBeTruthy();
    expect(screen.getByTestId("highlight").textContent).toBe(saved().id);
  });

  it("rechazada (sesión caducada): la fila desaparece, la hoja vuelve con lo escrito y el aviso de siempre", async () => {
    const create = vi.fn<ExpenseActions["create"]>().mockResolvedValueOnce({ ok: false, error: "sessionExpired" });
    const { user, trigger } = setup(mockActions({ create }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(copy.errors.sessionExpired);
    // React descarta la fila en vuelo cuando termina la transición, un instante después de la respuesta.
    await waitFor(() => expect(pendingRows()).toHaveLength(0));
    expect(screen.getByRole("dialog", { name: copy.annotate.title.expense })).toBeTruthy();
    expect((amount() as HTMLInputElement).value).toBe("45.000");
    expect(screen.queryByText(copy.annotate.saved.expense)).toBeNull();
  });

  // Resultado desconocido, decisión del 7 nov 2026: la fila desaparece y la hoja vuelve BLOQUEADA, con la misma clave para
  // «Reintentar», como la E4 desconocida de la 002. No hay fila «Sin confirmar» ni nada guardado en el navegador.
  it("desconocida (red): la fila desaparece, la hoja vuelve bloqueada con lo escrito y nunca se dice «guardado» ni «no se guardó»", async () => {
    const create = vi.fn<ExpenseActions["create"]>().mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { user, trigger } = setup(mockActions({ create }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(copy.errors.network);
    await waitFor(() => expect(pendingRows()).toHaveLength(0));
    expect(screen.getByRole("dialog", { name: copy.annotate.title.expense })).toBeTruthy();
    expect((amount() as HTMLInputElement).value).toBe("45.000");
    expect(amount().matches(":disabled")).toBe(true);
    const text = document.body.textContent ?? "";
    expect(text).not.toContain(copy.annotate.saved.expense);
    expect(text).not.toMatch(/no se guard|sin confirmar/i);
    expect(screen.getByTestId("highlight").textContent).toBe("");
  });

  it("desconocida y luego reintentada con la misma clave: una sola fila en vuelo y se confirma", async () => {
    const retry = deferred<ActionResult<SavedTransaction>>();
    const create = vi.fn<ExpenseActions["create"]>().mockResolvedValueOnce({ ok: false, error: "saveFailed" }).mockImplementationOnce(() => retry.promise);
    const { user, trigger } = setup(mockActions({ create }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await screen.findByRole("alert");
    await waitFor(() => expect(pendingRows()).toHaveLength(0));
    await user.click(within(screen.getByRole("alert")).getByRole("button", { name: copy.annotate.retry }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][0].idempotencyKey).toBe(create.mock.calls[0][0].idempotencyKey);
    expect(create.mock.calls[1][0]).toEqual(create.mock.calls[0][0]);
    await waitFor(() => expect(pendingRows().map((row) => row.getAttribute("data-state"))).toEqual(["saving"]));
    await act(async () => retry.resolve({ ok: true, value: saved() }));
    expect(await screen.findByText(copy.annotate.saved.expense)).toBeTruthy();
    await waitFor(() => expect(pendingRows()).toHaveLength(0));
  });

  it("la fila en vuelo sobrevive a la navegación (el proveedor vive en el layout) y no se duplica", async () => {
    const pending = deferred<ActionResult<SavedTransaction>>();
    const { user, trigger } = setup(mockActions({ create: vi.fn(() => pending.promise) }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.click(saveButton());
    await screen.findByTestId("pending-row");
    await user.click(screen.getByRole("button", { name: copy.nav.activity }));
    expect(screen.getByText("actividad")).toBeTruthy();
    expect(pendingRows()).toHaveLength(1);
    await act(async () => pending.resolve({ ok: true, value: saved() }));
    await waitFor(() => expect(pendingRows()).toHaveLength(0));
  });

  it("doble envío (clic doble y Enter): una sola petición y una sola fila", async () => {
    const pending = deferred<ActionResult<SavedTransaction>>();
    const create = vi.fn(() => pending.promise);
    const { user, trigger } = setup(mockActions({ create }));
    await user.click(trigger);
    await sheet();
    await fillMinimum(user);
    await user.dblClick(saveButton());
    await user.keyboard("{Enter}");
    expect(create).toHaveBeenCalledTimes(1);
    await screen.findByTestId("pending-row");
    expect(pendingRows()).toHaveLength(1);
    await act(async () => pending.resolve({ ok: true, value: saved() }));
  });

  it("editar no usa fila optimista: conserva E4 con la hoja a la vista", async () => {
    const pending = deferred<WriteOutcome<SavedTransaction>>();
    const actions = mockActions({ update: vi.fn(() => pending.promise) });
    const user = userEvent.setup();
    function EditTrigger() {
      const { openEdit } = useAnnotate();
      return <button type="button" onClick={(event) => openEdit(saved(), event.currentTarget, () => {})}>editar</button>;
    }
    render(<AnnotateProvider actions={actions} today="2026-11-05"><EditTrigger /><PendingList /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: "editar" }));
    await screen.findByRole("dialog", { name: copy.annotate.editTitle.expense });
    await user.type(amount(), "0");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    expect(amount().matches(":disabled")).toBe(true);
    expect(screen.getByRole("dialog", { name: copy.annotate.editTitle.expense })).toBeTruthy();
    expect(pendingRows()).toHaveLength(0);
    await act(async () => pending.resolve({ status: "ok", value: saved({ version: 2 }) }));
  });
});

export type { CreatePayload };
