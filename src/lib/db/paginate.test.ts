// @vitest-environment node
// F44-2 (revisión del PR #44): «pagina con .range() […] hasta agotar las filas. El archivo o el total se construye solo
// con la lectura completa; si una página falla, […] nunca un resultado parcial». Capa: unidad (`components`, `node`).
import { describe, expect, it } from "vitest";
import { DbError } from "./errors";
import { readAllPages } from "./paginate";

const source = (rows: number, cap = Infinity, failAt?: number) => {
  const calls: [number, number][] = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    if (failAt !== undefined && calls.length === failAt) return { data: null, error: { code: "40P01x", message: "boom" } };
    const end = Math.min(to + 1, from + cap, rows);
    return { data: [...Array(Math.max(0, end - from)).keys()].map((index) => from + index), error: null };
  };
  return { page, calls };
};

describe("readAllPages (F44-2)", () => {
  it("lee todas las páginas hasta una vacía, en orden y sin huecos", async () => {
    const { page, calls } = source(7);
    expect(await readAllPages(page, 3)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(calls).toEqual([[0, 2], [3, 5], [6, 8], [7, 9]]);
  });

  it("con un máximo del servidor menor que la página avanza lo que llegó y no salta filas", async () => {
    const { page } = source(2500, 1000);
    const rows = await readAllPages(page, 5000);
    expect(rows).toHaveLength(2500);
    expect(rows.every((value, index) => value === index)).toBe(true);
  });

  it("si una página falla, falla la lectura entera: nunca un resultado parcial", async () => {
    const { page } = source(10, Infinity, 2);
    await expect(readAllPages(page, 3)).rejects.toBeInstanceOf(DbError);
  });

  it("sin filas devuelve una lista vacía con una sola petición", async () => {
    const { page, calls } = source(0);
    expect(await readAllPages(page, 3)).toEqual([]);
    expect(calls).toHaveLength(1);
  });
});
