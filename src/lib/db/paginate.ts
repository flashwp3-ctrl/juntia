// F44-2 (revisión del PR #44, dos rondas). PostgREST corta cada respuesta en su máximo de filas (1.000 en Supabase) y
// devuelve 200: una lectura sin paginar puede quedarse corta sin que nadie lo note. Se lee **por cursor** sobre un orden
// total estable, `transaction_date`, `created_at`, `id` (el `id` desempata): cada página pide las filas estrictamente
// posteriores a la última clave leída, hasta una página vacía.
//
// Garantía, con escrituras concurrentes y sin instantánea de la base: ninguna fila sale dos veces y no se salta ninguna
// de las que existen durante toda la lectura (sus claves no cambian: la fecha y la creación de un movimiento activo solo
// cambian al editarlo, y entonces la fila no «existió igual» de principio a fin). Una fila insertada o anulada mientras
// se lee puede aparecer o no. Si una página falla, la lectura entera falla: nunca se devuelve un resultado parcial.
import { DbError, mapDbError } from "./errors";

export const PAGE_SIZE = 500;

export type CursorKey = { transaction_date: string; created_at: string; id: string };
export type PageOptions = {
  pageSize?: number;
  /** 004 F64-4: columnas de orden antes del id; por defecto conserva el contrato de la 002/003. */
  columns?: readonly string[];
  /** Solo pruebas: se llama antes de pedir cada página a partir de la segunda (para intercalar escrituras). */
  onPage?: (index: number) => Promise<void>;
};

export async function readByCursor<T extends { id: string }>(
  page: (after: T | null, limit: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  { pageSize = PAGE_SIZE, onPage, columns = ["transaction_date", "created_at"] }: PageOptions = {},
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new DbError("unexpected");
  validateColumns(columns);
  const rows: T[] = [];
  let after: T | null = null;
  for (let index = 0; ; index++) {
    if (index > 0 && onPage) await onPage(index);
    const { data, error } = await page(after, pageSize);
    if (error) throw mapDbError(error);
    if (!Array.isArray(data)) throw new DbError("unexpected");
    if (data.length === 0) return rows;
    rows.push(...data);
    const last = data[data.length - 1];
    // Conserva la fila: los consumidores viejos usan CursorKey; cada lista nueva declara sus columnas.
    after = last;
  }
}

/**
 * Filtro `or` de PostgREST para «estrictamente después de `key`» en el orden (fecha, creación, id), ascendente o
 * descendente. Los valores con caracteres reservados (`:` y `.` del instante) van entre comillas dobles.
 */
function validateColumns(columns: readonly string[]) {
  if (columns.length < 1 || columns.length > 2 || new Set(columns).size !== columns.length || columns.some(c=>c==="id" || !/^[a-z][a-z0-9_]*$/.test(c))) throw new DbError("unexpected");
}
export function afterFilter(key: CursorKey | Record<string,string>, direction: "asc" | "desc", dateColumn: "transaction_date" | "settlement_date" | readonly string[] = "transaction_date") {
  const op = direction === "asc" ? "gt" : "lt";
  if (typeof dateColumn !== "string") {
    validateColumns(dateColumn);
    const columns=[...dateColumn,"id"];
    const value=(column:string)=>{
      const text=(key as Record<string,string>)[column];
      if(typeof text!=="string") throw new DbError("unexpected");
      return `"${text.replaceAll("\\","\\\\").replaceAll('"','\\"')}"`;
    };
    return columns.map((column,index)=>{
      const terms=[...columns.slice(0,index).map(c=>`${c}.eq.${value(c)}`),`${column}.${op}.${value(column)}`];
      return index===0?terms[0]:`and(${terms.join(",")})`;
    }).join(",");
  }
  const date = key.transaction_date;
  const created = `"${key.created_at}"`;
  return `${dateColumn}.${op}.${date},and(${dateColumn}.eq.${date},created_at.${op}.${created}),and(${dateColumn}.eq.${date},created_at.eq.${created},id.${op}.${key.id})`;
}

export function monthBounds(month?:string):[string,string]|null {
  if(!month) return null;
  if(!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month) || month<"0001-01") throw new DbError("invalidDate");
  const [year,part]=month.split("-").map(Number);
  return [`${month}-01`,`${part===12?String(year+1).padStart(4,"0"):String(year).padStart(4,"0")}-${part===12?"01":String(part+1).padStart(2,"0")}-01`];
}
