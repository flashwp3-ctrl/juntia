// @vitest-environment node
// 005 T022 (FR-020, FR-051, FR-093; research R3): «tres proyectos nuevos, ninguno en test:e2e:smoke ni en test:a11y»
// (`e2e-webkit`, `evidence-webkit` y `evidence-firefox`, solo para el job `release`). Los comandos del gate siguen fijando
// sus proyectos de Chromium. Se ejecuta el MISMO comando de npm que el gate con `--list`, sin correr nada.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { legPlan } from "../scripts/release-leg.mjs";

const NEW_PROJECTS = ["e2e-webkit", "evidence-webkit", "evidence-firefox"];
const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts as Record<string, string>;

/** `npm run <script> -- --list`: los proyectos que listan sus pruebas (`[proyecto] › archivo…`). */
function listedProjects(args: string[], env: Record<string, string> = {}) {
  const result = spawnSync("npm", args, { encoding: "utf8", shell: process.platform === "win32", env: { ...process.env, CI: "", ...env } });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return { status: result.status, output, projects: [...new Set([...(result.stdout ?? "").matchAll(/^\s*\[([a-z0-9-]+)\] ›/gm)].map((match) => match[1]))] };
}

describe("proyectos de Playwright del job release, fuera del gate (005 T022)", () => {
  it("los scripts del gate fijan su proyecto de Chromium", () => {
    expect(scripts["test:e2e:smoke"]).toBe("playwright test --project=e2e");
    expect(scripts["test:a11y"]).toBe("playwright test --project=a11y");
  });

  it("test:e2e:smoke solo lista el proyecto e2e", () => {
    const result = listedProjects(["run", "test:e2e:smoke", "--", "--list"]);
    expect(result.status, result.output).toBe(0);
    expect(result.projects).toEqual(["e2e"]);
  });

  it("test:a11y solo lista el proyecto a11y", () => {
    const result = listedProjects(["run", "test:a11y", "--", "--list"], { A11Y_JOB: "e2e", A11Y_LEVEL: "" });
    expect(result.status, result.output).toBe(0);
    expect(result.projects).toEqual(["a11y"]);
  });

  it("los tres proyectos nuevos existen: e2e-webkit con las specs E2E y los de evidencia solo con el comparador", () => {
    const result = listedProjects(["exec", "--", "playwright", "test", "--list", ...NEW_PROJECTS.flatMap((name) => ["--project", name])]);
    expect(result.status, result.output).toBe(0);
    expect(result.projects.sort()).toEqual([...NEW_PROJECTS].sort());
    const files = (project: string) => [...new Set([...result.output.matchAll(new RegExp(`\\[${project}\\] › (\\S+?):\\d+`, "g"))].map((match) => match[1].replace(/\\/g, "/").split("/").pop()))];
    expect(files("e2e-webkit").every((file) => file!.endsWith(".e2e.ts"))).toBe(true);
    expect(files("evidence-webkit")).toEqual(["cls-frames.capture.ts"]);
    expect(files("evidence-firefox")).toEqual(["cls-frames.capture.ts"]);
  });

  // contracts/ci.md: cada tramo de `release` corre lo que dice scripts/release-leg.mjs. Un tramo por tipo, con --list: el
  // proyecto, los archivos y la etiqueta @release resuelven pruebas (con `--project x archivo`, Playwright tomaba el
  // archivo por otro proyecto).
  it.each(["cls-metas", "cls-actividad-3", "cls-controls-chromium", "lab-interaction", "webkit-e2e-1", "firefox-cls-2b"])("el tramo %s lista pruebas", (leg) => {
    const plan = legPlan(leg);
    for (const command of plan.commands) {
      const result = listedProjects(["exec", "--", ...command.args.filter((arg: string) => arg !== "--reporter=line"), "--list"], command.env);
      expect(result.status, result.output).toBe(0);
      // La pasada @serial de un shard puede quedarse sin pruebas (`--pass-with-no-tests`); las demás no.
      if (!command.label.includes("@serial")) expect(result.output, `${command.label}: sin pruebas`).toMatch(/Total: [1-9]\d* tests? in/);
    }
  });
}, 180_000);
