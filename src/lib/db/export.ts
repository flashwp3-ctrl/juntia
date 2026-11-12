// 004 FR-080/081: exportación de lo autorizado por RLS, con contexto y proyecciones explícitas.
// Importes como texto; sin UUID internos, versiones, claves ni tokens. No es restauración.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryId, TransactionType } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { DbError } from "./errors";
import { afterFilter, readByCursor, type PageOptions } from "./paginate";
import {planningMoney,planningPages,planningRows} from "./planning";
import type {GoalTransport,GoalEntryTransport,UsageRequestTransport,SharedExpenseTransport,SettlementTransport,BudgetHistoryTransport,BudgetMonthTransport} from "./types";
import {withRetry} from "./retry";
import { requireClaims } from "./session";

export type ExportFormat = "json" | "csv";
export const isExportFormat = (value: unknown): value is ExportFormat => value === "json" || value === "csv";

const COLUMNS = ["transaction_date", "type", "category", "category_name", "description", "amount_minor", "currency", "created_at", "updated_at", "context"] as const;
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
  const claims=await requireClaims(client);
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
      description: row.description, amount_minor: row.amount_minor, currency: row.currency, created_at: row.created_at, updated_at: row.updated_at,context:"me",
    };
  });

  // FR-080/081: cada colección se lee con la sesión y la RLS de quien exporta.
  // Proyección explícita: los UUID solo sirven para enlazar durante la lectura y nunca salen al archivo.
  const members=await planningRows<{user_id:string;display_name:string}>(client,"couple_members");
  const name=(id:string|null)=>members.find(m=>m.user_id===id)?.display_name??(id===claims.sub?copy.context.me:null);
  const shared=await planningPages<SharedExpenseTransport>(client,"couple_expenses",{},["transaction_date","created_at"],options);
  const sharedRows=shared.map(r=>({transaction_date:r.transaction_date,type:"expense",category:r.category_id,category_name:copy.categories[r.category_id],description:r.description,amount_minor:r.amount_minor,currency:"COP",created_at:r.created_at,updated_at:r.updated_at,context:"us",payer:name(r.payer_user_id),parts:Object.entries(r.parts).map(([id,amount_minor])=>({person:name(id),amount_minor}))}));
  const transactions=[...rows,...sharedRows];
  const settled=await planningPages<SettlementTransport>(client,"couple_settlements",{},["settlement_date","created_at"],options);
  const settlements=settled.filter(r=>r.status==="active").map(r=>({context:"us",settlement_date:r.settlement_date,from:name(r.from_user_id),to:name(r.to_user_id),amount_minor:r.amount_minor,note:r.note,created_at:r.created_at}));
  const goalData=await planningPages<GoalTransport>(client,"goals_overview",{},["created_at"],options);
  const scope=(id:string)=>goalData.find(g=>g.id===id)?.goal_scope==="shared"?"us":"me";
  const goalName=(id:string)=>goalData.find(g=>g.id===id)?.name??null;
  const goals=goalData.map(g=>({context:scope(g.id),name:g.name,goal_type:g.goal_type,target_minor:g.target_minor,target_month:g.target_month,status:g.status,balance_minor:g.balance_minor,created_at:g.created_at}));
  const entries=await planningPages<GoalEntryTransport>(client,"goal_entries",{},["effective_date","created_at"],options);
  const goal_entries=entries.map(e=>({context:scope(e.goal_id),goal_name:goalName(e.goal_id),kind:e.kind,person:name(e.member_user_id),amount_minor:e.amount_minor,effective_date:e.effective_date,funding_mode:e.funding_mode,reason:e.reason,transaction_description:e.transaction_description,voided:e.voided,voided_reason:e.voided_reason,created_at:e.created_at}));
  const requests=await planningPages<UsageRequestTransport>(client,"usage_requests",{},["created_at"],options);
  const usage_requests=requests.map(r=>({context:scope(r.goal_id),goal_name:r.goal_name,transaction_description:r.transaction_description,transaction_amount_minor:r.transaction_amount_minor,requested_by:name(r.requested_by),person:name(r.member_user_id),amount_minor:r.amount_minor,status:r.status,created_at:r.created_at,resolved_at:r.resolved_at}));
  // budget_months no tiene id: su clave total es (context, category_id, month).
  // Se recorre completa para enlazar las identidades del historial, incluidas desactivadas.
  const metadata=new Map<string,{context:string;category:string}>();
  let budgetAfter:BudgetMonthTransport|null=null;
  for(;;){let q=client.from("budget_months").select("*");
    if(budgetAfter){const a=budgetAfter;q=q.or(`context.gt.${a.context},and(context.eq.${a.context},category_id.gt.${a.category_id}),and(context.eq.${a.context},category_id.eq.${a.category_id},month.gt.${a.month})`);}
    const page=planningMoney(await withRetry<BudgetMonthTransport[]>(()=>q.order("context").order("category_id").order("month").limit(500)));
    if(!page.length)break;for(const r of page)if(r.budget_id)metadata.set(r.budget_id,{context:r.context,category:r.category_id});budgetAfter=page.at(-1)!;
  }
  const history=await planningPages<BudgetHistoryTransport>(client,"budget_history",{},["changed_at"],options);
  const budgets=history.map(h=>({context:metadata.get(h.budget_id)?.context,category:metadata.get(h.budget_id)?.category,effective_month:h.effective_month,previous_limit_minor:h.previous_limit_minor,limit_minor:h.limit_minor,changed_by:name(h.changed_by),changed_at:h.changed_at}));
  const collections=planningMoney({transactions,settlements,goals,goal_entries,usage_requests,budgets});

  const exportedAt = bogotaInstant(now);
  // F23 (propuesta aprobada por los fundadores, 11 nov 2026): el archivo trae movimientos, metas, aportes y presupuestos.
  const filename = `juntia-datos-${exportedAt.slice(0, 10)}.${format}`;
  if (format === "json") {
    const body = JSON.stringify({ exported_at: exportedAt, currency: "COP", note: copy.export.fileNote, ...collections }, null, 2);
    return { body, filename, contentType: "application/json; charset=utf-8" };
  }
  const records=Object.entries(collections).flatMap(([type,items])=>items.map(item=>({...item,record_type:type}) as Record<string,unknown>));
  const columns=[...new Set([...COLUMNS,"record_type",...records.flatMap(r=>Object.keys(r))])];
  const lines=[columns.join(","),...records.map(row=>columns.map(column=>{const v=row[column];return csvCell(v==null?null:typeof v==="object"?JSON.stringify(v):String(v));}).join(","))];
  return { body: `\uFEFF${lines.join("\r\n")}\r\n`, filename, contentType: "text/csv; charset=utf-8" };
}
