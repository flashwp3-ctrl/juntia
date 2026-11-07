// @vitest-environment node
// T031d (spec 003, PR B) / regla 10 de tasks.md; revisión del PR #50, F50-5. Criterio literal: «ejecuta `npx playwright
// test --project a11y --list` con `A11Y_JOB=app` y con `A11Y_JOB=e2e` y comprueba que con `app` no aparece **ningún**
// caso con sesión o Auth de los archivos nuevos y con `e2e` sí aparecen. Sirve también para los archivos de C y D».
// Un caso con sesión es: una entrada de `e2eEntries` del registro (por su título «ruta · estado») o un caso de un archivo
// a11y cuyo título termina en «con sesión». `--list` no arranca el servidor ni la base.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appEntries, e2eEntries } from "./route-registry";

const CLI = join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");

function list(job: "app" | "e2e", level: "pr" | "sweep" = "pr") {
  const result = spawnSync(process.execPath, [CLI, "test", "--project", "a11y", "--list", "--reporter=list"], {
    cwd: process.cwd(), encoding: "utf8", env: { ...process.env, A11Y_JOB: job, A11Y_LEVEL: level === "sweep" ? "sweep" : "", CI: "" },
  });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.split("\n").filter((line) => line.includes(".a11y.ts"));
}

const sessionTitle = (line: string) => /con sesión(\s|$)/.test(line);
const entryTitle = (entry: { route: string; state: string }) => `${entry.route} · ${entry.state} ·`;

describe("selección de casos a11y por job (T031d)", () => {
  const app = list("app");
  const e2e = list("e2e");

  it("con A11Y_JOB=app no se lista ningún caso con sesión ni ninguna entrada de e2eEntries", () => {
    expect(app.length).toBeGreaterThan(0);
    expect(app.filter(sessionTitle)).toEqual([]);
    for (const entry of e2eEntries) expect(app.filter((line) => line.includes(entryTitle(entry))), `${entry.route} · ${entry.state}`).toEqual([]);
  });

  it("con A11Y_JOB=e2e aparecen los casos con sesión de los archivos nuevos y las entradas de e2eEntries", () => {
    expect(e2e.filter((line) => line.includes("couple.a11y.ts") && sessionTitle(line)).length).toBeGreaterThan(0);
    // PR C de la 003 (T044b): el archivo de Nosotros con pareja activa, solo en e2e.
    expect(e2e.filter((line) => line.includes("couple-shared.a11y.ts") && sessionTitle(line)).length).toBeGreaterThan(0);
    expect(app.filter((line) => line.includes("couple-shared.a11y.ts"))).toEqual([]);
    // PR D de la 003 (T060b): Balance y liquidaciones, solo en e2e.
    expect(e2e.filter((line) => line.includes("balance.a11y.ts") && sessionTitle(line)).length).toBeGreaterThan(0);
    expect(app.filter((line) => line.includes("balance.a11y.ts"))).toEqual([]);
    for (const entry of e2eEntries.filter((item) => item.axe !== false)) expect(e2e.some((line) => line.includes(entryTitle(entry))), `${entry.route} · ${entry.state}`).toBe(true);
  });

  it("las entradas sin sesión del registro solo se listan en app", () => {
    for (const entry of appEntries.filter((item) => item.axe !== false)) {
      expect(app.some((line) => line.includes(entryTitle(entry))), `${entry.route} · ${entry.state}`).toBe(true);
      expect(e2e.some((line) => line.includes(entryTitle(entry))), `${entry.route} · ${entry.state}`).toBe(false);
    }
  });
}, 120_000);

// Maestro §15.10, decisión 21 (PR D de la 003): dos niveles. Criterio literal: «Nivel ligero: cada pantalla y cada estado
// registrado se audita una vez, a 390 px, en los dos temas … Barrido completo: los siete anchos, el texto al 200 %, el
// recorrido completo con teclado y los objetivos táctiles de 44 px salen del PR y corren a mano».
describe("niveles de accesibilidad (decisión 21)", () => {
  const pr = [...list("app"), ...list("e2e")];
  const full = [...list("app", "sweep"), ...list("e2e", "sweep")];
  // El reporter «list» no imprime las etiquetas: se compara por título (sin la columna de línea, que no cambia el caso).
  const title = (line: string) => line.replace(/:d+:d+ ›/, " ›").trim();

  it("la pasada del PR no lista ningún caso del barrido: ni 1440 px, ni barridos, teclado o 200 %", () => {
    expect(pr.length).toBeGreaterThan(0);
    expect(pr.filter((line) => /1440px|768px|barrido|teclado|200 %|siete anchos/.test(line))).toEqual([]);
  });

  it("cada estado sigue una vez a 390 en los dos temas en la pasada del PR", () => {
    for (const entry of [...appEntries, ...e2eEntries].filter((item) => item.axe !== false)) {
      for (const theme of ["light", "dark"]) expect(pr.filter((line) => line.includes(`${entryTitle(entry)} ${theme} · 390px`)), `${entry.route} · ${entry.state} · ${theme}`).toHaveLength(1);
    }
    for (const file of ["couple.a11y.ts", "couple-shared.a11y.ts", "balance.a11y.ts"]) {
      for (const theme of ["light", "dark"]) expect(pr.some((line) => line.includes(file) && line.includes(`${theme} · 390px`)), `${file} · ${theme}`).toBe(true);
    }
  });

  it("el barrido a mano lista solo lo que el PR no corre (@sweep), de todos los archivos a11y", () => {
    expect(full.length).toBeGreaterThan(0);
    const inPr = new Set(pr.map(title));
    expect(full.filter((line) => inPr.has(title(line)))).toEqual([]);
    expect(full.filter((line) => /390px/.test(line))).toEqual([]);
    for (const file of ["routes.a11y.ts", "couple.a11y.ts", "couple-shared.a11y.ts", "balance.a11y.ts"]) expect(full.some((line) => line.includes(file)), file).toBe(true);
  });
}, 120_000);
