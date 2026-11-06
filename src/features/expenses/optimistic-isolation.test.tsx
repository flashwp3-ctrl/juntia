// F51-8 (segunda ronda de ChatGPT, PR #51) — capa: componentes (Vitest + RTL). Criterio literal: «cada fila optimista vive por su
// clave, independiente de las demás transiciones. Una petición colgada de A no puede retrasar la retirada de B». Prueba: A
// colgada, B confirmada y revalidada, B aparece una sola vez como real y A sigue «Guardando…»; y lo mismo con B rechazada.
import { act, configure, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContextProvider } from "@/components/shell/context-selector";
import { moneyFromPesos } from "@/domain/money";
import type { Transaction } from "@/domain/transactions";
import { ActivityView } from "@/features/activity/activity-view";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "./annotate-provider";
import type { ActionResult, PendingRow, SavedTransaction } from "./types";

configure({ asyncUtilTimeout: 5000 });
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/actividad" }));

const NOW = "2026-11-05T15:00:00.000Z";
const pending = (key: string, description: string): PendingRow => ({
  key, state: "saving",
  transaction: { id: `pending:${key}`, type: "expense", amount: moneyFromPesos(45000n), categoryId: "market", transactionDate: "2026-11-05", description, status: "active", version: 1, createdAt: NOW, updatedAt: NOW },
});
const real = (id: string, description: string): Transaction => ({ id, type: "expense", amount: moneyFromPesos(45000n), categoryId: "market", transactionDate: "2026-11-05", description, status: "active", version: 1, createdAt: NOW, updatedAt: NOW });
const saved = (id: string, description: string): SavedTransaction => ({ id, type: "expense", categoryId: "market", transactionDate: "2026-11-05", description, amountMinor: "4500000", version: 1 });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }

/** Lanza una creación como lo hace la hoja al guardar. */
function Submit({ row, run }: { row: PendingRow; run: () => Promise<ActionResult<SavedTransaction>> }) {
  const { track } = useAnnotate();
  useEffect(() => { void track(row, run); }, [row, run, track]);
  return null;
}
/** Actividad con las filas «del servidor»; el botón simula la revalidación, que trae las filas reales. */
function Screen({ revalidated }: { revalidated: readonly Transaction[] }) {
  const [rows, setRows] = useState<readonly Transaction[]>([]);
  return (
    <>
      <button type="button" onClick={() => setRows(revalidated)}>revalidar</button>
      <ActivityView rows={rows} month="2026-11" today="2026-11-05" navigation={{ previous: null, next: null }} />
    </>
  );
}
const revalidate = () => act(() => { screen.getByRole("button", { name: "revalidar" }).click(); });
const idleActions = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
const inFlight = () => [...document.querySelectorAll<HTMLElement>("[data-pending='saving']")];
const textOf = (el: Element) => el.textContent ?? "";
// En jsdom se pintan la lista por día y la tabla; cada fila es una sola vez en cada una.
const pendingTexts = () => inFlight().map(textOf);

beforeEach(() => window.localStorage.clear());

function setup(a: () => Promise<ActionResult<SavedTransaction>>, b: () => Promise<ActionResult<SavedTransaction>>, revalidated: readonly Transaction[] = []) {
  render(
    <ContextProvider>
      <AnnotateProvider actions={idleActions} today="2026-11-05">
        <Screen revalidated={revalidated} />
        <Submit row={pending("A", "Fila A")} run={a} />
        <Submit row={pending("B", "Fila B")} run={b} />
      </AnnotateProvider>
    </ContextProvider>,
  );
}

describe("Cada fila optimista vive por su clave (F51-8)", () => {
  it("A colgada y B confirmada y revalidada: B aparece una sola vez como real y A sigue «Guardando…»", async () => {
    const hung = deferred<ActionResult<SavedTransaction>>(); // A nunca responde
    setup(() => hung.promise, async () => ({ ok: true, value: saved("real-b", "Fila B") }), [real("real-b", "Fila B")]);
    await waitFor(() => expect(pendingTexts().some((t) => t.includes("Fila A"))).toBe(true));
    // B se confirmó; mientras llega la revalidación sigue visible (sin hueco), y A no la retrasa ni la mezcla.
    await waitFor(() => expect(pendingTexts().some((t) => t.includes("Fila A"))).toBe(true));
    // Llega la revalidación con B real.
    revalidate();
    await waitFor(() => expect(pendingTexts().some((t) => t.includes("Fila B"))).toBe(false));
    const realRows = [...document.querySelectorAll("[data-transaction-id='real-b']")];
    expect(realRows.length).toBeGreaterThan(0);
    // Una sola vez por vista (lista por día y tabla): nunca la real más la temporal de B.
    expect(inFlight().filter((el) => textOf(el).includes("Fila B"))).toHaveLength(0);
    // A sigue «Guardando…», con su marca, y nada la retiró.
    const rowsA = inFlight().filter((el) => textOf(el).includes("Fila A"));
    expect(rowsA.length).toBeGreaterThan(0);
    for (const el of rowsA) expect(textOf(el)).toContain(copy.row.pending.saving);
    hung.resolve({ ok: false, error: "sessionExpired" });
    await waitFor(() => expect(pendingTexts().some((t) => t.includes("Fila A"))).toBe(false));
  });

  it("A colgada y B rechazada: la fila de B se retira en seguida y A sigue «Guardando…»", async () => {
    const hung = deferred<ActionResult<SavedTransaction>>();
    setup(() => hung.promise, async () => ({ ok: false, error: "sessionExpired" }));
    await waitFor(() => expect(pendingTexts().some((t) => t.includes("Fila B"))).toBe(false));
    expect(pendingTexts().some((t) => t.includes("Fila A"))).toBe(true);
    hung.resolve({ ok: true, value: saved("real-a", "Fila A") });
  });

  it("A colgada y B de resultado desconocido: la fila de B se retira en seguida y A sigue «Guardando…»", async () => {
    const hung = deferred<ActionResult<SavedTransaction>>();
    setup(() => hung.promise, async () => ({ ok: false, error: "network" }));
    await waitFor(() => expect(pendingTexts().some((t) => t.includes("Fila B"))).toBe(false));
    expect(pendingTexts().some((t) => t.includes("Fila A"))).toBe(true);
    hung.resolve({ ok: true, value: saved("real-a", "Fila A") });
  });

  it("una fila confirmada que aún no llegó revalidada no deja hueco: se ve hasta que aparece la real", async () => {
    setup(async () => ({ ok: true, value: saved("real-a", "Fila A") }), async () => ({ ok: true, value: saved("real-b", "Fila B") }), [real("real-a", "Fila A"), real("real-b", "Fila B")]);
    await act(async () => {});
    expect(pendingTexts().some((t) => t.includes("Fila A"))).toBe(true);
    expect(pendingTexts().some((t) => t.includes("Fila B"))).toBe(true);
    revalidate();
    await waitFor(() => expect(inFlight()).toHaveLength(0));
    expect(screen.queryAllByText(/Fila A/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(new RegExp(copy.row.pending.saving))).toHaveLength(0);
  });
});
