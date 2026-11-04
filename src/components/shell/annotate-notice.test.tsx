// T049 / FR-031, FR-031a; US-3, escenarios 1–4; caso límite «`N` mientras se escribe» — capa: componente
// (Vitest + RTL + user-event), con window.matchMedia simulado para los dos contenedores.
// Criterio literal (spec, FR-031): «Anotar MUST abrir un aviso explícito de que registrar gastos llega con la próxima
// versión, sin campos que aparenten guardar; se abre también con `N`, se cierra con Escape y con un control de cierre,
// atrapa el foco y lo devuelve al disparador […] hoja inferior por debajo de 768 px y diálogo centrado de 520 px desde
// 768 px, con semántica de diálogo accesible (`dialog`), no de `alertdialog`».
import { configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "./annotate-notice";

// El contenedor del aviso llega en un chunk aparte en su primera apertura; en frío y con la suite en paralelo
// la importación puede pasar de 1 s, el límite por defecto de findBy*/waitFor.
configure({ asyncUtilTimeout: 5000 });

const originalMatchMedia = window.matchMedia;

// Solo responde a la consulta de 768 px; el resto (movimiento reducido) queda en `false`.
function mockWidth(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("min-width: 768px") ? desktop : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function Trigger() {
  const { openFrom } = useAnnotate();
  return <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>;
}

function setup(desktop = false) {
  mockWidth(desktop);
  const user = userEvent.setup();
  render(
    <AnnotateProvider>
      <Trigger />
      <button type="button">{copy.nav.home}</button>
      <input aria-label={copy.primitives.amount} />
    </AnnotateProvider>,
  );
  const trigger = screen.getByRole("button", { name: copy.nav.annotate });
  return { user, trigger };
}

const dialogs = () => screen.queryAllByRole("dialog");

afterEach(() => { window.matchMedia = originalMatchMedia; });

describe("Aviso de Anotar (T049)", () => {
  it("el disparador abre un `dialog` (no `alertdialog`) con el título y el cuerpo del catálogo", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: copy.annotate.title });
    expect(dialog.textContent).toContain(copy.annotate.description);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("dentro no hay campos ni botón de guardar", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    for (const role of ["textbox", "spinbutton", "combobox"] as const) {
      expect(dialog.querySelectorAll(`[role="${role}"], input, textarea, select`)).toHaveLength(0);
      expect(screen.queryAllByRole(role).filter((node) => dialog.contains(node))).toHaveLength(0);
    }
    const buttons = within(dialog).getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(within(dialog).getByRole("button", { name: copy.annotate.close })).toBe(buttons[0]);
  });

  it("con el foco en el cuerpo del documento, `N` abre el mismo aviso", async () => {
    const { user } = setup();
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    await user.keyboard("n");
    expect(await screen.findByRole("dialog", { name: copy.annotate.title })).toBeTruthy();
  });

  it("con el foco en un campo, `N` escribe la letra y no abre el aviso", async () => {
    const { user } = setup();
    const field = screen.getByRole("textbox", { name: copy.primitives.amount }) as HTMLInputElement;
    await user.type(field, "n");
    expect(field.value).toBe("n");
    expect(dialogs()).toHaveLength(0);
  });

  it("con el aviso abierto, `N` no abre otro", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("n");
    await user.keyboard("N");
    expect(dialogs()).toHaveLength(1);
  });

  it("Escape lo cierra y el foco vuelve al disparador", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(dialogs()).toHaveLength(0));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("«Cerrar» lo cierra y el foco vuelve al disparador", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await user.click(await screen.findByRole("button", { name: copy.annotate.close }));
    await waitFor(() => expect(dialogs()).toHaveLength(0));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("Tab no saca el foco del aviso", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    for (let step = 0; step < 4; step += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("abierto con `N`, al cerrarlo el foco vuelve al elemento enfocado antes", async () => {
    const { user } = setup();
    const before = screen.getByRole("button", { name: copy.nav.home });
    before.focus();
    await user.keyboard("n");
    await screen.findByRole("dialog");
    expect(dialogs()).toHaveLength(1);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(dialogs()).toHaveLength(0));
    await waitFor(() => expect(document.activeElement).toBe(before));
  });

  it("por debajo de 768 px usa la hoja y desde 768 px el diálogo", async () => {
    const mobile = setup(false);
    await mobile.user.click(mobile.trigger);
    expect((await screen.findByRole("dialog")).hasAttribute("data-bottom-sheet")).toBe(true);
    expect(screen.getByRole("dialog").hasAttribute("data-modal")).toBe(false);
  });

  it("desde 768 px usa el diálogo centrado", async () => {
    const desktop = setup(true);
    await desktop.user.click(desktop.trigger);
    expect((await screen.findByRole("dialog")).hasAttribute("data-modal")).toBe(true);
    expect(screen.getByRole("dialog").hasAttribute("data-bottom-sheet")).toBe(false);
  });
});
