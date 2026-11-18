-- 005 · contracts/account-deletion.md §3 y §4 (D2, opción a). Alcance del borrado manual y su cierre.
-- Lo incluyen `closure.sql` (comprobación previa, antes de la fase 0) y `delete-account.sql` (fase 1). Solo crea tablas
-- temporales `del_*` (se borran al terminar la transacción) y nunca escribe en `juntia_data`.
--
-- Variables de psql: `users` ('{uuid,uuid}' o '{uuid}') y `group_id` (un uuid o vacío).
-- Alcance: todo lo que nombra a las personas o a sus grupos, y lo que esas filas referencian o las referencian.
-- Cierre: si una fila FUERA del alcance apunta a una de DENTRO, o una de dentro depende de una de fuera que no se
-- borra, se detiene con `ACCOUNT_DELETION_CLOSURE: <tabla> <id>`, sin datos.

create temp table del_users on commit drop as select unnest(:'users'::uuid[]) as id;
create temp table del_groups on commit drop as
 select id from juntia_data.groups where owner_user_id in(select id from del_users)
 union select group_id from juntia_data.group_members where user_id in(select id from del_users)
 union select nullif(:'group_id','')::uuid where nullif(:'group_id','') is not null;
create temp table del_transactions on commit drop as
 select id from juntia_data.transactions
 where group_id in(select id from del_groups)
  or created_by in(select id from del_users) or owner_user_id in(select id from del_users) or payer_user_id in(select id from del_users)
  or updated_by in(select id from del_users) or voided_by in(select id from del_users);
create temp table del_settlements on commit drop as
 select id from juntia_data.settlements
 where group_id in(select id from del_groups) or from_user_id in(select id from del_users) or to_user_id in(select id from del_users)
  or created_by in(select id from del_users) or voided_by in(select id from del_users);
create temp table del_invitations on commit drop as
 select id from juntia_data.group_invitations
 where group_id in(select id from del_groups) or created_by in(select id from del_users) or accepted_by in(select id from del_users);
create temp table del_budgets on commit drop as
 select id from juntia_data.budgets
 where group_id in(select id from del_groups) or owner_user_id in(select id from del_users)
  or created_by in(select id from del_users) or updated_by in(select id from del_users);
create temp table del_goals on commit drop as
 select id from juntia_data.savings_goals
 where group_id in(select id from del_groups) or owner_user_id in(select id from del_users)
  or created_by in(select id from del_users) or updated_by in(select id from del_users);
create temp table del_entries on commit drop as
 select id from juntia_data.goal_ledger_entries
 where goal_id in(select id from del_goals) or transaction_id in(select id from del_transactions)
  or member_user_id in(select id from del_users) or created_by in(select id from del_users);
create temp table del_confirmations on commit drop as
 select id from juntia_data.goal_usage_confirmations
 where goal_id in(select id from del_goals) or transaction_id in(select id from del_transactions)
  or requested_by in(select id from del_users) or member_user_id in(select id from del_users) or resolved_by in(select id from del_users);
-- Entidades que una auditoría puede nombrar por `entity_id` (transaction, settlement, group, invitation, budget, goal,
-- goal_entry, usage_request).
create temp table del_entities on commit drop as
 select id from del_transactions union select id from del_settlements union select id from del_groups
 union select id from del_invitations union select id from del_budgets union select id from del_goals
 union select id from del_entries union select id from del_confirmations;

-- Cierre del alcance (§3). Cada fila nombra la tabla y el id de la primera fila que lo rompe; nunca sus datos.
do $closure$
declare hit text;
begin
 select coalesce(
  -- Fuera → dentro.
  (select 'transactions '||t.id from juntia_data.transactions t where t.id not in(select id from del_transactions)
    and (t.moved_from_transaction_id in(select id from del_transactions) or t.moved_to_transaction_id in(select id from del_transactions)
     or t.restored_from_transaction_id in(select id from del_transactions)) limit 1),
  (select 'transaction_allocations '||a.transaction_id from juntia_data.transaction_allocations a
    where a.transaction_id not in(select id from del_transactions) and a.user_id in(select id from del_users) limit 1),
  (select 'group_members '||m.group_id from juntia_data.group_members m
    where m.group_id in(select id from del_groups) and m.user_id not in(select id from del_users) limit 1),
  (select 'group_invitations '||i.id from juntia_data.group_invitations i
    where i.id not in(select id from del_invitations) and i.replaced_by in(select id from del_invitations) limit 1),
  (select 'goal_ledger_entries '||e.id from juntia_data.goal_ledger_entries e where e.id not in(select id from del_entries)
    and (e.voids_entry_id in(select id from del_entries) or e.confirmation_id in(select id from del_confirmations)) limit 1),
  (select 'goal_usage_confirmations '||c.id from juntia_data.goal_usage_confirmations c
    where c.id not in(select id from del_confirmations) and c.usage_entry_id in(select id from del_entries) limit 1),
  (select 'goal_usage_allocations '||a.entry_id from juntia_data.goal_usage_allocations a
    where a.entry_id not in(select id from del_entries) and a.member_user_id in(select id from del_users) limit 1),
  (select 'budget_versions '||v.id from juntia_data.budget_versions v
    where v.budget_id not in(select id from del_budgets) and v.changed_by in(select id from del_users) limit 1),
  -- F87-1 (revisión del PR #87): nunca se borra la auditoría de un actor externo al alcance. Si un actor de fuera dejó
  -- auditoría sobre una entidad del alcance, el procedimiento se detiene y la nombra, sin borrar nada.
  (select 'audit_events '||a.id from juntia_data.audit_events a where a.actor_user_id not in(select id from del_users)
    and a.entity_id in(select id from del_entities) limit 1),
  -- Dentro → fuera: una fila del alcance que cuelga de otra que no se borra.
  (select 'transactions '||t.id from juntia_data.transactions t where t.id in(select id from del_transactions)
    and t.group_id is not null and t.group_id not in(select id from del_groups) limit 1),
  (select 'goal_ledger_entries '||e.id from juntia_data.goal_ledger_entries e where e.id in(select id from del_entries)
    and (e.goal_id not in(select id from del_goals) or e.transaction_id not in(select id from del_transactions)
     or e.voids_entry_id not in(select id from del_entries)) limit 1),
  (select 'goal_usage_confirmations '||c.id from juntia_data.goal_usage_confirmations c where c.id in(select id from del_confirmations)
    and (c.goal_id not in(select id from del_goals) or c.transaction_id not in(select id from del_transactions)) limit 1),
  (select 'savings_goals '||g.id from juntia_data.savings_goals g where g.id in(select id from del_goals)
    and g.group_id is not null and g.group_id not in(select id from del_groups) limit 1),
  (select 'budgets '||b.id from juntia_data.budgets b where b.id in(select id from del_budgets)
    and b.group_id is not null and b.group_id not in(select id from del_groups) limit 1),
  (select 'settlements '||s.id from juntia_data.settlements s where s.id in(select id from del_settlements)
    and s.group_id not in(select id from del_groups) limit 1),
  (select 'group_invitations '||i.id from juntia_data.group_invitations i where i.id in(select id from del_invitations)
    and i.group_id not in(select id from del_groups) limit 1)
 ) into hit;
 if hit is not null then raise exception 'ACCOUNT_DELETION_CLOSURE: %', hit; end if;
end $closure$;

-- Recuento del alcance por tabla, en el orden del borrado. Solo números (evidencia: §3, «En la evidencia»).
create temp view del_counts as select jsonb_build_object(
 'goal_usage_confirmations',(select count(*) from juntia_data.goal_usage_confirmations where id in(select id from del_confirmations)),
 'goal_usage_allocations',(select count(*) from juntia_data.goal_usage_allocations where entry_id in(select id from del_entries)),
 'goal_ledger_entries',(select count(*) from juntia_data.goal_ledger_entries where id in(select id from del_entries)),
 'savings_goals',(select count(*) from juntia_data.savings_goals where id in(select id from del_goals)),
 'budget_versions',(select count(*) from juntia_data.budget_versions where budget_id in(select id from del_budgets)),
 'budgets',(select count(*) from juntia_data.budgets where id in(select id from del_budgets)),
 'transaction_allocations',(select count(*) from juntia_data.transaction_allocations where transaction_id in(select id from del_transactions)),
 'transactions',(select count(*) from juntia_data.transactions where id in(select id from del_transactions)),
 'settlements',(select count(*) from juntia_data.settlements where id in(select id from del_settlements)),
 'group_invitations',(select count(*) from juntia_data.group_invitations where id in(select id from del_invitations)),
 'group_members',(select count(*) from juntia_data.group_members where group_id in(select id from del_groups)),
 'groups',(select count(*) from juntia_data.groups where id in(select id from del_groups)),
 'idempotency_records',(select count(*) from juntia_data.idempotency_records where actor_user_id in(select id from del_users)),
 'audit_events',(select count(*) from juntia_data.audit_events where actor_user_id in(select id from del_users)),
 'profiles',(select count(*) from juntia_data.profiles where user_id in(select id from del_users)),
 'signup_allowlist',(select count(*) from juntia_data.signup_allowlist where email in(select lower(email) from auth.users where id in(select id from del_users)))
) as counts;

-- F87-10 (revisión del PR #87): los IDENTIFICADORES del alcance por tabla, no solo sus recuentos. La clave de cada fila es
-- su clave primaria; en `signup_allowlist`, la huella del correo y nunca el correo. Solo identificadores, sin datos.
create temp view del_ids as select jsonb_build_object(
 'goal_usage_confirmations',(select coalesce(jsonb_agg(id::text order by id::text),'[]') from juntia_data.goal_usage_confirmations where id in(select id from del_confirmations)),
 'goal_usage_allocations',(select coalesce(jsonb_agg(entry_id||':'||member_user_id order by entry_id||':'||member_user_id),'[]') from juntia_data.goal_usage_allocations where entry_id in(select id from del_entries)),
 'goal_ledger_entries',(select coalesce(jsonb_agg(id::text order by id::text),'[]') from juntia_data.goal_ledger_entries where id in(select id from del_entries)),
 'savings_goals',(select coalesce(jsonb_agg(id::text order by id::text),'[]') from juntia_data.savings_goals where id in(select id from del_goals)),
 'budget_versions',(select coalesce(jsonb_agg(id::text order by id::text),'[]') from juntia_data.budget_versions where budget_id in(select id from del_budgets)),
 'budgets',(select coalesce(jsonb_agg(id::text order by id::text),'[]') from juntia_data.budgets where id in(select id from del_budgets)),
 'transaction_allocations',(select coalesce(jsonb_agg(transaction_id||':'||user_id order by transaction_id||':'||user_id),'[]') from juntia_data.transaction_allocations where transaction_id in(select id from del_transactions)),
 'transactions',(select coalesce(jsonb_agg(id::text order by id::text),'[]') from juntia_data.transactions where id in(select id from del_transactions)),
 'settlements',(select coalesce(jsonb_agg(id::text order by id::text),'[]') from juntia_data.settlements where id in(select id from del_settlements)),
 'group_invitations',(select coalesce(jsonb_agg(id::text order by id::text),'[]') from juntia_data.group_invitations where id in(select id from del_invitations)),
 'group_members',(select coalesce(jsonb_agg(group_id||':'||user_id order by group_id||':'||user_id),'[]') from juntia_data.group_members where group_id in(select id from del_groups)),
 'groups',(select coalesce(jsonb_agg(id::text order by id::text),'[]') from juntia_data.groups where id in(select id from del_groups)),
 'idempotency_records',(select coalesce(jsonb_agg(actor_user_id||':'||action||':'||idempotency_key order by actor_user_id||':'||action||':'||idempotency_key),'[]') from juntia_data.idempotency_records where actor_user_id in(select id from del_users)),
 'audit_events',(select coalesce(jsonb_agg(id::text order by id::text),'[]') from juntia_data.audit_events where actor_user_id in(select id from del_users)),
 'profiles',(select coalesce(jsonb_agg(user_id::text order by user_id::text),'[]') from juntia_data.profiles where user_id in(select id from del_users)),
 'signup_allowlist',(select coalesce(jsonb_agg(md5(email) order by md5(email)),'[]') from juntia_data.signup_allowlist where email in(select lower(email) from auth.users where id in(select id from del_users)))
) as ids;
