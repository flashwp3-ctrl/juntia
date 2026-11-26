// F111-12 (revisión del PR #111, ronda 2; PR aparte autorizado por los fundadores el 26 nov 2026): diagnóstico de
// «rectángulos distintos del aviso» en tests/a11y/routes.a11y.ts (annotateFrames; la aserción, `new Set(notice.rects).size`
// igual a 1). Repite la MISMA medición —abrir Anotar por su disparador visible y guardar el rectángulo del diálogo o la hoja en
// cada cuadro (requestAnimationFrame) durante 10 cuadros— varias veces por ruta, a 390 en claro y con movimiento reducido.
// Además instrumenta BottomSheet desde fuera, sin cambiar el producto: en cada cuadro guarda `body.style.minHeight`,
// `body.offsetHeight` y el alto fraccionario de `body` (el área con scroll de la hoja, la que fija `holdKey`), y en qué cuadro
// cambia `minHeight` (MutationObserver). Corre solo con `F111_12=1 npm run e2e:dev -- tests/evidence/f111-12.capture.ts`,
// contra juntia-dev; no es una prueba ni evidencia de CI. Que una corrida «pase» solo dice que terminó y escribió sus series.
import { appendFile, mkdir } from "node:fs/promises";
import { expect, test, type Page, type Request } from "@playwright/test";
import { seedMovements, seedUser } from "../support/seed";

const OUT = "test-results/f111-12";
const FRAMES = 10;
const REPEATS = 12;
const ROUTES = ["/", "/actividad", "/metas", "/balance"] as const;
const LABEL = process.env.F111_12_LABEL ?? "candidato";
/** Carga simulada: ralentización de CPU por CDP (1 = sin ralentizar). Los fallos ocurrieron con 8 workers en paralelo. */
const CPU = Number(process.env.F111_12_CPU ?? "1");
/** Con `F111_12_KNOB=1`, antes de medir se hace lo mismo que `knobFrames` de routes.a11y.ts: «Nosotros» 10 cuadros y vuelta a «Yo». */
const KNOB = process.env.F111_12_KNOB === "1";
/** Con `F111_12_WAIT=1`, la secuencia nueva de routes.a11y.ts: esperar a «Nosotros», volver a «Yo» y esperar a «Yo». Sin ella, la vuelta inmediata de antes. */
const WAIT = process.env.F111_12_WAIT === "1";

test.skip(process.env.F111_12 !== "1", "Solo a mano: F111_12=1");

// Copia literal de `trackRsc`, `settleContext` y `backToMe` de routes.a11y.ts (F111-12), para medir con la misma espera que la
// prueba. No se importan del archivo de pruebas para no registrar sus tests aquí.
type ContextValue = "me" | "us";
function trackRsc(page: Page) {
  const inFlight = new Set<Request>();
  const order = new Map<Request, number>();
  const cookies = new Map<number, ContextValue | null>();
  const finished: { index: number; cookie: ContextValue | null }[] = [];
  let next = 0;
  const cookieOf = async (request: Request) => (/(?:^|;\s*)juntia_context=(me|us)(?:;|$)/.exec((await request.allHeaders()).cookie ?? "")?.[1] as ContextValue | undefined) ?? null;
  const started = (request: Request) => {
    if (request.headers().rsc !== "1") return;
    const index = next++;
    inFlight.add(request);
    order.set(request, index);
    void cookieOf(request).then((cookie) => cookies.set(index, cookie));
  };
  const done = async (request: Request) => {
    if (!inFlight.has(request)) return;
    finished.push({ index: order.get(request)!, cookie: await cookieOf(request) });
    inFlight.delete(request);
  };
  page.on("request", started);
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  return {
    /** Nada en vuelo, la cookie del documento en `target` y terminada una petición con esa cookie posterior a la última con la otra. */
    settled: async (target: ContextValue) => {
      if (inFlight.size > 0 || cookies.size < next) return false;
      const cookie = await page.evaluate(() => /(?:^|;\s*)juntia_context=(me|us)(?:;|$)/.exec(document.cookie)?.[1] ?? null);
      if (cookie !== target) return false;
      const lastOther = Math.max(-1, ...[...cookies].filter(([, value]) => value !== null && value !== target).map(([index]) => index));
      return finished.some((item) => item.cookie === target && item.index > lastOther);
    },
    /** Para diagnosticar un fallo: qué quedó en vuelo y con qué cookie salió y terminó cada petición. */
    snapshot: () => ({ inFlight: [...inFlight].map((request) => new URL(request.url()).pathname), cookies: Object.fromEntries(cookies), finished, started: next }),
    stop: () => { page.off("request", started); page.off("requestfinished", done); page.off("requestfailed", done); },
  };
}

async function settleContext(page: Page, rsc: ReturnType<typeof trackRsc>, target: ContextValue) {
  await expect.poll(() => rsc.settled(target), { message: `el cambio a ${target === "me" ? "«Yo»" : "«Nosotros»"} termina (su cookie, su RSC terminado y nada en vuelo)` }).toBe(true);
  if (target === "me") await expect(page.locator('[data-context-view="me"]:visible').first()).toBeVisible();
  await expect(page.locator("main [data-skeleton]:visible")).toHaveCount(0);
}

/** Vuelve a «Yo» con el mismo selector visible que usó `knobFrames`. */
async function backToMe(page: Page) {
  await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-context-selector] [role="radiogroup"]')].find((node) => node.getClientRects().length > 0)!.querySelector<HTMLElement>('[data-value="me"]')!.click());
}

test("aviso de Anotar: rectángulos e instrumentación de BottomSheet por cuadro a 390, claro, movimiento reducido", async ({ browser, baseURL }, info) => {
  test.setTimeout(900_000);
  await mkdir(OUT, { recursive: true });
  const user = await seedUser({ role: "f111-12", index: info.parallelIndex });
  await seedMovements(user, "recent");
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, colorScheme: "light", reducedMotion: "reduce" });
  await context.addCookies([...user.cookies, { name: "juntia_theme", value: "light", domain: "localhost", path: "/" }, { name: "juntia_context", value: "me", domain: "localhost", path: "/" }]);
  const page = await context.newPage();

  if (CPU > 1) await (await context.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: CPU });
  for (const route of ROUTES) {
    await context.tracing.start({ screenshots: true, snapshots: true });
    await page.goto(route);
    await expect(page.locator("[data-annotate-trigger]").first()).toBeAttached();
    // Como routes.a11y.ts antes de `knobFrames`: el selector ya hidratado (si no, pulsar «Nosotros» no hace nada).
    await expect(page.locator("[data-context-selector][data-hydrated]").first()).toBeAttached();
    for (let repeat = 0; repeat < REPEATS; repeat++) {
      let settle = "sin espera";
      let settleSnapshot = "";
      if (KNOB) {
        const rsc = trackRsc(page);
        // Lo mismo que `knobFrames`: «Nosotros» y 10 cuadros.
        await page.evaluate((frames) => new Promise<void>((resolve) => {
          const group = [...document.querySelectorAll<HTMLElement>('[data-context-selector] [role="radiogroup"]')].find((node) => node.getClientRects().length > 0)!;
          group.querySelector<HTMLElement>('[data-value="us"]')!.click();
          let count = 0;
          const tick = () => { if (++count < frames) requestAnimationFrame(tick); else resolve(); };
          requestAnimationFrame(tick);
        }), FRAMES);
        if (WAIT) {
          // La secuencia nueva de routes.a11y.ts. Si una espera no se cumple, se registra el estado y se mide igual.
          settle = await settleContext(page, rsc, "us").then(() => "us ok", () => `«Nosotros» sin asentar: ${JSON.stringify(rsc.snapshot())}`);
          await backToMe(page);
          const back = await settleContext(page, rsc, "me").then(() => "me ok", () => `«Yo» sin asentar: ${JSON.stringify(rsc.snapshot())}`);
          settle = settle === "us ok" && back === "me ok" ? "ok" : `${settle} · ${back}`;
          settleSnapshot = JSON.stringify(rsc.snapshot());
        } else {
          // El orden antiguo: vuelta a «Yo» en cuanto termina de medir la perilla.
          await backToMe(page);
        }
        rsc.stop();
      }
      const series = await page.evaluate((frames) => new Promise<{ container: string; rects: string[]; firstFrame: number; body: string[]; minHeightChanges: { frame: number; value: string }[] }>((resolve) => {
        const trigger = [...document.querySelectorAll<HTMLElement>("[data-annotate-trigger]")].find((node) => node.getClientRects().length > 0)!;
        trigger.click();
        const rects: string[] = [];
        const body: string[] = [];
        const minHeightChanges: { frame: number; value: string }[] = [];
        let container = "";
        let frame = 0;
        let firstFrame = -1;
        let observed: HTMLElement | null = null;
        const tick = () => {
          frame++;
          const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
          if (dialog) {
            if (firstFrame < 0) firstFrame = frame;
            container = dialog.hasAttribute("data-modal") ? "diálogo" : "hoja";
            const { top, left, width, height } = dialog.getBoundingClientRect();
            rects.push([top, left, width, height].map((value) => value.toFixed(2)).join("/"));
            const area = dialog.querySelector<HTMLElement>(".overscroll-contain");
            if (area && area !== observed) {
              observed = area;
              new MutationObserver(() => minHeightChanges.push({ frame, value: area.style.minHeight })).observe(area, { attributes: true, attributeFilter: ["style"] });
            }
            body.push(area ? `${area.style.minHeight || "(vacío)"}|offset ${area.offsetHeight}|rect ${area.getBoundingClientRect().height.toFixed(2)}` : "(sin área)");
          }
          if (rects.length < frames) requestAnimationFrame(tick);
          else resolve({ container, rects, firstFrame, body, minHeightChanges });
        };
        requestAnimationFrame(tick);
      }), FRAMES);
      const distinct = [...new Set(series.rects)];
      const changed = distinct.length > 1
        ? ["top", "left", "width", "height"].filter((_, index) => new Set(distinct.map((rect) => rect.split("/")[index])).size > 1)
        : [];
      const row = { label: LABEL, cpu: CPU, knob: KNOB, wait: WAIT, settle, settleSnapshot, theme: "light", width: 390, reducedMotion: true, route, repeat, container: series.container, firstFrame: series.firstFrame, distinct: distinct.length, changed, rects: series.rects, body: series.body, minHeightChanges: series.minHeightChanges };
      await appendFile(`${OUT}/f111-12.jsonl`, `${JSON.stringify(row)}\n`);
      console.log(JSON.stringify(row));
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await context.tracing.stop({ path: `${OUT}/trace-${LABEL}-cpu${CPU}${KNOB ? "-knob" : ""}${WAIT ? "-wait" : ""}-${route === "/" ? "inicio" : route.slice(1)}.zip` });
  }
  await context.close();
});
