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

export type CreatePayload = { idempotencyKey: string; email: string; token: string };
export type RegeneratePayload = { idempotencyKey: string; groupId: string; expectedVersion: number; token: string };
type PayloadOf<K extends "create" | "regenerate"> = K extends "create" ? CreatePayload : RegeneratePayload;

function validPayload(kind: "create" | "regenerate", value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  if (typeof payload.idempotencyKey !== "string" || !isInvitationToken(payload.token)) return false;
  return kind === "create" ? typeof payload.email === "string" : typeof payload.groupId === "string" && Number.isInteger(payload.expectedVersion);
}

/**
 * La intención de quien invita (crear o regenerar). F55-3 (segunda ronda del PR #55):
 * - `begin` crea en memoria una clave y un token nuevos para una apertura de la hoja;
 * - `save` guarda en sessionStorage la carga enviada (clave, token y lo demás) mientras no haya resultado definitivo;
 * - `pending` devuelve esa carga para reanudarla tras recargar, como `unknown`; con 7 días o más (el token ya no
 *   serviría) o ilegible, se borra al leerla;
 * - `end` la borra, con un resultado definitivo (ok o rechazo) o al cerrar sin haber enviado nada.
 * Cerrar sesión borra las dos (ForgetInvitationIntent).
 */
export function tokenIntent<K extends "create" | "regenerate">(kind: K) {
  const end = () => { try { window.sessionStorage.removeItem(pairKey(kind)); } catch { /* nada que borrar */ } };
  return {
    begin(): TokenPair {
      return { key: newIdempotencyKey(), token: newInvitationToken() };
    },
    save(payload: PayloadOf<K>) {
      try { window.sessionStorage.setItem(pairKey(kind), JSON.stringify({ savedAt: Date.now(), payload })); } catch { /* sin almacenamiento: vive en memoria */ }
    },
    pending(now = Date.now()): { payload: PayloadOf<K> } | null {
      let raw: string | null = null;
      try { raw = window.sessionStorage.getItem(pairKey(kind)); } catch { return null; }
      if (raw === null) return null;
      try {
        const record = JSON.parse(raw) as { savedAt?: unknown; payload?: unknown };
        if (typeof record.savedAt === "number" && now - record.savedAt < INTENT_MAX_AGE_MS && validPayload(kind, record.payload)) {
          return { payload: record.payload as PayloadOf<K> };
        }
      } catch { /* ilegible */ }
      end();
      return null;
    },
    end,
  };
}

/** Cerrar sesión: ningún par de quien invita sobrevive en esta pestaña. */
export function clearInvitationWrites() {
  tokenIntent("create").end();
  tokenIntent("regenerate").end();
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
