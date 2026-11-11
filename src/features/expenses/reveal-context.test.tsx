// F69-6 (revisión del PR #69) — capa: componentes (Vitest + RTL). E5 cuando el gasto se guarda en un contexto distinto del de
// la página: la hoja tiene su propio selector Yo/Nosotros y guardar no cambia el contexto de la app. Si la página no puede
// enseñar el gasto (un privado anotado desde Inicio en Nosotros, o un compartido que la vista de Yo no pinta), E5 termina sin
// esperar los 10 s y sin navegar: queda el aviso «Gasto guardado · Deshacer». Si la página sí lo pinta en su contexto (Inicio
// en Yo con pareja enseña tu parte de lo compartido), se resalta ahí.
import { act, configure, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextProvider, useContextChoice } from "@/components/shell/context-selector";
import { AccountProvider } from "@/features/account/account-context";
import { ContextView } from "@/features/context/context-view";
import { copy } from "@/lib/copy/es";
import type { ContextChoice } from "@/lib/context-preference";
import { AnnotateProvider, useAnnotate, useListScope } from "./annotate-provider";
import { HighlightSharedPart } from "./highlight-row";
import type { ExpenseActions, SavedTransaction } from "./types";
import type { CoupleForSheet, SavedShared, SharedActions } from "./shared-types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const SARA = "11111111-1111-4111-8111-111111111111";
const TOMAS = "22222222-2222-4222-8222-222222222222";
const SHARED_ID = "9d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10";
const PRIVATE_ID = "7d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10";
const couple: CoupleForSheet = {
  members: [{ userId: SARA, name: "Sara", joinOrder: 1, isMe: true }, { userId: TOMAS, name: "Tomás", joinOrder: 2, isMe: false }],
  last: null,
};
const savedShared = (): SavedShared => ({
  id: SHARED_ID, categoryId: "market", transactionDate: "2026-11-05", description: null,
  amountMinor: "4500000", payerUserId: SARA, splitMode: "equal", splitPercents: null, parts: { [SARA]: "2250000", [TOMAS]: "2250000" },
  version: 1, createdBy: SARA, updatedBy: null, updatedAt: "2026-11-05T15:00:00.000Z", movedFromMe: false,
});
const savedPrivate = (): SavedTransaction => ({ id: PRIVATE_ID, type: "expense", categoryId: "market", transactionDate: "2026-11-05", description: null, amountMinor: "4500000", version: 1 });

const privateActions = (): ExpenseActions => ({
  create: vi.fn<ExpenseActions["create"]>(async () => ({ ok: true, value: savedPrivate() })),
  update: vi.fn<ExpenseActions["update"]>(async () => ({ status: "ok", value: savedPrivate() })),
  voidTransaction: vi.fn<ExpenseActions["voidTransaction"]>(async () => ({ status: "ok", value: { id: PRIVATE_ID, version: 2 } })),
});
const sharedActions = (): SharedActions => ({
  create: vi.fn<SharedActions["create"]>(async () => ({ status: "ok", value: savedShared() })),
  update: vi.fn<SharedActions["update"]>(async () => ({ status: "ok", value: savedShared() })),
  voidShared: vi.fn<SharedActions["voidShared"]>(async () => ({ status: "ok", value: { id: SHARED_ID, version: 2 } })),
  check: vi.fn<SharedActions["check"]>(async () => ({ state: "not_found" })),
});

/**
 * Una página con una lista del mes: `contexts`, de qué contextos pinta movimientos (como HomeScope y Actividad); `known`, los
 * ids que le entregó el servidor; `shown`, los que pinta (la parte compartida, con HighlightSharedPart, como Inicio en Yo).
 */
function Page({ contexts, known = [], shown = [] }: { contexts: ContextChoice[]; known?: string[]; shown?: string[] }) {
  const { openFrom } = useAnnotate();
  useListScope("2026-11", known, contexts);
  return (
    <>
      <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>
      {shown.map((id) => <HighlightSharedPart key={id} id={id} className="row">{id}</HighlightSharedPart>)}
    </>
  );
}

function setup(context: ContextChoice, contexts: ContextChoice[]) {
  const user = userEvent.setup();
  const priv = privateActions();
  const shared = sharedActions();
  const tree = (props: { known?: string[]; shown?: string[] }) => (
    <AnnotateProvider actions={priv} sharedActions={shared} couple={couple} context={context} today="2026-11-05">
      <Page contexts={contexts} {...props} />
    </AnnotateProvider>
  );
  const view = render(tree({}));
  const revalidate = (props: { known?: string[]; shown?: string[] }) => act(() => { view.rerender(tree(props)); });
  return { user, priv, shared, revalidate };
}

/** Anota $45.000 en Mercado en el contexto `to` de la hoja (su selector; el de la app no cambia). */
async function annotate(user: ReturnType<typeof userEvent.setup>, to: ContextChoice) {
  await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
  await screen.findByRole("dialog", { name: copy.annotate.title.expense });
  await user.click(screen.getByRole("radio", { name: to === "us" ? copy.context.us : copy.annotate.onlyYou }));
  await user.type(screen.getByRole("textbox", { name: copy.annotate.amount }), "45000");
  await user.click(screen.getByRole("radio", { name: copy.categories.market }));
}

/** Cuadros simulados: E5 mira en cada uno. */
function stubFrames() {
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const run = (count: number) => { for (let step = 0; step < count; step++) act(() => { frames.splice(0).forEach((callback) => callback(step * 16)); }); };
  return { frames, run };
}

afterEach(() => { vi.restoreAllMocks(); Object.values(router).forEach((fn) => fn.mockClear()); });

describe("E5 entre contextos (F69-6)", { timeout: 15000 }, () => {
  it("un compartido anotado desde una vista de Yo que no pinta lo compartido: termina al primer cuadro, sin esperar ni navegar", async () => {
    const { user, shared } = setup("me", ["me"]);
    await annotate(user, "us");
    const { frames, run } = stubFrames();
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await waitFor(() => expect(shared.create).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("button", { name: copy.annotate.undo })).toBeTruthy();
    expect(screen.getByText(copy.annotate.saved.expense)).toBeTruthy();
    run(1);
    // Ningún cuadro más pedido: E5 terminó; no espera el tope de 10 s ni lleva a Actividad de Yo, que tampoco lo enseña.
    expect(frames).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("el inverso: un privado anotado desde Inicio en Nosotros termina al primer cuadro, sin esperar ni navegar", async () => {
    const { user, priv } = setup("us", ["us"]);
    await annotate(user, "me");
    const { frames, run } = stubFrames();
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await waitFor(() => expect(priv.create).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("button", { name: copy.annotate.undo })).toBeTruthy();
    run(1);
    expect(frames).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
    // Aunque luego llegue el árbol de Nosotros (sin el privado), nada navega.
    run(3);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("Inicio en Yo con pareja pinta tu parte de lo compartido: espera esa lista y resalta ahí el compartido recién anotado", async () => {
    const { user, shared, revalidate } = setup("me", ["me", "us"]);
    await annotate(user, "us");
    const { frames, run } = stubFrames();
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await waitFor(() => expect(shared.create).toHaveBeenCalledTimes(1));
    await screen.findByRole("button", { name: copy.annotate.undo });
    // La lista puede enseñarlo y todavía no lo trae: se espera (sin llegar al tope).
    run(20);
    expect(frames.length).toBeGreaterThan(0);
    expect(router.push).not.toHaveBeenCalled();
    revalidate({ known: [SHARED_ID], shown: [SHARED_ID] });
    run(3);
    expect(frames).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
    const row = document.querySelector(`[data-transaction-id="${SHARED_ID}"]`);
    expect(row?.hasAttribute("data-new")).toBe(true);
  });

  it("Inicio en Yo con pareja que trae el compartido fuera de los 5 recientes: termina tras unos cuadros sin navegar a Actividad de Yo", async () => {
    const { user, shared, revalidate } = setup("me", ["me", "us"]);
    await annotate(user, "us");
    const { frames, run } = stubFrames();
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await waitFor(() => expect(shared.create).toHaveBeenCalledTimes(1));
    await screen.findByRole("button", { name: copy.annotate.undo });
    revalidate({ known: ["otro", SHARED_ID], shown: ["otro"] });
    run(5);
    expect(frames).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
  });
});

// F69-7 (revisión del PR #69): durante Nosotros → Yo, Inicio enseña el Skeleton de Yo hasta que llega el RSC. Un privado
// confirmado en ese momento no tiene todavía la lista de Yo montada; el Skeleton cuenta como lista de Yo en carga (ContextView
// con `listMonth`), así que E5 espera en lugar de llevar a Actividad, y resalta la fila cuando llega Inicio de Yo.
function SwitchToMe() {
  const { choose } = useContextChoice();
  return <button type="button" onClick={() => choose("me")}>a Yo</button>;
}
function HomeYo({ ids }: { ids: string[] }) {
  const { highlightId } = useAnnotate();
  useListScope("2026-11", ids, ["me", "us"]);
  return <>{ids.map((id) => <a key={id} href={`/actividad/${id}`} data-transaction-id={id} data-new={highlightId === id ? "" : undefined}>{id}</a>)}</>;
}
function HomeUs() {
  const { openFrom } = useAnnotate();
  useListScope("2026-11", [], ["us"]);
  return <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>;
}
function TriggerOutside() {
  const { openFrom } = useAnnotate();
  return <button type="button" onClick={(event) => openFrom(event.currentTarget)}>Anotar desde la barra</button>;
}

describe("E5 durante el cambio de contexto (F69-7)", { timeout: 15000 }, () => {
  it("Inicio en Skeleton durante Nosotros → Yo: un privado confirmado antes del RSC no navega; al montar Inicio de Yo con el id, se resalta", async () => {
    window.localStorage.setItem("juntia:context", "us");
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    const user = userEvent.setup();
    const priv = privateActions();
    const tree = (server: ContextChoice, ids: string[] = []) => (
      <AccountProvider displayName="Sara" theme="light" couple="active">
        <ContextProvider>
          <AnnotateProvider actions={priv} sharedActions={sharedActions()} couple={couple} today="2026-11-05">
            <SwitchToMe />
            <TriggerOutside />
            <ContextView server={server} listMonth="2026-11" pending={<div data-testid="esqueleto-yo" />} me={server === "me" ? <HomeYo ids={ids} /> : null} us={server === "us" ? <HomeUs /> : undefined} />
          </AnnotateProvider>
        </ContextProvider>
      </AccountProvider>
    );
    const view = render(tree("us"));
    await user.click(screen.getByRole("button", { name: "a Yo" }));
    // 1. Inicio enseña el Skeleton de Yo: el RSC de Yo no ha llegado.
    expect(screen.getByTestId("esqueleto-yo")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Anotar desde la barra" }));
    await screen.findByRole("dialog", { name: copy.annotate.title.expense });
    await user.type(screen.getByRole("textbox", { name: copy.annotate.amount }), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    const { frames, run } = stubFrames();
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await waitFor(() => expect(priv.create).toHaveBeenCalledTimes(1));
    await screen.findByRole("button", { name: copy.annotate.undo });
    // 2. Confirmado antes del RSC: la lista de Yo está en carga; E5 espera y no navega.
    run(40);
    expect(router.push).not.toHaveBeenCalled();
    expect(frames.length).toBeGreaterThan(0);
    expect(screen.getByTestId("esqueleto-yo")).toBeTruthy();
    // 3. Llega Inicio de Yo con el id: se resalta la fila, sin navegar.
    act(() => { view.rerender(tree("me", [PRIVATE_ID])); });
    run(3);
    expect(frames).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
    expect(document.querySelector(`[data-transaction-id="${PRIVATE_ID}"]`)?.hasAttribute("data-new")).toBe(true);
    window.localStorage.clear();
  });

  it("sin `listMonth` (una página sin lista, como Metas o Plan), el mismo privado durante el Skeleton sale a Actividad enseguida", async () => {
    window.localStorage.setItem("juntia:context", "us");
    const user = userEvent.setup();
    const priv = privateActions();
    render(
      <AccountProvider displayName="Sara" theme="light" couple="active">
        <ContextProvider>
          <AnnotateProvider actions={priv} sharedActions={sharedActions()} couple={couple} today="2026-11-05">
            <SwitchToMe />
            <TriggerOutside />
            <ContextView server="us" pending={<div data-testid="esqueleto-yo" />} me={null} us={<p>Metas de Nosotros</p>} />
          </AnnotateProvider>
        </ContextProvider>
      </AccountProvider>,
    );
    await user.click(screen.getByRole("button", { name: "a Yo" }));
    await user.click(screen.getByRole("button", { name: "Anotar desde la barra" }));
    await screen.findByRole("dialog", { name: copy.annotate.title.expense });
    await user.type(screen.getByRole("textbox", { name: copy.annotate.amount }), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    const { run } = stubFrames();
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await screen.findByRole("button", { name: copy.annotate.undo });
    run(1);
    expect(router.push).toHaveBeenCalledWith("/actividad?mes=2026-11");
    window.localStorage.clear();
  });
});
