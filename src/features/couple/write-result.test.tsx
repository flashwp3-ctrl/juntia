// T031a / FR-056, FR-059 (B); precisión F47-4; revisión del PR #50, F50-1. Criterio literal: «para las cuatro escrituras
// de invitación (crear, regenerar, anular y aceptar): `ok`; `rejected` con su `JT`; `unknown` sin afirmar que no se
// escribió, con los campos bloqueados, «Reintentar» idéntico (misma clave y, en crear y regenerar, el mismo token) y
// «Comprobar estado» con `write_status` (`completed` lleva al resultado real; `not_found` dice que todavía no consta).
// Incluye aceptar con la respuesta perdida: «Comprobar estado» da `completed` y lleva a M1 sin aceptar otra vez».
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    create: vi.fn().mockResolvedValue({ status: "ok", value: { expiresAt: EXPIRES } }),
    regenerate: vi.fn().mockResolvedValue({ status: "ok", value: { expiresAt: EXPIRES } }),
    cancel: vi.fn().mockResolvedValue({ status: "ok", value: { status: "discarded" } }),
    checkStatus: vi.fn().mockResolvedValue({ state: "not_found" }),
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
    const create = vi.fn().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "ok", value: { expiresAt: EXPIRES } });
    const { user, dialog } = await openCreate(coupleActions({ create }));
    await user.click(await within(dialog).findByRole("button", { name: copy.writes.retry }));
    expect(create.mock.calls[1][0]).toEqual(create.mock.calls[0][0]);
    expect(await within(dialog).findByText(copy.couple.invite.ready)).toBeTruthy();
  });

  it("unknown → Comprobar estado completed: M3b con el enlace de esa intención", async () => {
    const create = vi.fn().mockResolvedValue({ status: "unknown" });
    const checkStatus = vi.fn().mockResolvedValue({ state: "completed", value: { expiresAt: EXPIRES } });
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
    const regenerate = vi.fn().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "ok", value: { expiresAt: EXPIRES } });
    const { user, dialog } = await openRegenerate(coupleActions({ regenerate }));
    expect(await within(dialog).findByText(copy.writes.unknown)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: copy.writes.retry }));
    expect(regenerate.mock.calls[1][0]).toEqual(regenerate.mock.calls[0][0]);
    const link = (await within(dialog).findByRole("textbox", { name: copy.couple.invite.link })) as HTMLInputElement;
    expect(link.value.endsWith(`#t=${regenerate.mock.calls[0][0].token}`)).toBe(true);
  });

  it("unknown → Comprobar estado completed con la acción regenerate_invitation", async () => {
    const regenerate = vi.fn().mockResolvedValue({ status: "unknown" });
    const checkStatus = vi.fn().mockResolvedValue({ state: "completed", value: { expiresAt: EXPIRES } });
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
