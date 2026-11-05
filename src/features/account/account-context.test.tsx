// F43-1, tercera ronda: el layout de (app) vuelve a recibir el tema del perfil del servidor (por ejemplo tras guardar el
// nombre, con revalidatePath). Si en esta página ya se eligió un tema, manda el controlador: ThemeSync no lo pisa con
// un valor que puede estar desfasado mientras una escritura sigue en vuelo.
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountProvider } from "./account-context";
import { resetThemeController, themeController } from "./theme-controller";

beforeEach(() => {
  resetThemeController();
  document.cookie = "juntia_theme=; Path=/; Max-Age=0";
  document.documentElement.removeAttribute("data-theme");
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());

describe("AccountProvider · ThemeSync", () => {
  it("sin elección en esta página, copia el tema del perfil a la cookie (R8.6)", () => {
    render(<AccountProvider displayName="Sara" theme="dark"><span /></AccountProvider>);
    expect(document.cookie).toContain("juntia_theme=dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
  it("con una elección en curso, no la pisa con el perfil del servidor", () => {
    themeController().choose("dark", () => new Promise(() => {}));
    render(<AccountProvider displayName="Sara" theme="light"><span /></AccountProvider>);
    expect(document.cookie).toContain("juntia_theme=dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
