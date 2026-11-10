// @vitest-environment node
// 004 PR B · gate del PR #67 (run 42847381388): el paso «E2E smoke (selected specs)» falló porque `ci.mjs` ejecutaba
// `npm run test:e2e:smoke -- <specs>` sobre `playwright test --project e2e`, y Playwright tomó los archivos como más nombres de
// proyecto («Project(s) "tests/e2e/…" not found»). `e2e:dev` arma su comando por otro camino (e2e-plan.mjs), así que en
// local no se vio. Esta prueba ejecuta el MISMO comando de npm que arma `scripts/ci.mjs` (`npmArgs`) con `--list`, para no
// correr nada: con una lista de specs, y sin ella (todas).
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { npmArgs } from "../scripts/ci.mjs";

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

  it("sin E2E_SPECS corre todas las specs del proyecto e2e", () => {
    expect(npmArgs("test:e2e:smoke", {})).toEqual(["run", "test:e2e:smoke"]);
    const result = list({});
    expect(result.status, result.output).toBe(0);
    expect(result.files.sort()).toEqual(readdirSync("tests/e2e").filter((name) => name.endsWith(".e2e.ts")).sort());
  });
}, 180_000);
