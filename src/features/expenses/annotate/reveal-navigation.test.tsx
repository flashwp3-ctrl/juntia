// E5 y la navegación de la persona — capa: componentes (Vitest + RTL, cuadros controlados). Caso abierto de la refactorización
// del proveedor (aprobada el 10 nov 2026): si la persona va a otra ruta mientras E5 espera, E5 no la lleva a Actividad al
// terminar. Se respeta su navegación; el aviso «Gasto guardado · Deshacer» y el resaltado siguen en el proveedor.
import { act, configure, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate, useListScope } from "../annotate-provider";
import type { ActionResult, ExpenseActions, SavedTransaction } from "../types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const saved = (): SavedTransaction => ({ id: "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", type: "expense", categoryId: "market", transactionDate: "2026-11-05", description: null, amountMinor: "4500000", version: 1 });

function Home({ list }: { list: boolean }) {
  const { openFrom } = useAnnotate();
  return (
    <>
      <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>
      {list ? <HomeList /> : null}
    </>
  );
}
function HomeList() {
  useListScope("2026-11", [], ["me"]);
  return null;
}

function setup(create: ExpenseActions["create"], list = true) {
  const actions: ExpenseActions = { create: vi.fn(create), update: vi.fn(), voidTransaction: vi.fn() };
  render(<AnnotateProvider actions={actions} context="me" today="2026-11-05"><Home list={list} /></AnnotateProvider>);
  return { user: userEvent.setup(), actions };
}

async function annotate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
  await screen.findByRole("dialog", { name: copy.annotate.title.expense });
  await user.type(screen.getByRole("textbox", { name: copy.annotate.amount }), "45000");
  await user.click(screen.getByRole("radio", { name: copy.categories.market }));
}

function controlTime() {
  const frames: FrameRequestCallback[] = [];
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const at = (ms: number) => { now = ms; act(() => { frames.splice(0).forEach((callback) => callback(ms)); }); };
  return { frames, at };
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.values(router).forEach((fn) => fn.mockClear());
  window.history.replaceState({}, "", "/");
});

describe("E5 respeta la navegación de la persona", { timeout: 15000 }, () => {
  it("si va a otra ruta mientras E5 espera la lista, al tope de 10 s no la lleva a Actividad", async () => {
    const { user, actions } = setup(async () => ({ ok: true, value: saved() }));
    await annotate(user);
    const { frames, at } = controlTime();
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    await screen.findByRole("button", { name: copy.annotate.undo });
    // Inicio monta noviembre y todavía no trae el id: E5 espera.
    at(2000);
    expect(frames.length).toBeGreaterThan(0);
    // La persona se va a Metas antes de que llegue el árbol con la fila.
    window.history.pushState({}, "", "/metas");
    at(10_100);
    expect(frames).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
    // El aviso sigue.
    expect(screen.getByText(copy.annotate.saved.expense)).toBeTruthy();
  });

  it("si navega con la hoja ya oculta, antes de que responda el servidor, la confirmación no la lleva a Actividad", async () => {
    let answer!: (result: ActionResult<SavedTransaction>) => void;
    const { user } = setup(() => new Promise((resolve) => { answer = resolve; }), false);
    await annotate(user);
    const { frames, at } = controlTime();
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    // La hoja se oculta mientras viaja; la persona va a Plan.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    window.history.pushState({}, "", "/plan");
    await act(async () => { answer({ ok: true, value: saved() }); });
    await screen.findByRole("button", { name: copy.annotate.undo });
    at(16);
    expect(frames).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("contraste: en la misma ruta y sin lista, la confirmación sí lleva a Actividad del mes", async () => {
    const { user } = setup(async () => ({ ok: true, value: saved() }), false);
    await annotate(user);
    const { at } = controlTime();
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await screen.findByRole("button", { name: copy.annotate.undo });
    at(16);
    expect(router.push).toHaveBeenCalledWith("/actividad?mes=2026-11");
  });
});
