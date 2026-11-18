// 005 · FR-067; contracts/account-deletion.md (D2, opción a; F85-2, F85-3, F85-10, F85-12). Borrado manual de una cuenta
// en fases, con estado verificable y recuperación idempotente:
//
//   node scripts/account-deletion/run.mjs <ruta>/deletion-<id>.json     valida, bloquea, borra y verifica
//   node scripts/account-deletion/run.mjs --resume <ruta>/deletion-<id>.json
//   node scripts/account-deletion/run.mjs --abort <ruta>/deletion-<id>.json
//
// El manifiesto y su estado (`deletion-<id>.state.json`) viven FUERA del repositorio, en el equipo del gestor. La forma
// del manifiesto está en scripts/account-deletion/README.md. Desde la línea de órdenes solo se admite `juntia-dev`,
// con el guardia de destino y el bloqueo de un solo agente (decisión 18): P0-4 nunca ejecuta el borrado contra producción
// (contrato, D2: «Nada se ejecuta contra producción por este plan»).
//
// Es un programa de Node, no un `bash`, para que la prueba (tests/integration/account-deletion.test.ts) inyecte un
// cliente de Auth que se puede hacer fallar, la base y un reloj (`runDeletion`).
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const BAN_HOURS = 720;
const DAY_MS = 24 * 60 * 60 * 1000;
export const RENEW_BELOW_MS = 7 * DAY_MS;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
export const PHASES = ["planned", "locked", "data_deleted", "auth_deleted", "verified"];

export class DeletionError extends Error {
  constructor(code, message) { super(`${code}: ${message}`); this.name = "DeletionError"; this.code = code; }
}
const stop = (code, message) => { throw new DeletionError(code, message); };

/** Los ocho primeros caracteres de la SHA-256 de un UUID: lo único de una persona que sale a la evidencia (§3). */
export const shortHash = (uuid) => createHash("sha256").update(uuid).digest("hex").slice(0, 8);
const isDate = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));

/**
 * Validación del manifiesto que no necesita la base (§3; F85-3, F85-12). Devuelve el manifiesto normalizado o lanza
 * `DeletionError` con un mensaje que nombra el campo, nunca su valor.
 */
export function validateManifest(manifest, { target }) {
  const m = manifest ?? {};
  if (typeof m.request_id !== "string" || !UUID.test(m.request_id)) stop("manifest", "request_id no es un UUID");
  if (!["juntia-dev", "production"].includes(m.target)) stop("manifest", "target no es juntia-dev ni production");
  if (m.target !== target) stop("manifest", `target no coincide con el destino del guardia (${target})`);
  if (!Array.isArray(m.users) || m.users.length < 1 || m.users.length > 2) stop("manifest", "users tiene que tener una o dos personas");
  if (m.users.some((id) => typeof id !== "string" || !UUID.test(id))) stop("manifest", "users contiene un valor que no es un UUID");
  if (new Set(m.users).size !== m.users.length) stop("manifest", "users repite una persona");
  if (m.users.length === 2 && (typeof m.group_id !== "string" || !UUID.test(m.group_id))) stop("manifest", "con dos personas, group_id es el UUID de su pareja");
  if (m.users.length === 1 && m.group_id !== null) stop("manifest", "con una persona, group_id es null");
  if (!Number.isInteger(m.access_token_lifetime_s) || m.access_token_lifetime_s <= 0) stop("manifest", "access_token_lifetime_s no es un número de segundos (el valor del panel de Auth)");

  const perPerson = (field, check) => {
    const list = m[field];
    if (!Array.isArray(list)) stop("manifest", `falta ${field}[]`);
    for (const id of m.users) {
      const rows = list.filter((row) => row?.user_id === id);
      if (rows.length === 0) stop("manifest", `falta ${field} de la persona ${m.users.indexOf(id) + 1}`);
      if (rows.length > 1) stop("manifest", `${field} repite a la persona ${m.users.indexOf(id) + 1}`);
      check(rows[0], m.users.indexOf(id) + 1);
    }
    if (list.length !== m.users.length) stop("manifest", `${field} tiene entradas de personas fuera del alcance`);
    return list;
  };
  const approvals = perPerson("approvals", (row, n) => {
    if (!isDate(row.approved_at)) stop("manifest", `approvals de la persona ${n}: falta approved_at`);
    if (typeof row.channel !== "string" || !row.channel.trim()) stop("manifest", `approvals de la persona ${n}: falta channel`);
    if (!SHA256.test(row.text_sha256 ?? "")) stop("manifest", `approvals de la persona ${n}: text_sha256 no es una SHA-256`);
  });
  if (m.users.length === 2 && approvals[0].text_sha256 === approvals[1].text_sha256) stop("manifest", "las dos aprobaciones tienen la misma huella");
  perPerson("exports", (row, n) => {
    if (!isDate(row.exported_at)) stop("manifest", `exports de la persona ${n}: falta exported_at`);
    if (!SHA256.test(row.file_sha256 ?? "")) stop("manifest", `exports de la persona ${n}: file_sha256 no es una SHA-256`);
    if (!Number.isInteger(row.size_bytes) || row.size_bytes <= 0) stop("manifest", `exports de la persona ${n}: size_bytes no es un tamaño`);
  });
  // F85-12: cada persona confirmó por su propio canal, repitiendo request_id, alcance y la huella de SU aprobación.
  const expectedScope = { kind: m.users.length === 2 ? "couple" : "self", users: m.users.map(shortHash).sort() };
  const confirmations = perPerson("confirmations", (row, n) => {
    const approval = approvals.find((a) => a.user_id === row.user_id);
    if (typeof row.channel !== "string" || !row.channel.trim()) stop("manifest", `confirmations de la persona ${n}: falta channel`);
    if (typeof row.message_ref !== "string" || !row.message_ref.trim()) stop("manifest", `confirmations de la persona ${n}: falta message_ref`);
    if (!isDate(row.received_at)) stop("manifest", `confirmations de la persona ${n}: falta received_at`);
    if (Date.parse(row.received_at) < Date.parse(approval.approved_at)) stop("manifest", `confirmations de la persona ${n}: es anterior a su aprobación`);
    if (!SHA256.test(row.message_sha256 ?? "")) stop("manifest", `confirmations de la persona ${n}: message_sha256 no es una SHA-256`);
    if (row.request_id !== m.request_id) stop("manifest", `confirmations de la persona ${n}: repite otro request_id`);
    const scope = row.scope ?? {};
    const users = Array.isArray(scope.users) ? [...scope.users].sort() : [];
    if (scope.kind !== expectedScope.kind || JSON.stringify(users) !== JSON.stringify(expectedScope.users)) stop("manifest", `confirmations de la persona ${n}: repite otro alcance`);
    if (row.approval_sha256 !== approval.text_sha256) stop("manifest", `confirmations de la persona ${n}: no repite la huella de su aprobación`);
  });
  if (m.users.length === 2 && confirmations[0].channel.trim() === confirmations[1].channel.trim()) stop("manifest", "las dos confirmaciones llegan por el mismo canal");
  if (m.target === "production") {
    if (typeof m.backup?.name !== "string" || !SHA256.test(m.backup?.manifest_sha256 ?? "")) stop("manifest", "en producción, backup lleva el nombre de la copia del día y la huella de su manifiesto");
  } else if (m.backup !== null) stop("manifest", "en juntia-dev, backup es null");
  return m;
}

/**
 * F87-2 (revisión del PR #87): huella SHA-256 de la representación canónica (claves ordenadas) del manifiesto COMPLETO. No
 * hay campos operativos excluidos: cualquier cambio del manifiesto después del plan hace rechazar --resume y --abort.
 */
export function manifestHash(manifest) {
  const canonical = (value) => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
  return createHash("sha256").update(JSON.stringify(canonical(manifest))).digest("hex");
}
/** F87-10: los identificadores del alcance como lista plana `tabla/clave`. */
const flatIds = (ids) => Object.entries(ids ?? {}).flatMap(([table, list]) => list.map((key) => `${table}/${key}`));

/** Escritura atómica del estado: temporal y renombrado (F85-10). */
function writeState(path, state) {
  const temp = `${path}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
  writeFileSync(temp, JSON.stringify(state, null, 2) + "\n");
  renameSync(temp, path);
}
export const statePathFor = (manifestPath) => join(dirname(manifestPath), basename(manifestPath).replace(/\.json$/, "") + ".state.json");

/** Cliente de base por psql (`-qAt`, `ON_ERROR_STOP`), con el entorno de libpq que le da el llamador. */
export function psqlDatabase({ env, psql = "psql" }) {
  const run = (args, input) => {
    const result = spawnSync(psql, ["-X", "-v", "ON_ERROR_STOP=1", "-qAt", ...args], { env, encoding: "utf8", input });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      const message = (result.stderr || "").split("\n").find((line) => /ERROR/.test(line)) ?? `psql terminó con ${result.status}`;
      throw new DeletionError("db", message.replace(/^.*ERROR:\s*/, "").trim());
    }
    return result.stdout;
  };
  return {
    query: (sql) => run(["-f", "-"], sql).trim(),
    /** Ejecuta archivos en UNA transacción (`-1`) con variables de psql. */
    files: (files, vars) => run(["-1", ...Object.entries(vars).flatMap(([name, value]) => ["-v", `${name}=${value}`]), ...files.flatMap((file) => ["-f", file])]),
  };
}

/**
 * Cliente de Auth real: la API de administración para leer, bloquear y borrar; el cierre de sesiones borra las filas de
 * `auth.sessions` y `auth.refresh_tokens` de la persona como dueño, porque la API de administración solo cierra sesiones
 * con el JWT de la propia persona. Lo que ya se emitió (un token de acceso) se cubre con la espera de su vida (§4.1).
 */
export function supabaseAuth({ admin, db }) {
  return {
    async getUser(id) {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error?.status === 404 || (!error && !data?.user)) return { exists: false };
      if (error) throw new DeletionError("auth", `getUserById: ${error.status ?? ""} ${error.code ?? ""}`.trim());
      return { exists: true, bannedUntil: data.user.banned_until ?? null };
    },
    async ban(id, duration) {
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: duration });
      if (error) throw new DeletionError("auth", `updateUserById(ban_duration): ${error.status ?? ""} ${error.code ?? ""}`.trim());
    },
    async revokeSessions(id) {
      if (!UUID.test(id)) stop("auth", "UUID inválido");
      db.query(`begin; delete from auth.refresh_tokens where user_id='${id}'; delete from auth.sessions where user_id='${id}'; commit;`);
    },
    async deleteUser(id) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error && error.status !== 404) throw new DeletionError("auth", `deleteUser: ${error.status ?? ""} ${error.code ?? ""}`.trim());
    },
  };
}

const usersArray = (ids) => `{${ids.join(",")}}`;
const parseCounts = (output, label) => {
  const line = output.split("\n").find((row) => row.startsWith(`${label} `));
  return line ? JSON.parse(line.slice(label.length + 1)) : null;
};

/** Hechos de la base que el manifiesto no puede afirmar por sí solo (§3): existencia, pareja activa y miembros. */
function databaseFacts(db, m) {
  const ids = m.users.map((id) => `'${id}'::uuid`).join(",");
  const raw = db.query(`select jsonb_build_object(
    'auth',(select count(*) from auth.users where id in(${ids})),
    'profiles',(select count(*) from juntia_data.profiles where user_id in(${ids})),
    'active_groups',(select coalesce(jsonb_agg(distinct m.group_id),'[]') from juntia_data.group_members m join juntia_data.groups g on g.id=m.group_id
      where m.user_id in(${ids}) and m.status='active' and g.status='active'),
    'members',${m.group_id ? `(select coalesce(jsonb_agg(user_id order by user_id),'[]') from juntia_data.group_members where group_id='${m.group_id}' and status='active')` : "'[]'::jsonb"},
    'emails',(select coalesce(jsonb_agg(encode(sha256(convert_to(lower(email),'UTF8')),'hex')),'[]') from auth.users where id in(${ids})))::text`);
  return JSON.parse(raw);
}

function checkFacts(facts, m) {
  if (facts.auth !== m.users.length) stop("manifest", "una persona de users no existe en auth.users");
  if (facts.profiles !== m.users.length) stop("manifest", "una persona de users no tiene perfil");
  if (m.users.length === 2) {
    if (JSON.stringify(facts.members) !== JSON.stringify([...m.users].sort())) stop("manifest", "los UUID de users no son exactamente los dos miembros activos de group_id");
  } else if (facts.active_groups.length) stop("manifest", "la persona tiene pareja activa: el caso es el de la pareja completa, con las dos aprobaciones");
}

/**
 * El procedimiento en fases (§4). `mode`: "run" (manifiesto nuevo), "resume" o "abort". Dependencias inyectadas:
 * `auth` (getUser, ban, revokeSessions, deleteUser), `db` (query, files), `clock` (now() en ms), `sleep(ms)`,
 * `target` (el destino comprobado por el guardia) y `extraSqlFiles` (solo pruebas: archivos que corren DENTRO de la
 * transacción de la fase 1, después del borrado).
 * @param {{ manifestPath: string, mode?: "run" | "resume" | "abort", auth: ReturnType<typeof supabaseAuth>,
 *   db: ReturnType<typeof psqlDatabase>, clock?: { now: () => number }, sleep?: (ms: number) => Promise<unknown>,
 *   target: string, extraSqlFiles?: string[], log?: (line: string) => void }} options
 */
export async function runDeletion({ manifestPath, mode = "run", auth, db, clock = { now: () => Date.now() }, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), target, extraSqlFiles = [], log = () => {} }) {
  const manifest = validateManifest(JSON.parse(readFileSync(manifestPath, "utf8")), { target });
  const statePath = statePathFor(manifestPath);
  const iso = () => new Date(clock.now()).toISOString();
  let state;

  if (mode === "run") {
    if (existsSync(statePath)) stop("state", "ya existe un estado para este request_id: usa --resume o --abort");
    const facts = databaseFacts(db, manifest);
    checkFacts(facts, manifest);
    // Cierre del alcance y recuento de referencia, de solo lectura, antes de escribir nada (§3).
    const closure = db.files([join(HERE, "closure.sql")], { users: usersArray(manifest.users), group_id: manifest.group_id ?? "" });
    const counts = parseCounts(closure, "COUNTS");
    // F87-10: los identificadores del alcance por tabla, para saber después si una fase 1 interrumpida se confirmó.
    const ids = parseCounts(closure, "IDS");
    state = {
      request_id: manifest.request_id, manifest_sha256: manifestHash(manifest), phase: "planned", history: [{ phase: "planned", at: iso() }],
      people: manifest.users.map((uuid) => ({ uuid, ban: "pending", banned_until: null, sessions_revoked: false, ban_checked_at: null })),
      email_sha256: facts.emails, counts_at_plan: counts, ids_at_plan: ids, tokens_wait_until: null, auth_deleted: [], counts_before: null, counts_after: null,
    };
    writeState(statePath, state);
  } else {
    if (!existsSync(statePath)) stop("state", "no hay estado para este request_id");
    state = JSON.parse(readFileSync(statePath, "utf8"));
    if (state.request_id !== manifest.request_id) stop("state", "el estado es de otro request_id");
    // F87-2: con el mismo request_id, otro alcance no se ejecuta nunca. Antes de tocar Auth o la base.
    if (state.manifest_sha256 !== manifestHash(manifest)) stop("state", "el manifiesto cambió desde el plan (su huella no coincide con la del estado): hace falta una petición nueva");
  }
  const save = () => writeState(statePath, state);
  const enter = (phase) => { state.phase = phase; state.history.push({ phase, at: iso() }); save(); log(`fase: ${phase}`); };

  if (mode === "abort") {
    if (state.phase === "aborted") return state;
    // F87-8 (revisión del PR #87): una operación que empezó a borrar ya no se cancela. Con `phase1_started`, la transacción
    // pudo confirmarse; levantar los bloqueos dejaría cuentas sin datos desbloqueadas. Solo --resume.
    if (state.phase1_started) stop("abort", "la fase 1 ya empezó (puede haberse confirmado): --abort no se acepta; la única salida es --resume");
    if (state.phase === "indeterminate") stop("abort", "estado indeterminate: lo concilia el gestor; --abort no se acepta");
    if (!["planned", "locked"].includes(state.phase)) stop("abort", `--abort solo desde planned o locked; el estado está en ${state.phase}: la única salida es --resume hasta verified`);
    for (const person of state.people) {
      if (person.ban === "lifted") continue;
      const user = await auth.getUser(person.uuid);
      if (user.exists && user.bannedUntil && Date.parse(user.bannedUntil) > clock.now()) await auth.ban(person.uuid, "none");
      person.ban = "lifted"; person.banned_until = null; person.ban_checked_at = iso();
      save();
    }
    enter("aborted");
    return state;
  }
  if (state.phase === "aborted") stop("state", "la petición se abortó: hace falta una petición nueva, con su manifiesto y sus confirmaciones");
  if (state.phase === "verified") return state;
  if (state.phase === "indeterminate") stop("indeterminate", "el estado quedó indeterminate: el gestor concilia el alcance a mano; el procedimiento no sigue solo");

  /** Bloqueo y cierre de sesiones de una persona, guardando el estado tras cada llamada (§4.1). */
  const lock = async (person) => {
    if (person.ban !== "applied") {
      await auth.ban(person.uuid, `${BAN_HOURS}h`);
      const user = await auth.getUser(person.uuid);
      person.ban = "applied"; person.banned_until = user.bannedUntil ?? new Date(clock.now() + BAN_HOURS * 3600e3).toISOString(); person.ban_checked_at = iso();
      save();
    }
    if (!person.sessions_revoked) { await auth.revokeSessions(person.uuid); person.sessions_revoked = true; save(); }
  };
  /** Renovación al empezar cada fase y cada --resume (§4.1). */
  const renew = async () => {
    for (const person of state.people) {
      if (person.ban !== "applied" || state.auth_deleted.includes(person.uuid)) continue;
      const user = await auth.getUser(person.uuid);
      if (!user.exists) continue;
      const until = user.bannedUntil ? Date.parse(user.bannedUntil) : 0;
      person.ban_checked_at = iso();
      if (until <= clock.now()) {
        // Caducado: se vuelve a bloquear y a cerrar sesiones antes de seguir.
        person.ban = "pending"; person.sessions_revoked = false; save();
        await lock(person);
        if (["planned", "locked"].includes(state.phase)) {
          const now = parseCounts(db.files([join(HERE, "closure.sql")], { users: usersArray(manifest.users), group_id: manifest.group_id ?? "" }), "COUNTS");
          if (JSON.stringify(now) !== JSON.stringify(state.counts_at_plan)) stop("renew", "el bloqueo caducó y hay datos nuevos: se detiene antes de la fase 1");
        }
      } else if (until - clock.now() < RENEW_BELOW_MS) {
        await auth.ban(person.uuid, `${BAN_HOURS}h`);
        const after = await auth.getUser(person.uuid);
        person.banned_until = after.bannedUntil ?? new Date(clock.now() + BAN_HOURS * 3600e3).toISOString();
        save();
      } else save();
    }
  };

  if (mode === "resume") await renew();

  // Fase 0 · locked.
  if (state.phase === "planned") {
    for (const person of state.people) await lock(person);
    if (!state.tokens_wait_until) { state.tokens_wait_until = new Date(clock.now() + manifest.access_token_lifetime_s * 1000).toISOString(); save(); }
    const remaining = Date.parse(state.tokens_wait_until) - clock.now();
    if (remaining > 0) { log(`espera de la vida de los tokens de acceso: ${Math.ceil(remaining / 1000)} s`); await sleep(remaining); }
    enter("locked");
  }

  // Fase 1 · data_deleted.
  const scope = () => {
    const out = db.files([join(HERE, "closure.sql")], { users: usersArray(manifest.users), group_id: manifest.group_id ?? "" });
    return { counts: parseCounts(out, "COUNTS"), ids: parseCounts(out, "IDS") };
  };
  if (state.phase === "locked" && state.phase1_started) {
    // F87-5 y F87-10: la fase 1 empezó y el estado no llegó a guardar su resultado. Se decide por IDENTIFICADORES:
    // - en el alcance hay alguno que no estaba en el plan → «indeterminate»: se detiene y lo concilia el gestor;
    // - ninguno de los planeados existe y el alcance está vacío → la transacción se confirmó: recuperado, con los recuentos
    //   del plan, sin repetir el SQL;
    // - queda alguno de los planeados → no se confirmó: la fase 1 vuelve a correr con normalidad (y su comprobación exige
    //   que los identificadores sean exactamente los del plan).
    const now = scope();
    const planned = new Set(flatIds(state.ids_at_plan));
    const current = flatIds(now.ids);
    const unplanned = current.filter((key) => !planned.has(key));
    if (unplanned.length) {
      state.indeterminate = { at: iso(), motivo: "el alcance tiene identificadores que no estaban en el plan", filas: unplanned.length };
      enter("indeterminate");
      stop("indeterminate", `${unplanned.length} identificador(es) del alcance no estaban en el plan: el gestor concilia antes de seguir`);
    }
    if (current.length === 0 && planned.size > 0) {
      state.counts_before = state.counts_at_plan;
      state.counts_after = now.counts;
      state.recovery = { at: iso(), motivo: "la fase 1 se confirmó antes de guardar el estado: ninguno de los identificadores del plan existe; recuentos previos del plan" };
      enter("data_deleted");
    }
  }
  if (state.phase === "locked") {
    await renew();
    // F87-2: las comprobaciones de pertenencia y de alcance se repiten justo antes de borrar.
    checkFacts(databaseFacts(db, manifest), manifest);
    const now = scope();
    if (JSON.stringify(now.counts) !== JSON.stringify(state.counts_at_plan)) stop("phase1", "el alcance cambió desde el plan (recuentos distintos): se detiene antes de la fase 1");
    // F87-10: además de los recuentos, los identificadores tienen que ser exactamente los del plan.
    if (JSON.stringify(now.ids) !== JSON.stringify(state.ids_at_plan)) stop("phase1", "el alcance cambió desde el plan (identificadores distintos): se detiene antes de la fase 1");
    // F87-5: «fase 1 en curso» queda en el estado ANTES de lanzar el SQL.
    state.phase1_started = iso(); save();
    const output = db.files([join(HERE, "delete-account.sql"), ...extraSqlFiles], { users: usersArray(manifest.users), group_id: manifest.group_id ?? "" });
    state.counts_before = parseCounts(output, "COUNTS_BEFORE");
    state.counts_after = parseCounts(output, "COUNTS_AFTER");
    enter("data_deleted");
  }

  // Fase 2 · auth_deleted.
  if (state.phase === "data_deleted") {
    await renew();
    for (const uuid of manifest.users) {
      if (state.auth_deleted.includes(uuid)) continue;
      const user = await auth.getUser(uuid);
      if (user.exists) await auth.deleteUser(uuid);
      state.auth_deleted.push(uuid);
      save();
    }
    enter("auth_deleted");
  }

  // Fase 3 · verified.
  if (state.phase === "auth_deleted") {
    for (const uuid of manifest.users) if ((await auth.getUser(uuid)).exists) stop("verify", `la persona ${manifest.users.indexOf(uuid) + 1} sigue en Auth`);
    const ids = manifest.users.map((id) => `'${id}'::uuid`).join(",");
    const left = JSON.parse(db.query(`select jsonb_build_object(
      'rows',(select count(*) from (
        select 1 from juntia_data.profiles where user_id in(${ids})
        union all select 1 from juntia_data.transactions where created_by in(${ids}) or owner_user_id in(${ids}) or payer_user_id in(${ids}) or updated_by in(${ids}) or voided_by in(${ids})
        union all select 1 from juntia_data.transaction_allocations where user_id in(${ids})
        union all select 1 from juntia_data.settlements where from_user_id in(${ids}) or to_user_id in(${ids}) or created_by in(${ids}) or voided_by in(${ids})
        union all select 1 from juntia_data.groups where owner_user_id in(${ids})
        union all select 1 from juntia_data.group_members where user_id in(${ids})
        union all select 1 from juntia_data.group_invitations where created_by in(${ids}) or accepted_by in(${ids})
        union all select 1 from juntia_data.budgets where owner_user_id in(${ids}) or created_by in(${ids}) or updated_by in(${ids})
        union all select 1 from juntia_data.budget_versions where changed_by in(${ids})
        union all select 1 from juntia_data.savings_goals where owner_user_id in(${ids}) or created_by in(${ids}) or updated_by in(${ids})
        union all select 1 from juntia_data.goal_ledger_entries where member_user_id in(${ids}) or created_by in(${ids})
        union all select 1 from juntia_data.goal_usage_allocations where member_user_id in(${ids})
        union all select 1 from juntia_data.goal_usage_confirmations where requested_by in(${ids}) or member_user_id in(${ids}) or resolved_by in(${ids})
        union all select 1 from juntia_data.idempotency_records where actor_user_id in(${ids})
        union all select 1 from juntia_data.audit_events where actor_user_id in(${ids})) r),
      'allowlist',(select count(*) from juntia_data.signup_allowlist where encode(sha256(convert_to(email,'UTF8')),'hex') = any(array[${(state.email_sha256 ?? []).map((h) => `'${h}'`).join(",") || "''"}])),
      'group',${manifest.group_id ? `(select count(*) from juntia_data.groups where id='${manifest.group_id}')` : "0"})::text`));
    if (left.rows || left.allowlist || left.group) stop("verify", `quedan filas: ${JSON.stringify(left)}`);
    enter("verified");
  }
  return state;
}

/** Salida para la evidencia (§3): request_id, huellas cortas, fechas, secuencia de estados y recuentos. Nada más. */
export function evidence(manifest, state) {
  return {
    request_id: manifest.request_id,
    users: manifest.users.map(shortHash),
    approvals: manifest.approvals.map((a) => ({ user: shortHash(a.user_id), approved_at: a.approved_at })),
    exports: manifest.exports.map((e) => ({ user: shortHash(e.user_id), exported_at: e.exported_at })),
    phases: state.history.map((h) => `${h.phase} ${h.at}`),
    counts_before: state.counts_before, counts_after: state.counts_after,
  };
}

/** Línea de órdenes: solo juntia-dev, con el guardia de destino y el bloqueo de un solo agente. */
async function main(argv) {
  const [first, second] = argv;
  const mode = first === "--resume" ? "resume" : first === "--abort" ? "abort" : "run";
  const manifestPath = resolve(mode === "run" ? first ?? "" : second ?? "");
  if (!manifestPath.endsWith(".json") || !existsSync(manifestPath)) throw new Error("Uso: node scripts/account-deletion/run.mjs [--resume|--abort] <ruta>/deletion-<id>.json");
  const { devTargetEnv } = await import("../dev-target/env.mjs");
  const { runInSession } = await import("../dev-target/session.mjs");
  const { cleanPgEnv } = await import("../dev-target/guard.mjs");
  const { createClient } = await import("@supabase/supabase-js");
  const root = resolve(HERE, "..", "..");
  if (resolve(manifestPath).startsWith(root)) throw new Error("El manifiesto vive fuera del repositorio (contrato §3)");
  const { target, commonDir, psqlBin, branch } = devTargetEnv(root);
  const db = psqlDatabase({ env: { ...cleanPgEnv(process.env, target.dbUrl), PGAPPNAME: "juntia-account-deletion" }, psql: psqlBin });
  const admin = createClient(target.apiUrl, target.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`Guardia de destino: juntia-dev · ${mode} · ${basename(manifestPath)}`);
  await runInSession({ lockDir: join(commonDir, "juntia-dev.lock"), branch, command: `account-deletion ${mode}` }, async () => {
    const state = await runDeletion({ manifestPath, mode, auth: supabaseAuth({ admin, db }), db, target: "juntia-dev", log: (line) => console.log(line) });
    console.log(JSON.stringify(evidence(JSON.parse(readFileSync(manifestPath, "utf8")), state), null, 2));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
