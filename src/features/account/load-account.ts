import "server-only";
// T047 / FR-026, FR-029. Una lectura por petición (React cache) de la identidad validada y del perfil, compartida por el
// layout de (app), Mi cuenta y A6. Si el perfil todavía no existe (primer acceso por otro camino), se crea aquí.
import { cache } from "react";
import { ensureProfile, getProfile } from "@/lib/db/profile";
import { getSessionIdentity } from "@/lib/db/session";
import type { Profile } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

export type Account = { userId: string; email: string; profile: Profile };

export const loadAccount = cache(async (): Promise<Account | null> => {
  const client = await createClient();
  const identity = await getSessionIdentity(client);
  if (!identity) return null;
  const profile = (await getProfile(client)) ?? (await ensureProfile(client));
  return { ...identity, profile };
});
