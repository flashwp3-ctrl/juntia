// T026b: carga con rol postgres alojado, reglas activas y rollback del fixture.
import {expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {orderRestoreData} from "../../scripts/order-restore-data.mjs";
import {runnerSql} from "./support/sql";
import {isDevTarget} from "../support/dev-target";
const owner='99999999-1111-4111-8111-111111111111',member='99999999-2222-4222-8222-222222222222',group='99999999-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const privateId='99999999-bbbb-4bbb-8bbb-bbbbbbbbbbbb',sharedId='99999999-cccc-4ccc-8ccc-cccccccccccc';
const provisionalOwner='99999999-3333-4333-8333-333333333333',discardedOwner='99999999-4444-4444-8444-444444444444';
const provisional='99999999-dddd-4ddd-8ddd-dddddddddddd',discarded='99999999-eeee-4eee-8eee-eeeeeeeeeeee';
const setup=`select tests.create_user('${owner}','restore-owner@seed.test');select tests.create_user('${member}','restore-member@seed.test');select tests.create_user('${provisionalOwner}','restore-provisional@seed.test');select tests.create_user('${discardedOwner}','restore-discarded@seed.test');`;
const otherStates=`
INSERT INTO juntia_data.group_members (group_id,user_id,role,status,join_order,released_at) VALUES ('${discarded}','${discardedOwner}','owner','released',1,now());
INSERT INTO juntia_data.groups (id,owner_user_id,status,discarded_at) VALUES ('${discarded}','${discardedOwner}','discarded',now());
INSERT INTO juntia_data.group_members (group_id,user_id,role,status,join_order) VALUES ('${provisional}','${provisionalOwner}','owner','active',1);
INSERT INTO juntia_data.group_invitations (group_id,email,token_hash,status,created_by,inviter_display_name) VALUES ('${provisional}','future@seed.test',repeat('d',64),'pending','${provisionalOwner}','Sara');
INSERT INTO juntia_data.groups (id,owner_user_id,status) VALUES ('${provisional}','${provisionalOwner}','provisional');`;
function dump(active=true) {
  return [
    ...(active?[
      `INSERT INTO juntia_data.transaction_allocations (transaction_id,user_id,amount_minor) VALUES ('${sharedId}','${owner}',5000);`,
      `INSERT INTO juntia_data.transaction_allocations (transaction_id,user_id,amount_minor) VALUES ('${sharedId}','${member}',5000);`,
      `INSERT INTO juntia_data.transactions (id,type,created_by,group_id,payer_user_id,amount_minor,category_id,transaction_date,split_mode,moved_from_transaction_id,description) VALUES ('${sharedId}','expense','${owner}','${group}','${owner}',10000,'transport','2026-10-03','equal','${privateId}',E'Tomás pagó · comilla '' ;\n-- Name: un valor');`,
      `INSERT INTO juntia_data.transactions (id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date,status,voided_at,voided_by,moved_to_transaction_id) VALUES ('${privateId}','expense','${owner}','${owner}',10000,'transport','2026-10-03','voided',now(),'${owner}','${sharedId}');`
    ]:[]),
    `INSERT INTO juntia_data.group_members (group_id,user_id,role,status,join_order) VALUES ('${group}','${member}','member','active',2);`,
    `INSERT INTO juntia_data.group_invitations (group_id,email,token_hash,status,created_by,inviter_display_name,accepted_by,accepted_at) VALUES ('${group}','restore-member@seed.test',repeat('9',64),'${active?'accepted':'pending'}','${owner}','Sara',${active?`'${member}'`:'NULL'},${active?'now()':'NULL'});`,
    `INSERT INTO juntia_data.groups (id,owner_user_id,status,activated_at) VALUES ('${group}','${owner}','${active?'active':'provisional'}',${active?'now()':'NULL'});`,
    `INSERT INTO juntia_data.group_members (group_id,user_id,role,status,join_order) VALUES ('${group}','${owner}','owner','active',1);`
  ].join('\n');
}
it("carga el ciclo con membresías 1→2, sin saltarse reglas ni ser superusuario en dev",()=>{
  const validation=readFileSync('supabase/restore/check-invariants.sql','utf8');
  if(isDevTarget()) expect(runnerSql("select rolsuper from pg_roles where rolname=current_user")).toBe('f');
  expect(runnerSql(`begin;${setup}${orderRestoreData(dump()+otherStates)}${validation}set constraints all immediate;select count(*) from juntia_data.transactions where id in('${privateId}','${sharedId}');rollback;`)).toMatch(/2$/);
});
for(const corruption of ['parts','orphan','members'] as const) it(`rechaza ${corruption} aunque las FK y los CHECK de fila se satisfagan`,()=>{
  const validation=readFileSync('supabase/restore/check-invariants.sql','utf8');
  let sql=dump()+otherStates;
  if(corruption==='parts') sql=sql.replace(`INSERT INTO juntia_data.transaction_allocations (transaction_id,user_id,amount_minor) VALUES ('${sharedId}','${member}',5000);`,'');
  if(corruption==='orphan') sql=sql.replace(`now(),'${owner}','${sharedId}');`,`now(),'${owner}',NULL);`);
  if(corruption==='members') for(const user of [owner,member]) sql+=`INSERT INTO juntia_data.group_members (group_id,user_id,role,status,join_order,released_at) VALUES ('${discarded}','${user}','member','released',2,now());`;
  expect(()=>runnerSql(`begin;${setup}${orderRestoreData(sql)}${validation}commit;`)).toThrow(/RESTORE_INVARIANTS/);
  expect(runnerSql(`select count(*) from juntia_data.groups where id='${group}'`)).toBe('0');
});
it("rechaza explícitamente una pareja con invariante rota antes de confirmar",()=>{
  const validation=readFileSync('supabase/restore/check-invariants.sql','utf8');
  expect(()=>runnerSql(`begin;${setup}${orderRestoreData(dump(false))}${validation}commit;`)).toThrow(/RESTORE_INVARIANTS/);
  expect(runnerSql(`select count(*) from juntia_data.groups where id='${group}'`)).toBe('0');
});
