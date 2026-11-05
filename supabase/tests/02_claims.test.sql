-- ADR-013 [V] 9: «La forma del claim en la versión de Supabase del stack».
begin;
select no_plan();
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select is(auth.uid(), '11111111-1111-4111-8111-111111111111'::uuid, '[V9] auth.uid lee request.jwt.claims');
select ok(nullif(current_setting('request.jwt.claim.sub',true),'') is null, '[V9] sin claim legacy');
reset role;
set local role juntia_writer;
select set_config('tests.current_uid', juntia_private.current_uid()::text, true);
reset role;
select is(current_setting('tests.current_uid'), '11111111-1111-4111-8111-111111111111', '[V9] current_uid conserva los claims al cambiar rol');
set local "request.jwt.claims" = '{}';
set local role juntia_writer;
select set_config('tests.current_uid', coalesce(juntia_private.current_uid()::text,'null'), true);
reset role;
select is(current_setting('tests.current_uid'), 'null', '[V9] sin claims devuelve null');
select * from finish();
rollback;
