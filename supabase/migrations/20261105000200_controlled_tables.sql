-- T018: tablas controladas y vistas, todavía sin funciones de dinero.
create table juntia_data.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check(type in ('expense','income')),
  created_by uuid not null references auth.users(id),
  owner_user_id uuid references auth.users(id),
  group_id uuid,
  amount_minor bigint not null check(amount_minor>0),
  currency text not null default 'COP' check(currency='COP'),
  category_id text not null,
  transaction_date date not null,
  description text check(description is null or (description=btrim(description) and char_length(description) between 1 and 140)),
  status text not null default 'active' check(status in ('active','voided')),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  version integer not null default 1 check(version>=1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_scope_xor check((owner_user_id is not null)<>(group_id is not null)),
  constraint transactions_private_only_p0_1 check(group_id is null),
  constraint transactions_income_private check(type<>'income' or group_id is null),
  constraint transactions_private_owner_is_author check(group_id is not null or owner_user_id=created_by),
  constraint transactions_voided_consistency check((status='voided')=(voided_at is not null and voided_by is not null)),
  constraint transactions_voided_fields_pair check((voided_at is null)=(voided_by is null)),
  foreign key(category_id,type) references juntia_data.categories(id,kind)
);
create index transactions_active_month on juntia_data.transactions(owner_user_id,transaction_date desc) where status='active';
create index transactions_recent_category on juntia_data.transactions(owner_user_id,category_id,created_at desc) where status='active';

create table juntia_data.audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid not null references auth.users(id),
  entity_type text not null check(entity_type='transaction'),
  entity_id uuid not null,
  action text not null check(action in ('create','update','void')),
  reason text check(reason is null or (action='void' and reason in ('delete','undo'))),
  "before" jsonb,
  "after" jsonb
);
create table juntia_data.idempotency_records (
  actor_user_id uuid not null,
  action text not null check(action in ('create_transaction','update_transaction','void_transaction')),
  idempotency_key uuid not null,
  request_fingerprint text not null,
  status text not null default 'pending' check(status in ('pending','completed')),
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key(actor_user_id,action,idempotency_key),
  check((status='pending')=(result is null)),
  check((status='pending')=(completed_at is null))
);
alter table juntia_data.transactions enable row level security;
alter table juntia_data.audit_events enable row level security;
alter table juntia_data.idempotency_records enable row level security;
revoke all on juntia_data.transactions,juntia_data.audit_events,juntia_data.idempotency_records from public,anon,authenticated;
grant select on juntia_data.transactions to authenticated;
grant select,insert on juntia_data.transactions to juntia_writer;
grant update(amount_minor,category_id,transaction_date,description,status,voided_at,voided_by,version,updated_at) on juntia_data.transactions to juntia_writer;
grant insert on juntia_data.audit_events to juntia_writer;
grant select,insert on juntia_data.idempotency_records to juntia_writer;
grant update(status,result,completed_at) on juntia_data.idempotency_records to juntia_writer;
create policy transactions_read on juntia_data.transactions for select to authenticated,juntia_writer using(owner_user_id=(select auth.uid()));
create policy transactions_insert on juntia_data.transactions for insert to juntia_writer with check(created_by=(select auth.uid()) and owner_user_id=(select auth.uid()));
create policy transactions_update on juntia_data.transactions for update to juntia_writer using(owner_user_id=(select auth.uid())) with check(owner_user_id=(select auth.uid()));
create policy audit_insert on juntia_data.audit_events for insert to juntia_writer with check(actor_user_id=(select auth.uid()));
create policy idempotency_read on juntia_data.idempotency_records for select to juntia_writer using(actor_user_id=(select auth.uid()));
create policy idempotency_insert on juntia_data.idempotency_records for insert to juntia_writer with check(actor_user_id=(select auth.uid()) and status='pending' and result is null and completed_at is null);
create policy idempotency_complete on juntia_data.idempotency_records for update to juntia_writer using(actor_user_id=(select auth.uid()) and status='pending') with check(actor_user_id=(select auth.uid()) and status='completed');

create function juntia_private.transactions_guard_update() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if old.status='voided' then raise exception using errcode='JT012',message='transactionVoided'; end if;
  if row(new.type,new.created_by,new.owner_user_id,new.group_id,new.currency,new.created_at) is distinct from row(old.type,old.created_by,old.owner_user_id,old.group_id,old.currency,old.created_at) then
    raise exception using errcode='JT013',message='immutableField';
  end if;
  return new;
end $$;
create trigger transactions_guard_update before update on juntia_data.transactions for each row execute function juntia_private.transactions_guard_update();
create function juntia_private.audit_events_append_only() returns trigger language plpgsql security invoker set search_path='' as $$
begin raise exception using errcode='JT013',message='immutableField'; end $$;
create trigger audit_events_append_only before update or delete on juntia_data.audit_events for each row execute function juntia_private.audit_events_append_only();
create trigger audit_events_no_truncate before truncate on juntia_data.audit_events for each statement execute function juntia_private.audit_events_append_only();
create function juntia_private.idempotency_records_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if old.status<>'pending' or new.status<>'completed'
    or row(new.actor_user_id,new.action,new.idempotency_key,new.request_fingerprint,new.created_at) is distinct from row(old.actor_user_id,old.action,old.idempotency_key,old.request_fingerprint,old.created_at) then
    raise exception using errcode='JT013',message='immutableField';
  end if;
  return new;
end $$;
create trigger idempotency_records_guard before update on juntia_data.idempotency_records for each row execute function juntia_private.idempotency_records_guard();
revoke all on function juntia_private.transactions_guard_update(),juntia_private.audit_events_append_only(),juntia_private.idempotency_records_guard() from public,anon,authenticated;

create view public.my_transactions with(security_invoker=true) as
 select id,type,category_id,transaction_date,description,amount_minor::text as amount_minor,currency,version,created_at,updated_at
 from juntia_data.transactions where status='active';
create view public.my_transaction_months with(security_invoker=true) as
 select date_trunc('month',transaction_date::timestamp)::date as month,count(*)::integer as count
 from juntia_data.transactions where status='active' group by 1;
create view public.my_recent_categories with(security_invoker=true) as
 select category_id,max(created_at) as last_used_at from juntia_data.transactions
 where status='active' and type='expense' group by category_id order by max(created_at) desc,category_id limit 5;
revoke all on public.my_transactions,public.my_transaction_months,public.my_recent_categories from public,anon,authenticated;
grant select on public.my_transactions,public.my_transaction_months,public.my_recent_categories to authenticated;
