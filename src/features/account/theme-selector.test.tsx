// T040 / FR-052; US-7.3: «Given Apariencia (04·16 T1), When elige Claro, Oscuro o Sistema, Then el tema cambia […] y queda
// guardado en el perfil y en una cookie (Q7)». COMPONENT_SPECIFICATIONS.md §ThemeSelector: «`radiogroup` de 3 tarjetas
// con miniatura. Flechas cambian y aplican». Research R7: cookie `juntia_theme`, `Path=/`, `SameSite=Lax`, un año.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { ThemeSelector } from "./theme-selector";

let systemDark = false;
beforeEach(() => {
  systemDark = false;
  document.cookie = "juntia_theme=; Path=/; Max-Age=0";
  document.documentElement.removeAttribute("data-theme");
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("dark") && systemDark, media: query, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());

const option = (name: string) => screen.getByRole("radio", { name: new RegExp(name) });

describe("ThemeSelector (T040)", () => {
  it("es un radiogroup de tres opciones con la guardada seleccionada", () => {
    render(<ThemeSelector initial="system" persist={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: copy.account.appearance.label })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(option(copy.account.appearance.system).getAttribute("aria-checked")).toBe("true");
    expect(option(copy.account.appearance.light).getAttribute("tabindex")).toBe("-1");
  });

  it("al elegir aplica data-theme, escribe la cookie y guarda en el perfil", async () => {
    const persist = vi.fn().mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ThemeSelector initial="system" persist={persist} />);
    await user.click(option(copy.account.appearance.dark));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.cookie).toContain("juntia_theme=dark");
    expect(persist).toHaveBeenCalledWith("dark");
    expect(option(copy.account.appearance.dark).getAttribute("aria-checked")).toBe("true");
  });

  it("las flechas cambian y aplican", async () => {
    const persist = vi.fn().mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ThemeSelector initial="light" persist={persist} />);
    option(copy.account.appearance.light).focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(option(copy.account.appearance.dark));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await user.keyboard("{ArrowRight}");
    expect(document.cookie).toContain("juntia_theme=system");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(persist).toHaveBeenLastCalledWith("light");
  });

  it("Sistema sigue a prefers-color-scheme", async () => {
    systemDark = true;
    const user = userEvent.setup();
    render(<ThemeSelector initial="light" persist={vi.fn().mockResolvedValue({ ok: true })} />);
    await user.click(option(copy.account.appearance.system));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("si la sesión caducó, lo dice sin deshacer el tema del dispositivo", async () => {
    const user = userEvent.setup();
    render(<ThemeSelector initial="light" persist={vi.fn().mockResolvedValue({ ok: false, error: "sessionExpired" })} />);
    await user.click(option(copy.account.appearance.dark));
    expect(await screen.findByText(copy.errors.sessionExpired)).toBeTruthy();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
  // F43-1 (revisión del PR #43): un fallo al guardar no se muestra como éxito. Vuelve al último tema confirmado
  // (data-theme, cookie y selección) y lo dice con copy.errors.saveFailed.
  it("si guardar falla, vuelve al último tema confirmado y lo dice", async () => {
    const user = userEvent.setup();
    const persist = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, error: "failed" });
    render(<ThemeSelector initial="light" persist={persist} />);
    await user.click(option(copy.account.appearance.dark));
    await user.click(option(copy.account.appearance.system));
    expect(await screen.findByText(copy.errors.saveFailed)).toBeTruthy();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.cookie).toContain("juntia_theme=dark");
    expect(option(copy.account.appearance.dark).getAttribute("aria-checked")).toBe("true");
    expect(option(copy.account.appearance.system).getAttribute("aria-checked")).toBe("false");
  });

  // F43-1, segunda ronda (concurrencia): las escrituras se serializan y el tema confirmado sigue a cada escritura
  // efectiva. Al final, el perfil (lo que guardó persist), la cookie, data-theme y la selección coinciden.
  function deferred() {
    let resolve!: (value: { ok: true } | { ok: false; error: "failed" }) => void;
    const promise = new Promise<{ ok: true } | { ok: false; error: "failed" }>((done) => { resolve = done; });
    return { promise, resolve };
  }
  const state = () => ({
    theme: document.documentElement.getAttribute("data-theme"),
    cookie: document.cookie.match(/juntia_theme=([a-z]+)/)?.[1],
    checked: screen.getAllByRole("radio").find((radio) => radio.getAttribute("aria-checked") === "true")?.textContent,
  });

  it("dos guardados seguidos: el segundo espera al primero y el final coincide con el perfil", async () => {
    const first = deferred();
    const second = deferred();
    const persist = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const user = userEvent.setup();
    render(<ThemeSelector initial="light" persist={persist} />);
    await user.click(option(copy.account.appearance.dark));
    await user.click(option(copy.account.appearance.system));
    expect(persist).toHaveBeenCalledTimes(1);
    second.resolve({ ok: true }); // una respuesta «adelantada» del segundo no cambia nada: todavía no se envió
    first.resolve({ ok: true });
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(2));
    expect(persist.mock.calls.map(([theme]) => theme)).toEqual(["dark", "system"]);
    await vi.waitFor(() => expect(state()).toEqual({ theme: "light", cookie: "system", checked: copy.account.appearance.system }));
    expect(screen.queryByText(copy.errors.saveFailed)).toBeNull();
  });

  it("el primero se guarda y el segundo falla: vuelve al tema realmente guardado (dark), no al inicial", async () => {
    const first = deferred();
    const second = deferred();
    const persist = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const user = userEvent.setup();
    render(<ThemeSelector initial="light" persist={persist} />);
    await user.click(option(copy.account.appearance.dark));
    await user.click(option(copy.account.appearance.system));
    first.resolve({ ok: true });
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(2));
    second.resolve({ ok: false, error: "failed" });
    expect(await screen.findByText(copy.errors.saveFailed)).toBeTruthy();
    const saved = persist.mock.calls[0][0];
    expect(saved).toBe("dark");
    expect(state()).toEqual({ theme: "dark", cookie: "dark", checked: copy.account.appearance.dark });
  });

  it("varias elecciones mientras guarda: solo se envía la última", async () => {
    const first = deferred();
    const persist = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ThemeSelector initial="light" persist={persist} />);
    await user.click(option(copy.account.appearance.dark));
    await user.click(option(copy.account.appearance.system));
    await user.click(option(copy.account.appearance.light));
    first.resolve({ ok: true });
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(2));
    expect(persist.mock.calls.map(([theme]) => theme)).toEqual(["dark", "light"]);
    await vi.waitFor(() => expect(state()).toEqual({ theme: "light", cookie: "light", checked: copy.account.appearance.light }));
  });
});
