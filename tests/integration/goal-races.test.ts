// 004 FR-112: «en los dos órdenes ... ningún uso ... gasto anulado ... disponible ≥0».
import {expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {rpc,setupCoupleFixtures} from "./support/couple";
import {raceUnderLock,type Contender} from "./support/locked-race";
import {seedGoal,pendingExpense,assertGoalInvariant} from "./support/planning";
const fixtures=setupCoupleFixtures();
for(const operation of ["cancel_usage_request","withdraw_from_goal","remove_goal_usage","void_shared_expense"] as const) {
  it.each([false,true])(`T016: aprobar contra ${operation}, invertir=%s`,async(reverse)=>{
    const p=await fixtures.couple(),g=seedGoal(p,false,"10000","10000");const {tx,request}=await pendingExpense(p,g.id);
    const approve:Contender={name:"approve_usage_request",wait:{row:"groups"},run:()=>rpc(p.tomas.client,"approve_usage_request",{p_idempotency_key:randomUUID(),p_request_id:request.id,p_expected_version:1})};
    const patch=operation==="cancel_usage_request"?{p_request_id:request.id,p_expected_version:1}:operation==="withdraw_from_goal"?{p_goal_id:g.id,p_amount_minor:"10000",p_entry_date:"2026-11-03",p_reason:"reasignar"}:{p_transaction_id:tx.id,p_expected_version:1,...(operation==="void_shared_expense"?{p_reason:"void"}:{})};
    const other:Contender={name:operation,wait:{row:"groups"},run:()=>rpc((operation==="withdraw_from_goal"?p.tomas:p.sara).client,operation,{p_idempotency_key:randomUUID(),...patch})};
    await raceUnderLock({row:"groups",id:p.groupId},reverse?other:approve,reverse?approve:other);
    expect(JSON.parse(assertGoalInvariant(g.id))).toEqual({negative:0,orphan:0});
  });
}
it.each([false,true])("T016: dos anulaciones del mismo aporte, invertir=%s",async(reverse)=>{
  const p=await fixtures.couple(),g=seedGoal(p);
  const call=():Contender=>({name:"void_goal_entry",wait:{row:"groups"},run:()=>rpc(p.sara.client,"void_goal_entry",{p_idempotency_key:randomUUID(),p_entry_id:g.saraEntry,p_reason:"void"})});
  const calls=[call(),call()];if(reverse)calls.reverse();
  const results=await raceUnderLock({row:"groups",id:p.groupId},calls[0],calls[1]);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  expect(results.find(r=>r.status==="rejected")).toMatchObject({reason:{code:"JT207"}});
  expect(JSON.parse(assertGoalInvariant(g.id))).toEqual({negative:0,orphan:0});
});
