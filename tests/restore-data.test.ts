// @vitest-environment node
// T026a/b: formato del respaldo intacto, literales opacos y orden de carga.
import {expect,it} from "vitest";
import {readFileSync} from "node:fs";
it("T026b: conserva RLS activa en la copia de carga, también para triggers membership",async()=>{
  const {orderRestoreData}=await import("../scripts/order-restore-data.mjs");
  const sql=orderRestoreData("SET row_security = off;\nINSERT INTO juntia_data.groups (id) VALUES ('g');");
  expect(sql).toContain("SET row_security = on;");
  expect(sql).not.toContain("SET row_security = off;");
  const header="SELECT pg_catalog.set_config('search_path', '', false);";expect(orderRestoreData(header)).toContain(header);
});
it("T026a: los tres límites del stack local/CI son 1000",()=>{
  const config=readFileSync("supabase/config.toml","utf8").split("[auth.rate_limit]")[1].split("\n[")[0];
  for(const key of ["sign_in_sign_ups","token_refresh","token_verifications"]) expect(config).toMatch(new RegExp(`^${key} = 1000$`,"m"));
});
it("ordena tablas y join_order, conserva exactamente los literales del dump",async()=>{
  const {orderRestoreData}=await import("../scripts/order-restore-data.mjs");
  const malicious="INSERT INTO juntia_data.transactions (description) VALUES (E'coma, ; \\\\ ruta \\' y ''comilla''\n-- Name: falso\nINSERT INTO auth.users');";
  const statements=[malicious,
    "INSERT INTO juntia_data.group_members (group_id, user_id, join_order) VALUES ('g','b',2) ON CONFLICT DO NOTHING;",
    "INSERT INTO juntia_data.groups (id) VALUES ('g') ON CONFLICT DO NOTHING;",
    "INSERT INTO juntia_data.group_members (group_id, user_id, join_order) VALUES ('g','a',1) ON CONFLICT DO NOTHING;",
    "INSERT INTO auth.users (id) VALUES ('a') ON CONFLICT DO NOTHING;"];
  const ordered=orderRestoreData("SET statement_timeout = 0;\n"+statements.join("\n"));
  expect(ordered.indexOf("INSERT INTO auth.users (id)")).toBeLessThan(ordered.indexOf("INSERT INTO juntia_data.groups"));
  expect(ordered.indexOf("VALUES ('g','a',1)")).toBeLessThan(ordered.indexOf("VALUES ('g','b',2)"));
  expect(ordered.indexOf("VALUES ('g','b',2)")).toBeLessThan(ordered.indexOf(malicious));
  for(const statement of statements) expect(ordered).toContain(statement);
});
it("rechaza formatos inesperados y literales incompletos antes de ejecutar SQL",async()=>{
  const {orderRestoreData}=await import("../scripts/order-restore-data.mjs");
  for(const sql of ["COPY juntia_data.groups FROM stdin;", "UPDATE juntia_data.goal_usage_confirmations SET status='approved';", "DELETE FROM juntia_data.goal_ledger_entries;", "INSERT INTO juntia_data.goal_usage_confirmations (id,status) VALUES('x','approved') ON CONFLICT (id) DO UPDATE SET status='approved';", "INSERT INTO evil.groups(id) VALUES(1);", "INSERT INTO juntia_data.groups(id) VALUES('sin cierre);"]) expect(()=>orderRestoreData(sql)).toThrow();
});
it("conserva valores arbitrarios como datos al reordenar, incluidos comillas y saltos",async()=>{
  const {orderRestoreData}=await import("../scripts/order-restore-data.mjs");
  for(const value of ["", "'", "\\", "\n", "á 🧾", "-- comentario;", "/* bloque */", "$tag$;", '"', ...Array.from({length:100},(_,i)=>String.fromCodePoint(32+i)+"\\'\n;texto")]){
    const literal="E'"+value.replaceAll('\\','\\\\').replaceAll("'","''")+"'";
    const row=`INSERT INTO juntia_data.transactions (description) VALUES (${literal});`;
    expect(orderRestoreData(row+"\nINSERT INTO juntia_data.groups (id) VALUES ('g');")).toContain(row);
  }
});

it("004: carga las seis tablas, conserva filas y acota explícitamente el protocolo",async()=>{
 const {orderRestoreData}=await import("../scripts/order-restore-data.mjs");
 const {planningRestoreFixture,planningDump}=await import("./support/restore-planning.mjs");
 const f=planningRestoreFixture({owner:"88888888-1111-4111-8111-111111111111",member:"88888888-2222-4222-8222-222222222222",group:"88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa"});
 const dump=planningDump(f),ordered=orderRestoreData(dump);
 for(const line of dump.split("\n"))expect(ordered).toContain(line);
 expect(ordered.indexOf(f.ids.returnedUse+"'")).toBeLessThan(ordered.lastIndexOf(f.ids.void+"'"));
 for(const name of ["goal_ledger_guard","goal_allocation_guard","goal_confirmation_guard","goal_void_reactivate"]){expect(ordered).toContain("DISABLE TRIGGER "+name);expect(ordered).toContain("ENABLE TRIGGER "+name);}
 expect(ordered).not.toMatch(/DISABLE TRIGGER ALL|session_replication_role/i);
 expect(ordered).toContain("ALTER CONSTRAINT goal_ledger_entries_confirmation_id_fkey NOT DEFERRABLE");
});

it("004: cada corrupción del drill altera solo las filas sintéticas previstas",async()=>{
 const {planningRestoreFixture,planningDump,planningCorruptions,corruptPlanningFixture,corruptPlanningDump,planningRowSql}=await import("./support/restore-planning.mjs");
 const f=planningRestoreFixture({owner:"88888888-1111-4111-8111-111111111111",member:"88888888-2222-4222-8222-222222222222",group:"88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa"});
 const dump=planningDump(f)+"\nINSERT INTO juntia_data.profiles (display_name) VALUES ('Otro fixture intacto');";
 for(const rule of Object.keys(planningCorruptions)){
  const changed=corruptPlanningDump(dump,f,rule),expected=corruptPlanningFixture(f,rule);
  expect(changed,rule).not.toBe(dump);expect(changed).toContain("VALUES ('Otro fixture intacto')");
  for(const row of expected.rows)expect(changed,rule).toContain(planningRowSql(row));
 }
});
it("004: el protocolo comprueba FK tras ENABLE y rechaza SET de replicación",async()=>{
 const {orderRestoreData}=await import("../scripts/order-restore-data.mjs");
 for(const statement of ['SET session_replication_role = replica;','SET LOCAL "session_replication_role" = replica;',"SELECT pg_catalog.set_config('session_replication_role','replica',false);"])expect(()=>orderRestoreData(statement)).toThrow();
 const sql=orderRestoreData("INSERT INTO juntia_data.budgets (id) VALUES ('g');");
 expect(sql.lastIndexOf("SET CONSTRAINTS ALL IMMEDIATE")).toBeGreaterThan(sql.lastIndexOf("ENABLE TRIGGER"));
 expect(sql.lastIndexOf("NOT DEFERRABLE")).toBeGreaterThan(sql.lastIndexOf("ENABLE TRIGGER"));
});
