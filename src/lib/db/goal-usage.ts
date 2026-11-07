import type {SupabaseClient} from "@supabase/supabase-js";
import {serializeAmountMinor,type Money} from "@/domain/money";
import type {SharedExpenseInput,CreateTransactionInput,UsageRequestTransport,ExpenseFundingTransport,ReactivatedGoal,TransactionTransport,SharedExpenseTransport} from "./types";
import {planningWrite,planningRows,planningPages} from "./planning";
import {sharedSplitArgs} from "./shared-expenses";
import {requireClaims} from "./session";
import type {PageOptions} from "./paginate";
type Funding={goalId:string;own:Money;requested:Money};
type FundedInput=({context:"us"}&SharedExpenseInput|{context:"me"}&CreateTransactionInput)&Funding;
export type FundedExpense=(TransactionTransport|SharedExpenseTransport)&{goal_id:string;own_usage_entry_id:string|null;request_id:string|null};
export async function createExpenseWithGoal(c:SupabaseClient,i:FundedInput){
 await requireClaims(c);const split=i.context==="us"?{p_payer_user_id:i.payerUserId,...await sharedSplitArgs(c,i)}:{p_payer_user_id:null,p_split_mode:null,p_split_percents:null,p_parts:null};
 const args={p_idempotency_key:i.idempotencyKey,p_context:i.context,p_type:i.context==="me"?i.type:"expense",p_amount_minor:serializeAmountMinor(i.amount),p_category_id:i.categoryId,p_transaction_date:i.transactionDate,p_description:i.description,...split,p_goal_id:i.goalId,p_own_minor:serializeAmountMinor(i.own),p_requested_minor:serializeAmountMinor(i.requested)};
 return planningWrite<FundedExpense>(c,"create_expense_with_goal",args);
}
export type RequestResult={request_id:string;status:"approved"|"rejected"|"cancelled";usage_entry_id?:string};
export function approveUsageRequest(c:SupabaseClient,i:{idempotencyKey:string;requestId:string;expectedVersion:number}){return planningWrite<RequestResult>(c,"approve_usage_request",{p_idempotency_key:i.idempotencyKey,p_request_id:i.requestId,p_expected_version:i.expectedVersion});}
export function rejectUsageRequest(c:SupabaseClient,i:{idempotencyKey:string;requestId:string;expectedVersion:number}){return planningWrite<RequestResult>(c,"reject_usage_request",{p_idempotency_key:i.idempotencyKey,p_request_id:i.requestId,p_expected_version:i.expectedVersion});}
export function cancelUsageRequest(c:SupabaseClient,i:{idempotencyKey:string;requestId:string;expectedVersion:number}){return planningWrite<RequestResult>(c,"cancel_usage_request",{p_idempotency_key:i.idempotencyKey,p_request_id:i.requestId,p_expected_version:i.expectedVersion});}
export function removeGoalUsage(c:SupabaseClient,i:{idempotencyKey:string;transactionId:string;expectedVersion:number}){return planningWrite<{transaction_id:string;voided_usages:number;cancelled_request:boolean;reactivated_goals:ReactivatedGoal[]}>(c,"remove_goal_usage",{p_idempotency_key:i.idempotencyKey,p_transaction_id:i.transactionId,p_expected_version:i.expectedVersion});}
export function usageRequests(c:SupabaseClient,filters:{goalId?:string;status?:UsageRequestTransport["status"]}={},options:PageOptions={}){return planningPages<UsageRequestTransport>(c,"usage_requests",{...(filters.goalId?{goal_id:filters.goalId}:{}),...(filters.status?{status:filters.status}:{})},["created_at"],options);}
export function expenseGoalFunding(c:SupabaseClient,transactionId:string){return planningRows<ExpenseFundingTransport>(c,"expense_goal_funding",{transaction_id:transactionId});}
