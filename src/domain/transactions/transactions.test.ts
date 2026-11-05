// FR-013–FR-019 (spec.md): «un gasto o un ingreso»; «Ingresos solo vale para
// ingresos»; «el gasto del mes es la suma de gastos activos del mes».
import { moneyFromPesos } from "../money";
import { CATEGORY_CATALOG, validateDraft, monthKey, todayInBogota, monthSummary, groupByDay, fillRecentCategories, monthBounds, type Transaction, type TransactionDraft } from "./index";
const draft: TransactionDraft = { type: "expense", amount: moneyFromPesos(45000n), categoryId: "transport", transactionDate: "2026-10-03", description: null };
const row = (overrides: Partial<Transaction> = {}): Transaction => ({ ...draft, id: "one", status: "active", version: 1, createdAt: "2026-10-03T12:00:00Z", updatedAt: "2026-10-03T12:00:00Z", ...overrides });
it("conserva el catálogo literal y su orden (data-model §2.2)", () => {
  expect(CATEGORY_CATALOG.map(({ id, kind }) => [id, kind])).toEqual([
    ["market", "expense"], ["restaurants", "expense"], ["home", "expense"], ["transport", "expense"], ["health", "expense"],
    ["entertainment", "expense"], ["shopping", "expense"], ["services", "expense"], ["income", "income"], ["other", "expense"],
  ]);
});
it("valida tipo, pesos enteros, máximo, categoría, fecha y descripción", () => {
  expect(validateDraft(draft)).toEqual([]);
  expect(validateDraft({ ...draft, amount: moneyFromPesos(999999999n) })).toEqual([]);
  for (const amountMinor of [0n, -100n, 1n, 100000000000n]) expect(validateDraft({ ...draft, amount: { amountMinor, currency: "COP" } })).toContain("amountOutOfRange");
  expect(validateDraft({ ...draft, categoryId: "income" })).toContain("invalidCategory");
  expect(validateDraft({ ...draft, type: "income" })).toContain("invalidCategory");
  expect(validateDraft({ ...draft, type: "income", categoryId: "income" })).toEqual([]);
  expect(validateDraft({ ...draft, description: "a".repeat(141) })).toContain("descriptionTooLong");
  expect(validateDraft({ ...draft, description: "a".repeat(140) })).toEqual([]);
  for (const transactionDate of ["2026-02-29", "2026-13-01", "2026-1-01", "invalid"]) expect(validateDraft({ ...draft, transactionDate })).toContain("invalidDate");
  expect(validateDraft({ ...draft, transactionDate: "2028-02-29" })).toEqual([]);
  expect(validateDraft({ ...draft, transactionDate: "2030-01-01" })).toEqual([]);
});
// T009: «UTC del 1 de noviembre de 2026, aún 31 de octubre en Bogotá».
it("usa Bogotá para hoy y la fecha del movimiento para el mes", () => {
  expect(todayInBogota(new Date("2026-11-01T02:00:00Z"))).toBe("2026-10-31");
  expect(monthKey("2026-10-31")).toBe("2026-10");
});
it("excluye anulados, otros meses e ingresos del gasto y agrupa días sin mutar", () => {
  const rows = [row(), row({ id: "income", type: "income", categoryId: "income", amount: moneyFromPesos(86000n) }), row({ id: "void", status: "voided" }), row({ id: "next", transactionDate: "2026-11-01" })];
  expect(monthSummary(rows, "2026-10")).toEqual({ expenseTotal: moneyFromPesos(45000n), incomeTotal: moneyFromPesos(86000n), byCategory: { transport: moneyFromPesos(45000n) } });
  expect(groupByDay(rows).map(({ date, transactions }) => [date, transactions.map(({ id }) => id)])).toEqual([["2026-11-01", ["next"]], ["2026-10-03", ["one", "income"]]]);
  expect(rows[0].id).toBe("one");
});
it("completa cinco recientes sin duplicados ni ingresos (research R8.8)", () => {
  expect(fillRecentCategories(["health", "health", "income", "transport"])).toEqual(["health", "transport", "market", "restaurants", "home"]);
});
// US-6.3: «llega hasta el mes más lejano que tenga movimientos» (Q13).
it("limita las flechas al primer y último mes con movimientos o al actual", () => {
  expect(monthBounds(["2026-10-01", "2028-02-01"], "2026-11")).toEqual({ min: "2026-10", max: "2028-02" });
  expect(monthBounds([], "2026-11")).toEqual({ min: "2026-11", max: "2026-11" });
});
