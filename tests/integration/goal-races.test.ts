// 004 FR-112: «en los dos órdenes ... ningún uso ... gasto anulado ... disponible ≥0».
import {expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {rpc,setupCoupleFixtures} from "./support/couple";
import {raceUnderLock,type Contender} from "./support/locked-race";
import {seedGoal,pendingExpense,assertGoalInvariant,fundedArgs} from "./support/planning";
const fixtures=setupCoupleFixtures();
for(const operation of ["cancel_usage_request","withdraw_from_goal","remove_goal_usage","void_shared_expense"] as const) {
  it.each([false,true])(`T016: aprobar contra ${operation}, invertir=%s`,async(reverse)=>{
    const p=await fixtures.couple(),g=seedGoal(p,false,"10000","10000");const {tx,request}=await pendingExpense(p,g.id);
    const approve:Contender={name:"approve_usage_request",wait:{row:"groups"},run:()=>rpc(p.tomas.client,"approve_usage_request",{p_idempotency_key:randomUUID(),p_request_id:request.id,p_expected_version:1})};
    const patch=operation==="cancel_usage_request"?{p_request_id:request.id,p_expected_version:1}:operation==="withdraw_from_goal"?{p_goal_id:g.id,p_amount_minor:"10000",p_entry_date:"2026-11-03",p_reason:"reasignar"}:{p_transaction_id:tx.id,p_expected_version:1,...(operation==="void_shared_expense"?{p_reason:"delete"}:{})};
    const other:Contender={name:operation,wait:{row:"groups"},run:()=>rpc((operation==="withdraw_from_goal"?p.tomas:p.sara).client,operation,{p_idempotency_key:randomUUID(),...patch})};
    const results=await raceUnderLock({row:"groups",id:p.groupId},reverse?other:approve,reverse?approve:other);
    expect(results[0].status).toBe("fulfilled");
    for(const result of results) if(result.status==="rejected") expect(["JT204","JT212","JT012"]).toContain(result.reason.code);
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
for(const kind of ["two_usages","two_approvals","two_contribution_voids","void_against_withdrawal"] as const) {
  it.each([false,true])(`T016: ${kind}, invertir=%s`,async(reverse)=>{
    const p=await fixtures.couple(),g=seedGoal(p,false,"10000","10000");
    let a:Contender,b:Contender;
    const contender=(name:string,run:()=>Promise<unknown>):Contender=>({name,wait:{row:"groups"},run});
    if(kind==="two_usages") {
      const use=()=>rpc(p.sara.client,"create_expense_with_goal",fundedArgs(p,g.id,{p_requested_minor:"0"}));
      a=contender("create_expense_with_goal",use);b=contender("create_expense_with_goal",use);
    } else if(kind==="two_approvals") {
      const {request}=await pendingExpense(p,g.id);
      const approve=()=>rpc(p.tomas.client,"approve_usage_request",{p_idempotency_key:randomUUID(),p_request_id:request.id,p_expected_version:1});
      a=contender("approve_usage_request",approve);b=contender("approve_usage_request",approve);
    } else {
      const voidEntry=(id:string)=>contender("void_goal_entry",()=>rpc(p.sara.client,"void_goal_entry",{p_idempotency_key:randomUUID(),p_entry_id:id,p_reason:"void"}));
      a=voidEntry(g.saraEntry);
      if(kind==="two_contribution_voids") {
        const extra=await rpc(p.sara.client,"contribute_to_goal",{p_idempotency_key:randomUUID(),p_goal_id:g.id,p_amount_minor:"10000",p_entry_date:"2026-11-03",p_funding_mode:"reserved"});
        await rpc(p.sara.client,"create_expense_with_goal",fundedArgs(p,g.id,{p_requested_minor:"0"}));
        b=voidEntry(extra.id);
      } else b=contender("withdraw_from_goal",()=>rpc(p.sara.client,"withdraw_from_goal",{p_idempotency_key:randomUUID(),p_goal_id:g.id,p_amount_minor:"10000",p_entry_date:"2026-11-03",p_reason:"reasignar"}));
    }
    const results=await raceUnderLock({row:"groups",id:p.groupId},reverse?b:a,reverse?a:b);
    expect(results[0].status).toBe("fulfilled");expect(results[1]).toMatchObject({status:"rejected",reason:{code:kind==="two_approvals"?"JT212":"JT204"}});
    expect(JSON.parse(assertGoalInvariant(g.id))).toEqual({negative:0,orphan:0});
  });
}
