// FR-049, FR-053; research R4: dos barreras puras, evaluadas por petición desde la página interna.
// No importa server-only para que Vitest pueda probarlas (plan, F12-3).
export type Env = Readonly<Record<string, string | undefined>>;

// Minúsculas, sin puerto ni punto final; vacío se trata como ausente.
function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

// Primera barrera: destino de despliegue. Cerrada por defecto.
export function isInternalSurfaceEnabled(env: Env): boolean {
  if (env.VERCEL_ENV === "production") return false; // nunca, ni con la bandera
  if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") return true;
  if (env.NODE_ENV === "development") return true; // `next dev`: nunca es un despliegue
  return env.JUNTIA_INTERNAL_SURFACE === "1"; // CI y capturas locales, explícito
}

// Segunda barrera: en un preview, solo las URL generadas del propio despliegue o de su rama.
export function isAllowedInternalHost(host: string | null | undefined, env: Env): boolean {
  if (env.VERCEL_ENV !== "preview") return true;
  const requested = normalizeHost(host);
  if (!requested) return false;
  if (requested === normalizeHost(env.VERCEL_PROJECT_PRODUCTION_URL)) return false; // cinturón
  return [env.VERCEL_URL, env.VERCEL_BRANCH_URL].map(normalizeHost).filter(Boolean).includes(requested);
}
