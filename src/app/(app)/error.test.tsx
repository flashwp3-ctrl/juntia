// F19-3 (revisión del PR #19) / T059, FR-028; caso límite «Ruta inexistente o error de render» — capa: componente
// (Vitest + RTL + user-event), la más baja que ve el estado diseñado, el texto que expone y sus dos salidas.
// Criterio literal (spec, caso límite): «Estado de «no encontrado» y estado de error diseñados dentro del shell, con el
// aviso de versión base y salida hacia Inicio […]. Ninguno muestra un mensaje técnico crudo».
// Que el estado quede dentro del AppShell lo decide Next por convención: `error.tsx` se monta dentro del layout de su
// segmento, `(app)/layout.tsx`, cuyo shell y aviso ya comprueba T050. Esta prueba no necesita navegador.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContextProvider } from "@/components/shell/context-selector";
import { copy } from "@/lib/copy/es";
import RouteError from "./error";

const TECHNICAL = "TypeError: Cannot read properties of undefined (reading 'total') at Inicio";

function setup() {
  const reset = vi.fn<() => void>();
  const error = Object.assign(new Error(TECHNICAL), { digest: "3141592653" });
  const user = userEvent.setup();
  const { container } = render(<ContextProvider><RouteError error={error} reset={reset} /></ContextProvider>);
  return { reset, user, container };
}

describe("Estado de error de render (F19-3)", () => {
  it("muestra el estado diseñado con el copy del catálogo", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1, name: copy.states.error })).toBeTruthy();
    expect(screen.getByText(copy.states.errorDescription)).toBeTruthy();
  });

  it("no expone el mensaje técnico ni el digest", () => {
    const { container } = setup();
    const text = container.textContent ?? "";
    expect(text).not.toContain("TypeError");
    expect(text).not.toContain("reading");
    expect(text).not.toContain("3141592653");
  });

  it("«Reintentar» llama a reset", async () => {
    const { reset, user } = setup();
    await user.click(screen.getByRole("button", { name: copy.states.retry }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("«Ir a Inicio» apunta a /", () => {
    setup();
    expect(screen.getByRole("link", { name: copy.states.home }).getAttribute("href")).toBe("/");
  });
});
