// P0-4 · decisión de los fundadores del 22 de noviembre de 2026 (comp «06b · 4 × 3»; migración 20261122120000): entran las
// categorías de gasto Oficina (`office`) y Ropa (`clothing`), «Otra» queda la última y ninguna clave existente cambia («Ocio» es
// solo el texto de `entertainment`). La base y el catálogo del dominio dicen lo mismo, y las dos nuevas se usan de verdad por
// las funciones públicas: anotar un gasto y crear un presupuesto.
import { randomUUID } from "node:crypto";
import { beforeAll, expect, it } from "vitest";
import { moneyFromPesos } from "../../src/domain/money";
import { CATEGORY_CATALOG } from "../../src/domain/transactions";
import { createBudget } from "../../src/lib/db/budgets";
import { createTransaction, listTransactions } from "../../src/lib/db/transactions";
import { runnerSql } from "./support/sql";
import { createTestUser } from "./support/users";

let sara: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => { sara = await createTestUser("Sara categorías"); });

it("la tabla de categorías tiene el catálogo del dominio, en su orden, con «Otra» la última", () => {
  const rows = runnerSql("select id||':'||kind from juntia_data.categories order by sort_order;").split(/\r?\n/);
  // Las de gasto en el orden del catálogo (el de la rejilla de Anotar); «Ingresos» conserva su 9 y no sale en la rejilla.
  expect(rows.filter((row) => row.endsWith(":expense"))).toEqual(CATEGORY_CATALOG.filter(({ kind }) => kind === "expense").map(({ id, kind }) => `${id}:${kind}`));
  expect(rows.slice().sort()).toEqual(CATEGORY_CATALOG.map(({ id, kind }) => `${id}:${kind}`).sort());
  expect(rows.at(-1)).toBe("other:expense");
  expect(rows).toEqual(expect.arrayContaining(["office:expense", "clothing:expense", "entertainment:expense"]));
  // Las claves de antes no cambian: las diez siguen ahí, con su tipo.
  for (const id of ["market", "restaurants", "home", "transport", "health", "entertainment", "shopping", "services", "other"]) expect(rows).toContain(`${id}:expense`);
  expect(rows).toContain("income:income");
});

it("Oficina y Ropa se anotan como gasto y no como ingreso", async () => {
  const date = "2026-11-20";
  for (const categoryId of ["office", "clothing"] as const) {
    await createTransaction(sara.client, { idempotencyKey: randomUUID(), type: "expense", amount: moneyFromPesos(12000n), categoryId, transactionDate: date, description: null });
    await expect(createTransaction(sara.client, { idempotencyKey: randomUUID(), type: "income", amount: moneyFromPesos(12000n), categoryId, transactionDate: date, description: null })).rejects.toThrow();
  }
  const rows = await listTransactions(sara.client, date.slice(0, 7));
  expect(rows.map((row) => row.categoryId).sort()).toEqual(["clothing", "office"]);
});

it("Oficina y Ropa admiten presupuesto propio", async () => {
  for (const categoryId of ["office", "clothing"] as const) {
    const budget = await createBudget(sara.client, { idempotencyKey: randomUUID(), context: "me", categoryId, limit: moneyFromPesos(150000n) });
    expect(budget.budget_id).toEqual(expect.any(String));
  }
});
