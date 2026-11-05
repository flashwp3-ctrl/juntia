// Enmienda del 5 de noviembre de 2026 (decisión de Alejandro, «Adaptar la app»): en los proyectos alojados en Free no se
// pueden editar las plantillas de correo sin SMTP propio, así que el enlace llega por /auth/v1/verify →
// /auth/confirm?next=…&code=… (PKCE). En el Supabase local de CI llega con token_hash + type. /auth/confirm acepta los
// dos. Caducado, usado o abierto en otro navegador (sin el verificador PKCE) → copy existente; ningún dato de la cuenta.
import { AuthApiError, AuthPKCECodeVerifierMissingError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { linkNoticeFromHash, resolveConfirm, type ConfirmAuth } from "./confirm";

const ok = { error: null };
const expired = { error: new AuthApiError("Email link is invalid or has expired", 403, "otp_expired") };
function auth(over: Partial<ConfirmAuth> = {}): ConfirmAuth {
  return { verifyOtp: vi.fn().mockResolvedValue(ok), exchangeCodeForSession: vi.fn().mockResolvedValue(ok), ...over };
}
const input = (params: Record<string, string>) => new URLSearchParams(params);

describe("/auth/confirm · camino token_hash (Supabase local con las plantillas del repo)", () => {
  it("verificación y recuperación válidas", async () => {
    expect(await resolveConfirm(input({ token_hash: "h", type: "signup" }), auth())).toEqual({ to: "/entrar?aviso=verificado", session: "signup" });
    expect(await resolveConfirm(input({ token_hash: "h", type: "email" }), auth())).toEqual({ to: "/entrar?aviso=verificado", session: "signup" });
    expect(await resolveConfirm(input({ token_hash: "h", type: "recovery" }), auth())).toEqual({ to: "/nueva-contrasena", session: "recovery" });
  });
  it("caducado o usado → aviso de enlace caducado, sin sesión", async () => {
    for (const type of ["signup", "recovery"]) {
      expect(await resolveConfirm(input({ token_hash: "h", type }), auth({ verifyOtp: vi.fn().mockResolvedValue(expired) }))).toEqual({ to: "/recuperar?enlace=caducado", session: null });
    }
  });
});

describe("/auth/confirm · camino code (plantilla por defecto de los proyectos alojados)", () => {
  it("canjea el code con el verificador del mismo navegador", async () => {
    const exchange = vi.fn().mockResolvedValue(ok);
    expect(await resolveConfirm(input({ next: "signup", code: "c" }), auth({ exchangeCodeForSession: exchange }))).toEqual({ to: "/entrar?aviso=verificado", session: "signup" });
    expect(exchange).toHaveBeenCalledWith("c");
    expect(await resolveConfirm(input({ next: "recovery", code: "c" }), auth())).toEqual({ to: "/nueva-contrasena", session: "recovery" });
  });
  it("Auth devuelve el error en la URL (caducado o ya usado) → aviso de enlace caducado", async () => {
    for (const next of ["signup", "recovery"]) {
      const exchange = vi.fn();
      expect(await resolveConfirm(input({ next, error: "access_denied", error_code: "otp_expired", error_description: "Email link is invalid or has expired" }), auth({ exchangeCodeForSession: exchange }))).toEqual({ to: "/recuperar?enlace=caducado", session: null });
      expect(exchange).not.toHaveBeenCalled();
    }
  });
  it("otro navegador: el registro ya quedó verificado en /auth/v1/verify → Entrar con el aviso; la recuperación no tiene sesión → caducado", async () => {
    const missing = vi.fn().mockResolvedValue({ error: new AuthPKCECodeVerifierMissingError() });
    expect(await resolveConfirm(input({ next: "signup", code: "c" }), auth({ exchangeCodeForSession: missing }))).toEqual({ to: "/entrar?aviso=verificado", session: null });
    expect(await resolveConfirm(input({ next: "recovery", code: "c" }), auth({ exchangeCodeForSession: missing }))).toEqual({ to: "/recuperar?enlace=caducado", session: null });
    const thrown = vi.fn().mockRejectedValue(new AuthPKCECodeVerifierMissingError());
    expect(await resolveConfirm(input({ next: "signup", code: "c" }), auth({ exchangeCodeForSession: thrown }))).toEqual({ to: "/entrar?aviso=verificado", session: null });
  });
  it("un code que no se puede canjear por otro motivo → caducado", async () => {
    const invalid = vi.fn().mockResolvedValue({ error: new AuthApiError("invalid flow state, no valid flow state found", 404, "flow_state_not_found") });
    expect(await resolveConfirm(input({ next: "signup", code: "c" }), auth({ exchangeCodeForSession: invalid }))).toEqual({ to: "/recuperar?enlace=caducado", session: null });
  });
  it("sin parámetros legibles por el servidor (flujo implícito del reenvío: todo va en el #) → Entrar lee el fragmento", async () => {
    expect(await resolveConfirm(input({ next: "signup" }), auth())).toEqual({ to: "/entrar?aviso=enlace", session: null });
    expect(await resolveConfirm(input({ next: "recovery" }), auth())).toEqual({ to: "/recuperar?enlace=caducado", session: null });
    expect(await resolveConfirm(input({}), auth())).toEqual({ to: "/recuperar?enlace=caducado", session: null });
    expect(await resolveConfirm(input({ next: "otra", code: "c" }), auth())).toEqual({ to: "/recuperar?enlace=caducado", session: null });
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
