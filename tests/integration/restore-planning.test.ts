// Restauración sintética en una transacción, con postgres dueño alojado (no superusuario).
import {randomUUID} from "node:crypto";
import {expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {orderRestoreData} from "../../scripts/order-restore-data.mjs";
import {planningRestoreFixture,planningDump,planningCorruptions,corruptPlanningFixture} from "../support/restore-planning.mjs";
import {runnerSql} from "./support/sql";
import {isDevTarget} from "../support/dev-target";
const owner="88888888-1111-4111-8111-111111111111",member="88888888-2222-4222-8222-222222222222",group="88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const setup=()=>`select tests.create_user('${owner}','restore-planning-owner@seed.test');select tests.create_user('${member}','restore-planning-member@seed.test');select tests.seed_couple('${group}','${owner}','${member}');`;
const validation=()=>readFileSync("supabase/restore/check-invariants.sql","utf8");

// Solo coordinación de fixtures: no reintenta la prueba ni una restauración fallida.
// NOWAIT evita retener un bloqueo parcial mientras otra spec prueba sus carreras.
const locks=`do $fixture_locks$ declare deadline timestamptz:=clock_timestamp()+interval '15 seconds';begin loop begin
 lock table juntia_data.goal_usage_confirmations,juntia_data.goal_ledger_entries,juntia_data.goal_usage_allocations in access exclusive mode nowait;exit;
 exception when lock_not_available then if clock_timestamp()>=deadline then raise;end if;perform pg_sleep(0.02);end;end loop;end $fixture_locks$;`;
function load(f:ReturnType<typeof planningRestoreFixture>){
 // Una ida/vuelta a dev: el mismo SQL y las mismas comprobaciones, sin mantener
 // DDL global entre docenas de viajes de psql por la red mientras corren las RPC.
 const sql=setup()+`select tests.create_user('${f.outsider}','restore-outsider-${f.outsider}@seed.test');`+orderRestoreData(planningDump(f))+validation();
 return "do $restore_load$ begin execute '"+sql.replaceAll("'","''")+"';end $restore_load$;";
}

const flags=`select json_build_object('disabled',(select count(*) from pg_trigger where tgrelid in('juntia_data.goal_ledger_entries'::regclass,'juntia_data.goal_usage_allocations'::regclass,'juntia_data.goal_usage_confirmations'::regclass) and tgenabled<>'O'),'deferred',(select condeferrable from pg_constraint where conrelid='juntia_data.goal_ledger_entries'::regclass and conname='goal_ledger_entries_confirmation_id_fkey'));`;
it.each([false,true])("004: snapshot histórico, ciclo, voids y archivada de nuevo=%s; postgres alojado restablece todo",(archivedAgain)=>{
 if(isDevTarget())expect(runnerSql("select current_user||':'||rolsuper::text from pg_roles where rolname=current_user")).toBe("postgres:false");
 const f=planningRestoreFixture({owner,member,group});
 if(archivedAgain){
  Object.assign(f.rows.find((r:{key:string})=>r.key==='reactivated')!.values,{status:'archived',archived_at:'2026-10-08T12:00:00Z'});
  f.rows.push({key:'later-withdrawal',table:'juntia_data.goal_ledger_entries',values:{id:randomUUID(),goal_id:f.ids.reactivated,kind:'withdrawal',amount_minor:10000,member_user_id:owner,created_by:owner,entry_date:'2026-10-07',reason:'reasignar',created_at:'2026-10-07T12:00:00Z'}});
  f.rows.push({key:'later-archive',table:'juntia_data.audit_events',values:{id:randomUUID(),actor_user_id:owner,entity_type:'goal',entity_id:f.ids.reactivated,action:'archive',after:JSON.stringify({status:'archived',archived_at:'2026-10-08T12:00:00Z'}),occurred_at:'2026-10-08T12:00:00Z'}});
 }
 const result=runnerSql(`\\set VERBOSITY terse\nbegin;${locks}${load(f)}set constraints all immediate;${flags}select status from juntia_data.savings_goals where id='${f.ids.reactivated}';select count(*) from juntia_data.audit_events where entity_id='${f.ids.reactivated}';rollback;`);
 const lines=result.split(/\r?\n/);expect(JSON.parse(lines.at(-3)!)).toEqual({disabled:0,deferred:false});expect(lines.at(-2)).toBe(archivedAgain?"archived":"active");expect(lines.at(-1)).toBe(archivedAgain?"3":"2");
 expect(runnerSql(`select count(*) from juntia_data.savings_goals where id='${f.ids.goal}'`)).toBe("0");
});
for(const [kind,marker] of Object.entries(planningCorruptions))it(`004: rechaza respaldo ${kind}, rollback conserva datos y protocolo`,()=>{
 const f=corruptPlanningFixture(planningRestoreFixture({owner,member,group}),kind);
 expect(()=>runnerSql(`\\set VERBOSITY terse\nbegin;${locks}${load(f)}set constraints all immediate;commit;`)).toThrow(marker?new RegExp('RESTORE_INVARIANTS: '+marker):new RegExp(kind==='duplicate-budget'?'unique constraint':kind==='allocation-nonusage'||kind==='income-category'?'foreign key constraint':'check constraint'));
 expect(JSON.parse(runnerSql(flags))).toEqual({disabled:0,deferred:false});
 expect(runnerSql(`select count(*) from juntia_data.savings_goals where id='${f.ids.goal}'`)).toBe("0");
});
it("004: manifiesto descubre las seis tablas y calcula count/huella con PK completa",()=>{
 const script=readFileSync("scripts/backup-manifest.sh","utf8");
 const query=script.slice(script.indexOf("select format('select %L"),script.indexOf("\\gexec")+7);
 const result=runnerSql("begin isolation level repeatable read read only;"+query+"\nrollback;");
 for(const table of ["budgets","budget_versions","savings_goals","goal_ledger_entries","goal_usage_allocations","goal_usage_confirmations"]){expect(result).toMatch(new RegExp('table=juntia_data\\.'+table+'\\|[0-9]+\\|[0-9a-f]{32}'));}
});
