-- 003 T020: helpers invoker, privados de writer. Ningún privilegio de app adicional.
create function juntia_private.transaction_goal_funded(p_transaction_id uuid) returns boolean
language sql stable security invoker set search_path='' return false;
comment on function juntia_private.transaction_goal_funded(uuid) is 'P0-3 sustituye el cuerpo por la consulta al vínculo de financiación (ADR-001 punto 7, FR-035)';
revoke all on function juntia_private.transaction_goal_funded(uuid) from public,anon,authenticated;
grant execute on function juntia_private.transaction_goal_funded(uuid) to juntia_writer;

create function juntia_private.begin_write(p_action text,p_key text,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); key_value uuid; fp text; saved juntia_data.idempotency_records; n integer;
begin
 if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
 begin key_value:=p_key::uuid; if key_value is null then raise invalid_text_representation; end if;
 exception when invalid_text_representation then raise exception using errcode='JT009',message='invalidIdempotencyKey'; end;
 fp:=juntia_private.request_fingerprint(p_payload);
 insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint) values(uid,p_action,key_value,fp) on conflict do nothing;
 get diagnostics n=row_count;
 if n=1 then return null; end if;
 select * into saved from juntia_data.idempotency_records where actor_user_id=uid and action=p_action and idempotency_key=key_value;
 if not found or saved.status<>'completed' or saved.request_fingerprint is distinct from fp then raise exception using errcode='JT008',message='idempotencyKeyReused'; end if;
 return saved.result;
end $$;
create function juntia_private.finish_write(p_action text,p_key text,p_result jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 update juntia_data.idempotency_records set status='completed',result=p_result,completed_at=clock_timestamp()
 where actor_user_id=juntia_private.current_uid() and action=p_action and idempotency_key=p_key::uuid and status='pending';
 get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 -- Se comprueban las partes todavía con RLS de writer, no al volver a authenticated.
 set constraints all immediate;
 set constraints all deferred;
 return p_result;
end $$;
create function juntia_private.lock_active_couple() returns uuid
language plpgsql security invoker set search_path='' as $$
declare gid uuid;
begin
 select g.id into gid from juntia_data.groups g join juntia_data.group_members m on m.group_id=g.id
 where m.user_id=juntia_private.current_uid() and m.status='active' and g.status='active' for update of g;
 if not found then raise exception using errcode='JT105',message='coupleNotActive'; end if;
 return gid;
end $$;
create function juntia_private.shared_fields(p_amount text,p_category text,p_date text,p_description text) returns bigint
language plpgsql security invoker set search_path='' as $$
declare amount bigint; day date;
begin
 amount:=juntia_private.parse_amount_minor(p_amount);
 if amount<=0 or amount>99999999900 or amount%100<>0 then raise exception using errcode='JT003',message='amountOutOfRange'; end if;
 if not exists(select 1 from juntia_data.categories where id=p_category and kind='expense') then raise exception using errcode='JT005',message='invalidCategory'; end if;
 begin if p_date is null or p_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise invalid_datetime_format; end if; day:=p_date::date;
 exception when invalid_datetime_format or datetime_field_overflow then raise exception using errcode='JT006',message='invalidDate'; end;
 if char_length(btrim(p_description))>140 then raise exception using errcode='JT007',message='descriptionTooLong'; end if;
 return amount;
end $$;
create function juntia_private.validate_shared_split(p_group uuid,p_amount bigint,p_payer uuid,p_mode text,p_percents smallint[],p_parts jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare part record; total numeric:=0; positives integer:=0; n integer:=0; value bigint; denominator integer; mismatch boolean;
begin
 if not exists(select 1 from juntia_data.group_members where group_id=p_group and user_id=p_payer and status='active') then raise exception using errcode='JT111',message='notCoupleMember'; end if;
 if p_mode is null or p_mode not in ('equal','percent','amount') then raise exception using errcode='JT118',message='invalidSplitMode'; end if;
 if p_parts is null or jsonb_typeof(p_parts)<>'object' then raise exception using errcode='JT110',message='invalidSplit'; end if;
 for part in select e.key,e.value from jsonb_each(p_parts) e loop
  if not exists(select 1 from juntia_data.group_members where group_id=p_group and user_id::text=part.key and status='active') then raise exception using errcode='JT111',message='notCoupleMember'; end if;
  if jsonb_typeof(part.value)<>'string' or (part.value#>>'{}') !~ '^[0-9]{1,19}$' then raise exception using errcode='JT110',message='invalidSplit'; end if;
  begin value:=(part.value#>>'{}')::bigint; exception when numeric_value_out_of_range then raise exception using errcode='JT110',message='invalidSplit'; end;
  if value<0 or value%100<>0 then raise exception using errcode='JT110',message='invalidSplit'; end if;
  total:=total+value; n:=n+1; if value>0 then positives:=positives+1; end if;
 end loop;
 if n<>2 or total<>p_amount or positives=0 then raise exception using errcode='JT110',message='invalidSplit'; end if;
 if p_mode='percent' then
  if p_percents is null or cardinality(p_percents)<>2 or array_ndims(p_percents)<>1 or array_lower(p_percents,1)<>1 or array_position(p_percents,null) is not null
   or p_percents[1] not between 0 and 100 or p_percents[2] not between 0 and 100 or p_percents[1]+p_percents[2]<>100 then raise exception using errcode='JT110',message='invalidSplit'; end if;
 elsif p_percents is not null then raise exception using errcode='JT110',message='invalidSplit';
 end if;
 if p_mode='amount' then return; end if;
 denominator:=case when p_mode='equal' then positives else 100 end;
 -- ADR-002 v1: pesos enteros, mayor residuo, desempate por join_order.
 with weights as (
  select join_order,(p_parts->>user_id::text)::bigint as actual,
   case when p_mode='percent' then p_percents[join_order] when (p_parts->>user_id::text)::bigint>0 then 1 else 0 end as weight
  from juntia_data.group_members where group_id=p_group and status='active'
 ), shares as (
  select *,floor((p_amount/100)::numeric*weight/denominator) as base,mod((p_amount/100)::numeric*weight,denominator) as remainder from weights
 ), rounded as (
  select *,p_amount/100-sum(base) over() as missing,row_number() over(order by remainder desc,join_order) as priority from shares
 ) select bool_or(actual<>(base+case when priority<=missing then 1 else 0 end)*100) into mismatch from rounded;
 if mismatch then raise exception using errcode='JT110',message='invalidSplit'; end if;
end $$;
create function juntia_private.shared_payload(p_tx juntia_data.transactions) returns jsonb
language sql stable security invoker set search_path='' as $$
 select (to_jsonb(p_tx)-array['owner_user_id','group_id','moved_from_transaction_id','moved_to_transaction_id','restored_from_transaction_id','voided_at','voided_by'])
 ||jsonb_build_object('amount_minor',p_tx.amount_minor::text,'moved_from_me',p_tx.moved_from_transaction_id is not null and p_tx.created_by=juntia_private.current_uid(),
 'parts',(select jsonb_object_agg(user_id::text,amount_minor::text) from juntia_data.transaction_allocations where transaction_id=p_tx.id));
$$;
revoke all on function juntia_private.begin_write(text,text,jsonb),juntia_private.finish_write(text,text,jsonb),juntia_private.lock_active_couple(),juntia_private.shared_fields(text,text,text,text),juntia_private.validate_shared_split(uuid,bigint,uuid,text,smallint[],jsonb),juntia_private.shared_payload(juntia_data.transactions) from public,anon,authenticated;
grant execute on function juntia_private.begin_write(text,text,jsonb),juntia_private.finish_write(text,text,jsonb),juntia_private.lock_active_couple(),juntia_private.shared_fields(text,text,text,text),juntia_private.validate_shared_split(uuid,bigint,uuid,text,smallint[],jsonb),juntia_private.shared_payload(juntia_data.transactions) to juntia_writer;

grant create on schema juntia_private to juntia_writer;
create function juntia_private.create_shared_expense(p_idempotency_key text,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text,p_payer_user_id uuid,p_split_mode text,p_split_percents smallint[],p_parts jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); gid uuid; saved jsonb; n integer; amount bigint; day date;
 tx juntia_data.transactions; original juntia_data.transactions; settlement juntia_data.settlements; member record;
 result_value jsonb; before_value jsonb; restored_id uuid; debtor uuid; creditor uuid; pending numeric:=0; written_at timestamptz;
begin
 saved:=juntia_private.begin_write('create_shared_expense',p_idempotency_key,jsonb_build_object('amount_minor',p_amount_minor,'category_id',p_category_id,'transaction_date',p_transaction_date,'description',p_description,'payer_user_id',p_payer_user_id,'split_mode',p_split_mode,'split_percents',p_split_percents,'parts',p_parts)); if saved is not null then return saved; end if;
 gid:=juntia_private.lock_active_couple();

 amount:=juntia_private.shared_fields(p_amount_minor,p_category_id,p_transaction_date,p_description);
 perform juntia_private.validate_shared_split(gid,amount,p_payer_user_id,p_split_mode,p_split_percents,p_parts);
 written_at:=clock_timestamp();
 insert into juntia_data.transactions(type,created_by,group_id,payer_user_id,amount_minor,category_id,transaction_date,description,split_mode,split_percents,updated_by,created_at,updated_at)
 values('expense',uid,gid,p_payer_user_id,amount,p_category_id,p_transaction_date::date,nullif(btrim(p_description),''),p_split_mode,p_split_percents,uid,written_at,written_at) returning * into tx; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 insert into juntia_data.transaction_allocations(transaction_id,user_id,amount_minor) select tx.id,key::uuid,value::bigint from jsonb_each_text(p_parts);
 get diagnostics n=row_count; if n<>2 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=juntia_private.shared_payload(tx);
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after") values(uid,'transaction',tx.id,'create',null,null,result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 return juntia_private.finish_write('create_shared_expense',p_idempotency_key,result_value);
end $$;
alter function juntia_private.create_shared_expense(text,text,text,text,text,uuid,text,smallint[],jsonb) owner to juntia_writer;
revoke all on function juntia_private.create_shared_expense(text,text,text,text,text,uuid,text,smallint[],jsonb) from public,anon,authenticated;
grant execute on function juntia_private.create_shared_expense(text,text,text,text,text,uuid,text,smallint[],jsonb) to authenticated;
create function public.create_shared_expense(p_idempotency_key text,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text,p_payer_user_id uuid,p_split_mode text,p_split_percents smallint[],p_parts jsonb) returns jsonb language sql security invoker set search_path=''
return juntia_private.create_shared_expense(p_idempotency_key,p_amount_minor,p_category_id,p_transaction_date,p_description,p_payer_user_id,p_split_mode,p_split_percents,p_parts);
revoke all on function public.create_shared_expense(text,text,text,text,text,uuid,text,smallint[],jsonb) from public,anon,authenticated;
grant execute on function public.create_shared_expense(text,text,text,text,text,uuid,text,smallint[],jsonb) to authenticated;
create function juntia_private.update_shared_expense(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text,p_payer_user_id uuid,p_split_mode text,p_split_percents smallint[],p_parts jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
alter function juntia_private.update_shared_expense(text,uuid,integer,text,text,text,text,uuid,text,smallint[],jsonb) owner to juntia_writer;
revoke all on function juntia_private.update_shared_expense(text,uuid,integer,text,text,text,text,uuid,text,smallint[],jsonb) from public,anon,authenticated;
grant execute on function juntia_private.update_shared_expense(text,uuid,integer,text,text,text,text,uuid,text,smallint[],jsonb) to authenticated;
create function public.update_shared_expense(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text,p_payer_user_id uuid,p_split_mode text,p_split_percents smallint[],p_parts jsonb) returns jsonb language sql security invoker set search_path=''
return juntia_private.update_shared_expense(p_idempotency_key,p_transaction_id,p_expected_version,p_amount_minor,p_category_id,p_transaction_date,p_description,p_payer_user_id,p_split_mode,p_split_percents,p_parts);
revoke all on function public.update_shared_expense(text,uuid,integer,text,text,text,text,uuid,text,smallint[],jsonb) from public,anon,authenticated;
grant execute on function public.update_shared_expense(text,uuid,integer,text,text,text,text,uuid,text,smallint[],jsonb) to authenticated;
create function juntia_private.void_shared_expense(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); gid uuid; saved jsonb; n integer; amount bigint; day date;
 tx juntia_data.transactions; original juntia_data.transactions; settlement juntia_data.settlements; member record;
 result_value jsonb; before_value jsonb; restored_id uuid; debtor uuid; creditor uuid; pending numeric:=0; written_at timestamptz;
begin
 saved:=juntia_private.begin_write('void_shared_expense',p_idempotency_key,jsonb_build_object('transaction_id',p_transaction_id,'expected_version',p_expected_version,'reason',p_reason)); if saved is not null then return saved; end if;
 gid:=juntia_private.lock_active_couple();

 select * into tx from juntia_data.transactions where id=p_transaction_id and group_id=gid for update;
 if not found then raise exception using errcode='JT010',message='transactionNotFound'; end if;
 if tx.status<>'active' then raise exception using errcode='JT012',message='transactionVoided'; end if;
 if tx.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
 if p_reason is null or p_reason not in ('delete','undo') then raise exception using errcode='JT017',message='invalidVoidReason'; end if;
 if p_reason='undo' and clock_timestamp()-tx.created_at>=interval '60 seconds' then raise exception using errcode='JT117',message='undoNotAvailable'; end if;
 before_value:=juntia_private.shared_payload(tx);
 update juntia_data.transactions set status='voided',voided_at=clock_timestamp(),voided_by=uid,version=version+1,updated_at=clock_timestamp(),updated_by=uid where id=tx.id returning * into tx; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=jsonb_build_object('id',tx.id,'status',tx.status,'version',tx.version);
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after") values(uid,'transaction',tx.id,'void',p_reason,before_value,result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 return juntia_private.finish_write('void_shared_expense',p_idempotency_key,result_value);
end $$;
alter function juntia_private.void_shared_expense(text,uuid,integer,text) owner to juntia_writer;
revoke all on function juntia_private.void_shared_expense(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function juntia_private.void_shared_expense(text,uuid,integer,text) to authenticated;
create function public.void_shared_expense(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_reason text) returns jsonb language sql security invoker set search_path=''
return juntia_private.void_shared_expense(p_idempotency_key,p_transaction_id,p_expected_version,p_reason);
revoke all on function public.void_shared_expense(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.void_shared_expense(text,uuid,integer,text) to authenticated;
create function juntia_private.reclassify_to_shared(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_split_mode text,p_split_percents smallint[],p_parts jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); gid uuid; saved jsonb; n integer; amount bigint; day date;
 tx juntia_data.transactions; original juntia_data.transactions; settlement juntia_data.settlements; member record;
 result_value jsonb; before_value jsonb; restored_id uuid; debtor uuid; creditor uuid; pending numeric:=0; written_at timestamptz;
begin
 saved:=juntia_private.begin_write('reclassify_to_shared',p_idempotency_key,jsonb_build_object('transaction_id',p_transaction_id,'expected_version',p_expected_version,'split_mode',p_split_mode,'split_percents',p_split_percents,'parts',p_parts)); if saved is not null then return saved; end if;
 begin gid:=juntia_private.lock_active_couple();
 exception when sqlstate 'JT105' then raise exception using errcode='JT115',message='moveNotAllowed'; end;

 select * into original from juntia_data.transactions where id=p_transaction_id and group_id is null and owner_user_id=uid for update;
 if not found then raise exception using errcode='JT010',message='transactionNotFound'; end if;
 if original.status<>'active' or original.type<>'expense' then raise exception using errcode='JT115',message='moveNotAllowed'; end if;
 if original.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
 if juntia_private.transaction_goal_funded(original.id) then raise exception using errcode='JT116',message='moveFundedByGoal'; end if;
 perform juntia_private.validate_shared_split(gid,original.amount_minor,uid,p_split_mode,p_split_percents,p_parts);
 before_value:=to_jsonb(original)||jsonb_build_object('amount_minor',original.amount_minor::text);
 written_at:=clock_timestamp();
 insert into juntia_data.transactions(type,created_by,group_id,payer_user_id,amount_minor,category_id,transaction_date,description,split_mode,split_percents,moved_from_transaction_id,updated_by,created_at,updated_at)
 values('expense',uid,gid,uid,original.amount_minor,original.category_id,original.transaction_date,original.description,p_split_mode,p_split_percents,original.id,uid,written_at,written_at) returning * into tx; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 insert into juntia_data.transaction_allocations(transaction_id,user_id,amount_minor) select tx.id,key::uuid,value::bigint from jsonb_each_text(p_parts);
 get diagnostics n=row_count; if n<>2 then raise exception using errcode='42501',message='writeDenied'; end if;
 -- Se publica todo en una transacción: la FK del enlace apunta a la fila ya insertada.
 update juntia_data.transactions set status='voided',voided_at=clock_timestamp(),voided_by=uid,updated_at=clock_timestamp(),updated_by=uid,version=version+1,moved_to_transaction_id=tx.id where id=original.id; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=jsonb_build_object('voided_private_id',original.id,'shared',juntia_private.shared_payload(tx));
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after") values(uid,'transaction',original.id,'move',null,before_value,result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after") values(uid,'transaction',tx.id,'create',null,null,juntia_private.shared_payload(tx)); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 return juntia_private.finish_write('reclassify_to_shared',p_idempotency_key,result_value);
end $$;
alter function juntia_private.reclassify_to_shared(text,uuid,integer,text,smallint[],jsonb) owner to juntia_writer;
revoke all on function juntia_private.reclassify_to_shared(text,uuid,integer,text,smallint[],jsonb) from public,anon,authenticated;
grant execute on function juntia_private.reclassify_to_shared(text,uuid,integer,text,smallint[],jsonb) to authenticated;
create function public.reclassify_to_shared(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_split_mode text,p_split_percents smallint[],p_parts jsonb) returns jsonb language sql security invoker set search_path=''
return juntia_private.reclassify_to_shared(p_idempotency_key,p_transaction_id,p_expected_version,p_split_mode,p_split_percents,p_parts);
revoke all on function public.reclassify_to_shared(text,uuid,integer,text,smallint[],jsonb) from public,anon,authenticated;
grant execute on function public.reclassify_to_shared(text,uuid,integer,text,smallint[],jsonb) to authenticated;
create function juntia_private.undo_reclassify_to_shared(p_idempotency_key text,p_shared_transaction_id uuid,p_expected_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); gid uuid; saved jsonb; n integer; amount bigint; day date;
 tx juntia_data.transactions; original juntia_data.transactions; settlement juntia_data.settlements; member record;
 result_value jsonb; before_value jsonb; restored_id uuid; debtor uuid; creditor uuid; pending numeric:=0; written_at timestamptz;
begin
 saved:=juntia_private.begin_write('undo_reclassify_to_shared',p_idempotency_key,jsonb_build_object('shared_transaction_id',p_shared_transaction_id,'expected_version',p_expected_version)); if saved is not null then return saved; end if;
 gid:=juntia_private.lock_active_couple();

 select * into tx from juntia_data.transactions where id=p_shared_transaction_id and group_id=gid;
 if not found or tx.created_by<>uid or tx.moved_from_transaction_id is null then raise exception using errcode='JT117',message='undoNotAvailable'; end if;
 perform 1 from juntia_data.transactions where id in(tx.id,tx.moved_from_transaction_id) order by id for update;
 select * into tx from juntia_data.transactions where id=p_shared_transaction_id and group_id=gid;
 if tx.status<>'active' then raise exception using errcode='JT012',message='transactionVoided'; end if;
 if tx.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
 if tx.version<>1 or clock_timestamp()-tx.created_at>=interval '60 seconds' or exists(select 1 from juntia_data.settlements where group_id=gid and created_at>tx.created_at) then raise exception using errcode='JT117',message='undoNotAvailable'; end if;
 select * into original from juntia_data.transactions where id=tx.moved_from_transaction_id and owner_user_id=uid and group_id is null and status='voided';
 if not found or original.moved_to_transaction_id is distinct from tx.id then raise exception using errcode='JT117',message='undoNotAvailable'; end if;
 before_value:=juntia_private.shared_payload(tx);
 update juntia_data.transactions set status='voided',voided_at=clock_timestamp(),voided_by=uid,version=version+1,updated_at=clock_timestamp(),updated_by=uid where id=tx.id; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 written_at:=clock_timestamp();
 insert into juntia_data.transactions(type,created_by,owner_user_id,amount_minor,category_id,transaction_date,description,restored_from_transaction_id,updated_by,created_at,updated_at)
 values('expense',uid,uid,original.amount_minor,original.category_id,original.transaction_date,original.description,tx.id,uid,written_at,written_at) returning id into restored_id; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=jsonb_build_object('restored_private_id',restored_id);
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after") values(uid,'transaction',tx.id,'void','undo',before_value,jsonb_build_object('id',tx.id,'status','voided','version',tx.version+1)); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after") values(uid,'transaction',restored_id,'restore',null,null,result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 return juntia_private.finish_write('undo_reclassify_to_shared',p_idempotency_key,result_value);
end $$;
alter function juntia_private.undo_reclassify_to_shared(text,uuid,integer) owner to juntia_writer;
revoke all on function juntia_private.undo_reclassify_to_shared(text,uuid,integer) from public,anon,authenticated;
grant execute on function juntia_private.undo_reclassify_to_shared(text,uuid,integer) to authenticated;
create function public.undo_reclassify_to_shared(p_idempotency_key text,p_shared_transaction_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path=''
return juntia_private.undo_reclassify_to_shared(p_idempotency_key,p_shared_transaction_id,p_expected_version);
revoke all on function public.undo_reclassify_to_shared(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.undo_reclassify_to_shared(text,uuid,integer) to authenticated;
create function juntia_private.register_settlement(p_idempotency_key text,p_amount_minor text,p_settlement_date text,p_note text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); gid uuid; saved jsonb; n integer; amount bigint; day date;
 tx juntia_data.transactions; original juntia_data.transactions; settlement juntia_data.settlements; member record;
 result_value jsonb; before_value jsonb; restored_id uuid; debtor uuid; creditor uuid; pending numeric:=0; written_at timestamptz;
begin
 saved:=juntia_private.begin_write('register_settlement',p_idempotency_key,jsonb_build_object('amount_minor',p_amount_minor,'settlement_date',p_settlement_date,'note',p_note)); if saved is not null then return saved; end if;
 gid:=juntia_private.lock_active_couple();

 amount:=juntia_private.parse_amount_minor(p_amount_minor);
 if amount<=0 or amount%100<>0 then raise exception using errcode='JT003',message='amountOutOfRange'; end if;
 begin if p_settlement_date is null or p_settlement_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise invalid_datetime_format; end if; day:=p_settlement_date::date;
 exception when invalid_datetime_format or datetime_field_overflow then raise exception using errcode='JT114',message='invalidSettlementDate'; end;
 if day>(clock_timestamp() at time zone 'America/Bogota')::date then raise exception using errcode='JT114',message='invalidSettlementDate'; end if;
 if char_length(btrim(p_note))>140 then raise exception using errcode='JT007',message='descriptionTooLong'; end if;
 for member in
  select m.user_id,
   coalesce((select sum(t.amount_minor) from juntia_data.transactions t where t.group_id=gid and t.status='active' and t.payer_user_id=m.user_id),0)
   -coalesce((select sum(a.amount_minor) from juntia_data.transaction_allocations a join juntia_data.transactions t on t.id=a.transaction_id where t.group_id=gid and t.status='active' and a.user_id=m.user_id),0)
   +coalesce((select sum(s.amount_minor) from juntia_data.settlements s where s.group_id=gid and s.status='active' and s.from_user_id=m.user_id),0)
   -coalesce((select sum(s.amount_minor) from juntia_data.settlements s where s.group_id=gid and s.status='active' and s.to_user_id=m.user_id),0) as net
  from juntia_data.group_members m where m.group_id=gid and m.status='active'
 loop
  if member.net<0 then debtor:=member.user_id; end if;
  if member.net>0 then creditor:=member.user_id; pending:=member.net; end if;
 end loop;
 if pending=0 or debtor is null or creditor is null then raise exception using errcode='JT106',message='nothingToSettle'; end if;
 if amount>pending then raise exception using errcode='JT107',message='settlementExceedsPending'; end if;
 written_at:=clock_timestamp();
 insert into juntia_data.settlements(group_id,from_user_id,to_user_id,amount_minor,settlement_date,note,created_by,created_at)
 values(gid,debtor,creditor,amount,day,nullif(btrim(p_note),''),uid,written_at) returning * into settlement; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=to_jsonb(settlement)||jsonb_build_object('amount_minor',settlement.amount_minor::text,'pending_before',pending::text,'pending_after',(pending-amount)::text);
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after") values(uid,'settlement',settlement.id,'create',null,null,result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 return juntia_private.finish_write('register_settlement',p_idempotency_key,result_value);
end $$;
alter function juntia_private.register_settlement(text,text,text,text) owner to juntia_writer;
revoke all on function juntia_private.register_settlement(text,text,text,text) from public,anon,authenticated;
grant execute on function juntia_private.register_settlement(text,text,text,text) to authenticated;
create function public.register_settlement(p_idempotency_key text,p_amount_minor text,p_settlement_date text,p_note text) returns jsonb language sql security invoker set search_path=''
return juntia_private.register_settlement(p_idempotency_key,p_amount_minor,p_settlement_date,p_note);
revoke all on function public.register_settlement(text,text,text,text) from public,anon,authenticated;
grant execute on function public.register_settlement(text,text,text,text) to authenticated;
create function juntia_private.void_settlement(p_idempotency_key text,p_settlement_id uuid,p_expected_version integer,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); gid uuid; saved jsonb; n integer; amount bigint; day date;
 tx juntia_data.transactions; original juntia_data.transactions; settlement juntia_data.settlements; member record;
 result_value jsonb; before_value jsonb; restored_id uuid; debtor uuid; creditor uuid; pending numeric:=0; written_at timestamptz;
begin
 saved:=juntia_private.begin_write('void_settlement',p_idempotency_key,jsonb_build_object('settlement_id',p_settlement_id,'expected_version',p_expected_version,'reason',p_reason)); if saved is not null then return saved; end if;
 gid:=juntia_private.lock_active_couple();

 select * into settlement from juntia_data.settlements where id=p_settlement_id and group_id=gid for update;
 if not found then raise exception using errcode='JT112',message='settlementNotFound'; end if;
 if settlement.status<>'active' then raise exception using errcode='JT113',message='settlementVoided'; end if;
 if settlement.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
 if p_reason is null or p_reason not in ('void','undo') then raise exception using errcode='JT017',message='invalidVoidReason'; end if;
 if p_reason='undo' and clock_timestamp()-settlement.created_at>=interval '60 seconds' then raise exception using errcode='JT117',message='undoNotAvailable'; end if;
 before_value:=to_jsonb(settlement)||jsonb_build_object('amount_minor',settlement.amount_minor::text);
 update juntia_data.settlements set status='voided',voided_at=clock_timestamp(),voided_by=uid,void_reason=p_reason,version=version+1 where id=settlement.id returning * into settlement; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=jsonb_build_object('id',settlement.id,'status',settlement.status,'version',settlement.version);
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after") values(uid,'settlement',settlement.id,'void',p_reason,before_value,result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 return juntia_private.finish_write('void_settlement',p_idempotency_key,result_value);
end $$;
alter function juntia_private.void_settlement(text,uuid,integer,text) owner to juntia_writer;
revoke all on function juntia_private.void_settlement(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function juntia_private.void_settlement(text,uuid,integer,text) to authenticated;
create function public.void_settlement(p_idempotency_key text,p_settlement_id uuid,p_expected_version integer,p_reason text) returns jsonb language sql security invoker set search_path=''
return juntia_private.void_settlement(p_idempotency_key,p_settlement_id,p_expected_version,p_reason);
revoke all on function public.void_settlement(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.void_settlement(text,uuid,integer,text) to authenticated;
create function juntia_private.write_status(p_action text,p_idempotency_key text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); key_value uuid; result_value jsonb;
begin
 if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
 begin key_value:=p_idempotency_key::uuid; exception when invalid_text_representation then raise exception using errcode='JT009',message='invalidIdempotencyKey'; end;
 select result into result_value from juntia_data.idempotency_records where actor_user_id=uid and action=p_action and idempotency_key=key_value and status='completed';
 if not found then return jsonb_build_object('state','not_found'); end if;
 return jsonb_build_object('state','completed','result',result_value);
end $$;
alter function juntia_private.write_status(text,text) owner to juntia_writer;
revoke all on function juntia_private.write_status(text,text) from public,anon,authenticated;
grant execute on function juntia_private.write_status(text,text) to authenticated;
create function public.write_status(p_action text,p_idempotency_key text) returns jsonb language sql stable security invoker set search_path='' return juntia_private.write_status(p_action,p_idempotency_key);
revoke all on function public.write_status(text,text) from public,anon,authenticated;
grant execute on function public.write_status(text,text) to authenticated;
revoke create on schema juntia_private from juntia_writer;

-- F49-2: redefiniciones de la 002 ANTES de habilitar escritura de grupo.
create or replace function juntia_private.ensure_profile() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  uid uuid := juntia_private.current_uid();
  claims jsonb;
  name text;
  result jsonb;
  affected integer;
begin
  if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
  claims := coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb);
  name := btrim(claims->'user_metadata'->>'display_name');
  if name is null or char_length(name) not between 1 and 60 or position(chr(10) in name)>0 or position(chr(13) in name)>0 then
    name := left(btrim(replace(replace(split_part(coalesce(claims->>'email','persona'),'@',1),chr(10),''),chr(13),'')),60);
    if name='' then name := 'persona'; end if;
  end if;
  insert into juntia_data.profiles(user_id,display_name) values(uid,name) on conflict(user_id) do nothing;
  select jsonb_build_object('display_name',p.display_name,'theme',p.theme,'first_entry_completed',p.first_entry_completed_at is not null)
    into result from juntia_data.profiles p where p.user_id=uid;
  if not found then raise exception using errcode='42501',message='writeDenied'; end if;
  return result;
end $$;

create or replace function juntia_private.complete_first_entry() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid := juntia_private.current_uid(); result jsonb;
  affected integer;
begin
  if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
  perform juntia_private.ensure_profile();
  update juntia_data.profiles set first_entry_completed_at=coalesce(first_entry_completed_at,now()), updated_at=now() where user_id=uid;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
  select jsonb_build_object('display_name',p.display_name,'theme',p.theme,'first_entry_completed',p.first_entry_completed_at is not null)
    into result from juntia_data.profiles p where p.user_id=uid;
  return result;
end $$;

create or replace function juntia_private.update_display_name(p_display_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid := juntia_private.current_uid(); name text := btrim(p_display_name); result jsonb;
  affected integer;
begin
  if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
  if name is null or char_length(name) not between 1 and 60 or position(chr(10) in name)>0 or position(chr(13) in name)>0 then
    raise exception using errcode='JT014',message='invalidDisplayName';
  end if;
  perform juntia_private.ensure_profile();
  update juntia_data.profiles set display_name=name,updated_at=now() where user_id=uid;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
  select jsonb_build_object('display_name',p.display_name,'theme',p.theme,'first_entry_completed',p.first_entry_completed_at is not null)
    into result from juntia_data.profiles p where p.user_id=uid;
  return result;
end $$;

create or replace function juntia_private.set_theme(p_theme text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid := juntia_private.current_uid(); result jsonb;
  affected integer;
begin
  if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
  if p_theme is null or p_theme not in ('light','dark','system') then raise exception using errcode='JT015',message='invalidTheme'; end if;
  perform juntia_private.ensure_profile();
  update juntia_data.profiles set theme=p_theme,updated_at=now() where user_id=uid;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
  select jsonb_build_object('display_name',p.display_name,'theme',p.theme,'first_entry_completed',p.first_entry_completed_at is not null)
    into result from juntia_data.profiles p where p.user_id=uid;
  return result;
end $$;

create or replace function juntia_private.create_transaction(p_idempotency_key text,p_type text,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid := juntia_private.current_uid(); key uuid; amount bigint; day date;
  v_description text := nullif(btrim(p_description),''); fp text; saved juntia_data.idempotency_records;
  tx juntia_data.transactions; payload jsonb; v_result jsonb;
  affected integer;
begin
  if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
  amount := juntia_private.parse_amount_minor(p_amount_minor);
  if amount<=0 or amount>99999999900 or amount%100<>0 then raise exception using errcode='JT003',message='amountOutOfRange'; end if;
  if p_type is null or p_type not in ('expense','income') then raise exception using errcode='JT004',message='invalidType'; end if;
  if not exists(select 1 from juntia_data.categories where id=p_category_id and kind=p_type) then raise exception using errcode='JT005',message='invalidCategory'; end if;
  begin
    if p_transaction_date is null or p_transaction_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise invalid_datetime_format; end if;
    day := p_transaction_date::date;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception using errcode='JT006',message='invalidDate'; end;
  if char_length(v_description)>140 then raise exception using errcode='JT007',message='descriptionTooLong'; end if;
  begin
    key := p_idempotency_key::uuid;
    if key is null then raise invalid_text_representation; end if;
  exception when invalid_text_representation then raise exception using errcode='JT009',message='invalidIdempotencyKey'; end;
  fp := juntia_private.request_fingerprint(jsonb_build_object('type',p_type,'amount_minor',amount::text,'category_id',p_category_id,'transaction_date',day::text,'description',v_description));
  insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint)
    values(uid,'create_transaction',key,fp) on conflict do nothing;
  if not found then
    select * into saved from juntia_data.idempotency_records where actor_user_id=uid and action='create_transaction' and idempotency_key=key;
    if saved.request_fingerprint is distinct from fp or saved.status<>'completed' then raise exception using errcode='JT008',message='idempotencyKeyReused'; end if;
    return saved.result;
  end if;
  insert into juntia_data.transactions(type,created_by,owner_user_id,amount_minor,category_id,transaction_date,description)
    values(p_type,uid,uid,amount,p_category_id,day,v_description) returning * into tx;
  payload := to_jsonb(tx)||jsonb_build_object('amount_minor',tx.amount_minor::text);
  v_result := payload-array['created_by','owner_user_id','group_id','status','voided_at','voided_by'];
  insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"after") values(uid,'transaction',tx.id,'create',payload);
  update juntia_data.idempotency_records set status='completed',result=v_result,completed_at=now()
    where actor_user_id=uid and action='create_transaction' and idempotency_key=key and status='pending';
  get diagnostics affected=row_count;
  if affected<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
  return v_result;
end $$;

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
  return v_result;
end $$;

create or replace function juntia_private.void_transaction(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := juntia_private.current_uid(); key uuid; fp text; saved juntia_data.idempotency_records;
  tx juntia_data.transactions; before_payload jsonb; v_result jsonb;
  affected integer;
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
  before_payload := to_jsonb(tx)||jsonb_build_object('amount_minor',tx.amount_minor::text);
  update juntia_data.transactions set status='voided',voided_at=now(),voided_by=uid,version=version+1,updated_at=now() where id=tx.id returning * into tx;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
  v_result := jsonb_build_object('id',tx.id,'status',tx.status,'version',tx.version);
  insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after")
    values(uid,'transaction',tx.id,'void',p_reason,before_payload,to_jsonb(tx)||jsonb_build_object('amount_minor',tx.amount_minor::text));
  update juntia_data.idempotency_records set status='completed',result=v_result,completed_at=now()
    where actor_user_id=uid and action='void_transaction' and idempotency_key=key and status='pending';
  get diagnostics affected=row_count;
  if affected<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
  return v_result;
end $$;
grant update(payer_user_id,split_mode,split_percents,updated_by,moved_to_transaction_id) on juntia_data.transactions to juntia_writer;
drop policy transactions_insert on juntia_data.transactions;
create policy transactions_insert on juntia_data.transactions for insert to juntia_writer with check(created_by=(select auth.uid()) and
 ((group_id is null and owner_user_id=(select auth.uid())) or (owner_user_id is null and juntia_private.is_couple_member(group_id))));
drop policy transactions_update on juntia_data.transactions;
create policy transactions_update on juntia_data.transactions for update to juntia_writer
 using((group_id is null and owner_user_id=(select auth.uid())) or (group_id is not null and juntia_private.is_couple_member(group_id)))
 with check((group_id is null and owner_user_id=(select auth.uid())) or (group_id is not null and juntia_private.is_couple_member(group_id)));
