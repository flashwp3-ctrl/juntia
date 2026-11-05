-- T003: auxiliares propias, solo en el Supabase efímero del runner.
create schema if not exists tests;
create or replace function tests.create_user(p_id uuid, p_email text)
returns void language sql set search_path = '' as $$
  insert into auth.users (id, email, raw_user_meta_data)
  values (p_id, p_email, '{"display_name":"Persona de prueba"}'::jsonb);
$$;
create or replace function tests.authenticate_as(p_id uuid)
returns void language plpgsql set search_path = '' as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
grant usage on schema tests to authenticated;
grant execute on function tests.authenticate_as(uuid) to authenticated;
