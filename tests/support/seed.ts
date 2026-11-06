// T049 / FR-064; ADR-011 §6, reglas 1 y 2; research R8.11. Siembra por base de datos, por worker y por rol: un usuario
// confirmado con la API de administración del Supabase DEL RUNNER, la sesión creada por @supabase/ssr sobre un almacén de
// cookies en memoria (el formato de la cookie lo escribe la librería, no un test) y un `storageState` por worker y rol.
// Solo en el runner: se niega a correr si la URL de Supabase no es local. La clave secreta solo existe aquí y en el
// runner (FR-011); ningún camino de la app la usa.
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { saraPrivateOctober2026 } from "../../src/domain/golden/october-2026";
import { moneyFromPesos } from "../../src/domain/money";
import { shiftMonth, todayInBogota } from "../../src/domain/transactions";
import { createTransaction } from "../../src/lib/db/transactions";

export type Role = "sara" | "tomas" | (string & {});
export type StorageCookie = { name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Lax" };
export type SeededUser = { id: string; email: string; password: string; displayName: string; cookies: StorageCookie[]; client: SupabaseClient };

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

/** URL y claves del Supabase del runner. Falla si apuntan a cualquier otro sitio (juntia-dev o producción). */
export function runnerSupabase() {
  const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publishableKey = process.env.PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const secretKey = process.env.SECRET_KEY ?? "";
  let host = "";
  try { host = new URL(url).hostname; } catch { /* vacío o no válido */ }
  if (!LOCAL_HOSTS.has(host)) throw new Error("La siembra solo corre contra el Supabase local del runner (ADR-011 §9.6)");
  if (!publishableKey || !secretKey) throw new Error("Faltan las claves del Supabase del runner");
  return { url, publishableKey, secretKey };
}

const adminClient = () => {
  const { url, secretKey } = runnerSupabase();
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
};

/** Cliente de servidor de @supabase/ssr sobre un almacén de cookies en memoria. */
export function cookieJarClient() {
  const { url, publishableKey } = runnerSupabase();
  const jar = new Map<string, { value: string; maxAge?: number }>();
  const client = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, { value }]) => ({ name, value })),
      setAll: (values) => values.forEach(({ name, value, options }) => {
        if (!value || options?.maxAge === 0) jar.delete(name);
        else jar.set(name, { value, maxAge: options?.maxAge });
      }),
    },
  });
  return { client: client as unknown as SupabaseClient, jar };
}

type SeedOptions = { role: Role; index: number; displayName?: string; firstEntryCompleted?: boolean };

/** Crea un usuario confirmado y entra con su contraseña. Correo único `*@seed.test` por worker, rol y llamada. */
export async function seedUser({ role, index, displayName = "Sara", firstEntryCompleted = true }: SeedOptions): Promise<SeededUser> {
  const email = `${role}-${index}-${randomUUID().slice(0, 8)}@seed.test`;
  const password = `Seed-${randomUUID()}`;
  const created = await adminClient().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName } });
  if (created.error || !created.data.user) throw new Error("No se pudo crear el usuario sembrado");
  const { client, jar } = cookieJarClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw new Error("No se pudo entrar con el usuario sembrado");
  // El mismo camino que la acción de entrar: perfil con el nombre de A2 y, si se pide, A6 completada.
  if ((await client.rpc("ensure_profile")).error) throw new Error("ensure_profile falló en la siembra");
  if (firstEntryCompleted && (await client.rpc("complete_first_entry")).error) throw new Error("complete_first_entry falló en la siembra");
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const cookies = [...jar].map(([name, { value }]) => ({ name, value, domain: "localhost", path: "/", expires, httpOnly: false, secure: false, sameSite: "Lax" as const }));
  return { id: created.data.user.id, email, password, displayName, cookies, client };
}

/** `playwright/.auth/<parallelIndex>-<rol>.json`: un archivo por worker y rol, nunca compartido. */
export async function writeStorageState(user: SeededUser, index: number, role: Role) {
  const path = `playwright/.auth/${index}-${role}.json`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify({ cookies: user.cookies, origins: [] }, null, 2));
  return path;
}

/**
 * Dataset dorado de octubre de 2026 (spec, «Dataset dorado de P0-1») para la Sara de un worker, creado por la función
 * real `create_transaction` con su sesión: la siembra pasa por la autorización (R8.11). Aislado por worker porque cada
 * worker tiene su propia Sara. Lo usan Inicio, Actividad y Exportar en el PR C y la spec E2E 2.
 */
export async function seedGoldenMovements(user: SeededUser) {
  return (await seedMovements(user, "golden")).length;
}

/** Mes futuro del fixture `future` (Q13): tres meses después del mes en curso en Bogotá. */
export const futureMonth = () => shiftMonth(todayInBogota().slice(0, 7), 3);

/**
 * Siembra por la función real (PR C, T071). `golden`: el dataset literal. `current`: las mismas filas e importes en el
 * mismo día del mes en curso, para Inicio, que enseña el mes en curso. `future`: el dataset y un movimiento de prueba en
 * el mes futuro. Devuelve los movimientos creados, en el orden del dataset.
 */
export async function seedMovements(user: SeededUser, data: "golden" | "current" | "future") {
  const month = todayInBogota().slice(0, 7);
  const rows = saraPrivateOctober2026.map((row) => ({ ...row, transactionDate: data === "current" ? `${month}-${row.transactionDate.slice(8)}` : row.transactionDate }));
  const extra = data === "future" ? [{ type: "expense" as const, amount: moneyFromPesos(38000n), categoryId: "transport" as const, transactionDate: `${futureMonth()}-14`, description: "Tiquete de bus" }] : [];
  const created = [];
  // Por src/lib/db (la misma capa que usará Anotar) y no por SQL directo.
  for (const { type, amount, categoryId, transactionDate, description } of [...rows, ...extra]) {
    created.push(await createTransaction(user.client, { idempotencyKey: randomUUID(), type, amount, categoryId, transactionDate, description }));
  }
  return created;
}

/** Cuenta sin verificar (A1c): existe y tiene contraseña, pero su correo no está confirmado. */
export async function seedUnconfirmedUser(index: number) {
  const email = `sin-verificar-${index}-${randomUUID().slice(0, 8)}@seed.test`;
  const password = `Seed-${randomUUID()}`;
  const created = await adminClient().auth.admin.createUser({ email, password, email_confirm: false, user_metadata: { display_name: "Sin verificar" } });
  if (created.error) throw new Error("No se pudo crear la cuenta sin verificar");
  return { email, password };
}

/** Enlace de recuperación sin correo (A5 para axe): la API de administración genera el token del runner. */
export async function recoveryLink(email: string, baseURL: string) {
  const { data, error } = await adminClient().auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) throw new Error("No se pudo generar el enlace de recuperación");
  return `${baseURL}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery`;
}
