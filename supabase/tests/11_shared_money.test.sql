-- 003 T018: validación, atomicidad, compatibilidad 002 y row_count por función.
begin;
select no_plan();
select ok(exists(select 1 from pg_proc where oid=to_regprocedure('juntia_private.transaction_goal_funded(uuid)') and provolatile='s' and prorettype='boolean'::regtype and proconfig=array['search_path=""']),'FR-035: punto de extensión stable, boolean y search_path vacío');
select is(has_function_privilege(r,'juntia_private.transaction_goal_funded(uuid)','EXECUTE'),r='juntia_writer','FR-035: EXECUTE exacto '||r)
 from unnest(array['anon','authenticated','juntia_writer']) r;
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
select tests.create_user('33333333-3333-4333-8333-333333333333','carla@seed.test');
insert into juntia_data.profiles(user_id,display_name) values
 ('11111111-1111-4111-8111-111111111111','Sara'),('22222222-2222-4222-8222-222222222222','Tomás'),('33333333-3333-4333-8333-333333333333','Carla');
select tests.seed_couple('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
create function tests.shared(patch jsonb) returns jsonb language plpgsql security invoker as $$
declare j jsonb:=jsonb_build_object('key',gen_random_uuid()::text,'amount','10000','category','transport','date','2026-10-03','payer','11111111-1111-4111-8111-111111111111','mode','equal','parts',jsonb_build_object('11111111-1111-4111-8111-111111111111','5000','22222222-2222-4222-8222-222222222222','5000'))||patch;
begin return public.create_shared_expense(j->>'key',j->>'amount',j->>'category',j->>'date',j->>'description',(j->>'payer')::uuid,j->>'mode',case when j->'percents' is not null then array(select jsonb_array_elements_text(j->'percents'))::smallint[] end,j->'parts'); end $$;
grant execute on function tests.shared(jsonb) to authenticated;
set local role authenticated;
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select throws_ok(format('select tests.shared(%L::jsonb)',j::text),code,null,label) from (values
 ('{"amount":"0"}'::jsonb,'JT003','importe cero'),('{"amount":"101"}','JT003','granularidad'),('{"amount":"100000000000"}','JT003','tope'),
 ('{"category":"income"}','JT005','no ingresos compartidos'),('{"date":"2026-02-30"}','JT006','fecha imposible'),
 ('{"mode":"bad"}','JT118','modo'),('{"parts":{}}','JT110','partes vacías'),('{"parts":null}','JT110','partes nulas'),
 ('{"parts":{"11111111-1111-4111-8111-111111111111":"10000"}}','JT110','faltan integrantes'),
 ('{"mode":"percent","percents":[40,40]}','JT110','porcentajes no suman'),('{"mode":"percent","percents":[70,30]}','JT110','partes incoherentes con modo'),
 ('{"payer":"33333333-3333-4333-8333-333333333333"}','JT111','pagador ajeno'),
 ('{"parts":{"11111111-1111-4111-8111-111111111111":"5000","33333333-3333-4333-8333-333333333333":"5000"}}','JT111','participante ajeno')
) v(j,code,label);
select throws_ok(format('select tests.shared(%L::jsonb)',jsonb_build_object('description',repeat('x',141))::text),'JT007',null,'descripción larga');
select set_config('tests.shared_started',clock_timestamp()::text,true);
select set_config('tests.shared',tests.shared('{"key":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}')::text,true);
select ok((current_setting('tests.shared')::jsonb->>'created_at')::timestamptz>=current_setting('tests.shared_started')::timestamptz,'la fecha del compartido se toma al escribir, no al empezar la transacción');
select is(tests.shared('{"key":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}'),current_setting('tests.shared')::jsonb,'crear compartido idempotente');
select throws_ok($$select tests.shared('{"key":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","description":"otra"}')$$,'JT008',null,'otra huella');
select is(public.write_status('create_shared_expense','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),jsonb_build_object('state','completed','result',current_setting('tests.shared')::jsonb),'write_status devuelve resultado guardado');
set local "request.jwt.claims"='{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is(public.write_status('create_shared_expense','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),'{"state":"not_found"}'::jsonb,'estado protegido por actor');
-- Las RPC antiguas tampoco pueden operar como ninguna de las dos cuentas.
reset role;
select set_config('tests.snapshot',(select jsonb_build_object('tx',to_jsonb(t),'parts',(select jsonb_agg(a order by user_id) from juntia_data.transaction_allocations a where transaction_id=t.id),'audit',(select jsonb_agg(e order by id) from juntia_data.audit_events e where entity_id=t.id)) from juntia_data.transactions t where id=(current_setting('tests.shared')::jsonb->>'id')::uuid)::text,true);
set local role authenticated;
select throws_ok(format('select public.update_transaction(gen_random_uuid()::text,%L::uuid,1,''10000'',''transport'',''2026-10-03'',null)',current_setting('tests.shared')::jsonb->>'id'),'JT010',null,'Tomás no edita compartido por RPC privada');
select throws_ok(format('select public.void_transaction(gen_random_uuid()::text,%L::uuid,1,''delete'')',current_setting('tests.shared')::jsonb->>'id'),'JT010',null,'Tomás no anula compartido por RPC privada');
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select throws_ok(format('select public.update_transaction(gen_random_uuid()::text,%L::uuid,1,''10000'',''transport'',''2026-10-03'',null)',current_setting('tests.shared')::jsonb->>'id'),'JT010',null,'Sara no edita compartido por RPC privada');
select throws_ok(format('select public.void_transaction(gen_random_uuid()::text,%L::uuid,1,''delete'')',current_setting('tests.shared')::jsonb->>'id'),'JT010',null,'Sara no anula compartido por RPC privada');
reset role;
select is((select jsonb_build_object('tx',to_jsonb(t),'parts',(select jsonb_agg(a order by user_id) from juntia_data.transaction_allocations a where transaction_id=t.id),'audit',(select jsonb_agg(e order by id) from juntia_data.audit_events e where entity_id=t.id)) from juntia_data.transactions t where id=(current_setting('tests.shared')::jsonb->>'id')::uuid),current_setting('tests.snapshot')::jsonb,'RPC privadas no cambian fila/partes/versión/auditoría');
set local role authenticated;
select throws_ok(format('select public.update_shared_expense(gen_random_uuid()::text,%L::uuid,9,''10000'',''transport'',''2026-10-03'',null,''11111111-1111-4111-8111-111111111111'',''equal'',null,%L::jsonb)',current_setting('tests.shared')::jsonb->>'id',current_setting('tests.shared')::jsonb->'parts'),'JT011',null,'editar exige versión');
select throws_ok(format('select public.void_shared_expense(gen_random_uuid()::text,%L::uuid,9,''delete'')',current_setting('tests.shared')::jsonb->>'id'),'JT011',null,'eliminar exige versión');
select throws_ok($$select public.register_settlement(gen_random_uuid()::text,'5100','2026-10-03',null)$$,'JT107',null,'no supera deuda');
select throws_ok($$select public.register_settlement(gen_random_uuid()::text,'100',(current_date+1)::text,null)$$,'JT114',null,'fecha futura');
select set_config('tests.settlement_started',clock_timestamp()::text,true);
select set_config('tests.settlement',public.register_settlement('cccccccc-cccc-4ccc-8ccc-cccccccccccc','5000','2026-10-03',null)::text,true);
select ok((current_setting('tests.settlement')::jsonb->>'created_at')::timestamptz>=current_setting('tests.settlement_started')::timestamptz,'la liquidación se fecha después del bloqueo y conserva el orden de dependencias');
select is(current_setting('tests.settlement')::jsonb->>'from_user_id','22222222-2222-4222-8222-222222222222','dirección derivada: Tomás paga');
select is(public.register_settlement('cccccccc-cccc-4ccc-8ccc-cccccccccccc','5000','2026-10-03',null),current_setting('tests.settlement')::jsonb,'liquidar idempotente');
select throws_ok($$select public.register_settlement('cccccccc-cccc-4ccc-8ccc-cccccccccccc','100','2026-10-03',null)$$,'JT008',null,'liquidar misma clave otro importe');
select throws_ok($$select public.register_settlement(gen_random_uuid()::text,'100','2026-10-03',null)$$,'JT106',null,'saldo cero');
select set_config('tests.void_settlement',public.void_settlement('dddddddd-dddd-4ddd-8ddd-dddddddddddd',(current_setting('tests.settlement')::jsonb->>'id')::uuid,1,'void')::text,true);
select is(public.void_settlement('dddddddd-dddd-4ddd-8ddd-dddddddddddd',(current_setting('tests.settlement')::jsonb->>'id')::uuid,1,'void'),current_setting('tests.void_settlement')::jsonb,'anular liquidación idempotente');
select throws_ok(format('select public.void_settlement(''dddddddd-dddd-4ddd-8ddd-dddddddddddd'',%L::uuid,1,''undo'')',current_setting('tests.settlement')::jsonb->>'id'),'JT008',null,'anular liquidación misma clave otro motivo');
select throws_ok(format('select public.void_settlement(gen_random_uuid()::text,%L::uuid,2,''void'')',current_setting('tests.settlement')::jsonb->>'id'),'JT113',null,'liquidación anulada');
select throws_ok($$select public.void_settlement(gen_random_uuid()::text,gen_random_uuid(),1,'void')$$,'JT112',null,'liquidación inexistente');
-- Crear privado y moverlo; restaurar crea otro ID y conserva las dos filas históricas.
select set_config('tests.private',public.create_transaction(gen_random_uuid()::text,'expense','10000','transport','2026-10-03',null)::text,true);
reset role;
select set_config('tests.goal_snapshot',jsonb_build_object(
 'private',(select to_jsonb(t) from juntia_data.transactions t where id=(current_setting('tests.private')::jsonb->>'id')::uuid),
 'parts',(select jsonb_agg(a order by user_id) from juntia_data.transaction_allocations a where transaction_id=(current_setting('tests.private')::jsonb->>'id')::uuid),
 'idempotency',(select jsonb_agg(i order by actor_user_id,action,idempotency_key) from juntia_data.idempotency_records i))::text,true);
-- Sustitución solo dentro del test; ROLLBACK restaura el cuerpo de la migración.
create or replace function juntia_private.transaction_goal_funded(p_transaction_id uuid) returns boolean language sql stable security invoker set search_path='' return true;
set local role authenticated;
select throws_ok(format('select public.reclassify_to_shared(gen_random_uuid()::text,%L::uuid,1,''equal'',null,%L::jsonb)',current_setting('tests.private')::jsonb->>'id',current_setting('tests.shared')::jsonb->'parts'),'JT116',null,'FR-035: financiación bloquea conversión');
reset role;
select is(jsonb_build_object(
 'private',(select to_jsonb(t) from juntia_data.transactions t where id=(current_setting('tests.private')::jsonb->>'id')::uuid),
 'parts',(select jsonb_agg(a order by user_id) from juntia_data.transaction_allocations a where transaction_id=(current_setting('tests.private')::jsonb->>'id')::uuid),
 'idempotency',(select jsonb_agg(i order by actor_user_id,action,idempotency_key) from juntia_data.idempotency_records i)),current_setting('tests.goal_snapshot')::jsonb,'FR-035: rechazo conserva privado, partes, versión e idempotencia');
create or replace function juntia_private.transaction_goal_funded(p_transaction_id uuid) returns boolean language sql stable security invoker set search_path='' return false;
set local role authenticated;
select set_config('tests.move',public.reclassify_to_shared('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',(current_setting('tests.private')::jsonb->>'id')::uuid,1,'equal',null,current_setting('tests.shared')::jsonb->'parts')::text,true);
select is(public.reclassify_to_shared('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',(current_setting('tests.private')::jsonb->>'id')::uuid,1,'equal',null,current_setting('tests.shared')::jsonb->'parts'),current_setting('tests.move')::jsonb,'mover idempotente');
select throws_ok(format('select public.reclassify_to_shared(''eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'',%L::uuid,1,''amount'',null,%L::jsonb)',current_setting('tests.private')::jsonb->>'id',current_setting('tests.shared')::jsonb->'parts'),'JT008',null,'mover misma clave otra huella');
select set_config('tests.restored',public.undo_reclassify_to_shared('ffffffff-ffff-4fff-8fff-ffffffffffff',(current_setting('tests.move')::jsonb->'shared'->>'id')::uuid,1)::text,true);
select isnt(current_setting('tests.restored')::jsonb->>'restored_private_id',current_setting('tests.private')::jsonb->>'id','restaurar no reactiva original');
select is(public.undo_reclassify_to_shared('ffffffff-ffff-4fff-8fff-ffffffffffff',(current_setting('tests.move')::jsonb->'shared'->>'id')::uuid,1),current_setting('tests.restored')::jsonb,'restaurar idempotente');
select throws_ok(format('select public.undo_reclassify_to_shared(''ffffffff-ffff-4fff-8fff-ffffffffffff'',%L::uuid,2)',current_setting('tests.move')::jsonb->'shared'->>'id'),'JT008',null,'restaurar misma clave otra versión');
select set_config('tests.income',public.create_transaction(gen_random_uuid()::text,'income','10000','income','2026-10-03',null)::text,true);
select throws_ok(format('select public.reclassify_to_shared(gen_random_uuid()::text,%L::uuid,1,''equal'',null,%L::jsonb)',current_setting('tests.income')::jsonb->>'id',current_setting('tests.shared')::jsonb->'parts'),'JT115',null,'no convierte ingresos');
-- Casos de deshacer y versión, con una segunda conversión todavía activa.
select set_config('tests.move2',public.reclassify_to_shared(gen_random_uuid()::text,(current_setting('tests.restored')::jsonb->>'restored_private_id')::uuid,1,'equal',null,current_setting('tests.shared')::jsonb->'parts')::text,true);
select throws_ok(format('select public.undo_reclassify_to_shared(gen_random_uuid()::text,%L::uuid,9)',current_setting('tests.move2')::jsonb->'shared'->>'id'),'JT011',null,'deshacer conversión exige versión');
reset role;
-- Envejecimiento solo de fixture, no se duerme para probar los 60 segundos.
alter table juntia_data.transactions disable trigger transactions_guard_update;
update juntia_data.transactions set created_at=now()+(clock_timestamp()-now())/2-interval '60 seconds' where id=(current_setting('tests.move2')::jsonb->'shared'->>'id')::uuid;
set constraints all immediate;
set constraints all deferred;
alter table juntia_data.transactions enable trigger transactions_guard_update;
set local role authenticated;
select throws_ok(format('select public.undo_reclassify_to_shared(gen_random_uuid()::text,%L::uuid,1)',current_setting('tests.move2')::jsonb->'shared'->>'id'),'JT117',null,'ventana de conversión vencida');
select throws_ok(format('select public.void_shared_expense(gen_random_uuid()::text,%L::uuid,1,''undo'')',current_setting('tests.move2')::jsonb->'shared'->>'id'),'JT117',null,'deshacer creación después de 60 segundos');
reset role;
alter table juntia_data.transactions disable trigger transactions_guard_update;
update juntia_data.transactions set created_at=clock_timestamp() where id=(current_setting('tests.move2')::jsonb->'shared'->>'id')::uuid;
set constraints all immediate;
set constraints all deferred;
alter table juntia_data.transactions enable trigger transactions_guard_update;
set local role authenticated;
select set_config('tests.dependency',public.register_settlement(gen_random_uuid()::text,'100','2026-10-03',null)::text,true);
reset role;
alter table juntia_data.settlements disable trigger settlements_guard;
update juntia_data.settlements set created_at=clock_timestamp()+interval '1 second' where id=(current_setting('tests.dependency')::jsonb->>'id')::uuid;
alter table juntia_data.settlements enable trigger settlements_guard;
set local role authenticated;
select throws_ok(format('select public.undo_reclassify_to_shared(gen_random_uuid()::text,%L::uuid,1)',current_setting('tests.move2')::jsonb->'shared'->>'id'),'JT117',null,'liquidación posterior impide deshacer');
select public.void_settlement(gen_random_uuid()::text,(current_setting('tests.dependency')::jsonb->>'id')::uuid,1,'void');
-- Editar y eliminar: resultados y huellas estables, aun después de cambiar versión/estado.
select set_config('tests.edited',public.update_shared_expense('abababab-abab-4bab-8bab-abababababab',(current_setting('tests.shared')::jsonb->>'id')::uuid,1,'10000','transport','2026-10-04','editado','11111111-1111-4111-8111-111111111111','equal',null,current_setting('tests.shared')::jsonb->'parts')::text,true);
select is(public.update_shared_expense('abababab-abab-4bab-8bab-abababababab',(current_setting('tests.shared')::jsonb->>'id')::uuid,1,'10000','transport','2026-10-04','editado','11111111-1111-4111-8111-111111111111','equal',null,current_setting('tests.shared')::jsonb->'parts'),current_setting('tests.edited')::jsonb,'editar idempotente');
select throws_ok(format('select public.update_shared_expense(''abababab-abab-4bab-8bab-abababababab'',%L::uuid,1,''10000'',''transport'',''2026-10-04'',''otra'',''11111111-1111-4111-8111-111111111111'',''equal'',null,%L::jsonb)',current_setting('tests.shared')::jsonb->>'id',current_setting('tests.shared')::jsonb->'parts'),'JT008',null,'editar misma clave otra huella');
select set_config('tests.to_void',tests.shared('{}')::text,true);
select set_config('tests.voided',public.void_shared_expense('bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc',(current_setting('tests.to_void')::jsonb->>'id')::uuid,1,'delete')::text,true);
select is(public.void_shared_expense('bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc',(current_setting('tests.to_void')::jsonb->>'id')::uuid,1,'delete'),current_setting('tests.voided')::jsonb,'eliminar idempotente');
select throws_ok(format('select public.void_shared_expense(''bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc'',%L::uuid,1,''undo'')',current_setting('tests.to_void')::jsonb->>'id'),'JT008',null,'eliminar misma clave otra huella');
select throws_ok(format('select public.void_shared_expense(gen_random_uuid()::text,%L::uuid,2,''delete'')',current_setting('tests.to_void')::jsonb->>'id'),'JT012',null,'eliminado no se elimina otra vez');
select set_config('tests.active_settlement',public.register_settlement(gen_random_uuid()::text,'100','2026-10-03',null)::text,true);
-- Un tercero no ve ni escribe dinero de la pareja.
set local "request.jwt.claims"='{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';
select throws_ok($$select tests.shared('{}')$$,'JT105',null,'tercero sin pareja');
select throws_ok(format('select public.void_shared_expense(gen_random_uuid()::text,%L::uuid,1,''delete'')',current_setting('tests.shared')::jsonb->>'id'),'JT105',null,'tercero no elimina');
select set_config('tests.carla_private',public.create_transaction(gen_random_uuid()::text,'expense','10000','transport','2026-10-03',null)::text,true);
select throws_ok(format('select public.reclassify_to_shared(gen_random_uuid()::text,%L::uuid,1,''equal'',null,%L::jsonb)',current_setting('tests.carla_private')::jsonb->>'id',current_setting('tests.shared')::jsonb->'parts'),'JT115',null,'mover sin pareja activa usa el error del contrato');
reset role;
-- Siete escrituras antiguas: la RLS rota no puede convertirse en éxito silencioso.
alter policy idempotency_complete on juntia_data.idempotency_records using(false);
set local role authenticated;
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select throws_ok($$select public.create_transaction(gen_random_uuid()::text,'expense','10000','transport','2026-10-03',null)$$,'42501',null,'create_transaction row_count');
-- Un privado de prueba nuevo para las RPC antiguas.
reset role;
insert into juntia_data.transactions(id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date) values('77777777-7777-4777-8777-777777777777','expense','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',10000,'transport','2026-10-03');
set local role authenticated;
select throws_ok($$select public.update_transaction(gen_random_uuid()::text,'77777777-7777-4777-8777-777777777777',1,'10000','transport','2026-10-03',null)$$,'42501',null,'update_transaction row_count');
select throws_ok($$select public.void_transaction(gen_random_uuid()::text,'77777777-7777-4777-8777-777777777777',1,'delete')$$,'42501',null,'void_transaction row_count');
select throws_ok(format('select public.update_shared_expense(gen_random_uuid()::text,%L::uuid,2,''10000'',''transport'',''2026-10-03'',null,''11111111-1111-4111-8111-111111111111'',''equal'',null,%L::jsonb)',current_setting('tests.shared')::jsonb->>'id',current_setting('tests.shared')::jsonb->'parts'),'42501',null,'update_shared_expense row_count');
select throws_ok(format('select public.reclassify_to_shared(gen_random_uuid()::text,''77777777-7777-4777-8777-777777777777'',1,''equal'',null,%L::jsonb)',current_setting('tests.shared')::jsonb->'parts'),'42501',null,'reclassify_to_shared row_count');
-- Fixture separada para que el rechazo sea row_count, no la dependencia anterior.
reset role;
alter table juntia_data.settlements disable trigger settlements_guard;
update juntia_data.settlements set created_at=clock_timestamp()-interval '1 day';
alter table juntia_data.settlements enable trigger settlements_guard;
set local role authenticated;
select throws_ok(format('select public.undo_reclassify_to_shared(gen_random_uuid()::text,%L::uuid,1)',current_setting('tests.move2')::jsonb->'shared'->>'id'),'42501',null,'undo_reclassify_to_shared row_count');
select throws_ok(format('select public.void_settlement(gen_random_uuid()::text,%L::uuid,2,''void'')',current_setting('tests.settlement')::jsonb->>'id'),'JT113',null,'anulada conserva precedencia de validación');
select throws_ok(format('select public.void_settlement(gen_random_uuid()::text,%L::uuid,1,''void'')',current_setting('tests.active_settlement')::jsonb->>'id'),'42501',null,'void_settlement row_count');
select throws_ok($$select tests.shared('{}')$$,'42501',null,'create_shared_expense row_count');
select throws_ok(format('select public.void_shared_expense(gen_random_uuid()::text,%L::uuid,2,''delete'')',current_setting('tests.shared')::jsonb->>'id'),'42501',null,'void_shared_expense row_count');
select throws_ok($$select public.register_settlement(gen_random_uuid()::text,'100','2026-10-03',null)$$,'42501',null,'register_settlement row_count');
reset role;
alter policy profiles_update on juntia_data.profiles using(false);
set local role authenticated;
select throws_ok($$select public.complete_first_entry()$$,'42501',null,'complete_first_entry row_count');
select throws_ok($$select public.update_display_name('Otro')$$,'42501',null,'update_display_name row_count');
select throws_ok($$select public.set_theme('dark')$$,'42501',null,'set_theme row_count');
reset role;
alter policy profiles_read on juntia_data.profiles using(false);
set local role authenticated;
select throws_ok($$select public.ensure_profile()$$,'42501',null,'ensure_profile verifica SELECT final');
reset role;
select * from finish();
rollback;
