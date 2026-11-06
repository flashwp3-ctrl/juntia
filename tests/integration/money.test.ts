// T025 / SC-007–SC-009: concurrencia, atomicidad, precisión y dataset por la
// función real, usando src/lib/db y el dominio (plan PR A, pruebas por capa).
import { beforeAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestUser } from "./support/users";
import { runnerSql, spawnRunnerSql } from "./support/sql";
import { createTransaction, updateTransaction, voidTransaction, listTransactions } from "../../src/lib/db/transactions";
import { moneyFromPesos } from "../../src/domain/money";
import { monthSummary } from "../../src/domain/transactions";
import { saraPrivateOctober2026 } from "../../src/domain/golden/october-2026";
let sara: Awaited<ReturnType<typeof createTestUser>>;
let tomas: Awaited<ReturnType<typeof createTestUser>>;
const draft = () => ({ idempotencyKey: randomUUID(), type: "expense" as const, amount: moneyFromPesos(45000n), categoryId: "transport" as const, transactionDate: "2027-01-02", description: null as string | null });
beforeAll(async () => { sara = await createTestUser("Sara dinero"); tomas = await createTestUser("Tomás dinero"); });
it("[V4] dos peticiones con la misma clave crean una sola operación", async () => {
  const input = draft();
  const [first, second] = await Promise.all([createTransaction(sara.client,input),createTransaction(sara.client,input)]);
  expect(first).toEqual(second);
  expect(runnerSql(`select count(*) from juntia_data.audit_events where entity_id='${first.id}'`)).toBe("1");
  await expect(createTransaction(sara.client,{ ...input, amount: moneyFromPesos(46000n) })).rejects.toMatchObject({ kind: "idempotencyKeyReused" });
});
it("[V5] solo una edición con la misma versión gana", async () => {
  const created = await createTransaction(sara.client,draft());
  const edit = { ...draft(), transactionId: created.id, expectedVersion: created.version };
  const results = await Promise.allSettled([updateTransaction(sara.client,edit),updateTransaction(sara.client,{ ...edit, idempotencyKey: randomUUID(), amount: moneyFromPesos(46000n) })]);
  expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
  expect(results.find(({ status }) => status === "rejected")).toMatchObject({ reason: { kind: "versionConflict" } });
});
it("[V3] un RAISE después de insertar el movimiento revierte todo", async () => {
  const input = { ...draft(), description: "inject-failure" };
  try {
    runnerSql(`create function tests.fail_audit() returns trigger language plpgsql as $$ begin if new.actor_user_id='${sara.id}' and new."after"->>'description'='inject-failure' then raise exception 'synthetic failure'; end if; return new; end $$;
      create trigger test_fail_audit before insert on juntia_data.audit_events for each row execute function tests.fail_audit();`);
    await expect(createTransaction(sara.client,input)).rejects.toMatchObject({ kind: "unexpected" });
    expect(runnerSql(`select count(*) from juntia_data.transactions where owner_user_id='${sara.id}' and description='inject-failure'`)).toBe("0");
    expect(runnerSql(`select count(*) from juntia_data.idempotency_records where idempotency_key='${input.idempotencyKey}'`)).toBe("0");
  } finally { runnerSql("drop trigger if exists test_fail_audit on juntia_data.audit_events; drop function if exists tests.fail_audit();"); }
});
it("[V6] 9007199254740993 vuelve idéntico por SDK y capa de datos", async () => {
  const id = randomUUID();
  runnerSql(`insert into juntia_data.transactions(id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date) values('${id}','expense','${sara.id}','${sara.id}',9007199254740993,'transport','2026-09-01');`);
  const raw = await sara.client.from("my_transactions").select("amount_minor").eq("id",id).single();
  expect(raw.data?.amount_minor).toBe("9007199254740993");
  expect((await listTransactions(sara.client,"2026-09"))[0].amount.amountMinor).toBe(9007199254740993n);
});
it("SC-007: Tomás no ve, edita ni anula el movimiento de Sara", async () => {
  const created = await createTransaction(sara.client,draft());
  expect(await listTransactions(tomas.client)).toEqual([]);
  await expect(updateTransaction(tomas.client,{ ...draft(), transactionId: created.id, expectedVersion: created.version })).rejects.toMatchObject({ kind: "transactionNotFound" });
  await expect(voidTransaction(tomas.client,{ idempotencyKey: randomUUID(), transactionId: created.id, expectedVersion: created.version, reason: "delete" })).rejects.toMatchObject({ kind: "transactionNotFound" });
});
it("SC-008: dataset sembrado por funciones reales da 41290000 sin sumar ingreso", async () => {
  for (const row of saraPrivateOctober2026) await createTransaction(sara.client,{ ...row, idempotencyKey: randomUUID() });
  const summary = monthSummary(await listTransactions(sara.client,"2026-10"),"2026-10");
  expect(summary.expenseTotal.amountMinor).toBe(41290000n);
  expect(summary.incomeTotal.amountMinor).toBe(8600000n);
});
it("el eliminado no se edita y Deshacer conserva el rastro", async () => {
  const created = await createTransaction(sara.client,draft());
  const result = await voidTransaction(sara.client,{ idempotencyKey: randomUUID(), transactionId: created.id, expectedVersion: created.version, reason: "undo" });
  expect(result.status).toBe("voided");
  await expect(updateTransaction(sara.client,{ ...draft(), transactionId: created.id, expectedVersion: result.version })).rejects.toMatchObject({ kind: "transactionVoided" });
});
it("40P01 real se reintenta con la misma clave", async () => {
  const external = spawnRunnerSql();
  const ready = new Promise<void>((resolve,reject) => {
    external.stdout.on("data", (chunk) => { if (String(chunk).includes("external_ready")) resolve(); });
    external.on("error",reject);
  });
  const closed = new Promise<void>((resolve) => external.on("close",() => resolve()));
  const spy = vi.spyOn(sara.client,"rpc");
  const input = { ...draft(), description: "deadlock" };
  let pending: ReturnType<typeof createTransaction> | undefined;
  try {
    runnerSql(`create table tests.lock_gate(id integer primary key,v integer not null); insert into tests.lock_gate values(1,0),(2,0);
      grant usage on schema tests to juntia_writer; grant select,update on tests.lock_gate to juntia_writer;
      create function tests.deadlock_gate() returns trigger language plpgsql as $$ begin if new.created_by='${sara.id}' and new.description='deadlock' then update tests.lock_gate set v=v+1 where id=2; update tests.lock_gate set v=v+1 where id=1; end if; return new; end $$;
      create trigger test_deadlock before insert on juntia_data.transactions for each row execute function tests.deadlock_gate();`);
    external.stdin.write("begin; update tests.lock_gate set v=v+1 where id=1;\n\\echo external_ready\n");
    await ready;
    pending = createTransaction(sara.client,input);
    void pending.catch(() => {});
    await vi.waitFor(() => expect(Number(runnerSql("select count(*) from pg_stat_activity where wait_event_type='Lock' and query like '%create_transaction%' and pid<>pg_backend_pid()"))).toBeGreaterThan(0),{ timeout: 5000 });
    external.stdin.end("update tests.lock_gate set v=v+1 where id=2; commit;\n");
    const saved = await pending;
    await closed;
    const calls = spy.mock.calls.filter(([name]) => name === "create_transaction");
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls.every(([,args]) => args?.p_idempotency_key === input.idempotencyKey)).toBe(true);
    expect(runnerSql(`select count(*) from juntia_data.audit_events where entity_id='${saved.id}'`)).toBe("1");
  } finally {
    if (external.exitCode === null) external.kill();
    await closed;
    if (pending) await pending.catch(() => {});
    spy.mockRestore();
    runnerSql("drop trigger if exists test_deadlock on juntia_data.transactions; drop function if exists tests.deadlock_gate(); drop table if exists tests.lock_gate; revoke usage on schema tests from juntia_writer;");
  }
},15000);
// T079 / FR-018, FR-034; US-2.5 (PR D). Lo que ya cubren 08_money_functions (motivo `undo` en SQL) y el caso anterior
// («el eliminado no se edita»: JT012 → transactionVoided por src/lib/db) se cita en evidence.md. Aquí, el caso que faltaba:
// «Deshacer» de punta a punta por src/lib/db con la versión que devolvió la creación, como hace la hoja de Anotar, y las
// carreras que puede provocar la interfaz (Deshacer dos veces, Deshacer después de editar, Eliminar después de Deshacer).
it("T079: Deshacer por src/lib/db deja el movimiento anulado, fuera de las listas y auditado con reason = 'undo'", async () => {
  const created = await createTransaction(sara.client,{ ...draft(), transactionDate: "2027-02-03" });
  const undo = { idempotencyKey: randomUUID(), transactionId: created.id, expectedVersion: created.version, reason: "undo" as const };
  const [first, second] = await Promise.all([voidTransaction(sara.client,undo),voidTransaction(sara.client,undo)]);
  expect(first).toEqual(second);
  expect(first).toMatchObject({ id: created.id, status: "voided", version: created.version + 1 });
  expect(runnerSql(`select status from juntia_data.transactions where id='${created.id}'`)).toBe("voided");
  expect(runnerSql(`select string_agg(reason,',') from juntia_data.audit_events where entity_id='${created.id}' and action='void'`)).toBe("undo");
  expect((await listTransactions(sara.client,"2027-02")).some(({ id }) => id === created.id)).toBe(false);
  await expect(voidTransaction(sara.client,{ ...undo, idempotencyKey: randomUUID(), reason: "delete", expectedVersion: first.version })).rejects.toMatchObject({ kind: "transactionVoided" });
});
it("T079: Deshacer después de editar falla con versionConflict y el movimiento sigue activo", async () => {
  const created = await createTransaction(sara.client,draft());
  await updateTransaction(sara.client,{ ...draft(), transactionId: created.id, expectedVersion: created.version, amount: moneyFromPesos(47000n) });
  await expect(voidTransaction(sara.client,{ idempotencyKey: randomUUID(), transactionId: created.id, expectedVersion: created.version, reason: "undo" })).rejects.toMatchObject({ kind: "versionConflict" });
  expect(runnerSql(`select status from juntia_data.transactions where id='${created.id}'`)).toBe("active");
  expect(runnerSql(`select count(*) from juntia_data.audit_events where entity_id='${created.id}' and action='void'`)).toBe("0");
});
