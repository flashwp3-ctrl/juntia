-- SPIKE (desechable, no se fusiona). Prototipo de ADR-013 §1-§2 y lista permitida (Q9).

-- Quién ejecuta la migración (para el punto e).
create table public._spike_migration_probe as
  select current_user::text as cu, session_user::text as su,
         (select rolsuper from pg_roles where rolname = current_user) as is_super,
         (select rolbypassrls from pg_roles where rolname = current_user) as bypassrls,
         version() as pg_version;

create schema juntia_data;
create schema juntia_private;
revoke all on schema juntia_data from public, anon, authenticated;
revoke all on schema juntia_private from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'juntia_writer') then
    create role juntia_writer nologin nobypassrls;
  else
    raise notice 'SPIKE juntia_writer already existed (roles are cluster-wide)';
  end if;
end $$;
-- Necesario para "alter function ... owner to" (ver probe_e.sql: falla sin esto en PG17).
grant juntia_writer to postgres;
grant usage on schema juntia_data to juntia_writer;
grant usage, create on schema juntia_private to juntia_writer;

-- juntia_writer evalúa políticas con auth.uid(): necesita llegar a auth.uid().
do $$
begin
  begin
    execute 'grant usage on schema auth to juntia_writer';
    raise notice 'SPIKE grant usage on schema auth to juntia_writer: OK';
  exception when others then
    raise notice 'SPIKE grant usage on schema auth FAILED: % %', sqlstate, sqlerrm;
  end;
  begin
    execute 'grant execute on function auth.uid() to juntia_writer';
    raise notice 'SPIKE grant execute auth.uid() to juntia_writer: OK';
  exception when others then
    raise notice 'SPIKE grant execute auth.uid() FAILED: % %', sqlstate, sqlerrm;
  end;
end $$;

create table juntia_data.movements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  amount_minor bigint not null check (amount_minor > 0)
);
alter table juntia_data.movements enable row level security;
revoke all on table juntia_data.movements from public, anon, authenticated;
grant select on table juntia_data.movements to authenticated;
grant select, insert, update on table juntia_data.movements to juntia_writer;

create policy mv_select_auth on juntia_data.movements
  for select to authenticated using (owner_id = (select auth.uid()));
create policy mv_select_writer on juntia_data.movements
  for select to juntia_writer using (owner_id = (select auth.uid()));
create policy mv_insert_writer on juntia_data.movements
  for insert to juntia_writer with check (owner_id = (select auth.uid()));
create policy mv_update_writer on juntia_data.movements
  for update to juntia_writer using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Función que escribe: security definer, propiedad de juntia_writer.
create function juntia_private.add_movement(p_amount bigint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into juntia_data.movements (owner_id, amount_minor) values (v_uid, p_amount);
  return v_uid;
end $$;
alter function juntia_private.add_movement(bigint) owner to juntia_writer;

-- Variante (d): intenta escribir a nombre de otra persona.
create function juntia_private.add_movement_for(p_owner uuid, p_amount bigint)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  insert into juntia_data.movements (owner_id, amount_minor) values (p_owner, p_amount);
  return p_owner;
end $$;
alter function juntia_private.add_movement_for(uuid, bigint) owner to juntia_writer;

-- Variante (d'): bloquear y actualizar una fila por id (select ... for update bajo RLS).
create function juntia_private.lock_and_bump(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_locked int; v_updated int;
begin
  perform 1 from juntia_data.movements where id = p_id for update;
  get diagnostics v_locked = row_count;
  update juntia_data.movements set amount_minor = amount_minor + 1 where id = p_id;
  get diagnostics v_updated = row_count;
  return jsonb_build_object('locked', v_locked, 'updated', v_updated, 'current_user', current_user::text);
end $$;
alter function juntia_private.lock_and_bump(uuid) owner to juntia_writer;

-- Identidad vista dentro de una función definer.
create function juntia_private.whoami_definer()
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'current_user', current_user::text,
    'auth_uid', auth.uid(),
    'claims', current_setting('request.jwt.claims', true),
    'claim_sub_legacy', current_setting('request.jwt.claim.sub', true));
$$;
alter function juntia_private.whoami_definer() owner to juntia_writer;

revoke all on function juntia_private.add_movement(bigint) from public, anon, authenticated;
revoke all on function juntia_private.add_movement_for(uuid, bigint) from public, anon, authenticated;
revoke all on function juntia_private.lock_and_bump(uuid) from public, anon, authenticated;
revoke all on function juntia_private.whoami_definer() from public, anon, authenticated;
grant usage on schema juntia_private to authenticated;
grant execute on function juntia_private.add_movement(bigint) to authenticated;
grant execute on function juntia_private.add_movement_for(uuid, bigint) to authenticated;
grant execute on function juntia_private.lock_and_bump(uuid) to authenticated;
grant execute on function juntia_private.whoami_definer() to authenticated;

-- Funciones de entrada en public: security invoker.
create function public.spike_add_movement(p_amount bigint)
returns uuid language sql security invoker set search_path = '' as $$
  select juntia_private.add_movement(p_amount);
$$;
create function public.spike_add_movement_for(p_owner uuid, p_amount bigint)
returns uuid language sql security invoker set search_path = '' as $$
  select juntia_private.add_movement_for(p_owner, p_amount);
$$;
create function public.spike_lock_and_bump(p_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select juntia_private.lock_and_bump(p_id);
$$;
create function public.spike_whoami()
returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'current_user', current_user::text,
    'auth_uid', auth.uid(),
    'claims', current_setting('request.jwt.claims', true),
    'claim_sub_legacy', current_setting('request.jwt.claim.sub', true),
    'definer', juntia_private.whoami_definer());
$$;
revoke all on function public.spike_add_movement(bigint) from public, anon;
revoke all on function public.spike_add_movement_for(uuid, bigint) from public, anon;
revoke all on function public.spike_lock_and_bump(uuid) from public, anon;
revoke all on function public.spike_whoami() from public, anon;
grant execute on function public.spike_add_movement(bigint) to authenticated;
grant execute on function public.spike_add_movement_for(uuid, bigint) to authenticated;
grant execute on function public.spike_lock_and_bump(uuid) to authenticated;
grant execute on function public.spike_whoami() to authenticated;

-- Vista de lectura: security_invoker, importe como texto.
create view public.spike_movements with (security_invoker = true) as
  select id, owner_id, amount_minor::text as amount_minor from juntia_data.movements;
revoke all on public.spike_movements from public, anon, authenticated;
grant select on public.spike_movements to authenticated;

-- Lista permitida del registro (Q9) + hook Before User Created.
create table juntia_data.signup_allowlist (email text primary key);
alter table juntia_data.signup_allowlist enable row level security;
revoke all on table juntia_data.signup_allowlist from public, anon, authenticated;
insert into juntia_data.signup_allowlist (email) values
  ('alice@spike.test'), ('bob@spike.test'), ('carol@spike.test');

create function juntia_private.before_user_created_hook(event jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_email text := lower(event -> 'user' ->> 'email');
begin
  if v_email is not null and exists (
       select 1 from juntia_data.signup_allowlist a where a.email = v_email) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'No fue posible completar el registro.'));
end $$;
revoke all on function juntia_private.before_user_created_hook(jsonb) from public, anon, authenticated;
grant usage on schema juntia_private to supabase_auth_admin;
grant usage on schema juntia_data to supabase_auth_admin;
grant execute on function juntia_private.before_user_created_hook(jsonb) to supabase_auth_admin;
grant select on table juntia_data.signup_allowlist to supabase_auth_admin;
create policy allowlist_auth_admin on juntia_data.signup_allowlist
  for select to supabase_auth_admin using (true);

-- ===== Run 2: juntia_writer no tiene (ni puede recibir) usage sobre el esquema auth =====
-- Variante H (helper): función SQL con cuerpo estándar (RETURN expr): se resuelve al crearla, guarda
-- el OID de auth.uid() y en ejecución solo exige EXECUTE (concedido a PUBLIC), no USAGE sobre auth.
create function juntia_private.current_uid()
returns uuid language sql stable security invoker
return auth.uid();
revoke all on function juntia_private.current_uid() from public, anon, authenticated;
grant execute on function juntia_private.current_uid() to juntia_writer, authenticated;

create function juntia_private.add_movement_v2(p_amount bigint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := juntia_private.current_uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into juntia_data.movements (owner_id, amount_minor) values (v_uid, p_amount);
  return v_uid;
end $$;
alter function juntia_private.add_movement_v2(bigint) owner to juntia_writer;

-- Variante C (claims): leer el claim directamente, sin tocar el esquema auth.
create function juntia_private.add_movement_v3(p_amount bigint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into juntia_data.movements (owner_id, amount_minor) values (v_uid, p_amount);
  return v_uid;
end $$;
alter function juntia_private.add_movement_v3(bigint) owner to juntia_writer;

create function juntia_private.whoami_definer_v2()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  return jsonb_build_object(
    'current_user', current_user::text,
    'current_uid_helper', juntia_private.current_uid(),
    'claims', current_setting('request.jwt.claims', true),
    'claim_sub_legacy', current_setting('request.jwt.claim.sub', true));
end $$;
alter function juntia_private.whoami_definer_v2() owner to juntia_writer;

revoke all on function juntia_private.add_movement_v2(bigint) from public, anon, authenticated;
revoke all on function juntia_private.add_movement_v3(bigint) from public, anon, authenticated;
revoke all on function juntia_private.whoami_definer_v2() from public, anon, authenticated;
grant execute on function juntia_private.add_movement_v2(bigint) to authenticated;
grant execute on function juntia_private.add_movement_v3(bigint) to authenticated;
grant execute on function juntia_private.whoami_definer_v2() to authenticated;

create function public.spike_add_movement_v2(p_amount bigint)
returns uuid language sql security invoker set search_path = '' as $$
  select juntia_private.add_movement_v2(p_amount);
$$;
create function public.spike_add_movement_v3(p_amount bigint)
returns uuid language sql security invoker set search_path = '' as $$
  select juntia_private.add_movement_v3(p_amount);
$$;
create function public.spike_whoami_v2()
returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'invoker_current_user', current_user::text,
    'invoker_auth_uid', auth.uid(),
    'invoker_role_setting', current_setting('role', true),
    'claims', current_setting('request.jwt.claims', true),
    'claim_sub_legacy', current_setting('request.jwt.claim.sub', true),
    'definer', juntia_private.whoami_definer_v2());
$$;
revoke all on function public.spike_add_movement_v2(bigint) from public, anon;
revoke all on function public.spike_add_movement_v3(bigint) from public, anon;
revoke all on function public.spike_whoami_v2() from public, anon;
grant execute on function public.spike_add_movement_v2(bigint) to authenticated;
grant execute on function public.spike_add_movement_v3(bigint) to authenticated;
grant execute on function public.spike_whoami_v2() to authenticated;