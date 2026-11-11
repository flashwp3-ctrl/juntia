// #54 (F51-14; decisión del fundador del 11 nov 2026, opción A) — capa: componentes (Vitest + RTL, cuadros controlados). Si la
// lista de Actividad trae el movimiento recién guardado y un filtro activo lo oculta, E5 quita SOLO los filtros que lo excluyen y
// lo resalta ahí, sin navegar y sin copy nuevo. Un filtro que no lo excluye se conserva.
import { act, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { moneyFromPesos } from "@/domain/money";
import type { Transaction } from "@/domain/transactions";
import { AnnotateProvider, useAnnotate } from "@/features/expenses/annotate-provider";
import type { ExpenseActions, SavedTransaction } from "@/features/expenses/types";
import { copy } from "@/lib/copy/es";
import { ActivityFiltersProvider } from "./activity-filters";
import { ActivityView } from "./activity-view";
import { excludingFilters } from "./activity-filters";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/actividad", useSearchParams: () => new URLSearchParams("mes=2026-11") }));

const NEW_ID = "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10";
const NOW = "2026-11-05T15:00:00.000Z";
const tx = (id: string, overrides: Partial<Transaction>): Transaction => ({
  id, type: "expense", amount: moneyFromPesos(10000n), categoryId: "market", transactionDate: "2026-11-03", description: null, status: "active", version: 1, createdAt: NOW, updatedAt: NOW, ...overrides,
});
const SALARY = tx("aaaaaaaa-0000-4000-8000-000000000001", { type: "income", categoryId: "income", description: "Sueldo pan", amount: moneyFromPesos(3000000n) });
const saved: SavedTransaction = { id: NEW_ID, type: "expense", categoryId: "market", transactionDate: "2026-11-05", description: "pan", amountMinor: "4500000", version: 1 };
const savedRow = tx(NEW_ID, { transactionDate: "2026-11-05", description: "pan", amount: moneyFromPesos(45000n), createdAt: "2026-11-05T16:00:00.000Z" });

function Page({ rows }: { rows: Transaction[] }) {
  const { openFrom } = useAnnotate();
  return (
    <>
      <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>
      <ActivityView rows={rows} month="2026-11" today="2026-11-05" navigation={{ previous: null, next: null }} />
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.values(router).forEach((fn) => fn.mockClear());
  window.history.replaceState({}, "", "/");
});

describe("#54 · E5 con un filtro activo en Actividad", { timeout: 20000 }, () => {
  it("con «Ingresos» y una búsqueda que sí coincide: quita solo el filtro de tipo, conserva la búsqueda y resalta el gasto", async () => {
    window.history.replaceState({}, "", "/actividad?mes=2026-11");
    const actions: ExpenseActions = { create: vi.fn(async () => ({ ok: true as const, value: saved })), update: vi.fn(), voidTransaction: vi.fn() };
    const tree = (rows: Transaction[]) => (
      <AnnotateProvider actions={actions} context="me" today="2026-11-05">
        <ActivityFiltersProvider><Page rows={rows} /></ActivityFiltersProvider>
      </AnnotateProvider>
    );
    const view = render(tree([SALARY]));
    const user = userEvent.setup();
    // Filtros activos: «Ingresos» (excluye el gasto) y la búsqueda «pan» (no lo excluye).
    await user.click(screen.getByRole("radio", { name: copy.activity.incomes }));
    await user.type(screen.getByRole("searchbox", { name: copy.activity.searchLabel }), "pan");

    await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
    const sheet = await screen.findByRole("dialog", { name: copy.annotate.title.expense });
    await user.type(within(sheet).getByRole("textbox", { name: copy.annotate.amount }), "45000");
    await user.type(within(sheet).getByPlaceholderText(copy.annotate.descriptionPlaceholder), "pan");
    await user.click(within(sheet).getByRole("radio", { name: copy.categories.market }));

    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const run = (count: number) => { for (let step = 0; step < count; step++) act(() => { frames.splice(0).forEach((callback) => callback(step * 16)); }); };
    await user.click(within(sheet).getByRole("button", { name: /^Guardar/ }));
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    await screen.findByRole("button", { name: copy.annotate.undo });

    // Llega la revalidación con el gasto real: la lista lo trae y el filtro «Ingresos» lo oculta.
    act(() => { view.rerender(tree([savedRow, SALARY])); });
    run(6);

    expect(frames).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: copy.activity.all }).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByRole("searchbox", { name: copy.activity.searchLabel }) as HTMLInputElement).value).toBe("pan");
    const rows = document.querySelectorAll(`[data-transaction-id="${NEW_ID}"]:not([data-temp])`);
    expect(rows.length).toBeGreaterThan(0);
    // Resaltada en la lista (el enlace) y en la tabla de escritorio (su <tr>).
    expect([...rows].every((row) => row.closest("[data-new]") !== null)).toBe(true);
  });
});

describe("#54 · qué filtros excluyen un movimiento", () => {
  const expense = { type: "expense" as const, categoryId: "market" as const, description: "pan" };
  it.each([
    { filters: { query: "", type: "income" as const, categoryId: null }, kinds: ["type"] },
    { filters: { query: "", type: "goals" as const, categoryId: null }, kinds: ["type"] },
    { filters: { query: "", type: "expense" as const, categoryId: null }, kinds: [] },
    { filters: { query: "", type: "all" as const, categoryId: "transport" as const }, kinds: ["category"] },
    { filters: { query: "", type: "all" as const, categoryId: "market" as const }, kinds: [] },
    { filters: { query: "café", type: "all" as const, categoryId: null }, kinds: ["query"] },
    { filters: { query: "PAN", type: "all" as const, categoryId: null }, kinds: [] },
    { filters: { query: "café", type: "income" as const, categoryId: "transport" as const }, kinds: ["type", "category", "query"] },
  ])("$filters → $kinds", ({ filters, kinds }) => {
    expect(excludingFilters(expense, filters)).toEqual(kinds);
  });
});
