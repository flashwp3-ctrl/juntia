// 003 T018a/T022 · FR-010b/057/064: dos sesiones reales y perdedores sin efectos.
import { expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { setupCoupleFixtures, rpc, expense, hash, snapshot } from "./support/couple";
import { runnerSql, spawnRunnerSql } from "./support/sql";
const {accounts,couple}=setupCoupleFixtures(2);

// Bloquear la raíz permite ordenar las dos peticiones sin depender de latencias.
async function ordered(groupId:string, first:()=>Promise<unknown>, second:()=>Promise<unknown>, firstName:string) {
  const gate=spawnRunnerSql();
  const ready=new Promise<void>((resolve,reject)=>{gate.stdout.on("data",c=>{if(String(c).includes("gate_ready")) resolve();});gate.on("error",reject);});
  const closed=new Promise<void>(resolve=>gate.on("close",()=>resolve()));
  let a:Promise<unknown>|undefined; let b:Promise<unknown>|undefined;
  try {
    gate.stdin.write(`begin; select id from juntia_data.groups where id='${groupId}' for update;\n\\echo gate_ready\n`);
    await ready; a=first(); void a.catch(()=>{});
    await vi.waitFor(()=>expect(Number(runnerSql(`select count(*) from pg_stat_activity where wait_event_type='Lock' and query like '%${firstName}%' and pid<>pg_backend_pid()`))).toBeGreaterThan(0),{timeout:10000});
    b=second(); void b.catch(()=>{});
    gate.stdin.end("commit;\n");
    return await Promise.allSettled([a,b]);
  } finally {if(gate.exitCode===null) gate.kill(); await closed; await Promise.allSettled([a,b].filter(Boolean));}
}
function oneWinner(results:PromiseSettledResult<unknown>[]) {
  if (!results.some(r=>r.status==="fulfilled")) {
    const rejected=results.find(r=>r.status==="rejected");
    if(rejected?.status==="rejected") throw rejected.reason;
  }
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  expect(results.filter(r=>r.status==="rejected")).toHaveLength(1);
}
it("dos aceptaciones, dos creaciones y las invitaciones cruzadas conservan una sola pareja",async()=>{
  const pair=await accounts(); const token=hash();
  const args={p_idempotency_key:randomUUID(),p_email:pair.email,p_token_hash:token};
  const created=await Promise.allSettled([rpc(pair.sara.client,"create_invitation",args),rpc(pair.sara.client,"create_invitation",{...args,p_idempotency_key:randomUUID(),p_token_hash:hash()})]);
  oneWinner(created);
  const invite=(created.find(r=>r.status==="fulfilled") as PromiseFulfilledResult<{group_id:string}>).value;
  const validHash=runnerSql(`select token_hash from juntia_data.group_invitations where group_id='${invite.group_id}' and status='pending'`);
  oneWinner(await Promise.allSettled([rpc(pair.tomas.client,"accept_invitation",{p_idempotency_key:randomUUID(),p_token_hash:validHash}),rpc(pair.tomas.client,"accept_invitation",{p_idempotency_key:randomUUID(),p_token_hash:validHash})]));
  const cross=await accounts(); const saraEmail=(await cross.sara.client.auth.getUser()).data.user!.email!;
  const both=await Promise.all([rpc(cross.sara.client,"create_invitation",{p_idempotency_key:randomUUID(),p_email:cross.email,p_token_hash:hash()}),rpc(cross.tomas.client,"create_invitation",{p_idempotency_key:randomUUID(),p_email:saraEmail,p_token_hash:hash()})]);
  for(const [actor,inv] of [[cross.tomas,both[0]],[cross.sara,both[1]]] as const) {
    const before=snapshot(inv.group_id); const tokenHash=runnerSql(`select token_hash from juntia_data.group_invitations where group_id='${inv.group_id}' and status='pending'`);
    await expect(rpc(actor.client,"accept_invitation",{p_idempotency_key:randomUUID(),p_token_hash:tokenHash})).rejects.toMatchObject({code:"JT101"}); expect(snapshot(inv.group_id)).toBe(before);
  }
});
for(const operation of ["cancel_invitation","regenerate_invitation"] as const) for(const acceptFirst of [true,false]) {
  it(`${operation} contra aceptar, primero ${acceptFirst?"aceptar":operation}`,async()=>{
    const pair=await accounts();const token=hash();const root=await rpc(pair.sara.client,"create_invitation",{p_idempotency_key:randomUUID(),p_email:pair.email,p_token_hash:token});
    const accept=()=>rpc(pair.tomas.client,"accept_invitation",{p_idempotency_key:randomUUID(),p_token_hash:token});
    const owner=()=>rpc(pair.sara.client,operation,{p_idempotency_key:randomUUID(),p_group_id:root.group_id,p_expected_version:1,...(operation==="regenerate_invitation"?{p_token_hash:hash()}:{})});
    oneWinner(await ordered(root.group_id,acceptFirst?accept:owner,acceptFirst?owner:accept,acceptFirst?"accept_invitation":operation));
    const before=snapshot(root.group_id);
    await expect((acceptFirst?owner:accept)()).rejects.toMatchObject({code:acceptFirst?"JT103":"JT104"});expect(snapshot(root.group_id)).toBe(before);
  });
}
it("regenerar contra regenerar conserva el enlace ganador y version +1",async()=>{
  const pair=await accounts();const root=await rpc(pair.sara.client,"create_invitation",{p_idempotency_key:randomUUID(),p_email:pair.email,p_token_hash:hash()});
  const run=()=>rpc(pair.sara.client,"regenerate_invitation",{p_idempotency_key:randomUUID(),p_group_id:root.group_id,p_expected_version:1,p_token_hash:hash()});
  oneWinner(await ordered(root.group_id,run,run,"regenerate_invitation"));
  const before=snapshot(root.group_id);await expect(run()).rejects.toMatchObject({code:"JT011"});expect(snapshot(root.group_id)).toBe(before);
});
it("dos liquidaciones del total tienen un ganador",async()=>{
  const p=await couple();await rpc(p.sara.client,"create_shared_expense",expense(p));
  const run=()=>rpc(p.tomas.client,"register_settlement",{p_idempotency_key:randomUUID(),p_amount_minor:"5000",p_settlement_date:"2026-10-03",p_note:null});
  oneWinner(await ordered(p.groupId,run,run,"register_settlement"));const before=snapshot(p.groupId);await expect(run()).rejects.toMatchObject({code:"JT106"});expect(snapshot(p.groupId)).toBe(before);
});
for(const operations of [["edit","edit"],["edit","delete"],["delete","edit"],["edit","undo"],["undo","edit"]] as const) {
  it(`${operations[0]} contra ${operations[1]} usa versión y no deja efectos del perdedor`,async()=>{
    const p=await couple(); const args=expense(p); const tx=await rpc(p.sara.client,"create_shared_expense",args);
    const run=(op:string)=>()=>op==="edit"?rpc(p.tomas.client,"update_shared_expense",{...args,p_idempotency_key:randomUUID(),p_transaction_id:tx.id,p_expected_version:1,p_description:"editado"}):rpc(p.sara.client,"void_shared_expense",{p_idempotency_key:randomUUID(),p_transaction_id:tx.id,p_expected_version:1,p_reason:op==="undo"?"undo":"delete"});
    oneWinner(await ordered(p.groupId,run(operations[0]),run(operations[1]),operations[0]==="edit"?"update_shared_expense":"void_shared_expense"));
    const before=snapshot(p.groupId);await expect(run(operations[1])()).rejects.toHaveProperty("code");expect(snapshot(p.groupId)).toBe(before);
  });
}
it("editar antes de liquidar recalcula el límite bajo el mismo bloqueo",async()=>{
  const p=await couple();const args=expense(p);const tx=await rpc(p.sara.client,"create_shared_expense",args);
  const results=await ordered(p.groupId,()=>rpc(p.sara.client,"update_shared_expense",{...args,p_idempotency_key:randomUUID(),p_transaction_id:tx.id,p_expected_version:1,p_amount_minor:"2000",p_parts:{[p.sara.id]:"1000",[p.tomas.id]:"1000"}}),()=>rpc(p.tomas.client,"register_settlement",{p_idempotency_key:randomUUID(),p_amount_minor:"5000",p_settlement_date:"2026-10-03",p_note:null}),"update_shared_expense");oneWinner(results);
});
it("Mover a Pareja contra editar privado y ningún estado con dos gastos activos",async()=>{
  const p=await couple();const tx=await rpc(p.sara.client,"create_transaction",{p_idempotency_key:randomUUID(),p_type:"expense",p_amount_minor:"10000",p_category_id:"transport",p_transaction_date:"2026-10-03",p_description:null});
  const move=()=>rpc(p.sara.client,"reclassify_to_shared",{p_idempotency_key:randomUUID(),p_transaction_id:tx.id,p_expected_version:1,p_split_mode:"equal",p_split_percents:null,p_parts:expense(p).p_parts});
  const edit=()=>rpc(p.sara.client,"update_transaction",{p_idempotency_key:randomUUID(),p_transaction_id:tx.id,p_expected_version:1,p_amount_minor:"20000",p_category_id:"transport",p_transaction_date:"2026-10-03",p_description:null});
  const pending=Promise.allSettled([move(),edit()]);
  for(let i=0;i<3;i++) expect(Number(runnerSql(`select count(*) from juntia_data.transactions where status='active' and (id='${tx.id}' or moved_from_transaction_id='${tx.id}')`))).toBe(1);
  const results=await pending;oneWinner(results);
  const before=snapshot(p.groupId);
  await expect((results[0].status==="rejected"?move:edit)()).rejects.toHaveProperty("code");
  expect(snapshot(p.groupId)).toBe(before);
  expect(Number(runnerSql(`select count(*) from juntia_data.transactions where status='active' and (id='${tx.id}' or moved_from_transaction_id='${tx.id}')`))).toBe(1);
});
