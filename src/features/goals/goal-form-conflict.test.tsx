// 004 PR C (F68-1, revisión del PR #68) — capa: componentes (Vitest + RTL). El conflicto de versión (JT011) al editar una
// meta, con el patrón de la hoja de presupuesto del PR B: no se atribuye el cambio a nadie (la lectura de la meta no dice
// quién fue), los campos y «Guardar» quedan bloqueados hasta «Revisar», «Revisar» adopta la versión y los valores vigentes
// con una clave de idempotencia nueva, y mientras el refresco no llega hay «Volver a cargar». El diálogo de lograr y
// archivar tampoco atribuye el conflicto.
import { configure, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { GoalFormSheet } from "./goal-form-sheet";
import { GoalStatusDialog } from "./goal-status-dialog";
import type { GoalActions, GoalView, UpdateGoalPayload } from "./types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/metas/x" }));

const KEY = "33333333-3333-4333-8333-333333333333";
const TODAY = "2026-11-10";
const japan = (overrides: Partial<GoalView> = {}): GoalView => ({
  id: "44444444-4444-4444-8444-444444444444", name: "Japón", goalType: "travel", scope: "shared", status: "active", version: 3,
  targetMinor: "1800000000", balanceMinor: "1134000000", progressPercent: 63, myAvailableMinor: "612000000",
  hasPendingRequest: false, targetMonth: "2027-04-01", createdAt: "2025-12-01T17:00:00.000Z", lastContributionDate: null, lastContributionCreatedAt: null, ...overrides,
});
// Lo que ganó en la base: otra pestaña (o la pareja) cambió el nombre y el objetivo.
const winner = () => japan({ version: 4, name: "Japón 2027", targetMinor: "2000000000" });
const actionsWith = (update: GoalActions["update"]): GoalActions => ({
  create: vi.fn(), update, complete: vi.fn(), archive: vi.fn(), contribute: vi.fn(), withdraw: vi.fn(), voidEntry: vi.fn(),
  check: vi.fn(async () => ({ state: "not_found" as const })),
});
const sheet = (goal: GoalView, actions: GoalActions) => <GoalFormSheet open onClose={vi.fn()} goal={goal} context="us" today={TODAY} idempotencyKey={KEY} actions={actions} onDone={vi.fn()} />;
const save = () => screen.queryByRole("button", { name: copy.goals.sheet.submitEdit });
const nameField = () => screen.getByLabelText(copy.goals.sheet.name) as HTMLInputElement;

afterEach(() => vi.clearAllMocks());

describe("Editar una meta · conflicto de versión (F68-1)", { timeout: 15000 }, () => {
  it("tras JT011: sin autor, campos y «Guardar» bloqueados, «Revisando…» con salida; al llegar lo vigente, lo dice", async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ status: "rejected" as const, error: "versionConflict" as const }));
    const { rerender } = render(sheet(japan(), actionsWith(update)));
    await user.clear(nameField());
    await user.type(nameField(), "Japón y Corea");
    await user.click(save()!);
    const alert = await screen.findByRole("alert");
    expect(router.refresh).toHaveBeenCalledTimes(1);
    // Mientras el refresco no llega: no se inventa nada, y hay salida.
    expect(alert.textContent).toContain(copy.goals.sheet.conflict.checking);
    await user.click(within(alert).getByRole("button", { name: copy.goals.sheet.conflict.reload }));
    expect(router.refresh).toHaveBeenCalledTimes(2);
    expect(save()).toBeNull();
    expect(nameField().disabled).toBe(true);
    // Llega la versión ganadora.
    rerender(sheet(winner(), actionsWith(update)));
    const fresh = screen.getByRole("alert");
    expect(fresh.textContent).toContain(copy.goals.sheet.conflict.title);
    expect(fresh.textContent).toContain("Japón y Corea");
    expect(fresh.textContent).toContain("Japón 2027");
    expect(fresh.textContent).not.toMatch(/Tomás|Sara|Alguien/);
    expect(save()).toBeNull();
    expect(nameField().disabled).toBe(true);
    // El formulario no se puede enviar por otro camino (Enter).
    nameField().form!.requestSubmit();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("«Revisar» carga los valores vigentes, toma la versión nueva y una clave nueva; solo entonces se guarda", async () => {
    const user = userEvent.setup();
    const update = vi.fn<GoalActions["update"]>()
      .mockResolvedValueOnce({ status: "rejected", error: "versionConflict" })
      .mockResolvedValue({ status: "ok", value: { id: "44444444-4444-4444-8444-444444444444", name: "Japón 2027", goalType: "travel", targetMinor: "2000000000", targetMonth: "2027-04-01", status: "active", version: 5 } });
    const { rerender } = render(sheet(japan(), actionsWith(update)));
    await user.clear(nameField());
    await user.type(nameField(), "Japón y Corea");
    await user.click(save()!);
    await screen.findByRole("alert");
    rerender(sheet(winner(), actionsWith(update)));
    await user.click(screen.getByRole("button", { name: copy.goals.sheet.conflict.review }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(nameField().disabled).toBe(false);
    expect(nameField().value).toBe("Japón 2027");
    await user.click(save()!);
    expect(update).toHaveBeenCalledTimes(2);
    const [first, second] = update.mock.calls.map(([payload]) => payload as UpdateGoalPayload);
    expect(first).toMatchObject({ expectedVersion: 3, idempotencyKey: KEY, name: "Japón y Corea" });
    // Lo que se guarda ahora es lo vigente (nada de los valores viejos), sobre la versión ganadora y con otra clave.
    expect(second).toMatchObject({ expectedVersion: 4, name: "Japón 2027", targetPesos: "20000000" });
    expect(second.idempotencyKey).not.toBe(KEY);
  });
});

describe("Lograr o archivar · conflicto de versión (F68-1)", () => {
  it("el aviso es neutral: no nombra a nadie", async () => {
    const user = userEvent.setup();
    const complete = vi.fn(async () => ({ status: "rejected" as const, error: "versionConflict" as const }));
    render(<GoalStatusDialog kind="complete" goal={japan()} idempotencyKey={KEY} actions={{ ...actionsWith(vi.fn()), complete }} onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: copy.goals.statusDialog.completeConfirm }));
    expect((await screen.findByRole("alert")).textContent).toBe(copy.goals.errors.versionConflict);
    expect(copy.goals.errors.versionConflict).not.toMatch(/Tomás|Sara|Alguien/);
    expect(router.refresh).toHaveBeenCalled();
  });
});
