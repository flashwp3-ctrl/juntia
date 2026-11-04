// T044 / FR-026 (research R5): preferencia de interfaz del selector Yo/Nosotros en este dispositivo.
// No es `scope` ni usa sus literales propuestos (FR-036; docs/GLOSSARY.md §10): no filtra ni autoriza nada.
export type ContextChoice = "me" | "us";

const KEY = "juntia:context";
const listeners = new Set<() => void>();

function parse(value: string | null): ContextChoice | null {
  return value === "me" || value === "us" ? value : null;
}

/** Lo recordado, o `null` si no hay nada legible o el almacenamiento no está disponible. Nunca reescribe. */
export function readStoredContext(): ContextChoice | null {
  try {
    return parse(window.localStorage.getItem(KEY));
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
  listeners.forEach((listener) => listener());
  return saved;
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
