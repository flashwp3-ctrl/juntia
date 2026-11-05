-- ADR-013 [V] 8: «security_invoker = true» y funcionan «sin usage sobre juntia_data».
begin;
select no_plan();
select is((select reloptions from pg_class where oid='public.my_profile'::regclass), array['security_invoker=true'], '[V8] my_profile invoker');
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
insert into juntia_data.profiles(user_id,display_name) values ('11111111-1111-4111-8111-111111111111','Sara');
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select is(has_schema_privilege(current_user,'juntia_data','USAGE'), false, '[V8] sin USAGE');
select is((select display_name from public.my_profile), 'Sara', '[V8] lee la vista sin USAGE');
reset role;
select * from finish();
rollback;
