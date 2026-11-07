// 004 FR-060–063: «por contexto y mes ... una sola lectura consistente».
// T016: «9007199254740993 ... importes de ida y vuelta»; F64-3: «cada meta una sola vez».
import {expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {rpc,setupCoupleFixtures} from "./support/couple";
import {seedGoal} from "./support/planning";
import {runnerSql} from "./support/sql";
const fixtures=setupCoupleFixtures();
it("T016: metas completas en Yo, separadas por scope y privadas invisibles al otro",async()=>{
  const p=await fixtures.couple(),shared=seedGoal(p),personal=seedGoal(p,true);
  const mine=await p.sara.client.from("goals_overview").select("*");expect(mine.error).toBeNull();
  expect(new Set(mine.data!.map(g=>g.id))).toEqual(new Set([shared.id,personal.id]));
  const other=await p.tomas.client.from("goals_overview").select("*");expect(other.data!.map(g=>g.id)).toEqual([shared.id]);
  const totals=await p.sara.client.from("goals_totals").select("*");
  expect(totals.data!.find(g=>g.goal_scope==="personal")).toMatchObject({balance_minor:"10000000",my_available_minor:"10000000"});
  expect(totals.data!.find(g=>g.goal_scope==="shared")).toMatchObject({balance_minor:"20000000",my_available_minor:"10000000"});
});
it("T016: métricas nuevas conservan 2^53+1 como texto",async()=>{
  const p=await fixtures.couple(),id=randomUUID();
  runnerSql(`insert into juntia_data.transactions(id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date) values('${id}','expense','${p.sara.id}','${p.sara.id}',9007199254740993,'transport','2026-09-01');`);
  const row=await p.sara.client.from("metric_months").select("*").eq("context","me").eq("month","2026-09-01").single();
  expect(row.error).toBeNull();expect(row.data!.gasto_consumo).toBe("9007199254740993");expect(row.data!.total_destinado_neto).toBe("9007199254740993");
});
it("T016: aportes no alteran gasto y una escritura perdida se consulta sin repetirla",async()=>{
  const p=await fixtures.couple(),g=seedGoal(p);const key=randomUUID();
  const args={p_idempotency_key:key,p_goal_id:g.id,p_amount_minor:"50000000",p_entry_date:"2026-10-22",p_funding_mode:"reserved"};
  const saved=await rpc(p.sara.client,"contribute_to_goal",args);
  expect(await rpc(p.sara.client,"write_status",{p_action:"contribute_to_goal",p_idempotency_key:key})).toMatchObject({state:"completed",result:saved});
  const row=await p.sara.client.from("metric_months").select("*").eq("context","us").eq("month","2026-10-01").single();
  expect(row.error).toBeNull();expect(row.data).toMatchObject({gasto_consumo:"0",aporte_a_metas:"70000000",gasto_financiado_con_meta:"0",total_destinado_neto:"70000000"});
});
