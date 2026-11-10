// 004 PR C (revisión del gestor del PR #68; mismo arreglo que el PR B en `7de0fed`, F67-2): captura de las respuestas RSC
// de una página para las comprobaciones de privacidad del prefetch (specs E2E 3, 4 y 5).
// El cuerpo se lee interceptando la petición (`route.fetch()`), no con `response.text()`: en las respuestas RSC
// transmitidas, Playwright no da el cuerpo y la lectura devolvía "" en silencio, así que no se inspeccionaba nada. La
// respuesta se entrega tal cual a la página (`route.fulfill`). Cada petición se marca al EMPEZAR, con su ruta y con si se
// inició ya en Nosotros. Un fallo al leer hace fallar la prueba: ningún `catch` lo cambia por "".
import type { Page } from "@playwright/test";

export type CapturedRsc = { path: string; underUs: boolean; body: string };

export async function captureRsc(page: Page) {
  let underUs = false;
  const fetched: { path: string; underUs: boolean; body: Promise<string> }[] = [];
  await page.route((url) => url.searchParams.has("_rsc"), async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    let settle!: (body: string) => void;
    let fail!: (error: unknown) => void;
    const body = new Promise<string>((resolve, reject) => { settle = resolve; fail = reject; });
    // Sin esto, un rechazo que nadie espera todavía sería un error no manejado; al leerlo con `read`, falla igual.
    body.catch(() => {});
    fetched.push({ path: new URL(route.request().url()).pathname, underUs, body });
    try {
      const response = await route.fetch();
      const text = await response.text();
      settle(text);
      await route.fulfill({ response, body: text });
    } catch (error) {
      fail(error);
      await route.abort().catch(() => {});
    }
  });
  return {
    /** Desde aquí la cookie ya dice Nosotros: toda petición que empiece ahora cuenta como de Nosotros. */
    nowUnderUs: () => { underUs = true; },
    /** Espera los cuerpos de las capturadas que cumplen `filter`; si alguno no se pudo leer, lanza. */
    read: (filter: (item: { path: string; underUs: boolean }) => boolean): Promise<CapturedRsc[]> =>
      Promise.all(fetched.filter(filter).map(async (item) => ({ path: item.path, underUs: item.underUs, body: await item.body }))),
  };
}
