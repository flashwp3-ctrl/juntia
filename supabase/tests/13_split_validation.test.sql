-- F52-1 · FR-019/019a, ADR-002: equal entre dos, pesos enteros y rechazo sin efectos.
-- Sara tiene un UUID mayor que Tomas: el desempate depende solo de join_order.
begin;
select no_plan();
-- Solo arnés pgTAP, como 05/10a: se revierte al final, sin cambiar grants de la app.
grant usage on schema extensions to juntia_writer;
select tests.create_user('eeeeeeee-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
insert into juntia_data.profiles(user_id,display_name) values('eeeeeeee-1111-4111-8111-111111111111','Sara'),('22222222-2222-4222-8222-222222222222','Tomás');
select tests.seed_couple('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
create function tests.split_state() returns jsonb language sql security invoker set search_path='' as $$
select jsonb_build_object('tx',(select jsonb_agg(x order by id) from juntia_data.transactions x),
'parts',(select jsonb_agg(x order by transaction_id,user_id) from juntia_data.transaction_allocations x),
'audit',(select jsonb_agg(x order by id) from juntia_data.audit_events x),
'idem',(select jsonb_agg(x order by actor_user_id,action,idempotency_key) from juntia_data.idempotency_records x))
$$;
set local "request.jwt.claims"='{"sub":"eeeeeeee-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;
select set_config('tests.edit',public.create_shared_expense(gen_random_uuid()::text,'10000000','transport','2026-10-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"5000000","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb)::text,true);
select set_config('tests.private_even',public.create_transaction(gen_random_uuid()::text,'expense','10000000','transport','2026-10-03',null)::text,true);
select set_config('tests.private_odd',public.create_transaction(gen_random_uuid()::text,'expense','10000100','transport','2026-10-03',null)::text,true);
reset role;
select set_config('tests.before',md5(tests.split_state()::text),true);
set local role authenticated;
select throws_ok($test$do $attempt$ begin perform public.create_shared_expense(gen_random_uuid()::text,'10000000','transport','2026-10-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"10000000","22222222-2222-4222-8222-222222222222":"0"}'::jsonb); raise exception 'acceptedInvalidSplit'; end $attempt$;$test$,'JT110',null,'F52-1 create_shared_expense: equal 10000000/0 rechazado');
reset role;
select is(md5(tests.split_state()::text),current_setting('tests.before'),'F52-1 create_shared_expense: sin movimientos/partes/version/auditoria/idempotencia');
select set_config('tests.before',md5(tests.split_state()::text),true);
set local role authenticated;
select throws_ok($test$do $attempt$ begin perform public.create_shared_expense(gen_random_uuid()::text,'10000000','transport','2026-10-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"0","22222222-2222-4222-8222-222222222222":"10000000"}'::jsonb); raise exception 'acceptedInvalidSplit'; end $attempt$;$test$,'JT110',null,'F52-1 create_shared_expense: equal 0/10000000 rechazado');
reset role;
select is(md5(tests.split_state()::text),current_setting('tests.before'),'F52-1 create_shared_expense: sin movimientos/partes/version/auditoria/idempotencia');
set local role authenticated;
select set_config('tests.result',public.create_shared_expense(gen_random_uuid()::text,'10000000','transport','2026-10-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"5000000","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb)::text,true);
reset role;
select is(current_setting('tests.result')::jsonb->'parts','{"eeeeeeee-1111-4111-8111-111111111111":"5000000","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb,'F52-1 create_shared_expense: 10000000 pesos enteros, residuo por join_order aunque paga Tomas');
set local role authenticated;
select set_config('tests.result',public.create_shared_expense(gen_random_uuid()::text,'10000100','transport','2026-10-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"5000100","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb)::text,true);
reset role;
select is(current_setting('tests.result')::jsonb->'parts','{"eeeeeeee-1111-4111-8111-111111111111":"5000100","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb,'F52-1 create_shared_expense: 10000100 pesos enteros, residuo por join_order aunque paga Tomas');
select set_config('tests.before',md5(tests.split_state()::text),true);
set local role authenticated;
select throws_ok($test$do $attempt$ begin perform public.update_shared_expense(gen_random_uuid()::text,(current_setting('tests.edit')::jsonb->>'id')::uuid,1,'10000000','transport','2026-10-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"10000000","22222222-2222-4222-8222-222222222222":"0"}'::jsonb); raise exception 'acceptedInvalidSplit'; end $attempt$;$test$,'JT110',null,'F52-1 update_shared_expense: equal 10000000/0 rechazado');
reset role;
select is(md5(tests.split_state()::text),current_setting('tests.before'),'F52-1 update_shared_expense: sin movimientos/partes/version/auditoria/idempotencia');
select set_config('tests.before',md5(tests.split_state()::text),true);
set local role authenticated;
select throws_ok($test$do $attempt$ begin perform public.update_shared_expense(gen_random_uuid()::text,(current_setting('tests.edit')::jsonb->>'id')::uuid,1,'10000000','transport','2026-10-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"0","22222222-2222-4222-8222-222222222222":"10000000"}'::jsonb); raise exception 'acceptedInvalidSplit'; end $attempt$;$test$,'JT110',null,'F52-1 update_shared_expense: equal 0/10000000 rechazado');
reset role;
select is(md5(tests.split_state()::text),current_setting('tests.before'),'F52-1 update_shared_expense: sin movimientos/partes/version/auditoria/idempotencia');
set local role authenticated;
select set_config('tests.result',public.update_shared_expense(gen_random_uuid()::text,(current_setting('tests.edit')::jsonb->>'id')::uuid,1,'10000000','transport','2026-10-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"5000000","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb)::text,true);
reset role;
select is(current_setting('tests.result')::jsonb->'parts','{"eeeeeeee-1111-4111-8111-111111111111":"5000000","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb,'F52-1 update_shared_expense: 10000000 pesos enteros, residuo por join_order aunque paga Tomas');
set local role authenticated;
select set_config('tests.result',public.update_shared_expense(gen_random_uuid()::text,(current_setting('tests.edit')::jsonb->>'id')::uuid,2,'10000100','transport','2026-10-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"5000100","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb)::text,true);
reset role;
select is(current_setting('tests.result')::jsonb->'parts','{"eeeeeeee-1111-4111-8111-111111111111":"5000100","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb,'F52-1 update_shared_expense: 10000100 pesos enteros, residuo por join_order aunque paga Tomas');
select set_config('tests.before',md5(tests.split_state()::text),true);
set local role authenticated;
select throws_ok($test$do $attempt$ begin perform public.reclassify_to_shared(gen_random_uuid()::text,(current_setting('tests.private_even')::jsonb->>'id')::uuid,1,'equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"10000000","22222222-2222-4222-8222-222222222222":"0"}'::jsonb); raise exception 'acceptedInvalidSplit'; end $attempt$;$test$,'JT110',null,'F52-1 reclassify_to_shared: equal 10000000/0 rechazado');
reset role;
select is(md5(tests.split_state()::text),current_setting('tests.before'),'F52-1 reclassify_to_shared: sin movimientos/partes/version/auditoria/idempotencia');
select set_config('tests.before',md5(tests.split_state()::text),true);
set local role authenticated;
select throws_ok($test$do $attempt$ begin perform public.reclassify_to_shared(gen_random_uuid()::text,(current_setting('tests.private_even')::jsonb->>'id')::uuid,1,'equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"0","22222222-2222-4222-8222-222222222222":"10000000"}'::jsonb); raise exception 'acceptedInvalidSplit'; end $attempt$;$test$,'JT110',null,'F52-1 reclassify_to_shared: equal 0/10000000 rechazado');
reset role;
select is(md5(tests.split_state()::text),current_setting('tests.before'),'F52-1 reclassify_to_shared: sin movimientos/partes/version/auditoria/idempotencia');
set local role authenticated;
select set_config('tests.result',public.reclassify_to_shared(gen_random_uuid()::text,(current_setting('tests.private_even')::jsonb->>'id')::uuid,1,'equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"5000000","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb)::text,true);
reset role;
select is(current_setting('tests.result')::jsonb->'shared'->'parts','{"eeeeeeee-1111-4111-8111-111111111111":"5000000","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb,'F52-1 reclassify_to_shared: 10000000 pesos enteros, residuo por join_order aunque paga Tomas');
set local role authenticated;
select set_config('tests.result',public.reclassify_to_shared(gen_random_uuid()::text,(current_setting('tests.private_odd')::jsonb->>'id')::uuid,1,'equal',null,'{"eeeeeeee-1111-4111-8111-111111111111":"5000100","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb)::text,true);
reset role;
select is(current_setting('tests.result')::jsonb->'shared'->'parts','{"eeeeeeee-1111-4111-8111-111111111111":"5000100","22222222-2222-4222-8222-222222222222":"5000000"}'::jsonb,'F52-1 reclassify_to_shared: 10000100 pesos enteros, residuo por join_order aunque paga Tomas');
set local role juntia_writer;
select lives_ok($test$select juntia_private.validate_shared_split('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',10000100,'22222222-2222-4222-8222-222222222222','percent',array[33,67]::smallint[],'{"eeeeeeee-1111-4111-8111-111111111111":"3300000","22222222-2222-4222-8222-222222222222":"6700100"}'::jsonb)$test$,'percent usa porcentajes y mayor residuo');
select throws_ok($test$select juntia_private.validate_shared_split('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',10000100,'22222222-2222-4222-8222-222222222222','percent',array[33,67]::smallint[],'{"eeeeeeee-1111-4111-8111-111111111111":"3300100","22222222-2222-4222-8222-222222222222":"6700000"}'::jsonb)$test$,'JT110',null,'percent no acepta residuo asignado por cliente');
select lives_ok($test$select juntia_private.validate_shared_split('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',10000100,'22222222-2222-4222-8222-222222222222','percent',array[100,0]::smallint[],'{"eeeeeeee-1111-4111-8111-111111111111":"10000100","22222222-2222-4222-8222-222222222222":"0"}'::jsonb)$test$,'FR-019a percent 100/0 valido');
select lives_ok($test$select juntia_private.validate_shared_split('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',10000100,'22222222-2222-4222-8222-222222222222','amount',null,'{"eeeeeeee-1111-4111-8111-111111111111":"0","22222222-2222-4222-8222-222222222222":"10000100"}'::jsonb)$test$,'FR-019a amount 0/total valido');
select throws_ok($test$select juntia_private.validate_shared_split('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',10000100,'22222222-2222-4222-8222-222222222222','amount',null,'{"eeeeeeee-1111-4111-8111-111111111111":"0","22222222-2222-4222-8222-222222222222":"10000000"}'::jsonb)$test$,'JT110',null,'amount exige suma exacta');
reset role;
select * from finish();
rollback;
