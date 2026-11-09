// 004 FR-060–063: «por contexto y mes ... una sola lectura consistente».
// T016: «9007199254740993 ... importes de ida y vuelta»; F64-3: «cada meta una sola vez».
import {expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {rpc,setupCoupleFixtures} from "./support/couple";
import {seedGoal} from "./support/planning";
import {runnerSql} from "./support/sql";
import {seedCouple} from "../support/seed";
const fixtures=setupCoupleFixtures();
it("T016: seis filas completas de DEC-G04 y columnas definidas de Tomás (precisión del gestor)",async()=>{
  const p=await seedCouple({index:31,golden:true});
  const month=async(client:typeof p.sara.client,context:string,value:string)=>{
    const r=await client.from("metric_months").select("*").eq("context",context).eq("month",value).single();
    expect(r.error).toBeNull();return r.data!;
  };
  expect(await month(p.sara.client,"us","2026-10-01")).toMatchObject({gasto_consumo:"284000000",aporte_a_metas:"90000000",retiro_de_metas:"0",gasto_financiado_con_meta:"0",total_destinado_neto:"374000000"});
  expect(await month(p.sara.client,"me","2026-10-01")).toMatchObject({gasto_consumo:"191290000",aporte_a_metas:"50000000",retiro_de_metas:"0",gasto_financiado_con_meta:"0",total_destinado_neto:"241290000"});
  // TESTING §6 / 003 F47-9: no inferir privados ausentes como cero.
  expect(await month(p.tomas.client,"me","2026-10-01")).toMatchObject({aporte_a_metas:"40000000",retiro_de_metas:"0",gasto_financiado_con_meta:"0"});
  const bicycle=await p.sara.client.from("goals_overview").select("id").eq("name","Bicicleta de ruta").single();expect(bicycle.error).toBeNull();
  await rpc(p.sara.client,"withdraw_from_goal",{p_idempotency_key:randomUUID(),p_goal_id:bicycle.data!.id,p_amount_minor:"20000000",p_entry_date:"2026-11-03",p_reason:"reasignar"});
  expect(await month(p.sara.client,"me","2026-11-01")).toMatchObject({gasto_consumo:"0",aporte_a_metas:"0",retiro_de_metas:"20000000",gasto_financiado_con_meta:"0",total_destinado_neto:"-20000000"});
  const tickets=await seedCouple({index:32,golden:true});
  const japan=await tickets.sara.client.from("goals_overview").select("id").eq("name","Japón").single();expect(japan.error).toBeNull();
  const created=await rpc(tickets.sara.client,"create_expense_with_goal",{p_idempotency_key:randomUUID(),p_context:"us",p_amount_minor:"300000000",p_category_id:"transport",p_transaction_date:"2026-11-03",p_description:"Tiquetes a Tokio",p_payer_user_id:tickets.tomas.id,p_split_mode:"equal",p_split_percents:null,p_parts:{[tickets.sara.id]:"150000000",[tickets.tomas.id]:"150000000"},p_goal_id:japan.data!.id,p_own_minor:"162000000",p_requested_minor:"138000000"});
  const req=await tickets.sara.client.from("usage_requests").select("id").eq("transaction_id",created.id).single();expect(req.error).toBeNull();
  const balanceBefore=await tickets.sara.client.from("couple_balance").select("*");
  await rpc(tickets.tomas.client,"approve_usage_request",{p_idempotency_key:randomUUID(),p_request_id:req.data!.id,p_expected_version:1});
  expect((await tickets.sara.client.from("couple_balance").select("*")).data).toEqual(balanceBefore.data);
  expect(await month(tickets.sara.client,"us","2026-11-01")).toMatchObject({gasto_consumo:"300000000",aporte_a_metas:"0",retiro_de_metas:"0",gasto_financiado_con_meta:"300000000",total_destinado_neto:"0"});
  expect(await month(tickets.sara.client,"me","2026-11-01")).toMatchObject({gasto_consumo:"150000000",aporte_a_metas:"0",retiro_de_metas:"0",gasto_financiado_con_meta:"162000000",total_destinado_neto:"-12000000"});
  expect(await month(tickets.tomas.client,"me","2026-11-01")).toMatchObject({gasto_consumo:"150000000",aporte_a_metas:"0",retiro_de_metas:"0",gasto_financiado_con_meta:"138000000",total_destinado_neto:"12000000"});
});
it("T016: metric_months aísla cifras privadas en ambos sentidos (precisión del gestor)",async()=>{
  const p=await fixtures.couple();
  const create=(account:typeof p.sara,amount:string)=>rpc(account.client,"create_transaction",{p_idempotency_key:randomUUID(),p_type:"expense",p_amount_minor:amount,p_category_id:"transport",p_transaction_date:"2026-08-01",p_description:null});
  await create(p.sara,"1234500");await create(p.tomas,"6789000");
  for(const [account,amount] of [[p.sara,"1234500"],[p.tomas,"6789000"]] as const){
    const mine=await account.client.from("metric_months").select("*").eq("context","me").eq("month","2026-08-01").single();
    expect(mine.error).toBeNull();expect(mine.data!.gasto_consumo).toBe(amount);
    const shared=await account.client.from("metric_months").select("*").eq("context","us").eq("month","2026-08-01");
    expect(shared.error).toBeNull();expect(shared.data).toEqual([]);
  }
});
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

// T016: comprobar dentro de cada sentencia, nunca comparar snapshots de dos peticiones distintas.
it("T016: budget_months y metric_months conservan sus identidades durante escrituras atómicas",async()=>{
 const p=await fixtures.couple(),goal=seedGoal(p);
 const {fundedArgs}=await import("./support/planning");
 await rpc(p.sara.client,"create_budget",{p_idempotency_key:randomUUID(),p_context:"us",p_category_id:"transport",p_limit_minor:"100000"});
 for(let i=0;i<5;i++){
  const write=rpc(p.sara.client,"create_expense_with_goal",fundedArgs(p,goal.id,{p_requested_minor:"0"}));
  const [budgets,metrics]=await Promise.all([p.sara.client.from("budget_months").select("*").eq("context","us").eq("month","2026-11-01"),p.sara.client.from("metric_months").select("*").eq("context","us").eq("month","2026-11-01")]);
  expect(budgets.error).toBeNull();expect(metrics.error).toBeNull();
  for(const b of budgets.data!){if(b.limit_minor!==null){const consumed=BigInt(b.consumed_minor),limit=BigInt(b.limit_minor);expect(BigInt(b.remaining_minor)).toBe(limit-consumed);expect(b.state).toBe(consumed>limit?"over":consumed*100n>=limit*85n?"near":"within");}}
  for(const m of metrics.data!){expect(BigInt(m.gasto_consumo)*10000n).toBe(BigInt(m.gasto_financiado_con_meta)*30000n);expect(BigInt(m.total_destinado_neto)).toBe(BigInt(m.gasto_consumo)+BigInt(m.aporte_a_metas)-BigInt(m.retiro_de_metas)-BigInt(m.gasto_financiado_con_meta));}
  await write;
 }
});
