// F43-1, tercera ronda (revisión del PR #43): el guardado del tema vive en un controlador a nivel de módulo, no en la
// instancia de ThemeSelector, para que sobreviva a la navegación entre páginas de Mi cuenta (desmontar y volver a
// montar). Reglas:
// - como mucho una escritura en vuelo; la elección más reciente espera su turno («última elección pendiente») y las
//   intermedias se descartan;
// - cada escritura correcta actualiza el tema confirmado, aunque ya no sea la última elección;
// - solo el controlador aplica `data-theme`, escribe la cookie y revierte; ningún callback de una instancia vieja;
// - un rechazo de `persist` cuenta como fallo, y el estado de escritura se libera siempre (finally).
// El módulo dura lo que dura la página: una carga completa (entrar, cambiar de cuenta) lo reinicia.
import { applyTheme, writeThemeCookie, type Theme } from "@/lib/theme";
import type { AccountActionResult } from "./types";

export type ThemeProblem = "failed" | "sessionExpired" | null;
export type ThemeState = { value: Theme; problem: ThemeProblem };
type Persist = (theme: Theme) => Promise<AccountActionResult>;

function createThemeController() {
  let initialized = false;
  let chosen = false;
  let confirmed: Theme = "system";
  let state: ThemeState = { value: "system", problem: null };
  let inFlight = false;
  let pending: Theme | null = null;
  const listeners = new Set<() => void>();

  const set = (next: ThemeState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  const show = (theme: Theme, problem: ThemeProblem) => {
    applyTheme(theme);
    writeThemeCookie(theme);
    set({ value: theme, problem });
  };

  async function save(theme: Theme, persist: Persist) {
    inFlight = true;
    let result: AccountActionResult;
    try {
      result = await persist(theme);
    } catch {
      result = { ok: false, error: "failed" };
    } finally {
      inFlight = false;
    }
    if (result.ok) confirmed = theme;
    const next = pending;
    pending = null;
    if (next !== null && next !== theme) {
      // Una elección más reciente decide el resultado final: se guarda ella.
      void save(next, persist);
      return;
    }
    if (result.ok) set({ value: state.value, problem: null });
    // La sesión caducó: el dispositivo conserva la elección y se pide volver a entrar (T048).
    else if (result.error === "sessionExpired") set({ value: state.value, problem: "sessionExpired" });
    // Cualquier otro fallo no se muestra como éxito: data-theme, cookie y selección vuelven al último confirmado.
    else show(confirmed, "failed");
  }

  return {
    /** Primera instancia de la página: toma el tema del perfil. Después, el controlador sabe más que el servidor. */
    adopt(initial: Theme) {
      if (initialized) return;
      initialized = true;
      confirmed = initial;
      state = { value: initial, problem: null };
    },
    choose(theme: Theme, persist: Persist) {
      chosen = true;
      show(theme, null);
      if (inFlight) pending = theme;
      else void save(theme, persist);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getState: () => state,
    /** Hubo una elección en esta página: el controlador manda sobre el tema que traiga el servidor. */
    hasChoice: () => chosen,
  };
}

let controller = createThemeController();
export const themeController = () => controller;
/** Solo para pruebas: un controlador nuevo. */
export function resetThemeController() {
  controller = createThemeController();
}
