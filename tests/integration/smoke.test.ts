// T007: «GET /auth/v1/health da 200, y anon no obtiene datos» (tasks.md, etapa 0).
import { expect, it } from "vitest";
import { runnerEnv } from "./support/env";
it("la API del runner responde sin exponer datos a anon", async () => {
  const { apiUrl, publishableKey } = runnerEnv();
  const headers = { apikey: publishableKey };
  expect((await fetch(`${apiUrl}/auth/v1/health`, { headers })).status).toBe(200);
  const response = await fetch(`${apiUrl}/rest/v1/bootstrap_smoke?select=*`, { headers });
  const body = await response.json();
  if (response.ok) expect(body).toEqual([]);
  else expect(body.code).toBe("PGRST205");
});
