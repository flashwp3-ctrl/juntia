import { randomUUID, createHash } from "node:crypto";
import { beforeAll, beforeEach, expect } from "vitest";
import { createTestUser } from "./users";
import { runnerSql } from "./sql";
import type { SupabaseClient } from "@supabase/supabase-js";
export type Account = Awaited<ReturnType<typeof createTestUser>>;
export async function rpc(client: SupabaseClient, name: string, args: Record<string, unknown>) {
  const { data, error } = await client.rpc(name,args);
  if (error) throw error;
  return data;
}
export const hash = () => createHash("sha256").update(randomUUID()).digest("hex");
async function newAccounts() {
  const [sara,tomas] = await Promise.all([createTestUser("Sara compartido"),createTestUser("Tomás compartido")]);
  await Promise.all([rpc(sara.client,"ensure_profile",{}),rpc(tomas.client,"ensure_profile",{})]);
  const email = (await tomas.client.auth.getUser()).data.user!.email!;
  return { sara,tomas,email };
}
async function activate(pair:Awaited<ReturnType<typeof newAccounts>>) {
  const tokenHash = hash();
  const invitation = await rpc(pair.sara.client,"create_invitation",{ p_idempotency_key:randomUUID(),p_email:pair.email,p_token_hash:tokenHash });
  const accepted = await rpc(pair.tomas.client,"accept_invitation",{p_idempotency_key:randomUUID(),p_token_hash:tokenHash});
  expect(accepted.status).toBe("active");
  return {...pair,groupId:invitation.group_id};
}
/** Sesiones por archivo; los casos reutilizan JWT y solo reinician sus datos sintéticos. */
export function setupCoupleFixtures(slots=1) {
  const pool:Awaited<ReturnType<typeof newAccounts>>[]=[];
  let next=0;
  beforeAll(async()=>{for(let i=0;i<slots;i++) pool.push(await newAccounts());});
  beforeEach(()=>{
    next=0;
    const ids=pool.flatMap(p=>[p.sara.id,p.tomas.id]);
    if(!ids.length || ids.some(id=>!/^[0-9a-f-]{36}$/.test(id))) throw new Error("Fixture sin identidades válidas");
    const actors=`array[${ids.map(id=>`'${id}'::uuid`).join(",")}]`;
    // Solo el SQL de preparación, en su conexión y transacción. No cambia triggers
    // ni políticas globales; las peticiones bajo prueba siguen con RLS y triggers.
    // Los usuarios/perfiles/sesiones persisten. Otros archivos tienen otros UUID.
    runnerSql(`begin; set local session_replication_role='replica';
      do $$ begin
        -- 004: limpiar primero los agregados nuevos del propio archivo. replica
        -- es solo preparación de fixtures; las RPC bajo prueba conservan triggers/RLS.
        if to_regclass('juntia_data.savings_goals') is not null then
          delete from juntia_data.goal_usage_allocations where entry_id in(select id from juntia_data.goal_ledger_entries where goal_id in(select id from juntia_data.savings_goals where created_by=any(${actors})));
          delete from juntia_data.goal_usage_confirmations where goal_id in(select id from juntia_data.savings_goals where created_by=any(${actors}));
          delete from juntia_data.goal_ledger_entries where goal_id in(select id from juntia_data.savings_goals where created_by=any(${actors}));
          delete from juntia_data.savings_goals where created_by=any(${actors});
          delete from juntia_data.budget_versions where budget_id in(select id from juntia_data.budgets where created_by=any(${actors}));
          delete from juntia_data.budgets where created_by=any(${actors});
        end if;
        if to_regclass('juntia_data.transaction_allocations') is not null then
          delete from juntia_data.transaction_allocations where transaction_id in(select id from juntia_data.transactions where created_by=any(${actors}));
        end if;
        if to_regclass('juntia_data.settlements') is not null then delete from juntia_data.settlements where group_id in(select id from juntia_data.groups where owner_user_id=any(${actors})); end if;
        delete from juntia_data.audit_events where actor_user_id=any(${actors});
        delete from juntia_data.idempotency_records where actor_user_id=any(${actors});
        delete from juntia_data.transactions where created_by=any(${actors});
        if to_regclass('juntia_data.group_invitations') is not null then delete from juntia_data.group_invitations where group_id in(select id from juntia_data.groups where owner_user_id=any(${actors})); end if;
        if to_regclass('juntia_data.group_members') is not null then delete from juntia_data.group_members where group_id in(select id from juntia_data.groups where owner_user_id=any(${actors})); end if;
        if to_regclass('juntia_data.groups') is not null then delete from juntia_data.groups where owner_user_id=any(${actors}); end if;
      end $$; commit;`);
  });
  const accounts=async()=>{
    const pair=pool[next++];
    if(!pair) throw new Error("El caso excede las parejas reservadas para su archivo");
    return pair;
  };
  return {accounts,couple:async()=>activate(await accounts())};
}
export function expense(pair: {sara:Account;tomas:Account}, patch: Record<string,unknown> = {}) {
  return { p_idempotency_key:randomUUID(),p_amount_minor:"10000",p_category_id:"transport",p_transaction_date:"2026-10-03",p_description:null,
    p_payer_user_id:pair.sara.id,p_split_mode:"equal",p_split_percents:null,p_parts:{[pair.sara.id]:"5000",[pair.tomas.id]:"5000"},...patch };
}
// Estado completo para comprobar que un perdedor no escribe ni una parte ni una auditoría.
export function snapshot(groupId: string) {
  return runnerSql(`select jsonb_build_object('group',(select to_jsonb(g) from juntia_data.groups g where id='${groupId}'),
    'members',(select jsonb_agg(m order by user_id) from juntia_data.group_members m where group_id='${groupId}'),
    'invites',(select jsonb_agg(i order by id) from juntia_data.group_invitations i where group_id='${groupId}'),
    'transactions',(select jsonb_agg(t order by id) from juntia_data.transactions t where group_id='${groupId}' or created_by in(select user_id from juntia_data.group_members where group_id='${groupId}')),
    'parts',(select jsonb_agg(a order by transaction_id,user_id) from juntia_data.transaction_allocations a join juntia_data.transactions t on t.id=a.transaction_id where t.group_id='${groupId}'),
    'settlements',(select jsonb_agg(s order by id) from juntia_data.settlements s where group_id='${groupId}'),
    'audit',(select jsonb_agg(e order by id) from juntia_data.audit_events e where entity_id='${groupId}' or actor_user_id in(select user_id from juntia_data.group_members where group_id='${groupId}')))::text`);
}
