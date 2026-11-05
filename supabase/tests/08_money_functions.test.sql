-- T021 / FR-006–FR-018, ADR-013 [V] 6: dinero exacto, cada validación,
-- operaciones atómicas e idempotentes, versión y auditoría (tasks.md).
begin;
select no_plan();
select is(juntia_private.parse_amount_minor('9007199254740993'),9007199254740993::bigint,'[V6] parser conserva 2^53+1');
select is(juntia_private.parse_amount_minor('9223372036854775807'),9223372036854775807::bigint,'[V6] máximo bigint');
select throws_ok(format('select juntia_private.parse_amount_minor(%L)',v),'JT002','invalidAmount','[V6] parser rechaza '||coalesce(v,'null'))
from unnest(array['','+1','-1','1.1','a','9223372036854775808',null]) v;
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
insert into juntia_data.transactions(id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date)
values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','expense','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',9007199254740993,'transport','2026-10-03');
create function tests.make_transaction(patch jsonb) returns jsonb language plpgsql security invoker as $$
declare j jsonb := jsonb_build_object('key',gen_random_uuid()::text,'type','expense','amount','4500000','category','transport','date','2026-10-03','description',null) || patch;
begin return public.create_transaction(j->>'key',j->>'type',j->>'amount',j->>'category',j->>'date',j->>'description'); end $$;
grant execute on function tests.make_transaction(jsonb) to authenticated;
set local role authenticated;
set local "request.jwt.claims" = '{}';
select throws_ok($$select tests.make_transaction('{}')$$,'JT001','notAuthenticated','sin sesión no crea');
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select is((select amount_minor from public.my_transactions where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),'9007199254740993','[V6] vista devuelve texto idéntico');
select throws_ok(format('select tests.make_transaction(%L::jsonb)',j::text),code,message,label)
from (values
 ('{"amount":"not-digits"}'::jsonb,'JT002','invalidAmount','importe texto inválido'),
 ('{"amount":null}','JT002','invalidAmount','importe nulo'),
 ('{"amount":"0"}','JT003','amountOutOfRange','importe cero'),
 ('{"amount":"1"}','JT003','amountOutOfRange','no pesos enteros'),
 ('{"amount":"100000000000"}','JT003','amountOutOfRange','supera tope de negocio'),
 ('{"type":"invalid"}','JT004','invalidType','tipo inválido'),
 ('{"category":"income"}','JT005','invalidCategory','categoría de otro tipo'),
 ('{"category":"missing"}','JT005','invalidCategory','categoría inexistente'),
 ('{"date":"2026-02-30"}','JT006','invalidDate','fecha imposible'),
 ('{"date":"2026-2-01"}','JT006','invalidDate','fecha sin formato'),
 ('{"date":null}','JT006','invalidDate','fecha nula'),
 ('{"key":"invalid"}','JT009','invalidIdempotencyKey','clave inválida'),
 ('{"key":null}','JT009','invalidIdempotencyKey','clave nula')
) v(j,code,message,label);
select throws_ok(format('select tests.make_transaction(%L::jsonb)',jsonb_build_object('description',repeat('a',141))::text),'JT007','descriptionTooLong','descripción excede 140');
select lives_ok($$select tests.make_transaction('{"amount":"99999999900"}')$$,'tope 999999999 pesos aceptado');
select set_config('tests.created',tests.make_transaction('{"key":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}')::text,true);
select is(tests.make_transaction('{"key":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}'),current_setting('tests.created')::jsonb,'misma intención devuelve mismo resultado');
select throws_ok($$select tests.make_transaction('{"key":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","amount":"4600000"}')$$,'JT008','idempotencyKeyReused','misma clave no cambia intención');
select set_config('tests.updated',public.update_transaction('dddddddd-dddd-4ddd-8ddd-dddddddddddd',(current_setting('tests.created')::jsonb->>'id')::uuid,1,'4600000','transport','2026-10-04',null)::text,true);
select is(current_setting('tests.updated')::jsonb->>'amount_minor','4600000','edita importe como texto');
select is(current_setting('tests.updated')::jsonb->>'version','2','edita con versión nueva');
select is(public.update_transaction('dddddddd-dddd-4ddd-8ddd-dddddddddddd',(current_setting('tests.created')::jsonb->>'id')::uuid,1,'4600000','transport','2026-10-04',null),current_setting('tests.updated')::jsonb,'repetición de edición idempotente antes de comprobar versión');
select throws_ok(format('select public.update_transaction(%L,%L::uuid,1,%L,%L,%L,null)',gen_random_uuid()::text,current_setting('tests.created')::jsonb->>'id','4700000','transport','2026-10-04'),'JT011','versionConflict','no sobrescribe versión antigua');
select throws_ok(format('select public.void_transaction(%L,%L::uuid,2,%L)',gen_random_uuid()::text,current_setting('tests.created')::jsonb->>'id','invalid'),'JT017','invalidVoidReason','motivo válido');
select set_config('tests.voided',public.void_transaction('ffffffff-ffff-4fff-8fff-ffffffffffff',(current_setting('tests.created')::jsonb->>'id')::uuid,2,'undo')::text,true);
select is(current_setting('tests.voided')::jsonb->>'status','voided','deshacer anula');
select is(public.void_transaction('ffffffff-ffff-4fff-8fff-ffffffffffff',(current_setting('tests.created')::jsonb->>'id')::uuid,2,'undo'),current_setting('tests.voided')::jsonb,'anulación idempotente');
select is((select count(*) from public.my_transactions where id=(current_setting('tests.created')::jsonb->>'id')::uuid),0::bigint,'anulado fuera de la vista');
select throws_ok(format('select public.update_transaction(%L,%L::uuid,3,%L,%L,%L,null)',gen_random_uuid()::text,current_setting('tests.created')::jsonb->>'id','4700000','transport','2026-10-04'),'JT012','transactionVoided','anulado no editable');
set local "request.jwt.claims" = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is((select count(*) from public.my_transactions),0::bigint,'Tomás no ve a Sara');
select throws_ok(format('select public.update_transaction(%L,%L::uuid,3,%L,%L,%L,null)',gen_random_uuid()::text,current_setting('tests.created')::jsonb->>'id','4700000','transport','2026-10-04'),'JT010','transactionNotFound','ajeno indistinguible de inexistente');
select throws_ok(format('select public.void_transaction(%L,%L::uuid,3,%L)',gen_random_uuid()::text,current_setting('tests.created')::jsonb->>'id','delete'),'JT010','transactionNotFound','no anula ajeno');
reset role;
select is((select count(*) from juntia_data.audit_events where entity_id=(current_setting('tests.created')::jsonb->>'id')::uuid),3::bigint,'solo una auditoría por intención');
select is((select "after"->>'amount_minor' from juntia_data.audit_events where entity_id=(current_setting('tests.created')::jsonb->>'id')::uuid and action='create'),'4500000','auditoría importe texto');
select is((select "before"->>'amount_minor' from juntia_data.audit_events where entity_id=(current_setting('tests.created')::jsonb->>'id')::uuid and action='update'),'4500000','valor anterior auditado');
select is((select reason from juntia_data.audit_events where entity_id=(current_setting('tests.created')::jsonb->>'id')::uuid and action='void'),'undo','motivo auditado');
select is((select count(*) from juntia_data.idempotency_records where status='pending'),0::bigint,'sin claves a medias');
select * from finish();
rollback;
