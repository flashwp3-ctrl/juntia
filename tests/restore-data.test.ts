// @vitest-environment node
// T026a/b: formato del respaldo intacto, literales opacos y orden de carga.
import {expect,it} from "vitest";
import {readFileSync} from "node:fs";
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
  for(const sql of ["COPY juntia_data.groups FROM stdin;", "INSERT INTO evil.groups(id) VALUES(1);", "INSERT INTO juntia_data.groups(id) VALUES('sin cierre);"]) expect(()=>orderRestoreData(sql)).toThrow();
});
it("conserva valores arbitrarios como datos al reordenar, incluidos comillas y saltos",async()=>{
  const {orderRestoreData}=await import("../scripts/order-restore-data.mjs");
  for(const value of ["", "'", "\\", "\n", "á 🧾", "-- comentario;", "/* bloque */", "$tag$;", '"', ...Array.from({length:100},(_,i)=>String.fromCodePoint(32+i)+"\\'\n;texto")]){
    const literal="E'"+value.replaceAll('\\','\\\\').replaceAll("'","''")+"'";
    const row=`INSERT INTO juntia_data.transactions (description) VALUES (${literal});`;
    expect(orderRestoreData(row+"\nINSERT INTO juntia_data.groups (id) VALUES ('g');")).toContain(row);
  }
});
