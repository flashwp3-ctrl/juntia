// T043 (spec 003, PR C) / FR-042, FR-046; US-3 escenarios 2, 4–6 — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T043): «Inicio y Actividad en Nosotros con el dataset `beforeSettlement` … sin ningún
// privado; … estados vacío, cargando y error». Más, de T049: «filtros, buscador, flechas de mes, detalle con «A quién le
// corresponde» y tabla de escritorio con «Pagó · Reparto»».
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { saraPrivateOctober2026, settlementOctober25, sharedOctober2026 } from "@/domain/golden/october-2026";
import { copy } from "@/lib/copy/es";
import type { SharedTransaction } from "@/lib/db/types";
import { ActivityFiltersProvider } from "./activity-filters";
import { CoupleActivityView, type CoupleSettlementView } from "./couple-activity-view";
import { SharedDetail } from "./shared-detail";
import { AnnotateProvider } from "@/features/expenses/annotate-provider";

const idle = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/actividad" }));

const members = [{ userId: "sara", name: "Sara", joinOrder: 1 as const, isMe: true }, { userId: "tomas", name: "Tomás", joinOrder: 2 as const, isMe: false }];
const expenses: SharedTransaction[] = sharedOctober2026.map((row) => ({ ...row, createdBy: row.payerUserId, updatedBy: null, movedFromMe: false }));
const settlements: CoupleSettlementView[] = [{ ...settlementOctober25, note: null, version: 1 }];
// F57-2: el total, el desglose y el conteo salen de couple_month_summary (FR-043), no de sumar la lista.
const summary = { totalMinor: "284000000", count: 6, byCategory: { home: "160000000", market: "64000000", services: "36000000", restaurants: "24000000" } };

function view(props: Partial<Parameters<typeof CoupleActivityView>[0]> = {}) {
  return render(
    <AnnotateProvider actions={idle}><ActivityFiltersProvider>
      <CoupleActivityView expenses={expenses} settlements={settlements} month="2026-10" today="2026-10-31" navigation={{ previous: null, next: "2026-11" }} members={members} summary={summary} {...props} />
    </ActivityFiltersProvider></AnnotateProvider>,
  );
}

describe("Actividad en Nosotros (US-3.4)", () => {
  it("gastos compartidos con «Pagó X · reparto» y la liquidación con «Liquidado · no es un gasto»", () => {
    view();
    expect(screen.getAllByText(copy.shared.row.meta("Sara", copy.shared.mode.percentOf([55, 45]))).length).toBeGreaterThan(0);
    expect(screen.getAllByText(copy.shared.row.meta("Tomás", copy.shared.mode.equal)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(copy.shared.row.settlement).length).toBeGreaterThan(0);
  });

  it("el resumen del mes es el total compartido ($2.840.000) y la liquidación no cuenta como gasto", () => {
    view();
    expect(screen.getByText("$2.840.000")).toBeTruthy();
    expect(screen.getByText(copy.activity.spentTogether("octubre"))).toBeTruthy();
  });

  it("ningún movimiento privado aparece, ni al buscarlo (US-3.2)", async () => {
    const { container } = view();
    for (const row of saraPrivateOctober2026) expect(container.textContent).not.toContain(row.description!);
    await userEvent.setup().type(screen.getByRole("searchbox", { name: copy.activity.searchLabel }), "farmacia");
    expect(screen.getByText(copy.activity.noResults.title)).toBeTruthy();
  });

  it("el buscador filtra los compartidos sin tildes («carulla» → Carulla Laureles)", async () => {
    view();
    await userEvent.setup().type(screen.getByRole("searchbox", { name: copy.activity.searchLabel }), "carulla");
    expect(screen.getByText(copy.activity.results(1))).toBeTruthy();
  });

  it("F57-2: con la lista cortada, la cifra principal, las categorías y el conteo siguen siendo los del resumen", () => {
    view({ expenses: expenses.slice(0, 2) });
    expect(screen.getByText("$2.840.000")).toBeTruthy();
    expect(screen.getByText(copy.activity.count(6))).toBeTruthy();
    expect(screen.getByText(copy.activity.categoryChip(copy.categories.restaurants, "240.000"))).toBeTruthy();
  });

  it("la tabla de escritorio tiene la columna «Pagó · Reparto» (04·7)", () => {
    view();
    expect(within(screen.getByRole("table")).getByRole("columnheader", { name: copy.activity.table.paidSplit })).toBeTruthy();
  });

  it("flechas de mes: la siguiente lleva a noviembre", () => {
    view();
    expect((screen.getByRole("link", { name: copy.activity.nextMonth("Noviembre 2026") }))?.getAttribute("href")).toBe("/actividad?mes=2026-11");
  });

  it("F57-7: lista vacía con el resumen en 1: se ve el resumen y un aviso neutro, no el estado vacío", () => {
    view({ expenses: [], settlements: [], summary: { totalMinor: "18640000", count: 1, byCategory: { market: "18640000" } } });
    expect(screen.getByText("$186.400")).toBeTruthy();
    expect(screen.getByText(copy.activity.coupleStale.text)).toBeTruthy();
    expect(screen.queryByText(copy.activity.coupleEmpty.title)).toBeNull();
  });

  it("vacío: 04·6 «Aún no hay gastos este mes» con «Anotar el primero»", () => {
    view({ expenses: [], settlements: [], summary: null });
    expect(screen.getByText(copy.activity.coupleEmpty.title)).toBeTruthy();
    expect(screen.getByText(copy.activity.coupleEmpty.description)).toBeTruthy();
  });
});

describe("Detalle de un gasto compartido (04·1 DETALLE, panel de 04·7)", () => {
  it("«A quién le corresponde» con la parte de cada uno, «Anotado por Sara · pagó Tomás» y «Editado por»", () => {
    const row = { ...expenses[1], createdBy: "sara", updatedBy: "tomas", version: 2, updatedAt: "2026-10-20T15:00:00.000Z" };
    render(<AnnotateProvider actions={idle}><SharedDetail expense={row} members={members} closeHref="/actividad?mes=2026-10" /></AnnotateProvider>);
    const owed = screen.getByRole("region", { name: copy.shared.detail.owed });
    expect(within(owed).getByText("Sara")).toBeTruthy();
    expect(within(owed).getAllByText("$226.800")).toHaveLength(2);
    expect(screen.getByText(copy.shared.detail.notedBy("Sara", "Tomás"))).toBeTruthy();
    expect(screen.getByText(new RegExp(copy.shared.detail.editedBy("Tomás", "")))).toBeTruthy();
  });

  it("un gasto movido desde Yo lo dice a su autora", () => {
    render(<AnnotateProvider actions={idle}><SharedDetail expense={{ ...expenses[0], movedFromMe: true }} members={members} closeHref="/actividad?mes=2026-10" /></AnnotateProvider>);
    expect(screen.getByText(copy.move.movedFromMe)).toBeTruthy();
  });
});
