-- 004 FR-001/003, ADR-004: «Presupuesto ausente no es presupuesto cero».
-- F64-2: «FK compuesta ... nunca Ingresos». Criterios de tablas, antes de funciones.
begin;
select no_plan();
select has_table('juntia_data'::name,'budgets'::name);
select has_table('juntia_data'::name,'budget_versions'::name);
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
select tests.create_user('33333333-3333-4333-8333-333333333333','third@seed.test');
select tests.seed_couple('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into juntia_data.budgets(id,owner_user_id,category_id,created_by)
values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','market','11111111-1111-4111-8111-111111111111');
insert into juntia_data.budgets(id,group_id,category_id,created_by)
values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','market','11111111-1111-4111-8111-111111111111');
insert into juntia_data.budget_versions(budget_id,effective_month,limit_minor,changed_by,changed_at) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','2026-10-01',90000000,'11111111-1111-4111-8111-111111111111','2026-10-03'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','2026-11-01',100000000,'22222222-2222-4222-8222-222222222222','2026-11-01');
grant usage on schema extensions to juntia_writer;
set local role juntia_writer;
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select throws_ok($$insert into juntia_data.budgets(owner_user_id,category_id,created_by) values('11111111-1111-4111-8111-111111111111','income','11111111-1111-4111-8111-111111111111')$$,'23503',null,'FK impide income con discriminador expense');
select throws_ok($$insert into juntia_data.budgets(owner_user_id,category_id,created_by) values('11111111-1111-4111-8111-111111111111','market','11111111-1111-4111-8111-111111111111')$$,'23505',null,'una identidad por clave');
select throws_ok($$insert into juntia_data.budget_versions(budget_id,effective_month,limit_minor,changed_by) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2026-10-01',0,'11111111-1111-4111-8111-111111111111')$$,'23514',null,'límite cero nunca activo');
reset role;
set local role authenticated;
select is((select count(*) from public.budget_months where context='us' and month='2026-10-01'),1::bigint,'Nosotros solo compartido');
select is((select limit_minor from public.budget_months where context='us' and month='2026-10-01'),'90000000','vigencia octubre');
select is((select limit_minor from public.budget_months where context='us' and month='2026-11-01'),'100000000','vigencia noviembre');
set local "request.jwt.claims"='{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is((select count(*) from public.budget_history where budget_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),0::bigint,'pareja no ve presupuesto personal');
set local "request.jwt.claims"='{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';
select is((select count(*) from public.budget_history),0::bigint,'tercera cuenta no ve historia');
select is((select count(*) from public.budget_months),0::bigint,'tercera cuenta no ve agregados');
reset role;
-- El dueño elude RLS: solo el trigger puede proteger solo inserción.
select throws_ok($$update juntia_data.budget_versions set limit_minor=100$$,'JT222',null,'versiones inmutables aun para dueño');
select throws_ok($$delete from juntia_data.budget_versions$$,'JT222',null,'versiones no se borran');
select * from finish();
rollback;
