// T045 / FR-021, FR-029; research R8.5, R8.7; contracts/database.md, «Auth». El enlace del correo
// (`/auth/confirm?token_hash=…&type=signup|recovery`) verifica el token con verifyOtp.
// - Verificación válida: crea el perfil con el nombre de A2 y termina en Entrar (A1) con el aviso de verificado (caso
//   límite «Verificación desde otro dispositivo»): la sesión del enlace se cierra y la persona entra con su contraseña.
// - Recuperación válida: deja la sesión de recuperación, copia el tema del perfil a la cookie y lleva a A5.
// - Caducado, usado o incompleto: A4 con el aviso de enlace caducado, sin ningún dato de la cuenta.
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { confirmResult } from "@/features/auth/auth-errors";
import { ensureProfile } from "@/lib/db/profile";
import { createClient } from "@/lib/supabase/server";
import { THEME_COOKIE, themeCookieOptions } from "@/lib/theme";

export const dynamic = "force-dynamic";
const TYPES: readonly EmailOtpType[] = ["signup", "email", "recovery"];

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const type = TYPES.find((value) => value === rawType) ?? null;
  if (!tokenHash || !type) {
    const missing = confirmResult(null, null);
    redirect(missing.kind === "redirect" ? missing.to : "/recuperar?enlace=caducado");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  const result = confirmResult(type, error);
  if (!error) {
    try {
      const profile = await ensureProfile(supabase);
      if (type === "recovery") (await cookies()).set(THEME_COOKIE, profile.theme, themeCookieOptions);
    } catch {
      // El perfil se vuelve a asegurar al entrar; el enlace ya se usó y no se puede repetir.
    }
    if (type !== "recovery") await supabase.auth.signOut({ scope: "local" });
  }
  redirect(result.kind === "redirect" ? result.to : "/recuperar?enlace=caducado");
}
