// @vitest-environment node
// T015 / FR-005, FR-026 (001): tema antes de pintar, cambio del sistema y contexto válido; almacenamiento bloqueado no
// impide arrancar.
// T046 / FR-052; US-7.4 (002): «Given el tema guardado, When entra en otro dispositivo o recarga, Then el primer pintado
// ya usa ese tema». Research R7: con `light` o `dark` en `juntia_theme` pone ese tema y deja de seguir al sistema; con
// `system`, sin cookie o con un valor no válido, sigue al sistema como en la 001.
import { describe, expect, it } from "vitest";
import { themeScript } from "./theme-script";

function run(matches: boolean, context: string | null = null, blocked = false, cookie = "") {
  const attributes = new Map<string, string>();
  const media = { matches, addEventListener: (_event: string, callback: () => void) => { change = callback; } };
  let change = () => {};
  const document = { cookie, documentElement: { setAttribute: (key: string, value: string) => attributes.set(key, value), getAttribute: (key: string) => attributes.get(key) ?? null } };
  const window = { matchMedia: () => media, localStorage: { getItem: (key: string) => {
    expect(key).toBe("juntia:context");
    if (blocked) throw new DOMException("Almacenamiento bloqueado", "SecurityError");
    return context;
  } } };
  new Function("document", "window", themeScript)(document, window);
  return { attributes, media, change: () => change() };
}
describe("script bloqueante de tema (T015)", () => {
  it.each([[true, "dark"], [false, "light"]] as const)("resuelve matches=%s como %s", (matches, theme) => {
    expect(run(matches).attributes.get("data-theme")).toBe(theme);
  });
  it("sigue los cambios del sistema", () => {
    const result = run(false);
    result.media.matches = true;
    result.change();
    expect(result.attributes.get("data-theme")).toBe("dark");
    result.media.matches = false;
    result.change();
    expect(result.attributes.get("data-theme")).toBe("light");
  });
  it.each(["me", "us"])("recupera el contexto válido %s", (context) => {
    expect(run(true, context).attributes.get("data-context")).toBe(context);
  });
  it.each([null, "ilegible"])("ignora el contexto ausente o ilegible %s", (context) => {
    expect(run(true, context).attributes.has("data-context")).toBe(false);
  });
  it("aplica el tema sin lanzar aunque getItem lance SecurityError", () => {
    expect(run(true, null, true).attributes.get("data-theme")).toBe("dark");
  });
});

describe("cookie juntia_theme (T046)", () => {
  it.each([
    ["juntia_theme=light", true, "light"],
    ["juntia_theme=dark", false, "dark"],
    ["otra=1; juntia_theme=dark; sb-x=2", false, "dark"],
  ] as const)("con %s y el sistema en %s, el primer valor es %s", (cookie, systemDark, theme) => {
    expect(run(systemDark, null, false, cookie).attributes.get("data-theme")).toBe(theme);
  });
  it.each([
    ["juntia_theme=system", true, "dark"],
    ["juntia_theme=system", false, "light"],
    ["juntia_theme=sepia", true, "dark"],
    ["juntia_theme=darkness", false, "light"],
    ["no_juntia_theme=dark", false, "light"],
    ["", true, "dark"],
  ] as const)("con %s sigue al sistema (oscuro: %s → %s)", (cookie, systemDark, theme) => {
    expect(run(systemDark, null, false, cookie).attributes.get("data-theme")).toBe(theme);
  });
  it("un cambio del sistema no pisa el tema guardado", () => {
    const result = run(false, null, false, "juntia_theme=light");
    result.media.matches = true;
    result.change();
    expect(result.attributes.get("data-theme")).toBe("light");
  });
  it("con system sigue los cambios del sistema", () => {
    const result = run(false, null, false, "juntia_theme=system");
    result.media.matches = true;
    result.change();
    expect(result.attributes.get("data-theme")).toBe("dark");
  });
  it("si leer la cookie lanza, sigue al sistema", () => {
    const attributes = new Map<string, string>();
    const document = { get cookie(): string { throw new DOMException("bloqueada", "SecurityError"); }, documentElement: { setAttribute: (key: string, value: string) => attributes.set(key, value) } };
    const window = { matchMedia: () => ({ matches: true, addEventListener() {} }), localStorage: { getItem: () => null } };
    new Function("document", "window", themeScript)(document, window);
    expect(attributes.get("data-theme")).toBe("dark");
  });
});
