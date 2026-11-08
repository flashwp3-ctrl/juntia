-- PostgreSQL no permite ENABLE con eventos diferidos pendientes. Drenarlos
-- valida primero las FK/sumas, sin desactivar sus triggers internos. Tras ENABLE
-- se comprueban otra vez; todo permanece en la transacción de restauración.
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE juntia_data.goal_ledger_entries ENABLE TRIGGER goal_ledger_guard;
ALTER TABLE juntia_data.goal_usage_allocations ENABLE TRIGGER goal_allocation_guard;
ALTER TABLE juntia_data.goal_usage_confirmations ENABLE TRIGGER goal_confirmation_guard;
ALTER TABLE juntia_data.goal_ledger_entries ENABLE TRIGGER goal_void_reactivate;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE juntia_data.goal_ledger_entries ALTER CONSTRAINT goal_ledger_entries_confirmation_id_fkey NOT DEFERRABLE;
-- check-invariants.sql se ejecuta a continuación, antes del COMMIT de psql -1.
