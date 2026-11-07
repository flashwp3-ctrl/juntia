-- 003 T019: escrituras de invitación con RLS, idempotencia y persona → grupo.
grant create on schema juntia_private to juntia_writer;
create function juntia_private.create_invitation(p_idempotency_key text,p_email text,p_token_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); key uuid; fp text; n integer; saved juntia_data.idempotency_records;
 g juntia_data.groups; inv juntia_data.group_invitations; next_inv juntia_data.group_invitations;
 email_value text; name_value text; result_value jsonb;
begin
 if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
 email_value:=lower(btrim(p_email));
 if email_value is null or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or email_value=juntia_private.current_email() then raise exception using errcode='JT108',message='invalidEmail'; end if;
 if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception using errcode='JT109',message='invalidTokenHash'; end if;

 if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
 begin
  key:=p_idempotency_key::uuid; if key is null then raise invalid_text_representation; end if;
 exception when invalid_text_representation then raise exception using errcode='JT009',message='invalidIdempotencyKey'; end;
 fp:=juntia_private.request_fingerprint(jsonb_build_object('email',email_value,'token_hash',p_token_hash));
 insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint) values(uid,'create_invitation',key,fp) on conflict do nothing;
 get diagnostics n=row_count;
 if n=0 then
  select * into saved from juntia_data.idempotency_records where actor_user_id=uid and action='create_invitation' and idempotency_key=key;
  if not found or saved.request_fingerprint is distinct from fp or saved.status<>'completed' then raise exception using errcode='JT008',message='idempotencyKeyReused'; end if;
  return saved.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if exists(select 1 from juntia_data.group_members where user_id=uid and status='active') then raise exception using errcode='JT101',message='alreadyInCouple'; end if;
 perform juntia_private.ensure_profile();
 select display_name into name_value from juntia_data.profiles where user_id=uid;
 if not found then raise exception using errcode='42501',message='writeDenied'; end if;
 insert into juntia_data.groups(owner_user_id,status) values(uid,'provisional') returning * into g; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 insert into juntia_data.group_members(group_id,user_id,role,join_order,status) values(g.id,uid,'owner',1,'active'); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 insert into juntia_data.group_invitations(group_id,email,token_hash,status,created_by,inviter_display_name)
 values(g.id,email_value,p_token_hash,'pending',uid,name_value) returning * into inv; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=jsonb_build_object('group_id',g.id,'invitation_id',inv.id,'expires_at',inv.expires_at);
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"after") values(uid,'invitation',inv.id,'create',result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;

 update juntia_data.idempotency_records set status='completed',result=result_value,completed_at=now() where actor_user_id=uid and action='create_invitation' and idempotency_key=key and status='pending';
 get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 set constraints all immediate;
 set constraints all deferred;
 return result_value;
end $$;
alter function juntia_private.create_invitation(text,text,text) owner to juntia_writer;
revoke all on function juntia_private.create_invitation(text,text,text) from public,anon,authenticated;
grant execute on function juntia_private.create_invitation(text,text,text) to authenticated;
create function public.create_invitation(p_idempotency_key text,p_email text,p_token_hash text) returns jsonb language sql security invoker set search_path=''
return juntia_private.create_invitation(p_idempotency_key,p_email,p_token_hash);
revoke all on function public.create_invitation(text,text,text) from public,anon,authenticated;
grant execute on function public.create_invitation(text,text,text) to authenticated;
create function juntia_private.regenerate_invitation(p_idempotency_key text,p_group_id uuid,p_expected_version integer,p_token_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); key uuid; fp text; n integer; saved juntia_data.idempotency_records;
 g juntia_data.groups; inv juntia_data.group_invitations; next_inv juntia_data.group_invitations;
 email_value text; name_value text; result_value jsonb;
begin
 if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception using errcode='JT109',message='invalidTokenHash'; end if;

 if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
 begin
  key:=p_idempotency_key::uuid; if key is null then raise invalid_text_representation; end if;
 exception when invalid_text_representation then raise exception using errcode='JT009',message='invalidIdempotencyKey'; end;
 fp:=juntia_private.request_fingerprint(jsonb_build_object('group_id',p_group_id,'expected_version',p_expected_version,'token_hash',p_token_hash));
 insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint) values(uid,'regenerate_invitation',key,fp) on conflict do nothing;
 get diagnostics n=row_count;
 if n=0 then
  select * into saved from juntia_data.idempotency_records where actor_user_id=uid and action='regenerate_invitation' and idempotency_key=key;
  if not found or saved.request_fingerprint is distinct from fp or saved.status<>'completed' then raise exception using errcode='JT008',message='idempotencyKeyReused'; end if;
  return saved.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into g from juntia_data.groups where id=p_group_id for update;
 if not found or g.owner_user_id<>uid then raise exception using errcode='JT102',message='invitationNotFound'; end if;
 if g.status='active' then raise exception using errcode='JT103',message='invitationAlreadyAccepted'; end if;
 if g.status<>'provisional' then raise exception using errcode='JT102',message='invitationNotFound'; end if;
 if g.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
 select * into inv from juntia_data.group_invitations where group_id=g.id and status='pending' for update;
 if not found then raise exception using errcode='JT102',message='invitationNotFound'; end if;
 -- Libera el índice pending antes de insertar; el enlace viejo se reemplaza atómicamente.
 update juntia_data.group_invitations set status='cancelled' where id=inv.id; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 insert into juntia_data.group_invitations(group_id,email,token_hash,status,created_by,inviter_display_name)
 values(g.id,inv.email,p_token_hash,'pending',uid,inv.inviter_display_name) returning * into next_inv; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 update juntia_data.group_invitations set status='replaced',replaced_by=next_inv.id where id=inv.id; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 update juntia_data.groups set version=version+1 where id=g.id returning * into g; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=jsonb_build_object('group_id',g.id,'invitation_id',next_inv.id,'expires_at',next_inv.expires_at,'version',g.version);
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"before","after") values(uid,'invitation',inv.id,'regenerate',jsonb_build_object('invitation_id',inv.id),result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;

 update juntia_data.idempotency_records set status='completed',result=result_value,completed_at=now() where actor_user_id=uid and action='regenerate_invitation' and idempotency_key=key and status='pending';
 get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 set constraints all immediate;
 set constraints all deferred;
 return result_value;
end $$;
alter function juntia_private.regenerate_invitation(text,uuid,integer,text) owner to juntia_writer;
revoke all on function juntia_private.regenerate_invitation(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function juntia_private.regenerate_invitation(text,uuid,integer,text) to authenticated;
create function public.regenerate_invitation(p_idempotency_key text,p_group_id uuid,p_expected_version integer,p_token_hash text) returns jsonb language sql security invoker set search_path=''
return juntia_private.regenerate_invitation(p_idempotency_key,p_group_id,p_expected_version,p_token_hash);
revoke all on function public.regenerate_invitation(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.regenerate_invitation(text,uuid,integer,text) to authenticated;
create function juntia_private.cancel_invitation(p_idempotency_key text,p_group_id uuid,p_expected_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); key uuid; fp text; n integer; saved juntia_data.idempotency_records;
 g juntia_data.groups; inv juntia_data.group_invitations; next_inv juntia_data.group_invitations;
 email_value text; name_value text; result_value jsonb;
begin

 if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
 begin
  key:=p_idempotency_key::uuid; if key is null then raise invalid_text_representation; end if;
 exception when invalid_text_representation then raise exception using errcode='JT009',message='invalidIdempotencyKey'; end;
 fp:=juntia_private.request_fingerprint(jsonb_build_object('group_id',p_group_id,'expected_version',p_expected_version));
 insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint) values(uid,'cancel_invitation',key,fp) on conflict do nothing;
 get diagnostics n=row_count;
 if n=0 then
  select * into saved from juntia_data.idempotency_records where actor_user_id=uid and action='cancel_invitation' and idempotency_key=key;
  if not found or saved.request_fingerprint is distinct from fp or saved.status<>'completed' then raise exception using errcode='JT008',message='idempotencyKeyReused'; end if;
  return saved.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into g from juntia_data.groups where id=p_group_id for update;
 if not found or g.owner_user_id<>uid then raise exception using errcode='JT102',message='invitationNotFound'; end if;
 if g.status='active' then raise exception using errcode='JT103',message='invitationAlreadyAccepted'; end if;
 if g.status<>'provisional' then raise exception using errcode='JT102',message='invitationNotFound'; end if;
 if g.version is distinct from p_expected_version then raise exception using errcode='JT011',message='versionConflict'; end if;
 select * into inv from juntia_data.group_invitations where group_id=g.id and status='pending' for update;
 if not found then raise exception using errcode='JT102',message='invitationNotFound'; end if;
 update juntia_data.group_invitations set status='cancelled' where id=inv.id; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 -- No RETURNING de la raíz descartada: la RLS oculta la fila nueva.
 update juntia_data.groups set status='discarded',discarded_at=now(),version=version+1 where id=g.id; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 update juntia_data.group_members set status='released',released_at=now() where group_id=g.id and user_id=uid and status='active'; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=jsonb_build_object('group_id',g.id,'status','discarded');
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"after") values(uid,'invitation',inv.id,'cancel',result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;

 update juntia_data.idempotency_records set status='completed',result=result_value,completed_at=now() where actor_user_id=uid and action='cancel_invitation' and idempotency_key=key and status='pending';
 get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 set constraints all immediate;
 set constraints all deferred;
 return result_value;
end $$;
alter function juntia_private.cancel_invitation(text,uuid,integer) owner to juntia_writer;
revoke all on function juntia_private.cancel_invitation(text,uuid,integer) from public,anon,authenticated;
grant execute on function juntia_private.cancel_invitation(text,uuid,integer) to authenticated;
create function public.cancel_invitation(p_idempotency_key text,p_group_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path=''
return juntia_private.cancel_invitation(p_idempotency_key,p_group_id,p_expected_version);
revoke all on function public.cancel_invitation(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.cancel_invitation(text,uuid,integer) to authenticated;
create function juntia_private.accept_invitation(p_idempotency_key text,p_token_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=juntia_private.current_uid(); key uuid; fp text; n integer; saved juntia_data.idempotency_records;
 g juntia_data.groups; inv juntia_data.group_invitations; next_inv juntia_data.group_invitations;
 email_value text; name_value text; result_value jsonb;
begin

 if uid is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
 begin
  key:=p_idempotency_key::uuid; if key is null then raise invalid_text_representation; end if;
 exception when invalid_text_representation then raise exception using errcode='JT009',message='invalidIdempotencyKey'; end;
 fp:=juntia_private.request_fingerprint(jsonb_build_object('token_hash',p_token_hash));
 insert into juntia_data.idempotency_records(actor_user_id,action,idempotency_key,request_fingerprint) values(uid,'accept_invitation',key,fp) on conflict do nothing;
 get diagnostics n=row_count;
 if n=0 then
  select * into saved from juntia_data.idempotency_records where actor_user_id=uid and action='accept_invitation' and idempotency_key=key;
  if not found or saved.request_fingerprint is distinct from fp or saved.status<>'completed' then raise exception using errcode='JT008',message='idempotencyKeyReused'; end if;
  return saved.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if exists(select 1 from juntia_data.group_members where user_id=uid and status='active') then raise exception using errcode='JT101',message='alreadyInCouple'; end if;
 -- La invitación se busca por el correo firmado; no se concede lookup global por hash.
 select * into inv from juntia_data.group_invitations where token_hash=p_token_hash and email=juntia_private.current_email() and status='pending' and expires_at>clock_timestamp();
 if not found then raise exception using errcode='JT104',message='invitationInvalid'; end if;
 select * into g from juntia_data.groups where id=inv.group_id for update;
 if not found or g.status<>'provisional' then raise exception using errcode='JT104',message='invitationInvalid'; end if;
 -- Releer tras el bloqueo: el dueño pudo reemplazar/anular mientras esperábamos.
 select * into inv from juntia_data.group_invitations where group_id=g.id and token_hash=p_token_hash and email=juntia_private.current_email() and status='pending' and expires_at>clock_timestamp() for update;
 if not found then raise exception using errcode='JT104',message='invitationInvalid'; end if;
 insert into juntia_data.group_members(group_id,user_id,role,join_order,status) values(g.id,uid,'member',2,'active'); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 update juntia_data.groups set status='active',activated_at=now(),version=version+1 where id=g.id; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 update juntia_data.group_invitations set status='accepted',accepted_by=uid,accepted_at=now() where id=inv.id; get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 result_value:=jsonb_build_object('group_id',g.id,'status','active');
 insert into juntia_data.audit_events(actor_user_id,entity_type,entity_id,action,"after") values(uid,'invitation',inv.id,'accept',result_value); get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;

 update juntia_data.idempotency_records set status='completed',result=result_value,completed_at=now() where actor_user_id=uid and action='accept_invitation' and idempotency_key=key and status='pending';
 get diagnostics n=row_count; if n<>1 then raise exception using errcode='42501',message='writeDenied'; end if;
 set constraints all immediate;
 set constraints all deferred;
 return result_value;
end $$;
alter function juntia_private.accept_invitation(text,text) owner to juntia_writer;
revoke all on function juntia_private.accept_invitation(text,text) from public,anon,authenticated;
grant execute on function juntia_private.accept_invitation(text,text) to authenticated;
create function public.accept_invitation(p_idempotency_key text,p_token_hash text) returns jsonb language sql security invoker set search_path=''
return juntia_private.accept_invitation(p_idempotency_key,p_token_hash);
revoke all on function public.accept_invitation(text,text) from public,anon,authenticated;
grant execute on function public.accept_invitation(text,text) to authenticated;
create function juntia_private.preview_invitation(p_token_hash text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result_value jsonb;
begin
 if juntia_private.current_uid() is null then raise exception using errcode='JT001',message='notAuthenticated'; end if;
 select jsonb_build_object('inviter_display_name',i.inviter_display_name,'expires_at',i.expires_at) into result_value
 from juntia_data.group_invitations i join juntia_data.groups g on g.id=i.group_id
 where i.token_hash=p_token_hash and i.email=juntia_private.current_email() and i.status='pending' and i.expires_at>now() and g.status='provisional';
 if not found then raise exception using errcode='JT104',message='invitationInvalid'; end if;
 return result_value;
end $$;
alter function juntia_private.preview_invitation(text) owner to juntia_writer;
revoke all on function juntia_private.preview_invitation(text) from public,anon,authenticated;
grant execute on function juntia_private.preview_invitation(text) to authenticated;
create function public.preview_invitation(p_token_hash text) returns jsonb language sql stable security invoker set search_path=''
return juntia_private.preview_invitation(p_token_hash);
revoke all on function public.preview_invitation(text) from public,anon,authenticated;
grant execute on function public.preview_invitation(text) to authenticated;
revoke create on schema juntia_private from juntia_writer;
