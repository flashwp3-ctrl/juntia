// T051, T057: cómo se llega a cada estado del registro de rutas, compartido por axe y por las capturas de evidencia.
// Las sesiones salen siempre de la siembra del runner (T049), nunca de juntia-dev ni de producción.
import { randomUUID } from "node:crypto";
import { expect, type Browser, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";
import type { RouteEntry } from "../a11y/route-registry";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { completeGoal, contributeToGoal, createGoal, getGoal } from "../../src/lib/db/goals";
import { futureMonth, recoveryLink, seedCoupleState, seedMovements, seedUnconfirmedUser, seedUser } from "./seed";

const paths = new WeakMap<Page, string>();
/** La ruta de la entrada con sus marcadores resueltos ({id}, {future}) para la cuenta sembrada de esta página. */
export const targetPath = (page: Page, entry: RouteEntry) => paths.get(page) ?? entry.path;

/**
 * P0-1, PR D (T084, T098). Anotar se abre con `N` (FR-035), que funciona igual con la barra de 390 y el sidebar de 1440,
 * y espera a que la hoja (o el diálogo) tenga el foco en el monto. Los importes salen del dataset dorado de la spec.
 */
async function openAnnotate(page: Page) {
  // Marca 1c: el oyente de `N` llega al hidratar, y con las etiquetas de la imagen para compartir la hidratación puede llegar
  // después del `load`. Se espera la marca de hidratación del shell, como annotate.e2e.ts (005, PR B, corrección 6).
  await expect(page.locator("[data-context-selector][data-hydrated]").first()).toBeAttached();
  await page.locator("body").focus();
  await page.keyboard.press("n");
  const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
  return sheet;
}
async function fillAnnotate(page: Page, amount = "45000") {
  const sheet = await openAnnotate(page);
  await page.keyboard.type(amount);
  // La primera categoría de la rejilla (2 toques más el monto, 02·5).
  await sheet.getByRole("radiogroup", { name: copy.annotate.category }).getByRole("radio").first().click();
  return sheet;
}
/** Peticiones de Server Action (POST con la cabecera `next-action`): las intercepta E4 (sin respuesta) y el error. */
const isAction = (method: string, headers: Record<string, string>) => method === "POST" && "next-action" in headers;

async function openExport(page: Page) {
  await page.getByRole("button", { name: new RegExp(copy.account.privacy.export) }).click();
  await expect(page.getByRole("dialog", { name: copy.account.export.title })).toBeVisible();
}

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
      return openExport(page);
    case "exportPreparing": // D3: la respuesta no llega mientras se audita.
      await page.route("**/api/export**", () => undefined);
      await openExport(page);
      await page.getByRole("button", { name: copy.account.export.prepare }).click();
      return expect(page.getByText(copy.account.export.preparing)).toBeVisible();
    case "exportReady": // D4, con el archivo real del servidor.
      await openExport(page);
      await page.getByRole("button", { name: copy.account.export.prepare }).click();
      return expect(page.getByRole("link", { name: copy.account.export.download })).toBeVisible();
    case "exportFailed": // D5: el servidor responde 500.
      await page.route("**/api/export**", (route) => route.fulfill({ status: 500, body: "" }));
      await openExport(page);
      await page.getByRole("button", { name: copy.account.export.prepare }).click();
      return expect(page.getByText(copy.account.export.failed)).toBeVisible();
    case "annotate": { // E1: monto y categoría reciente; Guardar habilitado.
      const sheet = await fillAnnotate(page);
      return expect(sheet.getByRole("button", { name: /^Guardar/ })).not.toHaveAttribute("aria-disabled", "true");
    }
    case "annotateIncome": { // E1 con «Ingreso» en el selector (Q3).
      await openAnnotate(page);
      await page.keyboard.type("86000");
      // Del monto al selector (Shift+Tab) y la flecha elige «Ingreso» (radiogroup con foco itinerante).
      await page.keyboard.press("Shift+Tab");
      await expect(page.getByRole("radio", { name: copy.annotate.expense, exact: true }), "el foco llega al selector").toBeFocused();
      await page.keyboard.press("ArrowRight");
      const sheet = page.getByRole("dialog", { name: copy.annotate.title.income });
      await expect(sheet, "la hoja pasa a ingreso").toBeVisible();
      return expect(sheet.getByRole("radio", { name: copy.categories.income }), "con «Ingresos» elegida").toHaveAttribute("aria-checked", "true");
    }
    case "annotateDetails": { // E2: con descripción escrita; la rejilla, la fecha y «Solo tú» ya están a la vista (comp 06, 1c).
      const sheet = await fillAnnotate(page);
      await sheet.getByRole("textbox", { name: copy.annotate.description }).fill("Carulla Laureles");
      return expect(sheet.getByText(copy.annotate.onlyYou)).toBeVisible();
    }
    case "annotateInvalid": { // E3: monto 0.
      await fillAnnotate(page, "0");
      return expect(page.getByText(copy.annotate.errors.amountOutOfRange)).toBeVisible();
    }
    case "annotateSaving": { // E4 nueva (guardado optimista): la Server Action no responde; la hoja se oculta y la fila queda «Guardando…».
      await page.route("**/*", (route) => (isAction(route.request().method(), route.request().headers()) ? undefined : route.fallback()));
      const sheet = await fillAnnotate(page);
      await sheet.getByRole("button", { name: /^Guardar/ }).click();
      await expect(sheet, "la hoja se oculta").toBeHidden();
      return expect(page.locator("[data-pending='saving']:visible"), "la fila en vuelo aparece, marcada «Guardando…»").toHaveCount(1);
    }
    case "annotateFailed": { // La red cae al guardar: la hoja sigue abierta, con el aviso y su botón Reintentar.
      await page.route("**/*", (route) => (isAction(route.request().method(), route.request().headers()) ? route.abort("failed") : route.fallback()));
      const sheet = await fillAnnotate(page);
      await sheet.getByRole("button", { name: /^Guardar/ }).click();
      return expect(sheet.getByRole("alert").getByRole("button", { name: copy.annotate.retry })).toBeVisible();
    }
    case "annotateSaved": { // E5: guardado real; el foco en «Deshacer» pausa el aviso mientras se audita.
      const sheet = await fillAnnotate(page);
      await sheet.getByRole("button", { name: /^Guardar/ }).click();
      await expect(sheet).toBeHidden();
      const undo = page.getByRole("status").getByRole("button", { name: copy.annotate.undo });
      await undo.focus();
      return expect(page.locator("a[data-new]:visible")).toBeVisible();
    }
    case "edit": {
      await page.getByRole("button", { name: copy.detail.edit, exact: true }).click();
      const sheet = page.getByRole("dialog", { name: copy.annotate.editTitle.expense });
      await expect(sheet, "la hoja de edición se abre").toBeVisible();
      const amount = sheet.getByRole("textbox", { name: copy.annotate.amount });
      await expect(amount, "con el foco en el monto").toBeFocused();
      // Como lo haría una persona: seleccionar el monto y escribir otro.
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type("47000");
      await expect(amount).toHaveValue("47.000");
      return expect(sheet.getByRole("button", { name: copy.annotate.saveChanges })).not.toHaveAttribute("aria-disabled", "true");
    }
    case "deleteDialog": {
      await page.getByRole("button", { name: copy.remove.action.expense }).click();
      return expect(page.getByRole("alertdialog", { name: copy.remove.title.expense })).toBeVisible();
    }
    case "inviteSheet": { // M3: la hoja con el campo del correo.
      await page.getByRole("button", { name: copy.couple.none.invite }).click();
      return expect(page.getByRole("dialog", { name: copy.couple.invite.title }).getByRole("textbox", { name: copy.couple.invite.email })).toBeVisible();
    }
    case "inviteReady": { // M3b: invitación real creada por la Server Action; el enlace se ve una vez.
      await page.getByRole("button", { name: copy.couple.none.invite }).click();
      const sheet = page.getByRole("dialog", { name: copy.couple.invite.title });
      await sheet.getByRole("textbox", { name: copy.couple.invite.email }).fill(`pareja-${randomUUID().slice(0, 8)}@seed.test`);
      await sheet.getByRole("button", { name: copy.couple.invite.create }).click();
      return expect(sheet.getByText(copy.couple.invite.ready)).toBeVisible();
    }
    case "cancelDialog": // SensitiveActionConfirmation, con el foco en «Mantener».
      await page.getByRole("button", { name: copy.couple.pending.cancel }).click();
      return expect(page.getByRole("alertdialog", { name: copy.couple.cancel.title }).getByRole("button", { name: copy.couple.cancel.keep })).toBeFocused();
    case "us": // El contexto recordado es Nosotros (addInitScript en openWithSession).
      // 005 T019: con pareja activa no hay «Todavía no disponible»: se espera la vista de Nosotros ya cargada.
      if (entry.couple === "active") {
        await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
        return expect(page.locator("main").first()).toBeVisible();
      }
      return expect(page.getByRole("heading", { name: copy.us.title })).toBeVisible();
    case "search":
      await page.getByRole("searchbox", { name: copy.activity.searchLabel }).fill("farmacia");
      return expect(page.getByText(copy.activity.results(1))).toBeAttached();
    case "filters":
      await page.getByRole("radio", { name: copy.activity.expenses }).click();
      await page.getByRole("button", { name: new RegExp(`^${copy.categories.shopping}, `) }).click();
      return expect(page.getByText(copy.activity.results(1))).toBeAttached();
    default:
      return undefined;
  }
}

/** 005 T019: una meta personal con nombre largo (60), aportada hasta su objetivo y dada por lograda; devuelve su id. */
async function seedAchievedGoal(user: { client: import("@supabase/supabase-js").SupabaseClient }) {
  const goal = await createGoal(user.client, { idempotencyKey: randomUUID(), context: "me", name: "Viaje por la costa pacífica con toda la familia en enero 27", goalType: "travel", target: moneyFromPesos(2000000n), targetMonth: null });
  await contributeToGoal(user.client, { idempotencyKey: randomUUID(), goalId: goal.id, amount: moneyFromPesos(2000000n), entryDate: todayInBogota(), fundingMode: "reserved" });
  const row = await getGoal(user.client, goal.id);
  await completeGoal(user.client, { idempotencyKey: randomUUID(), goalId: goal.id, expectedVersion: row.version });
  return goal.id;
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
    const user = await seedUser({ role: entry.firstEntryPending ? "estado-a6" : "estado", index, firstEntryCompleted: !entry.firstEntryPending,
      // 005 T019: con datos extremos, también el nombre más largo que admite el perfil (60).
      ...(entry.data === "extreme" ? { displayName: "María Fernanda de los Ángeles Restrepo Villegas de la Cruz A" } : {}) });
    await context.addCookies(user.cookies);
    const created = entry.data ? await seedMovements(user, entry.data) : [];
    if (entry.couple) await seedCoupleState(user, entry.couple, index);
    const goal = entry.goals === "achieved" ? await seedAchievedGoal(user) : "";
    paths.set(target, entry.path.replace("{id}", created[0]?.id ?? "").replace("{future}", futureMonth()).replace("{goal}", goal));
    // El contexto recordado en el dispositivo: localStorage y la cookie que lee el servidor (F44-1). Sin cookie, el
    // servidor pinta el Skeleton y el cliente recarga; los estados se auditan con la preferencia ya resuelta.
    const choice = entry.prepare === "us" ? "us" : "me";
    await context.addInitScript((value) => window.localStorage.setItem("juntia:context", value), choice);
    await context.addCookies([{ name: "juntia_context", value: choice, domain: new URL(baseURL).hostname, path: "/" }]);
  }
  return target;
}
