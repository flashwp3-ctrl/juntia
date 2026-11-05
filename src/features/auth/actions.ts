"use server";
// T044 / FR-021, FR-023, FR-028, FR-029; contracts/database.md, «Auth». Server Actions de acceso con el cliente de
// servidor de la petición. Los errores se traducen con auth-errors.ts; nada técnico llega a la pantalla. Tras entrar:
// ensure_profile() y copia de profiles.theme a la cookie de la respuesta (research R7, R8.5).
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { displayNameError, normalizeDisplayName, safeReturnPath } from "@/domain/account";
import { copy } from "@/lib/copy/es";
import { completeFirstEntry, ensureProfile } from "@/lib/db/profile";
import { getSessionClaims } from "@/lib/db/session";
import { createClient } from "@/lib/supabase/server";
import { THEME_COOKIE, themeCookieOptions } from "@/lib/theme";
import { newPasswordResult, recoverResult, resendResult, signInResult, signOutResult, signUpResult, type AuthErrorLike, type AuthResult } from "./auth-errors";
import { isRecentRecovery } from "./recovery-session";

export type FormState = { redirectTo?: string; error?: string; field?: "name" | "email" | "password" | "repeat" | "acknowledge"; notice?: string; resend?: boolean; email?: string; name?: string };

/** Correo del registro, para «Reenviar enlace» en A3 sin ponerlo en la URL (solo esta cookie, de una hora). */
const PENDING_EMAIL = "juntia_pending_email";
const MIN_PASSWORD = 8;

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

// Destino de los enlaces de Auth (enmienda del 5 nov 2026): SITE_URL, o el origen de la petición en los previews, que
// no la definen. Tiene que estar en las Redirect URLs del proyecto (quickstart §3, paso 2).
async function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const list = await headers();
  return `${list.get("x-forwarded-proto") ?? "http"}://${list.get("host")}`;
}

function toState(result: AuthResult, extra: FormState = {}): FormState {
  if (result.kind === "error") return { ...extra, error: result.error, field: result.field, resend: result.resend };
  if (result.kind === "notice") return { ...extra, notice: result.notice };
  return extra;
}

/** A2 → A3. Solo depende de lo escrito: la respuesta de Auth nunca cambia lo que ve la persona (FR-023). */
export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const name = text(form, "displayName");
  const email = text(form, "email").trim();
  const password = text(form, "password");
  const kept = { name, email };
  if (displayNameError(name)) return { ...kept, field: "name", error: copy.account.profile.errors.displayName };
  if (!email) return { ...kept, field: "email", error: copy.auth.signUp.missing };
  if ([...password].length < MIN_PASSWORD) return { ...kept, field: "password", error: copy.auth.signUp.weakPassword };
  if (form.get("acknowledge") !== "on") return { ...kept, field: "acknowledge", error: copy.auth.signUp.missing };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name: normalizeDisplayName(name) }, emailRedirectTo: `${await siteUrl()}/auth/confirm?next=signup` },
  });
  const result = signUpResult(error);
  if (result.kind !== "redirect") return toState(result, kept);
  (await cookies()).set(PENDING_EMAIL, email, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 3600, secure: process.env.NODE_ENV === "production" });
  redirect(result.to);
}

/** A3 y A1c. El correo sale del formulario (A1c) o de la cookie del registro (A3). */
export async function resend(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email").trim() || (await cookies()).get(PENDING_EMAIL)?.value || "";
  // Sin correo conocido, el mismo aviso: no hay nada que distinguir.
  if (!email) return { notice: copy.auth.verifyEmail.resent };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${await siteUrl()}/auth/confirm?next=signup` } });
  return toState(resendResult(error), { email: text(form, "email") });
}

/** A1. Tras entrar, el perfil existe (FR-029) y la cookie del tema es la del perfil (R7). */
export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email").trim();
  const password = text(form, "password");
  const volver = safeReturnPath(text(form, "volver"));
  if (!email || !password) return { email, error: copy.auth.signIn.missing };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  const result = signInResult(error);
  if (result.kind !== "ok") return toState(result, { email });
  let firstEntryCompleted: boolean;
  try {
    const profile = await ensureProfile(supabase);
    (await cookies()).set(THEME_COOKIE, profile.theme, themeCookieOptions);
    firstEntryCompleted = profile.firstEntryCompleted;
  } catch {
    return { email, error: copy.auth.networkError };
  }
  // Navegación completa, no del router: la primera página de producto se carga de cero y el script bloqueante ya lee la
  // cookie del tema que se acaba de escribir, sin un cuadro del tema contrario (US-7.4, research R7).
  return { redirectTo: firstEntryCompleted ? volver : `/primera-entrada?volver=${encodeURIComponent(volver)}` };
}

/** A4 → A4b, siempre igual (US-1.5). */
export async function recover(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email").trim();
  if (!email) return { field: "email", error: copy.auth.recover.missing };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await siteUrl()}/auth/confirm?next=recovery` });
  return toState(recoverResult(error), { email });
}

/** A5, con la sesión de recuperación que creó /auth/confirm. F43-4: la acción lo vuelve a exigir (amr `recovery` reciente). */
export async function setNewPassword(_: FormState, form: FormData): Promise<FormState> {
  const password = text(form, "password");
  if ([...password].length < MIN_PASSWORD) return { field: "password", error: copy.auth.newPassword.weak };
  if (password !== text(form, "repeat")) return { field: "repeat", error: copy.auth.newPassword.mismatch };
  const supabase = await createClient();
  const claims = await getSessionClaims(supabase);
  if (!claims) redirect("/recuperar?enlace=caducado");
  if (!isRecentRecovery(claims)) redirect("/cuenta/seguridad");
  const { error } = await supabase.auth.updateUser({ password });
  const result = newPasswordResult(error);
  if (result.kind === "redirect") redirect(result.to);
  if (result.kind !== "ok") return toState(result);
  redirect("/");
}

/** S1 → S3; S2 si falla. Borra la cookie del tema: sin sesión, el acceso sigue al sistema (caso límite). */
export async function signOut(): Promise<FormState> {
  const supabase = await createClient();
  let error: AuthErrorLike = null;
  try {
    ({ error } = await supabase.auth.signOut({ scope: "local" }));
  } catch {
    error = { name: "AuthRetryableFetchError" };
  }
  const result = signOutResult(error);
  if (result.kind !== "redirect") return toState(result);
  (await cookies()).delete(THEME_COOKIE);
  redirect(result.to);
}

/** A6 «Continuar»: solo «Empezar por mi cuenta» en P0-1 (Q6). */
export async function completeFirstEntryAction(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  try {
    await completeFirstEntry(supabase);
  } catch {
    return { error: copy.auth.networkError };
  }
  redirect(safeReturnPath(text(form, "volver")));
}
