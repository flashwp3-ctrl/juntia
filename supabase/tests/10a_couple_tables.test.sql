-- 003 T009 · FR-001/003/004/010, F49-5: «como juntia_writer ... fallan sin efectos».
begin;
select no_plan();
create function tests.couple_state(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('group',(select to_jsonb(g) from juntia_data.groups g where id=p_id),
 'members',(select jsonb_agg(to_jsonb(m) order by user_id) from juntia_data.group_members m where group_id=p_id),
 'invitations',(select jsonb_agg(to_jsonb(i) order by id) from juntia_data.group_invitations i where group_id=p_id));
$$;
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
select tests.create_user('33333333-3333-4333-8333-333333333333','carla@seed.test');
select tests.create_user('44444444-4444-4444-8444-444444444444','diana@seed.test');
-- Autorización del gestor para T010: provisional propia visible solo a writer.
-- SELECT directo con USAGE temporal de prueba: no altera los grants de la app.
grant usage on schema juntia_data to authenticated;
grant usage on schema extensions to juntia_writer;
select tests.seed_couple('dddddddd-dddd-4ddd-8ddd-dddddddddddd','11111111-1111-4111-8111-111111111111');
update juntia_data.group_invitations set email='tomas@seed.test' where group_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
set constraints all immediate;
set constraints all deferred;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","email":"carla@seed.test"}';
select is((select count(*) from juntia_data.groups),0::bigint,'tercera cuenta authenticated no ve provisional de Sara');
reset role;
set local role juntia_writer;
select is((select count(*) from juntia_data.groups),0::bigint,'tercera cuenta writer no ve provisional de Sara');
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","email":"tomas@seed.test"}';
select is(juntia_private.is_invited_to('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),true,'Tomás invitado cubierto por is_invited_to');
select is((select count(*) from juntia_data.groups),0::bigint,'Tomás authenticated no ve provisional antes de aceptar');
reset role;
set local role juntia_writer;
select is((select count(*) from juntia_data.groups),1::bigint,'writer con identidad invitada ve raíz para preview/accept');
select is((select array_agg(k order by k) from juntia_data.groups g cross join lateral jsonb_object_keys(to_jsonb(g)) k),
 array['activated_at','created_at','currency','discarded_at','id','kind','owner_user_id','status','time_zone','version'],'columnas visibles a writer invitado: solo raíz, sin token/correo');
reset role;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","email":"sara@seed.test"}';
update juntia_data.group_invitations set status='cancelled' where group_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
update juntia_data.groups set status='discarded',discarded_at=now(),version=2 where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
update juntia_data.group_members set status='released',released_at=now() where group_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
set constraints all immediate;
set constraints all deferred;
set local role juntia_writer;
select is((select count(*) from juntia_data.groups),0::bigint,'Sara writer deja de ver su pareja descartada');
reset role;
insert into juntia_data.profiles(user_id,display_name,theme) values
 ('11111111-1111-4111-8111-111111111111','Sara','dark'),('22222222-2222-4222-8222-222222222222','Tomás','light');
select tests.seed_couple('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
select tests.seed_couple('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','44444444-4444-4444-8444-444444444444');
set constraints all immediate;
set constraints all deferred;
select is((select count(*) from pg_policy where polrelid='juntia_data.groups'::regclass and polcmd='w'),1::bigint,'una sola política UPDATE');
select has_trigger('juntia_data','groups','groups_guard_transition','guard de transición presente');
select has_trigger('juntia_data','groups','groups_check_state','comprobación diferida presente');
select ok(relrowsecurity and relowner not in ('juntia_writer'::regrole,'juntia_membership'::regrole),'RLS y dueño separado: '||relname)
from pg_class where oid in ('juntia_data.groups'::regclass,'juntia_data.group_members'::regclass,'juntia_data.group_invitations'::regclass);
select throws_ok($$insert into juntia_data.group_members(group_id,user_id,role,status,join_order) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','member','active',2)$$,'23505',null,'no cabe un tercero');
select throws_ok($$insert into juntia_data.group_members(group_id,user_id,role,status,join_order) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','member','active',2)$$,'23505',null,'una pareja por persona');
grant usage on schema extensions to juntia_writer;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","email":"sara@seed.test"}';
select is((select count(*) from public.my_couple),1::bigint,'Sara ve su pareja sin recursión');
select is((select count(*) from public.couple_members),2::bigint,'Sara ve ambos nombres');
select is((select count(*) from public.my_profile),1::bigint,'my_profile no devuelve preferencias ajenas');
select is((select theme from public.my_profile),'dark','solo su tema');
select is(juntia_private.shares_couple_with('22222222-2222-4222-8222-222222222222'),true,'comparte pareja');
set local "request.jwt.claims" = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","email":"tomas@seed.test"}';
select is((select count(*) from public.my_couple),1::bigint,'Tomás ve su pareja');
select is((select theme from public.my_profile),'light','Tomás solo ve su tema');
set local "request.jwt.claims" = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","email":"carla@seed.test"}';
select is((select count(*) from public.my_couple),0::bigint,'tercera cuenta sin pareja');
select is((select count(*) from public.couple_members),0::bigint,'tercera cuenta sin nombres');
select is(juntia_private.is_group_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),false,'tercera cuenta no es miembro');
reset role;
create temporary table transition_before as select
 tests.couple_state('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') as active_state,
 tests.couple_state('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') as provisional_state;
set local role juntia_writer;
set local "request.jwt.claims" = '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","email":"diana@seed.test"}';
select throws_ok($$update juntia_data.groups set status='active',activated_at=now(),version=version+1 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,'JT119',null,'propietaria no activa sola');
select is((select status from juntia_data.groups where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),'provisional','sin efecto');
select is((select version from juntia_data.groups where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),1,'misma versión');
select throws_ok($$insert into juntia_data.group_members(group_id,user_id,role,status,join_order) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','33333333-3333-4333-8333-333333333333','member','active',2)$$,'42501',null,'writer no inserta membresía ajena');
reset role;
select is(tests.couple_state('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),(select provisional_state from transition_before),'caso 1: provisional completa sin efectos');
set local role juntia_writer;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","email":"sara@seed.test"}';
select throws_ok($$update juntia_data.groups set status='discarded',discarded_at=now(),version=version+1 where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,'JT119',null,'no descarta activa');
select throws_ok($$update juntia_data.groups set status='provisional',activated_at=null,version=version+1 where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,'JT119',null,'no devuelve activa a provisional');
select is((select version from juntia_data.groups where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),1,'activa intacta');
reset role;
select is(tests.couple_state('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),(select active_state from transition_before),'caso 2: activa completa sin efectos');
-- Descartada sembrada de forma atómica: writer deja de verla por SELECT.
set local "request.jwt.claims" = '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","email":"diana@seed.test"}';
update juntia_data.groups set status='discarded',discarded_at=now(),version=2 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
update juntia_data.group_members set status='released',released_at=now() where group_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
update juntia_data.group_invitations set status='cancelled' where group_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
set constraints all immediate;
create temporary table discarded_before as select tests.couple_state('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') as state;
set local role juntia_writer;
-- Interpretación del gestor: RLS corta antes del trigger, sin ampliar SELECT.
with changed as (update juntia_data.groups set status='provisional',discarded_at=null,version=3 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id)
 select is((select count(*) from changed),0::bigint,'RLS: descartada a provisional afecta 0 filas');
reset role;
select is(tests.couple_state('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),(select state from discarded_before),'estado, versión, membresías e invitaciones idénticos tras provisional');
set local role juntia_writer;
with changed as (update juntia_data.groups set status='active',activated_at=now(),discarded_at=null,version=3 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id)
 select is((select count(*) from changed),0::bigint,'RLS: descartada a active afecta 0 filas');
reset role;
select is(tests.couple_state('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),(select state from discarded_before),'estado, versión, membresías e invitaciones idénticos tras active');
-- Defensa en profundidad: postgres, dueño de la tabla, elude RLS solo en esta prueba.
select throws_ok($$update juntia_data.groups set status='provisional',discarded_at=null,version=3 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,'JT119',null,'guard rechaza descartada a provisional sin RLS');
select throws_ok($$update juntia_data.groups set status='active',activated_at=now(),discarded_at=null,version=3 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,'JT119',null,'guard rechaza descartada a active sin RLS');
select is(tests.couple_state('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),(select state from discarded_before),'sin efectos también cuando el guard rechaza');
-- T009 / data-model §5: la fila propia de owner se admite en una raíz provisional propia.
-- Reproduce el orden de creación antes de que existan las funciones de invitación.
set constraints all deferred;
set local role juntia_writer;
select lives_ok($$
 do $creation$ begin
  insert into juntia_data.groups(id,owner_user_id,status)
   values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','44444444-4444-4444-8444-444444444444','provisional');
  insert into juntia_data.group_members(group_id,user_id,role,status,join_order)
   values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','44444444-4444-4444-8444-444444444444','owner','active',1);
  insert into juntia_data.group_invitations(group_id,email,token_hash,status,created_by,inviter_display_name)
   values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','invitee@seed.test',repeat('c',64),'pending','44444444-4444-4444-8444-444444444444','Diana');
  set constraints all immediate;
 end $creation$;
$$,'writer puede crear la raíz provisional y su propia membresía');
reset role;
select * from finish();
rollback;
