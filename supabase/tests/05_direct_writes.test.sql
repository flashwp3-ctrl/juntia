-- T017 / ADR-013 [V] 2: «insert, update, delete y truncate imposibles»;
-- idempotencia solo pending → completed propia; auditoría inmutable incluso para writer.
begin;
select no_plan();
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
insert into juntia_data.transactions(id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date)
values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','expense','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',4500000,'transport','2026-10-03');
insert into juntia_data.audit_events(id,actor_user_id,entity_type,entity_id,action)
values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','transaction','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','create');
set local role authenticated;
-- 003 T013: ni partes ni liquidaciones permiten escritura directa.
select throws_ok('insert into juntia_data.'||t||' default values','42501',null,'no INSERT '||t) from unnest(array['transaction_allocations','settlements']) t;
select throws_ok('update juntia_data.'||t||' set amount_minor=100','42501',null,'no UPDATE '||t) from unnest(array['transaction_allocations','settlements']) t;
select throws_ok('delete from juntia_data.'||t,'42501',null,'no DELETE '||t) from unnest(array['transaction_allocations','settlements']) t;
-- 003 T009: tablas de membresía controladas, incluso filas propias.
select throws_ok('insert into juntia_data.'||t||' default values','42501',null,'no INSERT '||t) from unnest(array['groups','group_members','group_invitations']) t;
select throws_ok('update juntia_data.'||t||' set '||c,'42501',null,'no UPDATE '||t) from (values ('groups','currency=''USD'''),('group_members','role=''owner'''),('group_invitations','status=''accepted''')) v(t,c);
select throws_ok('delete from juntia_data.'||t,'42501',null,'no DELETE '||t) from unnest(array['groups','group_members','group_invitations']) t;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select throws_ok('insert into juntia_data.transactions default values','42501',null,'[V2] no INSERT directo');
select throws_ok('insert into juntia_data.audit_events default values','42501',null,'[V2] no INSERT auditoría');
select throws_ok('insert into juntia_data.idempotency_records default values','42501',null,'[V2] no INSERT idempotencia');
select throws_ok('update juntia_data.'||t||' set '||c,'42501',null,'[V2] no UPDATE '||t)
from (values ('transactions','amount_minor=100'),('audit_events','action=''update'''),('idempotency_records','status=''completed''')) v(t,c);
select throws_ok('delete from juntia_data.'||t,'42501',null,'[V2] no DELETE '||t) from unnest(array['transactions','audit_events','idempotency_records']) t;
select throws_ok('truncate juntia_data.'||t,'42501',null,'[V2] no TRUNCATE '||t) from unnest(array['transactions','audit_events','idempotency_records']) t;
reset role;
-- Acceso temporal al arnés pgTAP, no a datos adicionales; todo se revierte.
grant usage on schema extensions to juntia_writer;
set local role juntia_writer;
select lives_ok($$insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint) values ('11111111-1111-4111-8111-111111111111','create_transaction','cccccccc-cccc-4ccc-8ccc-cccccccccccc','fingerprint')$$,'pending propia permitida');
select throws_ok($$insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint,status,result,completed_at) values ('11111111-1111-4111-8111-111111111111','create_transaction',gen_random_uuid(),'fp','completed','{}',now())$$,'42501',null,'no puede nacer completed');
select throws_ok($$insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint,result) values ('11111111-1111-4111-8111-111111111111','create_transaction',gen_random_uuid(),'fp','{}')$$,null,null,'no puede nacer con resultado');
select throws_ok($$insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint,completed_at) values ('11111111-1111-4111-8111-111111111111','create_transaction',gen_random_uuid(),'fp',now())$$,null,null,'no puede nacer con completed_at');
select throws_ok($$insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint) values ('22222222-2222-4222-8222-222222222222','create_transaction',gen_random_uuid(),'fp')$$,'42501',null,'no inserta por otra persona');
set local "request.jwt.claims" = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
with changed as (update juntia_data.idempotency_records set status='completed',result='{}',completed_at=now() returning 1) select is((select count(*) from changed),0::bigint,'no completa fila ajena');
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select lives_ok($$update juntia_data.idempotency_records set status='completed',result='{"id":"saved"}',completed_at=now() where idempotency_key='cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,'completa pending propia');
select is((select result->>'id' from juntia_data.idempotency_records),'saved','resultado persistido');
with changed as (update juntia_data.idempotency_records set result='{}' returning 1) select is((select count(*) from changed),0::bigint,'RLS ya no deja actualizar completed');
select ok(not has_column_privilege('juntia_writer','juntia_data.idempotency_records','request_fingerprint','UPDATE'),'grant limitado por columnas');
reset role;
-- El dueño de tabla elude RLS, pero no los triggers: detectar su eliminación.
select throws_ok($$update juntia_data.idempotency_records set result='{}'$$,null,null,'trigger protege completed incluso al dueño');
insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint)
values('11111111-1111-4111-8111-111111111111','update_transaction','dddddddd-dddd-4ddd-8ddd-dddddddddddd','fp');
select throws_ok('update juntia_data.idempotency_records set status=''completed'',result=''{}'',completed_at=now(),'||mutation||' where idempotency_key=''dddddddd-dddd-4ddd-8ddd-dddddddddddd''',null,null,'trigger conserva '||label)
from (values ('actor_user_id=''22222222-2222-4222-8222-222222222222''','actor'),('action=''void_transaction''','acción'),('idempotency_key=gen_random_uuid()','clave'),('request_fingerprint=''changed''','huella'),('created_at=created_at+interval ''1 second''','creación')) v(mutation,label);
select throws_ok($$update juntia_data.idempotency_records set status='pending' where idempotency_key='dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,null,null,'trigger exige una transición real');
grant update(request_fingerprint) on juntia_data.idempotency_records to juntia_writer;
set local role juntia_writer;
select throws_ok($$update juntia_data.idempotency_records set status='completed',result='{}',completed_at=now(),request_fingerprint='changed' where idempotency_key='dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,null,null,'trigger rechaza cambiar huella también como writer');
reset role;
-- Para probar el trigger como writer, se abren permisos SOLO en esta transacción.
grant select,update,delete,truncate on juntia_data.audit_events to juntia_writer;
create policy test_audit_read on juntia_data.audit_events for select to juntia_writer using(true);
create policy test_audit_update on juntia_data.audit_events for update to juntia_writer using(true) with check(true);
create policy test_audit_delete on juntia_data.audit_events for delete to juntia_writer using(true);
set local role juntia_writer;
select throws_ok($$update juntia_data.audit_events set action='update'$$,null,null,'[V2] trigger impide UPDATE aun a writer');
select throws_ok('delete from juntia_data.audit_events',null,null,'[V2] trigger impide DELETE aun a writer');
select throws_ok('truncate juntia_data.audit_events',null,null,'[V2] trigger impide TRUNCATE aun a writer');
reset role;
select * from finish();
rollback;
