// 005 · T028 (FR-043; decisión 18; N2, opción a). Crea en `juntia-dev` la cuenta de listas largas (la misma de
// tests/evidence/release-long-lists.capture.ts: scripts/dev-target/long-lists.mjs), para las capturas a 390 y 1440 de
// T054 con la app local contra juntia-dev. Pasa el guardia de destino ANTES de cualquier escritura y toma el bloqueo de un
// solo agente. Cuenta propia (`listas-largas@seed.test`) e idempotente: si ya existe, no duplica nada.
//
//   $env:JUNTIA_LONG_LISTS_PASSWORD = "…"   (solo al crearla la primera vez; nunca se imprime)
//   node scripts/dev-target/seed-long-lists.mjs
//
// La ejecuta el gestor en T054; este PR no la ejecuta contra juntia-dev.
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkDevTarget, cleanPgEnv } from "./guard.mjs";
import { longListsSql } from "./long-lists.mjs";

export const LONG_LISTS_EMAIL = "listas-largas@seed.test";
const todayInBogota = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

/**
 * El guardia va primero: con cualquier otro destino lanza `DevTargetError` y no llama a `deps`. `deps` crea los clientes
 * solo después (inyectable en la prueba).
 * @param {{ fileEnv: Record<string, string | undefined>, processEnv?: Record<string, string | undefined>, linkedRefs?: { where: string, ref: string }[],
 *   deps: (target: ReturnType<typeof checkDevTarget>) => { sql: (text: string) => string, admin: { createUser: (attrs: object) => Promise<{ id: string }>, findUser: (email: string) => Promise<string | null> } },
 *   password?: string, today?: string, log?: (line: string) => void }} options
 */
export async function seedLongLists({ fileEnv, processEnv = {}, linkedRefs = [], deps, password, today = todayInBogota(), log = () => {} }) {
  const target = checkDevTarget({ fileEnv, processEnv, linkedRefs });
  const { sql, admin } = deps(target);
  let userId = await admin.findUser(LONG_LISTS_EMAIL);
  if (!userId) {
    if (!password || password.length < 8) throw new Error("La cuenta no existe todavía: define JUNTIA_LONG_LISTS_PASSWORD (al menos 8 caracteres) para crearla");
    sql(`insert into juntia_data.signup_allowlist(email) values ('${LONG_LISTS_EMAIL}') on conflict do nothing`);
    userId = (await admin.createUser({ email: LONG_LISTS_EMAIL, password, email_confirm: true, user_metadata: { display_name: "Listas largas" } })).id;
    log("cuenta creada");
  } else log("la cuenta ya existía");
  sql(`insert into juntia_data.profiles(user_id,display_name,first_entry_completed_at) values ('${userId}','Listas largas',now()) on conflict (user_id) do nothing`);
  sql(longListsSql({ userId, today }));
  const counts = sql(`select (select count(*) from juntia_data.transactions where owner_user_id='${userId}' and status='active')||' movimientos, '||
    (select count(*) from juntia_data.goal_ledger_entries e join juntia_data.savings_goals g on g.id=e.goal_id where g.owner_user_id='${userId}' and e.kind='contribution')||' aportes, '||
    (select count(*) from juntia_data.budget_versions v join juntia_data.budgets b on b.id=v.budget_id where b.owner_user_id='${userId}')||' versiones de presupuesto'`);
  log(counts.trim());
  return { userId, counts: counts.trim() };
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const { devTargetEnv, loadEnvTest, linkedRefs } = await import("./env.mjs");
  const { runInSession } = await import("./session.mjs");
  const { createClient } = await import("@supabase/supabase-js");
  const { fileEnv, commonDir } = loadEnvTest(root);
  const { psqlBin, branch } = devTargetEnv(root);
  await runInSession({ lockDir: join(commonDir, "juntia-dev.lock"), branch, command: "seed-long-lists" }, async () => {
    await seedLongLists({
      fileEnv, processEnv: process.env, linkedRefs: linkedRefs(root, commonDir), password: process.env.JUNTIA_LONG_LISTS_PASSWORD, log: (line) => console.log(line),
      deps: (target) => {
        const env = { ...cleanPgEnv(process.env, target.dbUrl), PGAPPNAME: "juntia-seed-long-lists" };
        const sql = (text) => {
          const result = spawnSync(psqlBin, ["-X", "-v", "ON_ERROR_STOP=1", "-qAt", "-f", "-"], { input: text, env, encoding: "utf8" });
          if (result.status !== 0) throw new Error(`psql falló: ${(result.stderr || "").split("\n").find((line) => /ERROR/.test(line)) ?? result.status}`);
          return result.stdout;
        };
        const client = createClient(target.apiUrl, target.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
        return { sql, admin: {
          findUser: async (email) => sql(`select id from auth.users where email='${email}'`).trim() || null,
          createUser: async (attrs) => { const { data, error } = await client.auth.admin.createUser(attrs); if (error || !data.user) throw new Error(`createUser: ${error?.status ?? ""}`); return { id: data.user.id }; },
        } };
      },
    });
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
