// T014 / ADR-013 [V] 1, 2, 7, 8: «con un JWT real y la API de datos pública»;
// «Tomás no lee el perfil de Sara» (tasks.md, punto de control 1).
import { beforeAll, expect, it, vi } from "vitest";
import { createTestUser } from "./support/users";
import { runnerEnv } from "./support/env";
import { runnerSql } from "./support/sql";
import { createClient } from "@supabase/supabase-js";
let sara: Awaited<ReturnType<typeof createTestUser>>;
let tomas: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => { sara = await createTestUser("Sara HTTP"); tomas = await createTestUser("Tomás HTTP"); });
// ADR-013 [V] 9: observar lo que PostgREST fija, no solo lo que acepta auth.uid().
it("[V9] PostgREST fija request.jwt.claims y no el claim legacy", async () => {
  try {
    runnerSql(`create function public.foundation_claims_probe() returns jsonb language sql security invoker set search_path='' as $$
      select jsonb_build_object('uid',auth.uid(),'json_sub',nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub','legacy',nullif(current_setting('request.jwt.claim.sub',true),''));
      $$; revoke all on function public.foundation_claims_probe() from public,anon; grant execute on function public.foundation_claims_probe() to authenticated; notify pgrst,'reload schema';`);
    await vi.waitFor(async () => {
      const result = await sara.client.rpc("foundation_claims_probe");
      expect(result.error).toBeNull();
      expect(result.data).toEqual({ uid: sara.id, json_sub: sara.id, legacy: null });
    }, { timeout: 5000 });
  } finally {
    runnerSql("drop function if exists public.foundation_claims_probe(); notify pgrst,'reload schema';");
  }
});
it("[V1/V8] ensure_profile por HTTP conserva la identidad y es idempotente", async () => {
  for (let i = 0; i < 2; i++) {
    const result = await sara.client.rpc("ensure_profile");
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ display_name: "Sara HTTP", theme: "system", first_entry_completed: false });
  }
  expect((await sara.client.from("my_profile").select("*")).data).toEqual([{ display_name: "Sara HTTP", theme: "system", first_entry_completed: false }]);
  expect((await tomas.client.from("my_profile").select("*")).data).toEqual([]);
  expect((await tomas.client.rpc("ensure_profile")).error).toBeNull();
  expect((await tomas.client.from("my_profile").select("*")).data).toEqual([{ display_name: "Tomás HTTP", theme: "system", first_entry_completed: false }]);
});
// FR-024: la petición real de Auth ejecuta el hook como supabase_auth_admin.
it("Auth aplica la lista permitida antes de crear la cuenta", async () => {
  const { apiUrl, publishableKey } = runnerEnv();
  const client = createClient(apiUrl, publishableKey, { auth: { persistSession: false } });
  const allowed = await client.auth.signUp({ email: "signup@seed.test", password: "Synthetic-Signup-2026!" });
  expect(allowed.error).toBeNull();
  expect(allowed.data.user?.email).toBe("signup@seed.test");
  expect(allowed.data.session).toBeNull();
  const denied = await client.auth.signUp({ email: "not-allowed@seed.test", password: "Synthetic-Signup-2026!" });
  expect(denied.error?.status).toBe(403);
  expect(denied.data.user).toBeNull();
});
it("[V2/V7] POST/PATCH/DELETE directos y perfiles privados no son accesibles", async () => {
  const { apiUrl, publishableKey } = runnerEnv();
  for (const method of ["POST", "PATCH", "DELETE"]) {
    for (const [schema, resource, payload] of [
      ["public", "profiles", { user_id: sara.id, display_name: "Intrusión" }],
      ["juntia_data", "profiles", { user_id: sara.id, display_name: "Intrusión" }],
      ["juntia_private", "profiles", {}],
      ["public", "my_profile", { display_name: "Intrusión" }],
    ] as const) {
      // Un filtro válido evita que safeupdate rechace la petición antes de comprobar grants/RLS.
      const filter = method === "POST" ? "" : "?display_name=eq.Sara%20HTTP";
      const response = await fetch(`${apiUrl}/rest/v1/${resource}${filter}`, { method, headers: { apikey: publishableKey, Authorization: `Bearer ${sara.token}`, "Content-Type": "application/json", "Content-Profile": schema, "Accept-Profile": schema }, ...(method === "DELETE" ? {} : { body: JSON.stringify(payload) }) });
      expect(response.ok, `${method} ${schema}.${resource}`).toBe(false);
      const body = await response.json();
      expect(["PGRST205", "PGRST106", "42501"], `${method} ${schema}.${resource}: ${body.code} ${body.message}`).toContain(body.code);
    }
  }
  const response = await fetch(`${apiUrl}/rest/v1/rpc/ensure_profile`, { method: "POST", headers: { apikey: publishableKey, Authorization: `Bearer ${sara.token}`, "Content-Type": "application/json", "Content-Profile": "juntia_private" }, body: "{}" });
  expect((await response.json()).code).toBe("PGRST106");
});
it("[V7] GraphQL no puede exponer datos ni esquemas de Juntia", async () => {
  const { apiUrl, publishableKey } = runnerEnv();
  const response = await fetch(`${apiUrl}/graphql/v1`, { method: "POST", headers: { apikey: publishableKey, Authorization: `Bearer ${sara.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: "{ __schema { queryType { fields { name } } } }" }) });
  const body = await response.json();
  expect(body.data).toBeUndefined();
  expect(body.errors?.length ?? (response.ok ? 0 : 1)).toBeGreaterThan(0);
});
