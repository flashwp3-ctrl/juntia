-- SPIKE: forma del claim (ADR-013 [V] 9) y barreras en SQL plano (1c, 1d, 1f).
-- psql -v uidA=... -v uidB=... -v claimsA='{"sub":...}'
\set ON_ERROR_STOP 0
\set VERBOSITY default
\echo '== 2.0 auth.uid() definition in this stack'
select pg_get_functiondef('auth.uid'::regproc);

\echo '== 2.1 set local request.jwt.claim.sub (legacy, single claim)'
begin;
set local role authenticated;
set local request.jwt.claim.sub = :'uidA';
select auth.uid() as uid_via_claim_sub,
       current_setting('request.jwt.claims', true) as claims_setting;
rollback;

\echo '== 2.2 set local "request.jwt.claims" = json'
begin;
set local role authenticated;
set local "request.jwt.claims" = :'claimsA';
select auth.uid() as uid_via_claims_json;
rollback;

\echo '== 2.3 set_config(request.jwt.claims, json, true)'
begin;
set local role authenticated;
select set_config('request.jwt.claims', :'claimsA', true) is not null as set;
select auth.uid() as uid_via_set_config;
rollback;

\echo '== 1c.0 effective privileges anon/authenticated on juntia_data / juntia_private'
select grantee, table_schema, table_name, string_agg(privilege_type, ',' order by privilege_type) as privs
  from information_schema.role_table_grants
 where table_schema in ('juntia_data','juntia_private') and grantee in ('anon','authenticated','PUBLIC','juntia_writer')
 group by 1,2,3 order by 1,2,3;
select r.r as role, s.s as schema,
       has_schema_privilege(r.r, s.s, 'usage') as usage,
       has_schema_privilege(r.r, s.s, 'create') as "create"
  from (values ('anon'),('authenticated'),('juntia_writer')) r(r),
       (values ('public'),('juntia_data'),('juntia_private')) s(s)
 order by 1,2;

\echo '== 1c.1 authenticated + claims: direct INSERT into juntia_data.movements'
begin; set local role authenticated; set local "request.jwt.claims" = :'claimsA';
insert into juntia_data.movements (owner_id, amount_minor) values (:'uidA', 1);
rollback;
\echo '== 1c.2 direct UPDATE'
begin; set local role authenticated; set local "request.jwt.claims" = :'claimsA';
update juntia_data.movements set amount_minor = 2;
rollback;
\echo '== 1c.3 direct DELETE'
begin; set local role authenticated; set local "request.jwt.claims" = :'claimsA';
delete from juntia_data.movements;
rollback;
\echo '== 1c.4 direct TRUNCATE'
begin; set local role authenticated; set local "request.jwt.claims" = :'claimsA';
truncate juntia_data.movements;
rollback;
\echo '== 1c.5 INSERT/UPDATE/DELETE through the public view (simple views are auto-updatable)'
begin; set local role authenticated; set local "request.jwt.claims" = :'claimsA';
insert into public.spike_movements (owner_id) values (:'uidA');
rollback;
begin; set local role authenticated; set local "request.jwt.claims" = :'claimsA';
delete from public.spike_movements;
rollback;

\echo '== 1f.1 authenticated SELECT on table name directly (has SELECT, no USAGE on juntia_data)'
begin; set local role authenticated; set local "request.jwt.claims" = :'claimsA';
select count(*) from juntia_data.movements;
rollback;
\echo '== 1f.2 authenticated SELECT through security_invoker view without USAGE on juntia_data'
begin; set local role authenticated; set local "request.jwt.claims" = :'claimsA';
select id, owner_id, amount_minor, pg_typeof(amount_minor) from public.spike_movements;
rollback;
\echo '== 1f.3 view options in catalog'
select c.relname, c.reloptions from pg_class c where c.relname = 'spike_movements';

\echo '== 1d.1 writer fn called DIRECTLY by SQL as authenticated (no entry fn): own row'
begin; set local role authenticated; set local "request.jwt.claims" = :'claimsA';
select juntia_private.add_movement(777) = :'uidA'::uuid as returns_caller;
select count(*) as rows_visible_to_A from public.spike_movements;
rollback;
\echo '== 1d.2 writer fn variant DIRECTLY by SQL as authenticated: owner = other user (expect RLS error)'
begin; set local role authenticated; set local "request.jwt.claims" = :'claimsA';
select juntia_private.add_movement_for(:'uidB', 1);
rollback;
\echo '== 1d.3 set role juntia_writer directly (as postgres member): insert for other user'
begin; set local role juntia_writer; set local "request.jwt.claims" = :'claimsA';
insert into juntia_data.movements (owner_id, amount_minor) values (:'uidB', 1);
rollback;
\echo '== 1d.4 writer fn with NO claims (anonymous SQL as authenticated): expect not authenticated'
begin; set local role authenticated;
select juntia_private.add_movement(1);
rollback;
