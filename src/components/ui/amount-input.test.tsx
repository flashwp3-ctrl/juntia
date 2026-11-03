// T024 / FR-014, FR-013; US-6, escenarios 1 y 2 — capa: componente (Vitest + RTL + user-event).
// Criterio literal (spec, FR-014): «AmountInput con teclado numérico nativo, máscara COP con puntos de miles,
// sin decimales, máximo 999.999.999, ayuda enlazada, error accesible y reducción de tamaño sin corte. Entrega el
// valor en pesos enteros, sin aritmética de punto flotante y sin convertirlo a unidades menores».
// Casos límite de la spec: «Importe de 999.999.999 y más» y «AmountInput vacío frente a cero».
// Valores solo de COMPONENT_SPECIFICATIONS.md §Input (Monto): el tope 999.999.999 y el formato de miles.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AmountInput } from "./amount-input";

function setup(props: Partial<React.ComponentProps<typeof AmountInput>> = {}) {
  const onValueChange = vi.fn<(value: number | null) => void>();
  const user = userEvent.setup();
  render(<AmountInput label={copy.primitives.amount} help={copy.primitives.amountHelp} onValueChange={onValueChange} {...props} />);
  const field = screen.getByRole("textbox", { name: copy.primitives.amount });
  return { field, onValueChange, user };
}

describe("AmountInput (T024)", () => {
  it("abre el teclado numérico nativo", () => {
    const { field } = setup();
    expect(field).toHaveProperty("inputMode", "numeric");
    expect(field.getAttribute("inputmode")).toBe("numeric");
  });

  it("formatea con puntos de miles de es-CO y sin decimales", async () => {
    const { field, user, onValueChange } = setup();
    await user.type(field, "1234567");
    expect(field).toHaveProperty("value", "1.234.567");
    expect(onValueChange).toHaveBeenLastCalledWith(1234567);
  });

  it("no acepta un décimo dígito: el tope es 999.999.999", async () => {
    const { field, user, onValueChange } = setup();
    await user.type(field, "9999999999");
    expect(field).toHaveProperty("value", "999.999.999");
    expect(onValueChange).toHaveBeenLastCalledWith(999999999);
  });

  it("al pegar conserva solo los dígitos", async () => {
    const { field, user, onValueChange } = setup();
    await user.click(field);
    await user.paste("$ 1.200 abc");
    expect(field).toHaveProperty("value", "1.200");
    expect(onValueChange).toHaveBeenLastCalledWith(1200);
  });

  it("al pegar sin dígitos el valor no cambia", async () => {
    const { field, user, onValueChange } = setup();
    await user.type(field, "12");
    onValueChange.mockClear();
    await user.paste("abc");
    expect(field).toHaveProperty("value", "12");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("vacío entrega null y 0 entrega 0: vacío no es cero", async () => {
    const { field, user, onValueChange } = setup();
    await user.type(field, "0");
    expect(field).toHaveProperty("value", "0");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    await user.clear(field);
    expect(field).toHaveProperty("value", "");
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("entrega pesos enteros, nunca unidades menores ni decimales", async () => {
    const { field, user, onValueChange } = setup();
    await user.type(field, "5,5");
    const value = onValueChange.mock.lastCall?.[0];
    expect(value).toBe(55);
    expect(Number.isInteger(value)).toBe(true);
  });

  it("con error: aria-invalid, aria-errormessage hacia un mensaje en región polite e ícono oculto", () => {
    const { field } = setup({ error: copy.primitives.amountError });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    const messageId = field.getAttribute("aria-errormessage");
    expect(messageId).toBeTruthy();
    const message = document.getElementById(messageId!);
    expect(message?.textContent).toContain(copy.primitives.amountError);
    expect(message?.closest('[aria-live="polite"]')).not.toBeNull();
    const icon = message?.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("enlaza la ayuda con aria-describedby", () => {
    const { field } = setup();
    const ids = field.getAttribute("aria-describedby")?.split(" ") ?? [];
    const texts = ids.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toContain(copy.primitives.amountHelp);
  });

  // F17-4 (revisión adversarial del PR #17): un value o defaultValue que no sea un entero entre 0 y 999.999.999
  // nunca se reformatea como otro importe: el campo queda vacío e inválido, sin llamar a onValueChange.
  describe.each([
    ["mil millones", 1_000_000_000],
    ["negativo", -1200],
    ["con decimales", 12.5],
  ])("valor externo fuera de rango (%s)", (_case, outOfRange) => {
    it.each(["value", "defaultValue"] as const)("por %s: vacío, inválido y con aviso de desarrollo", (prop) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { field, onValueChange } = setup({ [prop]: outOfRange });
      expect(field).toHaveProperty("value", "");
      expect(field.getAttribute("aria-invalid")).toBe("true");
      const message = document.getElementById(field.getAttribute("aria-errormessage") ?? "");
      expect(message?.textContent).toContain(copy.primitives.amountError);
      expect(onValueChange).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
