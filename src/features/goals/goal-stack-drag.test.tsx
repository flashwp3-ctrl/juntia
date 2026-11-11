// 004 PR C (revisión del gestor del PR #68, punto 7); gesto horizontal por decisión de los fundadores del 11 de noviembre de
// 2026 — capa: componentes. El gesto de deslizar de GoalStack: un arrastre horizontal cambia de verdad la meta del frente en
// los dos sentidos, uno vertical no (es scroll de la página), y con movimiento reducido la tarjeta no tiene elasticidad (no
// sigue al dedo). jsdom no puede producir el gesto de Motion, así que `motion/react-m` se sustituye por elementos simples que
// guardan las props de arrastre; el componente se prueba entero con ellas. El scroll vertical real sobre la tarjeta lo
// comprueba goals.e2e.ts en móvil emulado.
import { act, render } from "@testing-library/react";
import { forwardRef, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GoalView } from "./types";

type DragProps = { drag?: "x"; dragElastic?: number; onDragEnd?: (event: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => void };
const dragged = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }));
vi.mock("motion/react-m", () => {
  const strip = (props: Record<string, unknown>) => Object.fromEntries(Object.entries(props).filter(([key]) => !["layout", "layoutId", "transition", "drag", "dragConstraints", "dragElastic", "dragSnapToOrigin", "dragTransition", "onDragStart", "onDragEnd", "initial", "animate", "exit"].includes(key)));
  const make = (Tag: "li" | "div") => forwardRef<HTMLElement, Record<string, unknown> & { children?: ReactNode }>(function Element(props, ref) {
    if (Tag === "li" && props.drag) dragged.props = props;
    const Component = Tag as unknown as React.ElementType;
    return <Component ref={ref} {...strip(props)} />;
  });
  return { li: make("li"), div: make("div") };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/metas" }));

const { GoalStack } = await import("./goal-stack");
const { startsNavigation } = await import("@/features/expenses/annotate/use-reveal");

const goal = (index: number, overrides: Partial<GoalView> = {}): GoalView => ({
  id: `6666666${index}-6666-4666-8666-666666666666`, name: `Meta ${index}`, goalType: "home", scope: "shared", status: "active", version: 1,
  targetMinor: "400000000", balanceMinor: "10000000", progressPercent: 2, myAvailableMinor: "0", hasPendingRequest: false, targetMonth: null,
  createdAt: `2026-0${index}-01T00:00:00Z`, lastContributionDate: null, lastContributionCreatedAt: null, ...overrides,
});
const frontId = (container: HTMLElement) => container.querySelector("[data-stack-layer='0'] [data-goal-card]")?.getAttribute("data-goal-card");
const media = (reduce: boolean) => vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); dragged.props = null; });

describe("GoalStack · deslizar horizontal (decisión de los fundadores del 11 de noviembre de 2026)", () => {
  it("la frontal se arrastra solo en horizontal, con la página libre para el scroll vertical (pan-y)", () => {
    media(false);
    const { container } = render(<GoalStack goals={[goal(1), goal(2)]} members={{}} today="2026-11-10" context="us" />);
    expect((dragged.props as DragProps).drag).toBe("x");
    expect(container.querySelector("[data-swipe]")?.className).toContain("touch-pan-y");
  });

  it("deslizar a la izquierda trae la siguiente al frente y a la derecha la anterior", () => {
    media(false);
    const goals = [goal(1), goal(2), goal(3)];
    const { container } = render(<GoalStack goals={goals} members={{}} today="2026-11-10" context="us" />);
    expect(frontId(container)).toBe(goals[0].id);
    act(() => { (dragged.props as DragProps).onDragEnd!({}, { offset: { x: -120, y: 0 }, velocity: { x: 0, y: 0 } }); });
    expect(frontId(container)).toBe(goals[1].id);
    act(() => { (dragged.props as DragProps).onDragEnd!({}, { offset: { x: 120, y: 0 }, velocity: { x: 0, y: 0 } }); });
    expect(frontId(container)).toBe(goals[0].id);
    // A la derecha desde la primera, la última (la pila da la vuelta).
    act(() => { (dragged.props as DragProps).onDragEnd!({}, { offset: { x: 120, y: 0 }, velocity: { x: 0, y: 0 } }); });
    expect(frontId(container)).toBe(goals[2].id);
    // Por debajo del umbral, nada cambia.
    act(() => { (dragged.props as DragProps).onDragEnd!({}, { offset: { x: -20, y: 0 }, velocity: { x: -100, y: 0 } }); });
    expect(frontId(container)).toBe(goals[2].id);
  });

  it("un arrastre vertical no cambia el frente: es scroll de la página", () => {
    media(false);
    const goals = [goal(1), goal(2), goal(3)];
    const { container } = render(<GoalStack goals={goals} members={{}} today="2026-11-10" context="us" />);
    act(() => { (dragged.props as DragProps).onDragEnd!({}, { offset: { x: 0, y: -200 }, velocity: { x: 0, y: -900 } }); });
    expect(frontId(container)).toBe(goals[0].id);
    act(() => { (dragged.props as DragProps).onDragEnd!({}, { offset: { x: 30, y: 160 }, velocity: { x: 200, y: 900 } }); });
    expect(frontId(container)).toBe(goals[0].id);
  });

  it("la meta del frente se guarda por id: si la lista llega en otro orden, sigue delante", () => {
    media(false);
    const goals = [goal(1), goal(2), goal(3)];
    const { container, rerender } = render(<GoalStack goals={goals} members={{}} today="2026-11-10" context="us" />);
    act(() => { (dragged.props as DragProps).onDragEnd!({}, { offset: { x: -120, y: 0 }, velocity: { x: 0, y: 0 } }); });
    expect(frontId(container)).toBe(goals[1].id);
    // Un `router.refresh` trae la meta 3 con un aporte nuevo: pasaría delante por orden, pero el frente elegido se conserva.
    rerender(<GoalStack goals={[goals[0], goals[1], goal(3, { lastContributionDate: "2026-11-10", lastContributionCreatedAt: "2026-11-10T12:00:00Z" })]} members={{}} today="2026-11-10" context="us" />);
    expect(frontId(container)).toBe(goals[1].id);
  });

  it("con movimiento reducido, la tarjeta no tiene elasticidad (no sigue al dedo) y el cambio es inmediato; sin él, sí", () => {
    media(true);
    const goals = [goal(1), goal(2)];
    const reduced = render(<GoalStack goals={goals} members={{}} today="2026-11-10" context="us" />);
    expect((dragged.props as DragProps).dragElastic).toBe(0);
    // El cambio no espera a ninguna animación: las capas no animan su posición y el frente es otro en cuanto se suelta.
    expect((dragged.props as { layout?: unknown }).layout).toBe(false);
    act(() => { (dragged.props as DragProps).onDragEnd!({}, { offset: { x: -120, y: 0 }, velocity: { x: 0, y: 0 } }); });
    expect(frontId(reduced.container)).toBe(goals[1].id);
    reduced.unmount();
    media(false);
    render(<GoalStack goals={[goal(1), goal(2)]} members={{}} today="2026-11-10" context="us" />);
    expect((dragged.props as DragProps).dragElastic).toBeGreaterThan(0);
  });
});

// F74-3 (revisión de ChatGPT del PR #74): la señal `data-stays-on-page` de la lista se quita 350 ms después del ÚLTIMO arrastre.
// Con dos arrastres seguidos, el plazo del primero no la quita mientras el clic del segundo sigue bloqueado; si lo hiciera, E5
// tomaría ese clic por una navegación (startsNavigation) y dejaría de esperar el gasto recién guardado.
describe("GoalStack · la señal de «no navega» tras deslizar (F74-3)", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("dos arrastres a menos de 350 ms: vencido el plazo del primero y no el del segundo, el clic sigue bloqueado y no es una navegación", () => {
    vi.useFakeTimers();
    media(false);
    const { container, unmount } = render(<GoalStack goals={[goal(1), goal(2), goal(3)]} members={{}} today="2026-11-10" context="us" />);
    const list = container.querySelector("ul")!;
    const drag = () => act(() => { (dragged.props as DragProps).onDragEnd!({}, { offset: { x: 0, y: -120 }, velocity: { x: 0, y: 0 } }); });
    const clickCard = () => {
      const card = container.querySelector<HTMLAnchorElement>("[data-stack-layer='0'] [data-goal-card]")!;
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, detail: 1 });
      const navigates = startsNavigation(Object.defineProperty(event, "target", { value: card }));
      card.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, detail: 1 }));
      return navigates;
    };

    drag(); // t = 0: el primer plazo vence a los 350 ms
    act(() => { vi.advanceTimersByTime(200); });
    drag(); // t = 200: el segundo vence a los 550 ms
    act(() => { vi.advanceTimersByTime(250); }); // t = 450: venció el primero, no el segundo
    expect(list.hasAttribute("data-stays-on-page")).toBe(true);
    // El clic que sigue a soltar está bloqueado (no abre la meta) y E5 no lo toma por una navegación.
    const blocked = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, detail: 1 });
    container.querySelector("[data-stack-layer='0'] [data-goal-card]")!.dispatchEvent(blocked);
    expect(blocked.defaultPrevented).toBe(true);
    expect(clickCard()).toBe(false);

    act(() => { vi.advanceTimersByTime(150); }); // t = 600: venció el del último arrastre
    expect(list.hasAttribute("data-stays-on-page")).toBe(false);
    expect(clickCard()).toBe(true);

    // Al desmontar se cancela el temporizador del último arrastre.
    const set = vi.spyOn(globalThis, "setTimeout");
    const cleared = vi.spyOn(globalThis, "clearTimeout");
    drag();
    const timer = set.mock.results.find((result) => result.type === "return")?.value;
    expect(timer).toBeDefined();
    unmount();
    expect(cleared.mock.calls.some(([id]) => id === timer)).toBe(true);
  });
});
