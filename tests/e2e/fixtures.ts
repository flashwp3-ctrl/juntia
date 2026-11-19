// T049 / FR-064; ADR-011 §6, reglas 1 y 2: fixture de scope `worker` que siembra la Sara de cada worker y sobrescribe
// `storageState` por `parallelIndex` y rol. Dos workers nunca comparten usuario ni archivo de sesión. Los tests que
// cambian el estado de la cuenta (tema, nombre, cerrar sesión) siembran su propio usuario con `seedUser`.
import { test as base, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { seedGoldenMovements, seedUser, seedCouple, writeStorageState, type SeededUser } from "../support/seed";

type PairedUsers={groupId:string;sara:SeededUser&{statePath:string};tomas:SeededUser&{statePath:string}};
type WorkerFixtures = { sara: SeededUser & { statePath: string }; goldenSara: SeededUser & { statePath: string; movements: number }; couple:PairedUsers;goldenCouple:PairedUsers };

export const test = base.extend<object, WorkerFixtures>({
  couple: [async ({},use,workerInfo)=>{
    const pair=await seedCouple({index:workerInfo.parallelIndex});
    await use({groupId:pair.groupId,
      sara:{...pair.sara,statePath:await writeStorageState(pair.sara,workerInfo.parallelIndex,"couple-sara")},
      tomas:{...pair.tomas,statePath:await writeStorageState(pair.tomas,workerInfo.parallelIndex,"couple-tomas")}});
  },{scope:"worker"}],
  goldenCouple: [async ({},use,workerInfo)=>{
    const pair=await seedCouple({index:workerInfo.parallelIndex,golden:true});
    await use({groupId:pair.groupId,
      sara:{...pair.sara,statePath:await writeStorageState(pair.sara,workerInfo.parallelIndex,"golden-couple-sara")},
      tomas:{...pair.tomas,statePath:await writeStorageState(pair.tomas,workerInfo.parallelIndex,"golden-couple-tomas")}});
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

/**
 * 005 · PR B (corrección 6, FR-020; research R3): el documento actual cargó y el router de Next ya escribió su entrada de
 * historial (`history.state.__NA`, app-router.js), que hace al hidratar con un `replaceState`. En WebKit, ese `replaceState`
 * tardío cuenta como otra navegación e interrumpe el `page.goto` siguiente («is interrupted by another navigation», run
 * 44349192421), y la URL cambia antes de que el documento nuevo esté listo. No es una espera fija: es la condición del router.
 */
export async function routerSettled(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForFunction(() => (window.history.state as { __NA?: boolean } | null)?.__NA === true);
}

/**
 * Las navegaciones de documento del marco principal, adjuntas al informe si la prueba falla (`attachNavigations` en un
 * `afterEach`). Diagnóstico de WebKit, corrección 6 del PR B: dos `goto` interrumpidos por una navegación a
 * `/entrar?volver=%2F` sin causa visible en el código (run 44349192421).
 */
const navigationLogs = new Map<string, string[]>();
export function recordNavigations(page: Page) {
  const started = Date.now();
  const lines: string[] = [];
  navigationLogs.set(test.info().testId, lines);
  // Líneas cortas (ruta y consulta, sin origen ni tokens largos): el reporter de lista recorta las líneas largas (run 44430973809).
  const short = (url: string) => { const parsed = new URL(url); return `${parsed.pathname}${parsed.search}`.replace(/(token_hash|code)=[^&]+/g, "$1=…").slice(0, 70); };
  const at = () => `${Date.now() - started} ms`;
  page.on("request", (request) => {
    if (!request.isNavigationRequest() || request.frame() !== page.mainFrame()) return;
    const from = request.redirectedFrom();
    lines.push(`${at()} doc ${request.method()} ${short(request.url())}${from ? ` (redirige ${short(from.url())})` : ""}`);
  });
  page.on("response", (response) => { if (response.request().isNavigationRequest() && response.frame() === page.mainFrame()) lines.push(`${at()} resp ${response.status()} ${short(response.url())}`); });
  page.on("requestfailed", (request) => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) lines.push(`${at()} fallo ${short(request.url())} ${request.failure()?.errorText ?? ""}`.slice(0, 110)); });
  page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) lines.push(`${at()} url ${short(frame.url())}`); });
}
export async function attachNavigations(testInfo: TestInfo) {
  const lines = navigationLogs.get(testInfo.testId);
  navigationLogs.delete(testInfo.testId);
  if (lines && testInfo.status !== testInfo.expectedStatus) await testInfo.attach("navegaciones", { body: lines.join("\n"), contentType: "text/plain" });
}

export { expect } from "@playwright/test";
