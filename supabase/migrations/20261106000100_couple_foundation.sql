-- 003 T010 / ADR-013 §5.1: rol de lectura, nunca heredado por la app.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='juntia_membership') then create role juntia_membership nologin nobypassrls; end if;
end $$;
grant juntia_membership to postgres;
grant usage on schema juntia_data,juntia_private to juntia_membership;
grant create on schema juntia_private to juntia_membership,juntia_writer;
create table juntia_data.groups (
 id uuid primary key default gen_random_uuid(), kind text not null default 'couple' check(kind='couple'),
 status text not null check(status in ('provisional','active','discarded')),
 owner_user_id uuid not null references auth.users(id), currency text not null default 'COP' check(currency='COP'),
 time_zone text not null default 'America/Bogota' check(time_zone='America/Bogota'),
 version integer not null default 1 check(version>0), created_at timestamptz not null default now(),
 activated_at timestamptz, discarded_at timestamptz,
 check((status='active')=(activated_at is not null)), check((status='discarded')=(discarded_at is not null))
);
create table juntia_data.group_members (
 group_id uuid not null references juntia_data.groups(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('owner','member')), status text not null check(status in ('active','released')),
 join_order smallint not null check(join_order in (1,2)), joined_at timestamptz not null default now(), released_at timestamptz,
 primary key(group_id,user_id), check((role='owner')=(join_order=1)), check((status='released')=(released_at is not null))
);
create unique index group_members_one_couple_per_person on juntia_data.group_members(user_id) where status='active';
create unique index group_members_max_two on juntia_data.group_members(group_id,join_order) where status='active';
create table juntia_data.group_invitations (
 id uuid primary key default gen_random_uuid(),group_id uuid not null references juntia_data.groups(id),
 email text not null check(email=lower(btrim(email))),token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
 status text not null check(status in ('pending','accepted','cancelled','replaced')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default(now()+interval '7 days'),
 created_by uuid not null references auth.users(id),inviter_display_name text not null,
 accepted_by uuid references auth.users(id),accepted_at timestamptz,replaced_by uuid references juntia_data.group_invitations(id),
 check((status='accepted')=(accepted_by is not null and accepted_at is not null)),
 check((status='replaced')=(replaced_by is not null)),check(expires_at=created_at+interval '7 days')
);
create unique index group_invitations_one_pending on juntia_data.group_invitations(group_id) where status='pending';
alter table juntia_data.groups enable row level security;
alter table juntia_data.group_members enable row level security;
alter table juntia_data.group_invitations enable row level security;
revoke all on juntia_data.groups,juntia_data.group_members,juntia_data.group_invitations from public,anon,authenticated;
grant select on juntia_data.groups,juntia_data.group_members,juntia_data.group_invitations to authenticated,juntia_membership;
grant select,insert,update on juntia_data.groups,juntia_data.group_members,juntia_data.group_invitations to juntia_writer;
create policy groups_membership_read on juntia_data.groups for select to juntia_membership using(true);
create policy members_membership_read on juntia_data.group_members for select to juntia_membership using(true);
create policy invitations_membership_read on juntia_data.group_invitations for select to juntia_membership using(true);
create function juntia_private.current_email() returns text language sql stable security invoker set search_path=''
return lower(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'email');
revoke all on function juntia_private.current_email() from public,anon,authenticated;
grant execute on function juntia_private.current_email(),juntia_private.current_uid() to juntia_writer,juntia_membership;

-- Auxiliares definer: evitan recursión leyendo solo las tres tablas de membresía con su rol de lectura.
create function juntia_private.is_group_member(p_group_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from juntia_data.group_members m join juntia_data.groups g on g.id=m.group_id
 where m.group_id=p_group_id and m.user_id=juntia_private.current_uid() and m.status='active' and g.status<>'discarded'); $$;
create function juntia_private.is_couple_member(p_group_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from juntia_data.group_members m join juntia_data.groups g on g.id=m.group_id
 where m.group_id=p_group_id and m.user_id=juntia_private.current_uid() and m.status='active' and g.status='active'); $$;
create function juntia_private.is_invited_to(p_group_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from juntia_data.group_invitations i join juntia_data.groups g on g.id=i.group_id
 where i.group_id=p_group_id and i.email=juntia_private.current_email() and i.status='pending' and g.status='provisional' and i.expires_at>now()); $$;
create function juntia_private.shares_couple_with(p_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from juntia_data.group_members a join juntia_data.group_members b on b.group_id=a.group_id join juntia_data.groups g on g.id=a.group_id
 where a.user_id=juntia_private.current_uid() and b.user_id=p_user_id and a.status='active' and b.status='active' and g.status='active'); $$;
alter function juntia_private.is_group_member(uuid) owner to juntia_membership;
alter function juntia_private.is_couple_member(uuid) owner to juntia_membership;
alter function juntia_private.is_invited_to(uuid) owner to juntia_membership;
alter function juntia_private.shares_couple_with(uuid) owner to juntia_membership;
revoke all on function juntia_private.is_group_member(uuid),juntia_private.is_couple_member(uuid),juntia_private.is_invited_to(uuid),juntia_private.shares_couple_with(uuid) from public,anon,authenticated;
grant execute on function juntia_private.is_group_member(uuid),juntia_private.is_couple_member(uuid),juntia_private.is_invited_to(uuid),juntia_private.shares_couple_with(uuid) to authenticated,juntia_writer;

create policy groups_read on juntia_data.groups for select to authenticated using(juntia_private.is_group_member(id));
-- Autorizado por el gestor: leer la raíz provisional propia permite insertar la
-- primera membresía. No hace visibles las descartadas ni cambia UPDATE.
create policy groups_writer_read on juntia_data.groups for select to juntia_writer using(
 juntia_private.is_group_member(id) or juntia_private.is_invited_to(id)
 or (owner_user_id=juntia_private.current_uid() and status='provisional'));
create policy groups_writer_insert on juntia_data.groups for insert to juntia_writer with check(owner_user_id=(select auth.uid()) and status='provisional');
create policy groups_writer_update on juntia_data.groups for update to juntia_writer
 using(owner_user_id=(select auth.uid()) or juntia_private.is_group_member(id) or juntia_private.is_invited_to(id))
 with check(owner_user_id=(select auth.uid()) or juntia_private.is_group_member(id) or juntia_private.is_invited_to(id));
create policy members_read on juntia_data.group_members for select to authenticated using(juntia_private.is_group_member(group_id));
create policy members_writer_read on juntia_data.group_members for select to juntia_writer using(user_id=(select auth.uid()) or juntia_private.is_group_member(group_id));
create policy members_writer_insert on juntia_data.group_members for insert to juntia_writer with check(user_id=(select auth.uid()) and
 ((role='owner' and join_order=1 and exists(select 1 from juntia_data.groups g where g.id=group_id and g.owner_user_id=(select auth.uid()) and g.status='provisional'))
 or (role='member' and join_order=2 and juntia_private.is_invited_to(group_id))));
create policy members_writer_update on juntia_data.group_members for update to juntia_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy invitations_read on juntia_data.group_invitations for select to authenticated using(juntia_private.is_group_member(group_id));
create policy invitations_writer_read on juntia_data.group_invitations for select to juntia_writer using(juntia_private.is_group_member(group_id) or email=juntia_private.current_email());
create policy invitations_writer_update on juntia_data.group_invitations for update to juntia_writer using(juntia_private.is_group_member(group_id) or email=juntia_private.current_email()) with check(juntia_private.is_group_member(group_id) or email=juntia_private.current_email());
create policy invitations_writer_insert on juntia_data.group_invitations for insert to juntia_writer with check(created_by=(select auth.uid()) and juntia_private.is_group_member(group_id));
drop policy profiles_read on juntia_data.profiles;
create policy profiles_read on juntia_data.profiles for select to authenticated,juntia_writer using(user_id=(select auth.uid()) or juntia_private.shares_couple_with(user_id));
-- F49-1: el filtro entra en la misma migración que amplía la lectura del perfil.
create or replace view public.my_profile with(security_invoker=true) as
 select display_name,theme,first_entry_completed_at is not null as first_entry_completed from juntia_data.profiles where user_id=(select auth.uid());
create view public.my_couple with(security_invoker=true) as
 select g.id as group_id,g.status,m.role,m.join_order,g.version,
 i.id as invitation_id,i.email as invitation_email,i.expires_at as invitation_expires_at,(i.expires_at<=now()) as invitation_expired
 from juntia_data.groups g join juntia_data.group_members m on m.group_id=g.id and m.user_id=(select auth.uid()) and m.status='active'
 left join juntia_data.group_invitations i on i.group_id=g.id and i.status='pending' and m.role='owner' and g.status='provisional'
 where g.status in ('provisional','active');
create view public.couple_members with(security_invoker=true) as
 select m.user_id,p.display_name,m.role,m.join_order from juntia_data.group_members m join juntia_data.groups g on g.id=m.group_id
 join juntia_data.profiles p on p.user_id=m.user_id where g.status='active' and m.status='active' and juntia_private.is_couple_member(g.id);
revoke all on public.my_couple,public.couple_members from public,anon,authenticated;
grant select on public.my_couple,public.couple_members to authenticated;

-- Trigger de solo lectura: el rol membership permite validar el estado final incluso
-- después de liberar la membresía. No recibe EXECUTE la app; no escribe ni elude RLS.
create function juntia_private.groups_guard_transition() returns trigger language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); allowed boolean:=false;
begin
 if old.status<>'provisional' or (to_jsonb(new)-array['status','version','activated_at','discarded_at']) is distinct from (to_jsonb(old)-array['status','version','activated_at','discarded_at']) or new.version<>old.version+1 then
  raise exception using errcode='JT119',message='invalidCoupleTransition';
 end if;
 if new.status='provisional' then
  allowed:=uid=old.owner_user_id and new.activated_at is not distinct from old.activated_at and new.discarded_at is not distinct from old.discarded_at;
 elsif new.status='discarded' then
  allowed:=uid=old.owner_user_id and not exists(select 1 from juntia_data.group_members where group_id=old.id and status='active' and user_id<>uid);
 elsif new.status='active' then
  allowed:=uid<>old.owner_user_id
    and (select count(*)=2 from juntia_data.group_members where group_id=old.id and status='active')
    and exists(select 1 from juntia_data.group_members where group_id=old.id and user_id=uid and join_order=2 and status='active')
    and exists(select 1 from juntia_data.group_members where group_id=old.id and user_id=old.owner_user_id and join_order=1 and status='active')
    and exists(select 1 from juntia_data.group_invitations where group_id=old.id and status='pending' and email=juntia_private.current_email() and expires_at>now());
 end if;
 if allowed is not true then raise exception using errcode='JT119',message='invalidCoupleTransition'; end if;
 return new;
end $$;
alter function juntia_private.groups_guard_transition() owner to juntia_membership;
revoke all on function juntia_private.groups_guard_transition() from public,anon,authenticated,juntia_writer;
create trigger groups_guard_transition before update on juntia_data.groups for each row execute function juntia_private.groups_guard_transition();

-- La misma lectura limitada del guard, sin escritura: al confirmar debe poder
-- comprobar también la invitación después de liberar a la propietaria.
create function juntia_private.groups_check_state() returns trigger language plpgsql security definer set search_path='' as $$
declare gid uuid; g juntia_data.groups; owner_count integer; member_count integer; member_id uuid;
begin
 if tg_table_name='groups' then gid:=new.id; else gid:=new.group_id; end if;
 select * into g from juntia_data.groups where id=gid;
 select count(*),count(*) filter(where user_id=g.owner_user_id and role='owner' and join_order=1)
 into member_count,owner_count from juntia_data.group_members where group_id=gid and status='active';
 if g.status='provisional' then
  if member_count<>1 or owner_count<>1 then raise exception using errcode='JT119',message='invalidCoupleTransition'; end if;
 elsif g.status='active' then
  select user_id into member_id from juntia_data.group_members where group_id=gid and status='active' and join_order=2 and role='member';
  if member_count<>2 or owner_count<>1 or member_id is null or not exists(select 1 from juntia_data.group_invitations where group_id=gid and status='accepted' and accepted_by=member_id)
    or (tg_table_name='groups' and tg_op='UPDATE' and old.status='provisional' and not exists(select 1 from juntia_data.group_invitations where group_id=gid and status='accepted' and accepted_by=member_id and accepted_at=transaction_timestamp())) then
   raise exception using errcode='JT119',message='invalidCoupleTransition';
  end if;
 elsif g.status='discarded' then
  if member_count<>0 or exists(select 1 from juntia_data.group_invitations where group_id=gid and status='pending') then raise exception using errcode='JT119',message='invalidCoupleTransition'; end if;
 else raise exception using errcode='JT119',message='invalidCoupleTransition';
 end if;
 return null;
end $$;
alter function juntia_private.groups_check_state() owner to juntia_membership;
revoke all on function juntia_private.groups_check_state() from public,anon,authenticated,juntia_writer;
create constraint trigger groups_check_state after insert or update on juntia_data.groups deferrable initially deferred for each row execute function juntia_private.groups_check_state();
create constraint trigger groups_check_state after insert or update on juntia_data.group_members deferrable initially deferred for each row execute function juntia_private.groups_check_state();
create constraint trigger groups_check_state after insert or update on juntia_data.group_invitations deferrable initially deferred for each row execute function juntia_private.groups_check_state();
-- Sin privilegios nuevos: el guard de membresía solo lee las tres tablas autorizadas.
-- Definer de solo lectura para ver la raíz descartada, que writer ya no ve al liberar.
create function juntia_private.members_guard_update() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status<>'active' or new.status<>'released' or
 (to_jsonb(new)-array['status','released_at']) is distinct from (to_jsonb(old)-array['status','released_at']) or
 not exists(select 1 from juntia_data.groups where id=old.group_id and status='discarded') then
  raise exception using errcode='JT119',message='invalidCoupleTransition';
 end if;
 return new;
end $$;
alter function juntia_private.members_guard_update() owner to juntia_membership;
revoke all on function juntia_private.members_guard_update() from public,anon,authenticated,juntia_writer;
create trigger members_guard_update before update on juntia_data.group_members for each row execute function juntia_private.members_guard_update();
revoke create on schema juntia_private from juntia_membership,juntia_writer;
