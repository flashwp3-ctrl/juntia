// T043 (spec 003, PR C) / FR-037–FR-041, FR-044, FR-045, FR-048, FR-049; US-3, US-4 — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T043): «Inicio y Actividad en Nosotros con el dataset `beforeSettlement` (2.840.000,
// desglose, «Tomás le debe a Sara $429.900»); sin ningún privado; con el servidor en contexto nulo o sin pareja activa no
// se pintan datos; Yo con «Solo tuyos» y «Tu parte compartida» y las filas «Compartido · tu parte»; estados vacío,
// cargando y error». Y de T041: «E5 con el saldo tachado» (BalanceLine, que vive en Inicio en Nosotros).
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeBalance } from "@/domain/balances";
import { beforeSettlement, saraPrivateOctober2026, sharedOctober2026 } from "@/domain/golden/october-2026";
import { moneyFromPesos } from "@/domain/money";
import { copy } from "@/lib/copy/es";
import { AccountProvider } from "@/features/account/account-context";
import { ContextProvider } from "@/components/shell/context-selector";
import { ContextView } from "@/features/context/context-view";
import type { SharedTransaction } from "@/lib/db/types";
import { BalanceLine, CoupleHomeView, type CoupleMemberView } from "./couple-home-view";
import { HomeView } from "./home-view";
import { AnnotateProvider } from "@/features/expenses/annotate-provider";
import type { ReactNode } from "react";

const idle = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
// Como home.test.tsx: Inicio vive dentro del proveedor de Anotar (el bloque «Anotar gasto» y «Anotar el primero»).
const wrap = (node: ReactNode) => render(<AnnotateProvider actions={idle}>{node}</AnnotateProvider>);

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const members: CoupleMemberView[] = [{ userId: "sara", name: "Sara", joinOrder: 1, isMe: true }, { userId: "tomas", name: "Tomás", joinOrder: 2, isMe: false }];
const goldenShared: SharedTransaction[] = sharedOctober2026.map((row) => ({
  ...row, createdBy: row.payerUserId, updatedBy: null, movedFromMe: false, splitPercents: row.splitPercents,
}));
const summary = { totalMinor: "284000000", count: 6, byCategory: { home: "160000000", market: "64000000", services: "36000000", restaurants: "24000000" } };
const balance = computeBalance(beforeSettlement.expenses, beforeSettlement.settlements, beforeSettlement.members);

describe("Inicio en Nosotros con beforeSettlement (US-3.1)", () => {
  it("héroe $2.840.000, desglose de octubre y saldo «Tomás le debe a Sara $429.900»", () => {
    wrap(<CoupleHomeView month="2026-10" today="2026-10-31" summary={summary} balance={balance} rows={goldenShared} members={members} />);
    expect(screen.getByRole("heading", { name: copy.couple.home.spentIn("octubre") })).toBeTruthy();
    expect(screen.getAllByText("$2.840.000").length).toBeGreaterThan(0);
    for (const [category, value] of [["home", "1.600.000"], ["market", "640.000"], ["services", "360.000"], ["restaurants", "240.000"]] as const) {
      expect(screen.getByLabelText(copy.activity.categoryChip(copy.categories[category], value))).toBeTruthy();
    }
    // PR D: la línea (móvil) y el módulo de escritorio dicen lo mismo; CSS enseña uno según el ancho.
    for (const node of screen.getAllByText(copy.couple.home.owes("Tomás", "Sara"))) expect(node.closest("[data-balance-line]")?.textContent ?? "").toContain("$429.900");
    expect((screen.getByRole("link", { name: copy.couple.home.seeBalance }))?.getAttribute("href")).toBe("/balance");
  });

  it("no pinta ningún movimiento privado ni presupuesto (FR-041, FR-049)", () => {
    const { container } = wrap(<CoupleHomeView month="2026-10" today="2026-10-31" summary={summary} balance={balance} rows={goldenShared} members={members} />);
    for (const row of saraPrivateOctober2026) expect(container.textContent).not.toContain(row.description!);
    expect(container.textContent).not.toMatch(/restante|excedido|te alcanza|presupuesto/i);
  });

  it("las filas recientes dicen quién pagó y el reparto («Pagó Tomás · 50/50»)", () => {
    wrap(<CoupleHomeView month="2026-10" today="2026-10-31" summary={summary} balance={balance} rows={goldenShared} members={members} />);
    expect(screen.getAllByText(copy.shared.row.meta("Tomás", copy.shared.mode.equal)).length).toBeGreaterThan(0);
  });

  it("sin gastos compartidos en el mes: el estado vacío de 04·6 con «Anotar el primero», sin «Al día $0»", () => {
    wrap(<CoupleHomeView month="2026-11" today="2026-11-05" summary={null} balance={[]} rows={[]} members={members} />);
    expect(screen.getByText(copy.couple.home.empty.title)).toBeTruthy();
    expect(screen.queryByText(/\$0\b/)).toBeNull();
  });

  it("al día: el saldo dice «Al día» sin cifra", () => {
    const even = computeBalance([], [], beforeSettlement.members);
    wrap(<CoupleHomeView month="2026-10" today="2026-10-31" summary={summary} balance={even} rows={goldenShared} members={members} />);
    expect(screen.getByText(copy.couple.home.settled)).toBeTruthy();
  });
});

describe("E5 con el saldo tachado (02·5; T041)", () => {
  it("cuando el saldo cambia, el anterior queda tachado junto al nuevo", () => {
    const { rerender } = render(<BalanceLine balance={balance} members={members} />);
    const next = computeBalance([...beforeSettlement.expenses, { amount: moneyFromPesos(100000n), payerUserId: "sara", status: "active", allocations: [{ userId: "sara", amount: moneyFromPesos(50000n) }, { userId: "tomas", amount: moneyFromPesos(50000n) }] }], [], beforeSettlement.members);
    act(() => rerender(<BalanceLine balance={next} members={members} />));
    const struck = screen.getByText("$429.900");
    expect(struck.closest("s, del")).not.toBeNull();
    expect(screen.getByText(copy.couple.home.owes("Tomás", "Sara")).closest("[data-balance-line]")?.textContent ?? "").toContain("$479.900");
  });

  // C-1 (maestro §15.10, decisión 30.3; corrida del PR #104, E-12b): «Ana le debe a Beto ~~$115.000~~ $85.000» se leía como
  // si Ana hubiera debido 115.000. Criterio: si la deuda cambia de dirección, el anterior no se tacha bajo la dirección nueva.
  it("C-1: si la deuda cambia de dirección, el saldo anterior no aparece tachado bajo la dirección nueva", () => {
    const { rerender, container } = render(<BalanceLine balance={balance} members={members} />);
    // Tomás paga 1.000.000 al 50/50: Sara pasa de cobrar 429.900 a deber 70.100.
    const flipped = computeBalance([...beforeSettlement.expenses, { amount: moneyFromPesos(1000000n), payerUserId: "tomas", status: "active", allocations: [{ userId: "sara", amount: moneyFromPesos(500000n) }, { userId: "tomas", amount: moneyFromPesos(500000n) }] }], [], beforeSettlement.members);
    act(() => rerender(<BalanceLine balance={flipped} members={members} />));
    const line = screen.getByText(copy.couple.home.owes("Sara", "Tomás")).closest("[data-balance-line]");
    expect(line?.textContent ?? "").toContain("$70.100");
    expect(container.querySelector("s, del")).toBeNull();
    expect(screen.queryByText("$429.900")).toBeNull();
    // Un cambio posterior en la misma dirección sí tacha el anterior (E5 intacto): Sara paga 20.000 de Tomás.
    const after = computeBalance([...beforeSettlement.expenses,
      { amount: moneyFromPesos(1000000n), payerUserId: "tomas", status: "active", allocations: [{ userId: "sara", amount: moneyFromPesos(500000n) }, { userId: "tomas", amount: moneyFromPesos(500000n) }] },
      { amount: moneyFromPesos(20000n), payerUserId: "sara", status: "active", allocations: [{ userId: "tomas", amount: moneyFromPesos(20000n) }] }], [], beforeSettlement.members);
    act(() => rerender(<BalanceLine balance={after} members={members} />));
    expect(screen.getByText("$70.100").closest("s, del")).not.toBeNull();
    expect(screen.getByText(copy.couple.home.owes("Sara", "Tomás")).closest("[data-balance-line]")?.textContent ?? "").toContain("$50.100");
  });
});

describe("Yo con la parte compartida (US-4.1, US-4.2)", () => {
  const parts = goldenShared.map((row) => ({ id: row.id, transactionDate: row.transactionDate, categoryId: row.categoryId, description: row.description, amount: row.amount, myPart: row.allocations.find((a) => a.userId === "sara")!.amount, payerUserId: row.payerUserId }));
  const meSummary = { privateMinor: "41290000", sharedPartMinor: "150000000", consumptionMinor: "191290000" };

  it("Sara ve $1.912.900 con «Solo tuyos $412.900» y «Tu parte compartida $1.500.000»", () => {
    wrap(<HomeView rows={saraPrivateOctober2026} month="2026-10" today="2026-10-31" shared={{ parts, summary: meSummary }} />);
    expect(screen.getAllByText("$1.912.900").length).toBeGreaterThan(0);
    expect(screen.getByText(copy.home.onlyYours).closest("div")?.textContent ?? "").toContain("$412.900");
    expect(screen.getByText(copy.home.sharedPart).closest("div")?.textContent ?? "").toContain("$1.500.000");
  });

  it("las filas compartidas dicen «Compartido · tu parte $X» con el importe completo", () => {
    wrap(<HomeView rows={saraPrivateOctober2026} month="2026-10" today="2026-10-31" shared={{ parts, summary: meSummary }} />);
    expect(screen.getAllByText(copy.row.sharedPart("$93.200")).length).toBeGreaterThan(0);
  });

  it("sin pareja, Inicio en Yo sigue como en P0-1: sin «Tu parte compartida»", () => {
    wrap(<HomeView rows={saraPrivateOctober2026} month="2026-10" today="2026-10-31" />);
    expect(screen.queryByText(/Tu parte compartida/)).toBeNull();
  });
});

describe("Contexto del servidor (FR-038, FR-039)", () => {
  function inContext(server: "me" | "us" | null, stored: "me" | "us") {
    window.localStorage.setItem("juntia:context", stored);
    return render(
      <AccountProvider displayName="Sara" theme="light" couple="active">
        <ContextProvider>
          <ContextView server={server} pending={<p>{copy.home.loading}</p>} me={<p>privado</p>} us={<p>secreto de Nosotros</p>} />
        </ContextProvider>
      </AccountProvider>,
    );
  }

  it("con el servidor en contexto nulo, Nosotros no pinta datos: Skeleton", () => {
    inContext(null, "us");
    expect(screen.queryByText("secreto de Nosotros")).toBeNull();
    expect(screen.getAllByText(copy.home.loading).length).toBeGreaterThan(0);
  });

  it("con el servidor en Yo y el dispositivo en Nosotros, nunca se pinta lo de Yo bajo Nosotros", () => {
    inContext("me", "us");
    expect(screen.queryByText("privado")).toBeNull();
    expect(screen.queryByText("secreto de Nosotros")).toBeNull();
  });

  it("con el servidor en Nosotros, se pinta lo que el servidor construyó para Nosotros", () => {
    inContext("us", "us");
    expect(screen.getByText("secreto de Nosotros")).toBeTruthy();
  });
});
