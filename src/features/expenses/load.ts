import "server-only";
// T081 / FR-032; data-model.md «my_recent_categories». Las categorías recientes de la hoja de Anotar, que el layout de
// producto lee una vez y vuelve a leer cuando una escritura revalida el layout (actions.ts). Salen de los movimientos
// privados, así que siguen la regla de F44-1: solo con la cookie de contexto en Yo; sin cookie o en Nosotros no se lee
// nada y la hoja completa con el catálogo (`fillRecentCategories`). Un fallo de lectura tampoco bloquea Anotar.
import type { CategoryId } from "@/domain/transactions";
import { listRecentCategories } from "@/lib/db/transactions";
import { serverContext } from "@/lib/server-context";
import { createClient } from "@/lib/supabase/server";

export async function loadRecentCategories(): Promise<CategoryId[]> {
  if ((await serverContext()) !== "me") return [];
  try {
    return await listRecentCategories(await createClient());
  } catch {
    return [];
  }
}
