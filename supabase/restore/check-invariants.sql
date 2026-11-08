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

 -- P0-3: equivalentes de los cuatro triggers suspendidos durante la carga.
 -- No se consulta una vista filtrada por auth.uid(): se valida el snapshot completo.
 if exists(select 1 from juntia_data.budgets b left join juntia_data.categories c on c.id=b.category_id and c.kind=b.category_kind
   where (b.owner_user_id is null)=(b.group_id is null) or b.category_kind<>'expense' or c.id is null)
  or exists(select 1 from juntia_data.savings_goals g where (g.owner_user_id is null)=(g.group_id is null))
  or exists(select 1 from juntia_data.budget_versions where limit_minor is not null and limit_minor<=0)
  or exists(select 1 from juntia_data.budgets group by coalesce(owner_user_id,group_id),category_id,currency having count(*)>1)
 then raise exception 'RESTORE_INVARIANTS: budget-scope-limit';end if;

 if exists(select 1 from juntia_data.goal_ledger_entries v left join juntia_data.goal_ledger_entries e on e.id=v.voids_entry_id
  where v.kind='void' and (e.id is null or e.kind='void' or e.goal_id<>v.goal_id))
 then raise exception 'RESTORE_INVARIANTS: goal-void';end if;

 if exists(select 1 from juntia_data.goal_ledger_entries e join juntia_data.savings_goals g on g.id=e.goal_id
  where (e.kind in('contribution','withdrawal') and (e.entry_date<(g.created_at at time zone 'America/Bogota')::date
   or e.entry_date>(now() at time zone 'America/Bogota')::date or e.member_user_id<>e.created_by
   or g.owner_user_id is not null and e.member_user_id<>g.owner_user_id
   or g.group_id is not null and not exists(select 1 from juntia_data.group_members m where m.group_id=g.group_id and m.user_id=e.member_user_id and m.status='active')))
  or (g.owner_user_id is not null and e.created_by<>g.owner_user_id)
  or (g.group_id is not null and not exists(select 1 from juntia_data.group_members m where m.group_id=g.group_id and m.user_id=e.created_by and m.status='active')))
 then raise exception 'RESTORE_INVARIANTS: goal-entry';end if;

 if exists(select 1 from juntia_data.goal_usage_allocations a left join juntia_data.goal_ledger_entries e on e.id=a.entry_id
  left join juntia_data.savings_goals g on g.id=e.goal_id
  where e.id is null or e.kind<>'usage' or a.entry_kind<>'usage' or a.member_user_id<>e.created_by
   or g.owner_user_id is not null and a.member_user_id<>g.owner_user_id
   or g.group_id is not null and not exists(select 1 from juntia_data.group_members m where m.group_id=g.group_id and m.user_id=a.member_user_id and m.status='active'))
  or exists(select 1 from juntia_data.goal_ledger_entries e where e.kind='usage' and e.amount_minor<>(select coalesce(sum(a.amount_minor),0) from juntia_data.goal_usage_allocations a where a.entry_id=e.id))
 then raise exception 'RESTORE_INVARIANTS: goal-allocation';end if;

 if exists(select 1 from juntia_data.goal_ledger_entries e join juntia_data.savings_goals g on g.id=e.goal_id left join juntia_data.transactions t on t.id=e.transaction_id
  where e.kind='usage' and (t.id is null or t.type<>'expense' or t.currency<>g.currency or t.owner_user_id is distinct from g.owner_user_id or t.group_id is distinct from g.group_id))
 then raise exception 'RESTORE_INVARIANTS: goal-context';end if;

 if exists(with live as (
  select e.* from juntia_data.goal_ledger_entries e where e.kind<>'void' and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id)
 ) select 1 from live group by goal_id having sum(case when kind='contribution' then amount_minor::numeric else -amount_minor::numeric end)<0)
 then raise exception 'RESTORE_INVARIANTS: goal-balance';end if;
 if exists(with live as (
  select e.* from juntia_data.goal_ledger_entries e where e.kind<>'void' and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id)
 ), movements as (
  select goal_id,member_user_id,case when kind='contribution' then amount_minor::numeric else -amount_minor::numeric end amount from live where kind in('contribution','withdrawal')
  union all select e.goal_id,a.member_user_id,-a.amount_minor::numeric from live e join juntia_data.goal_usage_allocations a on a.entry_id=e.id where e.kind='usage'
 )select 1 from movements group by goal_id,member_user_id having sum(amount)<0)
 then raise exception 'RESTORE_INVARIANTS: goal-member-balance';end if;

 if exists(select 1 from juntia_data.goal_ledger_entries e join juntia_data.transactions t on t.id=e.transaction_id where e.kind='usage'
  and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id) and t.status<>'active')
 then raise exception 'RESTORE_INVARIANTS: goal-live-expense';end if;
 if exists(select 1 from juntia_data.goal_ledger_entries e join juntia_data.transactions t on t.id=e.transaction_id where e.kind='usage'
  and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id)
  group by t.id,t.amount_minor having sum(e.amount_minor::numeric)>t.amount_minor)
 then raise exception 'RESTORE_INVARIANTS: goal-usage-amount';end if;

 -- Un archivo histórico puede contener aportes de una meta HOY archivada. Lo
 -- prohibido es actividad durante un intervalo archivado, no toda su historia.
 if exists(with archives as (
  select id goal_id,archived_at at from juntia_data.savings_goals where status='archived'
  union select entity_id,("after"->>'archived_at')::timestamptz from juntia_data.audit_events where entity_type='goal' and action='archive' and "after"->>'archived_at' is not null
 ), windows as (
  select a.*, (select min(v.created_at) from juntia_data.goal_ledger_entries v join juntia_data.goal_ledger_entries u on u.id=v.voids_entry_id where v.goal_id=a.goal_id and u.kind='usage' and v.created_at>=a.at) reopened from archives a
 )select 1 from windows w where exists(select 1 from juntia_data.goal_ledger_entries e where e.goal_id=w.goal_id and e.created_at>=w.at and (w.reopened is null or e.created_at<w.reopened))
  or exists(select 1 from juntia_data.goal_usage_confirmations c where c.goal_id=w.goal_id and (c.created_at>=w.at and (w.reopened is null or c.created_at<w.reopened)
   or c.resolved_at>=w.at and (w.reopened is null or c.resolved_at<w.reopened))))
  or exists(select 1 from juntia_data.savings_goals g join juntia_data.goal_ledger_entries e on e.goal_id=g.id where g.status='completed' and e.kind='contribution' and e.created_at>=g.completed_at)
  or exists(select 1 from juntia_data.savings_goals g where g.status='archived' and (
   (select coalesce(sum(case when e.kind='contribution' then e.amount_minor::numeric else -e.amount_minor::numeric end),0) from juntia_data.goal_ledger_entries e where e.goal_id=g.id and e.kind<>'void' and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id))<>0
   or exists(select 1 from juntia_data.goal_usage_confirmations c where c.goal_id=g.id and c.status='pending')))
 then raise exception 'RESTORE_INVARIANTS: goal-archive';end if;

 if exists(with archives as (
  select id goal_id,archived_at at from juntia_data.savings_goals where status='archived'
  union select entity_id,("after"->>'archived_at')::timestamptz from juntia_data.audit_events where entity_type='goal' and action='archive' and "after"->>'archived_at' is not null
 ) select 1 from archives a join juntia_data.savings_goals g on g.id=a.goal_id left join lateral (
  select v.created_at,u.transaction_id from juntia_data.goal_ledger_entries v join juntia_data.goal_ledger_entries u on u.id=v.voids_entry_id where v.goal_id=a.goal_id and u.kind='usage' and v.created_at>=a.at order by v.created_at,v.id limit 1
 ) r on true where (r.created_at is null and not (g.status='archived' and g.archived_at=a.at)) or g.status='archived' and g.archived_at<=r.created_at or g.status='completed' and g.completed_at<=r.created_at
  or r.created_at is not null and not exists(select 1 from juntia_data.audit_events audit where audit.entity_type='goal' and audit.entity_id=a.goal_id and audit.action='reactivate' and audit."before"->>'status'='archived' and audit."after"->>'status'='active' and audit."after"->>'transaction_id'=r.transaction_id::text))
  or exists(select 1 from juntia_data.audit_events a where a.entity_type='goal' and a.action='reactivate' and (
   a."after"->>'returned_minor' is null or a."after"->>'returned_minor' !~ '^[0-9]+$'
   or (a."after"->>'returned_minor')::numeric is distinct from (
    select sum(u.amount_minor::numeric) from juntia_data.goal_ledger_entries v join juntia_data.goal_ledger_entries u on u.id=v.voids_entry_id where v.goal_id=a.entity_id and u.kind='usage' and u.transaction_id::text=a."after"->>'transaction_id')))
 then raise exception 'RESTORE_INVARIANTS: goal-reactivation';end if;

 if exists(select 1 from juntia_data.goal_usage_confirmations c join juntia_data.savings_goals g on g.id=c.goal_id left join juntia_data.transactions t on t.id=c.transaction_id
  where g.group_id is null or t.id is null or t.type<>'expense' or t.group_id is distinct from g.group_id or t.currency<>g.currency
   or c.requested_by<>t.created_by or c.requested_by=c.member_user_id
   or not exists(select 1 from juntia_data.group_members m where m.group_id=g.group_id and m.user_id=c.member_user_id and m.status='active')
   or not exists(select 1 from juntia_data.group_members m where m.group_id=g.group_id and m.user_id=c.requested_by and m.status='active')
   or c.status in('approved','rejected') and c.resolved_by is distinct from c.member_user_id
   or c.status='cancelled' and not exists(select 1 from juntia_data.group_members m where m.group_id=g.group_id and m.user_id=c.resolved_by and m.status='active')
   or c.status='pending' and (t.status<>'active' or g.status='archived')
   or c.status='approved' and not exists(select 1 from juntia_data.goal_ledger_entries e where e.id=c.usage_entry_id and e.kind='usage' and e.confirmation_id=c.id and e.goal_id=c.goal_id and e.transaction_id=c.transaction_id and e.created_by=c.member_user_id and e.amount_minor=c.amount_minor))
 then raise exception 'RESTORE_INVARIANTS: goal-request';end if;
 if exists(select 1 from (
  select transaction_id,goal_id from juntia_data.goal_ledger_entries where kind='usage'
  union all select transaction_id,goal_id from juntia_data.goal_usage_confirmations
 ) links group by transaction_id having count(distinct goal_id)>1)
 then raise exception 'RESTORE_INVARIANTS: goal-one-per-expense';end if;

end $invariants$;
