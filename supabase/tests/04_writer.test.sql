-- ADR-013 [V] 1: «RLS se aplica a juntia_writer» y la implementación llamada por
-- SQL directo como authenticated conserva autorización e identidad (T012).
begin;
select no_plan();
select is((select rolcanlogin or rolbypassrls or rolsuper from pg_roles where rolname='juntia_writer'), false, '[V1] writer sin LOGIN, BYPASSRLS ni superusuario');
select is((select pg_get_userbyid(relowner) from pg_class where oid='juntia_data.profiles'::regclass), 'postgres', '[V1] writer no es dueño de profiles');
select ok((select relrowsecurity from pg_class where oid='juntia_data.profiles'::regclass), '[V1] profiles con RLS');
select results_eq($$select p.proname::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='juntia_private' and p.prosecdef and p.proowner='juntia_writer'::regrole order by 1$$,
  $$values ('complete_first_entry'::text),('ensure_profile'),('set_theme'),('update_display_name')$$, '[V1] cuatro implementaciones propiedad de writer');
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
select * from finish();
rollback;
