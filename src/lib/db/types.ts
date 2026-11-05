import type { CategoryId, TransactionDraft, TransactionType } from "@/domain/transactions";
export type TransactionTransport = {
  id: string; type: TransactionType; category_id: CategoryId; transaction_date: string;
  description: string | null; amount_minor: string; currency: "COP"; version: number;
  created_at: string; updated_at: string;
};
export type CreateTransactionInput = TransactionDraft & { idempotencyKey: string };
export type UpdateTransactionInput = Omit<CreateTransactionInput, "type"> & { transactionId: string; expectedVersion: number };
export type VoidTransactionInput = { idempotencyKey: string; transactionId: string; expectedVersion: number; reason: "delete" | "undo" };
export type VoidResult = { id: string; status: "voided"; version: number };
export type Profile = { displayName: string; theme: "light" | "dark" | "system"; firstEntryCompleted: boolean };
