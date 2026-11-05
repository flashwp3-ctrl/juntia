// @vitest-environment node
// T051 / FR-067; SC-002; ADR-011 §5, enmienda «Axe en dos jobs»; contracts/ci.md, «Prueba de cobertura»: «recorre los
// `page.tsx` de `src/app` y afirma que cada ruta implementada está en exactamente una de las dos listas, que las dos
// listas juntas cubren todas las rutas, que cada entrada se audita en los dos temas y que ninguna entrada con
// `session: 'user'` o `'recovery'` cae en `app`. Una ruta nueva sin clasificar hace fallar `verify`».
// Interpretación de ejecución (PR B): las dos listas son las de la sesión que necesita cada ruta (sin sesión / con
// sesión). Unos pocos estados sin sesión (A1b, A1c, A4b) necesitan la respuesta real de Auth, que el job app no tiene;
// se marcan `needsAuthApi` y se auditan en e2e, sin cambiar la lista de su ruta.
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { appEntries, e2eEntries, registry, sessionEntries, sessionlessEntries, THEMES } from "./route-registry";

const APP = join(process.cwd(), "src", "app");

/** `src/app/(auth)/entrar/page.tsx` → `/entrar`: los grupos `(x)` no forman parte de la URL. */
function implementedRoutes(dir = APP): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return implementedRoutes(path);
    if (entry.name !== "page.tsx") return [];
    const segments = relative(APP, dir).split(sep).filter((segment) => segment && !/^\(.*\)$/.test(segment));
    return [`/${segments.join("/")}`];
  });
}

describe("registro de rutas de axe (T051)", () => {
  const routes = implementedRoutes();
  const appRoutes = new Set(sessionlessEntries.map(({ route }) => route));
  const e2eRoutes = new Set(sessionEntries.map(({ route }) => route));

  it("encuentra las rutas implementadas", () => {
    expect(routes).toContain("/entrar");
    expect(routes).toContain("/cuenta/seguridad");
  });

  it("cada ruta implementada está en exactamente una lista", () => {
    for (const route of routes) {
      expect([appRoutes.has(route), e2eRoutes.has(route)].filter(Boolean), route).toHaveLength(1);
    }
  });

  it("las dos listas juntas cubren todas las rutas y no inventan ninguna", () => {
    const listed = new Set([...appRoutes, ...e2eRoutes]);
    for (const route of routes) expect(listed.has(route), route).toBe(true);
    // La única entrada sin page.tsx es la URL inexistente que audita el estado «no encontrado».
    for (const route of listed) expect(routes.includes(route) || route === "/ruta-que-no-existe", route).toBe(true);
  });

  it("cada entrada se audita en los dos temas", () => {
    expect(THEMES).toEqual(["light", "dark"]);
    for (const entry of registry) expect(entry.themes ?? THEMES, `${entry.route} · ${entry.state}`).toEqual(THEMES);
  });

  it("los dos jobs reparten todas las entradas y ninguna entrada con sesión cae en app", () => {
    expect(appEntries.length + e2eEntries.length).toBe(registry.length);
    for (const entry of sessionEntries) expect(appEntries.includes(entry), `${entry.route} · ${entry.state}`).toBe(false);
    for (const entry of appEntries) expect(entry.session, `${entry.route} · ${entry.state}`).toBe("none");
    for (const entry of e2eEntries) expect(entry.session !== "none" || entry.needsAuthApi === true, `${entry.route} · ${entry.state}`).toBe(true);
  });
});
