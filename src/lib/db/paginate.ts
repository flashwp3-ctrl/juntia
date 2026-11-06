// F44-2 (revisión del PR #44). PostgREST corta cada respuesta en su máximo de filas (1.000 en Supabase) y devuelve 200:
// una lectura sin paginar puede quedarse corta sin que nadie lo note. Aquí se lee página a página con `.range()` sobre
// un orden total estable (quien llama lo fija: fecha, `created_at`, `id`) hasta una página vacía, avanzando lo que de
// verdad llegó (así un máximo del servidor menor que la página no salta filas). Si una página falla, la lectura entera
// falla: nunca se devuelve un resultado parcial.
import { DbError, mapDbError } from "./errors";

export const PAGE_SIZE = 500;

export async function readAllPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, pageSize = PAGE_SIZE): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new DbError("unexpected");
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + pageSize - 1);
    if (error) throw mapDbError(error);
    if (!Array.isArray(data)) throw new DbError("unexpected");
    if (data.length === 0) return rows;
    rows.push(...data);
  }
}
