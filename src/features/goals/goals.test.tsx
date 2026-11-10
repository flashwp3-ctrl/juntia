// 004 PR C, T042 / FR-032–FR-037, FR-040–FR-044, FR-076, FR-095, FR-100, FR-103; FR-113; US-4, US-5, US-6 — capa:
// componentes (Vitest + RTL selectivo, ADR-011 fila 5).
// Criterio literal (tasks.md, T042): «GoalCard (fallback por `goal_type`, «Lo lograron» como sugerencia, excedente neutro),
// GoalStack (0, 1, 2, 3 y más; «Ver todas» siempre; lista para lector de pantalla), Registrar aporte (sin «¿Quién aporta?»,
// vista previa 11.840.000 · 65 %, modo y fecha nunca futura), Retirar (máximo, motivo), la fila de retiro nunca se presenta
// como ingreso (signo, ficha, etiqueta), historial (anulados marcados, filtros por persona), Metas en Yo separadas por
// `goal_scope` sin sumar compartidas en el total personal, el deshacer único con tres orígenes, Inicio con «Apartado para
// metas» aparte del héroe, la inmersiva con movimiento reducido, y los iconos del mapa semántico por su identificador exacto
// en `AppIcon`: `flag-banner` (Metas y su vacío), `piggy-bank` (aportar), `arrow-u-up-left` (retirar) y `flag-checkered`
// (meta lograda)».
// Cifras del dataset dorado de P0-3 (spec, parte A): Japón 11.340.000 de 18.000.000 (63 %), Sara 6.120.000 en 11 aportes,
// Tomás 5.220.000 en 10, objetivo abril de 2027; parte D: Bicicleta de ruta con 1.050.000 de Sara.
import { act, configure, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import type { GoalActions, GoalEntryView, GoalMemberView, GoalPerson, GoalView, SavedEntry } from "./types";
import { GoalCard } from "./goal-card";
import { GoalStack, SWIPE, swipeStep } from "./goal-stack";
import { GoalsScreen } from "./goals-screen";
import { ContributeSheet } from "./contribute-sheet";
import { WithdrawSheet } from "./withdraw-sheet";
import { GoalEntryRow } from "./goal-entry-row";
import { GoalHistory } from "./goal-history";
import { GoalImmersive } from "./goal-immersive";
import { GoalStatusDialog } from "./goal-status-dialog";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/metas" }));

const SARA = "11111111-1111-4111-8111-111111111111";
const TOMAS = "22222222-2222-4222-8222-222222222222";
const KEY = "33333333-3333-4333-8333-333333333333";
const JAPAN = "44444444-4444-4444-8444-444444444444";
const BIKE = "55555555-5555-4555-8555-555555555555";
const TODAY = "2026-10-26";
const people: GoalPerson[] = [{ userId: SARA, name: "Sara", joinOrder: 1, isMe: true }, { userId: TOMAS, name: "Tomás", joinOrder: 2, isMe: false }];
const minor = (pesos: bigint) => (pesos * 100n).toString();

const japan = (overrides: Partial<GoalView> = {}): GoalView => ({
  id: JAPAN, name: "Japón", goalType: "travel", scope: "shared", status: "active", version: 3,
  targetMinor: minor(18000000n), balanceMinor: minor(11340000n), progressPercent: 63, myAvailableMinor: minor(6120000n),
  hasPendingRequest: false, targetMonth: "2027-04-01", createdAt: "2025-12-01T17:00:00.000Z", ...overrides,
});
const bike = (overrides: Partial<GoalView> = {}): GoalView => ({
  id: BIKE, name: "Bicicleta de ruta", goalType: "other", scope: "personal", status: "active", version: 2,
  targetMinor: minor(3000000n), balanceMinor: minor(1050000n), progressPercent: 35, myAvailableMinor: minor(1050000n),
  hasPendingRequest: false, targetMonth: null, createdAt: "2026-08-01T17:00:00.000Z", ...overrides,
});
const japanMembers: GoalMemberView[] = [
  { ...people[0], contributedMinor: minor(6120000n), withdrawnMinor: "0", usedMinor: "0", availableMinor: minor(6120000n), contributionCount: 11 },
  { ...people[1], contributedMinor: minor(5220000n), withdrawnMinor: "0", usedMinor: "0", availableMinor: minor(5220000n), contributionCount: 10 },
];
const bikeMembers: GoalMemberView[] = [{ ...people[0], contributedMinor: minor(1050000n), withdrawnMinor: "0", usedMinor: "0", availableMinor: minor(1050000n), contributionCount: 2 }];
const extra = (index: number): GoalView => japan({ id: `6666666${index}-6666-4666-8666-666666666666`, name: `Meta ${index}`, goalType: "home", balanceMinor: minor(100000n), progressPercent: 1 });

const entry = (overrides: Partial<GoalEntryView>): GoalEntryView => ({
  id: "77777777-7777-4777-8777-777777777777", goalId: JAPAN, kind: "contribution", memberUserId: SARA, amountMinor: minor(500000n),
  effectiveDate: "2026-10-22", fundingMode: "reserved", reason: null, transactionId: null, transactionDescription: null,
  voided: false, voidedReason: null, createdBy: SARA, createdAt: "2026-10-22T17:00:00.000Z", ...overrides,
});
const savedEntry = (pesos: bigint): SavedEntry => ({ id: "88888888-8888-4888-8888-888888888888", goalId: JAPAN, amountMinor: minor(pesos), availableMinor: minor(6620000n) });
function actions(overrides: Partial<GoalActions> = {}): GoalActions {
  return {
    create: vi.fn(), update: vi.fn(), complete: vi.fn(), archive: vi.fn(),
    contribute: vi.fn(async () => ({ status: "ok" as const, value: savedEntry(500000n) })),
    withdraw: vi.fn(async () => ({ status: "ok" as const, value: savedEntry(200000n) })),
    voidEntry: vi.fn(async () => ({ status: "ok" as const, value: { entryId: "x" } })),
    check: vi.fn(async () => ({ state: "not_found" as const })),
    ...overrides,
  };
}
const icon = (root: HTMLElement, name: string) => root.querySelector(`[data-icon="${name}"]`);

afterEach(() => vi.clearAllMocks());

describe("GoalCard (US-4.3, US-4.6, US-4.9)", () => {
  it("Japón: 63 %, «$11.340.000 de $18.000.000», cinta por persona con cifras y el ritmo como estimación (Q9)", () => {
    render(<GoalCard goal={japan()} members={japanMembers} today={TODAY} context="us" />);
    const card = screen.getByRole("link", { name: copy.goals.card.accessibleName({ name: "Japón", scope: copy.goals.scope.shared.toLowerCase(), percent: 63, balance: "$11.340.000", target: "$18.000.000" }) });
    expect(card.getAttribute("href")).toBe(`/metas/${JAPAN}`);
    expect(within(card).getByText(copy.goals.ofTarget("$11.340.000", "$18.000.000"))).toBeTruthy();
    expect(within(card).getByRole("img", { hidden: true, name: copy.goals.ribbon.label([copy.goals.ribbon.part("Sara", "$6.120.000"), copy.goals.ribbon.part("Tomás", "$5.220.000")].join(", "), "$18.000.000") })).toBeTruthy();
    expect(within(card).getByText(copy.goals.pace.line("$6.660.000", 6, "$1.110.000"))).toBeTruthy();
    expect(within(card).getByText(copy.goals.pace.estimate)).toBeTruthy();
    expect(card.textContent).not.toMatch(/Llegar|te alcanza|Total gastado/);
  });

  it.each([
    ["travel", "airplane-tilt"], ["home", "house-line"], ["wedding", "heart"], ["vehicle", "car-profile"],
    ["education", "graduation-cap"], ["emergency", "lifebuoy"], ["other", "flag-banner"],
  ] as const)("sin foto (Q6): fallback con la inicial en serif y el ícono Duotone del tipo %s → %s", (goalType, name) => {
    const { container } = render(<GoalCard goal={japan({ goalType })} members={japanMembers} today={TODAY} context="us" />);
    const glyph = icon(container, name);
    expect(glyph).toBeTruthy();
    expect(container.querySelector("[data-goal-fallback]")?.textContent).toContain("J");
    expect(container.querySelector("img")).toBeNull();
  });

  it("saldo ≥ objetivo: «Lo lograron» como sugerencia y el excedente neutro; el estado no cambia solo (Q15)", () => {
    const { container } = render(<GoalCard goal={japan({ balanceMinor: minor(18500000n), progressPercent: 102 })} members={japanMembers} today={TODAY} context="us" />);
    expect(screen.getByText(copy.goals.reached.us)).toBeTruthy();
    expect(screen.getByText(copy.goals.surplus("$500.000"))).toBeTruthy();
    expect(screen.queryByText(copy.goals.status.completed)).toBeNull();
    // Sugerencia, no hito: no hay bandera de meta lograda hasta «Dar por lograda».
    expect(icon(container, "flag-checkered")).toBeNull();
    expect(container.querySelector("[data-goal-surplus]")?.className ?? "").not.toMatch(/danger|warning|income/);
  });

  it("meta lograda: `flag-checkered` y LOGRADA, con la cinta llena", () => {
    const { container } = render(<GoalCard goal={japan({ status: "completed", balanceMinor: minor(18000000n), progressPercent: 100 })} members={japanMembers} today={TODAY} context="us" />);
    expect(icon(container, "flag-checkered")).toBeTruthy();
    expect(screen.getByText(copy.goals.status.completed)).toBeTruthy();
  });

  it("sin fecha, sin ritmo ni «al mes»; con la fecha ya pasada, texto neutro sin culpa (Q9)", () => {
    const { unmount } = render(<GoalCard goal={bike()} members={bikeMembers} today={TODAY} context="me" />);
    expect(screen.queryByText(/al mes/)).toBeNull();
    expect(screen.getByText(copy.goals.noDate)).toBeTruthy();
    unmount();
    render(<GoalCard goal={japan({ targetMonth: "2026-09-01" })} members={japanMembers} today={TODAY} context="us" />);
    expect(screen.queryByText(/al mes/)).toBeNull();
    expect(screen.getByText(copy.goals.pace.pastDue("septiembre de 2026"))).toBeTruthy();
  });
});

describe("GoalStack (US-4.10; decisión 22.2)", () => {
  const stack = (goals: GoalView[]) => render(<GoalStack goals={goals} members={{ [JAPAN]: japanMembers }} today={TODAY} context="us" onCreate={vi.fn()} />);

  it("0 metas: no pinta nada (la pantalla enseña el vacío)", () => {
    const { container } = stack([]);
    expect(container.innerHTML).toBe("");
  });

  it("1 meta: solo la tarjeta, sin capas que asoman, con «Ver todas»", () => {
    const { container } = stack([japan()]);
    expect(container.querySelectorAll("[data-stack-layer]")).toHaveLength(1);
    expect(screen.getByRole("button", { name: copy.goals.stack.seeAll })).toBeTruthy();
  });

  it("2 metas: frontal y una que asoma; 3 o más: frontal y dos; más de 3: el conteo en el pie", () => {
    const { container, unmount } = stack([japan(), extra(1)]);
    expect(container.querySelectorAll("[data-stack-layer]")).toHaveLength(2);
    unmount();
    const five = stack([japan(), extra(1), extra(2), extra(3), extra(4)]);
    expect(five.container.querySelectorAll("[data-stack-layer]")).toHaveLength(3);
    expect(screen.getByText(copy.goals.stack.count(5))).toBeTruthy();
  });

  it("lector de pantalla: una lista con todas las metas (no un carrusel); «Ver todas» abre la lista completa", async () => {
    const user = userEvent.setup();
    stack([japan(), extra(1), extra(2), extra(3)]);
    const list = screen.getByRole("list", { name: copy.goals.stack.list });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByRole("region", { name: /carrusel/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: copy.goals.stack.seeAll }));
    expect(screen.getAllByRole("link", { name: /^Meta [123], meta/ })).toHaveLength(3);
  });

  it("abanico (lg): «+» punteado para crear meta", () => {
    stack([japan(), extra(1)]);
    expect(screen.getByRole("button", { name: copy.goals.stack.create })).toBeTruthy();
  });
});

describe("Metas en Yo y Nosotros (Q11; FR-035)", () => {
  it("Nosotros: «Apartado en metas compartidas» con su nota, solo compartidas", () => {
    render(<GoalsScreen data={{ context: "us", goals: [japan()], members: { [JAPAN]: japanMembers }, totals: { balanceMinor: minor(11340000n), myAvailableMinor: minor(6120000n), count: 1 } }} people={people} today={TODAY} actions={actions()} />);
    expect(screen.getByText(copy.goals.totals.us)).toBeTruthy();
    expect(screen.getByText(copy.goals.totals.usNote)).toBeTruthy();
    expect(screen.getByText("$11.340.000", { selector: "[data-goals-total]" })).toBeTruthy();
  });

  it("Yo: personales y, aparte, compartidas con «Tus aportes»; el total personal no suma las compartidas", () => {
    render(<GoalsScreen data={{ context: "me", goals: [bike(), japan()], members: { [BIKE]: bikeMembers, [JAPAN]: japanMembers }, totals: { balanceMinor: minor(1050000n), myAvailableMinor: minor(1050000n), count: 1 } }} people={people} today={TODAY} actions={actions()} />);
    const mine = screen.getByRole("region", { name: copy.goals.sections.mine });
    const shared = screen.getByRole("region", { name: copy.goals.sections.shared });
    expect(within(mine).getByRole("link", { name: /^Bicicleta de ruta/ })).toBeTruthy();
    expect(within(mine).queryByRole("link", { name: /^Japón/ })).toBeNull();
    expect(within(shared).getByRole("link", { name: /^Japón/ })).toBeTruthy();
    expect(within(shared).getByText(copy.goals.yourShare("$6.120.000"))).toBeTruthy();
    // 1.050.000, nunca 1.050.000 + 6.120.000.
    expect(screen.getByText("$1.050.000", { selector: "[data-goals-total]" })).toBeTruthy();
    expect(screen.queryByText("$7.170.000")).toBeNull();
  });

  it("vacío: 04·6 con `flag-banner` y «Crear una meta» (plural en Nosotros, singular en Yo)", () => {
    const { container, unmount } = render(<GoalsScreen data={{ context: "us", goals: [], members: {}, totals: null }} people={people} today={TODAY} actions={actions()} />);
    expect(screen.getByRole("heading", { name: copy.goals.empty.us.title })).toBeTruthy();
    expect(icon(container, "flag-banner")).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.goals.empty.us.action })).toBeTruthy();
    expect(container.textContent).not.toContain("$0");
    unmount();
    render(<GoalsScreen data={{ context: "me", goals: [], members: {}, totals: null }} people={people} today={TODAY} actions={actions()} />);
    expect(screen.getByRole("heading", { name: copy.goals.empty.me.title })).toBeTruthy();
  });

  it("archivadas fuera del listado principal, en «Archivadas»", () => {
    render(<GoalsScreen data={{ context: "us", goals: [japan(), extra(1), japan({ id: BIKE, name: "Boda", status: "archived", balanceMinor: "0", progressPercent: 0 })], members: {}, totals: { balanceMinor: minor(11440000n), myAvailableMinor: "0", count: 2 } }} people={people} today={TODAY} actions={actions()} />);
    const archived = screen.getByRole("region", { name: copy.goals.sections.archived });
    expect(within(archived).getByText("Boda")).toBeTruthy();
    expect(screen.getByRole("list", { name: copy.goals.stack.list }).textContent).not.toContain("Boda");
  });
});

describe("Registrar aporte (US-5.1, US-5.3, US-5.4; FR-040)", { timeout: 15000 }, () => {
  const sheet = (writes = actions(), onDone = vi.fn()) => {
    render(<ContributeSheet open onClose={vi.fn()} goal={japan()} context="us" today={TODAY} idempotencyKey={KEY} actions={writes} onDone={onDone} />);
    return { dialog: screen.getByRole("dialog", { name: copy.goals.contribute.title }), writes, onDone };
  };

  it("sin «¿Quién aporta?»: aporta quien registra; vista previa «Con este aporte $11.840.000 · 65 %» (truncado) y el texto de 04·3", async () => {
    const user = userEvent.setup();
    const { dialog } = sheet();
    expect(within(dialog).queryByText(/Quién aporta/i)).toBeNull();
    expect(within(dialog).queryByRole("radio", { name: "Tomás" })).toBeNull();
    await user.type(within(dialog).getByRole("textbox", { name: copy.goals.contribute.amount }), "500000");
    expect(within(dialog).getByText(copy.goals.contribute.preview("$11.840.000", 65))).toBeTruthy();
    expect(within(dialog).getByText(copy.goals.contribute.explain.us)).toBeTruthy();
    expect(icon(dialog, "piggy-bank")).toBeTruthy();
  });

  it("modo «Apartado en Juntia» por defecto o «Transferencia declarada»; nunca «Depositado» ni «verificada»", () => {
    const { dialog } = sheet();
    expect(within(dialog).getByRole("radio", { name: copy.goals.contribute.modes.reserved }).getAttribute("aria-checked")).toBe("true");
    expect(within(dialog).getByRole("radio", { name: copy.goals.contribute.modes.transferred_declared })).toBeTruthy();
    expect(dialog.textContent).not.toMatch(/Deposit|verificad|Invert/);
  });

  it("fecha futura: no se puede (el campo no la admite y no se envía); hoy sí", async () => {
    const user = userEvent.setup();
    const { dialog, writes } = sheet();
    const date = within(dialog).getByLabelText(copy.goals.contribute.date) as HTMLInputElement;
    expect(date.max).toBe(TODAY);
    expect(date.min).toBe("2025-12-01");
    await user.type(within(dialog).getByRole("textbox", { name: copy.goals.contribute.amount }), "500000");
    await user.clear(date);
    await user.type(date, "2026-10-27");
    await user.click(within(dialog).getByRole("button", { name: copy.goals.contribute.submit("$500.000") }));
    expect(writes.contribute).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("alert").textContent).toContain(copy.goals.errors.date);
    await user.clear(date);
    await user.type(date, TODAY);
    await user.click(within(dialog).getByRole("button", { name: copy.goals.contribute.submit("$500.000") }));
    expect(writes.contribute).toHaveBeenCalledWith({ idempotencyKey: KEY, goalId: JAPAN, amountPesos: "500000", entryDate: TODAY, fundingMode: "reserved" });
  });

  it("resultado desconocido: no anima ni afirma nada, bloquea los campos y ofrece «Comprobar estado» (FR-077, FR-093)", async () => {
    const user = userEvent.setup();
    const { dialog, onDone } = sheet(actions({ contribute: vi.fn(async () => ({ status: "unknown" as const })) }));
    await user.type(within(dialog).getByRole("textbox", { name: copy.goals.contribute.amount }), "500000");
    await user.click(within(dialog).getByRole("button", { name: copy.goals.contribute.submit("$500.000") }));
    expect(await within(dialog).findByText(copy.writes.unknown)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: copy.writes.check })).toBeTruthy();
    expect((within(dialog).getByRole("textbox", { name: copy.goals.contribute.amount }) as HTMLInputElement).disabled).toBe(true);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("meta lograda: no admite aportes (FR-032)", () => {
    render(<ContributeSheet open onClose={vi.fn()} goal={japan({ status: "completed" })} context="us" today={TODAY} idempotencyKey={KEY} actions={actions()} onDone={vi.fn()} />);
    expect(screen.getByText(copy.goals.immersive.completedNote)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Registrar aporte de/ })).toBeNull();
  });
});

describe("Retirar (US-6.1–6.3; FR-041)", { timeout: 15000 }, () => {
  const sheet = (writes = actions()) => {
    render(<WithdrawSheet open onClose={vi.fn()} goal={bike()} available={minor(1050000n)} today={TODAY} idempotencyKey={KEY} actions={writes} onDone={vi.fn()} />);
    return { dialog: screen.getByRole("dialog", { name: copy.goals.withdrawSheet.title }), writes };
  };

  it("el máximo es lo disponible propio: por encima no se envía y dice «Puedes retirar hasta $X»", async () => {
    const user = userEvent.setup();
    const { dialog, writes } = sheet();
    expect(within(dialog).getByText(copy.goals.withdrawSheet.onlyYours)).toBeTruthy();
    expect(icon(dialog, "arrow-u-up-left")).toBeTruthy();
    await user.type(within(dialog).getByRole("textbox", { name: copy.goals.withdrawSheet.amount }), "1200000");
    await user.type(within(dialog).getByLabelText(copy.goals.withdrawSheet.reason), "Cambio de planes");
    await user.click(within(dialog).getByRole("button", { name: copy.goals.withdrawSheet.submit("$1.200.000") }));
    expect(writes.withdraw).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("alert").textContent).toContain(copy.goals.errors.insufficient("$1.050.000"));
  });

  it("exige motivo; con motivo envía lo escrito y el servidor decide (FR-090)", async () => {
    const user = userEvent.setup();
    const { dialog, writes } = sheet();
    await user.type(within(dialog).getByRole("textbox", { name: copy.goals.withdrawSheet.amount }), "200000");
    await user.click(within(dialog).getByRole("button", { name: copy.goals.withdrawSheet.submit("$200.000") }));
    expect(writes.withdraw).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("alert").textContent).toContain(copy.goals.withdraw.errors.reason);
    await user.type(within(dialog).getByLabelText(copy.goals.withdrawSheet.reason), "La bicicleta puede esperar");
    await user.click(within(dialog).getByRole("button", { name: copy.goals.withdrawSheet.submit("$200.000") }));
    expect(writes.withdraw).toHaveBeenCalledWith({ idempotencyKey: KEY, goalId: BIKE, amountPesos: "200000", entryDate: TODAY, reason: "La bicicleta puede esperar" });
  });

  it("dice que es una reasignación, nunca un ingreso", () => {
    const { dialog } = sheet();
    expect(within(dialog).getByText(copy.goals.withdrawSheet.explain)).toBeTruthy();
    expect(dialog.textContent).not.toMatch(/\bIngreso\b/);
  });
});

describe("La fila de un asiento de meta (FR-044; ADR-011 fila 5)", () => {
  it("aporte: ficha redonda de ahorro con `piggy-bank`, «+» y «ahorro, no es consumo»", () => {
    const { container } = render(<ul><li><GoalEntryRow entry={entry({ goalName: "Japón" })} people={people} dateLabel="22 oct" variant="activity" /></li></ul>);
    expect(screen.getByText(copy.goals.activity.contribution("Japón"))).toBeTruthy();
    expect(screen.getByText(copy.goals.activity.contributionMeta("Sara"), { exact: false })).toBeTruthy();
    expect(screen.getByText("+$500.000")).toBeTruthy();
    expect(icon(container, "piggy-bank")).toBeTruthy();
    expect(container.querySelector("[data-goal-chip]")?.className).toMatch(/rounded-full/);
    expect(container.querySelector("[data-goal-chip]")?.className).toMatch(/bg-saving-subtle/);
  });

  it("retiro: «Retiro de meta · reasignación» con `arrow-u-up-left`, sin «+», sin ficha ni color de ingreso", () => {
    const { container } = render(<ul><li><GoalEntryRow entry={entry({ goalId: BIKE, goalName: "Bicicleta de ruta", kind: "withdrawal", amountMinor: minor(200000n), fundingMode: null, reason: "La bicicleta puede esperar" })} people={people} dateLabel="Hoy" variant="activity" /></li></ul>);
    const row = container.querySelector("[data-goal-entry]") as HTMLElement;
    expect(within(row).getByText(copy.goals.activity.withdrawal)).toBeTruthy();
    expect(icon(row, "arrow-u-up-left")).toBeTruthy();
    expect(icon(row, "arrow-down-left")).toBeNull();
    expect(row.textContent).not.toContain("+");
    expect(row.textContent).not.toMatch(/Ingreso/);
    expect(row.innerHTML).not.toMatch(/text-income|bg-category-income/);
  });

  it("anulado: sigue en la lista, tachado y marcado ANULADO", () => {
    render(<ul><li><GoalEntryRow entry={entry({ voided: true, voidedReason: "void" })} people={people} dateLabel="22 oct" variant="history" /></li></ul>);
    expect(screen.getByText(copy.goals.history.voided)).toBeTruthy();
  });
});

describe("Historial de una meta (US-5.6, US-5.7; FR-043)", { timeout: 15000 }, () => {
  const entries = [
    entry({ id: "a1111111-1111-4111-8111-111111111111" }),
    entry({ id: "a2222222-2222-4222-8222-222222222222", memberUserId: TOMAS, createdBy: TOMAS, amountMinor: minor(400000n), effectiveDate: "2026-10-15" }),
    entry({ id: "a3333333-3333-4333-8333-333333333333", amountMinor: minor(550000n), effectiveDate: "2026-09-20", voided: true, voidedReason: "void" }),
  ];
  const history = (writes = actions()) => render(<GoalHistory goal={japan()} entries={entries} members={japanMembers} today={TODAY} actions={writes} />);

  it("por persona: «Sara $6.120.000 · 11 aportes» y «Tomás $5.220.000 · 10 aportes»; aportes por mes", () => {
    history();
    expect(screen.getByText(copy.goals.immersive.member("Sara", "$6.120.000", 11))).toBeTruthy();
    expect(screen.getByText(copy.goals.immersive.member("Tomás", "$5.220.000", 10))).toBeTruthy();
    // Octubre: 500.000 + 400.000; el anulado de septiembre no cuenta.
    expect(screen.getByText(copy.goals.history.monthTotal("$900.000"))).toBeTruthy();
    expect(screen.getByText(copy.goals.history.voided)).toBeTruthy();
  });

  it("filtros Todos/Sara/Tomás", async () => {
    const user = userEvent.setup();
    history();
    await user.click(screen.getByRole("radio", { name: "Tomás" }));
    expect(screen.queryByText("+$500.000")).toBeNull();
    expect(screen.getByText("+$400.000")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: copy.goals.history.all }));
    expect(screen.getByText("+$500.000")).toBeTruthy();
  });

  it("«Anular aporte» solo en los aportes propios no anulados, con confirmación", async () => {
    const user = userEvent.setup();
    const writes = actions();
    history(writes);
    const buttons = screen.getAllByRole("button", { name: copy.goals.history.void.action });
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]);
    const dialog = screen.getByRole("alertdialog", { name: copy.goals.history.void.title });
    await user.click(within(dialog).getByRole("button", { name: copy.goals.history.void.confirm }));
    expect(writes.voidEntry).toHaveBeenCalledWith(expect.objectContaining({ entryId: "a1111111-1111-4111-8111-111111111111", reason: "void" }));
  });
});

describe("Meta inmersiva (US-4.5; FR-075–FR-077; SC-011)", () => {
  // jsdom no trae matchMedia: se fija la preferencia de movimiento reducido por caso (como account-context.test.tsx).
  const media = (reduce: boolean) => vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  afterEach(() => vi.unstubAllGlobals());

  it("con movimiento reducido: el valor final en el DOM y la cinta llena desde el inicio; foco en el título", async () => {
    media(true);
    render(<GoalImmersive goal={japan()} members={japanMembers} entries={[]} people={people} today={TODAY} context="us" actions={actions()} />);
    const title = screen.getByRole("heading", { level: 1, name: "Japón" });
    await act(async () => {});
    expect(document.activeElement).toBe(title);
    expect(screen.getByText(copy.goals.ofTarget("$11.340.000", "$18.000.000"))).toBeTruthy();
    expect(document.querySelector("[data-ribbon-animated]")).toBeNull();
  });

  it("× y Escape cierran hacia Metas (alternativa al gesto)", async () => {
    media(true);
    const user = userEvent.setup();
    render(<GoalImmersive goal={japan()} members={japanMembers} entries={[]} people={people} today={TODAY} context="us" actions={actions()} />);
    expect(screen.getByRole("link", { name: copy.goals.immersive.close }).getAttribute("href")).toBe("/metas");
    await user.keyboard("{Escape}");
    expect(router.push).toHaveBeenCalledWith("/metas");
  });

  it("archivada: solo lectura, sin aportar ni retirar", () => {
    media(true);
    render(<GoalImmersive goal={japan({ status: "archived" })} members={japanMembers} entries={[]} people={people} today={TODAY} context="us" actions={actions()} />);
    expect(screen.getByText(copy.goals.immersive.readOnly)).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.goals.immersive.contribute })).toBeNull();
    expect(screen.queryByRole("button", { name: copy.goals.immersive.withdraw })).toBeNull();
  });

  it("aportar con `piggy-bank` y retirar con `arrow-u-up-left` en la meta activa", () => {
    media(true);
    render(<GoalImmersive goal={japan()} members={japanMembers} entries={[]} people={people} today={TODAY} context="us" actions={actions()} />);
    expect(icon(screen.getByRole("button", { name: copy.goals.immersive.contribute }), "piggy-bank")).toBeTruthy();
    expect(icon(screen.getByRole("button", { name: copy.goals.immersive.withdraw }), "arrow-u-up-left")).toBeTruthy();
  });
});

describe("Revisión del gestor del PR #68", { timeout: 15000 }, () => {
  it("retiro rechazado por saldo (JT204): dice el máximo vigente del servidor, no el de la página", async () => {
    const user = userEvent.setup();
    const writes = actions({ withdraw: vi.fn(async () => ({ status: "rejected" as const, error: "insufficientFunds" as const, detail: { availableMinor: minor(500000n) } })) });
    render(<WithdrawSheet open onClose={vi.fn()} goal={bike()} available={minor(1050000n)} today={TODAY} idempotencyKey={KEY} actions={writes} onDone={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: copy.goals.withdrawSheet.title });
    await user.type(within(dialog).getByRole("textbox", { name: copy.goals.withdrawSheet.amount }), "900000");
    await user.type(within(dialog).getByLabelText(copy.goals.withdrawSheet.reason), "Otro plan");
    await user.click(within(dialog).getByRole("button", { name: copy.goals.withdrawSheet.submit("$900.000") }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain(copy.goals.errors.insufficient("$500.000"));
  });

  it("anular un aporte cuyos fondos ya se usaron (Q13): lo dice con su texto, nunca «no admite esta operación»", async () => {
    const user = userEvent.setup();
    const writes = actions({ voidEntry: vi.fn(async () => ({ status: "rejected" as const, error: "insufficientFunds" as const, detail: { availableMinor: minor(100000n) } })) });
    render(<GoalHistory goal={japan()} entries={[entry({})]} members={japanMembers} today={TODAY} actions={writes} />);
    await user.click(screen.getByRole("button", { name: copy.goals.history.void.action }));
    const dialog = screen.getByRole("alertdialog", { name: copy.goals.history.void.title });
    await user.click(within(dialog).getByRole("button", { name: copy.goals.history.void.confirm }));
    expect((await within(dialog).findByRole("alert")).textContent).toBe(copy.goals.errors.fundsUsedWith("$100.000"));
    expect(dialog.textContent).not.toContain(copy.goals.errors.notOpen);
  });

  it("anular con resultado desconocido: cerrar pide «¿Cerrar sin confirmar?» (FR-093)", async () => {
    const user = userEvent.setup();
    render(<GoalHistory goal={japan()} entries={[entry({})]} members={japanMembers} today={TODAY} actions={actions({ voidEntry: vi.fn(async () => ({ status: "unknown" as const })) })} />);
    await user.click(screen.getByRole("button", { name: copy.goals.history.void.action }));
    await user.click(screen.getByRole("button", { name: copy.goals.history.void.confirm }));
    expect(await screen.findByText(copy.writes.unknown)).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(await screen.findByRole("alertdialog", { name: copy.writes.close.title })).toBeTruthy();
  });

  it("archivar con resultado desconocido: cerrar pide «¿Cerrar sin confirmar?»; un rechazo de transición dice lo de archivar", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<GoalStatusDialog kind="archive" goal={japan()} idempotencyKey={KEY} actions={actions({ archive: vi.fn(async () => ({ status: "unknown" as const })) })} onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: copy.goals.statusDialog.archiveConfirm }));
    expect(await screen.findByText(copy.writes.unknown)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: copy.writes.dismiss }));
    expect(await screen.findByRole("alertdialog", { name: copy.writes.close.title })).toBeTruthy();
    unmount();
    render(<GoalStatusDialog kind="complete" goal={japan()} idempotencyKey={KEY} actions={actions({ complete: vi.fn(async () => ({ status: "rejected" as const, error: "goalTransition" as const })) })} onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: copy.goals.statusDialog.completeConfirm }));
    expect((await screen.findByRole("alert")).textContent).toBe(copy.goals.errors.cannotComplete);
  });

  it("«Retirar» sin aportes propios disponibles: deshabilitado, con «No tienes aportes disponibles en esta meta»", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const user = userEvent.setup();
    render(<GoalImmersive goal={japan({ myAvailableMinor: "0" })} members={japanMembers} entries={[]} people={people} today={TODAY} context="us" actions={actions()} />);
    const withdraw = screen.getByRole("button", { name: copy.goals.immersive.withdraw });
    expect(withdraw.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(copy.goals.withdrawSheet.nothing)).toBeTruthy();
    await user.click(withdraw);
    expect(screen.queryByRole("dialog", { name: copy.goals.withdrawSheet.title })).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe("GoalStack · gesto y «Ver todas» (decisiones del fundador, PR #68)", () => {
  it.each([
    [{ x: 0, y: -SWIPE.distancePx }, { x: 0, y: 0 }, 1],
    [{ x: 0, y: -10 }, { x: 0, y: -SWIPE.velocityPxPerS }, 1],
    [{ x: 0, y: SWIPE.distancePx }, { x: 0, y: 0 }, -1],
    [{ x: 0, y: 10 }, { x: 0, y: SWIPE.velocityPxPerS }, -1],
    [{ x: 0, y: -(SWIPE.distancePx - 1) }, { x: 0, y: -100 }, 0],
    [{ x: 120, y: -80 }, { x: 900, y: -600 }, 0],
  ] as const)("deslizar %o con velocidad %o → %i (arriba: la siguiente; abajo: la anterior; más horizontal: nada)", (offset, velocity, step) => {
    expect(swipeStep(offset, velocity)).toBe(step);
  });

  it("solo la frontal se arrastra, y solo con más de una meta", () => {
    const { container, unmount } = render(<GoalStack goals={[japan(), extra(1), extra(2)]} members={{}} today={TODAY} context="us" />);
    const layers = container.querySelectorAll("[data-stack-layer]");
    expect(layers[0].hasAttribute("data-swipe")).toBe(true);
    expect(layers[1].hasAttribute("data-swipe")).toBe(false);
    unmount();
    const single = render(<GoalStack goals={[japan()]} members={{}} today={TODAY} context="us" />);
    expect(single.container.querySelector("[data-swipe]")).toBeNull();
  });

  it("con `seeAllHref` (Inicio), «Ver todas» es un enlace a Metas y no despliega la lista aquí", () => {
    render(<GoalStack goals={[japan(), extra(1)]} members={{}} today={TODAY} context="us" seeAllHref="/metas" />);
    expect(screen.getByRole("link", { name: copy.goals.stack.seeAll }).getAttribute("href")).toBe("/metas");
    expect(screen.queryByRole("button", { name: copy.goals.stack.seeAll })).toBeNull();
  });
});
