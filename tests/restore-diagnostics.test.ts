// @vitest-environment node
import {expect,it} from "vitest";
import {spawnSync} from "node:child_process";
import {mkdtempSync,rmSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
it("diagnóstico SQL limitado: código/categoría sin SQL, credenciales ni filas",async()=>{
 const {restoreDiagnostic}=await import("../scripts/restore-diagnostics.mjs");
 const raw="psql:load.sql:5: ERROR:  JT111: notCoupleMember\nDETAIL: postgres://user:fake-secret@host\nCONTEXT: SELECT sensitive_value;";
 expect(restoreDiagnostic(raw)).toEqual({sqlstate:"JT111",category:"membership",marker:null});
 expect(JSON.stringify(restoreDiagnostic(raw))).not.toMatch(/fake-secret|sensitive_value|postgres:/);
 expect(restoreDiagnostic("ERROR:  42501: must be owner of table private_name")).toEqual({sqlstate:"42501",category:"permission",marker:null});
});
it("N10 admite solo el rechazo de pareja, incluso si un trigger lo detecta antes del validador",async()=>{
 const {coupleRejected}=await import("../scripts/restore-diagnostics.mjs");
 for(const message of ["RESTORE SQLSTATE=JT111 category=membership","ERROR: JT111: notCoupleMember","ERROR: JT119: invalidCoupleTransition","ERROR: P0001: RESTORE_INVARIANTS: pareja/membresias/invitaciones"])expect(coupleRejected(message)).toBe(true);
 for(const message of ["ERROR: 42501: denied","ERROR: 23503: foreign key","ERROR: JT008: key reused","DETAIL: RESTORE_INVARIANTS: pareja/membresias/invitaciones"])expect(coupleRejected(message)).toBe(false);
});
it("un paso silencioso imprime etapa y exit sin revelar el log crudo",()=>{
 const dir=mkdtempSync(join(tmpdir(),"restore-diagnostic-"));
 try{
 const bash=process.platform==="win32"?"C:/Program Files/Git/bin/bash.exe":"bash";
 const helper=resolve("scripts/restore-progress.sh").replaceAll("\\","/");const log=join(dir,"private.log").replaceAll("\\","/");
 const r=spawnSync(bash,["-c","set -Eeuo pipefail; source \"$1\"; restore_quiet_step path-a.load \"$2\" bash -c 'echo fake-private-secret; exit 17'","test",helper,log],{encoding:"utf8"});
 const out=(r.stdout??"")+(r.stderr??"");expect(r.status).toBe(17);expect(out).toContain("step=path-a.load");expect(out).toContain("exit=17");expect(out).toContain("raw log withheld");expect(out).not.toContain("fake-private-secret");expect(readFileSync(log,"utf8")).toContain("fake-private-secret");
 }finally{rmSync(dir,{recursive:true,force:true});}
});
it("ERR identifica también un test/grep sin salida y conserva su exit",()=>{
 const bash=process.platform==="win32"?"C:/Program Files/Git/bin/bash.exe":"bash";const helper=resolve("scripts/restore-progress.sh").replaceAll("\\","/");
 const r=spawnSync(bash,["-c",'set -Eeuo pipefail; source "$1"; restore_mark N10.marker; false',"test",helper],{encoding:"utf8"});expect(r.status).toBe(1);expect(r.stdout+r.stderr).toContain("step=N10.marker");expect(r.stdout+r.stderr).toContain("exit=1");
});
