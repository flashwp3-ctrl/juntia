// T031a / FR-056, FR-059 (B); precisión F47-4; revisión del PR #50, F50-1. Criterio literal: «para las cuatro escrituras
// de invitación (crear, regenerar, anular y aceptar): `ok`; `rejected` con su `JT`; `unknown` sin afirmar que no se
// escribió, con los campos bloqueados, «Reintentar» idéntico (misma clave y, en crear y regenerar, el mismo token) y
// «Comprobar estado» con `write_status` (`completed` lleva al resultado real; `not_found` dice que todavía no consta).
// Incluye aceptar con la respuesta perdida: «Comprobar estado» da `completed` y lleva a M1 sin aceptar otra vez».
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { DbError } from "@/lib/db/errors";
import { InvitationScreen, type InvitationActions } from "./invitation-screen";
import { PartnerScreen, type CoupleActions, type PartnerView } from "./partner-screen";
import { outcomeFromError } from "@/features/shared/write-result";

const router = { refresh: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/cuenta/pareja" }));

const GROUP = "33333333-3333-4333-8333-333333333333";
const EXPIRES = "2026-11-10T15:00:00.000Z";
const TOKEN = "C".repeat(43);
const none: PartnerView = { kind: "none", me: { name: "Sara" } };
const pending: PartnerView = { kind: "pending", me: { name: "Sara" }, groupId: GROUP, version: 4, email: "tomas@correo.com", expiresAt: EXPIRES, expired: false };
const NEVER_SAVED = /no se (guardó|creó|anuló|aceptó)|no se hizo/i;

function coupleActions(overrides: Partial<CoupleActions>): CoupleActions {
  return {
    create: vi.fn().mockResolvedValue({ status: "ok", value: { expiresAt: EXPIRES, invitationId: "inv-1" } }),
    regenerate: vi.fn().mockResolvedValue({ status: "ok", value: { expiresAt: EXPIRES, invitationId: "inv-1" } }),
    cancel: vi.fn().mockResolvedValue({ status: "ok", value: { status: "discarded" } }),
    checkStatus: vi.fn().mockResolvedValue({ state: "not_found" }),
    currentInvitation: vi.fn().mockResolvedValue({ state: "read", invitationId: "inv-1" }),
    ...overrides,
  };
}

beforeEach(() => {
  Object.values(router).forEach((fn) => fn.mockClear());
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("clasificación en el servidor (contracts/errors.md)", () => {
  it.each([
    ["alreadyInCouple", { status: "rejected", error: "alreadyInCouple" }],
    ["invitationInvalid", { status: "rejected", error: "invalid" }],
    ["invitationAlreadyAccepted", { status: "rejected", error: "alreadyAccepted" }],
    ["versionConflict", { status: "rejected", error: "versionConflict" }],
    ["invalidEmail", { status: "rejected", error: "invalidEmail" }],
    ["notAuthenticated", { status: "rejected", error: "sessionExpired" }],
    ["idempotencyKeyReused", { status: "rejected", error: "unexpected" }],
    ["network", { status: "unknown" }],
    ["retryExhausted", { status: "unknown" }],
    ["unexpected", { status: "unknown" }],
  ] as const)("%s → %o", (kind, outcome) => {
    expect(outcomeFromError(new DbError(kind))).toEqual(outcome);
  });
});

async function openCreate(acts: CoupleActions) {
  const user = userEvent.setup();
  render(<PartnerScreen view={none} actions={acts} />);
  await user.click(screen.getByRole("button", { name: copy.couple.none.invite }));
  const dialog = screen.getByRole("dialog", { name: copy.couple.invite.title });
  await user.type(within(dialog).getByRole("textbox", { name: copy.couple.invite.email }), "tomas@correo.com");
  await user.click(within(dialog).getByRole("button", { name: copy.couple.invite.create }));
  return { user, dialog };
}

describe("crear invitación", () => {
  it("rejected (JT101): lo dice, y el campo sigue editable", async () => {
    const { dialog } = await openCreate(coupleActions({ create: vi.fn().mockResolvedValue({ status: "rejected", error: "alreadyInCouple" }) }));
    expect(await within(dialog).findByText(copy.couple.errors.alreadyInCouple)).toBeTruthy();
    expect((within(dialog).getByRole("textbox", { name: copy.couple.invite.email }) as HTMLInputElement).disabled).toBe(false);
  });

  it("unknown: no afirma que no se creó, bloquea el campo y ofrece Reintentar y Comprobar estado", async () => {
    const { dialog } = await openCreate(coupleActions({ create: vi.fn().mockResolvedValue({ status: "unknown" }) }));
    expect(await within(dialog).findByText(copy.writes.unknown)).toBeTruthy();
    expect(dialog.textContent).not.toMatch(NEVER_SAVED);
    expect((within(dialog).getByRole("textbox", { name: copy.couple.invite.email }) as HTMLInputElement).disabled).toBe(true);
    expect(within(dialog).getByRole("button", { name: copy.writes.retry })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: copy.writes.check })).toBeTruthy();
  });

  it("unknown → Reintentar: misma clave, mismo correo y mismo token", async () => {
    const create = vi.fn().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "ok", value: { expiresAt: EXPIRES, invitationId: "inv-1" } });
    const { user, dialog } = await openCreate(coupleActions({ create }));
    await user.click(await within(dialog).findByRole("button", { name: copy.writes.retry }));
    expect(create.mock.calls[1][0]).toEqual(create.mock.calls[0][0]);
    expect(await within(dialog).findByText(copy.couple.invite.ready)).toBeTruthy();
  });

  it("unknown → Comprobar estado completed: M3b con el enlace de esa intención", async () => {
    const create = vi.fn().mockResolvedValue({ status: "unknown" });
    const checkStatus = vi.fn().mockResolvedValue({ state: "completed", value: { expiresAt: EXPIRES, invitationId: "inv-1" } });
    const { user, dialog } = await openCreate(coupleActions({ create, checkStatus }));
    await user.click(await within(dialog).findByRole("button", { name: copy.writes.check }));
    expect(checkStatus).toHaveBeenCalledWith({ action: "create_invitation", idempotencyKey: create.mock.calls[0][0].idempotencyKey });
    const link = (await within(dialog).findByRole("textbox", { name: copy.couple.invite.link })) as HTMLInputElement;
    expect(link.value.endsWith(`#t=${create.mock.calls[0][0].token}`)).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("unknown → Comprobar estado not_found: todavía no consta, sigue bloqueado y reintentar es seguro", async () => {
    const { user, dialog } = await openCreate(coupleActions({ create: vi.fn().mockResolvedValue({ status: "unknown" }) }));
    await user.click(await within(dialog).findByRole("button", { name: copy.writes.check }));
    expect(await within(dialog).findByText(copy.writes.notFound)).toBeTruthy();
    expect((within(dialog).getByRole("textbox", { name: copy.couple.invite.email }) as HTMLInputElement).disabled).toBe(true);
    expect(within(dialog).getByRole("button", { name: copy.writes.retry })).toBeTruthy();
  });

  it("una excepción de red al llamar a la acción también es unknown", async () => {
    const { dialog } = await openCreate(coupleActions({ create: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) }));
    expect(await within(dialog).findByText(copy.writes.unknown)).toBeTruthy();
  });

  it("cerrar con un resultado desconocido pregunta «¿Cerrar sin confirmar?»", async () => {
    const { user, dialog } = await openCreate(coupleActions({ create: vi.fn().mockResolvedValue({ status: "unknown" }) }));
    await within(dialog).findByText(copy.writes.unknown);
    await user.click(within(dialog).getByRole("button", { name: copy.primitives.close }));
    expect(screen.getByRole("alertdialog", { name: copy.writes.close.title })).toBeTruthy();
  });
});

describe("generar enlace nuevo", () => {
  async function openRegenerate(acts: CoupleActions) {
    const user = userEvent.setup();
    render(<PartnerScreen view={pending} actions={acts} />);
    await user.click(screen.getByRole("button", { name: copy.couple.pending.regenerate }));
    return { user, dialog: await screen.findByRole("dialog", { name: copy.couple.invite.regenerateTitle }) };
  }

  it("rejected JT011: relee Mi pareja", async () => {
    const { dialog } = await openRegenerate(coupleActions({ regenerate: vi.fn().mockResolvedValue({ status: "rejected", error: "versionConflict" }) }));
    expect(await within(dialog).findByText(copy.couple.errors.versionConflict)).toBeTruthy();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("unknown → Reintentar con la misma clave y el mismo token; ok muestra ese enlace", async () => {
    const regenerate = vi.fn().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "ok", value: { expiresAt: EXPIRES, invitationId: "inv-1" } });
    const { user, dialog } = await openRegenerate(coupleActions({ regenerate }));
    expect(await within(dialog).findByText(copy.writes.unknown)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: copy.writes.retry }));
    expect(regenerate.mock.calls[1][0]).toEqual(regenerate.mock.calls[0][0]);
    const link = (await within(dialog).findByRole("textbox", { name: copy.couple.invite.link })) as HTMLInputElement;
    expect(link.value.endsWith(`#t=${regenerate.mock.calls[0][0].token}`)).toBe(true);
  });

  it("unknown → Comprobar estado completed con la acción regenerate_invitation", async () => {
    const regenerate = vi.fn().mockResolvedValue({ status: "unknown" });
    const checkStatus = vi.fn().mockResolvedValue({ state: "completed", value: { expiresAt: EXPIRES, invitationId: "inv-1" } });
    const { user, dialog } = await openRegenerate(coupleActions({ regenerate, checkStatus }));
    await user.click(await within(dialog).findByRole("button", { name: copy.writes.check }));
    expect(checkStatus).toHaveBeenCalledWith({ action: "regenerate_invitation", idempotencyKey: regenerate.mock.calls[0][0].idempotencyKey });
    expect(await within(dialog).findByRole("textbox", { name: copy.couple.invite.link })).toBeTruthy();
  });
});

describe("anular", () => {
  async function confirmCancel(acts: CoupleActions) {
    const user = userEvent.setup();
    render(<PartnerScreen view={pending} actions={acts} />);
    await user.click(screen.getByRole("button", { name: copy.couple.pending.cancel }));
    await user.click(screen.getByRole("button", { name: copy.couple.cancel.confirm }));
    return { user, dialog: screen.getByRole("alertdialog", { name: copy.couple.cancel.title }) };
  }

  it("unknown: no dice que el enlace sigue activo; Reintentar repite la misma clave", async () => {
    const cancel = vi.fn().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "ok", value: { status: "discarded" } });
    const { user, dialog } = await confirmCancel(coupleActions({ cancel }));
    expect(await within(dialog).findByText(copy.writes.unknown)).toBeTruthy();
    expect(dialog.textContent).not.toContain(copy.couple.cancel.failed);
    await user.click(within(dialog).getByRole("button", { name: copy.writes.retry }));
    expect(cancel.mock.calls[1][0]).toEqual(cancel.mock.calls[0][0]);
    await act(async () => {});
    expect(router.refresh).toHaveBeenCalled();
  });

  it("unknown → Comprobar estado completed: se anuló y vuelve a M2", async () => {
    const cancel = vi.fn().mockResolvedValue({ status: "unknown" });
    const checkStatus = vi.fn().mockResolvedValue({ state: "completed", value: { status: "discarded" } });
    const { user, dialog } = await confirmCancel(coupleActions({ cancel, checkStatus }));
    await user.click(await within(dialog).findByRole("button", { name: copy.writes.check }));
    expect(checkStatus).toHaveBeenCalledWith({ action: "cancel_invitation", idempotencyKey: cancel.mock.calls[0][0].idempotencyKey });
    await act(async () => {});
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(router.refresh).toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});

describe("aceptar", () => {
  function invitationActions(overrides: Partial<InvitationActions>): InvitationActions {
    return {
      inspect: vi.fn().mockResolvedValue({ state: "valid", inviterName: "Sara", expiresAt: EXPIRES, email: "tomas@correo.com", myName: "Tomás" }),
      accept: vi.fn().mockResolvedValue({ status: "ok", value: { groupId: GROUP } }),
      checkStatus: vi.fn().mockResolvedValue({ state: "not_found" }),
      ...overrides,
    };
  }
  async function openAccept(acts: InvitationActions) {
    const user = userEvent.setup();
    window.history.replaceState(null, "", `/invitacion#t=${TOKEN}`);
    render(<InvitationScreen actions={acts} />);
    await user.click(await screen.findByRole("button", { name: copy.couple.invitation.valid.accept }));
    return user;
  }

  it("rejected JT101: explica que primero anule la suya", async () => {
    await openAccept(invitationActions({ accept: vi.fn().mockResolvedValue({ status: "rejected", error: "alreadyInCouple" }) }));
    expect(await screen.findByText(copy.couple.errors.alreadyInCouple)).toBeTruthy();
  });

  it("unknown: el botón queda bloqueado y se ofrece Reintentar con la misma clave", async () => {
    const accept = vi.fn().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "ok", value: { groupId: GROUP } });
    const user = await openAccept(invitationActions({ accept }));
    expect(await screen.findByText(copy.writes.unknown)).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.couple.invitation.valid.accept }).getAttribute("aria-disabled")).toBe("true");
    await user.click(screen.getByRole("button", { name: copy.writes.retry }));
    expect(accept.mock.calls[1][0]).toEqual(accept.mock.calls[0][0]);
    await act(async () => {});
    expect(router.replace).toHaveBeenCalledWith("/cuenta/pareja");
  });

  it("respuesta perdida → Comprobar estado completed: lleva a M1 sin aceptar otra vez", async () => {
    const accept = vi.fn().mockResolvedValue({ status: "unknown" });
    const checkStatus = vi.fn().mockResolvedValue({ state: "completed", value: { groupId: GROUP } });
    const user = await openAccept(invitationActions({ accept, checkStatus }));
    await user.click(await screen.findByRole("button", { name: copy.writes.check }));
    expect(checkStatus).toHaveBeenCalledWith({ action: "accept_invitation", idempotencyKey: accept.mock.calls[0][0].idempotencyKey });
    await act(async () => {});
    expect(router.replace).toHaveBeenCalledWith("/cuenta/pareja");
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it("Comprobar estado not_found: todavía no consta", async () => {
    const user = await openAccept(invitationActions({ accept: vi.fn().mockResolvedValue({ status: "unknown" }) }));
    await user.click(await screen.findByRole("button", { name: copy.writes.check }));
    expect(await screen.findByText(copy.writes.notFound)).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

// F55-2 (revisión de ChatGPT del PR #55): «Durante `pending` se puede cerrar la hoja: `finish()` borra el par clave/token
// y el token de esa regeneración se pierde. Además, una respuesta tardía puede mezclarse con una apertura posterior».
describe("una intención pendiente no se pierde ni se mezcla con otra (F55-2)", () => {
  it("regenerar A retenida: la hoja no se cierra; al resolver A se ve su token; B nunca muestra un enlace hasta su propia respuesta", async () => {
    const user = userEvent.setup();
    let resolveA!: (value: unknown) => void;
    let resolveB!: (value: unknown) => void;
    const regenerate = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveA = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveB = resolve; }));
    render(<PartnerScreen view={pending} actions={coupleActions({ regenerate })} />);
    await user.click(screen.getByRole("button", { name: copy.couple.pending.regenerate }));
    const dialogA = await screen.findByRole("dialog", { name: copy.couple.invite.regenerateTitle });
    const close = within(dialogA).getByRole("button", { name: copy.primitives.close });
    expect(close.getAttribute("aria-disabled")).toBe("true");
    await user.click(close);
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: copy.couple.invite.regenerateTitle })).toBe(dialogA);
    const tokenA = regenerate.mock.calls[0][0].token;
    await act(async () => resolveA({ status: "ok", value: { expiresAt: EXPIRES, invitationId: "inv-1" } }));
    expect(((await within(dialogA).findByRole("textbox", { name: copy.couple.invite.link })) as HTMLInputElement).value.endsWith(`#t=${tokenA}`)).toBe(true);
    await user.click(within(dialogA).getByRole("button", { name: copy.primitives.close }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: copy.couple.pending.regenerate }));
    const dialogB = await screen.findByRole("dialog", { name: copy.couple.invite.regenerateTitle });
    const tokenB = regenerate.mock.calls[1][0].token;
    expect(tokenB).not.toBe(tokenA);
    expect(within(dialogB).queryByRole("textbox", { name: copy.couple.invite.link })).toBeNull();
    await act(async () => resolveB({ status: "ok", value: { expiresAt: EXPIRES, invitationId: "inv-1" } }));
    expect(((await within(dialogB).findByRole("textbox", { name: copy.couple.invite.link })) as HTMLInputElement).value.endsWith(`#t=${tokenB}`)).toBe(true);
  });

  it("useWrite: una respuesta de una intención anterior (antes de reset) se ignora: ni estado ni onOk", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { useWrite } = await import("@/features/shared/use-write");
    let resolveA!: (value: unknown) => void;
    let resolveB!: (value: unknown) => void;
    const run = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveA = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveB = resolve; }));
    const onOk = vi.fn();
    const { result } = renderHook(() => useWrite<{ idempotencyKey: string }, { n: string }>({ action: "regenerate_invitation", run, check: vi.fn(), onOk }));
    act(() => { void result.current.submit({ idempotencyKey: "A" }); });
    act(() => result.current.reset());
    act(() => { void result.current.submit({ idempotencyKey: "B" }); });
    await act(async () => resolveA({ status: "ok", value: { n: "A" } }));
    expect(result.current.state.phase).toBe("pending");
    expect(onOk).not.toHaveBeenCalled();
    await act(async () => resolveB({ status: "ok", value: { n: "B" } }));
    expect(result.current.state).toEqual({ phase: "ok", value: { n: "B" }, key: "B" });
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(onOk.mock.calls[0][0]).toEqual({ n: "B" });
  });
});

// F55-3 (segunda ronda de ChatGPT del PR #55): «una petición que no termina deja la hoja bloqueada para siempre». Límite
// de 15 s (el contrato dice «tiempo agotado» sin cifra) en la escritura y en «Comprobar estado», y reanudación tras recargar.
describe("tiempo agotado (F55-3)", () => {
  afterEach(() => vi.useRealTimers());

  it("useWrite: run() colgado → a los 15 s, unknown con la misma carga; la respuesta tardía no cambia nada", async () => {
    vi.useFakeTimers();
    const { renderHook } = await import("@testing-library/react");
    const { useWrite, WRITE_TIMEOUT_MS } = await import("@/features/shared/use-write");
    expect(WRITE_TIMEOUT_MS).toBe(15_000);
    let resolveOld!: (value: unknown) => void;
    const run = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce({ status: "ok", value: { n: 2 } });
    const onOk = vi.fn();
    const { result } = renderHook(() => useWrite<{ idempotencyKey: string }, { n: number }>({ action: "create_invitation", run, check: vi.fn(), onOk }));
    act(() => { void result.current.submit({ idempotencyKey: "K" }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(14_999); });
    expect(result.current.state.phase).toBe("pending");
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(result.current.state).toEqual({ phase: "unknown", checking: false, notFound: false });
    expect(result.current.locked).toBe(true);
    await act(async () => resolveOld({ status: "ok", value: { n: 1 } }));
    expect(result.current.state.phase).toBe("unknown");
    expect(onOk).not.toHaveBeenCalled();
    await act(async () => { await result.current.retry(); });
    expect(run.mock.calls[1][0]).toEqual({ idempotencyKey: "K" });
    expect(result.current.state).toEqual({ phase: "ok", value: { n: 2 }, key: "K" });
  });

  it("useWrite: «Comprobar estado» colgado → a los 15 s vuelve a unknown y se puede comprobar otra vez", async () => {
    vi.useFakeTimers();
    const { renderHook } = await import("@testing-library/react");
    const { useWrite } = await import("@/features/shared/use-write");
    let resolveCheck!: (value: unknown) => void;
    const check = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveCheck = resolve; })).mockResolvedValueOnce({ state: "not_found" });
    const { result } = renderHook(() => useWrite<{ idempotencyKey: string }, { n: number }>({ action: "create_invitation", run: vi.fn().mockResolvedValue({ status: "unknown" }), check }));
    await act(async () => { await result.current.submit({ idempotencyKey: "K" }); });
    act(() => { void result.current.checkStatus(); });
    expect(result.current.state).toEqual({ phase: "unknown", checking: true, notFound: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(result.current.state).toEqual({ phase: "unknown", checking: false, notFound: false });
    await act(async () => resolveCheck({ state: "completed", value: { n: 1 } }));
    expect(result.current.state.phase).toBe("unknown");
    await act(async () => { await result.current.checkStatus(); });
    expect(result.current.state).toEqual({ phase: "unknown", checking: false, notFound: true });
  });

  it("hoja de invitar: con la petición colgada, a los 15 s aparece «no pudimos confirmar», Reintentar y Comprobar estado, y cerrar pide confirmación", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveOld!: (value: unknown) => void;
    const regenerate = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    render(<PartnerScreen view={pending} actions={coupleActions({ regenerate })} />);
    await user.click(screen.getByRole("button", { name: copy.couple.pending.regenerate }));
    const dialog = await screen.findByRole("dialog", { name: copy.couple.invite.regenerateTitle });
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(await within(dialog).findByText(copy.writes.unknown)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: copy.writes.retry }).getAttribute("aria-disabled")).toBeNull();
    expect(within(dialog).getByRole("button", { name: copy.writes.check }).getAttribute("aria-disabled")).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: copy.primitives.close }));
    expect(screen.getByRole("alertdialog", { name: copy.writes.close.title })).toBeTruthy();
    await act(async () => resolveOld({ status: "ok", value: { expiresAt: EXPIRES, invitationId: "inv-1" } }));
    expect(within(dialog).queryByRole("textbox", { name: copy.couple.invite.link })).toBeNull();
  });

});

// F55-5 y F55-6 (tercera ronda del PR #55). Decisión del gestor: se retira la reanudación tras recargar (la intención de
// quien invita vive solo en memoria), y dentro de la pestaña un ok que llega por «Reintentar» o «Comprobar estado» se
// revalida contra my_couple antes de mostrar el enlace.
describe("sin reanudación tras recargar y revalidación del enlace (F55-5, F55-6)", () => {
  it("recargar con una escritura unknown no reanuda nada ni muestra el correo anterior", async () => {
    const create = vi.fn().mockResolvedValue({ status: "unknown" });
    await openCreate(coupleActions({ create }));
    await screen.findByText(copy.writes.unknown);
    cleanup(); // recargar: se desmonta todo y la pantalla vuelve a montarse con lo que trae el servidor
    expect(Object.keys(window.sessionStorage).filter((key) => key.startsWith("juntia:invitation-write"))).toEqual([]);
    const user = userEvent.setup();
    render(<PartnerScreen view={none} actions={coupleActions({ create })} />);
    await user.click(screen.getByRole("button", { name: copy.couple.none.invite }));
    const dialog = screen.getByRole("dialog", { name: copy.couple.invite.title });
    expect((within(dialog).getByRole("textbox", { name: copy.couple.invite.email }) as HTMLInputElement).value).toBe("");
    expect(within(dialog).queryByText(copy.writes.unknown)).toBeNull();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("A queda unknown, otra pestaña regenera B, Reintentar de A da ok: no se muestra el enlace de A sino el aviso", async () => {
    const user = userEvent.setup();
    const regenerate = vi.fn().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "ok", value: { expiresAt: EXPIRES, invitationId: "A" } });
    const currentInvitation = vi.fn().mockResolvedValue({ state: "read", invitationId: "B" });
    render(<PartnerScreen view={pending} actions={coupleActions({ regenerate, currentInvitation })} />);
    await user.click(screen.getByRole("button", { name: copy.couple.pending.regenerate }));
    const dialog = await screen.findByRole("dialog", { name: copy.couple.invite.regenerateTitle });
    await user.click(await within(dialog).findByRole("button", { name: copy.writes.retry }));
    expect(await within(dialog).findByText(copy.couple.invite.changed)).toBeTruthy();
    expect(currentInvitation).toHaveBeenCalled();
    expect(within(dialog).queryByRole("textbox", { name: copy.couple.invite.link })).toBeNull();
    expect(document.body.textContent).not.toContain(regenerate.mock.calls[0][0].token);
    expect(router.refresh).toHaveBeenCalled();
  });

  it("crear en unknown, otra pestaña lo anula, Comprobar estado da ok: no se muestra el enlace", async () => {
    const create = vi.fn().mockResolvedValue({ status: "unknown" });
    const checkStatus = vi.fn().mockResolvedValue({ state: "completed", value: { expiresAt: EXPIRES, invitationId: "X" } });
    const currentInvitation = vi.fn().mockResolvedValue({ state: "read", invitationId: null });
    const { user, dialog } = await openCreate(coupleActions({ create, checkStatus, currentInvitation }));
    await user.click(await within(dialog).findByRole("button", { name: copy.writes.check }));
    expect(await within(dialog).findByText(copy.couple.invite.changed)).toBeTruthy();
    expect(within(dialog).queryByRole("textbox", { name: copy.couple.invite.link })).toBeNull();
    expect(document.body.textContent).not.toContain(create.mock.calls[0][0].token);
  });

  it("si no se puede leer my_couple, tampoco se muestra el enlace", async () => {
    const create = vi.fn().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "ok", value: { expiresAt: EXPIRES, invitationId: "inv-1" } });
    const { user, dialog } = await openCreate(coupleActions({ create, currentInvitation: vi.fn().mockResolvedValue({ state: "error" }) }));
    await user.click(await within(dialog).findByRole("button", { name: copy.writes.retry }));
    expect(await within(dialog).findByText(copy.couple.invite.changed)).toBeTruthy();
    expect(within(dialog).queryByRole("textbox", { name: copy.couple.invite.link })).toBeNull();
  });

  it("la primera respuesta ok, sin unknown antes, muestra el enlace sin releer my_couple", async () => {
    const currentInvitation = vi.fn();
    const { dialog } = await openCreate(coupleActions({ currentInvitation }));
    expect(await within(dialog).findByRole("textbox", { name: copy.couple.invite.link })).toBeTruthy();
    expect(currentInvitation).not.toHaveBeenCalled();
  });
});

// F55-7 (cuarta ronda del PR #55): la comprobación de vigencia de una intención no puede pintar el resultado de otra.
describe("la comprobación de vigencia va atada a su intención (F55-7)", () => {
  async function twoIntentions(resolveAWith: string, resolveBWith: string) {
    const user = userEvent.setup();
    let resolveA!: (value: unknown) => void;
    let resolveB!: (value: unknown) => void;
    const regenerate = vi.fn()
      .mockResolvedValueOnce({ status: "unknown" })
      .mockResolvedValueOnce({ status: "ok", value: { expiresAt: EXPIRES, invitationId: "A" } })
      .mockResolvedValueOnce({ status: "unknown" })
      .mockResolvedValueOnce({ status: "ok", value: { expiresAt: EXPIRES, invitationId: "B" } });
    const currentInvitation = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveA = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveB = resolve; }));
    render(<PartnerScreen view={pending} actions={coupleActions({ regenerate, currentInvitation })} />);

    await user.click(screen.getByRole("button", { name: copy.couple.pending.regenerate }));
    const dialogA = await screen.findByRole("dialog", { name: copy.couple.invite.regenerateTitle });
    await user.click(await within(dialogA).findByRole("button", { name: copy.writes.retry }));
    await waitFor(() => expect(currentInvitation).toHaveBeenCalledTimes(1));
    await user.click(within(dialogA).getByRole("button", { name: copy.primitives.close }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: copy.couple.pending.regenerate }));
    const dialogB = await screen.findByRole("dialog", { name: copy.couple.invite.regenerateTitle });
    await user.click(await within(dialogB).findByRole("button", { name: copy.writes.retry }));
    await waitFor(() => expect(currentInvitation).toHaveBeenCalledTimes(2));
    const tokenB = regenerate.mock.calls[2][0].token;

    await act(async () => resolveA({ state: "read", invitationId: resolveAWith }));
    expect(within(dialogB).queryByRole("textbox", { name: copy.couple.invite.link })).toBeNull();
    expect(within(dialogB).queryByText(copy.couple.invite.changed)).toBeNull();
    await act(async () => resolveB({ state: "read", invitationId: resolveBWith }));
    return { dialogB, tokenB };
  }

  it("A se resuelve vigente y B cambiada: B nunca muestra el enlace, solo el aviso", async () => {
    const { dialogB, tokenB } = await twoIntentions("A", "Z");
    expect(await within(dialogB).findByText(copy.couple.invite.changed)).toBeTruthy();
    expect(within(dialogB).queryByRole("textbox", { name: copy.couple.invite.link })).toBeNull();
    expect(document.body.textContent).not.toContain(tokenB);
  });

  it("A se resuelve cambiada y B vigente: B muestra su propio enlace y ningún aviso", async () => {
    const { dialogB, tokenB } = await twoIntentions("X", "B");
    const link = (await within(dialogB).findByRole("textbox", { name: copy.couple.invite.link })) as HTMLInputElement;
    expect(link.value.endsWith(`#t=${tokenB}`)).toBe(true);
    expect(within(dialogB).queryByText(copy.couple.invite.changed)).toBeNull();
  });
});
