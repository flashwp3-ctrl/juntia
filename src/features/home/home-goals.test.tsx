// 004 PR C, T042 / FR-070; US-9; DEC-G04 (maestro §15.4) — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T042): «Inicio con «Apartado para metas» aparte del héroe». Y de US-9: el número héroe sigue
// siendo `gasto_consumo` (2.840.000 en Nosotros; 1.912.900 en Yo de Sara), «Apartado para metas $900.000 · Son cosas
// distintas: no se suman.» en Nosotros y «Apartaste $500.000 para metas» en Yo; `total_destinado_neto` (3.740.000 y
// 2.412.900) nunca aparece en Inicio; sin metas, el bloque invita a crear una sin cifras.
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { computeBalance } from "@/domain/balances";
import { beforeSettlement, sharedOctober2026 } from "@/domain/golden/october-2026";
import { AnnotateProvider } from "@/features/expenses/annotate-provider";
import type { GoalView } from "@/features/goals/types";
import { copy } from "@/lib/copy/es";
import type { SharedTransaction } from "@/lib/db/types";
import { CoupleHomeView, type CoupleMemberView } from "./couple-home-view";
import { HomeView } from "./home-view";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));
const idle = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
const wrap = (node: ReactNode) => render(<AnnotateProvider actions={idle}>{node}</AnnotateProvider>);

const members: CoupleMemberView[] = [{ userId: "sara", name: "Sara", joinOrder: 1, isMe: true }, { userId: "tomas", name: "Tomás", joinOrder: 2, isMe: false }];
const rows: SharedTransaction[] = sharedOctober2026.map((row) => ({ ...row, createdBy: row.payerUserId, updatedBy: null, movedFromMe: false }));
const summary = { totalMinor: "284000000", count: 6, byCategory: { home: "160000000", market: "64000000", services: "36000000", restaurants: "24000000" } };
const balance = computeBalance(beforeSettlement.expenses, beforeSettlement.settlements, beforeSettlement.members);
const japan: GoalView = {
  id: "44444444-4444-4444-8444-444444444444", name: "Japón", goalType: "travel", scope: "shared", status: "active", version: 3,
  targetMinor: "1800000000", balanceMinor: "1134000000", progressPercent: 63, myAvailableMinor: "612000000", hasPendingRequest: false,
  targetMonth: "2027-04-01", createdAt: "2025-12-01T17:00:00.000Z", lastContributionDate: "2026-10-22", lastContributionCreatedAt: "2026-10-22T17:00:00.000Z",
};
const goals = (setAsideMinor: string, list: GoalView[] = [japan]) => ({ setAsideMinor, goals: list, members: {} });

describe("Inicio con metas (US-9)", () => {
  it("Nosotros: el héroe sigue en $2.840.000 y «Apartado para metas $900.000 · Son cosas distintas: no se suman.» va aparte", () => {
    const { container } = wrap(<CoupleHomeView month="2026-10" today="2026-10-31" summary={summary} balance={balance} rows={rows} members={members} goals={goals("90000000")} />);
    expect(container.querySelector("[data-counting-amount]")?.getAttribute("data-counting-amount")).toBe("$2.840.000");
    const block = screen.getByRole("region", { name: copy.goals.home.usSetAside });
    expect(within(block).getByText("$900.000")).toBeTruthy();
    expect(within(block).getByText(copy.goals.home.usNote)).toBeTruthy();
    // El bloque de ahorro no está dentro del héroe ni se suma a él.
    expect(block.closest("[aria-labelledby='couple-hero']")).toBeNull();
    expect(container.textContent).not.toContain("$3.740.000");
    expect(container.textContent).not.toMatch(/Total gastado|te alcanza/);
  });

  it("Nosotros: el módulo de metas con la tarjeta de Japón y su cinta; «Ver todas» es el único camino a Metas (decisiones de los fundadores)", () => {
    const { container } = wrap(<CoupleHomeView month="2026-10" today="2026-10-31" summary={summary} balance={balance} rows={rows} members={members} goals={goals("90000000")} />);
    expect(screen.getByRole("link", { name: /^Japón, meta compartida, 63 %/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.goals.stack.seeAll }).getAttribute("href")).toBe("/metas");
    expect(screen.queryByRole("button", { name: copy.goals.stack.seeAll })).toBeNull();
    // 11 de noviembre de 2026: el encabezado ya no lleva «Ver metas»; en el módulo, un solo enlace a /metas (el del pie).
    expect(screen.queryByRole("link", { name: "Ver metas" })).toBeNull();
    const goalsModule = container.querySelector<HTMLElement>("[data-goals-home]")!;
    expect(within(goalsModule).getAllByRole("link").filter((link) => link.getAttribute("href") === "/metas")).toHaveLength(1);
  });

  it("Yo de Sara: el héroe es el gasto y «Apartaste $500.000 para metas» va aparte, sin destinado neto", () => {
    const part = { id: "p1", transactionDate: "2026-10-01", categoryId: "home" as const, description: "Arriendo", amount: { amountMinor: 160000000n, currency: "COP" as const }, myPart: { amountMinor: 88000000n, currency: "COP" as const }, payerUserId: "sara" };
    const shared = { parts: [part], summary: { privateMinor: "41290000", sharedPartMinor: "150000000", consumptionMinor: "191290000" } };
    const { container } = wrap(<HomeView rows={[]} month="2026-10" today="2026-10-31" shared={shared} goals={goals("50000000", [])} />);
    expect(container.querySelector("[data-counting-amount]")?.getAttribute("data-counting-amount")).toBe("$1.912.900");
    expect(screen.getByText(copy.goals.home.meSetAside("$500.000"))).toBeTruthy();
    expect(container.textContent).not.toContain("$2.412.900");
  });

  it("sin metas ni aportes: invita a crear una, sin cifras (§15.10)", () => {
    const { container } = wrap(<CoupleHomeView month="2026-10" today="2026-10-31" summary={summary} balance={balance} rows={rows} members={members} goals={goals("0", [])} />);
    expect(screen.queryByRole("region", { name: copy.goals.home.usSetAside })).toBeNull();
    const invite = screen.getByRole("link", { name: copy.goals.home.create });
    expect(invite.getAttribute("href")).toBe("/metas");
    expect(container.querySelector("[data-goals-home]")?.textContent).not.toMatch(/\$/);
  });
});

describe("Inicio · Nosotros desde 1024 (F03 de la auditoría de Impeccable; comp 04·7)", () => {
  const cells = (container: HTMLElement) => Object.fromEntries([...container.querySelectorAll<HTMLElement>("[data-home-cell], [data-balance-line]")].map((cell) => [cell.dataset.homeCell ?? "balance", cell.className]));

  it("la meta va en la columna ancha (7/12) junto al Balance, y «Recientes» debajo junto a «En qué se fue»", () => {
    const { container } = wrap(<CoupleHomeView month="2026-10" today="2026-10-31" summary={summary} balance={balance} rows={rows} members={members} goals={goals("90000000")} />);
    const at = cells(container);
    expect(at.goals).toContain("lg:col-start-1 lg:row-start-1");
    expect(at.balance).toContain("lg:col-start-2 lg:row-start-1");
    expect(at.recent).toContain("lg:col-start-1 lg:row-start-2");
    expect(at.breakdown).toContain("lg:col-start-2 lg:row-start-2");
    // En móvil, el orden de lectura es el del DOM y no cambia: saldo, metas, en qué se fue y recientes.
    const order = [...container.querySelectorAll<HTMLElement>("[data-home-cell]")].map((cell) => cell.dataset.homeCell);
    expect(order).toEqual(["goals", "breakdown", "recent"]);
  });

  it("sin la lectura de metas, «Recientes» sube a la primera fila y no deja un hueco", () => {
    const { container } = wrap(<CoupleHomeView month="2026-10" today="2026-10-31" summary={summary} balance={balance} rows={rows} members={members} />);
    expect(cells(container).recent).toContain("lg:row-start-1 lg:row-span-2");
  });
});
