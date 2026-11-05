// T039 / FR-023 (enmendado, decisión 16.16); US-1.2, US-1.5; contracts/errors.md, «Supabase Auth»:
// «`signUp` → 200, 403 del hook (correo no permitido), 422 `user_already_exists`, 429 `over_email_send_rate_limit` →
// Siempre A3 "Verifica tu correo", con el mismo texto» y «`resetPasswordForEmail` → 200, 429 o cualquier correo →
// Siempre A4b». «El código de Auth y su `msg` en inglés nunca se muestran».
import { describe, expect, it } from "vitest";
import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError, AuthWeakPasswordError } from "@supabase/supabase-js";
import { copy } from "@/lib/copy/es";
import { confirmResult, newPasswordResult, recoverResult, resendResult, signInResult, signOutResult, signUpResult } from "./auth-errors";

const hook403 = new AuthApiError("No fue posible completar el registro.", 403, "unknown");
const exists422 = new AuthApiError("User already registered", 422, "user_already_exists");
const rate429 = new AuthApiError("For security purposes, you can only request this after 0 seconds.", 429, "over_email_send_rate_limit");
const network = new AuthRetryableFetchError("Failed to fetch", 0);
const weak = new AuthWeakPasswordError("Password should be at least 8 characters.", 422, ["length"]);

describe("registro (A2 → A3) sin enumeración", () => {
  it("200, 403 del hook, 422 de cuenta existente y 429 producen exactamente la misma salida", () => {
    const outputs = [null, hook403, exists422, rate429].map(signUpResult);
    for (const output of outputs) expect(output).toEqual(outputs[0]);
    expect(outputs[0]).toEqual({ kind: "redirect", to: "/verificar-correo" });
  });
  it("la contraseña débil depende solo de lo escrito y se muestra en el campo", () => {
    expect(signUpResult(weak)).toEqual({ kind: "error", field: "password", error: copy.auth.signUp.weakPassword });
  });
  it("el error de red es A1d, sin texto técnico", () => {
    expect(signUpResult(network)).toEqual({ kind: "error", error: copy.auth.networkError });
  });
  it("cualquier otra respuesta también termina en A3, para no enumerar por descarte", () => {
    expect(signUpResult(new AuthApiError("Database error saving new user", 500, "unexpected_failure"))).toEqual(signUpResult(null));
  });
});

describe("reenvío (A3, A1c)", () => {
  it("200 y 429 dan el mismo aviso uniforme", () => {
    expect(resendResult(null)).toEqual({ kind: "notice", notice: copy.auth.verifyEmail.resent });
    expect(resendResult(rate429)).toEqual(resendResult(null));
    expect(resendResult(hook403)).toEqual(resendResult(null));
  });
});

describe("entrar (A1)", () => {
  it("traduce credenciales, cuenta sin verificar y red", () => {
    expect(signInResult(null)).toEqual({ kind: "ok" });
    expect(signInResult(new AuthApiError("Invalid login credentials", 400, "invalid_credentials"))).toEqual({ kind: "error", error: copy.auth.signIn.invalidCredentials });
    expect(signInResult(new AuthApiError("Email not confirmed", 400, "email_not_confirmed"))).toEqual({ kind: "error", error: copy.auth.signIn.notVerified, resend: true });
    expect(signInResult(network)).toEqual({ kind: "error", error: copy.auth.networkError });
    expect(signInResult(new AuthApiError("Request rate limit reached", 429, "over_request_rate_limit"))).toEqual({ kind: "error", error: copy.errors.unexpected });
  });
});

describe("recuperar (A4 → A4b)", () => {
  it("siempre el mismo enlace enviado, exista o no la cuenta", () => {
    const outputs = [null, rate429, hook403, new AuthApiError("User not found", 400, "user_not_found")].map(recoverResult);
    for (const output of outputs) expect(output).toEqual({ kind: "notice", notice: copy.auth.recover.sent });
    expect(recoverResult(network)).toEqual({ kind: "error", error: copy.auth.networkError });
  });
});

describe("enlace de /auth/confirm", () => {
  it("verificación válida → A1 con aviso; recuperación válida → A5; caducado o usado → A4 sin datos", () => {
    expect(confirmResult("signup", null)).toEqual({ kind: "redirect", to: "/entrar?aviso=verificado" });
    expect(confirmResult("email", null)).toEqual({ kind: "redirect", to: "/entrar?aviso=verificado" });
    expect(confirmResult("recovery", null)).toEqual({ kind: "redirect", to: "/nueva-contrasena" });
    const expired = new AuthApiError("Email link is invalid or has expired", 403, "otp_expired");
    for (const type of ["signup", "recovery", "email"] as const) expect(confirmResult(type, expired)).toEqual({ kind: "redirect", to: "/recuperar?enlace=caducado" });
    expect(confirmResult(null, null)).toEqual({ kind: "redirect", to: "/recuperar?enlace=caducado" });
  });
});

describe("contraseña nueva (A5) y cerrar sesión", () => {
  it("valida contraseña débil, igual o sesión de recuperación perdida", () => {
    expect(newPasswordResult(null)).toEqual({ kind: "ok" });
    expect(newPasswordResult(weak)).toEqual({ kind: "error", field: "password", error: copy.auth.newPassword.weak });
    expect(newPasswordResult(new AuthApiError("New password should be different from the old password.", 422, "same_password"))).toEqual({ kind: "error", field: "password", error: copy.auth.newPassword.same });
    expect(newPasswordResult(new AuthSessionMissingError())).toEqual({ kind: "redirect", to: "/recuperar?enlace=caducado" });
    expect(newPasswordResult(network)).toEqual({ kind: "error", error: copy.auth.networkError });
  });
  it("S2 si el cierre falla", () => {
    expect(signOutResult(null)).toEqual({ kind: "redirect", to: "/entrar?aviso=sesion-cerrada" });
    expect(signOutResult(network)).toEqual({ kind: "error", error: copy.account.security.signOutFailed });
  });
  it("ningún resultado contiene el mensaje en inglés de Auth", () => {
    const all = JSON.stringify([hook403, exists422, rate429, network, weak].flatMap((error) => [signUpResult(error), resendResult(error), signInResult(error), recoverResult(error), newPasswordResult(error)]));
    for (const english of ["User already registered", "For security purposes", "Failed to fetch", "Password should be"]) expect(all).not.toContain(english);
  });
});
