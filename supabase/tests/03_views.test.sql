-- ADR-013 [V] 8: «security_invoker = true» y funcionan «sin usage sobre juntia_data».
begin;
select no_plan();
-- 004 T012 / FR-005: vistas invoker; importes solo text. Todas existirán tras goal_funding.
select is(reloptions,array['security_invoker=true'],'004 invoker '||relname) from pg_class
where oid in (select to_regclass('public.'||v) from unnest(array['budget_months','budget_history','goals_overview','goals_totals','goal_member_balances','goal_entries','goal_activity','usage_requests','expense_goal_funding','metric_months']) v);
select is((select count(*) from information_schema.columns where table_schema='public' and table_name='goals_overview' and column_name='context'),0::bigint,'004 goal_scope no es context');
-- 003 T013: toda proyección nueva conserva security_invoker.
select is(reloptions,array['security_invoker=true'],'invoker '||relname) from pg_class where oid in
 ('public.couple_expenses'::regclass,'public.couple_settlements'::regclass,'public.couple_transaction_months'::regclass,'public.my_shared_parts'::regclass,'public.couple_month_summary'::regclass,'public.me_month_summary'::regclass,'public.couple_balance'::regclass);
-- 003 T009: proyecciones de pareja sin correo, hash ni preferencias del otro.
select is(reloptions,array['security_invoker=true'],'invoker '||relname) from pg_class where oid in ('public.my_couple'::regclass,'public.couple_members'::regclass);
select is((select array_agg(column_name::text order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='couple_members'),array['user_id','display_name','role','join_order'],'couple_members: solo identidad visible');
select is((select count(*) from information_schema.columns where table_schema='public' and table_name='my_couple' and column_name like '%hash%'),0::bigint,'nunca hash en my_couple');
select is((select reloptions from pg_class where oid='public.my_profile'::regclass), array['security_invoker=true'], '[V8] my_profile invoker');
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
insert into juntia_data.profiles(user_id,display_name) values ('11111111-1111-4111-8111-111111111111','Sara');
select is(reloptions,array['security_invoker=true'],'[V8] invoker '||relname)
from pg_class where oid in ('public.my_transactions'::regclass,'public.my_transaction_months'::regclass,'public.my_recent_categories'::regclass);
insert into juntia_data.transactions(type,created_by,owner_user_id,amount_minor,category_id,transaction_date)
values('expense','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',4500000,'transport','2026-10-03');
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select is(has_schema_privilege(current_user,'juntia_data','USAGE'), false, '[V8] sin USAGE');
select is((select display_name from public.my_profile), 'Sara', '[V8] lee la vista sin USAGE');
select is((select amount_minor from public.my_transactions),'4500000','[V8] importe texto sin USAGE');
select is((select pg_typeof(amount_minor)::text from public.my_transactions),'text','[V8] tipo exacto del importe');
select is((select month::text from public.my_transaction_months),'2026-10-01','[V8] meses sin USAGE');
select is((select category_id from public.my_recent_categories),'transport','[V8] recientes sin USAGE');
reset role;
select * from finish();
rollback;
