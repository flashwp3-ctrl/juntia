import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        // Un Server Component no escribe cookies; proxy.ts renovará la sesión en PR B.
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* solo lectura */ }
      },
    },
  });
}
