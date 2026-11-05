// T043 / FR-026, FR-027: renovación de sesión y protección de las rutas de producto y de Mi cuenta (research R8.7).
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Todo menos los recursos estáticos de Next, los íconos y las imágenes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
