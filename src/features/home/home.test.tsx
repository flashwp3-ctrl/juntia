// T062 / FR-040–FR-043; US-5.1–5.4, US-5.6; SC-008 — capa: componente (Vitest + RTL).
// Criterio literal (spec, US-5.1): «el gasto del mes es **412.900** y la suma por categoría coincide con las filas del
// dataset». US-5.2: «no aparecen "Tu parte compartida", filas compartidas, saldos, "presupuesto", "restante",
// "excedido" ni barras de límite». US-5.4: vacío «nunca "$0"». US-5.6: error «con Reintentar». US-5.3: Nosotros «sin
// ninguna cifra ni dato privado».
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnnotateProvider } from "@/components/shell/annotate-notice";
import { ContextProvider } from "@/components/shell/context-selector";
import { saraPrivateOctober2026 } from "@/domain/golden/october-2026";
import { copy } from "@/lib/copy/es";
import { ContextView } from "@/features/context/context-view";
import { LoadError } from "@/features/context/load-error";
import { HomeView } from "./home-view";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }), usePathname: () => "/" }));

const wrap = (node: ReactNode) => render(<ContextProvider><AnnotateProvider>{node}</AnnotateProvider></ContextProvider>);
const october = (rows = saraPrivateOctober2026) => <HomeView rows={rows} month="2026-10" today="2026-10-24" />;
// La tabla de la spec («Dataset dorado de P0-1»), copiada, no recalculada.
const breakdown = [
  ["transport", "45.000"], ["services", "59.700"], ["restaurants", "62.500"], ["health", "38.400"],
  ["shopping", "96.000"], ["entertainment", "34.000"], ["market", "27.300"], ["other", "50.000"],
] as const;

beforeEach(() => { window.localStorage.clear(); document.documentElement.removeAttribute("data-context"); refresh.mockClear(); });

describe("Inicio en Yo (T062)", () => {
  it("con el dataset dorado de octubre muestra 412.900 y el desglose literal de la tabla", () => {
    wrap(october());
    const hero = screen.getByRole("region", { name: copy.home.spentIn("octubre") });
    expect(hero.textContent).toMatch(/\$\s?412\.900/);
    const tiles = screen.getByRole("region", { name: copy.home.breakdownTitle });
    for (const [category, amount] of breakdown) {
      const tile = within(tiles).getByRole("listitem", { name: new RegExp(`^${copy.categories[category]}, `) });
      expect(tile.textContent).toContain(amount);
    }
    expect(within(tiles).getAllByRole("listitem")).toHaveLength(8);
    // El ingreso no suma al gasto ni aparece como categoría del desglose.
    expect(tiles.textContent).not.toContain("86.000");
    expect(screen.getByRole("link", { name: /^Reembolso EPS, más 86\.000 pesos/ })).toBeTruthy();
  });

  it("no finge presupuesto, límite ni nada compartido", () => {
    const { container } = wrap(october());
    expect(container.textContent).not.toMatch(/presupuesto|restante|excedido|Tu parte compartida|te alcanza|le debe|por saldar/i);
    expect(container.querySelector("[role='progressbar'], [role='meter'], progress, meter")).toBeNull();
  });

  it("vacío: el estado diseñado con la invitación a Anotar, nunca «$0»", () => {
    const { container } = wrap(october([]));
    expect(screen.getByRole("heading", { name: copy.home.empty.title })).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.home.empty.action })).toBeTruthy();
    expect(container.textContent).not.toMatch(/[0-9]|\$/);
  });

  it("error: lo explica y Reintentar vuelve a pedir los datos", async () => {
    wrap(<LoadError />);
    expect(screen.getByRole("heading", { name: copy.load.error.title })).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: copy.states.retry }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("en Nosotros: «todavía no disponible», sin ninguna cifra ni dato privado", () => {
    window.localStorage.setItem("juntia:context", "us");
    const { container } = wrap(<ContextView me={october()} />);
    expect(screen.getByRole("heading", { name: copy.us.title })).toBeTruthy();
    expect(container.textContent).not.toMatch(/[0-9]|\$|Taxi|Reembolso/);
  });
});
