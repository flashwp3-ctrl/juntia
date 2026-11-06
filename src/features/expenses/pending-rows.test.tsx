// UX lote 1, cambio 3 — capa: componentes (Vitest + RTL). Criterio literal (petición de los fundadores): «al guardar un gasto,
// aparece al instante en la lista (Inicio y Actividad) sin esperar a que el servidor revalide […] nunca debe quedar una fila
// duplicada ni fantasma al navegar». Aquí se prueba cómo se PINTA la fila en vuelo en Inicio y Actividad; el ciclo de vida
// (rechazo, resultado desconocido, reintento) está en annotate-sheet.test.tsx.
import { act, render, screen, within } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saraPrivateOctober2026 } from "@/domain/golden/october-2026";
import { moneyFromPesos } from "@/domain/money";
import { ActivityView } from "@/features/activity/activity-view";
import { HomeView } from "@/features/home/home-view";
import { ContextProvider } from "@/components/shell/context-selector";
import { ExpenseRow } from "@/components/ui/expense-row";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "./annotate-provider";
import type { ActionResult, PendingRow, SavedTransaction } from "./types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/" }));

// Cada creación en vuelo guarda su intención (F51-1): que no pase de una prueba a la siguiente.
beforeEach(() => window.localStorage.clear());
const idleActions = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
const NOW = "2026-11-05T15:00:00.000Z";
const row = (overrides: Partial<PendingRow["transaction"]> = {}, state: PendingRow["state"] = "saving"): PendingRow => ({
  key: "k1", state,
  payload: { idempotencyKey: "k1", type: "expense", amountPesos: "45000", categoryId: "market", transactionDate: "2026-11-05", description: "Mercado de la esquina" },
  transaction: { id: "pending:k1", type: "expense", amount: moneyFromPesos(45000n), categoryId: "market", transactionDate: "2026-11-05", description: "Mercado de la esquina", status: "active", version: 1, createdAt: NOW, updatedAt: NOW, ...overrides },
});

/** Lanza una creación en vuelo que no responde, como lo haría la hoja al guardar. */
function Flight({ pending, outcome }: { pending: PendingRow; outcome?: ActionResult<SavedTransaction> }) {
  const { track } = useAnnotate();
  useEffect(() => { void track(pending, () => (outcome ? Promise.resolve(outcome) : new Promise(() => {}))); }, [pending, outcome, track]);
  return null;
}
const mount = (node: ReactNode) => render(<ContextProvider><AnnotateProvider actions={idleActions}>{node}</AnnotateProvider></ContextProvider>);
const pendingRows = () => [...document.querySelectorAll<HTMLElement>("[data-pending]")];

describe("ExpenseRow en vuelo (UX lote 1, cambio 3)", () => {
  const transaction = row().transaction;
  it("«Guardando…»: no es un enlace (todavía no hay detalle), está ocupada y lo dice en su nombre", () => {
    render(<ExpenseRow transaction={transaction} href="/x" dateLabel="Hoy" pending="saving" />);
    expect(screen.queryByRole("link")).toBeNull();
    const el = document.querySelector<HTMLElement>("[data-pending]")!;
    expect(el.getAttribute("data-pending")).toBe("saving");
    expect(el.getAttribute("aria-busy")).toBe("true");
    expect(el.textContent).toContain(copy.row.pending.saving);
    expect(el.textContent).toContain("45.000");
  });
  it("«Sin confirmar»: no afirma que se guardó ni que no", () => {
    render(<ExpenseRow transaction={transaction} href="/x" dateLabel="Hoy" pending="unknown" />);
    const el = document.querySelector<HTMLElement>("[data-pending]")!;
    expect(el.textContent).toContain(copy.row.pending.unknown);
    expect(el.textContent).not.toMatch(/guardado|no se guard/i);
    expect(el.hasAttribute("aria-busy")).toBe(false);
  });
});

describe("Actividad con una fila en vuelo", () => {
  const view = (month: string, rows = saraPrivateOctober2026) => (
    <ActivityView rows={rows} month={month} today="2026-11-05" navigation={{ previous: null, next: null }} />
  );

  it("la fila aparece en la lista de su mes, marcada, sin tocar el resumen del mes", async () => {
    mount(<><Flight pending={row({ transactionDate: "2026-10-23" })} />{view("2026-10")}</>);
    const summary = screen.getByRole("region", { name: copy.activity.spentIn("octubre") });
    await vi.waitFor(() => expect(pendingRows().length).toBeGreaterThan(0));
    // Una en la lista por día (móvil) y una en la tabla (≥ 1280): cada una es una sola vez en su vista.
    expect(pendingRows().every((el) => el.getAttribute("data-pending") === "saving")).toBe(true);
    expect(summary.textContent).toMatch(/\$\s?412\.900/);
    expect(summary.textContent).not.toMatch(/457\.900/);
    expect(screen.getAllByText("Mercado de la esquina").length).toBeGreaterThan(0);
  });

  it("no aparece en otro mes", async () => {
    mount(<><Flight pending={row({ transactionDate: "2026-11-05" })} />{view("2026-10")}</>);
    await act(async () => {});
    expect(pendingRows()).toHaveLength(0);
  });

  it("en un mes vacío, la fila en vuelo reemplaza al estado vacío", async () => {
    mount(<><Flight pending={row()} />{view("2026-11", [])}</>);
    await vi.waitFor(() => expect(pendingRows().length).toBeGreaterThan(0));
    expect(screen.queryByRole("heading", { name: copy.activity.empty.title })).toBeNull();
  });

  it("una fila «Sin confirmar» se pinta como tal y las demás filas siguen siendo enlaces", async () => {
    mount(<><Flight pending={row({ transactionDate: "2026-10-23" })} outcome={{ ok: false, error: "network" }} />{view("2026-10")}</>);
    await vi.waitFor(() => expect(pendingRows().some((el) => el.getAttribute("data-pending") === "unknown")).toBe(true));
    expect(screen.getAllByRole("link", { name: /pesos/ }).length).toBeGreaterThanOrEqual(9);
  });
});

// F51-2: el subtotal del día solo suma lo que el servidor ya confirmó; las filas en vuelo se listan, pero no cuentan.
describe("Subtotal diario con filas en vuelo (F51-2)", () => {
  const subtotal = (date: string) => document.getElementById(`day-${date}`)!.parentElement!.querySelector("span")!.textContent;
  const view = () => <ActivityView rows={saraPrivateOctober2026} month="2026-10" today="2026-11-05" navigation={{ previous: null, next: null }} />;

  for (const [state, outcome] of [["saving", undefined], ["unknown", { ok: false, error: "network" } as const]] as const) {
    it(`una fila «${state}» está en la lista del día pero no entra en su subtotal`, async () => {
      const baseline = render(<ContextProvider><AnnotateProvider actions={idleActions}>{view()}</AnnotateProvider></ContextProvider>);
      const before = subtotal("2026-10-23");
      expect(before).toMatch(/\d/);
      baseline.unmount();
      window.localStorage.clear();
      mount(<><Flight pending={row({ transactionDate: "2026-10-23" })} outcome={outcome} />{view()}</>);
      await vi.waitFor(() => expect(pendingRows().some((el) => el.getAttribute("data-pending") === state)).toBe(true));
      expect(subtotal("2026-10-23")).toBe(before);
    });
  }
});

describe("Inicio con una fila en vuelo", () => {
  const home = (rows = saraPrivateOctober2026, month = "2026-10") => <HomeView rows={rows} month={month} today="2026-11-05" />;

  it("la fila aparece arriba de «Últimos movimientos» y el gasto del mes espera a la revalidación", async () => {
    mount(<><Flight pending={row({ transactionDate: "2026-10-23" })} />{home()}</>);
    const recent = screen.getByRole("region", { name: copy.home.recentTitle });
    await vi.waitFor(() => expect(within(recent).getAllByRole("listitem")[0].querySelector("[data-pending]")).toBeTruthy());
    expect(within(recent).getAllByRole("listitem")[0].textContent).toContain(copy.row.pending.saving);
    expect(screen.getByRole("region", { name: copy.home.spentIn("octubre") }).textContent).toMatch(/\$\s?412\.900/);
  });

  it("en el primer gasto, la fila en vuelo reemplaza al estado vacío", async () => {
    mount(<><Flight pending={row()} />{home([], "2026-11")}</>);
    await vi.waitFor(() => expect(pendingRows()).toHaveLength(1));
    expect(screen.queryByRole("heading", { name: copy.home.empty.title })).toBeNull();
  });
});
