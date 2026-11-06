// T051 / FR-067; contracts/ci.md, «Axe: clasificación por la sesión que necesita el estado real». Un registro único con
// cada ruta y estado y la sesión que necesita su estado real. Sin sesión → job app; con sesión de usuario o de
// recuperación → job e2e. `needsAuthApi`: estados sin sesión que solo existen con la respuesta real de Auth (A1b, A1c,
// A4b); el job app no tiene Supabase, así que se auditan en e2e (interpretación de ejecución del PR B).
export const THEMES = ["light", "dark"] as const;
export type Session = "none" | "user" | "recovery";
/** Lo que hace el recorrido antes de pasar axe, para llegar al estado. */
export type Prepare = "networkError" | "invalidCredentials" | "unverified" | "signUpInvalid" | "recoverSent" | "sessionExpired" | "exportSheet"
  | "us" | "search" | "filters" | "exportPreparing" | "exportReady" | "exportFailed";
/**
 * Movimientos de la cuenta sembrada, por la función real `create_transaction` (research R8.11). `golden`: el dataset
 * dorado de octubre de 2026, literal. `current`: las mismas filas e importes con la fecha llevada al mismo día del mes
 * en curso en Bogotá, porque Inicio enseña el mes en curso (spec, casos límite). `future`: el dataset dorado y un
 * movimiento de prueba tres meses después del mes en curso (Q13). En la ruta, `{id}` es el primer movimiento sembrado
 * (Taxi a la oficina), `{future}` el mes futuro.
 */
export type Data = "golden" | "current" | "future";
export type RouteEntry = {
  route: string;
  state: string;
  path: string;
  session: Session;
  needsAuthApi?: boolean;
  prepare?: Prepare;
  data?: Data;
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
  // P0-1, PR C (T071): Inicio, Actividad, el detalle y Exportar, con movimientos sembrados por la función real.
  { route: "/", state: "Inicio con datos", path: "/", session: "user", data: "current" },
  { route: "/", state: "Inicio vacío", path: "/", session: "user" },
  { route: "/", state: "Nosotros", path: "/", session: "user", data: "current", prepare: "us" },
  { route: "/actividad", state: "Actividad con datos", path: "/actividad?mes=2026-10", session: "user", data: "golden" },
  // Mes vacío dentro del intervalo navegable (F44-4): el mes en curso, sin movimientos, con la flecha hacia octubre.
  { route: "/actividad", state: "Actividad mes vacío", path: "/actividad", session: "user", data: "golden" },
  { route: "/actividad", state: "Actividad mes futuro", path: "/actividad?mes={future}", session: "user", data: "future" },
  { route: "/actividad", state: "Actividad búsqueda", path: "/actividad?mes=2026-10", session: "user", data: "golden", prepare: "search" },
  { route: "/actividad", state: "Actividad filtros", path: "/actividad?mes=2026-10", session: "user", data: "golden", prepare: "filters" },
  { route: "/actividad", state: "Actividad Nosotros", path: "/actividad?mes=2026-10", session: "user", data: "golden", prepare: "us" },
  { route: "/actividad/[id]", state: "Detalle", path: "/actividad/{id}?mes=2026-10", session: "user", data: "golden" },
  { route: "/actividad/[id]", state: "Detalle no encontrado", path: "/actividad/00000000-0000-4000-8000-000000000000", session: "user" },
  { route: "/metas", state: "Metas", path: "/metas", session: "user" },
  { route: "/metas", state: "Metas Nosotros", path: "/metas", session: "user", prepare: "us" },
  { route: "/plan", state: "Plan", path: "/plan", session: "user" },
  { route: "/balance", state: "Balance", path: "/balance", session: "user" },
  { route: "/cuenta", state: "C1", path: "/cuenta", session: "user" },
  { route: "/cuenta/perfil", state: "P1", path: "/cuenta/perfil", session: "user" },
  { route: "/cuenta/perfil", state: "sesión caducada", path: "/cuenta/perfil", session: "user", prepare: "sessionExpired" },
  { route: "/cuenta/pareja", state: "llega con P0-2", path: "/cuenta/pareja", session: "user" },
  { route: "/cuenta/apariencia", state: "T1", path: "/cuenta/apariencia", session: "user" },
  { route: "/cuenta/privacidad", state: "D1", path: "/cuenta/privacidad", session: "user" },
  { route: "/cuenta/privacidad", state: "D2 · hoja de exportar", path: "/cuenta/privacidad", session: "user", prepare: "exportSheet" },
  { route: "/cuenta/privacidad", state: "D3 · preparando", path: "/cuenta/privacidad", session: "user", data: "golden", prepare: "exportPreparing" },
  { route: "/cuenta/privacidad", state: "D4 · listo", path: "/cuenta/privacidad", session: "user", data: "golden", prepare: "exportReady" },
  { route: "/cuenta/privacidad", state: "D5 · error", path: "/cuenta/privacidad", session: "user", data: "golden", prepare: "exportFailed" },
  { route: "/cuenta/seguridad", state: "G1", path: "/cuenta/seguridad", session: "user" },
  // Sin sesión, de la 001.
  { route: "/interno/primitivos", state: "superficie interna", path: "/interno/primitivos", session: "none" },
  { route: "/ruta-que-no-existe", state: "no encontrado", path: "/ruta-que-no-existe", session: "none", status: 404 },
];

export const sessionlessEntries = registry.filter((entry) => entry.session === "none");
export const sessionEntries = registry.filter((entry) => entry.session !== "none");
export const appEntries = sessionlessEntries.filter((entry) => !entry.needsAuthApi);
export const e2eEntries = registry.filter((entry) => !appEntries.includes(entry));
