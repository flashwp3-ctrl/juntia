// @vitest-environment node
// Decisión de los fundadores del 17 nov 2026: el job `e2e` del gate se parte en dos jobs PARALELOS, cada uno con su
// Supabase y su build: `e2e` (las specs E2E del selector por área, @mail incluidas) y `a11y-session` (axe de los estados con
// sesión o Auth, con el selector de accesibilidad por área y el barrido a mano). Esta prueba lee .github/workflows/ci.yml
// como texto (el repositorio no tiene un parser de YAML propio) y afirma la forma que el gate necesita, para que un cambio
// del workflow no junte los jobs, no deje un paso de axe en `e2e` ni haga que `a11y-session` arranque Supabase en un PR que
// solo toca archivos neutros.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SUPABASE_JOBS } from "../scripts/ci.mjs";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8").replace(/\r\n/g, "\n");

/** Los jobs de `jobs:`: nombre → texto del bloque (sin el comentario de cabecera de los demás). */
function jobs() {
  const body = workflow.slice(workflow.indexOf("\njobs:\n") + 7);
  const blocks = new Map<string, string>();
  const matches = [...body.matchAll(/^ {2}([a-z0-9-]+):\n/gm)];
  matches.forEach((match, index) => blocks.set(match[1], body.slice(match.index, matches[index + 1]?.index ?? body.length)));
  return blocks;
}

/** Los pasos de un job, cada uno con su nombre (o su `uses`) y su texto. */
function steps(job: string) {
  const text = jobs().get(job) ?? "";
  return text.split(/^ {6}- /m).slice(1).map((step) => ({
    name: /^(?:name|uses): (.+)$/m.exec(step)?.[1]?.trim() ?? "",
    text: step,
  }));
}

const field = (job: string, key: string) => new RegExp(`^ {4}${key}: (.+)$`, "m").exec(jobs().get(job) ?? "")?.[1]?.trim();
const cacheKey = (job: string) => /^ {10}key: (.+)$/m.exec(steps(job).find((step) => step.name === "Restore the Next build cache")?.text ?? "")?.[1];

describe("gate partido en e2e y a11y-session (decisión de los fundadores del 17 nov 2026)", () => {
  it("los dos jobs existen y corren en paralelo: ninguno espera a otro", () => {
    expect([...jobs().keys()]).toEqual(expect.arrayContaining(["app", "db", "e2e", "a11y-session", "evidence"]));
    expect(field("e2e", "needs")).toBeUndefined();
    expect(field("a11y-session", "needs")).toBeUndefined();
  });

  it("e2e corre las specs del selector y ninguna auditoría de axe; a11y-session, axe y ninguna spec E2E", () => {
    const e2e = steps("e2e").map((step) => step.text).join("\n");
    const a11y = steps("a11y-session").map((step) => step.text).join("\n");
    expect(e2e).toMatch(/scripts\/e2e-select\.mjs/);
    expect(e2e).toMatch(/ci\.mjs run test:e2e:smoke/);
    expect(e2e).not.toMatch(/test:a11y|a11y-select|A11Y_JOB/);
    expect(a11y).toMatch(/scripts\/a11y-select\.mjs/);
    expect(a11y).toMatch(/ci\.mjs run test:a11y/);
    expect(a11y).toMatch(/A11Y_JOB: e2e/);
    expect(a11y).not.toMatch(/test:e2e:smoke|e2e-select/);
  });

  it("los dos arrancan su propio Supabase con Auth y Mailpit y compilan con él", () => {
    for (const job of ["e2e", "a11y-session"]) {
      const names = steps(job).map((step) => step.name);
      expect(names, job).toContain("Start Supabase with Auth and Mailpit");
      expect(names, job).toContain("Install and build with the runner's Supabase");
      expect(names.indexOf("Start Supabase with Auth and Mailpit"), job).toBeLessThan(names.indexOf("Install and build with the runner's Supabase"));
    }
  });

  it("el build reusa la misma caché de .next en los dos jobs (misma clave)", () => {
    expect(cacheKey("e2e")).toBeTruthy();
    expect(cacheKey("a11y-session")).toBe(cacheKey("e2e"));
  });

  it("cada job con Supabase tiene el tope de 12 min y el presupuesto de 660 s de scripts/ci.mjs", () => {
    expect([...SUPABASE_JOBS].sort()).toEqual(["a11y-session", "e2e"]);
    for (const job of SUPABASE_JOBS) {
      expect(field(job, "timeout-minutes"), job).toBe("12");
      expect(steps(job).at(-1)?.text, job).toMatch(/if: always\(\)[\s\S]*node scripts\/ci\.mjs summary/);
    }
  });

  it("a11y-session elige antes de arrancar nada y, con skip=true, se salta cada paso que cuesta tiempo", () => {
    const list = steps("a11y-session");
    const select = list.findIndex((step) => /id: select_a11y/.test(step.text));
    expect(select).toBeGreaterThan(0);
    expect(list.slice(0, select).map((step) => step.text).join("\n")).not.toMatch(/supabase|ci\.mjs run/);
    // Fuera de la regla solo quedan el informe en caso de fallo y el resumen de tiempos, que no cuestan.
    const exempt = new Set(["Upload Playwright report on failure", "Publish a11y-session timings"]);
    for (const step of list.slice(select + 1).filter((item) => !exempt.has(item.name))) {
      expect(step.text, step.name).toMatch(/if: .*steps\.select_a11y\.outputs\.skip != 'true'/);
    }
  });

  it("el barrido de accesibilidad a mano corre solo en a11y-session (y en app); e2e no se lanza con él", () => {
    expect(field("e2e", "if")).toMatch(/!inputs\.a11y_sweep/);
    expect(field("a11y-session", "if")).not.toMatch(/a11y_sweep/);
    // Con el barrido, el selector no corre: A11Y_FILES y A11Y_ROUTE_AREAS quedan vacíos y corre todo.
    expect(steps("a11y-session").find((step) => /id: select_a11y/.test(step.text))?.text).toMatch(/if: '!inputs\.a11y_sweep'/);
  });

  it("db y evidence no cambian de disparo", () => {
    expect(field("db", "if")).toBe("(github.event_name == 'workflow_dispatch' && !inputs.capture_evidence && !inputs.a11y_sweep) || (github.event_name == 'pull_request' && github.event.pull_request.draft == false)");
    expect(field("evidence", "if")).toBe("github.event_name == 'workflow_dispatch' && inputs.capture_evidence");
  });
});
