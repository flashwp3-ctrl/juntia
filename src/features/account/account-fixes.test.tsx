// Auditoría Impeccable de noviembre de 2026, hallazgos de Mi cuenta — capa: componentes (Vitest + RTL).
// F11: «El diálogo de exportar no lleva «×» en el encabezado; Anotar, metas, presupuesto y liquidar sí lo llevan»
// (COMPONENT_SPECIFICATIONS §BottomSheet: «cierre con gesto, botón ×, Escape o scrim»).
// F17 (propuesta aprobada por los fundadores, 11 nov 2026): «Mi cuenta» activa en el sidebar usa el mismo «estás aquí» que
// los demás destinos (fondo nav-active y elevación), no un anillo interior de tinta.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AccountProvider } from "./account-context";
import { SidebarAccount } from "./account-button";
import { ExportEntry } from "./account-controls";

vi.mock("next/navigation", () => ({ usePathname: () => "/cuenta/privacidad", useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("./actions", () => ({ requestPasswordChange: vi.fn() }));
vi.mock("@/features/auth/actions", () => ({ signOut: vi.fn() }));

describe("Exportar: encabezado de hoja con «×» (F11)", () => {
  it("el título va en el encabezado con la «×» a su derecha, que cierra la hoja; ya no hay «Cerrar» al pie", async () => {
    const user = userEvent.setup();
    render(<ExportEntry />);
    await user.click(screen.getByRole("button", { name: new RegExp(copy.account.privacy.export) }));
    const sheet = await screen.findByRole("dialog", { name: copy.account.export.title });
    const close = within(sheet).getByRole("button", { name: copy.account.export.close });
    const title = within(sheet).getByRole("heading", { name: copy.account.export.title });
    // El mismo marco que liquidar y las hojas de metas: título y «×» en la misma fila, antes de las opciones.
    expect(close.parentElement).toBe(title.parentElement);
    expect(close.querySelector("[data-icon]")?.getAttribute("data-icon")).toBe("x");
    expect(close.compareDocumentPosition(within(sheet).getByRole("radiogroup")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(sheet).getAllByRole("button", { name: copy.account.export.close })).toHaveLength(1);
    await user.click(close);
    expect(screen.queryByRole("dialog", { name: copy.account.export.title })).toBeNull();
  });

  it("Escape también la cierra", async () => {
    const user = userEvent.setup();
    render(<ExportEntry />);
    await user.click(screen.getByRole("button", { name: new RegExp(copy.account.privacy.export) }));
    await screen.findByRole("dialog", { name: copy.account.export.title });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: copy.account.export.title })).toBeNull();
  });
});

describe("Mi cuenta activa en el sidebar (F17)", () => {
  const renderRow = (current: boolean) => render(<AccountProvider displayName="Sara" theme="system" partnerName="Tomás"><SidebarAccount current={current} /></AccountProvider>);

  it("activa: fondo nav-active y elevación, como los destinos; sin anillo de tinta", () => {
    renderRow(true);
    const link = screen.getByRole("link", { current: "page" });
    expect(link.className).toContain("bg-[var(--comp-nav-active-bg)]");
    expect(link.className).toContain("shadow-raised");
    expect(link.className).not.toMatch(/inset_0_0_0_2px/);
  });

  it("inactiva: sin elevación ni aria-current", () => {
    renderRow(false);
    const link = screen.getByRole("link");
    expect(link.getAttribute("aria-current")).toBeNull();
    expect(link.className).not.toContain("shadow-raised");
  });
});
