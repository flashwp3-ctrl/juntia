// T050 / FR-065; US-1, US-7; ADR-011 §2, fila 15. Spec E2E 1 «Acceso y Mi cuenta» (nace en el PR B; el PR C le suma la
// descarga de Exportar). Criterio literal (tasks.md, T050): «registro de un correo permitido → enlace en Mailpit → A1 con
// aviso → entrar → A6 sin "Invitar a mi pareja" → Inicio; registro no permitido → la misma pantalla y ninguna cuenta;
// ruta protegida sin sesión → `/entrar` → vuelve a la ruta; Mi cuenta: perfil, apariencia en oscuro y un segundo contexto
// que entra y tiene `data-theme="dark"` antes de `<body>`; recuperación uniforme; `/auth/confirm` (Route Handler, con la
// app y Mailpit): enlace de verificación válido → A1 con aviso, enlace caducado y enlace ya usado → aviso de enlace
// caducado sin datos de la cuenta, enlace de recuperación válido → A5; cerrar sesión → S3 y ninguna ruta de producto sin
// volver a entrar».
// PR C (T070 / FR-057, FR-065; ADR-011 §3, matriz): la descarga de Exportar llega como archivo (evento de descarga,
// nombre y tamaño), sin abrir su contenido; el contenido lo prueba la integración (T063).
// Solo Chromium, movimiento reducido y ninguna espera fija (ADR-011 §6). Cada test que cambia una cuenta siembra la suya.
import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { runnerSql } from "../integration/support/sql";
import { confirmLink } from "../support/mailpit";
import { seedMovements, seedUser } from "../support/seed";
import { expectedShareOrigin, shareOriginProblem } from "../support/share-origin";
import { attachNavigations, expect, recordNavigations, routerSettled, signInContext, test } from "./fixtures";

const anonymous = { cookies: [], origins: [] };
test.use({ storageState: anonymous });

const sqlText = (value: string) => `'${value.replace(/'/g, "''")}'`;
const userCount = (email: string) => runnerSql(`select count(*) from auth.users where email=${sqlText(email)}`);

async function mailLink(email: string, type: "signup" | "recovery") {
  let link: string | null = null;
  await expect.poll(async () => (link = await confirmLink(email, type)), { message: `correo de ${type}`, timeout: 15_000 }).not.toBeNull();
  return link!;
}

test.afterEach(async ({}, testInfo) => { await attachNavigations(testInfo); });

async function signUpWith(page: Page, name: string, email: string, password: string, { navigate = true } = {}) {
  if (navigate) await page.goto("/crear-cuenta");
  await page.getByRole("textbox", { name: copy.auth.signUp.nameLabel }).fill(name);
  await page.getByRole("textbox", { name: copy.auth.fields.email }).fill(email);
  await page.getByLabel(copy.auth.fields.password, { exact: true }).fill(password);
  await page.getByText(copy.auth.signUp.acknowledge).click();
  await page.getByRole("button", { name: copy.auth.signUp.submit }).click();
  await expect(page).toHaveURL(/\/verificar-correo$/);
  await expect(page.getByRole("heading", { level: 1, name: copy.auth.verifyEmail.title })).toBeVisible();
  await routerSettled(page);
  return (await page.locator("main").innerText()).trim();
}

async function signInWith(page: Page, email: string, password: string) {
  await page.getByRole("textbox", { name: copy.auth.fields.email }).fill(email);
  await page.getByLabel(copy.auth.fields.password, { exact: true }).fill(password);
  // Entrar navega con una carga completa (`window.location.assign`, sign-in-form.tsx). 005 · PR B (corrección 6): en WebKit la URL
  // cambia antes de que el documento nuevo esté listo; sin esperar su carga, la prueba leía el documento de /entrar (:130, tema
  // claro) o su `goto` siguiente chocaba con la hidratación (:106).
  const loaded = page.waitForEvent("load");
  await page.getByRole("button", { name: copy.auth.signIn.submit }).click();
  await loaded;
  await routerSettled(page);
}

// `@mail`: envían o leen un correo (Mailpit o el envío de registro y recuperación). Solo en CI; `e2e:dev` las excluye
// con --grep-invert y las declara en su resumen (decisión 18, ADR-011 §9.9).
test("registro permitido: Mailpit → A1 con aviso → entrar → A6 con «Invitar a mi pareja» → Inicio; el enlace usado ya no sirve", { tag: "@mail" }, async ({ page }) => {
  const email = `signup-${randomUUID().slice(0, 8)}@seed.test`;
  const password = `Clave-${randomUUID().slice(0, 8)}`;
  runnerSql(`insert into juntia_data.signup_allowlist(email) values (${sqlText(email)})`);
  recordNavigations(page);
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
    // PR B (T034, FR-016): A6 recupera «Invitar a mi pareja» de 04·17; «Empezar por mi cuenta» sigue elegida.
    await expect(page.getByRole("radio", { name: new RegExp(copy.auth.firstEntry.inviteTitle) })).not.toBeChecked();
    await expect(page.getByRole("radio", { name: new RegExp(copy.auth.firstEntry.startTitle) })).toBeChecked();
    await page.getByRole("button", { name: copy.auth.firstEntry.continue }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: copy.home.greeting("Sara Nueva") })).toBeVisible();
    await routerSettled(page);

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

test("registro no permitido o de una cuenta existente: la misma pantalla y ninguna cuenta nueva", { tag: "@mail" }, async ({ page, sara }) => {
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

test("ruta protegida sin sesión → /entrar → vuelve a la ruta, sin caché compartida", async ({ page, baseURL }) => {
  // Un mes navegable para una cuenta sin movimientos (el mes en curso): desde F44-4, un mes fuera del intervalo redirige
  // al límite más cercano, y aquí se prueba que «volver» conserva la ruta y su query, no esa redirección.
  const month = todayInBogota().slice(0, 7);
  recordNavigations(page);
  await page.goto(`/actividad?mes=${month}`);
  await expect(page).toHaveURL(new RegExp(`/entrar\\?volver=%2Factividad%3Fmes%3D${month}$`));
  // El usuario se siembra después de comprobar la redirección: sin protección, la prueba falla antes de sembrar.
  const user = await seedUser({ role: "volver", index: test.info().parallelIndex });
  await signInWith(page, user.email, user.password);
  await expect(page).toHaveURL(new RegExp(`/actividad\\?mes=${month}$`));
  const response = await page.goto("/cuenta");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"] ?? "").toMatch(/private/);
  expect(response?.headers()["cache-control"] ?? "").toMatch(/no-store/);
  // F43-4: con una sesión iniciada con contraseña, A5 no se muestra; se pide el enlace desde Seguridad y sesión.
  await page.goto("/nueva-contrasena");
  await expect(page).toHaveURL(/\/cuenta\/seguridad$/);
  // Un `volver` externo nunca sale de Juntia (research R8.7).
  await page.context().clearCookies();
  await page.goto(`/entrar?volver=${encodeURIComponent("//evil.example")}`);
  await signInWith(page, user.email, user.password);
  await expect(page).toHaveURL(new URL("/", baseURL).href);
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
  // El observador va sobre document (el arnés de research R7): al correr el script de inicio todavía no hay <html> parseado.
  await other.addInitScript(() => {
    new MutationObserver((_, observer) => {
      if (!document.body) return;
      (window as unknown as { themeAtBody: string | null }).themeAtBody = document.documentElement.getAttribute("data-theme");
      observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
  });
  const second = await other.newPage();
  recordNavigations(second);
  await second.goto("/entrar");
  await signInWith(second, user.email, user.password);
  await expect(second).toHaveURL(/\/$/);
  // La acción de entrar navega con una carga completa: el primer cuadro de Inicio ya es oscuro.
  expect(await second.evaluate(() => (window as unknown as { themeAtBody: string | null }).themeAtBody)).toBe("dark");
  await expect(second.locator("html")).toHaveAttribute("data-theme", "dark");
  await other.close();
});

test("recuperación uniforme; /auth/confirm caducado → aviso sin datos; enlace válido → A5", { tag: "@mail" }, async ({ page }) => {
  recordNavigations(page);
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
  // «Esta sesión» (G1). En escritorio, la columna de Mi cuenta tiene además la fila «Cerrar sesión», con su ayuda en el nombre.
  await page.getByRole("button", { name: copy.account.signOut.label, exact: true }).click();
  await expect(page).toHaveURL(/\/entrar\?aviso=sesion-cerrada$/);
  await expect(page.getByText(copy.auth.signIn.signedOut)).toBeVisible();
  for (const route of ["/", "/actividad", "/cuenta", "/cuenta/perfil"]) {
    await page.goto(route);
    await expect(page, route).toHaveURL(/\/entrar\?volver=/);
  }
});

test("Exportar: el archivo JSON y el CSV llegan como descarga, con su nombre y un tamaño, sin abrirlos", async ({ page, goldenSara }) => {
  await signInContext(page.context(), goldenSara);
  await page.goto("/cuenta/privacidad");
  for (const format of ["json", "csv"] as const) {
    await page.getByRole("button", { name: new RegExp(copy.account.privacy.export) }).click();
    const sheet = page.getByRole("dialog", { name: copy.account.export.title });
    await sheet.getByRole("radio", { name: new RegExp(`^${copy.account.export[format]}`) }).click();
    await sheet.getByRole("button", { name: copy.account.export.prepare }).click();
    await expect(sheet.getByText(copy.account.export.ready)).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), sheet.getByRole("link", { name: copy.account.export.download }).click()]);
    expect(download.suggestedFilename()).toMatch(new RegExp(`^juntia-datos-\\d{4}-\\d{2}-\\d{2}\\.${format}$`));
    expect(await download.failure()).toBeNull();
    expect((await stat(await download.path())).size).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  }
});

// F44-1 (revisión del PR #44): «el HTML inicial y el payload RSC con la cookie en nosotros no contienen importes ni
// descripciones del dataset dorado, en Inicio y en Actividad», y con la cookie en `me` sí (control positivo). Se piden
// las respuestas tal cual llegan, sin ejecutar la página: lo que importa es lo que viaja, no lo que se ve.
test("Nosotros no lleva datos privados ni en el HTML ni en el payload RSC; Yo sí", async ({ page, baseURL }) => {
  const user = await seedUser({ role: "contexto", index: test.info().parallelIndex });
  const [first] = await seedMovements(user, "current");
  await signInContext(page.context(), user);
  const month = first.transactionDate.slice(0, 7);
  const host = new URL(baseURL!).hostname;
  const routes = ["/", `/actividad?mes=${month}`, `/actividad/${first.id}?mes=${month}`];
  const markers = ["Taxi a la oficina", "Reembolso EPS", "Regalo de cumpleaños", "412.900", "41290000", "45.000", "4500000"];
  const body = async (path: string, rsc: boolean) => {
    const url = rsc ? `${path}${path.includes("?") ? "&" : "?"}_rsc=f44` : path;
    const response = await page.request.get(url, { headers: rsc ? { RSC: "1" } : {} });
    expect(response.status(), `${url} ${rsc ? "RSC" : "HTML"}`).toBe(200);
    return response.text();
  };
  for (const [context, leaks] of [["us", false], ["me", true]] as const) {
    await page.context().addCookies([{ name: "juntia_context", value: context, domain: host, path: "/" }]);
    for (const path of routes) {
      for (const rsc of [false, true]) {
        const text = await body(path, rsc);
        const found = markers.filter((marker) => text.includes(marker));
        if (leaks) expect(found.length, `${context} ${path} ${rsc ? "RSC" : "HTML"}: los datos de Yo llegan`).toBeGreaterThan(0);
        else expect(found, `${context} ${path} ${rsc ? "RSC" : "HTML"}`).toEqual([]);
      }
    }
  }
});

// F44-1, segunda ronda: «con localStorage=us y la cookie ausente, y también con la cookie inválida, el HTML y el RSC
// iniciales no contienen datos del dataset. Después del refresco se ve "Nosotros". Con localStorage=me y sin cookie,
// primero aparece el esqueleto y después los datos». Y el prefetch: con enlaces precargados en Yo, se cambia a Nosotros
// y se navega; la vista nueva no muestra datos privados.
test("F44-1: sin cookie de contexto o con una no válida no viaja nada privado; el cliente resuelve y recarga", async ({ browser, baseURL }) => {
  const user = await seedUser({ role: "sin-cookie", index: test.info().parallelIndex });
  const [first] = await seedMovements(user, "current");
  const month = first.transactionDate.slice(0, 7);
  const host = new URL(baseURL!).hostname;
  const markers = ["Taxi a la oficina", "Reembolso EPS", "Regalo de cumpleaños", "412.900", "41290000", "45.000", "4500000"];
  const leaks = (text: string) => markers.filter((marker) => text.includes(marker));
  const open = async (stored: "me" | "us" | null, cookie: string | null) => {
    const context = await browser.newContext({ baseURL, reducedMotion: "reduce" });
    await context.addCookies(user.cookies);
    if (cookie !== null) await context.addCookies([{ name: "juntia_context", value: cookie, domain: host, path: "/" }]);
    if (stored) await context.addInitScript((value) => window.localStorage.setItem("juntia:context", value), stored);
    return { context, page: await context.newPage() };
  };

  for (const cookie of [null, "nosotros"]) {
    // Respuestas iniciales, sin ejecutar la página: HTML y RSC de las tres rutas.
    const { context, page } = await open("us", cookie);
    for (const path of ["/", `/actividad?mes=${month}`, `/actividad/${first.id}?mes=${month}`]) {
      for (const rsc of [false, true]) {
        const url = rsc ? `${path}${path.includes("?") ? "&" : "?"}_rsc=f44b` : path;
        const response = await page.request.get(url, { headers: rsc ? { RSC: "1" } : {} });
        expect(response.status(), url).toBe(200);
        expect(leaks(await response.text()), `${cookie ?? "sin cookie"} ${url} ${rsc ? "RSC" : "HTML"}`).toEqual([]);
      }
    }
    // En el navegador, con Nosotros recordado: el documento inicial no trae nada y después se ve Nosotros.
    const document = await page.goto("/");
    expect(leaks(await document!.text()), `${cookie ?? "sin cookie"}: documento inicial`).toEqual([]);
    await expect(page.getByRole("heading", { name: copy.us.title })).toBeVisible();
    await expect.poll(async () => (await context.cookies()).find(({ name }) => name === "juntia_context")?.value).toBe("us");
    expect(leaks(await page.locator("main").innerText())).toEqual([]);
    await context.close();
  }

  // Yo recordado y sin cookie: primero el Skeleton (el documento no trae datos), después los datos.
  {
    const { context, page } = await open("me", null);
    const document = await page.goto("/");
    const html = await document!.text();
    expect(leaks(html)).toEqual([]);
    expect(html).toContain('aria-busy="true"');
    await expect(page.getByRole("link", { name: /^Regalo de cumpleaños, / })).toBeVisible();
    await expect.poll(async () => (await context.cookies()).find(({ name }) => name === "juntia_context")?.value).toBe("me");
    await context.close();
  }

  // Prefetch: en Yo, con los enlaces de Inicio a la vista (y precargados), se cambia a Nosotros y se navega a Actividad.
  {
    const { context, page } = await open("me", "me");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("link", { name: /^Regalo de cumpleaños, / })).toBeVisible();
    await page.getByRole("link", { name: copy.home.seeAll }).hover();
    await page.locator("[data-context-selector]:visible").getByRole("radio", { name: copy.context.us }).click();
    await expect(page.getByRole("heading", { name: copy.us.title })).toBeVisible();
    await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.activity }).click();
    await expect(page).toHaveURL(/\/actividad$/);
    await expect(page.getByRole("heading", { name: copy.us.title })).toBeVisible();
    expect(leaks(await page.locator("main").innerText())).toEqual([]);
    await context.close();
  }
});

// Marca 1c (comp 09b, fundadores 23 nov 2026). El <head> que leen el navegador y WhatsApp: iconos que responden, título con
// plantilla y una sola tarjeta para todos los enlaces. /invitacion lleva la misma que /entrar y nada del enlace (el token
// viaja en el fragmento; el HTML sin datos de la pareja ya lo prueba el caso de la invitación). Y la entrada no se mueve
// al llegar el logotipo: el SVG tiene ancho y alto fijos (CLS de la API en Chromium, a 390 y 1440).
test("marca: <head> con iconos y la misma tarjeta en /invitacion, sin datos; la entrada no se mueve con el logo", async ({ page, browserName, baseURL }) => {
  // F93-1: la tarjeta anuncia una URL absoluta y WhatsApp la descarga tal cual, así que se comprueba el origen, no solo la
  // ruta. Es el de SITE_URL (la variable de metadataBase) y, sin ella, el de la app. En las pruebas (CI y e2e:dev),
  // SITE_URL es el origen del servidor de pruebas: la URL anunciada se pide tal cual, sin cambiarle el origen.
  const shareOrigin = expectedShareOrigin({ SITE_URL: process.env.SITE_URL }, baseURL!);
  expect(shareOrigin, "en las pruebas, SITE_URL es el servidor de pruebas").toBe(new URL(baseURL!).origin);
  const token = "Zx9-".repeat(10) + "abc";
  const head = async (path: string) => {
    await page.goto(path);
    const meta = (key: string) => page.locator(`head meta[property="${key}"], head meta[name="${key}"]`).first().getAttribute("content");
    return {
      title: await page.title(),
      ogImage: await meta("og:image"),
      ogTitle: await meta("og:title"),
      ogDescription: await meta("og:description"),
      twitterCard: await meta("twitter:card"),
      twitterImage: await meta("twitter:image"),
      html: await page.locator("head").innerHTML(),
    };
  };
  const entrar = await head("/entrar");
  const invitation = await head(`/invitacion#t=${token}`);
  expect(entrar.title).toBe(`${copy.auth.signIn.submit} · ${copy.shell.brand}`);
  expect(invitation.title).toBe(`${copy.couple.invitation.pageTitle} · ${copy.shell.brand}`);
  for (const card of [entrar, invitation]) {
    expect(card.ogTitle).toBe(copy.shell.brand);
    expect(card.ogDescription).toBe(copy.share.description);
    expect(card.twitterCard).toBe("summary_large_image");
    expect(shareOriginProblem(card.ogImage, shareOrigin), "origen de og:image").toBeNull();
    expect(shareOriginProblem(card.twitterImage, shareOrigin), "origen de twitter:image").toBeNull();
    expect(new URL(card.ogImage!).pathname).toBe("/opengraph-image.png");
    expect(new URL(card.twitterImage!).pathname).toBe("/twitter-image.png");
  }
  expect(invitation.ogImage).toBe(entrar.ogImage);
  expect(invitation.twitterImage).toBe(entrar.twitterImage);
  expect(invitation.html.includes(token), "el token no llega al <head>").toBe(false);

  // Los iconos y la tarjeta responden sin sesión (WhatsApp no tiene cookie) y con su tipo.
  const links = await page.locator('head link[rel="icon"], head link[rel="apple-touch-icon"]').evaluateAll((nodes) => nodes.map((n) => ({ rel: n.getAttribute("rel"), href: n.getAttribute("href")!, type: n.getAttribute("type"), sizes: n.getAttribute("sizes") })));
  expect(links.map((l) => new URL(l.href, page.url()).pathname).sort()).toEqual(["/apple-icon.png", "/favicon.ico", "/icon.svg"]);
  expect(links.find((l) => l.href.includes("apple-icon"))?.sizes).toBe("180x180");
  const types: Record<string, string> = { "/favicon.ico": "image/x-icon", "/icon.svg": "image/svg+xml", "/apple-icon.png": "image/png", "/opengraph-image.png": "image/png", "/twitter-image.png": "image/png" };
  // Los iconos van relativos al documento; la tarjeta, absoluta: se pide la URL anunciada, con su origen.
  for (const url of [...links.map((l) => new URL(l.href, page.url()).href), entrar.ogImage!, entrar.twitterImage!]) {
    const response = await page.request.get(url, { maxRedirects: 0 });
    expect(response.status(), url).toBe(200);
    expect(response.headers()["content-type"], url).toContain(types[new URL(url).pathname]);
  }

  // CLS de la entrada con el logotipo, a 390 y a 1440 (la API Layout Instability solo existe en Chromium).
  if (browserName === "chromium") {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => {
        (window as unknown as { __cls: number }).__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto("/entrar");
      const logo = page.getByRole("img", { name: copy.shell.brand });
      await expect(logo).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls), `CLS a ${width}`).toBe(0);
    }
  }
});

// T031c / T036 (spec 003, PR B) / FR-012, FR-013, FR-014, FR-067; US-1 escenarios 2, 5 y 6; [V] «Retorno tras el login».
// Caso de la matriz «Invitación → login → volver → aceptar», con Tomás entrando por M5. Criterio literal (tasks.md,
// T036): «comprobar el HTML de `/invitacion` sin ningún dato de la pareja». La base guarda solo el hash del token.
async function createInvitationAsSara(page: Page, email: string) {
  await page.goto("/cuenta/pareja");
  await expect(page.getByText(copy.couple.status.solo, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: copy.couple.none.invite }).click();
  const sheet = page.getByRole("dialog", { name: copy.couple.invite.title });
  await sheet.getByRole("textbox", { name: copy.couple.invite.email }).fill(email);
  await sheet.getByRole("button", { name: copy.couple.invite.create }).click();
  await expect(sheet.getByText(copy.couple.invite.ready)).toBeVisible();
  const link = await sheet.getByRole("textbox", { name: copy.couple.invite.link }).inputValue();
  expect(link).toMatch(/\/invitacion#t=[A-Za-z0-9_-]{43}$/);
  return { link, token: link.split("#t=")[1] };
}

function assertOnlyHashStored(token: string, groupOwner: string) {
  const hash = runnerSql(`select encode(sha256(convert_to(${sqlText(token)},'UTF8')),'hex')`);
  expect(runnerSql(`select count(*) from juntia_data.group_invitations i join juntia_data.groups g on g.id=i.group_id where g.owner_user_id='${groupOwner}' and i.token_hash='${hash}'`)).toBe("1");
  // El token en claro no está en ninguna columna de texto de las invitaciones ni de la auditoría.
  expect(runnerSql(`select count(*) from juntia_data.group_invitations i where i::text like ${sqlText(`%${token}%`)}`)).toBe("0");
  expect(runnerSql(`select count(*) from juntia_data.audit_events e where e::text like ${sqlText(`%${token}%`)}`)).toBe("0");
}

test("invitación → M5 sin datos → entrar → volver → M6 → aceptar → M1 para los dos", async ({ page, browser, baseURL }) => {
  const index = test.info().parallelIndex;
  const [sara, tomas] = await Promise.all([seedUser({ role: "invita", index, displayName: "Sara" }), seedUser({ role: "invitado", index, displayName: "Tomás" })]);
  await signInContext(page.context(), sara);
  const { link, token } = await createInvitationAsSara(page, tomas.email.toUpperCase());
  assertOnlyHashStored(token, sara.id);

  // Tomás, sin sesión, abre el enlace en su dispositivo.
  const other = await browser.newContext({ baseURL, reducedMotion: "reduce" });
  const tab = await other.newPage();
  // El HTML de /invitacion no lleva nada de la pareja ni de quien invita: lo decide el cliente.
  for (const rsc of [false, true]) {
    const response = await tab.request.get(rsc ? "/invitacion?_rsc=inv" : "/invitacion", { headers: rsc ? { RSC: "1" } : {} });
    expect(response.status()).toBe(200);
    const text = await response.text();
    for (const marker of ["Sara", sara.email, tomas.email, token]) expect(text.includes(marker), `${rsc ? "RSC" : "HTML"} sin «${marker}»`).toBe(false);
  }
  await tab.goto(link);
  await expect(tab.getByRole("heading", { level: 1, name: copy.couple.invitation.signedOut.title })).toBeVisible();
  await expect(tab).toHaveURL(/\/invitacion$/);
  await expect(tab.locator("main")).not.toContainText("Sara");
  await tab.getByRole("link", { name: copy.couple.invitation.signedOut.signIn }).click();
  await expect(tab).toHaveURL(/\/entrar\?volver=%2Finvitacion$/);
  await signInWith(tab, tomas.email, tomas.password);

  // Vuelve a la invitación y la revalida con su sesión.
  await expect(tab).toHaveURL(/\/invitacion$/);
  await expect(tab.getByRole("heading", { level: 1, name: copy.couple.invitation.valid.title("Sara") })).toBeVisible();
  await tab.getByRole("button", { name: copy.couple.invitation.valid.accept }).click();
  await expect(tab).toHaveURL(/\/cuenta\/pareja$/);
  await expect(tab.getByText(copy.couple.status.active, { exact: true })).toBeVisible();
  await expect(tab.getByText(copy.couple.active.title("Sara", "Tomás"))).toBeVisible();
  expect(await tab.evaluate(() => window.localStorage.getItem("juntia:invitation"))).toBeNull();

  // Sara ve M1 al recargar; el enlace usado ya no sirve (M7).
  await page.reload();
  // 005 · PR B (corrección 6): `getByText` estricto contaba también un nodo oculto en WebKit («resolved to 2 elements»). Lo que se
  // exige es que se vea UNA: un duplicado visible seguiría fallando.
  await expect(page.getByText(copy.couple.status.active, { exact: true }).filter({ visible: true })).toHaveCount(1);
  await tab.goto(link);
  await expect(tab.getByRole("heading", { level: 1, name: copy.couple.invitation.invalid })).toBeVisible();
  await other.close();
});

test("invitación → M5 → crear la cuenta y verificarla → la intención del dispositivo vuelve a /invitacion → aceptar", { tag: "@mail" }, async ({ page, browser, baseURL }) => {
  const index = test.info().parallelIndex;
  const sara = await seedUser({ role: "invita-nueva", index, displayName: "Sara" });
  const email = `invitado-${randomUUID().slice(0, 8)}@seed.test`;
  const password = `Clave-${randomUUID().slice(0, 8)}`;
  runnerSql(`insert into juntia_data.signup_allowlist(email) values (${sqlText(email)})`);
  try {
    await signInContext(page.context(), sara);
    const { link } = await createInvitationAsSara(page, email);
    const other = await browser.newContext({ baseURL, reducedMotion: "reduce" });
    const tab = await other.newPage();
    await tab.goto(link);
    await expect(tab.getByRole("heading", { level: 1, name: copy.couple.invitation.signedOut.title })).toBeVisible();
    await tab.getByRole("link", { name: copy.couple.invitation.signedOut.signUp }).click();
    // 005 · PR B (corrección 6): el enlace ya navega a /crear-cuenta con `volver`; un `goto` encima chocaba con esa navegación en
    // WebKit y, en Chromium, la cancelaba sin decirlo (la prueba no pasaba por el enlace que dice probar).
    await expect(tab).toHaveURL(/\/crear-cuenta\?volver=%2Finvitacion$/);
    await signUpWith(tab, "Tomás", email, password, { navigate: false });
    // El enlace de verificación no conserva `volver` (research R5): vuelve por la intención guardada en el dispositivo.
    await tab.goto(await mailLink(email, "signup"));
    await expect(tab).toHaveURL(/\/entrar\?aviso=verificado$/);
    await signInWith(tab, email, password);
    await expect(tab).toHaveURL(/\/primera-entrada/);
    await tab.getByRole("button", { name: copy.auth.firstEntry.continue }).click();
    await expect(tab).toHaveURL(/\/invitacion$/);
    await expect(tab.getByRole("heading", { level: 1, name: copy.couple.invitation.valid.title("Sara") })).toBeVisible();
    await tab.getByRole("button", { name: copy.couple.invitation.valid.accept }).click();
    await expect(tab).toHaveURL(/\/cuenta\/pareja$/);
    await expect(tab.getByText(copy.couple.status.active, { exact: true })).toBeVisible();
    await other.close();
  } finally {
    runnerSql(`delete from juntia_data.signup_allowlist where email=${sqlText(email)}`);
  }
});
