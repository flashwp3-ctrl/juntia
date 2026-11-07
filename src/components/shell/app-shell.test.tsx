// UX lote 1, cambio 4 — capa: componentes (Vitest + RTL). Decisión de los fundadores (petición del PR): «Quita el texto
// «Atajo N» del bloque lateral «Anotar gasto» (escritorio, ≥ 1280 px). El atajo de teclado N sigue funcionando igual, pero
// sin ninguna indicación visible, como un easter egg. Conserva aria-keyshortcuts para lectores de pantalla». Esto sustituye
// la nota «04·7 (sidebar): bloque bosque con el atajo N visible» del diseño. En el celular no cambia nada.
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/shell/app-shell";
import { ContextProvider } from "@/components/shell/context-selector";
import { AccountProvider } from "@/features/account/account-context";
import { AnnotateProvider } from "@/features/expenses/annotate-provider";
import { copy } from "@/lib/copy/es";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
const idleActions = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };

function renderShell() {
  return render(
    <AccountProvider displayName="Sara" theme="system">
      <ContextProvider>
        <AnnotateProvider actions={idleActions}>
          <AppShell><main id="contenido">contenido</main></AppShell>
        </AnnotateProvider>
      </ContextProvider>
    </AccountProvider>,
  );
}

describe("Bloque lateral «Anotar gasto» (UX lote 1, cambio 4)", () => {
  it("no muestra ninguna indicación visible del atajo, pero lo conserva para lectores de pantalla", () => {
    const { container } = renderShell();
    const side = container.querySelector<HTMLElement>('[data-annotate-trigger="side"]')!;
    expect(side).toBeTruthy();
    expect(side.textContent).toContain(copy.nav.annotateBlock);
    expect(side.textContent).not.toMatch(/atajo/i);
    // Ni «N» suelta como texto del bloque: el nombre es solo «Anotar gasto».
    expect(side.textContent?.trim()).toBe(copy.nav.annotateBlock);
    expect(side.getAttribute("aria-keyshortcuts")).toBe(copy.nav.shortcut);
    // El + de la barra móvil sigue igual: mismo atajo para lectores, mismo nombre.
    expect(container.querySelector('[data-annotate-trigger="bar"]')?.getAttribute("aria-keyshortcuts")).toBe(copy.nav.shortcut);
  });

  it("la clave de copy del rótulo ya no existe", () => {
    expect("shortcutLabel" in copy.nav).toBe(false);
  });
});
