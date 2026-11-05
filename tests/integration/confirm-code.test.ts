// Enmienda del 5 de noviembre de 2026 (quickstart §3, paso 1; decisión de Alejandro, «Adaptar la app»). Capa:
// integración de servidor (job db), sin navegador ni spec E2E nueva. Los proyectos alojados en Free mandan la plantilla
// por defecto: {{ .ConfirmationURL }} = <API>/auth/v1/verify?token=<token_hash>&type=…&redirect_to=<emailRedirectTo>.
// Aquí se construye esa misma URL con el token del correo de Mailpit y se recorre contra el GoTrue real del runner:
// verify → 303 a /auth/confirm?next=…&code=… → resolveConfirm canjea el code con el verificador PKCE del mismo
// «navegador» (almacén de cookies), falla sin él y trata el enlace repetido como caducado.
// F43-3 y F43-4 (revisión del PR #43): con el amr real de las sesiones del GoTrue del runner, el flujo no depende de
// `next` y A5 solo acepta una sesión de recuperación reciente.
import { randomUUID } from "node:crypto";
import { afterAll, expect, it, vi } from "vitest";
import { linkNoticeFromHash, resolveConfirm, type ConfirmAuth } from "@/features/auth/confirm";
import { isRecentRecovery } from "@/features/auth/recovery-session";
import { copy } from "@/lib/copy/es";
import { confirmLink } from "../support/mailpit";
import { cookieJarClient, seedUser } from "../support/seed";
import { runnerEnv } from "./support/env";
import { runnerSql } from "./support/sql";

const SITE = "http://localhost:3000";
const emails: string[] = [];
afterAll(() => { for (const email of emails) runnerSql(`delete from juntia_data.signup_allowlist where email='${email}'`); });

const authOf = (client: ReturnType<typeof cookieJarClient>["client"]): ConfirmAuth => ({
  verifyOtp: (args) => client.auth.verifyOtp(args),
  exchangeCodeForSession: (code) => client.auth.exchangeCodeForSession(code),
  // Igual que src/app/auth/confirm/route.ts.
  authMethods: async () => {
    const amr = (await client.auth.getClaims()).data?.claims.amr;
    return Array.isArray(amr) ? amr.map((entry: { method?: unknown }) => String(entry.method)) : [];
  },
});
const amrOf = async (client: ReturnType<typeof cookieJarClient>["client"]) => JSON.stringify((await client.auth.getClaims()).data?.claims.amr);

async function tokenHash(email: string, type: "signup" | "recovery") {
  let link: string | null = null;
  await vi.waitFor(async () => { link = await confirmLink(email, type); expect(link).not.toBeNull(); }, { timeout: 15_000, interval: 250 });
  return new URL(link!).searchParams.get("token_hash")!;
}

/** El enlace de la plantilla por defecto, seguido una vez como lo haría el navegador. Devuelve la URL de /auth/confirm. */
async function followDefaultLink(hash: string, type: "signup" | "recovery", next: "signup" | "recovery") {
  const verify = new URL("/auth/v1/verify", runnerEnv().apiUrl);
  verify.search = new URLSearchParams({ token: hash, type, redirect_to: `${SITE}/auth/confirm?next=${next}` }).toString();
  const response = await fetch(verify, { redirect: "manual" });
  expect([302, 303]).toContain(response.status);
  return new URL(response.headers.get("location")!);
}

it("registro por la plantilla por defecto: code canjeado en el mismo navegador; repetido → caducado; otro navegador → verificado sin sesión", async () => {
  const email = `code-${randomUUID().slice(0, 8)}@seed.test`;
  emails.push(email);
  runnerSql(`insert into juntia_data.signup_allowlist(email) values ('${email}')`);
  const browser = cookieJarClient();
  const signUp = await browser.client.auth.signUp({ email, password: `Clave-${randomUUID()}`, options: { emailRedirectTo: `${SITE}/auth/confirm?next=signup` } });
  expect(signUp.error).toBeNull();
  const hash = await tokenHash(email, "signup");

  const landing = await followDefaultLink(hash, "signup", "signup");
  expect(landing.pathname).toBe("/auth/confirm");
  expect(landing.searchParams.get("next")).toBe("signup");
  expect(landing.searchParams.get("code")).toBeTruthy();
  // Otro navegador, sin verificador: el correo ya quedó confirmado por /auth/v1/verify.
  const other = cookieJarClient();
  expect(await resolveConfirm(landing.searchParams, authOf(other.client))).toEqual({ to: "/entrar?aviso=verificado", session: null });
  expect(runnerSql(`select email_confirmed_at is not null from auth.users where email='${email}'`)).toBe("t");
  // El mismo navegador canjea el code y obtiene la sesión.
  expect(await resolveConfirm(landing.searchParams, authOf(browser.client))).toEqual({ to: "/entrar?aviso=verificado", session: "signup" });
  expect((await browser.client.auth.getClaims()).data?.claims.email).toBe(email);

  // El mismo enlace otra vez: Auth redirige con el error, en la consulta (→ caducado) o en el fragmento (→ Entrar, que
  // lee el fragmento y muestra el aviso de enlace caducado). Las dos terminan en el mismo texto.
  const again = await followDefaultLink(hash, "signup", "signup");
  expect(again.searchParams.get("code")).toBeNull();
  const outcome = await resolveConfirm(again.searchParams, authOf(cookieJarClient().client));
  console.log(`enlace repetido: ${again.search ? "error en la consulta" : "error en el fragmento"} → ${outcome.to}`);
  if (again.searchParams.get("error") || again.searchParams.get("error_code")) expect(outcome).toEqual({ to: "/recuperar?enlace=caducado", session: null });
  else {
    expect(outcome).toEqual({ to: "/entrar?aviso=enlace", session: null });
    expect(linkNoticeFromHash(again.hash)).toBe(copy.auth.recover.linkExpired);
  }
});

it("recuperación por la plantilla por defecto: el mismo navegador obtiene la sesión de A5; otro navegador no", async () => {
  const user = await seedUser({ role: "code-recupera", index: 0 });
  const browser = cookieJarClient();
  expect((await browser.client.auth.resetPasswordForEmail(user.email, { redirectTo: `${SITE}/auth/confirm?next=recovery` })).error).toBeNull();
  const landing = await followDefaultLink(await tokenHash(user.email, "recovery"), "recovery", "recovery");
  expect(landing.searchParams.get("code")).toBeTruthy();
  expect(await resolveConfirm(landing.searchParams, authOf(cookieJarClient().client))).toEqual({ to: "/recuperar?enlace=otro-navegador", session: null });
  expect(await resolveConfirm(landing.searchParams, authOf(browser.client))).toEqual({ to: "/nueva-contrasena", session: "recovery" });
  expect((await browser.client.auth.getClaims()).data?.claims.sub).toBe(user.id);
});

async function signUpLink(next: "signup" | "recovery") {
  const email = `code-${randomUUID().slice(0, 8)}@seed.test`;
  emails.push(email);
  runnerSql(`insert into juntia_data.signup_allowlist(email) values ('${email}')`);
  const browser = cookieJarClient();
  expect((await browser.client.auth.signUp({ email, password: `Clave-${randomUUID()}`, options: { emailRedirectTo: `${SITE}/auth/confirm?next=${next}` } })).error).toBeNull();
  return { browser, landing: await followDefaultLink(await tokenHash(email, "signup"), "signup", next) };
}
async function recoveryLink(next: "signup" | "recovery") {
  const user = await seedUser({ role: "code-recupera", index: 0 });
  const browser = cookieJarClient();
  expect((await browser.client.auth.resetPasswordForEmail(user.email, { redirectTo: `${SITE}/auth/confirm?next=${next}` })).error).toBeNull();
  return { user, browser, landing: await followDefaultLink(await tokenHash(user.email, "recovery"), "recovery", next) };
}

it("F43-3: un code de registro con next=recovery sigue el flujo de registro (sin A5)", async () => {
  const { browser, landing } = await signUpLink("recovery");
  expect(landing.searchParams.get("next")).toBe("recovery");
  expect(await resolveConfirm(landing.searchParams, authOf(browser.client))).toEqual({ to: "/entrar?aviso=verificado", session: "signup" });
  console.log(`amr de la sesión de registro: ${await amrOf(browser.client)}`);
});

it("F43-3: un code de recuperación con next=signup sigue el flujo de recuperación (A5, sesión conservada)", async () => {
  const { browser, landing } = await recoveryLink("signup");
  expect(landing.searchParams.get("next")).toBe("signup");
  expect(await resolveConfirm(landing.searchParams, authOf(browser.client))).toEqual({ to: "/nueva-contrasena", session: "recovery" });
  console.log(`amr de la sesión de recuperación: ${await amrOf(browser.client)}`);
});

it("F43-4: A5 acepta la sesión de recuperación y rechaza una sesión iniciada con contraseña", async () => {
  const signedIn = await seedUser({ role: "a5-normal", index: 0 });
  const normal = (await signedIn.client.auth.getClaims()).data?.claims;
  console.log(`amr de una sesión con contraseña: ${JSON.stringify(normal?.amr)}`);
  expect(isRecentRecovery(normal)).toBe(false);
  const { browser, landing } = await recoveryLink("recovery");
  await resolveConfirm(landing.searchParams, authOf(browser.client));
  expect(isRecentRecovery((await browser.client.auth.getClaims()).data?.claims)).toBe(true);
});

it("camino token_hash (plantillas del repo): verifyOtp de recuperación → A5, amr «otp» aceptado por la guarda de A5", async () => {
  const user = await seedUser({ role: "token-recupera", index: 0 });
  const browser = cookieJarClient();
  expect((await browser.client.auth.resetPasswordForEmail(user.email, { redirectTo: `${SITE}/auth/confirm?next=recovery` })).error).toBeNull();
  const params = new URLSearchParams({ token_hash: await tokenHash(user.email, "recovery"), type: "recovery" });
  // Un type cambiado no verifica: el token de recuperación no vale como registro.
  expect(await resolveConfirm(new URLSearchParams({ token_hash: params.get("token_hash")!, type: "signup" }), authOf(cookieJarClient().client))).toEqual({ to: "/recuperar?enlace=caducado", session: null });
  const other = cookieJarClient();
  expect(await resolveConfirm(params, authOf(other.client))).toEqual({ to: "/nueva-contrasena", session: "recovery" });
  const claims = (await other.client.auth.getClaims()).data?.claims;
  console.log(`amr de la sesión de recuperación por token_hash: ${JSON.stringify(claims?.amr)}`);
  expect(isRecentRecovery(claims)).toBe(true);
});
