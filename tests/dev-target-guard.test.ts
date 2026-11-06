// @vitest-environment node
// Maestro §15.10, decisión 18; ADR-011 §9.9: «antes de cada escritura un guardia comprueba que el destino es
// itfrhnadovezpahikuol» y se niega con cualquier otro, y con el ref de producción en cualquier variable. Valores
// sintéticos: ninguna clave real aparece en esta prueba.
import { describe, expect, it } from "vitest";
import { checkDevProcessEnv, checkDevTarget, cleanPgEnv, dbUrlWithoutPassword, DEV_REF, PROD_REF } from "../scripts/dev-target/guard.mjs";

const jwt = (payload: object) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.firma`;
const valid = {
  JUNTIA_DEV_SUPABASE_URL: `https://${DEV_REF}.supabase.co`,
  JUNTIA_DEV_PUBLISHABLE_KEY: "sb_publishable_sintetica",
  JUNTIA_DEV_SECRET_KEY: "sb_secret_sintetica",
  JUNTIA_DEV_DB_URL: `postgresql://postgres.${DEV_REF}:clave%40sintetica@aws-1-us-east-1.pooler.supabase.com:5432/postgres`,
};
const refuse = (fileEnv: Record<string, string>, processEnv: Record<string, string> = {}, linkedRefs: { where: string; ref: string }[] = []) =>
  () => checkDevTarget({ fileEnv, processEnv, linkedRefs });
const POOLER = "aws-1-us-east-1.pooler.supabase.com";

describe("guardia de destino de los comandos *:dev", () => {
  it("acepta juntia-dev por el pooler de sesión y por la conexión directa", () => {
    expect(checkDevTarget({ fileEnv: valid }).ref).toBe(DEV_REF);
    expect(checkDevTarget({ fileEnv: valid }).apiUrl).toBe(`https://${DEV_REF}.supabase.co`);
    const direct = { ...valid, JUNTIA_DEV_DB_URL: `postgresql://postgres:clave@db.${DEV_REF}.supabase.co:5432/postgres` };
    expect(checkDevTarget({ fileEnv: direct, linkedRefs: [{ where: "el worktree", ref: `${DEV_REF}\n` }, { where: "el checkout principal", ref: DEV_REF }] }).dbUrl).toBe(direct.JUNTIA_DEV_DB_URL);
  });

  it("acepta las claves JWT heredadas solo si su ref es dev y su rol es el esperado", () => {
    const legacy = { ...valid, JUNTIA_DEV_PUBLISHABLE_KEY: jwt({ ref: DEV_REF, role: "anon" }), JUNTIA_DEV_SECRET_KEY: jwt({ ref: DEV_REF, role: "service_role" }) };
    expect(checkDevTarget({ fileEnv: legacy }).ref).toBe(DEV_REF);
    expect(refuse({ ...valid, JUNTIA_DEV_SECRET_KEY: jwt({ ref: "otroproyectoxxxxxxxx", role: "service_role" }) })).toThrow(/JUNTIA_DEV_SECRET_KEY es una clave JWT de otro proyecto/);
    expect(refuse({ ...valid, JUNTIA_DEV_SECRET_KEY: jwt({ ref: DEV_REF, role: "anon" }) })).toThrow(/rol equivocado/);
  });

  it.each([
    ["URL de producción", { JUNTIA_DEV_SUPABASE_URL: `https://${PROD_REF}.supabase.co` }, /JUNTIA_DEV_SUPABASE_URL de \.env\.test contiene el ref de producción/],
    ["conexión de producción", { JUNTIA_DEV_DB_URL: `postgresql://postgres.${PROD_REF}:x@aws-0-sa-east-1.pooler.supabase.com:5432/postgres` }, /JUNTIA_DEV_DB_URL de \.env\.test contiene el ref de producción/],
    ["clave JWT de producción", { JUNTIA_DEV_SECRET_KEY: jwt({ ref: PROD_REF, role: "service_role" }) }, /JUNTIA_DEV_SECRET_KEY de \.env\.test contiene el ref de producción/],
    ["ref de producción en una variable cualquiera", { OTRA_COSA: `algo-${PROD_REF.toUpperCase()}` }, /OTRA_COSA de \.env\.test contiene el ref de producción/],
    ["otro proyecto", { JUNTIA_DEV_SUPABASE_URL: "https://otroproyectoxxxxxxxx.supabase.co" }, /no apunta a itfrhnadovezpahikuol/],
    ["un host que solo empieza por el ref", { JUNTIA_DEV_SUPABASE_URL: `https://${DEV_REF}.supabase.co.ejemplo.test` }, /no apunta a/],
    ["http", { JUNTIA_DEV_SUPABASE_URL: `http://${DEV_REF}.supabase.co` }, /https/],
    ["Supabase local", { JUNTIA_DEV_SUPABASE_URL: "http://127.0.0.1:54321" }, /https/],
    ["conexión de otro proyecto", { JUNTIA_DEV_DB_URL: "postgresql://postgres:x@db.otroproyectoxxxxxxxx.supabase.co:5432/postgres" }, /no es la conexión directa ni el pooler/],
    ["pooler de otro proyecto", { JUNTIA_DEV_DB_URL: "postgresql://postgres.otroproyectoxxxxxxxx:x@aws-1-us-east-1.pooler.supabase.com:5432/postgres" }, /usuario del pooler/],
    ["pooler de transacción", { JUNTIA_DEV_DB_URL: `postgresql://postgres.${DEV_REF}:x@aws-1-us-east-1.pooler.supabase.com:6543/postgres` }, /pooler de transacción/],
    ["base local", { JUNTIA_DEV_DB_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" }, /no es la conexión directa ni el pooler/],
    ["clave que no es de Supabase", { JUNTIA_DEV_SECRET_KEY: "cualquier-cosa" }, /no es una clave de Supabase/],
    ["la publicable en lugar de la secreta", { JUNTIA_DEV_SECRET_KEY: "sb_publishable_sintetica" }, /JUNTIA_DEV_SECRET_KEY no es una clave de Supabase/],
    ["una variable vacía", { JUNTIA_DEV_SECRET_KEY: "" }, /faltan en \.env\.test: JUNTIA_DEV_SECRET_KEY/],
  ])("se niega con %s", (_, change, message) => {
    expect(refuse({ ...valid, ...change })).toThrow(message);
  });

  // F48-1: libpq deja que los parámetros de la URI y las variables PG* anulen la cabecera de la URL.
  it.each([
    ["?host=", `postgresql://postgres.${DEV_REF}:x@${POOLER}:5432/postgres?host=db.${PROD_REF.slice(0, 4)}x.supabase.co`],
    ["?hostaddr=", `postgresql://postgres.${DEV_REF}:x@${POOLER}:5432/postgres?hostaddr=10.0.0.1`],
    ["?user=", `postgresql://postgres.${DEV_REF}:x@${POOLER}:5432/postgres?user=postgres.otroproyectoxxxxxxxx`],
    ["?port=", `postgresql://postgres.${DEV_REF}:x@${POOLER}:5432/postgres?port=6543`],
    ["?service=", `postgresql://postgres.${DEV_REF}:x@${POOLER}:5432/postgres?service=produccion`],
    ["un fragmento", `postgresql://postgres.${DEV_REF}:x@${POOLER}:5432/postgres#otra`],
    ["varios hosts", `postgresql://postgres.${DEV_REF}:x@${POOLER}:5432,db.otroproyectoxxxxxxxx.supabase.co:5432/postgres`],
  ])("se niega con una conexión que cambia de destino por %s", (_, url) => {
    expect(refuse({ ...valid, JUNTIA_DEV_DB_URL: url })).toThrow(/JUNTIA_DEV_DB_URL debe ser exactamente/);
  });

  it("el entorno de psql y de la CLI quita todas las PG* heredadas y solo pone las de la URL validada", () => {
    const inherited = { PATH: "/bin", PGHOSTADDR: "10.0.0.1", PGSERVICE: "produccion", PGSERVICEFILE: "/tmp/s", PGPASSFILE: "/tmp/p", PGSSLMODE: "disable", PGOPTIONS: "-c role=otro", PGHOST: "otro", PGUSER: "otro", pgport: "6543", PG: "no-es-de-libpq" };
    const env = cleanPgEnv(inherited, valid.JUNTIA_DEV_DB_URL);
    expect(Object.keys(env).filter((name) => /^PG/i.test(name)).sort()).toEqual(["PG", "PGDATABASE", "PGHOST", "PGPASSWORD", "PGPORT", "PGSSLMODE", "PGUSER"]);
    expect(env).toMatchObject({ PATH: "/bin", PGHOST: POOLER, PGPORT: "5432", PGUSER: `postgres.${DEV_REF}`, PGPASSWORD: "clave@sintetica", PGDATABASE: "postgres", PGSSLMODE: "require" });
  });

  it("la URL para argv no lleva la contraseña", () => {
    const bare = dbUrlWithoutPassword(valid.JUNTIA_DEV_DB_URL);
    expect(bare).toBe(`postgresql://postgres.${DEV_REF}@${POOLER}:5432/postgres`);
    expect(bare).not.toContain("sintetica");
  });

  it("se niega si el entorno del proceso o el enlace de la CLI apuntan a otro proyecto", () => {
    expect(refuse(valid, { NEXT_PUBLIC_SUPABASE_URL: `https://${PROD_REF}.supabase.co` })).toThrow(/NEXT_PUBLIC_SUPABASE_URL de el entorno del proceso contiene el ref de producción/);
    // F48-5: el project-ref del worktree y el del checkout principal, cada uno por separado.
    expect(refuse(valid, {}, [{ where: "el worktree", ref: DEV_REF }, { where: "el checkout principal", ref: PROD_REF }])).toThrow(/project-ref de el checkout principal no es itfrhnadovezpahikuol/);
    expect(refuse(valid, {}, [{ where: "el worktree", ref: "otroproyectoxxxxxxxx" }, { where: "el checkout principal", ref: DEV_REF }])).toThrow(/project-ref de el worktree no es/);
  });

  it("nunca incluye un valor en el mensaje de error", () => {
    const secret = "sb_secret_no-debe-aparecer";
    let message = "";
    try { checkDevTarget({ fileEnv: { ...valid, JUNTIA_DEV_SECRET_KEY: secret, JUNTIA_DEV_SUPABASE_URL: "https://otroproyectoxxxxxxxx.supabase.co" } }); } catch (error) { message = (error as Error).message; }
    expect(message).toMatch(/Guardia de destino/);
    expect(message).not.toContain(secret);
    expect(message).not.toContain("otroproyecto");
  });

  it("repite la comprobación dentro de las pruebas con los nombres del CI", () => {
    const env = { API_URL: valid.JUNTIA_DEV_SUPABASE_URL, PUBLISHABLE_KEY: valid.JUNTIA_DEV_PUBLISHABLE_KEY, SECRET_KEY: valid.JUNTIA_DEV_SECRET_KEY, DB_URL: valid.JUNTIA_DEV_DB_URL };
    expect(checkDevProcessEnv(env).ref).toBe(DEV_REF);
    expect(() => checkDevProcessEnv({ ...env, API_URL: "http://127.0.0.1:54321" })).toThrow(/https/);
  });
});
