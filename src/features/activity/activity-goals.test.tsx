// 004 PR C, T042 / FR-044, FR-071; US-5.2, US-6.1 — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T042): «la fila de retiro nunca se presenta como ingreso (signo, ficha, etiqueta)». Y de
// FR-044/FR-071: Actividad muestra los asientos de metas con su ficha, «Gasto {mes} $X · Apartado $Y» por separado (el
// apartado nunca entra en el total del gasto) y el filtro «Aportes».
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { saraPrivateOctober2026, settlementOctober25, sharedOctober2026 } from "@/domain/golden/october-2026";
import { useEffect } from "react";
import { AnnotateProvider } from "@/features/expenses/annotate-provider";
import type { GoalEntryView } from "@/features/goals/types";
import { copy } from "@/lib/copy/es";
import type { SharedTransaction } from "@/lib/db/types";
import { ActivityFiltersProvider, useActivityFilters, type ActivityFilters } from "./activity-filters";
import { ActivityView } from "./activity-view";
import { CoupleActivityView } from "./couple-activity-view";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/actividad" }));
const idle = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
const members = [{ userId: "sara", name: "Sara", joinOrder: 1 as const, isMe: true }, { userId: "tomas", name: "Tomás", joinOrder: 2 as const, isMe: false }];
const expenses: SharedTransaction[] = sharedOctober2026.map((row) => ({ ...row, createdBy: row.payerUserId, updatedBy: null, movedFromMe: false }));
const summary = { totalMinor: "284000000", count: 6, byCategory: { home: "160000000", market: "64000000", services: "36000000", restaurants: "24000000" } };
const entry = (overrides: Partial<GoalEntryView>): GoalEntryView => ({
  id: "77777777-7777-4777-8777-777777777777", goalId: "44444444-4444-4444-8444-444444444444", goalName: "Japón", kind: "contribution", memberUserId: "sara",
  amountMinor: "50000000", effectiveDate: "2026-10-22", fundingMode: "reserved", reason: null, transactionId: null, transactionDescription: null,
  voided: false, voidedReason: null, createdBy: "sara", createdAt: "2026-10-22T17:00:00.000Z", ...overrides,
});
const goalEntries = [
  entry({}),
  entry({ id: "78888888-8888-4888-8888-888888888888", memberUserId: "tomas", createdBy: "tomas", amountMinor: "40000000", effectiveDate: "2026-10-15", createdAt: "2026-10-15T17:00:00.000Z" }),
];

function couple() {
  return render(
    <AnnotateProvider actions={idle}><ActivityFiltersProvider>
      <CoupleActivityView expenses={expenses} settlements={[]} month="2026-10" today="2026-10-31" navigation={{ previous: null, next: null }} members={members} summary={summary} goalEntries={goalEntries} setAsideMinor="90000000" />
    </ActivityFiltersProvider></AnnotateProvider>,
  );
}

describe("Actividad con asientos de metas (FR-044, FR-071)", () => {
  it("Nosotros: «Gasto octubre $2.840.000 · Apartado $900.000» por separado y los aportes con «ahorro, no es consumo»", () => {
    couple();
    expect(screen.getByText(copy.goals.activity.spent("octubre"))).toBeTruthy();
    expect(screen.getByText("$2.840.000")).toBeTruthy();
    expect(screen.getByText(copy.goals.activity.setAside)).toBeTruthy();
    expect(screen.getByText("$900.000")).toBeTruthy();
    expect(screen.queryByText("$3.740.000")).toBeNull();
    expect(screen.getAllByText(copy.goals.activity.contribution("Japón")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(copy.goals.activity.contributionMeta("Sara"), { exact: false }).length).toBeGreaterThan(0);
  });

  it("filtro «Aportes»: solo los asientos de metas", async () => {
    const user = userEvent.setup();
    couple();
    await user.click(screen.getByRole("radio", { name: copy.goals.activity.filter }));
    expect(screen.queryByText("Carulla Laureles")).toBeNull();
    expect(screen.getAllByText(copy.goals.activity.contribution("Japón")).length).toBeGreaterThan(0);
  });

  it("Yo: un retiro aparece como reasignación, sin «+» ni color de ingreso, y no suma al gasto", () => {
    const withdrawal = entry({ id: "79999999-9999-4999-8999-999999999999", goalName: "Bicicleta de ruta", kind: "withdrawal", amountMinor: "20000000", fundingMode: null, reason: "Cambio de planes", effectiveDate: "2026-10-20" });
    // Con los gastos privados reales de octubre (412.900) y un aporte y un retiro en el mes: el gasto sigue en 412.900.
    const { container } = render(
      <AnnotateProvider actions={idle}><ActivityFiltersProvider>
        <ActivityView rows={saraPrivateOctober2026} month="2026-10" today="2026-10-31" navigation={{ previous: null, next: null }} goalEntries={[withdrawal, goalEntries[0]]} goalPeople={members} setAsideMinor="50000000" />
      </ActivityFiltersProvider></AnnotateProvider>,
    );
    const summary = screen.getByRole("region", { name: copy.activity.spentIn("octubre") });
    expect(summary.textContent).toMatch(/\$412\.900/);
    expect(summary.textContent).not.toMatch(/\$(912\.900|212\.900|612\.900)/);
    const rows = [...container.querySelectorAll("[data-goal-entry]")].filter((row) => row.getAttribute("data-goal-entry") === "withdrawal");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(within(row as HTMLElement).getByText(copy.goals.activity.withdrawal)).toBeTruthy();
      expect(row.textContent).not.toContain("+");
      expect((row as HTMLElement).innerHTML).not.toMatch(/text-income|bg-category-income/);
    }
  });
});

/** Fija el tipo del filtro compartido del layout, como si se hubiera elegido antes en el otro contexto. */
function Preset({ type }: { type: ActivityFilters["type"] }) {
  const filters = useActivityFilters("2026-10");
  useEffect(() => { filters.setType(type); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

describe("Orden y filtros heredados (revisión del gestor del PR #68)", () => {
  it("Yo desde xl: la tabla mezcla movimientos y asientos con el mismo orden que la lista (fecha; en el día, gastos y después metas)", () => {
    const late = entry({ id: "7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", effectiveDate: "2026-10-22", createdAt: "2026-10-22T17:00:00.000Z" });
    const sameDay = entry({ id: "7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", effectiveDate: "2026-10-20", createdAt: "2026-10-20T23:00:00.000Z" });
    const { container } = render(
      <AnnotateProvider actions={idle}><ActivityFiltersProvider>
        <ActivityView rows={saraPrivateOctober2026} month="2026-10" today="2026-10-31" navigation={{ previous: null, next: null }} goalEntries={[sameDay, late]} goalPeople={members} setAsideMinor="100000000" />
      </ActivityFiltersProvider></AnnotateProvider>,
    );
    const order = [...container.querySelectorAll("table tbody tr")].map((row) => row.querySelector("[data-entry-id]")?.getAttribute("data-entry-id") ?? row.querySelector("[data-transaction-id]")?.getAttribute("data-transaction-id"));
    // 23 oct (regalo), 22 oct (aporte), 21 oct (reembolso), 20 oct: el gasto (Fruver) y después el aporte del mismo día.
    expect(order.slice(0, 5)).toEqual(["sara-private-october-8", late.id, "sara-private-october-9", "sara-private-october-7", sameDay.id]);
  });

  it("Nosotros con «Ingresos» elegido en Yo: el control dice «Todos», las liquidaciones se ven y no se anuncia un conteo", async () => {
    render(
      <AnnotateProvider actions={idle}><ActivityFiltersProvider>
        <Preset type="income" />
        <CoupleActivityView expenses={expenses} settlements={[{ ...settlementOctober25, note: null, version: 1 }]} month="2026-10" today="2026-10-31" navigation={{ previous: null, next: null }} members={members} summary={summary} goalEntries={goalEntries} setAsideMinor="90000000" />
      </ActivityFiltersProvider></AnnotateProvider>,
    );
    expect(screen.getByRole("radio", { name: copy.activity.all }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getAllByText(copy.shared.row.settlement).length).toBeGreaterThan(0);
    expect(document.querySelector("[aria-live='polite'].sr-only")?.textContent).toBe("");
  });

  it("Nosotros con «Aportes» heredado y las metas sin cargar: se ven los gastos (no hay control para volver)", () => {
    render(
      <AnnotateProvider actions={idle}><ActivityFiltersProvider>
        <Preset type="goals" />
        <CoupleActivityView expenses={expenses} settlements={[]} month="2026-10" today="2026-10-31" navigation={{ previous: null, next: null }} members={members} summary={summary} />
      </ActivityFiltersProvider></AnnotateProvider>,
    );
    expect(screen.getAllByText("Carulla Laureles").length).toBeGreaterThan(0);
    expect(screen.queryByRole("radio", { name: copy.goals.activity.filter })).toBeNull();
  });
});
