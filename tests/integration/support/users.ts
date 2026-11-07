import { randomUUID } from "node:crypto";
import { afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createSeedUser } from "../../support/admin-user";
import { runnerEnv } from "./env";
let signIns=0;
afterAll(()=>console.info(`[fixtures/auth] signInWithPassword=${signIns}`));
export async function createTestUser(displayName: string) {
  const { apiUrl, publishableKey, secretKey } = runnerEnv();
  const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(apiUrl, secretKey, clientOptions);
  const email = `${randomUUID()}@seed.test`;
  const password = `Test-${randomUUID()}-9`;
  const failure = (stage: string, error: { name?: string; status?: number; code?: string; message?: string } | null) => {
    let message = error?.message ?? "La respuesta está incompleta";
    for (const sensitive of [email,password,apiUrl,publishableKey,secretKey]) message = message.replaceAll(sensitive,"[redactado]");
    return new Error(`${stage}: ${JSON.stringify({name:error?.name,status:error?.status,code:error?.code,message})}`);
  };
  const created = await createSeedUser(admin, { email, password, email_confirm: true, user_metadata: { display_name: displayName } });
  if (created.error || !created.data.user) throw failure("No se pudo crear el usuario de prueba",created.error);
  const client = createClient(apiUrl, publishableKey, clientOptions);
  signIns++;
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) {
    throw failure("No se pudo autenticar el usuario de prueba",signedIn.error);
  }
  return { client, id: created.data.user.id, token: signedIn.data.session.access_token };
}
