// 004 FR-096 / F64-4: «más de 500 filas ... fechas repetidas ... escrituras entre páginas».
import {expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {rpc,setupCoupleFixtures} from "./support/couple";
import {seedGoal} from "./support/planning";
import {runnerSql} from "./support/sql";
import {readByCursor,afterFilter} from "../../src/lib/db/paginate";
const fixtures=setupCoupleFixtures();
it("T016: goal_entries, budget_history y usage_requests recorren 1101 filas con empates y escrituras",async()=>{
  const p=await fixtures.couple(),g=seedGoal(p),budget=randomUUID();
  runnerSql(`begin;
    insert into juntia_data.budgets(id,group_id,category_id,created_by) values('${budget}','${p.groupId}','market','${p.sara.id}');
    insert into juntia_data.budget_versions(budget_id,effective_month,limit_minor,changed_by,changed_at)
      select '${budget}','2026-10-01',10000,'${p.sara.id}','2026-10-01T12:00:00Z' from generate_series(1,1101);
    insert into juntia_data.goal_ledger_entries(goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,created_by,created_at)
      select '${g.id}','contribution','${p.sara.id}',100,'2026-10-02','reserved','${p.sara.id}','2026-10-02T12:00:00Z' from generate_series(1,1101);
    create temporary table page_transactions(id uuid primary key);
    insert into page_transactions select gen_random_uuid() from generate_series(1,1101);
    insert into juntia_data.transactions(id,type,created_by,group_id,payer_user_id,split_mode,amount_minor,category_id,transaction_date)
      select id,'expense','${p.sara.id}','${p.groupId}','${p.sara.id}','equal',10000,'transport','2026-10-02' from page_transactions;
    insert into juntia_data.transaction_allocations(transaction_id,user_id,amount_minor)
      select id,u::uuid,5000 from page_transactions cross join unnest(array['${p.sara.id}','${p.tomas.id}']) u;
    insert into juntia_data.goal_usage_confirmations(goal_id,transaction_id,requested_by,member_user_id,amount_minor,created_at)
      select '${g.id}',id,'${p.sara.id}','${p.tomas.id}',100,'2026-10-02T12:00:00Z' from page_transactions;
    commit;`);
  for(const [view,columns,filterColumn,filterValue] of [
    ["goal_entries",["effective_date","created_at"],"goal_id",g.id],
    ["budget_history",["changed_at"],"budget_id",budget],
    ["usage_requests",["created_at"],"goal_id",g.id],
  ] as const){
    const expected:string[]=JSON.parse(runnerSql(`select json_agg(id::text) from public.${view} where ${filterColumn}='${filterValue}'`));
    // Las vistas dependen de auth.uid(): el baseline SQL debe tener la misma identidad.
    const baseline:string[]=view==="budget_history"?expected:JSON.parse(runnerSql(`begin; set local "request.jwt.claims"='{"sub":"${p.sara.id}","role":"authenticated"}'; select json_agg(id::text) from public.${view} where ${filterColumn}='${filterValue}'; rollback;`));
    expect(baseline.length).toBeGreaterThan(1100);
    const data=await readByCursor<Record<string,string>&{id:string}>((after,limit)=>{
      let q=p.sara.client.from(view).select("*").eq(filterColumn,filterValue);
      if(after)q=q.or(afterFilter(after,"desc",columns));
      for(const column of [...columns,"id"])q=q.order(column,{ascending:false});
      return q.limit(limit);
    },{columns,onPage:async index=>{
      if(index!==1)return;
      if(view==="budget_history")await rpc(p.sara.client,"update_budget",{p_idempotency_key:randomUUID(),p_budget_id:budget,p_expected_version:1,p_limit_minor:"20000"});
      else if(view==="goal_entries")await rpc(p.sara.client,"void_goal_entry",{p_idempotency_key:randomUUID(),p_entry_id:g.saraEntry,p_reason:"void"});
      else await rpc(p.sara.client,"cancel_usage_request",{p_idempotency_key:randomUUID(),p_request_id:baseline[0],p_expected_version:1});
    }});
    expect(new Set(data.map(r=>r.id)).size).toBe(data.length);
    for(const id of baseline)expect(data.some(r=>r.id===id)).toBe(true);
  }
});
