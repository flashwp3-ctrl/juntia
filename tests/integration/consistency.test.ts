// 003 T018a/T024 · una sentencia, dataset real y cursor estable con mutaciones.
import { expect,it } from "vitest";
import { randomUUID } from "node:crypto";
import { setupCoupleFixtures,rpc,expense } from "./support/couple";
import { sharedOctober2026 } from "../../src/domain/golden/october-2026";
import { computeBalance } from "../../src/domain/balances";
import { serializeAmountMinor } from "../../src/domain/money";
const {couple}=setupCoupleFixtures();
it("dataset dorado por funciones: 284000000, ±42990000 → ±22990000 y computeBalance",async()=>{
  const p=await couple();const ids={sara:p.sara.id,tomas:p.tomas.id};
  const {listSharedExpenses}=await import("../../src/lib/db/shared-expenses");
  const {listSettlements}=await import("../../src/lib/db/settlements");
  for(const row of sharedOctober2026) await rpc(p.sara.client,"create_shared_expense",expense(p,{p_amount_minor:serializeAmountMinor(row.amount),p_category_id:row.categoryId,p_transaction_date:row.transactionDate,p_description:row.description,p_payer_user_id:ids[row.payerUserId as keyof typeof ids],p_split_mode:row.splitMode,p_split_percents:row.splitPercents,p_parts:Object.fromEntries(row.allocations.map(a=>[ids[a.userId as keyof typeof ids],serializeAmountMinor(a.amount)]))}));
  const total=await p.sara.client.from("couple_month_summary").select("*").eq("month","2026-10-01").single();expect(total.error).toBeNull();expect(total.data.total_minor).toBe("284000000");
  const check=async(expected:string)=>{
    const balance=await p.sara.client.from("couple_balance").select("*");expect(balance.error).toBeNull();expect(balance.data!.find(r=>r.user_id===p.sara.id).net_minor).toBe(expected);
    const calculated=computeBalance(await listSharedExpenses(p.sara.client),await listSettlements(p.sara.client),[{userId:p.sara.id,joinOrder:1},{userId:p.tomas.id,joinOrder:2}]);
    for(const row of calculated) expect(balance.data!.find(r=>r.user_id===row.userId).net_minor).toBe(serializeAmountMinor(row.net));
  };
  await check("42990000");
  await rpc(p.tomas.client,"register_settlement",{p_idempotency_key:randomUUID(),p_amount_minor:"20000000",p_settlement_date:"2026-10-25",p_note:null});
  await check("22990000");
  expect((await p.sara.client.from("couple_month_summary").select("total_minor").eq("month","2026-10-01").single()).data?.total_minor).toBe("284000000");
});
it("cursor: filas persistentes una vez entre inserciones y anulaciones",async()=>{
  const p=await couple();const original:{id:string;version:number}[]=[];
  const {listSharedExpenses}=await import("../../src/lib/db/shared-expenses");
  for(let i=0;i<7;i++) original.push(await rpc(p.sara.client,"create_shared_expense",expense(p,{p_transaction_date:`2026-10-${String(i+1).padStart(2,"0")}`})));
  let changed=false;
  const rows=await listSharedExpenses(p.sara.client,undefined,{pageSize:2,onPage:async()=>{
    if(changed) return;changed=true;
    await rpc(p.sara.client,"create_shared_expense",expense(p,{p_transaction_date:"2026-10-20"}));
    await rpc(p.sara.client,"void_shared_expense",{p_idempotency_key:randomUUID(),p_transaction_id:original[1].id,p_expected_version:1,p_reason:"delete"});
  }});
  expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
  for(const row of original.filter((_,i)=>i!==1)) expect(rows.filter(r=>r.id===row.id)).toHaveLength(1);
});
it("resúmenes no mezclan dos estados durante inserciones concurrentes",async()=>{
  const p=await couple();
  for(let i=0;i<5;i++) {
    const write=rpc(p.sara.client,"create_shared_expense",expense(p));
    const [coupleSummary,me,balance]=await Promise.all([p.sara.client.from("couple_month_summary").select("*"),p.sara.client.from("me_month_summary").select("*"),p.sara.client.from("couple_balance").select("*")]);
    for(const result of [coupleSummary,me,balance]) expect(result.error).toBeNull();
    if(coupleSummary.data!.length) {const row=coupleSummary.data![0];expect(BigInt(row.total_minor)).toBe(BigInt(row.count)*10000n);expect(Object.values(row.by_category).reduce<bigint>((a,b)=>a+BigInt(b as string),0n)).toBe(BigInt(row.total_minor));}
    if(me.data!.length) {const row=me.data![0];expect(BigInt(row.consumption_minor)).toBe(BigInt(row.private_minor)+BigInt(row.shared_part_minor));}
    expect(balance.data!.reduce((a,r)=>a+BigInt(r.net_minor),0n)).toBe(0n);
    for(const row of balance.data!) expect(BigInt(row.net_minor)).toBe(BigInt(row.paid_minor)-BigInt(row.share_minor)+BigInt(row.settled_out_minor)-BigInt(row.settled_in_minor));
    await write;
  }
});
