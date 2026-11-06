// T069 / FR-057; US-8.2; research R8.10; contracts/database.md, «Exportación». Los movimientos **activos propios** de
// la vista my_transactions (la RLS hace el resto), con los campos del contrato y nada más: sin identificadores (ni el
// propio ni versiones), sin dueño, sin estado y sin tokens. Importes como texto de unidades menores. No es restauración.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryId, TransactionType } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { mapDbError } from "./errors";
import { requireClaims } from "./session";

export type ExportFormat = "json" | "csv";
export const isExportFormat = (value: unknown): value is ExportFormat => value === "json" || value === "csv";

const COLUMNS = ["transaction_date", "type", "category", "category_name", "description", "amount_minor", "currency", "created_at", "updated_at"] as const;
type Row = { transaction_date: string; type: TransactionType; category_id: CategoryId; description: string | null; amount_minor: string; currency: "COP"; created_at: string; updated_at: string };
type ExportRow = Record<(typeof COLUMNS)[number], string | null>;

/** Fecha y hora en America/Bogota (UTC−5 todo el año) con su desfase: «2026-11-04T15:02:11-05:00». */
function bogotaInstant(now: Date) {
  return `${new Date(now.getTime() - 5 * 3_600_000).toISOString().slice(0, 19)}-05:00`;
}

// RFC 4180: comillas si hay coma, comilla, CR o LF; comillas internas dobladas. Inyección de fórmulas: un «'» delante de
// cualquier celda que empiece por = + - @ (research R8.10).
function cell(value: string | null) {
  if (value === null) return "";
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function exportTransactions(client: SupabaseClient, format: ExportFormat, now = new Date()) {
  await requireClaims(client);
  const { data, error } = await client
    .from("my_transactions")
    .select("transaction_date, type, category_id, description, amount_minor, currency, created_at, updated_at")
    .order("transaction_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw mapDbError(error);
  const rows: ExportRow[] = (data as Row[]).map((row) => {
    if (typeof row.amount_minor !== "string" || !/^[0-9]+$/.test(row.amount_minor)) throw mapDbError(new Error("amount"));
    return {
      transaction_date: row.transaction_date, type: row.type, category: row.category_id, category_name: copy.categories[row.category_id],
      description: row.description, amount_minor: row.amount_minor, currency: row.currency, created_at: row.created_at, updated_at: row.updated_at,
    };
  });
  const exportedAt = bogotaInstant(now);
  const filename = `juntia-movimientos-${exportedAt.slice(0, 10)}.${format}`;
  if (format === "json") {
    const body = JSON.stringify({ exported_at: exportedAt, currency: "COP", note: copy.export.fileNote, transactions: rows }, null, 2);
    return { body, filename, contentType: "application/json; charset=utf-8" };
  }
  const lines = [COLUMNS.join(","), ...rows.map((row) => COLUMNS.map((column) => cell(row[column])).join(","))];
  return { body: `\uFEFF${lines.join("\r\n")}\r\n`, filename, contentType: "text/csv; charset=utf-8" };
}
