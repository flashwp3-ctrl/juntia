// F52-2 · FR-064: no liberar hasta observar AMBOS contendientes y su bloqueo.
import {expect,vi} from "vitest";
import {runnerSql,spawnRunnerSql} from "./sql";
type Row="groups"|"transactions";
type Wait={row:Row}|{person:string};
type Root={row:Row;id:string}|{people:readonly string[]};
export type Contender={name:string;run:()=>Promise<unknown>;wait:Wait};
type Observed={pid:number;calls:string[];event:string;rowLocks:string[];people:string[]};
const uuid=(id:string)=>{if(!/^[0-9a-f-]{36}$/.test(id))throw new Error("UUID inválido en barrera");return id;};
function blocked(gatePid:number,calls:readonly Contender[]):Observed[] {
  const names=[...new Set(calls.map(c=>c.name))];
  if(names.some(n=>!/^\w+$/.test(n)))throw new Error("RPC inválida en barrera");
  const people=calls.flatMap(c=>"person" in c.wait?[uuid(c.wait.person)]:[]);
  // pg_blocking_pids incluye al dueño y al anterior en la cola: seguimos la
  // cadena hasta NUESTRO PID de barrera, nunca un count global por nombre RPC.
  return JSON.parse(runnerSql(`with recursive activity as materialized (
    select pid,query,wait_event,pg_blocking_pids(pid) blockers from pg_stat_activity
    where wait_event_type='Lock' and pid<>pg_backend_pid()
  ), chain as (
    select pid,array[${gatePid},pid] path from activity where ${gatePid}=any(blockers)
    union all select a.pid,c.path||a.pid from activity a join chain c on c.pid=any(a.blockers) where not a.pid=any(c.path)
  ) select coalesce(jsonb_agg(jsonb_build_object('pid',a.pid,'event',a.wait_event,
    'calls',array(select n from unnest(array[${names.map(n=>`'${n}'`).join(',')}]) n where a.query like '%'||n||'%'),
    'rowLocks',array(select distinct l.relation::regclass::text from pg_locks l where l.pid=a.pid and l.granted and l.relation in('juntia_data.groups'::regclass,'juntia_data.transactions'::regclass)),
    'people',array(select person from unnest(array[${people.map(id=>`'${id}'`).join(',')}]::text[]) person where exists(
      select 1 from pg_locks l where l.pid=a.pid and not l.granted and l.locktype='advisory' and l.objsubid=1
      and l.classid::bigint=((hashtextextended(person,0)>>32)&4294967295) and l.objid::bigint=(hashtextextended(person,0)&4294967295)
    )))), '[]'::jsonb) from activity a where a.pid in(select pid from chain);\n\\q\n`,5000));
}
function verify(row:Observed,call:Contender) {
  expect(row.calls).toContain(call.name);
  if("person" in call.wait){expect(row.event).toBe("advisory");expect(row.people).toContain(call.wait.person);}
  else {expect(["transactionid","tuple"]).toContain(row.event);expect(row.rowLocks).toContain(`juntia_data.${call.wait.row}`);}
}
export async function raceUnderLock(root:Root,first:Contender,second:Contender,during?:()=>void) {
  const gate=spawnRunnerSql();let buffer="";
  const ready=new Promise<number>((resolve,reject)=>{
    gate.stdout.on("data",c=>{buffer+=String(c);const m=buffer.match(/race_gate:(\d+)/);if(m)resolve(Number(m[1]));});
    gate.on("error",reject);gate.on("close",()=>reject(new Error("Barrera cerrada antes de estar lista")));
  });
  const closed=new Promise<void>(resolve=>gate.on("close",()=>resolve()));
  let a:Promise<unknown>|undefined,b:Promise<unknown>|undefined;
  try {
    const lock="row" in root?`select id from juntia_data.${root.row} where id='${uuid(root.id)}' for update;`:
      [...root.people].sort().map(id=>`select pg_advisory_xact_lock(hashtextextended('${uuid(id)}',0));`).join("\n");
    gate.stdin.write(`begin;${lock}select 'race_gate:'||pg_backend_pid();\n`);
    const pid=await ready;a=first.run();void a.catch(()=>{});let firstPid=0;
    await vi.waitFor(()=>{const rows=blocked(pid,[first,second]);expect(rows).toHaveLength(1);verify(rows[0],first);firstPid=rows[0].pid;},{timeout:15000});
    b=second.run();void b.catch(()=>{});let proof:Observed[]=[];
    await vi.waitFor(()=>{
      const rows=blocked(pid,[first,second]);expect(rows).toHaveLength(2);
      verify(rows.find(r=>r.pid===firstPid)!,first);verify(rows.find(r=>r.pid!==firstPid)!,second);
      proof=rows;
    },{timeout:15000});
    during?.();
    console.log(`[F52-2] antes del commit: ${proof.map(r=>`PID ${r.pid} ${r.calls.join('/')} espera ${r.event}`).join('; ')}; dos contendientes verificados`);
    gate.stdin.end("commit;\n\\q\n");await closed;expect(gate.exitCode).toBe(0);
    return await Promise.allSettled([a,b]);
  } finally {
    if(gate.exitCode===null){
      if(!gate.stdin.destroyed&&!gate.stdin.writableEnded)gate.stdin.end("rollback;\n\\q\n");else gate.kill();
    }
    await closed;await Promise.allSettled([a,b].filter(Boolean));
  }
}
