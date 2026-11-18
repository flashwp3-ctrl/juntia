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


  it("db y evidence no cambian de disparo", () => {
    expect(field("db", "if")).toBe("(github.event_name == 'workflow_dispatch' && !inputs.capture_evidence && !inputs.a11y_sweep) || (github.event_name == 'pull_request' && github.event.pull_request.draft == false)");
    expect(field("evidence", "if")).toBe("github.event_name == 'workflow_dispatch' && inputs.capture_evidence");
  });
});

// Revisión del PR #83, F83-1: lanzado a mano con a11y_sweep y measure_workers, el job e2e no arrancaba y la medición T054
// desaparecía sin error. Aquí se EVALÚAN las condiciones `if` reales del workflow para cada combinación de inputs, con un
// evaluador pequeño de las expresiones que usa ci.yml (contextos, literales, ==, !=, !, &&, ||, paréntesis, always() y
// failure()); no es un intérprete completo de GitHub Actions.
type Context = { event: "pull_request" | "workflow_dispatch"; draft?: boolean; inputs: Record<string, boolean | string | null>; skip?: string };

function evaluate(expression: string, context: Context): unknown {
  const source = expression.trim().replace(/^'(.*)'$/, "$1").replace(/^\$\{\{(.*)\}\}$/, "$1");
  const tokens = source.match(/'[^']*'|==|!=|&&|\|\||[!()]|[A-Za-z_][\w.-]*\(\)|[A-Za-z_][\w.-]*/g) ?? [];
  let index = 0;
  const peek = () => tokens[index];
  const take = (expected?: string) => {
    const token = tokens[index++];
    if (expected && token !== expected) throw new Error(`Se esperaba ${expected} y llegó ${token} en ${source}`);
    return token;
  };
  const truthy = (value: unknown) => value !== false && value !== null && value !== undefined && value !== "" && value !== 0;
  const value = (path: string): unknown => {
    const fixed: Record<string, unknown> = {
      "github.event_name": context.event,
      "github.event.pull_request.draft": context.event === "pull_request" ? context.draft ?? false : null,
      "steps.select_a11y.outputs.skip": context.skip ?? "",
      true: true, false: false, null: null,
    };
    if (path in fixed) return fixed[path];
    if (path.startsWith("inputs.")) return context.event === "workflow_dispatch" ? context.inputs[path.slice(7)] ?? false : null;
    throw new Error(`Contexto no previsto por el evaluador: ${path}`);
  };
  const primary = (): unknown => {
    const token = take();
    if (token === "(") { const result = or(); take(")"); return result; }
    if (token === "always()") return true;
    if (token === "failure()") return false;
    if (token.startsWith("'")) return token.slice(1, -1);
    return value(token);
  };
  const unary = (): unknown => {
    if (peek() === "!") { take(); return !truthy(unary()); }
    const left = primary();
    if (peek() === "==" || peek() === "!=") { const op = take(); const right = primary(); return op === "==" ? left === right : left !== right; }
    return left;
  };
  const and = (): unknown => { let left = unary(); while (peek() === "&&") { take(); const right = unary(); left = truthy(left) ? right : left; } return left; };
  const or = (): unknown => { let left = and(); while (peek() === "||") { take(); const right = and(); left = truthy(left) ? left : right; } return left; };
  const result = or();
  if (index !== tokens.length) throw new Error(`Sobra «${tokens.slice(index).join(" ")}» en ${source}`);
  return truthy(result);
}

const stepIf = (job: string, match: RegExp) => {
  const step = steps(job).find((item) => match.test(item.name) || match.test(item.text));
  if (!step) throw new Error(`No hay paso ${match} en ${job}`);
  return /^ {8}if: (.+)$/m.exec(step.text)?.[1] ?? "success()";
};
const runs = (expression: string, context: Context) => (expression === "success()" ? true : evaluate(expression, context));

const CASES: { name: string; context: Context; jobs: string[]; e2eSteps?: Record<string, boolean>; a11ySelect?: boolean }[] = [
  { name: "pull_request listo", context: { event: "pull_request", inputs: {} }, jobs: ["app", "db", "e2e", "a11y-session"],
    e2eSteps: { select: true, smoke: true, t054: false }, a11ySelect: true },
  { name: "pull_request en borrador", context: { event: "pull_request", draft: true, inputs: {} }, jobs: [] },
  { name: "Run workflow sin inputs", context: { event: "workflow_dispatch", inputs: {} }, jobs: ["app", "db", "e2e", "a11y-session"],
    e2eSteps: { select: true, smoke: true, t054: false }, a11ySelect: true },
  { name: "capture_evidence", context: { event: "workflow_dispatch", inputs: { capture_evidence: true } }, jobs: ["evidence"] },
  { name: "a11y_sweep", context: { event: "workflow_dispatch", inputs: { a11y_sweep: true } }, jobs: ["app", "a11y-session"], a11ySelect: false },
  { name: "a11y_sweep + measure_workers (F83-1)", context: { event: "workflow_dispatch", inputs: { a11y_sweep: true, measure_workers: true } },
    jobs: ["app", "e2e", "a11y-session"], e2eSteps: { select: false, smoke: false, t054: true }, a11ySelect: false },
  { name: "measure_workers", context: { event: "workflow_dispatch", inputs: { measure_workers: true } }, jobs: ["app", "db", "e2e", "a11y-session"],
    e2eSteps: { select: true, smoke: true, t054: true }, a11ySelect: true },
];

describe("qué jobs y pasos arrancan con cada combinación de inputs (F83-1)", () => {
  it("el evaluador sigue la lógica de GitHub en las formas que usa ci.yml", () => {
    const pr: Context = { event: "pull_request", inputs: {} };
    expect(evaluate("'!inputs.a11y_sweep'", pr)).toBe(true);
    expect(evaluate("github.event_name == 'workflow_dispatch' && inputs.capture_evidence", pr)).toBe(false);
    expect(evaluate("always() && steps.select_a11y.outputs.skip != 'true'", { ...pr, skip: "true" })).toBe(false);
    expect(() => evaluate("secrets.TOKEN", pr)).toThrow(/no previsto/);
  });

  it.each(CASES)("$name", ({ context, jobs: expected, e2eSteps, a11ySelect }) => {
    const started = [...jobs().keys()].filter((job) => runs(field(job, "if") ?? "success()", context));
    expect(started.sort()).toEqual([...expected].sort());
    if (e2eSteps) {
      expect({
        select: runs(stepIf("e2e", /^Select E2E specs by area$/), context),
        smoke: runs(stepIf("e2e", /^E2E smoke \(selected specs\)$/), context),
        t054: runs(stepIf("e2e", /^T054/), context),
      }).toEqual(e2eSteps);
    }
    if (a11ySelect !== undefined) {
      expect(runs(stepIf("a11y-session", /^Select light accessibility files by area$/), context)).toBe(a11ySelect);
      // Sin selector (barrido) la salida skip queda vacía: axe corre entero.
      expect(runs(stepIf("a11y-session", /^Axe of the states/), context)).toBe(true);
      expect(runs(stepIf("a11y-session", /^Axe of the states/), { ...context, skip: "true" })).toBe(false);
    }
  });
});
