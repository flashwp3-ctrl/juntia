-- ADR-013 [V] 1: «RLS se aplica a juntia_writer» y la implementación llamada por
-- SQL directo como authenticated conserva autorización e identidad (T012).
begin;
select no_plan();
select is((select rolcanlogin or rolbypassrls or rolsuper from pg_roles where rolname='juntia_writer'), false, '[V1] writer sin LOGIN, BYPASSRLS ni superusuario');
select is((select pg_get_userbyid(relowner) from pg_class where oid='juntia_data.profiles'::regclass), 'postgres', '[V1] writer no es dueño de profiles');
select ok((select relrowsecurity from pg_class where oid='juntia_data.profiles'::regclass), '[V1] profiles con RLS');
select is((select jsonb_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='juntia_private' and p.prosecdef and p.proowner='juntia_writer'::regrole),
  '["accept_invitation","approve_usage_request","archive_goal","cancel_invitation","cancel_usage_request","complete_first_entry","complete_goal","contribute_to_goal","create_budget","create_expense_with_goal","create_goal","create_invitation","create_shared_expense","create_transaction","ensure_profile","preview_invitation","reclassify_to_shared","regenerate_invitation","register_settlement","reject_usage_request","remove_goal_usage","set_theme","undo_reclassify_to_shared","update_budget","update_display_name","update_goal","update_shared_expense","update_transaction","void_goal_entry","void_settlement","void_shared_expense","void_transaction","withdraw_from_goal","write_status"]'::jsonb, '[V1] treinta y cuatro implementaciones propiedad de writer');
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","email":"sara@seed.test","user_metadata":{"display_name":" Sara "}}';
select is(juntia_private.ensure_profile()->>'display_name', 'Sara', '[V1] implementación directa crea a quien llama');
select is(public.ensure_profile()->>'display_name', 'Sara', '[V1] entrada pública idempotente');
reset role;
select is((select user_id from juntia_data.profiles), '11111111-1111-4111-8111-111111111111'::uuid, '[V1] la fila corresponde al sub');
-- Sonda desechable que conserva el mecanismo real definer de writer, como el preflight R1.
grant create on schema tests to juntia_writer;
create function tests.foreign_profile() returns void language plpgsql security definer set search_path='' as $$
begin insert into juntia_data.profiles(user_id,display_name) values ('22222222-2222-4222-8222-222222222222','Intrusión'); end; $$;
alter function tests.foreign_profile() owner to juntia_writer;
grant execute on function tests.foreign_profile() to authenticated;
revoke create on schema tests from juntia_writer;
set local role authenticated;
select throws_ok('select tests.foreign_profile()', '42501', 'new row violates row-level security policy for table "profiles"', '[V1] definer de writer no puede crear a otra persona');
set local "request.jwt.claims" = '{}';
select throws_ok('select juntia_private.ensure_profile()', 'JT001', 'notAuthenticated', '[V1] sin identidad se rechaza');
reset role;
set local role juntia_writer;
select set_config('tests.current_uid', coalesce(juntia_private.current_uid()::text,'null'), true);
reset role;
select is(current_setting('tests.current_uid'), 'null', '[V1] current_uid null sin claims');
-- T017 / [V1] definitiva: RLS y bloqueo sobre las tres tablas controladas.
select ok(relrowsecurity and relowner<>'juntia_writer'::regrole,'[V1] RLS y dueño separado: '||relname)
from pg_class where oid in ('juntia_data.transactions'::regclass,'juntia_data.audit_events'::regclass,'juntia_data.idempotency_records'::regclass);
insert into juntia_data.transactions(id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date)
values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','expense','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',4500000,'transport','2026-10-03');
grant usage on schema extensions to juntia_writer;
set local role juntia_writer;
set local "request.jwt.claims" = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is((with locked as (select id from juntia_data.transactions where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' for update) select count(*) from locked),0::bigint,'[V1] no bloquea gasto ajeno');
select throws_ok($$insert into juntia_data.transactions(type,created_by,owner_user_id,amount_minor,category_id,transaction_date) values('expense','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',100,'transport','2026-10-03')$$,'42501',null,'[V1] no inserta movimiento ajeno');
select throws_ok($$insert into juntia_data.audit_events(id,actor_user_id,entity_type,entity_id,action) values(gen_random_uuid(),'11111111-1111-4111-8111-111111111111','transaction','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','create')$$,'42501',null,'[V1] no atribuye auditoría ajena');
select throws_ok($$insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint) values('11111111-1111-4111-8111-111111111111','create_transaction',gen_random_uuid(),'fp')$$,'42501',null,'[V1] no inserta clave ajena');
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select is((with locked as (select id from juntia_data.transactions where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' for update) select count(*) from locked),1::bigint,'[V1] bloquea gasto propio');
reset role;
select * from finish();
rollback;
