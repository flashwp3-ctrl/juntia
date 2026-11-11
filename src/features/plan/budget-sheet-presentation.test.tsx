// La hoja de presupuesto al cruzar 768 px — capa: componentes (Vitest + RTL). BudgetSheet usa BottomSheet `adaptive`: cruzar
// 768 px con la hoja abierta cambia la presentación (hoja ↔ diálogo de 520) sin volver a montar el contenido, así que la
// categoría elegida, el límite escrito, el foco y el cursor siguen ahí.
import { act, configure, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { BudgetSheet } from "./budget-sheet";
import type { PlanActions, PlanRow } from "./types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/plan" }));

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
const presentation = () => (document.querySelector("[data-modal]") ? "dialog" : document.querySelector("[data-bottom-sheet]") ? "sheet" : "none");

const KEY = "33333333-3333-4333-8333-333333333333";
const minor = (pesos: bigint) => (pesos * 100n).toString();
const market: PlanRow = { categoryId: "market", budgetId: "44444444-4444-4444-8444-444444444444", version: 2, limitMinor: minor(1200000n), consumedMinor: minor(900000n), history: [] };
const home: PlanRow = { categoryId: "home", budgetId: null, version: null, limitMinor: null, consumedMinor: minor(1600000n), history: [] };
const actions = (): PlanActions => ({ create: vi.fn(), update: vi.fn(), check: vi.fn(async () => ({ state: "not_found" as const })) });

let width: ReturnType<typeof controlWidth> | null = null;
afterEach(() => { width?.restore(); width = null; vi.clearAllMocks(); });

describe("La hoja de presupuesto al cruzar 768 px (BottomSheet adaptive)", { timeout: 15000 }, () => {
  it.each([
    { from: "hoja (390), crear", wide: false, row: null, title: copy.plan.sheet.createTitle },
    { from: "diálogo (1440), crear", wide: true, row: null, title: copy.plan.sheet.createTitle },
    { from: "hoja (390), editar", wide: false, row: market, title: copy.plan.sheet.editTitle },
    { from: "diálogo (1440), editar", wide: true, row: market, title: copy.plan.sheet.editTitle },
  ])("desde $from, ida y vuelta: la misma hoja, con la categoría, el límite, el foco y el cursor", async ({ wide, row, title }) => {
    width = controlWidth(wide);
    const user = userEvent.setup();
    render(<BudgetSheet open onClose={vi.fn()} context="us" row={row} rows={[market, home]} month="2026-10" idempotencyKey={KEY} actions={actions()} onDone={vi.fn()} />);
    const sheet = screen.getByRole("dialog", { name: title });
    expect(presentation()).toBe(wide ? "dialog" : "sheet");
    if (!row) await user.click(screen.getByRole("radio", { name: copy.categories.home }));
    const field = screen.getByRole("textbox", { name: copy.plan.sheet.limit }) as HTMLInputElement;
    await user.clear(field);
    await user.type(field, "800000");
    field.focus();
    const caret = field.value.length - 2;
    field.setSelectionRange(caret, caret);
    const value = field.value;
    const chosen = screen.queryAllByRole("radio").map((radio) => radio.getAttribute("aria-checked"));

    for (const next of [!wide, wide]) {
      width.resize(next);
      expect(presentation()).toBe(next ? "dialog" : "sheet");
      // El mismo nodo: la hoja no se volvió a montar, y es una sola, sin «¿Cerrar sin confirmar?».
      expect(screen.getByRole("dialog", { name: title })).toBe(sheet);
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(sheet.contains(field)).toBe(true);
      expect(field.value).toBe(value);
      expect(document.activeElement).toBe(field);
      expect([field.selectionStart, field.selectionEnd]).toEqual([caret, caret]);
      expect(screen.queryAllByRole("radio").map((radio) => radio.getAttribute("aria-checked"))).toEqual(chosen);
    }
  });
});
