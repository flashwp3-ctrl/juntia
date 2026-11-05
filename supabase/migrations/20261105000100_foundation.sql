-- T013 / ADR-013: solo foundation. Sin tablas controladas ni funciones de dinero.
create schema juntia_data;
create schema juntia_private;
revoke all on schema juntia_data, juntia_private from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='juntia_writer') then
    create role juntia_writer nologin nobypassrls;
  end if;
end $$;
grant juntia_writer to postgres;
grant usage, create on schema juntia_private to juntia_writer;
grant usage on schema juntia_data to juntia_writer;

-- La concesión global de EXECUTE a PUBLIC también debe revocarse: una revocación
-- solo por esquema no elimina un grant global (PostgreSQL default privileges).
alter default privileges for role postgres revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public, juntia_data, juntia_private revoke all on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public, juntia_data, juntia_private revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public, juntia_data, juntia_private revoke all on sequences from public, anon, authenticated;
drop extension if exists pg_graphql;

-- ADR-013 §2.3: cuerpo SQL estándar resuelto al crear; sin grants sobre auth.
create function juntia_private.current_uid() returns uuid
language sql stable security invoker set search_path='' return auth.uid();
revoke all on function juntia_private.current_uid() from public, anon, authenticated;
grant execute on function juntia_private.current_uid() to juntia_writer;

create table juntia_data.profiles (
  user_id uuid primary key references auth.users(id),
  display_name text not null check (display_name=btrim(display_name) and char_length(display_name) between 1 and 60 and position(chr(10) in display_name)=0 and position(chr(13) in display_name)=0),
  theme text not null default 'system' check (theme in ('light','dark','system')),
  first_entry_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table juntia_data.categories (
  id text primary key,
  kind text not null check (kind in ('expense','income')),
  sort_order smallint not null,
  unique(id,kind)
);
insert into juntia_data.categories(id,kind,sort_order) values
  ('market','expense',1),('restaurants','expense',2),('home','expense',3),
  ('transport','expense',4),('health','expense',5),('entertainment','expense',6),
  ('shopping','expense',7),('services','expense',8),('income','income',9),('other','expense',10);
create table juntia_data.signup_allowlist (
  email text primary key check(email=lower(email)),
  added_at timestamptz not null default now()
);
alter table juntia_data.profiles enable row level security;
alter table juntia_data.categories enable row level security;
alter table juntia_data.signup_allowlist enable row level security;
revoke all on all tables in schema juntia_data from public, anon, authenticated;
revoke all on all sequences in schema juntia_data from public, anon, authenticated;
grant select on juntia_data.profiles, juntia_data.categories to authenticated;
grant select, insert on juntia_data.profiles to juntia_writer;
grant update(display_name,theme,first_entry_completed_at,updated_at) on juntia_data.profiles to juntia_writer;
grant select on juntia_data.categories to juntia_writer;
create policy profiles_read on juntia_data.profiles for select to authenticated, juntia_writer using(user_id=(select auth.uid()));
create policy profiles_insert on juntia_data.profiles for insert to juntia_writer with check(user_id=(select auth.uid()));
create policy profiles_update on juntia_data.profiles for update to juntia_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy categories_read on juntia_data.categories for select to authenticated, juntia_writer using(true);
grant usage on schema juntia_data, juntia_private to supabase_auth_admin;
grant select on juntia_data.signup_allowlist to supabase_auth_admin;
create policy allowlist_auth_read on juntia_data.signup_allowlist for select to supabase_auth_admin using(true);

create view public.my_profile with(security_invoker=true) as
  select display_name, theme, first_entry_completed_at is not null as first_entry_completed from juntia_data.profiles;
revoke all on public.my_profile from public, anon, authenticated;
grant select on public.my_profile to authenticated;

-- Definer necesario para escribir perfiles sin permitir escrituras directas.
-- El dueño writer no tiene BYPASSRLS ni es dueño de profiles: su RLS sigue vigente.
create function juntia_private.ensure_profile() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  uid uuid := juntia_private.current_uid();
  claims jsonb;
  name text;
  result jsonb;
begin
  if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
  claims := coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb);
  name := btrim(claims->'user_metadata'->>'display_name');
  if name is null or char_length(name) not between 1 and 60 or position(chr(10) in name)>0 or position(chr(13) in name)>0 then
    name := left(btrim(replace(replace(split_part(coalesce(claims->>'email','persona'),'@',1),chr(10),''),chr(13),'')),60);
    if name='' then name := 'persona'; end if;
  end if;
  insert into juntia_data.profiles(user_id,display_name) values(uid,name) on conflict(user_id) do nothing;
  select jsonb_build_object('display_name',p.display_name,'theme',p.theme,'first_entry_completed',p.first_entry_completed_at is not null)
    into result from juntia_data.profiles p where p.user_id=uid;
  return result;
end $$;
alter function juntia_private.ensure_profile() owner to juntia_writer;

-- Definer por el mismo camino de escritura de perfiles, con RLS de writer.
create function juntia_private.complete_first_entry() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid := juntia_private.current_uid(); result jsonb;
begin
  if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
  perform juntia_private.ensure_profile();
  update juntia_data.profiles set first_entry_completed_at=coalesce(first_entry_completed_at,now()), updated_at=now() where user_id=uid;
  select jsonb_build_object('display_name',p.display_name,'theme',p.theme,'first_entry_completed',p.first_entry_completed_at is not null)
    into result from juntia_data.profiles p where p.user_id=uid;
  return result;
end $$;
alter function juntia_private.complete_first_entry() owner to juntia_writer;

-- Definer para las columnas permitidas del nombre; no concede escritura de identidad.
create function juntia_private.update_display_name(p_display_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid := juntia_private.current_uid(); name text := btrim(p_display_name); result jsonb;
begin
  if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
  if name is null or char_length(name) not between 1 and 60 or position(chr(10) in name)>0 or position(chr(13) in name)>0 then
    raise exception using errcode='JT014',message='invalidDisplayName';
  end if;
  perform juntia_private.ensure_profile();
  update juntia_data.profiles set display_name=name,updated_at=now() where user_id=uid;
  select jsonb_build_object('display_name',p.display_name,'theme',p.theme,'first_entry_completed',p.first_entry_completed_at is not null)
    into result from juntia_data.profiles p where p.user_id=uid;
  return result;
end $$;
alter function juntia_private.update_display_name(text) owner to juntia_writer;

-- Definer para escribir el tema por el mismo camino limitado y con RLS.
create function juntia_private.set_theme(p_theme text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid := juntia_private.current_uid(); result jsonb;
begin
  if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
  if p_theme is null or p_theme not in ('light','dark','system') then raise exception using errcode='JT015',message='invalidTheme'; end if;
  perform juntia_private.ensure_profile();
  update juntia_data.profiles set theme=p_theme,updated_at=now() where user_id=uid;
  select jsonb_build_object('display_name',p.display_name,'theme',p.theme,'first_entry_completed',p.first_entry_completed_at is not null)
    into result from juntia_data.profiles p where p.user_id=uid;
  return result;
end $$;
alter function juntia_private.set_theme(text) owner to juntia_writer;

grant usage on schema juntia_private to authenticated;
revoke all on function juntia_private.ensure_profile(), juntia_private.complete_first_entry(), juntia_private.update_display_name(text), juntia_private.set_theme(text) from public, anon, authenticated;
grant execute on function juntia_private.ensure_profile(), juntia_private.complete_first_entry(), juntia_private.update_display_name(text), juntia_private.set_theme(text) to authenticated;

create function public.ensure_profile() returns jsonb language sql security invoker set search_path='' return juntia_private.ensure_profile();
create function public.complete_first_entry() returns jsonb language sql security invoker set search_path='' return juntia_private.complete_first_entry();
create function public.update_display_name(p_display_name text) returns jsonb language sql security invoker set search_path='' return juntia_private.update_display_name(p_display_name);
create function public.set_theme(p_theme text) returns jsonb language sql security invoker set search_path='' return juntia_private.set_theme(p_theme);
revoke all on function public.ensure_profile(), public.complete_first_entry(), public.update_display_name(text), public.set_theme(text) from public, anon, authenticated;
grant execute on function public.ensure_profile(), public.complete_first_entry(), public.update_display_name(text), public.set_theme(text) to authenticated;

create function juntia_private.before_user_created_hook(event jsonb) returns jsonb
language sql security invoker set search_path='' as $$
  select case when exists(select 1 from juntia_data.signup_allowlist where email=lower(event->'user'->>'email'))
    then '{}'::jsonb else '{"error":{"http_code":403,"message":"No fue posible completar el registro."}}'::jsonb end;
$$;
revoke all on function juntia_private.before_user_created_hook(jsonb) from public, anon, authenticated;
grant execute on function juntia_private.before_user_created_hook(jsonb) to supabase_auth_admin;
revoke create on schema juntia_private from juntia_writer;
