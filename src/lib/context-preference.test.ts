// F44-1, segunda ronda de la revisión del PR #44: «la regex usa `;s*` en lugar de `;\s*`, así que readContextCookie()
// falla cuando juntia_context no es la primera cookie». Capa: componente (jsdom), sobre document.cookie real.
import { afterEach, describe, expect, it } from "vitest";
import { readContextCookie, writeContextCookie } from "./context-preference";

const clear = () => {
  for (const name of ["juntia_context", "a", "juntia_theme", "sb-xyz-auth-token", "otra_juntia_context"]) document.cookie = `${name}=; Path=/; Max-Age=0`;
};
afterEach(clear);

describe("cookie de contexto (F44-1)", () => {
  it("la lee en cualquier posición y con o sin espacio tras el punto y coma", () => {
    for (const before of [[], ["a=1"], ["juntia_theme=dark", "sb-xyz-auth-token=x"]]) {
      clear();
      for (const cookie of before) document.cookie = `${cookie}; Path=/`;
      document.cookie = "juntia_context=us; Path=/";
      document.cookie = "a=2; Path=/";
      expect(readContextCookie(), JSON.stringify(before)).toBe("us");
    }
  });

  it("no confunde otra cookie que termina igual ni acepta valores no válidos", () => {
    document.cookie = "otra_juntia_context=us; Path=/";
    expect(readContextCookie()).toBeNull();
    document.cookie = "juntia_context=nosotros; Path=/";
    expect(readContextCookie()).toBeNull();
  });

  it("escribe y vuelve a leer el mismo valor", () => {
    document.cookie = "juntia_theme=light; Path=/";
    writeContextCookie("me");
    expect(readContextCookie()).toBe("me");
    writeContextCookie("us");
    expect(readContextCookie()).toBe("us");
  });
});
