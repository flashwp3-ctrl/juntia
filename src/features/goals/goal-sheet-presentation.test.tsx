// Las hojas de metas al cruzar 768 px — capa: componentes (Vitest + RTL). Nueva meta, Editar meta, Registrar aporte y Retirar
// comparten GoalSheetFrame, que usa BottomSheet `adaptive`: cruzar 768 px con la hoja abierta cambia la presentación
// (hoja ↔ diálogo de 520) sin volver a montar el contenido, así que lo escrito, el foco y el cursor siguen ahí.
import { act, configure, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { ContributeSheet } from "./contribute-sheet";
import { GoalFormSheet } from "./goal-form-sheet";
import type { GoalActions, GoalView } from "./types";
import { WithdrawSheet } from "./withdraw-sheet";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/metas" }));

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
const TODAY = "2026-10-26";
const minor = (pesos: bigint) => (pesos * 100n).toString();
const bike: GoalView = {
  id: "55555555-5555-4555-8555-555555555555", name: "Bicicleta de ruta", goalType: "other", scope: "personal", status: "active", version: 2,
  targetMinor: minor(3000000n), balanceMinor: minor(1050000n), progressPercent: 35, myAvailableMinor: minor(1050000n),
  hasPendingRequest: false, targetMonth: null, createdAt: "2026-08-01T17:00:00.000Z", lastContributionDate: null, lastContributionCreatedAt: null,
};
const actions = (): GoalActions => ({
  create: vi.fn(), update: vi.fn(), complete: vi.fn(), archive: vi.fn(), contribute: vi.fn(), withdraw: vi.fn(), voidEntry: vi.fn(),
  check: vi.fn(async () => ({ state: "not_found" as const })),
});

type User = ReturnType<typeof userEvent.setup>;
type Case = {
  sheet: string;
  title: string;
  element: () => ReactElement;
  /** Escribe en la hoja y devuelve el campo de texto donde queda el foco, con el cursor que se le pone. */
  fill: (user: User) => Promise<{ field: HTMLInputElement; caret: number }>;
};
const textbox = (name: string) => screen.getByRole("textbox", { name }) as HTMLInputElement;
const cases: Case[] = [
  {
    sheet: "Nueva meta", title: copy.goals.sheet.createTitle,
    element: () => <GoalFormSheet open onClose={vi.fn()} context="us" today={TODAY} idempotencyKey={KEY} actions={actions()} onDone={vi.fn()} />,
    fill: async (user) => {
      await user.type(textbox(copy.goals.sheet.target), "2500000");
      await user.click(screen.getAllByRole("radio")[1]);
      const field = textbox(copy.goals.sheet.name);
      await user.type(field, "Viaje a Cartagena");
      return { field, caret: 5 };
    },
  },
  {
    sheet: "Editar meta", title: copy.goals.sheet.editTitle,
    element: () => <GoalFormSheet open onClose={vi.fn()} goal={bike} context="me" today={TODAY} idempotencyKey={KEY} actions={actions()} onDone={vi.fn()} />,
    fill: async (user) => {
      const field = textbox(copy.goals.sheet.name);
      await user.type(field, " gravel");
      return { field, caret: 3 };
    },
  },
  {
    sheet: "Registrar aporte", title: copy.goals.contribute.title,
    element: () => <ContributeSheet open onClose={vi.fn()} goal={bike} context="me" today={TODAY} idempotencyKey={KEY} actions={actions()} onDone={vi.fn()} />,
    fill: async (user) => {
      const field = textbox(copy.goals.contribute.amount);
      await user.type(field, "500000");
      return { field, caret: field.value.length };
    },
  },
  {
    sheet: "Retirar", title: copy.goals.withdrawSheet.title,
    element: () => <WithdrawSheet open onClose={vi.fn()} goal={bike} available={minor(1050000n)} today={TODAY} idempotencyKey={KEY} actions={actions()} onDone={vi.fn()} />,
    fill: async (user) => {
      await user.type(textbox(copy.goals.withdrawSheet.amount), "200000");
      const field = textbox(copy.goals.withdrawSheet.reason);
      await user.type(field, "Otro plan");
      return { field, caret: 4 };
    },
  },
];
const snapshot = (root: HTMLElement) => [...root.querySelectorAll("input")].map((input) => (input.type === "radio" ? String(input.checked) : input.value));

let width: ReturnType<typeof controlWidth> | null = null;
afterEach(() => { width?.restore(); width = null; vi.clearAllMocks(); });

describe("Las hojas de metas al cruzar 768 px (BottomSheet adaptive)", { timeout: 15000 }, () => {
  describe.each(cases)("$sheet", ({ title, element, fill }) => {
    it.each([
      { from: "hoja (390)", wide: false },
      { from: "diálogo (1440)", wide: true },
    ])("desde $from, ida y vuelta: el mismo campo, con lo escrito, el foco y el cursor", async ({ wide }) => {
      width = controlWidth(wide);
      const user = userEvent.setup();
      render(element());
      const sheet = screen.getByRole("dialog", { name: title });
      expect(presentation()).toBe(wide ? "dialog" : "sheet");
      const { field, caret } = await fill(user);
      field.focus();
      field.setSelectionRange(caret, caret);
      const value = field.value;
      const before = snapshot(sheet);

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
        expect(snapshot(sheet)).toEqual(before);
      }
    });
  });

  it("como diálogo no hay asa; como hoja, sí", () => {
    width = controlWidth(true);
    render(cases[0].element());
    expect(document.querySelector("[data-sheet-handle]")).toBeNull();
    width.resize(false);
    expect(document.querySelector("[data-sheet-handle]")).not.toBeNull();
  });
});
