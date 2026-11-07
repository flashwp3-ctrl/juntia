// @vitest-environment node
// F44-2 (revisión del PR #44, segunda ronda): «paginación por cursor: orden total (transaction_date, created_at, id) y
// cada página pide las filas estrictamente posteriores a la última clave leída […] sin duplicados y sin saltos de las
// filas que existen durante toda la lectura». Capa: unidad (`components`, `node`), con una fuente ordenada en memoria
// que se modifica entre páginas como lo haría otra sesión.
import { describe, expect, it } from "vitest";
import { DbError } from "./errors";
import { afterFilter, readByCursor, type CursorKey } from "./paginate";

type Row = CursorKey;
const key = ({ transaction_date, created_at, id }: Row) => `${transaction_date}|${created_at}|${id}`;
const row = (day: number, id: string, created = "2026-11-01T00:00:00.000000+00:00"): Row => ({ transaction_date: `2026-10-${String(day).padStart(2, "0")}`, created_at: created, id });

/** Fuente ordenada ascendente; `page` devuelve las filas estrictamente posteriores al cursor, como el filtro real. */
function source(initial: Row[], cap = Infinity) {
  let rows = [...initial];
  const calls: (string | null)[] = [];
  const sorted = () => [...rows].sort((a, b) => key(a).localeCompare(key(b)));
  return {
    insert: (next: Row) => { rows.push(next); },
    remove: (id: string) => { rows = rows.filter((candidate) => candidate.id !== id); },
    calls,
    page: async (after: CursorKey | null, limit: number) => {
      calls.push(after ? key(after) : null);
      const pending = sorted().filter((candidate) => !after || key(candidate) > key(after));
      return { data: pending.slice(0, Math.min(limit, cap)), error: null };
    },
  };
}

describe("readByCursor (F44-2)", () => {
  // 004 FR-096, F64-4: «clave declarada por lista ... una o dos columnas ... id único al final».
  it.each([["effective_date","created_at"],["changed_at"],["created_at"]])("004: clave %s, más de 500 filas sin saltos",async(...columns)=>{
    const fields=columns as string[];
    const initial=Array.from({length:1101},(_,i)=>Object.fromEntries([...fields.map(c=>[c,"2026-10-01T12:00:00Z"]),["id",String(i).padStart(5,"0")]])) as (Record<string,string>&{id:string})[];
    const page=async(after:Record<string,string>|null,limit:number)=>({data:initial.filter(r=>!after || r.id>after.id).slice(0,limit),error:null});
    const rows=await readByCursor(page,{columns:fields});
    expect(rows).toHaveLength(1101);expect(new Set(rows.map(r=>r.id)).size).toBe(1101);
    const filter=afterFilter(initial[0],"desc",fields);
    expect(filter).toContain(`${fields[0]}.lt.`);
    expect(filter).not.toContain("transaction_date");
    expect(filter).toContain('id.lt."00000"');
  });
  const initial = [row(3, "a"), row(5, "b"), row(5, "c"), row(8, "d"), row(11, "e"), row(14, "f"), row(18, "g")];

  it("lee todas las filas en orden, una vez, hasta una página vacía", async () => {
    const data = source(initial);
    expect((await readByCursor(data.page, { pageSize: 2 })).map(({ id }) => id)).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    expect(data.calls).toHaveLength(5);
  });

  it("con un máximo del servidor menor que la página no salta ni repite filas", async () => {
    const many = [...Array(2500).keys()].map((index) => row(1 + (index % 28), `id-${String(index).padStart(4, "0")}`));
    const rows = await readByCursor(source(many, 1000).page, { pageSize: 5000 });
    expect(rows).toHaveLength(2500);
    expect(new Set(rows.map(key)).size).toBe(2500);
  });

  it("con una inserción antes del cursor y una anulación de una fila ya leída entre páginas: sin duplicados ni saltos", async () => {
    const data = source(initial);
    const rows = await readByCursor(data.page, {
      pageSize: 2,
      onPage: async (index) => {
        if (index === 1) { data.insert(row(4, "antes")); data.remove("a"); }
        if (index === 2) { data.insert(row(25, "despues")); data.remove("f"); }
      },
    });
    const ids = rows.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    // Las que existieron de principio a fin salen todas.
    for (const id of ["b", "c", "d", "e", "g"]) expect(ids).toContain(id);
    // La insertada antes del cursor no sale; la insertada después sí; la anulada ya leída sale una vez.
    expect(ids).not.toContain("antes");
    expect(ids).toContain("despues");
    expect(ids.filter((id) => id === "a")).toHaveLength(1);
  });

  it("si una página falla, falla la lectura entera: nunca un resultado parcial", async () => {
    let calls = 0;
    const page = async () => (++calls === 2 ? { data: null, error: { code: "XX000", message: "boom" } } : { data: [row(calls, `x${calls}`)], error: null });
    await expect(readByCursor(page, { pageSize: 1 })).rejects.toBeInstanceOf(DbError);
  });

  it("el filtro de PostgREST pide lo estrictamente posterior en las dos direcciones, con el instante entre comillas", () => {
    const cursor = { transaction_date: "2026-10-05", created_at: "2026-11-05T12:00:00.123456+00:00", id: "7b1c" };
    expect(afterFilter(cursor, "asc")).toBe('transaction_date.gt.2026-10-05,and(transaction_date.eq.2026-10-05,created_at.gt."2026-11-05T12:00:00.123456+00:00"),and(transaction_date.eq.2026-10-05,created_at.eq."2026-11-05T12:00:00.123456+00:00",id.gt.7b1c)');
    expect(afterFilter(cursor, "desc")).toContain("transaction_date.lt.2026-10-05,");
    expect(afterFilter(cursor, "desc")).toContain(",id.lt.7b1c)");
  });
});
