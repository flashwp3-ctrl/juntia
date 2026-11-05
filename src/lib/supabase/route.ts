import "server-only";
// Cliente de servidor para un Route Handler que responde con una redirección construida a mano (/auth/confirm): las
// cookies que escribe Auth se acumulan y se copian a la respuesta final, sea cual sea su destino.
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";

type Cookie = { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] };

export function createRouteClient(request: NextRequest) {
  const pending = new Map<string, Cookie>();
  const client = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => {
        request.cookies.set(name, value);
        pending.set(name, { name, value, options });
      }),
    },
  });
  const applyTo = (response: NextResponse) => {
    pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  return { client, applyTo };
}
