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

-- T013: solo correos sintéticos; se añaden con la migración que crea la tabla.
insert into juntia_data.signup_allowlist(email) values
  ('sara@seed.test'),('tomas@seed.test'),('signup@seed.test');

-- 003 T009: fixture SQL compartido; solo postgres, sin ampliar permisos de la app.
-- Sentencias dinámicas permiten escribir el arnés antes de la migración.
create or replace function tests.seed_couple(p_group uuid, p_owner uuid, p_member uuid default null)
returns void language plpgsql set search_path='' as $$
begin
  execute 'insert into juntia_data.groups(id,owner_user_id,status,activated_at) values($1,$2,$3,$4)'
    using p_group,p_owner,case when p_member is null then 'provisional' else 'active' end,case when p_member is null then null else now() end;
  execute 'insert into juntia_data.group_members(group_id,user_id,role,status,join_order) values($1,$2,''owner'',''active'',1)' using p_group,p_owner;
  if p_member is not null then
    execute 'insert into juntia_data.group_members(group_id,user_id,role,status,join_order) values($1,$2,''member'',''active'',2)' using p_group,p_member;
  end if;
  execute 'insert into juntia_data.group_invitations(group_id,email,token_hash,status,expires_at,created_by,inviter_display_name,accepted_by,accepted_at) values($1,$2,encode(sha256($1::text::bytea),''hex''),$3,now()+interval ''7 days'',$4,''Sara'',$5,$6)'
    using p_group,coalesce((select email from auth.users where id=p_member),'invitee@seed.test'),case when p_member is null then 'pending' else 'accepted' end,p_owner,p_member,case when p_member is null then null else now() end;
end $$;
revoke all on function tests.seed_couple(uuid,uuid,uuid) from public,anon,authenticated;
