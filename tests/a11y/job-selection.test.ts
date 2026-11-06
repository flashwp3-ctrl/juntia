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

function list(job: "app" | "e2e") {
  const result = spawnSync(process.execPath, [CLI, "test", "--project", "a11y", "--list", "--reporter=list"], {
    cwd: process.cwd(), encoding: "utf8", env: { ...process.env, A11Y_JOB: job, CI: "" },
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
    for (const entry of e2eEntries.filter((item) => item.axe !== false)) expect(e2e.some((line) => line.includes(entryTitle(entry))), `${entry.route} · ${entry.state}`).toBe(true);
  });

  it("las entradas sin sesión del registro solo se listan en app", () => {
    for (const entry of appEntries.filter((item) => item.axe !== false)) {
      expect(app.some((line) => line.includes(entryTitle(entry))), `${entry.route} · ${entry.state}`).toBe(true);
      expect(e2e.some((line) => line.includes(entryTitle(entry))), `${entry.route} · ${entry.state}`).toBe(false);
    }
  });
}, 120_000);
