// 004 PR C (revisión del gestor del PR #68; mismo arreglo que el PR B en `7de0fed`, F67-2, y F67-4): captura de las
// respuestas RSC de una página para las comprobaciones de privacidad del prefetch (specs E2E 3, 4 y 5).
// El cuerpo se lee interceptando la petición (`route.fetch()`), no con `response.text()`: en las respuestas RSC
// transmitidas, Playwright no da el cuerpo y la lectura devolvía "" en silencio, así que no se inspeccionaba nada. La
// respuesta se entrega tal cual a la página (`route.fulfill`). Un fallo al leer hace fallar la prueba: ningún `catch` lo
// cambia por "".
// F67-4: cada petición se clasifica por SU PROPIA cookie al empezar (`juntia_context=us`), no por una bandera que la prueba
// mueve a mano: así el `router.refresh()` del cambio Yo → Nosotros, que ya viaja con la cookie nueva, cuenta como de
// Nosotros y se inspecciona.
import type { Page } from "@playwright/test";

export type CapturedRsc = { path: string; underUs: boolean; body: string };

const underUsCookie = (header: string | null) => (header ?? "").split(";").some((part) => part.trim() === "juntia_context=us");

export async function captureRsc(page: Page) {
  const fetched: { path: string; underUs: boolean; body: Promise<string> }[] = [];
  await page.route((url) => url.searchParams.has("_rsc"), async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    let settle!: (body: string) => void;
    let fail!: (error: unknown) => void;
    const body = new Promise<string>((resolve, reject) => { settle = resolve; fail = reject; });
    // Sin esto, un rechazo que nadie espera todavía sería un error no manejado; al leerlo con `read`, falla igual.
    body.catch(() => {});
    // 005 · PR B (corrección 6, FR-020): WebKit no expone la cabecera Cookie en la petición interceptada (la añade su capa de red
    // después), y todas salían como «no de Nosotros»: la lista quedaba vacía (run 44349192421, cuatro fallos «RSC del cambio»).
    // Sin cabecera, cuenta la cookie que el contexto tiene para esa URL en el instante de interceptarla, que es la que viaja.
    const header = await route.request().headerValue("cookie");
    const jar = header === null ? (await page.context().cookies(route.request().url())).map(({ name, value }) => `${name}=${value}`).join("; ") : header;
    fetched.push({ path: new URL(route.request().url()).pathname, underUs: underUsCookie(jar), body });
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
    /** Espera los cuerpos de las capturadas HASTA AHORA que cumplen `filter`; si alguno no se pudo leer, lanza. */
    read: (filter: (item: { path: string; underUs: boolean }) => boolean): Promise<CapturedRsc[]> =>
      Promise.all(fetched.filter(filter).map(async (item) => ({ path: item.path, underUs: item.underUs, body: await item.body }))),
  };
}
