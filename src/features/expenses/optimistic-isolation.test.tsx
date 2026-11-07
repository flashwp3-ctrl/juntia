// F51-8, F51-11 y F51-12 (rondas 2 y 3 de ChatGPT, PR #51) — capa: componentes (Vitest + RTL).
// F51-8: «cada fila optimista vive por su clave, independiente de las demás transiciones. Una petición colgada de A no puede
// retrasar la retirada de B». F51-12: tras confirmarse, la fila temporal no se retira por tiempo: solo cuando la lista trae el
// UUID real; al agotarse el plazo se pide una revalidación y se sigue esperando, y mientras tanto se muestra como confirmada
// (sin «Guardando…»). F51-11 (límite conocido): si otra revalidación trae la real antes que la respuesta de la acción, durante
// ese intervalo se ven la temporal y la real; al llegar la respuesta queda una sola.
import { act, configure, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextProvider } from "@/components/shell/context-selector";
import { moneyFromPesos } from "@/domain/money";
import type { Transaction } from "@/domain/transactions";
import { ActivityView } from "@/features/activity/activity-view";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate } from "./annotate-provider";
import type { ActionResult, PendingRow, SavedTransaction } from "./types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/actividad" }));

const NOW = "2026-11-05T15:00:00.000Z";
const pending = (key: string, description: string, transactionDate = "2026-11-05"): PendingRow => ({
  key, state: "saving",
  transaction: { id: `pending:${key}`, type: "expense", amount: moneyFromPesos(45000n), categoryId: "market", transactionDate, description, status: "active", version: 1, createdAt: NOW, updatedAt: NOW },
});
const real = (id: string, description: string): Transaction => ({ id, type: "expense", amount: moneyFromPesos(45000n), categoryId: "market", transactionDate: "2026-11-05", description, status: "active", version: 1, createdAt: NOW, updatedAt: NOW });
const saved = (id: string, description: string, transactionDate = "2026-11-05"): SavedTransaction => ({ id, type: "expense", categoryId: "market", transactionDate, description, amountMinor: "4500000", version: 1 });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }

/** Lanza una creación como lo hace la hoja al guardar. */
function Submit({ row, run }: { row: PendingRow; run: () => Promise<ActionResult<SavedTransaction>> }) {
  const { track } = useAnnotate();
  useEffect(() => { void track(row, run); }, [row, run, track]);
  return null;
}
/** Actividad con las filas «del servidor»; el botón simula una revalidación, que trae las filas reales. */
function Screen({ revalidated }: { revalidated: readonly Transaction[] }) {
  const [rows, setRows] = useState<readonly Transaction[]>([]);
  const [month, setMonth] = useState("2026-11");
  return (
    <>
      <button type="button" onClick={() => setRows(revalidated)}>revalidar</button>
      <button type="button" onClick={() => { setMonth("2026-10"); setRows([]); }}>ir a octubre</button>
      <ActivityView rows={rows} month={month} today="2026-11-05" navigation={{ previous: null, next: null }} />
    </>
  );
}
const revalidate = () => act(() => { screen.getByRole("button", { name: "revalidar" }).click(); });
const idleActions = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
const savingRows = () => [...document.querySelectorAll<HTMLElement>("[data-pending='saving']")];
const savingTexts = () => savingRows().map((el) => el.textContent ?? "");
/** Filas de una creación ya confirmada o real, por su id real (una por vista: lista por día y tabla). */
const rowsOf = (id: string) => document.querySelectorAll(`[data-transaction-id='${id}']`).length;

function setup(a: () => Promise<ActionResult<SavedTransaction>>, b: () => Promise<ActionResult<SavedTransaction>>, revalidated: readonly Transaction[] = [], dateB = "2026-11-05") {
  render(
    <ContextProvider>
      <AnnotateProvider actions={idleActions} today="2026-11-05">
        <Screen revalidated={revalidated} />
        <Submit row={pending("A", "Fila A")} run={a} />
        <Submit row={pending("B", "Fila B", dateB)} run={b} />
      </AnnotateProvider>
    </ContextProvider>,
  );
}

afterEach(() => { vi.useRealTimers(); router.refresh.mockClear(); router.push.mockClear(); });

describe("Cada fila optimista vive por su clave (F51-8)", () => {
  it("A colgada y B confirmada y revalidada: B aparece una sola vez como real y A sigue «Guardando…»", async () => {
    const hung = deferred<ActionResult<SavedTransaction>>(); // A nunca responde
    setup(() => hung.promise, async () => ({ ok: true, value: saved("real-b", "Fila B") }), [real("real-b", "Fila B")]);
    await waitFor(() => expect(rowsOf("real-b")).toBeGreaterThan(0)); // B confirmada: ya se ve como confirmada, sin «Guardando…»
    const before = rowsOf("real-b");
    expect(savingTexts().some((t) => t.includes("Fila B"))).toBe(false);
    expect(savingTexts().some((t) => t.includes("Fila A"))).toBe(true);
    // Llega la revalidación con B real: sigue una sola por vista y A no la retrasa ni la mezcla.
    revalidate();
    expect(rowsOf("real-b")).toBe(before);
    const rowsA = savingRows().filter((el) => (el.textContent ?? "").includes("Fila A"));
    expect(rowsA.length).toBeGreaterThan(0);
    for (const el of rowsA) expect(el.textContent).toContain(copy.row.pending.saving);
    hung.resolve({ ok: false, error: "sessionExpired" });
    await waitFor(() => expect(savingTexts().some((t) => t.includes("Fila A"))).toBe(false));
  });

  for (const [name, error] of [["rechazada", "sessionExpired"], ["de resultado desconocido", "network"]] as const) {
    it(`A colgada y B ${name}: la fila de B se retira en seguida y A sigue «Guardando…»`, async () => {
      const hung = deferred<ActionResult<SavedTransaction>>();
      setup(() => hung.promise, async () => ({ ok: false, error }));
      await waitFor(() => expect(savingTexts().some((t) => t.includes("Fila B"))).toBe(false));
      expect(savingTexts().some((t) => t.includes("Fila A"))).toBe(true);
      hung.resolve({ ok: true, value: saved("real-a", "Fila A") });
    });
  }
});

describe("Tras confirmarse, la fila temporal solo se retira cuando llega la real (F51-12)", () => {
  it("revalidación retenida más allá del plazo: sigue visible y confirmada, se pide router.refresh y desaparece al llegar la real", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup(() => new Promise(() => {}), async () => ({ ok: true, value: saved("real-b", "Fila B") }), [real("real-b", "Fila B")]);
    await waitFor(() => expect(rowsOf("real-b")).toBeGreaterThan(0));
    const visible = rowsOf("real-b");
    await act(async () => {}); // los efectos de la confirmación ya corrieron
    // La revalidación se retiene mucho más allá de los 8 s: la fila confirmada no se retira (sin hueco) y no vuelve a «Guardando…».
    await act(async () => { vi.advanceTimersByTime(9000); });
    expect(router.refresh).toHaveBeenCalled();
    expect(rowsOf("real-b")).toBe(visible);
    expect(savingTexts().some((t) => t.includes("Fila B"))).toBe(false);
    await act(async () => { vi.advanceTimersByTime(8000); });
    expect(rowsOf("real-b"), "sigue esperando, no se retira por tiempo").toBe(visible);
    expect(router.refresh.mock.calls.length).toBe(2); // se sigue pidiendo la revalidación, dentro del tope
    // Llega la real: una sola por vista y se deja de pedir la revalidación.
    revalidate();
    expect(rowsOf("real-b")).toBe(visible);
    const calls = router.refresh.mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(60000); });
    expect(router.refresh.mock.calls.length).toBe(calls);
    expect(rowsOf("real-b")).toBe(visible);
  });

  it("una fila confirmada no deja hueco ni «Guardando…»: es un enlace a su detalle con el id real", async () => {
    setup(() => new Promise(() => {}), async () => ({ ok: true, value: saved("real-b", "Fila B") }));
    await waitFor(() => expect(rowsOf("real-b")).toBeGreaterThan(0));
    const link = document.querySelector<HTMLAnchorElement>("a[data-transaction-id='real-b']")!;
    expect(link.getAttribute("href")).toBe("/actividad/real-b?mes=2026-11");
    expect(link.textContent).not.toContain(copy.row.pending.saving);
  });
});

// Revisión previa a la ronda 4 de ChatGPT: la espera de una fila confirmada no puede pedir refrescos sin fin. Termina con lo primero
// de: (a) una vista trae el UUID real; (b) una revalidación completada no lo trae y la fila está fuera del alcance de las vistas
// montadas (otro mes); (c) tope de 3 refrescos, y entonces se retira la temporal (el servidor ya confirmó).
describe("La espera de una fila confirmada termina siempre (sin bucle de refrescos)", () => {
  const otherMonth = "2026-10-23";
  const submitOctober = () => setup(() => new Promise(() => {}), async () => ({ ok: true, value: saved("real-b", "Fila B", otherMonth) }), [], otherMonth);
  const goToOctober = () => act(() => { screen.getByRole("button", { name: "ir a octubre" }).click(); });

  it("(c) gasto confirmado de otro mes sin ninguna revalidación: como mucho 3 refrescos, y la temporal no se queda", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    submitOctober();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); }); // la acción responde y se confirma
    await act(async () => { vi.advanceTimersByTime(120000); });
    expect(router.refresh.mock.calls.length, "tope de refrescos").toBeLessThanOrEqual(3);
    expect(router.refresh.mock.calls.length).toBe(3);
    const calls = router.refresh.mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(120000); });
    expect(router.refresh.mock.calls.length, "ni uno más: nada periódico sin límite").toBe(calls);
    // La fila temporal no se quedó: al mirar octubre sin la real en la lista, no aparece.
    goToOctober();
    expect(rowsOf("real-b")).toBe(0);
    expect(savingRows(), "A (de noviembre) sigue colgada pero no es de octubre").toHaveLength(0);
  });

  it("(b) una revalidación completada que no la trae y la fila es de otro mes: se retira en seguida, sin pedir más refrescos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    submitOctober();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    revalidate(); // llega una revalidación (la lista de noviembre no trae el UUID de una fila de octubre)
    await act(async () => { vi.advanceTimersByTime(120000); });
    expect(router.refresh).not.toHaveBeenCalled();
    goToOctober();
    expect(rowsOf("real-b")).toBe(0);
  });

  it("(c) revalidación retenida de una fila del mes mostrado: tras el tope se retira y deja de pedir refrescos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup(() => new Promise(() => {}), async () => ({ ok: true, value: saved("real-b", "Fila B") }));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(rowsOf("real-b")).toBeGreaterThan(0);
    await act(async () => { vi.advanceTimersByTime(8000 * 3); });
    expect(router.refresh.mock.calls.length).toBe(3);
    expect(rowsOf("real-b"), "dentro del tope sigue visible").toBeGreaterThan(0);
    await act(async () => { vi.advanceTimersByTime(8000); });
    expect(rowsOf("real-b"), "alcanzado el tope se retira la temporal").toBe(0);
    await act(async () => { vi.advanceTimersByTime(120000); });
    expect(router.refresh.mock.calls.length, "después del tope deja de pedir refrescos").toBe(3);
  });

  it("(a) el UUID real llega a una vista montada: se retira sin pedir más refrescos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup(() => new Promise(() => {}), async () => ({ ok: true, value: saved("real-b", "Fila B") }), [real("real-b", "Fila B")]);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const visible = rowsOf("real-b");
    revalidate();
    expect(rowsOf("real-b")).toBe(visible);
    await act(async () => { vi.advanceTimersByTime(120000); });
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

describe("Límite conocido F51-11, aceptado por el gestor: la real llega antes que la respuesta", () => {
  it("con la respuesta de B retenida y la lista ya con B real, se ven la temporal y la real; al llegar la respuesta queda una sola", async () => {
    const held = deferred<ActionResult<SavedTransaction>>();
    setup(() => new Promise(() => {}), () => held.promise, [real("real-b", "Fila B")]);
    await waitFor(() => expect(savingTexts().some((t) => t.includes("Fila B"))).toBe(true));
    // Una navegación o revalidación independiente trae la real antes que la respuesta de la acción.
    revalidate();
    const realOnly = rowsOf("real-b");
    expect(realOnly).toBeGreaterThan(0);
    // Documenta el comportamiento actual: durante el intervalo se ven las dos (solo visual; la base no se duplica por idempotencia).
    expect(savingTexts().some((t) => t.includes("Fila B")), "la temporal sigue «Guardando…»").toBe(true);
    // Llega la respuesta: la temporal se esconde y se retira; queda una sola fila por vista, sin huérfanas.
    await act(async () => held.resolve({ ok: true, value: saved("real-b", "Fila B") }));
    await waitFor(() => expect(savingTexts().some((t) => t.includes("Fila B"))).toBe(false));
    expect(rowsOf("real-b")).toBe(realOnly);
    expect(savingRows().filter((el) => (el.textContent ?? "").includes("Fila B"))).toHaveLength(0);
  });
});
