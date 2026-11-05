-- SPIKE: qué exige "alter function ... owner to <rol propio>" (ADR-013 [V] 1, punto e).
\set ON_ERROR_STOP 0
\set VERBOSITY verbose
\echo '== e.0 who am I / role attributes'
select current_user, session_user, version();
show createrole_self_grant;
select rolname, rolsuper, rolcreaterole, rolbypassrls, rolinherit, rolcanlogin
  from pg_roles
 where rolname in ('postgres','supabase_admin','juntia_writer','authenticated','anon','supabase_auth_admin','service_role')
 order by rolname;
\echo '== e.0b who ran the migration (table created inside the migration)'
select * from public._spike_migration_probe;

\echo '== e.1 fresh probe role + schema + function created by postgres'
create role spike_probe_owner nologin nobypassrls;
create schema spike_probe;
create function spike_probe.f() returns int language sql as 'select 1';
select r.rolname as role, m.admin_option, m.inherit_option, m.set_option
  from pg_auth_members m join pg_roles r on r.oid = m.roleid
 where m.member = 'postgres'::regrole and r.rolname = 'spike_probe_owner';

\echo '== e.2 alter owner WITHOUT explicit membership and WITHOUT create on schema'
alter function spike_probe.f() owner to spike_probe_owner;

\echo '== e.3 grant spike_probe_owner to postgres; retry (still no create on schema)'
grant spike_probe_owner to postgres;
select r.rolname as role, m.admin_option, m.inherit_option, m.set_option
  from pg_auth_members m join pg_roles r on r.oid = m.roleid
 where m.member = 'postgres'::regrole and r.rolname = 'spike_probe_owner';
alter function spike_probe.f() owner to spike_probe_owner;

\echo '== e.4 grant create on schema spike_probe to spike_probe_owner; retry'
grant create on schema spike_probe to spike_probe_owner;
alter function spike_probe.f() owner to spike_probe_owner;
select p.proname, pg_get_userbyid(p.proowner) as owner
  from pg_proc p where p.pronamespace = 'spike_probe'::regnamespace;

\echo '== e.5 after transfer: can create be revoked again without breaking the function?'
revoke create on schema spike_probe from spike_probe_owner;
select spike_probe.f() as still_callable;

\echo '== e.6 real juntia_private functions: owner, secdef, config'
select n.nspname, p.proname, pg_get_userbyid(p.proowner) as owner, p.prosecdef, p.proconfig
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('juntia_private','public') and (p.proname like 'spike_%' or n.nspname = 'juntia_private')
 order by 1, 2;
select r.rolname as role, m.admin_option, m.inherit_option, m.set_option
  from pg_auth_members m join pg_roles r on r.oid = m.roleid
 where m.member = 'postgres'::regrole and r.rolname = 'juntia_writer';
\echo '== e.7 juntia_writer reachability of auth.uid()'
select has_schema_privilege('juntia_writer','auth','usage') as writer_usage_auth,
       has_function_privilege('juntia_writer','auth.uid()','execute') as writer_exec_uid,
       has_schema_privilege('public','auth','usage') as public_usage_auth;
\echo '== e.7b direct attempt (outside the DO block) to grant usage on auth to juntia_writer'
grant usage on schema auth to juntia_writer;
\echo '== e.7c helper with SQL-standard body (RETURN auth.uid()): prosqlbody set?'
select proname, prosqlbody is not null as has_sqlbody, pg_get_userbyid(proowner) as owner
  from pg_proc where proname = 'current_uid' and pronamespace = 'juntia_private'::regnamespace;
select n.nspname, nspacl from pg_namespace n where nspname in ('auth','juntia_data','juntia_private');
select proname, proacl from pg_proc where oid = 'auth.uid'::regproc;

drop schema spike_probe cascade;
drop role spike_probe_owner;
