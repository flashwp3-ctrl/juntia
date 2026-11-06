-- T026b: el ciclo conserva ambas FK, comprobadas al finalizar la transacción.
begin;
select no_plan();
select is((select count(*) from pg_constraint where conrelid='juntia_data.transactions'::regclass and conname in ('transactions_moved_from_transaction_id_fkey','transactions_moved_to_transaction_id_fkey','transactions_restored_from_transaction_id_fkey') and contype='f' and condeferrable and condeferred),3::bigint,'tres FK de trazabilidad existen y son inicialmente diferidas');
select ok((select condeferrable and condeferred from pg_constraint where conrelid='juntia_data.group_invitations'::regclass and conname='group_invitations_replaced_by_fkey'),'el reemplazo de invitación también se puede cargar antes de su destino');
select tests.create_user('12121212-1212-4212-8212-121212121212','restore-fk@seed.test');
select throws_ok($test$do $body$ begin
 insert into juntia_data.transactions(id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date,moved_to_transaction_id)
 values('12121212-aaaa-4212-8212-121212121212','expense','12121212-1212-4212-8212-121212121212','12121212-1212-4212-8212-121212121212',10000,'transport','2026-10-03','12121212-bbbb-4212-8212-121212121212');
 set constraints all immediate;
end $body$;$test$,'23503',null,'una FK huérfana sigue rechazándose al comprobar las restricciones');
select is((select count(*) from juntia_data.transactions where id='12121212-aaaa-4212-8212-121212121212'),0::bigint,'la transacción fallida no conserva el registro huérfano');
select * from finish();
rollback;
