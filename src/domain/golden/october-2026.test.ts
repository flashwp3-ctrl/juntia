// FR-020: «los movimientos privados de Sara de octubre de 2026, que suman
// exactamente 412.900 en gastos», y un ingreso que no suma (spec.md, dataset dorado).
import { monthSummary } from "../transactions";
import { saraPrivateOctober2026 } from "./october-2026";
import { sharedOctober2026, beforeSettlement, afterSettlement } from "./october-2026";
import { splitAmount } from "../allocations";
import { computeBalance } from "../balances";
import { meMonthSummary } from "../transactions";
// 003 T005b · SC-003: «2.840.000», «Sara +429.900 / Tomás −429.900», después «229.900» sin cambiar consumo.
it("reproduce los dos estados de octubre y la parte de cada persona, sin estimar los privados de Tomás", () => {
  const summary = monthSummary(sharedOctober2026, "2026-10");
  expect(summary.expenseTotal.amountMinor).toBe(284000000n);
  expect(Object.fromEntries(Object.entries(summary.byCategory).map(([k, v]) => [k, v.amountMinor]))).toEqual({ home: 160000000n, market: 64000000n, services: 36000000n, restaurants: 24000000n });
  expect(computeBalance(beforeSettlement.expenses, beforeSettlement.settlements, beforeSettlement.members).map(p => [p.paid.amountMinor, p.share.amountMinor, p.net.amountMinor])).toEqual([[192990000n, 150000000n, 42990000n], [91010000n, 134000000n, -42990000n]]);
  expect(computeBalance(afterSettlement.expenses, afterSettlement.settlements, afterSettlement.members).map(p => p.net.amountMinor)).toEqual([22990000n, -22990000n]);
  expect(meMonthSummary(saraPrivateOctober2026, sharedOctober2026.map(r => ({ ...r, myPart: r.allocations[0].amount })), "2026-10").gasto_consumo.amountMinor).toBe(191290000n);
  for (const row of sharedOctober2026) expect(splitAmount(row.amount, row.splitMode, beforeSettlement.members, row.splitPercents ? { sara: 55, tomas: 45 } : {})).toEqual(row.allocations);
});
it("reproduce los ocho gastos, el ingreso y el desglose literal de la spec", () => {
  const summary = monthSummary(saraPrivateOctober2026, "2026-10");
  expect(saraPrivateOctober2026.filter(({ type }) => type === "expense")).toHaveLength(8);
  expect(summary.expenseTotal.amountMinor).toBe(41290000n);
  expect(summary.incomeTotal.amountMinor).toBe(8600000n);
  expect(Object.fromEntries(Object.entries(summary.byCategory).map(([key, value]) => [key, value.amountMinor]))).toEqual({
    transport: 4500000n, services: 5970000n, restaurants: 6250000n, health: 3840000n,
    shopping: 9600000n, entertainment: 3400000n, market: 2730000n, other: 5000000n,
  });
  expect(saraPrivateOctober2026.map(({ transactionDate, description }) => [transactionDate, description])).toEqual([
    ["2026-10-03", "Taxi a la oficina"], ["2026-10-05", "Plan de celular"], ["2026-10-08", "Almuerzo con el equipo"],
    ["2026-10-11", "Farmacia"], ["2026-10-14", "Libros"], ["2026-10-18", "Cine"], ["2026-10-20", "Fruver"],
    ["2026-10-23", "Regalo de cumpleaños"], ["2026-10-21", "Reembolso EPS"],
  ]);
});
