-- 004 T018. Las operaciones conservan grupo -> movimiento -> meta -> solicitud.
create or replace function juntia_private.transaction_goal_funded(p_transaction_id uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from juntia_data.goal_ledger_entries e where e.transaction_id=p_transaction_id and e.kind='usage'
  and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id))
$$;
comment on function juntia_private.transaction_goal_funded(uuid) is 'Uso aplicado y vivo, con RLS, bajo el bloqueo del movimiento; ADR-001 punto 7.';

-- Invoker interno: el movimiento ya está bloqueado por quien llama.
create function juntia_private.check_transaction_goal_amount(p_transaction uuid,p_amount bigint) returns void
language plpgsql security invoker set search_path='' as $$
declare goal_value uuid;g juntia_data.savings_goals;used numeric;
begin
 for goal_value in select distinct goal_id from juntia_data.goal_ledger_entries where transaction_id=p_transaction order by goal_id loop
  select * into g from juntia_data.savings_goals where id=goal_value for update;
  if not found then raise exception using errcode='JT201',message='goalNotFound';end if;
 end loop;
 select coalesce(sum(e.amount_minor),0) into used from juntia_data.goal_ledger_entries e where e.transaction_id=p_transaction and e.kind='usage'
  and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id);
 if used>p_amount then raise exception using errcode='JT213',message='amountBelowGoalUsage';end if;
end $$;
revoke all on function juntia_private.check_transaction_goal_amount(uuid,bigint) from public,anon,authenticated;
grant execute on function juntia_private.check_transaction_goal_amount(uuid,bigint) to juntia_writer;

-- Invoker interno común a quitar el uso y a las dos anulaciones. No es una RPC.
create function juntia_private.remove_transaction_goal_funding(p_transaction uuid,p_reason text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=juntia_private.current_uid();goal_value uuid;g juntia_data.savings_goals;c juntia_data.goal_usage_confirmations;
 old_request juntia_data.goal_usage_confirmations;reactivated jsonb;voids jsonb;v jsonb;original jsonb;n integer;
 expected_requests integer;locked_requests integer;voided_count integer;cancelled boolean:=false;
begin
 for goal_value in select goal_id from juntia_data.goal_ledger_entries where transaction_id=p_transaction
  union select goal_id from juntia_data.goal_usage_confirmations where transaction_id=p_transaction order by goal_id loop
  select * into g from juntia_data.savings_goals where id=goal_value for update;
  if not found then raise exception using errcode='JT201',message='goalNotFound';end if;
 end loop;
 select count(*) into expected_requests from juntia_data.goal_usage_confirmations where transaction_id=p_transaction;
 perform id from juntia_data.goal_usage_confirmations where transaction_id=p_transaction order by id for update;
 get diagnostics locked_requests=row_count;
 if locked_requests<>expected_requests then raise exception using errcode='42501',message='writeDenied';end if;
 select coalesce(jsonb_agg(jsonb_build_object('goal_id',x.id,'name',x.name,'returned_minor',x.amount::text) order by x.id),'[]'::jsonb) into reactivated
 from(select sg.id,sg.name,sum(e.amount_minor) as amount from juntia_data.goal_ledger_entries e join juntia_data.savings_goals sg on sg.id=e.goal_id
  where e.transaction_id=p_transaction and e.kind='usage' and sg.status='archived' and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id)
  group by sg.id,sg.name) x;
 -- Una sola sentencia: los AFTER ven todos los void del gasto para su auditoría.
 with made as (
  insert into juntia_data.goal_ledger_entries(goal_id,kind,voids_entry_id,reason,created_by)
  select e.goal_id,'void',e.id,p_reason,uid from juntia_data.goal_ledger_entries e where e.transaction_id=p_transaction and e.kind='usage'
   and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id) order by e.goal_id,e.id returning *
 ) select coalesce(jsonb_agg(to_jsonb(made)),'[]'::jsonb),count(*) into voids,voided_count from made;
 for v in select value from jsonb_array_elements(voids) loop
  select to_jsonb(e)||jsonb_build_object('amount_minor',e.amount_minor::text) into original from juntia_data.goal_ledger_entries e where e.id=(v->>'voids_entry_id')::uuid;
  insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"before","after") values(uid,'goal_entry',(v->>'voids_entry_id')::uuid,'void',original,v);
 end loop;
 for c in select * from juntia_data.goal_usage_confirmations where transaction_id=p_transaction and status='pending' order by id loop
  old_request:=c;
  update juntia_data.goal_usage_confirmations set status='cancelled',resolved_by=uid,resolved_at=clock_timestamp(),version=version+1 where id=c.id and status='pending' returning * into c;
  get diagnostics n=row_count;if n<>1 then raise exception using errcode='42501',message='writeDenied';end if;
  cancelled:=true;
  insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"before","after") values(uid,'usage_request',c.id,'cancel',
   to_jsonb(old_request)||jsonb_build_object('amount_minor',old_request.amount_minor::text),to_jsonb(c)||jsonb_build_object('amount_minor',c.amount_minor::text));
 end loop;
 return jsonb_build_object('voided_usages',voided_count,'cancelled_request',cancelled,'reactivated_goals',reactivated);
end $$;
revoke all on function juntia_private.remove_transaction_goal_funding(uuid,text) from public,anon,authenticated;
grant execute on function juntia_private.remove_transaction_goal_funding(uuid,text) to juntia_writer;

grant create on schema juntia_private to juntia_writer;
-- Definer: usa solo grants de writer y su RLS; la creación previa se reutiliza
-- dentro de ESTA transacción, con una clave interna nueva que no puede apropiarse
-- de una intención antigua de create_transaction/create_shared_expense.
create function juntia_private.create_expense_with_goal(p_idempotency_key text,p_context text,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text,p_payer_user_id uuid,p_split_mode text,p_split_percents smallint[],p_parts jsonb,p_goal_id uuid,p_own_minor text,p_requested_minor text,p_type text default 'expense')
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid();saved jsonb;result jsonb;expense jsonb;g juntia_data.savings_goals;t juntia_data.transactions;
 own_amount bigint;requested_amount bigint;amount bigint;gid uuid;other_member uuid;entry_id uuid;request_id uuid;
begin
 if uid is null then raise exception using errcode='JT001',message='notAuthenticated';end if;
 amount:=juntia_private.parse_amount_minor(p_amount_minor);own_amount:=juntia_private.parse_amount_minor(p_own_minor);requested_amount:=juntia_private.parse_amount_minor(p_requested_minor);
 saved:=juntia_private.begin_write('create_expense_with_goal',p_idempotency_key,jsonb_build_object('context',p_context,'type',p_type,'amount_minor',amount::text,'category_id',p_category_id,'transaction_date',p_transaction_date,'description',nullif(btrim(p_description),''),'payer_user_id',p_payer_user_id,'split_mode',p_split_mode,'split_percents',p_split_percents,'parts',p_parts,'goal_id',p_goal_id,'own_minor',own_amount::text,'requested_minor',requested_amount::text));
 if saved is not null then return saved;end if;
 if p_type is distinct from 'expense' or p_context is null or p_context not in ('me','us') then raise exception using errcode='JT004',message='invalidType';end if;
 if own_amount%100<>0 or requested_amount%100<>0 or own_amount::numeric+requested_amount<=0 then raise exception using errcode='JT223',message='invalidUsageAllocation';end if;
 if own_amount::numeric+requested_amount>amount then raise exception using errcode='JT209',message='usageExceedsExpense';end if;
 if p_context='us' then
  gid:=juntia_private.lock_active_couple();
  expense:=juntia_private.create_shared_expense(gen_random_uuid()::text,p_amount_minor,p_category_id,p_transaction_date,p_description,p_payer_user_id,p_split_mode,p_split_percents,p_parts);
 else
  if requested_amount<>0 then raise exception using errcode='JT203',message='goalContextMismatch';end if;
  expense:=juntia_private.create_transaction(gen_random_uuid()::text,'expense',p_amount_minor,p_category_id,p_transaction_date,p_description);
 end if;
 select * into t from juntia_data.transactions where id=(expense->>'id')::uuid for update;
 if not found then raise exception using errcode='JT010',message='transactionNotFound';end if;
 select * into g from juntia_data.savings_goals where id=p_goal_id for update;
 if not found then raise exception using errcode='JT201',message='goalNotFound';end if;
 if g.status='archived' then raise exception using errcode='JT202',message='goalNotOpen';end if;
 perform juntia_private.goal_check_expense(g.id,t.id);
 if own_amount>juntia_private.goal_member_available(g.id,uid) then raise exception using errcode='JT204',message='insufficientMemberFunds';end if;
 if requested_amount>0 then
  select user_id into other_member from juntia_data.group_members where group_id=gid and user_id<>uid and status='active' order by join_order limit 1;
  if other_member is null then raise exception using errcode='JT111',message='notCoupleMember';end if;
  if requested_amount>juntia_private.goal_member_available(g.id,other_member) then raise exception using errcode='JT204',message='insufficientMemberFunds';end if;
 end if;
 if own_amount>0 then
  insert into juntia_data.goal_ledger_entries(goal_id,kind,amount_minor,transaction_id,created_by) values(g.id,'usage',own_amount,t.id,uid) returning id into entry_id;
  insert into juntia_data.goal_usage_allocations(entry_id,member_user_id,amount_minor) values(entry_id,uid,own_amount);
  insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"after") values(uid,'goal_entry',entry_id,'create',jsonb_build_object('goal_id',g.id,'transaction_id',t.id,'kind','usage','amount_minor',own_amount::text));
 end if;
 if requested_amount>0 then
  insert into juntia_data.goal_usage_confirmations(goal_id,transaction_id,requested_by,member_user_id,amount_minor) values(g.id,t.id,uid,other_member,requested_amount) returning id into request_id;
  insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"after") values(uid,'usage_request',request_id,'create',jsonb_build_object('goal_id',g.id,'transaction_id',t.id,'member_user_id',other_member,'amount_minor',requested_amount::text,'status','pending'));
 end if;
 result:=expense||jsonb_build_object('goal_id',g.id,'own_usage_entry_id',entry_id,'request_id',request_id);
 return juntia_private.finish_write('create_expense_with_goal',p_idempotency_key,result);
end $$;
alter function juntia_private.create_expense_with_goal(text,text,text,text,text,text,uuid,text,smallint[],jsonb,uuid,text,text,text) owner to juntia_writer;
revoke all on function juntia_private.create_expense_with_goal(text,text,text,text,text,text,uuid,text,smallint[],jsonb,uuid,text,text,text) from public,anon,authenticated;
grant execute on function juntia_private.create_expense_with_goal(text,text,text,text,text,text,uuid,text,smallint[],jsonb,uuid,text,text,text) to authenticated;
create function public.create_expense_with_goal(p_idempotency_key text,p_context text,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text,p_payer_user_id uuid,p_split_mode text,p_split_percents smallint[],p_parts jsonb,p_goal_id uuid,p_own_minor text,p_requested_minor text,p_type text default 'expense')
returns jsonb language sql security invoker set search_path='' return juntia_private.create_expense_with_goal(p_idempotency_key,p_context,p_amount_minor,p_category_id,p_transaction_date,p_description,p_payer_user_id,p_split_mode,p_split_percents,p_parts,p_goal_id,p_own_minor,p_requested_minor,p_type);
revoke all on function public.create_expense_with_goal(text,text,text,text,text,text,uuid,text,smallint[],jsonb,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.create_expense_with_goal(text,text,text,text,text,text,uuid,text,smallint[],jsonb,uuid,text,text,text) to authenticated;

-- Invoker de writer; la solicitud se lee otra vez DESPUÉS de bloquear sus raíces.
create function juntia_private.usage_request_write(p_action text,p_key text,p_request uuid,p_version integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=juntia_private.current_uid();c juntia_data.goal_usage_confirmations;before_value jsonb;g juntia_data.savings_goals;t juntia_data.transactions;
 gid uuid;saved jsonb;result jsonb;used numeric;entry_id uuid;n integer;
begin
 if uid is null then raise exception using errcode='JT001',message='notAuthenticated';end if;
 if p_action not in ('approve_usage_request','reject_usage_request','cancel_usage_request') then raise exception using errcode='JT004',message='invalidType';end if;
 saved:=juntia_private.begin_write(p_action,p_key,jsonb_build_object('request_id',p_request,'expected_version',p_version));if saved is not null then return saved;end if;
 select * into c from juntia_data.goal_usage_confirmations where id=p_request;
 if not found then raise exception using errcode='JT210',message='requestNotFound';end if;
 gid:=juntia_private.lock_active_couple();
 if p_action='approve_usage_request' then
  select * into t from juntia_data.transactions where id=c.transaction_id and group_id=gid for update;
  if not found then raise exception using errcode='JT210',message='requestNotFound';end if;
  select * into g from juntia_data.savings_goals where id=c.goal_id and group_id=gid for update;
  if not found then raise exception using errcode='JT201',message='goalNotFound';end if;
 end if;
 select * into c from juntia_data.goal_usage_confirmations where id=p_request for update;
 if not found then raise exception using errcode='JT210',message='requestNotFound';end if;
 if p_action='cancel_usage_request' and uid<>c.requested_by or p_action<>'cancel_usage_request' and uid<>c.member_user_id then raise exception using errcode='JT211',message='notRequestParty';end if;
 if c.status<>'pending' then raise exception using errcode='JT212',message='requestResolved';end if;
 if c.version is distinct from p_version then raise exception using errcode='JT011',message='versionConflict';end if;
 before_value:=to_jsonb(c)||jsonb_build_object('amount_minor',c.amount_minor::text);
 if p_action='approve_usage_request' then
  if t.status<>'active' then raise exception using errcode='JT012',message='transactionVoided';end if;
  if g.status='archived' then raise exception using errcode='JT202',message='goalNotOpen';end if;
  if c.amount_minor>juntia_private.goal_member_available(g.id,uid) then raise exception using errcode='JT204',message='insufficientMemberFunds';end if;
  select coalesce(sum(e.amount_minor),0) into used from juntia_data.goal_ledger_entries e where e.transaction_id=t.id and e.kind='usage' and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id);
  if used+c.amount_minor>t.amount_minor then raise exception using errcode='JT209',message='usageExceedsExpense';end if;
  insert into juntia_data.goal_ledger_entries(goal_id,kind,amount_minor,transaction_id,confirmation_id,created_by) values(g.id,'usage',c.amount_minor,t.id,c.id,uid) returning id into entry_id;
  insert into juntia_data.goal_usage_allocations(entry_id,member_user_id,amount_minor) values(entry_id,uid,c.amount_minor);
  insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"after") values(uid,'goal_entry',entry_id,'create',jsonb_build_object('goal_id',g.id,'transaction_id',t.id,'amount_minor',c.amount_minor::text,'confirmation_id',c.id));
 end if;
 update juntia_data.goal_usage_confirmations set status=case p_action when 'approve_usage_request' then 'approved' when 'reject_usage_request' then 'rejected' else 'cancelled' end,
  usage_entry_id=entry_id,resolved_by=uid,resolved_at=clock_timestamp(),version=version+1 where id=c.id and status='pending' returning * into c;
 get diagnostics n=row_count;if n<>1 then raise exception using errcode='42501',message='writeDenied';end if;
 result:=jsonb_build_object('request_id',c.id,'status',c.status);
 if entry_id is not null then result:=result||jsonb_build_object('usage_entry_id',entry_id);end if;
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"before","after") values(uid,'usage_request',c.id,
  case p_action when 'approve_usage_request' then 'approve' when 'reject_usage_request' then 'reject' else 'cancel' end,before_value,to_jsonb(c)||jsonb_build_object('amount_minor',c.amount_minor::text));
 return juntia_private.finish_write(p_action,p_key,result);
end $$;
revoke all on function juntia_private.usage_request_write(text,text,uuid,integer) from public,anon,authenticated;
grant execute on function juntia_private.usage_request_write(text,text,uuid,integer) to juntia_writer;

-- Definer limitado a writer: devolver fondos exige la misma autorización del gasto.
create function juntia_private.remove_goal_usage(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t juntia_data.transactions;gid uuid;saved jsonb;result jsonb;funding jsonb;uid uuid:=juntia_private.current_uid();
begin
 saved:=juntia_private.begin_write('remove_goal_usage',p_idempotency_key,jsonb_build_object('transaction_id',p_transaction_id,'expected_version',p_expected_version));if saved is not null then return saved;end if;
 select * into t from juntia_data.transactions where id=p_transaction_id;
 if not found then raise exception using errcode='JT010',message='transactionNotFound';end if;
 if t.group_id is not null then gid:=juntia_private.lock_active_couple();if gid<>t.group_id then raise exception using errcode='JT010',message='transactionNotFound';end if;end if;
 select * into t from juntia_data.transactions where id=p_transaction_id for update;
 if not found then raise exception using errcode='JT010',message='transactionNotFound';end if;
 if t.status<>'active' then raise exception using errcode='JT012',message='transactionVoided';end if;
 if t.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict';end if;
 if not juntia_private.transaction_goal_funded(t.id) and not exists(select 1 from juntia_data.goal_usage_confirmations where transaction_id=t.id and status='pending') then raise exception using errcode='JT226',message='nothingToRemove';end if;
 funding:=juntia_private.remove_transaction_goal_funding(t.id,'remove_usage');
 result:=jsonb_build_object('transaction_id',t.id)||funding;
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"after") values(uid,'transaction',t.id,'remove_usage',result);
 return juntia_private.finish_write('remove_goal_usage',p_idempotency_key,result);
end $$;
alter function juntia_private.remove_goal_usage(text,uuid,integer) owner to juntia_writer;
revoke all on function juntia_private.remove_goal_usage(text,uuid,integer) from public,anon,authenticated;
grant execute on function juntia_private.remove_goal_usage(text,uuid,integer) to authenticated;
create function public.remove_goal_usage(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path='' return juntia_private.remove_goal_usage(p_idempotency_key,p_transaction_id,p_expected_version);
revoke all on function public.remove_goal_usage(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.remove_goal_usage(text,uuid,integer) to authenticated;

-- Definer: solo activa writer y conserva la RLS y la identidad del actor.
create function juntia_private.approve_usage_request(p_idempotency_key text,p_request_id uuid,p_expected_version integer) returns jsonb language sql security definer set search_path='' return juntia_private.usage_request_write('approve_usage_request',p_idempotency_key,p_request_id,p_expected_version);
alter function juntia_private.approve_usage_request(text,uuid,integer) owner to juntia_writer;
revoke all on function juntia_private.approve_usage_request(text,uuid,integer) from public,anon,authenticated;
grant execute on function juntia_private.approve_usage_request(text,uuid,integer) to authenticated;
create function public.approve_usage_request(p_idempotency_key text,p_request_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path='' return juntia_private.approve_usage_request(p_idempotency_key,p_request_id,p_expected_version);
revoke all on function public.approve_usage_request(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.approve_usage_request(text,uuid,integer) to authenticated;

-- Definer: solo activa writer y conserva la RLS y la identidad del actor.
create function juntia_private.reject_usage_request(p_idempotency_key text,p_request_id uuid,p_expected_version integer) returns jsonb language sql security definer set search_path='' return juntia_private.usage_request_write('reject_usage_request',p_idempotency_key,p_request_id,p_expected_version);
alter function juntia_private.reject_usage_request(text,uuid,integer) owner to juntia_writer;
revoke all on function juntia_private.reject_usage_request(text,uuid,integer) from public,anon,authenticated;
grant execute on function juntia_private.reject_usage_request(text,uuid,integer) to authenticated;
create function public.reject_usage_request(p_idempotency_key text,p_request_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path='' return juntia_private.reject_usage_request(p_idempotency_key,p_request_id,p_expected_version);
revoke all on function public.reject_usage_request(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.reject_usage_request(text,uuid,integer) to authenticated;

-- Definer: solo activa writer y conserva la RLS y la identidad del actor.
create function juntia_private.cancel_usage_request(p_idempotency_key text,p_request_id uuid,p_expected_version integer) returns jsonb language sql security definer set search_path='' return juntia_private.usage_request_write('cancel_usage_request',p_idempotency_key,p_request_id,p_expected_version);
alter function juntia_private.cancel_usage_request(text,uuid,integer) owner to juntia_writer;
revoke all on function juntia_private.cancel_usage_request(text,uuid,integer) from public,anon,authenticated;
grant execute on function juntia_private.cancel_usage_request(text,uuid,integer) to authenticated;
create function public.cancel_usage_request(p_idempotency_key text,p_request_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path='' return juntia_private.cancel_usage_request(p_idempotency_key,p_request_id,p_expected_version);
revoke all on function public.cancel_usage_request(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.cancel_usage_request(text,uuid,integer) to authenticated;

revoke create on schema juntia_private from juntia_writer;

-- DEC-G04: una única instantánea. Yo atribuye consumo por reparto y usos por
-- aportante; Nosotros solo incorpora hechos compartidos. Pendientes no cuentan.
create view public.metric_months with(security_invoker=true) as
 with expense_values as (
  select 'me'::text as context,date_trunc('month',t.transaction_date)::date as month,t.amount_minor::numeric as amount
   from juntia_data.transactions t where t.type='expense' and t.status='active' and t.owner_user_id=(select auth.uid())
  union all
  select 'me',date_trunc('month',t.transaction_date)::date,a.amount_minor::numeric
   from juntia_data.transactions t join juntia_data.transaction_allocations a on a.transaction_id=t.id
   where t.type='expense' and t.status='active' and t.group_id is not null and a.user_id=(select auth.uid())
  union all
  select 'us',date_trunc('month',t.transaction_date)::date,t.amount_minor::numeric
   from juntia_data.transactions t where t.type='expense' and t.status='active' and t.group_id is not null
 ), consumption as (
  select context,month,sum(amount) as amount from expense_values group by context,month
 ), planning as (
  select context,month,
   sum(case when kind='contribution' and not voided then amount_minor::numeric else 0 end) as contributed,
   sum(case when kind='withdrawal' and not voided then amount_minor::numeric else 0 end) as withdrawn,
   sum(case when kind='usage' and not voided then amount_minor::numeric else 0 end) as funded
  from public.goal_activity group by context,month
 ), keys as (
  select context,month from consumption union select context,month from planning
 ), values_in_month as (
  select k.context,k.month,coalesce(c.amount,0) as spent,coalesce(p.contributed,0) as contributed,
   coalesce(p.withdrawn,0) as withdrawn,coalesce(p.funded,0) as funded
  from keys k left join consumption c on c.context=k.context and c.month=k.month
   left join planning p on p.context=k.context and p.month=k.month
 )
 select context,month,spent::text as gasto_consumo,contributed::text as aporte_a_metas,
  withdrawn::text as retiro_de_metas,funded::text as gasto_financiado_con_meta,
  (spent+contributed-withdrawn-funded)::text as total_destinado_neto from values_in_month;
revoke all on public.metric_months from public,anon,authenticated;
grant select on public.metric_months to authenticated;

-- update_shared_expense: misma firma, validación, RLS, auditoría e idempotencia de 002/003.
-- Definer existente de writer: añade financiación sin ampliar sus privilegios.
create or replace function juntia_private.update_shared_expense(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text,p_payer_user_id uuid,p_split_mode text,p_split_percents smallint[],p_parts jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); gid uuid; saved jsonb; n integer; amount bigint; day date;
 tx juntia_data.transactions; original juntia_data.transactions; settlement juntia_data.settlements; member record;
 result_value jsonb; before_value jsonb; restored_id uuid; debtor uuid; creditor uuid; pending numeric:=0; written_at timestamptz;
begin
 saved:=juntia_private.begin_write('update_shared_expense',p_idempotency_key,jsonb_build_object('transaction_id',p_transaction_id,'expected_version',p_expected_version,'amount_minor',p_amount_minor,'category_id',p_category_id,'transaction_date',p_transaction_date,'description',p_description,'payer_user_id',p_payer_user_id,'split_mode',p_split_mode,'split_percents',p_split_percents,'parts',p_parts)); if saved is not null then return saved; end if;
 gid:=juntia_private.lock_active_couple();

 select * into tx from juntia_data.transactions where id=p_transaction_id and group_id=gid for update;
 if not found then raise exception using errcode='JT010',message='transactionNotFound'; end if;
 if tx.status<>'active' then raise exception using errcode='JT012',message='transactionVoided'; end if;
 if tx.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
 amount:=juntia_private.shared_fields(p_amount_minor,p_category_id,p_transaction_date,p_description);
 perform juntia_private.validate_shared_split(gid,amount,p_payer_user_id,p_split_mode,p_split_percents,p_parts);
 perform juntia_private.check_transaction_goal_amount(tx.id,amount);
 before_value:=juntia_private.shared_payload(tx);
 update juntia_data.transactions set amount_minor=amount,category_id=p_category_id,transaction_date=p_transaction_date::date,description=nullif(btrim(p_description),''),payer_user_id=p_payer_user_id,
 split_mode=p_split_mode,split_percents=p_split_percents,updated_by=uid,updated_at=clock_timestamp(),version=version+1 where id=tx.id returning * into tx; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 delete from juntia_data.transaction_allocations where transaction_id=tx.id;
 get diagnostics n=row_count; if n<>2 then raise exception using errcode='42501',message='writeDenied'; end if;
 insert into juntia_data.transaction_allocations(transaction_id,user_id,amount_minor) select tx.id,key::uuid,value::bigint from jsonb_each_text(p_parts);
 get diagnostics n=row_count; if n<>2 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=juntia_private.shared_payload(tx);
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after") values(uid,'transaction',tx.id,'update',null,before_value,result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 return juntia_private.finish_write('update_shared_expense',p_idempotency_key,result_value);
end $$;

-- void_shared_expense: misma firma, validación, RLS, auditoría e idempotencia de 002/003.
-- Definer existente de writer: añade financiación sin ampliar sus privilegios.
create or replace function juntia_private.void_shared_expense(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); gid uuid; saved jsonb; n integer; amount bigint; day date;
 tx juntia_data.transactions; original juntia_data.transactions; settlement juntia_data.settlements; member record;
 result_value jsonb; before_value jsonb; restored_id uuid; debtor uuid; creditor uuid; pending numeric:=0; written_at timestamptz; funding_result jsonb;
begin
 saved:=juntia_private.begin_write('void_shared_expense',p_idempotency_key,jsonb_build_object('transaction_id',p_transaction_id,'expected_version',p_expected_version,'reason',p_reason)); if saved is not null then return saved; end if;
 gid:=juntia_private.lock_active_couple();

 select * into tx from juntia_data.transactions where id=p_transaction_id and group_id=gid for update;
 if not found then raise exception using errcode='JT010',message='transactionNotFound'; end if;
 if tx.status<>'active' then raise exception using errcode='JT012',message='transactionVoided'; end if;
 if tx.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
 if p_reason is null or p_reason not in ('delete','undo') then raise exception using errcode='JT017',message='invalidVoidReason'; end if;
 if p_reason='undo' and clock_timestamp()-tx.created_at>=interval '60 seconds' then
  if juntia_private.transaction_goal_funded(tx.id) or exists(select 1 from juntia_data.goal_usage_confirmations where transaction_id=tx.id and status='pending') then raise exception using errcode='JT225',message='goalUndoNotAvailable'; end if;
  raise exception using errcode='JT117',message='undoNotAvailable';
 end if;
 funding_result:=juntia_private.remove_transaction_goal_funding(tx.id,'expense_voided');
 before_value:=juntia_private.shared_payload(tx);
 update juntia_data.transactions set status='voided',voided_at=clock_timestamp(),voided_by=uid,version=version+1,updated_at=clock_timestamp(),updated_by=uid where id=tx.id returning * into tx; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=jsonb_build_object('id',tx.id,'status',tx.status,'version',tx.version);
 if jsonb_array_length(funding_result->'reactivated_goals')>0 then result_value:=result_value||jsonb_build_object('reactivated_goals',funding_result->'reactivated_goals');end if;
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after") values(uid,'transaction',tx.id,'void',p_reason,before_value,result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 return juntia_private.finish_write('void_shared_expense',p_idempotency_key,result_value);
end $$;

-- update_transaction: misma firma, validación, RLS, auditoría e idempotencia de 002/003.
-- Definer existente de writer: añade financiación sin ampliar sus privilegios.
create or replace function juntia_private.update_transaction(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid := juntia_private.current_uid(); key uuid; amount bigint; day date;
  v_description text := nullif(btrim(p_description),''); fp text; saved juntia_data.idempotency_records;
  tx juntia_data.transactions; before_payload jsonb; payload jsonb; v_result jsonb;
  affected integer;
begin
  if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
  amount := juntia_private.parse_amount_minor(p_amount_minor);
  if amount<=0 or amount>99999999900 or amount%100<>0 then raise exception using errcode='JT003',message='amountOutOfRange'; end if;
  if not exists(select 1 from juntia_data.categories where id=p_category_id) then raise exception using errcode='JT005',message='invalidCategory'; end if;
  begin
    if p_transaction_date is null or p_transaction_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise invalid_datetime_format; end if;
    day := p_transaction_date::date;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception using errcode='JT006',message='invalidDate'; end;
  if char_length(v_description)>140 then raise exception using errcode='JT007',message='descriptionTooLong'; end if;
  begin
    key := p_idempotency_key::uuid;
    if key is null then raise invalid_text_representation; end if;
  exception when invalid_text_representation then raise exception using errcode='JT009',message='invalidIdempotencyKey'; end;
  fp := juntia_private.request_fingerprint(jsonb_build_object('id',p_transaction_id,'expected_version',p_expected_version,'amount_minor',amount::text,'category_id',p_category_id,'transaction_date',day::text,'description',v_description));
  insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint)
    values(uid,'update_transaction',key,fp) on conflict do nothing;
  if not found then
    select * into saved from juntia_data.idempotency_records where actor_user_id=uid and action='update_transaction' and idempotency_key=key;
    if saved.request_fingerprint is distinct from fp or saved.status<>'completed' then raise exception using errcode='JT008',message='idempotencyKeyReused'; end if;
    return saved.result;
  end if;
  select * into tx from juntia_data.transactions where id=p_transaction_id and group_id is null and owner_user_id=uid for update;
  if not found then raise exception using errcode='JT010',message='transactionNotFound'; end if;
  if tx.status='voided' then raise exception using errcode='JT012',message='transactionVoided'; end if;
  if tx.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
  if not exists(select 1 from juntia_data.categories where id=p_category_id and kind=tx.type) then raise exception using errcode='JT005',message='invalidCategory'; end if;
  perform juntia_private.check_transaction_goal_amount(tx.id,amount);
  before_payload := to_jsonb(tx)||jsonb_build_object('amount_minor',tx.amount_minor::text);
  update juntia_data.transactions set amount_minor=amount,category_id=p_category_id,transaction_date=day,description=v_description,version=version+1,updated_at=now()
    where id=tx.id returning * into tx;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
  payload := to_jsonb(tx)||jsonb_build_object('amount_minor',tx.amount_minor::text);
  v_result := payload-array['created_by','owner_user_id','group_id','status','voided_at','voided_by'];
  insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"before","after") values(uid,'transaction',tx.id,'update',before_payload,payload);
  update juntia_data.idempotency_records set status='completed',result=v_result,completed_at=now()
    where actor_user_id=uid and action='update_transaction' and idempotency_key=key and status='pending';
  get diagnostics affected=row_count;
  if affected<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
  set constraints all immediate;
  set constraints all deferred;
  return v_result;
end $$;

-- void_transaction: misma firma, validación, RLS, auditoría e idempotencia de 002/003.
-- Definer existente de writer: añade financiación sin ampliar sus privilegios.
create or replace function juntia_private.void_transaction(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := juntia_private.current_uid(); key uuid; fp text; saved juntia_data.idempotency_records;
  tx juntia_data.transactions; before_payload jsonb; v_result jsonb;
  affected integer; funding_result jsonb;
begin
  if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
  if p_reason is null or p_reason not in ('delete','undo') then raise exception using errcode='JT017',message='invalidVoidReason'; end if;
  begin
    key := p_idempotency_key::uuid;
    if key is null then raise invalid_text_representation; end if;
  exception when invalid_text_representation then raise exception using errcode='JT009',message='invalidIdempotencyKey'; end;
  fp := juntia_private.request_fingerprint(jsonb_build_object('id',p_transaction_id,'expected_version',p_expected_version,'reason',p_reason));
  insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint)
    values(uid,'void_transaction',key,fp) on conflict do nothing;
  if not found then
    select * into saved from juntia_data.idempotency_records where actor_user_id=uid and action='void_transaction' and idempotency_key=key;
    if saved.request_fingerprint is distinct from fp or saved.status<>'completed' then raise exception using errcode='JT008',message='idempotencyKeyReused'; end if;
    return saved.result;
  end if;
  select * into tx from juntia_data.transactions where id=p_transaction_id and group_id is null and owner_user_id=uid for update;
  if not found then raise exception using errcode='JT010',message='transactionNotFound'; end if;
  if tx.status='voided' then raise exception using errcode='JT012',message='transactionVoided'; end if;
  if tx.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
  if p_reason='undo' and juntia_private.transaction_goal_funded(tx.id) and clock_timestamp()-tx.created_at>=interval '60 seconds' then raise exception using errcode='JT225',message='goalUndoNotAvailable';end if;
  funding_result:=juntia_private.remove_transaction_goal_funding(tx.id,'expense_voided');
  before_payload := to_jsonb(tx)||jsonb_build_object('amount_minor',tx.amount_minor::text);
  update juntia_data.transactions set status='voided',voided_at=now(),voided_by=uid,version=version+1,updated_at=now() where id=tx.id returning * into tx;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
  v_result := jsonb_build_object('id',tx.id,'status',tx.status,'version',tx.version);
  if jsonb_array_length(funding_result->'reactivated_goals')>0 then v_result:=v_result||jsonb_build_object('reactivated_goals',funding_result->'reactivated_goals');end if;
  insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after")
    values(uid,'transaction',tx.id,'void',p_reason,before_payload,to_jsonb(tx)||jsonb_build_object('amount_minor',tx.amount_minor::text));
  update juntia_data.idempotency_records set status='completed',result=v_result,completed_at=now()
    where actor_user_id=uid and action='void_transaction' and idempotency_key=key and status='pending';
  get diagnostics affected=row_count;
  if affected<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
  set constraints all immediate;
  set constraints all deferred;
  return v_result;
end $$;

notify pgrst,'reload schema';
