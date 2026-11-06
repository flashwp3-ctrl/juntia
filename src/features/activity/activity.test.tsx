// T062 / FR-046, FR-047, FR-049; US-6.1, US-6.4, US-6.6; SC-008 — capa: componente (Vitest + RTL).
// Criterio literal (tasks.md, T062): «con las mismas filas, el resumen del mes de Actividad de octubre de 2026 muestra
// 412.900 y el desglose por categoría de la tabla (SC-008)».
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { saraPrivateOctober2026 } from "@/domain/golden/october-2026";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider } from "@/components/shell/annotate-notice";
import { ActivityView } from "./activity-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/actividad" }));

const view = () => render(<AnnotateProvider><ActivityView rows={saraPrivateOctober2026} month="2026-10" today="2026-11-05" navigation={{ previous: null, next: "2026-11" }} /></AnnotateProvider>);
const breakdown = [
  ["transport", "45.000"], ["services", "59.700"], ["restaurants", "62.500"], ["health", "38.400"],
  ["shopping", "96.000"], ["entertainment", "34.000"], ["market", "27.300"], ["other", "50.000"],
] as const;
const rowLinks = () => screen.getAllByRole("link", { name: /pesos/ });

describe("Actividad (T062)", () => {
  it("el resumen de octubre de 2026 muestra 412.900 y el desglose literal por categoría", () => {
    view();
    const summary = screen.getByRole("region", { name: copy.activity.spentIn("octubre") });
    expect(summary.textContent).toMatch(/\$\s?412\.900/);
    const categories = within(summary).getByRole("group", { name: copy.activity.categoryFilter });
    for (const [category, amount] of breakdown) {
      expect(within(categories).getByRole("button", { name: new RegExp(`^${copy.categories[category]}, ${amount.replace(".", "\\.")} pesos`) })).toBeTruthy();
    }
    expect(summary.textContent).not.toContain("86.000");
  });

  it("agrupa por día, del más reciente al más antiguo, y cada fila enlaza a su detalle", () => {
    view();
    const days = screen.getAllByRole("heading", { level: 2 }).map(({ textContent }) => textContent);
    expect(days.slice(0, 3)).toEqual(["23 oct", "21 oct", "20 oct"]);
    expect(rowLinks()).toHaveLength(9);
    expect(rowLinks()[0].getAttribute("href")).toBe("/actividad/sara-private-october-8?mes=2026-10");
  });

  it("busca sin tildes y filtra por tipo y por categoría", async () => {
    const user = userEvent.setup();
    view();
    const search = screen.getByRole("searchbox", { name: copy.activity.searchLabel });
    await user.type(search, "CUMPLEANOS");
    expect(rowLinks().map(({ textContent }) => textContent)).toEqual([expect.stringContaining("Regalo de cumpleaños")]);
    await user.clear(search);
    await user.click(screen.getByRole("radio", { name: copy.activity.incomes }));
    expect(rowLinks()).toHaveLength(1);
    await user.click(screen.getByRole("radio", { name: copy.activity.all }));
    await user.click(screen.getByRole("button", { name: new RegExp(`^${copy.categories.health}, `) }));
    expect(rowLinks().map(({ textContent }) => textContent)).toEqual([expect.stringContaining("Farmacia")]);
  });

  it("mes vacío: texto de contexto privado, no el compartido", () => {
    render(<AnnotateProvider><ActivityView rows={[]} month="2026-09" today="2026-11-05" navigation={{ previous: null, next: "2026-10" }} /></AnnotateProvider>);
    expect(screen.getByRole("button", { name: copy.activity.empty.action })).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.activity.nextMonth("Octubre 2026") }).getAttribute("href")).toBe("/actividad?mes=2026-10");
    expect(screen.getByRole("heading", { name: copy.activity.empty.title })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/alguno de los dos|compartido/i);
  });
});
