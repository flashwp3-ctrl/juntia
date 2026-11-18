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
import { CLS_FRAMES_SETS, LEGS, legPlan } from "../scripts/release-leg.mjs";

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
  it("los dos jobs existen y corren en paralelo: ninguno espera a otro job del gate", () => {
    expect([...jobs().keys()]).toEqual(expect.arrayContaining(["app", "db", "e2e", "a11y-session", "evidence"]));
    // 005 (contracts/ci.md, F85-9): la única dependencia es el guardia de entradas, que tarda segundos.
    expect(field("e2e", "needs")).toBe("inputs-guard");
    expect(field("a11y-session", "needs")).toBe("inputs-guard");
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


  it("db y evidence no cambian de disparo, salvo la exclusión de release_lab (005, contracts/ci.md)", () => {
    expect(field("db", "if")).toBe("(github.event_name == 'workflow_dispatch' && !inputs.capture_evidence && !inputs.a11y_sweep && !inputs.release_lab) || (github.event_name == 'pull_request' && github.event.pull_request.draft == false)");
    expect(field("evidence", "if")).toBe("github.event_name == 'workflow_dispatch' && inputs.capture_evidence && !inputs.release_lab");
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
  { name: "pull_request listo", context: { event: "pull_request", inputs: {} }, jobs: ["inputs-guard", "app", "db", "e2e", "a11y-session"],
    e2eSteps: { select: true, smoke: true, t054: false }, a11ySelect: true },
  { name: "pull_request en borrador", context: { event: "pull_request", draft: true, inputs: {} }, jobs: [] },
  { name: "Run workflow sin inputs", context: { event: "workflow_dispatch", inputs: {} }, jobs: ["inputs-guard", "app", "db", "e2e", "a11y-session"],
    e2eSteps: { select: true, smoke: true, t054: false }, a11ySelect: true },
  { name: "capture_evidence", context: { event: "workflow_dispatch", inputs: { capture_evidence: true } }, jobs: ["inputs-guard", "evidence"] },
  { name: "a11y_sweep", context: { event: "workflow_dispatch", inputs: { a11y_sweep: true } }, jobs: ["inputs-guard", "app", "a11y-session"], a11ySelect: false },
  { name: "a11y_sweep + measure_workers (F83-1)", context: { event: "workflow_dispatch", inputs: { a11y_sweep: true, measure_workers: true } },
    jobs: ["inputs-guard", "app", "e2e", "a11y-session"], e2eSteps: { select: false, smoke: false, t054: true }, a11ySelect: false },
  { name: "measure_workers", context: { event: "workflow_dispatch", inputs: { measure_workers: true } }, jobs: ["inputs-guard", "app", "db", "e2e", "a11y-session"],
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

// 005 · T035 (FR-092, FR-093, FR-095; contracts/ci.md, «Entradas a mano», F85-4 y F85-9). No basta con buscar textos: se
// EVALÚAN los `if` con el evaluador de arriba (que falla ante una expresión que no conoce) y se SIMULA `needs` con las
// reglas de GitHub: un job cuyo `if` es falso se omite; un `if` sin función de estado lleva `success()` implícito, así que el
// job se omite si una dependencia no terminó bien; un paso que falla hace fallar su job. El único paso que puede fallar en
// esta simulación es la validación de `inputs-guard`, que se simula con su condición (`INVALID`).
type Outcome = "success" | "failure" | "skipped";
const GATE = ["app", "db", "e2e", "a11y-session"];
const BOOLEAN_INPUTS = ["release_lab", "capture_evidence", "a11y_sweep", "measure_workers"] as const;
const needsOf = (job: string) => (field(job, "needs") ?? "").split(/[\s,[\]]+/).filter(Boolean);

function guardStepFails(context: Context) {
  const step = steps("inputs-guard").find((item) => /^Reject release_lab combined with other inputs$/.test(item.name));
  if (!step) throw new Error("inputs-guard no tiene su paso de validación");
  const stepRuns = runs(/^ {8}if: (.+)$/m.exec(step.text)?.[1] ?? "success()", context);
  const invalid = /^ {10}INVALID: (.+)$/m.exec(step.text)?.[1];
  if (!invalid) throw new Error("La validación no declara su condición INVALID");
  return stepRuns && evaluate(invalid, context);
}

function simulate(context: Context): Record<string, Outcome> {
  const result: Record<string, Outcome> = {};
  const resolve = (job: string): Outcome => {
    if (result[job]) return result[job];
    const needs = needsOf(job);
    for (const dependency of needs) resolve(dependency);
    const expression = field(job, "if") ?? "success()";
    const statusFunction = /\b(success|failure|always|cancelled)\(\)/.test(expression);
    if (!statusFunction && !needs.every((dependency) => result[dependency] === "success")) return (result[job] = "skipped");
    if (!runs(expression, context)) return (result[job] = "skipped");
    return (result[job] = job === "inputs-guard" && guardStepFails(context) ? "failure" : "success");
  };
  for (const job of jobs().keys()) resolve(job);
  return result;
}

/** La tabla «Entradas a mano» del contrato, para cada combinación de las cuatro entradas booleanas. */
function expected(inputs: Record<string, boolean>): { ran: string[]; guard: Outcome } {
  const others = inputs.capture_evidence || inputs.a11y_sweep || inputs.measure_workers;
  if (inputs.release_lab) return others ? { ran: [], guard: "failure" } : { ran: ["release"], guard: "success" };
  if (inputs.capture_evidence) return { ran: ["evidence"], guard: "success" };
  if (inputs.a11y_sweep) return { ran: ["app", "a11y-session", ...(inputs.measure_workers ? ["e2e"] : [])], guard: "success" };
  return { ran: [...GATE], guard: "success" };
}

const COMBINATIONS = Array.from({ length: 16 }, (_, mask) => Object.fromEntries(BOOLEAN_INPUTS.map((name, bit) => [name, Boolean(mask & (1 << bit))])));
const label = (inputs: Record<string, boolean>) => BOOLEAN_INPUTS.filter((name) => inputs[name]).join(" + ") || "sin entradas";
const ran = (outcomes: Record<string, Outcome>) => Object.entries(outcomes).filter(([job, outcome]) => job !== "inputs-guard" && outcome !== "skipped").map(([job]) => job).sort();

describe("guardia de entradas y job release (005 T035; contracts/ci.md)", () => {
  it("todos los jobs dependen de inputs-guard, y el guardia de nada", () => {
    expect(needsOf("inputs-guard")).toEqual([]);
    for (const job of [...jobs().keys()].filter((name) => name !== "inputs-guard")) expect(needsOf(job), job).toEqual(["inputs-guard"]);
  });

  it("la validación del guardia falla de verdad con ::error y exit 1 cuando INVALID es true", () => {
    const step = steps("inputs-guard").find((item) => item.name === "Reject release_lab combined with other inputs")!;
    expect(step.text).toMatch(/if \[ "\$INVALID" = "true" \]; then echo "::error[^"]*release_lab no se combina con otras entradas[^"]*"; exit 1; fi/);
  });

  it.each(COMBINATIONS.map((inputs) => [label(inputs), inputs] as const))("workflow_dispatch · %s", (_, inputs) => {
    const outcomes = simulate({ event: "workflow_dispatch", inputs });
    const want = expected(inputs);
    expect(outcomes["inputs-guard"]).toBe(want.guard);
    expect(ran(outcomes)).toEqual([...want.ran].sort());
    for (const job of want.ran) expect(outcomes[job], job).toBe("success");
  });

  it("pull_request no borrador: el guardia corre y termina bien sin validar, y app, db, e2e y a11y-session SE EJECUTAN", () => {
    const outcomes = simulate({ event: "pull_request", draft: false, inputs: {} });
    expect(outcomes["inputs-guard"]).toBe("success");
    for (const job of GATE) expect(outcomes[job], job).toBe("success");
    expect(outcomes.release).toBe("skipped");
    expect(outcomes.evidence).toBe("skipped");
    expect(guardStepFails({ event: "pull_request", draft: false, inputs: {} })).toBe(false);
  });

  it("pull_request en borrador: no corre nada, ni el guardia", () => {
    const outcomes = simulate({ event: "pull_request", draft: true, inputs: {} });
    expect(Object.values(outcomes).every((outcome) => outcome === "skipped")).toBe(true);
  });

  it("con una combinación inválida el guardia falla y nada más corre", () => {
    for (const other of ["capture_evidence", "a11y_sweep", "measure_workers"]) {
      const outcomes = simulate({ event: "workflow_dispatch", inputs: { release_lab: true, [other]: true } });
      expect(outcomes["inputs-guard"], other).toBe("failure");
      expect(ran(outcomes), other).toEqual([]);
    }
  });

  it("release nunca corre en pull_request, en borrador o no", () => {
    for (const draft of [true, false]) expect(runs(field("release", "if")!, { event: "pull_request", draft, inputs: {} })).toBe(false);
    expect(field("release", "if")).toBe("github.event_name == 'workflow_dispatch' && inputs.release_lab && !inputs.capture_evidence && !inputs.a11y_sweep && !inputs.measure_workers");
  });

  it("release: ubuntu-24.04, 20 min, fail-fast false y la matriz de los tramos de scripts/release-leg.mjs (23 tras T046)", () => {
    expect(field("release", "runs-on")).toBe("ubuntu-24.04");
    expect(field("release", "timeout-minutes")).toBe("20");
    const job = jobs().get("release") ?? "";
    expect(job).toMatch(/^ {6}fail-fast: false$/m);
    const matrix = /^ {8}leg: \[([^\]]+)\]/m.exec(job.replace(/\n {14}/g, " "))?.[1].split(",").map((leg) => leg.trim());
    expect(matrix).toEqual([...LEGS]);
  });

  it("sin disparadores schedule ni push", () => {
    expect(workflow).not.toMatch(/^ {2}(schedule|push):/m);
  });
});

// 005 T046 (F85-7; regla 5): un tramo de más de 600 s se parte en dos sin quitar cargas.
describe("tramos partidos en T046, sin quitar cargas", () => {
  it("las dos mitades de una ruta de CLS de Chromium son 1/2 y 2/2 de la misma ruta", () => {
    for (const route of ["inicio-yo", "actividad"]) {
      expect(LEGS).not.toContain(`cls-${route}`);
      expect([1, 2].map((n) => legPlan(`cls-${route}-${n}`).commands[0].env)).toEqual([{ RELEASE_CLS_ROUTE: route, RELEASE_CLS_PART: "1/2" }, { RELEASE_CLS_ROUTE: route, RELEASE_CLS_PART: "2/2" }]);
    }
  });
  it("los tramos de rutas de WebKit y Firefox, a y b, cubren las mismas rutas que antes", async () => {
    const source = await import("node:fs").then((fs) => fs.readFileSync("tests/evidence/cls-frames.capture.ts", "utf8"));
    const set = (name: string) => JSON.parse(new RegExp(`"${name}": (\\[[^\\]]*\\])`).exec(source)![1]);
    expect([...set("routes-1a"), ...set("routes-1b")]).toEqual(set("routes-1"));
    expect([...set("routes-2a"), ...set("routes-2b")]).toEqual(set("routes-2"));
    for (const engine of ["webkit", "firefox"]) for (const part of ["2a", "2b", "3a", "3b"]) expect(legPlan(`${engine}-cls-${part}`).commands[0].env.CLS_FRAMES_SET).toBe(CLS_FRAMES_SETS[part as keyof typeof CLS_FRAMES_SETS]);
  });
});
