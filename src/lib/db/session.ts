import type { SupabaseClient } from "@supabase/supabase-js";
import { DbError, mapDbError } from "./errors";
export async function requireClaims(client: SupabaseClient) {
  const { data, error } = await client.auth.getClaims();
  if (error) throw mapDbError(error);
  if (!data?.claims.sub) throw new DbError("notAuthenticated");
  return data.claims;
}
/** Identidad validada de la petición (FR-026): `sub` y el correo de acceso, que Mi cuenta muestra sin poder editarlo. */
export async function getSessionIdentity(client: SupabaseClient): Promise<{ userId: string; email: string } | null> {
  const { data } = await client.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { userId: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
}
