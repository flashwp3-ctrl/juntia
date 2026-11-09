-- DEC-G06 / FR-003: «fondos disponibles por aportante»; FR-002: «solo inserción».
-- F64-1: «en archived, solo el void de un uso»; F64-2: «FK compuesta ... asignaciones solo de uso».
begin;
select no_plan();
select has_table('juntia_data'::name,t::name) from unnest(array['savings_goals','goal_ledger_entries','goal_usage_allocations','goal_usage_confirmations']) t;
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
select tests.create_user('33333333-3333-4333-8333-333333333333','third@seed.test');
select tests.seed_couple('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into juntia_data.savings_goals(id,owner_user_id,name,goal_type,target_minor,created_by,created_at) values
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','Bicicleta','vehicle',300000000,'11111111-1111-4111-8111-111111111111','2026-08-01');
insert into juntia_data.savings_goals(id,group_id,name,goal_type,target_minor,created_by,created_at) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Japón','travel',1800000000,'11111111-1111-4111-8111-111111111111','2025-12-01');
insert into juntia_data.goal_ledger_entries(id,goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,created_by) values
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','contribution','11111111-1111-4111-8111-111111111111',10000000,'2026-10-01','reserved','11111111-1111-4111-8111-111111111111');
grant usage on schema extensions to juntia_writer;
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role juntia_writer;
select throws_ok($$insert into juntia_data.goal_usage_allocations(entry_id,member_user_id,amount_minor) values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','11111111-1111-4111-8111-111111111111',100)$$,'23503',null,'FK no admite asignaciones de un aporte');
select throws_ok($$insert into juntia_data.goal_ledger_entries(goal_id,kind,member_user_id,amount_minor,entry_date,reason,created_by) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','withdrawal','11111111-1111-4111-8111-111111111111',10000100,'2026-10-02','reasignar','11111111-1111-4111-8111-111111111111')$$,'JT220',null,'retiro directo sobre disponible se rechaza');
reset role;
-- El uso consume fondos propios. Los tres caminos que reducen saldo se prueban sin RPC.
insert into juntia_data.transactions(id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date)
values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','expense','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',10000000,'transport','2026-10-03');
insert into juntia_data.goal_ledger_entries(id,goal_id,kind,amount_minor,transaction_id,created_by)
values('ffffffff-ffff-4fff-8fff-ffffffffffff','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','usage',10000000,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111');
set local role juntia_writer;
select throws_ok($$insert into juntia_data.goal_usage_allocations(entry_id,member_user_id,amount_minor) values('ffffffff-ffff-4fff-8fff-ffffffffffff','11111111-1111-4111-8111-111111111111',10000100)$$,'JT220',null,'asignación directa sobre disponible se rechaza');
insert into juntia_data.goal_usage_allocations(entry_id,member_user_id,amount_minor) values('ffffffff-ffff-4fff-8fff-ffffffffffff','11111111-1111-4111-8111-111111111111',10000000);
select throws_ok($$insert into juntia_data.goal_ledger_entries(goal_id,kind,voids_entry_id,reason,created_by) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','void','dddddddd-dddd-4ddd-8ddd-dddddddddddd','void','11111111-1111-4111-8111-111111111111')$$,'JT220',null,'void directo del aporte consumido se rechaza');
reset role;
update juntia_data.savings_goals set status='archived',archived_at=now(),version=version+1 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
set local role juntia_writer;
select throws_ok($$insert into juntia_data.goal_ledger_entries(goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,created_by) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','contribution','11111111-1111-4111-8111-111111111111',100,'2026-10-04','reserved','11111111-1111-4111-8111-111111111111')$$,'JT202',null,'archivada rechaza aporte');
select throws_ok($$insert into juntia_data.goal_ledger_entries(goal_id,kind,member_user_id,amount_minor,entry_date,reason,created_by) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','withdrawal','11111111-1111-4111-8111-111111111111',100,'2026-10-04','reasignar','11111111-1111-4111-8111-111111111111')$$,'JT202',null,'archivada rechaza retiro');
select throws_ok($$insert into juntia_data.goal_ledger_entries(goal_id,kind,voids_entry_id,reason,created_by) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','void','dddddddd-dddd-4ddd-8ddd-dddddddddddd','void','11111111-1111-4111-8111-111111111111')$$,'JT202',null,'archivada rechaza anulación de aporte');
select lives_ok($$insert into juntia_data.goal_ledger_entries(goal_id,kind,voids_entry_id,reason,created_by) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','void','ffffffff-ffff-4fff-8fff-ffffffffffff','remove_usage','11111111-1111-4111-8111-111111111111')$$,'solo void de uso se admite en archivada');
reset role;
select is((select status from juntia_data.savings_goals where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),'active','void de uso reactiva en la misma transacción');
select is((select count(*) from juntia_data.audit_events where entity_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and action='reactivate'),1::bigint,'reactivación auditada una vez');
set local role authenticated;
select is((select count(*) from public.goals_overview),2::bigint,'Yo ve cada meta una vez');
select is((select count(*) from public.goals_overview where goal_scope='shared'),1::bigint,'Nosotros no recibe meta personal');
select is((select balance_minor from public.goals_totals where goal_scope='personal'),'10000000','total personal separado');
set local "request.jwt.claims"='{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is((select count(*) from public.goals_overview),1::bigint,'Tomás ve solo compartida');
select is((select count(*) from public.goal_entries),0::bigint,'Tomás no recibe aportes privados');
set local "request.jwt.claims"='{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';
select is((select count(*) from public.goals_overview),0::bigint,'tercera cuenta no recibe metas');
select is((select count(*) from public.goals_totals),0::bigint,'tercera cuenta no recibe totales');
reset role;
select throws_ok($$update juntia_data.goal_ledger_entries set amount_minor=100$$,'JT222',null,'ledger inmutable incluso para dueño');
select throws_ok($$delete from juntia_data.goal_ledger_entries$$,'JT222',null,'ledger no se borra');
select lives_ok('set constraints all immediate','asignaciones y gasto reconciliados al confirmar');
-- Los importes admitidos pueden superar el rango int4 al expresarse como porcentaje.
update juntia_data.savings_goals set target_minor=100 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
insert into juntia_data.goal_ledger_entries(goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,created_by)
values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','contribution','11111111-1111-4111-8111-111111111111',99999999900,'2026-10-04','reserved','11111111-1111-4111-8111-111111111111');
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;
select results_eq($$select progress_percent::text from public.goals_overview where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,array['100009999900']::text[],'progreso truncado sin overflow con importes válidos');
reset role;
select * from finish();
rollback;
