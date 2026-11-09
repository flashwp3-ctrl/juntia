// 004 PR B · T029 [US1] [US2] — capa: componentes (Vitest + RTL), con `next/navigation` simulado.
// Criterio literal (tasks.md, T029): «BudgetIndicator (dentro, cerca, excedido con rayado e ícono, consumo 0 con «Quedan $X ·
// 0 %», sin presupuesto nunca dice 0 %), la hoja (límite no válido, `unknown` con campos bloqueados y «Comprobar estado»,
// conflicto «{nombre} cambió este presupuesto» con el valor vigente), el historial (autor, fecha, anterior y nuevo) Plan sin
// presupuesto (sin «$0», «excedido», «te alcanza») y los iconos del mapa semántico por su identificador exacto en `AppIcon`:
// `chart-pie-slice` (Plan), `warning` (cerca del límite) y `warning-circle` (excedido), siempre con texto».
// Cumple: FR-015–FR-018, FR-020, FR-093, FR-100, FR-103; FR-113; US-1 escenarios 1–5; US-2 escenarios 2, 6 y 7.
// Cifras: parte B del dataset dorado de P0-3 (octoberBudgets) y la US-04 (1.000.000 con un gasto de 1.180.000).
import { act, configure, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { octoberBudgets } from "@/domain/golden/planning-2026";
import { copy } from "@/lib/copy/es";
import { BudgetIndicator } from "./budget-indicator";
import { BudgetSheet } from "./budget-sheet";
import { PlanScreen } from "./plan-screen";
import type { BudgetChange, PlanActions, PlanData, PlanRow, SavedBudget } from "./types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/plan" }));

const KEY = "33333333-3333-4333-8333-333333333333";
const MARKET = "44444444-4444-4444-8444-444444444444";
const minor = (pesos: bigint) => (pesos * 100n).toString();
const names = { sara: "Sara", tomas: "Tomás" } as const;

/** El historial de un presupuesto de la parte B, del más nuevo al más antiguo, como lo construye el servidor. */
function historyOf(budgetId: string, index: number): BudgetChange[] {
  const versions = octoberBudgets[index].versions;
  return versions.map((version, position) => ({
    id: `${budgetId.slice(0, 30)}${String(position).padStart(6, "0")}`,
    budgetId,
    kind: position === 0 ? "create" as const : version.limitPesos > versions[position - 1].limitPesos ? "raise" as const : "lower" as const,
    limitMinor: minor(version.limitPesos),
    previousLimitMinor: position === 0 ? null : minor(versions[position - 1].limitPesos),
    byName: names[version.by],
    changedAt: `${version.date}T17:00:00.000Z`,
    date: version.date,
  })).reverse();
}
const ids = [MARKET, "55555555-5555-4555-8555-555555555555", "66666666-6666-4666-8666-666666666666"];
const goldenRows: PlanRow[] = [
  ...octoberBudgets.map((budget, index) => ({
    categoryId: budget.categoryId, budgetId: ids[index], version: budget.versions.length,
    limitMinor: minor(budget.versions.at(-1)!.limitPesos), consumedMinor: minor(budget.consumedPesos), history: historyOf(ids[index], index),
  })),
  { categoryId: "home", budgetId: null, version: null, limitMinor: null, consumedMinor: minor(1600000n), history: [] },
];
const market = goldenRows[0];
const usData: PlanData = { context: "us", month: "2026-10", today: "2026-10-24", spentMinor: minor(2840000n), rows: goldenRows };
// US-1, escenario 1: Sara en Yo sin presupuestos (gasta 1.912.900 en octubre, en qué se fue).
const meData: PlanData = {
  context: "me", month: "2026-10", today: "2026-10-24", spentMinor: minor(1912900n),
  rows: [
    { categoryId: "market", budgetId: null, version: null, limitMinor: null, consumedMinor: minor(1500000n), history: [] },
    { categoryId: "transport", budgetId: null, version: null, limitMinor: null, consumedMinor: minor(412900n), history: [] },
  ],
};

function actions(overrides: Partial<PlanActions> = {}): PlanActions {
  const saved: SavedBudget = { budgetId: MARKET, version: 3 };
  return {
    create: vi.fn(async () => ({ status: "ok" as const, value: saved })),
    update: vi.fn(async () => ({ status: "ok" as const, value: saved })),
    check: vi.fn(async () => ({ state: "not_found" as const })),
    ...overrides,
  };
}
const icon = (scope: HTMLElement, name: string) => scope.querySelectorAll(`[data-icon='${name}']`).length;
// Ni «$0» ni un 0 % fingido, ni «excedido» sin presupuesto, ni asequibilidad (DEC-R01, DEC-R17; glosario §9).
const NO_BUDGET_FORBIDDEN = /\$0(?![.\d])|\b0 %|excedido|te alcanza|puedes pagarlo/i;

beforeEach(() => { router.refresh.mockClear(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("BudgetIndicator (COMPONENT_SPECIFICATIONS; FR-017, FR-113)", () => {
  const indicator = (row: Partial<PlanRow>, context: "me" | "us" = "us") => {
    const onOpen = vi.fn();
    const { container } = render(<ul><BudgetIndicator row={{ ...market, ...row }} context={context} onOpen={onOpen} /></ul>);
    return { container, onOpen };
  };

  it("dentro: «640.000 de 900.000 · Quedan 260.000», barra con cifras y sin aviso", () => {
    const { container } = indicator({});
    expect(screen.getByText("640.000")).toBeTruthy();
    expect(screen.getByText(copy.plan.of("900.000"))).toBeTruthy();
    expect(screen.getByText(copy.plan.left("$260.000"))).toBeTruthy();
    // Glosario (Restante): «Quedan $X», con el signo; el texto literal, no solo la clave (revisión del gestor del PR #67, 4).
    expect(screen.getByText("Quedan $260.000")).toBeTruthy();
    expect(screen.getByRole("img", { name: copy.plan.bar(copy.categories.market, "640.000", "900.000", 71) })).toBeTruthy();
    expect(icon(container, "warning") + icon(container, "warning-circle")).toBe(0);
    expect(container.querySelector("[data-budget-state]")?.getAttribute("data-budget-state")).toBe("within");
  });

  it("cerca (≥ 85 %): texto con `warning`, CERCA DEL LÍMITE y el porcentaje truncado", () => {
    const { container } = indicator({ categoryId: "restaurants", limitMinor: minor(260000n), consumedMinor: minor(240000n) });
    expect(screen.getByText(copy.plan.leftPercent("$20.000", 92))).toBeTruthy();
    expect(screen.getByText(copy.primitives.nearLimit)).toBeTruthy();
    expect(icon(container, "warning")).toBeGreaterThan(0);
    expect(container.querySelector("[data-budget-state]")?.getAttribute("data-budget-state")).toBe("near");
  });

  it("excedido: barra rayada, `warning-circle`, EXCEDIDO y «Se pasaron por 20.000», nunca solo color", () => {
    const { container } = indicator({ categoryId: "services", limitMinor: minor(340000n), consumedMinor: minor(360000n) });
    expect(screen.getByText(copy.plan.over.us("$20.000", 105))).toBeTruthy();
    expect(screen.getByText(copy.primitives.exceeded)).toBeTruthy();
    expect(screen.getByText("Se pasaron por $20.000 · 105 %")).toBeTruthy();
    expect(icon(container, "warning-circle")).toBeGreaterThan(0);
    expect(container.querySelector("[data-budget-bar]")?.getAttribute("data-striped")).toBe("true");
  });

  it("US-04: 1.000.000 con un gasto de 1.180.000 → 118 % y «Se pasaron por 180.000»; en Yo, «Te pasaste por»", () => {
    indicator({ categoryId: "restaurants", limitMinor: minor(1000000n), consumedMinor: minor(1180000n) });
    expect(screen.getByText(copy.plan.over.us("$180.000", 118))).toBeTruthy();
    expect(screen.getByRole("img", { name: copy.plan.bar(copy.categories.restaurants, "1.180.000", "1.000.000", 118) })).toBeTruthy();
  });

  it("en Yo el excedido se dice en segunda persona", () => {
    indicator({ categoryId: "services", limitMinor: minor(340000n), consumedMinor: minor(360000n) }, "me");
    expect(screen.getByText(copy.plan.over.me("$20.000", 105))).toBeTruthy();
  });

  it("presupuesto activo con consumo 0: «Quedan 900.000 · 0 %» con su barra (distinto de sin presupuesto)", () => {
    const { container } = indicator({ consumedMinor: "0" });
    expect(screen.getByText(copy.plan.leftPercent("$900.000", 0))).toBeTruthy();
    expect(screen.getByRole("img", { name: copy.plan.bar(copy.categories.market, "0", "900.000", 0) })).toBeTruthy();
    expect(container.querySelector("[data-budget-bar]")).toBeTruthy();
  });

  it("sin presupuesto: fila punteada «$1.600.000 · sin presupuesto» con «Crear», sin barra y nunca 0 %", async () => {
    const { container, onOpen } = indicator(goldenRows[3]);
    expect(screen.getByText(copy.plan.noBudget("$1.600.000"))).toBeTruthy();
    expect(container.querySelector("[data-budget-bar]")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.textContent).not.toMatch(NO_BUDGET_FORBIDDEN);
    await userEvent.setup().click(screen.getByRole("button", { name: copy.plan.createFor(copy.categories.home) }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("la fila con presupuesto se abre para editar con su nombre accesible", async () => {
    const { onOpen } = indicator({});
    await userEvent.setup().click(screen.getByRole("button", { name: copy.plan.edit(copy.categories.market) }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ budgetId: MARKET }));
  });
});

describe("Hoja de presupuesto (FR-011, FR-018, FR-093; US-2 escenarios 2, 6 y 7)", { timeout: 15000 }, () => {
  const open = (props: Partial<Parameters<typeof BudgetSheet>[0]> = {}) => {
    const writes = props.actions ?? actions();
    const onDone = vi.fn();
    const onClose = vi.fn();
    const all = { open: true, onClose, context: "us" as const, row: market, rows: goldenRows, month: "2026-10", idempotencyKey: KEY, actions: writes, onDone, ...props };
    const view = render(<BudgetSheet {...all} />);
    return { writes, onDone, onClose, view, all };
  };
  const dialog = (title: string) => screen.getByRole("dialog", { name: title });

  it("límite 0 o vacío: no se envía y el mensaje dice cómo corregirlo", async () => {
    const user = userEvent.setup();
    const { writes } = open({ row: null });
    const sheet = dialog(copy.plan.sheet.createTitle);
    await user.click(within(sheet).getByRole("radio", { name: copy.categories.home }));
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.save }));
    expect(within(sheet).getByText(copy.plan.form.errors.limit)).toBeTruthy();
    await user.type(within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }), "0");
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.save }));
    expect(within(sheet).getByText(copy.plan.form.errors.limit)).toBeTruthy();
    expect(writes.create).not.toHaveBeenCalled();
  });

  it("crear: solo ofrece categorías de gasto sin presupuesto vigente (nunca Ingresos) y envía pesos enteros en su contexto", async () => {
    const user = userEvent.setup();
    const { writes, onDone } = open({ row: null });
    const sheet = dialog(copy.plan.sheet.createTitle);
    expect(within(sheet).queryByRole("radio", { name: copy.categories.income })).toBeNull();
    expect(within(sheet).queryByRole("radio", { name: copy.categories.market })).toBeNull();
    expect(within(sheet).getByText(copy.plan.sheet.context.us)).toBeTruthy();
    await user.click(within(sheet).getByRole("radio", { name: copy.categories.home }));
    await user.type(within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }), "1500000");
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.save }));
    expect(writes.create).toHaveBeenCalledWith({ idempotencyKey: KEY, context: "us", categoryId: "home", limitPesos: "1500000" });
    expect(onDone).toHaveBeenCalledWith("created");
  });

  it("`unknown`: campos bloqueados, «Reintentar» y «Comprobar estado» con `write_status`; nunca dice que no se guardó", async () => {
    const user = userEvent.setup();
    const writes = actions({ update: vi.fn(async () => ({ status: "unknown" as const })) });
    open({ actions: writes });
    const sheet = dialog(copy.plan.sheet.editTitle);
    const limit = within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit });
    await user.clear(limit);
    await user.type(limit, "950000");
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.saveChanges }));
    expect(within(sheet).getByRole("alert").textContent).toContain(copy.writes.unknown);
    expect((within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }) as HTMLInputElement).disabled).toBe(true);
    expect(within(sheet).queryByRole("button", { name: copy.plan.sheet.deactivate })).toBeNull();
    expect(sheet.textContent).not.toContain(copy.plan.sheet.rejected);
    await user.click(within(sheet).getByRole("button", { name: copy.writes.check }));
    expect(writes.check).toHaveBeenCalledWith({ action: "update_budget", idempotencyKey: KEY });
    expect(within(sheet).getByText(copy.writes.notFound)).toBeTruthy();
    await user.click(within(sheet).getByRole("button", { name: copy.writes.retry }));
    expect(writes.update).toHaveBeenNthCalledWith(2, { idempotencyKey: KEY, budgetId: MARKET, expectedVersion: 2, limitPesos: "950000" });
  });

  it("conflicto de versión: «Tomás cambió este presupuesto» con el valor vigente; «Revisar» edita sobre la versión nueva con otra clave", async () => {
    const user = userEvent.setup();
    const writes = actions({ update: vi.fn().mockResolvedValueOnce({ status: "rejected", error: "versionConflict" }).mockResolvedValue({ status: "ok", value: { budgetId: MARKET, version: 4 } }) });
    const { view, all } = open({ actions: writes });
    const sheet = dialog(copy.plan.sheet.editTitle);
    const limit = within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit });
    await user.clear(limit);
    await user.type(limit, "850000");
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.saveChanges }));
    expect(router.refresh).toHaveBeenCalled();
    // Mientras llega la página nueva, no se inventa quién cambió ni cuánto.
    expect(within(sheet).getByText(copy.plan.sheet.checkingLatest)).toBeTruthy();
    const changed: BudgetChange = { id: "77777777-7777-4777-8777-777777777777", budgetId: MARKET, kind: "raise", limitMinor: minor(950000n), previousLimitMinor: minor(900000n), byName: "Tomás", changedAt: "2026-10-24T15:00:00.000Z", date: "2026-10-24" };
    const fresh: PlanRow = { ...market, version: 3, limitMinor: minor(950000n), history: [changed, ...market.history] };
    view.rerender(<BudgetSheet {...all} row={fresh} rows={[fresh, ...goldenRows.slice(1)]} />);
    expect(within(sheet).getByText(copy.plan.errors.versionConflict("Tomás"))).toBeTruthy();
    expect(within(sheet).getByText(copy.plan.sheet.current("$950.000"))).toBeTruthy();
    // Revisión de acabado: se dice qué no se guardó, y el campo no admite otra escritura sobre la versión vieja.
    expect(within(sheet).getByText(copy.plan.sheet.notSaved("$850.000"))).toBeTruthy();
    expect((within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }) as HTMLInputElement).disabled).toBe(true);
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.review }));
    expect((within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }) as HTMLInputElement).value).toBe("950.000");
    await user.clear(within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }));
    await user.type(within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }), "1000000");
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.saveChanges }));
    const second = vi.mocked(writes.update).mock.calls[1][0];
    expect(second).toMatchObject({ budgetId: MARKET, expectedVersion: 3, limitPesos: "1000000" });
    expect(second.idempotencyKey).not.toBe(KEY);
  });

  it("crear uno que ya existe (JT219): «Tomás ya creó este presupuesto», su valor y «Revisar» lo abre para editar", async () => {
    const user = userEvent.setup();
    const writes = actions({ create: vi.fn(async () => ({ status: "rejected" as const, error: "budgetExists" as const })) });
    const withoutHome = goldenRows;
    const { view, all } = open({ row: null, actions: writes, rows: withoutHome });
    const sheet = dialog(copy.plan.sheet.createTitle);
    await user.click(within(sheet).getByRole("radio", { name: copy.categories.home }));
    await user.type(within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }), "1500000");
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.save }));
    expect(router.refresh).toHaveBeenCalled();
    const homeId = "88888888-8888-4888-8888-888888888888";
    const created: BudgetChange = { id: "99999999-9999-4999-8999-999999999999", budgetId: homeId, kind: "create", limitMinor: minor(1700000n), previousLimitMinor: null, byName: "Tomás", changedAt: "2026-10-24T15:00:00.000Z", date: "2026-10-24" };
    const home: PlanRow = { ...goldenRows[3], budgetId: homeId, version: 1, limitMinor: minor(1700000n), history: [created] };
    view.rerender(<BudgetSheet {...all} rows={[...goldenRows.slice(0, 3), home]} />);
    expect(within(sheet).getByText(copy.plan.errors.alreadyExists("Tomás"))).toBeTruthy();
    expect(within(sheet).getByText(copy.plan.sheet.current("$1.700.000"))).toBeTruthy();
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.review }));
    expect(screen.getByRole("dialog", { name: copy.plan.sheet.editTitle })).toBeTruthy();
  });

  it("historial: autor, fecha, anterior y nuevo (04·2; §15.5)", () => {
    open();
    const sheet = dialog(copy.plan.sheet.editTitle);
    const history = within(sheet).getByRole("list", { name: copy.plan.sheet.history });
    const items = within(history).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain(copy.plan.sheet.historyBy("Sara", "3 oct"));
    expect(items[0].textContent).toContain(copy.plan.sheet.historyValue.change("$800.000", "$900.000"));
    expect(items[1].textContent).toContain(copy.plan.sheet.historyBy("Tomás", "1 oct"));
    expect(items[1].textContent).toContain(copy.plan.sheet.historyValue.create("$800.000"));
  });

  it("desactivar envía `null` con la versión leída, nunca un límite 0", async () => {
    const user = userEvent.setup();
    const { writes, onDone } = open();
    await user.click(within(dialog(copy.plan.sheet.editTitle)).getByRole("button", { name: copy.plan.sheet.deactivate }));
    expect(writes.update).toHaveBeenCalledWith({ idempotencyKey: KEY, budgetId: MARKET, expectedVersion: 2, limitPesos: null });
    expect(onDone).toHaveBeenCalledWith("deactivated");
  });

  it("FR-094: ninguna intención de escritura en el almacenamiento del navegador", async () => {
    const user = userEvent.setup();
    const local = vi.spyOn(Storage.prototype, "setItem");
    // jsdom no trae IndexedDB: se pone uno espía, para que abrirla también haga fallar la prueba (revisión del PR #67, 6).
    const idb = { open: vi.fn() };
    vi.stubGlobal("indexedDB", idb);
    const writes = actions({ update: vi.fn(async () => ({ status: "unknown" as const })) });
    open({ actions: writes });
    const sheet = dialog(copy.plan.sheet.editTitle);
    const limit = within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit });
    await user.clear(limit);
    await user.type(limit, "950000");
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.saveChanges }));
    expect(local).not.toHaveBeenCalled();
    expect(idb.open).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  // Revisión del gestor del PR #67 (2): el aviso de conflicto nunca se queda girando sin salida.
  it("conflicto con un presupuesto que el otro creó y ya desactivó: dice que ahora no tiene presupuesto y deja revisarlo", async () => {
    const user = userEvent.setup();
    const writes = actions({ create: vi.fn(async () => ({ status: "rejected" as const, error: "budgetExists" as const })) });
    const { view, all } = open({ row: null, actions: writes });
    const sheet = dialog(copy.plan.sheet.createTitle);
    await user.click(within(sheet).getByRole("radio", { name: copy.categories.home }));
    await user.type(within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }), "1500000");
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.save }));
    const homeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const history: BudgetChange[] = [
      { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", budgetId: homeId, kind: "deactivate", limitMinor: null, previousLimitMinor: minor(1700000n), byName: "Tomás", changedAt: "2026-10-24T16:00:00.000Z", date: "2026-10-24" },
      { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", budgetId: homeId, kind: "create", limitMinor: minor(1700000n), previousLimitMinor: null, byName: "Tomás", changedAt: "2026-10-24T15:00:00.000Z", date: "2026-10-24" },
    ];
    const home: PlanRow = { ...goldenRows[3], budgetId: homeId, version: 2, limitMinor: null, history };
    view.rerender(<BudgetSheet {...all} rows={[...goldenRows.slice(0, 3), home]} />);
    expect(within(sheet).queryByText(copy.plan.sheet.checkingLatest)).toBeNull();
    expect(within(sheet).getByText(copy.plan.errors.alreadyExists("Tomás"))).toBeTruthy();
    expect(within(sheet).getByText(copy.plan.sheet.currentOff)).toBeTruthy();
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.review }));
    expect(screen.getByRole("dialog", { name: copy.plan.sheet.editTitle })).toBeTruthy();
  });

  it("si el refresco no trae la versión nueva, «Volver a cargar» lo pide otra vez", async () => {
    const user = userEvent.setup();
    const writes = actions({ update: vi.fn(async () => ({ status: "rejected" as const, error: "versionConflict" as const })) });
    open({ actions: writes });
    const sheet = dialog(copy.plan.sheet.editTitle);
    await user.clear(within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }));
    await user.type(within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }), "850000");
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.saveChanges }));
    expect(within(sheet).getByText(copy.plan.sheet.checkingLatest)).toBeTruthy();
    expect(router.refresh).toHaveBeenCalledTimes(1);
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.reload }));
    expect(router.refresh).toHaveBeenCalledTimes(2);
  });

  // Revisión del gestor del PR #67 (3): si el cambio que ganó es de quien mira (otra pestaña), primera persona.
  it("conflicto con un cambio propio desde otro lugar: «Cambiaste este presupuesto en otro lugar.», nunca su propio nombre", async () => {
    const user = userEvent.setup();
    const writes = actions({ update: vi.fn(async () => ({ status: "rejected" as const, error: "versionConflict" as const })) });
    const { view, all } = open({ actions: writes });
    const sheet = dialog(copy.plan.sheet.editTitle);
    await user.clear(within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }));
    await user.type(within(sheet).getByRole("textbox", { name: copy.plan.sheet.limit }), "850000");
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.saveChanges }));
    const mine: BudgetChange = { id: "ffffffff-ffff-4fff-8fff-ffffffffffff", budgetId: MARKET, kind: "raise", limitMinor: minor(950000n), previousLimitMinor: minor(900000n), byName: "Sara", byMe: true, changedAt: "2026-10-24T15:00:00.000Z", date: "2026-10-24" };
    const fresh: PlanRow = { ...market, version: 3, limitMinor: minor(950000n), history: [mine, ...market.history] };
    view.rerender(<BudgetSheet {...all} row={fresh} rows={[fresh, ...goldenRows.slice(1)]} />);
    expect(within(sheet).getByText(copy.plan.errors.versionConflictMe)).toBeTruthy();
    expect(within(sheet).queryByText(copy.plan.errors.versionConflict("Sara"))).toBeNull();
  });
});

describe("Plan (FR-020; US-1, US-2 escenarios 4 y 6)", () => {
  it("Yo sin presupuesto: el resumen y en qué se fue, «Sin presupuesto · Crear presupuesto (opcional)» con `chart-pie-slice`; sin «$0», 0 %, «excedido» ni «te alcanza»", () => {
    const { container } = render(<PlanScreen data={meData} actions={actions()} />);
    expect(screen.getByText(copy.plan.summary.me("$1.912.900"))).toBeTruthy();
    expect(screen.getByText(copy.plan.noBudget("$1.500.000"))).toBeTruthy();
    expect(screen.getByText(copy.plan.noBudget("$412.900"))).toBeTruthy();
    expect(screen.getByText(copy.plan.empty.title)).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.plan.empty.action })).toBeTruthy();
    expect(icon(container, "chart-pie-slice")).toBeGreaterThan(0);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.textContent).not.toMatch(NO_BUDGET_FORBIDDEN);
    for (const node of container.querySelectorAll("[aria-label]")) expect(node.getAttribute("aria-label")).not.toMatch(NO_BUDGET_FORBIDDEN);
    expect(screen.getByText(copy.plan.optional.me)).toBeTruthy();
    expect(screen.getByText(copy.plan.who.me)).toBeTruthy();
  });

  it("Nosotros con el dataset de octubre: tres BudgetIndicator, Hogar sin presupuesto y «Último cambio: Sara subió Mercado a $900.000 · 3 oct.»", () => {
    const { container } = render(<PlanScreen data={usData} actions={actions()} />);
    expect(screen.getByText(copy.plan.summary.us("$2.840.000"))).toBeTruthy();
    expect(container.querySelectorAll("[data-budget-bar]")).toHaveLength(3);
    expect(screen.getByText(copy.plan.left("$260.000"))).toBeTruthy();
    expect(screen.getByText(copy.plan.leftPercent("$20.000", 92))).toBeTruthy();
    expect(screen.getByText(copy.plan.over.us("$20.000", 105))).toBeTruthy();
    expect(screen.getByText(copy.plan.noBudget("$1.600.000"))).toBeTruthy();
    expect(screen.getByText(copy.plan.optional.us, { exact: false })).toBeTruthy();
    expect(screen.getByText(copy.plan.daysLeft(7, "octubre"), { exact: false })).toBeTruthy();
    expect(container.textContent).toContain(copy.plan.lastChange(copy.plan.change.raise("Sara", copy.categories.market, "$900.000"), "3 oct"));
    expect(container.textContent).toContain(copy.plan.who.us);
    expect(container.textContent).not.toMatch(/te alcanza|puedes pagarlo/i);
    expect(screen.getByRole("button", { name: copy.plan.createBudget })).toBeTruthy();
  });

  it("en Yo, quien mira hizo el cambio: el último cambio y el historial van en primera persona", () => {
    const change: BudgetChange = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", budgetId: MARKET, kind: "create", limitMinor: minor(80000n), previousLimitMinor: null, byName: "Sara", changedAt: "2026-10-09T15:00:00.000Z", date: "2026-10-09" };
    const own: PlanRow = { categoryId: "health", budgetId: MARKET, version: 1, limitMinor: minor(80000n), consumedMinor: "0", history: [change] };
    const { container } = render(<PlanScreen data={{ ...meData, rows: [...meData.rows, own] }} actions={actions()} />);
    expect(container.textContent).toContain(copy.plan.lastChange(copy.plan.changeMe.create(copy.categories.health, "$80.000"), "9 oct"));
    expect(container.textContent).not.toContain("Sara creó");
  });

  it("un presupuesto desactivado sin gasto en el mes no se pinta como «$0 · sin presupuesto»", () => {
    const off: PlanRow = { categoryId: "health", budgetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", version: 2, limitMinor: null, consumedMinor: "0", history: [] };
    const { container } = render(<PlanScreen data={{ ...usData, rows: [...goldenRows, off] }} actions={actions()} />);
    expect(container.textContent).not.toContain(copy.categories.health);
  });

  it("guardar anuncia el resultado con `aria-live` y cierra la hoja", async () => {
    const user = userEvent.setup();
    render(<PlanScreen data={usData} actions={actions()} />);
    await user.click(screen.getByRole("button", { name: copy.plan.edit(copy.categories.market) }));
    const sheet = screen.getByRole("dialog", { name: copy.plan.sheet.editTitle });
    await user.click(within(sheet).getByRole("button", { name: copy.plan.sheet.deactivate }));
    await act(async () => {});
    expect(screen.queryByRole("dialog", { name: copy.plan.sheet.editTitle })).toBeNull();
    expect(screen.getByText(copy.plan.saved.deactivated).closest("[aria-live]")).toBeTruthy();
  });
});
