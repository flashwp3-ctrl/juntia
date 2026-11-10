// 004 PR D, T057 / FR-050–FR-053, FR-056, FR-057, FR-059, FR-072; FR-113; US-7, US-8; F64-1 — capa: componentes (Vitest +
// RTL selectivo, ADR-011 fila 5).
// Criterio literal (tasks.md, T057): «"Dinero del mes" por defecto (ruta mínima intacta), B1 solo con metas del contexto (en
// Nosotros ninguna personal, ni deshabilitada), FundingLedger (propuesta proporcional, topes, "Suman $X de $Y", Guardar
// bloqueado), B3 con "ahora" y "si aprueba", ConfirmationBadge en sus cinco estados ("NO SE REGISTRÓ" solo con rechazo
// confirmado), la tarjeta pendiente con "No vence" y "Cancelar solicitud", "Uso quitado", la LimitNote de Mover a Pareja, la
// confirmación de eliminar que avisa del uso y el aviso de reactivación "La meta {nombre} volvió a estar activa: se
// devolvieron $X"».
// Cifras del dataset dorado de P0-3 (spec, partes A y D): Japón 11.340.000 de 18.000.000, Sara 6.120.000 y Tomás 5.220.000
// disponibles; los tiquetes a Tokio de 3.000.000 con 1.620.000 de Sara y 1.380.000 pedidos a Tomás (`ticketsPending`:
// Japón 9.720.000; `ticketsApproved`: 8.340.000, Tomás 3.840.000). Bicicleta de ruta, personal de Sara, 1.050.000.
import { act, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "../annotate-provider";
import { TransactionActions } from "../transaction-actions";
import type { ExpenseActions, SavedTransaction } from "../types";
import type { CoupleForSheet, SavedShared, SharedActions } from "../shared-types";
import { GoalEntryRow } from "@/features/goals/goal-entry-row";
import type { GoalEntryView, GoalPerson } from "@/features/goals/types";
import { ConfirmationBadge } from "./confirmation-badge";
import { FundingEffect } from "./funding-effect";
import { UsageRequestCard } from "./usage-request-card";
import { FundedMoveNote, RemoveGoalUsage } from "./remove-usage";
import { reactivationMessage } from "./reactivation";
import type { FundingGoal, GoalFundingActions, SavedGoalExpense, UsageRequestView } from "./types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));
afterEach(() => vi.clearAllMocks());

const SARA = "11111111-1111-4111-8111-111111111111";
const TOMAS = "22222222-2222-4222-8222-222222222222";
const JAPAN = "44444444-4444-4444-8444-444444444444";
const BIKE = "55555555-5555-4555-8555-555555555555";
const EXPENSE = "66666666-6666-4666-8666-666666666666";
const REQUEST = "77777777-7777-4777-8777-777777777777";
const minor = (pesos: bigint) => (pesos * 100n).toString();
const people: GoalPerson[] = [{ userId: SARA, name: "Sara", joinOrder: 1, isMe: true }, { userId: TOMAS, name: "Tomás", joinOrder: 2, isMe: false }];
const couple: CoupleForSheet = { members: people, last: null };

const japan: FundingGoal = {
  id: JAPAN, name: "Japón", goalType: "travel", status: "active", version: 3, balanceMinor: minor(11340000n), targetMinor: minor(18000000n), progressPercent: 63,
  members: [{ userId: SARA, availableMinor: minor(6120000n) }, { userId: TOMAS, availableMinor: minor(5220000n) }],
};
const bike: FundingGoal = {
  id: BIKE, name: "Bicicleta de ruta", goalType: "other", status: "active", version: 2, balanceMinor: minor(1050000n), targetMinor: minor(3000000n), progressPercent: 35,
  members: [{ userId: SARA, availableMinor: minor(1050000n) }],
};
const shared = (overrides: Partial<SavedShared> = {}): SavedShared => ({
  id: EXPENSE, categoryId: "transport", transactionDate: "2026-11-03", description: "Tiquetes a Tokio", amountMinor: minor(3000000n), payerUserId: SARA,
  splitMode: "equal", splitPercents: null, parts: { [SARA]: minor(1500000n), [TOMAS]: minor(1500000n) }, version: 1, createdBy: SARA, updatedBy: null,
  updatedAt: "2026-11-03T15:00:00.000Z", movedFromMe: false, ...overrides,
});
const privateSaved = (overrides: Partial<SavedTransaction> = {}): SavedTransaction => ({
  id: EXPENSE, type: "expense", categoryId: "transport", transactionDate: "2026-11-03", description: "Repuestos", amountMinor: minor(400000n), version: 1, ...overrides,
});

function goalFunding(overrides: Partial<GoalFundingActions> = {}): GoalFundingActions {
  return {
    loadGoals: vi.fn<GoalFundingActions["loadGoals"]>(async ({ context }) => ({ ok: true, goals: context === "us" ? [japan] : [bike] })),
    create: vi.fn<GoalFundingActions["create"]>(async (payload) => ({ status: "ok", value: (payload.context === "us"
      ? { context: "us", transaction: shared(), goalId: JAPAN, requestId: REQUEST }
      : { context: "me", transaction: privateSaved(), goalId: BIKE, requestId: null }) satisfies SavedGoalExpense })),
    approve: vi.fn<GoalFundingActions["approve"]>(async () => ({ status: "ok", value: { requestId: REQUEST, status: "approved" } })),
    reject: vi.fn<GoalFundingActions["reject"]>(async () => ({ status: "ok", value: { requestId: REQUEST, status: "rejected" } })),
    cancel: vi.fn<GoalFundingActions["cancel"]>(async () => ({ status: "ok", value: { requestId: REQUEST, status: "cancelled" } })),
    removeUsage: vi.fn<GoalFundingActions["removeUsage"]>(async () => ({ status: "ok", value: { transactionId: EXPENSE, version: 2, reactivatedGoals: [] } })),
    undoExpense: vi.fn<GoalFundingActions["undoExpense"]>(async () => ({ status: "ok", value: { id: EXPENSE, version: 2, reactivatedGoals: [] } })),
    check: vi.fn<GoalFundingActions["check"]>(async () => ({ state: "not_found" })),
    ...overrides,
  };
}
function expenseActions(): ExpenseActions {
  return {
    create: vi.fn<ExpenseActions["create"]>(async () => ({ ok: true, value: privateSaved() })),
    update: vi.fn<ExpenseActions["update"]>(async () => ({ ok: true, value: privateSaved() })),
    voidTransaction: vi.fn<ExpenseActions["voidTransaction"]>(async () => ({ ok: true, value: { id: EXPENSE, version: 2 } })),
  };
}
function sharedActions(): SharedActions {
  return {
    create: vi.fn<SharedActions["create"]>(async () => ({ status: "ok", value: shared() })),
    update: vi.fn<SharedActions["update"]>(async () => ({ status: "ok", value: shared() })),
    voidShared: vi.fn<SharedActions["voidShared"]>(async () => ({ status: "ok", value: { id: EXPENSE, version: 2 } })),
    check: vi.fn<SharedActions["check"]>(async () => ({ state: "not_found" })),
  };
}

function Trigger() {
  const { openFrom } = useAnnotate();
  return <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>;
}
function setup({ context = "us", funding = goalFunding(), withCouple = true }: { context?: "me" | "us"; funding?: GoalFundingActions; withCouple?: boolean } = {}) {
  const user = userEvent.setup();
  const actions = expenseActions();
  const sharedWrites = sharedActions();
  render(
    <AnnotateProvider actions={actions} sharedActions={sharedWrites} couple={withCouple ? couple : null} context={context} today="2026-11-05" goalFunding={funding}>
      <Trigger />
    </AnnotateProvider>,
  );
  return { user, actions, sharedWrites, funding };
}
const openSheet = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
  return screen.findByRole("dialog", { name: copy.annotate.title.expense });
};
const paidWith = () => screen.getByRole("radiogroup", { name: copy.goalExpense.paidWith.label });
/** La ficha «Cómo se pagó» de la fila de «Hoy · Solo tú»; abre la subhoja con el selector. */
const paidChip = () => screen.queryByRole("button", { name: new RegExp(`^${copy.goalExpense.paidWith.label}:`) });
async function openPaidWith(user: ReturnType<typeof userEvent.setup>) {
  await user.click(paidChip()!);
  return paidWith();
}
const isDisabled = (element: HTMLElement) => element.getAttribute("aria-disabled") === "true" || element.matches(":disabled");
async function fillExpense(user: ReturnType<typeof userEvent.setup>, pesos: string, category: string = copy.categories.transport) {
  await user.type(screen.getByRole("textbox", { name: copy.annotate.amount }), pesos);
  await user.click(screen.getByRole("radio", { name: category }));
}
/** Elige «Con una meta» y abre B1; devuelve la subhoja de la meta. */
async function chooseGoal(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(within(await openPaidWith(user)).getByRole("radio", { name: copy.goalExpense.paidWith.goal }));
  const picker = await screen.findByRole("radiogroup", { name: copy.goalExpense.picker.title });
  await user.click(within(picker).getByRole("radio", { name: new RegExp(`^${name}`) }));
  return picker;
}
const field = (name: string) => screen.getByRole("textbox", { name });
async function setField(user: ReturnType<typeof userEvent.setup>, name: string, pesos: string) {
  await user.clear(field(name));
  await user.type(field(name), pesos);
}

describe("«Cómo se pagó» en Anotar (FR-050; Q16)", () => {
  it("«Dinero del mes» es el valor inicial y la ruta mínima no cambia: monto, categoría y Guardar, sin pedir metas", async () => {
    const { user, actions, sharedWrites, funding } = setup({ context: "me" });
    await openSheet(user);
    expect(paidChip()?.getAttribute("aria-label")).toBe(`${copy.goalExpense.paidWith.label}: ${copy.goalExpense.paidWith.month}`);
    await fillExpense(user, "45000", copy.categories.market);
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    expect(funding.loadGoals).not.toHaveBeenCalled();
    expect(funding.create).not.toHaveBeenCalled();
    expect(sharedWrites.create).not.toHaveBeenCalled();
  });

  it("no se ofrece al editar ni en un ingreso", async () => {
    const { user } = setup({ context: "me" });
    await openSheet(user);
    await user.click(screen.getByRole("radio", { name: copy.annotate.income }));
    expect(paidChip()).toBeNull();
  });
});

describe("B1: solo metas del contexto de la hoja (FR-085; F63-3; US-7.1, US-7.1a)", () => {
  it("en Nosotros pide solo las metas compartidas y no pinta ninguna personal, ni deshabilitada; la explicación es genérica", async () => {
    const { user, funding } = setup({ context: "us" });
    await openSheet(user);
    await fillExpense(user, "3000000");
    await user.click(within(await openPaidWith(user)).getByRole("radio", { name: copy.goalExpense.paidWith.goal }));
    const picker = await screen.findByRole("radiogroup", { name: copy.goalExpense.picker.title });
    expect(funding.loadGoals).toHaveBeenCalledTimes(1);
    expect(funding.loadGoals).toHaveBeenCalledWith({ context: "us" });
    expect(within(picker).getAllByRole("radio").map((radio) => radio.getAttribute("aria-label") ?? radio.textContent)).toEqual([copy.goalExpense.picker.option("Japón", "$11.340.000")]);
    expect(screen.queryByText(/Bicicleta/)).toBeNull();
    expect(screen.getByText(copy.goalExpense.picker.note.us)).toBeTruthy();
  });

  it("en Yo pide solo las personales; cambiar la hoja a Nosotros vuelve a pedir con el contexto nuevo y olvida la elección", async () => {
    const { user, funding } = setup({ context: "me" });
    await openSheet(user);
    await fillExpense(user, "400000");
    await chooseGoal(user, "Bicicleta de ruta");
    expect(funding.loadGoals).toHaveBeenLastCalledWith({ context: "me" });
    await user.click(screen.getByRole("button", { name: copy.goalExpense.back }));
    await user.click(screen.getByRole("radio", { name: copy.context.us }));
    await user.click(within(await openPaidWith(user)).getByRole("radio", { name: copy.goalExpense.paidWith.goal }));
    const picker = await screen.findByRole("radiogroup", { name: copy.goalExpense.picker.title });
    expect(funding.loadGoals).toHaveBeenLastCalledWith({ context: "us" });
    expect(within(picker).queryByRole("radio", { name: /Bicicleta/ })).toBeNull();
    expect((within(picker).getByRole("radio", { name: /^Japón/ })).getAttribute("aria-checked")).toBe("false");
  });

  it("un fallo al cargar las metas se dice y se puede reintentar; nunca se presenta como «no hay metas»", async () => {
    const funding = goalFunding({ loadGoals: vi.fn<GoalFundingActions["loadGoals"]>().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, goals: [japan] }) });
    const { user } = setup({ funding });
    await openSheet(user);
    await user.click(within(await openPaidWith(user)).getByRole("radio", { name: copy.goalExpense.paidWith.goal }));
    expect(await screen.findByText(copy.goalExpense.picker.failed)).toBeTruthy();
    expect(screen.queryByText(copy.goalExpense.picker.empty.us)).toBeNull();
    await user.click(screen.getByRole("button", { name: copy.goalExpense.picker.retry }));
    expect(await screen.findByRole("radio", { name: /^Japón/ })).toBeTruthy();
  });
});

describe("FundingLedger: reparto ≠ fondos (FR-051; US-7.2; FR-113)", () => {
  it("propone lo proporcional a lo disponible en pesos enteros, separa el reparto de los fondos y pide aprobación solo en la fila del otro", async () => {
    const { user } = setup();
    await openSheet(user);
    await fillExpense(user, "3000000");
    await chooseGoal(user, "Japón");
    // 3.000.000 × 6,12/11,34 = 1.619.047,6 → mayor residuo: Sara 1.619.048, Tomás 1.380.952 (ADR-002).
    expect(((field(copy.goalExpense.ledger.usage)) as HTMLInputElement).value).toBe("3.000.000");
    expect(((field(copy.goalExpense.ledger.mine)) as HTMLInputElement).value).toBe("1.619.048");
    expect(((field(copy.goalExpense.ledger.theirs("Tomás"))) as HTMLInputElement).value).toBe("1.380.952");
    const split = screen.getByRole("region", { name: copy.goalExpense.ledger.splitTitle });
    expect(within(split).getByText(copy.goalExpense.ledger.splitNote)).toBeTruthy();
    const funds = screen.getByRole("region", { name: copy.goalExpense.ledger.fundsTitle });
    expect(within(funds).getAllByText(copy.goalExpense.ledger.needsApproval)).toHaveLength(1);
    expect(within(funds).getByText(copy.goalExpense.ledger.available("$5.220.000"))).toBeTruthy();
    expect(screen.getByText(copy.goalExpense.ledger.sum("$3.000.000", "$3.000.000"))).toBeTruthy();
  });

  it("si los fondos no suman el uso, dice cuánto falta o sobra y bloquea Guardar; con los importes escritos del dataset, se habilita", async () => {
    const { user } = setup();
    await openSheet(user);
    await fillExpense(user, "3000000");
    await chooseGoal(user, "Japón");
    await setField(user, copy.goalExpense.ledger.mine, "1600000");
    expect(screen.getByText(copy.goalExpense.ledger.missing("$19.048"))).toBeTruthy();
    expect(isDisabled(screen.getByRole("button", { name: copy.goalExpense.submit.ask("Tomás") }))).toBe(true);
    await setField(user, copy.goalExpense.ledger.mine, "1700000");
    expect(screen.getByText(copy.goalExpense.ledger.over("$80.952"))).toBeTruthy();
    await setField(user, copy.goalExpense.ledger.mine, "1620000");
    await setField(user, copy.goalExpense.ledger.theirs("Tomás"), "1380000");
    expect(screen.getByText(copy.goalExpense.ledger.sum("$3.000.000", "$3.000.000"))).toBeTruthy();
    expect(isDisabled(screen.getByRole("button", { name: copy.goalExpense.submit.ask("Tomás") }))).toBe(false);
  });

  it("cada campo tiene su tope en lo disponible y el uso nunca supera el gasto", async () => {
    const { user } = setup();
    await openSheet(user);
    await fillExpense(user, "3000000");
    await chooseGoal(user, "Japón");
    await setField(user, copy.goalExpense.ledger.theirs("Tomás"), "5300000");
    expect(screen.getByText(copy.goalExpense.ledger.exceedsAvailable("Tomás", "$5.220.000"))).toBeTruthy();
    await setField(user, copy.goalExpense.ledger.usage, "3100000");
    expect(screen.getByText(copy.goalExpense.ledger.exceedsExpense)).toBeTruthy();
    expect(isDisabled(screen.getByRole("button", { name: /^Registrar/ }))).toBe(true);
  });

  it("B3: «ahora» y «si aprueba» con las cifras del dataset, el gasto como compra real y «Juntia no mueve dinero»", async () => {
    const { user } = setup();
    await openSheet(user);
    await fillExpense(user, "3000000");
    await chooseGoal(user, "Japón");
    await setField(user, copy.goalExpense.ledger.mine, "1620000");
    await setField(user, copy.goalExpense.ledger.theirs("Tomás"), "1380000");
    const effect = screen.getByRole("list", { name: copy.goalExpense.effect.title });
    const rows = within(effect).getAllByRole("listitem").map((row) => row.getAttribute("aria-label"));
    expect(rows).toEqual([
      copy.goalExpense.effect.row(copy.goalExpense.effect.now("Japón"), "$11.340.000", "$9.720.000"),
      copy.goalExpense.effect.row(copy.goalExpense.effect.ifApproves("Tomás"), "$9.720.000", "$8.340.000"),
    ]);
    expect(screen.getByText(copy.goalExpense.effect.expenseNote)).toBeTruthy();
    expect(screen.getByText(copy.goalExpense.effect.noMove)).toBeTruthy();
    expect(screen.queryByText(/te alcanza/i)).toBeNull();
  });

  it("«Registrar y pedir a Tomás» manda solo lo decidido (meta, fondos propios y pedidos) con la clave de esta apertura", async () => {
    const { user, funding, sharedWrites } = setup();
    await openSheet(user);
    await user.type(screen.getByRole("textbox", { name: copy.annotate.amount }), "3000000");
    await user.click(screen.getByRole("radio", { name: copy.categories.transport }));
    await user.type(screen.getByPlaceholderText(copy.annotate.descriptionPlaceholder), "Tiquetes a Tokio");
    await chooseGoal(user, "Japón");
    await setField(user, copy.goalExpense.ledger.mine, "1620000");
    await setField(user, copy.goalExpense.ledger.theirs("Tomás"), "1380000");
    await user.click(screen.getByRole("button", { name: copy.goalExpense.submit.ask("Tomás") }));
    await waitFor(() => expect(funding.create).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(funding.create).mock.calls[0][0];
    expect(payload).toMatchObject({ context: "us", amountPesos: "3000000", categoryId: "transport", description: "Tiquetes a Tokio", goalId: JAPAN, ownPesos: "1620000", requestedPesos: "1380000", splitMode: "equal" });
    expect(payload.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(payload)).not.toMatch(/balance|available|9720000/);
    expect(sharedWrites.create).not.toHaveBeenCalled();
    expect(await screen.findByText(copy.goalExpense.saved.ask("Tomás"))).toBeTruthy();
  });

  it("en Yo, con una meta personal, todo el uso es propio y no hay solicitud (US-7.12)", async () => {
    const { user, funding } = setup({ context: "me" });
    await openSheet(user);
    await fillExpense(user, "400000");
    await chooseGoal(user, "Bicicleta de ruta");
    expect(screen.queryByText(copy.goalExpense.ledger.needsApproval)).toBeNull();
    expect(screen.queryByRole("region", { name: copy.goalExpense.ledger.splitTitle })).toBeNull();
    await user.click(screen.getByRole("button", { name: copy.goalExpense.submit.own("$400.000") }));
    await waitFor(() => expect(funding.create).toHaveBeenCalledWith(expect.objectContaining({ context: "me", goalId: BIKE, ownPesos: "400000", requestedPesos: "0" })));
  });
});

describe("ConfirmationBadge en sus cinco estados (decisión 22.3)", () => {
  it.each([
    [{ state: "pending", name: "Tomás" }, copy.goalExpense.badge.pending("Tomás")],
    [{ state: "approved" }, copy.goalExpense.badge.approved],
    [{ state: "rejected", name: "Tomás" }, copy.goalExpense.badge.rejected("Tomás")],
    [{ state: "failed" }, copy.goalExpense.badge.failed],
    [{ state: "funded" }, copy.goalExpense.badge.funded],
  ] as const)("%o → «%s», con ícono y texto", (props, text) => {
    const { container } = render(<ConfirmationBadge {...props} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("«NO SE REGISTRÓ» solo con un rechazo confirmado; con un resultado desconocido nunca", async () => {
    const rejected = goalFunding({ create: vi.fn<GoalFundingActions["create"]>(async () => ({ status: "rejected", error: "insufficientFunds", detail: { availableMinor: minor(5000000n) } })) });
    const first = setup({ funding: rejected });
    await openSheet(first.user);
    await fillExpense(first.user, "3000000");
    await chooseGoal(first.user, "Japón");
    await first.user.click(screen.getByRole("button", { name: /^Registrar y pedir/ }));
    expect(await screen.findByText(copy.goalExpense.badge.failed)).toBeTruthy();
    expect(screen.getByText(copy.goalExpense.failed)).toBeTruthy();
  });

  it("con un resultado desconocido: campos bloqueados, «Reintentar» y «Comprobar estado», sin «NO SE REGISTRÓ»", async () => {
    const unknown = goalFunding({ create: vi.fn<GoalFundingActions["create"]>(async () => ({ status: "unknown" })) });
    const { user } = setup({ funding: unknown });
    await openSheet(user);
    await fillExpense(user, "3000000");
    await chooseGoal(user, "Japón");
    await user.click(screen.getByRole("button", { name: /^Registrar y pedir/ }));
    expect(await screen.findByRole("button", { name: copy.writes.check })).toBeTruthy();
    expect(screen.queryByText(copy.goalExpense.badge.failed)).toBeNull();
    expect(((field(copy.goalExpense.ledger.mine)) as HTMLInputElement).disabled).toBe(true);
  });
});

const request = (overrides: Partial<UsageRequestView> = {}): UsageRequestView => ({
  id: REQUEST, version: 1, goalId: JAPAN, goalName: "Japón", transactionId: EXPENSE, description: "Tiquetes a Tokio", transactionAmountMinor: minor(3000000n),
  requestedBy: SARA, memberUserId: TOMAS, amountMinor: minor(1380000n), status: "pending", createdAt: "2026-11-03T15:00:00.000Z", resolvedAt: null,
  usedMinor: minor(1620000n), memberAvailableMinor: minor(5220000n), splitLabel: "50/50", ...overrides,
});
const tomasView: GoalPerson[] = people.map((person) => ({ ...person, isMe: person.userId === TOMAS }));

describe("La solicitud en las dos sesiones (B4–B7; FR-053–FR-056)", () => {
  it("B4, quien pide: el gasto ya está registrado, falta solo el uso de los fondos del otro, «No vence» y «Cancelar solicitud»", async () => {
    const user = userEvent.setup();
    const actions = goalFunding();
    render(<UsageRequestCard request={request()} people={people} actions={actions} />);
    expect(screen.getByText(copy.goalExpense.badge.pending("Tomás"))).toBeTruthy();
    expect(screen.getByText(copy.goalExpense.request.waiting("Tomás"))).toBeTruthy();
    expect(screen.getByText(copy.goalExpense.request.noExpiry)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Aprobar/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: copy.goalExpense.request.cancel }));
    await waitFor(() => expect(actions.cancel).toHaveBeenCalledWith(expect.objectContaining({ requestId: REQUEST, expectedVersion: 1 })));
    expect(await screen.findByText(copy.goalExpense.request.cancelled)).toBeTruthy();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("B5, a quien se pide: el gasto, el reparto, lo que ya usó Sara y «Tus aportes en Japón $5.220.000 → $3.840.000»; aprobar lleva la versión leída", async () => {
    const user = userEvent.setup();
    const actions = goalFunding();
    render(<UsageRequestCard request={request()} people={tomasView} actions={actions} />);
    expect(screen.getByText(copy.goalExpense.request.title("Sara"))).toBeTruthy();
    expect(screen.getByText(copy.goalExpense.request.split("50/50"))).toBeTruthy();
    expect(screen.getByText(copy.goalExpense.request.used("Sara", "$1.620.000"))).toBeTruthy();
    expect(screen.getByText(copy.goalExpense.request.yoursLabel("Japón", "$5.220.000", "$3.840.000"))).toBeTruthy();
    expect(screen.getByText(copy.goalExpense.request.rejectNote)).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.goalExpense.request.cancel })).toBeNull();
    await user.click(screen.getByRole("button", { name: copy.goalExpense.request.approve("$1.380.000") }));
    await waitFor(() => expect(actions.approve).toHaveBeenCalledWith(expect.objectContaining({ requestId: REQUEST, expectedVersion: 1 })));
    expect(await screen.findByText(copy.goalExpense.badge.approved)).toBeTruthy();
  });

  it("B7: rechazar deja el gasto y lo dice; el badge pasa a «TOMÁS NO APROBÓ» para quien pide", async () => {
    const user = userEvent.setup();
    const actions = goalFunding();
    const { unmount } = render(<UsageRequestCard request={request()} people={tomasView} actions={actions} />);
    await user.click(screen.getByRole("button", { name: copy.goalExpense.request.reject }));
    await waitFor(() => expect(actions.reject).toHaveBeenCalledWith(expect.objectContaining({ requestId: REQUEST, expectedVersion: 1 })));
    expect(await screen.findByText(copy.goalExpense.request.rejected)).toBeTruthy();
    unmount();
    render(<UsageRequestCard request={request({ status: "rejected", version: 2 })} people={people} actions={actions} />);
    expect(screen.getByText(copy.goalExpense.badge.rejected("Tomás"))).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.goalExpense.request.cancel })).toBeNull();
  });

  it("aportes cambiados antes de aprobar: «Tus aportes cambiaron: ahora tienes $X en Japón» y nada cambia (US-7.9)", async () => {
    const user = userEvent.setup();
    const actions = goalFunding({ approve: vi.fn<GoalFundingActions["approve"]>(async () => ({ status: "rejected", error: "insufficientFunds", detail: { availableMinor: minor(1000000n) } })) });
    render(<UsageRequestCard request={request()} people={tomasView} actions={actions} />);
    await user.click(screen.getByRole("button", { name: copy.goalExpense.request.approve("$1.380.000") }));
    expect(await screen.findByText(copy.goals.errors.fundsChanged("$1.000.000", "Japón"))).toBeTruthy();
    expect(screen.queryByText(copy.goalExpense.badge.approved)).toBeNull();
  });

  it("una versión vieja bloquea hasta «Revisar», sin atribuir el cambio ni afirmar que ya se ve lo último", async () => {
    const user = userEvent.setup();
    const actions = goalFunding({ approve: vi.fn<GoalFundingActions["approve"]>(async () => ({ status: "rejected", error: "versionConflict" })) });
    render(<UsageRequestCard request={request()} people={tomasView} actions={actions} />);
    await user.click(screen.getByRole("button", { name: copy.goalExpense.request.approve("$1.380.000") }));
    expect(await screen.findByText(copy.goalExpense.errors.versionConflict)).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.goalExpense.request.approve("$1.380.000") })).toBeNull();
    expect(screen.queryByText(/Sara cambió|ya ves lo último/i)).toBeNull();
    await user.click(screen.getByRole("button", { name: copy.goalExpense.request.review }));
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe("Quitar el uso, eliminar y reactivar (US-8; FR-057, FR-059, FR-072; F64-1)", () => {
  function Host({ children }: { children: React.ReactNode }) {
    return <AnnotateProvider actions={expenseActions()} context="me" today="2026-11-05">{children}</AnnotateProvider>;
  }

  it("«Quitar el uso de la meta» se confirma, lleva la versión del gasto y termina en «Uso quitado»", async () => {
    const user = userEvent.setup();
    const actions = goalFunding();
    render(<Host><RemoveGoalUsage transactionId={EXPENSE} version={4} goalName="Japón" hasPending actions={actions} /></Host>);
    await user.click(screen.getByRole("button", { name: copy.goalExpense.remove.action }));
    const dialog = await screen.findByRole("alertdialog", { name: copy.goalExpense.remove.title });
    expect(within(dialog).getByText(copy.goalExpense.remove.description("Japón"))).toBeTruthy();
    expect(within(dialog).getByText(copy.goalExpense.remove.pendingNote)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: copy.goalExpense.remove.confirm }));
    await waitFor(() => expect(actions.removeUsage).toHaveBeenCalledWith(expect.objectContaining({ transactionId: EXPENSE, expectedVersion: 4 })));
    expect(await screen.findByText(copy.goalExpense.remove.done)).toBeTruthy();
  });

  it("quitar el uso de un gasto ya anulado falla con su mensaje", async () => {
    const user = userEvent.setup();
    const actions = goalFunding({ removeUsage: vi.fn<GoalFundingActions["removeUsage"]>(async () => ({ status: "rejected", error: "alreadyDeleted" })) });
    render(<Host><RemoveGoalUsage transactionId={EXPENSE} version={4} goalName="Japón" hasPending={false} actions={actions} /></Host>);
    await user.click(screen.getByRole("button", { name: copy.goalExpense.remove.action }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: copy.goalExpense.remove.confirm }));
    expect(await screen.findByText(copy.goalExpense.errors.expenseVoided)).toBeTruthy();
  });

  it("un uso quitado se marca «USO QUITADO» en el historial", () => {
    const entry: GoalEntryView = {
      id: "88888888-8888-4888-8888-888888888888", goalId: JAPAN, kind: "usage", memberUserId: null, amountMinor: minor(1620000n), effectiveDate: "2026-11-03",
      fundingMode: null, reason: null, transactionId: EXPENSE, transactionDescription: "Tiquetes a Tokio", voided: true, voidedReason: "remove_usage", createdBy: SARA, createdAt: "2026-11-03T15:00:00.000Z",
    };
    render(<GoalEntryRow entry={entry} people={people} dateLabel="3 nov" variant="history" />);
    expect(screen.getByText(copy.goalExpense.usageRemoved)).toBeTruthy();
  });

  it("la LimitNote «No se puede mover este gasto» es una nota, no un control", () => {
    render(<FundedMoveNote />);
    const note = screen.getByRole("note");
    expect(within(note).getByText(copy.goalExpense.limit.title)).toBeTruthy();
    expect(within(note).queryByRole("button")).toBeNull();
  });

  it("eliminar un gasto con meta avisa en la confirmación que también se quita el uso; la reactivación se dice con su monto", async () => {
    const user = userEvent.setup();
    const actions = expenseActions();
    vi.mocked(actions.voidTransaction).mockResolvedValue({ ok: true, value: { id: EXPENSE, version: 2, reactivatedGoals: [{ goalId: BIKE, name: "Bicicleta de ruta", returnedMinor: minor(1050000n) }] } });
    render(<AnnotateProvider actions={actions} context="me" today="2026-11-05"><TransactionActions transaction={privateSaved()} backHref="/actividad" funding={{ goalName: "Bicicleta de ruta" }} /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: copy.remove.action.expense }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(copy.goalExpense.deleteWarning("Bicicleta de ruta"))).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: copy.remove.confirm }));
    // F64-1, revisión del gestor del PR #69 (6): el aviso de reactivación va además de «Gasto eliminado», no en su lugar.
    expect(await screen.findByText(`${copy.remove.done.expense}. ${copy.goalExpense.reactivated("Bicicleta de ruta", "$1.050.000")}`)).toBeTruthy();
  });

  it("reactivationMessage: una meta, varias y ninguna", () => {
    expect(reactivationMessage([])).toBeNull();
    expect(reactivationMessage([{ goalId: JAPAN, name: "Japón", returnedMinor: minor(3000000n) }])).toBe(copy.goalExpense.reactivated("Japón", "$3.000.000"));
  });

  it("FR-059: el «Deshacer» de un gasto con meta anula en una operación, con la versión que devolvió el registro", async () => {
    const { user, funding } = setup();
    await openSheet(user);
    await fillExpense(user, "3000000");
    await chooseGoal(user, "Japón");
    await user.click(screen.getByRole("button", { name: /^Registrar y pedir/ }));
    const toast = await screen.findByText(copy.goalExpense.saved.ask("Tomás"));
    await act(async () => { await user.click(within(toast.closest("[role=status]") as HTMLElement).getByRole("button", { name: copy.annotate.undo })); });
    await waitFor(() => expect(funding.undoExpense).toHaveBeenCalledWith(expect.objectContaining({ context: "us", transactionId: EXPENSE, expectedVersion: 1 })));
  });
});

describe("FundingEffect sin solicitud", () => {
  it("con fondos propios solo, no hay fila «si aprueba»", () => {
    render(<FundingEffect goalName="Bicicleta de ruta" balanceMinor={minor(1050000n)} ownPesos={400000} requestedPesos={0} partnerName={null} />);
    const rows = within(screen.getByRole("list", { name: copy.goalExpense.effect.title })).getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0].getAttribute("aria-label")).toBe(copy.goalExpense.effect.row(copy.goalExpense.effect.now("Bicicleta de ruta"), "$1.050.000", "$650.000"));
  });
});

// Revisión del gestor del PR #69 (1): JT213 al editar el monto por debajo de lo ya usado de la meta (US-8.4; Q17). Se dice
// «Primero quita el uso de la meta o usa menos» y no se ofrece «Reintentar», que repetiría el mismo rechazo.
describe("Editar un gasto con meta por debajo de lo usado (JT213)", { timeout: 15000 }, () => {
  it("privado: el aviso propio, sin «Reintentar», y los campos siguen editables", async () => {
    const user = userEvent.setup();
    const actions = expenseActions();
    vi.mocked(actions.update).mockResolvedValue({ ok: false, error: "belowGoalUsage" });
    render(<AnnotateProvider actions={actions} context="me" today="2026-11-05"><TransactionActions transaction={privateSaved({ version: 2 })} backHref="/actividad" /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: copy.detail.edit }));
    const amount = await screen.findByRole("textbox", { name: copy.annotate.amount });
    await user.clear(amount);
    await user.type(amount, "100000");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    expect(await screen.findByText(copy.goalExpense.errors.removeUsageFirst)).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.annotate.retry })).toBeNull();
    expect((screen.getByRole("textbox", { name: copy.annotate.amount }) as HTMLInputElement).disabled).toBe(false);
    expect(actions.update).toHaveBeenCalledTimes(1);
  });

  it("compartido: el aviso propio, sin «Reintentar»", async () => {
    const user = userEvent.setup();
    const writes = sharedActions();
    vi.mocked(writes.update).mockResolvedValue({ status: "rejected", error: "belowGoalUsage" });
    function Edit() {
      const { openEditShared } = useAnnotate();
      return <button type="button" onClick={(event) => openEditShared(shared({ version: 3 }), event.currentTarget, () => {})}>{copy.detail.edit}</button>;
    }
    render(<AnnotateProvider actions={expenseActions()} sharedActions={writes} couple={couple} context="us" today="2026-11-05"><Edit /></AnnotateProvider>);
    await user.click(screen.getByRole("button", { name: copy.detail.edit }));
    const amount = await screen.findByRole("textbox", { name: copy.annotate.amount });
    await user.clear(amount);
    await user.type(amount, "1000000");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    expect(await screen.findByText(copy.goalExpense.errors.removeUsageFirst)).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.annotate.retry })).toBeNull();
    expect(screen.queryByRole("button", { name: copy.writes.check })).toBeNull();
  });
});

// Revisión del gestor del PR #69 (10): un resultado desconocido en la tarjeta no se pierde en silencio.
describe("La tarjeta de solicitud con un resultado desconocido", { timeout: 15000 }, () => {
  it("cerrar el aviso se confirma, dice que no se pudo confirmar y repetir usa la misma clave", async () => {
    const user = userEvent.setup();
    const actions = goalFunding({ approve: vi.fn<GoalFundingActions["approve"]>(async () => ({ status: "unknown" })) });
    render(<UsageRequestCard request={request()} people={tomasView} actions={actions} />);
    await user.click(screen.getByRole("button", { name: copy.goalExpense.request.approve("$1.380.000") }));
    await user.click(await screen.findByRole("button", { name: copy.writes.dismiss }));
    const confirm = await screen.findByRole("alertdialog", { name: copy.writes.close.title });
    await user.click(within(confirm).getByRole("button", { name: copy.writes.close.confirm }));
    expect(await screen.findByText(copy.goalExpense.request.closedUnconfirmed)).toBeTruthy();
    expect(router.refresh).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: copy.goalExpense.request.approve("$1.380.000") }));
    await waitFor(() => expect(actions.approve).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(actions.approve).mock.calls.map(([payload]) => payload.idempotencyKey);
    expect(second).toBe(first);
  });
});
