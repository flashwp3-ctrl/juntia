// 005 · PR B, corrección 3 (FR-052; maestro §15.7, INP < 200 ms al abrir y al guardar Anotar). Capa: componentes.
// Laboratorio del run 44349192421: abrir Anotar a 1440 pasó de 200 ms (248 y 256 ms) salvo la primera vez, y guardar crecía con
// cada movimiento añadido (de 40 a 256 ms). Causa: `useHighlightId` leía el contexto entero de Anotar, así que cada fila de Inicio
// y la lista de Actividad se volvían a pintar en cada apertura y cada cierre de la hoja, y su coste crecía con las filas.
// Criterio: una fila que solo necesita saber si es la recién guardada (E5) no se vuelve a pintar al abrir o cerrar la hoja;
// sí cuando cambia el resaltado.
import { act, configure, render, screen, waitFor } from "@testing-library/react";
import { Profiler } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate, useHighlightId } from "./annotate-provider";
import type { ExpenseActions, SavedTransaction } from "./types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const saved: SavedTransaction = {
  id: "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", type: "expense", categoryId: "market", transactionDate: "2026-11-05",
  description: null, amountMinor: "4500000", version: 1,
};
const actions: ExpenseActions = {
  create: vi.fn(async () => ({ ok: true as const, value: saved })),
  update: vi.fn(async () => ({ status: "ok" as const, value: { ...saved, version: 2 } })),
  voidTransaction: vi.fn(async () => ({ status: "ok" as const, value: { id: saved.id, version: 2 } })),
};

const renders = { row: 0 };
const countRow = () => { renders.row++; };
function Row({ id }: { id: string }) {
  return <span data-testid="row" data-new={useHighlightId() === id ? "" : undefined}>{id}</span>;
}
function Trigger() {
  const { openFrom } = useAnnotate();
  return <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>;
}

describe("el resaltado de E5 en su propio contexto (corrección 3 del PR B)", () => {
  it("abrir y cerrar la hoja no vuelve a pintar las filas; guardar sí, para resaltar la nueva", async () => {
    const user = userEvent.setup();
    render(<AnnotateProvider actions={actions} today="2026-11-05" context="me"><Trigger /><Profiler id="row" onRender={countRow}><Row id={saved.id} /></Profiler></AnnotateProvider>);
    const before = renders.row;
    await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
    await screen.findByRole("dialog", { name: copy.annotate.title.expense });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(renders.row).toBe(before);

    await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
    await user.keyboard("45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await act(async () => { await user.click(screen.getByRole("button", { name: /^Guardar/ })); });
    await waitFor(() => expect(screen.getByTestId("row").dataset.new).toBe(""));
  }, 20_000);
});
