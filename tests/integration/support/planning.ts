import {randomUUID} from "node:crypto";
import {rpc,type Account} from "./couple";
import {runnerSql} from "./sql";
export type PlanningPair={sara:Account;tomas:Account;groupId:string};
/** Preparación SQL, no interfaz. Fechas históricas permiten probar meses del dataset. */
export function seedGoal(pair:PlanningPair,personal=false,saraMinor="10000000",tomasMinor="10000000") {
  const id=randomUUID(),saraEntry=randomUUID(),tomasEntry=randomUUID();
  runnerSql(`insert into juntia_data.savings_goals(id,owner_user_id,group_id,name,goal_type,target_minor,created_by,created_at)
    values('${id}',${personal?`'${pair.sara.id}'`:"null"},${personal?"null":`'${pair.groupId}'`},'Meta sintética','travel',100000000,'${pair.sara.id}','2025-12-01');
    insert into juntia_data.goal_ledger_entries(id,goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,created_by)
    values('${saraEntry}','${id}','contribution','${pair.sara.id}',${saraMinor},'2026-10-01','reserved','${pair.sara.id}')
    ${personal?"":`,('${tomasEntry}','${id}','contribution','${pair.tomas.id}',${tomasMinor},'2026-10-01','reserved','${pair.tomas.id}')`};`);
  return {id,saraEntry,tomasEntry};
}
export function fundedArgs(pair:PlanningPair,goalId:string,patch:Record<string,unknown>={}) {
  return {p_idempotency_key:randomUUID(),p_context:"us",p_amount_minor:"30000",p_category_id:"transport",p_transaction_date:"2026-11-03",p_description:"Tiquetes sintéticos",
    p_payer_user_id:pair.tomas.id,p_split_mode:"equal",p_split_percents:null,p_parts:{[pair.sara.id]:"15000",[pair.tomas.id]:"15000"},p_goal_id:goalId,p_own_minor:"10000",p_requested_minor:"10000",...patch};
}
export async function pendingExpense(pair:PlanningPair,goalId:string) {
  const tx=await rpc(pair.sara.client,"create_expense_with_goal",fundedArgs(pair,goalId));
  const {data,error}=await pair.sara.client.from("usage_requests").select("*").eq("transaction_id",tx.id).single();
  if(error) throw error;
  return {tx,request:data!};
}
export function assertGoalInvariant(goalId:string) {
  return runnerSql(`select jsonb_build_object('negative',(select count(*) from (select member_user_id from juntia_data.goal_ledger_entries where goal_id='${goalId}' and member_user_id is not null union select a.member_user_id from juntia_data.goal_usage_allocations a join juntia_data.goal_ledger_entries e on e.id=a.entry_id where e.goal_id='${goalId}') m where juntia_private.goal_member_available('${goalId}',m.member_user_id)<0),
    'orphan',(select count(*) from juntia_data.goal_ledger_entries e join juntia_data.transactions t on t.id=e.transaction_id where e.goal_id='${goalId}' and e.kind='usage' and t.status<>'active' and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id)))::text;`);
}
