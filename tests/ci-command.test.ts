// @vitest-environment node
// 004 PR B · gate del PR #67 (run 42847381388): el paso «E2E smoke (selected specs)» falló porque `ci.mjs` ejecutaba
// `npm run test:e2e:smoke -- <specs>` sobre `playwright test --project e2e`, y Playwright tomó los archivos como más nombres de
// proyecto («Project(s) "tests/e2e/…" not found»). `e2e:dev` arma su comando por otro camino (e2e-plan.mjs), así que en
// local no se vio. Esta prueba ejecuta el MISMO comando de npm que arma `scripts/ci.mjs` (`npmArgs`) con `--list`, para no
// correr nada: con una lista de specs, y sin ella (todas).
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { jobBudget, npmArgs } from "../scripts/ci.mjs";

// Decisión de los fundadores del 17 nov 2026: el job e2e se parte en `e2e` y `a11y-session`, y cada uno conserva el
// presupuesto de 660 s, que bloquea igual que antes; el barrido a mano solo avisa.
describe("presupuesto de job (scripts/ci.mjs, jobBudget)", () => {
  it("e2e y a11y-session: < 660 s y bloquea", () => {
    expect(jobBudget({ GITHUB_JOB: "e2e", A11Y_LEVEL: "" })).toEqual({ seconds: 660, blocking: true });
    expect(jobBudget({ GITHUB_JOB: "a11y-session", A11Y_LEVEL: "" })).toEqual({ seconds: 660, blocking: true });
  });

  it("el barrido a mano (A11Y_LEVEL=sweep) en a11y-session no bloquea por presupuesto", () => {
    expect(jobBudget({ GITHUB_JOB: "a11y-session", A11Y_LEVEL: "sweep" })).toEqual({ seconds: 660, blocking: false });
  });

  // 005 T037 (FR-095; contracts/ci.md, «Presupuesto»): «jobBudget devuelve 600 s sin bloquear para release».
  it("release: 600 s por tramo, solo aviso (el tope duro es timeout-minutes)", () => {
    expect(jobBudget({ GITHUB_JOB: "release" })).toEqual({ seconds: 600, blocking: false });
    expect(jobBudget({ GITHUB_JOB: "release", A11Y_LEVEL: "sweep" })).toEqual({ seconds: 600, blocking: false });
  });

  it("los demás jobs: el < 6 min del gate, solo aviso", () => {
    for (const job of ["app", "db", "evidence", undefined]) expect(jobBudget({ GITHUB_JOB: job }), String(job)).toEqual({ seconds: 360, blocking: false });
  });
});

/** `npm <args> --list`: el comando real del job, solo listando. */
function list(env: Record<string, string>) {
  const args = npmArgs("test:e2e:smoke", env) as string[];
  // `--list` va detrás de `--` (si ya lo hay, de las specs) para que llegue a Playwright.
  const result = spawnSync("npm", [...args, ...(args.includes("--") ? [] : ["--"]), "--list", "--reporter=list"], {
    encoding: "utf8", shell: process.platform === "win32", env: { ...process.env, CI: "" },
  });
  const files = [...new Set([...(result.stdout ?? "").matchAll(/›\s+(\S+\.e2e\.ts):\d+:\d+/g)].map((match) => match[1].replace(/\\/g, "/").split("/").pop()!))];
  return { status: result.status, files, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

describe("comando de la spec E2E en el job e2e (scripts/ci.mjs)", () => {
  it("con E2E_SPECS, npm pasa los archivos detrás de `--` y Playwright lista solo esa spec", () => {
    expect(npmArgs("test:e2e:smoke", { E2E_SPECS: "tests/e2e/budgets.e2e.ts" })).toEqual(["run", "test:e2e:smoke", "--", "tests/e2e/budgets.e2e.ts"]);
    const result = list({ E2E_SPECS: "tests/e2e/budgets.e2e.ts" });
    expect(result.output).not.toMatch(/not found/);
    expect(result.status, result.output).toBe(0);
    expect(result.files).toEqual(["budgets.e2e.ts"]);
  });

  it("con varias specs, las lista todas y ninguna se toma por proyecto", () => {
    const specs = ["tests/e2e/access-account.e2e.ts", "tests/e2e/budgets.e2e.ts"];
    const result = list({ E2E_SPECS: specs.join(" ") });
    expect(result.output).not.toMatch(/not found/);
    expect(result.status, result.output).toBe(0);
    expect(result.files.sort()).toEqual(["access-account.e2e.ts", "budgets.e2e.ts"]);
  });

  // Decisión de los fundadores del 11 nov 2026: el paso de axe del job e2e pasa así los archivos de scripts/a11y-select.mjs.
  it("con A11Y_FILES, test:a11y lista solo esos archivos a11y (--project=a11y con `=`)", () => {
    const files = ["tests/a11y/goals.a11y.ts", "tests/a11y/goal-expense.a11y.ts"];
    expect(npmArgs("test:a11y", { A11Y_FILES: files.join(" ") })).toEqual(["run", "test:a11y", "--", ...files]);
    const args = npmArgs("test:a11y", { A11Y_FILES: files.join(" ") }) as string[];
    const result = spawnSync("npm", [...args, "--list", "--reporter=list"], {
      encoding: "utf8", shell: process.platform === "win32", env: { ...process.env, CI: "", A11Y_JOB: "e2e", A11Y_LEVEL: "" },
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(output).not.toMatch(/not found/);
    expect(result.status, output).toBe(0);
    const listed = [...new Set([...(result.stdout ?? "").matchAll(/›\s+(\S+\.a11y\.ts):\d+:\d+/g)].map((match) => match[1].replace(/\\/g, "/").split("/").pop()!))];
    expect(listed.sort()).toEqual(["goal-expense.a11y.ts", "goals.a11y.ts"]);
    expect(npmArgs("test:a11y", {})).toEqual(["run", "test:a11y"]);
  });

  it("sin E2E_SPECS corre todas las specs del proyecto e2e", () => {
    expect(npmArgs("test:e2e:smoke", {})).toEqual(["run", "test:e2e:smoke"]);
    const result = list({});
    expect(result.status, result.output).toBe(0);
    expect(result.files.sort()).toEqual(readdirSync("tests/e2e").filter((name) => name.endsWith(".e2e.ts")).sort());
  });
}, 180_000);
