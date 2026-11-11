// Revisión de ChatGPT del PR #74 sobre `a25e1b1` (F74-1, F74-2) — capa: componentes (Vitest + RTL, cuadros controlados). Los
// límites nuevos de E5:
// - F74-1: un toque que no navega (la meta que asoma en la pila: la trae al frente) no es una navegación; E5 sigue esperando.
// - F74-2: tras llevar a Actividad del mes, su Skeleton (loading.tsx) cuenta como lista en carga y el seguimiento espera; cuando
//   llega la lista con el gasto oculto por un filtro, se quita solo ese filtro y se resalta, sin un segundo `router.push`.
import { act, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { moneyFromPesos } from "@/domain/money";
import type { Transaction } from "@/domain/transactions";
import { ActivityFiltersProvider, useActivityFilters } from "@/features/activity/activity-filters";
import { ActivityLoadingScope } from "@/features/activity/activity-loading-scope";
import { ActivityView } from "@/features/activity/activity-view";
import { GoalStack } from "@/features/goals/goal-stack";
import type { GoalView } from "@/features/goals/types";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate, useListScope } from "../annotate-provider";
import type { ExpenseActions, SavedTransaction } from "../types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => window.location.pathname, useSearchParams: () => new URLSearchParams(window.location.search) }));

const ID = "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10";
const NOW = "2026-11-05T15:00:00.000Z";
const saved: SavedTransaction = { id: ID, type: "expense", categoryId: "market", transactionDate: "2026-11-05", description: null, amountMinor: "4500000", version: 1 };
const actions = (): ExpenseActions => ({ create: vi.fn(async () => ({ ok: true as const, value: saved })), update: vi.fn(), voidTransaction: vi.fn() });

async function annotate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
  const sheet = await screen.findByRole("dialog", { name: copy.annotate.title.expense });
  await user.type(within(sheet).getByRole("textbox", { name: copy.annotate.amount }), "45000");
  await user.click(within(sheet).getByRole("radio", { name: copy.categories.market }));
  return sheet;
}

/** Cuadros y reloj controlados. Motion también pide cuadros: se corren todos, como en el navegador. */
function controlTime() {
  const frames: FrameRequestCallback[] = [];
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const at = (ms: number) => { now = ms; act(() => { frames.splice(0).forEach((callback) => callback(ms)); }); };
  return { at };
}
const scrolled = vi.fn();

afterEach(() => {
  vi.restoreAllMocks();
  scrolled.mockReset();
  Object.values(router).forEach((fn) => fn.mockReset());
  window.history.replaceState({}, "", "/");
});

describe("F74-1 · un toque que no navega no detiene E5", { timeout: 20000 }, () => {
  const goal = (index: number): GoalView => ({
    id: `6666666${index}-6666-4666-8666-666666666666`, name: `Meta ${index}`, goalType: "home", scope: "personal", status: "active", version: 1,
    targetMinor: "400000000", balanceMinor: "10000000", progressPercent: 2, myAvailableMinor: "0", hasPendingRequest: false, targetMonth: null,
    createdAt: `2026-0${index}-01T00:00:00Z`, lastContributionDate: null, lastContributionCreatedAt: null,
  });
  const goals = [goal(1), goal(2), goal(3)];

  function Home({ known, shown }: { known: string[]; shown: string[] }) {
    const { openFrom } = useAnnotate();
    useListScope("2026-11", known, ["me"]);
    return (
      <>
        <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>
        {shown.map((id) => <div key={id} data-transaction-id={id} ref={(node) => { if (node) node.scrollIntoView = scrolled; }}>{id}</div>)}
        <GoalStack goals={goals} members={{}} today="2026-11-05" context="me" />
      </>
    );
  }

  it("tocar la meta que asoma cambia el frente, la URL no cambia y E5 sigue esperando: cuando llega el gasto, lo enseña", async () => {
    const create = actions();
    const tree = (known: string[], shown: string[]) => <AnnotateProvider actions={create} context="me" today="2026-11-05"><Home known={known} shown={shown} /></AnnotateProvider>;
    const view = render(tree([], []));
    const user = userEvent.setup();
    const sheet = await annotate(user);
    const { at } = controlTime();
    await user.click(within(sheet).getByRole("button", { name: /^Guardar/ }));
    await screen.findByRole("button", { name: copy.annotate.undo });
    at(1000);
    // La meta que asoma (capa 1): un toque la trae al frente sin navegar.
    const peek = document.querySelector<HTMLAnchorElement>("[data-stack-layer='1'] [data-goal-card]")!;
    expect(peek.hasAttribute("data-stays-on-page")).toBe(true);
    await user.click(peek);
    expect(document.querySelector("[data-stack-layer='0'] [data-goal-card]")?.getAttribute("data-goal-card")).toBe(goals[1].id);
    expect(window.location.pathname).toBe("/");
    at(2000);
    // Llega el árbol con el gasto, a la vista: E5 seguía mirando y lo enseña (scroll a la fila), sin navegar.
    act(() => { view.rerender(tree([ID], [ID])); });
    at(2100);
    expect(scrolled).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("F74-2 · el seguimiento espera el Skeleton de Actividad", { timeout: 20000 }, () => {
  const SALARY: Transaction = { id: "aaaaaaaa-0000-4000-8000-000000000001", type: "income", amount: moneyFromPesos(3000000n), categoryId: "income", transactionDate: "2026-11-03", description: "Sueldo", status: "active", version: 1, createdAt: NOW, updatedAt: NOW };
  const row: Transaction = { id: ID, type: "expense", amount: moneyFromPesos(45000n), categoryId: "market", transactionDate: "2026-11-05", description: null, status: "active", version: 1, createdAt: "2026-11-05T16:00:00.000Z", updatedAt: NOW };

  /** El filtro «Ingresos» que dejó la persona en Actividad (vive en el layout). */
  function IncomeFilter() {
    const { setType } = useActivityFilters("2026-11");
    const done = useRef(false);
    useEffect(() => { if (!done.current) { done.current = true; setType("income"); } }, [setType]);
    return null;
  }

  it("desde Plan: la URL cambia, Actividad queda en Skeleton varios cuadros sin que E5 termine; llega la lista, quita solo el filtro de tipo y resalta, con un solo push", async () => {
    window.history.replaceState({}, "", "/plan");
    let go: (phase: "plan" | "loading" | "list") => void = () => {};
    function App() {
      const [phase, setPhase] = useState<"plan" | "loading" | "list">("plan");
      go = setPhase;
      const { openFrom } = useAnnotate();
      return (
        <ActivityFiltersProvider>
          <IncomeFilter />
          <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>
          {phase === "loading" ? <ActivityLoadingScope /> : null}
          {phase === "list" ? <ActivityView rows={[row, SALARY]} month="2026-11" today="2026-11-05" navigation={{ previous: null, next: null }} /> : null}
        </ActivityFiltersProvider>
      );
    }
    // La navegación de cliente: la URL cambia y Actividad enseña su Skeleton (loading.tsx).
    router.push.mockImplementation((url: string) => { window.history.pushState({}, "", url); go("loading"); });
    render(<AnnotateProvider actions={actions()} context="me" today="2026-11-05"><App /></AnnotateProvider>);
    const user = userEvent.setup();
    const sheet = await annotate(user);
    const { at } = controlTime();
    await user.click(within(sheet).getByRole("button", { name: /^Guardar/ }));
    await screen.findByRole("button", { name: copy.annotate.undo });
    // Plan no tiene lista: E5 lleva a Actividad del mes.
    at(16);
    expect(router.push).toHaveBeenCalledWith("/actividad?mes=2026-11");
    // Varios cuadros con el Skeleton: E5 no termina.
    for (let step = 1; step <= 30; step++) at(16 + step * 100);
    // Llega la lista: el gasto está, oculto por «Ingresos».
    act(() => { go("list"); });
    for (let step = 1; step <= 6; step++) at(3100 + step * 16);
    await waitFor(() => expect(screen.getByRole("radio", { name: copy.activity.all }).getAttribute("aria-checked")).toBe("true"));
    at(3300);
    const rows = [...document.querySelectorAll(`[data-transaction-id="${ID}"]:not([data-temp])`)];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((node) => node.closest("[data-new]") !== null)).toBe(true);
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
