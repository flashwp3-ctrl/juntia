// T069 / FR-057; US-8.2; research R8.10; contracts/database.md, «Exportación». Los movimientos **activos propios** de
// la vista my_transactions (la RLS hace el resto), con los campos del contrato y nada más: sin identificadores (ni el
// propio ni versiones), sin dueño, sin estado y sin tokens. Importes como texto de unidades menores. No es restauración.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryId, TransactionType } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { DbError } from "./errors";
import { afterFilter, readByCursor, type PageOptions } from "./paginate";
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

// RFC 4180: comillas si hay coma, comilla, CR o LF; comillas internas dobladas. Inyección de fórmulas (research R8.10;
// F44-3 de la revisión del PR #44): un «'» delante de cualquier celda que empiece por = + - @, por un carácter de control
// (tabulador, CR, LF, el resto de C0 y DEL, que una hoja de cálculo puede saltar o tratar como separador) o por espacios
// seguidos de un operador.
const FORMULA = /^(?:[=+\-@\u0000-\u001f\u007f]|\s+[=+\-@])/;
export function csvCell(value: string | null) {
  if (value === null) return "";
  const safe = FORMULA.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function exportTransactions(client: SupabaseClient, format: ExportFormat, now = new Date(), options: PageOptions = {}) {
  await requireClaims(client);
  // F44-2: todas las páginas, por cursor sobre el orden total (fecha, `created_at`, `id`); el `id` ordena pero no sale
  // en el archivo. Garantía con escrituras concurrentes: paginate.ts. Si una página falla, no hay archivo (el route
  // handler responde 500): nunca uno parcial con 200.
  const data = await readByCursor<Row & { id: string }>((after, limit) => {
    let query = client
      .from("my_transactions")
      .select("id, transaction_date, type, category_id, description, amount_minor, currency, created_at, updated_at");
    if (after) query = query.or(afterFilter(after, "asc"));
    return query.order("transaction_date", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true }).limit(limit);
  }, options);
  const rows: ExportRow[] = data.map((row) => {
    if (typeof row.amount_minor !== "string" || !/^[0-9]+$/.test(row.amount_minor)) throw new DbError("unexpected");
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
  const lines = [COLUMNS.join(","), ...rows.map((row) => COLUMNS.map((column) => csvCell(row[column])).join(","))];
  return { body: `\uFEFF${lines.join("\r\n")}\r\n`, filename, contentType: "text/csv; charset=utf-8" };
}
