// PR #117, ronda 3 (F117-8) — capa: componente (Vitest + jsdom). La devolución del foco al cerrar el detalle de Actividad,
// con el tiempo controlado (requestAnimationFrame y performance falsos). jsdom no maqueta: aquí un elemento «se ve» si no está
// dentro de `[hidden]`. Casos: la fila ya está; una carga tardía (vuelve a verse un Skeleton después de pintarse la lista); un
// Skeleton oculto no hace esperar; el usuario enfoca un control durante la espera y no se le quita; sin fila, el título.
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { ReturnFocusToRow } from "./return-focus";

let path = "/actividad/fila-1";
vi.mock("next/navigation", () => ({ usePathname: () => path }));

const originalRects = Element.prototype.getClientRects;
let main: HTMLElement;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, attributes: Record<string, string> = {}, text = "") {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.textContent = text;
  return node;
}
const skeleton = (hidden = false) => {
  const node = element("div", { "aria-busy": "true", ...(hidden ? { hidden: "" } : {}) });
  node.append(element("span", { class: "sr-only" }, copy.activity.loading));
  return node;
};
const row = () => element("a", { href: "/actividad/fila-1", "data-transaction-id": "fila-1" }, "Fila");
const heading = () => element("h1", {}, "Actividad");

/** Monta el componente en el detalle y navega a la lista: desde aquí corre la espera. */
function closeDetail() {
  path = "/actividad/fila-1";
  const view = render(<ReturnFocusToRow />);
  path = "/actividad";
  view.rerender(<ReturnFocusToRow />);
  return view;
}
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "clearTimeout", "Date"] });
  if (!globalThis.CSS?.escape) vi.stubGlobal("CSS", { escape: (value: string) => value });
  Element.prototype.getClientRects = function (this: Element) {
    return (this.closest("[hidden]") ? [] : [new DOMRect(0, 0, 10, 10)]) as unknown as DOMRectList;
  };
  main = document.createElement("main");
  document.body.append(main);
});
afterEach(() => {
  Element.prototype.getClientRects = originalRects;
  main.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ReturnFocusToRow (F117-8)", () => {
  it("con la fila ya en la lista, el foco va a ella", () => {
    const target = row();
    main.append(heading(), target);
    closeDetail();
    advance(20);
    expect(document.activeElement).toBe(target);
  });

  it("carga tardía: si vuelve a verse un Skeleton después de pintarse la lista, la espera de 2 s empieza de nuevo y el foco llega a la fila", () => {
    main.append(heading());
    const first = skeleton();
    main.append(first);
    closeDetail();
    advance(100);
    first.remove(); // la lista se pinta sin la fila
    advance(1000);
    const second = skeleton(); // otra carga, más tarde
    main.append(second);
    advance(1900);
    second.remove();
    advance(50);
    const target = row(); // la fila llega poco después de la segunda carga
    main.append(target);
    advance(50);
    expect(document.activeElement).toBe(target);
  });

  it("un Skeleton oculto no hace esperar: sin fila, el foco va al título a los 2 s, no a los 15", () => {
    const title = heading();
    main.append(title, skeleton(true));
    closeDetail();
    advance(2100);
    expect(document.activeElement).toBe(title);
  });

  it("si el usuario enfoca un control durante la espera, no se le quita el foco", () => {
    const loader = skeleton();
    const field = element("input");
    main.append(heading(), loader, field);
    closeDetail();
    advance(500);
    field.focus();
    advance(500);
    loader.remove();
    main.append(row());
    advance(3000);
    expect(document.activeElement).toBe(field);
  });

  it("F117-9: con un Skeleton visible que no desaparece y sin fila, pasados los 15 s el foco va al título y la espera termina", () => {
    const title = heading();
    main.append(title, skeleton());
    closeDetail();
    advance(15_000);
    expect(document.activeElement).toBe(document.body);
    advance(2500);
    expect(document.activeElement).toBe(title);
    // Sin fotogramas pendientes: el bucle de requestAnimationFrame ha parado.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("si la fila no está, el foco va al título y no a body", () => {
    const title = heading();
    main.append(title);
    closeDetail();
    advance(1900);
    expect(document.activeElement).toBe(document.body);
    advance(200);
    expect(document.activeElement).toBe(title);
    expect(title.tabIndex).toBe(-1);
  });
});
