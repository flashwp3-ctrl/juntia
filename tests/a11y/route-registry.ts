// T051 / FR-067; contracts/ci.md, «Axe: clasificación por la sesión que necesita el estado real». Un registro único con
// cada ruta y estado y la sesión que necesita su estado real. Sin sesión → job app; con sesión de usuario o de
// recuperación → job e2e. `needsAuthApi`: estados sin sesión que solo existen con la respuesta real de Auth (A1b, A1c,
// A4b); el job app no tiene Supabase, así que se auditan en e2e (interpretación de ejecución del PR B).
export const THEMES = ["light", "dark"] as const;
export type Session = "none" | "user" | "recovery";
/** Lo que hace el recorrido antes de pasar axe, para llegar al estado. */
export type Prepare = "networkError" | "invalidCredentials" | "unverified" | "signUpInvalid" | "recoverSent" | "sessionExpired" | "exportSheet";
export type RouteEntry = {
  route: string;
  state: string;
  path: string;
  session: Session;
  needsAuthApi?: boolean;
  prepare?: Prepare;
  /** A6 necesita una cuenta que todavía no completó la primera entrada. */
  firstEntryPending?: boolean;
  status?: number;
  themes?: readonly (typeof THEMES)[number][];
};

export const registry: readonly RouteEntry[] = [
  // Acceso sin sesión (04·17).
  { route: "/entrar", state: "A1", path: "/entrar", session: "none" },
  { route: "/entrar", state: "aviso de verificado", path: "/entrar?aviso=verificado", session: "none" },
  { route: "/entrar", state: "S3", path: "/entrar?aviso=sesion-cerrada", session: "none" },
  { route: "/entrar", state: "A1d", path: "/entrar", session: "none", prepare: "networkError" },
  { route: "/entrar", state: "A1b", path: "/entrar", session: "none", needsAuthApi: true, prepare: "invalidCredentials" },
  { route: "/entrar", state: "A1c", path: "/entrar", session: "none", needsAuthApi: true, prepare: "unverified" },
  { route: "/crear-cuenta", state: "A2", path: "/crear-cuenta", session: "none" },
  { route: "/crear-cuenta", state: "A2 · validación", path: "/crear-cuenta", session: "none", prepare: "signUpInvalid" },
  { route: "/verificar-correo", state: "A3", path: "/verificar-correo", session: "none" },
  { route: "/recuperar", state: "A4", path: "/recuperar", session: "none" },
  { route: "/recuperar", state: "aviso de enlace caducado", path: "/recuperar?enlace=caducado", session: "none" },
  { route: "/recuperar", state: "aviso de otro navegador", path: "/recuperar?enlace=otro-navegador", session: "none" },
  { route: "/recuperar", state: "A4b", path: "/recuperar", session: "none", needsAuthApi: true, prepare: "recoverSent" },
  // Con sesión de recuperación o de usuario.
  { route: "/nueva-contrasena", state: "A5", path: "/nueva-contrasena", session: "recovery" },
  { route: "/primera-entrada", state: "A6", path: "/primera-entrada", session: "user", firstEntryPending: true },
  { route: "/", state: "Inicio", path: "/", session: "user" },
  { route: "/actividad", state: "Actividad", path: "/actividad", session: "user" },
  { route: "/metas", state: "Metas", path: "/metas", session: "user" },
  { route: "/plan", state: "Plan", path: "/plan", session: "user" },
  { route: "/balance", state: "Balance", path: "/balance", session: "user" },
  { route: "/cuenta", state: "C1", path: "/cuenta", session: "user" },
  { route: "/cuenta/perfil", state: "P1", path: "/cuenta/perfil", session: "user" },
  { route: "/cuenta/perfil", state: "sesión caducada", path: "/cuenta/perfil", session: "user", prepare: "sessionExpired" },
  { route: "/cuenta/pareja", state: "llega con P0-2", path: "/cuenta/pareja", session: "user" },
  { route: "/cuenta/apariencia", state: "T1", path: "/cuenta/apariencia", session: "user" },
  { route: "/cuenta/privacidad", state: "D1", path: "/cuenta/privacidad", session: "user" },
  { route: "/cuenta/privacidad", state: "D2 · hoja de exportar", path: "/cuenta/privacidad", session: "user", prepare: "exportSheet" },
  { route: "/cuenta/seguridad", state: "G1", path: "/cuenta/seguridad", session: "user" },
  // Sin sesión, de la 001.
  { route: "/interno/primitivos", state: "superficie interna", path: "/interno/primitivos", session: "none" },
  { route: "/ruta-que-no-existe", state: "no encontrado", path: "/ruta-que-no-existe", session: "none", status: 404 },
];

export const sessionlessEntries = registry.filter((entry) => entry.session === "none");
export const sessionEntries = registry.filter((entry) => entry.session !== "none");
export const appEntries = sessionlessEntries.filter((entry) => !entry.needsAuthApi);
export const e2eEntries = registry.filter((entry) => !appEntries.includes(entry));
