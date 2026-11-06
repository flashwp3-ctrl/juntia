"use server";
// T031b, T032, T033 / FR-011–FR-014, FR-056, FR-058, FR-059; contracts/server-actions.md §1–§3; contracts/errors.md.
// Las cuatro escrituras de invitación y sus dos lecturas, por src/lib/db con el cliente de la petición (nunca con la
// clave secreta, FR-008). El token llega del navegador; aquí solo se calcula su SHA-256, y ni el token ni el hash se
// registran ni se devuelven. src/lib/db reintenta 40P01/40001 con la misma clave (FR-058); write-result.ts clasifica el
// resultado en ok / rejected / unknown. Tras escribir, `revalidatePath` del layout (Q16: tras cada escritura propia).
import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/db/profile";
import { acceptInvitation, cancelInvitation, createInvitation, getMyCouple, previewInvitation, regenerateInvitation } from "@/lib/db/couple";
import { DbError } from "@/lib/db/errors";
import { hashInvitationToken } from "@/lib/db/invitation-token";
import { getSessionIdentity } from "@/lib/db/session";
import { writeStatus } from "@/lib/db/write-status";
import { createClient } from "@/lib/supabase/server";
import { runWrite, type WriteAction, type WriteOutcome } from "@/features/shared/write-result";
import { isInvitationToken } from "./intent";
import type { InspectResult } from "./invitation-screen";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const text = (value: unknown, max: number) => (typeof value === "string" && value.length <= max ? value : null);
const version = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null);
/** Una carga que el cliente no podía mandar: no se escribe nada. */
const malformed = { status: "rejected", error: "unexpected" } as const;
const refresh = () => revalidatePath("/", "layout");

async function written<T>(outcome: WriteOutcome<T>): Promise<WriteOutcome<T>> {
  if (outcome.status === "ok") refresh();
  return outcome;
}

export async function createInvitationAction(input: unknown): Promise<WriteOutcome<{ expiresAt: string }>> {
  if (!isRecord(input)) return malformed;
  const idempotencyKey = text(input.idempotencyKey, 64);
  const email = text(input.email, 320);
  if (!idempotencyKey || email === null || !isInvitationToken(input.token)) return malformed;
  const tokenHash = await hashInvitationToken(input.token);
  return written(await runWrite(async () => {
    const result = await createInvitation(await createClient(), { idempotencyKey, email, tokenHash });
    return { expiresAt: result.expires_at };
  }));
}

export async function regenerateInvitationAction(input: unknown): Promise<WriteOutcome<{ expiresAt: string }>> {
  if (!isRecord(input)) return malformed;
  const idempotencyKey = text(input.idempotencyKey, 64);
  const groupId = text(input.groupId, 64);
  const expectedVersion = version(input.expectedVersion);
  if (!idempotencyKey || !groupId || expectedVersion === null || !isInvitationToken(input.token)) return malformed;
  const tokenHash = await hashInvitationToken(input.token);
  return written(await runWrite(async () => {
    const result = await regenerateInvitation(await createClient(), { idempotencyKey, groupId, expectedVersion, tokenHash });
    return { expiresAt: result.expires_at };
  }));
}

export async function cancelInvitationAction(input: unknown): Promise<WriteOutcome<{ status: "discarded" }>> {
  if (!isRecord(input)) return malformed;
  const idempotencyKey = text(input.idempotencyKey, 64);
  const groupId = text(input.groupId, 64);
  const expectedVersion = version(input.expectedVersion);
  if (!idempotencyKey || !groupId || expectedVersion === null) return malformed;
  return written(await runWrite(async () => {
    const result = await cancelInvitation(await createClient(), { idempotencyKey, groupId, expectedVersion });
    return { status: result.status };
  }));
}

export async function acceptInvitationAction(input: unknown): Promise<WriteOutcome<{ groupId: string }>> {
  if (!isRecord(input)) return malformed;
  const idempotencyKey = text(input.idempotencyKey, 64);
  if (!idempotencyKey || !isInvitationToken(input.token)) return malformed;
  const tokenHash = await hashInvitationToken(input.token);
  return written(await runWrite(async () => {
    const result = await acceptInvitation(await createClient(), { idempotencyKey, tokenHash });
    return { groupId: result.group_id };
  }));
}

/**
 * M5/M6/M7 (contracts §3, punto 4): sin sesión, `signedOut` sin leer nada. Con sesión, quien ya tiene pareja ve M7 (la
 * propia provisional con su texto, US-1.9); si no, `preview_invitation` revalida token, correo, caducidad y estado en el
 * servidor. JT104 es el mismo M7 para todos los motivos.
 */
export async function inspectInvitationAction(input: unknown): Promise<InspectResult> {
  if (!isRecord(input) || !isInvitationToken(input.token)) return { state: "invalid", reason: "generic" };
  try {
    const client = await createClient();
    const identity = await getSessionIdentity(client);
    if (!identity) return { state: "signedOut" };
    const couple = await getMyCouple(client);
    if (couple?.status === "active") return { state: "invalid", reason: "generic" };
    if (couple?.status === "provisional") return { state: "invalid", reason: "ownPending" };
    const [preview, profile] = await Promise.all([previewInvitation(client, await hashInvitationToken(input.token)), getProfile(client)]);
    return { state: "valid", inviterName: preview.inviter_display_name, expiresAt: preview.expires_at, email: identity.email, myName: profile?.displayName ?? "" };
  } catch (error) {
    if (error instanceof DbError && error.kind === "invitationInvalid") return { state: "invalid", reason: "generic" };
    if (error instanceof DbError && error.kind === "notAuthenticated") return { state: "signedOut" };
    return { state: "error" };
  }
}

const ACTIONS: ReadonlySet<WriteAction> = new Set(["create_invitation", "regenerate_invitation", "cancel_invitation", "accept_invitation"]);

/**
 * «Comprobar estado» (contracts/server-actions.md §1; contracts/database.md, «Estado de una escritura»): `write_status`
 * no reejecuta nada. `completed` devuelve lo mismo que habría devuelto el reintento, ya normalizado para la interfaz.
 */
export async function checkInvitationWriteAction(input: unknown): Promise<{ state: "completed"; value: unknown } | { state: "not_found" } | { state: "error" }> {
  if (!isRecord(input) || typeof input.action !== "string" || !ACTIONS.has(input.action as WriteAction)) return { state: "error" };
  const idempotencyKey = text(input.idempotencyKey, 64);
  if (!idempotencyKey) return { state: "error" };
  try {
    const status = await writeStatus(await createClient(), input.action, idempotencyKey);
    if (status.state !== "completed") return { state: "not_found" };
    const result = (isRecord(status.result) ? status.result : {}) as Record<string, unknown>;
    refresh();
    switch (input.action as WriteAction) {
      case "create_invitation": case "regenerate_invitation": return { state: "completed", value: { expiresAt: String(result.expires_at ?? "") } };
      case "cancel_invitation": return { state: "completed", value: { status: "discarded" } };
      default: return { state: "completed", value: { groupId: String(result.group_id ?? "") } };
    }
  } catch {
    return { state: "error" };
  }
}
