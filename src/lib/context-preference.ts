// T044 / FR-026 (research R5): preferencia de interfaz del selector Yo/Nosotros en este dispositivo.
// No es `scope` ni usa sus literales propuestos (FR-036; docs/GLOSSARY.md §10): no filtra ni autoriza nada.
import { cookieSecure } from "./cookie-security";

export type ContextChoice = "me" | "us";

const KEY = "juntia:context";
/**
 * F44-1 (revisión del PR #44): copia de la misma preferencia en una cookie del dispositivo, `me` o `us`, como
 * `juntia_theme`. Solo sirve para que el servidor no consulte ni construya la vista privada cuando el contexto es
 * Nosotros. No es `scope`, no autoriza nada, no se guarda en el servidor ni se sincroniza entre dispositivos (FR-026 de
 * la 001): el servidor solo la lee en cada petición.
 */
export const CONTEXT_COOKIE = "juntia_context";
const CONTEXT_MAX_AGE = 60 * 60 * 24 * 365;
const listeners = new Set<() => void>();

export function parseContextChoice(value: string | null | undefined): ContextChoice | null {
  return value === "me" || value === "us" ? value : null;
}

/** Lo recordado, o `null` si no hay nada legible o el almacenamiento no está disponible. Nunca reescribe. */
export function readStoredContext(): ContextChoice | null {
  try {
    return parseContextChoice(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

/**
 * Guarda la elección y la copia a `<html data-context>`. Sin almacenamiento, no lanza: la visita sigue sin recordar.
 * Devuelve si quedó guardada, para que la elección de la visita prevalezca cuando no (F19-2).
 */
export function writeStoredContext(value: ContextChoice): boolean {
  let saved = true;
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Navegación privada, cuota agotada o almacenamiento bloqueado: el proveedor conserva la elección durante la visita.
    saved = false;
  }
  document.documentElement.setAttribute("data-context", value);
  writeContextCookie(value);
  listeners.forEach((listener) => listener());
  return saved;
}

/** La cookie que lee el servidor; se reescribe solo si no dice ya lo mismo. */
export function writeContextCookie(value: ContextChoice) {
  if (readContextCookie() === value) return;
  const secure = cookieSecure(window.location.hostname) ? "; Secure" : "";
  document.cookie = `${CONTEXT_COOKIE}=${value}; Path=/; Max-Age=${CONTEXT_MAX_AGE}; SameSite=Lax${secure}`;
}

export function readContextCookie(): ContextChoice | null {
  const match = document.cookie.match(/(?:^|;\s*)juntia_context=([^;]*)/);
  return parseContextChoice(match?.[1]);
}

// Suscripción para useSyncExternalStore: cambios propios y de otras pestañas del mismo dispositivo.
export function subscribeStoredContext(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === KEY) listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Instantánea del servidor: sin acceso al dispositivo, «Yo» (decisión 10). */
export const serverStoredContext = (): ContextChoice | null => null;
