// T072 [V], T073 / SC-001, SC-005; FR-042, FR-061; maestro §15.7. Evidencia del PR C, no del gate: solo corre en el job
// evidence, con un solo worker (@serial) y después de las capturas, porque provoca estados reales en la base del runner que verían
// los demás workers:
//   · Cargando: un `lock table … access exclusive` en una sesión de psql retiene la lectura de movimientos; la ruta
//     enseña loading.tsx (el Skeleton) hasta que se suelta el bloqueo. Se captura y se mide CLS hasta el contenido final.
//   · Error: `revoke select` de la vista my_transactions a `authenticated` durante la captura; la lectura falla de verdad
//     (42501) y la pantalla enseña el estado de error con Reintentar. El permiso se devuelve en `finally`.
//   · CLS sin bloqueo, con CPU 6× y red lenta, y con el tema guardado (cookie y perfil).
//   · Objetivos táctiles ≥ 44 px y texto al 200 % sin scroll horizontal, a 390 y 1440.
// Una línea JSON por medición en test-results/evidence/pr-c.jsonl, para pegarla en evidence.md.
import { appendFile, mkdir } from "node:fs/promises";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";
import { runnerSql, spawnRunnerSql } from "../integration/support/sql";
import { seedMovements, seedUser } from "../support/seed";

const OUT = "test-results/evidence";
const THEMES = ["light", "dark"] as const;
const ROUTES = [
  { name: "inicio", path: "/", data: "current" as const },
  { name: "actividad", path: "/actividad?mes=2026-10", data: "golden" as const },
];
const LOADS = 5;
const OBSERVER = `(() => { const w = window; w.__cls = 0; w.__shifts = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) { w.__cls += e.value;
    w.__shifts.push(e.value.toFixed(5) + " " + (e.sources || []).map((s) => s.node ? s.node.nodeName + " " + (s.node.textContent || "").slice(0, 30) : "?").join(" | ")); } } })
    .observe({ type: "layout-shift", buffered: true }); })();`;

const record = async (row: object) => {
  await mkdir(OUT, { recursive: true });
  await appendFile(`${OUT}/pr-c.jsonl`, `${JSON.stringify(row)}\n`);
  console.log(JSON.stringify(row));
};
const shot = (page: Page, name: string, width: number, theme: string) =>
  page.screenshot({ path: `${OUT}/${name}--${width}--${theme === "light" ? "claro" : "oscuro"}.png`, fullPage: true, animations: "disabled" });

async function sessionContext(browser: import("@playwright/test").Browser, baseURL: string, theme: "light" | "dark", width: number, data: "golden" | "current") {
  const user = await seedUser({ role: "pr-c", index: test.info().parallelIndex });
  await seedMovements(user, data);
  // Tema guardado: el perfil y la cookie dicen lo mismo, como tras elegirlo en Apariencia.
  await user.client.rpc("set_theme", { p_theme: theme });
  const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, colorScheme: theme === "light" ? "dark" : "light", reducedMotion: "reduce" });
  await context.addCookies([...user.cookies, { name: "juntia_theme", value: theme, domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }]);
  return context;
}

/** Retiene la lectura de movimientos con un bloqueo real hasta que se llama a `release`. */
async function holdTransactions() {
  const psql = spawnRunnerSql();
  psql.stdin.write("begin; lock table juntia_data.transactions in access exclusive mode; select 'locked';\n");
  await new Promise<void>((resolve) => psql.stdout.on("data", (chunk) => { if (String(chunk).includes("locked")) resolve(); }));
  return () => new Promise<void>((resolve) => { psql.on("close", () => resolve()); psql.stdin.end("commit;\n"); });
}

async function measure(context: BrowserContext, path: string, hold: boolean) {
  const page = await context.newPage();
  await page.addInitScript(OBSERVER);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  const release = hold ? await holdTransactions() : null;
  await page.goto(path, { waitUntil: "commit" });
  let skeleton = false;
  if (release) {
    await expect(page.locator("[data-skeleton-visible]").first()).toBeVisible();
    skeleton = true;
    await release();
  }
  await expect(page.locator("[data-context-view='me']").first()).toBeVisible();
  await expect(page.locator("[data-skeleton-visible]")).toHaveCount(0);
  await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const result = await page.evaluate(() => { const w = window as unknown as { __cls: number; __shifts: string[] }; return { cls: w.__cls, shifts: w.__shifts }; });
  await page.close();
  return { ...result, skeleton };
}

for (const theme of THEMES) {
  for (const width of [390, 1440]) {
    for (const route of ROUTES) {
      test(`@serial ${route.name} · cargando, CLS, error, táctiles y 200 % · ${theme} · ${width}`, async ({ browser, baseURL }) => {
        test.setTimeout(180_000);
        const context = await sessionContext(browser, baseURL!, theme, width, route.data);

        // Cargando (captura) con el Skeleton visible y retenido por el bloqueo.
        const loadingPage = await context.newPage();
        const release = await holdTransactions();
        try {
          await loadingPage.goto(route.path, { waitUntil: "commit" });
          await expect(loadingPage.locator("[data-skeleton-visible]").first()).toBeVisible();
          await shot(loadingPage, `${route.name}--cargando`, width, theme);
        } finally {
          await release();
        }
        await loadingPage.close();

        // CLS: cinco cargas con el Skeleton retenido y cinco sin retener, con CPU 6×.
        for (const hold of [true, false]) {
          for (let load = 1; load <= LOADS; load++) {
            const result = await measure(context, route.path, hold);
            await record({ kind: "cls", route: route.path, theme, width, case: hold ? "skeleton retenido" : "carga normal", load, ...result });
            expect.soft(result.cls, `${route.path} ${theme} ${width} ${hold ? "retenido" : "normal"} ${load}`).toBe(0);
          }
        }

        // Objetivos táctiles y texto al 200 % sobre la ruta con datos.
        const page = await context.newPage();
        await page.goto(route.path);
        await expect(page.locator("main")).toBeVisible();
        const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("main a, main button, main input, main [role='radio'], nav a, nav button")]
          .filter((node) => node.getClientRects().length > 0 && !node.closest(".sr-only"))
          .map((node) => {
            // Un campo dentro de su <label>: el objetivo es el marco entero, que enfoca el campo (Input, D-02 de la 001).
            const box = (node.tagName === "INPUT" ? node.closest("label") ?? node : node).getBoundingClientRect();
            const after = getComputedStyle(node, "::after");
            const extended = after.content !== "none" && after.position === "absolute";
            const label = node.getAttribute("aria-label") ?? node.textContent?.trim().slice(0, 30) ?? node.tagName;
            return { label, width: Math.round(box.width), height: Math.round(box.height), extended };
          })
          .filter(({ width, height, extended }) => !extended && (width < 44 || height < 44)));
        await record({ kind: "touch", route: route.path, theme, width, under44: small });
        expect.soft(small, `${route.path} objetivos < 44 px`).toEqual([]);
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const zoom = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
          clipped: [...document.querySelectorAll<HTMLElement>("main h1, main h2, main p, main a, main button")].filter((node) => node.getClientRects().length > 0 && node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).textOverflow !== "ellipsis")
            .map((node) => `${node.tagName.toLowerCase()} «${(node.textContent ?? "").trim().slice(0, 40)}» ${node.scrollWidth}/${node.clientWidth}`) }));
        await record({ kind: "text-200", route: route.path, theme, width, ...zoom });
        expect.soft(zoom.scrollWidth, `${route.path} scroll horizontal al 200 %`).toBeLessThanOrEqual(zoom.viewport);
        await shot(page, `${route.name}--texto-200`, width, theme);
        await page.close();

        // Error real: la lectura de movimientos falla con 42501 mientras dura la captura.
        runnerSql("revoke select on public.my_transactions from authenticated;");
        try {
          const errorPage = await context.newPage();
          await errorPage.goto(route.path);
          await expect(errorPage.getByRole("heading", { name: copy.load.error.title })).toBeVisible();
          await expect(errorPage.getByRole("button", { name: copy.states.retry })).toBeVisible();
          await shot(errorPage, `${route.name}--error`, width, theme);
          await errorPage.close();
        } finally {
          runnerSql("grant select on public.my_transactions to authenticated;");
        }
        await context.close();
      });
    }
  }
}
