-- Cambio del protocolo de restauración (AGENTS §17), autorizado por el gestor.
-- Solo dentro de psql -1 / BEGIN; el respaldo original permanece intacto.
do $restore_protocol$
begin
 if (select count(*) from pg_trigger where (tgrelid,tgname) in (
  ('juntia_data.goal_ledger_entries'::regclass,'goal_ledger_guard'),
  ('juntia_data.goal_usage_allocations'::regclass,'goal_allocation_guard'),
  ('juntia_data.goal_usage_confirmations'::regclass,'goal_confirmation_guard'),
  ('juntia_data.goal_ledger_entries'::regclass,'goal_void_reactivate')) and tgenabled='O' and not tgisinternal)<>4
  or not exists(select 1 from pg_constraint where conrelid='juntia_data.goal_ledger_entries'::regclass and conname='goal_ledger_entries_confirmation_id_fkey' and not condeferrable and not condeferred and convalidated)
 then raise exception 'RESTORE_PROTOCOL: propiedades iniciales inesperadas';end if;
end $restore_protocol$;
ALTER TABLE juntia_data.goal_ledger_entries DISABLE TRIGGER goal_ledger_guard;
ALTER TABLE juntia_data.goal_usage_allocations DISABLE TRIGGER goal_allocation_guard;
ALTER TABLE juntia_data.goal_usage_confirmations DISABLE TRIGGER goal_confirmation_guard;
ALTER TABLE juntia_data.goal_ledger_entries DISABLE TRIGGER goal_void_reactivate;
-- Basta diferir este arco: los asientos preceden a solicitudes y asignaciones.
ALTER TABLE juntia_data.goal_ledger_entries ALTER CONSTRAINT goal_ledger_entries_confirmation_id_fkey DEFERRABLE INITIALLY DEFERRED;
