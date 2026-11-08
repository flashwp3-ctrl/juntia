// T026b: orden de importación, no cambia el archivo respaldado ni sus valores.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

/** Recorre solo caracteres fuera de literales/comentarios; admite E'', '' y "". */
function walk(sql,plain) {
  let quote='',escape=false,dollar='',comment=0;
  for(let i=0;i<sql.length;i++) {
    const c=sql[i],next=sql[i+1];
    if(comment) {if(c==='/'&&next==='*'){comment++;i++;}else if(c==='*'&&next==='/'){comment--;i++;}continue;}
    if(dollar) {if(sql.startsWith(dollar,i)){i+=dollar.length-1;dollar='';}continue;}
    if(quote) {
      if(escape&&c==='\\'){i++;continue;}
      if(c===quote){if(next===quote)i++;else quote='';}continue;
    }
    if(c==='-'&&next==='-'){const end=sql.indexOf('\n',i);i=end<0?sql.length:end;continue;}
    if(c==='/'&&next==='*'){comment=1;i++;continue;}
    if(c==="'"||c==='"'){quote=c;escape=c==="'"&&/[eE]/.test(sql[i-1]??'')&&!/[\w$]/.test(sql[i-2]??'');continue;}
    if(c==='$'){const match=sql.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/);if(match){dollar=match[0];i+=dollar.length-1;continue;}}
    const stop=plain(c,i);if(stop===false)return;
  }
  if(quote||dollar||comment)throw new Error('Dump SQL incompleto');
}
const code=sql=>sql.replace(/^(?:\s+|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*/,'').trim();
function statements(sql) {
  const items=[];let start=0,skipUntil=0;
  walk(sql,(c,i)=>{
    if(i<skipUntil)return;
    if(c==='\\'&&/^\s*$/.test(sql.slice(sql.lastIndexOf('\n',i-1)+1,i))) {
      const end=sql.indexOf('\n',i);skipUntil=end<0?sql.length:end+1;
      items.push(sql.slice(start,skipUntil));start=skipUntil;
    }else if(c===';'){items.push(sql.slice(start,i+1));start=i+1;}
  });
  const tail=sql.slice(start);if(code(tail))throw new Error('Dump SQL sin terminador');
  return {items,tail};
}
function values(sql) {
  const atoms=[];let start=0,depth=0,ended=false,suffix='';
  walk(sql,(c,i)=>{
    if(c==='(')depth++;
    if(c===')'){if(depth===0){atoms.push(sql.slice(start,i).trim());ended=true;suffix=sql.slice(i+1).trim();return false;}depth--;}
    if(c===','&&depth===0){atoms.push(sql.slice(start,i).trim());start=i+1;}
  });
  if(!ended)throw new Error('VALUES incompleto');return {atoms,suffix};
}
const tableOrder=['auth.users','auth.identities','juntia_data.profiles','juntia_data.categories','juntia_data.signup_allowlist','juntia_data.groups','juntia_data.group_members','juntia_data.group_invitations','juntia_data.transactions','juntia_data.transaction_allocations','juntia_data.settlements','juntia_data.budgets','juntia_data.budget_versions','juntia_data.savings_goals','juntia_data.goal_ledger_entries','juntia_data.goal_usage_allocations','juntia_data.goal_usage_confirmations','juntia_data.audit_events','juntia_data.idempotency_records'];

export function orderRestoreData(sql) {
  const {items,tail}=statements(sql);const before=[],inserts=[],after=[];let seen=false;
  for(const [index,item] of items.entries()) {
    const text=code(item);
    if(/^INSERT\s/i.test(text)) {
      const match=text.match(/^INSERT INTO\s+"?(\w+)"?\."?(\w+)"?\s*\(([^)]*)\)\s*VALUES\s*\(/i);
      if(!match)throw new Error('INSERT fuera del formato de pg_dump --column-inserts');
      const table=`${match[1]}.${match[2]}`,rank=tableOrder.indexOf(table);
      if(rank<0)throw new Error('Tabla no prevista en el restaurador');
      const {atoms,suffix}=values(text.slice(match[0].length));
      if(!/^(?:ON\s+CONFLICT\s+DO\s+NOTHING\s*)?;$/i.test(suffix))throw new Error('Sufijo INSERT fuera del formato de pg_dump');
      const columns=match[3].split(',').map(s=>s.trim().replaceAll('"',''));
      if(atoms.length!==columns.length)throw new Error('Columnas/valores incoherentes');
      let joinOrder=0;
      if(table==='juntia_data.goal_ledger_entries') joinOrder=atoms[columns.indexOf('kind')]==="'void'"?1:0;
      if(table==='juntia_data.group_members') {
        const raw=atoms[columns.indexOf('join_order')];
        if(!raw||!/^'?([12])'?$/.test(raw))throw new Error('join_order no válido');
        joinOrder=Number(raw.replaceAll("'",''));
      }
      inserts.push({item,rank,joinOrder,index});seen=true;
    }else {
      if(/^SET\s+(?:(?:LOCAL|SESSION)\s+)?"?session_replication_role"?(?:\s|=|TO\b)/i.test(text))throw new Error('SET de replicación no permitido');
      if(/^SELECT\s+pg_catalog\.set_config\b/i.test(text)&&!/^SELECT\s+pg_catalog\.set_config\s*\(\s*'search_path'\s*,\s*''\s*,\s*false\s*\)\s*;$/i.test(text))throw new Error('set_config fuera del formato de pg_dump');
      if(text&&!/^(?:SET\s|SELECT pg_catalog\.(?:set_config|setval)\s*\(|\\(?:un)?restrict\s)/i.test(text))throw new Error('Sentencia fuera del formato data-only');
      // pg_dump usa off para no ocultar filas al exportar. Al cargar, los
      // triggers definer de membership necesitan aplicar sus políticas RLS;
      // off provoca un error aun cuando esas políticas permiten la lectura.
      // Solo cambia la copia de carga, nunca el respaldo ni sus valores.
      const loadItem=/^SET\s+row_security\s*=\s*off\s*;$/i.test(text)
        ? item.replace(/off(\s*;)\s*$/i,'on$1') : item;
      (seen?after:before).push(loadItem);
    }
  }
  inserts.sort((a,b)=>a.rank-b.rank||a.joinOrder-b.joinOrder||a.index-b.index);
  const planning=inserts.some(i=>i.rank>=tableOrder.indexOf('juntia_data.budgets')&&i.rank<=tableOrder.indexOf('juntia_data.goal_usage_confirmations'));
  const protocol=part=>planning?readFileSync(new URL('../supabase/restore/planning-load-'+part+'.sql',import.meta.url),'utf8'):'';
  return [...before,protocol('start'),...inserts.map(i=>i.item),...after,protocol('end'),tail].join('\n');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  const [input,output]=process.argv.slice(2);if(!input||!output)throw new Error('Faltan rutas de entrada/salida');
  writeFileSync(output,orderRestoreData(readFileSync(input,'utf8')),{mode:0o600});
}
