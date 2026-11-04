// T050 / FR-028, FR-029; SC-004; US-2, escenarios 1 y 3 — capa: componente (Vitest + RTL), con `next/navigation`
// simulado (usePathname).
// Criterio literal (spec, FR-029): «Ninguna ruta de producto MUST mostrar «$0», importes, «Al día», «le debe»,
// totales, porcentajes, barras de presupuesto ni progreso de metas».
// Criterio literal (spec, FR-028): «El AppShell MUST mostrar en todas sus rutas un aviso visible de que esta versión
// todavía no guarda datos, que no se puede descartar».
// No importa ningún módulo con `server-only`.
import { render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import AppLayout from "./layout";
import HomePage from "./page";
import ActivityPage from "./actividad/page";
import GoalsPage from "./metas/page";
import PlanPage from "./plan/page";
import BalancePage from "./balance/page";
import AccountPage from "./cuenta/page";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

const routes: readonly [string, ComponentType][] = [
  ["/", HomePage],
  ["/actividad", ActivityPage],
  ["/metas", GoalsPage],
  ["/plan", PlanPage],
  ["/balance", BalancePage],
  ["/cuenta", AccountPage],
];

// Dígitos, signo de pesos, porcentaje y las dos afirmaciones de saldo que §15.10 prohíbe sin datos.
const FORBIDDEN = /[0-9]|\$|%|al día|le debe/i;
const NAMED = ["aria-label", "aria-description", "title", "alt"] as const;

describe("Rutas de producto sin cifras y con aviso de versión base (T050)", () => {
  for (const [route, Page] of routes) {
    it(`${route}: ni el texto visible ni los nombres accesibles tienen cifras`, () => {
      pathname.current = route;
      const { container } = render(<AppLayout><Page /></AppLayout>);
      expect(container.textContent ?? "").not.toMatch(FORBIDDEN);
      for (const attribute of NAMED) {
        for (const node of container.querySelectorAll(`[${attribute}]`)) {
          expect(node.getAttribute(attribute) ?? "", `${attribute} en ${route}`).not.toMatch(FORBIDDEN);
        }
      }
    });

    it(`${route}: muestra el aviso de versión base, sin control para cerrarlo`, () => {
      pathname.current = route;
      render(<AppLayout><Page /></AppLayout>);
      const text = screen.getByText(copy.shell.notice);
      const notice = text.closest("[data-base-version-notice]") as HTMLElement | null;
      expect(notice).not.toBeNull();
      expect(notice!.hidden || notice!.closest("[aria-hidden='true'], [hidden]")).toBeFalsy();
      expect(within(notice!).queryAllByRole("button")).toHaveLength(0);
      expect(within(notice!).queryAllByRole("link")).toHaveLength(0);
    });
  }
});
