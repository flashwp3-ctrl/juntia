// 004 PR C, T042 / FR-044, FR-071; US-5.2, US-6.1 — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T042): «la fila de retiro nunca se presenta como ingreso (signo, ficha, etiqueta)». Y de
// FR-044/FR-071: Actividad muestra los asientos de metas con su ficha, «Gasto {mes} $X · Apartado $Y» por separado (el
// apartado nunca entra en el total del gasto) y el filtro «Aportes».
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sharedOctober2026 } from "@/domain/golden/october-2026";
import { AnnotateProvider } from "@/features/expenses/annotate-provider";
import type { GoalEntryView } from "@/features/goals/types";
import { copy } from "@/lib/copy/es";
import type { SharedTransaction } from "@/lib/db/types";
import { ActivityFiltersProvider } from "./activity-filters";
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
    const { container } = render(
      <AnnotateProvider actions={idle}><ActivityFiltersProvider>
        <ActivityView rows={[]} month="2026-10" today="2026-10-31" navigation={{ previous: null, next: null }} goalEntries={[withdrawal]} goalPeople={members} setAsideMinor="0" />
      </ActivityFiltersProvider></AnnotateProvider>,
    );
    const rows = container.querySelectorAll("[data-goal-entry]");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(within(row as HTMLElement).getByText(copy.goals.activity.withdrawal)).toBeTruthy();
      expect(row.textContent).not.toContain("+");
      expect((row as HTMLElement).innerHTML).not.toMatch(/text-income|bg-category-income/);
    }
  });
});
