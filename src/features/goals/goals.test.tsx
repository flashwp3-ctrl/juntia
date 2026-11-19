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
import { act, configure, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { Profiler } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import type { GoalActions, GoalEntryView, GoalMemberView, GoalPerson, GoalView, SavedEntry } from "./types";
import { GoalCard } from "./goal-card";
import { longestWordEm } from "./format";
import { FAN_REST_DELAY_MS, GoalStack, SWIPE, swipeStep } from "./goal-stack";
import { GoalsScreen } from "./goals-screen";
import { ContributeSheet } from "./contribute-sheet";
import { WithdrawSheet } from "./withdraw-sheet";
import { GoalEntryRow } from "./goal-entry-row";
import { GoalHistory } from "./goal-history";
import { GoalImmersive } from "./goal-immersive";
import { GoalStatusDialog } from "./goal-status-dialog";
import { takeReturnFocus } from "./goal-journey";
import { membersByGoal } from "./members";
import type { GoalMemberTransport } from "@/lib/db/types";

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
  hasPendingRequest: false, targetMonth: "2027-04-01", createdAt: "2025-12-01T17:00:00.000Z", lastContributionDate: null, lastContributionCreatedAt: null, ...overrides,
});
const bike = (overrides: Partial<GoalView> = {}): GoalView => ({
  id: BIKE, name: "Bicicleta de ruta", goalType: "other", scope: "personal", status: "active", version: 2,
  targetMinor: minor(3000000n), balanceMinor: minor(1050000n), progressPercent: 35, myAvailableMinor: minor(1050000n),
  hasPendingRequest: false, targetMonth: null, createdAt: "2026-08-01T17:00:00.000Z", lastContributionDate: null, lastContributionCreatedAt: null, ...overrides,
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

  it("F24: en la pila vertical (Inicio) el % de la que asoma queda en su franja también desde lg; en el abanico, bajo el ícono", () => {
    const vertical = render(<GoalStack goals={[japan(), extra(1)]} members={{ [JAPAN]: japanMembers }} today={TODAY} context="us" fan={false} seeAllHref="/metas" />);
    const chip = vertical.container.querySelector<HTMLElement>("[data-stack-layer='1'] [data-peek-percent]")!;
    expect(chip.textContent).toBe(copy.goals.percent(1));
    expect(chip.className).toContain("top-3.5");
    expect(chip.className).not.toContain("lg:top-16");
    vertical.unmount();
    const { container } = stack([japan(), extra(1)]);
    expect(container.querySelector<HTMLElement>("[data-stack-layer='1'] [data-peek-percent]")!.className).toContain("lg:top-16");
  });

  it("F19: desde lg el pie «N metas · Ver todas» va del ancho del abanico, pegado a las tarjetas; la pila de Inicio no cambia", () => {
    const { container, unmount } = stack([japan(), extra(1)]);
    expect(container.querySelector<HTMLElement>("[data-goal-stack]")!.className).toContain("lg:w-fit");
    unmount();
    const home = render(<GoalStack goals={[japan(), extra(1)]} members={{ [JAPAN]: japanMembers }} today={TODAY} context="us" fan={false} seeAllHref="/metas" />);
    expect(home.container.querySelector<HTMLElement>("[data-goal-stack]")!.className).not.toContain("lg:w-fit");
  });
});

describe("Metas en Yo y Nosotros (Q11; FR-035)", () => {
  it("Nosotros: «Apartado en metas compartidas» con su nota, solo compartidas", () => {
    render(<GoalsScreen data={{ context: "us", goals: [japan()], members: { [JAPAN]: japanMembers }, totals: { balanceMinor: minor(11340000n), myAvailableMinor: minor(6120000n), count: 1 } }} people={people} today={TODAY} actions={actions()} />);
    expect(screen.getByText(copy.goals.totals.us)).toBeTruthy();
    expect(screen.getByText(copy.goals.totals.usNote)).toBeTruthy();
    expect(screen.getByText("$11.340.000", { selector: "[data-goals-total]" })).toBeTruthy();
  });

  it("Yo: personales y, aparte, compartidas con «Tu disponible» (T084); el total personal no suma las compartidas", () => {
    render(<GoalsScreen data={{ context: "me", goals: [bike(), japan()], members: { [BIKE]: bikeMembers, [JAPAN]: japanMembers }, totals: { balanceMinor: minor(1050000n), myAvailableMinor: minor(1050000n), count: 1 } }} people={people} today={TODAY} actions={actions()} />);
    const mine = screen.getByRole("region", { name: copy.goals.sections.mine });
    const shared = screen.getByRole("region", { name: copy.goals.sections.shared });
    expect(within(mine).getByRole("link", { name: /^Bicicleta de ruta/ })).toBeTruthy();
    expect(within(mine).queryByRole("link", { name: /^Japón/ })).toBeNull();
    expect(within(shared).getByRole("link", { name: /^Japón/ })).toBeTruthy();
    expect(within(shared).getByText(copy.goals.yourShare("$6.120.000"))).toBeTruthy();
    expect(within(shared).getByText("Tu disponible $6.120.000")).toBeTruthy();
    expect(within(shared).getByText("Cada una muestra tu disponible. No se suman a tus metas.")).toBeTruthy();
    expect(shared.textContent).not.toContain("Tus aportes");
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

  it("F18: con el campo vacío el botón dice «Registrar aporte», sin «$0»; con importe, lo nombra", async () => {
    const user = userEvent.setup();
    const { dialog } = sheet();
    const field = within(dialog).getByRole("textbox", { name: copy.goals.contribute.amount });
    expect(within(dialog).getByRole("button", { name: copy.goals.contribute.submitEmpty })).toBeTruthy();
    expect(dialog.textContent).not.toContain("$0");
    await user.type(field, "500000");
    expect(within(dialog).getByRole("button", { name: copy.goals.contribute.submit("$500.000") })).toBeTruthy();
    await user.clear(field);
    expect(within(dialog).getByRole("button", { name: copy.goals.contribute.submitEmpty })).toBeTruthy();
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

  it("F18: con el campo vacío el botón dice «Retirar», sin «$0»", async () => {
    const user = userEvent.setup();
    const { dialog } = sheet();
    expect(within(dialog).getByRole("button", { name: copy.goals.withdrawSheet.submitEmpty })).toBeTruthy();
    expect(dialog.textContent).not.toContain("$0");
    await user.type(within(dialog).getByRole("textbox", { name: copy.goals.withdrawSheet.amount }), "200000");
    expect(within(dialog).getByRole("button", { name: copy.goals.withdrawSheet.submit("$200.000") })).toBeTruthy();
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

  it("retiro: «Retiro de la meta» con su motivo y `arrow-u-up-left`, sin «+», sin ficha ni color de ingreso (T084)", () => {
    const { container } = render(<ul><li><GoalEntryRow entry={entry({ goalId: BIKE, goalName: "Bicicleta de ruta", kind: "withdrawal", amountMinor: minor(200000n), fundingMode: null, reason: "La bicicleta puede esperar" })} people={people} dateLabel="Hoy" variant="activity" /></li></ul>);
    const row = container.querySelector("[data-goal-entry]") as HTMLElement;
    expect(within(row).getByText("Retiro de la meta")).toBeTruthy();
    expect(within(row).getByText("Bicicleta de ruta · La bicicleta puede esperar · Sara")).toBeTruthy();
    expect(row.textContent).not.toMatch(/reasignación/);
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
  const history = (writes = actions()) => render(<GoalHistory goal={japan()} entries={entries} members={japanMembers} people={people} today={TODAY} actions={writes} />);

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

  it("F04: al entrar por URL (sin interacción) el foco va al título sin anillo; al llegar desde la tarjeta decide el navegador", async () => {
    media(true);
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    vi.stubGlobal("navigator", { ...navigator, userActivation: { hasBeenActive: false } });
    const first = render(<GoalImmersive goal={japan()} members={japanMembers} entries={[]} people={people} today={TODAY} context="us" actions={actions()} />);
    const title = screen.getByRole("heading", { level: 1, name: "Japón" });
    await act(async () => {});
    expect(document.activeElement).toBe(title);
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true, focusVisible: false });
    expect(title.hasAttribute("data-quiet-focus")).toBe(true);
    expect(title.className).toContain("data-[quiet-focus]:focus-visible:outline-none");
    fireEvent.blur(title);
    expect(title.hasAttribute("data-quiet-focus")).toBe(false);
    first.unmount();
    vi.stubGlobal("navigator", { ...navigator, userActivation: { hasBeenActive: true } });
    render(<GoalImmersive goal={japan()} members={japanMembers} entries={[]} people={people} today={TODAY} context="us" actions={actions()} />);
    await act(async () => {});
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(screen.getByRole("heading", { level: 1, name: "Japón" }).hasAttribute("data-quiet-focus")).toBe(false);
    focus.mockRestore();
  });

  it("F06: arriba, lo disponible de cada uno; con algo usado, también lo aportado, que es lo que dice el historial", () => {
    media(true);
    const used: GoalMemberView[] = [{ ...japanMembers[0], usedMinor: minor(100000n), availableMinor: minor(6020000n) }, japanMembers[1]];
    render(<GoalImmersive goal={japan()} members={used} entries={[]} people={people} today={TODAY} context="us" actions={actions()} />);
    const list = screen.getByRole("list", { name: copy.goals.immersive.available });
    const lines = [...list.querySelectorAll("[data-member-available]")].map((line) => line.textContent);
    expect(lines).toEqual([
      copy.goals.immersive.availableMine("$6.020.000") + copy.goals.immersive.contributedSuffix("$6.120.000", true),
      copy.goals.immersive.availableOf("Tomás", "$5.220.000"),
    ]);
    expect(lines).toEqual(["Tu disponible $6.020.000 · aportaste $6.120.000", "Disponible de Tomás $5.220.000"]);
    expect(list.textContent).not.toContain("Tus aportes");
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
    render(<GoalHistory goal={japan()} entries={[entry({})]} members={japanMembers} people={people} today={TODAY} actions={writes} />);
    await user.click(screen.getByRole("button", { name: copy.goals.history.void.action }));
    const dialog = screen.getByRole("alertdialog", { name: copy.goals.history.void.title });
    await user.click(within(dialog).getByRole("button", { name: copy.goals.history.void.confirm }));
    expect((await within(dialog).findByRole("alert")).textContent).toBe(copy.goals.errors.fundsUsedWith("$100.000"));
    expect(dialog.textContent).not.toContain(copy.goals.errors.notOpen);
  });

  it("anular con resultado desconocido: cerrar pide «¿Cerrar sin confirmar?» (FR-093)", async () => {
    const user = userEvent.setup();
    render(<GoalHistory goal={japan()} entries={[entry({})]} members={japanMembers} people={people} today={TODAY} actions={actions({ voidEntry: vi.fn(async () => ({ status: "unknown" as const })) })} />);
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

describe("GoalStack · gesto y «Ver todas» (decisiones de los fundadores, PR #68 y 11 de noviembre de 2026)", () => {
  it.each([
    [{ x: -SWIPE.distancePx, y: 0 }, { x: 0, y: 0 }, 1],
    [{ x: -10, y: 0 }, { x: -SWIPE.velocityPxPerS, y: 0 }, 1],
    [{ x: SWIPE.distancePx, y: 0 }, { x: 0, y: 0 }, -1],
    [{ x: 10, y: 0 }, { x: SWIPE.velocityPxPerS, y: 0 }, -1],
    [{ x: -(SWIPE.distancePx - 1), y: 0 }, { x: -100, y: 0 }, 0],
    [{ x: -80, y: 120 }, { x: -600, y: 900 }, 0],
    [{ x: 0, y: -200 }, { x: 0, y: -900 }, 0],
  ] as const)("deslizar %o con velocidad %o → %i (izquierda: la siguiente; derecha: la anterior; más vertical: nada, es scroll)", (offset, velocity, step) => {
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

// Decisión del fundador del 10 de noviembre de 2026 (BRAND_FOUNDATION, «tinte de la categoría de la meta»; Juntia DS v1, «08
// Tintes de meta»): el fallback sin foto pinta el tinte de su tipo; el texto secundario sobre el tinte usa `status.pending`.
describe("Tinte por tipo de meta", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const tokens = readFileSync("src/styles/tokens.css", "utf8");
  it.each(["travel", "home", "wedding", "vehicle", "education", "emergency", "other"] as const)("%s pinta su tinte: fondo, inicial, ícono y borde del riel", (goalType) => {
    const { container } = render(<GoalCard goal={japan({ goalType })} members={japanMembers} today={TODAY} context="us" />);
    const card = container.querySelector("[data-goal-card]") as HTMLElement;
    expect(card.getAttribute("data-goal-tint")).toBe(goalType);
    expect(card.className).toContain("bg-[var(--goal-tint-bg)]");
    expect(card.className).not.toContain("bg-saving-subtle");
    expect(container.querySelector("[data-goal-fallback]")?.className).toContain("text-[color:var(--goal-tint-initial)]");
    expect(container.querySelector("[data-ribbon-on-tint]")).toBeTruthy();
    // Las cuatro variables del tipo existen en el CSS y en los tres bloques de tokens (claro, oscuro y respaldo).
    expect(css).toContain(`[data-goal-tint="${goalType}"] { --goal-tint-bg: var(--color-goal-tint-${goalType}-bg);`);
    for (const part of ["bg", "initial", "icon", "edge"]) expect(tokens.match(new RegExp(`--color-goal-tint-${goalType}-${part}: #[0-9A-F]{6};`, "g"))).toHaveLength(3);
  });

  it("el texto secundario de la tarjeta usa status.pending, nunca text.secondary", () => {
    const { container } = render(<GoalCard goal={japan()} members={japanMembers} today={TODAY} context="us" />);
    const card = container.querySelector("[data-goal-card]") as HTMLElement;
    expect(card.innerHTML).not.toContain("text-ink-secondary");
    expect(card.innerHTML).toContain("text-pending");
  });

  it("las capas traseras conservan su tinte con un filete de 1 px; la frontal lleva la sombra float", () => {
    const { container } = render(<GoalStack goals={[japan(), extra(1)]} members={{}} today={TODAY} context="us" />);
    const [front, back] = [...container.querySelectorAll("[data-goal-card]")] as HTMLElement[];
    expect(front.className).toContain("shadow-float");
    expect(back.className).toContain("bg-[var(--goal-tint-bg)]");
    expect(back.className).toContain("shadow-[0_0_0_1px_var(--color-border-strong)]");
    expect(back.className).not.toMatch(/opacity-/);
  });
});

describe("Orden de la pila (decisión del fundador del 10 de noviembre de 2026)", () => {
  const front = (goals: GoalView[]) => {
    const { container, unmount } = render(<GoalStack goals={goals} members={{}} today={TODAY} context="us" />);
    const ids = [...container.querySelectorAll("[data-stack-layer] [data-goal-card]")].map((node) => node.getAttribute("data-goal-card"));
    unmount();
    return ids;
  };
  const a = extra(1), b = extra(2), c = extra(3);
  it("al frente, la meta con el aporte más reciente (fecha del aporte)", () => {
    expect(front([{ ...a, lastContributionDate: "2026-10-01", lastContributionCreatedAt: "2026-10-01T17:00:00Z" }, { ...b, lastContributionDate: "2026-11-02", lastContributionCreatedAt: "2026-11-02T17:00:00Z" }, c])).toEqual([b.id, a.id, c.id]);
  });
  it("mismo día: gana el aporte registrado más tarde", () => {
    expect(front([{ ...a, lastContributionDate: "2026-11-02", lastContributionCreatedAt: "2026-11-02T09:00:00Z" }, { ...b, lastContributionDate: "2026-11-02", lastContributionCreatedAt: "2026-11-02T21:00:00Z" }])).toEqual([b.id, a.id]);
  });
  it("sin aportes: detrás de las que tienen, y entre ellas por creación (la más antigua primero)", () => {
    const old = { ...c, createdAt: "2025-01-01T00:00:00Z" };
    const young = { ...b, createdAt: "2026-06-01T00:00:00Z" };
    expect(front([young, { ...a, lastContributionDate: "2026-01-05", lastContributionCreatedAt: "2026-01-05T00:00:00Z" }, old])).toEqual([a.id, old.id, young.id]);
  });
});

// Decisión del fundador del 10 de noviembre de 2026 (Juntia DS v1, «08·7 Abanico · hover y foco»; MOTION_SYSTEM §4.1).
describe("Abanico · hover y foco", () => {
  const fan = () => {
    const view = render(<GoalStack goals={[japan(), extra(1), extra(2)]} members={{}} today={TODAY} context="us" onCreate={vi.fn()} />);
    const root = view.container.querySelector("[data-fan]") as HTMLElement;
    const layer = (index: number) => view.container.querySelector(`[data-fan-layer="${index}"]`) as HTMLElement;
    return { ...view, root, layer };
  };

  it("hover en una tarjeta la activa al instante y vuelve al reposo 60 ms después de salir", () => {
    vi.useFakeTimers();
    const { root, layer } = fan();
    fireEvent.pointerEnter(layer(1), { pointerType: "mouse" });
    expect(root.getAttribute("data-fan-active")).toBe("1");
    fireEvent.pointerLeave(layer(1), { pointerType: "mouse" });
    expect(root.getAttribute("data-fan-active")).toBe("1");
    act(() => { vi.advanceTimersByTime(FAN_REST_DELAY_MS); });
    expect(root.hasAttribute("data-fan-active")).toBe(false);
    vi.useRealTimers();
  });

  it("si el puntero pasa a otra tarjeta dentro del margen, va directo a la nueva sin volver a reposo", () => {
    vi.useFakeTimers();
    const { root, layer } = fan();
    fireEvent.pointerEnter(layer(0), { pointerType: "mouse" });
    fireEvent.pointerLeave(layer(0), { pointerType: "mouse" });
    act(() => { vi.advanceTimersByTime(FAN_REST_DELAY_MS - 20); });
    fireEvent.pointerEnter(layer(2), { pointerType: "mouse" });
    expect(root.getAttribute("data-fan-active")).toBe("2");
    act(() => { vi.advanceTimersByTime(FAN_REST_DELAY_MS * 2); });
    expect(root.getAttribute("data-fan-active")).toBe("2");
    vi.useRealTimers();
  });

  it("el toque no activa el hover (en táctil no cambia nada)", () => {
    const { root, layer } = fan();
    fireEvent.pointerEnter(layer(1), { pointerType: "touch" });
    expect(root.hasAttribute("data-fan-active")).toBe(false);
  });

  // 005 · PR B, corrección 4 (FR-053; D3: ≥ 95 % de fotogramas en ≤ 18,2 ms y ninguno > 50 ms con CPU 4×). Laboratorio del run
  // 44349192421: el PRIMER hover a 1440 dio 89,5 % y un fotograma de 66,6 ms. Hasta aquí el hover ponía el estado en React: volvía a
  // pintar las seis capas `m.li` con `layout`, y Motion medía otra vez todo el documento en el fotograma de la interacción. El
  // efecto es solo CSS (globals.css, `data-fan-active`): el atributo se pone en el DOM y React no vuelve a pintar nada.
  it("hover y salida no vuelven a pintar la pila (corrección 4 del PR B: arranque en frío del abanico)", async () => {
    vi.useFakeTimers();
    let commits = 0;
    const view = render(<Profiler id="stack" onRender={() => { commits++; }}><GoalStack goals={[japan(), extra(1), extra(2)]} members={{}} today={TODAY} context="us" onCreate={vi.fn()} /></Profiler>);
    const layer = (index: number) => view.container.querySelector(`[data-fan-layer="${index}"]`) as HTMLElement;
    await act(async () => { vi.advanceTimersByTime(FAN_REST_DELAY_MS * 2); await Promise.resolve(); });
    const before = commits;
    fireEvent.pointerEnter(layer(1), { pointerType: "mouse" });
    fireEvent.pointerLeave(layer(1), { pointerType: "mouse" });
    act(() => { vi.advanceTimersByTime(FAN_REST_DELAY_MS); });
    expect(commits).toBe(before);
    vi.useRealTimers();
  });

  it("el foco de teclado (focus-visible) activa el mismo efecto", () => {
    const { root, layer } = fan();
    const link = layer(1).querySelector("[data-goal-card]") as HTMLElement;
    link.matches = ((selector: string): boolean => selector === ":focus-visible") as unknown as typeof link.matches;
    fireEvent.focus(link);
    expect(root.getAttribute("data-fan-active")).toBe("1");
    // El anillo de foco (2 px, focus.ring) y su offset de 2 px, no solo el offset.
    expect(link.className).toContain("outline-offset-2");
    expect(link.className).toContain("focus-visible:outline-2");
    expect(link.className).toContain("focus-visible:outline-solid");
    expect(link.className).toContain("focus-visible:outline-focus");
  });

  it("fuera del abanico (Inicio) no hay estado de hover", () => {
    const { container } = render(<GoalStack goals={[japan(), extra(1)]} members={{}} today={TODAY} context="us" fan={false} />);
    expect(container.querySelector("[data-fan]")).toBeNull();
    expect(container.querySelector("[data-fan-layer]")).toBeNull();
  });

  it("CSS: solo con puntero fino y desde lg; el movimiento va en los envoltorios, nunca en la capa (área de hover fija)", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const start = css.indexOf("@media (hover: hover) and (pointer: fine) and (min-width: 1024px) {");
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf("\n}\n", start));
    // La capa (`li`, el área de hover) no se transforma ni cambia de pivote: en reposo, el abanico queda como el aprobado.
    expect(block).not.toMatch(/\[data-fan-layer(="\d")?\]\s*\{/);
    expect(block).toContain('[data-fan-active="1"] [data-fan-layer="1"] [data-fan-tilt] { rotate: -4deg; }');
    expect(block).toContain('[data-fan-active="1"] [data-fan-layer="1"] [data-fan-card], [data-fan-active="2"] [data-fan-layer="2"] [data-fan-card] { translate: 24px -8px; scale: 1.02; }');
    expect(block).toContain("[data-fan] [data-fan-tilt] { transform-origin: 0 100%;");
    expect(block).toContain("[data-fan] [data-fan-card] { transform-origin: bottom center;");
  });

  it("CSS: con movimiento reducido, sin desplazamiento, escala ni contragiro (la segunda conserva sus 4°); solo la sombra", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const start = css.indexOf("@media (hover: hover) and (pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: reduce)");
    const reduced = css.slice(start, css.indexOf("\n}\n", start));
    expect(reduced).toContain("translate: none; scale: none; rotate: none;");
    expect(reduced).toContain("transition: box-shadow 120ms linear;");
    expect(reduced).not.toMatch(/translate: -?\d|scale: 1\.|rotate: -?\d/);
  });

  it("la tarjeta vive en dos envoltorios dentro de la capa: la capa (área de hover) no lleva el movimiento", () => {
    const { layer } = fan();
    expect(layer(1).querySelector(":scope > [data-fan-tilt] > [data-fan-card] [data-goal-card]")).toBeTruthy();
  });

  it("si el ratón entra y sale mientras una tarjeta tiene foco de teclado, el efecto vuelve a la enfocada", () => {
    vi.useFakeTimers();
    const { root, layer } = fan();
    const link = layer(0).querySelector("[data-goal-card]") as HTMLElement;
    link.matches = ((selector: string): boolean => selector === ":focus-visible") as unknown as typeof link.matches;
    fireEvent.focus(link);
    fireEvent.pointerEnter(layer(2), { pointerType: "mouse" });
    expect(root.getAttribute("data-fan-active")).toBe("2");
    fireEvent.pointerLeave(layer(2), { pointerType: "mouse" });
    act(() => { vi.advanceTimersByTime(FAN_REST_DELAY_MS); });
    expect(root.getAttribute("data-fan-active")).toBe("0");
    vi.useRealTimers();
  });
});

// Revisión del gestor del PR #68 (punto 2): en Inicio de Yo, la pila mezcla ámbitos; primero las personales y, dentro de cada
// ámbito, la del aporte más reciente. Una compartida con un aporte de ayer no pasa por delante de las personales.
describe("Orden de la pila por ámbito (Inicio en Yo)", () => {
  it("personales delante de compartidas; dentro de cada ámbito, el aporte más reciente", () => {
    const sharedRecent = japan({ id: "a1111111-1111-4111-8111-111111111111", name: "Compartida reciente", lastContributionDate: "2026-11-09", lastContributionCreatedAt: "2026-11-09T12:00:00Z" });
    const personalOld = bike({ id: "a2222222-2222-4222-8222-222222222222", name: "Personal antigua", lastContributionDate: "2026-08-05", lastContributionCreatedAt: "2026-08-05T12:00:00Z" });
    const personalNew = bike({ id: "a3333333-3333-4333-8333-333333333333", name: "Personal nueva", lastContributionDate: "2026-10-01", lastContributionCreatedAt: "2026-10-01T12:00:00Z" });
    const { container } = render(<GoalStack goals={[sharedRecent, personalOld, personalNew]} members={{}} today={TODAY} context="me" fan={false} seeAllHref="/metas" />);
    const ids = [...container.querySelectorAll("[data-stack-layer] [data-goal-card]")].map((node) => node.getAttribute("data-goal-card"));
    expect(ids).toEqual([personalNew.id, personalOld.id, sharedRecent.id]);
  });
});

// T084: la simulación completa de la guía de salida interna contra juntia-dev (12 de noviembre de 2026, código f23fb97).
describe("T084 · fallos de la simulación de la guía de salida", { timeout: 15000 }, () => {
  const media = () => vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  afterEach(() => vi.unstubAllGlobals());
  // Tomás anuló su único aporte: `goal_member_balances` ya no tiene fila suya (la vista agrupa asientos vivos).
  const onlySara: GoalMemberTransport[] = [{ goal_id: JAPAN, user_id: SARA, contributed_minor: minor(6120000n), withdrawn_minor: "0", used_minor: "0", available_minor: minor(6120000n), contribution_count: 11 }];
  const voidedByTomas = [
    entry({ id: "b1111111-1111-4111-8111-111111111111", memberUserId: TOMAS, createdBy: TOMAS, amountMinor: minor(400000n), voided: true, voidedReason: "void" }),
    entry({ id: "b2222222-2222-4222-8222-222222222222", memberUserId: TOMAS, createdBy: TOMAS, amountMinor: minor(300000n), effectiveDate: "2026-10-21", voided: true, voidedReason: "undo" }),
  ];

  it("1 · en una compartida, los dos integrantes siempre están, con $0 si no tienen nada; en una personal, nadie inventado", () => {
    const members = membersByGoal(onlySara, people, [{ id: JAPAN, scope: "shared" }, { id: BIKE, scope: "personal" }]);
    expect(members[JAPAN].map(({ name, availableMinor, contributionCount }) => ({ name, availableMinor, contributionCount }))).toEqual([
      { name: "Sara", availableMinor: minor(6120000n), contributionCount: 11 },
      { name: "Tomás", availableMinor: "0", contributionCount: 0 },
    ]);
    expect(members[BIKE]).toEqual([]);
    // Una personal con asientos: solo su dueña, nunca la otra persona de la pareja.
    const bikeRow: GoalMemberTransport = { goal_id: BIKE, user_id: SARA, contributed_minor: minor(1050000n), withdrawn_minor: "0", used_minor: "0", available_minor: minor(1050000n), contribution_count: 2 };
    expect(membersByGoal([bikeRow], people, [{ id: BIKE, scope: "personal" }])[BIKE].map(({ name }) => name)).toEqual(["Sara"]);
  });

  it("1 · un aporte ANULADO o DESHECHO conserva su autor aunque esa persona se haya quedado sin aportes vivos", () => {
    const members = membersByGoal(onlySara, people, [{ id: JAPAN, scope: "shared" }])[JAPAN];
    render(<GoalHistory goal={japan()} entries={voidedByTomas} members={members} people={people} today={TODAY} actions={actions()} />);
    const rows = [...document.querySelectorAll("[data-goal-entry]")];
    expect(rows).toHaveLength(2);
    // El más reciente (22 oct) es el ANULADO; el del 21, el DESHECHO. Los dos dicen de quién son.
    expect(rows[0].textContent).toContain(copy.goals.history.by("Tomás"));
    expect(rows[0].textContent).toContain(copy.goals.history.voided);
    expect(rows[1].textContent).toContain(copy.goals.history.by("Tomás"));
    expect(rows[1].textContent).toContain(copy.goals.history.undone);
    for (const row of rows) expect(row.textContent).not.toMatch(/De ·/);
    // «Aportes por persona» y el filtro siguen teniendo a Tomás, con $0.
    expect(screen.getByText(copy.goals.immersive.member("Tomás", "$0", 0))).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Tomás" })).toBeTruthy();
  });

  it("1 · aunque la lista de saldos no lo traiga, el autor sale de las personas de la pareja", () => {
    const sara = membersByGoal(onlySara, people, [{ id: JAPAN, scope: "shared" }])[JAPAN].slice(0, 1);
    render(<GoalHistory goal={japan()} entries={voidedByTomas} members={sara} people={people} today={TODAY} actions={actions()} />);
    expect(screen.getAllByText(copy.goals.history.by("Tomás"), { exact: false })).toHaveLength(2);
  });

  it("1 · «Disponible por persona» muestra a Tomás con $0 en la meta inmersiva", () => {
    media();
    const members = membersByGoal(onlySara, people, [{ id: JAPAN, scope: "shared" }])[JAPAN];
    render(<GoalImmersive goal={japan()} members={members} entries={voidedByTomas} people={people} today={TODAY} context="us" actions={actions()} />);
    const list = screen.getByRole("list", { name: copy.goals.immersive.available });
    expect([...list.querySelectorAll("[data-member-available]")].map((line) => line.textContent)).toEqual(["Tu disponible $6.120.000", "Disponible de Tomás $0"]);
  });

  it("1 · una compartida lograda sin fondos de nadie sigue con la cinta llena aunque ahora traiga a los dos en $0", () => {
    const zeroes = membersByGoal([], people, [{ id: JAPAN, scope: "shared" }])[JAPAN];
    expect(zeroes).toHaveLength(2);
    const { container } = render(<GoalCard goal={japan({ status: "completed", balanceMinor: "0", progressPercent: 0 })} members={zeroes} today={TODAY} context="us" />);
    expect(container.querySelectorAll("[data-ribbon-part]")).toHaveLength(1);
  });

  it("2 · «Anular aporte» solo si lo disponible de quien mira cubre el aporte entero (la regla del servidor, JT204)", () => {
    // Sara aportó 500.000 y 200.000 y retiró 400.000: le quedan 300.000. El de 500.000 ya no se puede anular; el de 200.000, sí.
    const list = [
      entry({ id: "c1111111-1111-4111-8111-111111111111", amountMinor: minor(500000n), effectiveDate: "2026-10-10" }),
      entry({ id: "c2222222-2222-4222-8222-222222222222", amountMinor: minor(200000n), effectiveDate: "2026-10-12" }),
      entry({ id: "c3333333-3333-4333-8333-333333333333", kind: "withdrawal", amountMinor: minor(400000n), fundingMode: null, reason: "Otro plan", effectiveDate: "2026-10-14" }),
    ];
    render(<GoalHistory goal={japan({ myAvailableMinor: minor(300000n) })} entries={list} members={japanMembers} people={people} today={TODAY} actions={actions()} />);
    const rowOf = (id: string) => document.querySelector(`[data-entry-id="${id}"]`) as HTMLElement;
    expect(within(rowOf("c1111111-1111-4111-8111-111111111111")).queryByRole("button", { name: copy.goals.history.void.action })).toBeNull();
    expect(within(rowOf("c2222222-2222-4222-8222-222222222222")).getByRole("button", { name: copy.goals.history.void.action })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: copy.goals.history.void.action })).toHaveLength(1);
  });

  it("3 · Escape y × dejan dicha la tarjeta de origen: Metas devuelve el foco a esta meta, también si se llegó por URL", async () => {
    media();
    const user = userEvent.setup();
    takeReturnFocus();
    const { unmount } = render(<GoalImmersive goal={japan()} members={japanMembers} entries={[]} people={people} today={TODAY} context="us" actions={actions()} />);
    await act(async () => {});
    await user.keyboard("{Escape}");
    expect(router.push).toHaveBeenCalledWith("/metas");
    expect(takeReturnFocus()).toEqual({ goalId: JAPAN, keyboard: true });
    unmount();
    const second = render(<GoalImmersive goal={japan()} members={japanMembers} entries={[]} people={people} today={TODAY} context="us" actions={actions()} />);
    const close = screen.getByRole("link", { name: copy.goals.immersive.close });
    close.addEventListener("click", (event) => event.preventDefault());
    await user.click(close);
    second.unmount();
    // Y Metas lo usa: el foco llega a la tarjeta de Japón, no a BODY.
    render(<GoalsScreen data={{ context: "us", goals: [japan()], members: { [JAPAN]: japanMembers }, totals: null }} people={people} today={TODAY} actions={actions()} />);
    expect(document.activeElement).toBe(document.querySelector(`[data-goal-card="${JAPAN}"]`));
  });

  // F80-1 (revisión de ChatGPT del PR #80): una archivada no tiene tarjeta en la pila, y una meta de otro contexto no está en
  // la pantalla. El foco vuelve a su fila de «Archivadas» o, si no hay nada de esa meta, al título de Metas; nunca a BODY.
  async function closeWith(how: "escape" | "x", goal: GoalView) {
    const user = userEvent.setup();
    takeReturnFocus();
    const view = render(<GoalImmersive goal={goal} members={japanMembers} entries={[]} people={people} today={TODAY} context="us" actions={actions()} />);
    await act(async () => {});
    if (how === "escape") await user.keyboard("{Escape}");
    else {
      const close = screen.getByRole("link", { name: copy.goals.immersive.close });
      close.addEventListener("click", (event) => event.preventDefault());
      await user.click(close);
    }
    view.unmount();
  }
  const metas = (goals: GoalView[]) => render(
    <main><h1>{copy.nav.goals}</h1><GoalsScreen data={{ context: "us", goals, members: { [JAPAN]: japanMembers }, totals: null }} people={people} today={TODAY} actions={actions()} /></main>,
  );

  it.each(["escape", "x"] as const)("F80-1 · una archivada cerrada con %s devuelve el foco a su fila de «Archivadas»", async (how) => {
    media();
    const archived = japan({ status: "archived", balanceMinor: "0", myAvailableMinor: "0", progressPercent: 0 });
    await closeWith(how, archived);
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    metas([archived, bike({ scope: "shared" })]);
    const row = document.querySelector<HTMLElement>(`[data-goal-return="${JAPAN}"]`)!;
    expect(row.closest("section")?.getAttribute("aria-labelledby")).toBe("goals-archived");
    expect(row.hasAttribute("data-goal-card")).toBe(false);
    expect(document.activeElement).toBe(row);
    // Con el teclado (Escape) decide el navegador; con un toque en la ×, sin anillo (como F04).
    expect(focus).toHaveBeenLastCalledWith(how === "escape" ? { preventScroll: false } : { preventScroll: false, focusVisible: false });
    focus.mockRestore();
  });

  // F80-2 (revisión de ChatGPT del PR #80): la cuarta meta sigue montada en la pila, dentro de `li.sr-only`. Volver de ella nunca
  // enfoca esa tarjeta invisible: va a «Ver todas» de su pila.
  it("F80-2 · cuatro metas, se vuelve de la cuarta: el foco va a «Ver todas», nunca a la tarjeta oculta", async () => {
    media();
    const fourth = extra(3);
    const goals = [japan(), extra(1), extra(2), fourth];
    await closeWith("escape", fourth);
    const first = metas(goals);
    const hiddenCard = document.querySelector<HTMLElement>(`[data-goal-return="${fourth.id}"]`)!;
    expect(hiddenCard.closest(".sr-only")).not.toBeNull();
    const active = document.activeElement as HTMLElement;
    expect(active).not.toBe(hiddenCard);
    expect(active.closest(".sr-only, [hidden], [aria-hidden='true']")).toBeNull();
    expect(active).toBe(screen.getByRole("button", { name: copy.goals.stack.seeAll }));
    // Una de las tres que se ven sí recibe el foco en su tarjeta.
    first.unmount();
    await closeWith("escape", extra(1));
    metas(goals);
    const shownCard = [...document.querySelectorAll<HTMLElement>(`[data-goal-return="${extra(1).id}"]`)].find((node) => !node.closest(".sr-only"));
    expect(document.activeElement).toBe(shownCard);
  });

  it.each(["escape", "x"] as const)("F80-1 · si la meta cerrada no está en la pantalla (%s), el foco va al título de Metas", async (how) => {
    media();
    await closeWith(how, japan());
    // Metas en otro contexto: Japón no está, ni en la pila ni en «Archivadas».
    metas([bike({ scope: "shared" })]);
    const title = screen.getByRole("heading", { level: 1, name: copy.nav.goals });
    expect(document.activeElement).toBe(title);
    expect(title.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).not.toBe(document.body);
  });

  it("8 · textos de los fundadores: «Retiro de la meta», el uso sin «no es un gasto nuevo» y «Tu disponible»", () => {
    expect(copy.goals.history.withdrawal).toBe("Retiro de la meta");
    expect(copy.goals.activity.withdrawal).toBe("Retiro de la meta");
    expect(copy.goals.activity.withdrawalMeta("Japón", "Tomás", null)).toBe("Japón · Tomás");
    expect(copy.goals.activity.usage("Japón")).toBe("Uso de Japón");
    expect(copy.goalExpense.detail.use("Japón", "Sara")).toBe("Uso de Japón · Aportes de Sara");
    expect(copy.goals.yourShare("$6.120.000")).toBe("Tu disponible $6.120.000");
    // Ningún texto de interfaz conserva lo anterior (los comentarios del módulo de copy sí pueden citarlo).
    const strings = readFileSync("src/lib/copy/es.ts", "utf8").split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
    expect(strings).not.toMatch(/reasignación|no es un gasto nuevo|Tus aportes \$\{/);
  });

  it("4 · la nota de archivar solo aparece cuando bloquea (saldo o solicitud pendiente)", () => {
    const description = () => screen.getByRole("alertdialog", { name: copy.goals.statusDialog.archiveTitle }).textContent ?? "";
    const { unmount } = render(<GoalStatusDialog kind="archive" goal={japan({ balanceMinor: "0", myAvailableMinor: "0", progressPercent: 0 })} idempotencyKey={KEY} actions={actions()} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(description()).toContain(copy.goals.statusDialog.archiveDescription);
    expect(description()).not.toContain(copy.goals.errors.cannotArchive);
    unmount();
    const second = render(<GoalStatusDialog kind="archive" goal={japan()} idempotencyKey={KEY} actions={actions()} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(description()).toContain(copy.goals.errors.cannotArchive);
    second.unmount();
    render(<GoalStatusDialog kind="archive" goal={japan({ balanceMinor: "0", hasPendingRequest: true })} idempotencyKey={KEY} actions={actions()} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(description()).toContain(copy.goals.errors.cannotArchive);
  });
});

// F79-2 (revisión del PR #79): con la letra ampliada el título de la tarjeta crece (mínimo en rem) hasta donde cabe entera su
// palabra más larga; el ancho estimado nunca queda por debajo del real, o la palabra se recortaría.
describe("Título de la tarjeta con el texto ampliado", () => {
  // Anchos medidos con canvas sobre Brygada 1918 500 en Chromium (em, sin tracking), nov 2026.
  const measured: Record<string, number> = { Emergencias: 6.099, Bicicleta: 4.076, "Japón": 2.781, familiares: 4.762, Vacaciones: 5.251, "Electrodomésticos": 8.704, Universitario: 6.188, Apartamento: 6.209, MMMMMMMMMM: 9.11, iiiiiiiiii: 3.21 };
  it.each(Object.entries(measured))("«%s»: la estimación no queda por debajo de lo medido (%s em)", (word, width) => {
    expect(longestWordEm(word)).toBeGreaterThanOrEqual(width);
  });

  it("usa la palabra más larga del nombre", () => {
    expect(longestWordEm("Vacaciones familiares")).toBe(longestWordEm("Vacaciones"));
  });

  it("el título lleva su ancho y un tamaño con mínimo en rem", () => {
    const { container } = render(<GoalCard goal={japan({ name: "Emergencias" })} members={japanMembers} today={TODAY} context="us" />);
    const title = container.querySelector("[data-goal-title]") as HTMLElement;
    expect(title.style.getPropertyValue("--title-em")).toBe(String(longestWordEm("Emergencias")));
    expect(title.className).toContain("text-[clamp(1.625rem,8vw,2rem)]");
    expect(title.className).toContain("max-md:text-[max(clamp(26px,8vw,2rem),min(clamp(1.625rem,8vw,2rem),calc((100vw_-_2.5rem_-_88px_+_(1rem_-_16px)*3)/var(--title-em))))]");
    // Sin contención de tamaño: la tarjeta se ajusta a su contenido en Inicio (F79-2).
    expect(title.parentElement?.className).not.toContain("@container");
  });
});

// 005 T015 · FR-012 (US-21): «Apartado en Juntia» y «Transferencia declarada» se pintan tal cual salen de `es.ts`
// (`modes.reserved`, `modes.transferred_declared`) y ningún texto de la fila, la hoja ni la ayuda presenta el dinero como
// verificado por un banco (palabras prohibidas del glosario §9: «Depositado en tu cuenta», «Transferencia verificada»).
describe("US-21 · modo del aporte, tal cual y nunca verificado (005 T015)", () => {
  const FORBIDDEN = /Depositad|Depositar|verificad|Invert|banco|bancari/i;
  it("la fila del historial pinta cada modo con la cadena exacta de es.ts", () => {
    for (const fundingMode of ["reserved", "transferred_declared"] as const) {
      const { container, unmount } = render(<ul><li><GoalEntryRow entry={entry({ fundingMode })} people={people} dateLabel="22 oct" variant="history" /></li></ul>);
      const row = container.querySelector("[data-goal-entry]") as HTMLElement;
      expect(within(row).getByText(`${copy.goals.history.by("Sara")} · ${copy.goals.contribute.modes[fundingMode]}`)).toBeTruthy();
      expect(row.textContent).not.toMatch(FORBIDDEN);
      unmount();
    }
    expect(copy.goals.contribute.modes).toEqual({ reserved: "Apartado en Juntia", transferred_declared: "Transferencia declarada" });
  });
  it("la hoja de aporte, con «Transferencia declarada» elegida, enseña su ayuda y nada la presenta como verificada", async () => {
    const user = userEvent.setup();
    render(<ContributeSheet open onClose={vi.fn()} goal={japan()} context="us" today={TODAY} idempotencyKey={KEY} actions={actions()} onDone={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: copy.goals.contribute.title });
    await user.click(within(dialog).getByRole("radio", { name: copy.goals.contribute.modes.transferred_declared }));
    expect(within(dialog).getByText(copy.goals.contribute.modeHelp)).toBeTruthy();
    expect(within(dialog).getByRole("radio", { name: copy.goals.contribute.modes.reserved })).toBeTruthy();
    expect(dialog.textContent).not.toMatch(FORBIDDEN);
  });
});

// 005 · PR B (CLS, FR-050; gestor, 19 nov 2026): «Ver todas» va alineado a la derecha del pie y se movía 3 px al llegar Onest
// (parcial 44443835179, Metas). Criterio: su texto en una caja del ancho que mide en Onest, en el enlace y en el botón.
describe("«Ver todas» con caja de ancho fijo (PR B)", () => {
  it("enlace (Inicio) y botón (Metas) llevan su texto en StableLabel", () => {
    const { unmount } = render(<GoalStack goals={[japan(), extra(1)]} members={{}} today={TODAY} context="us" fan={false} seeAllHref="/metas" />);
    expect(document.querySelector("[data-goal-see-all] [data-stable-label]")?.textContent).toBe(copy.goals.stack.seeAll);
    unmount();
    render(<GoalStack goals={[japan(), extra(1)]} members={{}} today={TODAY} context="us" />);
    expect(document.querySelector("[data-goal-see-all] [data-stable-label]")?.textContent).toBe(copy.goals.stack.seeAll);
  });
});

// 005 · PR B, revisión del #90 (F90-1 y F90-3): `data-fan-active` vive en el DOM y React no lo reconcilia. Criterios: (1) el efecto
// sigue a la misma META (por id) cuando un nuevo render la cambia de capa; (2) cuando la meta deja de estar entre las visibles, el
// efecto se apaga y no se reactiva solo si vuelve sin interacción, ni lo restaura un pointerleave; (3) al pasar a «Ver todas» y
// volver, no se restaura un hover que ya terminó. Los fixtures empatan en stackOrder (misma creación, sin aportes) y se ordenan por
// id: para que las capas cambien de verdad, se da un aporte reciente a la meta que tiene que pasar al frente.
describe("abanico: el efecto sigue a la meta, no al índice (F90-1, F90-3)", () => {
  const a = japan(), b = extra(1), c = extra(2), d = extra(3);
  const recent = (goal: GoalView): GoalView => ({ ...goal, lastContributionDate: "2026-11-18", lastContributionCreatedAt: "2026-11-18T12:00:00Z" });
  const stack = (goals: GoalView[]) => <GoalStack goals={goals} members={{}} today={TODAY} context="us" onCreate={vi.fn()} />;
  const fanRoot = (container: HTMLElement) => container.querySelector("[data-fan]") as HTMLElement;
  const layerOf = (container: HTMLElement, id: string) => container.querySelector(`[data-goal-card="${id}"]`)?.closest("[data-fan-layer]")?.getAttribute("data-fan-layer") ?? null;
  const focusGoal = (container: HTMLElement, id: string) => {
    const link = container.querySelector(`[data-goal-card="${id}"]`) as HTMLElement;
    link.matches = ((selector: string): boolean => selector === ":focus-visible") as unknown as typeof link.matches;
    fireEvent.focus(link);
  };

  it("los fixtures empatan: sin aportes, el orden de las capas no depende del array", () => {
    const one = render(stack([a, b, c]));
    const layers = [a, b, c].map((goal) => layerOf(one.container, goal.id));
    one.unmount();
    const two = render(stack([c, a, b]));
    expect([a, b, c].map((goal) => layerOf(two.container, goal.id))).toEqual(layers);
  });

  it("tras un render que cambia la capa de la meta enfocada, el efecto la sigue", () => {
    const view = render(stack([a, b, c]));
    const before = layerOf(view.container, b.id);
    expect(before).not.toBe("0");
    focusGoal(view.container, b.id);
    expect(fanRoot(view.container).getAttribute("data-fan-active")).toBe(before);
    view.rerender(stack([a, recent(b), c]));
    expect(layerOf(view.container, b.id)).toBe("0");
    expect(fanRoot(view.container).getAttribute("data-fan-active")).toBe("0");
  });

  it("B con foco desaparece y reaparece sin interacción: ninguna tarjeta queda activa; tampoco tras un pointerleave", () => {
    vi.useFakeTimers();
    try {
      const view = render(stack([a, b, c]));
      focusGoal(view.container, b.id);
      expect(fanRoot(view.container).hasAttribute("data-fan-active")).toBe(true);
      view.rerender(stack([a, c, d]));
      expect(fanRoot(view.container).hasAttribute("data-fan-active")).toBe(false);
      view.rerender(stack([a, b, c]));
      expect(fanRoot(view.container).hasAttribute("data-fan-active")).toBe(false);
      // Un hover que termina no restaura el foco obsoleto de B.
      const layer = view.container.querySelector(`[data-goal-card="${c.id}"]`)!.closest("[data-fan-layer]") as HTMLElement;
      fireEvent.pointerEnter(layer, { pointerType: "mouse" });
      fireEvent.pointerLeave(layer, { pointerType: "mouse" });
      act(() => { vi.advanceTimersByTime(FAN_REST_DELAY_MS); });
      expect(fanRoot(view.container).hasAttribute("data-fan-active")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("el puntero sale de C mientras la meta enfocada desaparece: C no queda activa", () => {
    vi.useFakeTimers();
    try {
      const view = render(stack([a, b, c]));
      focusGoal(view.container, b.id);
      const layer = view.container.querySelector(`[data-goal-card="${c.id}"]`)!.closest("[data-fan-layer]") as HTMLElement;
      fireEvent.pointerEnter(layer, { pointerType: "mouse" });
      fireEvent.pointerLeave(layer, { pointerType: "mouse" });
      view.rerender(stack([a, c, d]));
      act(() => { vi.advanceTimersByTime(FAN_REST_DELAY_MS); });
      expect(fanRoot(view.container).hasAttribute("data-fan-active")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("«Ver todas» y vuelta: no se restaura un hover que ya terminó", () => {
    const view = render(stack([a, b, c]));
    const layer = view.container.querySelector(`[data-goal-card="${b.id}"]`)!.closest("[data-fan-layer]") as HTMLElement;
    fireEvent.pointerEnter(layer, { pointerType: "mouse" });
    expect(fanRoot(view.container).hasAttribute("data-fan-active")).toBe(true);
    const seeAll = view.container.querySelector("[data-goal-see-all]") as HTMLElement;
    fireEvent.click(seeAll);
    fireEvent.click(view.container.querySelector("[data-goal-see-all]") as HTMLElement);
    expect(fanRoot(view.container).hasAttribute("data-fan-active")).toBe(false);
  });
});

// 005 · PR B, revisión del #90 (F90-2): el precalentamiento de capas (`will-change`) solo para las tarjetas VISIBLES del abanico;
// las metas ocultas (sr-only) conservan data-fan-tilt y data-fan-card pero no data-fan-layer.
describe("abanico: will-change solo en las capas visibles (F90-2)", () => {
  it("las reglas con will-change exigen data-fan-layer", () => {
    const css = readFileSync("src/app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = [...css.matchAll(/([^{}]+)\{[^{}]*will-change[^{}]*\}/g)].map((match) => match[1].trim()).filter((selector) => selector.includes("data-fan"));
    expect(rules).toEqual(["[data-fan] [data-fan-layer] [data-fan-tilt]", "[data-fan] [data-fan-layer] [data-fan-card]"]);
  });
  it("con 6 metas, solo 3 tarjetas llevan data-fan-layer (las que reciben will-change)", () => {
    const view = render(<GoalStack goals={[japan(), extra(1), extra(2), extra(3), extra(4), extra(5)]} members={{}} today={TODAY} context="us" onCreate={vi.fn()} />);
    expect(view.container.querySelectorAll("[data-fan-layer] [data-fan-card]")).toHaveLength(3);
    expect(view.container.querySelectorAll("[data-fan-card]")).toHaveLength(6);
  });
});
