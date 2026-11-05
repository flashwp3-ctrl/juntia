-- FR-024: «la base de datos valida antes de crear el usuario» (T012; hook R4).
begin;
select no_plan();
insert into juntia_data.signup_allowlist(email) values ('allowed@seed.test');
-- postgres no puede SET ROLE supabase_auth_admin en este stack. Aquí se prueba
-- la función y sus grants; la API real de Auth prueba el rol efectivo en integración.
select ok(has_schema_privilege('supabase_auth_admin','juntia_data','USAGE'), 'Auth accede al esquema');
select ok(has_table_privilege('supabase_auth_admin','juntia_data.signup_allowlist','SELECT'), 'Auth puede leer la lista');
select ok(has_function_privilege('supabase_auth_admin','juntia_private.before_user_created_hook(jsonb)','EXECUTE'), 'Auth puede ejecutar el hook');
select set_config('tests.hook_allowed', juntia_private.before_user_created_hook('{"user":{"email":"allowed@seed.test"}}'::jsonb)::text,true);
select set_config('tests.hook_uppercase', juntia_private.before_user_created_hook('{"user":{"email":"Allowed@Seed.Test"}}'::jsonb)::text,true);
select set_config('tests.hook_denied', juntia_private.before_user_created_hook('{"user":{"email":"stranger@seed.test"}}'::jsonb)::text,true);
select is(current_setting('tests.hook_allowed')::jsonb, '{}'::jsonb, 'correo permitido');
select is(current_setting('tests.hook_uppercase')::jsonb, '{}'::jsonb, 'normaliza mayúsculas');
select is(current_setting('tests.hook_denied')::jsonb->'error'->>'http_code', '403', 'correo no permitido rechazado');
select * from finish();
rollback;
