import type {SupabaseClient} from "@supabase/supabase-js";
import {serializeAmountMinor,type Money} from "@/domain/money";
import type {GoalType,PlanningContext,GoalScope,GoalResult,GoalTransport,GoalTotalTransport,GoalMemberTransport,GoalEntryTransport,GoalActivityTransport} from "./types";
import {planningWrite,planningRows,planningPages} from "./planning";
import type {PageOptions} from "./paginate";
type GoalInput={idempotencyKey:string;name:string;goalType:GoalType;target:Money;targetMonth:string|null};
const metadata=(i:GoalInput)=>({p_idempotency_key:i.idempotencyKey,p_name:i.name,p_goal_type:i.goalType,p_target_minor:serializeAmountMinor(i.target),p_target_month:i.targetMonth});
export function createGoal(c:SupabaseClient,i:GoalInput&{context:PlanningContext}){return planningWrite<GoalResult>(c,"create_goal",{...metadata(i),p_context:i.context});}
export function updateGoal(c:SupabaseClient,i:GoalInput&{goalId:string;expectedVersion:number}){return planningWrite<GoalResult>(c,"update_goal",{...metadata(i),p_goal_id:i.goalId,p_expected_version:i.expectedVersion});}
export function completeGoal(c:SupabaseClient,i:{idempotencyKey:string;goalId:string;expectedVersion:number}){return planningWrite<Pick<GoalResult,"id"|"status"|"version">>(c,"complete_goal",{p_idempotency_key:i.idempotencyKey,p_goal_id:i.goalId,p_expected_version:i.expectedVersion});}
export function archiveGoal(c:SupabaseClient,i:{idempotencyKey:string;goalId:string;expectedVersion:number}){return planningWrite<Pick<GoalResult,"id"|"status"|"version">>(c,"archive_goal",{p_idempotency_key:i.idempotencyKey,p_goal_id:i.goalId,p_expected_version:i.expectedVersion});}
type EntryInput={idempotencyKey:string;goalId:string;amount:Money;entryDate:string};
export type EntryResult={id:string;goal_id:string;amount_minor:string;available_minor:string};
const entry=(i:EntryInput)=>({p_idempotency_key:i.idempotencyKey,p_goal_id:i.goalId,p_amount_minor:serializeAmountMinor(i.amount),p_entry_date:i.entryDate});
export function contributeToGoal(c:SupabaseClient,i:EntryInput&{fundingMode:"reserved"|"transferred_declared"}){return planningWrite<EntryResult>(c,"contribute_to_goal",{...entry(i),p_funding_mode:i.fundingMode});}
export function withdrawFromGoal(c:SupabaseClient,i:EntryInput&{reason:string}){return planningWrite<EntryResult>(c,"withdraw_from_goal",{...entry(i),p_reason:i.reason});}
export function voidGoalEntry(c:SupabaseClient,i:{idempotencyKey:string;entryId:string;reason:"undo"|"void"}){return planningWrite<{entry_id:string;voided:true}>(c,"void_goal_entry",{p_idempotency_key:i.idempotencyKey,p_entry_id:i.entryId,p_reason:i.reason});}
export function listGoals(c:SupabaseClient,context:PlanningContext){return planningPages<GoalTransport>(c,"goals_overview",context==="us"?{goal_scope:"shared"}:{},["created_at"]);}
export function goalTotals(c:SupabaseClient,scope:GoalScope){return planningRows<GoalTotalTransport>(c,"goals_totals",{goal_scope:scope});}
export function goalMemberBalances(c:SupabaseClient,goalId:string){return planningRows<GoalMemberTransport>(c,"goal_member_balances",{goal_id:goalId});}
export function goalEntries(c:SupabaseClient,goalId:string,options:PageOptions={}){return planningPages<GoalEntryTransport>(c,"goal_entries",{goal_id:goalId},["effective_date","created_at"],options);}
export function goalActivity(c:SupabaseClient,context:PlanningContext,month:string,options:PageOptions={}){return planningPages<GoalActivityTransport>(c,"goal_activity",{context,month},["effective_date","created_at"],options);}
