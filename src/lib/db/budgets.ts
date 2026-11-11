import type {SupabaseClient} from "@supabase/supabase-js";
import {serializeAmountMinor,type Money} from "@/domain/money";
import type {CategoryId} from "@/domain/transactions";
import type {BudgetResult,BudgetMonthTransport,BudgetHistoryTransport,PlanningContext} from "./types";
import {planningWrite,planningRows,planningPages,planningMoney} from "./planning";
import {afterFilter,readByCursor,type PageOptions} from "./paginate";
import {requireClaims} from "./session";
import {withRetry} from "./retry";
export function createBudget(client:SupabaseClient,input:{idempotencyKey:string;context:PlanningContext;categoryId:CategoryId;limit:Money}){return planningWrite<BudgetResult>(client,"create_budget",{p_idempotency_key:input.idempotencyKey,p_context:input.context,p_category_id:input.categoryId,p_limit_minor:serializeAmountMinor(input.limit)});}
export function updateBudget(client:SupabaseClient,input:{idempotencyKey:string;budgetId:string;expectedVersion:number;limit:Money|null}){return planningWrite<BudgetResult>(client,"update_budget",{p_idempotency_key:input.idempotencyKey,p_budget_id:input.budgetId,p_expected_version:input.expectedVersion,p_limit_minor:input.limit===null?null:serializeAmountMinor(input.limit)});}
export function budgetMonths(client:SupabaseClient,context:PlanningContext,month:string){return planningRows<BudgetMonthTransport>(client,"budget_months",{context,month});}
export function budgetHistory(client:SupabaseClient,budgetId:string,options:PageOptions={}){return planningPages<BudgetHistoryTransport>(client,"budget_history",{budget_id:budgetId},["changed_at"],options);}
/**
 * 004 PR B (T033; FR-018, FR-096): el historial de varios presupuestos del mismo contexto en una lista por cursor
 * `(changed_at desc, id desc)`. Los ids salen de `budget_months` del contexto, así que en Nosotros nunca se pide la
 * historia de un presupuesto personal (FR-085). Sin ids, ninguna lectura.
 */
export async function budgetHistoryFor(client:SupabaseClient,budgetIds:readonly string[],options:PageOptions={}):Promise<BudgetHistoryTransport[]>{
 if(budgetIds.length===0)return [];
 await requireClaims(client);const columns=["changed_at"] as const;
 return planningMoney(await readByCursor<BudgetHistoryTransport>((after,limit)=>{let q=client.from("budget_history").select("*").in("budget_id",[...budgetIds]);
  if(after)q=q.or(afterFilter({changed_at:after.changed_at,id:after.id},"desc",columns));return q.order("changed_at",{ascending:false}).order("id",{ascending:false}).limit(limit);},{...options,columns}));
}
/**
 * 004 PR E (revisión F71-1 del PR #71): el primer mes (`AAAA-MM-01`) con un límite vigente en `context`, o `null`. Una sola
 * fila de `budget_months`, filtrada por contexto en la consulta (en Nosotros nunca se pide nada personal; FR-085). Análisis
 * la usa para no dejar fuera del selector un mes que solo tiene presupuesto.
 */
export async function firstBudgetMonth(client:SupabaseClient,context:PlanningContext):Promise<string|null>{
 await requireClaims(client);
 const rows=await withRetry<{month:string}[]>(()=>client.from("budget_months").select("month").eq("context",context).not("limit_minor","is",null).order("month",{ascending:true}).limit(1));
 return rows[0]?.month??null;
}
