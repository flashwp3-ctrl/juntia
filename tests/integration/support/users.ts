import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createSeedUser } from "../../support/admin-user";
import { runnerEnv } from "./env";
export async function createTestUser(displayName: string) {
  const { apiUrl, publishableKey, secretKey } = runnerEnv();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(apiUrl, secretKey, options);
  const email = `${randomUUID()}@seed.test`;
  const password = `Test-${randomUUID()}-9`;
  const created = await createSeedUser(admin, { email, password, email_confirm: true, user_metadata: { display_name: displayName } });
  if (created.error || !created.data.user) throw new Error("No se pudo crear el usuario de prueba");
  const client = createClient(apiUrl, publishableKey, options);
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw new Error("No se pudo autenticar el usuario de prueba");
  return { client, id: created.data.user.id, token: signedIn.data.session.access_token };
}
