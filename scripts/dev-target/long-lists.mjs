// 005 · FR-043; research R7; tasks.md T027 y T028. La cuenta de listas largas: 600 movimientos en un mes, 120 aportes a una
// meta propia y 40 versiones de un presupuesto. Una sola definición para el arnés del runner
// (tests/evidence/release-long-lists.capture.ts) y para juntia-dev (scripts/dev-target/seed-long-lists.mjs), así que las
// dos son la misma cuenta. Es preparación de datos por SQL (como la parte P0-3 del dataset dorado), no la interfaz.

export const LONG_LISTS = { movements: 600, contributions: 120, budgetVersions: 40 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CATEGORIES = ["market", "restaurants", "home", "transport", "health", "entertainment", "shopping", "services", "other"];

/**
 * SQL de una transacción que siembra la cuenta de `userId` en el mes de `today` (YYYY-MM-DD, Bogotá). Idempotente: si la
 * persona ya tiene la meta «Listas largas», no inserta nada.
 * @param {{ userId: string, today: string }} options
 */
export function longListsSql({ userId, today }) {
  if (!UUID.test(userId)) throw new Error("userId no es un UUID");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error("today no es una fecha YYYY-MM-DD");
  const month = `${today.slice(0, 7)}-01`;
  const lastDay = Number(today.slice(8));
  return `begin;
do $long$
declare g uuid; b uuid;
begin
 if exists(select 1 from juntia_data.savings_goals where owner_user_id='${userId}' and name='Listas largas') then return; end if;
 insert into juntia_data.transactions(type,created_by,owner_user_id,amount_minor,category_id,transaction_date,description)
  select 'expense','${userId}','${userId}',(1000+(n*37)%90000)*100,(array[${CATEGORIES.map((c) => `'${c}'`).join(",")}])[1+n%${CATEGORIES.length}],
   '${month}'::date+((n%${lastDay}))::int,'Movimiento '||n
  from generate_series(1,${LONG_LISTS.movements}) n;
 insert into juntia_data.savings_goals(owner_user_id,name,goal_type,target_minor,created_by,created_at)
  values('${userId}','Listas largas','other',99999999900,'${userId}',('${today}'::date-${LONG_LISTS.contributions + 10})::timestamptz) returning id into g;
 insert into juntia_data.goal_ledger_entries(goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,created_by)
  select g,'contribution','${userId}',(10000+n*100)*100,'${today}'::date-(n-1),case when n%2=0 then 'reserved' else 'transferred_declared' end,'${userId}'
  from generate_series(1,${LONG_LISTS.contributions}) n;
 insert into juntia_data.budgets(owner_user_id,category_id,version,created_by,updated_by) values('${userId}','market',${LONG_LISTS.budgetVersions},'${userId}','${userId}') returning id into b;
 insert into juntia_data.budget_versions(budget_id,effective_month,limit_minor,changed_by,changed_at)
  select b,'${month}',(500000+n*10000)*100,'${userId}',clock_timestamp()-make_interval(mins=>${LONG_LISTS.budgetVersions}-n)
  from generate_series(1,${LONG_LISTS.budgetVersions}) n;
end $long$;
commit;`;
}
