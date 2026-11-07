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
  const args={p_idempotency_key:randomUUID(),p_transaction_id:tx.id,p_expected_version:1,...(operation==="void_shared_expense"?{p_reason:"void"}:{})};
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
