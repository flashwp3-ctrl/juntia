// T051 / FR-067; contracts/ci.md, «Axe: clasificación por la sesión que necesita el estado real». Un registro único con
// cada ruta y estado y la sesión que necesita su estado real. Sin sesión → job app; con sesión de usuario o de
// recuperación → job e2e. `needsAuthApi`: estados sin sesión que solo existen con la respuesta real de Auth (A1b, A1c,
// A4b); el job app no tiene Supabase, así que se auditan en e2e (interpretación de ejecución del PR B).
export const THEMES = ["light", "dark"] as const;
export type Session = "none" | "user" | "recovery";
/** Lo que hace el recorrido antes de pasar axe, para llegar al estado. */
export type Prepare = "networkError" | "invalidCredentials" | "unverified" | "signUpInvalid" | "recoverSent" | "sessionExpired" | "exportSheet"
  | "us" | "search" | "filters" | "exportPreparing" | "exportReady" | "exportFailed"
  | "annotate" | "annotateIncome" | "annotateDetails" | "annotateInvalid" | "annotateSaving" | "annotateFailed" | "annotateSaved" | "edit" | "deleteDialog"
  | "inviteSheet" | "inviteReady" | "cancelDialog";
/**
 * Movimientos de la cuenta sembrada, por la función real `create_transaction` (research R8.11). `golden`: el dataset
 * dorado de octubre de 2026, literal. `current`: las mismas filas e importes con la fecha llevada al mismo día del mes
 * en curso en Bogotá, porque Inicio enseña el mes en curso (spec, casos límite). `future`: el dataset dorado y un
 * movimiento de prueba tres meses después del mes en curso (Q13). `recent` (PR D): como `current`, pero ningún día pasa
 * de hoy, para que lo anotado en E5 quede arriba en Inicio. En la ruta, `{id}` es el primer movimiento sembrado
 * (Taxi a la oficina), `{future}` el mes futuro.
 */
export type Data = "golden" | "current" | "future" | "recent";
export type RouteEntry = {
  route: string;
  state: string;
  path: string;
  session: Session;
  needsAuthApi?: boolean;
  prepare?: Prepare;
  data?: Data;
  /**
   * PR B de la 003 (T031d): la pareja de la cuenta sembrada, por las funciones reales. `pending`: una invitación creada
   * con `create_invitation` (M4). `expired`: la misma, vencida (M4 vencida). `active`: pareja de dos con
   * `tests.seed_couple` y un segundo usuario sembrado (M1).
   */
  couple?: "pending" | "expired" | "active";
  /** A6 necesita una cuenta que todavía no completó la primera entrada. */
  firstEntryPending?: boolean;
  status?: number;
  themes?: readonly (typeof THEMES)[number][];
  /**
   * P0-1, PR D (T084, T098): `false` en los estados que solo hacen falta como captura (T098) y no añaden nada que axe no
   * vea ya en otro estado de la misma hoja: E1 ingreso, E3 y E4. Así el job e2e no paga tres pasadas que se repiten.
   */
  axe?: boolean;
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
  // P0-1, PR D (T084, T098): Anotar en sus estados (hoja a 390, diálogo de 520 a 1440), la edición y el diálogo de
  // eliminar. E5 guarda de verdad por la Server Action sobre movimientos sembrados por la función real; los demás estados
  // de la hoja no los necesitan (la hoja tapa Inicio y las recientes se completan con el catálogo), y así el job e2e no
  // siembra nueve movimientos por cada uno.
  { route: "/", state: "Anotar E1 gasto", path: "/", session: "user", prepare: "annotate" },
  { route: "/", state: "Anotar E1 ingreso", path: "/", session: "user", prepare: "annotateIncome", axe: false },
  { route: "/", state: "Anotar E2 detalles", path: "/", session: "user", prepare: "annotateDetails" },
  { route: "/", state: "Anotar E3 monto no válido", path: "/", session: "user", prepare: "annotateInvalid", axe: false },
  { route: "/", state: "Anotar E4 guardando", path: "/", session: "user", prepare: "annotateSaving", axe: false },
  { route: "/", state: "Anotar error de guardado", path: "/", session: "user", prepare: "annotateFailed" },
  { route: "/", state: "Anotar E5 guardado", path: "/", session: "user", data: "recent", prepare: "annotateSaved" },
  { route: "/actividad/[id]", state: "Edición", path: "/actividad/{id}?mes=2026-10", session: "user", data: "golden", prepare: "edit" },
  { route: "/actividad/[id]", state: "Diálogo de eliminar", path: "/actividad/{id}?mes=2026-10", session: "user", data: "golden", prepare: "deleteDialog" },
  { route: "/metas", state: "Metas", path: "/metas", session: "user" },
  { route: "/metas", state: "Metas Nosotros", path: "/metas", session: "user", prepare: "us" },
  // 004 PR C (T044): la meta inmersiva con una cuenta sola solo tiene el estado «no encontrada»; con metas sembradas de
  // una pareja se audita en tests/a11y/goals.a11y.ts.
  { route: "/metas/[id]", state: "Meta no encontrada", path: "/metas/00000000-0000-4000-8000-000000000000", session: "user" },
  { route: "/plan", state: "Plan", path: "/plan", session: "user" },
  // 004 PR E (T072): Análisis con una cuenta sola y sin movimientos (el mes vacío); con la pareja dorada, en analysis.a11y.ts.
  { route: "/plan/analisis", state: "Análisis sin datos", path: "/plan/analisis", session: "user" },
  { route: "/balance", state: "Balance", path: "/balance", session: "user" },
  { route: "/cuenta", state: "C1", path: "/cuenta", session: "user" },
  { route: "/cuenta/perfil", state: "P1", path: "/cuenta/perfil", session: "user" },
  { route: "/cuenta/perfil", state: "sesión caducada", path: "/cuenta/perfil", session: "user", prepare: "sessionExpired" },
  // PR B de la 003 (T031d, T036): Mi pareja M1–M4, M3b y la confirmación de anular. M6 y M7 necesitan sesión y la
  // invitación de otra cuenta; como /invitacion ya está aquí sin sesión (M5) y una ruta va en una sola lista, se auditan
  // en tests/a11y/couple.a11y.ts, solo con A11Y_JOB=e2e (tasks.md, regla 10: «si no caben en el registro»).
  { route: "/cuenta/pareja", state: "M2 sin pareja", path: "/cuenta/pareja", session: "user" },
  { route: "/cuenta/pareja", state: "M3 crear invitación", path: "/cuenta/pareja", session: "user", prepare: "inviteSheet" },
  { route: "/cuenta/pareja", state: "M3b enlace listo", path: "/cuenta/pareja", session: "user", prepare: "inviteReady" },
  { route: "/cuenta/pareja", state: "M4 pendiente", path: "/cuenta/pareja", session: "user", couple: "pending" },
  { route: "/cuenta/pareja", state: "M4 vencida", path: "/cuenta/pareja", session: "user", couple: "expired" },
  { route: "/cuenta/pareja", state: "M4 confirmación de anular", path: "/cuenta/pareja", session: "user", couple: "pending", prepare: "cancelDialog" },
  { route: "/cuenta/pareja", state: "M1 activa", path: "/cuenta/pareja", session: "user", couple: "active" },
  { route: "/cuenta/apariencia", state: "T1", path: "/cuenta/apariencia", session: "user" },
  { route: "/cuenta/privacidad", state: "D1", path: "/cuenta/privacidad", session: "user" },
  { route: "/cuenta/privacidad", state: "D2 · hoja de exportar", path: "/cuenta/privacidad", session: "user", prepare: "exportSheet" },
  { route: "/cuenta/privacidad", state: "D3 · preparando", path: "/cuenta/privacidad", session: "user", data: "golden", prepare: "exportPreparing" },
  { route: "/cuenta/privacidad", state: "D4 · listo", path: "/cuenta/privacidad", session: "user", data: "golden", prepare: "exportReady" },
  { route: "/cuenta/privacidad", state: "D5 · error", path: "/cuenta/privacidad", session: "user", data: "golden", prepare: "exportFailed" },
  { route: "/cuenta/seguridad", state: "G1", path: "/cuenta/seguridad", session: "user" },
  // PR B de la 003: /invitacion sin sesión (M5). La pantalla la decide el cliente; sin cookie no hay red de Auth.
  { route: "/invitacion", state: "M5 sin sesión", path: "/invitacion#t=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", session: "none" },
  // Sin sesión, de la 001.
  { route: "/interno/primitivos", state: "superficie interna", path: "/interno/primitivos", session: "none" },
  { route: "/ruta-que-no-existe", state: "no encontrado", path: "/ruta-que-no-existe", session: "none", status: 404 },
];

export const sessionlessEntries = registry.filter((entry) => entry.session === "none");
export const sessionEntries = registry.filter((entry) => entry.session !== "none");
export const appEntries = sessionlessEntries.filter((entry) => !entry.needsAuthApi);
export const e2eEntries = registry.filter((entry) => !appEntries.includes(entry));

/**
 * Decisión de los fundadores del 11 nov 2026 (opción C del gestor; contracts/ci.md, «Selector de accesibilidad por área»):
 * el área de cada ruta del registro, para que el nivel ligero del job e2e corra solo las del área del PR. scripts/a11y-select.mjs
 * usa los mismos nombres (tests/a11y-select.test.ts lo comprueba). Una ruta que este mapa no clasifica cuenta como núcleo.
 */
export const ROUTE_AREAS = ["nucleo", "metas", "presupuestos", "balance", "pareja"] as const;
export type RouteArea = (typeof ROUTE_AREAS)[number];
export function routeArea(route: string): RouteArea {
  if (/^\/metas(?:\/|$)/.test(route)) return "metas";
  if (/^\/plan(?:\/|$)/.test(route)) return "presupuestos";
  if (/^\/balance(?:\/|$)/.test(route)) return "balance";
  if (/^\/cuenta\/pareja(?:\/|$)/.test(route) || /^\/invitacion(?:\/|$)/.test(route)) return "pareja";
  return "nucleo";
}

/**
 * Las áreas que pide `A11Y_ROUTE_AREAS` (lista separada por espacios o comas), o `null` = todo el registro. Fail-safe: sin la
 * variable, vacía o con cualquier valor que no sea un área conocida, todo el registro. El barrido (`A11Y_LEVEL=sweep`) siempre
 * recorre el registro completo.
 */
export function routeAreaFilter(env: Record<string, string | undefined> = process.env): ReadonlySet<RouteArea> | null {
  if (env.A11Y_LEVEL === "sweep") return null;
  const tokens = (env.A11Y_ROUTE_AREAS ?? "").split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0 || tokens.some((token) => !(ROUTE_AREAS as readonly string[]).includes(token))) return null;
  return new Set(tokens as RouteArea[]);
}
