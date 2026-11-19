// 005 · PR B, corrección 1 (FR-050; maestro §15.7, «CLS = 0 en cargas con esqueleto») y corrección 2 (FR-051, Firefox), opción A
// aprobada por el gestor el 19 nov 2026. Parciales 44349192421 y 44425161264: a 390, en las siete rutas, el selector Yo/Nosotros
// (alineado a la derecha) se desplazaba −4 px en Chromium y 10 px en Firefox al pasar la fuente del respaldo a Onest, y las
// etiquetas centradas de la barra inferior ±1–3 px. Criterio: las cajas que se ven no dependen de la fuente que pinta el texto;
// los segmentos del selector miden lo que su texto mide en Onest (en em, escala con la letra) y la etiqueta ocupa su celda.
// jsdom no carga fuentes: la capa más baja comprueba el mecanismo; el efecto lo miden los tramos `cls-*` y `firefox-cls-*`.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/shell/app-shell";
import { ContextProvider, ContextSelector } from "@/components/shell/context-selector";
import { AccountProvider } from "@/features/account/account-context";
import { AnnotateProvider } from "@/features/expenses/annotate-provider";
import { copy } from "@/lib/copy/es";
import { onestSemiboldEm } from "@/lib/text-fit";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

describe("cajas que no cambian con la fuente (opción A del PR B)", () => {
  it("el ancho en Onest 600: el de los textos medidos, exacto; el de los demás, nunca por debajo del medido ni un 7 % por encima", () => {
    expect(onestSemiboldEm("Yo")).toBe(1.19);
    expect(onestSemiboldEm("Nosotros")).toBe(4.32);
    // Medidas con canvas sobre Onest 600 (con kerning), nov 2026.
    for (const [text, measured] of [["Yo", 1.186], ["Nosotros", 4.315], ["Gasto", 2.812], ["Ingreso", 3.559]] as const) {
      expect(onestSemiboldEm(text)).toBeGreaterThanOrEqual(measured);
      expect(onestSemiboldEm(text)).toBeLessThanOrEqual(measured * 1.07);
    }
    // Un texto que no está en la tabla (otro idioma, un símbolo) cuenta como ancho: nunca se corta.
    expect(onestSemiboldEm("Ωψ")).toBeGreaterThanOrEqual(1.8);
  });

  it("el selector Yo/Nosotros: cada segmento con el ancho de su texto en em más el relleno; estirado (sidebar), sin él", () => {
    render(<ContextProvider><ContextSelector /><div data-testid="side"><ContextSelector stretch /></div></ContextProvider>);
    const [compact] = screen.getAllByRole("radiogroup", { name: copy.context.label });
    for (const option of [copy.context.me, copy.context.us]) {
      expect(within(compact).getByRole("radio", { name: option }).style.width).toBe(`calc(${onestSemiboldEm(option)}em + 1.5rem)`);
    }
    const stretched = within(screen.getByTestId("side")).getByRole("radio", { name: copy.context.us });
    expect(stretched.style.width).toBe("");
  });

  it("la etiqueta de cada destino de la barra inferior ocupa su celda, con el texto centrado dentro", () => {
    const { container } = render(
      <AccountProvider displayName="Sara" theme="system">
        <ContextProvider>
          <AnnotateProvider actions={{ create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() }}>
            <AppShell><main id="contenido">contenido</main></AppShell>
          </AnnotateProvider>
        </ContextProvider>
      </AccountProvider>,
    );
    const labels = [...container.querySelectorAll("nav.fixed a > span:last-child")];
    expect(labels.length).toBe(4);
    for (const label of labels) expect(label.className).toMatch(/\bblock\b.*\bw-full\b.*\btext-center\b/);
  });
});
