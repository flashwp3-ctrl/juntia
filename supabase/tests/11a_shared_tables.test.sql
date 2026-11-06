-- 003 T013 · FR-004/005/029/037/043: contexto explícito, partes exactas y liquidaciones separadas.
begin;
select no_plan();
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
select tests.create_user('33333333-3333-4333-8333-333333333333','carla@seed.test');
select tests.create_user('44444444-4444-4444-8444-444444444444','diana@seed.test');
insert into juntia_data.profiles(user_id,display_name) values
 ('11111111-1111-4111-8111-111111111111','Sara'),('22222222-2222-4222-8222-222222222222','Tomás');
select tests.seed_couple('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
select tests.seed_couple('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','44444444-4444-4444-8444-444444444444');
-- Tabla de octubre copiada de spec.md; ninguna liquidación se inserta como gasto.
create temporary table october(date date,description text,category text,payer uuid,mode text,total bigint,sara bigint,tomas bigint);
insert into october values
 ('2026-10-01','Arriendo','home','11111111-1111-4111-8111-111111111111','percent',160000000,88000000,72000000),
 ('2026-10-12','Mercado del mes','market','22222222-2222-4222-8222-222222222222','equal',45360000,22680000,22680000),
 ('2026-10-18','EPM','services','22222222-2222-4222-8222-222222222222','equal',27010000,13505000,13505000),
 ('2026-10-21','Internet fibra','services','11111111-1111-4111-8111-111111111111','equal',8990000,4495000,4495000),
 ('2026-10-23','Cena en Carmen','restaurants','11111111-1111-4111-8111-111111111111','equal',24000000,12000000,12000000),
 ('2026-10-24','Carulla Laureles','market','22222222-2222-4222-8222-222222222222','equal',18640000,9320000,9320000);
with inserted as (
 insert into juntia_data.transactions(type,created_by,group_id,amount_minor,category_id,transaction_date,description,payer_user_id,split_mode,split_percents)
 select 'expense','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',total,category,date,description,payer,mode,case when mode='percent' then array[55,45]::smallint[] else null end from october returning id,description
)
insert into juntia_data.transaction_allocations(transaction_id,user_id,amount_minor)
 select i.id,p.user_id,p.amount from inserted i join october o on o.description=i.description
 cross join lateral (values ('11111111-1111-4111-8111-111111111111'::uuid,o.sara),('22222222-2222-4222-8222-222222222222'::uuid,o.tomas)) p(user_id,amount);
insert into juntia_data.transactions(type,created_by,owner_user_id,amount_minor,category_id,transaction_date,description) values
 ('expense','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',41290000,'other','2026-10-03','Privado Sara'),
 ('expense','22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222',12300,'health','2026-10-02','Privado Tomás');
set constraints all immediate;
set constraints all deferred;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","email":"sara@seed.test"}';
select is((select count(*) from public.my_profile),1::bigint,'my_profile solo propio');
select is((select count(*) from public.my_transactions),1::bigint,'my_transactions solo privado propio');
select is((select description from public.my_transactions),'Privado Sara','privado propio correcto');
select is((select count from public.my_transaction_months where month='2026-10-01'),1,'meses cuentan solo privados propios');
select is((select category_id from public.my_recent_categories),'other','recientes sin categorías compartidas');
select is((select count(*) from public.couple_expenses),6::bigint,'seis gastos compartidos y ningún privado');
select is((select total_minor from public.couple_month_summary where month='2026-10-01'),'284000000','Nosotros 2.840.000');
select is((select by_category from public.couple_month_summary where month='2026-10-01'),'{"home":"160000000","market":"64000000","services":"36000000","restaurants":"24000000"}'::jsonb,'desglose dorado');
select is((select consumption_minor from public.me_month_summary where month='2026-10-01'),'191290000','Yo Sara 1.912.900');
select is((select private_minor from public.me_month_summary where month='2026-10-01'),'41290000','privados Sara');
select is((select shared_part_minor from public.me_month_summary where month='2026-10-01'),'150000000','parte Sara');
select is((select net_minor from public.couple_balance where user_id='11111111-1111-4111-8111-111111111111'),'42990000','saldo Sara antes');
select is((select net_minor from public.couple_balance where user_id='22222222-2222-4222-8222-222222222222'),'-42990000','saldo Tomás antes');
select is((select sum(my_part_minor::bigint)::text from public.my_shared_parts),'150000000','partes propias, sin duplicar');
select ok(not exists(select 1 from public.couple_expenses e where to_jsonb(e)::text like '%Privado%'),'sin descripciones privadas');
reset role;
select is((select count(*) from information_schema.columns where table_schema='public' and table_name like 'couple_%' and column_name='moved_from_transaction_id'),0::bigint,'ninguna referencia privada en vistas de pareja');
insert into juntia_data.settlements(id,group_id,from_user_id,to_user_id,amount_minor,settlement_date,created_by)
 values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',20000000,'2026-10-25','11111111-1111-4111-8111-111111111111');
set local role authenticated;
select is((select net_minor from public.couple_balance where user_id='11111111-1111-4111-8111-111111111111'),'22990000','saldo después de liquidación parcial');
select is((select total_minor from public.couple_month_summary where month='2026-10-01'),'284000000','liquidación nunca reduce consumo');
set local "request.jwt.claims" = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","email":"tomas@seed.test"}';
select is((select description from public.my_transactions),'Privado Tomás','Tomás nunca recibe privados de Sara');
select is((select shared_part_minor from public.me_month_summary where month='2026-10-01'),'134000000','solo parte compartida de Tomás');
set local "request.jwt.claims" = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","email":"carla@seed.test"}';
select is((select count(*) from public.couple_expenses),0::bigint,'tercero sin gastos');
select is((select count(*) from public.couple_balance),0::bigint,'tercero sin balance');
select is((select count(*) from public.couple_settlements),0::bigint,'tercero sin liquidaciones');
reset role;
-- Liquidación: salvo la anulación todos sus campos son inmutables, también para el dueño.
select throws_ok($$update juntia_data.settlements set amount_minor=100 where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,'JT013',null,'no edita importe');
select throws_ok($$delete from juntia_data.settlements where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,'JT013',null,'no borra liquidación');
select throws_ok($$insert into juntia_data.settlements(group_id,from_user_id,to_user_id,amount_minor,settlement_date,created_by) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',100,current_date,'11111111-1111-4111-8111-111111111111')$$,'23514',null,'dirección distinta obligatoria');
select lives_ok($$update juntia_data.settlements set status='voided',voided_at=now(),voided_by='11111111-1111-4111-8111-111111111111',void_reason='void',version=version+1 where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,'anulación conserva el asiento');
-- El diferido ve cambios de importe o de partes, no solo inserciones de partes.
create function tests.broken_parts() returns void language plpgsql as $$ begin
 update juntia_data.transaction_allocations set amount_minor=amount_minor+100 where transaction_id=(select id from juntia_data.transactions where description='Arriendo') and user_id='11111111-1111-4111-8111-111111111111';
 set constraints all immediate;
end $$;
select throws_ok('select tests.broken_parts()','JT110',null,'partes deben sumar exactamente al confirmar');
create function tests.broken_total() returns void language plpgsql as $$ begin
 update juntia_data.transactions set amount_minor=amount_minor+100 where description='Arriendo';
 set constraints all immediate;
end $$;
select throws_ok('select tests.broken_total()','JT110',null,'cambiar el total también dispara reconciliación diferida');
select throws_ok($$update juntia_data.transactions set split_percents=array[null,100]::smallint[] where description='Arriendo'$$,'23514',null,'porcentajes sin elementos nulos');
select throws_ok($$update juntia_data.transactions set split_percents=array_fill(50::smallint,array[2],array[0]) where description='Arriendo'$$,'23514',null,'porcentajes con índices 1 y 2');
select throws_ok($$update juntia_data.transaction_allocations set user_id='33333333-3333-4333-8333-333333333333' where transaction_id=(select id from juntia_data.transactions where description='Arriendo') and user_id='11111111-1111-4111-8111-111111111111'$$,'JT111',null,'parte solo para integrante activo');
select throws_ok($$update juntia_data.transaction_allocations set amount_minor=1 where transaction_id=(select id from juntia_data.transactions where description='Arriendo')$$,'23514',null,'partes solo pesos enteros');
select throws_ok($$insert into juntia_data.transactions(type,created_by,group_id,amount_minor,category_id,transaction_date,payer_user_id,split_mode) values('expense','44444444-4444-4444-8444-444444444444','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',100,'home',current_date,'44444444-4444-4444-8444-444444444444','equal')$$,'JT105',null,'provisional no admite gastos');
select throws_ok($$insert into juntia_data.settlements(group_id,from_user_id,to_user_id,amount_minor,settlement_date,created_by) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111',100,current_date,'44444444-4444-4444-8444-444444444444')$$,'JT105',null,'provisional no admite liquidaciones');
select * from finish();
rollback;
