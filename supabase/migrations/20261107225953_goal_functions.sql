-- 004 T017. Helpers invoker internos: la identidad cambia solo en cada RPC
-- definer de juntia_writer; sus políticas siguen aplicándose (ADR-013).
create function juntia_private.lock_planning_goal(p_goal_id uuid) returns juntia_data.savings_goals
language plpgsql security invoker set search_path='' as $$
declare g juntia_data.savings_goals;gid uuid;
begin
 select * into g from juntia_data.savings_goals where id=p_goal_id;
 if not found then raise exception using errcode='JT201',message='goalNotFound'; end if;
 if g.group_id is not null then
  gid:=juntia_private.lock_active_couple();
  if gid<>g.group_id then raise exception using errcode='JT201',message='goalNotFound'; end if;
 end if;
 select * into g from juntia_data.savings_goals where id=p_goal_id for update;
 if not found then raise exception using errcode='JT201',message='goalNotFound'; end if;
 return g;
end $$;
revoke all on function juntia_private.lock_planning_goal(uuid) from public,anon,authenticated;
grant execute on function juntia_private.lock_planning_goal(uuid) to juntia_writer;

create function juntia_private.budget_write(p_action text,p_key text,p_context text,p_budget uuid,p_version integer,p_category text,p_limit text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare uid uuid:=juntia_private.current_uid();b juntia_data.budgets;gid uuid;amount bigint;
 saved jsonb;result jsonb;prior text;v_month date:=date_trunc('month',now() at time zone 'America/Bogota')::date;n integer;
begin
 if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
 if p_action not in ('create_budget','update_budget') then raise exception using errcode='JT004',message='invalidType'; end if;
 begin
  if p_limit is not null then amount:=juntia_private.parse_amount_minor(p_limit);end if;
  if amount is not null and (amount<=0 or amount%100<>0 or amount>99999999900) or p_action='create_budget' and amount is null then raise exception using errcode='JT221',message='invalidBudget';end if;
 exception when sqlstate 'JT002' then raise exception using errcode='JT221',message='invalidBudget';end;
 saved:=juntia_private.begin_write(p_action,p_key,jsonb_build_object('context',p_context,'budget_id',p_budget,'expected_version',p_version,'category_id',p_category,'limit_minor',amount::text));
 if saved is not null then return saved;end if;
 if p_action='create_budget' then
  if p_context is null or p_context not in ('me','us') then raise exception using errcode='JT004',message='invalidType';end if;
  if not exists(select 1 from juntia_data.categories where id=p_category and kind='expense') then raise exception using errcode='JT221',message='invalidBudget';end if;
  if p_context='me' then perform pg_advisory_xact_lock(hashtextextended(uid::text,0));else gid:=juntia_private.lock_active_couple();end if;
  if exists(select 1 from juntia_data.budgets where coalesce(owner_user_id,group_id)=coalesce(gid,uid) and category_id=p_category and currency='COP') then raise exception using errcode='JT219',message='budgetAlreadyExists';end if;
  insert into juntia_data.budgets(owner_user_id,group_id,category_id,created_by,updated_by)
   values(case when gid is null then uid end,gid,p_category,uid,uid) returning * into b;
 else
  select * into b from juntia_data.budgets where id=p_budget;
  if not found then raise exception using errcode='JT218',message='budgetNotFound';end if;
  if b.group_id is null then perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  else gid:=juntia_private.lock_active_couple();if gid<>b.group_id then raise exception using errcode='JT218',message='budgetNotFound';end if;end if;
  select * into b from juntia_data.budgets where id=p_budget for update;
  if not found then raise exception using errcode='JT218',message='budgetNotFound';end if;
  if b.version is distinct from p_version then raise exception using errcode='JT011',message='versionConflict';end if;
  select limit_minor::text into prior from juntia_data.budget_versions where budget_id=b.id order by effective_month desc,changed_at desc,id desc limit 1;
  update juntia_data.budgets set version=version+1,updated_by=uid,updated_at=clock_timestamp() where id=b.id returning * into b;
  get diagnostics n=row_count;if n<>1 then raise exception using errcode='42501',message='writeDenied';end if;
 end if;
 insert into juntia_data.budget_versions(budget_id,effective_month,limit_minor,changed_by) values(b.id,v_month,amount,uid);
 result:=jsonb_build_object('budget_id',b.id,'version',b.version,'effective_month',v_month);
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"before","after")
 values(uid,'budget',b.id,case when p_action='create_budget' then 'create' else 'update' end,
  case when p_action='update_budget' then jsonb_build_object('limit_minor',prior,'version',p_version) end,
  result||jsonb_build_object('limit_minor',amount::text,'category_id',b.category_id));
 return juntia_private.finish_write(p_action,p_key,result);
end $$;
revoke all on function juntia_private.budget_write(text,text,text,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function juntia_private.budget_write(text,text,text,uuid,integer,text,text) to juntia_writer;

create function juntia_private.goal_write(p_action text,p_key text,p_context text,p_goal uuid,p_version integer,p_name text,p_type text,p_target text,p_month text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare uid uuid:=juntia_private.current_uid();g juntia_data.savings_goals;gid uuid;amount bigint;v_month date;
 saved jsonb;result jsonb;before_value jsonb;n integer;balance numeric;
begin
 if uid is null then raise exception using errcode='JT001',message='notAuthenticated';end if;
 if p_action not in ('create_goal','update_goal','complete_goal','archive_goal') then raise exception using errcode='JT004',message='invalidType';end if;
 if p_action in ('create_goal','update_goal') then
  begin
   amount:=juntia_private.parse_amount_minor(p_target);
   if p_month is not null then
    if p_month !~ '^[0-9]{4}-[0-9]{2}-01$' then raise invalid_datetime_format;end if;
    v_month:=p_month::date;
   end if;
  exception when sqlstate 'JT002' or invalid_datetime_format or datetime_field_overflow then raise exception using errcode='JT215',message='invalidGoal';end;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 60 or p_type is null or p_type not in ('travel','home','wedding','vehicle','education','emergency','other') or amount<=0 or amount%100<>0 or amount>99999999900 then raise exception using errcode='JT215',message='invalidGoal';end if;
 end if;
 saved:=juntia_private.begin_write(p_action,p_key,jsonb_build_object('context',p_context,'goal_id',p_goal,'expected_version',p_version,'name',btrim(p_name),'goal_type',p_type,'target_minor',amount::text,'target_month',v_month));
 if saved is not null then return saved;end if;
 if p_action='create_goal' then
  if p_context is null or p_context not in ('me','us') then raise exception using errcode='JT004',message='invalidType';end if;
  if p_context='us' then gid:=juntia_private.lock_active_couple();end if;
  insert into juntia_data.savings_goals(owner_user_id,group_id,name,goal_type,target_minor,target_month,created_by,updated_by)
   values(case when gid is null then uid end,gid,btrim(p_name),p_type,amount,v_month,uid,uid) returning * into g;
 else
  g:=juntia_private.lock_planning_goal(p_goal);
  if g.version is distinct from p_version then raise exception using errcode='JT011',message='versionConflict';end if;
  if g.status='archived' or p_action='complete_goal' and g.status<>'active' then raise exception using errcode='JT214',message='goalTransitionNotAllowed';end if;
  before_value:=to_jsonb(g)||jsonb_build_object('target_minor',g.target_minor::text);
  if p_action='archive_goal' then
   perform id from juntia_data.goal_usage_confirmations where goal_id=g.id and status='pending' order by id for update;
   select coalesce(sum(case when e.kind='contribution' then e.amount_minor else -e.amount_minor end),0) into balance
    from juntia_data.goal_ledger_entries e where e.goal_id=g.id and e.kind<>'void' and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id);
   if balance<>0 or exists(select 1 from juntia_data.goal_usage_confirmations where goal_id=g.id and status='pending') then raise exception using errcode='JT214',message='goalTransitionNotAllowed';end if;
  end if;
  if p_action='update_goal' then
   update juntia_data.savings_goals set name=btrim(p_name),goal_type=p_type,target_minor=amount,target_month=v_month,version=version+1,updated_by=uid,updated_at=clock_timestamp() where id=g.id returning * into g;
  else
   update juntia_data.savings_goals set status=case when p_action='complete_goal' then 'completed' else 'archived' end,
    completed_at=case when p_action='complete_goal' then clock_timestamp() end,archived_at=case when p_action='archive_goal' then clock_timestamp() end,
    version=version+1,updated_by=uid,updated_at=clock_timestamp() where id=g.id returning * into g;
  end if;
  get diagnostics n=row_count;if n<>1 then raise exception using errcode='42501',message='writeDenied';end if;
 end if;
 result:=to_jsonb(g)||jsonb_build_object('target_minor',g.target_minor::text);
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"before","after")
  values(uid,'goal',g.id,case p_action when 'create_goal' then 'create' when 'update_goal' then 'update' when 'complete_goal' then 'complete' else 'archive' end,before_value,result);
 return juntia_private.finish_write(p_action,p_key,result);
end $$;
revoke all on function juntia_private.goal_write(text,text,text,uuid,integer,text,text,text,text) from public,anon,authenticated;
grant execute on function juntia_private.goal_write(text,text,text,uuid,integer,text,text,text,text) to juntia_writer;

create function juntia_private.goal_entry_write(p_action text,p_key text,p_goal uuid,p_entry uuid,p_amount text,p_date text,p_mode text,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare uid uuid:=juntia_private.current_uid();g juntia_data.savings_goals;e juntia_data.goal_ledger_entries;original juntia_data.goal_ledger_entries;
 amount bigint;day date;saved jsonb;result jsonb;available numeric;reason_value text:=btrim(p_reason);
begin
 if uid is null then raise exception using errcode='JT001',message='notAuthenticated';end if;
 if p_action not in ('contribute_to_goal','withdraw_from_goal','void_goal_entry') then raise exception using errcode='JT004',message='invalidType';end if;
 if p_action<>'void_goal_entry' then
  amount:=juntia_private.parse_amount_minor(p_amount);
  if amount<=0 or amount%100<>0 or amount>99999999900 then raise exception using errcode='JT003',message='amountOutOfRange';end if;
  begin
   if p_date is null or p_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise invalid_datetime_format;end if;
   day:=p_date::date;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception using errcode='JT208',message='invalidEntryDate';end;
 end if;
 saved:=juntia_private.begin_write(p_action,p_key,jsonb_build_object('goal_id',p_goal,'entry_id',p_entry,'amount_minor',amount::text,'entry_date',day,'funding_mode',p_mode,'reason',reason_value));
 if saved is not null then return saved;end if;
 if p_action='void_goal_entry' then
  select * into original from juntia_data.goal_ledger_entries where id=p_entry;
  if not found then raise exception using errcode='JT205',message='entryNotFound';end if;
  g:=juntia_private.lock_planning_goal(original.goal_id);
 else g:=juntia_private.lock_planning_goal(p_goal);end if;
 if g.status='archived' or p_action='contribute_to_goal' and g.status<>'active' then raise exception using errcode='JT202',message='goalNotOpen';end if;
 if p_action='void_goal_entry' then
  if reason_value is null or reason_value not in ('undo','void') then raise exception using errcode='JT017',message='invalidVoidReason';end if;
  if original.kind not in ('contribution','withdrawal') or original.member_user_id<>uid or original.kind='withdrawal' and reason_value<>'undo' then raise exception using errcode='JT206',message='entryNotVoidable';end if;
  if exists(select 1 from juntia_data.goal_ledger_entries where voids_entry_id=original.id) then raise exception using errcode='JT207',message='entryAlreadyVoided';end if;
  if reason_value='undo' and clock_timestamp()>original.created_at+interval '60 seconds' then raise exception using errcode='JT225',message='goalUndoNotAvailable';end if;
  available:=juntia_private.goal_member_available(g.id,uid);
  if original.kind='contribution' and available<original.amount_minor then raise exception using errcode='JT204',message='insufficientMemberFunds',detail=jsonb_build_object('available_minor',available::text)::text;end if;
  insert into juntia_data.goal_ledger_entries(goal_id,kind,voids_entry_id,reason,created_by) values(g.id,'void',original.id,reason_value,uid) returning * into e;
  result:=jsonb_build_object('entry_id',original.id,'voided',true);
 else
  if day>(now() at time zone 'America/Bogota')::date or day<(g.created_at at time zone 'America/Bogota')::date then raise exception using errcode='JT208',message='invalidEntryDate';end if;
  if p_action='contribute_to_goal' then
   if p_mode is null or p_mode not in ('reserved','transferred_declared') then raise exception using errcode='JT216',message='invalidFundingMode';end if;
  else
   if reason_value is null or char_length(reason_value) not between 1 and 140 then raise exception using errcode='JT217',message='withdrawalReasonRequired';end if;
   available:=juntia_private.goal_member_available(g.id,uid);
   if amount>available then raise exception using errcode='JT204',message='insufficientMemberFunds',detail=jsonb_build_object('available_minor',available::text)::text;end if;
  end if;
  insert into juntia_data.goal_ledger_entries(goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,reason,created_by)
   values(g.id,case when p_action='contribute_to_goal' then 'contribution' else 'withdrawal' end,uid,amount,day,
    case when p_action='contribute_to_goal' then p_mode end,case when p_action='withdraw_from_goal' then reason_value end,uid) returning * into e;
  result:=to_jsonb(e)||jsonb_build_object('amount_minor',e.amount_minor::text,'available_minor',juntia_private.goal_member_available(g.id,uid)::text);
 end if;
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after")
  values(uid,'goal_entry',case when p_action='void_goal_entry' then original.id else e.id end,case when p_action='void_goal_entry' then 'void' else 'create' end,
   case when p_action='void_goal_entry' then reason_value end,
   case when p_action='void_goal_entry' then to_jsonb(original)||jsonb_build_object('amount_minor',original.amount_minor::text) end,
   to_jsonb(e)||jsonb_build_object('amount_minor',e.amount_minor::text));
 return juntia_private.finish_write(p_action,p_key,result);
end $$;
revoke all on function juntia_private.goal_entry_write(text,text,uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function juntia_private.goal_entry_write(text,text,uuid,uuid,text,text,text,text) to juntia_writer;

-- Frontera ADR-013: el definer activa solo los grants/RLS de writer; nada privilegiado en public.
grant create on schema juntia_private to juntia_writer;

create function juntia_private.create_budget(p_idempotency_key text,p_context text,p_category_id text,p_limit_minor text) returns jsonb language sql security definer set search_path='' return juntia_private.budget_write('create_budget',p_idempotency_key,p_context,null,null,p_category_id,p_limit_minor);
alter function juntia_private.create_budget(text,text,text,text) owner to juntia_writer;
revoke all on function juntia_private.create_budget(text,text,text,text) from public,anon,authenticated;
grant execute on function juntia_private.create_budget(text,text,text,text) to authenticated;
create function public.create_budget(p_idempotency_key text,p_context text,p_category_id text,p_limit_minor text) returns jsonb language sql security invoker set search_path='' return juntia_private.create_budget(p_idempotency_key,p_context,p_category_id,p_limit_minor);
revoke all on function public.create_budget(text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_budget(text,text,text,text) to authenticated;

create function juntia_private.update_budget(p_idempotency_key text,p_budget_id uuid,p_expected_version integer,p_limit_minor text) returns jsonb language sql security definer set search_path='' return juntia_private.budget_write('update_budget',p_idempotency_key,null,p_budget_id,p_expected_version,null,p_limit_minor);
alter function juntia_private.update_budget(text,uuid,integer,text) owner to juntia_writer;
revoke all on function juntia_private.update_budget(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function juntia_private.update_budget(text,uuid,integer,text) to authenticated;
create function public.update_budget(p_idempotency_key text,p_budget_id uuid,p_expected_version integer,p_limit_minor text) returns jsonb language sql security invoker set search_path='' return juntia_private.update_budget(p_idempotency_key,p_budget_id,p_expected_version,p_limit_minor);
revoke all on function public.update_budget(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.update_budget(text,uuid,integer,text) to authenticated;

create function juntia_private.create_goal(p_idempotency_key text,p_context text,p_name text,p_goal_type text,p_target_minor text,p_target_month text) returns jsonb language sql security definer set search_path='' return juntia_private.goal_write('create_goal',p_idempotency_key,p_context,null,null,p_name,p_goal_type,p_target_minor,p_target_month);
alter function juntia_private.create_goal(text,text,text,text,text,text) owner to juntia_writer;
revoke all on function juntia_private.create_goal(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function juntia_private.create_goal(text,text,text,text,text,text) to authenticated;
create function public.create_goal(p_idempotency_key text,p_context text,p_name text,p_goal_type text,p_target_minor text,p_target_month text) returns jsonb language sql security invoker set search_path='' return juntia_private.create_goal(p_idempotency_key,p_context,p_name,p_goal_type,p_target_minor,p_target_month);
revoke all on function public.create_goal(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_goal(text,text,text,text,text,text) to authenticated;

create function juntia_private.update_goal(p_idempotency_key text,p_goal_id uuid,p_expected_version integer,p_name text,p_goal_type text,p_target_minor text,p_target_month text) returns jsonb language sql security definer set search_path='' return juntia_private.goal_write('update_goal',p_idempotency_key,null,p_goal_id,p_expected_version,p_name,p_goal_type,p_target_minor,p_target_month);
alter function juntia_private.update_goal(text,uuid,integer,text,text,text,text) owner to juntia_writer;
revoke all on function juntia_private.update_goal(text,uuid,integer,text,text,text,text) from public,anon,authenticated;
grant execute on function juntia_private.update_goal(text,uuid,integer,text,text,text,text) to authenticated;
create function public.update_goal(p_idempotency_key text,p_goal_id uuid,p_expected_version integer,p_name text,p_goal_type text,p_target_minor text,p_target_month text) returns jsonb language sql security invoker set search_path='' return juntia_private.update_goal(p_idempotency_key,p_goal_id,p_expected_version,p_name,p_goal_type,p_target_minor,p_target_month);
revoke all on function public.update_goal(text,uuid,integer,text,text,text,text) from public,anon,authenticated;
grant execute on function public.update_goal(text,uuid,integer,text,text,text,text) to authenticated;

create function juntia_private.complete_goal(p_idempotency_key text,p_goal_id uuid,p_expected_version integer) returns jsonb language sql security definer set search_path='' return juntia_private.goal_write('complete_goal',p_idempotency_key,null,p_goal_id,p_expected_version,null,null,null,null);
alter function juntia_private.complete_goal(text,uuid,integer) owner to juntia_writer;
revoke all on function juntia_private.complete_goal(text,uuid,integer) from public,anon,authenticated;
grant execute on function juntia_private.complete_goal(text,uuid,integer) to authenticated;
create function public.complete_goal(p_idempotency_key text,p_goal_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path='' return juntia_private.complete_goal(p_idempotency_key,p_goal_id,p_expected_version);
revoke all on function public.complete_goal(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.complete_goal(text,uuid,integer) to authenticated;

create function juntia_private.archive_goal(p_idempotency_key text,p_goal_id uuid,p_expected_version integer) returns jsonb language sql security definer set search_path='' return juntia_private.goal_write('archive_goal',p_idempotency_key,null,p_goal_id,p_expected_version,null,null,null,null);
alter function juntia_private.archive_goal(text,uuid,integer) owner to juntia_writer;
revoke all on function juntia_private.archive_goal(text,uuid,integer) from public,anon,authenticated;
grant execute on function juntia_private.archive_goal(text,uuid,integer) to authenticated;
create function public.archive_goal(p_idempotency_key text,p_goal_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path='' return juntia_private.archive_goal(p_idempotency_key,p_goal_id,p_expected_version);
revoke all on function public.archive_goal(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.archive_goal(text,uuid,integer) to authenticated;

create function juntia_private.contribute_to_goal(p_idempotency_key text,p_goal_id uuid,p_amount_minor text,p_entry_date text,p_funding_mode text) returns jsonb language sql security definer set search_path='' return juntia_private.goal_entry_write('contribute_to_goal',p_idempotency_key,p_goal_id,null,p_amount_minor,p_entry_date,p_funding_mode,null);
alter function juntia_private.contribute_to_goal(text,uuid,text,text,text) owner to juntia_writer;
revoke all on function juntia_private.contribute_to_goal(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function juntia_private.contribute_to_goal(text,uuid,text,text,text) to authenticated;
create function public.contribute_to_goal(p_idempotency_key text,p_goal_id uuid,p_amount_minor text,p_entry_date text,p_funding_mode text) returns jsonb language sql security invoker set search_path='' return juntia_private.contribute_to_goal(p_idempotency_key,p_goal_id,p_amount_minor,p_entry_date,p_funding_mode);
revoke all on function public.contribute_to_goal(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.contribute_to_goal(text,uuid,text,text,text) to authenticated;

create function juntia_private.withdraw_from_goal(p_idempotency_key text,p_goal_id uuid,p_amount_minor text,p_entry_date text,p_reason text) returns jsonb language sql security definer set search_path='' return juntia_private.goal_entry_write('withdraw_from_goal',p_idempotency_key,p_goal_id,null,p_amount_minor,p_entry_date,null,p_reason);
alter function juntia_private.withdraw_from_goal(text,uuid,text,text,text) owner to juntia_writer;
revoke all on function juntia_private.withdraw_from_goal(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function juntia_private.withdraw_from_goal(text,uuid,text,text,text) to authenticated;
create function public.withdraw_from_goal(p_idempotency_key text,p_goal_id uuid,p_amount_minor text,p_entry_date text,p_reason text) returns jsonb language sql security invoker set search_path='' return juntia_private.withdraw_from_goal(p_idempotency_key,p_goal_id,p_amount_minor,p_entry_date,p_reason);
revoke all on function public.withdraw_from_goal(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.withdraw_from_goal(text,uuid,text,text,text) to authenticated;

create function juntia_private.void_goal_entry(p_idempotency_key text,p_entry_id uuid,p_reason text) returns jsonb language sql security definer set search_path='' return juntia_private.goal_entry_write('void_goal_entry',p_idempotency_key,null,p_entry_id,null,null,null,p_reason);
alter function juntia_private.void_goal_entry(text,uuid,text) owner to juntia_writer;
revoke all on function juntia_private.void_goal_entry(text,uuid,text) from public,anon,authenticated;
grant execute on function juntia_private.void_goal_entry(text,uuid,text) to authenticated;
create function public.void_goal_entry(p_idempotency_key text,p_entry_id uuid,p_reason text) returns jsonb language sql security invoker set search_path='' return juntia_private.void_goal_entry(p_idempotency_key,p_entry_id,p_reason);
revoke all on function public.void_goal_entry(text,uuid,text) from public,anon,authenticated;
grant execute on function public.void_goal_entry(text,uuid,text) to authenticated;

revoke create on schema juntia_private from juntia_writer;
notify pgrst,'reload schema';
