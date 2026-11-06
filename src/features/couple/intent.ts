// T031, T033, T034 / FR-012, FR-012a, FR-014; contracts/server-actions.md §2–§3; research R3 y R5. Lo que el navegador
// guarda de una invitación:
// - Quien invita: la pareja (clave, token) de cada intención de «Crear invitación» o «Generar enlace nuevo», en
//   sessionStorage mientras dura. El token lo genera el navegador (32 bytes, base64url); la Server Action solo calcula su
//   SHA-256 y la base guarda solo el hash. Un reintento con la misma clave manda el mismo token y muestra el mismo enlace.
// - Quien recibe: `localStorage["juntia:invitation"]` = {token, savedAt}, leído del fragmento `#t=…`, que el navegador
//   nunca envía al servidor. Se borra al aceptar, al ver M7, con «Ahora no», al cerrar sesión y con 7 días o más.
import { newIdempotencyKey } from "@/features/expenses/idempotency";

export const INVITATION_INTENT_KEY = "juntia:invitation";
export const INTENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** 32 bytes de `crypto.getRandomValues` en base64url sin relleno: 43 caracteres. */
export function newInvitationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const isInvitationToken = (value: unknown): value is string => typeof value === "string" && TOKEN.test(value);

/** `https://<host>/invitacion#t=<token>`: el token en el fragmento (contracts §2). */
export const invitationLink = (origin: string, token: string) => `${origin}/invitacion#t=${token}`;

export type TokenPair = { key: string; token: string };
const pairKey = (kind: "create" | "regenerate") => `juntia:invitation-write:${kind}`;

/** La pareja (clave, token) de una intención de quien invita. `begin` abre una intención nueva; `end` la cierra. */
export function tokenIntent(kind: "create" | "regenerate") {
  return {
    begin(): TokenPair {
      const pair = { key: newIdempotencyKey(), token: newInvitationToken() };
      try { window.sessionStorage.setItem(pairKey(kind), JSON.stringify(pair)); } catch { /* sin almacenamiento: vive en memoria */ }
      return pair;
    },
    current(): TokenPair | null {
      try {
        const raw = window.sessionStorage.getItem(pairKey(kind));
        const pair = raw ? (JSON.parse(raw) as Partial<TokenPair>) : null;
        return pair && typeof pair.key === "string" && isInvitationToken(pair.token) ? { key: pair.key, token: pair.token } : null;
      } catch {
        return null;
      }
    },
    end() {
      try { window.sessionStorage.removeItem(pairKey(kind)); } catch { /* nada que borrar */ }
    },
  };
}

/** Lee `#t=` de la URL actual, lo guarda con su fecha y limpia el fragmento sin navegar. */
export function captureInvitationFragment(now = Date.now()) {
  const match = window.location.hash.match(/^#t=(.*)$/);
  if (!match) return;
  if (isInvitationToken(match[1])) {
    try { window.localStorage.setItem(INVITATION_INTENT_KEY, JSON.stringify({ token: match[1], savedAt: now })); } catch { /* sin almacenamiento */ }
  }
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

export function clearInvitationIntent() {
  try { window.localStorage.removeItem(INVITATION_INTENT_KEY); } catch { /* nada que borrar */ }
}

/** El token de la intención vigente, o `null`. Una entrada vencida (7 días o más) o ilegible se borra al leerla. */
export function readInvitationIntent(now = Date.now()): string | null {
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(INVITATION_INTENT_KEY); } catch { return null; }
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as { token?: unknown; savedAt?: unknown };
    if (isInvitationToken(value.token) && typeof value.savedAt === "number" && now - value.savedAt < INTENT_MAX_AGE_MS && now >= value.savedAt) return value.token;
  } catch { /* ilegible */ }
  clearInvitationIntent();
  return null;
}
