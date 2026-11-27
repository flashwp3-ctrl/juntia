// PR del paso 4b, Análisis (condición del gestor): la tabla «Ver cifras exactas» en WebKit, donde cambiar el `display` de una tabla
// suele quitarle la semántica. Mide como el caso 12 de `desbordes-117.capture.ts` (geometría y árbol de accesibilidad) y escribe
// `test-results/d117/cifras-{D117_TAG}-webkit.json`. Corre solo con `CIFRAS_WEBKIT=1 npm run e2e:dev -- tests/evidence/cifras-webkit.capture.ts`,
// contra juntia-dev; no es una prueba ni evidencia de CI.
import { mkdir, writeFile } from "node:fs/promises";
import { test } from "@playwright/test";
import { signedContext } from "../support/a11y";
import { measureFigures, openFigures } from "../support/figures";
import { seedCouple } from "../support/seed";

test.skip(process.env.CIFRAS_WEBKIT !== "1", "Solo a mano: CIFRAS_WEBKIT=1");
test.use({ browserName: "webkit" });

test("Análisis en WebKit: la tabla de cifras exactas, geometría y árbol de accesibilidad", async ({ browser, baseURL, browserName }, info) => {
  test.setTimeout(300_000);
  const pair = await seedCouple({ index: info.parallelIndex, golden: true });
  const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
  await openFigures(page);
  const out = await measureFigures(page);
  await mkdir("test-results/d117", { recursive: true });
  await writeFile(`test-results/d117/cifras-${process.env.D117_TAG ?? "medida"}-${browserName}.json`, JSON.stringify(out, null, 1));
  console.log(`cifras (${browserName}): ${out.length} medidas`);
  await context.close();
});
