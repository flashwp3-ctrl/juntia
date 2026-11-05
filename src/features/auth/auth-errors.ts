// T039 / FR-023 (enmendado, decisión 16.16); contracts/errors.md, «Supabase Auth». Traduce cada respuesta de Supabase
// Auth al resultado de interfaz. Sin enumeración en pantalla: respuestas distintas de la API dan la misma salida. El
// código de Auth y su `msg` en inglés nunca salen de aquí.
import { copy } from "@/lib/copy/es";

/** Lo mínimo de un `AuthError` de supabase-js que se lee. */
export type AuthErrorLike = { name?: string; code?: string; status?: number } | null | undefined;

export type AuthResult =
  | { kind: "ok" }
  | { kind: "redirect"; to: string }
  | { kind: "notice"; notice: string }
  | { kind: "error"; error: string; field?: "password"; resend?: boolean };

const VERIFY_EMAIL = "/verificar-correo";
const LINK_EXPIRED = "/recuperar?enlace=caducado";

// AuthRetryableFetchError: fetch caído (status 0) o 502/503/504 del proveedor. Es el estado A1d.
const isNetwork = (error: AuthErrorLike) => error?.name === "AuthRetryableFetchError";
const networkError = { kind: "error", error: copy.auth.networkError } as const;

/** A2 → A3. 200, 403 del hook, 422 de cuenta existente, 429 y cualquier otra respuesta del servidor dan A3. */
export function signUpResult(error: AuthErrorLike): AuthResult {
  if (isNetwork(error)) return networkError;
  // Depende solo de la contraseña escrita, no del correo: no enumera.
  if (error?.code === "weak_password") return { kind: "error", field: "password", error: copy.auth.signUp.weakPassword };
  return { kind: "redirect", to: VERIFY_EMAIL };
}

/** A3 y A1c «Reenviar enlace»: el mismo aviso, que ya pide intentarlo más tarde. */
export function resendResult(error: AuthErrorLike): AuthResult {
  if (isNetwork(error)) return networkError;
  return { kind: "notice", notice: copy.auth.verifyEmail.resent };
}

/** A1: A1b sin decir cuál de los dos falló, A1c con reenvío y A1d. */
export function signInResult(error: AuthErrorLike): AuthResult {
  if (!error) return { kind: "ok" };
  if (isNetwork(error)) return networkError;
  if (error.code === "invalid_credentials") return { kind: "error", error: copy.auth.signIn.invalidCredentials };
  if (error.code === "email_not_confirmed") return { kind: "error", error: copy.auth.signIn.notVerified, resend: true };
  return { kind: "error", error: copy.errors.unexpected };
}

/** A4 → A4b, exista o no la cuenta (US-1.5). */
export function recoverResult(error: AuthErrorLike): AuthResult {
  if (isNetwork(error)) return networkError;
  return { kind: "notice", notice: copy.auth.recover.sent };
}

/** `/auth/confirm`: verificación → A1 con aviso; recuperación → A5; caducado, usado o incompleto → A4 con aviso. */
export function confirmResult(type: string | null, error: AuthErrorLike): AuthResult {
  if (error || !type) return { kind: "redirect", to: LINK_EXPIRED };
  if (type === "signup" || type === "email") return { kind: "redirect", to: "/entrar?aviso=verificado" };
  if (type === "recovery") return { kind: "redirect", to: "/nueva-contrasena" };
  return { kind: "redirect", to: LINK_EXPIRED };
}

/** A5. Sin la sesión de recuperación, el enlace ya no sirve: se pide otro. */
export function newPasswordResult(error: AuthErrorLike): AuthResult {
  if (!error) return { kind: "ok" };
  if (isNetwork(error)) return networkError;
  if (error.code === "weak_password") return { kind: "error", field: "password", error: copy.auth.newPassword.weak };
  if (error.code === "same_password") return { kind: "error", field: "password", error: copy.auth.newPassword.same };
  if (error.name === "AuthSessionMissingError" || error.status === 401 || error.code === "session_not_found") return { kind: "redirect", to: LINK_EXPIRED };
  return { kind: "error", error: copy.errors.unexpected };
}

/** S1 → S3 en Entrar; S2 si falla. */
export function signOutResult(error: AuthErrorLike): AuthResult {
  if (error) return { kind: "error", error: copy.account.security.signOutFailed };
  return { kind: "redirect", to: "/entrar?aviso=sesion-cerrada" };
}
