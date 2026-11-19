// T046 / FR-052; research R7 y R8.6. La cookie `juntia_theme` (`light | dark | system`), `Path=/`, `SameSite=Lax`,
// un año, sin `HttpOnly` porque el script bloqueante la lee con `document.cookie`. No es un dato sensible.
import { cookieSecure } from "./cookie-security";

export const THEME_COOKIE = "juntia_theme";
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

export const isTheme = (value: unknown): value is Theme => typeof value === "string" && (THEMES as readonly string[]).includes(value);

/** Opciones de la cookie para `cookies().set` en el servidor (acción de entrar y `/auth/confirm`), con el host de la petición. */
export const themeCookieOptions = (host: string | null | undefined) => ({ path: "/", sameSite: "lax", maxAge: THEME_MAX_AGE, httpOnly: false, secure: cookieSecure(host) }) as const;

/** Navegador: pone `data-theme` como lo haría el script bloqueante. `system` sigue a `prefers-color-scheme`. */
export function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

/** Navegador: escribe la cookie que leerá el script bloqueante en la próxima carga. */
export function writeThemeCookie(theme: Theme) {
  const secure = cookieSecure(window.location.hostname) ? "; Secure" : "";
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${THEME_MAX_AGE}; SameSite=Lax${secure}`;
}

export function readThemeCookie(): Theme | null {
  const match = document.cookie.match(/(?:^|;\s*)juntia_theme=([^;]*)/);
  return match && isTheme(match[1]) ? match[1] : null;
}
