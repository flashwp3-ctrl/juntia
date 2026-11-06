// T042 / FR-021, FR-024, FR-029; US-1.1, US-1.3. Capa: integración de servidor (supabase-js contra el Supabase del
// runner, sin navegador). Criterios literales (tasks.md, T042): «`ensure_profile()` idempotente con el `display_name` de
// A2; una llamada directa a `/auth/v1/signup` con una contraseña de 7 caracteres y un correo de la lista es rechazada
// (`weak_password`) y no crea usuario (F37-7); `set_theme` y `update_display_name` no tocan el perfil de otra persona».
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, expect, it } from "vitest";
import { sendsMailOnDev } from "../support/dev-target";
import { runnerEnv } from "./support/env";
import { runnerSql } from "./support/sql";
import { createTestUser } from "./support/users";

const options = { auth: { persistSession: false, autoRefreshToken: false } };

it("ensure_profile toma el nombre visible de A2 (user_metadata) y es idempotente", async () => {
  const sara = await createTestUser("Sara de A2");
  const first = await sara.client.rpc("ensure_profile");
  const second = await sara.client.rpc("ensure_profile");
  expect(first.error).toBeNull();
  expect(first.data).toEqual({ display_name: "Sara de A2", theme: "system", first_entry_completed: false });
  expect(second.data).toEqual(first.data);
  expect(runnerSql(`select count(*) from juntia_data.profiles where user_id='${sara.id}'`)).toBe("1");
});

// Envía o lee un correo: solo en CI. `test:integration:dev` lo salta y lo declara (decisión 18, ADR-011 §9.9).
it.skipIf(sendsMailOnDev)("F37-7: Auth rechaza por la API cruda una contraseña de 7 caracteres con un correo permitido y no crea el usuario", async () => {
  const { apiUrl, publishableKey } = runnerEnv();
  const email = `weak-${randomUUID()}@seed.test`;
  runnerSql(`insert into juntia_data.signup_allowlist(email) values ('${email}')`);
  try {
    const response = await fetch(`${apiUrl}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: publishableKey, "content-type": "application/json" },
      body: JSON.stringify({ email, password: "Abc1234" }),
    });
    const body = await response.json() as { error_code?: string; code?: string | number };
    expect(response.status).toBe(422);
    expect(body.error_code ?? body.code).toBe("weak_password");
    expect(runnerSql(`select count(*) from auth.users where email='${email}'`)).toBe("0");
    // Control: la misma petición con 8 caracteres sí crea la cuenta (la lista permite el correo).
    const ok = await createClient(apiUrl, publishableKey, options).auth.signUp({ email, password: "Abc12345" });
    expect(ok.error).toBeNull();
    expect(runnerSql(`select count(*) from auth.users where email='${email}'`)).toBe("1");
  } finally {
    runnerSql(`delete from juntia_data.signup_allowlist where email='${email}'`);
  }
});

let sara: Awaited<ReturnType<typeof createTestUser>>;
let tomas: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => { sara = await createTestUser("Sara intacta"); tomas = await createTestUser("Tomás"); });

it("set_theme y update_display_name de Tomás no tocan el perfil de Sara", async () => {
  expect((await sara.client.rpc("ensure_profile")).error).toBeNull();
  const before = runnerSql(`select display_name||'|'||theme from juntia_data.profiles where user_id='${sara.id}'`);
  expect((await tomas.client.rpc("set_theme", { p_theme: "dark" })).data).toMatchObject({ theme: "dark" });
  expect((await tomas.client.rpc("update_display_name", { p_display_name: "Otro nombre" })).data).toMatchObject({ display_name: "Otro nombre" });
  expect(runnerSql(`select display_name||'|'||theme from juntia_data.profiles where user_id='${sara.id}'`)).toBe(before);
  expect(before).toBe("Sara intacta|system");
  expect((await sara.client.from("my_profile").select("display_name,theme")).data).toEqual([{ display_name: "Sara intacta", theme: "system" }]);
});
