-- T017 / FR-007, FR-013, FR-018: invariantes por cualquier camino (data-model §2.3).
begin;
select no_plan();
-- 003 T013: validaciones independientes de las futuras funciones de dinero.
select has_column('juntia_data','transactions','payer_user_id','pagador de grupo');
select has_check('juntia_data','transactions','CHECKs por contexto');
select has_trigger('juntia_data','transactions','transactions_check_allocations','suma de partes también al cambiar el gasto');
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
create function tests.insert_transaction(patch jsonb) returns void language plpgsql as $$
declare j jsonb := '{"type":"expense","created_by":"11111111-1111-4111-8111-111111111111","owner_user_id":"11111111-1111-4111-8111-111111111111","amount_minor":"4500000","currency":"COP","category_id":"transport","transaction_date":"2026-10-03","status":"active","version":1}'::jsonb || patch;
begin
  insert into juntia_data.transactions(id,type,created_by,owner_user_id,group_id,amount_minor,currency,category_id,transaction_date,description,status,version,voided_at,voided_by)
  values(gen_random_uuid(),j->>'type',(j->>'created_by')::uuid,(j->>'owner_user_id')::uuid,(j->>'group_id')::uuid,(j->>'amount_minor')::bigint,j->>'currency',j->>'category_id',(j->>'transaction_date')::date,j->>'description',j->>'status',(j->>'version')::integer,(j->>'voided_at')::timestamptz,(j->>'voided_by')::uuid);
end $$;
select lives_ok($$select tests.insert_transaction('{}')$$,'gasto válido');
select lives_ok($$select tests.insert_transaction('{"type":"income","category_id":"income","transaction_date":"2030-01-01"}')$$,'ingreso privado y fecha futura válidos');
select throws_ok(format('select tests.insert_transaction(%L::jsonb)',patch),'23514',null,label)
from (values
 ('{"amount_minor":"0"}','cero'),('{"amount_minor":"-100"}','negativo'),('{"currency":"USD"}','moneda'),
 ('{"type":"settlement"}','tipo'),('{"owner_user_id":null}','sin contexto'),
 ('{"group_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}','dos contextos'),
 ('{"owner_user_id":null,"group_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}','grupo sin pagador ni reparto'),
 ('{"owner_user_id":"22222222-2222-4222-8222-222222222222"}','propietaria distinta de autora'),
 ('{"status":"unknown"}','estado'),('{"version":0}','versión'),('{"status":"voided"}','anulado sin datos'),
 ('{"voided_at":"2026-10-03T12:00:00Z","voided_by":"11111111-1111-4111-8111-111111111111"}','activo con anulación'),
 ('{"description":" "}','descripción vacía'),('{"description":" sin recortar "}','descripción sin recortar')
) v(patch,label);
select throws_ok($$select tests.insert_transaction('{"description":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}')$$,'23514',null,'descripción supera 140');
select throws_ok($$select tests.insert_transaction('{"category_id":"income"}')$$,'23503',null,'Ingresos solo para ingreso');
select throws_ok($$select tests.insert_transaction('{"type":"income"}')$$,'23503',null,'gasto solo para categorías de gasto');
select throws_ok($$select tests.insert_transaction('{"category_id":"missing"}')$$,'23503',null,'categoría debe existir');
select throws_ok('update juntia_data.transactions set '||mutation||' where type=''expense''','JT013','immutableField','inmutable: '||label)
from (values ('type=''income''','tipo'),('created_by=''22222222-2222-4222-8222-222222222222''','autora'),('owner_user_id=''22222222-2222-4222-8222-222222222222''','propietaria'),('group_id=gen_random_uuid()','grupo'),('currency=''USD''','moneda'),('created_at=created_at+interval ''1 second''','creación')) v(mutation,label);
update juntia_data.transactions set status='voided',voided_at=now(),voided_by=created_by where type='expense';
select throws_ok($$update juntia_data.transactions set amount_minor=100 where type='expense'$$,'JT012','transactionVoided','anulado no se edita');
select throws_ok($$update juntia_data.transactions set status='active',voided_at=null,voided_by=null where type='expense'$$,'JT012','transactionVoided','anulado no revive');
select * from finish();
rollback;
