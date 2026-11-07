-- 004 T013 / ADR-004, ADR-013. Identidad + versiones; nunca copiar límites por mes.
create table juntia_data.budgets (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid references auth.users(id),group_id uuid references juntia_data.groups(id),
 category_id text not null,category_kind text not null default 'expense' check(category_kind='expense'),
 currency text not null default 'COP' check(currency='COP'),version integer not null default 1 check(version>0),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),
 updated_by uuid references auth.users(id),updated_at timestamptz not null default clock_timestamp(),
 check((owner_user_id is not null)<>(group_id is not null)),
 foreign key(category_id,category_kind) references juntia_data.categories(id,kind)
);
create unique index budgets_one_per_key on juntia_data.budgets(coalesce(owner_user_id,group_id),category_id,currency);
create table juntia_data.budget_versions (
 id uuid primary key default gen_random_uuid(),budget_id uuid not null references juntia_data.budgets(id),
 effective_month date not null check(extract(day from effective_month)=1),
 limit_minor bigint check(limit_minor>0 and limit_minor%100=0 and limit_minor<=99999999900),
 changed_by uuid not null references auth.users(id),changed_at timestamptz not null default clock_timestamp()
);
create index budget_versions_vigency on juntia_data.budget_versions(budget_id,effective_month desc,changed_at desc,id desc);
create index budget_versions_cursor on juntia_data.budget_versions(budget_id,changed_at desc,id desc);
create function juntia_private.planning_append_only() returns trigger language plpgsql security invoker set search_path='' as $$
begin raise exception using errcode='JT222',message='appendOnly'; end $$;
revoke all on function juntia_private.planning_append_only() from public,anon,authenticated,juntia_writer;
create trigger budget_versions_append_only before update or delete on juntia_data.budget_versions for each row execute function juntia_private.planning_append_only();
create trigger budget_versions_no_truncate before truncate on juntia_data.budget_versions for each statement execute function juntia_private.planning_append_only();
create function juntia_private.planning_check_group() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.group_id is not null and not exists(select 1 from juntia_data.groups g where g.id=new.group_id and g.status='active' and g.currency=new.currency) then
  raise exception using errcode='JT105',message='coupleNotActive';
 end if;
 return new;
end $$;
revoke all on function juntia_private.planning_check_group() from public,anon,authenticated,juntia_writer;
create trigger budgets_check_group before insert on juntia_data.budgets for each row execute function juntia_private.planning_check_group();
alter table juntia_data.budgets enable row level security;
alter table juntia_data.budget_versions enable row level security;
revoke all on juntia_data.budgets,juntia_data.budget_versions from public,anon,authenticated;
grant select on juntia_data.budgets,juntia_data.budget_versions to authenticated;
grant select,insert on juntia_data.budgets,juntia_data.budget_versions to juntia_writer;
grant update(version,updated_by,updated_at) on juntia_data.budgets to juntia_writer;
create policy budgets_read on juntia_data.budgets for select to authenticated,juntia_writer
 using(owner_user_id=(select auth.uid()) or juntia_private.is_couple_member(group_id));
create policy budgets_insert on juntia_data.budgets for insert to juntia_writer
 with check((owner_user_id=(select auth.uid()) or juntia_private.is_couple_member(group_id)) and created_by=(select auth.uid()));
create policy budgets_update on juntia_data.budgets for update to juntia_writer
 using(owner_user_id=(select auth.uid()) or juntia_private.is_couple_member(group_id))
 with check(owner_user_id=(select auth.uid()) or juntia_private.is_couple_member(group_id));
create policy budget_versions_read on juntia_data.budget_versions for select to authenticated,juntia_writer
 using(exists(select 1 from juntia_data.budgets b where b.id=budget_id));
create policy budget_versions_insert on juntia_data.budget_versions for insert to juntia_writer
 with check(changed_by=(select auth.uid()) and exists(select 1 from juntia_data.budgets b where b.id=budget_id));
alter table juntia_data.audit_events drop constraint audit_events_entity_type_check,drop constraint audit_events_action_check;
alter table juntia_data.audit_events add constraint audit_events_entity_type_check check(entity_type in ('transaction','settlement','group','invitation','budget','goal','goal_entry','usage_request')),
 add constraint audit_events_action_check check(action in ('create','update','void','move','restore','accept','cancel','regenerate','complete','archive','approve','reject','remove_usage','reactivate'));
alter table juntia_data.idempotency_records drop constraint idempotency_records_action_check;
alter table juntia_data.idempotency_records add constraint idempotency_records_action_check check(action in (
 'create_transaction','update_transaction','void_transaction','create_shared_expense','update_shared_expense','void_shared_expense',
 'reclassify_to_shared','undo_reclassify_to_shared','register_settlement','void_settlement','create_invitation','regenerate_invitation','cancel_invitation','accept_invitation',
 'create_budget','update_budget','create_goal','update_goal','complete_goal','archive_goal','contribute_to_goal','withdraw_from_goal','void_goal_entry',
 'create_expense_with_goal','approve_usage_request','reject_usage_request','cancel_usage_request','remove_goal_usage'));

create view public.budget_history with(security_invoker=true) as
 select id,budget_id,effective_month,
 (lag(limit_minor) over(partition by budget_id order by changed_at,id))::text as previous_limit_minor,
 limit_minor::text,changed_by,changed_at from juntia_data.budget_versions;

create view public.budget_months with(security_invoker=true) as
 with consumption as (
  select 'me'::text as context,t.owner_user_id as scope_id,t.category_id,date_trunc('month',t.transaction_date)::date as month,t.amount_minor::numeric as amount
   from juntia_data.transactions t where t.type='expense' and t.status='active' and t.owner_user_id=(select auth.uid())
  union all
  select 'me',a.user_id,t.category_id,date_trunc('month',t.transaction_date)::date,a.amount_minor::numeric
   from juntia_data.transactions t join juntia_data.transaction_allocations a on a.transaction_id=t.id
   where t.type='expense' and t.status='active' and a.user_id=(select auth.uid()) and t.group_id is not null
  union all
  select 'us',t.group_id,t.category_id,date_trunc('month',t.transaction_date)::date,t.amount_minor::numeric
   from juntia_data.transactions t where t.type='expense' and t.status='active' and t.group_id is not null
 ), totals as (
  select context,scope_id,category_id,month,sum(amount) as consumed from consumption group by context,scope_id,category_id,month
 ), budget_range as (
  select b.*,case when b.group_id is null then 'me' else 'us' end as context,
   coalesce(b.owner_user_id,b.group_id) as scope_id,min(v.effective_month) as first_month
   from juntia_data.budgets b join juntia_data.budget_versions v on v.budget_id=b.id group by b.id
 ), months as (
  select b.context,b.scope_id,b.category_id,b.id as budget_id,b.version,m::date as month
   from budget_range b cross join lateral generate_series(b.first_month,
    greatest(date_trunc('month',now() at time zone 'America/Bogota')::date,
     (select max(t.month) from totals t where t.context=b.context and t.scope_id=b.scope_id)),interval '1 month') m
 ), keys as (
  select context,scope_id,category_id,month from months
  union select context,scope_id,category_id,month from totals
 ), values_in_month as (
  select k.context,k.month,k.category_id,b.id as budget_id,b.version,v.limit_minor,coalesce(t.consumed,0) as consumed
   from keys k left join juntia_data.budgets b on coalesce(b.owner_user_id,b.group_id)=k.scope_id and b.category_id=k.category_id
   left join lateral(select bv.limit_minor from juntia_data.budget_versions bv where bv.budget_id=b.id and bv.effective_month<=k.month
    order by bv.effective_month desc,bv.changed_at desc,bv.id desc limit 1) v on true
   left join totals t on t.context=k.context and t.scope_id=k.scope_id and t.category_id=k.category_id and t.month=k.month
 )
 select context,month,category_id,budget_id,version,limit_minor::text,consumed::text as consumed_minor,
  (limit_minor-consumed)::text as remaining_minor,
  case when limit_minor is null then 'none' when consumed>limit_minor then 'over' when consumed*100>=limit_minor::numeric*85 then 'near' else 'within' end as state
 from values_in_month;
revoke all on public.budget_history,public.budget_months from public,anon,authenticated;
grant select on public.budget_history,public.budget_months to authenticated;
