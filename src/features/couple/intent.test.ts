// T031 / FR-012a, FR-014; US-1 escenarios 5 y 10; contracts/server-actions.md §2–§3; research R5. Criterio literal:
// «el token se genera en el navegador con la clave; un resultado `unknown` y el reintento con la misma clave muestran
// **el mismo enlace**; la intención de `localStorage["juntia:invitation"]` se borra al aceptar, al ver M7, con «Ahora
// no», al cerrar sesión y **cuando tiene 7 días o más** (F49-7); el fragmento se limpia con `history.replaceState`; al
// montar con sesión y una intención vigente se va a `/invitacion`».
// Sin JSX: el archivo es .ts, como pide la tarea; los componentes se montan con createElement.
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy/es";
import {
  captureInvitationFragment, clearInvitationIntent, INTENT_MAX_AGE_MS, INVITATION_INTENT_KEY, invitationLink, newInvitationToken,
  readInvitationIntent, tokenIntent,
} from "./intent";
import { ForgetInvitationIntent, InvitationReturn } from "./invitation-return";
import { InvitationScreen, type InvitationActions } from "./invitation-screen";
import { PartnerScreen, type CoupleActions } from "./partner-screen";

const router = { refresh: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const DAY = 24 * 60 * 60 * 1000;
const TOKEN = "B".repeat(43);
const EXPIRES = "2026-11-10T15:00:00.000Z";
const save = (savedAt: number, token = TOKEN) => window.localStorage.setItem(INVITATION_INTENT_KEY, JSON.stringify({ token, savedAt }));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  Object.values(router).forEach((fn) => fn.mockClear());
});

describe("token e intención (FR-012a, contracts §2)", () => {
  it("el token son 32 bytes aleatorios del navegador en base64url, distinto cada vez", () => {
    const spy = vi.spyOn(crypto, "getRandomValues");
    const one = newInvitationToken();
    expect(spy).toHaveBeenCalled();
    expect(one).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newInvitationToken()).not.toBe(one);
    spy.mockRestore();
  });

  it("el enlace lleva el token en el fragmento, nunca en la ruta ni en la query", () => {
    expect(invitationLink("https://juntia.app", TOKEN)).toBe(`https://juntia.app/invitacion#t=${TOKEN}`);
  });

  it("el par (clave, token) nace en memoria; se guarda en sessionStorage al enviar y se borra con un resultado definitivo (F55-3)", () => {
    const intent = tokenIntent("create");
    const pair = intent.begin();
    expect(pair.key).toMatch(/^[0-9a-f-]{36}$/);
    expect(pair.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(intent.pending()).toBeNull();
    const payload = { idempotencyKey: pair.key, token: pair.token, email: "tomas@correo.com" };
    intent.save(payload);
    expect(window.sessionStorage.getItem("juntia:invitation-write:create")).toContain(pair.key);
    expect(intent.pending()?.payload).toEqual(payload);
    intent.end();
    expect(intent.pending()).toBeNull();
    expect(window.sessionStorage.getItem("juntia:invitation-write:create")).toBeNull();
    expect(tokenIntent("create").begin().key).not.toBe(pair.key);
  });

  it("un par pendiente de 7 días o más, o ilegible, se descarta al leerlo (F55-3)", () => {
    window.sessionStorage.setItem("juntia:invitation-write:regenerate", JSON.stringify({ savedAt: Date.now() - 8 * DAY, payload: { idempotencyKey: "k", token: TOKEN, groupId: "g", expectedVersion: 1 } }));
    expect(tokenIntent("regenerate").pending()).toBeNull();
    expect(window.sessionStorage.getItem("juntia:invitation-write:regenerate")).toBeNull();
    window.sessionStorage.setItem("juntia:invitation-write:create", "{roto");
    expect(tokenIntent("create").pending()).toBeNull();
  });

  it("unknown y el reintento con la misma clave muestran el mismo enlace (US-1.10a)", async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValueOnce({ status: "unknown" }).mockResolvedValueOnce({ status: "ok", value: { expiresAt: EXPIRES } });
    const actions: CoupleActions = { create, regenerate: vi.fn(), cancel: vi.fn(), checkStatus: vi.fn() };
    render(createElement(PartnerScreen, { view: { kind: "none", me: { name: "Sara" } }, actions }));
    await user.click(screen.getByRole("button", { name: copy.couple.none.invite }));
    const dialog = screen.getByRole("dialog", { name: copy.couple.invite.title });
    await user.type(within(dialog).getByRole("textbox", { name: copy.couple.invite.email }), "tomas@correo.com");
    await user.click(within(dialog).getByRole("button", { name: copy.couple.invite.create }));
    await user.click(await within(dialog).findByRole("button", { name: copy.writes.retry }));
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0]).toEqual(create.mock.calls[0][0]);
    const link = (await within(dialog).findByRole("textbox", { name: copy.couple.invite.link })) as HTMLInputElement;
    expect(link.value).toBe(invitationLink(window.location.origin, create.mock.calls[0][0].token));
  });
});

describe("intención del lado de quien recibe (contracts §3, F49-7)", () => {
  it("lee #t=, lo guarda con su fecha y limpia el fragmento con history.replaceState", () => {
    window.history.replaceState(null, "", `/invitacion#t=${TOKEN}`);
    const replace = vi.spyOn(window.history, "replaceState");
    captureInvitationFragment(1_000);
    expect(JSON.parse(window.localStorage.getItem(INVITATION_INTENT_KEY)!)).toEqual({ token: TOKEN, savedAt: 1_000 });
    expect(replace).toHaveBeenCalledWith(null, "", "/invitacion");
    expect(window.location.hash).toBe("");
    replace.mockRestore();
  });

  it("un fragmento que no es un token no se guarda", () => {
    window.history.replaceState(null, "", "/invitacion#t=<script>");
    captureInvitationFragment(1_000);
    expect(window.localStorage.getItem(INVITATION_INTENT_KEY)).toBeNull();
  });

  it("vigente con menos de 7 días; con 7 días o más se borra al leerla", () => {
    save(0);
    expect(readInvitationIntent(INTENT_MAX_AGE_MS - 1)).toBe(TOKEN);
    expect(readInvitationIntent(7 * DAY)).toBeNull();
    expect(window.localStorage.getItem(INVITATION_INTENT_KEY)).toBeNull();
  });

  it("una entrada ilegible se borra", () => {
    window.localStorage.setItem(INVITATION_INTENT_KEY, "{no es json");
    expect(readInvitationIntent(0)).toBeNull();
    expect(window.localStorage.getItem(INVITATION_INTENT_KEY)).toBeNull();
  });

  it("clearInvitationIntent la borra", () => {
    save(Date.now());
    clearInvitationIntent();
    expect(window.localStorage.getItem(INVITATION_INTENT_KEY)).toBeNull();
  });

  it("al montar la app con sesión y una intención vigente, va a /invitacion", () => {
    save(Date.now() - DAY);
    render(createElement(InvitationReturn));
    expect(router.replace).toHaveBeenCalledWith("/invitacion");
  });

  it("con una intención vencida no va a /invitacion y la borra", () => {
    save(Date.now() - 8 * DAY);
    render(createElement(InvitationReturn));
    expect(router.replace).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(INVITATION_INTENT_KEY)).toBeNull();
  });

  it("al cerrar sesión se borra (aviso S3), también los pares pendientes de quien invita (F55-3)", () => {
    save(Date.now());
    tokenIntent("create").save({ idempotencyKey: "k", token: TOKEN, email: "t@c.com" });
    render(createElement(ForgetInvitationIntent));
    expect(window.localStorage.getItem(INVITATION_INTENT_KEY)).toBeNull();
    expect(tokenIntent("create").pending()).toBeNull();
  });
});

describe("cuándo se borra desde /invitacion", () => {
  const actions = (overrides: Partial<InvitationActions> = {}): InvitationActions => ({
    inspect: vi.fn().mockResolvedValue({ state: "valid", inviterName: "Sara", expiresAt: EXPIRES, email: "tomas@correo.com", myName: "Tomás" }),
    accept: vi.fn().mockResolvedValue({ status: "ok", value: { groupId: "g" } }),
    checkStatus: vi.fn().mockResolvedValue({ state: "not_found" }),
    ...overrides,
  });

  it("al aceptar", async () => {
    const user = userEvent.setup();
    save(Date.now());
    window.history.replaceState(null, "", "/invitacion");
    render(createElement(InvitationScreen, { actions: actions() }));
    await user.click(await screen.findByRole("button", { name: copy.couple.invitation.valid.accept }));
    await act(async () => {});
    expect(window.localStorage.getItem(INVITATION_INTENT_KEY)).toBeNull();
  });

  it("con «Ahora no»", async () => {
    const user = userEvent.setup();
    save(Date.now());
    window.history.replaceState(null, "", "/invitacion");
    render(createElement(InvitationScreen, { actions: actions() }));
    await user.click(await screen.findByRole("button", { name: copy.couple.invitation.valid.later }));
    expect(window.localStorage.getItem(INVITATION_INTENT_KEY)).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("al ver M7", async () => {
    save(Date.now());
    window.history.replaceState(null, "", "/invitacion");
    render(createElement(InvitationScreen, { actions: actions({ inspect: vi.fn().mockResolvedValue({ state: "invalid", reason: "generic" }) }) }));
    await screen.findByRole("heading", { level: 1, name: copy.couple.invitation.invalid });
    await act(async () => {});
    expect(window.localStorage.getItem(INVITATION_INTENT_KEY)).toBeNull();
  });

  it("sin sesión (M5) se conserva para volver tras entrar", async () => {
    save(Date.now());
    window.history.replaceState(null, "", "/invitacion");
    render(createElement(InvitationScreen, { actions: actions({ inspect: vi.fn().mockResolvedValue({ state: "signedOut" }) }) }));
    await screen.findByRole("heading", { level: 1, name: copy.couple.invitation.signedOut.title });
    expect(readInvitationIntent()).toBe(TOKEN);
  });
});
