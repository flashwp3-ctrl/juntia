// T060 (spec 003, PR D) / FR-040, FR-050; US-9; SC-011 (S1); MOTION_SYSTEM §1 — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T060): «el Skeleton del contexto nuevo hasta que llega el RSC, nunca cifras del anterior; la
// interrupción invierte la animación; con movimiento reducido, cambio inmediato con el valor final y el anuncio
// `aria-live`». Cifras de US-9: Yo de Sara 1.912.900 → Nosotros 2.840.000.
// El contador se observa a través de `animate` de Motion (simulado: se detiene a mitad de camino, como una animación en
// curso), para probar sin esperas que «el contador apunta al destino nuevo sin reiniciar».
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContextProvider, useContextChoice } from "@/components/shell/context-selector";
import { AccountProvider } from "@/features/account/account-context";
import { CountingAmount } from "@/features/expenses/counting-amount";
import { copy } from "@/lib/copy/es";
import { ContextView } from "./context-view";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));
// Motion: `animate` se queda a mitad de camino (onUpdate con el punto medio, sin completar).
const counter = vi.hoisted(() => ({ calls: [] as [number, number][] }));
vi.mock("motion/react", async (original) => ({
  ...(await original<typeof import("motion/react")>()),
  animate: (from: number, to: number, options: { onUpdate?: (value: number) => void }) => {
    counter.calls.push([from, to]);
    options.onUpdate?.((from + to) / 2);
    return { stop: () => {} };
  },
}));

let reduced = false;
beforeEach(() => {
  counter.calls = [];
  window.localStorage.setItem("juntia:context", "me");
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduced : false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { reduced = false; window.localStorage.clear(); });

const ME = <section data-testid="yo"><h2>Yo</h2><CountingAmount amountMinor="191290000" /></section>;
const US = <section data-testid="nosotros"><h2>Nosotros</h2><CountingAmount amountMinor="284000000" /></section>;
const SKELETON = <div data-testid="esqueleto-nosotros" aria-busy="true" />;

function Switch() {
  const { choose } = useContextChoice();
  return (
    <>
      <button type="button" onClick={() => choose("us")}>a Nosotros</button>
      <button type="button" onClick={() => choose("me")}>a Yo</button>
    </>
  );
}
function App({ server, me, us }: { server: "me" | "us"; me?: ReactNode; us?: ReactNode }) {
  return (
    <AccountProvider displayName="Sara" theme="light" couple="active">
      <ContextProvider>
        <Switch />
        <ContextView server={server} pending={<div data-testid="esqueleto-yo" />} usPending={SKELETON} me={me ?? null} us={us} />
      </ContextProvider>
    </AccountProvider>
  );
}
const shown = () => [...document.querySelectorAll("[data-counting-amount]")].map((node) => node.textContent);

describe("S1 · el contexto nuevo solo con sus datos (US-9.1, FR-040)", () => {
  it("al tocar Nosotros: el Skeleton de Nosotros hasta el RSC, y en ningún momento cifras de Yo junto a él", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<App server="me" me={ME} />);
    expect(shown()).toEqual(["$1.912.900"]);
    // Cada cambio del DOM: nunca el esqueleto de Nosotros y el importe de Yo a la vez.
    const together: string[] = [];
    const observer = new MutationObserver(() => {
      if (screen.queryByTestId("esqueleto-nosotros") && document.body.textContent?.includes("1.912.900")) together.push(document.body.innerHTML);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    await user.click(screen.getByRole("button", { name: "a Nosotros" }));
    expect(screen.getByTestId("esqueleto-nosotros")).toBeTruthy();
    expect(screen.queryByTestId("yo")).toBeNull();
    rerender(<App server="us" us={US} />);
    expect(screen.getByTestId("nosotros")).toBeTruthy();
    observer.disconnect();
    expect(together).toEqual([]);
  });

  it("con los datos ya recibidos, entra con la coreografía y el importe héroe cuenta de 1.912.900 a 2.840.000", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<App server="me" me={ME} />);
    await user.click(screen.getByRole("button", { name: "a Nosotros" }));
    rerender(<App server="us" us={US} />);
    expect(document.querySelector("[data-s1]")?.getAttribute("data-s1")).toBe("entering");
    await waitFor(() => expect(counter.calls).toContainEqual([1912900, 2840000]));
  });
});

describe("S1 · interrupción (US-9.2, MOTION_SYSTEM §1)", () => {
  it("volver a tocar antes de que lleguen los datos devuelve Yo en el acto, sin Skeleton ni recarga de Nosotros", async () => {
    const user = userEvent.setup();
    render(<App server="me" me={ME} />);
    await user.click(screen.getByRole("button", { name: "a Nosotros" }));
    await user.click(screen.getByRole("button", { name: "a Yo" }));
    expect(screen.getByTestId("yo")).toBeTruthy();
    expect(screen.queryByTestId("esqueleto-nosotros")).toBeNull();
  });

  it("el contador apunta al destino nuevo desde donde iba, sin reiniciar", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<App server="me" me={ME} />);
    await user.click(screen.getByRole("button", { name: "a Nosotros" }));
    rerender(<App server="us" us={US} />);
    // A mitad de la cuenta (2.376.450), se vuelve a Yo.
    await waitFor(() => expect(shown()).toEqual(["$2.376.450"]));
    await user.click(screen.getByRole("button", { name: "a Yo" }));
    rerender(<App server="me" me={ME} />);
    await waitFor(() => expect(counter.calls.at(-1)).toEqual([2376450, 1912900]));
  });
});

describe("S1 · movimiento reducido (US-9.3)", () => {
  it("cambio inmediato con el valor final, sin coreografía, y el anuncio «Ahora ves: Nosotros»", async () => {
    reduced = true;
    const user = userEvent.setup();
    const { rerender } = render(<App server="me" me={ME} />);
    await user.click(screen.getByRole("button", { name: "a Nosotros" }));
    await act(async () => rerender(<App server="us" us={US} />));
    expect(shown()).toEqual(["$2.840.000"]);
    expect(counter.calls).toEqual([]);
    expect(document.querySelector('[data-s1="entering"]')).toBeNull();
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe(copy.context.announce(copy.context.us));
  });
});
