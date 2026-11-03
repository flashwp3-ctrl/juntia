// @vitest-environment node
// T015 / FR-005, FR-026: tema antes de pintar, cambio del sistema y contexto válido; almacenamiento bloqueado no impide arrancar.
import { describe, expect, it } from "vitest";
import { themeScript } from "./theme-script";

function run(matches: boolean, context: string | null = null, blocked = false) {
  const attributes = new Map<string, string>();
  const media = { matches, addEventListener: (_event: string, callback: () => void) => { change = callback; } };
  let change = () => {};
  const document = { documentElement: { setAttribute: (key: string, value: string) => attributes.set(key, value), getAttribute: (key: string) => attributes.get(key) ?? null } };
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
