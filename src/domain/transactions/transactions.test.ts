// FR-013–FR-019 (spec.md): «un gasto o un ingreso»; «Ingresos solo vale para
// ingresos»; «el gasto del mes es la suma de gastos activos del mes».
import { moneyFromPesos } from "../money";
import { CATEGORY_CATALOG, validateDraft, monthKey, todayInBogota, monthSummary, groupByDay, fillRecentCategories, monthBounds, monthNavigation, shiftMonth, filterTransactions, matchesSearch, type Transaction, type TransactionDraft } from "./index";
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
// T061 / FR-046, US-6.3 (Q13): «La siguiente llega hasta el mes más lejano con movimientos, incluidos los futuros, y no
// avanza a meses vacíos más allá».
it("flechas de mes: llegan al mes futuro más lejano y no más, y cruzan el año", () => {
  const months = ["2026-09-01", "2026-10-01", "2027-03-01"];
  expect(monthNavigation(months, "2026-11", "2026-11")).toEqual({ previous: "2026-10", next: "2026-12" });
  expect(monthNavigation(months, "2026-11", "2027-02")).toEqual({ previous: "2027-01", next: "2027-03" });
  expect(monthNavigation(months, "2026-11", "2027-03")).toEqual({ previous: "2027-02", next: null });
  expect(monthNavigation(months, "2026-11", "2026-09")).toEqual({ previous: null, next: "2026-10" });
  expect(monthNavigation([], "2026-11", "2026-11")).toEqual({ previous: null, next: null });
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftMonth("2027-01", -1)).toBe("2026-12");
});
// FR-047; research R8.9: «sin distinguir tildes ni mayúsculas».
it("busca en la descripción sin distinguir tildes ni mayúsculas y filtra por tipo y categoría", () => {
  const rows = [
    row({ id: "a", description: "Regalo de cumpleaños" }),
    row({ id: "b", description: "Farmacia Pasteur", categoryId: "health" }),
    row({ id: "c", description: null }),
    row({ id: "d", type: "income", categoryId: "income", description: "Reembolso EPS" }),
  ];
  const ids = (filter: Parameters<typeof filterTransactions>[1]) => filterTransactions(rows, filter).map(({ id }) => id);
  expect(ids({ query: "CUMPLEANOS" })).toEqual(["a"]);
  expect(ids({ query: "  pastéur " })).toEqual(["b"]);
  expect(ids({ query: "" })).toEqual(["a", "b", "c", "d"]);
  expect(ids({ type: "income" })).toEqual(["d"]);
  expect(ids({ categoryId: "health" })).toEqual(["b"]);
  expect(ids({ query: "e", type: "expense", categoryId: "transport" })).toEqual(["a"]);
  expect(matchesSearch("Ñandú", "nandu")).toBe(true);
});
it("agrupa por día del más reciente al más antiguo y, dentro del día, por creación", () => {
  const rows = [row({ id: "old", transactionDate: "2026-10-03", createdAt: "2026-10-03T08:00:00Z" }), row({ id: "new", transactionDate: "2026-10-03", createdAt: "2026-10-03T09:00:00Z" }), row({ id: "later", transactionDate: "2026-10-23" })];
  expect(groupByDay(rows).map(({ date, transactions }) => [date, transactions.map(({ id }) => id)])).toEqual([["2026-10-23", ["later"]], ["2026-10-03", ["new", "old"]]]);
});
