// T014 / ADR-013 [V] 1, 2, 7, 8: «con un JWT real y la API de datos pública»;
// «Tomás no lee el perfil de Sara» (tasks.md, punto de control 1).
import { beforeAll, expect, it } from "vitest";
import { createTestUser } from "./support/users";
import { runnerEnv } from "./support/env";
let sara: Awaited<ReturnType<typeof createTestUser>>;
let tomas: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => { sara = await createTestUser("Sara HTTP"); tomas = await createTestUser("Tomás HTTP"); });
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
it("[V2/V7] POST/PATCH/DELETE directos y perfiles privados no son accesibles", async () => {
  const { apiUrl, publishableKey } = runnerEnv();
  for (const method of ["POST", "PATCH", "DELETE"]) {
    for (const [schema, resource, payload] of [
      ["public", "profiles", { user_id: sara.id, display_name: "Intrusión" }],
      ["juntia_data", "profiles", { user_id: sara.id, display_name: "Intrusión" }],
      ["juntia_private", "profiles", {}],
      ["public", "my_profile", { display_name: "Intrusión" }],
    ] as const) {
      const response = await fetch(`${apiUrl}/rest/v1/${resource}`, { method, headers: { apikey: publishableKey, Authorization: `Bearer ${sara.token}`, "Content-Type": "application/json", "Content-Profile": schema, "Accept-Profile": schema }, ...(method === "DELETE" ? {} : { body: JSON.stringify(payload) }) });
      expect(response.ok, `${method} ${schema}.${resource}`).toBe(false);
      const body = await response.json();
      expect(["PGRST205", "PGRST106", "42501"]).toContain(body.code);
    }
  }
});
it("[V7] GraphQL no puede exponer datos ni esquemas de Juntia", async () => {
  const { apiUrl, publishableKey } = runnerEnv();
  const response = await fetch(`${apiUrl}/graphql/v1`, { method: "POST", headers: { apikey: publishableKey, Authorization: `Bearer ${sara.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: "{ __schema { queryType { fields { name } } } }" }) });
  const body = await response.json();
  expect(body.data).toBeUndefined();
  expect(body.errors?.length ?? (response.ok ? 0 : 1)).toBeGreaterThan(0);
});
