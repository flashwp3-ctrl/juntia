// 004 FR-080/081: «todo lo autorizado ... nunca privados del otro ... ningún gasto compartido dos veces».
import {expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {rpc,setupCoupleFixtures,expense} from "./support/couple";
import {seedGoal,pendingExpense} from "./support/planning";
import {runnerSql} from "./support/sql";
import {exportTransactions} from "../../src/lib/db/export";
const fixtures=setupCoupleFixtures();
it("T016: JSON/CSV globales, autorización bidireccional y sin duplicados",async()=>{
  const p=await fixtures.couple(),shared=seedGoal(p),personal=seedGoal(p,true),tomasGoal=randomUUID();
  runnerSql(`update juntia_data.savings_goals set name='Solo Sara' where id='${personal.id}';
    insert into juntia_data.savings_goals(id,owner_user_id,name,goal_type,target_minor,created_by) values('${tomasGoal}','${p.tomas.id}','Solo Tomás','other',100000,'${p.tomas.id}');`);
  const budget=await rpc(p.sara.client,"create_budget",{p_idempotency_key:randomUUID(),p_context:"me",p_category_id:"restaurants",p_limit_minor:"1234500"});
  await rpc(p.tomas.client,"create_budget",{p_idempotency_key:randomUUID(),p_context:"me",p_category_id:"health",p_limit_minor:"6789000"});
  await rpc(p.sara.client,"create_shared_expense",expense(p,{p_description:"Compartido único"}));
  await pendingExpense(p,shared.id);
  const sara=JSON.parse((await exportTransactions(p.sara.client,"json")).body);
  expect(sara.goals).toHaveLength(2);expect(sara.goal_entries.length).toBeGreaterThanOrEqual(4);
  expect(sara.usage_requests).toHaveLength(1);expect(sara.budgets).toHaveLength(1);
  expect(sara.transactions.filter((r:{description:string})=>r.description==="Compartido único")).toHaveLength(1);
  for(const collection of ["transactions","settlements","goals","goal_entries","usage_requests","budgets"]){for(const record of sara[collection]){expect(["me","us"]).toContain(record.context);for(const field of ["id","version","created_by","owner_user_id","group_id","budget_id","goal_id","transaction_id"])expect(record).not.toHaveProperty(field);}}
  const exportedShared=sara.transactions.find((r:{description:string})=>r.description==="Compartido único");
  expect(exportedShared.context).toBe("us");expect(exportedShared.parts).toHaveLength(2);
  expect(exportedShared.parts.reduce((sum:bigint,p:{amount_minor:string})=>sum+BigInt(p.amount_minor),0n)).toBe(BigInt(exportedShared.amount_minor));
  const text=JSON.stringify(sara);expect(text).toContain("Solo Sara");expect(text).not.toContain("Solo Tomás");expect(text).not.toContain("6789000");
  expect(text).not.toContain("idempotency");expect(text).not.toContain("token_hash");
  expect(sara.budgets[0]).toHaveProperty("context","me");
  expect(sara.budgets[0]).not.toHaveProperty("budget_id",budget.budget_id);
  const tomas=(await exportTransactions(p.tomas.client,"json")).body;expect(tomas).toContain("Solo Tomás");expect(tomas).not.toContain("Solo Sara");expect(tomas).not.toContain("1234500");
  const csv=(await exportTransactions(p.sara.client,"csv")).body;expect(csv).toContain("Solo Sara");expect(csv).not.toContain("Solo Tomás");expect(csv).toContain("context");
});
