-- 004 PR C (decisión del fundador del 10 de noviembre de 2026; respuesta del gestor, opción b): al frente de GoalStack va la
-- meta con el aporte más reciente. El servidor da el dato en `goals_overview`, en una sola sentencia (FR-096), en vez de
-- leer todos los aportes de cada meta en cada visita.
-- `create or replace` conserva la definición, el orden y el tipo de las columnas existentes, `security_invoker`, el owner y
-- los grants; solo añade dos columnas al final:
--   last_contribution_date       la fecha del aporte (`entry_date`) más reciente, o null sin aportes;
--   last_contribution_created_at su `created_at`, para desempatar dentro del mismo día.
-- Solo cuentan los asientos `contribution` no anulados (ningún `void` los referencia), con las mismas tablas y la misma
-- visibilidad (RLS) que ya usa la vista para el saldo. Ninguna migración aplicada se edita.
create or replace view public.goals_overview with(security_invoker=true) as
 select g.id,case when g.group_id is null then 'personal' else 'shared' end as goal_scope,g.name,g.goal_type,g.target_minor::text,g.target_month,g.status,g.version,
 coalesce(b.balance,0)::text as balance_minor,trunc(coalesce(b.balance,0)*100/g.target_minor) as progress_percent,
 exists(select 1 from juntia_data.goal_usage_confirmations c where c.goal_id=g.id and c.status='pending') as has_pending_request,
 coalesce(b.mine,0)::text as my_available_minor,g.created_at,
 lc.entry_date as last_contribution_date,lc.created_at as last_contribution_created_at
 from juntia_data.savings_goals g left join lateral(
  select sum(m.available_minor::numeric) as balance,sum(m.available_minor::numeric) filter(where m.user_id=(select auth.uid())) as mine
  from public.goal_member_balances m where m.goal_id=g.id
 ) b on true
 left join lateral(
  select e.entry_date,e.created_at from juntia_data.goal_ledger_entries e
  where e.goal_id=g.id and e.kind='contribution'
   and not exists(select 1 from juntia_data.goal_ledger_entries v where v.voids_entry_id=e.id)
  order by e.entry_date desc,e.created_at desc,e.id desc limit 1
 ) lc on true;
