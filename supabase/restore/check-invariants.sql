-- T026b. Ejecutar después de cargar, dentro de LA MISMA transacción de restore.
-- Solo lectura como dueño; no concede capacidades nuevas a la aplicación.
do $invariants$
begin
 if exists(
  select 1 from juntia_data.groups g
  cross join lateral (select count(*) total,count(*) filter(where status='active') active,
    count(*) filter(where user_id=g.owner_user_id and role='owner' and join_order=1 and status='active') owner_active,
    count(*) filter(where user_id=g.owner_user_id and role='owner' and join_order=1 and status='released') owner_released
    from juntia_data.group_members where group_id=g.id) m
  cross join lateral (select count(*) filter(where status='pending') pending,count(*) filter(where status='accepted') accepted
    from juntia_data.group_invitations where group_id=g.id) i
  where m.total>2
   or (g.status='provisional' and (m.total<>1 or m.active<>1 or m.owner_active<>1 or i.pending<>1 or i.accepted<>0))
   or (g.status='active' and (m.total<>2 or m.active<>2 or m.owner_active<>1 or i.pending<>0 or i.accepted<>1
     or not exists(select 1 from juntia_data.group_members member join juntia_data.group_invitations inv on inv.group_id=member.group_id and inv.accepted_by=member.user_id and inv.status='accepted'
       where member.group_id=g.id and member.role='member' and member.join_order=2 and member.status='active')))
   or (g.status='discarded' and (m.total<>1 or m.active<>0 or m.owner_released<>1 or i.pending<>0 or i.accepted<>0))
 ) then raise exception 'RESTORE_INVARIANTS: pareja/membresias/invitaciones'; end if;

 if exists(select 1 from juntia_data.group_members m left join juntia_data.groups g on g.id=m.group_id where g.id is null)
  or exists(select 1 from juntia_data.group_invitations i left join juntia_data.groups g on g.id=i.group_id where g.id is null or i.created_by<>g.owner_user_id)
 then raise exception 'RESTORE_INVARIANTS: raiz de membresia/invitacion'; end if;

 if exists(select 1 from juntia_data.transactions t
  cross join lateral (select count(*) n,coalesce(sum(amount_minor),0) total,count(*) filter(where amount_minor>0) positive from juntia_data.transaction_allocations where transaction_id=t.id) a
  where (t.group_id is null and a.n<>0) or (t.group_id is not null and (a.n<>2 or a.total<>t.amount_minor or a.positive=0
   or not exists(select 1 from juntia_data.groups g where g.id=t.group_id and g.status='active' and g.currency=t.currency)
   or not exists(select 1 from juntia_data.group_members m where m.group_id=t.group_id and m.user_id=t.payer_user_id and m.status='active')
   or exists(select 1 from unnest(array[t.created_by,t.updated_by,t.voided_by]) actors(user_id) where actors.user_id is not null and not exists(select 1 from juntia_data.group_members m where m.group_id=t.group_id and m.user_id=actors.user_id and m.status='active')))))
  or exists(select 1 from juntia_data.transaction_allocations a left join juntia_data.transactions t on t.id=a.transaction_id
    where t.id is null or t.group_id is null or not exists(select 1 from juntia_data.group_members m where m.group_id=t.group_id and m.user_id=a.user_id and m.status='active'))
 then raise exception 'RESTORE_INVARIANTS: partes/contexto/pagador'; end if;

 if exists(select 1 from juntia_data.settlements s where not exists(select 1 from juntia_data.groups g where g.id=s.group_id and g.status='active' and g.currency=s.currency)
   or (select count(*) from juntia_data.group_members m where m.group_id=s.group_id and m.status='active' and m.user_id in(s.from_user_id,s.to_user_id))<>2
   or exists(select 1 from unnest(array[s.created_by,s.voided_by]) actors(user_id) where actors.user_id is not null and not exists(select 1 from juntia_data.group_members m where m.group_id=s.group_id and m.user_id=actors.user_id and m.status='active')))
 then raise exception 'RESTORE_INVARIANTS: liquidacion'; end if;

 if exists(select 1 from juntia_data.transactions s left join juntia_data.transactions p on p.id=s.moved_from_transaction_id
   where s.moved_from_transaction_id is not null and (s.group_id is null or s.type<>'expense' or p.id is null or p.group_id is not null or p.type<>'expense' or p.status<>'voided' or p.owner_user_id<>s.created_by or p.moved_to_transaction_id is distinct from s.id))
  or exists(select 1 from juntia_data.transactions p left join juntia_data.transactions s on s.id=p.moved_to_transaction_id
   where p.moved_to_transaction_id is not null and (p.group_id is not null or p.status<>'voided' or s.id is null or s.group_id is null or s.moved_from_transaction_id is distinct from p.id or p.owner_user_id<>s.created_by))
  or exists(select 1 from juntia_data.transactions p left join juntia_data.transactions s on s.id=p.restored_from_transaction_id
   where p.restored_from_transaction_id is not null and (p.group_id is not null or s.id is null or s.group_id is null or s.status<>'voided' or s.moved_from_transaction_id is null or p.owner_user_id<>s.created_by))
 then raise exception 'RESTORE_INVARIANTS: vinculo privado/compartido huerfano'; end if;

 -- Un ciclo de dos enlaces moved_from/to es intencional; la ascendencia de
 -- restauraciones sí debe terminar, no volver a una versión privada ya visitada.
 if exists(with recursive ancestry as (
   select id root,id current_id,array[id] path,false cycle from juntia_data.transactions where restored_from_transaction_id is not null
   union all
   select a.root,previous.id,a.path||previous.id,previous.id=any(a.path)
   from ancestry a join juntia_data.transactions p on p.id=a.current_id
   join juntia_data.transactions s on s.id=p.restored_from_transaction_id
   join juntia_data.transactions previous on previous.id=s.moved_from_transaction_id where not a.cycle
  ) select 1 from ancestry where cycle)
 then raise exception 'RESTORE_INVARIANTS: ciclo de restauraciones'; end if;
end $invariants$;
