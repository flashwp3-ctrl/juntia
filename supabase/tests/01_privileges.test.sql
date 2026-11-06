-- T012 / FR-004: «ningún privilegio de escritura ni de alteración», incluidos
-- TRUNCATE, REFERENCES, TRIGGER, secuencias, usage y create (spec.md; ADR-013 [V] 7).
begin;
select no_plan();
select has_schema('juntia_data');
select has_schema('juntia_private');
select is((select count(*) from pg_extension where extname = 'pg_graphql'), 0::bigint, '[V7] pg_graphql ausente');
select is(has_schema_privilege(r, s, 'CREATE'), false, '[V7] sin CREATE ' || r || '.' || s)
from unnest(array['anon','authenticated']) r cross join unnest(array['public','juntia_data','juntia_private']) s;
select is(has_schema_privilege(r, s, 'USAGE'), s = 'public' or (r = 'authenticated' and s = 'juntia_private'), '[V7] USAGE exacto ' || r || '.' || s)
from unnest(array['anon','authenticated']) r cross join unnest(array['public','juntia_data','juntia_private']) s;
select is(has_table_privilege(r, 'juntia_data.' || t, p), false, '[V7] sin ' || p || ' ' || r || '.' || t)
from unnest(array['anon','authenticated']) r cross join unnest(array['profiles','categories','signup_allowlist','transactions','audit_events','idempotency_records']) t
cross join unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p;
select is(has_any_column_privilege(r, 'juntia_data.' || t, p), false, '[V7] sin grant por columna ' || p || ' ' || r || '.' || t)
from unnest(array['anon','authenticated']) r cross join unnest(array['profiles','categories','signup_allowlist','transactions','audit_events','idempotency_records']) t
cross join unnest(array['INSERT','UPDATE','REFERENCES']) p;
select is(has_table_privilege(r, 'juntia_data.' || t, 'SELECT'), r = 'authenticated' and t in ('profiles','categories','transactions'), '[V7] SELECT exacto ' || r || '.' || t)
from unnest(array['anon','authenticated']) r cross join unnest(array['profiles','categories','signup_allowlist','transactions','audit_events','idempotency_records']) t;
select is((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef), 0::bigint, '[V7] ningún definer en public');
select is((select jsonb_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and has_function_privilege('authenticated',p.oid,'EXECUTE')),
  '["complete_first_entry","create_transaction","ensure_profile","set_theme","update_display_name","update_transaction","void_transaction"]'::jsonb, '[V7] lista exacta de entradas authenticated');
select is((select jsonb_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='juntia_private' and has_function_privilege('authenticated',p.oid,'EXECUTE')),
  '["complete_first_entry","create_transaction","ensure_profile","set_theme","update_display_name","update_transaction","void_transaction"]'::jsonb, '[V7] solo las siete implementaciones accesibles por SQL');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','juntia_private') and has_function_privilege('anon',p.oid,'EXECUTE')), 0::bigint, '[V7] anon sin funciones');
select ok(not has_sequence_privilege(r,c.oid,p), '[V7] sin secuencias ' || r || '.' || c.relname || '.' || p)
from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join unnest(array['anon','authenticated']) r cross join unnest(array['USAGE','SELECT','UPDATE']) p
where c.relkind='S' and n.nspname in ('public','juntia_data','juntia_private');
-- Las concesiones automáticas no vuelven a abrir objetos nuevos.
-- F40-2 / ADR-013 §5.4: inventario bloqueante de funciones de postgres en TODOS
-- los esquemas no del sistema; no se excluyen auth ni extensiones por esquema.
-- Única excepción del runner fuera de las siete entradas: el grant explícito
-- tests.authenticate_as(uuid), T003/seed.sql. Las implementaciones privadas son
-- de writer y por tanto no pertenecen al conjunto de funciones de postgres.
-- Enmienda del 6 de noviembre de 2026 (ADR-013 §5.4, decisión de los fundadores): se excluyen solo las funciones
-- que PERTENECEN a una extensión (dependencia deptype='e' en pg_depend), nunca por nombre ni por esquema. En el
-- Supabase alojado, pgcrypto, uuid-ossp y pg_stat_statements son de postgres; la API de datos no expone extensions.
create temporary view f40_uncontracted_execute as
select format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) as signature,
  exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') as public_execute,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.proowner=(select oid from pg_roles where rolname='postgres') and n.nspname !~ '^pg_' and n.nspname<>'information_schema'
  and p.oid<>all(array[
    'public.complete_first_entry()'::regprocedure,'public.create_transaction(text,text,text,text,text,text)'::regprocedure,
    'public.ensure_profile()'::regprocedure,'public.set_theme(text)'::regprocedure,
    'public.update_display_name(text)'::regprocedure,'public.update_transaction(text,uuid,integer,text,text,text,text)'::regprocedure,
    'public.void_transaction(text,uuid,integer,text)'::regprocedure,'tests.authenticate_as(uuid)'::regprocedure
  ]::oid[])
  and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.refclassid='pg_extension'::regclass and d.deptype='e')
  and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE')
    or exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'));
select is((select coalesce(jsonb_agg(to_jsonb(f) order by signature),'[]'::jsonb) from f40_uncontracted_execute f),'[]'::jsonb,
  '[F40-2] inventario de postgres fuera del contrato: firmas y EXECUTE PUBLIC/anon/authenticated');
create function tests.f40_global_probe() returns integer language sql return 1;
select is((select count(*) from f40_uncontracted_execute),0::bigint,'[F40-2] default global cerrado también fuera de esquemas Juntia');
grant execute on function tests.f40_global_probe() to public;
select is((select jsonb_agg(to_jsonb(f)) from f40_uncontracted_execute f),
  '[{"signature":"tests.f40_global_probe()","public_execute":true,"anon_execute":true,"authenticated_execute":true}]'::jsonb,'[F40-2] inventario detecta un grant PUBLIC fuera del contrato');
revoke execute on function tests.f40_global_probe() from public;
grant execute on function tests.f40_global_probe() to anon;
select is((select jsonb_agg(to_jsonb(f)) from f40_uncontracted_execute f),
  '[{"signature":"tests.f40_global_probe()","public_execute":false,"anon_execute":true,"authenticated_execute":false}]'::jsonb,'[F40-2] inventario detecta un grant anon fuera del contrato');
revoke execute on function tests.f40_global_probe() from anon;
grant execute on function tests.f40_global_probe() to authenticated;
select is((select jsonb_agg(to_jsonb(f)) from f40_uncontracted_execute f),
  '[{"signature":"tests.f40_global_probe()","public_execute":false,"anon_execute":false,"authenticated_execute":true}]'::jsonb,'[F40-2] inventario detecta un grant authenticated fuera del contrato');
revoke execute on function tests.f40_global_probe() from authenticated;
select is((select count(*) from f40_uncontracted_execute),0::bigint,'[F40-2] inventario vacío tras retirar las sondas');
-- La exclusión no es por esquema: una función de postgres en extensions que no pertenece a ninguna extensión sigue contando.
create function extensions.f40_schema_probe() returns integer language sql return 1;
grant execute on function extensions.f40_schema_probe() to anon;
select is((select jsonb_agg(f.signature) from f40_uncontracted_execute f),'["extensions.f40_schema_probe()"]'::jsonb,'[F40-2] una función suelta en extensions no queda excluida');
drop function extensions.f40_schema_probe();
create function public.ungranted_probe() returns integer language sql return 1;
create table juntia_data.ungranted_probe(id bigint generated always as identity);
select ok(not has_function_privilege(r,'public.ungranted_probe()','EXECUTE'), '[V7] default EXECUTE cerrado ' || r) from unnest(array['anon','authenticated']) r;
select ok(not has_table_privilege(r,'juntia_data.ungranted_probe',p), '[V7] defaults tabla cerrados ' || r || '.' || p) from unnest(array['anon','authenticated']) r cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p;
select ok(not has_sequence_privilege(r,'juntia_data.ungranted_probe_id_seq',p), '[V7] defaults secuencia cerrados ' || r || '.' || p) from unnest(array['anon','authenticated']) r cross join unnest(array['USAGE','SELECT','UPDATE']) p;
select * from finish();
rollback;
