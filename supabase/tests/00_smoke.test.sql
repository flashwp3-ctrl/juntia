-- T007: «pasa con el esquema vacío» (tasks.md, etapa 0).
begin;
select plan(1);
select has_schema('public');
select * from finish();
rollback;
