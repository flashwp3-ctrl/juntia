// T030 / FR-012, FR-015; US-1 escenarios 1–4 y 8–11; precisiones F47-2 y F47-3 (spec 003). Criterios literales:
// «M1–M7 con CoupleStatus (ACTIVA, PENDIENTE, SOLO TÚ, NO VÁLIDA), sin el correo del otro ni saldos; M4 con «Generar
// enlace nuevo» y «Anular» (SensitiveActionConfirmation con el foco en la opción segura), nunca «Copiar enlace»; M3b y
// la respuesta de regenerar muestran el enlace una sola vez; la LimitNote de «Salir de la pareja» sin control; `JT103`
// lleva a M1».
// M5–M7 (la ruta /invitacion) se prueban en invitation.test.tsx; aquí, Mi pareja (M1–M4) y CoupleStatus.
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import { CoupleStatus } from "./couple-status";
import { PartnerScreen, type CoupleActions, type PartnerView } from "./partner-screen";
import { InvitationScreen, type InvitationActions } from "./invitation-screen";

const router = { refresh: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/cuenta/pareja" }));

const SARA = "11111111-1111-4111-8111-111111111111";
const TOMAS = "22222222-2222-4222-8222-222222222222";
const GROUP = "33333333-3333-4333-8333-333333333333";
const EXPIRES = "2026-11-10T15:00:00.000Z";
// El copy une «vence el 10 nov» con espacios duros; Testing Library normaliza el texto del DOM a espacios simples.
const spaced = (text: string) => text.replace(/\s+/g, " ");

const active: PartnerView = { kind: "active", members: [
  { userId: SARA, name: "Sara", role: "owner", joinOrder: 1, isMe: true },
  { userId: TOMAS, name: "Tomás", role: "member", joinOrder: 2, isMe: false },
] };
const none: PartnerView = { kind: "none", me: { name: "Sara" } };
const pending = (expired = false): PartnerView => ({ kind: "pending", me: { name: "Sara" }, groupId: GROUP, version: 4, email: "tomas@correo.com", expiresAt: EXPIRES, expired });

function actions(overrides: Partial<CoupleActions> = {}): CoupleActions {
  return {
    create: vi.fn().mockResolvedValue({ status: "ok", value: { expiresAt: EXPIRES } }),
    regenerate: vi.fn().mockResolvedValue({ status: "ok", value: { expiresAt: EXPIRES } }),
    cancel: vi.fn().mockResolvedValue({ status: "ok", value: { status: "discarded" } }),
    checkStatus: vi.fn().mockResolvedValue({ state: "not_found" }),
    ...overrides,
  };
}

beforeEach(() => {
  router.refresh.mockClear();
  window.sessionStorage.clear();
});

describe("CoupleStatus (FR-015)", () => {
  it.each([
    ["active", copy.couple.status.active],
    ["pending", copy.couple.status.pending],
    ["solo", copy.couple.status.solo],
    ["invalid", copy.couple.status.invalid],
  ] as const)("%s: badge con ícono y texto, título y línea de contexto", (state, badge) => {
    render(<CoupleStatus state={state} title="Título" line="Línea" me={{ initial: "S" }} partner={state === "active" ? { initial: "T" } : undefined} />);
    const group = screen.getByRole("group", { name: copy.couple.status.label("Título") });
    expect(within(group).getByText(badge)).toBeTruthy();
    expect(within(group).getByText("Línea")).toBeTruthy();
  });

  it("la segunda persona usa person.2 con su patrón rayado; sin pareja, un hueco punteado", () => {
    const { container, rerender } = render(<CoupleStatus state="active" title="Sara y Tomás" line="x" me={{ initial: "S" }} partner={{ initial: "T" }} />);
    expect(container.querySelector('[data-person="2"][data-pattern="striped"]')).toBeTruthy();
    expect(container.querySelector('[data-person="1"][data-pattern="solid"]')).toBeTruthy();
    rerender(<CoupleStatus state="solo" title="Sin pareja" line="x" me={{ initial: "S" }} />);
    expect(container.querySelector('[data-person="2"]')).toBeNull();
    expect(container.querySelector("[data-partner-slot]")).toBeTruthy();
  });
});

describe("Mi pareja M1 · activa", () => {
  it("ACTIVA con los dos nombres, sin correos ni saldos, y Salir de la pareja como LimitNote sin control", () => {
    render(<PartnerScreen view={active} actions={actions()} />);
    expect(screen.getByText(copy.couple.status.active)).toBeTruthy();
    expect(screen.getByText(copy.couple.active.title("Sara", "Tomás"))).toBeTruthy();
    expect(screen.getByText(copy.couple.active.you(copy.couple.active.owner))).toBeTruthy();
    expect(screen.getByText(copy.couple.active.member)).toBeTruthy();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/\$/);
    const note = screen.getByRole("note");
    expect(within(note).getByText(copy.couple.active.leave.title)).toBeTruthy();
    expect(within(note).queryAllByRole("button")).toHaveLength(0);
    expect(within(note).queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: copy.couple.pending.cancel })).toBeNull();
  });
});

describe("Mi pareja M2 · sin pareja → M3 → M3b", () => {
  it("M2: SOLO TÚ, «Juntia también funciona solo» e «Invitar a mi pareja»", () => {
    render(<PartnerScreen view={none} actions={actions()} />);
    expect(screen.getByText(copy.couple.status.solo)).toBeTruthy();
    expect(screen.getByRole("heading", { name: copy.couple.none.heading })).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.couple.none.invite })).toBeTruthy();
  });

  it("M3: un correo no válido no se envía y dice cómo corregirlo", async () => {
    const user = userEvent.setup();
    const acts = actions();
    render(<PartnerScreen view={none} actions={acts} />);
    await user.click(screen.getByRole("button", { name: copy.couple.none.invite }));
    const dialog = screen.getByRole("dialog", { name: copy.couple.invite.title });
    await user.type(within(dialog).getByRole("textbox", { name: copy.couple.invite.email }), "tomas@");
    await user.click(within(dialog).getByRole("button", { name: copy.couple.invite.create }));
    expect(acts.create).not.toHaveBeenCalled();
    expect(within(dialog).getByText(copy.couple.invite.errors.email)).toBeTruthy();
  });

  it("M3b: el enlace lleva el token del navegador en el fragmento y se muestra una sola vez", async () => {
    const user = userEvent.setup();
    const acts = actions();
    const { rerender } = render(<PartnerScreen view={none} actions={acts} />);
    await user.click(screen.getByRole("button", { name: copy.couple.none.invite }));
    const dialog = screen.getByRole("dialog", { name: copy.couple.invite.title });
    await user.type(within(dialog).getByRole("textbox", { name: copy.couple.invite.email }), " Tomas@Correo.com ");
    await user.click(within(dialog).getByRole("button", { name: copy.couple.invite.create }));
    expect(acts.create).toHaveBeenCalledTimes(1);
    const input = vi.mocked(acts.create).mock.calls[0][0];
    expect(input.email).toBe("Tomas@Correo.com");
    expect(input.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(input.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(await within(dialog).findByText(copy.couple.invite.ready)).toBeTruthy();
    const link = within(dialog).getByRole("textbox", { name: copy.couple.invite.link }) as HTMLInputElement;
    expect(link.value).toBe(`${window.location.origin}/invitacion#t=${input.token}`);
    expect(link.readOnly).toBe(true);
    expect(within(dialog).getByRole("button", { name: copy.couple.invite.share })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: copy.couple.invite.copy })).toBeTruthy();
    expect(router.refresh).toHaveBeenCalled();
    // Cerrar la hoja: el enlace no vuelve a mostrarse; M4 (lo que trae el servidor) no lo tiene.
    await user.click(within(dialog).getByRole("button", { name: copy.primitives.close }));
    rerender(<PartnerScreen view={pending()} actions={acts} />);
    expect(document.body.textContent).not.toContain(input.token);
    expect(screen.queryByRole("button", { name: copy.couple.invite.copy })).toBeNull();
  });
});

describe("Mi pareja M4 · pendiente", () => {
  it("PENDIENTE con correo y caducidad, «Generar enlace nuevo» y «Anular», nunca «Copiar enlace»", () => {
    render(<PartnerScreen view={pending()} actions={actions()} />);
    expect(screen.getByText(copy.couple.status.pending)).toBeTruthy();
    expect(screen.getByText(spaced(copy.couple.pending.line("tomas@correo.com", "10 nov")))).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.couple.pending.regenerate })).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.couple.pending.cancel })).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.couple.invite.copy })).toBeNull();
    expect(screen.queryByRole("button", { name: copy.couple.none.invite })).toBeNull();
  });

  it("M4 vencida: lo dice y ofrece las mismas dos acciones", () => {
    render(<PartnerScreen view={pending(true)} actions={actions()} />);
    expect(screen.getByText(spaced(copy.couple.pending.expiredLine("tomas@correo.com", "10 nov")))).toBeTruthy();
    expect(screen.getByText(copy.couple.pending.expiredDescription)).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.couple.pending.regenerate })).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.couple.pending.cancel })).toBeTruthy();
  });

  it("Generar enlace nuevo: versión leída, token nuevo, y el enlace se muestra una sola vez como en M3b", async () => {
    const user = userEvent.setup();
    const acts = actions();
    render(<PartnerScreen view={pending()} actions={acts} />);
    await user.click(screen.getByRole("button", { name: copy.couple.pending.regenerate }));
    const dialog = await screen.findByRole("dialog", { name: copy.couple.invite.regenerateTitle });
    expect(acts.regenerate).toHaveBeenCalledTimes(1);
    const input = vi.mocked(acts.regenerate).mock.calls[0][0];
    expect(input).toMatchObject({ groupId: GROUP, expectedVersion: 4 });
    expect(input.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const link = (await within(dialog).findByRole("textbox", { name: copy.couple.invite.link })) as HTMLInputElement;
    expect(link.value.endsWith(`#t=${input.token}`)).toBe(true);
    expect(within(dialog).getByText(copy.couple.invite.once)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: copy.primitives.close }));
    expect(document.body.textContent).not.toContain(input.token);
  });

  it("Anular: alertdialog con el foco en «Mantener»; Escape cancela sin escribir", async () => {
    const user = userEvent.setup();
    const acts = actions();
    render(<PartnerScreen view={pending()} actions={acts} />);
    await user.click(screen.getByRole("button", { name: copy.couple.pending.cancel }));
    const dialog = screen.getByRole("alertdialog", { name: copy.couple.cancel.title });
    expect(within(dialog).getByText(copy.couple.cancel.description)).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: copy.couple.cancel.keep }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(acts.cancel).not.toHaveBeenCalled();
  });

  it("Anular confirmado: grupo y versión de M4; al terminar, vuelve a M2 por el servidor", async () => {
    const user = userEvent.setup();
    const acts = actions();
    render(<PartnerScreen view={pending()} actions={acts} />);
    await user.click(screen.getByRole("button", { name: copy.couple.pending.cancel }));
    await user.click(screen.getByRole("button", { name: copy.couple.cancel.confirm }));
    expect(acts.cancel).toHaveBeenCalledWith(expect.objectContaining({ groupId: GROUP, expectedVersion: 4 }));
    await act(async () => {});
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("JT103 (se aceptó antes): «Ya no se puede anular» y Mi pareja se recarga hacia M1", async () => {
    const user = userEvent.setup();
    const acts = actions({ cancel: vi.fn().mockResolvedValue({ status: "rejected", error: "alreadyAccepted" }) });
    render(<PartnerScreen view={pending()} actions={acts} />);
    await user.click(screen.getByRole("button", { name: copy.couple.pending.cancel }));
    await user.click(screen.getByRole("button", { name: copy.couple.cancel.confirm }));
    expect(await screen.findByText(copy.couple.errors.alreadyAccepted)).toBeTruthy();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("Anular rechazado por otra causa: dice qué quedó igual", async () => {
    const user = userEvent.setup();
    const acts = actions({ cancel: vi.fn().mockResolvedValue({ status: "rejected", error: "unexpected" }) });
    render(<PartnerScreen view={pending()} actions={acts} />);
    await user.click(screen.getByRole("button", { name: copy.couple.pending.cancel }));
    await user.click(screen.getByRole("button", { name: copy.couple.cancel.confirm }));
    const dialog = screen.getByRole("alertdialog", { name: copy.couple.cancel.title });
    expect(await within(dialog).findByText(copy.couple.cancel.failed)).toBeTruthy();
  });
});

// M5–M7: /invitacion. El token llega en el fragmento; la pantalla lo decide el cliente (contracts/server-actions.md §3).

const TOKEN = "A".repeat(43);
function invitationActions(overrides: Partial<InvitationActions> = {}): InvitationActions {
  return {
    inspect: vi.fn().mockResolvedValue({ state: "valid", inviterName: "Sara", expiresAt: EXPIRES, email: "tomas@correo.com", myName: "Tomás" }),
    accept: vi.fn().mockResolvedValue({ status: "ok", value: { groupId: GROUP } }),
    checkStatus: vi.fn().mockResolvedValue({ state: "not_found" }),
    ...overrides,
  };
}
function openLink(token = TOKEN) {
  window.history.replaceState(null, "", `/invitacion#t=${token}`);
}

describe("/invitacion M5–M7", () => {
  beforeEach(() => {
    window.localStorage.clear();
    router.replace.mockClear();
    router.push.mockClear();
  });

  it("M5 sin sesión: ningún dato de la pareja ni de quien invita; Entrar y Crear cuenta vuelven a /invitacion", async () => {
    openLink();
    render(<InvitationScreen actions={invitationActions({ inspect: vi.fn().mockResolvedValue({ state: "signedOut" }) })} />);
    expect(await screen.findByRole("heading", { level: 1, name: copy.couple.invitation.signedOut.title })).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.couple.invitation.signedOut.signIn }).getAttribute("href")).toBe("/entrar?volver=%2Finvitacion");
    expect(screen.getByRole("link", { name: copy.couple.invitation.signedOut.signUp }).getAttribute("href")).toBe("/crear-cuenta?volver=%2Finvitacion");
    expect(document.body.textContent).not.toContain("Sara");
    expect(window.location.hash).toBe("");
  });

  it("M6 con sesión: quién invita, qué verán juntos, Yo sigue siendo suyo; Aceptar lleva a M1", async () => {
    const user = userEvent.setup();
    const acts = invitationActions();
    openLink();
    render(<InvitationScreen actions={acts} />);
    expect(await screen.findByRole("heading", { level: 1, name: copy.couple.invitation.valid.title("Sara") })).toBeTruthy();
    expect(screen.getByText(spaced(copy.couple.invitation.valid.line("tomas@correo.com", "10 nov")))).toBeTruthy();
    expect(acts.inspect).toHaveBeenCalledWith({ token: TOKEN });
    await user.click(screen.getByRole("button", { name: copy.couple.invitation.valid.accept }));
    expect(acts.accept).toHaveBeenCalledWith(expect.objectContaining({ token: TOKEN }));
    await act(async () => {});
    expect(router.replace).toHaveBeenCalledWith("/cuenta/pareja");
  });

  it("M7: el mismo texto para cualquier motivo, con «Ir a mi espacio»", async () => {
    openLink();
    render(<InvitationScreen actions={invitationActions({ inspect: vi.fn().mockResolvedValue({ state: "invalid", reason: "generic" }) })} />);
    expect(await screen.findByRole("heading", { level: 1, name: copy.couple.invitation.invalid })).toBeTruthy();
    expect(screen.getByText(copy.couple.invitation.invalidDescription)).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.couple.invitation.home })).toBeTruthy();
  });

  it("M7 sin token en la URL ni en el dispositivo", async () => {
    window.history.replaceState(null, "", "/invitacion");
    const acts = invitationActions();
    render(<InvitationScreen actions={acts} />);
    expect(await screen.findByRole("heading", { level: 1, name: copy.couple.invitation.invalid })).toBeTruthy();
    expect(acts.inspect).not.toHaveBeenCalled();
  });

  it("M7 de quien tiene su propia invitación pendiente: primero anula la suya (US-1.9)", async () => {
    openLink();
    render(<InvitationScreen actions={invitationActions({ inspect: vi.fn().mockResolvedValue({ state: "invalid", reason: "ownPending" }) })} />);
    expect(await screen.findByText(copy.couple.invitation.ownPending)).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.couple.invitation.toPartner }).getAttribute("href")).toBe("/cuenta/pareja");
  });

  it("aceptar rechazado con JT104 lleva a M7", async () => {
    const user = userEvent.setup();
    openLink();
    render(<InvitationScreen actions={invitationActions({ accept: vi.fn().mockResolvedValue({ status: "rejected", error: "invalid" }) })} />);
    await user.click(await screen.findByRole("button", { name: copy.couple.invitation.valid.accept }));
    expect(await screen.findByRole("heading", { level: 1, name: copy.couple.invitation.invalid })).toBeTruthy();
  });
});
