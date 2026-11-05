// T053 [V] / SC-005 (acceso y Mi cuenta); US-7.4. El arnés de evidence-plan/theme-v-theme-cookie.theme.ts.txt (research
// R7), sobre las rutas reales del PR B: CPU 6×, red lenta, screencast de todos los cuadros, CLS y tema al aparecer <body>.
// Casos: cookie contraria al sistema, `system`, valor no válido y sin cookie. Imprime una línea JSON por ruta y caso para
// pegarla en evidence.md. No es una prueba del gate: solo corre bajo demanda (job evidence).
import { expect, test, type Page } from "@playwright/test";
import { seedUser } from "../support/seed";

const PALETTE = { light: ["[238,231,218]", "[247,243,235]"], dark: ["[15,17,18]", "[18,20,22]"] } as const;
const BLANKS = ["[255,255,255]", "[18,18,18]"];
const OBSERVER = `(() => {
  const w = window; w.__themeAtBody = undefined; w.__cls = 0;
  new MutationObserver((_, o) => { if (document.body) { w.__themeAtBody = document.documentElement.getAttribute("data-theme"); o.disconnect(); } }).observe(document, { childList: true, subtree: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) w.__cls += e.value; } }).observe({ type: "layout-shift", buffered: true });
})();`;

async function probe(page: Page, url: string) {
  await page.addInitScript(OBSERVER);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
  const frames: { ts: number; data: string }[] = [];
  cdp.on("Page.screencastFrame", (f) => { frames.push({ ts: f.metadata.timestamp ?? 0, data: f.data }); void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); });
  await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
  await page.goto(url, { waitUntil: "load" });
  await expect(page.locator("main").first()).toBeVisible();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await cdp.send("Page.stopScreencast");
  const timing = await page.evaluate(() => {
    const w = window as unknown as { __themeAtBody: string | null; __cls: number };
    const fp = performance.getEntriesByType("paint").find((e) => e.name === "first-paint");
    return { themeAtBody: w.__themeAtBody, cls: w.__cls, finalTheme: document.documentElement.getAttribute("data-theme"), firstPaint: fp ? performance.timeOrigin + fp.startTime : 0 };
  });
  const decoder = await page.context().newPage();
  const pixels: { px: string; rel: number }[] = [];
  for (const f of frames) {
    const px = await decoder.evaluate(async (b64) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
      return Array.from(x.getImageData(4, img.height - 4, 1, 1).data.slice(0, 3));
    }, f.data);
    pixels.push({ px: JSON.stringify(px), rel: Math.round(f.ts * 1000 - timing.firstPaint) });
  }
  await decoder.close();
  const content = pixels.filter((p) => !BLANKS.includes(p.px)).map((p) => p.px);
  return { ...timing, contentFrames: content.length, framePixels: [...new Set(content)], blanksAfterPaint: pixels.filter((p) => BLANKS.includes(p.px) && p.rel >= 0).length };
}

const cases = [
  { system: "light", cookie: "dark", expected: "dark" },
  { system: "dark", cookie: "light", expected: "light" },
  { system: "dark", cookie: "system", expected: "dark" },
  { system: "light", cookie: "bogus", expected: "light" },
  { system: "dark", cookie: null, expected: "dark" },
] as const;
const routes = [
  { path: "/entrar", session: false }, { path: "/crear-cuenta", session: false }, { path: "/recuperar", session: false },
  { path: "/cuenta", session: true }, { path: "/cuenta/perfil", session: true }, { path: "/cuenta/apariencia", session: true }, { path: "/cuenta/seguridad", session: true },
] as const;
const withSupabase = Boolean(process.env.API_URL);

for (const route of routes.filter(({ session }) => withSupabase || !session)) {
  for (const c of cases) {
    test(`${route.path} · sistema ${c.system} · cookie ${c.cookie ?? "(ninguna)"}`, async ({ browser, baseURL }, testInfo) => {
      const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 }, colorScheme: c.system, reducedMotion: "reduce" });
      if (route.session) {
        const user = await seedUser({ role: "cls", index: testInfo.parallelIndex });
        // El perfil guarda el tema del caso (o system), para que ThemeSync no lo reescriba en la carga medida.
        if (c.cookie === "light" || c.cookie === "dark") await user.client.rpc("set_theme", { p_theme: c.cookie });
        await context.addCookies(user.cookies);
      }
      if (c.cookie) await context.addCookies([{ name: "juntia_theme", value: c.cookie, domain: new URL(baseURL!).hostname, path: "/", sameSite: "Lax" }]);
      const page = await context.newPage();
      const result = await probe(page, route.path);
      const palette: readonly string[] = PALETTE[c.expected];
      const wrongFrames = result.framePixels.filter((px) => !palette.includes(px));
      console.log(JSON.stringify({ route: route.path, system: c.system, cookie: c.cookie, expected: c.expected, themeAtBody: result.themeAtBody, finalTheme: result.finalTheme, cls: result.cls, contentFrames: result.contentFrames, framePixels: result.framePixels, wrongFrames, blanksAfterPaint: result.blanksAfterPaint }));
      expect(result.themeAtBody).toBe(c.expected);
      expect(result.finalTheme).toBe(c.expected);
      expect(result.cls).toBe(0);
      expect(wrongFrames).toEqual([]);
      await context.close();
    });
  }
}
