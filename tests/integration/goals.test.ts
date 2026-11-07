// 004 T016 / FR-052–059: «gasto y uso propio ... una sola operación»;
// F64-1: «meta vuelve sola a active en la misma transacción ... no segundo void ni auditoría».
import {expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {rpc,setupCoupleFixtures} from "./support/couple";
import {runnerSql} from "./support/sql";
import {seedGoal,fundedArgs,pendingExpense,assertGoalInvariant} from "./support/planning";
const fixtures=setupCoupleFixtures();
it("T016: registrar es atómico e idempotente; fondos ajenos solo al aprobar",async()=>{
  const p=await fixtures.couple(),g=seedGoal(p);const args=fundedArgs(p,g.id);
  const first=await rpc(p.sara.client,"create_expense_with_goal",args);
  expect(await rpc(p.sara.client,"create_expense_with_goal",args)).toEqual(first);
  await expect(rpc(p.sara.client,"create_expense_with_goal",{...args,p_own_minor:"10100"})).rejects.toMatchObject({code:"JT008"});
  const {data}=await p.sara.client.from("usage_requests").select("*").eq("transaction_id",first.id).single();
  expect(data!.status).toBe("pending");
  expect((await p.sara.client.from("expense_goal_funding").select("*").eq("transaction_id",first.id).single()).data).toMatchObject({used_minor:"10000",pending_minor:"10000"});
  const approve={p_idempotency_key:randomUUID(),p_request_id:data!.id,p_expected_version:1};
  await expect(rpc(p.sara.client,"approve_usage_request",approve)).rejects.toMatchObject({code:"JT211"});
  const approved=await rpc(p.tomas.client,"approve_usage_request",approve);
  expect(await rpc(p.tomas.client,"approve_usage_request",approve)).toEqual(approved);
  expect((await p.sara.client.from("expense_goal_funding").select("*").eq("transaction_id",first.id).single()).data).toMatchObject({used_minor:"20000",pending_minor:"0"});
  expect(JSON.parse(assertGoalInvariant(g.id))).toEqual({negative:0,orphan:0});
});
it("T016: fallo después del gasto revierte gasto, partes, solicitud e idempotencia",async()=>{
  const p=await fixtures.couple(),g=seedGoal(p);const args=fundedArgs(p,g.id,{p_own_minor:"20000000"});
  await expect(rpc(p.sara.client,"create_expense_with_goal",args)).rejects.toBeTruthy();
  expect(runnerSql(`select count(*) from juntia_data.transactions where group_id='${p.groupId}'`)).toBe("0");
  expect(runnerSql(`select count(*) from juntia_data.idempotency_records where idempotency_key='${args.p_idempotency_key}'`)).toBe("0");
});
it.each(["void_shared_expense","remove_goal_usage"])("T016 F64-1: %s reactiva y repetir no duplica",async(operation)=>{
  const p=await fixtures.couple(),g=seedGoal(p,false,"10000","10000");
  const tx=await rpc(p.sara.client,"create_expense_with_goal",fundedArgs(p,g.id,{p_amount_minor:"20000",p_parts:{[p.sara.id]:"10000",[p.tomas.id]:"10000"}}));
  const {data}=await p.sara.client.from("usage_requests").select("*").eq("transaction_id",tx.id).single();
  await rpc(p.tomas.client,"approve_usage_request",{p_idempotency_key:randomUUID(),p_request_id:data!.id,p_expected_version:1});
  await rpc(p.sara.client,"archive_goal",{p_idempotency_key:randomUUID(),p_goal_id:g.id,p_expected_version:1});
  const args={p_idempotency_key:randomUUID(),p_transaction_id:tx.id,p_expected_version:1,...(operation==="void_shared_expense"?{p_reason:"delete"}:{})};
  const result=await rpc(p.sara.client,operation,args);
  expect(result.reactivated_goals).toEqual([{goal_id:g.id,name:"Meta sintética",returned_minor:"20000"}]);
  expect(await rpc(p.sara.client,operation,args)).toEqual(result);
  expect(runnerSql(`select status from juntia_data.savings_goals where id='${g.id}'`)).toBe("active");
  expect(runnerSql(`select count(*) from juntia_data.audit_events where entity_id='${g.id}' and action='reactivate'`)).toBe("1");
  expect(runnerSql(`select count(*) from juntia_data.goal_ledger_entries where goal_id='${g.id}' and kind='void'`)).toBe("2");
});
it("T016: aprobar revalida fondos; rechazar/cancelar no cambia gasto ni balance",async()=>{
  const p=await fixtures.couple(),g=seedGoal(p,false,"10000","10000");const {tx,request}=await pendingExpense(p,g.id);
  const before=await p.sara.client.from("couple_balance").select("*");
  await rpc(p.tomas.client,"withdraw_from_goal",{p_idempotency_key:randomUUID(),p_goal_id:g.id,p_amount_minor:"10000",p_entry_date:"2026-11-03",p_reason:"reasignar"});
  await expect(rpc(p.tomas.client,"approve_usage_request",{p_idempotency_key:randomUUID(),p_request_id:request.id,p_expected_version:1})).rejects.toMatchObject({code:"JT204"});
  await rpc(p.tomas.client,"reject_usage_request",{p_idempotency_key:randomUUID(),p_request_id:request.id,p_expected_version:1});
  expect((await p.sara.client.from("couple_balance").select("*")).data).toEqual(before.data);
  expect((await p.sara.client.from("couple_expenses").select("id").eq("id",tx.id)).data).toHaveLength(1);
});
it.each(["void_transaction","remove_goal_usage"])("T016 F64-1 personal: %s",async(operation)=>{
  const p=await fixtures.couple(),g=seedGoal(p,true,"10000");
  const tx=await rpc(p.sara.client,"create_expense_with_goal",fundedArgs(p,g.id,{p_context:"me",p_amount_minor:"10000",p_payer_user_id:null,p_split_mode:null,p_parts:null,p_own_minor:"10000",p_requested_minor:"0"}));
  await rpc(p.sara.client,"archive_goal",{p_idempotency_key:randomUUID(),p_goal_id:g.id,p_expected_version:1});
  const args={p_idempotency_key:randomUUID(),p_transaction_id:tx.id,p_expected_version:1,...(operation==="void_transaction"?{p_reason:"delete"}:{})};
  const result=await rpc(p.sara.client,operation,args);
  expect(result.reactivated_goals).toEqual([{goal_id:g.id,name:"Meta sintética",returned_minor:"10000"}]);
  expect(await rpc(p.sara.client,operation,args)).toEqual(result);
  expect(runnerSql(`select count(*) from juntia_data.audit_events where entity_id='${g.id}' and action='reactivate'`)).toBe("1");
  expect(JSON.parse(assertGoalInvariant(g.id))).toEqual({negative:0,orphan:0});
});
it("T016: las catorce escrituras recuperan respuesta perdida, detectan otra huella y ocultan claves del otro",async()=>{
  const p=await fixtures.couple();const seen=new Set<string>();
  const check=async(account:typeof p.sara,action:string,params:Record<string,unknown>,different:Record<string,unknown>)=>{
    const args={p_idempotency_key:randomUUID(),...params};const value=await rpc(account.client,action,args);
    expect(await rpc(account.client,action,args)).toEqual(value);
    expect(await rpc(account.client,"write_status",{p_action:action,p_idempotency_key:args.p_idempotency_key})).toEqual({state:"completed",result:value});
    const other=account.id===p.sara.id?p.tomas:p.sara;
    expect(await rpc(other.client,"write_status",{p_action:action,p_idempotency_key:args.p_idempotency_key})).toEqual({state:"not_found"});
    await expect(rpc(account.client,action,{...args,...different})).rejects.toMatchObject({code:"JT008"});
    seen.add(action);return value;
  };
  const budget=await check(p.sara,"create_budget",{p_context:"me",p_category_id:"market",p_limit_minor:"10000"},{p_limit_minor:"20000"});
  await check(p.sara,"update_budget",{p_budget_id:budget.budget_id,p_expected_version:1,p_limit_minor:null},{p_expected_version:2});
  const goal=await check(p.sara,"create_goal",{p_context:"me",p_name:"Propia",p_goal_type:"other",p_target_minor:"100000",p_target_month:null},{p_name:"Otra"});
  await check(p.sara,"update_goal",{p_goal_id:goal.id,p_expected_version:1,p_name:"Propia editada",p_goal_type:"other",p_target_minor:"100000",p_target_month:null},{p_expected_version:2});
  const today=runnerSql("select (now() at time zone 'America/Bogota')::date::text");
  const entry=await check(p.sara,"contribute_to_goal",{p_goal_id:goal.id,p_amount_minor:"10000",p_entry_date:today,p_funding_mode:"reserved"},{p_amount_minor:"10100"});
  const withdrawal=await check(p.sara,"withdraw_from_goal",{p_goal_id:goal.id,p_amount_minor:"1000",p_entry_date:today,p_reason:"reasignar"},{p_amount_minor:"1100"});
  await check(p.sara,"void_goal_entry",{p_entry_id:withdrawal.id,p_reason:"undo"},{p_reason:"void"});
  await rpc(p.sara.client,"void_goal_entry",{p_idempotency_key:randomUUID(),p_entry_id:entry.id,p_reason:"void"});
  await check(p.sara,"complete_goal",{p_goal_id:goal.id,p_expected_version:2},{p_expected_version:3});
  await check(p.sara,"archive_goal",{p_goal_id:goal.id,p_expected_version:3},{p_expected_version:4});
  const shared=seedGoal(p);
  const args:Record<string,unknown>=fundedArgs(p,shared.id);delete args.p_idempotency_key;
  const funded=await check(p.sara,"create_expense_with_goal",args,{p_own_minor:"10100"});
  const req=await p.sara.client.from("usage_requests").select("id").eq("transaction_id",funded.id).single();expect(req.error).toBeNull();
  await check(p.tomas,"approve_usage_request",{p_request_id:req.data!.id,p_expected_version:1},{p_expected_version:2});
  for(const operation of ["reject_usage_request","cancel_usage_request"]){
    const pending=await pendingExpense(p,shared.id);
    await check(operation==="reject_usage_request"?p.tomas:p.sara,operation,{p_request_id:pending.request.id,p_expected_version:1},{p_expected_version:2});
  }
  await check(p.sara,"remove_goal_usage",{p_transaction_id:funded.id,p_expected_version:1},{p_expected_version:2});
  expect(seen.size).toBe(14);
});
