// Enmienda del 5 de noviembre de 2026 (decisión de Alejandro, «Adaptar la app»): en los proyectos alojados en Free no se
// pueden editar las plantillas de correo sin SMTP propio, así que el enlace llega por /auth/v1/verify →
// /auth/confirm?next=…&code=… (PKCE). En el Supabase local de CI llega con token_hash + type. /auth/confirm acepta los
// dos. Caducado, usado o abierto en otro navegador (sin el verificador PKCE) → copy existente; ningún dato de la cuenta.
// F43-3 (revisión del PR #43): con una sesión establecida, el flujo lo decide el claim `amr` de esa sesión (`recovery`
// o no), nunca `next` ni `type` de la URL, que cualquiera puede cambiar. `next` solo orienta cuando no hay sesión.
import { AuthApiError, AuthPKCECodeVerifierMissingError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { linkNoticeFromHash, resolveConfirm, type ConfirmAuth } from "./confirm";

const ok = { error: null };
const expired = { error: new AuthApiError("Email link is invalid or has expired", 403, "otp_expired") };
const SIGNUP = ["email/signup"];
const RECOVERY = ["recovery"];
function auth(methods: string[], over: Partial<ConfirmAuth> = {}): ConfirmAuth {
  return { verifyOtp: vi.fn().mockResolvedValue(ok), exchangeCodeForSession: vi.fn().mockResolvedValue(ok), authMethods: vi.fn().mockResolvedValue(methods), ...over };
}
const input = (params: Record<string, string>) => new URLSearchParams(params);
const VERIFIED = { to: "/entrar?aviso=verificado", session: "signup" };
const NEW_PASSWORD = { to: "/nueva-contrasena", session: "recovery" };
const EXPIRED = { to: "/recuperar?enlace=caducado", session: null };

describe("/auth/confirm · camino token_hash (Supabase local con las plantillas del repo)", () => {
  // Observado en el GoTrue del runner (gate de 9eca9e6): verifyOtp firma la sesión con amr «otp» para cualquier tipo, así
  // que aquí el amr no distingue. El type sí es fiable: GoTrue busca el token_hash en la columna de su tipo y un type
  // cambiado no verifica (sale caducado).
  it("verificación y recuperación válidas: amr «otp» y el type que GoTrue ya verificó", async () => {
    expect(await resolveConfirm(input({ token_hash: "h", type: "signup" }), auth(["otp"]))).toEqual(VERIFIED);
    expect(await resolveConfirm(input({ token_hash: "h", type: "email" }), auth(["otp"]))).toEqual(VERIFIED);
    expect(await resolveConfirm(input({ token_hash: "h", type: "recovery" }), auth(["otp"]))).toEqual(NEW_PASSWORD);
  });
  it("caducado o usado → aviso de enlace caducado, sin sesión", async () => {
    for (const type of ["signup", "recovery"]) {
      expect(await resolveConfirm(input({ token_hash: "h", type }), auth(SIGNUP, { verifyOtp: vi.fn().mockResolvedValue(expired) }))).toEqual(EXPIRED);
    }
  });
});

describe("/auth/confirm · camino code (plantilla por defecto de los proyectos alojados)", () => {
  it("canjea el code con el verificador del mismo navegador", async () => {
    const exchange = vi.fn().mockResolvedValue(ok);
    expect(await resolveConfirm(input({ next: "signup", code: "c" }), auth(SIGNUP, { exchangeCodeForSession: exchange }))).toEqual(VERIFIED);
    expect(exchange).toHaveBeenCalledWith("c");
    expect(await resolveConfirm(input({ next: "recovery", code: "c" }), auth(RECOVERY))).toEqual(NEW_PASSWORD);
  });
  it("F43-3: next no decide el flujo de una sesión; lo decide su amr", async () => {
    // Un code de registro con next=recovery sigue siendo un registro: se cierra la sesión y no se llega a A5.
    expect(await resolveConfirm(input({ next: "recovery", code: "c" }), auth(SIGNUP))).toEqual(VERIFIED);
    // Un code de recuperación con next=signup sigue siendo una recuperación: la sesión que A5 necesita se conserva.
    expect(await resolveConfirm(input({ next: "signup", code: "c" }), auth(RECOVERY))).toEqual(NEW_PASSWORD);
    // Por el camino token_hash, un type cambiado no verifica en GoTrue: sale caducado, nunca a A5.
    expect(await resolveConfirm(input({ token_hash: "h", type: "recovery" }), auth(["otp"], { verifyOtp: vi.fn().mockResolvedValue(expired) }))).toEqual(EXPIRED);
  });
  it("sin poder leer el amr de la sesión, la trata como registro (la cierra) y nunca da A5", async () => {
    expect(await resolveConfirm(input({ next: "recovery", code: "c" }), auth([]))).toEqual(VERIFIED);
    expect(await resolveConfirm(input({ next: "recovery", code: "c" }), auth(RECOVERY, { authMethods: vi.fn().mockRejectedValue(new Error("red")) }))).toEqual(VERIFIED);
  });
  it("Auth devuelve el error en la URL (caducado o ya usado) → aviso de enlace caducado", async () => {
    for (const next of ["signup", "recovery"]) {
      const exchange = vi.fn();
      expect(await resolveConfirm(input({ next, error: "access_denied", error_code: "otp_expired", error_description: "Email link is invalid or has expired" }), auth(SIGNUP, { exchangeCodeForSession: exchange }))).toEqual(EXPIRED);
      expect(exchange).not.toHaveBeenCalled();
    }
  });
  it("otro navegador (sin sesión): next solo orienta el aviso", async () => {
    const missing = vi.fn().mockResolvedValue({ error: new AuthPKCECodeVerifierMissingError() });
    expect(await resolveConfirm(input({ next: "signup", code: "c" }), auth(SIGNUP, { exchangeCodeForSession: missing }))).toEqual({ to: "/entrar?aviso=verificado", session: null });
    // Copy aprobado el 5 nov 2026 (Alejandro): la recuperación en otro navegador lo dice con su propio aviso.
    expect(await resolveConfirm(input({ next: "recovery", code: "c" }), auth(RECOVERY, { exchangeCodeForSession: missing }))).toEqual({ to: "/recuperar?enlace=otro-navegador", session: null });
    const thrown = vi.fn().mockRejectedValue(new AuthPKCECodeVerifierMissingError());
    expect(await resolveConfirm(input({ next: "signup", code: "c" }), auth(SIGNUP, { exchangeCodeForSession: thrown }))).toEqual({ to: "/entrar?aviso=verificado", session: null });
  });
  it("un code que no se puede canjear por otro motivo → caducado", async () => {
    const invalid = vi.fn().mockResolvedValue({ error: new AuthApiError("invalid flow state, no valid flow state found", 404, "flow_state_not_found") });
    expect(await resolveConfirm(input({ next: "signup", code: "c" }), auth(SIGNUP, { exchangeCodeForSession: invalid }))).toEqual(EXPIRED);
  });
  it("sin parámetros legibles por el servidor (flujo implícito del reenvío: todo va en el #) → Entrar lee el fragmento", async () => {
    expect(await resolveConfirm(input({ next: "signup" }), auth(SIGNUP))).toEqual({ to: "/entrar?aviso=enlace", session: null });
    expect(await resolveConfirm(input({ next: "recovery" }), auth(SIGNUP))).toEqual(EXPIRED);
    expect(await resolveConfirm(input({}), auth(SIGNUP))).toEqual(EXPIRED);
    expect(await resolveConfirm(input({ next: "otra", code: "c" }), auth(SIGNUP))).toEqual(EXPIRED);
  });
});

describe("fragmento del flujo implícito en Entrar", () => {
  it("token del registro → verificado; error → caducado; nada → sin aviso", () => {
    expect(linkNoticeFromHash("#access_token=a&expires_in=3600&refresh_token=r&token_type=bearer&type=signup")).toBe(copy.auth.signIn.verified);
    expect(linkNoticeFromHash("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid")).toBe(copy.auth.recover.linkExpired);
    expect(linkNoticeFromHash("")).toBeNull();
    expect(linkNoticeFromHash("#algo=1")).toBeNull();
  });
});
