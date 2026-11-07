// T031d / T036, T038 (spec 003, PR B) / FR-054, FR-055, FR-068; SC-001 (B); F50-2, F50-3, F50-5; interpretación I4.
// Criterio literal (tasks.md, T038): «barrido sin scroll horizontal (`scrollWidth <= clientWidth`) de Mi pareja (M1–M4),
// `/invitacion` (M5–M7), A6 y Nosotros sin pareja en los siete anchos (360, 390, 430, 768, 1024, 1280 y 1440) y en los
// dos temas; teclado: «Crear invitación», «Generar enlace nuevo», «Copiar enlace» de M3b, «Anular» con el foco inicial
// en la opción segura y Escape, y «Aceptar invitación», todo operable sin ratón; texto al 200 % en esas pantallas: sin
// pérdida de contenido ni solapamientos; objetivos de 44 px en esos controles (`boundingBox`)». Y de T036: axe en los dos
// temas de M6 y M7, que no caben en el registro (route-registry.ts) porque /invitacion ya está en él sin sesión (M5).
// Regla 10 de tasks.md: lo que necesita sesión o Auth va en un describe que se salta salvo con A11Y_JOB=e2e; M5 (sin
// sesión, sin red de Auth) corre en el job app. Ninguna espera fija; movimiento reducido por defecto (ADR-011 §6).
import { expect, test } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";
import { seedCoupleState, seedInvitation, seedUser } from "../support/seed";
import { axe, largeText, signedContext, sweep, tabTo, target44 } from "../support/a11y";
import { THEMES } from "./route-registry";

const JOB = process.env.A11Y_JOB === "e2e" ? "e2e" : "app";
const M5_TOKEN = "A".repeat(43);

// M5 (sin sesión): el job app no tiene Supabase, y la pantalla no lo necesita sin cookie de sesión.
// Los casos se definen solo en su job (como routes.a11y.ts): un test.skip seguiría listándolos (job-selection.test.ts).
if (JOB === "app") test.describe("M5 sin sesión", () => {
  test("/invitacion · M5 · siete anchos, dos temas, 200 % y 44 px", async ({ page }) => {
    await page.goto(`/invitacion#t=${M5_TOKEN}`);
    await expect(page.getByRole("heading", { level: 1, name: copy.couple.invitation.signedOut.title })).toBeVisible();
    await sweep(page, "/invitacion M5");
    await largeText(page, "/invitacion M5");
    await target44(page, copy.couple.invitation.signedOut.signIn, "link");
    await target44(page, copy.couple.invitation.signedOut.signUp, "link");
  });
});

if (JOB === "e2e") test.describe("Mi pareja e invitación con sesión", () => {
  for (const colorScheme of THEMES) {
    for (const width of [390, 1440]) {
      test(`/invitacion · M6 y M7 · axe · ${colorScheme} · ${width}px · con sesión`, async ({ browser, baseURL }, testInfo) => {
        const index = testInfo.parallelIndex;
        const [sara, tomas] = await Promise.all([seedUser({ role: "axe-invita", index }), seedUser({ role: "axe-invitado", index, displayName: "Tomás" })]);
        const { token } = await seedInvitation(sara, tomas.email);
        const { context, page } = await signedContext(browser, baseURL!, tomas, colorScheme);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });
        await page.goto(`/invitacion#t=${token}`);
        await expect(page.getByRole("heading", { level: 1, name: copy.couple.invitation.valid.title("Sara") })).toBeVisible();
        await axe(page, `${colorScheme} /invitacion M6 ${width}px`);
        await page.goto(`/invitacion#t=${"Z".repeat(43)}`);
        await expect(page.getByRole("heading", { level: 1, name: copy.couple.invitation.invalid })).toBeVisible();
        await axe(page, `${colorScheme} /invitacion M7 ${width}px`);
        await context.close();
      });
    }
  }

  test("barrido de siete anchos y 200 %: Mi pareja M1–M4, /invitacion M6–M7, A6 y Nosotros sin pareja · con sesión", async ({ browser, baseURL }, testInfo) => {
    const index = testInfo.parallelIndex;
    // M2, M3 y Nosotros sin pareja, con una cuenta sin pareja.
    const solo = await seedUser({ role: "barrido-solo", index });
    {
      const { context, page } = await signedContext(browser, baseURL!, solo);
      await page.goto("/cuenta/pareja");
      await expect(page.getByText(copy.couple.status.solo, { exact: true })).toBeVisible();
      await sweep(page, "Mi pareja M2");
      await largeText(page, "Mi pareja M2");
      await page.getByRole("button", { name: copy.couple.none.invite }).click();
      await expect(page.getByRole("dialog", { name: copy.couple.invite.title })).toBeVisible();
      await sweep(page, "Mi pareja M3");
      await largeText(page, "Mi pareja M3");
      await context.addInitScript(() => window.localStorage.setItem("juntia:context", "us"));
      await context.addCookies([{ name: "juntia_context", value: "us", domain: new URL(baseURL!).hostname, path: "/" }]);
      await page.goto("/");
      await expect(page.getByRole("link", { name: copy.us.invite })).toBeVisible();
      await sweep(page, "Nosotros sin pareja");
      await largeText(page, "Nosotros sin pareja");
      await context.close();
    }
    // M4 pendiente y vencida, y M1.
    for (const state of ["pending", "expired", "active"] as const) {
      const user = await seedUser({ role: `barrido-${state}`, index });
      await seedCoupleState(user, state, index);
      const { context, page } = await signedContext(browser, baseURL!, user);
      await page.goto("/cuenta/pareja");
      await expect(page.getByText(state === "active" ? copy.couple.status.active : copy.couple.status.pending)).toBeVisible();
      await sweep(page, `Mi pareja ${state}`);
      await largeText(page, `Mi pareja ${state}`);
      await context.close();
    }
    // A6 con «Invitar a mi pareja».
    {
      const fresh = await seedUser({ role: "barrido-a6", index, firstEntryCompleted: false });
      const { context, page } = await signedContext(browser, baseURL!, fresh);
      await page.goto("/primera-entrada");
      await expect(page.getByRole("radio", { name: new RegExp(copy.auth.firstEntry.inviteTitle) })).toBeVisible();
      await sweep(page, "A6");
      await largeText(page, "A6");
      await context.close();
    }
    // M6 y M7.
    {
      const [sara, tomas] = await Promise.all([seedUser({ role: "barrido-invita", index }), seedUser({ role: "barrido-invitado", index, displayName: "Tomás" })]);
      const { token } = await seedInvitation(sara, tomas.email);
      const { context, page } = await signedContext(browser, baseURL!, tomas);
      await page.goto(`/invitacion#t=${token}`);
      await expect(page.getByRole("heading", { level: 1, name: copy.couple.invitation.valid.title("Sara") })).toBeVisible();
      await sweep(page, "/invitacion M6");
      await largeText(page, "/invitacion M6");
      await page.goto(`/invitacion#t=${"Y".repeat(43)}`);
      await expect(page.getByRole("heading", { level: 1, name: copy.couple.invitation.invalid })).toBeVisible();
      await sweep(page, "/invitacion M7");
      await largeText(page, "/invitacion M7");
      await context.close();
    }
  });

  test("teclado y 44 px: crear, copiar, generar enlace nuevo, anular con Escape y aceptar · con sesión", async ({ browser, baseURL }, testInfo) => {
    const index = testInfo.parallelIndex;
    const [sara, tomas] = await Promise.all([seedUser({ role: "teclado-invita", index }), seedUser({ role: "teclado-invitado", index, displayName: "Tomás" })]);
    const { context, page } = await signedContext(browser, baseURL!, sara);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/cuenta/pareja");
    await expect(page.getByText(copy.couple.status.solo, { exact: true })).toBeVisible();
    await target44(page, copy.couple.none.invite);

    // Crear invitación sin ratón.
    await tabTo(page, copy.couple.none.invite);
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: copy.couple.invite.title });
    await expect(sheet.getByRole("textbox", { name: copy.couple.invite.email })).toBeFocused();
    await page.keyboard.type(tomas.email);
    await target44(page, copy.couple.invite.create);
    await page.keyboard.press("Enter");
    await expect(sheet.getByText(copy.couple.invite.ready)).toBeVisible();
    // Copiar enlace de M3b.
    await target44(page, copy.couple.invite.copy);
    await target44(page, copy.couple.invite.share);
    await sheet.getByRole("button", { name: copy.couple.invite.copy }).focus();
    await page.keyboard.press("Enter");
    await expect(sheet.getByText(copy.couple.invite.copied)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    // M4: Generar enlace nuevo y Anular con el foco en la opción segura y Escape.
    await expect(page.getByText(copy.couple.status.pending, { exact: true })).toBeVisible();
    await target44(page, copy.couple.pending.regenerate);
    await target44(page, copy.couple.pending.cancel);
    await page.getByRole("button", { name: copy.couple.pending.regenerate }).focus();
    await page.keyboard.press("Enter");
    const regenerated = page.getByRole("dialog", { name: copy.couple.invite.regenerateTitle });
    await expect(regenerated.getByRole("textbox", { name: copy.couple.invite.link })).toBeVisible();
    const link = await regenerated.getByRole("textbox", { name: copy.couple.invite.link }).inputValue();
    await page.keyboard.press("Escape");
    await expect(regenerated).toBeHidden();
    await page.getByRole("button", { name: copy.couple.pending.cancel }).focus();
    await page.keyboard.press("Enter");
    const confirm = page.getByRole("alertdialog", { name: copy.couple.cancel.title });
    await expect(confirm.getByRole("button", { name: copy.couple.cancel.keep })).toBeFocused();
    await target44(page, copy.couple.cancel.keep);
    await target44(page, copy.couple.cancel.confirm);
    await page.keyboard.press("Escape");
    await expect(confirm).toBeHidden();
    await expect(page.getByText(copy.couple.status.pending, { exact: true })).toBeVisible();
    await context.close();

    // Aceptar invitación sin ratón, con el enlace nuevo.
    const invited = await signedContext(browser, baseURL!, tomas);
    await invited.page.goto(link);
    await expect(invited.page.getByRole("heading", { level: 1, name: copy.couple.invitation.valid.title("Sara") })).toBeVisible();
    await target44(invited.page, copy.couple.invitation.valid.accept);
    await target44(invited.page, copy.couple.invitation.valid.later);
    await tabTo(invited.page, copy.couple.invitation.valid.accept);
    await invited.page.keyboard.press("Enter");
    await expect(invited.page).toHaveURL(/\/cuenta\/pareja$/);
    await expect(invited.page.getByText(copy.couple.status.active, { exact: true })).toBeVisible();
    await invited.context.close();
  });
});
