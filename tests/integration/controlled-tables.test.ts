// T019 / ADR-013 [V] 2: escritura directa imposible con JWT real en cada tabla;
// «las vistas no admiten POST/PATCH/DELETE; Tomás no ve filas de Sara» (tasks.md).
import { beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestUser } from "./support/users";
import { runnerSql } from "./support/sql";
import { runnerEnv } from "./support/env";
let sara: Awaited<ReturnType<typeof createTestUser>>;
let tomas: Awaited<ReturnType<typeof createTestUser>>;
const id = randomUUID();
beforeAll(async () => {
  sara = await createTestUser("Sara tablas"); tomas = await createTestUser("Tomás tablas");
  runnerSql(`insert into juntia_data.transactions(id,type,created_by,owner_user_id,amount_minor,category_id,transaction_date)
    values('${id}','expense','${sara.id}','${sara.id}',4500000,'transport','2026-10-03');`);
});
it("[V8] vistas propias, importes de texto y ninguna fila ajena", async () => {
  const own = await sara.client.from("my_transactions").select("*");
  expect(own.error).toBeNull();
  expect(own.data).toHaveLength(1);
  expect(own.data?.[0].amount_minor).toBe("4500000");
  for (const view of ["my_transactions", "my_transaction_months", "my_recent_categories"]) {
    const other = await tomas.client.from(view).select("*");
    expect(other.error).toBeNull(); expect(other.data).toEqual([]);
  }
});
it("[V2] cada tabla controlada rechaza escrituras directas, también propias", async () => {
  const { apiUrl, publishableKey } = runnerEnv();
  for (const table of ["transactions", "audit_events", "idempotency_records"]) {
    for (const schema of ["public", "juntia_data"]) {
      for (const method of ["POST", "PATCH", "DELETE"]) {
        const response = await fetch(`${apiUrl}/rest/v1/${table}?owner_user_id=eq.${sara.id}`, { method,
          headers: { apikey: publishableKey, Authorization: `Bearer ${sara.token}`, "Content-Type": "application/json", "Content-Profile": schema, "Accept-Profile": schema },
          ...(method === "DELETE" ? {} : { body: "{}" }) });
        expect(response.ok).toBe(false);
        expect(["PGRST205", "PGRST106", "42501"]).toContain((await response.json()).code);
      }
    }
  }
});
it("[V2] ninguna de las tres vistas admite mutaciones", async () => {
  const { apiUrl, publishableKey } = runnerEnv();
  for (const [view, filter, body] of [
    ["my_transactions", `id=eq.${id}`, { description: "Intrusión" }],
    ["my_transaction_months", "month=eq.2026-10-01", { count: 0 }],
    ["my_recent_categories", "category_id=eq.transport", { category_id: "market" }],
  ] as const) {
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const response = await fetch(`${apiUrl}/rest/v1/${view}?${filter}`, { method,
        headers: { apikey: publishableKey, Authorization: `Bearer ${sara.token}`, "Content-Type": "application/json" },
        ...(method === "DELETE" ? {} : { body: JSON.stringify(body) }) });
      const result = await response.json();
      expect(response.ok, `${method} ${view}`).toBe(false);
      expect(["42501", "55000"], `${method} ${view}: ${result.message}`).toContain(result.code);
    }
  }
  const unchanged = await sara.client.from("my_transactions").select("id,amount_minor,description");
  expect(unchanged.data).toEqual([{ id, amount_minor: "4500000", description: null }]);
});
