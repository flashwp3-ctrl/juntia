import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";
import { mapDbError } from "./errors";
import { requireClaims } from "./session";
type Row = { display_name: string; theme: Profile["theme"]; first_entry_completed: boolean };
const profile = (row: Row): Profile => ({ displayName: row.display_name, theme: row.theme, firstEntryCompleted: row.first_entry_completed });
export async function getProfile(client: SupabaseClient): Promise<Profile | null> {
  await requireClaims(client);
  const { data, error } = await client.from("my_profile").select("*").maybeSingle();
  if (error) throw mapDbError(error);
  return data ? profile(data as Row) : null;
}
async function write(client: SupabaseClient, name: "ensure_profile" | "complete_first_entry" | "update_display_name" | "set_theme", args?: Record<string, string>) {
  await requireClaims(client);
  const { data, error } = await client.rpc(name, args);
  if (error) throw mapDbError(error);
  return profile(data as Row);
}
export const ensureProfile = (client: SupabaseClient) => write(client, "ensure_profile");
export const completeFirstEntry = (client: SupabaseClient) => write(client, "complete_first_entry");
export const updateDisplayName = (client: SupabaseClient, displayName: string) => write(client, "update_display_name", { p_display_name: displayName });
export const setTheme = (client: SupabaseClient, theme: Profile["theme"]) => write(client, "set_theme", { p_theme: theme });
