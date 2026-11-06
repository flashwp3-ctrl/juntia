// P0-1, PR C (T066; FR-043, FR-044 de la 002): Inicio y Actividad ya leen datos reales y se prueban en
// src/features/home y src/features/activity; aquí quedan Metas, Plan y Balance, que siguen sin datos. El aviso de versión
// base desaparece (FR-044): la prueba que exigía verlo pasa a exigir que no esté en ninguna ruta.
// T050 / FR-028, FR-029; SC-004; US-2, escenarios 1 y 3 — capa: componente (Vitest + RTL), con `next/navigation`
// simulado (usePathname).
// Criterio literal (spec, FR-029): «Ninguna ruta de producto MUST mostrar «$0», importes, «Al día», «le debe»,
// totales, porcentajes, barras de presupuesto ni progreso de metas».
// Criterio literal (spec, FR-028): «El AppShell MUST mostrar en todas sus rutas un aviso visible de que esta versión
// todavía no guarda datos, que no se puede descartar».
// No importa ningún módulo con `server-only`. Desde el PR B de la 002 el layout de (app) lee la sesión y el perfil en el
// servidor (T047): esta prueba compone el mismo árbol de cliente que él con un perfil de prueba. /cuenta muestra datos de la
// cuenta y se prueba con sesión real en la spec E2E 1 y en axe (job e2e).
import { render } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AnnotateProvider } from "@/components/shell/annotate-notice";
import { AppShell } from "@/components/shell/app-shell";
import { ContextProvider } from "@/components/shell/context-selector";
import { AccountProvider } from "@/features/account/account-context";
import GoalsPage from "./metas/page";
import PlanPage from "./plan/page";
import BalancePage from "./balance/page";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

// El árbol de cliente de src/app/(app)/layout.tsx, con un perfil de prueba sin cifras.
function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AccountProvider displayName="Sara" theme="system">
      <ContextProvider>
        <AnnotateProvider>
          <AppShell>
            <main id="contenido">{children}</main>
          </AppShell>
        </AnnotateProvider>
      </ContextProvider>
    </AccountProvider>
  );
}

const routes: readonly [string, ComponentType][] = [
  ["/metas", GoalsPage],
  ["/plan", PlanPage],
  ["/balance", BalancePage],
];

// Dígitos, signo de pesos, porcentaje y las dos afirmaciones de saldo que §15.10 prohíbe sin datos.
const FORBIDDEN = /[0-9]|\$|%|al día|le debe/i;
const NAMED = ["aria-label", "aria-description", "title", "alt"] as const;

describe("Rutas de producto sin datos: sin cifras y sin aviso de versión base (T050; FR-044 de la 002)", () => {
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

    it(`${route}: ya no muestra el aviso de versión base (FR-044)`, () => {
      pathname.current = route;
      const { container } = render(<AppLayout><Page /></AppLayout>);
      expect(container.querySelector("[data-base-version-notice]")).toBeNull();
      expect(container.textContent).not.toMatch(/Versión base|Todavía no guarda datos/);
    });
  }
});
