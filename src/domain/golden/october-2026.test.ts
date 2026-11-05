// FR-020: «los movimientos privados de Sara de octubre de 2026, que suman
// exactamente 412.900 en gastos», y un ingreso que no suma (spec.md, dataset dorado).
import { monthSummary } from "../transactions";
import { saraPrivateOctober2026 } from "./october-2026";
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
