// T042 / FR-025, FR-026, FR-027; SC-007; US-4, escenarios 1, 2 y 5 — capa: componente (Vitest + RTL + user-event).
// Criterio literal (spec, FR-026): «El selector MUST cambiar el contexto y recordarlo en el mismo dispositivo entre
// recargas y navegación; sin contexto recordado, arranca en Yo (decisión 10)».
// Criterio literal (spec, FR-027): «El cambio de contexto MUST anunciarse por una región viva («Ahora ves: Nosotros»)
// y no ejecutar la Context Transition […]; el contenido no varía porque no hay datos».
// Casos límite: «Cambios rápidos del selector» y «Valor del contexto recordado ilegible o ausente».
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { ContextProvider, ContextSelector } from "./context-selector";

const KEY = "juntia:context";

function setup() {
  const user = userEvent.setup();
  const view = render(
    <ContextProvider>
      <ContextSelector />
      <p data-testid="contenido">{copy.empty.home.title}</p>
    </ContextProvider>,
  );
  const option = (label: string) => screen.getByRole("radio", { name: label });
  return { user, view, option };
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("ContextSelector (T042)", () => {
  it("sin valor guardado arranca en «Yo»", () => {
    const { option } = setup();
    expect(option(copy.context.me).getAttribute("aria-checked")).toBe("true");
    expect(option(copy.context.us).getAttribute("aria-checked")).toBe("false");
  });

  it("al elegir «Nosotros» queda seleccionada, se anuncia y se guarda", async () => {
    const { user, option } = setup();
    await user.click(option(copy.context.us));
    expect(option(copy.context.us).getAttribute("aria-checked")).toBe("true");
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe(copy.context.announce(copy.context.us));
    expect(window.localStorage.getItem(KEY)).toBe("us");
  });

  it("hay una sola región viva para el anuncio", async () => {
    const { user, option } = setup();
    await user.click(option(copy.context.us));
    expect(document.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
  });

  it("las flechas ← → cambian la opción", async () => {
    const { user, option } = setup();
    option(copy.context.me).focus();
    await user.keyboard("{ArrowRight}");
    expect(option(copy.context.us).getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(option(copy.context.us));
    await user.keyboard("{ArrowLeft}");
    expect(option(copy.context.me).getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem(KEY)).toBe("me");
  });

  it("al desmontar y volver a montar arranca en lo que se eligió", async () => {
    const first = setup();
    await first.user.click(first.option(copy.context.us));
    first.view.unmount();
    const second = setup();
    expect(second.option(copy.context.us).getAttribute("aria-checked")).toBe("true");
  });

  it("con un valor ilegible arranca en «Yo» y no lo reescribe hasta que la persona elige", async () => {
    window.localStorage.setItem(KEY, "ellos");
    const { user, option } = setup();
    expect(option(copy.context.me).getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem(KEY)).toBe("ellos");
    await user.click(option(copy.context.us));
    expect(window.localStorage.getItem(KEY)).toBe("us");
  });

  it("con el almacenamiento bloqueado arranca en «Yo», cambia durante la visita y no lanza", async () => {
    const blocked = () => { throw new DOMException("Bloqueado", "SecurityError"); };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(blocked);
    const { user, option } = setup();
    expect(option(copy.context.me).getAttribute("aria-checked")).toBe("true");
    await user.click(option(copy.context.us));
    expect(option(copy.context.us).getAttribute("aria-checked")).toBe("true");
  });

  // F19-2 (revisión del PR #19): lectura permitida y escritura rechazada. Lo que se muestra, `aria-checked` y el anuncio
  // dicen lo mismo: la elección de la visita prevalece sobre lo almacenado cuando no se pudo guardar.
  it("si se puede leer pero no escribir, la elección de la visita prevalece y el anuncio coincide con lo que se ve", async () => {
    window.localStorage.setItem(KEY, "me");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Cuota", "QuotaExceededError"); });
    const { user, option } = setup();
    await user.click(option(copy.context.us));
    expect(option(copy.context.us).getAttribute("aria-checked")).toBe("true");
    expect(option(copy.context.me).getAttribute("aria-checked")).toBe("false");
    expect(option(copy.context.us).querySelector("[data-segmented-knob]")).not.toBeNull();
    expect(option(copy.context.me).querySelector("[data-segmented-knob]")).toBeNull();
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe(copy.context.announce(copy.context.us));
  });

  it("tres cambios seguidos dejan guardado el último", async () => {
    const { user, option } = setup();
    await user.click(option(copy.context.us));
    await user.click(option(copy.context.me));
    await user.click(option(copy.context.us));
    expect(option(copy.context.us).getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem(KEY)).toBe("us");
  });

  it("el contenido junto al selector no cambia al cambiar el contexto (sin Context Transition)", async () => {
    const { user, option } = setup();
    const content = screen.getByTestId("contenido");
    const before = content.outerHTML;
    await user.click(option(copy.context.us));
    expect(screen.getByTestId("contenido")).toBe(content);
    expect(content.outerHTML).toBe(before);
  });
});
