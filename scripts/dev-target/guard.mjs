// Maestro §15.10, decisión 18; ADR-011 §9.9: guardia de destino de los comandos `*:dev`. Funciones puras, sin red ni
// disco, para que la prueba de unidad (tests/dev-target-guard.test.ts) cubra cada rechazo. Los mensajes nombran
// variables, nunca valores: un error del guardia se puede pegar en un PR sin filtrar ninguna clave.

/** El único destino admitido: `juntia-dev`, desechable y sin datos reales. */
export const DEV_REF = "itfrhnadovezpahikuol";
/** Producción. Si aparece en cualquier variable, el guardia se niega aunque el resto apunte a dev. */
export const PROD_REF = "enwaxmwgldqohfawxhdm";

/** Nombres de `.env.test` (ver `.env.test.example`). Ninguno empieza por NEXT_PUBLIC_: la app nunca los lee. */
export const DEV_VARS = {
  url: "JUNTIA_DEV_SUPABASE_URL",
  publishableKey: "JUNTIA_DEV_PUBLISHABLE_KEY",
  secretKey: "JUNTIA_DEV_SECRET_KEY",
  dbUrl: "JUNTIA_DEV_DB_URL",
};

export class DevTargetError extends Error {
  constructor(message) {
    super(`Guardia de destino (decisión 18): ${message}. No se ha ejecutado nada contra ningún proyecto.`);
    this.name = "DevTargetError";
  }
}

const fail = (message) => { throw new DevTargetError(message); };

/** Payload de una clave JWT heredada (`eyJ…`), o null si la clave no es un JWT. Nunca se valida la firma: solo se lee el `ref`. */
function jwtPayload(value) {
  const parts = value.split(".");
  if (parts.length !== 3 || !value.startsWith("eyJ")) return null;
  try { return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")); } catch { return null; }
}

/** Ninguna variable puede mencionar producción, ni en claro ni dentro del payload de una clave JWT. */
export function assertNoProductionRef(env, source) {
  for (const [name, raw] of Object.entries(env)) {
    if (typeof raw !== "string" || !raw) continue;
    const payload = jwtPayload(raw.trim());
    const text = payload ? `${raw} ${JSON.stringify(payload)}` : raw;
    let decoded = text;
    try { decoded = decodeURIComponent(text); } catch { /* se compara el texto tal cual */ }
    if (`${text} ${decoded}`.toLowerCase().includes(PROD_REF)) fail(`la variable ${name} de ${source} contiene el ref de producción`);
  }
}

function assertKey(name, value, prefix, legacyRole) {
  if (value.startsWith(prefix)) return;
  const payload = jwtPayload(value);
  if (!payload) fail(`${name} no es una clave de Supabase (se espera ${prefix}… o una clave JWT heredada)`);
  if (payload.ref !== DEV_REF) fail(`${name} es una clave JWT de otro proyecto (su ref no es ${DEV_REF})`);
  if (payload.role !== legacyRole) fail(`${name} es una clave JWT con el rol equivocado (se espera ${legacyRole})`);
}

/** La URL de la API es exactamente la del proyecto de dev. */
function assertApiUrl(value) {
  let url;
  try { url = new URL(value); } catch { fail(`${DEV_VARS.url} no es una URL válida`); }
  if (url.protocol !== "https:") fail(`${DEV_VARS.url} debe usar https`);
  if (url.hostname !== `${DEV_REF}.supabase.co`) fail(`${DEV_VARS.url} no apunta a ${DEV_REF}.supabase.co`);
  if (url.pathname !== "/" || url.search || url.username || url.password) fail(`${DEV_VARS.url} debe ser solo el origen del proyecto, sin ruta ni credenciales`);
  return url.origin;
}

/**
 * La conexión es la directa (`db.<ref>.supabase.co`, usuario `postgres`) o el pooler de sesión
 * (`*.pooler.supabase.com:5432`, usuario `postgres.<ref>`). El pooler de transacción (6543) no sirve: pgTAP, los
 * bloqueos de las pruebas de integración y `supabase db reset` necesitan una sesión propia.
 */
function assertDbUrl(value) {
  let url;
  try { url = new URL(value); } catch { fail(`${DEV_VARS.dbUrl} no es una URL de conexión válida`); }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") fail(`${DEV_VARS.dbUrl} debe empezar por postgresql://`);
  if (!url.password) fail(`${DEV_VARS.dbUrl} no lleva contraseña`);
  const user = decodeURIComponent(url.username);
  const port = url.port || "5432";
  const direct = url.hostname === `db.${DEV_REF}.supabase.co`;
  const pooler = url.hostname.endsWith(".pooler.supabase.com");
  if (!direct && !pooler) fail(`${DEV_VARS.dbUrl} no es la conexión directa ni el pooler de ${DEV_REF}`);
  if (direct && user !== "postgres") fail(`${DEV_VARS.dbUrl}: la conexión directa usa el usuario postgres`);
  if (pooler && user !== `postgres.${DEV_REF}`) fail(`${DEV_VARS.dbUrl}: el usuario del pooler no es postgres.${DEV_REF}`);
  if (pooler && port === "6543") fail(`${DEV_VARS.dbUrl} usa el pooler de transacción (6543); usa el de sesión (5432)`);
  if (port !== "5432") fail(`${DEV_VARS.dbUrl} debe usar el puerto 5432`);
  if (url.pathname !== "/postgres") fail(`${DEV_VARS.dbUrl} debe apuntar a la base postgres`);
  return value;
}

/**
 * Valida `.env.test` (`fileEnv`) y el entorno del proceso (`processEnv`). Devuelve el destino normalizado o lanza
 * `DevTargetError`. `linkedRef` es el contenido de `supabase/.temp/project-ref` si existe: una carpeta enlazada a otro
 * proyecto es la señal de una sesión con producción a medias (quickstart §3 de la 002), y entonces no se sigue.
 * @param {{ fileEnv: Record<string, string | undefined>, processEnv?: Record<string, string | undefined>, linkedRef?: string | null }} options
 */
export function checkDevTarget({ fileEnv, processEnv = {}, linkedRef = null }) {
  assertNoProductionRef(fileEnv, ".env.test");
  assertNoProductionRef(processEnv, "el entorno del proceso");
  if (linkedRef !== null && linkedRef.trim() !== DEV_REF) fail(`supabase/.temp/project-ref no es ${DEV_REF}; desenlaza y vuelve a enlazar juntia-dev (quickstart §3 de la 002)`);
  const missing = Object.values(DEV_VARS).filter((name) => !fileEnv[name]?.trim());
  if (missing.length) fail(`faltan en .env.test: ${missing.join(", ")}`);
  const value = (name) => fileEnv[name].trim();
  const apiUrl = assertApiUrl(value(DEV_VARS.url));
  assertKey(DEV_VARS.publishableKey, value(DEV_VARS.publishableKey), "sb_publishable_", "anon");
  assertKey(DEV_VARS.secretKey, value(DEV_VARS.secretKey), "sb_secret_", "service_role");
  if (value(DEV_VARS.secretKey) === value(DEV_VARS.publishableKey)) fail(`${DEV_VARS.secretKey} y ${DEV_VARS.publishableKey} son la misma clave`);
  const dbUrl = assertDbUrl(value(DEV_VARS.dbUrl));
  return { ref: DEV_REF, apiUrl, publishableKey: value(DEV_VARS.publishableKey), secretKey: value(DEV_VARS.secretKey), dbUrl };
}

/**
 * Comprobación de las pruebas, dentro del proceso hijo: el runner ya mapeó `.env.test` a API_URL, PUBLISHABLE_KEY,
 * SECRET_KEY y DB_URL (los nombres del CI). Se repite el guardia sobre esos nombres antes de cada escritura.
 */
export function checkDevProcessEnv(env) {
  return checkDevTarget({
    fileEnv: { [DEV_VARS.url]: env.API_URL, [DEV_VARS.publishableKey]: env.PUBLISHABLE_KEY, [DEV_VARS.secretKey]: env.SECRET_KEY, [DEV_VARS.dbUrl]: env.DB_URL },
    processEnv: env,
  });
}
