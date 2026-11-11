// 004 PR E · revisión del gestor del PR #71 (bloqueante 1) — capa: componentes (Vitest + RTL), con hidratación real.
// Criterio literal: «Con movimiento reducido, en una carga completa los capítulos 2–4 quedan invisibles para siempre».
// `usePrefersReducedMotion` da `false` en el servidor y en la hidratación; el efecto de `Chapter` corría con ese `false`,
// escondía los capítulos bajo el pliegue y, al volver a pintar con `true`, salía sin devolverlos a `shown`. Aquí se pinta en
// el servidor, se hidrata con `matchMedia` en reduce y con los capítulos bajo el pliegue, y se comprueba el estado final.
// Cumple: FR-025; SC-011; MOTION_SYSTEM §5 («Reduced motion: todo visible desde el inicio»).
import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { metricCases } from "@/domain/golden/planning-2026";
import { AnalysisScreen } from "./analysis-screen";
import type { AnalysisData } from "./types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }), usePathname: () => "/plan/analisis" }));

const minor = (pesos: bigint) => (pesos * 100n).toString();
const october = metricCases[0];
const data: AnalysisData = {
  context: "us", month: "2026-10", today: "2026-11-11", navigation: { previous: null, next: "2026-11" },
  metrics: { spentMinor: minor(october.consumption), contributedMinor: minor(october.contributions), withdrawnMinor: "0", fundedMinor: "0", netMinor: minor(october.net) },
  categories: [{ categoryId: "home", consumedMinor: minor(1600000n), limitMinor: null }],
  comparison: null,
  history: [{ month: "2026-10", spentMinor: minor(october.consumption) }],
  contributors: [{ name: "Sara", amountMinor: minor(500000n) }, { name: "Tomás", amountMinor: minor(400000n) }],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("Capítulos con movimiento reducido tras hidratar (bloqueante 1 del PR #71)", () => {
  it("una carga completa con movimiento reducido deja los cuatro capítulos en `shown`, sin opacidad 0", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }));
    // Todo bajo el pliegue: sin el arreglo, el efecto de la hidratación los escondía.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 5000, bottom: 5400, left: 0, right: 390, width: 390, height: 400, x: 0, y: 5000, toJSON() {} } as DOMRect);
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} unobserve() {} takeRecords() { return []; } });
    const container = document.createElement("div");
    container.innerHTML = renderToString(<AnalysisScreen data={data} />);
    document.body.appendChild(container);
    await act(async () => { hydrateRoot(container, <AnalysisScreen data={data} />); });
    const phases = [...container.querySelectorAll("[data-chapter-phase]")].map((node) => node.getAttribute("data-chapter-phase"));
    expect(phases).toEqual(["shown", "shown", "shown", "shown"]);
    expect(container.querySelectorAll("[style*='opacity: 0']")).toHaveLength(0);
  });
});
