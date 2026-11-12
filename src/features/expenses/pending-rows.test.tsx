// UX lote 1, cambio 3 — capa: componentes (Vitest + RTL). Criterio literal (petición de los fundadores): «al guardar un gasto,
// aparece al instante en la lista (Inicio y Actividad) sin esperar a que el servidor revalide […] nunca debe quedar una fila
// duplicada ni fantasma al navegar». Aquí se prueba cómo se PINTA la fila en vuelo en Inicio y Actividad; el ciclo de vida
// (rechazo, resultado desconocido, reintento) está en annotate-sheet.test.tsx.
import { act, render, screen, within } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { saraPrivateOctober2026 } from "@/domain/golden/october-2026";
import { moneyFromPesos } from "@/domain/money";
import { ActivityView } from "@/features/activity/activity-view";
import { HomeView } from "@/features/home/home-view";
import { ContextProvider } from "@/components/shell/context-selector";
import { ExpenseRow } from "@/components/ui/expense-row";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "./annotate-provider";
import type { ActionResult, PendingRow, SavedTransaction } from "./types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/" }));

const idleActions = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
const NOW = "2026-11-05T15:00:00.000Z";
const row = (overrides: Partial<PendingRow["transaction"]> = {}, state: PendingRow["state"] = "saving"): PendingRow => ({
  key: "k1", state,
  transaction: { id: "pending:k1", type: "expense", amount: moneyFromPesos(45000n), categoryId: "market", transactionDate: "2026-11-05", description: "Mercado de la esquina", status: "active", version: 1, createdAt: NOW, updatedAt: NOW, ...overrides },
});

/** Lanza una creación en vuelo que no responde, como lo haría la hoja al guardar. */
function Flight({ pending, outcome }: { pending: PendingRow; outcome?: ActionResult<SavedTransaction> }) {
  const { track } = useAnnotate();
  useEffect(() => { void track(pending, () => (outcome ? Promise.resolve(outcome) : new Promise(() => {}))); }, [pending, outcome, track]);
  return null;
}
const mount = (node: ReactNode) => render(<ContextProvider><AnnotateProvider actions={idleActions}>{node}</AnnotateProvider></ContextProvider>);
const pendingRows = () => [...document.querySelectorAll<HTMLElement>("[data-pending]")];

describe("ExpenseRow en vuelo (UX lote 1, cambio 3)", () => {
  const transaction = row().transaction;
  it("«Guardando…»: no es un enlace (todavía no hay detalle), está ocupada y lo dice en su nombre", () => {
    render(<ExpenseRow transaction={transaction} href="/x" dateLabel="Hoy" pending="saving" />);
    expect(screen.queryByRole("link")).toBeNull();
    const el = document.querySelector<HTMLElement>("[data-pending]")!;
    expect(el.getAttribute("data-pending")).toBe("saving");
    expect(el.getAttribute("aria-busy")).toBe("true");
    expect(el.textContent).toContain(copy.row.pending.saving);
    expect(el.textContent).toContain("45.000");
  });
});

describe("Actividad con una fila en vuelo", () => {
  const view = (month: string, rows = saraPrivateOctober2026) => (
    <ActivityView rows={rows} month={month} today="2026-11-05" navigation={{ previous: null, next: null }} />
  );

  it("la fila aparece en la lista de su mes, marcada, sin tocar el resumen del mes", async () => {
    mount(<><Flight pending={row({ transactionDate: "2026-10-23" })} />{view("2026-10")}</>);
    const summary = screen.getByRole("region", { name: copy.activity.spentIn("octubre") });
    await vi.waitFor(() => expect(pendingRows().length).toBeGreaterThan(0));
    // Una en la lista por día (móvil) y una en la tabla (≥ 1280): cada una es una sola vez en su vista.
    expect(pendingRows().every((el) => el.getAttribute("data-pending") === "saving")).toBe(true);
    expect(summary.textContent).toMatch(/\$\s?412\.900/);
    expect(summary.textContent).not.toMatch(/457\.900/);
    expect(screen.getAllByText("Mercado de la esquina").length).toBeGreaterThan(0);
  });

  it("no aparece en otro mes", async () => {
    mount(<><Flight pending={row({ transactionDate: "2026-11-05" })} />{view("2026-10")}</>);
    await act(async () => {});
    expect(pendingRows()).toHaveLength(0);
  });

  it("en un mes vacío, la fila en vuelo reemplaza al estado vacío", async () => {
    mount(<><Flight pending={row()} />{view("2026-11", [])}</>);
    await vi.waitFor(() => expect(pendingRows().length).toBeGreaterThan(0));
    expect(screen.queryByRole("heading", { name: copy.activity.empty.title })).toBeNull();
  });

});

describe("Subtotal diario con filas en vuelo (F51-2)", () => {
  const subtotal = (date: string) => document.getElementById(`day-${date}`)!.parentElement!.querySelector("span")!.textContent;
  const view = () => <ActivityView rows={saraPrivateOctober2026} month="2026-10" today="2026-11-05" navigation={{ previous: null, next: null }} />;

  for (const [state, outcome] of [["saving", undefined]] as const) {
    it(`una fila «${state}» está en la lista del día pero no entra en su subtotal`, async () => {
      const baseline = render(<ContextProvider><AnnotateProvider actions={idleActions}>{view()}</AnnotateProvider></ContextProvider>);
      const before = subtotal("2026-10-23");
      expect(before).toMatch(/\d/);
      baseline.unmount();
      mount(<><Flight pending={row({ transactionDate: "2026-10-23" })} outcome={outcome} />{view()}</>);
      await vi.waitFor(() => expect(pendingRows().some((el) => el.getAttribute("data-pending") === state)).toBe(true));
      expect(subtotal("2026-10-23")).toBe(before);
    });
  }
});

describe("Inicio con una fila en vuelo", () => {
  const home = (rows = saraPrivateOctober2026, month = "2026-10") => <HomeView rows={rows} month={month} today="2026-11-05" />;
  const hero = () => document.querySelector("[data-counting-amount]")?.getAttribute("data-counting-amount");
  const saved = (id: string): SavedTransaction => ({ id, type: "expense", categoryId: "market", transactionDate: "2026-10-23", description: "Mercado de la esquina", amountMinor: "4500000", version: 1 });
  const real = (id: string) => ({ ...row({ transactionDate: "2026-10-23" }).transaction, id });
  const wrapHome = (node: ReactNode) => <ContextProvider><AnnotateProvider actions={idleActions}>{node}</AnnotateProvider></ContextProvider>;

  it("F05: confirmada, el total optimista se queda; cuando la lista trae la fila real, el del servidor la incluye y no se suma dos veces", async () => {
    const pending = row({ transactionDate: "2026-10-23" });
    const outcome = { ok: true as const, value: saved("real-1") };
    const view = render(wrapHome(<><Flight pending={pending} outcome={outcome} />{home()}</>));
    await vi.waitFor(() => expect(document.querySelector("a[href^='/actividad/real-1']")).toBeTruthy());
    expect(hero()).toBe("$457.900");
    // La revalidación trae la fila real (y el total del servidor con ella): 457.900, nunca 502.900.
    view.rerender(wrapHome(<><Flight pending={pending} outcome={outcome} />{home([real("real-1"), ...saraPrivateOctober2026])}</>));
    expect(hero()).toBe("$457.900");
    expect(pendingRows()).toHaveLength(0);
  });

  it("F77-2: en el primer gasto del mes (sin movimientos), el héroe optimista dice $45.000 y, con la real, sigue en $45.000", async () => {
    let resolve!: (value: ActionResult<SavedTransaction>) => void;
    const held = new Promise<ActionResult<SavedTransaction>>((done) => { resolve = done; });
    const pending = row({ transactionDate: "2026-11-05" });
    function Held() {
      const { track } = useAnnotate();
      useEffect(() => { void track(pending, () => held); }, [track]);
      return null;
    }
    const view = render(wrapHome(<><Held />{home([], "2026-11")}</>));
    await vi.waitFor(() => expect(hero()).toBe("$45.000"));
    expect(screen.getByRole("heading", { name: copy.home.spentIn("noviembre") })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: copy.home.empty.title })).toBeNull();
    await act(async () => { resolve({ ok: true, value: { ...saved("real-1"), transactionDate: "2026-11-05" } }); });
    expect(hero()).toBe("$45.000");
    view.rerender(wrapHome(<><Held />{home([{ ...pending.transaction, id: "real-1" }], "2026-11")}</>));
    expect(hero()).toBe("$45.000");
    expect(pendingRows()).toHaveLength(0);
  });

  it("F77-2: en Yo con pareja y sin movimientos (consumo 0), el héroe optimista también sale; con solo un ingreso en vuelo, ningún héroe de $0", async () => {
    const empty = { privateMinor: "0", sharedPartMinor: "0", consumptionMinor: "0" };
    const pending = row({ transactionDate: "2026-11-05" });
    const outcome = { ok: true as const, value: { ...saved("real-1"), transactionDate: "2026-11-05" } };
    const concept = (label: string) => screen.getByText(label).closest("div")!.textContent;
    const first = render(wrapHome(<><Flight pending={pending} outcome={outcome} /><HomeView rows={[]} month="2026-11" today="2026-11-05" shared={{ parts: [], summary: empty }} /></>));
    await vi.waitFor(() => expect(hero()).toBe("$45.000"));
    // F77-4: también el desglose durante el vuelo: Solo tuyos $45.000 y Tu parte compartida $0.
    expect(concept(copy.home.onlyYours)).toContain("$45.000");
    expect(concept(copy.home.sharedPart)).toContain("$0");
    // Llega la real (y el resumen del servidor con ella): la rama normal dice lo mismo, sin sumar dos veces.
    const real = { privateMinor: "4500000", sharedPartMinor: "0", consumptionMinor: "4500000" };
    first.rerender(wrapHome(<><Flight pending={pending} outcome={outcome} /><HomeView rows={[{ ...pending.transaction, id: "real-1" }]} month="2026-11" today="2026-11-05" shared={{ parts: [], summary: real }} /></>));
    expect(hero()).toBe("$45.000");
    expect(concept(copy.home.onlyYours)).toContain("$45.000");
    expect(concept(copy.home.onlyYours)).not.toContain("$90.000");
    expect(concept(copy.home.sharedPart)).toContain("$0");
    expect(pendingRows()).toHaveLength(0);
    first.unmount();
    const income = row({ transactionDate: "2026-11-05", type: "income", categoryId: "income" });
    render(wrapHome(<><Flight pending={income} />{home([], "2026-11")}</>));
    await vi.waitFor(() => expect(pendingRows()).toHaveLength(1));
    expect(hero()).toBeUndefined();
    expect(screen.queryByRole("heading", { name: copy.home.spentIn("noviembre") })).toBeNull();
  });

  it("F05: rechazada, la fila se va y el total vuelve a lo confirmado", async () => {
    mount(<><Flight pending={row({ transactionDate: "2026-10-23" })} outcome={{ ok: false, error: "invalid" }} />{home()}</>);
    await act(async () => {});
    expect(pendingRows()).toHaveLength(0);
    expect(hero()).toBe("$412.900");
  });

  it("F05: resultado desconocido (red), la fila se va y el total vuelve a lo confirmado", async () => {
    mount(<><Flight pending={row({ transactionDate: "2026-10-23" })} outcome={{ ok: false, error: "network" }} />{home()}</>);
    await act(async () => {});
    expect(pendingRows()).toHaveLength(0);
    expect(hero()).toBe("$412.900");
  });

  it("F05: un gasto en vuelo de otro mes no toca el héroe", async () => {
    mount(<><Flight pending={row({ transactionDate: "2026-11-05" })} />{home()}</>);
    await act(async () => {});
    expect(hero()).toBe("$412.900");
  });

  it("F05: con pareja, el héroe (gasto_consumo) y «Solo tuyos» suben juntos; «Tu parte compartida» no cambia", async () => {
    const summary = { privateMinor: "41290000", sharedPartMinor: "150000000", consumptionMinor: "191290000" };
    mount(<><Flight pending={row({ transactionDate: "2026-10-23" })} /><HomeView rows={saraPrivateOctober2026} month="2026-10" today="2026-11-05" shared={{ parts: [], summary }} /></>);
    await vi.waitFor(() => expect(hero()).toBe("$1.957.900"));
    expect(screen.getByText(copy.home.onlyYours).closest("div")!.textContent).toContain("$457.900");
    expect(screen.getByText(copy.home.sharedPart).closest("div")!.textContent).toContain("$1.500.000");
  });

  it("F05: nada se guarda en el navegador mientras la fila viaja", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    mount(<><Flight pending={row({ transactionDate: "2026-10-23" })} />{home()}</>);
    await vi.waitFor(() => expect(hero()).toBe("$457.900"));
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it("la fila aparece arriba de «Últimos movimientos» y el total del héroe sube con ella (F05, optimista)", async () => {
    mount(<><Flight pending={row({ transactionDate: "2026-10-23" })} />{home()}</>);
    const recent = screen.getByRole("region", { name: copy.home.recentTitle });
    await vi.waitFor(() => expect(within(recent).getAllByRole("listitem")[0].querySelector("[data-pending]")).toBeTruthy());
    expect(within(recent).getAllByRole("listitem")[0].textContent).toContain(copy.row.pending.saving);
    expect(hero()).toBe("$457.900");
  });

  it("en el primer gasto, la fila en vuelo reemplaza al estado vacío", async () => {
    mount(<><Flight pending={row()} />{home([], "2026-11")}</>);
    await vi.waitFor(() => expect(pendingRows()).toHaveLength(1));
    expect(screen.queryByRole("heading", { name: copy.home.empty.title })).toBeNull();
  });
});
