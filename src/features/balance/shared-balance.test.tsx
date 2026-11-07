// T058 (spec 003, PR D) / FR-025, FR-026, FR-030, FR-047, FR-053; US-5 — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T058): «estados por saldar, al día, sin gastos compartidos (nunca «Al día $0»), cargando,
// error e invertido; filas «Pagó X · le corresponden Y»; `role="img"` con el `aria-label` de cifras completas; tabla de
// desglose; «le debe», nunca «está en deuda»».
// Datos: el dataset dorado (`beforeSettlement` y `afterSettlement`) con `computeBalance` del dominio, como lo devolvería
// `couple_balance`; la geometría de la barra sigue 02·3/04·2 (misma escala para las dos personas).
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeBalance, type MemberBalance } from "@/domain/balances";
import { afterSettlement, beforeSettlement, settlementOctober25, sharedOctober2026 } from "@/domain/golden/october-2026";
import { moneyFromPesos } from "@/domain/money";
import { copy } from "@/lib/copy/es";
import type { SharedTransaction } from "@/lib/db/types";
import { barGeometry, balanceScale } from "./bar-geometry";
import { BalanceBreakdown } from "./balance-breakdown";
import { SharedBalance, type BalanceMember } from "./shared-balance";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/balance" }));

const members: BalanceMember[] = [{ userId: "sara", name: "Sara", joinOrder: 1, isMe: true }, { userId: "tomas", name: "Tomás", joinOrder: 2, isMe: false }];
const before = computeBalance(beforeSettlement.expenses, beforeSettlement.settlements, beforeSettlement.members);
const after = computeBalance(afterSettlement.expenses, afterSettlement.settlements, afterSettlement.members);
const settledAll = computeBalance(beforeSettlement.expenses, [{ ...settlementOctober25, amount: moneyFromPesos(429900n) }], beforeSettlement.members);
const empty: MemberBalance[] = computeBalance([], [], beforeSettlement.members);
// Invertido (US-6.7): tras la liquidación de 200.000, una corrección deja a Sara debiendo. Tomás paga además 600.000 al 50/50.
const inverted = computeBalance([...afterSettlement.expenses, { amount: moneyFromPesos(1200000n), payerUserId: "tomas", status: "active", allocations: [{ userId: "sara", amount: moneyFromPesos(600000n) }, { userId: "tomas", amount: moneyFromPesos(600000n) }] }], afterSettlement.settlements, afterSettlement.members);

const text = () => document.body.textContent ?? "";

describe("SharedBalance · por saldar (beforeSettlement, US-5.1)", () => {
  it("POR SALDAR, «Tomás le debe a Sara $429.900», una fila por persona con «Pagó X · le corresponden Y» y su estado", () => {
    render(<SharedBalance balance={before} members={members} />);
    expect(screen.getByText(copy.balance.pending)).toBeTruthy();
    expect(screen.getByRole("heading", { name: copy.balance.owes("Tomás", "Sara") })).toBeTruthy();
    expect(document.querySelector("[data-balance-amount]")?.getAttribute("data-balance-amount")).toBe("$429.900");
    expect(screen.getByText(copy.balance.paidLine("1.929.900", "1.500.000"))).toBeTruthy();
    expect(screen.getByText(copy.balance.paidLine("910.100", "1.340.000"))).toBeTruthy();
    expect(screen.getByText(copy.balance.owed("429.900"))).toBeTruthy();
    expect(screen.getByText(copy.balance.owesShort("429.900"))).toBeTruthy();
    // La leyenda: le corresponde, puso de más, le falta.
    const legend = screen.getByRole("list", { name: copy.balance.legend.label });
    for (const item of [copy.balance.legend.share, copy.balance.legend.over, copy.balance.legend.missing]) expect(within(legend).getByText(item)).toBeTruthy();
  });

  it("cada barra es role=img con las cifras completas (COMPONENT_SPECIFICATIONS, SharedBalance, A11y)", () => {
    render(<SharedBalance balance={before} members={members} />);
    const bars = screen.getAllByRole("img");
    expect(bars.map((bar) => bar.getAttribute("aria-label"))).toEqual([
      "Sara pagó 1.929.900; le corresponden 1.500.000; le deben 429.900",
      "Tomás pagó 910.100; le corresponden 1.340.000; debe 429.900",
    ]);
  });

  it("«le debe», nunca «está en deuda»; sin rankings ni «Pagado» (glosario §9; US-5.7)", () => {
    render(<SharedBalance balance={before} members={members} />);
    expect(text()).not.toMatch(/está en deuda|en deuda|Pagado|gan[óa]|perd/i);
  });
});

describe("SharedBalance · liquidación parcial (afterSettlement, US-6.2)", () => {
  it("el saldo baja a $229.900 y las barras dicen cuánto liquidó y recibió", () => {
    render(<SharedBalance balance={after} members={members} />);
    expect(document.querySelector("[data-balance-amount]")?.getAttribute("data-balance-amount")).toBe("$229.900");
    expect(screen.getAllByRole("img").map((bar) => bar.getAttribute("aria-label"))).toEqual([
      "Sara pagó 1.929.900; le corresponden 1.500.000; recibió 200.000; le deben 229.900",
      "Tomás pagó 910.100; le corresponden 1.340.000; liquidó 200.000; debe 229.900",
    ]);
  });
});

describe("SharedBalance · al día (US-5.3)", () => {
  it("«Al día» con LIQUIDADO, sin cifras de deuda", () => {
    render(<SharedBalance balance={settledAll} members={members} />);
    expect(screen.getByText(copy.balance.settledBadge)).toBeTruthy();
    expect(screen.getByRole("heading", { name: copy.balance.settled })).toBeTruthy();
    expect(screen.queryByText(copy.balance.pending)).toBeNull();
    expect(text()).not.toMatch(/le debe|Debe \d|Le deben/);
    expect(screen.queryByRole("button", { name: copy.balance.actions.settle })).toBeNull();
  });
});

describe("SharedBalance · sin gastos compartidos (US-5.4)", () => {
  it("estado vacío con explicación; nunca «Al día $0»", () => {
    render(<SharedBalance balance={empty} members={members} />);
    expect(screen.getByText(copy.balance.empty.title)).toBeTruthy();
    expect(text()).not.toContain("$0");
    expect(text()).not.toContain(copy.balance.settled);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });
});

describe("SharedBalance · invertido (FR-030, US-6.7)", () => {
  it("la sugerencia cambia de dirección: «Sara le debe a Tomás»", () => {
    render(<SharedBalance balance={inverted} members={members} />);
    expect(screen.getByRole("heading", { name: copy.balance.owes("Sara", "Tomás") })).toBeTruthy();
    expect(document.querySelector("[data-balance-amount]")?.getAttribute("data-balance-amount")).toBe("$370.100");
  });
});

describe("SharedBalance · cargando y error (FR-047)", () => {
  it("cargando: el esqueleto con la geometría de las filas, aria-busy y el texto oculto", () => {
    render(<SharedBalance balance={[]} members={members} state="loading" />);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText(copy.balance.loading)).toBeTruthy();
    expect(text()).not.toMatch(/\$\d/);
  });

  it("error: lo dice sin cifras y ofrece Reintentar, que vuelve a pedir la página", () => {
    render(<SharedBalance balance={[]} members={members} state="error" />);
    expect(screen.getByText(copy.balance.error.title)).toBeTruthy();
    screen.getByRole("button", { name: copy.balance.error.retry }).click();
    expect(router.refresh).toHaveBeenCalled();
    expect(text()).not.toMatch(/\$\d/);
  });
});

describe("Geometría de la barra (02·3, 04·2)", () => {
  it("misma escala: el máximo entre lo aportado y lo que corresponde; Sara pone de más, a Tomás le falta", () => {
    const scale = balanceScale(before);
    expect(scale).toBe(192990000n);
    const sara = barGeometry(before[0], scale);
    const tomas = barGeometry(before[1], scale);
    // Marca de Sara en 1.500.000 / 1.929.900 = 77,72 %; la de Tomás en 69,43 %; lo pagado por Tomás, 47,16 %.
    expect(sara.mark).toBeCloseTo(77.72, 1);
    expect(tomas.mark).toBeCloseTo(69.43, 1);
    expect(sara.segments.map((segment) => segment.kind)).toEqual(["paid", "over"]);
    expect(tomas.segments.map((segment) => segment.kind)).toEqual(["paid", "missing"]);
    expect(tomas.segments[0].end).toBeCloseTo(47.16, 1);
  });

  it("tras liquidar todo, las dos barras terminan en su marca: «recibió» y «liquidó»", () => {
    const scale = balanceScale(settledAll);
    const [sara, tomas] = settledAll.map((row) => barGeometry(row, scale));
    expect(sara.segments.map((segment) => segment.kind)).toEqual(["paid", "received"]);
    expect(tomas.segments.map((segment) => segment.kind)).toEqual(["paid", "settled"]);
    expect(tomas.segments[1].end).toBeCloseTo(tomas.mark, 5);
  });
});

describe("Tabla de desglose (US-5.6)", () => {
  const rows: SharedTransaction[] = sharedOctober2026.map((row) => ({ ...row, createdBy: row.payerUserId, updatedBy: null, movedFromMe: false }));
  it("cada gasto con quién pagó y la parte de cada uno; el total del mes sale del servidor", () => {
    render(<BalanceBreakdown month="2026-10" expenses={rows} members={members} totalMinor="284000000" />);
    const table = screen.getByRole("table", { name: copy.balance.breakdown.caption("octubre") });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual([copy.balance.breakdown.expense, copy.balance.breakdown.payer, copy.balance.breakdown.partOf("Sara"), copy.balance.breakdown.partOf("Tomás"), copy.balance.breakdown.amount]);
    const arriendo = within(table).getByRole("row", { name: /Arriendo/ });
    expect(arriendo.textContent).toContain("Sara · 55/45");
    expect(arriendo.textContent).toContain("$880.000");
    expect(arriendo.textContent).toContain("$720.000");
    expect(within(table).getByRole("row", { name: new RegExp(copy.balance.breakdown.total) }).textContent).toContain("$2.840.000");
  });

  it("un mes sin gastos compartidos lo dice", () => {
    render(<BalanceBreakdown month="2026-09" expenses={[]} members={members} totalMinor={null} />);
    expect(screen.getByText(copy.balance.breakdown.empty("septiembre"))).toBeTruthy();
  });
});
