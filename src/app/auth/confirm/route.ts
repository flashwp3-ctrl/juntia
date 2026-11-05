// T045 / FR-021, FR-029; research R8.5, R8.7; contracts/database.md, «Auth». El enlace del correo
// (`/auth/confirm?token_hash=…&type=signup|recovery`) verifica el token con verifyOtp.
// - Verificación válida: crea el perfil con el nombre de A2 y termina en Entrar (A1) con el aviso de verificado (caso
//   límite «Verificación desde otro dispositivo»): la sesión del enlace se cierra y la persona entra con su contraseña.
// - Recuperación válida: deja la sesión de recuperación, copia el tema del perfil a la cookie y lleva a A5.
// - Caducado, usado o incompleto: A4 con el aviso de enlace caducado, sin ningún dato de la cuenta.
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { confirmResult } from "@/features/auth/auth-errors";
import { ensureProfile } from "@/lib/db/profile";
import { createRouteClient } from "@/lib/supabase/route";
import { THEME_COOKIE, themeCookieOptions } from "@/lib/theme";

export const dynamic = "force-dynamic";
const TYPES: readonly EmailOtpType[] = ["signup", "email", "recovery"];

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const type = TYPES.find((value) => value === rawType) ?? null;
  const { client, applyTo } = createRouteClient(request);
  let theme: string | null = null;
  let result = confirmResult(null, null);
  if (tokenHash && type) {
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
    result = confirmResult(type, error);
    if (!error) {
      try {
        theme = (await ensureProfile(client)).theme;
      } catch {
        // El perfil se vuelve a asegurar al entrar; el enlace ya se usó y no se puede repetir.
      }
      if (type !== "recovery") {
        await client.auth.signOut({ scope: "local" });
        theme = null;
      }
    }
  }
  const to = result.kind === "redirect" ? result.to : "/recuperar?enlace=caducado";
  const response = applyTo(NextResponse.redirect(new URL(to, request.url), 303));
  if (theme) response.cookies.set(THEME_COOKIE, theme, themeCookieOptions);
  return response;
}
