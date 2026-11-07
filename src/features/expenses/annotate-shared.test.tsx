// T041 (spec 003, PR C) / FR-018–FR-021, FR-019a; US-2 escenarios 1–5, 4a–4f, 7–8 — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T041): «E1 en Nosotros con el último pagador y reparto de esa persona (o «Pagó: yo» y 50/50
// la primera vez), siempre visibles; el selector de participantes (FR-019a: de dos a uno pasa al 100 %; de uno a dos
// restaura solo un reparto con las dos partes positivas, si no 50/50); Porcentaje e Importe; E3 «Faltan $X» y «Sobran
// $X»; E5 con el saldo tachado; la ruta mínima de 2 toques; Anotar en Yo sin Pagó, Participan ni Reparto».
// Diseño aprobado el 7 nov 2026 (Claude Design, «07 Nosotros en Anotar gasto», opción 2a): fila resumen de 60 px bajo la
// rejilla que abre la subhoja «Reparto» (Pagó, Reparto, Participan). Respuestas de los fundadores: (1) se recuerdan
// pagador, reparto y participantes; (2) el peso impar va a join_order 1; (3) en Porcentaje el aviso lleva «(10 %)»;
// (4) con un participante, «Pagó Tomás · 100 % · Sara»; (6) con pareja activa el chip «Solo tú» es el selector Yo/Nosotros.
// E5 con el saldo tachado se prueba en home-couple.test.tsx (BalanceLine), donde vive el saldo.
import { act, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "./annotate-provider";
import type { ExpenseActions, SavedTransaction } from "./types";
import type { CoupleForSheet, SavedShared, SharedActions, SharedCreatePayload } from "./shared-types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const SARA = "11111111-1111-4111-8111-111111111111";
const TOMAS = "22222222-2222-4222-8222-222222222222";
const couple = (last: CoupleForSheet["last"] = null): CoupleForSheet => ({
  members: [{ userId: SARA, name: "Sara", joinOrder: 1, isMe: true }, { userId: TOMAS, name: "Tomás", joinOrder: 2, isMe: false }],
  last,
});

const savedShared = (overrides: Partial<SavedShared> = {}): SavedShared => ({
  id: "9d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", categoryId: "market", transactionDate: "2026-11-05", description: null,
  amountMinor: "18640000", payerUserId: SARA, splitMode: "equal", splitPercents: null, parts: { [SARA]: "9320000", [TOMAS]: "9320000" },
  version: 1, createdBy: SARA, updatedBy: null, updatedAt: "2026-11-05T15:00:00.000Z", movedFromMe: false, ...overrides,
});
const savedPrivate = (): SavedTransaction => ({ id: "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", type: "expense", categoryId: "market", transactionDate: "2026-11-05", description: null, amountMinor: "4500000", version: 1 });

function privateActions(): ExpenseActions {
  return {
    create: vi.fn<ExpenseActions["create"]>(async () => ({ ok: true, value: savedPrivate() })),
    update: vi.fn<ExpenseActions["update"]>(async () => ({ ok: true, value: savedPrivate() })),
    voidTransaction: vi.fn<ExpenseActions["voidTransaction"]>(async () => ({ ok: true, value: { id: savedPrivate().id, version: 2 } })),
  };
}
function sharedActions(overrides: Partial<SharedActions> = {}): SharedActions {
  return {
    create: vi.fn<SharedActions["create"]>(async () => ({ status: "ok", value: savedShared() })),
    update: vi.fn<SharedActions["update"]>(async () => ({ status: "ok", value: savedShared({ version: 2 }) })),
    voidShared: vi.fn<SharedActions["voidShared"]>(async () => ({ status: "ok", value: { id: savedShared().id, version: 2 } })),
    check: vi.fn<SharedActions["check"]>(async () => ({ state: "not_found" })),
    ...overrides,
  };
}

function Trigger() {
  const { openFrom } = useAnnotate();
  return <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>;
}

function setup({ last = null, context = "us", shared = sharedActions(), withCouple = true }: { last?: CoupleForSheet["last"]; context?: "me" | "us"; shared?: SharedActions; withCouple?: boolean } = {}) {
  const user = userEvent.setup();
  const priv = privateActions();
  render(
    <AnnotateProvider actions={priv} sharedActions={shared} couple={withCouple ? couple(last) : null} context={context} today="2026-11-05">
      <Trigger />
    </AnnotateProvider>,
  );
  return { user, priv, shared };
}

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
  return screen.findByRole("dialog", { name: copy.annotate.title.expense });
};
const amount = () => screen.getByRole("textbox", { name: copy.annotate.amount });
const saveButton = () => screen.getByRole("button", { name: /^Guardar/ });
const isDisabled = (element: HTMLElement) => element.getAttribute("aria-disabled") === "true" || element.matches(":disabled");
const summary = () => screen.getByRole("button", { name: new RegExp(`^${copy.shared.summary.open}`) });
const openSplit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(summary());
  return screen.findByRole("heading", { name: copy.shared.split.title });
};
const back = async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: copy.shared.split.back }));
const participant = (name: string) => screen.getByRole("checkbox", { name: new RegExp(`^${name}`) });

afterEach(() => { Object.values(router).forEach((fn) => fn.mockClear()); });

describe("E1 en Nosotros (US-2.1, Q5; decisión 1 de los fundadores)", () => {
  it("la primera vez: «Pagó Sara · 50/50» y los dos participantes, visibles sin abrir nada", async () => {
    const { user } = setup();
    await open(user);
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.paid("Sara", copy.shared.mode.equal));
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.both("Sara", "Tomás"));
    // El chip del contexto es el selector: dice «Nosotros».
    expect((screen.getByRole("radio", { name: copy.context.us }))?.getAttribute("aria-checked")).toBe("true");
  });

  it("con la cantidad, la línea de abajo dice la parte de cada uno: «Sara y Tomás · $93.200 cada uno»", async () => {
    const { user } = setup();
    await open(user);
    await user.type(amount(), "186400");
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.each("Sara y Tomás", "$93.200"));
  });

  it("decisión 2: el peso impar va a la persona 1 — $186.401 al 50/50 → Sara $93.201 · Tomás $93.200", async () => {
    const { user } = setup();
    await open(user);
    await user.type(amount(), "186401");
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.parts([["Sara", "$93.201"], ["Tomás", "$93.200"]]));
  });

  it("recuerda el último pagador, reparto y participantes de esa persona (Tomás · Porcentaje 55/45)", async () => {
    const { user } = setup({ last: { payerUserId: TOMAS, splitMode: "percent", percents: { [SARA]: 55, [TOMAS]: 45 }, participants: [SARA, TOMAS] } });
    await open(user);
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.paid("Tomás", copy.shared.mode.percentOf([55, 45])));
  });

  it("recuerda también un solo participante: «Pagó Tomás · 100 %» sobre «Sara» (decisión 4; comp 02·5 N3)", async () => {
    const { user } = setup({ last: { payerUserId: TOMAS, splitMode: "percent", percents: { [SARA]: 100, [TOMAS]: 0 }, participants: [SARA] } });
    await open(user);
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.single("Tomás"));
    // Comp 02·5 N3 (2a oficial): la segunda línea dice quién asume el gasto.
    expect(summary()?.textContent ?? "").toContain("Sara");
  });
});

describe("Subhoja «Reparto» (2a): Pagó, Reparto y Participan", () => {
  it("Enter en el resumen abre la subhoja con el foco en «Pagó»; Escape vuelve al resumen sin cerrar la hoja", async () => {
    const { user } = setup();
    const dialog = await open(user);
    summary().focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("heading", { name: copy.shared.split.title });
    // T011: el heading se monta antes del requestAnimationFrame que mueve el foco.
    // Esperar al heading no espera ese frame; se observa la condición accesible final.
    await waitFor(() => expect(document.activeElement).toBe(within(screen.getByRole("radiogroup", { name: copy.shared.split.payer })).getByRole("radio", { name: /Sara/ })));
    await user.keyboard("{Escape}");
    expect(dialog).toBeTruthy();
    expect(summary()).toBeTruthy();
  });

  it("FR-019a: de dos a uno, el que queda asume el 100 % y el reparto se deshabilita; al volver, 50/50", async () => {
    const { user } = setup();
    await open(user);
    await user.type(amount(), "186400");
    await openSplit(user);
    await user.click(participant("Tomás"));
    expect(screen.getByText(copy.shared.split.singleNote("Sara"))).toBeTruthy();
    expect((screen.getByRole("radio", { name: copy.shared.mode.equal })).matches(":disabled")).toBe(true);
    await back(user);
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.single("Sara"));
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.one("Sara", "$186.400"));
    await openSplit(user);
    await user.click(participant("Tomás"));
    await back(user);
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.paid("Sara", copy.shared.mode.equal));
  });

  it("FR-019a, US-2.4e: 55/45 → un participante → dos vuelve a 55/45", async () => {
    const { user } = setup({ last: { payerUserId: SARA, splitMode: "percent", percents: { [SARA]: 55, [TOMAS]: 45 }, participants: [SARA, TOMAS] } });
    await open(user);
    await user.type(amount(), "100000");
    await openSplit(user);
    await user.click(participant("Tomás"));
    await user.click(participant("Tomás"));
    await back(user);
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.paid("Sara", copy.shared.mode.percentOf([55, 45])));
  });

  it("FR-019a, US-2.4f: Porcentaje 100/0 → quitar a quien tiene 0 % → añadirla otra vez deja 50/50, no 100/0", async () => {
    const { user } = setup();
    await open(user);
    await user.type(amount(), "80000");
    await openSplit(user);
    await user.click(screen.getByRole("radio", { name: copy.shared.mode.percent }));
    const percents = screen.getAllByRole("textbox", { name: /porcentaje/i });
    await user.clear(percents[0]); await user.type(percents[0], "0");
    await user.clear(percents[1]); await user.type(percents[1], "100");
    await user.click(participant("Sara"));
    await user.click(participant("Sara"));
    await back(user);
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.paid("Sara", copy.shared.mode.equal));
  });

  it("E3 en Importe: «Faltan $20.000 por asignar», Guardar deshabilitado y descrito por el aviso; al volver, el resumen lo dice en rojo", async () => {
    const { user } = setup();
    await open(user);
    await user.type(amount(), "186400");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await openSplit(user);
    await user.click(screen.getByRole("radio", { name: copy.shared.mode.amount }));
    const parts = screen.getAllByRole("textbox", { name: /importe de/i });
    await user.clear(parts[1]); await user.type(parts[1], "73200");
    const notice = screen.getByRole("status", { name: "" });
    expect(screen.getByText(copy.shared.split.missing("$20.000"))).toBeTruthy();
    expect(isDisabled(saveButton())).toBe(true);
    expect(saveButton().getAttribute("aria-describedby") ?? "").not.toBe("");
    expect(notice).toBeTruthy();
    await back(user);
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.paid("Sara", copy.shared.mode.amount));
    expect(summary()?.textContent ?? "").toContain(copy.shared.split.missing("$20.000"));
    expect((summary())?.getAttribute("data-invalid")).toBe("");
  });

  it("E3 en Importe con exceso: «Sobran $X»", async () => {
    const { user } = setup();
    await open(user);
    await user.type(amount(), "100000");
    await openSplit(user);
    await user.click(screen.getByRole("radio", { name: copy.shared.mode.amount }));
    const parts = screen.getAllByRole("textbox", { name: /importe de/i });
    await user.clear(parts[0]); await user.type(parts[0], "60000");
    expect(screen.getByText(copy.shared.split.excess("$10.000"))).toBeTruthy();
  });

  it("decisión 3: en Porcentaje el aviso dice los pesos y el porcentaje — 60 % + 50 % de $186.400 → «Sobran $18.640 (10 %)»", async () => {
    const { user } = setup();
    await open(user);
    await user.type(amount(), "186400");
    await openSplit(user);
    await user.click(screen.getByRole("radio", { name: copy.shared.mode.percent }));
    const percents = screen.getAllByRole("textbox", { name: /porcentaje/i });
    await user.clear(percents[0]); await user.type(percents[0], "60");
    expect(screen.getByText(copy.shared.split.excessPercent("$18.640", 10))).toBeTruthy();
    await user.clear(percents[0]); await user.type(percents[0], "40");
    expect(screen.getByText(copy.shared.split.missingPercent("$18.640", 10))).toBeTruthy();
  });
});

describe("Guardar en Nosotros", () => {
  it("US-2.7, ruta mínima: monto, categoría y Enter guardan con «Pagó: yo» y 50/50 entre los dos", async () => {
    const { user, shared, priv } = setup();
    await open(user);
    await user.type(amount(), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await user.keyboard("{Enter}");
    await waitFor(() => expect(shared.create).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(shared.create).mock.calls[0][0] as SharedCreatePayload;
    expect(payload).toMatchObject({ amountPesos: "45000", categoryId: "market", payerUserId: SARA, splitMode: "equal", participants: [SARA, TOMAS] });
    expect(priv.create).not.toHaveBeenCalled();
    // E5: la hoja se cierra y aparece el aviso con «Deshacer».
    expect(await screen.findByRole("button", { name: copy.annotate.undo })).toBeTruthy();
    expect(screen.getByText(copy.annotate.saved.expense)).toBeTruthy();
  });

  it("US-2.4a: Tomás paga $100.001 y solo participa Sara → se envía un participante y el pagador Tomás", async () => {
    const { user, shared } = setup();
    await open(user);
    await user.type(amount(), "100001");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await openSplit(user);
    await user.click(within(screen.getByRole("radiogroup", { name: copy.shared.split.payer })).getByRole("radio", { name: /Tomás/ }));
    await user.click(participant("Tomás"));
    await user.click(saveButton());
    await waitFor(() => expect(shared.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(shared.create).mock.calls[0][0]).toMatchObject({ payerUserId: TOMAS, participants: [SARA] });
  });

  it("una vez guardado, la siguiente apertura recuerda lo último (Tomás · Porcentaje 70/30)", async () => {
    const shared = sharedActions({ create: vi.fn(async () => ({ status: "ok" as const, value: savedShared({ payerUserId: TOMAS, splitMode: "percent", splitPercents: [70, 30], parts: { [SARA]: "10500000", [TOMAS]: "4500000" } }) })) });
    const { user } = setup({ shared });
    await open(user);
    await user.type(amount(), "150000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await openSplit(user);
    await user.click(within(screen.getByRole("radiogroup", { name: copy.shared.split.payer })).getByRole("radio", { name: /Tomás/ }));
    await user.click(screen.getByRole("radio", { name: copy.shared.mode.percent }));
    const percents = screen.getAllByRole("textbox", { name: /porcentaje/i });
    await user.clear(percents[0]); await user.type(percents[0], "70");
    await user.clear(percents[1]); await user.type(percents[1], "30");
    await user.click(saveButton());
    await screen.findByRole("button", { name: copy.annotate.undo });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await open(user);
    expect(summary()?.textContent ?? "").toContain(copy.shared.summary.paid("Tomás", copy.shared.mode.percentOf([70, 30])));
  });
});

describe("Yo y sin pareja (US-2.8; decisión 6)", () => {
  it("con pareja activa, en Yo no hay Pagó, Participan ni Reparto, y guarda privado", async () => {
    const { user, priv, shared } = setup({ context: "me" });
    await open(user);
    expect((screen.getByRole("radio", { name: copy.annotate.onlyYou }))?.getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByRole("button", { name: new RegExp(`^${copy.shared.summary.open}`) })).toBeNull();
    expect(screen.queryByText(/Pagó/)).toBeNull();
    await user.type(amount(), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await user.click(saveButton());
    await waitFor(() => expect(priv.create).toHaveBeenCalledTimes(1));
    expect(shared.create).not.toHaveBeenCalled();
  });

  it("el selector de la hoja cambia a Nosotros sin tocar el contexto de la app y aparece el resumen", async () => {
    const { user } = setup({ context: "me" });
    await open(user);
    await user.click(screen.getByRole("radio", { name: copy.context.us }));
    expect(summary()).toBeTruthy();
  });

  it("sin pareja activa, «Solo tú» solo informa: no es un control y no hay resumen", async () => {
    const { user } = setup({ withCouple: false, context: "us" });
    await open(user);
    expect(screen.getByText(copy.annotate.onlyYou)).toBeTruthy();
    expect(screen.queryByRole("radio", { name: copy.context.us })).toBeNull();
    expect(screen.queryByRole("button", { name: new RegExp(`^${copy.shared.summary.open}`) })).toBeNull();
  });
});

describe("Resultado desconocido al guardar en Nosotros (FR-059)", () => {
  it("nunca afirma que no se guardó; bloquea la hoja; Reintentar repite la misma clave; Comprobar estado con completed lleva a E5", async () => {
    const create = vi.fn<SharedActions["create"]>().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "unknown" });
    const check = vi.fn<SharedActions["check"]>(async () => ({ state: "completed", value: savedShared() }));
    const { user } = setup({ shared: sharedActions({ create, check }) });
    await open(user);
    await user.type(amount(), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await user.click(saveButton());
    const alert = await screen.findByRole("alert");
    expect(alert?.textContent ?? "").toContain(copy.writes.unknown);
    expect(document.body.textContent ?? "").not.toMatch(/no se guardó/i);
    expect((amount()).matches(":disabled")).toBe(true);
    await user.click(within(alert).getByRole("button", { name: copy.writes.retry }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][0]).toEqual(create.mock.calls[0][0]);
    await user.click(within(await screen.findByRole("alert")).getByRole("button", { name: copy.writes.check }));
    await waitFor(() => expect(check).toHaveBeenCalledWith({ action: "create_shared_expense", idempotencyKey: create.mock.calls[0][0].idempotencyKey }));
    expect(await screen.findByRole("button", { name: copy.annotate.undo })).toBeTruthy();
  });

  it("un rechazo confirmado (JT110) deja los campos editables y dice que no se guardó", async () => {
    const create = vi.fn<SharedActions["create"]>(async () => ({ status: "rejected", error: "invalidSplit" }));
    const { user } = setup({ shared: sharedActions({ create }) });
    await open(user);
    await user.type(amount(), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await user.click(saveButton());
    expect(await screen.findByText(copy.annotate.split.errors.invalid)).toBeTruthy();
    expect((amount()).matches(":disabled")).toBe(false);
  });

  it("cerrar con el resultado desconocido pregunta «¿Cerrar sin confirmar?»", async () => {
    const { user } = setup({ shared: sharedActions({ create: vi.fn(async () => ({ status: "unknown" as const })) }) });
    await open(user);
    await user.type(amount(), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await user.click(saveButton());
    await screen.findByRole("alert");
    await act(async () => { await user.click(screen.getByRole("button", { name: copy.annotate.close })); });
    expect(await screen.findByRole("alertdialog", { name: copy.annotate.uncertain.title })).toBeTruthy();
  });
});
