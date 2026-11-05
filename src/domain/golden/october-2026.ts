import { moneyFromPesos } from "../money";
import { type Transaction, type TransactionType, type CategoryId } from "../transactions";
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
