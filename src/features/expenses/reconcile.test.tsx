// F51-1 (revisión de ChatGPT del PR #51) — capa: componentes (Vitest + RTL). Criterio literal: «Persiste cada intención en estado
// «Sin confirmar» (clave de idempotencia, payload y savedAt) en localStorage, para que sobreviva a una recarga […]. Reconcilia
// con el servidor reenviando LA MISMA intención con la misma clave. create_transaction es idempotente: devuelve el resultado
// original con el id real, sin crear otro. Hazlo de forma automática cuando haya conexión (evento online, al navegar o al
// revalidar). Con el id real, la fila temporal desaparece y queda solo la real. Si el servidor rechaza, se retira la fila y se
// avisa. Tras recargar, las intenciones persistidas se reanudan igual. Nunca se genera una clave nueva para la misma intención.
// No reconcilies comparando importe, fecha y categoría».
import { act, configure, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { moneyFromPesos } from "@/domain/money";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate, usePendingRows } from "./annotate-provider";
import type { ActionResult, CreatePayload, ExpenseActions, SavedTransaction } from "./types";
import { addIntention, readIntentions, rowFromPayload, unconfirmedStorageKey, UNCONFIRMED_TTL_MS } from "./unconfirmed";

// Con la suite en paralelo, el segundo por defecto de las esperas se queda corto.
configure({ asyncUtilTimeout: 5000 });

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current, useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }));

const KEY = "11111111-1111-4111-8111-111111111111";
// Ids de usuario de Auth (la clave de almacenamiento nunca lleva el correo).
const SARA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TOMAS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const STORAGE = unconfirmedStorageKey(SARA);
const payload = (overrides: Partial<CreatePayload> = {}): CreatePayload => ({
  idempotencyKey: KEY, type: "expense", amountPesos: "47350", categoryId: "market", transactionDate: "2026-11-05", description: "Pan", ...overrides,
});
const saved = (overrides: Partial<SavedTransaction> = {}): SavedTransaction => ({
  id: "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", type: "expense", categoryId: "market", transactionDate: "2026-11-05", description: "Pan", amountMinor: "4735000", version: 1, ...overrides,
});
const ok = (): ActionResult<SavedTransaction> => ({ ok: true, value: saved() });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }

function actionsWith(create: ExpenseActions["create"]) {
  return { create: vi.fn(create), update: vi.fn(), voidTransaction: vi.fn() } satisfies ExpenseActions;
}

/** Lanza la creación como lo hace la hoja al guardar: por `track`, con la intención y su petición. */
function Submit({ intent, run }: { intent: CreatePayload; run: () => Promise<ActionResult<SavedTransaction>> }) {
  const { track } = useAnnotate();
  useEffect(() => { void track(rowFromPayload(intent, "saving"), run); }, [intent, run, track]);
  return null;
}
function List() {
  return <ul>{usePendingRows().map((row) => <li key={row.key} data-testid="pending-row" data-state={row.state} data-key={row.key} />)}</ul>;
}
/** Un padre que cambia de ruta como lo hace el layout de Next: el proveedor vuelve a pintarse con otro `usePathname`. */
function Harness({ actions, children, userId = SARA }: { actions: ExpenseActions; children?: ReactNode; userId?: string }) {
  const [, setTick] = useState(0);
  return (
    <>
      <button type="button" onClick={() => { pathname.current = "/actividad"; setTick((n) => n + 1); }}>ir</button>
      <AnnotateProvider actions={actions} userId={userId} today="2026-11-05"><List />{children}</AnnotateProvider>
    </>
  );
}
const rows = () => screen.queryAllByTestId("pending-row");
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE) ?? "[]") as { key: string; payload: CreatePayload; savedAt: number }[];
const navigate = async () => { await act(async () => { screen.getByRole("button", { name: "ir" }).click(); }); };

beforeEach(() => { window.localStorage.clear(); pathname.current = "/"; });
afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks(); });

describe("Reconciliación por intención (F51-1)", () => {
  it("escritura confirmada con la respuesta perdida: al navegar se reenvía la misma intención y queda una sola fila", async () => {
    const intent = payload();
    const actions = actionsWith(async () => ok());
    const lost = vi.fn(async () => ({ ok: false, error: "network" }) as ActionResult<SavedTransaction>);
    render(<Harness actions={actions}><Submit intent={intent} run={lost} /></Harness>);
    await waitFor(() => expect(rows().map((r) => r.getAttribute("data-state"))).toEqual(["unknown"]));
    expect(actions.create).not.toHaveBeenCalled();
    // El servidor sí escribió y la respuesta se perdió. Al navegar, el proveedor reenvía lo mismo, con la misma clave.
    await navigate();
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    expect(actions.create.mock.calls[0][0]).toEqual(intent);
    // Con el id real (la respuesta idempotente), la fila temporal desaparece y no queda nada guardado ni fantasma.
    await waitFor(() => expect(rows()).toHaveLength(0));
    expect(stored()).toEqual([]);
    expect(await screen.findByText(copy.annotate.saved.expense)).toBeTruthy();
    // Revalidar o navegar otra vez no reenvía nada.
    await navigate();
    await act(async () => {});
    expect(actions.create).toHaveBeenCalledTimes(1);
  });

  it("el evento online reanuda las intenciones sin confirmar con la misma clave", async () => {
    const actions = actionsWith(async () => ok());
    render(<Harness actions={actions}><Submit intent={payload()} run={async () => ({ ok: false, error: "saveFailed" })} /></Harness>);
    await waitFor(() => expect(rows().map((r) => r.getAttribute("data-state"))).toEqual(["unknown"]));
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    expect(actions.create.mock.calls[0][0].idempotencyKey).toBe(KEY);
    await waitFor(() => expect(rows()).toHaveLength(0));
  });

  it("sin conexión (navigator.onLine = false) no reenvía; vuelve el evento online y sí", async () => {
    const actions = actionsWith(async () => ok());
    render(<Harness actions={actions}><Submit intent={payload()} run={async () => ({ ok: false, error: "network" })} /></Harness>);
    await waitFor(() => expect(rows().map((r) => r.getAttribute("data-state"))).toEqual(["unknown"]));
    const online = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    await navigate();
    await act(async () => {});
    expect(actions.create, "sin conexión, navegar no reenvía").not.toHaveBeenCalled();
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1)); // el evento online manda aunque onLine aún diga false
    online.mockRestore();
  });

  it("la intención se persiste al enviar (clave, payload y savedAt) y se borra al confirmarse", async () => {
    const gate = deferred<ActionResult<SavedTransaction>>();
    const before = Date.now();
    render(<Harness actions={actionsWith(async () => ok())}><Submit intent={payload()} run={() => gate.promise} /></Harness>);
    await waitFor(() => expect(stored()).toHaveLength(1));
    expect(stored()[0]).toMatchObject({ key: KEY, payload: payload() });
    expect(stored()[0].savedAt).toBeGreaterThanOrEqual(before);
    await act(async () => gate.resolve(ok()));
    await waitFor(() => expect(stored()).toEqual([]));
  });

  it("un resultado desconocido conserva la intención guardada; un rechazo la borra", async () => {
    const unknown = render(<Harness actions={actionsWith(async () => ok())}><Submit intent={payload()} run={async () => ({ ok: false, error: "unexpected" })} /></Harness>);
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(stored().map((s) => s.key)).toEqual([KEY]);
    unknown.unmount();
    window.localStorage.clear();
    render(<Harness actions={actionsWith(async () => ok())}><Submit intent={payload()} run={async () => ({ ok: false, error: "sessionExpired" })} /></Harness>);
    await waitFor(() => expect(stored()).toEqual([]));
    expect(rows()).toHaveLength(0);
  });

  it("recarga con la intención persistida: se reanuda con la misma clave, sin duplicado ni clave nueva", async () => {
    addIntention(SARA, payload());
    const gate = deferred<ActionResult<SavedTransaction>>();
    const actions = actionsWith(() => gate.promise);
    render(<Harness actions={actions} />);
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    expect(actions.create.mock.calls[0][0]).toEqual(payload());
    // Mientras responde, una sola fila y «Guardando…».
    await waitFor(() => expect(rows().map((r) => r.getAttribute("data-state"))).toEqual(["saving"]));
    await act(async () => gate.resolve(ok()));
    await waitFor(() => expect(rows()).toHaveLength(0));
    expect(stored()).toEqual([]);
    expect(actions.create).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(copy.annotate.saved.expense)).toBeTruthy();
  });

  it("recarga con la red todavía caída: la fila vuelve «Sin confirmar» y la intención sigue guardada", async () => {
    addIntention(SARA, payload());
    const actions = actionsWith(async () => ({ ok: false, error: "network" }));
    render(<Harness actions={actions} />);
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(rows().map((r) => r.getAttribute("data-state"))).toEqual(["unknown"]));
    expect(stored().map((s) => s.key)).toEqual([KEY]);
  });

  it("caducidad: lo guardado hace más de 24 h se suelta sin reenviarlo", async () => {
    const old = Date.now() - UNCONFIRMED_TTL_MS - 1000;
    window.localStorage.setItem(STORAGE, JSON.stringify([{ key: KEY, payload: payload(), savedAt: old }]));
    const actions = actionsWith(async () => ok());
    render(<Harness actions={actions} />);
    await act(async () => {});
    expect(actions.create).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(0);
    expect(readIntentions(SARA)).toEqual([]);
    expect(window.localStorage.getItem(STORAGE)).toBeNull();
  });

  it("lo malformado en el almacenamiento se ignora", async () => {
    window.localStorage.setItem(STORAGE, JSON.stringify([{ key: KEY, payload: { ...payload(), amountPesos: "abc" }, savedAt: Date.now() }, "basura", null]));
    const actions = actionsWith(async () => ok());
    render(<Harness actions={actions} />);
    await act(async () => {});
    expect(actions.create).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(0);
  });

  it("si el servidor rechaza al reconciliar, la fila se retira y se avisa", async () => {
    addIntention(SARA, payload());
    const actions = actionsWith(async () => ({ ok: false, error: "sessionExpired" }));
    render(<Harness actions={actions} />);
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(rows()).toHaveLength(0));
    expect(stored()).toEqual([]);
    expect(await screen.findByText(copy.errors.sessionExpired)).toBeTruthy();
  });

  it("no concilia por contenido: dos gastos iguales con claves distintas se reenvían cada uno con la suya", async () => {
    const other = "22222222-2222-4222-8222-222222222222";
    addIntention(SARA, payload());
    addIntention(SARA, payload({ idempotencyKey: other }));
    const actions = actionsWith(async (p) => ({ ok: true, value: saved({ id: p.idempotencyKey }) }));
    render(<Harness actions={actions} />);
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(2));
    expect(actions.create.mock.calls.map(([p]) => p.idempotencyKey).sort()).toEqual([KEY, other].sort());
    await waitFor(() => expect(rows()).toHaveLength(0));
  });

  // ---- Ligado al usuario (revisión previa a la segunda ronda)
  it("la clave de almacenamiento lleva el id del usuario, no su correo", () => {
    addIntention(SARA, payload());
    expect(window.localStorage.getItem(`juntia:unconfirmed-writes:${SARA}`)).toBeTruthy();
    expect(Object.keys(window.localStorage).every((key) => !key.includes("@"))).toBe(true);
    expect(readIntentions(TOMAS)).toEqual([]);
  });

  it("una intención de Sara con la sesión de Tomás no se reenvía y queda sin tocar (elegido: no se lee, no se envía, no se borra)", async () => {
    addIntention(SARA, payload());
    const before = window.localStorage.getItem(unconfirmedStorageKey(SARA));
    const actions = actionsWith(async () => ok());
    render(<Harness actions={actions} userId={TOMAS} />);
    await act(async () => {});
    await navigate();
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(actions.create).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(0);
    expect(window.localStorage.getItem(unconfirmedStorageKey(SARA))).toBe(before);
    expect(window.localStorage.getItem(unconfirmedStorageKey(TOMAS))).toBeNull();
  });

  it("lo que Tomás envía se guarda bajo su id y no se mezcla con lo de Sara", async () => {
    addIntention(SARA, payload());
    const other = "33333333-3333-4333-8333-333333333333";
    const gate = deferred<ActionResult<SavedTransaction>>();
    render(<Harness actions={actionsWith(async () => ok())} userId={TOMAS}><Submit intent={payload({ idempotencyKey: other })} run={() => gate.promise} /></Harness>);
    await waitFor(() => expect(readIntentions(TOMAS).map((i) => i.key)).toEqual([other]));
    expect(readIntentions(SARA).map((i) => i.key)).toEqual([KEY]);
    await act(async () => gate.resolve(ok()));
    await waitFor(() => expect(readIntentions(TOMAS)).toEqual([]));
    expect(readIntentions(SARA).map((i) => i.key)).toEqual([KEY]);
  });

  // ---- Error de autorización: sin bucle y sin dejar nada
  it("sessionExpired al reconciliar: se descarta, no se reintenta en bucle y se borra lo demás del usuario", async () => {
    addIntention(SARA, payload());
    addIntention(SARA, payload({ idempotencyKey: "22222222-2222-4222-8222-222222222222" }));
    const actions = actionsWith(async () => ({ ok: false, error: "sessionExpired" }));
    render(<Harness actions={actions} />);
    await waitFor(() => expect(rows()).toHaveLength(0));
    expect(await screen.findByText(copy.errors.sessionExpired)).toBeTruthy();
    expect(window.localStorage.getItem(STORAGE)).toBeNull();
    const calls = actions.create.mock.calls.length;
    expect(calls).toBeLessThanOrEqual(2); // una por intención, en el arranque
    await navigate();
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await act(async () => {});
    expect(actions.create).toHaveBeenCalledTimes(calls);
  });

  it("sessionExpired al enviar desde la hoja: borra también las otras intenciones del usuario y sus filas (la sesión ya no vale)", async () => {
    const other = "22222222-2222-4222-8222-222222222222";
    addIntention(SARA, payload({ idempotencyKey: other }));
    // Sin conexión al arrancar, la otra intención se carga como «Sin confirmar» pero no se envía.
    const online = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    const actions = actionsWith(async () => ok());
    render(<Harness actions={actions}><Submit intent={payload()} run={async () => ({ ok: false, error: "sessionExpired" })} /></Harness>);
    await waitFor(() => expect(window.localStorage.getItem(STORAGE)).toBeNull());
    await waitFor(() => expect(rows()).toHaveLength(0));
    expect(actions.create).not.toHaveBeenCalled();
    online.mockRestore();
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await act(async () => {});
    expect(actions.create, "ni siquiera al volver la conexión").not.toHaveBeenCalled();
  });

  it("el importe persistido es el de la intención (sin recalcular): 47.350 pesos → 4735000 unidades menores", () => {
    expect(rowFromPayload(payload(), "unknown").transaction.amount).toEqual(moneyFromPesos(47350n));
  });
});
