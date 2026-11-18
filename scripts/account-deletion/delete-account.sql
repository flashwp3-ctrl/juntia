-- 005 · contracts/account-deletion.md §4, fase 1 (D2, opción a; F85-1). Borra los datos del alcance en UNA transacción:
--   psql -X -1 -v ON_ERROR_STOP=1 -v users='{…}' -v group_id=… -f delete-account.sql
-- como dueño de las tablas. Cualquier error revierte todo: el `update`, los `delete` y la suspensión de los triggers.
-- No usa `truncate`, así que los `*_no_truncate` no se tocan. Lo lanza `run.mjs`; nunca se ejecuta a mano.
--
-- Triggers suspendidos por nombre (contrato §1): los de solo inserción y el guardia de liquidaciones. El trigger de
-- restricción diferido `allocations_check_sum` NO se suspende: con el gasto borrado en la misma transacción, la función
-- no encuentra el movimiento y no comprueba nada. Lo demuestra el caso 1 de tests/integration/account-deletion.test.ts
-- (T042, N1).

-- 0. Bloqueos (gate del PR #87, run 44384613716: «deadlock detected» con escrituras concurrentes). Antes de leer nada, la
--    transacción toma TODAS las tablas que toca en un orden fijo y con un tope de espera: o los consigue todos, o falla
--    limpio por `lock_timeout` y revierte, sin haber cambiado nada. `run.mjs` lo informa como error recuperable y el
--    estado sigue en `locked`: `--resume` reintenta. Mientras dura la transacción, estas tablas no admiten otras lecturas
--    ni escrituras (segundos, en un procedimiento manual).
set local lock_timeout = :'lock_timeout';
lock table juntia_data.goal_usage_confirmations, juntia_data.goal_usage_allocations, juntia_data.goal_ledger_entries,
  juntia_data.savings_goals, juntia_data.budget_versions, juntia_data.budgets, juntia_data.transaction_allocations,
  juntia_data.transactions, juntia_data.settlements, juntia_data.group_invitations, juntia_data.group_members,
  juntia_data.groups, juntia_data.idempotency_records, juntia_data.audit_events, juntia_data.profiles,
  juntia_data.signup_allowlist in access exclusive mode;

-- 1. Alcance, cierre y recuento previo.
\ir scope.sql
select 'COUNTS_BEFORE '||counts::text from del_counts;

-- 2. Suspensión de los triggers que rechazan `update` o `delete`.
alter table juntia_data.audit_events disable trigger audit_events_append_only;
alter table juntia_data.budget_versions disable trigger budget_versions_append_only;
alter table juntia_data.goal_ledger_entries disable trigger goal_ledger_append_only;
alter table juntia_data.goal_usage_allocations disable trigger goal_allocations_append_only;
alter table juntia_data.settlements disable trigger settlements_guard;

-- 3. Rompe el ciclo ledger ↔ solicitud (F85-1): `confirmation_id` admite NULL; `usage_entry_id` no, en una aprobada.
update juntia_data.goal_ledger_entries set confirmation_id=null
 where id in(select id from del_entries) and confirmation_id is not null;

-- 4. Borrado en orden de dependencias.
delete from juntia_data.goal_usage_confirmations where id in(select id from del_confirmations);
delete from juntia_data.goal_usage_allocations where entry_id in(select id from del_entries);
delete from juntia_data.goal_ledger_entries where id in(select id from del_entries) and kind='void';
delete from juntia_data.goal_ledger_entries where id in(select id from del_entries);
delete from juntia_data.savings_goals where id in(select id from del_goals);
delete from juntia_data.budget_versions where budget_id in(select id from del_budgets);
delete from juntia_data.budgets where id in(select id from del_budgets);
delete from juntia_data.transaction_allocations where transaction_id in(select id from del_transactions);
delete from juntia_data.transactions where id in(select id from del_transactions);
delete from juntia_data.settlements where id in(select id from del_settlements);
delete from juntia_data.group_invitations where id in(select id from del_invitations);
delete from juntia_data.group_members where group_id in(select id from del_groups);
delete from juntia_data.groups where id in(select id from del_groups);
delete from juntia_data.idempotency_records where actor_user_id in(select id from del_users);
-- F87-1: solo la auditoría de los actores del alcance. La de un actor externo sobre una entidad del alcance detiene el
-- procedimiento antes (cierre de scope.sql), así que aquí nunca se borra.
delete from juntia_data.audit_events where actor_user_id in(select id from del_users);
-- «Categorías propias»: el esquema no tiene categorías por persona (`categories` es el catálogo común), no hay nada que borrar.
delete from juntia_data.profiles where user_id in(select id from del_users);
delete from juntia_data.signup_allowlist where email in(select lower(email) from auth.users where id in(select id from del_users));

-- 5. Reactivación.
alter table juntia_data.audit_events enable trigger audit_events_append_only;
alter table juntia_data.budget_versions enable trigger budget_versions_append_only;
alter table juntia_data.goal_ledger_entries enable trigger goal_ledger_append_only;
alter table juntia_data.goal_usage_allocations enable trigger goal_allocations_append_only;
alter table juntia_data.settlements enable trigger settlements_guard;

-- 6. Las claves y los triggers diferidos se comprueban aquí, dentro de la transacción, y no en el commit.
set constraints all immediate;

-- 7. Ninguna fila de `juntia_data` nombra a las personas.
do $leftovers$
declare hit text;
begin
 select coalesce(
  (select 'profiles' from juntia_data.profiles where user_id in(select id from del_users) limit 1),
  (select 'transactions' from juntia_data.transactions where created_by in(select id from del_users) or owner_user_id in(select id from del_users)
    or payer_user_id in(select id from del_users) or updated_by in(select id from del_users) or voided_by in(select id from del_users) limit 1),
  (select 'transaction_allocations' from juntia_data.transaction_allocations where user_id in(select id from del_users) limit 1),
  (select 'settlements' from juntia_data.settlements where from_user_id in(select id from del_users) or to_user_id in(select id from del_users)
    or created_by in(select id from del_users) or voided_by in(select id from del_users) limit 1),
  (select 'groups' from juntia_data.groups where owner_user_id in(select id from del_users) or id in(select id from del_groups) limit 1),
  (select 'group_members' from juntia_data.group_members where user_id in(select id from del_users) limit 1),
  (select 'group_invitations' from juntia_data.group_invitations where created_by in(select id from del_users) or accepted_by in(select id from del_users) limit 1),
  (select 'budgets' from juntia_data.budgets where owner_user_id in(select id from del_users) or created_by in(select id from del_users) or updated_by in(select id from del_users) limit 1),
  (select 'budget_versions' from juntia_data.budget_versions where changed_by in(select id from del_users) limit 1),
  (select 'savings_goals' from juntia_data.savings_goals where owner_user_id in(select id from del_users) or created_by in(select id from del_users) or updated_by in(select id from del_users) limit 1),
  (select 'goal_ledger_entries' from juntia_data.goal_ledger_entries where member_user_id in(select id from del_users) or created_by in(select id from del_users) limit 1),
  (select 'goal_usage_allocations' from juntia_data.goal_usage_allocations where member_user_id in(select id from del_users) limit 1),
  (select 'goal_usage_confirmations' from juntia_data.goal_usage_confirmations where requested_by in(select id from del_users) or member_user_id in(select id from del_users)
    or resolved_by in(select id from del_users) limit 1),
  (select 'idempotency_records' from juntia_data.idempotency_records where actor_user_id in(select id from del_users) limit 1),
  (select 'audit_events' from juntia_data.audit_events where actor_user_id in(select id from del_users) limit 1),
  (select 'signup_allowlist' from juntia_data.signup_allowlist where email in(select lower(email) from auth.users where id in(select id from del_users)) limit 1)
 ) into hit;
 if hit is not null then raise exception 'ACCOUNT_DELETION_LEFTOVER: %', hit; end if;
end $leftovers$;
select 'COUNTS_AFTER '||counts::text from del_counts;

-- 8. Invariantes sobre lo que queda (las mismas del ensayo de restauración).
\ir ../../supabase/restore/check-invariants.sql
