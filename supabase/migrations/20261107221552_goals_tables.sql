-- 004 T014. Solo tablas, invariantes y proyecciones; sin RPC de escritura.
create table juntia_data.savings_goals (
 id uuid primary key default gen_random_uuid(),owner_user_id uuid references auth.users(id),group_id uuid references juntia_data.groups(id),
 name text not null check(name=btrim(name) and char_length(name) between 1 and 60),
 goal_type text not null check(goal_type in ('travel','home','wedding','vehicle','education','emergency','other')),
 target_minor bigint not null check(target_minor>0 and target_minor%100=0 and target_minor<=99999999900),
 currency text not null default 'COP' check(currency='COP'),target_month date check(extract(day from target_month)=1),
 status text not null default 'active' check(status in ('active','completed','archived')),version integer not null default 1 check(version>0),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),
 updated_by uuid references auth.users(id),updated_at timestamptz not null default clock_timestamp(),completed_at timestamptz,archived_at timestamptz,
 check((owner_user_id is not null)<>(group_id is not null)),check((status='completed')=(completed_at is not null)),check((status='archived')=(archived_at is not null))
);
create index savings_goals_owner on juntia_data.savings_goals(owner_user_id,id);
create index savings_goals_group on juntia_data.savings_goals(group_id,id);
create table juntia_data.goal_ledger_entries (
 id uuid primary key default gen_random_uuid(),goal_id uuid not null references juntia_data.savings_goals(id),
 kind text not null check(kind in ('contribution','withdrawal','usage','void')),
 member_user_id uuid references auth.users(id),amount_minor bigint check(amount_minor>0 and amount_minor%100=0 and amount_minor<=99999999900),
 entry_date date,funding_mode text check(funding_mode in ('reserved','transferred_declared')),reason text,
 transaction_id uuid references juntia_data.transactions(id),confirmation_id uuid,
 voids_entry_id uuid unique references juntia_data.goal_ledger_entries(id),created_by uuid not null references auth.users(id),
 created_at timestamptz not null default clock_timestamp(),unique(id,kind),
 check((kind in ('contribution','withdrawal'))=(member_user_id is not null)),
 check(member_user_id is null or member_user_id=created_by),
 check((kind in ('contribution','withdrawal'))=(entry_date is not null)),
 check((kind='contribution')=(funding_mode is not null)),
 check((kind='usage')=(transaction_id is not null)),check(confirmation_id is null or kind='usage'),
 check((kind='void')=(voids_entry_id is not null)),check((kind='void')=(amount_minor is null)),
 check((kind='contribution' or kind='usage') and reason is null or kind='withdrawal' and reason=btrim(reason) and char_length(reason) between 1 and 140
  or kind='void' and reason in ('undo','void','remove_usage','expense_voided')),
 check(kind not in ('withdrawal','void') or reason is not null)
);
create index goal_ledger_cursor on juntia_data.goal_ledger_entries(goal_id,entry_date desc,created_at desc,id desc);
create index goal_ledger_transaction on juntia_data.goal_ledger_entries(transaction_id,goal_id) where kind='usage';
create table juntia_data.goal_usage_allocations (
 entry_id uuid not null,entry_kind text not null default 'usage' check(entry_kind='usage'),
 member_user_id uuid not null references auth.users(id),amount_minor bigint not null check(amount_minor>0 and amount_minor%100=0),
 primary key(entry_id,member_user_id),foreign key(entry_id,entry_kind) references juntia_data.goal_ledger_entries(id,kind)
);
create table juntia_data.goal_usage_confirmations (
 id uuid primary key default gen_random_uuid(),goal_id uuid not null references juntia_data.savings_goals(id),transaction_id uuid not null references juntia_data.transactions(id),
 requested_by uuid not null references auth.users(id),member_user_id uuid not null references auth.users(id),
 amount_minor bigint not null check(amount_minor>0 and amount_minor%100=0 and amount_minor<=99999999900),
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
 usage_entry_id uuid references juntia_data.goal_ledger_entries(id),resolved_by uuid references auth.users(id),resolved_at timestamptz,
 version integer not null default 1 check(version>0),created_at timestamptz not null default clock_timestamp(),
 check(requested_by<>member_user_id),check((status='approved')=(usage_entry_id is not null)),
 check((status='pending')=(resolved_by is null)),check((status='pending')=(resolved_at is null))
);
alter table juntia_data.goal_ledger_entries add foreign key(confirmation_id) references juntia_data.goal_usage_confirmations(id);
create unique index goal_usage_confirmations_one_pending on juntia_data.goal_usage_confirmations(transaction_id) where status='pending';
create index goal_usage_confirmations_cursor on juntia_data.goal_usage_confirmations(created_at desc,id desc);
create index goal_usage_confirmations_goal on juntia_data.goal_usage_confirmations(goal_id,status,id);

alter table juntia_data.savings_goals enable row level security;
alter table juntia_data.goal_ledger_entries enable row level security;
alter table juntia_data.goal_usage_allocations enable row level security;
alter table juntia_data.goal_usage_confirmations enable row level security;
revoke all on juntia_data.savings_goals,juntia_data.goal_ledger_entries,juntia_data.goal_usage_allocations,juntia_data.goal_usage_confirmations from public,anon,authenticated;
grant select on juntia_data.savings_goals,juntia_data.goal_ledger_entries,juntia_data.goal_usage_allocations,juntia_data.goal_usage_confirmations to authenticated;
grant select,insert on juntia_data.savings_goals,juntia_data.goal_ledger_entries,juntia_data.goal_usage_allocations,juntia_data.goal_usage_confirmations to juntia_writer;
grant update(name,goal_type,target_minor,target_month,status,version,updated_by,updated_at,completed_at,archived_at) on juntia_data.savings_goals to juntia_writer;
grant update(status,usage_entry_id,resolved_by,resolved_at,version) on juntia_data.goal_usage_confirmations to juntia_writer;
create policy savings_goals_read on juntia_data.savings_goals for select to authenticated,juntia_writer
 using(owner_user_id=(select auth.uid()) or juntia_private.is_couple_member(group_id));
create policy savings_goals_insert on juntia_data.savings_goals for insert to juntia_writer
 with check(created_by=(select auth.uid()) and (owner_user_id=(select auth.uid()) or juntia_private.is_couple_member(group_id)));
create policy savings_goals_update on juntia_data.savings_goals for update to juntia_writer
 using(owner_user_id=(select auth.uid()) or juntia_private.is_couple_member(group_id))
 with check(owner_user_id=(select auth.uid()) or juntia_private.is_couple_member(group_id));
create policy goal_ledger_read on juntia_data.goal_ledger_entries for select to authenticated,juntia_writer
 using(exists(select 1 from juntia_data.savings_goals g where g.id=goal_id));
create policy goal_ledger_insert on juntia_data.goal_ledger_entries for insert to juntia_writer
 with check(created_by=(select auth.uid()) and (member_user_id is null or member_user_id=(select auth.uid())) and exists(select 1 from juntia_data.savings_goals g where g.id=goal_id));
create policy goal_allocations_read on juntia_data.goal_usage_allocations for select to authenticated,juntia_writer
 using(exists(select 1 from juntia_data.goal_ledger_entries e where e.id=entry_id));
create policy goal_allocations_insert on juntia_data.goal_usage_allocations for insert to juntia_writer
 with check(exists(select 1 from juntia_data.goal_ledger_entries e where e.id=entry_id));
create policy goal_confirmations_read on juntia_data.goal_usage_confirmations for select to authenticated,juntia_writer
 using(exists(select 1 from juntia_data.savings_goals g where g.id=goal_id));
create policy goal_confirmations_insert on juntia_data.goal_usage_confirmations for insert to juntia_writer
 with check(requested_by=(select auth.uid()) and exists(select 1 from juntia_data.savings_goals g where g.id=goal_id));
create policy goal_confirmations_update on juntia_data.goal_usage_confirmations for update to juntia_writer
 using(exists(select 1 from juntia_data.savings_goals g where g.id=goal_id))
 with check(exists(select 1 from juntia_data.savings_goals g where g.id=goal_id));

create trigger savings_goals_check_group before insert on juntia_data.savings_goals for each row execute function juntia_private.planning_check_group();
create trigger goal_ledger_append_only before update or delete on juntia_data.goal_ledger_entries for each row execute function juntia_private.planning_append_only();
create trigger goal_allocations_append_only before update or delete on juntia_data.goal_usage_allocations for each row execute function juntia_private.planning_append_only();
create trigger goal_ledger_no_truncate before truncate on juntia_data.goal_ledger_entries for each statement execute function juntia_private.planning_append_only();
create trigger goal_allocations_no_truncate before truncate on juntia_data.goal_usage_allocations for each statement execute function juntia_private.planning_append_only();

-- Invoker interno, solo writer: no amplía lectura ni se usa desde políticas (R6).
create function juntia_private.goal_member_available(p_goal uuid,p_member uuid) returns numeric language sql stable security invoker set search_path='' as $$
 select coalesce((select sum(case when e.kind='contribution' then e.amount_minor else -e.amount_minor end)
  from juntia_data.goal_ledger_entries e where e.goal_id=p_goal and e.member_user_id=p_member and e.kind in ('contribution','withdrawal')
  and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id)),0)
 -coalesce((select sum(a.amount_minor) from juntia_data.goal_usage_allocations a join juntia_data.goal_ledger_entries e on e.id=a.entry_id
  where e.goal_id=p_goal and a.member_user_id=p_member and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id)),0)
$$;
revoke all on function juntia_private.goal_member_available(uuid,uuid) from public,anon,authenticated;
grant execute on function juntia_private.goal_member_available(uuid,uuid) to juntia_writer;

create function juntia_private.goals_guard_transition() returns trigger language plpgsql security invoker set search_path='' as $$
declare balance numeric;
begin
 if row(new.id,new.owner_user_id,new.group_id,new.currency,new.created_by,new.created_at) is distinct from row(old.id,old.owner_user_id,old.group_id,old.currency,old.created_by,old.created_at) then
  raise exception using errcode='JT013',message='immutableField';
 end if;
 if new.status is not distinct from old.status then return new; end if;
 if new.status='archived' and old.status in ('active','completed') then
  select coalesce(sum(case when e.kind='contribution' then e.amount_minor else -e.amount_minor end),0) into balance
   from juntia_data.goal_ledger_entries e where e.goal_id=old.id and e.kind<>'void' and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id);
  if balance<>0 or exists(select 1 from juntia_data.goal_usage_confirmations c where c.goal_id=old.id and c.status='pending') then raise exception using errcode='JT214',message='goalTransitionNotAllowed'; end if;
 elsif new.status='completed' and old.status='active' then null;
 elsif new.status='active' and old.status='archived' and exists(
  select 1 from juntia_data.goal_ledger_entries v join juntia_data.goal_ledger_entries u on u.id=v.voids_entry_id
   -- Un lives_ok/savepoint usa un subxid distinto del xid superior. Una fila
   -- visible cuyo xid sigue en curso es propia de esta transacción (también subxid).
   where v.goal_id=old.id and u.kind='usage' and pg_xact_status(v.xmin::text::xid8)='in progress'
 ) then null;
 else raise exception using errcode='JT214',message='goalTransitionNotAllowed'; end if;
 return new;
end $$;
revoke all on function juntia_private.goals_guard_transition() from public,anon,authenticated,juntia_writer;
create trigger goals_guard_transition before update on juntia_data.savings_goals for each row execute function juntia_private.goals_guard_transition();

create function juntia_private.goal_check_expense(p_goal uuid,p_transaction uuid) returns void language plpgsql security invoker set search_path='' as $$
declare g juntia_data.savings_goals;t juntia_data.transactions;
begin
 select * into g from juntia_data.savings_goals where id=p_goal;
 select * into t from juntia_data.transactions where id=p_transaction;
 if t.id is null or t.type<>'expense' or t.status<>'active' or t.currency is distinct from g.currency or t.owner_user_id is distinct from g.owner_user_id or t.group_id is distinct from g.group_id then
  raise exception using errcode='JT203',message='goalContextMismatch';
 end if;
 if exists(select 1 from juntia_data.goal_ledger_entries e where e.transaction_id=t.id and e.goal_id<>g.id)
  or exists(select 1 from juntia_data.goal_usage_confirmations c where c.transaction_id=t.id and c.goal_id<>g.id) then
  raise exception using errcode='JT224',message='oneGoalPerExpense';
 end if;
end $$;
revoke all on function juntia_private.goal_check_expense(uuid,uuid) from public,anon,authenticated;
grant execute on function juntia_private.goal_check_expense(uuid,uuid) to juntia_writer;

create function juntia_private.goal_ledger_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare g juntia_data.savings_goals;original juntia_data.goal_ledger_entries;available numeric;
begin
 -- BEFORE: el mismo bloqueo que las RPC; nunca un saldo comprobado solo al final.
 -- El primer bloqueo de un uso es el movimiento (nivel 3), antes de la meta.
 -- También serializa dos INSERT directos que pretendan metas distintas para él.
 if new.kind='usage' then
  perform id from juntia_data.transactions where id=new.transaction_id for update;
 elsif new.kind='void' then
  select * into original from juntia_data.goal_ledger_entries where id=new.voids_entry_id;
  if original.kind='usage' then perform id from juntia_data.transactions where id=original.transaction_id for update;end if;
 end if;
 select * into g from juntia_data.savings_goals where id=new.goal_id for update;
 if not found then raise exception using errcode='JT201',message='goalNotFound'; end if;
 if new.kind='void' then
  select * into original from juntia_data.goal_ledger_entries where id=new.voids_entry_id;
  if original.id is null or original.kind='void' then raise exception using errcode='JT206',message='entryNotVoidable'; end if;
  if original.goal_id<>g.id then raise exception using errcode='JT203',message='goalContextMismatch'; end if;
  if exists(select 1 from juntia_data.goal_ledger_entries where voids_entry_id=original.id) then raise exception using errcode='JT207',message='entryAlreadyVoided'; end if;
 end if;
 if g.status='archived' and not (new.kind='void' and original.kind='usage') or new.kind='contribution' and g.status<>'active' then
  raise exception using errcode='JT202',message='goalNotOpen';
 end if;
 if new.kind in ('contribution','withdrawal') then
  if new.entry_date>(now() at time zone 'America/Bogota')::date or new.entry_date<(g.created_at at time zone 'America/Bogota')::date then raise exception using errcode='JT208',message='invalidEntryDate'; end if;
  if g.owner_user_id is not null and new.member_user_id<>g.owner_user_id or g.group_id is not null and not exists(select 1 from juntia_data.group_members m where m.group_id=g.group_id and m.user_id=new.member_user_id and m.status='active') then raise exception using errcode='JT111',message='notCoupleMember'; end if;
 end if;
 if new.kind='withdrawal' then
  available:=juntia_private.goal_member_available(g.id,new.member_user_id);
  if available<new.amount_minor then raise exception using errcode='JT220',message='goalNegative'; end if;
 elsif new.kind='void' and original.kind='contribution' then
  available:=juntia_private.goal_member_available(g.id,original.member_user_id);
  if available<original.amount_minor then raise exception using errcode='JT220',message='goalNegative'; end if;
 elsif new.kind='usage' then perform juntia_private.goal_check_expense(g.id,new.transaction_id);
 end if;
 return new;
end $$;
revoke all on function juntia_private.goal_ledger_guard() from public,anon,authenticated,juntia_writer;
create trigger goal_ledger_guard before insert on juntia_data.goal_ledger_entries for each row execute function juntia_private.goal_ledger_guard();

create function juntia_private.goal_allocation_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare e juntia_data.goal_ledger_entries;g juntia_data.savings_goals;used numeric;expense_amount bigint;
begin
 select * into e from juntia_data.goal_ledger_entries where id=new.entry_id;
 -- La FK compuesta da el error de tipo para una asignación que no es de uso.
 if e.kind is distinct from 'usage' or new.entry_kind is distinct from 'usage' then return new; end if;
 select * into g from juntia_data.savings_goals where id=e.goal_id for update;
 if g.status='archived' then raise exception using errcode='JT202',message='goalNotOpen'; end if;
 if new.member_user_id is distinct from e.created_by then raise exception using errcode='JT223',message='invalidUsageAllocation'; end if;
 if g.owner_user_id is not null and new.member_user_id<>g.owner_user_id or g.group_id is not null and not exists(select 1 from juntia_data.group_members m where m.group_id=g.group_id and m.user_id=new.member_user_id and m.status='active') then raise exception using errcode='JT223',message='invalidUsageAllocation'; end if;
 if juntia_private.goal_member_available(g.id,new.member_user_id)<new.amount_minor then raise exception using errcode='JT220',message='goalNegative'; end if;
 select coalesce(sum(a.amount_minor),0) into used from juntia_data.goal_usage_allocations a join juntia_data.goal_ledger_entries u on u.id=a.entry_id
  where u.transaction_id=e.transaction_id and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=u.id);
 select amount_minor into expense_amount from juntia_data.transactions where id=e.transaction_id;
 if used+new.amount_minor>expense_amount then raise exception using errcode='JT209',message='usageExceedsExpense'; end if;
 return new;
end $$;
revoke all on function juntia_private.goal_allocation_guard() from public,anon,authenticated,juntia_writer;
create trigger goal_allocation_guard before insert on juntia_data.goal_usage_allocations for each row execute function juntia_private.goal_allocation_guard();

create function juntia_private.goal_usage_sum_check() returns trigger language plpgsql security invoker set search_path='' as $$
declare eid uuid;e juntia_data.goal_ledger_entries;allocated numeric;
begin
 if tg_table_name='goal_ledger_entries' then eid:=new.id; else eid:=new.entry_id; end if;
 select * into e from juntia_data.goal_ledger_entries where id=eid;
 if e.kind<>'usage' then return null; end if;
 select coalesce(sum(amount_minor),0) into allocated from juntia_data.goal_usage_allocations where entry_id=e.id;
 if allocated<>e.amount_minor then raise exception using errcode='JT223',message='invalidUsageAllocation'; end if;
 if e.confirmation_id is not null and not exists(select 1 from juntia_data.goal_usage_confirmations c
  where c.id=e.confirmation_id and c.status='approved' and c.usage_entry_id=e.id and c.goal_id=e.goal_id and c.transaction_id=e.transaction_id and c.member_user_id=e.created_by and c.amount_minor=e.amount_minor) then
  raise exception using errcode='JT211',message='notRequestParty';
 end if;
 return null;
end $$;
revoke all on function juntia_private.goal_usage_sum_check() from public,anon,authenticated,juntia_writer;
create constraint trigger goal_usage_entry_sum after insert on juntia_data.goal_ledger_entries deferrable initially deferred for each row execute function juntia_private.goal_usage_sum_check();
create constraint trigger goal_usage_allocations_sum after insert on juntia_data.goal_usage_allocations deferrable initially deferred for each row execute function juntia_private.goal_usage_sum_check();

create function juntia_private.goal_usage_transaction_check() returns trigger language plpgsql security invoker set search_path='' as $$
declare t juntia_data.transactions;used numeric;
begin
 select * into t from juntia_data.transactions where id=new.id;
 select coalesce(sum(amount_minor),0) into used from juntia_data.goal_ledger_entries e
 where e.transaction_id=t.id and e.kind='usage' and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id);
 if used>t.amount_minor or used>0 and t.status<>'active' then raise exception using errcode='JT213',message='amountBelowGoalUsage'; end if;
 return null;
end $$;
revoke all on function juntia_private.goal_usage_transaction_check() from public,anon,authenticated,juntia_writer;
create constraint trigger goal_usage_transaction_check after update of status,amount_minor on juntia_data.transactions deferrable initially deferred for each row execute function juntia_private.goal_usage_transaction_check();

create function juntia_private.goal_void_reactivate() returns trigger language plpgsql security invoker set search_path='' as $$
declare g juntia_data.savings_goals;u juntia_data.goal_ledger_entries;changed integer;returned numeric;
begin
 if new.kind<>'void' then return null; end if;
 select * into u from juntia_data.goal_ledger_entries where id=new.voids_entry_id;
 if u.kind<>'usage' then return null; end if;
 select * into g from juntia_data.savings_goals where id=new.goal_id for update;
 if g.status<>'archived' then return null; end if;
 update juntia_data.savings_goals set status='active',archived_at=null,version=version+1,updated_by=new.created_by,updated_at=clock_timestamp() where id=g.id;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception using errcode='JT201',message='goalNotFound'; end if;
 select sum(e.amount_minor) into returned from juntia_data.goal_ledger_entries v join juntia_data.goal_ledger_entries e on e.id=v.voids_entry_id
  where e.goal_id=g.id and e.transaction_id=u.transaction_id and e.kind='usage' and pg_xact_status(v.xmin::text::xid8)='in progress';
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"before","after") values(new.created_by,'goal',g.id,'reactivate',jsonb_build_object('status','archived'),jsonb_build_object('status','active','transaction_id',u.transaction_id,'returned_minor',returned::text));
 return null;
end $$;
revoke all on function juntia_private.goal_void_reactivate() from public,anon,authenticated,juntia_writer;
create trigger goal_void_reactivate after insert on juntia_data.goal_ledger_entries for each row execute function juntia_private.goal_void_reactivate();

create function juntia_private.goal_confirmation_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare g juntia_data.savings_goals;
begin
 if tg_op='UPDATE' then
  if old.status<>'pending' or new.status not in ('approved','rejected','cancelled') then raise exception using errcode='JT212',message='requestResolved'; end if;
  if row(new.id,new.goal_id,new.transaction_id,new.requested_by,new.member_user_id,new.amount_minor,new.created_at) is distinct from row(old.id,old.goal_id,old.transaction_id,old.requested_by,old.member_user_id,old.amount_minor,old.created_at) then raise exception using errcode='JT013',message='immutableField'; end if;
  return new;
 end if;
 perform id from juntia_data.transactions where id=new.transaction_id for update;
 select * into g from juntia_data.savings_goals where id=new.goal_id for update;
 if g.group_id is null then raise exception using errcode='JT203',message='goalContextMismatch'; end if;
 if g.status='archived' then raise exception using errcode='JT202',message='goalNotOpen'; end if;
 perform juntia_private.goal_check_expense(g.id,new.transaction_id);
 if not exists(select 1 from juntia_data.group_members m where m.group_id=g.group_id and m.user_id=new.member_user_id and m.status='active') then raise exception using errcode='JT111',message='notCoupleMember'; end if;
 return new;
end $$;
revoke all on function juntia_private.goal_confirmation_guard() from public,anon,authenticated,juntia_writer;
create trigger goal_confirmation_guard before insert or update on juntia_data.goal_usage_confirmations for each row execute function juntia_private.goal_confirmation_guard();

create view public.goal_member_balances with(security_invoker=true) as
 with live as (select e.* from juntia_data.goal_ledger_entries e where e.kind<>'void' and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id)),
 values_by_member as (
  select goal_id,member_user_id as user_id,case when kind='contribution' then amount_minor else 0 end::numeric as contributed,
   case when kind='withdrawal' then amount_minor else 0 end::numeric as withdrawn,0::numeric as used,case when kind='contribution' then 1 else 0 end as contributions
  from live where kind in ('contribution','withdrawal')
  union all select e.goal_id,a.member_user_id,0,0,a.amount_minor::numeric,0 from live e join juntia_data.goal_usage_allocations a on a.entry_id=e.id
 )
 select goal_id,user_id,sum(contributed)::text as contributed_minor,sum(withdrawn)::text as withdrawn_minor,sum(used)::text as used_minor,
  (sum(contributed)-sum(withdrawn)-sum(used))::text as available_minor,sum(contributions) as contribution_count from values_by_member group by goal_id,user_id;
create view public.goals_overview with(security_invoker=true) as
 select g.id,case when g.group_id is null then 'personal' else 'shared' end as goal_scope,g.name,g.goal_type,g.target_minor::text,g.target_month,g.status,g.version,
 coalesce(b.balance,0)::text as balance_minor,trunc(coalesce(b.balance,0)*100/g.target_minor) as progress_percent,
 exists(select 1 from juntia_data.goal_usage_confirmations c where c.goal_id=g.id and c.status='pending') as has_pending_request,
 coalesce(b.mine,0)::text as my_available_minor,g.created_at
 from juntia_data.savings_goals g left join lateral(
  select sum(m.available_minor::numeric) as balance,sum(m.available_minor::numeric) filter(where m.user_id=(select auth.uid())) as mine
  from public.goal_member_balances m where m.goal_id=g.id
 ) b on true;
create view public.goals_totals with(security_invoker=true) as
 select goal_scope,sum(balance_minor::numeric)::text as balance_minor,sum(my_available_minor::numeric)::text as my_available_minor,count(*) as goal_count
 from public.goals_overview where status='active' group by goal_scope;
create view public.goal_entries with(security_invoker=true) as
 select e.id,e.goal_id,e.kind,e.member_user_id,e.amount_minor::text,coalesce(e.entry_date,t.transaction_date) as effective_date,
 e.funding_mode,e.reason,e.transaction_id,t.description as transaction_description,(v.id is not null) as voided,v.reason as voided_reason,e.created_by,e.created_at
 from juntia_data.goal_ledger_entries e left join juntia_data.transactions t on t.id=e.transaction_id
 left join juntia_data.goal_ledger_entries v on v.voids_entry_id=e.id where e.kind<>'void';
create view public.goal_activity with(security_invoker=true) as
 select e.*,'us'::text as context,date_trunc('month',e.effective_date)::date as month from public.goal_entries e join juntia_data.savings_goals g on g.id=e.goal_id where g.group_id is not null
 union all
 select e.id,e.goal_id,e.kind,e.member_user_id,
 case when e.kind='usage' then a.amount_minor::text else e.amount_minor end,e.effective_date,e.funding_mode,e.reason,e.transaction_id,e.transaction_description,e.voided,e.voided_reason,e.created_by,e.created_at,
 'me',date_trunc('month',e.effective_date)::date from public.goal_entries e left join juntia_data.goal_usage_allocations a on a.entry_id=e.id and a.member_user_id=(select auth.uid())
 where e.member_user_id=(select auth.uid()) or a.member_user_id=(select auth.uid());
create view public.usage_requests with(security_invoker=true) as
 select c.id,c.goal_id,g.name as goal_name,c.transaction_id,t.description as transaction_description,t.amount_minor::text as transaction_amount_minor,
 c.requested_by,c.member_user_id,c.amount_minor::text,c.status,c.version,c.created_at,c.resolved_at
 from juntia_data.goal_usage_confirmations c join juntia_data.savings_goals g on g.id=c.goal_id join juntia_data.transactions t on t.id=c.transaction_id;
create view public.expense_goal_funding with(security_invoker=true) as
 with links as(select transaction_id,goal_id from juntia_data.goal_ledger_entries where kind='usage' union select transaction_id,goal_id from juntia_data.goal_usage_confirmations)
 select l.transaction_id,l.goal_id,g.name as goal_name,coalesce(u.amount,0)::text as used_minor,coalesce(c.amount,0)::text as pending_minor,(coalesce(u.amount,0)>0) as funded
 from links l join juntia_data.savings_goals g on g.id=l.goal_id join juntia_data.transactions t on t.id=l.transaction_id
 left join lateral(select sum(e.amount_minor) as amount from juntia_data.goal_ledger_entries e where e.transaction_id=l.transaction_id and e.kind='usage' and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id)) u on true
 left join lateral(select sum(r.amount_minor) as amount from juntia_data.goal_usage_confirmations r where r.transaction_id=l.transaction_id and r.status='pending') c on true;
revoke all on public.goal_member_balances,public.goals_overview,public.goals_totals,public.goal_entries,public.goal_activity,public.usage_requests,public.expense_goal_funding from public,anon,authenticated;
grant select on public.goal_member_balances,public.goals_overview,public.goals_totals,public.goal_entries,public.goal_activity,public.usage_requests,public.expense_goal_funding to authenticated;
