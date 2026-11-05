// T043 / FR-027; research R8.7. Qué rutas exigen sesión y cuáles son de acceso. Un prefijo protege su segmento y lo que
// cuelga de él (`/cuenta` y `/cuenta/perfil`), nunca otro que empiece igual (`/cuentas`).
const PRODUCT = ["/actividad", "/metas", "/plan", "/balance", "/cuenta", "/primera-entrada"] as const;
/** Pantallas de acceso: con una sesión de usuario no se muestran (llevan a `volver` o a Inicio). */
const GUEST_ONLY = ["/entrar", "/crear-cuenta"] as const;
/** A5 exige la sesión que crea el enlace de recuperación; sin ella, el enlace ya no sirve. */
export const NEW_PASSWORD = "/nueva-contrasena";

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export const isProductRoute = (pathname: string) => pathname === "/" || PRODUCT.some((prefix) => under(pathname, prefix));
export const isGuestOnlyRoute = (pathname: string) => GUEST_ONLY.some((prefix) => under(pathname, prefix));
export const isNewPasswordRoute = (pathname: string) => under(pathname, NEW_PASSWORD);
