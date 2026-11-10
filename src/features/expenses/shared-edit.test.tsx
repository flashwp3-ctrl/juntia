// T042 (spec 003, PR C) / FR-022, FR-057, FR-059–FR-062; US-7 — capa: componentes (Vitest + RTL).
// Criterio literal (tasks.md, T042): «edición compartida con el aviso y los campos de Q12; conflicto de versión con
// avisos neutrales de conflicto y de gasto ya eliminado (F69-2: sin atribuir el cambio a nadie); `ok`/`rejected`/`unknown` (con `unknown` nunca se afirma
// que no se escribió; «Comprobar estado» con `completed` y con `not_found`); el aviso con «Deshacer» y el resaltado
// sobreviven a la navegación, y una respuesta tardía no pisa otro aviso; la hoja guarda su contexto aunque cambie el
// selector (FR-062)». La clasificación de los errores en el servidor está en write-result.test.tsx.
import { configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { AnnotateProvider, useAnnotate, useHighlightId } from "./annotate-provider";
import type { ExpenseActions } from "./types";
import type { CoupleForSheet, SavedShared, SharedActions } from "./shared-types";

configure({ asyncUtilTimeout: 5000 });
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/actividad" }));

const SARA = "11111111-1111-4111-8111-111111111111";
const TOMAS = "22222222-2222-4222-8222-222222222222";
const couple: CoupleForSheet = { members: [{ userId: SARA, name: "Sara", joinOrder: 1, isMe: true }, { userId: TOMAS, name: "Tomás", joinOrder: 2, isMe: false }], last: null };
const expense = (overrides: Partial<SavedShared> = {}): SavedShared => ({
  id: "9d1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", categoryId: "restaurants", transactionDate: "2026-10-18", description: "Cena",
  amountMinor: "24000000", payerUserId: SARA, splitMode: "equal", splitPercents: null, parts: { [SARA]: "12000000", [TOMAS]: "12000000" },
  version: 3, createdBy: SARA, updatedBy: null, updatedAt: "2026-10-18T15:00:00.000Z", movedFromMe: false, ...overrides,
});
const noPrivate: ExpenseActions = { create: vi.fn(), update: vi.fn(), voidTransaction: vi.fn() };
function sharedActions(overrides: Partial<SharedActions> = {}): SharedActions {
  return {
    create: vi.fn(async () => ({ status: "ok" as const, value: expense({ id: "aa1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", version: 1, transactionDate: "2026-11-05" }) })),
    update: vi.fn(async () => ({ status: "ok" as const, value: expense({ version: 4 }) })),
    voidShared: vi.fn(async () => ({ status: "ok" as const, value: { id: expense().id, version: 4 } })),
    check: vi.fn(async () => ({ state: "not_found" as const })),
    ...overrides,
  };
}

function Page({ onReload }: { onReload: () => void }) {
  const { openEditShared, openFrom } = useAnnotate();
  const highlight = useHighlightId();
  const [page, setPage] = useState("actividad");
  return (
    <>
      <p data-testid="page">{page}</p>
      <span data-testid="highlight">{highlight ?? ""}</span>
      <button type="button" onClick={(event) => openEditShared(expense(), event.currentTarget, onReload)}>{copy.detail.edit}</button>
      <button type="button" onClick={(event) => openFrom(event.currentTarget)}>{copy.nav.annotate}</button>
      <button type="button" onClick={() => setPage("inicio")}>{copy.nav.home}</button>
    </>
  );
}

function setup(shared = sharedActions(), context: "me" | "us" = "us") {
  const user = userEvent.setup();
  const onReload = vi.fn();
  const view = render(<AnnotateProvider actions={noPrivate} sharedActions={shared} couple={couple} context={context} today="2026-11-05"><Page onReload={onReload} /></AnnotateProvider>);
  const rerenderWith = (next: "me" | "us") => view.rerender(<AnnotateProvider actions={noPrivate} sharedActions={shared} couple={couple} context={next} today="2026-11-05"><Page onReload={onReload} /></AnnotateProvider>);
  return { user, shared, onReload, rerenderWith };
}
const amount = () => screen.getByRole("textbox", { name: copy.annotate.amount });
const openEdit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: copy.detail.edit }));
  return screen.findByRole("dialog", { name: copy.annotate.editTitle.expense });
};
const changeAmount = async (user: ReturnType<typeof userEvent.setup>, pesos: string) => {
  await user.clear(amount());
  await user.type(amount(), pesos);
};

afterEach(() => { Object.values(router).forEach((fn) => fn.mockClear()); });

describe("Edición compartida (US-7.1, Q12)", () => {
  it("muestra el aviso de recálculo con el nombre del otro y los campos de Q12; el contexto no se cambia", async () => {
    const { user } = setup();
    const sheet = await openEdit(user);
    expect(within(sheet).getByText(copy.shared.edit.notice("Tomás"))).toBeTruthy();
    expect((amount() as HTMLInputElement).value).toBe("240.000");
    expect((within(sheet).getByRole("radio", { name: copy.categories.restaurants }))?.getAttribute("aria-checked")).toBe("true");
    expect(within(sheet).getByRole("button", { name: new RegExp(`^${copy.shared.summary.open}`) })).toBeTruthy();
    // El contexto se ve («Nosotros») pero no es un control en la edición (Q12).
    expect(within(sheet).queryByRole("radio", { name: copy.context.me })).toBeNull();
    expect(within(sheet).getByText(copy.context.us)).toBeTruthy();
  });

  it("guardar envía la versión leída y la carga de Q12; el ok cierra y avisa", async () => {
    const { user, shared } = setup();
    await openEdit(user);
    await changeAmount(user, "250000");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    await waitFor(() => expect(shared.update).toHaveBeenCalledTimes(1));
    expect(vi.mocked(shared.update).mock.calls[0][0]).toMatchObject({ transactionId: expense().id, expectedVersion: 3, amountPesos: "250000", payerUserId: SARA, splitMode: "equal", participants: [SARA, TOMAS] });
    expect(await screen.findByText(copy.annotate.saved.edit)).toBeTruthy();
  });

  it("conflicto de versión: aviso neutral, sin atribuir el cambio (F69-2), con Recargar", async () => {
    const { user, onReload } = setup(sharedActions({ update: vi.fn(async () => ({ status: "rejected" as const, error: "versionConflict" as const })) }));
    await openEdit(user);
    await changeAmount(user, "250000");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    expect(await screen.findByText(copy.shared.errors.versionConflict)).toBeTruthy();
    expect(screen.queryByText(/Tomás cambió|Sara cambió/)).toBeNull();
    await user.click(screen.getByRole("button", { name: copy.annotate.reload }));
    expect(onReload).toHaveBeenCalled();
  });

  it("ya anulado: aviso neutral, sin atribuirlo (F69-2)", async () => {
    const { user } = setup(sharedActions({ update: vi.fn(async () => ({ status: "rejected" as const, error: "alreadyDeleted" as const })) }));
    await openEdit(user);
    await changeAmount(user, "250000");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    expect(await screen.findByText(copy.shared.errors.alreadyDeleted)).toBeTruthy();
    expect(screen.queryByText(/Tomás ya|Sara ya/)).toBeNull();
  });

  it("unknown: nunca afirma que no se guardó; Comprobar estado con not_found dice que todavía no consta y con completed cierra", async () => {
    const check = vi.fn<SharedActions["check"]>().mockResolvedValueOnce({ state: "not_found" }).mockResolvedValueOnce({ state: "completed", value: expense({ version: 4 }) });
    const { user } = setup(sharedActions({ update: vi.fn(async () => ({ status: "unknown" as const })), check }));
    await openEdit(user);
    await changeAmount(user, "250000");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    const alert = await screen.findByRole("alert");
    expect(document.body.textContent ?? "").not.toMatch(/no se guardó/i);
    await user.click(within(alert).getByRole("button", { name: copy.writes.check }));
    expect(await screen.findByText(copy.writes.notFound)).toBeTruthy();
    expect(check).toHaveBeenLastCalledWith(expect.objectContaining({ action: "update_shared_expense" }));
    await user.click(within(screen.getByRole("alert")).getByRole("button", { name: copy.writes.check }));
    expect(await screen.findByText(copy.annotate.saved.edit)).toBeTruthy();
  });
});

describe("Estado que sobrevive a la navegación (FR-060, FR-061)", () => {
  it("el aviso con «Deshacer» y el resaltado de un gasto compartido sobreviven al cambio de página", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
    await screen.findByRole("dialog", { name: copy.annotate.title.expense });
    await user.type(amount(), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    expect(await screen.findByRole("button", { name: copy.annotate.undo })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: copy.nav.home }));
    expect(screen.getByTestId("page")?.textContent ?? "").toContain("inicio");
    expect(screen.getByRole("button", { name: copy.annotate.undo })).toBeTruthy();
    expect(screen.getByTestId("highlight")?.textContent ?? "").toContain("aa1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10");
  });

  it("una respuesta tardía de «Deshacer» no pisa un aviso posterior", async () => {
    let resolveUndo!: (value: Awaited<ReturnType<SharedActions["voidShared"]>>) => void;
    const voidShared = vi.fn(() => new Promise<Awaited<ReturnType<SharedActions["voidShared"]>>>((resolve) => { resolveUndo = resolve; }));
    const { user } = setup(sharedActions({ voidShared }));
    await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
    await screen.findByRole("dialog", { name: copy.annotate.title.expense });
    await user.type(amount(), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    // Otra operación produce un aviso nuevo antes de que vuelva el «Deshacer».
    await openEdit(user);
    await changeAmount(user, "250000");
    await user.click(screen.getByRole("button", { name: copy.annotate.saveChanges }));
    expect(await screen.findByText(copy.annotate.saved.edit)).toBeTruthy();
    resolveUndo({ status: "ok", value: { id: "aa1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", version: 2 } });
    await waitFor(() => expect(voidShared).toHaveBeenCalled());
    expect(screen.getByText(copy.annotate.saved.edit)).toBeTruthy();
    expect(screen.queryByText(copy.annotate.undone.expense)).toBeNull();
  });

  it("«Deshacer» de un gasto compartido anula con motivo undo y la versión de la creación", async () => {
    const { user, shared } = setup();
    await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
    await screen.findByRole("dialog", { name: copy.annotate.title.expense });
    await user.type(amount(), "45000");
    await user.click(screen.getByRole("radio", { name: copy.categories.market }));
    await user.click(screen.getByRole("button", { name: /^Guardar/ }));
    await user.click(await screen.findByRole("button", { name: copy.annotate.undo }));
    await waitFor(() => expect(shared.voidShared).toHaveBeenCalledWith(expect.objectContaining({ transactionId: "aa1b2a52-35e8-4c4c-9e43-9b7e0f1c2a10", expectedVersion: 1, reason: "undo" })));
    expect(await screen.findByText(copy.annotate.undone.expense)).toBeTruthy();
  });
});

describe("FR-062: la hoja guarda su contexto", () => {
  it("abierta en Nosotros, sigue en Nosotros aunque el selector de la app pase a Yo", async () => {
    const { user, rerenderWith } = setup(sharedActions(), "us");
    await user.click(screen.getByRole("button", { name: copy.nav.annotate }));
    await screen.findByRole("dialog", { name: copy.annotate.title.expense });
    rerenderWith("me");
    expect((screen.getByRole("radio", { name: copy.context.us }))?.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: new RegExp(`^${copy.shared.summary.open}`) })).toBeTruthy();
  });
});
