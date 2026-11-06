import { moneyFromPesos } from "../money";
import { type Transaction, type TransactionType, type CategoryId } from "../transactions";
import { type SharedExpense, type Settlement } from "../balances";
export type ContextKind = "me" | "us";
export type PersonId = "sara" | "tomas";
export type GoldenCurrency = "COP";
// Copia literal del dataset de spec.md; no es una fuente de datos de la app.
const rows: readonly [string, TransactionType, CategoryId, string, bigint][] = [
  ["2026-10-03", "expense", "transport", "Taxi a la oficina", 45000n],
  ["2026-10-05", "expense", "services", "Plan de celular", 59700n],
  ["2026-10-08", "expense", "restaurants", "Almuerzo con el equipo", 62500n],
  ["2026-10-11", "expense", "health", "Farmacia", 38400n],
  ["2026-10-14", "expense", "shopping", "Libros", 96000n],
  ["2026-10-18", "expense", "entertainment", "Cine", 34000n],
  ["2026-10-20", "expense", "market", "Fruver", 27300n],
  ["2026-10-23", "expense", "other", "Regalo de cumpleaños", 50000n],
  ["2026-10-21", "income", "income", "Reembolso EPS", 86000n],
];
export const saraPrivateOctober2026: readonly Transaction[] = rows.map(([transactionDate, type, categoryId, description, pesos], index) => ({
  id: `sara-private-october-${index + 1}`, type, categoryId, description, transactionDate,
  amount: moneyFromPesos(pesos), status: "active", version: 1,
  createdAt: `${transactionDate}T12:00:00Z`, updatedAt: `${transactionDate}T12:00:00Z`,
}));
export const coupleMembers = [{ userId: "sara", joinOrder: 1 }, { userId: "tomas", joinOrder: 2 }] as const;
// 003 T005: filas y partes copiadas de la tabla del dataset; no se calculan mediante splitAmount.
const sharedRows: readonly [string, string, CategoryId, "sara" | "tomas", "equal" | "percent", bigint, bigint, bigint][] = [
  ["2026-10-01", "Arriendo", "home", "sara", "percent", 880000n, 720000n, 1600000n],
  ["2026-10-12", "Mercado del mes", "market", "tomas", "equal", 226800n, 226800n, 453600n],
  ["2026-10-18", "EPM", "services", "tomas", "equal", 135050n, 135050n, 270100n],
  ["2026-10-21", "Internet fibra", "services", "sara", "equal", 44950n, 44950n, 89900n],
  ["2026-10-23", "Cena en Carmen", "restaurants", "sara", "equal", 120000n, 120000n, 240000n],
  ["2026-10-24", "Carulla Laureles", "market", "tomas", "equal", 93200n, 93200n, 186400n],
];
export const sharedOctober2026: readonly (Transaction & SharedExpense & { splitMode: "equal" | "percent"; splitPercents: readonly number[] | null })[] = sharedRows.map(([transactionDate, description, categoryId, payerUserId, splitMode, sara, tomas, total], index) => ({
  id: `couple-october-${index + 1}`, type: "expense", status: "active", version: 1, transactionDate, description, categoryId,
  amount: moneyFromPesos(total), payerUserId, splitMode, splitPercents: splitMode === "percent" ? [55, 45] : null,
  allocations: [{ userId: "sara", amount: moneyFromPesos(sara) }, { userId: "tomas", amount: moneyFromPesos(tomas) }],
  createdAt: `${transactionDate}T12:00:00Z`, updatedAt: `${transactionDate}T12:00:00Z`,
}));
export const settlementOctober25: Settlement & { id: string; settlementDate: string; createdAt: string } = {
  id: "couple-october-settlement", settlementDate: "2026-10-25", createdAt: "2026-10-25T12:00:00Z",
  fromUserId: "tomas", toUserId: "sara", amount: moneyFromPesos(200000n), status: "active",
};
export const beforeSettlement = { expenses: sharedOctober2026, settlements: [], members: coupleMembers } as const;
export const afterSettlement = { expenses: sharedOctober2026, settlements: [settlementOctober25], members: coupleMembers } as const;
