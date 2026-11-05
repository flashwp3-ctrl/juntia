// T045 / FR-021; enmienda del 5 de noviembre de 2026 (decisión de Alejandro, «Adaptar la app»; quickstart §3, paso 1).
// El enlace de los correos de Auth llega por dos caminos:
// - token_hash + type: el Supabase local de CI, con las plantillas de supabase/templates (verifyOtp).
// - code (PKCE): los proyectos alojados en Free, que no permiten editar las plantillas sin SMTP propio. La plantilla por
//   defecto pasa por /auth/v1/verify, que verifica el correo y redirige a emailRedirectTo (/auth/confirm?next=…) con
//   ?code=…, o con ?error=… si el enlace caducó o ya se usó. El code solo se canjea en el navegador que guardó el
//   verificador PKCE (el del registro o la recuperación): limitación aceptada.
// Y un tercero sin nada legible por el servidor: «Reenviar enlace» no usa PKCE, así que su enlace vuelve con el resultado
// en el fragmento (#…); Entrar lo lee en el navegador (linkNoticeFromHash) y lo borra de la URL.
import { copy } from "@/lib/copy/es";

type Result = { error: { name?: string; code?: string } | null };
export type ConfirmAuth = {
  verifyOtp: (args: { token_hash: string; type: "signup" | "email" | "recovery" }) => Promise<Result>;
  exchangeCodeForSession: (code: string) => Promise<Result>;
  /** Métodos del claim `amr` de la sesión recién creada (getClaims). F43-3: la única autoridad sobre su flujo. */
  authMethods: () => Promise<string[]>;
};
/** `signup` o `recovery`: qué sesión quedó abierta (la de registro se cierra después de crear el perfil). */
export type ConfirmOutcome = { to: string; session: "signup" | "recovery" | null };

const VERIFIED = "/entrar?aviso=verificado";
const NEW_PASSWORD = "/nueva-contrasena";
const EXPIRED: ConfirmOutcome = { to: "/recuperar?enlace=caducado", session: null };
const success = (kind: "signup" | "recovery"): ConfirmOutcome => ({ to: kind === "signup" ? VERIFIED : NEW_PASSWORD, session: kind });

/**
 * F43-3 (revisión del PR #43): con una sesión ya establecida, el flujo lo decide su claim `amr`, no `next` ni `type` de la
 * URL, que se pueden cambiar. Una recuperación conserva la sesión y va a A5; cualquier otra (o si el amr no se puede
 * leer) se trata como verificación: se cierra la sesión y nunca se llega a A5.
 */
async function established(auth: ConfirmAuth): Promise<ConfirmOutcome> {
  let methods: string[] = [];
  try {
    methods = await auth.authMethods();
  } catch {
    methods = [];
  }
  return success(methods.includes("recovery") ? "recovery" : "signup");
}

const kindOf = (value: string | null) => (value === "signup" || value === "email" ? "signup" : value === "recovery" ? "recovery" : null);

export async function resolveConfirm(params: URLSearchParams, auth: ConfirmAuth): Promise<ConfirmOutcome> {
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (tokenHash && kindOf(type)) {
    const { error } = await auth.verifyOtp({ token_hash: tokenHash, type: type as "signup" | "email" | "recovery" });
    return error ? EXPIRED : established(auth);
  }

  // Sin sesión todavía, `next` solo orienta qué aviso mostrar (enlace implícito del reenvío, otro navegador).
  const kind = kindOf(params.get("next"));
  if (!kind || params.get("error") || params.get("error_code")) return EXPIRED;
  const code = params.get("code");
  if (!code) return kind === "signup" ? { to: "/entrar?aviso=enlace", session: null } : EXPIRED;

  let error: Result["error"];
  try {
    ({ error } = await auth.exchangeCodeForSession(code));
  } catch (caught) {
    error = caught as Result["error"];
  }
  if (!error) return established(auth);
  // Otro navegador: /auth/v1/verify ya confirmó el correo antes de redirigir; solo falta entrar con la contraseña. Una
  // recuperación sin sesión no puede crear la contraseña: dice que se abra en el mismo navegador o se pida otro.
  if (error.name === "AuthPKCECodeVerifierMissingError") return kind === "signup" ? { to: VERIFIED, session: null } : { to: "/recuperar?enlace=otro-navegador", session: null };
  return EXPIRED;
}

/** Aviso de Entrar a partir del fragmento del flujo implícito. Nunca usa los tokens: solo decide el texto. */
export function linkNoticeFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.get("error") || params.get("error_code")) return copy.auth.recover.linkExpired;
  if (params.get("access_token")) return copy.auth.signIn.verified;
  return null;
}
