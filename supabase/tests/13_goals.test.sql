-- 004 FR-030–042/091; DEC-G06: «el aportante es siempre quien llama».
-- Decisiones 22.13/15: no editar ni borrar aportes; completar manual, archivar solo saldo cero.
begin;
select no_plan();
select tests.create_user('11111111-1111-4111-8111-111111111111','sara@seed.test');
select tests.create_user('22222222-2222-4222-8222-222222222222','tomas@seed.test');
select tests.create_user('33333333-3333-4333-8333-333333333333','third@seed.test');
select tests.seed_couple('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into juntia_data.savings_goals(id,owner_user_id,name,goal_type,target_minor,created_by,created_at)
select id::uuid,'11111111-1111-4111-8111-111111111111',name,'other',100000,'11111111-1111-4111-8111-111111111111','2026-01-01'
from(values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Fondos'),('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Completar'),('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Archivar')) v(id,name);
insert into juntia_data.goal_ledger_entries(id,goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,created_by)
values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','contribution','11111111-1111-4111-8111-111111111111',10000,'2026-10-01','reserved','11111111-1111-4111-8111-111111111111');
set local role authenticated;
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select lives_ok($$select public.create_goal('20000000-0000-4000-8000-000000000001','me','Nueva','travel','100000',null)$$,'crear meta sin presupuesto');
select lives_ok($$select public.create_goal('20000000-0000-4000-8000-000000000001','me','Nueva','travel','100000',null)$$,'crear idempotente');
select throws_ok($$select public.create_goal('20000000-0000-4000-8000-000000000001','me','Otra','travel','100000',null)$$,'JT008',null,'crear otra huella');
select throws_ok($$select public.create_goal(gen_random_uuid()::text,'me','','travel','100000',null)$$,'JT215',null,'nombre vacío');
select throws_ok($$select public.create_goal(gen_random_uuid()::text,'me','Nueva','unknown','100000',null)$$,'JT215',null,'tipo inválido');
select throws_ok($$select public.create_goal(gen_random_uuid()::text,'me','Nueva','travel','0',null)$$,'JT215',null,'objetivo positivo');
select throws_ok($$select public.create_goal(gen_random_uuid()::text,'me','Nueva','travel','100000','2027-04-02')$$,'JT215',null,'mes objetivo primer día');
select lives_ok($$select public.update_goal('20000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,'Fondos editados','vehicle','200000',null)$$,'editar con versión');
select lives_ok($$select public.update_goal('20000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,'Fondos editados','vehicle','200000',null)$$,'editar idempotente');
select throws_ok($$select public.update_goal('20000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,'Otra','vehicle','200000',null)$$,'JT008',null,'editar otra huella');
select throws_ok($$select public.update_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,'Otra','vehicle','200000',null)$$,'JT011',null,'versión vieja');
select lives_ok($$select public.complete_goal('20000000-0000-4000-8000-000000000003','cccccccc-cccc-4ccc-8ccc-cccccccccccc',1)$$,'lograr es manual, sin exigir objetivo');
select lives_ok($$select public.complete_goal('20000000-0000-4000-8000-000000000003','cccccccc-cccc-4ccc-8ccc-cccccccccccc',1)$$,'lograr idempotente');
select throws_ok($$select public.complete_goal('20000000-0000-4000-8000-000000000003','cccccccc-cccc-4ccc-8ccc-cccccccccccc',2)$$,'JT008',null,'lograr otra huella');
select lives_ok($$select public.archive_goal('20000000-0000-4000-8000-000000000004','dddddddd-dddd-4ddd-8ddd-dddddddddddd',1)$$,'archivar saldo cero');
select lives_ok($$select public.archive_goal('20000000-0000-4000-8000-000000000004','dddddddd-dddd-4ddd-8ddd-dddddddddddd',1)$$,'archivar idempotente');
select throws_ok($$select public.archive_goal('20000000-0000-4000-8000-000000000004','dddddddd-dddd-4ddd-8ddd-dddddddddddd',2)$$,'JT008',null,'archivar otra huella');
select throws_ok($$select public.archive_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',2)$$,'JT214',null,'no archivar con fondos');
select lives_ok($$select public.contribute_to_goal('20000000-0000-4000-8000-000000000005','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','10000','2026-10-02','reserved')$$,'aportar fondos propios');
select lives_ok($$select public.contribute_to_goal('20000000-0000-4000-8000-000000000005','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','10000','2026-10-02','reserved')$$,'aportar idempotente');
select throws_ok($$select public.contribute_to_goal('20000000-0000-4000-8000-000000000005','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','20000','2026-10-02','reserved')$$,'JT008',null,'aportar otra huella');
select throws_ok($$select public.contribute_to_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','100',(current_date+2)::text,'reserved')$$,'JT208',null,'fecha futura');
select throws_ok($$select public.contribute_to_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','100','2025-01-01','reserved')$$,'JT208',null,'fecha anterior a meta');
select throws_ok($$select public.contribute_to_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','100','2026-10-02','bank_verified')$$,'JT216',null,'modo inválido');
select throws_ok($$select public.contribute_to_goal(gen_random_uuid()::text,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','100','2026-10-02','reserved')$$,'JT202',null,'lograda no admite aporte');
select lives_ok($$select public.withdraw_from_goal('20000000-0000-4000-8000-000000000006','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','100','2026-10-03','reasignar')$$,'retiro propio con motivo');
select lives_ok($$select public.withdraw_from_goal('20000000-0000-4000-8000-000000000006','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','100','2026-10-03','reasignar')$$,'retiro idempotente');
select throws_ok($$select public.withdraw_from_goal('20000000-0000-4000-8000-000000000006','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','200','2026-10-03','reasignar')$$,'JT008',null,'retiro otra huella');
select throws_ok($$select public.withdraw_from_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','100000','2026-10-03','reasignar')$$,'JT204',null,'fondos disponibles por aportante');
select throws_ok($$select public.withdraw_from_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','100','2026-10-03','')$$,'JT217',null,'motivo obligatorio');
select lives_ok($$select public.void_goal_entry('20000000-0000-4000-8000-000000000007','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','void')$$,'anular aporte propio disponible');
select lives_ok($$select public.void_goal_entry('20000000-0000-4000-8000-000000000007','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','void')$$,'anular idempotente');
select throws_ok($$select public.void_goal_entry('20000000-0000-4000-8000-000000000007','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','undo')$$,'JT008',null,'anular otra huella');
select throws_ok($$select public.void_goal_entry(gen_random_uuid()::text,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','void')$$,'JT207',null,'ya anulado');
reset role;
select is((select count(*) from juntia_data.goal_ledger_entries where voids_entry_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),1::bigint,'un solo void');
-- T015: cada función detecta una política rota, y la intención queda sin completar.
alter policy savings_goals_insert on juntia_data.savings_goals with check(false);
set local role authenticated;
select throws_ok($$select public.create_goal('20000000-0000-4000-8000-000000000011','me','Denegada','travel','10000',null)$$,null,null,'crear: política rota');
reset role;
alter policy savings_goals_insert on juntia_data.savings_goals with check(created_by=(select auth.uid()) and (owner_user_id=(select auth.uid()) or juntia_private.is_couple_member(group_id)));
alter policy savings_goals_update on juntia_data.savings_goals using(false);
set local role authenticated;
select throws_ok($$select public.update_goal('20000000-0000-4000-8000-000000000012','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',2,'Denegada','travel','10000',null)$$,null,null,'editar: política rota');
select throws_ok($$select public.complete_goal('20000000-0000-4000-8000-000000000013','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',2)$$,null,null,'lograr: política rota');
select throws_ok($$select public.archive_goal('20000000-0000-4000-8000-000000000014','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',2)$$,null,null,'archivar: política rota');
reset role;
alter policy savings_goals_update on juntia_data.savings_goals using(owner_user_id=(select auth.uid()) or juntia_private.is_couple_member(group_id));
alter policy goal_ledger_insert on juntia_data.goal_ledger_entries with check(false);
set local role authenticated;
select throws_ok($$select public.contribute_to_goal('20000000-0000-4000-8000-000000000015','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','10000','2026-10-02','reserved')$$,null,null,'aportar: política rota');
select throws_ok($$select public.withdraw_from_goal('20000000-0000-4000-8000-000000000016','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','100','2026-10-02','reasignar')$$,null,null,'retirar: política rota');
select throws_ok($$select public.void_goal_entry('20000000-0000-4000-8000-000000000017',(select id from public.goal_entries where goal_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and kind='contribution' and not voided limit 1),'void')$$,null,null,'anular: política rota');
reset role;
select is((select count(*) from juntia_data.idempotency_records where idempotency_key::text like '20000000-0000-4000-8000-00000000001%'),0::bigint,'siete fallos revierten idempotencia');
alter policy goal_ledger_insert on juntia_data.goal_ledger_entries with check(created_by=(select auth.uid()) and (member_user_id is null or member_user_id=(select auth.uid())) and exists(select 1 from juntia_data.savings_goals g where g.id=goal_id));
set local role authenticated;
set local "request.jwt.claims"='{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';
select throws_ok($$select public.create_goal(gen_random_uuid()::text,'us','No','travel','10000',null)$$,'JT105',null,'tercero no crea meta compartida');
select throws_ok($$select public.update_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',2,'No','travel','10000',null)$$,'JT201',null,'tercero no edita meta');
select throws_ok($$select public.complete_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',2)$$,'JT201',null,'tercero no logra meta');
select throws_ok($$select public.archive_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',2)$$,'JT201',null,'tercero no archiva meta');
select throws_ok($$select public.contribute_to_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','100','2026-10-02','reserved')$$,'JT201',null,'tercero no aporta');
select throws_ok($$select public.withdraw_from_goal(gen_random_uuid()::text,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','100','2026-10-02','reasignar')$$,'JT201',null,'tercero no retira');
select throws_ok($$select public.void_goal_entry(gen_random_uuid()::text,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','void')$$,'JT205',null,'tercero no anula');
reset role;
-- FR-007/052–059 y ADR-010: financiación real, confirmación ajena y regresiones.
reset role;
insert into juntia_data.savings_goals(id,group_id,name,goal_type,target_minor,created_by,created_at)
values('99999999-9999-4999-8999-999999999999','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Compartida','travel',100000,'11111111-1111-4111-8111-111111111111','2026-01-01');
insert into juntia_data.goal_ledger_entries(goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,created_by)
select '99999999-9999-4999-8999-999999999999','contribution',u::uuid,10000,'2026-10-01','reserved',u::uuid
from unnest(array['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222']) u;
insert into juntia_data.transactions(id,type,created_by,group_id,payer_user_id,split_mode,amount_minor,category_id,transaction_date)
select ('40000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'expense','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','equal',20000,'transport','2026-11-03' from generate_series(1,6) i;
insert into juntia_data.transaction_allocations(transaction_id,user_id,amount_minor)
select ('40000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,u::uuid,10000 from generate_series(1,6) i cross join unnest(array['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222']) u;
insert into juntia_data.transactions(id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date)
select ('50000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'expense','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',20000,'transport','2026-11-03' from generate_series(1,3) i;
insert into juntia_data.goal_usage_confirmations(id,goal_id,transaction_id,requested_by,member_user_id,amount_minor)
select ('60000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'99999999-9999-4999-8999-999999999999',('40000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',1000 from generate_series(1,5) i;
insert into juntia_data.goal_ledger_entries(id,goal_id,kind,amount_minor,transaction_id,created_by)
select ('70000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','usage',1000,('50000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'11111111-1111-4111-8111-111111111111' from generate_series(1,3) i
union all select '70000000-0000-4000-8000-000000000004'::uuid,'99999999-9999-4999-8999-999999999999'::uuid,'usage',1000,'40000000-0000-4000-8000-000000000004'::uuid,'11111111-1111-4111-8111-111111111111'::uuid;
insert into juntia_data.goal_usage_allocations(entry_id,member_user_id,amount_minor)
select ('70000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'11111111-1111-4111-8111-111111111111',1000 from generate_series(1,4) i;
grant usage on schema extensions to juntia_writer;
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role juntia_writer;
select is(juntia_private.transaction_goal_funded('50000000-0000-4000-8000-000000000001'),true,'transaction_goal_funded cuerpo real con uso vivo');
reset role;
set local role authenticated;
select throws_ok($$select public.reclassify_to_shared(gen_random_uuid()::text,'50000000-0000-4000-8000-000000000001',1,'equal',null,'{"11111111-1111-4111-8111-111111111111":"10000","22222222-2222-4222-8222-222222222222":"10000"}')$$,'JT116',null,'Mover a Pareja bloquea uso personal');
select throws_ok($$select public.update_transaction(gen_random_uuid()::text,'50000000-0000-4000-8000-000000000001',1,'500','transport','2026-11-03',null)$$,'JT213',null,'regresión: editar privado por debajo del uso');
select throws_ok($$select public.update_shared_expense(gen_random_uuid()::text,'40000000-0000-4000-8000-000000000004',1,'400','transport','2026-11-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"11111111-1111-4111-8111-111111111111":"200","22222222-2222-4222-8222-222222222222":"200"}')$$,'JT213',null,'regresión: editar compartido por debajo del uso');
select lives_ok($$select public.create_expense_with_goal('30000000-0000-4000-8000-000000000001','us','20000','transport','2026-11-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"11111111-1111-4111-8111-111111111111":"10000","22222222-2222-4222-8222-222222222222":"10000"}','99999999-9999-4999-8999-999999999999','1000','1000')$$,'gasto con meta: gasto, partes, propio y solicitud');
select lives_ok($$select public.create_expense_with_goal('30000000-0000-4000-8000-000000000001','us','20000','transport','2026-11-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"11111111-1111-4111-8111-111111111111":"10000","22222222-2222-4222-8222-222222222222":"10000"}','99999999-9999-4999-8999-999999999999','1000','1000')$$,'gasto con meta idempotente');
select throws_ok($$select public.create_expense_with_goal('30000000-0000-4000-8000-000000000001','us','20000','transport','2026-11-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"11111111-1111-4111-8111-111111111111":"10000","22222222-2222-4222-8222-222222222222":"10000"}','99999999-9999-4999-8999-999999999999','1100','1000')$$,'JT008',null,'gasto con meta otra huella');
select throws_ok($$select public.approve_usage_request(gen_random_uuid()::text,'60000000-0000-4000-8000-000000000001',1)$$,'JT211',null,'nadie aprueba su propia solicitud');
set local "request.jwt.claims"='{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select lives_ok($$select public.approve_usage_request('30000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001',1)$$,'aprobar aplica fondos ajenos');
select lives_ok($$select public.approve_usage_request('30000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001',1)$$,'aprobar idempotente');
select throws_ok($$select public.approve_usage_request('30000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001',2)$$,'JT008',null,'aprobar otra huella');
select throws_ok($$select public.approve_usage_request(gen_random_uuid()::text,'60000000-0000-4000-8000-000000000001',1)$$,'JT212',null,'solicitud ya resuelta');
select lives_ok($$select public.reject_usage_request('30000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000002',1)$$,'rechazar conserva gasto');
select lives_ok($$select public.reject_usage_request('30000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000002',1)$$,'rechazar idempotente');
select throws_ok($$select public.reject_usage_request('30000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000002',2)$$,'JT008',null,'rechazar otra huella');
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select lives_ok($$select public.cancel_usage_request('30000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000003',1)$$,'cancelar conserva gasto');
select lives_ok($$select public.cancel_usage_request('30000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000003',1)$$,'cancelar idempotente');
select throws_ok($$select public.cancel_usage_request('30000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000003',2)$$,'JT008',null,'cancelar otra huella');
select lives_ok($$select public.remove_goal_usage('30000000-0000-4000-8000-000000000005','50000000-0000-4000-8000-000000000001',1)$$,'quitar uso devuelve fondos');
select lives_ok($$select public.remove_goal_usage('30000000-0000-4000-8000-000000000005','50000000-0000-4000-8000-000000000001',1)$$,'quitar uso idempotente');
select throws_ok($$select public.remove_goal_usage('30000000-0000-4000-8000-000000000005','50000000-0000-4000-8000-000000000001',2)$$,'JT008',null,'quitar uso otra huella');
select lives_ok($$select public.void_transaction('30000000-0000-4000-8000-000000000006','50000000-0000-4000-8000-000000000002',1,'delete')$$,'regresión: anular privado quita uso');
select lives_ok($$select public.void_shared_expense('30000000-0000-4000-8000-000000000007','40000000-0000-4000-8000-000000000004',1,'delete')$$,'regresión: anular compartido quita uso y solicitud');
select throws_ok($$select public.remove_goal_usage(gen_random_uuid()::text,'50000000-0000-4000-8000-000000000002',2)$$,'JT012',null,'quitar uso sobre anulado falla');
reset role;
set local role juntia_writer;
select is(juntia_private.transaction_goal_funded('50000000-0000-4000-8000-000000000001'),false,'sin uso vivo, Mover vuelve a estar disponible');
reset role;
set local role authenticated;
set local "request.jwt.claims"='{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';
select throws_ok($$select public.approve_usage_request(gen_random_uuid()::text,'60000000-0000-4000-8000-000000000004',1)$$,'JT210',null,'tercero no aprueba');
select throws_ok($$select public.reject_usage_request(gen_random_uuid()::text,'60000000-0000-4000-8000-000000000004',1)$$,'JT210',null,'tercero no rechaza');
select throws_ok($$select public.cancel_usage_request(gen_random_uuid()::text,'60000000-0000-4000-8000-000000000005',1)$$,'JT210',null,'tercero no cancela');
select throws_ok($$select public.remove_goal_usage(gen_random_uuid()::text,'50000000-0000-4000-8000-000000000003',1)$$,'JT010',null,'tercero no quita uso');
reset role;
-- Sin consentimiento: atacar la tabla no usa el botón ni la RPC.
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role juntia_writer;
select throws_ok($$insert into juntia_data.goal_ledger_entries(id,goal_id,kind,amount_minor,transaction_id,created_by) values('80000000-0000-4000-8000-000000000001','99999999-9999-4999-8999-999999999999','usage',1000,'40000000-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111111'); insert into juntia_data.goal_usage_allocations(entry_id,member_user_id,amount_minor) values('80000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222',1000)$$,'JT223',null,'no uso directo de fondos ajenos sin aprobación');
select throws_ok($$insert into juntia_data.goal_ledger_entries(goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,created_by) values('99999999-9999-4999-8999-999999999999','contribution','22222222-2222-4222-8222-222222222222',100,'2026-10-02','reserved','11111111-1111-4111-8111-111111111111')$$,null,null,'no aportar a nombre de otra persona');
select throws_ok($$insert into juntia_data.goal_ledger_entries(goal_id,kind,member_user_id,amount_minor,entry_date,reason,created_by) values('99999999-9999-4999-8999-999999999999','withdrawal','22222222-2222-4222-8222-222222222222',100,'2026-10-02','reasignar','11111111-1111-4111-8111-111111111111')$$,null,null,'no retirar aportes ajenos');
reset role;
alter policy goal_allocations_insert on juntia_data.goal_usage_allocations with check(false);
set local role authenticated;
select throws_ok($$select public.create_expense_with_goal('30000000-0000-4000-8000-000000000011','us','20000','transport','2026-11-03',null,'22222222-2222-4222-8222-222222222222','equal',null,'{"11111111-1111-4111-8111-111111111111":"10000","22222222-2222-4222-8222-222222222222":"10000"}','99999999-9999-4999-8999-999999999999','1000','0')$$,null,null,'gasto con meta: política rota revierte todo');
set local "request.jwt.claims"='{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select throws_ok($$select public.approve_usage_request('30000000-0000-4000-8000-000000000012','60000000-0000-4000-8000-000000000005',1)$$,null,null,'aprobar: política rota');
reset role;
alter policy goal_allocations_insert on juntia_data.goal_usage_allocations with check(exists(select 1 from juntia_data.goal_ledger_entries e where e.id=entry_id));
alter policy goal_confirmations_update on juntia_data.goal_usage_confirmations using(false);
set local role authenticated;
select throws_ok($$select public.reject_usage_request('30000000-0000-4000-8000-000000000013','60000000-0000-4000-8000-000000000005',1)$$,null,null,'rechazar: política rota');
set local "request.jwt.claims"='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select throws_ok($$select public.cancel_usage_request('30000000-0000-4000-8000-000000000014','60000000-0000-4000-8000-000000000005',1)$$,null,null,'cancelar: política rota');
reset role;
alter policy goal_confirmations_update on juntia_data.goal_usage_confirmations using(exists(select 1 from juntia_data.savings_goals g where g.id=goal_id));
alter policy goal_ledger_insert on juntia_data.goal_ledger_entries with check(false);
set local role authenticated;
select throws_ok($$select public.remove_goal_usage('30000000-0000-4000-8000-000000000015','50000000-0000-4000-8000-000000000003',1)$$,null,null,'quitar uso: política rota');
reset role;
select is((select count(*) from juntia_data.idempotency_records where idempotency_key::text like '30000000-0000-4000-8000-00000000001%'),0::bigint,'cinco fallos revierten idempotencia');
select * from finish();
rollback;
