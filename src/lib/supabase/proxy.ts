// T043 / FR-026, FR-027; ADR-013 §6.5; research R8.7. Renueva la sesión con @supabase/ssr en cada petición, la valida
// con getClaims() (JWT firmado, comprobado en el servidor) y decide la redirección. Un cliente por petición.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/domain/account";
import { isGuestOnlyRoute, isNewPasswordRoute, isProductRoute } from "@/lib/routes";
import type { Database } from "./database.types";

// Sin cookie de sesión no hay nada que renovar ni validar: se ahorra crear el cliente (y la red) en cada visita anónima.
const hasSessionCookie = (request: NextRequest) => request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));

function redirectTo(request: NextRequest, pathname: string, from: NextResponse) {
  const response = NextResponse.redirect(new URL(pathname, request.url));
  // Conserva las cookies que la renovación haya escrito (o borrado) en esta misma petición.
  from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let signedIn = false;
  if (hasSessionCookie(request)) {
    const supabase = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values, headers) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    });
    // Nada entre crear el cliente y getClaims(): la renovación tiene que ocurrir aquí (guía de @supabase/ssr).
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }

  const { pathname, search } = request.nextUrl;
  // Una Server Action llega como POST a la ruta de su página. Si la sesión caducó, la acción responde «sesión caducada»
  // sin perder lo escrito (T048); una redirección aquí navegaría y lo perdería.
  const isAction = request.headers.has("next-action");

  if (!signedIn && !isAction && isProductRoute(pathname)) {
    return redirectTo(request, `/entrar?volver=${encodeURIComponent(safeReturnPath(`${pathname}${search}`))}`, response);
  }
  if (!signedIn && !isAction && isNewPasswordRoute(pathname)) return redirectTo(request, "/recuperar?enlace=caducado", response);
  if (signedIn && !isAction && isGuestOnlyRoute(pathname)) {
    return redirectTo(request, safeReturnPath(request.nextUrl.searchParams.get("volver")), response);
  }
  // FR-026: nada autenticado en cachés compartidas.
  if (signedIn || isProductRoute(pathname)) response.headers.set("Cache-Control", "private, no-store");
  return response;
}
