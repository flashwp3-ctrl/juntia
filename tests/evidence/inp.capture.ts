// T085 / SC-004; maestro §15.7. `[V]` INP < 200 ms al abrir Anotar y al guardar, **en laboratorio**: Chromium con la CPU
// a 4× (CDP `Emulation.setCPUThrottlingRate`), a 390 y 1440, con sesión y movimientos sembrados por la función real.
// Para cada interacción, la duración más larga de las entradas `event` con el mismo `interactionId`
// (PerformanceObserver, `durationThreshold: 16`), que es lo que el navegador cuenta para INP. No es una prueba del gate:
// escribe la medición en test-results/evidence/inp.jsonl para evidence.md, y marca la fila si pasa de 200 ms.
// Se ejecuta en serie (@serial): con varios workers a la vez la CPU del runner no es la de una sola pestaña.
import { appendFile, mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";
import { seedMovements, seedUser } from "../support/seed";

const OUT = "test-results/evidence";
const RUNS = 5;

type Interaction = { id: number; name: string; duration: number };

async function observe(page: Page) {
  await page.evaluate(() => {
    const seen: { id: number; name: string; duration: number }[] = [];
    Object.assign(window, { __inp: seen });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEventTiming[]) {
        if (entry.interactionId) seen.push({ id: entry.interactionId, name: entry.name, duration: entry.duration });
      }
    }).observe({ type: "event", durationThreshold: 16, buffered: true } as PerformanceObserverInit);
  });
}

/**
 * La interacción posterior a `after`: su duración es la mayor de sus eventos (pointerdown, pointerup, click…). Las
 * entradas llegan después del cuadro siguiente, así que se espera a que aparezca (sin esperas fijas).
 */
async function nextInteraction(page: Page, after: number): Promise<Interaction> {
  const read = () => page.evaluate((previous) => {
    const seen = (window as unknown as { __inp: { id: number; name: string; duration: number }[] }).__inp.filter((entry) => entry.id > previous);
    if (seen.length === 0) return null;
    const id = Math.min(...seen.map((entry) => entry.id));
    const worst = seen.filter((entry) => entry.id === id).reduce((a, b) => (b.duration > a.duration ? b : a));
    return { id, name: worst.name, duration: worst.duration };
  }, after);
  await expect.poll(read, { message: "entrada de Event Timing" }).not.toBeNull();
  return (await read())!;
}

for (const width of [390, 1440]) {
  test(`@serial @inp INP de Anotar en laboratorio · ${width}px · CPU 4×`, async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(180_000);
    await mkdir(OUT, { recursive: true });
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, reducedMotion: "no-preference" });
    const user = await seedUser({ role: "inp", index: testInfo.parallelIndex });
    await seedMovements(user, "recent");
    await context.addCookies([...user.cookies, { name: "juntia_context", value: "me", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }]);
    await context.addInitScript(() => window.localStorage.setItem("juntia:context", "me"));
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto("/");
    await expect(page.locator("[data-counting-amount]")).toBeVisible();
    await observe(page);
    let last = 0;
    const opens: number[] = [];
    const saves: number[] = [];
    for (let run = 0; run < RUNS; run++) {
      // Abrir con el disparador visible (barra a 390, sidebar a 1440): un clic real del puntero.
      await page.locator("[data-annotate-trigger]:visible").click();
      const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
      await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
      const open = await nextInteraction(page, last);
      last = open.id;
      opens.push(open.duration);
      await page.keyboard.type(String(1000 + run));
      await sheet.getByRole("group", { name: copy.annotate.recent }).getByRole("button").first().click();
      // Las interacciones intermedias (teclas y categoría) se descartan: solo cuentan abrir y guardar.
      last = await page.evaluate(() => Math.max(0, ...(window as unknown as { __inp: { id: number }[] }).__inp.map((entry) => entry.id)));
      await sheet.getByRole("button", { name: /^Guardar/ }).click();
      // La interacción de guardar es el clic: E4 se pinta en ese cuadro; la respuesta del servidor no cuenta para INP.
      const save = await nextInteraction(page, last);
      last = save.id;
      saves.push(save.duration);
      await expect(sheet).toBeHidden();
      await expect(page.getByRole("status").filter({ hasText: copy.annotate.saved.expense })).toBeVisible();
      last = await page.evaluate(() => Math.max(0, ...(window as unknown as { __inp: { id: number }[] }).__inp.map((entry) => entry.id)));
    }
    const row = { width, cpu: "4x", runs: RUNS, open: opens, save: saves, inpOpen: Math.max(...opens), inpSave: Math.max(...saves), under200: Math.max(...opens, ...saves) < 200, kind: "laboratorio" };
    await appendFile(`${OUT}/inp.jsonl`, `${JSON.stringify(row)}\n`);
    console.log(JSON.stringify(row));
    await context.close();
  });
}
