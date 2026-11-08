// Fixtures sintéticas compartidas por integración y el drill de CI. Nunca datos reales.
import {randomUUID} from 'node:crypto';
export function planningRestoreFixture({owner,member,group,outsider=randomUUID()}) {
 for(const id of [owner,member,group])if(!/^[0-9a-f-]{36}$/.test(id))throw new Error('Synthetic UUID required');
 const ids=Object.fromEntries(['budget','version','goal','otherGoal','archived','reactivated','expense','voidedExpense','a','b','own','approved','request','archivedA','withdrawal','returnedA','returnedUse','void','archiveAudit','reactivateAudit','duplicateBudget','voidOwn','voidApproved','missingVoidAudit'].map(k=>[k,randomUUID()]));
 const rows=[];const add=(key,table,v)=>rows.push({key,table:'juntia_data.'+table,values:v});
 const date='2026-09-01T12:00:00Z';
 add('budget','budgets',{id:ids.budget,group_id:group,category_id:'market',category_kind:'expense',created_by:owner,created_at:date});
 add('version','budget_versions',{id:ids.version,budget_id:ids.budget,effective_month:'2026-10-01',limit_minor:10000,changed_by:owner,changed_at:'2026-10-01T12:00:00Z'});
 for(const [key,scope,status] of [['goal','shared','active'],['otherGoal','shared','active'],['archived','personal','archived'],['reactivated','personal','active']])add(key,'savings_goals',{id:ids[key],owner_user_id:scope==='personal'?owner:null,group_id:scope==='shared'?group:null,name:'Restore '+key,goal_type:'other',target_minor:10000,status,created_by:owner,created_at:date,archived_at:status==='archived'?'2026-10-05T12:00:00Z':null});
 add('expense','transactions',{id:ids.expense,type:'expense',group_id:group,created_by:owner,payer_user_id:owner,split_mode:'equal',category_id:'transport',amount_minor:10000,transaction_date:'2026-10-03',created_at:'2026-10-03T12:00:00Z'});
 add('partA','transaction_allocations',{transaction_id:ids.expense,user_id:owner,amount_minor:5000});add('partB','transaction_allocations',{transaction_id:ids.expense,user_id:member,amount_minor:5000});
 add('voidedExpense','transactions',{id:ids.voidedExpense,type:'expense',owner_user_id:owner,created_by:owner,category_id:'transport',amount_minor:10000,transaction_date:'2026-10-03',status:'voided',voided_at:'2026-10-06T12:00:00Z',voided_by:owner,created_at:'2026-10-03T12:00:00Z'});
 const entry=(key,goal,kind,amount,actor,extra={})=>add(key,'goal_ledger_entries',{id:ids[key],goal_id:ids[goal],kind,amount_minor:amount,created_by:actor,created_at:'2026-10-03T12:00:00Z',...extra});
 const contribution=(key,goal,actor)=>entry(key,goal,'contribution',10000,actor,{member_user_id:actor,entry_date:'2026-09-02',funding_mode:'reserved',created_at:'2026-09-02T12:00:00Z'});
 contribution('a','goal',owner);contribution('b','goal',member);contribution('archivedA','archived',owner);contribution('returnedA','reactivated',owner);
 entry('withdrawal','archived','withdrawal',10000,owner,{member_user_id:owner,entry_date:'2026-09-03',reason:'reasignar',created_at:'2026-09-03T12:00:00Z'});
 entry('own','goal','usage',3000,owner,{transaction_id:ids.expense});entry('approved','goal','usage',4000,member,{transaction_id:ids.expense,confirmation_id:ids.request});
 entry('returnedUse','reactivated','usage',10000,owner,{transaction_id:ids.voidedExpense});
 entry('void','reactivated','void',null,owner,{voids_entry_id:ids.returnedUse,reason:'expense_voided',created_at:'2026-10-06T12:00:00Z'});
 for(const [key,person,amount] of [['own',owner,3000],['approved',member,4000],['returnedUse',owner,10000]])add('allocation-'+key,'goal_usage_allocations',{entry_id:ids[key],entry_kind:'usage',member_user_id:person,amount_minor:amount});
 add('request','goal_usage_confirmations',{id:ids.request,goal_id:ids.goal,transaction_id:ids.expense,requested_by:owner,member_user_id:member,amount_minor:4000,status:'approved',usage_entry_id:ids.approved,resolved_by:member,resolved_at:'2026-10-03T12:00:00Z',created_at:'2026-10-03T11:00:00Z'});
 add('archiveAudit','audit_events',{id:ids.archiveAudit,actor_user_id:owner,entity_type:'goal',entity_id:ids.reactivated,action:'archive',after:JSON.stringify({status:'archived',archived_at:'2026-10-05T12:00:00Z'}),occurred_at:'2026-10-05T12:00:00Z'});
 add('reactivateAudit','audit_events',{id:ids.reactivateAudit,actor_user_id:owner,entity_type:'goal',entity_id:ids.reactivated,action:'reactivate',before:JSON.stringify({status:'archived'}),after:JSON.stringify({status:'active',transaction_id:ids.voidedExpense,returned_minor:'10000'}),occurred_at:'2026-10-06T12:00:00Z'});
 return {ids,rows,owner,member,group,outsider};
}
export const planningCorruptions={
 'member-negative':'goal-member-balance','goal-negative':'goal-balance','over-expense':'goal-usage-amount','foreign-allocation':'goal-allocation','wrong-context':'goal-context','two-goals':'goal-one-per-expense','voided-expense':'goal-live-expense','invalid-void':'goal-void','void-of-void':'goal-void','future-entry':'goal-entry','before-creation':'goal-entry','foreign-contributor':'goal-entry','archived-entry':'goal-archive','completed-contribution':'goal-archive','missing-reactivation':'goal-reactivation','wrong-refund':'goal-reactivation','personal-request':'goal-request','foreign-request-member':'goal-request','wrong-request-context':'goal-request','wrong-request-member':'goal-request','approval-link':'goal-request','pending-voided-expense':'goal-request','activation-without-void':'goal-reactivation','archived-request':'goal-archive',
 'allocation-kind':null,'allocation-nonusage':null,'income-category':null,'goal-scope-xor':null,'category-kind':null,'scope-xor':null,'duplicate-budget':null,'zero-limit':null
};
export function corruptPlanningFixture(fixture,kind){
 const f=structuredClone(fixture),v=key=>f.rows.find(r=>r.key===key).values;
 switch(kind){
 case 'member-negative':v('b').amount_minor=3000;break;
 case 'goal-negative':v('a').amount_minor=100;v('b').amount_minor=100;break;
 case 'over-expense':v('own').amount_minor=7000;v('allocation-own').amount_minor=7000;break;
 case 'foreign-allocation':v('allocation-own').member_user_id=f.member;break;
 case 'wrong-context':v('own').goal_id=f.ids.reactivated;break;
 case 'two-goals':v('own').goal_id=f.ids.otherGoal;v('a').goal_id=f.ids.otherGoal;break;
 case 'voided-expense':Object.assign(v('expense'),{status:'voided',voided_by:f.owner,voided_at:'2026-10-06T12:00:00Z'});break;
 case 'invalid-void':v('void').voids_entry_id=f.ids.own;break;
 case 'void-of-void':v('void').voids_entry_id=f.ids.void;break;
 case 'future-entry':v('a').entry_date='2099-01-01';break;
 case 'before-creation':v('a').entry_date='2026-08-01';break;
 case 'foreign-contributor':v('archivedA').member_user_id=f.member;v('archivedA').created_by=f.member;break;
 case 'archived-entry':v('archivedA').created_at='2026-10-07T12:00:00Z';break;
 case 'completed-contribution':Object.assign(v('goal'),{status:'completed',completed_at:'2026-09-01T13:00:00Z'});break;
 case 'missing-reactivation':f.rows=f.rows.filter(r=>r.key!=='reactivateAudit');break;
 case 'wrong-refund':v('reactivateAudit').after=JSON.stringify({status:'active',transaction_id:f.ids.voidedExpense,returned_minor:'9000'});break;
 case 'personal-request':Object.assign(v('request'),{goal_id:f.ids.reactivated,status:'rejected',usage_entry_id:null});v('approved').confirmation_id=null;break;
 case 'foreign-request-member':Object.assign(v('request'),{member_user_id:f.outsider,resolved_by:f.outsider,status:'rejected',usage_entry_id:null});v('approved').confirmation_id=null;break;
 case 'wrong-request-context':Object.assign(v('request'),{transaction_id:f.ids.voidedExpense,status:'rejected',usage_entry_id:null});v('approved').confirmation_id=null;break;
 case 'wrong-request-member':v('request').resolved_by=f.owner;break;
 case 'approval-link':v('approved').confirmation_id=null;break;
 case 'pending-voided-expense':
  Object.assign(v('expense'),{status:'voided',voided_at:'2026-10-06T12:00:00Z',voided_by:f.owner});Object.assign(v('request'),{status:'pending',usage_entry_id:null,resolved_by:null,resolved_at:null});v('approved').confirmation_id=null;
  for(const key of ['own','approved'])f.rows.push({key:'pending-void-'+key,table:'juntia_data.goal_ledger_entries',values:{id:key==='own'?f.ids.voidOwn:f.ids.voidApproved,goal_id:f.ids.goal,kind:'void',voids_entry_id:f.ids[key],reason:'expense_voided',created_by:f.owner,created_at:'2026-10-06T12:00:00Z'}});break;
 case 'activation-without-void':
  Object.assign(v('archived'),{status:'active',archived_at:null});f.rows.push({key:'missing-void-audit',table:'juntia_data.audit_events',values:{id:f.ids.missingVoidAudit,actor_user_id:f.owner,entity_type:'goal',entity_id:f.ids.archived,action:'archive',after:JSON.stringify({status:'archived',archived_at:'2026-10-05T12:00:00Z'}),occurred_at:'2026-10-05T12:00:00Z'}});break;
 case 'archived-request':Object.assign(v('otherGoal'),{status:'archived',archived_at:'2026-09-01T13:00:00Z'});Object.assign(v('request'),{goal_id:f.ids.otherGoal,status:'rejected',usage_entry_id:null,resolved_by:f.member});v('approved').confirmation_id=null;break;
 case 'allocation-kind':v('allocation-own').entry_kind='contribution';break;
 case 'allocation-nonusage':v('allocation-own').entry_id=f.ids.a;break;
 case 'income-category':v('budget').category_id='income';break;
 case 'goal-scope-xor':v('goal').owner_user_id=f.owner;break;
 case 'category-kind':v('budget').category_kind='income';break;
 case 'scope-xor':v('budget').owner_user_id=f.owner;break;
 case 'duplicate-budget':f.rows.push({key:'duplicate',table:'juntia_data.budgets',values:{...v('budget'),id:f.ids.duplicateBudget}});break;
 case 'zero-limit':v('version').limit_minor=0;break;
 default:throw new Error('Unknown synthetic corruption');
 }
 return f;
}
const literal=v=>v===null?'NULL':typeof v==='number'?String(v):"'"+v.replaceAll("'","''")+"'";
export const planningRowSql=row=>'INSERT INTO '+row.table+' ('+Object.keys(row.values).map(k=>'"'+k+'"').join(',')+') VALUES ('+Object.values(row.values).map(literal).join(',')+');';
export const planningDump=f=>[...f.rows].reverse().map(planningRowSql).join('\n');
// Reemplaza solo filas del fixture sintético conocido; mantiene el resto del dump opaco.
export function corruptPlanningDump(sql,fixture,kind){
 const changed=corruptPlanningFixture(fixture,kind),lines=sql.split('\n');
 for(const old of fixture.rows.filter(r=>!changed.rows.some(c=>c.key===r.key))){const index=lines.findIndex(l=>l.startsWith('INSERT INTO '+old.table+' ')&&l.includes(old.values.id));if(index<0)throw new Error('Missing synthetic row');lines.splice(index,1);}
 for(const row of changed.rows){const old=fixture.rows.find(r=>r.key===row.key);if(old&&JSON.stringify(old)===JSON.stringify(row))continue;
  if(!old){lines.push(planningRowSql(row));continue;}
  const identifier=old.values.id??old.values.entry_id;
  const matches=lines.map((line,i)=>line.startsWith('INSERT INTO '+row.table+' ')&&line.includes(identifier)?i:-1).filter(i=>i>=0);
  if(matches.length!==1)throw new Error('Expected one synthetic restore row');lines[matches[0]]=planningRowSql(row);
 }
 return lines.join('\n');
}
