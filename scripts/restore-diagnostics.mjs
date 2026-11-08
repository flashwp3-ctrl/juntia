// Publica solo códigos y categorías conocidos; nunca SQL, DETAIL, CONTEXT ni filas.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const markers=['pareja/membresias/invitaciones','raiz de membresia/invitacion','partes/contexto/pagador','liquidacion','vinculo privado/compartido huerfano','ciclo de restauraciones','budget-scope-limit','goal-void','goal-entry','goal-allocation','goal-context','goal-balance','goal-member-balance','goal-live-expense','goal-usage-amount','goal-archive','goal-reactivation','goal-request','goal-one-per-expense'];
export function restoreDiagnostic(raw){
 const lines=String(raw).split(/\r?\n/);
 const line=lines.find(l=>/\b(?:ERROR|FATAL):/.test(l))??lines.find(l=>/^RESTORE SQLSTATE=/.test(l))??'';
 const match=line.match(/\b(?:ERROR|FATAL):\s+(?:([A-Z0-9]{5}):\s*)?(.*)$/);
 const sqlstate=match?.[1]??line.match(/^RESTORE SQLSTATE=([A-Z0-9]{5})\b/)?.[1]??'unknown',message=match?.[2]??line;
 const marker=markers.find(m=>message.includes('RESTORE_INVARIANTS: '+m))??null;
 const category=marker?'invariant':message.includes('RESTORE_PROTOCOL:')?'protocol':({JT111:'membership',JT119:'membership','42501':'permission','55000':'pending-events','23503':'foreign-key','23505':'unique','23514':'check'})[sqlstate]??'postgres';
 return {sqlstate,category,marker};
}
export function coupleRejected(raw){const d=restoreDiagnostic(raw);return d.marker==='pareja/membresias/invitaciones'||['JT111','JT119'].includes(d.sqlstate);}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const [mode,file]=process.argv.slice(2);const raw=readFileSync(file,'utf8'),d=restoreDiagnostic(raw);
 if(mode==='--expect-couple')process.exitCode=coupleRejected(raw)?0:1;
 else if(mode==='--expect-constraint')process.exitCode=['23503','23514','23505'].includes(d.sqlstate)?0:1;
 else if(mode==='--describe')console.log('RESTORE SQLSTATE='+d.sqlstate+' category='+d.category+(d.marker?' RESTORE_INVARIANTS: '+d.marker:''));
 else throw new Error('Unknown restore diagnostic mode');
}
