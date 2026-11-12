// T063 / FR-057; US-8.2; ADR-011 §2, fila 2 — capa: integración de servidor (el route handler real contra el Supabase
// del runner; solo se sustituye el cliente de la petición por el de la persona sembrada, porque fuera de Next no hay
// cookies). Criterio literal (tasks.md, T063): «en JSON, la estructura de contracts/database.md («Exportación»:
// `exported_at`, `currency`, `note`, `transactions[]` con sus campos), `amount_minor` como string y ningún campo interno
// (`id`, `version`, `owner_user_id`, `created_by`, `status`); en los dos, solo movimientos activos propios, importes como
// texto, sin tokens ni identificadores ni anulados; CSV RFC 4180 con BOM y `'` delante de `= + - @`; Tomás nunca recibe
// filas de Sara; sin sesión, 401; formato no válido, 400».
import { randomUUID } from "node:crypto";
import { beforeAll, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { moneyFromPesos } from "../../src/domain/money";
import { saraPrivateOctober2026 } from "../../src/domain/golden/october-2026";
import { createTransaction, listTransactions, voidTransaction } from "../../src/lib/db/transactions";
import { exportTransactions } from "../../src/lib/db/export";
import { copy } from "../../src/lib/copy/es";
import { runnerEnv } from "./support/env";
import { createTestUser } from "./support/users";
import { appOrigin } from "../../scripts/app-port.mjs";

vi.mock("server-only", () => ({}));
const current = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("../../src/lib/supabase/server", () => ({ createClient: async () => current.client }));
const { GET } = await import("../../src/app/api/export/route");

let sara: Awaited<ReturnType<typeof createTestUser>>;
let tomas: Awaited<ReturnType<typeof createTestUser>>;
const saraIds: string[] = [];
let voidedId = "";
const FORMULAS = ["=SUM(A1:A2)", "+57 300", "-cmd", "@HOY"];
// F44-3 (revisión del PR #44): tabulador, CR, LF y otros controles al principio, solos o antes de un operador. La función
// de escritura recorta solo espacios, así que llegan tal cual a la base y al archivo. [descripción, celda esperada]
const CONTROLS = [
  ["\t=1+1", ",'\t=1+1,"], ["\r+57", ",\"'\r+57\","], ["\n-cmd", ",\"'\n-cmd\","],
  ["\u0001@HOY", ",'\u0001@HOY,"], ["\u007f=1", ",'\u007f=1,"], ["\tTexto", ",'\tTexto,"],
] as const;

beforeAll(async () => {
  sara = await createTestUser("Sara exporta");
  tomas = await createTestUser("Tomás exporta");
  for (const { type, amount, categoryId, transactionDate, description } of saraPrivateOctober2026) {
    saraIds.push((await createTransaction(sara.client, { idempotencyKey: randomUUID(), type, amount, categoryId, transactionDate, description })).id);
  }
  // Descripciones con comillas, comas, saltos de línea y comienzos de fórmula (RFC 4180 e inyección).
  for (const description of [...FORMULAS, ...CONTROLS.map(([value]) => value), 'Dijo "hola", y\nse fue']) {
    saraIds.push((await createTransaction(sara.client, { idempotencyKey: randomUUID(), type: "expense", amount: moneyFromPesos(1000n), categoryId: "other", transactionDate: "2026-11-02", description })).id);
  }
  const voided = await createTransaction(sara.client, { idempotencyKey: randomUUID(), type: "expense", amount: moneyFromPesos(777000n), categoryId: "home", transactionDate: "2026-11-03", description: "Anulado no se exporta" });
  await voidTransaction(sara.client, { idempotencyKey: randomUUID(), transactionId: voided.id, expectedVersion: voided.version, reason: "delete" });
  voidedId = voided.id;
  await createTransaction(tomas.client, { idempotencyKey: randomUUID(), type: "expense", amount: moneyFromPesos(123000n), categoryId: "market", transactionDate: "2026-10-09", description: "Privado de Tomás" });
});

const call = async (client: unknown, format: string) => {
  current.client = client;
  return GET(new Request(`${appOrigin()}/api/export?format=${encodeURIComponent(format)}`));
};
const forbidden = (text: string) => {
  for (const id of [...saraIds, voidedId, sara.id, tomas.id]) expect(text).not.toContain(id);
  expect(text).not.toContain(sara.token);
  expect(text).not.toMatch(/owner_user_id|created_by|"version"|"status"|"id"|access_token|refresh_token/);
  expect(text).not.toContain("Anulado no se exporta");
  expect(text).not.toContain("777000");
  expect(text).not.toContain("Privado de Tomás");
};

it("JSON: la estructura del contrato, importes como texto y nada interno, anulado ni ajeno", async () => {
  const response = await call(sara.client, "json");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toMatch(/^application\/json/);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="juntia-datos-\d{4}-\d{2}-\d{2}\.json"$/);
  const text = await response.text();
  forbidden(text);
  const body = JSON.parse(text);
  expect(Object.keys(body)).toEqual(["exported_at", "currency", "note", "transactions", "settlements", "goals", "goal_entries", "usage_requests", "budgets"]);
  expect(body.currency).toBe("COP");
  expect(body.note).toBe(copy.export.fileNote);
  expect(body.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);
  expect(body.transactions).toHaveLength(saraPrivateOctober2026.length + FORMULAS.length + CONTROLS.length + 1);
  for (const row of body.transactions) {
    expect(Object.keys(row)).toEqual(["transaction_date", "type", "category", "category_name", "description", "amount_minor", "currency", "created_at", "updated_at", "context"]);
    expect(typeof row.amount_minor).toBe("string");
    expect(row.amount_minor).toMatch(/^[0-9]+$/);
  }
  const taxi = body.transactions.find((row: { description: string }) => row.description === "Taxi a la oficina");
  expect(taxi).toMatchObject({ transaction_date: "2026-10-03", type: "expense", category: "transport", category_name: copy.categories.transport, amount_minor: "4500000", currency: "COP" });
  const income = body.transactions.filter((row: { type: string }) => row.type === "income");
  expect(income).toEqual([expect.objectContaining({ description: "Reembolso EPS", amount_minor: "8600000", category: "income" })]);
});

it("CSV: RFC 4180 con BOM, las mismas columnas, fórmulas neutralizadas y nada interno, anulado ni ajeno", async () => {
  const response = await call(sara.client, "csv");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="juntia-datos-\d{4}-\d{2}-\d{2}\.csv"$/);
  const bytes = new Uint8Array(await response.clone().arrayBuffer());
  expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const text = (await response.text()).replace(/^﻿/, "");
  forbidden(text);
  expect(text.split("\r\n")[0]).toBe("transaction_date,type,category,category_name,description,amount_minor,currency,created_at,updated_at,context,record_type");
  expect(text).toContain('2026-10-03,expense,transport,Transporte,Taxi a la oficina,4500000,COP,');
  for (const formula of FORMULAS) expect(text).toContain(`,'${formula},`);
  for (const [, encoded] of CONTROLS) expect(text).toContain(encoded);
  expect(text).toContain('"Dijo ""hola"", y\nse fue"');
  expect(text.endsWith("\r\n")).toBe(true);
  // Cabecera + filas propias activas (una de ellas con un salto de línea dentro de la celda).
  expect(text.trimEnd().split("\r\n")).toHaveLength(1 + saraPrivateOctober2026.length + FORMULAS.length + CONTROLS.length + 1);
});

it("Tomás solo recibe lo suyo, nunca filas de Sara", async () => {
  for (const format of ["json", "csv"]) {
    const text = await (await call(tomas.client, format)).text();
    expect(text).toContain("Privado de Tomás");
    for (const { description } of saraPrivateOctober2026) expect(text).not.toContain(description!);
  }
});

it("sin sesión responde 401 y con un formato no válido, 400; ninguno trae datos", async () => {
  const { apiUrl, publishableKey } = runnerEnv();
  const anonymous = createClient(apiUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const format of ["json", "csv"]) {
    const response = await call(anonymous, format);
    expect(response.status).toBe(401);
    expect(await response.text()).not.toMatch(/Taxi|amount_minor/);
  }
  for (const format of ["xml", "", "JSON", "json,csv"]) {
    const response = await call(sara.client, format);
    expect(response.status).toBe(400);
    expect(await response.text()).not.toMatch(/Taxi|amount_minor/);
  }
});

// F44-2 (revisión del PR #44): «pagina con .range() y un orden total estable […] hasta agotar las filas». Con páginas
// pequeñas sobre la consulta real, el archivo y el mes salen idénticos a la lectura con la página por defecto.
it("F44-2: la exportación y la lectura del mes recorren todas las páginas con un orden estable", async () => {
  const now = new Date("2026-11-05T15:00:00Z");
  for (const format of ["json", "csv"] as const) {
    const whole = await exportTransactions(sara.client, format, now);
    // Una página de una fila basta para verificar cada salto del cursor real; los tamaños se cubren en paginate.test.
    for (const pageSize of [1]) expect((await exportTransactions(sara.client, format, now, { pageSize })).body, `${format}, páginas de ${pageSize}`).toBe(whole.body);
  }
  const json = JSON.parse((await exportTransactions(sara.client, "json", now, { pageSize: 2 })).body);
  expect(json.transactions).toHaveLength(saraPrivateOctober2026.length + FORMULAS.length + CONTROLS.length + 1);
  for (const month of ["2026-10", "2026-11"]) {
    const whole = (await listTransactions(sara.client, month)).map(({ id }) => id);
    expect(whole.length).toBeGreaterThan(4);
    for (const pageSize of [1, 2, 4]) expect((await listTransactions(sara.client, month, { pageSize })).map(({ id }) => id), `${month}, páginas de ${pageSize}`).toEqual(whole);
  }
});

it("F44-2: si la lectura falla, 500 y ningún archivo", async () => {
  const broken = { auth: sara.client.auth, from: () => { throw new TypeError("fetch failed"); } };
  for (const format of ["json", "csv"]) {
    const response = await call(broken, format);
    expect(response.status).toBe(500);
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(await response.text()).toBe("");
  }
});

// F44-2, segunda ronda: «con páginas de 2 filas, intercala una inserción con una clave anterior al cursor y una anulación
// de una fila ya leída entre dos páginas. Comprueba que no hay duplicados ni filas omitidas de las que existían de
// principio a fin». Sobre la consulta real, para la lectura del mes (descendente) y para la exportación (ascendente).
it("F44-2: por cursor, con escrituras entre páginas, sin duplicados ni saltos de las filas que existieron siempre", async () => {
  const ana = await createTestUser("Ana cursor");
  const create = (transactionDate: string, description: string) =>
    createTransaction(ana.client, { idempotencyKey: randomUUID(), type: "expense", amount: moneyFromPesos(1000n), categoryId: "other", transactionDate, description });
  const rows: Awaited<ReturnType<typeof create>>[] = [];
  for (let day = 1; day <= 7; day++) rows.push(await create(`2027-02-0${day}`, `día ${day}`));
  const voidOf = (row: (typeof rows)[number]) => voidTransaction(ana.client, { idempotencyKey: randomUUID(), transactionId: row.id, expectedVersion: row.version, reason: "delete" });

  // Mes, descendente: la primera página trae los días 7 y 6. Entre páginas, una fila nueva con una clave ya recorrida
  // (día 8, antes del cursor en este orden) y la anulación del día 7, ya leído.
  const month = await listTransactions(ana.client, "2027-02", {
    pageSize: 2,
    onPage: async (index) => { if (index === 1) { await create("2027-02-08", "insertada antes del cursor"); await voidOf(rows[6]); } },
  });
  const monthIds = month.map(({ id }) => id);
  expect(new Set(monthIds).size).toBe(monthIds.length);
  for (const row of rows.slice(0, 6)) expect(monthIds.filter((id) => id === row.id), row.description!).toHaveLength(1);

  // Exportación, ascendente: la primera página trae los días 1 y 2. Entre páginas, una fila del 31 de enero (antes del
  // cursor en este orden) y la anulación del día 1, ya leído.
  const file = await exportTransactions(ana.client, "json", new Date(), {
    pageSize: 2,
    onPage: async (index) => { if (index === 1) { await create("2027-01-31", "insertada antes del cursor (asc)"); await voidOf(rows[0]); } },
  });
  const descriptions: string[] = JSON.parse(file.body).transactions.map(({ description }: { description: string }) => description);
  expect(new Set(descriptions).size).toBe(descriptions.length);
  for (const day of [2, 3, 4, 5, 6]) expect(descriptions.filter((text) => text === `día ${day}`), `día ${day}`).toHaveLength(1);
  expect(descriptions).toContain("insertada antes del cursor");
});
