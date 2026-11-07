import type {SupabaseClient} from "@supabase/supabase-js";
import {serializeAmountMinor,type Money} from "@/domain/money";
import type {CategoryId} from "@/domain/transactions";
import type {BudgetResult,BudgetMonthTransport,BudgetHistoryTransport,PlanningContext} from "./types";
import {planningWrite,planningRows,planningPages} from "./planning";
import type {PageOptions} from "./paginate";
export function createBudget(client:SupabaseClient,input:{idempotencyKey:string;context:PlanningContext;categoryId:CategoryId;limit:Money}){return planningWrite<BudgetResult>(client,"create_budget",{p_idempotency_key:input.idempotencyKey,p_context:input.context,p_category_id:input.categoryId,p_limit_minor:serializeAmountMinor(input.limit)});}
export function updateBudget(client:SupabaseClient,input:{idempotencyKey:string;budgetId:string;expectedVersion:number;limit:Money|null}){return planningWrite<BudgetResult>(client,"update_budget",{p_idempotency_key:input.idempotencyKey,p_budget_id:input.budgetId,p_expected_version:input.expectedVersion,p_limit_minor:input.limit===null?null:serializeAmountMinor(input.limit)});}
export function budgetMonths(client:SupabaseClient,context:PlanningContext,month:string){return planningRows<BudgetMonthTransport>(client,"budget_months",{context,month});}
export function budgetHistory(client:SupabaseClient,budgetId:string,options:PageOptions={}){return planningPages<BudgetHistoryTransport>(client,"budget_history",{budget_id:budgetId},["changed_at"],options);}
