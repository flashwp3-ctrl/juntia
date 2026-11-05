"use server";
// T047, T048 / FR-051–FR-053; contracts/errors.md. Escrituras de Mi cuenta por las funciones de entrada de src/lib/db.
// `JT001` y el 401 de PostgREST (o una petición sin sesión) se devuelven como «sesión caducada» para que la interfaz lo
// diga sin perder lo escrito (spec, caso límite).
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { displayNameError, normalizeDisplayName } from "@/domain/account";
import { DbError, mapDbError } from "@/lib/db/errors";
import { setTheme, updateDisplayName } from "@/lib/db/profile";
import { getSessionIdentity } from "@/lib/db/session";
import { createClient } from "@/lib/supabase/server";
import { isTheme, type Theme } from "@/lib/theme";
import type { AccountActionError, AccountActionResult, SaveNameResult } from "./types";

function toError(error: unknown): AccountActionError {
  const kind = (error instanceof DbError ? error : mapDbError(error)).kind;
  if (kind === "notAuthenticated") return "sessionExpired";
  if (kind === "invalidDisplayName" || kind === "invalidTheme") return "invalid";
  return "failed";
}

export async function saveDisplayName(value: string): Promise<SaveNameResult> {
  if (displayNameError(value)) return { ok: false, error: "invalid" };
  try {
    const profile = await updateDisplayName(await createClient(), normalizeDisplayName(value));
    revalidatePath("/", "layout");
    return { ok: true, displayName: profile.displayName };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function saveTheme(theme: Theme): Promise<AccountActionResult> {
  if (!isTheme(theme)) return { ok: false, error: "invalid" };
  try {
    await setTheme(await createClient(), theme);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

/** G1 → G2: el enlace seguro va al correo de la sesión, nunca a uno escrito por la persona. */
export async function requestPasswordChange(): Promise<AccountActionResult> {
  const client = await createClient();
  const identity = await getSessionIdentity(client);
  if (!identity?.email) return { ok: false, error: "sessionExpired" };
  const list = await headers();
  const site = (process.env.SITE_URL ?? `${list.get("x-forwarded-proto") ?? "http"}://${list.get("host")}`).replace(/\/$/, "");
  const { error } = await client.auth.resetPasswordForEmail(identity.email, { redirectTo: `${site}/nueva-contrasena` });
  // 429 da el mismo aviso: el enlace llega o se pide más tarde (contracts/errors.md, recuperación).
  if (error && error.name === "AuthRetryableFetchError") return { ok: false, error: "failed" };
  return { ok: true };
}
