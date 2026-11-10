-- 004 PR C (decisión del fundador del 10 de noviembre de 2026; migración 20261110120000_goal_last_contribution):
-- «al frente va la meta con el aporte más reciente», solo aportes no anulados; sin aportes, null. `goals_overview` conserva
-- sus columnas, su orden y su visibilidad: una meta personal de la pareja sigue sin verse.
begin;
select no_plan();
select has_column('public','goals_overview','last_contribution_date','columna de la fecha del último aporte');
select has_column('public','goals_overview','last_contribution_created_at','columna del instante del último aporte');
select col_type_is('public','goals_overview','last_contribution_date','date','fecha sin hora');
select col_type_is('public','goals_overview','last_contribution_created_at','timestamp with time zone','instante con zona');
select results_eq($$select column_name::text from information_schema.columns where table_schema='public' and table_name='goals_overview' order by ordinal_position$$,
 array['id','goal_scope','name','goal_type','target_minor','target_month','status','version','balance_minor','progress_percent','has_pending_request','my_available_minor','created_at','last_contribution_date','last_contribution_created_at']::text[],
 'las columnas de antes no cambian de orden; las nuevas van al final');
select is((select c.reloptions from pg_class c where c.oid='public.goals_overview'::regclass),array['security_invoker=true']::text[],'sigue siendo security_invoker');
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
select tests.seed_couple('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into juntia_data.savings_goals(id,group_id,name,goal_type,target_minor,created_by,created_at) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Japón','travel',1800000000,'11111111-1111-4111-8111-111111111111','2025-12-01'),
 ('c2222222-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Sala','home',400000000,'22222222-2222-4222-8222-222222222222','2026-01-01');
insert into juntia_data.savings_goals(id,owner_user_id,name,goal_type,target_minor,created_by,created_at) values
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','Bicicleta','vehicle',300000000,'11111111-1111-4111-8111-111111111111','2026-08-01');
insert into juntia_data.goal_ledger_entries(id,goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,created_by,created_at) values
 ('d1111111-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc','contribution','22222222-2222-4222-8222-222222222222',40000000,'2026-10-15','reserved','22222222-2222-4222-8222-222222222222','2026-10-15T12:00:00-05:00'),
 ('d2222222-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc','contribution','11111111-1111-4111-8111-111111111111',50000000,'2026-10-22','reserved','11111111-1111-4111-8111-111111111111','2026-10-22T09:00:00-05:00'),
 ('d3333333-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc','contribution','22222222-2222-4222-8222-222222222222',10000000,'2026-10-22','reserved','22222222-2222-4222-8222-222222222222','2026-10-22T18:00:00-05:00'),
 ('d4444444-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc','contribution','11111111-1111-4111-8111-111111111111',20000000,'2026-10-30','reserved','11111111-1111-4111-8111-111111111111','2026-10-30T12:00:00-05:00'),
 ('d5555555-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','contribution','11111111-1111-4111-8111-111111111111',60000000,'2026-11-05','reserved','11111111-1111-4111-8111-111111111111','2026-11-05T12:00:00-05:00');
-- El aporte del 30 de octubre se anula: deja de contar como el más reciente.
insert into juntia_data.goal_ledger_entries(goal_id,kind,voids_entry_id,reason,created_by) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','void','d4444444-dddd-4ddd-8ddd-dddddddddddd','void','11111111-1111-4111-8111-111111111111');
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;
select is((select last_contribution_date from public.goals_overview where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'),'2026-10-22'::date,'el aporte anulado no cuenta: el último vivo es del 22 de octubre');
select is((select last_contribution_created_at from public.goals_overview where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'),'2026-10-22T18:00:00-05:00'::timestamptz,'empate de fecha: gana el registrado más tarde');
select ok((select last_contribution_date is null and last_contribution_created_at is null from public.goals_overview where id='c2222222-cccc-4ccc-8ccc-cccccccccccc'),'meta sin aportes: null');
select is((select last_contribution_date from public.goals_overview where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),'2026-11-05'::date,'Sara ve el último aporte de su meta personal');
select is((select count(*) from public.goals_overview where goal_scope='shared'),2::bigint,'Nosotros: solo las dos compartidas');
set local "request.jwt.claims"='{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is((select count(*) from public.goals_overview where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),0::bigint,'Tomás sigue sin ver la meta personal de Sara');
select is((select last_contribution_date from public.goals_overview where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'),'2026-10-22'::date,'Tomás ve el mismo último aporte de la compartida');
reset role;
select * from finish();
rollback;
