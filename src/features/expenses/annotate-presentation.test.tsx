// Arreglos de UX dentro de Anotar (refactorización del proveedor, aprobada el 10 nov 2026) — capa: componentes (Vitest + RTL).
// 1. Con la hoja abierta, cruzar 768 px cambia la presentación (hoja ↔ diálogo de 520) sin volver a montar el contenido: lo
//    escrito, el mismo campo y el foco siguen ahí.
// 2. 02·5: el monto no tiene marco; el foco que pone la hoja al abrir no pinta el anillo, y el foco posterior sí.
import { act, configure, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "./annotate-provider";
import type { ExpenseActions } from "./types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

/** Un `matchMedia` con el ancho controlado: `resize(true)` cruza a 768 px o más y avisa a quien escucha. */
function controlWidth(initiallyWide: boolean) {
  let wide = initiallyWide;
  const listeners = new Set<() => void>();
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    get matches() { return query.includes("min-width: 768px") ? wide : false; },
    media: query, onchange: null, dispatchEvent: () => false, addListener: () => {}, removeListener: () => {},
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  })) as unknown as typeof window.matchMedia;
  return {
    resize: (next: boolean) => act(() => { wide = next; listeners.forEach((listener) => listener()); }),
    restore: () => { window.matchMedia = original; },
  };
}

function Trigger() {
  const { openFrom } = useAnnotate();
  return <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>;
}

async function openSheet() {
  const actions: ExpenseActions = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
  const user = userEvent.setup();
  render(<AnnotateProvider actions={actions} today="2026-11-05"><Trigger /></AnnotateProvider>);
  await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
  await screen.findByRole("dialog", { name: copy.annotate.title.expense });
  return user;
}
const amount = () => screen.getByRole("textbox", { name: copy.annotate.amount }) as HTMLInputElement;
const presentation = () => (document.querySelector("[data-modal]") ? "dialog" : document.querySelector("[data-bottom-sheet]") ? "sheet" : "none");

let width: ReturnType<typeof controlWidth> | null = null;
afterEach(() => { width?.restore(); width = null; });

describe("Anotar al cruzar 768 px", { timeout: 15000 }, () => {
  it.each([
    { from: "hoja (390)", wide: false, there: "dialog", back: "sheet" },
    { from: "diálogo (1440)", wide: true, there: "sheet", back: "dialog" },
  ])("desde $from, ida y vuelta: el mismo campo, con lo escrito, la categoría y el foco", async ({ wide, there, back }) => {
    width = controlWidth(wide);
    const user = await openSheet();
    expect(presentation()).toBe(back);
    await user.type(amount(), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await user.type(screen.getByPlaceholderText(copy.annotate.descriptionPlaceholder), "pan");
    amount().focus();
    const field = amount();

    width.resize(!wide);
    expect(presentation()).toBe(there);
    // El mismo nodo: la hoja no se volvió a montar.
    expect(amount()).toBe(field);
    expect(field.value).toBe("45.000");
    expect(document.activeElement).toBe(field);
    expect(screen.getByRole("radio", { name: copy.categories.market }).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByPlaceholderText(copy.annotate.descriptionPlaceholder) as HTMLInputElement).value).toBe("pan");
    // Una sola hoja, sin «¿Descartar gasto?».
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();

    width.resize(wide);
    expect(presentation()).toBe(back);
    expect(amount()).toBe(field);
    expect(field.value).toBe("45.000");
  });

  it("como diálogo no hay asa ni paradas; como hoja, sí", async () => {
    width = controlWidth(true);
    await openSheet();
    expect(document.querySelector("[data-sheet-handle]")).toBeNull();
    expect(document.querySelector("[data-modal]")?.hasAttribute("data-stop")).toBe(false);
    width.resize(false);
    expect(document.querySelector("[data-sheet-handle]")).not.toBeNull();
    expect(document.querySelector("[data-bottom-sheet]")?.getAttribute("data-stop")).toBe("content");
  });
});

describe("el monto al abrir (02·5, sin marco)", { timeout: 15000 }, () => {
  it("el foco de la apertura no pinta el anillo; al salir del campo, el anillo vuelve para el foco siguiente", async () => {
    const user = await openSheet();
    const frame = amount().parentElement!;
    expect(document.activeElement).toBe(amount());
    expect(frame.className).toContain("focus-within:!outline-none");
    // El anillo del diseño (focus.ring) sigue en el marco: solo se apaga en esta primera vez.
    expect(frame.className).toContain("focus-within:outline-solid");
    await user.tab({ shift: true });
    await user.tab();
    expect(document.activeElement).toBe(amount());
    expect(frame.className).not.toContain("focus-within:!outline-none");
  });
});
