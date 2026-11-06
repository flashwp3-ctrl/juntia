// T049 / FR-064; ADR-011 §6, reglas 1 y 2; research R8.11. Siembra por base de datos, por worker y por rol: un usuario
// confirmado con la API de administración del Supabase DEL RUNNER, la sesión creada por @supabase/ssr sobre un almacén de
// cookies en memoria (el formato de la cookie lo escribe la librería, no un test) y un `storageState` por worker y rol.
// Solo en el runner o, con `npm run e2e:dev`, en juntia-dev tras el guardia de destino (decisión 18). La clave secreta
// solo existe aquí, en el runner y en el `.env.test` local (FR-011); ningún camino de la app la usa.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { saraPrivateOctober2026,sharedOctober2026 } from "../../src/domain/golden/october-2026";
import { moneyFromPesos } from "../../src/domain/money";
import { shiftMonth, todayInBogota } from "../../src/domain/transactions";
import { createTransaction } from "../../src/lib/db/transactions";
import { createSeedUser } from "./admin-user";
import { assertTestTarget } from "./dev-target";
import { runnerSql } from "../integration/support/sql";
import { createSharedExpense } from "../../src/lib/db/shared-expenses";

export type Role = "sara" | "tomas" | (string & {});
export type StorageCookie = { name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Lax" };
export type SeededUser = { id: string; email: string; password: string; displayName: string; cookies: StorageCookie[]; client: SupabaseClient };
export type SeededCouple = {groupId:string;sara:SeededUser;tomas:SeededUser};

/** T025: pareja propia del worker, por base de datos, dos sesiones reales por rol. */
export async function seedCouple({index,golden=false}:{index:number;golden?:boolean}):Promise<SeededCouple> {
  // Guardia antes de crear usuarios o consultar SQL; nunca acepta otro destino.
  runnerSupabase();
  const [sara,tomas]=await Promise.all([seedUser({role:"couple-sara",index,displayName:"Sara"}),seedUser({role:"couple-tomas",index,displayName:"Tomás"})]);
  const groupId=randomUUID();
  runnerSql(`select tests.seed_couple('${groupId}','${sara.id}','${tomas.id}')`);
  if(golden) {
    const users={sara:sara.id,tomas:tomas.id};
    for(const row of sharedOctober2026) await createSharedExpense(sara.client,{idempotencyKey:randomUUID(),amount:row.amount,categoryId:row.categoryId,transactionDate:row.transactionDate,description:row.description,
      payerUserId:users[row.payerUserId as keyof typeof users],splitMode:row.splitMode,splitPercents:row.splitPercents,
      allocations:row.allocations.map(a=>({userId:users[a.userId as keyof typeof users],amount:a.amount}))});
  }
  return {groupId,sara,tomas};
}

/** URL y claves del Supabase del runner o, en `e2e:dev`, de juntia-dev. Falla con cualquier otro destino. */
export function runnerSupabase() {
  const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publishableKey = process.env.PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const secretKey = process.env.SECRET_KEY ?? "";
  assertTestTarget(url, "La siembra");
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
  const created = await createSeedUser(adminClient(), { email, password, email_confirm: true, user_metadata: { display_name: displayName } });
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
 * el mes futuro. `recent` (PR D, T083, T084): las mismas filas en el mes en curso pero nunca después de hoy (el día se
 * lleva a hoy si lo pasa), para que lo que se anota hoy quede arriba en Inicio, como en E5. Devuelve los movimientos
 * creados, en el orden del dataset.
 */
export async function seedMovements(user: SeededUser, data: "golden" | "current" | "future" | "recent") {
  const today = todayInBogota();
  const month = today.slice(0, 7);
  const day = (date: string) => (data === "recent" && date.slice(8) > today.slice(8) ? today.slice(8) : date.slice(8));
  const rows = saraPrivateOctober2026.map((row) => ({ ...row, transactionDate: data === "current" || data === "recent" ? `${month}-${day(row.transactionDate)}` : row.transactionDate }));
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
  const created = await createSeedUser(adminClient(), { email, password, email_confirm: false, user_metadata: { display_name: "Sin verificar" } });
  if (created.error) throw new Error("No se pudo crear la cuenta sin verificar");
  return { email, password };
}

/** Enlace de recuperación sin correo (A5 para axe): la API de administración genera el token del runner. */
export async function recoveryLink(email: string, baseURL: string) {
  const { data, error } = await adminClient().auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) throw new Error("No se pudo generar el enlace de recuperación");
  return `${baseURL}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery`;
}

/**
 * PR B de la 003 (T031d, T036). Una invitación real de `inviter` para `email`, por `create_invitation` con su sesión: el
 * token se genera aquí, como lo haría el navegador, y la función solo recibe su hash (contracts/server-actions.md §2).
 */
export async function seedInvitation(inviter: SeededUser, email: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await inviter.client.rpc("create_invitation", { p_idempotency_key: randomUUID(), p_email: email, p_token_hash: tokenHash });
  if (error || !data) throw new Error("create_invitation falló en la siembra");
  return { token, groupId: (data as { group_id: string }).group_id };
}

/** Estado de pareja de una cuenta sembrada: M4 pendiente o vencida, o M1 con un segundo integrante. */
export async function seedCoupleState(user: SeededUser, state: "pending" | "expired" | "active", index: number) {
  if (state === "active") {
    const partner = await seedUser({ role: "estado-pareja", index, displayName: "Tomás" });
    runnerSql(`select tests.seed_couple('${randomUUID()}','${user.id}','${partner.id}')`);
    return;
  }
  const { groupId } = await seedInvitation(user, `pareja-${index}-${randomUUID().slice(0, 8)}@seed.test`);
  // Vencida: la caducidad sigue siendo creación + 7 días (restricción de la tabla), un día en el pasado.
  if (state === "expired") runnerSql(`update juntia_data.group_invitations set created_at=now()-interval '8 days', expires_at=now()-interval '1 day' where group_id='${groupId}' and status='pending'`);
}
