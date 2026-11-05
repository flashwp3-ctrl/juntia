-- T022: dinero exacto y protocolo pending/completed en una sola transacción.
create function juntia_private.parse_amount_minor(value text) returns bigint
language plpgsql immutable security invoker set search_path='' as $$
begin
  if value is null or value !~ '^[0-9]{1,19}$' then
    raise exception using errcode='JT002',message='invalidAmount';
  end if;
  begin return value::bigint;
  exception when numeric_value_out_of_range then
    raise exception using errcode='JT002',message='invalidAmount';
  end;
end $$;
create function juntia_private.request_fingerprint(value jsonb) returns text
language sql immutable security invoker set search_path=''
return encode(sha256(convert_to(value::text,'UTF8')),'hex');
revoke all on function juntia_private.parse_amount_minor(text),juntia_private.request_fingerprint(jsonb) from public,anon,authenticated;
grant execute on function juntia_private.parse_amount_minor(text),juntia_private.request_fingerprint(jsonb) to juntia_writer;

grant create on schema juntia_private to juntia_writer;
-- Definer de writer: crea y audita con RLS sin conceder INSERT a authenticated.
create function juntia_private.create_transaction(p_idempotency_key text,p_type text,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid := juntia_private.current_uid(); key uuid; amount bigint; day date;
  v_description text := nullif(btrim(p_description),''); fp text; saved juntia_data.idempotency_records;
  tx juntia_data.transactions; payload jsonb; v_result jsonb;
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
  return v_result;
end $$;
alter function juntia_private.create_transaction(text,text,text,text,text,text) owner to juntia_writer;

-- Definer de writer: bloquea, versiona y audita sin conceder UPDATE a authenticated.
create function juntia_private.update_transaction(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid := juntia_private.current_uid(); key uuid; amount bigint; day date;
  v_description text := nullif(btrim(p_description),''); fp text; saved juntia_data.idempotency_records;
  tx juntia_data.transactions; before_payload jsonb; payload jsonb; v_result jsonb;
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
  select * into tx from juntia_data.transactions where id=p_transaction_id for update;
  if not found then raise exception using errcode='JT010',message='transactionNotFound'; end if;
  if tx.status='voided' then raise exception using errcode='JT012',message='transactionVoided'; end if;
  if tx.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
  if not exists(select 1 from juntia_data.categories where id=p_category_id and kind=tx.type) then raise exception using errcode='JT005',message='invalidCategory'; end if;
  before_payload := to_jsonb(tx)||jsonb_build_object('amount_minor',tx.amount_minor::text);
  update juntia_data.transactions set amount_minor=amount,category_id=p_category_id,transaction_date=day,description=v_description,version=version+1,updated_at=now()
    where id=tx.id returning * into tx;
  payload := to_jsonb(tx)||jsonb_build_object('amount_minor',tx.amount_minor::text);
  v_result := payload-array['created_by','owner_user_id','group_id','status','voided_at','voided_by'];
  insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"before","after") values(uid,'transaction',tx.id,'update',before_payload,payload);
  update juntia_data.idempotency_records set status='completed',result=v_result,completed_at=now()
    where actor_user_id=uid and action='update_transaction' and idempotency_key=key and status='pending';
  return v_result;
end $$;
alter function juntia_private.update_transaction(text,uuid,integer,text,text,text,text) owner to juntia_writer;

-- Definer de writer: anula y audita bajo RLS, conservando el rastro y la idempotencia.
create function juntia_private.void_transaction(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := juntia_private.current_uid(); key uuid; fp text; saved juntia_data.idempotency_records;
  tx juntia_data.transactions; before_payload jsonb; v_result jsonb;
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
  select * into tx from juntia_data.transactions where id=p_transaction_id for update;
  if not found then raise exception using errcode='JT010',message='transactionNotFound'; end if;
  if tx.status='voided' then raise exception using errcode='JT012',message='transactionVoided'; end if;
  if tx.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
  before_payload := to_jsonb(tx)||jsonb_build_object('amount_minor',tx.amount_minor::text);
  update juntia_data.transactions set status='voided',voided_at=now(),voided_by=uid,version=version+1,updated_at=now() where id=tx.id returning * into tx;
  v_result := jsonb_build_object('id',tx.id,'status',tx.status,'version',tx.version);
  insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,reason,"before","after")
    values(uid,'transaction',tx.id,'void',p_reason,before_payload,to_jsonb(tx)||jsonb_build_object('amount_minor',tx.amount_minor::text));
  update juntia_data.idempotency_records set status='completed',result=v_result,completed_at=now()
    where actor_user_id=uid and action='void_transaction' and idempotency_key=key and status='pending';
  return v_result;
end $$;
alter function juntia_private.void_transaction(text,uuid,integer,text) owner to juntia_writer;
revoke create on schema juntia_private from juntia_writer;
revoke all on function juntia_private.create_transaction(text,text,text,text,text,text),juntia_private.update_transaction(text,uuid,integer,text,text,text,text),juntia_private.void_transaction(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function juntia_private.create_transaction(text,text,text,text,text,text),juntia_private.update_transaction(text,uuid,integer,text,text,text,text),juntia_private.void_transaction(text,uuid,integer,text) to authenticated;
create function public.create_transaction(p_idempotency_key text,p_type text,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text)
returns jsonb language sql security invoker set search_path=''
return juntia_private.create_transaction(p_idempotency_key,p_type,p_amount_minor,p_category_id,p_transaction_date,p_description);
create function public.update_transaction(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_amount_minor text,p_category_id text,p_transaction_date text,p_description text)
returns jsonb language sql security invoker set search_path=''
return juntia_private.update_transaction(p_idempotency_key,p_transaction_id,p_expected_version,p_amount_minor,p_category_id,p_transaction_date,p_description);
create function public.void_transaction(p_idempotency_key text,p_transaction_id uuid,p_expected_version integer,p_reason text)
returns jsonb language sql security invoker set search_path=''
return juntia_private.void_transaction(p_idempotency_key,p_transaction_id,p_expected_version,p_reason);
revoke all on function public.create_transaction(text,text,text,text,text,text),public.update_transaction(text,uuid,integer,text,text,text,text),public.void_transaction(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.create_transaction(text,text,text,text,text,text),public.update_transaction(text,uuid,integer,text,text,text,text),public.void_transaction(text,uuid,integer,text) to authenticated;
