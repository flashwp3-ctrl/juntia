// T050 / FR-065; US-1, US-7; ADR-011 §2, fila 15. Spec E2E 1 «Acceso y Mi cuenta» (nace en el PR B; el PR C le suma la
// descarga de Exportar). Criterio literal (tasks.md, T050): «registro de un correo permitido → enlace en Mailpit → A1 con
// aviso → entrar → A6 sin "Invitar a mi pareja" → Inicio; registro no permitido → la misma pantalla y ninguna cuenta;
// ruta protegida sin sesión → `/entrar` → vuelve a la ruta; Mi cuenta: perfil, apariencia en oscuro y un segundo contexto
// que entra y tiene `data-theme="dark"` antes de `<body>`; recuperación uniforme; `/auth/confirm` (Route Handler, con la
// app y Mailpit): enlace de verificación válido → A1 con aviso, enlace caducado y enlace ya usado → aviso de enlace
// caducado sin datos de la cuenta, enlace de recuperación válido → A5; cerrar sesión → S3 y ninguna ruta de producto sin
// volver a entrar».
// Solo Chromium, movimiento reducido y ninguna espera fija (ADR-011 §6). Cada test que cambia una cuenta siembra la suya.
import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";
import { runnerSql } from "../integration/support/sql";
import { confirmLink } from "../support/mailpit";
import { seedUser } from "../support/seed";
import { expect, signInContext, test } from "./fixtures";

const anonymous = { cookies: [], origins: [] };
test.use({ storageState: anonymous });

const sqlText = (value: string) => `'${value.replace(/'/g, "''")}'`;
const userCount = (email: string) => runnerSql(`select count(*) from auth.users where email=${sqlText(email)}`);

async function mailLink(email: string, type: "signup" | "recovery") {
  let link: string | null = null;
  await expect.poll(async () => (link = await confirmLink(email, type)), { message: `correo de ${type}`, timeout: 15_000 }).not.toBeNull();
  return link!;
}

async function signUpWith(page: Page, name: string, email: string, password: string) {
  await page.goto("/crear-cuenta");
  await page.getByRole("textbox", { name: copy.auth.signUp.nameLabel }).fill(name);
  await page.getByRole("textbox", { name: copy.auth.fields.email }).fill(email);
  await page.getByLabel(copy.auth.fields.password, { exact: true }).fill(password);
  await page.getByText(copy.auth.signUp.acknowledge).click();
  await page.getByRole("button", { name: copy.auth.signUp.submit }).click();
  await expect(page).toHaveURL(/\/verificar-correo$/);
  await expect(page.getByRole("heading", { level: 1, name: copy.auth.verifyEmail.title })).toBeVisible();
  return (await page.locator("main").innerText()).trim();
}

async function signInWith(page: Page, email: string, password: string) {
  await page.getByRole("textbox", { name: copy.auth.fields.email }).fill(email);
  await page.getByLabel(copy.auth.fields.password, { exact: true }).fill(password);
  await page.getByRole("button", { name: copy.auth.signIn.submit }).click();
}

test("registro permitido: Mailpit → A1 con aviso → entrar → A6 sin pareja → Inicio; el enlace usado ya no sirve", async ({ page }) => {
  const email = `signup-${randomUUID().slice(0, 8)}@seed.test`;
  const password = `Clave-${randomUUID().slice(0, 8)}`;
  runnerSql(`insert into juntia_data.signup_allowlist(email) values (${sqlText(email)})`);
  try {
    await signUpWith(page, "Sara Nueva", email, password);
    expect(userCount(email)).toBe("1");
    const link = await mailLink(email, "signup");

    await page.goto(link);
    await expect(page).toHaveURL(/\/entrar\?aviso=verificado$/);
    await expect(page.getByText(copy.auth.signIn.verified)).toBeVisible();

    await signInWith(page, email, password);
    await expect(page).toHaveURL(/\/primera-entrada/);
    await expect(page.getByRole("heading", { level: 1, name: copy.auth.firstEntry.greeting("Sara Nueva") })).toBeVisible();
    await expect(page.getByText(copy.auth.firstEntry.noBudget)).toBeVisible();
    await expect(page.getByText("Invitar a mi pareja")).toHaveCount(0);
    await page.getByRole("button", { name: copy.auth.firstEntry.continue }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: copy.nav.home })).toBeVisible();

    // Enlace ya usado: aviso de enlace caducado, sin ningún dato de la cuenta.
    await page.context().clearCookies();
    await page.goto(link);
    await expect(page).toHaveURL(/\/recuperar\?enlace=caducado$/);
    await expect(page.getByText(copy.auth.recover.linkExpired)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(email);
    await expect(page.locator("body")).not.toContainText("Sara Nueva");
  } finally {
    runnerSql(`delete from juntia_data.signup_allowlist where email=${sqlText(email)}`);
  }
});

test("registro no permitido o de una cuenta existente: la misma pantalla y ninguna cuenta nueva", async ({ page, sara }) => {
  const allowed = `signup-${randomUUID().slice(0, 8)}@seed.test`;
  runnerSql(`insert into juntia_data.signup_allowlist(email) values (${sqlText(allowed)})`);
  try {
    const allowedScreen = await signUpWith(page, "Persona", allowed, `Clave-${randomUUID().slice(0, 8)}`);
    const outsider = `fuera-${randomUUID().slice(0, 8)}@no-permitido.test`;
    expect(await signUpWith(page, "Persona", outsider, `Clave-${randomUUID().slice(0, 8)}`)).toBe(allowedScreen);
    expect(userCount(outsider)).toBe("0");
    // 422 user_already_exists (la Sara sembrada de este worker): tampoco se distingue.
    expect(await signUpWith(page, "Persona", sara.email, `Clave-${randomUUID().slice(0, 8)}`)).toBe(allowedScreen);
    expect(userCount(sara.email)).toBe("1");
  } finally {
    runnerSql(`delete from juntia_data.signup_allowlist where email=${sqlText(allowed)}`);
  }
});

test("ruta protegida sin sesión → /entrar → vuelve a la ruta, sin caché compartida", async ({ page }) => {
  await page.goto("/actividad?mes=2026-10");
  await expect(page).toHaveURL(/\/entrar\?volver=%2Factividad%3Fmes%3D2026-10$/);
  // El usuario se siembra después de comprobar la redirección: sin protección, la prueba falla antes de sembrar.
  const user = await seedUser({ role: "volver", index: test.info().parallelIndex });
  await signInWith(page, user.email, user.password);
  await expect(page).toHaveURL(/\/actividad\?mes=2026-10$/);
  const response = await page.goto("/cuenta");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"] ?? "").toMatch(/private/);
  expect(response?.headers()["cache-control"] ?? "").toMatch(/no-store/);
  // Un `volver` externo nunca sale de Juntia (research R8.7).
  await page.context().clearCookies();
  await page.goto(`/entrar?volver=${encodeURIComponent("//evil.example")}`);
  await signInWith(page, user.email, user.password);
  await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/);
});

test("Mi cuenta: perfil, apariencia en oscuro y un segundo dispositivo oscuro antes de <body>", async ({ page, browser, baseURL }) => {
  const user = await seedUser({ role: "tema", index: test.info().parallelIndex });
  await signInContext(page.context(), user);
  await page.emulateMedia({ colorScheme: "light" });

  await page.goto("/cuenta/perfil");
  const name = page.getByRole("textbox", { name: copy.account.profile.nameLabel });
  await expect(name).toHaveValue("Sara");
  await expect(page.getByRole("textbox", { name: copy.account.profile.emailLabel })).toHaveValue(user.email);
  await name.fill("Sara Gómez");
  await page.getByRole("button", { name: copy.account.profile.save }).click();
  await expect(page.getByText(copy.account.profile.saved)).toBeVisible();
  expect(runnerSql(`select display_name from juntia_data.profiles where user_id='${user.id}'`)).toBe("Sara Gómez");

  await page.goto("/cuenta/apariencia");
  await page.getByRole("radio", { name: copy.account.appearance.dark }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => runnerSql(`select theme from juntia_data.profiles where user_id='${user.id}'`)).toBe("dark");
  expect((await page.context().cookies()).find(({ name: cookie }) => cookie === "juntia_theme")?.value).toBe("dark");

  // Segundo dispositivo: sin cookies y con el sistema en claro. Registra el tema en el instante en que aparece <body>.
  const other = await browser.newContext({ baseURL, reducedMotion: "reduce", colorScheme: "light" });
  await other.addInitScript(() => {
    new MutationObserver((_, observer) => {
      if (!document.body) return;
      (window as unknown as { themeAtBody: string | null }).themeAtBody = document.documentElement.getAttribute("data-theme");
      observer.disconnect();
    }).observe(document.documentElement, { childList: true, subtree: true });
  });
  const second = await other.newPage();
  await second.goto("/entrar");
  await signInWith(second, user.email, user.password);
  await expect(second).toHaveURL(/\/$/);
  // La acción de entrar navega con una carga completa: el primer cuadro de Inicio ya es oscuro.
  expect(await second.evaluate(() => (window as unknown as { themeAtBody: string | null }).themeAtBody)).toBe("dark");
  await expect(second.locator("html")).toHaveAttribute("data-theme", "dark");
  await other.close();
});

test("recuperación uniforme; /auth/confirm caducado → aviso sin datos; enlace válido → A5", async ({ page }) => {
  await page.goto("/recuperar");
  const email = page.getByRole("textbox", { name: copy.auth.fields.email });
  await email.fill(`nadie-${randomUUID().slice(0, 8)}@seed.test`);
  await page.getByRole("button", { name: copy.auth.recover.submit }).click();
  await expect(page.getByText(copy.auth.recover.sent)).toBeVisible();
  const unknownScreen = (await page.locator("main").innerText()).replace(/\S+@seed\.test/g, "");

  // Caducado: un enlace real de un usuario cuyo envío se fecha dos horas atrás (otp_expiry = 3600 s).
  const expiring = await seedUser({ role: "caducado", index: test.info().parallelIndex });
  await page.goto("/recuperar");
  await page.getByRole("textbox", { name: copy.auth.fields.email }).fill(expiring.email);
  await page.getByRole("button", { name: copy.auth.recover.submit }).click();
  await expect(page.getByText(copy.auth.recover.sent)).toBeVisible();
  expect((await page.locator("main").innerText()).replace(/\S+@seed\.test/g, "")).toBe(unknownScreen);
  const expiredLink = await mailLink(expiring.email, "recovery");
  runnerSql(`update auth.users set recovery_sent_at = now() - interval '2 hours' where id='${expiring.id}'`);
  await page.goto(expiredLink);
  await expect(page).toHaveURL(/\/recuperar\?enlace=caducado$/);
  await expect(page.getByText(copy.auth.recover.linkExpired)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(expiring.email);

  // Válido: otra cuenta pide el enlace y crea una contraseña nueva en A5.
  const recovering = await seedUser({ role: "recupera", index: test.info().parallelIndex });
  await page.goto("/recuperar");
  await page.getByRole("textbox", { name: copy.auth.fields.email }).fill(recovering.email);
  await page.getByRole("button", { name: copy.auth.recover.submit }).click();
  await expect(page.getByText(copy.auth.recover.sent)).toBeVisible();
  await page.goto(await mailLink(recovering.email, "recovery"));
  await expect(page).toHaveURL(/\/nueva-contrasena$/);
  await expect(page.getByRole("heading", { level: 1, name: copy.auth.newPassword.title })).toBeVisible();
  const fresh = `Nueva-${randomUUID().slice(0, 8)}`;
  await page.getByLabel(copy.auth.newPassword.label, { exact: true }).fill(fresh);
  await page.getByLabel(copy.auth.newPassword.repeat, { exact: true }).fill(fresh);
  await page.getByRole("button", { name: copy.auth.newPassword.submit }).click();
  await expect(page).toHaveURL(/\/$/);
  // La contraseña nueva vale para entrar.
  await page.context().clearCookies();
  await page.goto("/entrar");
  await signInWith(page, recovering.email, fresh);
  await expect(page).toHaveURL(/\/$/);
});

test("cerrar sesión → S3 y ninguna ruta de producto sin volver a entrar", async ({ page }) => {
  const user = await seedUser({ role: "salida", index: test.info().parallelIndex });
  await signInContext(page.context(), user);
  await page.goto("/cuenta/seguridad");
  await expect(page.getByRole("textbox", { name: copy.account.profile.emailLabel })).toHaveValue(user.email);
  await page.getByRole("button", { name: copy.account.signOut.label }).click();
  await expect(page).toHaveURL(/\/entrar\?aviso=sesion-cerrada$/);
  await expect(page.getByText(copy.auth.signIn.signedOut)).toBeVisible();
  for (const route of ["/", "/actividad", "/cuenta", "/cuenta/perfil"]) {
    await page.goto(route);
    await expect(page, route).toHaveURL(/\/entrar\?volver=/);
  }
});
