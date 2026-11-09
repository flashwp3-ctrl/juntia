-- Solo metadatos de rol/propiedad; no credenciales ni filas de la aplicación.
select json_build_object('current_user',current_user,'session_user',session_user,
 'superuser',(select rolsuper from pg_roles where rolname=current_user),
 'tables',(select json_agg(json_build_object('table',c.relname,'owner',pg_get_userbyid(c.relowner),
  'can_act_as_owner',pg_has_role(current_user,c.relowner,'USAGE')) order by c.relname)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='juntia_data'
 and c.relname in('budgets','budget_versions','savings_goals','goal_ledger_entries','goal_usage_allocations','goal_usage_confirmations')));
