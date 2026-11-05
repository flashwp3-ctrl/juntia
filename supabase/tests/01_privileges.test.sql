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
  '["complete_first_entry","ensure_profile","set_theme","update_display_name"]'::jsonb, '[V7] lista exacta de entradas authenticated');
select is((select jsonb_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='juntia_private' and has_function_privilege('authenticated',p.oid,'EXECUTE')),
  '["complete_first_entry","ensure_profile","set_theme","update_display_name"]'::jsonb, '[V7] solo las cuatro implementaciones accesibles por SQL');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','juntia_private') and has_function_privilege('anon',p.oid,'EXECUTE')), 0::bigint, '[V7] anon sin funciones');
select ok(not has_sequence_privilege(r,c.oid,p), '[V7] sin secuencias ' || r || '.' || c.relname || '.' || p)
from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join unnest(array['anon','authenticated']) r cross join unnest(array['USAGE','SELECT','UPDATE']) p
where c.relkind='S' and n.nspname in ('public','juntia_data','juntia_private');
-- Las concesiones automáticas no vuelven a abrir objetos nuevos.
create function public.ungranted_probe() returns integer language sql return 1;
create table juntia_data.ungranted_probe(id bigint generated always as identity);
select ok(not has_function_privilege(r,'public.ungranted_probe()','EXECUTE'), '[V7] default EXECUTE cerrado ' || r) from unnest(array['anon','authenticated']) r;
select ok(not has_table_privilege(r,'juntia_data.ungranted_probe',p), '[V7] defaults tabla cerrados ' || r || '.' || p) from unnest(array['anon','authenticated']) r cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p;
select ok(not has_sequence_privilege(r,'juntia_data.ungranted_probe_id_seq',p), '[V7] defaults secuencia cerrados ' || r || '.' || p) from unnest(array['anon','authenticated']) r cross join unnest(array['USAGE','SELECT','UPDATE']) p;
select * from finish();
rollback;
