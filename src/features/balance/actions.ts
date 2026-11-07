"use server";
// T062 (spec 003, PR D) / FR-027, FR-028, FR-056, FR-059; US-6; contracts/server-actions.md §1–§2; enmienda de ADR-007.
// Registrar y anular una liquidación por las funciones de entrada de src/lib/db, con el cliente de la petición y nunca con
// la clave secreta (FR-008). Cada una devuelve los tres resultados del módulo común (`ok`, `rejected` con su error de
// dominio, `unknown`); la clave de idempotencia la trae el navegador y src/lib/db reintenta 40P01/40001 con ella. La
// dirección (deudor → acreedor) y el máximo los decide la función bajo el bloqueo del grupo, nunca el navegador. Tras
// escribir, `revalidatePath` del layout: la misma respuesta trae Balance, Inicio y Actividad con el saldo nuevo.
import { revalidatePath } from "next/cache";
import { moneyFromPesos } from "@/domain/money";
import { runWrite, type WriteOutcome } from "@/features/shared/write-result";
import { registerSettlement, voidSettlement } from "@/lib/db/settlements";
import { createClient } from "@/lib/supabase/server";
import type { SavedSettlement, SettlePayload, VoidSettlementPayload } from "./types";
import { toSavedSettlement } from "./saved";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const PESOS = /^[1-9][0-9]{0,8}$/;
const INVALID = { status: "rejected", error: "invalid" } as const;
const refresh = () => revalidatePath("/", "layout");

function parseSettle(input: unknown): SettlePayload | null {
  if (typeof input !== "object" || input === null) return null;
  const { idempotencyKey, amountPesos, settlementDate, note } = input as Record<string, unknown>;
  if (typeof idempotencyKey !== "string" || !UUID.test(idempotencyKey)) return null;
  if (typeof amountPesos !== "string" || !PESOS.test(amountPesos)) return null;
  if (typeof settlementDate !== "string" || !DATE.test(settlementDate)) return null;
  if (note !== null && (typeof note !== "string" || note.length > 140)) return null;
  return { idempotencyKey, amountPesos, settlementDate, note: note === null || note.trim() === "" ? null : note.trim() };
}

function parseVoid(input: unknown): VoidSettlementPayload | null {
  if (typeof input !== "object" || input === null) return null;
  const { idempotencyKey, settlementId, expectedVersion, reason } = input as Record<string, unknown>;
  if (typeof idempotencyKey !== "string" || !UUID.test(idempotencyKey) || typeof settlementId !== "string" || !UUID.test(settlementId)) return null;
  if (typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion) || expectedVersion < 1) return null;
  if (reason !== "void" && reason !== "undo") return null;
  return { idempotencyKey, settlementId, expectedVersion, reason };
}

export async function settleAction(input: unknown): Promise<WriteOutcome<SavedSettlement>> {
  const payload = parseSettle(input);
  if (!payload) return INVALID;
  const outcome = await runWrite(async () => toSavedSettlement(await registerSettlement(await createClient(), {
    idempotencyKey: payload.idempotencyKey, amount: moneyFromPesos(BigInt(payload.amountPesos)), settlementDate: payload.settlementDate, note: payload.note,
  })));
  if (outcome.status === "ok") refresh();
  return outcome;
}

export async function voidSettlementAction(input: unknown): Promise<WriteOutcome<{ id: string; version: number }>> {
  const payload = parseVoid(input);
  if (!payload) return INVALID;
  const outcome = await runWrite(async () => {
    const result = await voidSettlement(await createClient(), payload);
    return { id: result.id, version: result.version };
  });
  if (outcome.status === "ok") refresh();
  return outcome;
}
