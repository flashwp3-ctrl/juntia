// F43-4 (revisión del PR #43): A5 (/nueva-contrasena) solo con una sesión de recuperación reciente. La página y la Server
// Action lo exigen en el servidor con los claims validados (getClaims): el método `recovery` en `amr`, de hace como
// mucho una hora, la vida del enlace (`otp_expiry = 3600` en config.toml y el valor por defecto de los proyectos).
export const RECOVERY_WINDOW_SECONDS = 3600;

type AmrEntry = { method?: unknown; timestamp?: unknown };

export function isRecentRecovery(claims: { amr?: unknown } | null | undefined, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!claims || !Array.isArray(claims.amr)) return false;
  return (claims.amr as AmrEntry[]).some(({ method, timestamp }) =>
    method === "recovery" && typeof timestamp === "number" && nowSeconds - timestamp <= RECOVERY_WINDOW_SECONDS);
}
