// T049 / FR-064; ADR-011 §6, reglas 1 y 2. Capa: integración de servidor (job db). Criterio literal (tasks.md, T049):
// «dos workers siembran usuarios distintos y ninguno comparte su `storageState`; los movimientos sembrados de un worker no
// aparecen en otro; el fixture se niega a correr si la URL de Supabase no es la del runner».
import { readFile, rm } from "node:fs/promises";
import { afterAll, expect, it } from "vitest";
import { isDevTarget } from "../support/dev-target";
import { runnerSupabase, seedGoldenMovements, seedUser, writeStorageState } from "../support/seed";

const paths: string[] = [];
afterAll(async () => { await Promise.all(paths.map((path) => rm(path, { force: true }))); });

it("003 T025: dos workers siembran parejas aisladas y storageState por rol, con dorado opcional",async()=>{
  const {seedCouple}=await import("../support/seed");
  const first=await seedCouple({index:20,golden:true});
  const second=await seedCouple({index:21});
  expect(first.groupId).not.toBe(second.groupId);
  expect(new Set([first.sara.id,first.tomas.id,second.sara.id,second.tomas.id]).size).toBe(4);
  for(const [pair,index] of [[first,20],[second,21]] as const) for(const role of ["sara","tomas"] as const) paths.push(await writeStorageState(pair[role],index,role));
  expect((await first.sara.client.from("couple_month_summary").select("total_minor").eq("month","2026-10-01").single()).data?.total_minor).toBe("284000000");
  expect((await first.tomas.client.from("couple_expenses").select("id")).data).toHaveLength(6);
  expect((await second.sara.client.from("couple_expenses").select("id")).data).toEqual([]);
  expect((await second.tomas.client.from("couple_expenses").select("id")).data).toEqual([]);
});

it("dos workers siembran usuarios y sesiones distintos, y el dataset de uno no aparece en el otro", async () => {
  const [first, second] = await Promise.all([seedUser({ role: "sara", index: 0 }), seedUser({ role: "sara", index: 1 })]);
  expect(first.id).not.toBe(second.id);
  expect(first.email).not.toBe(second.email);
  const [firstPath, secondPath] = await Promise.all([writeStorageState(first, 0, "sara"), writeStorageState(second, 1, "sara")]);
  paths.push(firstPath, secondPath);
  expect(firstPath).toBe("playwright/.auth/0-sara.json");
  expect(secondPath).toBe("playwright/.auth/1-sara.json");
  const tokens = async (path: string) => (JSON.parse(await readFile(path, "utf8")) as { cookies: { value: string }[] }).cookies.map(({ value }) => value).join("");
  expect(await tokens(firstPath)).not.toBe(await tokens(secondPath));
  expect((await tokens(firstPath)).length).toBeGreaterThan(0);

  // La siembra del dataset dorado pasa por create_transaction con la sesión de cada uno.
  expect(await seedGoldenMovements(first)).toBe(9);
  const own = await first.client.from("my_transactions").select("id");
  const other = await second.client.from("my_transactions").select("id");
  expect(own.data).toHaveLength(9);
  expect(other.data).toEqual([]);
});

// En el runner, juntia-dev también se rechaza. Con `test:integration:dev` (decisión 18) dev es el destino permitido y el
// guardia de destino rechaza producción, cualquier otro proyecto y una URL vacía.
it("se niega a sembrar fuera del destino permitido", async () => {
  const saved = { API_URL: process.env.API_URL, NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL };
  const refused = isDevTarget()
    ? { urls: ["https://otroproyectoxxxxxxxx.supabase.co", "https://enwaxmwgldqohfawxhdm.supabase.co", ""], message: /Guardia de destino/ }
    : { urls: ["https://itfrhnadovezpahikuol.supabase.co", "https://enwaxmwgldqohfawxhdm.supabase.co", ""], message: /Supabase local del runner/ };
  try {
    for (const url of refused.urls) {
      process.env.API_URL = url;
      process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      expect(() => runnerSupabase()).toThrow(refused.message);
      await expect(seedUser({ role: "sara", index: 9 })).rejects.toThrow(refused.message);
    }
  } finally {
    process.env.API_URL = saved.API_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = saved.NEXT_PUBLIC_SUPABASE_URL;
  }
});
