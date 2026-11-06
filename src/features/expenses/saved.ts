// T081, T082 / FR-008. Un movimiento del dominio como lo ve la interfaz de Anotar y del detalle: el importe en texto
// (unidades menores) y la `version` para la siguiente escritura. Sirve en el servidor y en el cliente.
import type { Transaction } from "@/domain/transactions";
import type { SavedTransaction } from "./types";

export const toSavedTransaction = (transaction: Transaction): SavedTransaction => ({
  id: transaction.id, type: transaction.type, categoryId: transaction.categoryId, transactionDate: transaction.transactionDate,
  description: transaction.description, amountMinor: transaction.amount.amountMinor.toString(), version: transaction.version,
});
