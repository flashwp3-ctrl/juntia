// @vitest-environment node
// T081, T082 / FR-008, FR-013, FR-014, FR-032; contracts/database.md — capa: unidad (proyecto `components`, entorno node).
// Lo que llega a las Server Actions viene del navegador: forma de cada campo antes del dominio, importes solo como texto
// de dígitos (FR-008), el tipo nunca viaja en la edición (Q14) y el motivo de anular es `delete` o `undo`.
import { describe, expect, it } from "vitest";
import { parseCreatePayload, parseUpdatePayload, parseVoidPayload } from "./payload";

const key = "5b0f1f4e-1d0a-4c55-8a3b-7c7a1f0c2e10";
const id = "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10";
const create = { idempotencyKey: key, type: "expense", amountPesos: "45000", categoryId: "market", transactionDate: "2026-11-05", description: "  Carulla  " };

describe("payload de las Server Actions", () => {
  it("acepta un gasto válido, convierte pesos a unidades menores y recorta la descripción", () => {
    expect(parseCreatePayload(create)).toEqual({ idempotencyKey: key, type: "expense", amount: { amountMinor: 4500000n, currency: "COP" }, categoryId: "market", transactionDate: "2026-11-05", description: "Carulla" });
    expect(parseCreatePayload({ ...create, description: "   " })?.description).toBeNull();
  });

  it("FR-008: rechaza importes que no son texto de dígitos", () => {
    for (const amountPesos of [45000, "45.000", "-1", "0", "045000", "1e5", "1000000000", "", " 45000", 45000n]) {
      expect(parseCreatePayload({ ...create, amountPesos }), String(amountPesos)).toBeNull();
    }
    expect(parseCreatePayload({ ...create, amountPesos: "999999999" })?.amount.amountMinor).toBe(99999999900n);
  });

  it("FR-014: «Ingresos» solo para ingreso y las demás solo para gasto", () => {
    expect(parseCreatePayload({ ...create, categoryId: "income" })).toBeNull();
    expect(parseCreatePayload({ ...create, type: "income", categoryId: "market" })).toBeNull();
    expect(parseCreatePayload({ ...create, type: "income", categoryId: "income" })?.type).toBe("income");
    expect(parseCreatePayload({ ...create, type: "transfer" })).toBeNull();
    expect(parseCreatePayload({ ...create, categoryId: "inventada" })).toBeNull();
  });

  it("rechaza claves que no son UUID, fechas imposibles y descripciones largas", () => {
    expect(parseCreatePayload({ ...create, idempotencyKey: "abc" })).toBeNull();
    expect(parseCreatePayload({ ...create, transactionDate: "2026-02-30" })).toBeNull();
    expect(parseCreatePayload({ ...create, transactionDate: "05/11/2026" })).toBeNull();
    expect(parseCreatePayload({ ...create, description: "a".repeat(141) })).toBeNull();
    expect(parseCreatePayload({ ...create, description: 7 })).toBeNull();
    expect(parseCreatePayload(null)).toBeNull();
    expect(parseCreatePayload([create])).toBeNull();
  });

  it("Q13: una fecha futura se acepta", () => {
    expect(parseCreatePayload({ ...create, transactionDate: "2027-03-14" })?.transactionDate).toBe("2027-03-14");
  });

  it("Q14: la edición no acepta `type` y exige id y versión válidos", () => {
    const { type: _type, ...rest } = create;
    const update = { ...rest, transactionId: id, expectedVersion: 2 };
    expect(parseUpdatePayload(update)).toMatchObject({ transactionId: id, expectedVersion: 2, categoryId: "market" });
    expect(parseUpdatePayload({ ...update, type: "income" })).toBeNull();
    for (const expectedVersion of [0, 1.5, "2", -1, 2_147_483_648]) expect(parseUpdatePayload({ ...update, expectedVersion }), String(expectedVersion)).toBeNull();
    expect(parseUpdatePayload({ ...update, transactionId: "1" })).toBeNull();
  });

  it("anular: solo `delete` o `undo`, con clave, id y versión", () => {
    const payload = { idempotencyKey: key, transactionId: id, expectedVersion: 1, reason: "undo" };
    expect(parseVoidPayload(payload)).toEqual(payload);
    expect(parseVoidPayload({ ...payload, reason: "purge" })).toBeNull();
    expect(parseVoidPayload({ ...payload, idempotencyKey: id.toUpperCase() })).not.toBeNull();
    expect(parseVoidPayload({ ...payload, expectedVersion: "1" })).toBeNull();
  });
});
