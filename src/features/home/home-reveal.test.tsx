// F51-13 (cuarta ronda de ChatGPT, PR #51) — capa: componentes (Vitest + RTL). Criterio literal: «Inicio informa al proveedor de
// todos los ids del mes, pero solo pinta los 5 recientes. Además, el efecto de revelado toma la fila temporal confirmada (que ya
// lleva el UUID real) como prueba de que la fila está visible. Resultado: un gasto guardado con fecha anterior a los 5 recientes
// desaparece de Inicio y no se navega a Actividad». Regresión: Inicio con 5 movimientos posteriores; guardar uno con fecha
// anterior; confirmar; revalidar. Se navega a Actividad, donde hay una sola fila real, y los totales salen del servidor.
import { act, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ContextProvider } from "@/components/shell/context-selector";
import { formatMoney, moneyFromPesos } from "@/domain/money";
import { monthSummary, type Transaction } from "@/domain/transactions";
import { ActivityView } from "@/features/activity/activity-view";
import { AnnotateProvider } from "@/features/expenses/annotate-provider";
import type { ExpenseActions, SavedTransaction } from "@/features/expenses/types";
import { copy } from "@/lib/copy/es";
import { HomeView } from "./home-view";

configure({ asyncUtilTimeout: 8000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const NOW = "2026-11-14T15:00:00.000Z";
const tx = (id: string, date: string, pesos: bigint, description: string): Transaction => ({
  id, type: "expense", amount: moneyFromPesos(pesos), categoryId: "market", transactionDate: date, description, status: "active", version: 1, createdAt: NOW, updatedAt: NOW,
});
// Cinco movimientos posteriores (los 5 recientes de Inicio).
const FIVE = [10, 11, 12, 13, 14].map((day) => tx(`late-${day}`, `2026-11-${day}`, BigInt(day) * 1000n, `Reciente ${day}`));
const OLDER = tx("real-old", "2026-11-02", 47350n, "Anterior a los cinco");
const SIX = [...FIVE, OLDER];
const savedOlder: SavedTransaction = { id: OLDER.id, type: "expense", categoryId: "market", transactionDate: OLDER.transactionDate, description: OLDER.description, amountMinor: "4735000", version: 1 };

function App({ actions }: { actions: ExpenseActions }) {
  const [rows, setRows] = useState<readonly Transaction[]>(FIVE);
  const [page, setPage] = useState<"home" | "actividad">("home");
  router.push.mockImplementation(() => { setPage("actividad"); });
  return (
    <ContextProvider>
      <AnnotateProvider actions={actions} today="2026-11-14">
        <button type="button" onClick={() => setRows(SIX)}>revalidar</button>
        {page === "home"
          ? <HomeView rows={rows} month="2026-11" today="2026-11-14" />
          : <ActivityView rows={rows} month="2026-11" today="2026-11-14" navigation={{ previous: null, next: null }} />}
      </AnnotateProvider>
    </ContextProvider>
  );
}
const hero = () => document.querySelector("[data-counting-amount]")?.getAttribute("data-counting-amount");
const total = (rows: readonly Transaction[]) => formatMoney(monthSummary(rows, "2026-11").expenseTotal);

describe("Un gasto anterior a los 5 recientes de Inicio (F51-13)", { timeout: 20000 }, () => {
  it("se navega a Actividad, hay una sola fila real y los totales salen del servidor", async () => {
    router.push.mockClear();
    const create = vi.fn<ExpenseActions["create"]>(async () => ({ ok: true, value: savedOlder }));
    const user = userEvent.setup();
    render(<App actions={{ create, update: vi.fn(), voidTransaction: vi.fn() }} />);
    expect(hero()).toBe(total(FIVE));

    // Guardar uno con fecha anterior a los cinco recientes.
    await user.click(screen.getAllByRole("button", { name: new RegExp(copy.nav.annotateBlock) })[0]);
    const dialog = await screen.findByRole("dialog", { name: copy.annotate.title.expense });
    await user.type(await screen.findByRole("textbox", { name: copy.annotate.amount }), "47350");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    fireEvent.change(dialog.querySelector<HTMLInputElement>("input[type='date']")!, { target: { value: "2026-11-02" } });
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    await screen.findByText(copy.annotate.saved.expense);

    // Confirmada y SIN revalidar todavía: el total sigue siendo el del servidor (la temporal no suma) y la temporal, que ya lleva el
    // UUID real, no cuenta como «visible»; E5 espera el árbol revalidado (revisión del PR #69), así que todavía no navega.
    expect(hero()).toBe(total(FIVE));
    expect(router.push).not.toHaveBeenCalled();

    // Llega la revalidación: Inicio solo pinta los 5 recientes, la real no se ve ahí y E5 lleva a Actividad del mes, donde hay una
    // sola fila real por vista (lista por día y tabla), ninguna temporal ni duplicada, y los totales salen del servidor.
    act(() => { screen.getByRole("button", { name: "revalidar" }).click(); });
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/actividad?mes=2026-11"));
    expect((await screen.findByRole("region", { name: copy.activity.spentIn("noviembre") })).textContent).toContain(total(SIX));
    expect(document.querySelectorAll("[data-temp]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-transaction-id='real-old']")).toHaveLength(2);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("la fila temporal confirmada no es una fila real: lleva data-temp y el revelado la ignora", async () => {
    const create = vi.fn<ExpenseActions["create"]>(async () => ({ ok: true, value: savedOlder }));
    const user = userEvent.setup();
    render(<App actions={{ create, update: vi.fn(), voidTransaction: vi.fn() }} />);
    await user.click(screen.getAllByRole("button", { name: new RegExp(copy.nav.annotateBlock) })[0]);
    const dialog = await screen.findByRole("dialog", { name: copy.annotate.title.expense });
    await user.type(await screen.findByRole("textbox", { name: copy.annotate.amount }), "47350");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    fireEvent.change(dialog.querySelector<HTMLInputElement>("input[type='date']")!, { target: { value: "2026-11-14" } });
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await waitFor(() => expect(document.querySelector("a[data-transaction-id='real-old'][data-temp]")).toBeTruthy());
  });
});
