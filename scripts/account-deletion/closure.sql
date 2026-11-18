-- 005 · contracts/account-deletion.md §3: comprobación previa a la fase 0, de solo lectura. Calcula el alcance, se
-- detiene si su cierre se rompe y devuelve el recuento por tabla (`COUNTS {…}`), que `run.mjs` guarda en el estado
-- como recuento de referencia (§4.1, «recuentos iguales»). Corre con `psql -1`: las tablas temporales se borran al
-- terminar y nada se escribe en `juntia_data`.
\ir scope.sql
select 'COUNTS '||counts::text from del_counts;
-- F87-10: los identificadores del alcance (`IDS {…}`), que run.mjs guarda en el estado del plan y compara después.
select 'IDS '||ids::text from del_ids;
