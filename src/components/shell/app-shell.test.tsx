// UX lote 1, cambio 4 — capa: componentes (Vitest + RTL). Decisión de los fundadores (petición del PR): «Quita el texto
// «Atajo N» del bloque lateral «Anotar gasto» (escritorio, ≥ 1280 px). El atajo de teclado N sigue funcionando igual, pero
// sin ninguna indicación visible, como un easter egg. Conserva aria-keyshortcuts para lectores de pantalla». Esto sustituye
// la nota «04·7 (sidebar): bloque bosque con el atajo N visible» del diseño. En el celular no cambia nada.
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell, PageHeader } from "@/components/shell/app-shell";
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

// F08 (auditoría Impeccable, nov 2026): «Hola, Tomás» + avatar + selector no cabían en una línea a 390 y el selector bajaba.
// El título escala si es largo y, si aun así no cabe, se trunca antes de dejar caer el selector.
describe("PageHeader: el saludo cede antes que el selector (F08)", () => {
  const header = (title: string, variant?: "destination" | "account") =>
    render(<AccountProvider displayName="Sara" theme="system"><ContextProvider><PageHeader title={title} variant={variant} /></ContextProvider></AccountProvider>).container.querySelector("h1")!;

  it("un título largo junto al selector escala por debajo de 1024 y se trunca, sin cambiar el tamaño de escritorio", () => {
    const h1 = header("Hola, Alejandro");
    expect(h1.className).toContain("text-[clamp(1.375rem,6.2vw,1.875rem)]");
    expect(h1.className).toContain("truncate");
    expect(h1.className).toContain("min-w-0");
    expect(h1.className).toContain("flex-[1_1_6rem]");
    expect(h1.className).toContain("lg:text-[clamp(2.4375rem,3.7vw,var(--display-xl-size))]");
  });

  it("«Hola, Sara» y los destinos conservan su tamaño; sin selector (Mi cuenta) no escala", () => {
    for (const title of ["Hola, Sara", copy.nav.activity]) expect(header(title).className).toContain("text-[clamp(1.5625rem,7.4vw,1.875rem)]");
    expect(header("Seguridad y sesión", "account").className).toContain("text-[clamp(1.5625rem,7.4vw,1.875rem)]");
  });
});
