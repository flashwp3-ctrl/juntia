// 004 PR E · T070 [US3] — capa: componentes (Vitest + RTL), con `next/navigation` simulado.
// Criterio literal (tasks.md, T070): «los cuatro capítulos con el dataset (2.840.000; desglose; «$900.000 · Sara $500.000 ·
// Tomás $400.000. Va aparte: no es gasto.»), comparación (sin mes anterior no hay «+X %»), Chart (nunca apila ahorro y gasto;
// tabla equivalente), PlanningNote (3.740.000; negativo con «Negativo: liberaron de metas más de lo que destinaron»; «Cómo se
// calcula» con `aria-expanded` y signos con texto; nunca «Total gastado» ni número héroe) y movimiento reducido».
// Cumple: FR-021–FR-025, FR-063; FR-113; US-3 escenarios 1–6; SC-011.
// Cifras: dataset dorado de P0-3 (octubre de Nosotros: partes B y C; metricCases) y la fila 4 de DEC-G04 (retiro de Sara).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { metricCases, octoberBudgets } from "@/domain/golden/planning-2026";
import { copy } from "@/lib/copy/es";
import { AnalysisScreen } from "./analysis-screen";
import { MonthChart } from "./month-chart";
import { PlanningNote } from "./planning-note";
import type { AnalysisData, AnalysisMetrics } from "./types";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/plan/analisis" }));

const minor = (pesos: bigint) => (pesos * 100n).toString();
const october = metricCases[0];
const usMetrics: AnalysisMetrics = {
  spentMinor: minor(october.consumption), contributedMinor: minor(october.contributions), withdrawnMinor: "0", fundedMinor: "0", netMinor: minor(october.net),
};
const budgetOf = (category: string) => octoberBudgets.find((budget) => budget.categoryId === category);
/** Octubre en Nosotros con los presupuestos de la parte B (Mercado 900.000, Restaurantes 260.000, Servicios 340.000). */
const withBudgets: AnalysisData = {
  context: "us", month: "2026-10", today: "2026-11-11", navigation: { previous: null, next: "2026-11" },
  metrics: usMetrics,
  categories: (["home", "market", "services", "restaurants"] as const).map((categoryId) => ({
    categoryId,
    consumedMinor: minor(categoryId === "home" ? 1600000n : budgetOf(categoryId)!.consumedPesos),
    limitMinor: categoryId === "home" ? null : minor(budgetOf(categoryId)!.versions.at(-1)!.limitPesos),
  })),
  comparison: null,
  history: [{ month: "2026-10", spentMinor: minor(october.consumption) }],
  contributors: [{ name: "Sara", amountMinor: minor(500000n) }, { name: "Tomás", amountMinor: minor(400000n) }],
};
const withoutBudgets: AnalysisData = { ...withBudgets, categories: withBudgets.categories.map((row) => ({ ...row, limitMinor: null })) };

const reducedMotion = (reduce: boolean) => vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }));
const chapter = (name: string) => screen.getByRole("region", { name });
const text = (element: Element) => (element.textContent ?? "").replace(/\s+/g, " ");
/** Lo que oye un lector de pantalla: el texto sin los nodos `aria-hidden`. */
const spoken = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll("[aria-hidden='true']").forEach((node) => node.remove());
  return text(clone).trim();
};

beforeEach(() => reducedMotion(true));
afterEach(() => vi.unstubAllGlobals());

describe("Análisis · los cuatro capítulos con el dataset de octubre (US-3, escenario 1)", () => {
  it("cuánto, en qué, comparado y lo apartado son regiones con encabezado, en ese orden (escenario 5)", () => {
    render(<AnalysisScreen data={withBudgets} />);
    const names = screen.getAllByRole("region").map((region) => document.getElementById(region.getAttribute("aria-labelledby") ?? "")?.textContent);
    expect(names).toEqual([copy.analysis.chapters.amount, copy.analysis.chapters.where, copy.analysis.chapters.compared, copy.analysis.chapters.setAside]);
    for (const name of Object.values(copy.analysis.chapters)) expect(within(chapter(name)).getByRole("heading", { name })).toBeTruthy();
  });

  it("capítulo 1: «Gastaron juntos $2.840.000», sin comparación ni «+X %» cuando el mes anterior no tiene gastos (escenario 3)", () => {
    render(<AnalysisScreen data={withBudgets} />);
    const amount = chapter(copy.analysis.chapters.amount);
    expect(text(amount)).toContain(`${copy.analysis.spent.us} $2.840.000`);
    expect(text(amount)).not.toMatch(/%|más que|menos que|Lo mismo/);
  });

  it("capítulo 2: el desglose Hogar 1.600.000 · Mercado 640.000 · Servicios 360.000 · Restaurantes 240.000, de mayor a menor", () => {
    render(<AnalysisScreen data={withoutBudgets} />);
    const where = chapter(copy.analysis.chapters.where);
    const chips = within(where).getAllByRole("listitem").map((item) => item.getAttribute("aria-label"));
    expect(chips).toEqual([
      copy.activity.categoryChip(copy.categories.home, "1.600.000"),
      copy.activity.categoryChip(copy.categories.market, "640.000"),
      copy.activity.categoryChip(copy.categories.services, "360.000"),
      copy.activity.categoryChip(copy.categories.restaurants, "240.000"),
    ]);
  });

  it("capítulo 4: «$900.000 · Sara $500.000 · Tomás $400.000. Va aparte: no es gasto.» y la PlanningNote con $3.740.000", () => {
    render(<AnalysisScreen data={withBudgets} />);
    const setAside = chapter(copy.analysis.chapters.setAside);
    expect(within(setAside).getByText("$900.000 · Sara $500.000 · Tomás $400.000. Va aparte: no es gasto.")).toBeTruthy();
    const note = within(setAside).getByRole("group", { name: copy.analysis.note.overline });
    expect(text(note)).toContain("$3.740.000");
    expect(text(note)).toContain(copy.analysis.note.fixed);
  });

  it("en Yo, lo apartado sin desglose por persona: «$500.000. Va aparte: no es gasto.»", () => {
    const sara = metricCases[1];
    render(<AnalysisScreen data={{ ...withoutBudgets, context: "me", contributors: null, metrics: { spentMinor: minor(sara.consumption), contributedMinor: minor(sara.contributions), withdrawnMinor: "0", fundedMinor: "0", netMinor: minor(sara.net) } }} />);
    expect(text(chapter(copy.analysis.chapters.amount))).toContain(`${copy.analysis.spent.me} $1.912.900`);
    expect(within(chapter(copy.analysis.chapters.setAside)).getByText("$500.000. Va aparte: no es gasto.")).toBeTruthy();
  });
});

describe("Análisis con y sin presupuesto (US-3, escenario 2; FR-022)", () => {
  it("con presupuesto: límite, consumido, desviación y la marca de mes transcurrido en el mes en curso", () => {
    render(<AnalysisScreen data={{ ...withBudgets, month: "2026-11", today: "2026-11-11", navigation: { previous: "2026-10", next: null } }} />);
    const where = chapter(copy.analysis.chapters.where);
    const budgets = within(where).getByRole("list", { name: copy.analysis.where.budgets });
    expect(within(budgets).getAllByRole("listitem")).toHaveLength(3);
    expect(within(budgets).getByRole("img", { name: copy.plan.bar(copy.categories.market, "640.000", "900.000", 71) })).toBeTruthy();
    expect(text(budgets)).toContain(copy.plan.left("$260.000"));
    expect(text(budgets)).toContain(copy.plan.over.us("$20.000", 105));
    // 11 de noviembre: diez días transcurridos de treinta (33 %), solo aritmética (Q9).
    expect(within(where).getByText(copy.analysis.where.elapsed(33))).toBeTruthy();
    expect(budgets.querySelectorAll("[data-elapsed-mark]")).toHaveLength(3);
  });

  it("un mes pasado con presupuesto no lleva marca de mes transcurrido", () => {
    render(<AnalysisScreen data={withBudgets} />);
    expect(document.querySelectorAll("[data-elapsed-mark]")).toHaveLength(0);
    expect(within(chapter(copy.analysis.chapters.where)).getAllByRole("img")).toHaveLength(3);
  });

  it("sin presupuesto: solo gasto y categorías, ninguna barra fingida, ni límite, ni 0 %, ni «excedido»", () => {
    render(<AnalysisScreen data={withoutBudgets} />);
    const where = chapter(copy.analysis.chapters.where);
    expect(within(where).queryByRole("img")).toBeNull();
    expect(where.querySelectorAll("[data-budget-bar], [data-elapsed-mark]")).toHaveLength(0);
    expect(within(where).getByText(copy.analysis.where.noBudgets.us)).toBeTruthy();
    expect(text(document.body)).not.toMatch(/\bde \$|\b0 %|EXCEDIDO|te alcanza|Total gastado/i);
  });
});

describe("Comparación con el mes anterior (Q10; FR-023)", () => {
  it("con gastos en septiembre: la diferencia en pesos, el porcentaje entero y hasta dos categorías, nunca un gasto concreto", () => {
    render(<AnalysisScreen data={{ ...withBudgets, comparison: { previousMonth: "2026-09", differenceMinor: minor(115000n), percent: 4, categories: ["restaurants", "services"] } }} />);
    const amount = chapter(copy.analysis.chapters.amount);
    expect(text(amount)).toContain(copy.analysis.comparison.more("$115.000", 4, "septiembre"));
    expect(text(amount)).toContain(copy.analysis.comparison.rose([copy.categories.restaurants, copy.categories.services]));
  });

  it("si bajó, «menos» con el signo y sin categorías si ninguna subió", () => {
    render(<AnalysisScreen data={{ ...withBudgets, comparison: { previousMonth: "2026-09", differenceMinor: minor(-300000n), percent: -9, categories: [] } }} />);
    const amount = chapter(copy.analysis.chapters.amount);
    expect(text(amount)).toContain(copy.analysis.comparison.less("$300.000", 9, "septiembre"));
    expect(text(amount)).not.toContain("Lo que más subió");
  });
});

describe("Chart del capítulo 3 (COMPONENT_SPECIFICATIONS «Chart»; US-3, escenario 6)", () => {
  const history = [
    { month: "2026-08", spentMinor: minor(2400000n) },
    { month: "2026-09", spentMinor: minor(2725000n) },
    { month: "2026-10", spentMinor: minor(2840000n) },
  ];
  it("una barra de gasto por mes con datos y su tabla equivalente; el mes elegido, en tinta", () => {
    render(<MonthChart months={history} selected="2026-10" />);
    const bars = document.querySelectorAll("[data-chart-bar]");
    expect(bars).toHaveLength(3);
    expect([...bars].map((bar) => bar.getAttribute("data-current"))).toEqual(["false", "false", "true"]);
    const table = screen.getByRole("table", { name: copy.analysis.compared.table });
    expect(within(table).getAllByRole("row").map((row) => [...row.children].map((cell) => text(cell).trim()).join(" "))).toEqual([
      `${copy.analysis.compared.month} ${copy.analysis.compared.amount}`, "Agosto 2026 $2.400.000", "Septiembre 2026 $2.725.000", "Octubre 2026 $2.840.000",
    ]);
  });

  it("nunca apila ahorro y gasto: el capítulo 3 no lleva lo apartado ni ninguna barra con dos segmentos", () => {
    render(<AnalysisScreen data={{ ...withBudgets, history }} />);
    const compared = chapter(copy.analysis.chapters.compared);
    expect(text(compared)).not.toContain("900.000");
    for (const bar of compared.querySelectorAll("[data-chart-bar]")) expect(bar.querySelectorAll("[data-chart-bar], [data-segment]")).toHaveLength(0);
    expect(within(compared).getByText(copy.analysis.compared.caption)).toBeTruthy();
  });

  it("con un solo mes con datos no hay barras de meses vacíos y lo dice", () => {
    render(<AnalysisScreen data={withBudgets} />);
    const compared = chapter(copy.analysis.chapters.compared);
    expect(compared.querySelectorAll("[data-chart-bar]")).toHaveLength(1);
    expect(within(compared).getByText(copy.analysis.compared.first)).toBeTruthy();
  });
});

describe("PlanningNote (Q4, decisión 22.4; DEC-G04; FR-063, FR-113)", () => {
  it("«Cómo se calcula» abre el desglose con `aria-expanded` y signos con texto: Gasto, más Aportes, menos Retiros, menos Gastos pagados con metas, igual a Destinado neto", async () => {
    const user = userEvent.setup();
    render(<PlanningNote metrics={usMetrics} />);
    const how = screen.getByRole("button", { name: copy.analysis.note.how });
    expect(how.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("definition")).toBeNull();
    await user.click(how);
    expect(how.getAttribute("aria-expanded")).toBe("true");
    const list = document.getElementById(how.getAttribute("aria-controls")!)!;
    expect(list.tagName).toBe("DL");
    const { terms, signs } = copy.analysis.note;
    expect(within(list).getAllByRole("term").map(spoken)).toEqual([
      terms.spent, `${signs.plus} ${terms.contributed}`, `${signs.minus} ${terms.withdrawn}`, `${signs.minus} ${terms.funded}`, `${signs.equals} ${terms.net}`,
    ]);
    // Los signos visibles son decorativos; el texto accesible los dice en palabras.
    for (const word of [signs.plus, signs.minus, signs.equals]) expect(within(list).getAllByText(word).every((node) => node.classList.contains("sr-only"))).toBe(true);
    expect(within(list).getAllByRole("definition").map((value) => text(value).trim())).toEqual(["$2.840.000", "$900.000", "$0", "$0", "$3.740.000"]);
    await user.click(how);
    expect(how.getAttribute("aria-expanded")).toBe("false");
  });

  it("negativo (fila 4 de DEC-G04, retiro de Sara): «−$200.000» con «Negativo: liberaron de metas más de lo que destinaron»", () => {
    const withdrawal = metricCases[3];
    render(<PlanningNote metrics={{ spentMinor: "0", contributedMinor: "0", withdrawnMinor: minor(withdrawal.withdrawals), fundedMinor: "0", netMinor: minor(withdrawal.net) }} />);
    const note = screen.getByRole("group", { name: copy.analysis.note.overline });
    expect(text(note)).toContain("−$200.000");
    expect(within(note).getByText(copy.analysis.note.negative)).toBeTruthy();
    expect(within(note).queryByText(copy.analysis.note.fixed)).toBeNull();
  });

  it("nunca «Total gastado» ni número héroe: la cifra de 17/600 vive en la nota del capítulo 4, no en el capítulo 1 ni en un encabezado", () => {
    render(<AnalysisScreen data={withBudgets} />);
    expect(text(document.body)).not.toMatch(/total gastado/i);
    expect(text(chapter(copy.analysis.chapters.amount))).not.toContain("3.740.000");
    for (const heading of screen.getAllByRole("heading")) expect(text(heading)).not.toContain("3.740.000");
    const value = document.querySelector("[data-planning-value]")!;
    expect(value.className).toContain("text-[17px]");
    expect(value.className).toContain("font-semibold");
  });
});

describe("Movimiento (MOTION_SYSTEM §5; FR-025; SC-011)", () => {
  it("con movimiento reducido, todo es visible desde el inicio y con el valor final en el DOM", () => {
    reducedMotion(true);
    render(<AnalysisScreen data={withBudgets} />);
    for (const region of screen.getAllByRole("region")) expect(region.style.opacity === "" || region.style.opacity === "1").toBe(true);
    expect(document.querySelectorAll("[style*='opacity: 0']")).toHaveLength(0);
    expect(document.querySelector("[data-counting-value]")?.textContent).toBe("$2.840.000");
  });

  it("sin movimiento reducido, el valor final sigue en el DOM para el lector de pantalla", () => {
    reducedMotion(false);
    render(<AnalysisScreen data={withBudgets} />);
    expect(within(chapter(copy.analysis.chapters.amount)).getByText("$2.840.000", { selector: ".sr-only" })).toBeTruthy();
  });
});
