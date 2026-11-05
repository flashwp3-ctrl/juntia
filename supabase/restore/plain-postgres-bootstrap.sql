-- T027: mínimo de Auth, catálogo observado en el runner 42040320912 (CLI 2.121.0).
do $roles$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
  if not exists(select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
end $roles$;
create schema auth;
grant usage on schema auth to anon,authenticated,supabase_auth_admin;
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$;
create table auth.users (
  instance_id uuid,
  id uuid not null,
  aud character varying(255),
  role character varying(255),
  email character varying(255),
  encrypted_password character varying(255),
  email_confirmed_at timestamp with time zone,
  invited_at timestamp with time zone,
  confirmation_token character varying(255),
  confirmation_sent_at timestamp with time zone,
  recovery_token character varying(255),
  recovery_sent_at timestamp with time zone,
  email_change_token_new character varying(255),
  email_change character varying(255),
  email_change_sent_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  phone text default NULL::character varying,
  phone_confirmed_at timestamp with time zone,
  phone_change text default ''::character varying,
  phone_change_token character varying(255) default ''::character varying,
  phone_change_sent_at timestamp with time zone,
  confirmed_at timestamp with time zone generated always as (LEAST(email_confirmed_at, phone_confirmed_at)) stored,
  email_change_token_current character varying(255) default ''::character varying,
  email_change_confirm_status smallint default 0,
  banned_until timestamp with time zone,
  reauthentication_token character varying(255) default ''::character varying,
  reauthentication_sent_at timestamp with time zone,
  is_sso_user boolean default false not null,
  deleted_at timestamp with time zone,
  is_anonymous boolean default false not null,
  primary key(id)
);
create table auth.identities (
  provider_id text not null,
  user_id uuid not null,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  email text generated always as (lower((identity_data ->> 'email'::text))) stored,
  id uuid default gen_random_uuid() not null,
  primary key(id)
);
create schema supabase_migrations;
create table supabase_migrations.schema_migrations(version text primary key);
