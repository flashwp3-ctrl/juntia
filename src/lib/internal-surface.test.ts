// @vitest-environment node
// T036 / FR-049, FR-053 — capa: unidad de funciones puras, sin importar la página (que importa server-only).
// Criterio literal (FR-049): «Su disponibilidad se define por destino de despliegue, no por modo de compilación».
// Criterio literal (FR-053): «el build destinado al despliegue de producción no expone la superficie interna».
// Tabla de data-model.md, «InternalSurfaceGate». URLs ficticias de prueba; nunca dominios reales.
import { describe, expect, it } from "vitest";
import { isAllowedInternalHost, isInternalSurfaceEnabled } from "./internal-surface";

const urls = {
  VERCEL_URL: "juntia-abc123-equipo.vercel.app",
  VERCEL_BRANCH_URL: "juntia-git-rama-equipo.vercel.app",
  VERCEL_PROJECT_PRODUCTION_URL: "juntia.example",
};

describe("isInternalSurfaceEnabled (primera barrera: destino)", () => {
  it.each([
    ["next dev local", { NODE_ENV: "development" }, true],
    ["next start local sin bandera", { NODE_ENV: "production" }, false],
    ["next start con bandera (CI, capturas)", { NODE_ENV: "production", JUNTIA_INTERNAL_SURFACE: "1" }, true],
    ["preview de Vercel", { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview" }, true],
    ["producción de Vercel", { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production" }, false],
    ["producción con la bandera puesta por error", { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production", JUNTIA_INTERNAL_SURFACE: "1" }, false],
    ["Vercel sin variables de sistema expuestas", { NODE_ENV: "production" }, false],
  ] as const)("%s", (_case, env, expected) => {
    expect(isInternalSurfaceEnabled(env)).toBe(expected);
  });
});

describe("isAllowedInternalHost (segunda barrera: host)", () => {
  const preview = { VERCEL: "1", VERCEL_ENV: "preview", ...urls };
  it.each([
    ["preview por su VERCEL_URL", "juntia-abc123-equipo.vercel.app", preview, true],
    ["preview por su VERCEL_BRANCH_URL con puerto y mayúsculas", "Juntia-Git-Rama-Equipo.Vercel.App:443", preview, true],
    ["preview con alias al dominio de producción", "juntia.example", preview, false],
    ["preview con alias a otro dominio (www)", "www.juntia.example", preview, false],
    ["preview sin cabecera host", null, preview, false],
    ["preview sin variables de URL", "juntia-abc123-equipo.vercel.app", { VERCEL: "1", VERCEL_ENV: "preview" }, false],
    ["fuera de un preview", "localhost:3000", { NODE_ENV: "production", JUNTIA_INTERNAL_SURFACE: "1" }, true],
  ] as const)("%s", (_case, host, env, expected) => {
    expect(isAllowedInternalHost(host, env)).toBe(expected);
  });
});
