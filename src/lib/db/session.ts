import type { SupabaseClient } from "@supabase/supabase-js";
import { DbError, mapDbError } from "./errors";
export async function requireClaims(client: SupabaseClient) {
  const { data, error } = await client.auth.getClaims();
  if (error) throw mapDbError(error);
  if (!data?.claims.sub) throw new DbError("notAuthenticated");
}
