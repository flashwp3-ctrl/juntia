// T045 / FR-021, FR-029; research R8.5, R8.7; contracts/database.md, «Auth»; enmienda del 5 de noviembre de 2026
// (quickstart §3, paso 1). Los dos caminos del enlace (token_hash y code) los resuelve src/features/auth/confirm.ts.
// - Verificación válida: crea el perfil con el nombre de A2 y termina en Entrar (A1) con el aviso de verificado (caso
//   límite «Verificación desde otro dispositivo»): la sesión del enlace se cierra y la persona entra con su contraseña.
// - Recuperación válida: deja la sesión de recuperación, copia el tema del perfil a la cookie y lleva a A5.
// - Caducado, usado o incompleto: A4 con el aviso de enlace caducado, sin ningún dato de la cuenta.
import { NextResponse, type NextRequest } from "next/server";
import { resolveConfirm } from "@/features/auth/confirm";
import { ensureProfile } from "@/lib/db/profile";
import { createRouteClient } from "@/lib/supabase/route";
import { THEME_COOKIE, themeCookieOptions } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { client, applyTo } = createRouteClient(request);
  const outcome = await resolveConfirm(request.nextUrl.searchParams, {
    verifyOtp: (args) => client.auth.verifyOtp(args),
    exchangeCodeForSession: (code) => client.auth.exchangeCodeForSession(code),
    authMethods: async () => {
      const amr = (await client.auth.getClaims()).data?.claims.amr;
      return Array.isArray(amr) ? amr.map((entry: { method?: unknown }) => String(entry.method)) : [];
    },
  });
  let theme: string | null = null;
  if (outcome.session) {
    try {
      theme = (await ensureProfile(client)).theme;
    } catch {
      // El perfil se vuelve a asegurar al entrar; el enlace ya se usó y no se puede repetir.
    }
    if (outcome.session === "signup") {
      await client.auth.signOut({ scope: "local" });
      theme = null;
    }
  }
  const response = applyTo(NextResponse.redirect(new URL(outcome.to, request.url), 303));
  if (theme) response.cookies.set(THEME_COOKIE, theme, themeCookieOptions);
  return response;
}
