// 004 FR-112: «editar/desactivar ... en los dos órdenes ... dos creaciones ... misma clave».
import {expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {rpc,setupCoupleFixtures} from "./support/couple";
import {raceUnderLock} from "./support/locked-race";
import {runnerSql} from "./support/sql";
const fixtures=setupCoupleFixtures();
it("T016: idempotencia, otra huella y write_status solo del actor",async()=>{
  const p=await fixtures.couple();const key=randomUUID();
  const args={p_idempotency_key:key,p_context:"us",p_category_id:"market",p_limit_minor:"90000000"};
  const first=await rpc(p.sara.client,"create_budget",args);
  expect(await rpc(p.sara.client,"create_budget",args)).toEqual(first);
  await expect(rpc(p.sara.client,"create_budget",{...args,p_limit_minor:"80000000"})).rejects.toMatchObject({code:"JT008"});
  expect(await rpc(p.sara.client,"write_status",{p_action:"create_budget",p_idempotency_key:key})).toMatchObject({state:"completed",result:first});
  expect(await rpc(p.tomas.client,"write_status",{p_action:"create_budget",p_idempotency_key:key})).toEqual({state:"not_found"});
});
it.each([false,true])("T016: editar contra desactivar, invertir=%s",async(reverse)=>{
  const p=await fixtures.couple();
  const b=await rpc(p.sara.client,"create_budget",{p_idempotency_key:randomUUID(),p_context:"us",p_category_id:"market",p_limit_minor:"90000000"});
  const calls=["100000000",null].map((limit,i)=>({name:"update_budget",wait:{row:"groups" as const},run:()=>rpc((i?p.tomas:p.sara).client,"update_budget",{p_idempotency_key:randomUUID(),p_budget_id:b.budget_id,p_expected_version:1,p_limit_minor:limit})}));
  if(reverse)calls.reverse();
  const results=await raceUnderLock({row:"groups",id:p.groupId},calls[0],calls[1]);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  expect(results.find(r=>r.status==="rejected")).toMatchObject({reason:{code:"JT011"}});
  expect(runnerSql(`select version from juntia_data.budgets where id='${b.budget_id}'`)).toBe("2");
});
it("T016: dos creaciones de la misma clave dejan una identidad",async()=>{
  const p=await fixtures.couple();
  const call=(account:typeof p.sara)=>({name:"create_budget",wait:{row:"groups" as const},run:()=>rpc(account.client,"create_budget",{p_idempotency_key:randomUUID(),p_context:"us",p_category_id:"restaurants",p_limit_minor:"26000000"})});
  const results=await raceUnderLock({row:"groups",id:p.groupId},call(p.sara),call(p.tomas));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  expect(results.find(r=>r.status==="rejected")).toMatchObject({reason:{code:"JT219"}});
  expect(runnerSql(`select count(*) from juntia_data.budgets where group_id='${p.groupId}'`)).toBe("1");
});
