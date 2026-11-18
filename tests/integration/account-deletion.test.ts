// 005 · T039 (FR-067; D2, opción a). contracts/account-deletion.md §6, los once casos (interpretación I1):
// «el borrado de los datos y el del usuario de Auth no pueden ser atómicos [...] El procedimiento no promete atomicidad
// entre los dos: promete un estado verificable y una recuperación idempotente» (§4).
// `run.mjs` recibe por inyección un cliente de Auth del runner que se puede hacer fallar, la base y un reloj. El destino
// lo fija la prueba ("juntia-dev"): aquí el guardia es el del arnés (runnerEnv/assertTestTarget), no la línea de órdenes.
import { randomUUID, createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { runDeletion, psqlDatabase, supabaseAuth, shortHash, statePathFor } from "../../scripts/account-deletion/run.mjs";
import { cleanPgEnv } from "../../scripts/dev-target/guard.mjs";
import { runnerEnv } from "./support/env";
import { runnerSql } from "./support/sql";
import { assertTestTarget } from "../support/dev-target";
import { seedCouple, seedGoldenMovements, seedUser, type SeededUser } from "../support/seed";

type Auth = ReturnType<typeof supabaseAuth>;
type Clock = { now: () => number };
const DAY = 24 * 3600e3;
const TRIGGERS = ["audit_events_append_only", "budget_versions_append_only", "goal_ledger_append_only", "goal_allocations_append_only", "settlements_guard", "allocations_check_sum"];

const work = mkdtempSync(join(tmpdir(), "juntia-deletion-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

function database() {
  const { apiUrl, secretKey } = runnerEnv();
  const raw = process.env.DB_URL ?? "";
  assertTestTarget(raw, "El borrado de cuentas");
  const db = psqlDatabase({ env: cleanPgEnv(process.env, raw) as NodeJS.ProcessEnv });
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { db, admin };
}
const { db, admin } = database();

/**
 * Auth del runner con fallos inyectables y el reloj de la prueba. GoTrue fija `banned_until` con su propia hora; para
 * simular días de espera, este envoltorio recuerda el `banned_until` en la hora del reloj inyectado al bloquear y lo
 * devuelve mientras el usuario siga bloqueado de verdad.
 */
function testAuth(clock: Clock, faults: { ban?: (id: string, duration: string) => boolean; deleteUser?: (id: string) => boolean } = {}) {
  const real: Auth = supabaseAuth({ admin, db });
  const until = new Map<string, string | null>();
  const calls: string[] = [];
  const auth: Auth = {
    async getUser(id) {
      const user = await real.getUser(id);
      if (!user.exists) return user;
      const bannedReally = !!user.bannedUntil && Date.parse(user.bannedUntil) > Date.now();
      return { exists: true, bannedUntil: bannedReally ? (until.get(id) ?? user.bannedUntil) : null };
    },
    async ban(id, duration) {
      calls.push(`ban ${shortHash(id)} ${duration}`);
      if (faults.ban?.(id, duration)) throw new Error("fallo inyectado: ban");
      await real.ban(id, duration);
      until.set(id, duration === "none" ? null : new Date(clock.now() + Number.parseInt(duration) * 3600e3).toISOString());
    },
    async revokeSessions(id) { calls.push(`revoke ${shortHash(id)}`); await real.revokeSessions(id); },
    async deleteUser(id) {
      calls.push(`delete ${shortHash(id)}`);
      if (faults.deleteUser?.(id)) throw new Error("fallo inyectado: deleteUser");
      await real.deleteUser(id);
    },
  };
  return { auth, calls };
}

const fakeClock = (): Clock & { advance: (ms: number) => void } => {
  let offset = 0;
  return { now: () => Date.now() + offset, advance: (ms) => { offset += ms; } };
};
const noSleep = async () => {};
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

/** Manifiesto completo y coherente (§3), con aprobaciones, exportaciones y confirmaciones de prueba. */
function manifest(users: string[], groupId: string | null, patch: (m: Record<string, unknown>) => void = () => {}) {
  const requestId = randomUUID();
  const approvals = users.map((id, i) => ({ user_id: id, approved_at: "2026-11-18T10:00:00-05:00", channel: `canal-${i + 1}`, text_sha256: sha(`aprobación ${id}`) }));
  const m: Record<string, unknown> = {
    request_id: requestId, target: "juntia-dev", users, group_id: groupId, access_token_lifetime_s: 3600, backup: null,
    approvals,
    exports: users.map((id) => ({ user_id: id, exported_at: "2026-11-18T09:00:00-05:00", file_sha256: sha(`export ${id}`), size_bytes: 2048 })),
    confirmations: users.map((id, i) => ({ user_id: id, channel: `canal-${i + 1}`, message_ref: `hilo-${i + 1} 10:30`, received_at: "2026-11-18T10:30:00-05:00",
      message_sha256: sha(`confirmación ${id}`), request_id: requestId, scope: { kind: users.length === 2 ? "couple" : "self", users: users.map(shortHash) },
      approval_sha256: approvals[i].text_sha256 })),
  };
  patch(m);
  const path = join(work, `deletion-${m.request_id}.json`);
  writeFileSync(path, JSON.stringify(m, null, 2));
  return path;
}

let seq = Math.floor(Math.random() * 1e6);
/** Pareja mínima por la invitación real (cumple las invariantes de la base) con una meta compartida, un gasto con meta
 * cuya solicitud aprobó la pareja (ciclo `confirmation_id` ↔ `usage_entry_id`), un `void` de aporte y un gasto movido. */
async function couple({ golden = false } = {}) {
  const index = ++seq;
  const pair = golden ? await seedCouple({ index, golden: true }) : await (async () => {
    const [sara, tomas] = await Promise.all([seedUser({ role: "borrado-sara", index, displayName: "Sara" }), seedUser({ role: "borrado-tomas", index, displayName: "Tomás" })]);
    const token = randomUUID(), tokenHash = sha(token);
    const invitation = await call(sara, "create_invitation", { p_idempotency_key: randomUUID(), p_email: tomas.email, p_token_hash: tokenHash });
    await call(tomas, "accept_invitation", { p_idempotency_key: randomUUID(), p_token_hash: tokenHash });
    return { groupId: (invitation as { group_id: string }).group_id, sara, tomas };
  })();
  const { sara, tomas, groupId } = pair;
  const goalId = golden ? runnerSql(`select id from juntia_data.savings_goals where group_id='${groupId}'`) : randomUUID();
  if (!golden) runnerSql(`insert into juntia_data.savings_goals(id,group_id,name,goal_type,target_minor,created_by,created_at) values('${goalId}','${groupId}','Meta sintética','travel',100000000,'${sara.id}','2025-12-01');
    insert into juntia_data.goal_ledger_entries(goal_id,kind,member_user_id,amount_minor,entry_date,funding_mode,created_by) values
    ('${goalId}','contribution','${sara.id}',10000000,'2026-10-01','reserved','${sara.id}'),('${goalId}','contribution','${tomas.id}',10000000,'2026-10-01','reserved','${tomas.id}');`);
  const funded = await call(sara, "create_expense_with_goal", { p_idempotency_key: randomUUID(), p_context: "us", p_amount_minor: "30000", p_category_id: "transport", p_transaction_date: "2026-11-03",
    p_description: "Tiquetes sintéticos", p_payer_user_id: tomas.id, p_split_mode: "equal", p_split_percents: null, p_parts: { [sara.id]: "15000", [tomas.id]: "15000" },
    p_goal_id: goalId, p_own_minor: "10000", p_requested_minor: "10000" }) as { id: string };
  const request = runnerSql(`select id from juntia_data.goal_usage_confirmations where transaction_id='${funded.id}'`);
  await call(tomas, "approve_usage_request", { p_idempotency_key: randomUUID(), p_request_id: request, p_expected_version: 1 });
  const contribution = await call(sara, "contribute_to_goal", { p_idempotency_key: randomUUID(), p_goal_id: goalId, p_amount_minor: "10000", p_entry_date: "2026-11-10", p_funding_mode: "reserved" }) as { id: string };
  await call(sara, "void_goal_entry", { p_idempotency_key: randomUUID(), p_entry_id: contribution.id, p_reason: "void" });
  const own = await call(sara, "create_transaction", { p_idempotency_key: randomUUID(), p_type: "expense", p_amount_minor: "20000", p_category_id: "market", p_transaction_date: "2026-11-05", p_description: null }) as { id: string };
  await call(sara, "reclassify_to_shared", { p_idempotency_key: randomUUID(), p_transaction_id: own.id, p_expected_version: 1, p_split_mode: "equal", p_split_percents: null, p_parts: { [sara.id]: "10000", [tomas.id]: "10000" } });
  return { ...pair, goalId, request };
}
async function call(user: SeededUser, name: string, args: Record<string, unknown>) {
  const { data, error } = await user.client.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.code} ${error.message}`);
  return data as unknown;
}
async function loner() {
  const user = await seedUser({ role: "borrado-sola", index: ++seq, displayName: "Lucía" });
  await seedGoldenMovements(user);
  return user;
}

/** Recuento por tabla de todo lo que nombra a unas personas (el mismo alcance que el script; solo lectura). */
const counts = (users: string[], groupId: string | null = null) =>
  JSON.parse(db.files([join("scripts", "account-deletion", "closure.sql")], { users: `{${users.join(",")}}`, group_id: groupId ?? "" }).split("\n").find((l: string) => l.startsWith("COUNTS "))!.slice(7)) as Record<string, number>;
const total = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
const triggersEnabled = () => runnerSql(`select string_agg(tgname||'='||tgenabled::text,',' order by tgname) from pg_trigger where tgname in(${TRIGGERS.map((t) => `'${t}'`).join(",")})`);
const allEnabled = TRIGGERS.slice().sort().map((t) => `${t}=O`).join(",");
const state = (path: string) => JSON.parse(readFileSync(statePathFor(path), "utf8"));
const inAuth = async (id: string) => (await supabaseAuth({ admin, db }).getUser(id)).exists;
const bannedNow = async (id: string) => { const u = await supabaseAuth({ admin, db }).getUser(id); return u.exists && !!u.bannedUntil && Date.parse(u.bannedUntil) > Date.now(); };
const sessions = (id: string) => Number(runnerSql(`select count(*) from auth.sessions where user_id='${id}'`));

describe("borrado manual en fases (contracts/account-deletion.md §6)", () => {
  it("1 · ciclo real (F85-1): se borra la pareja del dataset dorado; la tercera persona, intacta; triggers activos; invariantes", async () => {
    const pair = await couple({ golden: true });
    const third = await loner();
    // El ciclo existe de verdad: la solicitud aprobada y su asiento de uso se apuntan entre sí.
    expect(runnerSql(`select count(*) from juntia_data.goal_ledger_entries e join juntia_data.goal_usage_confirmations c on c.id=e.confirmation_id and c.usage_entry_id=e.id where c.id='${pair.request}'`)).toBe("1");
    expect(Number(runnerSql(`select count(*) from juntia_data.goal_ledger_entries where goal_id='${pair.goalId}' and kind='void'`))).toBe(1);
    expect(Number(runnerSql(`select count(*) from juntia_data.transactions where group_id='${pair.groupId}' and moved_from_transaction_id is not null`))).toBe(1);
    expect(Number(runnerSql(`select count(*) from juntia_data.transaction_allocations a join juntia_data.transactions t on t.id=a.transaction_id where t.group_id='${pair.groupId}'`))).toBeGreaterThan(0);
    const thirdBefore = counts([third.id]);
    const before = counts([pair.sara.id, pair.tomas.id], pair.groupId);
    expect(sessions(pair.sara.id)).toBeGreaterThan(0);
    const path = manifest([pair.sara.id, pair.tomas.id], pair.groupId);
    const clock = fakeClock();
    const { auth } = testAuth(clock);

    const result = await runDeletion({ manifestPath: path, auth, db, clock, sleep: noSleep, target: "juntia-dev" });

    expect(result.phase).toBe("verified");
    expect(result.history.map((h: { phase: string }) => h.phase)).toEqual(["planned", "locked", "data_deleted", "auth_deleted", "verified"]);
    expect(result.counts_before).toEqual(before);
    expect(total(result.counts_after)).toBe(0);
    expect(total(counts([pair.sara.id, pair.tomas.id], pair.groupId))).toBe(0);
    expect(await inAuth(pair.sara.id)).toBe(false);
    expect(await inAuth(pair.tomas.id)).toBe(false);
    expect(counts([third.id])).toEqual(thirdBefore);
    expect(triggersEnabled()).toBe(allEnabled);
    expect(() => runnerSql(`begin; delete from juntia_data.audit_events where actor_user_id='${third.id}'; rollback;`)).toThrow();
    expect(runnerSql(`begin;\n\\i '${join(process.cwd(), "supabase", "restore", "check-invariants.sql").replace(/\\/g, "/")}'\nselect 'ok';\nrollback;`)).toBe("ok");
  });

  it("2 · persona sola: se borra la tercera; una pareja resembrada queda intacta", async () => {
    const pair = await couple();
    const third = await loner();
    const pairBefore = counts([pair.sara.id, pair.tomas.id], pair.groupId);
    const path = manifest([third.id], null);
    const result = await runDeletion({ manifestPath: path, auth: testAuth(fakeClock()).auth, db, sleep: noSleep, target: "juntia-dev" });
    expect(result.phase).toBe("verified");
    expect(total(counts([third.id]))).toBe(0);
    expect(await inAuth(third.id)).toBe(false);
    expect(counts([pair.sara.id, pair.tomas.id], pair.groupId)).toEqual(pairBefore);
    expect(await inAuth(pair.sara.id)).toBe(true);
  });

  it("3 · fallo dentro de la fase 1: todo como antes y el estado sigue en locked", async () => {
    const pair = await couple();
    const before = counts([pair.sara.id, pair.tomas.id], pair.groupId);
    const confirmation = runnerSql(`select string_agg(id||':'||coalesce(confirmation_id::text,'-'),',' order by id) from juntia_data.goal_ledger_entries where goal_id='${pair.goalId}'`);
    const fail = join(work, "fail-after-delete.sql");
    writeFileSync(fail, "do $$ begin raise exception 'fallo provocado después de los delete'; end $$;\n");
    const path = manifest([pair.sara.id, pair.tomas.id], pair.groupId);
    await expect(runDeletion({ manifestPath: path, auth: testAuth(fakeClock()).auth, db, sleep: noSleep, target: "juntia-dev", extraSqlFiles: [fail] })).rejects.toThrow(/fallo provocado/);
    expect(state(path).phase).toBe("locked");
    expect(counts([pair.sara.id, pair.tomas.id], pair.groupId)).toEqual(before);
    expect(runnerSql(`select string_agg(id||':'||coalesce(confirmation_id::text,'-'),',' order by id) from juntia_data.goal_ledger_entries where goal_id='${pair.goalId}'`)).toBe(confirmation);
    expect(triggersEnabled()).toBe(allEnabled);
    await runDeletion({ manifestPath: path, mode: "resume", auth: testAuth(fakeClock()).auth, db, sleep: noSleep, target: "juntia-dev" });
  });

  it("4 · fallo de Auth en el primer usuario (F85-2): data_deleted sin usuarios borrados; --resume termina en verified", async () => {
    const pair = await couple();
    const path = manifest([pair.sara.id, pair.tomas.id], pair.groupId);
    const failing = testAuth(fakeClock(), { deleteUser: () => true });
    await expect(runDeletion({ manifestPath: path, auth: failing.auth, db, sleep: noSleep, target: "juntia-dev" })).rejects.toThrow(/deleteUser/);
    expect(state(path).phase).toBe("data_deleted");
    expect(state(path).auth_deleted).toEqual([]);
    for (const id of [pair.sara.id, pair.tomas.id]) { expect(await bannedNow(id)).toBe(true); expect(sessions(id)).toBe(0); }
    expect(total(counts([pair.sara.id, pair.tomas.id], pair.groupId))).toBe(0);
    const result = await runDeletion({ manifestPath: path, mode: "resume", auth: testAuth(fakeClock()).auth, db, sleep: noSleep, target: "juntia-dev" });
    expect(result.phase).toBe("verified");
    expect(await inAuth(pair.sara.id)).toBe(false);
    expect(await inAuth(pair.tomas.id)).toBe(false);
  });

  it("5 · fallo de Auth en el segundo usuario: data_deleted con el primero borrado; --resume borra solo el segundo", async () => {
    const pair = await couple();
    const path = manifest([pair.sara.id, pair.tomas.id], pair.groupId);
    await expect(runDeletion({ manifestPath: path, auth: testAuth(fakeClock(), { deleteUser: (id) => id === pair.tomas.id }).auth, db, sleep: noSleep, target: "juntia-dev" })).rejects.toThrow(/deleteUser/);
    expect(state(path)).toMatchObject({ phase: "data_deleted", auth_deleted: [pair.sara.id] });
    expect(await inAuth(pair.sara.id)).toBe(false);
    expect(await bannedNow(pair.tomas.id)).toBe(true);
    const resumed = testAuth(fakeClock());
    const result = await runDeletion({ manifestPath: path, mode: "resume", auth: resumed.auth, db, sleep: noSleep, target: "juntia-dev" });
    expect(result.phase).toBe("verified");
    expect(resumed.calls.filter((c) => c.startsWith("delete"))).toEqual([`delete ${shortHash(pair.tomas.id)}`]);
  });

  it("6 · manifiesto incompleto (F85-3): se detiene antes de la fase 0 sin escribir", async () => {
    const pair = await couple();
    const third = await loner();
    const users = [pair.sara.id, pair.tomas.id];
    const variants: [string, string][] = [
      ["falta la segunda aprobación", manifest(users, pair.groupId, (m) => { (m.approvals as unknown[]).pop(); })],
      ["falta la segunda exportación", manifest(users, pair.groupId, (m) => { (m.exports as unknown[]).pop(); })],
      ["las dos aprobaciones son de la misma persona", manifest(users, pair.groupId, (m) => { (m.approvals as { user_id: string }[])[1].user_id = pair.sara.id; })],
      ["los UUID no son los miembros del grupo", manifest([pair.sara.id, third.id], pair.groupId)],
      ["una sola persona con pareja activa", manifest([pair.sara.id], null)],
    ];
    const before = counts(users, pair.groupId);
    for (const [why, path] of variants) {
      const { auth, calls } = testAuth(fakeClock());
      await expect(runDeletion({ manifestPath: path, auth, db, sleep: noSleep, target: "juntia-dev" }), why).rejects.toThrow(/^manifest:/);
      expect(existsSync(statePathFor(path)), why).toBe(false);
      expect(calls, why).toEqual([]);
    }
    expect(counts(users, pair.groupId)).toEqual(before);
    expect(await bannedNow(pair.sara.id)).toBe(false);
  });

  it("7 · cierre: una fila fuera del alcance que apunta a una de dentro detiene el script antes de la fase 0", async () => {
    const pair = await couple();
    const third = await loner();
    // Preparación: un presupuesto propio de la tercera persona con una versión que nombra a Sara. Es un vínculo que la app
    // no crea, elegido porque no rompe las invariantes que otras pruebas comprueban sobre toda la base a la vez.
    const budget = randomUUID(), outside = randomUUID();
    runnerSql(`begin; insert into juntia_data.budgets(id,owner_user_id,category_id,created_by) values('${budget}','${third.id}','health','${third.id}');
      insert into juntia_data.budget_versions(id,budget_id,effective_month,limit_minor,changed_by) values('${outside}','${budget}','2026-11-01',100000,'${pair.sara.id}'); commit;`);
    try {
      const path = manifest([pair.sara.id, pair.tomas.id], pair.groupId);
      const { auth, calls } = testAuth(fakeClock());
      await expect(runDeletion({ manifestPath: path, auth, db, sleep: noSleep, target: "juntia-dev" })).rejects.toThrow(new RegExp(`ACCOUNT_DELETION_CLOSURE: budget_versions ${outside}`));
      expect(existsSync(statePathFor(path))).toBe(false);
      expect(calls).toEqual([]);
    } finally {
      runnerSql(`begin; set local session_replication_role='replica'; delete from juntia_data.budget_versions where id='${outside}'; delete from juntia_data.budgets where id='${budget}'; commit;`);
    }
  });

  it("8 · huellas válidas sin confirmaciones propias (F85-12): rechazo antes de la fase 0", async () => {
    const pair = await couple();
    const users = [pair.sara.id, pair.tomas.id];
    const variants: [string, string][] = [
      ["sin confirmations[]", manifest(users, pair.groupId, (m) => { delete m.confirmations; })],
      ["con una sola", manifest(users, pair.groupId, (m) => { (m.confirmations as unknown[]).pop(); })],
      ["las dos del mismo canal", manifest(users, pair.groupId, (m) => { (m.confirmations as { channel: string }[])[1].channel = "canal-1"; })],
      ["otro request_id", manifest(users, pair.groupId, (m) => { (m.confirmations as { request_id: string }[])[0].request_id = randomUUID(); })],
      ["otro alcance", manifest(users, pair.groupId, (m) => { (m.confirmations as { scope: unknown }[])[1].scope = { kind: "self", users: [shortHash(pair.tomas.id)] }; })],
    ];
    for (const [why, path] of variants) {
      const { auth, calls } = testAuth(fakeClock());
      await expect(runDeletion({ manifestPath: path, auth, db, sleep: noSleep, target: "juntia-dev" }), why).rejects.toThrow(/^manifest: .*confirmations|^manifest: las dos confirmaciones/);
      expect(existsSync(statePathFor(path)), why).toBe(false);
      expect(calls, why).toEqual([]);
    }
  });

  it("9 · bloqueo parcial (F85-10): --abort levanta solo a la primera; en otra corrida, --resume bloquea a la segunda y sigue", async () => {
    for (const exit of ["abort", "resume"] as const) {
      const pair = await couple();
      const before = counts([pair.sara.id, pair.tomas.id], pair.groupId);
      const path = manifest([pair.sara.id, pair.tomas.id], pair.groupId);
      const clock = fakeClock();
      await expect(runDeletion({ manifestPath: path, auth: testAuth(clock, { ban: (id) => id === pair.tomas.id }).auth, db, clock, sleep: noSleep, target: "juntia-dev" })).rejects.toThrow(/ban/);
      expect(state(path).phase).toBe("planned");
      expect(state(path).people.map((p: { ban: string }) => p.ban)).toEqual(["applied", "pending"]);
      expect(await bannedNow(pair.sara.id)).toBe(true);
      expect(await bannedNow(pair.tomas.id)).toBe(false);
      const next = testAuth(clock);
      const result = await runDeletion({ manifestPath: path, mode: exit, auth: next.auth, db, clock, sleep: noSleep, target: "juntia-dev" });
      if (exit === "abort") {
        expect(result.phase).toBe("aborted");
        expect(next.calls).toEqual([`ban ${shortHash(pair.sara.id)} none`]);
        expect(await bannedNow(pair.sara.id)).toBe(false);
        expect(counts([pair.sara.id, pair.tomas.id], pair.groupId)).toEqual(before);
        // Idempotente: repetir no cambia nada.
        expect((await runDeletion({ manifestPath: path, mode: "abort", auth: next.auth, db, clock, sleep: noSleep, target: "juntia-dev" })).phase).toBe("aborted");
      } else {
        expect(result.phase).toBe("verified");
        expect(next.calls).toContain(`ban ${shortHash(pair.tomas.id)} 720h`);
      }
    }
  });

  it("10 · interrupción larga (F85-10): renueva con menos de 7 días; con el bloqueo caducado, lo repone y cierra sesiones antes de la fase 1", async () => {
    for (const [label, days] of [["menos de 7 días", 25], ["caducado", 31]] as const) {
      const pair = await couple();
      const path = manifest([pair.sara.id, pair.tomas.id], pair.groupId);
      const clock = fakeClock();
      // Se para en locked: la primera fase 1 falla.
      let failOnce = true;
      const stopping = { ...db, files: (files: string[], vars: Record<string, string>) => {
        if (failOnce && files.some((f) => f.endsWith("delete-account.sql"))) { failOnce = false; throw new Error("parada en locked"); }
        return db.files(files, vars);
      } };
      await expect(runDeletion({ manifestPath: path, auth: testAuth(clock).auth, db: stopping, clock, sleep: noSleep, target: "juntia-dev" })).rejects.toThrow(/parada en locked/);
      expect(state(path).phase, label).toBe("locked");
      const first = Date.parse(state(path).people[0].banned_until);
      clock.advance(days * DAY);
      const resumed = testAuth(clock);
      const result = await runDeletion({ manifestPath: path, mode: "resume", auth: resumed.auth, db, clock, sleep: noSleep, target: "juntia-dev" });
      expect(result.phase, label).toBe("verified");
      expect(resumed.calls.filter((c) => c.startsWith("ban")), label).toEqual([`ban ${shortHash(pair.sara.id)} 720h`, `ban ${shortHash(pair.tomas.id)} 720h`]);
      expect(Date.parse(result.people[0].banned_until), label).toBeGreaterThan(first);
      if (days === 31) {
        // Repuesto y con sesiones cerradas antes de la fase 1: ban y revoke de cada persona preceden a cualquier borrado.
        expect(resumed.calls.slice(0, 4), label).toEqual([`ban ${shortHash(pair.sara.id)} 720h`, `revoke ${shortHash(pair.sara.id)}`, `ban ${shortHash(pair.tomas.id)} 720h`, `revoke ${shortHash(pair.tomas.id)}`]);
      }
    }
  });

  it("11 · --abort tardío: desde data_deleted se rechaza y el estado no cambia", async () => {
    const pair = await couple();
    const path = manifest([pair.sara.id, pair.tomas.id], pair.groupId);
    await expect(runDeletion({ manifestPath: path, auth: testAuth(fakeClock(), { deleteUser: () => true }).auth, db, sleep: noSleep, target: "juntia-dev" })).rejects.toThrow(/deleteUser/);
    const saved = readFileSync(statePathFor(path), "utf8");
    expect(JSON.parse(saved).phase).toBe("data_deleted");
    await expect(runDeletion({ manifestPath: path, mode: "abort", auth: testAuth(fakeClock()).auth, db, sleep: noSleep, target: "juntia-dev" })).rejects.toThrow(/^abort:/);
    expect(readFileSync(statePathFor(path), "utf8")).toBe(saved);
    await runDeletion({ manifestPath: path, mode: "resume", auth: testAuth(fakeClock()).auth, db, sleep: noSleep, target: "juntia-dev" });
  });
});
