// 003 T018a/T023 · repetición, respuesta perdida, aislamiento y precisión.
import { expect,it } from "vitest";
import { randomUUID } from "node:crypto";
import { setupCoupleFixtures,rpc,expense,hash,snapshot } from "./support/couple";
import { runnerSql } from "./support/sql";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { moneyFromPesos } from "../../src/domain/money";
import type { Account } from "./support/couple";
const {accounts,couple}=setupCoupleFixtures(2);

async function writeStatus(client:SupabaseClient,action:string,key:string) {
  return (await import("../../src/lib/db/write-status")).writeStatus(client,action,key);
}

async function replay(actor:Account,other:Account,action:string,args:Record<string,unknown>,groupId?:string) {
  const [a,b]=await Promise.all([rpc(actor.client,action,args),rpc(actor.client,action,args)]);
  expect(b).toEqual(a); // La primera respuesta se pierde; comprobar no vuelve a escribir.
  const before=groupId?snapshot(groupId):null;
  for(let i=0;i<2;i++) expect(await writeStatus(actor.client,action,args.p_idempotency_key as string)).toEqual({state:"completed",result:a});
  expect(await writeStatus(other.client,action,args.p_idempotency_key as string)).toEqual({state:"not_found"});
  expect(await rpc(actor.client,action,args)).toEqual(a);
  if(groupId) expect(snapshot(groupId)).toBe(before);
  expect(runnerSql(`select count(*) from juntia_data.idempotency_records where actor_user_id='${actor.id}' and action='${action}' and idempotency_key='${args.p_idempotency_key}' and status='completed'`)).toBe("1");
  return a;
}
it("FR-012a: crear/regenerar/aceptar/anular recuperan el mismo resultado y enlace",async()=>{
  const p=await accounts();const token=randomUUID();const {hashInvitationToken}=await import("../../src/lib/db/invitation-token");const tokenHash=await hashInvitationToken(token);
  expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);expect(tokenHash).not.toContain(token);
  const created=await replay(p.sara,p.tomas,"create_invitation",{p_idempotency_key:randomUUID(),p_email:p.email,p_token_hash:tokenHash});
  const nextToken=randomUUID();const nextHash=await hashInvitationToken(nextToken);
  const regenerated=await replay(p.sara,p.tomas,"regenerate_invitation",{p_idempotency_key:randomUUID(),p_group_id:created.group_id,p_expected_version:1,p_token_hash:nextHash},created.group_id);
  expect(regenerated.version).toBe(2);
  await replay(p.tomas,p.sara,"accept_invitation",{p_idempotency_key:randomUUID(),p_token_hash:nextHash},created.group_id);
  const q=await accounts();const invite=await rpc(q.sara.client,"create_invitation",{p_idempotency_key:randomUUID(),p_email:q.email,p_token_hash:hash()});
  await replay(q.sara,q.tomas,"cancel_invitation",{p_idempotency_key:randomUUID(),p_group_id:invite.group_id,p_expected_version:1},invite.group_id);
});
it("cada escritura de dinero: doble envío, estado sin repetir y reintento idéntico",async()=>{
  const p=await couple(); const args=expense(p);
  const tx=await replay(p.sara,p.tomas,"create_shared_expense",args,p.groupId);
  const edited=await replay(p.tomas,p.sara,"update_shared_expense",{...args,p_idempotency_key:randomUUID(),p_transaction_id:tx.id,p_expected_version:1,p_description:"actualizado"},p.groupId);
  const settled=await replay(p.tomas,p.sara,"register_settlement",{p_idempotency_key:randomUUID(),p_amount_minor:"1000",p_settlement_date:"2026-10-03",p_note:"parcial"},p.groupId);
  await replay(p.sara,p.tomas,"void_settlement",{p_idempotency_key:randomUUID(),p_settlement_id:settled.id,p_expected_version:1,p_reason:"void"},p.groupId);
  await replay(p.sara,p.tomas,"void_shared_expense",{p_idempotency_key:randomUUID(),p_transaction_id:tx.id,p_expected_version:edited.version,p_reason:"delete"},p.groupId);
  const privateTx=await rpc(p.sara.client,"create_transaction",{p_idempotency_key:randomUUID(),p_type:"expense",p_amount_minor:"10000",p_category_id:"transport",p_transaction_date:"2026-10-03",p_description:null});
  const moved=await replay(p.sara,p.tomas,"reclassify_to_shared",{p_idempotency_key:randomUUID(),p_transaction_id:privateTx.id,p_expected_version:1,p_split_mode:"equal",p_split_percents:null,p_parts:args.p_parts},p.groupId);
  await replay(p.sara,p.tomas,"undo_reclassify_to_shared",{p_idempotency_key:randomUUID(),p_shared_transaction_id:moved.shared.id,p_expected_version:1},p.groupId);
});
it("F49-1/2: perfiles propios y RPC 002 sobre compartidos sin ningún efecto",async()=>{
  const p=await couple();const tx=await rpc(p.sara.client,"create_shared_expense",expense(p));const before=snapshot(p.groupId);
  for(const actor of [p.sara,p.tomas]) {
    const profile=await actor.client.from("my_profile").select("*");expect(profile.error).toBeNull();expect(profile.data).toHaveLength(1);
    const members=await actor.client.from("couple_members").select("*");expect(members.error).toBeNull();expect(members.data).toHaveLength(2);
    expect(Object.keys(members.data![0]).sort()).toEqual(["display_name","join_order","role","user_id"]);
    for(const name of ["update_transaction","void_transaction"]) {
      await expect(rpc(actor.client,name,{p_idempotency_key:randomUUID(),p_transaction_id:tx.id,p_expected_version:1,...(name==="void_transaction"?{p_reason:"delete"}:{p_amount_minor:"10000",p_category_id:"transport",p_transaction_date:"2026-10-03",p_description:null})})).rejects.toMatchObject({code:"JT010"});
      expect(snapshot(p.groupId)).toBe(before);
    }
  }
});
it("9007199254740993 vuelve como texto sin perder precisión y ningún transporte usa number",async()=>{
  const p=await couple();const id=randomUUID();
  // Fila histórica sintética como V6 de la 002: las funciones conservan su tope COP.
  runnerSql(`insert into juntia_data.transactions(id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date) values('${id}','expense','${p.sara.id}','${p.sara.id}',9007199254740993,'transport','2026-09-01');`);
  const row=await p.sara.client.from("my_transactions").select("amount_minor").eq("id",id).single();expect(row.error).toBeNull();expect(row.data!.amount_minor).toBe("9007199254740993");
  const generated=readFileSync("src/lib/supabase/database.types.ts","utf8");
  expect(generated).not.toMatch(/\b(?:amount_minor|my_part_minor|net_minor|paid_minor|share_minor|settled_out_minor|settled_in_minor|total_minor|private_minor|shared_part_minor|consumption_minor|p_amount_minor): number\b/);
});
it("T021: la capa de datos autentica, traduce dinero y recorre todas las escrituras",async()=>{
  const p=await accounts();const tokenHash=hash();
  const {createInvitation,regenerateInvitation,cancelInvitation,previewInvitation,acceptInvitation}=await import("../../src/lib/db/couple");
  const {createSharedExpense,updateSharedExpense,voidSharedExpense}=await import("../../src/lib/db/shared-expenses");
  const {registerSettlement,voidSettlement}=await import("../../src/lib/db/settlements");
  const {reclassifyToShared,undoReclassifyToShared}=await import("../../src/lib/db/reclassify");
  const root=await createInvitation(p.sara.client,{idempotencyKey:randomUUID(),email:p.email,tokenHash});
  const nextHash=hash();await regenerateInvitation(p.sara.client,{idempotencyKey:randomUUID(),groupId:root.group_id,expectedVersion:1,tokenHash:nextHash});
  expect((await previewInvitation(p.tomas.client,nextHash)).inviter_display_name).toBe("Sara compartido");
  await acceptInvitation(p.tomas.client,{idempotencyKey:randomUUID(),tokenHash:nextHash});
  const draft={idempotencyKey:randomUUID(),amount:moneyFromPesos(100n),categoryId:"transport" as const,transactionDate:"2026-10-03",description:null,payerUserId:p.sara.id,splitMode:"equal" as const,splitPercents:null,allocations:[{userId:p.sara.id,amount:moneyFromPesos(50n)},{userId:p.tomas.id,amount:moneyFromPesos(50n)}]};
  const tx=await createSharedExpense(p.sara.client,draft);expect(tx.amount.amountMinor).toBe(10000n);
  const edited=await updateSharedExpense(p.tomas.client,{...draft,idempotencyKey:randomUUID(),transactionId:tx.id,expectedVersion:1,description:"editado"});
  const settled=await registerSettlement(p.tomas.client,{idempotencyKey:randomUUID(),amount:moneyFromPesos(10n),settlementDate:"2026-10-03",note:null});expect(settled.amount.amountMinor).toBe(1000n);
  await voidSettlement(p.sara.client,{idempotencyKey:randomUUID(),settlementId:settled.id,expectedVersion:1,reason:"void"});
  await voidSharedExpense(p.sara.client,{idempotencyKey:randomUUID(),transactionId:tx.id,expectedVersion:edited.version,reason:"delete"});
  const own=await rpc(p.sara.client,"create_transaction",{p_idempotency_key:randomUUID(),p_type:"expense",p_amount_minor:"10000",p_category_id:"transport",p_transaction_date:"2026-10-03",p_description:null});
  const moved=await reclassifyToShared(p.sara.client,{idempotencyKey:randomUUID(),transactionId:own.id,expectedVersion:1,splitMode:"equal",splitPercents:null,allocations:draft.allocations});
  await undoReclassifyToShared(p.sara.client,{idempotencyKey:randomUUID(),sharedTransactionId:moved.shared.id,expectedVersion:1});
  const q=await accounts();const provisional=await createInvitation(q.sara.client,{idempotencyKey:randomUUID(),email:q.email,tokenHash:hash()});
  expect((await cancelInvitation(q.sara.client,{idempotencyKey:randomUUID(),groupId:provisional.group_id,expectedVersion:1})).status).toBe("discarded");
});
