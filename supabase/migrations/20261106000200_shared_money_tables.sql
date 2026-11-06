-- 003 T014: tablas y lecturas, sin funciones nuevas de escritura.
alter table juntia_data.transactions drop constraint transactions_private_only_p0_1;
alter table juntia_data.transactions add foreign key(group_id) references juntia_data.groups(id),
 add column payer_user_id uuid references auth.users(id),
 add column moved_from_transaction_id uuid references juntia_data.transactions(id),
 add column moved_to_transaction_id uuid references juntia_data.transactions(id),
 add column restored_from_transaction_id uuid references juntia_data.transactions(id),
 add column split_mode text, add column split_percents smallint[], add column updated_by uuid references auth.users(id),
 add constraint transactions_group_no_owner check(group_id is null or owner_user_id is null),
 add constraint transactions_payer_required check(group_id is null or payer_user_id is not null),
 add constraint transactions_split_context check(
  (group_id is null and payer_user_id is null and split_mode is null and split_percents is null)
  or (group_id is not null and split_mode is not null and split_mode in ('equal','percent','amount')
   and ((split_mode='percent' and split_percents is not null and cardinality(split_percents)=2
    and array_ndims(split_percents)=1 and array_lower(split_percents,1)=1 and array_position(split_percents,null) is null
    and split_percents[1] between 0 and 100 and split_percents[2] between 0 and 100 and split_percents[1]+split_percents[2]=100)
    or (split_mode<>'percent' and split_percents is null))));
create index transactions_group_month on juntia_data.transactions(group_id,transaction_date desc,created_at desc,id desc) where status='active';
create table juntia_data.transaction_allocations (
 transaction_id uuid not null references juntia_data.transactions(id),user_id uuid not null references auth.users(id),
 amount_minor bigint not null check(amount_minor>=0 and amount_minor%100=0),primary key(transaction_id,user_id)
);
create table juntia_data.settlements (
 id uuid primary key default gen_random_uuid(),group_id uuid not null references juntia_data.groups(id),
 from_user_id uuid not null references auth.users(id),to_user_id uuid not null references auth.users(id),
 amount_minor bigint not null check(amount_minor>0 and amount_minor%100=0),currency text not null default 'COP' check(currency='COP'),
 settlement_date date not null,note text check(note is null or (note=btrim(note) and char_length(note) between 1 and 140)),
 status text not null default 'active' check(status in ('active','voided')),voided_at timestamptz,voided_by uuid references auth.users(id),
 void_reason text check(void_reason in ('void','undo')),version integer not null default 1 check(version>0),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 check(from_user_id<>to_user_id),
 check((status='voided' and voided_at is not null and voided_by is not null and void_reason is not null)
  or (status='active' and voided_at is null and voided_by is null and void_reason is null))
);
create index settlements_group_date on juntia_data.settlements(group_id,settlement_date desc,created_at desc,id desc);
-- La 002 dejó los tres CHECK sin nombres explícitos; el de razón referencia dos columnas.
do $$ declare constraint_name text; begin
 for constraint_name in select conname from pg_constraint where conrelid='juntia_data.audit_events'::regclass and contype='c' loop
  execute format('alter table juntia_data.audit_events drop constraint %I',constraint_name);
 end loop;
end $$;
alter table juntia_data.audit_events add constraint audit_events_entity_type_check check(entity_type in ('transaction','settlement','group','invitation')),
 add constraint audit_events_action_check check(action in ('create','update','void','move','restore','accept','cancel','regenerate')),
 add constraint audit_events_reason_check check(reason is null or (action='void' and reason in ('delete','undo','void')));
alter table juntia_data.idempotency_records drop constraint idempotency_records_action_check;
alter table juntia_data.idempotency_records add check(action in ('create_transaction','update_transaction','void_transaction',
 'create_shared_expense','update_shared_expense','void_shared_expense','reclassify_to_shared','undo_reclassify_to_shared',
 'register_settlement','void_settlement','create_invitation','regenerate_invitation','cancel_invitation','accept_invitation'));
alter table juntia_data.transaction_allocations enable row level security;
alter table juntia_data.settlements enable row level security;
revoke all on juntia_data.transaction_allocations,juntia_data.settlements from public,anon,authenticated;
grant select on juntia_data.transaction_allocations,juntia_data.settlements to authenticated;
grant select,insert,delete on juntia_data.transaction_allocations to juntia_writer;
grant select,insert on juntia_data.settlements to juntia_writer;
grant update(status,voided_at,voided_by,void_reason,version) on juntia_data.settlements to juntia_writer;
drop policy transactions_read on juntia_data.transactions;
create policy transactions_read on juntia_data.transactions for select to authenticated,juntia_writer
 using(owner_user_id=(select auth.uid()) or (group_id is not null and juntia_private.is_couple_member(group_id)));
-- Las políticas de escritura de transactions siguen privadas hasta T020, que redefine las RPC antiguas en el mismo commit.
create policy allocations_read on juntia_data.transaction_allocations for select to authenticated,juntia_writer
 using(exists(select 1 from juntia_data.transactions t where t.id=transaction_id));
create policy allocations_insert on juntia_data.transaction_allocations for insert to juntia_writer
 with check(exists(select 1 from juntia_data.transactions t where t.id=transaction_id and t.group_id is not null and juntia_private.is_couple_member(t.group_id)));
create policy allocations_delete on juntia_data.transaction_allocations for delete to juntia_writer
 using(exists(select 1 from juntia_data.transactions t where t.id=transaction_id and t.group_id is not null and juntia_private.is_couple_member(t.group_id)));
create policy settlements_read on juntia_data.settlements for select to authenticated,juntia_writer using(juntia_private.is_couple_member(group_id));
create policy settlements_insert on juntia_data.settlements for insert to juntia_writer with check(juntia_private.is_couple_member(group_id) and created_by=(select auth.uid()));
create policy settlements_update on juntia_data.settlements for update to juntia_writer using(juntia_private.is_couple_member(group_id)) with check(juntia_private.is_couple_member(group_id));

create or replace function juntia_private.transactions_guard_update() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.status='voided' then raise exception using errcode='JT012',message='transactionVoided'; end if;
 if row(new.type,new.created_by,new.owner_user_id,new.group_id,new.currency,new.created_at,new.moved_from_transaction_id,new.restored_from_transaction_id)
 is distinct from row(old.type,old.created_by,old.owner_user_id,old.group_id,old.currency,old.created_at,old.moved_from_transaction_id,old.restored_from_transaction_id) then
  raise exception using errcode='JT013',message='immutableField';
 end if;
 return new;
end $$;
-- Guard inmediato: invoker, sin privilegios nuevos. Lee la raíz en el contexto de quien escribe.
create function juntia_private.transactions_check_group() returns trigger language plpgsql security invoker set search_path='' as $$
declare g juntia_data.groups;
begin
 if new.group_id is null then return new; end if;
 -- Las combinaciones de contexto y el pagador obligatorio las rechazan sus CHECK.
 if new.owner_user_id is not null or new.payer_user_id is null then return new; end if;
 select * into g from juntia_data.groups where id=new.group_id;
 if not found or g.status<>'active' then raise exception using errcode='JT105',message='coupleNotActive'; end if;
 if new.currency<>g.currency then raise exception using errcode='JT003',message='amountOutOfRange'; end if;
 if new.payer_user_id is not null and not exists(select 1 from juntia_data.group_members where group_id=g.id and user_id=new.payer_user_id and status='active') then
  raise exception using errcode='JT111',message='notCoupleMember';
 end if;
 return new;
end $$;
-- PostgreSQL ordena los BEFORE por nombre: primero el guard de campos inmutables.
create trigger transactions_verify_group before insert or update on juntia_data.transactions for each row execute function juntia_private.transactions_check_group();
create function juntia_private.allocations_check_member() returns trigger language plpgsql security invoker set search_path='' as $$
declare gid uuid;
begin
 select group_id into gid from juntia_data.transactions where id=new.transaction_id;
 if gid is null or not exists(select 1 from juntia_data.group_members m join juntia_data.groups g on g.id=m.group_id
  where m.group_id=gid and m.user_id=new.user_id and m.status='active' and g.status='active') then
  raise exception using errcode='JT111',message='notCoupleMember';
 end if;
 return new;
end $$;
create trigger allocations_check_member before insert or update on juntia_data.transaction_allocations for each row execute function juntia_private.allocations_check_member();
-- Restricción diferida e invoker. Las funciones de dinero la hacen IMMEDIATE al
-- terminar sus escrituras, todavía dentro de writer; se conserva diferida para SQL directo.
create function juntia_private.check_allocations_sum() returns trigger language plpgsql security invoker set search_path='' as $$
declare tid uuid; t record; n integer; total numeric; positive integer;
begin
 if tg_table_name='transactions' then
  if new.group_id is null then return null; end if;
  tid:=new.id;
 elsif tg_op='DELETE' then tid:=old.transaction_id; else tid:=new.transaction_id; end if;
 select * into t from juntia_data.transactions where id=tid;
 if not found or t.group_id is null or t.status<>'active' then return null; end if;
 select count(*),coalesce(sum(amount_minor),0),count(*) filter(where amount_minor>0) into n,total,positive
  from juntia_data.transaction_allocations where transaction_id=tid;
 if total<>t.amount_minor or positive=0 or n<>(select count(*) from juntia_data.group_members where group_id=t.group_id and status='active') then
  raise exception using errcode='JT110',message='invalidSplit';
 end if;
 return null;
end $$;
create constraint trigger transactions_check_allocations after insert or update on juntia_data.transactions deferrable initially deferred for each row when(new.group_id is not null) execute function juntia_private.check_allocations_sum();
create constraint trigger allocations_check_sum after insert or update or delete on juntia_data.transaction_allocations deferrable initially deferred for each row execute function juntia_private.check_allocations_sum();
create function juntia_private.settlements_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare g juntia_data.groups;
begin
 if tg_op='DELETE' then raise exception using errcode='JT013',message='immutableField'; end if;
 if tg_op='UPDATE' then
  if old.status<>'active' or new.status<>'voided' or new.version<>old.version+1 or
   (to_jsonb(new)-array['status','voided_at','voided_by','void_reason','version']) is distinct from (to_jsonb(old)-array['status','voided_at','voided_by','void_reason','version']) then
   raise exception using errcode='JT013',message='immutableField';
  end if;
 else
  select * into g from juntia_data.groups where id=new.group_id;
  if not found or g.status<>'active' then raise exception using errcode='JT105',message='coupleNotActive'; end if;
  if new.currency<>g.currency then raise exception using errcode='JT003',message='amountOutOfRange'; end if;
  if new.from_user_id<>new.to_user_id and (select count(*) from juntia_data.group_members where group_id=g.id and user_id in (new.from_user_id,new.to_user_id) and status='active')<>2 then
   raise exception using errcode='JT111',message='notCoupleMember';
  end if;
 end if;
 return new;
end $$;
create trigger settlements_guard before insert or update or delete on juntia_data.settlements for each row execute function juntia_private.settlements_guard();
revoke all on function juntia_private.transactions_check_group(),juntia_private.allocations_check_member(),juntia_private.check_allocations_sum(),juntia_private.settlements_guard() from public,anon,authenticated;

-- R2/F49-1: mismos filtros que la RLS privada anterior, en el mismo commit que la rama de lectura de grupo.
create or replace view public.my_transactions with(security_invoker=true) as
 select id,type,category_id,transaction_date,description,amount_minor::text as amount_minor,currency,version,created_at,updated_at,moved_to_transaction_id
 from juntia_data.transactions where status='active' and owner_user_id=(select auth.uid()) and group_id is null;
create or replace view public.my_transaction_months with(security_invoker=true) as
 select date_trunc('month',transaction_date::timestamp)::date as month,count(*)::integer as count from juntia_data.transactions
 where status='active' and owner_user_id=(select auth.uid()) and group_id is null group by 1;
create or replace view public.my_recent_categories with(security_invoker=true) as
 select category_id,max(created_at) as last_used_at from juntia_data.transactions where status='active' and type='expense'
 and owner_user_id=(select auth.uid()) and group_id is null group by category_id order by max(created_at) desc,category_id limit 5;
create view public.couple_expenses with(security_invoker=true) as
 select t.id,t.transaction_date,t.category_id,t.description,t.amount_minor::text as amount_minor,t.payer_user_id,t.split_mode,t.split_percents,
 (select jsonb_object_agg(a.user_id::text,a.amount_minor::text) from juntia_data.transaction_allocations a where a.transaction_id=t.id) as parts,
 t.created_by,t.created_at,t.updated_by,t.updated_at,t.version,(t.moved_from_transaction_id is not null and t.created_by=(select auth.uid())) as moved_from_me
 from juntia_data.transactions t where t.group_id is not null and t.status='active' and juntia_private.is_couple_member(t.group_id);
create view public.couple_settlements with(security_invoker=true) as
 select s.id,s.settlement_date,s.from_user_id,s.to_user_id,s.amount_minor::text as amount_minor,s.note,s.status,s.created_by,s.created_at,s.voided_by,s.voided_at,s.version
 from juntia_data.settlements s where juntia_private.is_couple_member(s.group_id);
create view public.my_shared_parts with(security_invoker=true) as
 select t.id,t.transaction_date,t.category_id,t.description,t.amount_minor::text as amount_minor,a.amount_minor::text as my_part_minor,t.payer_user_id
 from juntia_data.transactions t join juntia_data.transaction_allocations a on a.transaction_id=t.id and a.user_id=(select auth.uid())
 where t.group_id is not null and t.status='active' and juntia_private.is_couple_member(t.group_id);
create view public.couple_transaction_months with(security_invoker=true) as
 select month,count(*)::integer as count from (
  select date_trunc('month',transaction_date::timestamp)::date as month from juntia_data.transactions where group_id is not null and status='active' and juntia_private.is_couple_member(group_id)
  union all select date_trunc('month',settlement_date::timestamp)::date from juntia_data.settlements where status='active' and juntia_private.is_couple_member(group_id)
 ) rows group by month;
create view public.couple_month_summary with(security_invoker=true) as
 with categories as (select date_trunc('month',transaction_date::timestamp)::date as month,category_id,sum(amount_minor) as total,count(*) as n
  from juntia_data.transactions where group_id is not null and status='active' and type='expense' and juntia_private.is_couple_member(group_id) group by 1,2)
 select month,sum(total)::text as total_minor,jsonb_object_agg(category_id,total::text) as by_category,sum(n)::integer as count from categories group by month;
create view public.me_month_summary with(security_invoker=true) as
 with consumption as (
  select t.transaction_date,t.category_id,t.amount_minor as private_minor,0::bigint as shared_part_minor
   from juntia_data.transactions t where t.group_id is null and t.owner_user_id=(select auth.uid()) and t.status='active' and t.type='expense'
  union all select t.transaction_date,t.category_id,0::bigint,a.amount_minor
   from juntia_data.transactions t join juntia_data.transaction_allocations a on a.transaction_id=t.id and a.user_id=(select auth.uid())
   where t.group_id is not null and t.status='active' and t.type='expense' and juntia_private.is_couple_member(t.group_id)
 ), categories as (select date_trunc('month',transaction_date::timestamp)::date as month,category_id,sum(private_minor) as private_total,sum(shared_part_minor) as shared_total from consumption group by 1,2)
 select month,sum(private_total)::text as private_minor,sum(shared_total)::text as shared_part_minor,sum(private_total+shared_total)::text as consumption_minor,
 jsonb_object_agg(category_id,(private_total+shared_total)::text) as by_category from categories group by month;
create view public.couple_balance with(security_invoker=true) as
 select m.user_id,p.paid::text as paid_minor,a.share::text as share_minor,s.sent::text as settled_out_minor,s.received::text as settled_in_minor,
 (p.paid-a.share+s.sent-s.received)::text as net_minor
 from juntia_data.group_members m join juntia_data.groups g on g.id=m.group_id
 cross join lateral (select coalesce(sum(t.amount_minor),0) as paid from juntia_data.transactions t where t.group_id=g.id and t.status='active' and t.type='expense' and t.payer_user_id=m.user_id) p
 cross join lateral (select coalesce(sum(ta.amount_minor),0) as share from juntia_data.transaction_allocations ta join juntia_data.transactions t on t.id=ta.transaction_id where t.group_id=g.id and t.status='active' and t.type='expense' and ta.user_id=m.user_id) a
 cross join lateral (select coalesce(sum(amount_minor) filter(where from_user_id=m.user_id),0) as sent,coalesce(sum(amount_minor) filter(where to_user_id=m.user_id),0) as received
  from juntia_data.settlements where group_id=g.id and status='active') s
 where g.status='active' and m.status='active' and juntia_private.is_couple_member(g.id);
revoke all on public.couple_expenses,public.couple_settlements,public.my_shared_parts,public.couple_transaction_months,public.couple_month_summary,public.me_month_summary,public.couple_balance from public,anon,authenticated;
grant select on public.couple_expenses,public.couple_settlements,public.my_shared_parts,public.couple_transaction_months,public.couple_month_summary,public.me_month_summary,public.couple_balance to authenticated;
