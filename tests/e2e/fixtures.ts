// T049 / FR-064; ADR-011 §6, reglas 1 y 2: fixture de scope `worker` que siembra la Sara de cada worker y sobrescribe
// `storageState` por `parallelIndex` y rol. Dos workers nunca comparten usuario ni archivo de sesión. Los tests que
// cambian el estado de la cuenta (tema, nombre, cerrar sesión) siembran su propio usuario con `seedUser`.
import { test as base, type BrowserContext } from "@playwright/test";
import { seedGoldenMovements, seedUser, seedCouple, writeStorageState, type SeededUser } from "../support/seed";

type PairedUsers={groupId:string;sara:SeededUser&{statePath:string};tomas:SeededUser&{statePath:string}};
type WorkerFixtures = { sara: SeededUser & { statePath: string }; goldenSara: SeededUser & { statePath: string; movements: number }; couple:PairedUsers };

export const test = base.extend<object, WorkerFixtures>({
  couple: [async ({},use,workerInfo)=>{
    const pair=await seedCouple({index:workerInfo.parallelIndex});
    await use({groupId:pair.groupId,
      sara:{...pair.sara,statePath:await writeStorageState(pair.sara,workerInfo.parallelIndex,"couple-sara")},
      tomas:{...pair.tomas,statePath:await writeStorageState(pair.tomas,workerInfo.parallelIndex,"couple-tomas")}});
  },{scope:"worker"}],
  sara: [async ({}, use, workerInfo) => {
    const user = await seedUser({ role: "sara", index: workerInfo.parallelIndex, displayName: "Sara" });
    await use({ ...user, statePath: await writeStorageState(user, workerInfo.parallelIndex, "sara") });
  }, { scope: "worker" }],
  // Dataset dorado de octubre por la función real, para Inicio, Actividad y Exportar (PR C) y la spec E2E 2 (PR D).
  goldenSara: [async ({}, use, workerInfo) => {
    const user = await seedUser({ role: "sara-dorada", index: workerInfo.parallelIndex, displayName: "Sara" });
    const movements = await seedGoldenMovements(user);
    await use({ ...user, movements, statePath: await writeStorageState(user, workerInfo.parallelIndex, "sara-dorada") });
  }, { scope: "worker" }],
});

/** Deja la sesión sembrada en un contexto ya creado (para un usuario propio del test). */
export async function signInContext(context: BrowserContext, user: SeededUser) {
  await context.addCookies(user.cookies);
}

export { expect } from "@playwright/test";
