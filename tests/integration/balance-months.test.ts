// F60-1 (ChatGPT, PR #60) / FR-028, FR-042; Q11 (una liquidación anulada sigue en el historial) — capa: integración de
// servidor (la vista real `couple_transaction_months` y `couple_settlements` con RLS). Criterio literal: «un mes histórico
// que solo tiene una liquidación anulada sigue siendo navegable y la muestra marcada como anulada». La vista de meses
// solo cuenta lo activo y está en producción: el PR D lo resuelve en la capa de lectura, sin migración.
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { clampMonth, monthNavigation } from "../../src/domain/transactions";
import { listBalanceMonths, listCoupleMonths } from "../../src/lib/db/couple-reads";
import { listSettlements, registerSettlement, voidSettlement } from "../../src/lib/db/settlements";
import { moneyFromPesos } from "../../src/domain/money";
import { expense, rpc, setupCoupleFixtures } from "./support/couple";

const { couple } = setupCoupleFixtures(1);

it("F60-1: un mes cuya única liquidación está anulada sigue en las flechas de Balance y la enseña anulada", async () => {
  const p = await couple();
  // Octubre: un gasto compartido (pagó Sara), que deja a Tomás debiendo.
  await rpc(p.sara.client, "create_shared_expense", expense(p, { p_transaction_date: "2026-10-03" }));
  // Agosto: solo una liquidación, que después se anula.
  const settled = await registerSettlement(p.tomas.client, { idempotencyKey: randomUUID(), amount: moneyFromPesos(10n), settlementDate: "2026-08-15", note: null });
  await voidSettlement(p.sara.client, { idempotencyKey: randomUUID(), settlementId: settled.id, expectedVersion: settled.version, reason: "void" });

  // La vista de la 003 no lo cuenta (solo lo activo): ese es el hueco.
  expect(await listCoupleMonths(p.sara.client)).not.toContain("2026-08");
  // Balance sí: agosto entra en el intervalo navegable.
  const months = await listBalanceMonths(p.sara.client);
  expect(months).toContain("2026-08");
  expect(clampMonth(months, "2026-11", "2026-08")).toBe("2026-08");
  expect(monthNavigation(months, "2026-11", "2026-09").previous).toBe("2026-08");
  // Y la liquidación de ese mes se lee, marcada como anulada.
  const rows = await listSettlements(p.sara.client, "2026-08");
  expect(rows.map((row) => [row.id, row.status])).toEqual([[settled.id, "voided"]]);
});
