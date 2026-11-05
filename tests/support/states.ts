// T051, T057: cómo se llega a cada estado del registro de rutas, compartido por axe y por las capturas de evidencia.
// Las sesiones salen siempre de la siembra del runner (T049), nunca de juntia-dev ni de producción.
import { randomUUID } from "node:crypto";
import { expect, type Browser, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";
import type { RouteEntry } from "../a11y/route-registry";
import { recoveryLink, seedUnconfirmedUser, seedUser } from "./seed";

export const fillSignIn = async (page: Page, email: string, password: string) => {
  await page.getByRole("textbox", { name: copy.auth.fields.email }).fill(email);
  await page.getByLabel(copy.auth.fields.password, { exact: true }).fill(password);
  await page.getByRole("button", { name: copy.auth.signIn.submit }).click();
};

/** Lleva la página al estado de la entrada. Cada caso espera el texto que lo prueba. */
export async function reach(page: Page, entry: RouteEntry, index: number) {
  await reachState(page, entry, index);
  // Axe audita el estado en reposo: el puntero que acaba de pulsar no deja un botón en hover. El contraste de
  // action.primaryHover en oscuro (4,32:1 con text.onAction) es un hallazgo de tokens que se reporta aparte.
  if (entry.prepare) await page.mouse.move(0, 0);
}

async function reachState(page: Page, entry: RouteEntry, index: number) {
  switch (entry.prepare) {
    case "networkError": // Job app: Supabase inaccesible a propósito; es el error de red real (A1d).
      await fillSignIn(page, `axe-${randomUUID().slice(0, 8)}@seed.test`, "Clave-de-prueba");
      return expect(page.getByText(copy.auth.networkError)).toBeVisible();
    case "invalidCredentials":
      await fillSignIn(page, `axe-${randomUUID().slice(0, 8)}@seed.test`, "Clave-de-prueba");
      return expect(page.getByText(copy.auth.signIn.invalidCredentials)).toBeVisible();
    case "unverified": {
      const user = await seedUnconfirmedUser(index);
      await fillSignIn(page, user.email, user.password);
      return expect(page.getByText(copy.auth.signIn.notVerified)).toBeVisible();
    }
    case "signUpInvalid":
      await page.getByRole("button", { name: copy.auth.signUp.submit }).click();
      return expect(page.getByText(copy.account.profile.errors.displayName)).toBeVisible();
    case "recoverSent":
      await page.getByRole("textbox", { name: copy.auth.fields.email }).fill(`axe-${randomUUID().slice(0, 8)}@seed.test`);
      await page.getByRole("button", { name: copy.auth.recover.submit }).click();
      return expect(page.getByText(copy.auth.recover.sent)).toBeVisible();
    case "sessionExpired": // T048: la sesión caduca con la página abierta; lo escrito se conserva.
      await page.context().clearCookies();
      await page.getByRole("textbox", { name: copy.account.profile.nameLabel }).fill("Sara caducada");
      await page.getByRole("button", { name: copy.account.profile.save }).click();
      await expect(page.getByText(copy.errors.sessionExpired)).toBeVisible();
      return expect(page.getByRole("textbox", { name: copy.account.profile.nameLabel })).toHaveValue("Sara caducada");
    case "exportSheet":
      await page.getByRole("button", { name: new RegExp(copy.account.privacy.export) }).click();
      return expect(page.getByRole("dialog", { name: copy.account.export.title })).toBeVisible();
    default:
      return undefined;
  }
}

/** Página con la sesión que necesita la entrada: ninguna, una de usuario sembrada o la de recuperación de /auth/confirm. */
export async function openWithSession(browser: Browser, page: Page, entry: RouteEntry, colorScheme: "light" | "dark", width: number, index: number, baseURL: string, cookies: { name: string; value: string; domain: string; path: string }[] = []) {
  if (entry.session === "none" && cookies.length === 0) return page;
  const context = await browser.newContext({ baseURL, reducedMotion: "reduce", colorScheme, viewport: { width, height: 900 } });
  if (cookies.length) await context.addCookies(cookies);
  const target = await context.newPage();
  if (entry.session === "recovery") {
    const user = await seedUser({ role: "estado-a5", index });
    await target.goto(await recoveryLink(user.email, baseURL));
    await expect(target).toHaveURL(/\/nueva-contrasena$/);
  } else if (entry.session === "user") {
    const user = await seedUser({ role: entry.firstEntryPending ? "estado-a6" : "estado", index, firstEntryCompleted: !entry.firstEntryPending });
    await context.addCookies(user.cookies);
  }
  return target;
}
