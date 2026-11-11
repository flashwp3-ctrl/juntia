// @vitest-environment node
// Decisión de los fundadores del 11 nov 2026 (maestro §15.10, decisión 21) y decisiones del gestor (opción C para
// routes.a11y.ts; es.ts neutro) — capa: unidad de scripts/, como tests/e2e-select.test.ts. El selector de accesibilidad de
// nivel ligero por área (scripts/a11y-select.mjs): fixtures por área (y PR típicos de metas, plan y análisis), compartido,
// desconocido, sin base y solo documentación; el filtro del registro por área (route-registry.ts); el comando real con
// `--list`; y que el mapa cubra todos los tests/a11y/**/*.a11y.ts. Si un PR real no da lo que su fixture espera, se corrige el
// mapa del selector o el fixture, nunca a mano en el workflow.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { changedFiles, FILES, ROUTE_AREAS, ROUTES_FILE, selectA11y, summary } from "../scripts/a11y-select.mjs";
import { registry, ROUTE_AREAS as REGISTRY_AREAS, routeArea, routeAreaFilter } from "./a11y/route-registry";

type Selection = { files: string[]; run: string[]; missing: string[]; routeAreas: string[] | null; skip: boolean; all: boolean; reasons: string[] };
const select = selectA11y as (changed: string[] | null, exists?: (path: string) => boolean) => Selection;
const ALL = Object.keys(FILES as Record<string, string>);
const exists = () => true;
const a = (...names: string[]) => names.map((name) => `tests/a11y/${name}.a11y.ts`);
/** El orden de FILES, para comparar sin depender del orden de las áreas. */
const ordered = (files: string[]) => ALL.filter((file) => files.includes(file));

// PR típicos de P0-3 (contracts/ci.md): con la copy, que todo PR toca y es neutra.
const GOALS_PR = ["src/app/(app)/metas/page.tsx", "src/app/(app)/metas/[id]/page.tsx", "src/features/goals/goal-card.tsx", "src/domain/goals/index.ts",
  "src/lib/db/goals.ts", "src/lib/copy/es.ts", "tests/e2e/goals.e2e.ts", "tests/a11y/goals.a11y.ts"];
const PLAN_PR = ["src/app/(app)/plan/page.tsx", "src/features/plan/plan-screen.tsx", "src/features/plan/budget-sheet.tsx", "src/domain/budgets/index.ts",
  "src/lib/db/budgets.ts", "src/lib/copy/es.ts", "tests/e2e/budgets.e2e.ts", "tests/a11y/plan.a11y.ts"];
const ANALYSIS_PR = ["src/app/(app)/plan/analisis/page.tsx", "src/features/analysis/analysis-screen.tsx", "src/domain/analysis/index.ts",
  "src/domain/metrics/index.ts", "src/lib/db/export.ts", "src/lib/copy/es.ts", "tests/e2e/budgets.e2e.ts"];

describe("selector de accesibilidad de nivel ligero por área (decisión de los fundadores del 11 nov 2026)", () => {
  // [nombre, archivos cambiados, archivos a11y esperados, áreas del registro (null = completo)]
  it.each([
    ["PR típico de metas (con es.ts)", GOALS_PR, a("routes", "goals", "goal-expense"), ["metas"]],
    ["PR típico de plan (con es.ts)", PLAN_PR, a("routes", "plan"), ["presupuestos"]],
    ["PR típico de análisis (métricas y exportación)", ANALYSIS_PR, a("routes", "goals", "goal-expense", "plan"), ["nucleo", "metas", "presupuestos"]],
    ["gasto con meta aislado: sin registro", ["src/features/expenses/goal-funding/funding-ledger.tsx", "src/lib/db/goal-usage.ts"], a("goal-expense"), null],
    ["Balance", ["src/features/balance/balance-panel.tsx", "src/lib/db/settlements.ts"], a("routes", "balance"), ["balance"]],
    ["pareja", ["src/features/couple/invite-sheet.tsx", "src/app/invitacion/page.tsx"], a("routes", "couple"), ["pareja"]],
    ["gastos compartidos: couple-shared y el núcleo (Inicio y Actividad en Nosotros)", ["src/features/expenses/split-editor.tsx", "src/lib/db/shared-expenses.ts"], a("routes", "couple-shared"), ["nucleo"]],
    ["núcleo: acceso y cuenta", ["src/features/auth/sign-in-form.tsx", "src/app/(app)/cuenta/perfil/page.tsx"], a("routes"), ["nucleo"]],
    ["exportación aislada: núcleo", ["src/lib/db/export.ts"], a("routes"), ["nucleo"]],
    ["migración de metas", ["supabase/migrations/20261120000200_goal_fix.sql"], a("routes", "goals", "goal-expense"), ["metas"]],
    ["un archivo a11y de área cambiado corre solo ese archivo", ["tests/a11y/balance.a11y.ts"], a("balance"), null],
    ["routes.a11y.ts cambiado: el registro completo", ["tests/a11y/routes.a11y.ts"], a("routes"), null],
    ["dos áreas suman sus archivos y sus áreas del registro", [...GOALS_PR, ...PLAN_PR], a("routes", "goals", "goal-expense", "plan"), ["metas", "presupuestos"]],
    ["src/components/ es compartido", [...GOALS_PR, "src/components/ui/button.tsx"], ALL, null],
    ["el shell es compartido", ["src/app/(app)/layout.tsx"], ALL, null],
    ["globals.css es compartido", ["src/app/globals.css"], ALL, null],
    ["otro archivo de src/lib/copy/ es compartido", ["src/lib/copy/en.ts"], ALL, null],
    ["src/lib/db/errors.ts es compartido", [...PLAN_PR, "src/lib/db/errors.ts"], ALL, null],
    ["tests/support/ es compartido", ["tests/support/seed.ts"], ALL, null],
    ["el registro de rutas es compartido", ["tests/a11y/route-registry.ts"], ALL, null],
    ["el workflow es compartido", [".github/workflows/ci.yml"], ALL, null],
    ["el propio selector es compartido", ["scripts/a11y-select.mjs"], ALL, null],
    ["Anotar es compartido (lo auditan routes, couple-shared y goal-expense)", ["src/features/expenses/annotate-sheet.tsx"], ALL, null],
    ["Inicio es compartido (módulos de metas, Balance y gasto con meta)", ["src/features/home/home-view.tsx"], ALL, null],
    ["un archivo sin clasificar", ["src/features/nueva-cosa/rara.tsx"], ALL, null],
    // Revisión del gestor del PR #70 (1): src/features/shared/ es infraestructura de todas las áreas («Comprobar estado»).
    ["src/features/shared/use-write.ts es compartido", ["src/features/shared/use-write.ts"], ALL, null],
    ["src/features/shared/ dentro de un PR de gastos compartidos sigue siendo todo", ["src/features/expenses/split-editor.tsx", "src/features/shared/shared-row.tsx"], ALL, null],
    // Revisión del gestor del PR #70 (2): es.ts sin ningún área corre todo; con un área, sigue siendo neutro.
    ["solo es.ts: todos", ["src/lib/copy/es.ts"], ALL, null],
    ["es.ts con neutros (documentación y specs E2E): todos", ["src/lib/copy/es.ts", "docs/TESTING.md", "tests/e2e/goals.e2e.ts"], ALL, null],
    ["es.ts con un área: solo el área", ["src/lib/copy/es.ts", "src/features/balance/balance-panel.tsx", "docs/TESTING.md"], a("routes", "balance"), ["balance"]],
    ["una migración que no es de metas ni de presupuestos", ["supabase/migrations/20261120000300_couple_fix.sql"], ALL, null],
  ] as const)("%s", (_name, changed, expected, areas) => {
    const result = select([...changed], exists);
    expect(result.files).toEqual(ordered([...expected]));
    expect(result.run).toEqual(result.files);
    expect(result.missing).toEqual([]);
    expect(result.routeAreas).toEqual(areas === null ? null : [...areas]);
    expect(result.skip).toBe(false);
    expect(result.all).toBe(result.files.length === ALL.length && result.routeAreas === null);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it.each([
    ["solo documentación", ["docs/TESTING.md", "specs/004-presupuestos-y-metas/contracts/ci.md", "README.md"]],
    ["solo specs E2E", ["tests/e2e/goals.e2e.ts"]],
    ["las pruebas de Vitest de tests/a11y no son del paso de axe", ["tests/a11y/job-selection.test.ts"]],
  ] as const)("neutros, nada: %s (el paso se salta)", (_name, changed) => {
    const result = select([...changed], exists);
    expect(result).toMatchObject({ files: [], run: [], skip: true, routeAreas: null });
    expect(summary(result) as string).toContain("Ninguno");
  });

  it("base ausente (clon superficial, evento sin PR o fallo de git): todos, con el registro completo", () => {
    expect(changedFiles(null, () => "")).toBeNull();
    expect(changedFiles("origin/main", () => { throw new Error("fatal: bad revision"); })).toBeNull();
    expect(changedFiles("origin/main", () => "src/lib/db/budgets.ts\n\nREADME.md\n")).toEqual(["src/lib/db/budgets.ts", "README.md"]);
    expect(select(null, exists)).toMatchObject({ files: ALL, run: ALL, missing: [], routeAreas: null, skip: false, all: true });
  });

  it("un archivo a11y previsto que todavía no existe no se pasa a Playwright: el resumen lo anota", () => {
    const missing = "tests/a11y/goal-expense.a11y.ts";
    const result = select(GOALS_PR, (path) => path !== missing);
    expect(result.files).toContain(missing);
    expect(result.run).not.toContain(missing);
    expect(result.missing).toEqual([missing]);
    const text = summary(result) as string;
    expect(text).toContain(`\`${missing}\`: todavía no existe`);
    expect(text).toContain("Corre: `tests/a11y/goals.a11y.ts`");
    expect(text).toContain(`Corre: \`${ROUTES_FILE}\` — registro: solo metas`);
    expect(text).toContain("No corre: `tests/a11y/plan.a11y.ts`");
  });

  it("las rutas de Windows se normalizan antes de clasificar", () => {
    expect(select(["src\\features\\plan\\plan-screen.tsx"], exists).files).toEqual(a("routes", "plan"));
  });

  // Como SPECS en e2e-select (F67-3): un archivo a11y que no esté en el mapa no correría nunca en un PR de área, en silencio.
  it("FILES cubre todos los tests/a11y/**/*.a11y.ts del repositorio (recursivo)", () => {
    const onDisk = readdirSync("tests/a11y", { recursive: true, encoding: "utf8" }).map((name) => name.replace(/\\/g, "/"))
      .filter((name) => name.endsWith(".a11y.ts")).map((name) => `tests/a11y/${name}`);
    expect(onDisk.filter((path) => !ALL.includes(path))).toEqual([]);
    expect(ALL.filter((path) => !onDisk.includes(path))).toEqual([]);
  });
});

describe("el registro por área (route-registry.ts, A11Y_ROUTE_AREAS)", () => {
  it("el selector y el registro usan las mismas áreas", () => {
    expect([...(ROUTE_AREAS as string[])]).toEqual([...REGISTRY_AREAS]);
  });

  it("cada ruta del registro tiene área; las de metas, plan, Balance y pareja van con la suya y lo demás es núcleo", () => {
    expect(routeArea("/metas")).toBe("metas");
    expect(routeArea("/metas/[id]")).toBe("metas");
    expect(routeArea("/plan")).toBe("presupuestos");
    expect(routeArea("/plan/analisis")).toBe("presupuestos");
    expect(routeArea("/balance")).toBe("balance");
    expect(routeArea("/cuenta/pareja")).toBe("pareja");
    expect(routeArea("/invitacion")).toBe("pareja");
    for (const route of ["/", "/actividad", "/actividad/[id]", "/cuenta", "/cuenta/perfil", "/cuenta/privacidad", "/entrar", "/nueva-contrasena"]) expect(routeArea(route), route).toBe("nucleo");
    for (const entry of registry) expect(REGISTRY_AREAS, entry.route).toContain(routeArea(entry.route));
  });

  it("una ruta que el mapa no clasifica cuenta como núcleo", () => {
    expect(routeArea("/ruta-nueva-sin-area")).toBe("nucleo");
    expect(routeArea("/metasfalsas")).toBe("nucleo");
  });

  it("fail-safe: sin la variable, vacía, con un valor desconocido o en el barrido, todo el registro", () => {
    expect(routeAreaFilter({})).toBeNull();
    expect(routeAreaFilter({ A11Y_ROUTE_AREAS: "" })).toBeNull();
    expect(routeAreaFilter({ A11Y_ROUTE_AREAS: "metas otra" })).toBeNull();
    expect(routeAreaFilter({ A11Y_ROUTE_AREAS: "metas", A11Y_LEVEL: "sweep" })).toBeNull();
    expect([...routeAreaFilter({ A11Y_ROUTE_AREAS: "metas, presupuestos" })!]).toEqual(["metas", "presupuestos"]);
  });
});

/** Los casos que lista Playwright (nivel ligero, job e2e) con un entorno. */
function list(args: string[], env: Record<string, string>) {
  const result = spawnSync(process.execPath, [join("node_modules", "@playwright", "test", "cli.js"), "test", "--project=a11y", ...args, "--list", "--reporter=list"], {
    encoding: "utf8", env: { ...process.env, A11Y_JOB: "e2e", A11Y_LEVEL: "", A11Y_ROUTE_AREAS: "", CI: "", ...env },
  });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.split("\n").filter((line) => line.includes(".a11y.ts"));
}
const fileOf = (line: string) => line.match(/([a-z-]+\.a11y\.ts):\d+:\d+/)![1];
const routeOf = (line: string) => line.match(/routes\.a11y\.ts:\d+:\d+ › (\/\S*) · /)?.[1];

describe("el comando real con --list", () => {
  it("el script corre y el PR de metas lista goals, goal-expense y solo los casos de /metas del registro", () => {
    const script = spawnSync(process.execPath, [join("scripts", "a11y-select.mjs"), "--base", "HEAD"], { encoding: "utf8", env: { ...process.env, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" } });
    expect(script.status, script.stderr).toBe(0);
    expect(script.stderr).toContain("Accesibilidad de nivel ligero del PR");
    const selection = select(GOALS_PR, exists);
    const lines = list(selection.run, { A11Y_ROUTE_AREAS: selection.routeAreas!.join(" ") });
    expect([...new Set(lines.map(fileOf))].sort()).toEqual(["goal-expense.a11y.ts", "goals.a11y.ts", "routes.a11y.ts"]);
    const routes = lines.filter((line) => line.includes("routes.a11y.ts")).map(routeOf);
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.filter((route) => !route || routeArea(route) !== "metas")).toEqual([]);
  });

  it("sin A11Y_ROUTE_AREAS o con un valor desconocido, routes.a11y.ts lista el registro completo (también la barra de /cuenta)", () => {
    const full = list([ROUTES_FILE], {});
    const unknown = list([ROUTES_FILE], { A11Y_ROUTE_AREAS: "desconocida" });
    expect(unknown).toEqual(full);
    expect(new Set(full.map(routeOf).filter(Boolean).map((route) => routeArea(route!)))).toEqual(new Set(REGISTRY_AREAS));
    expect(full.some((line) => line.includes("barra"))).toBe(true);
    // El núcleo solo: sin metas, plan, Balance ni pareja, con la barra de /cuenta.
    const core = list([ROUTES_FILE], { A11Y_ROUTE_AREAS: "nucleo" });
    expect(core.length).toBeLessThan(full.length);
    expect(core.map(routeOf).filter((route) => route && routeArea(route) !== "nucleo")).toEqual([]);
    expect(core.some((line) => line.includes("barra"))).toBe(true);
  });

  it("el barrido (@sweep) ignora A11Y_ROUTE_AREAS y recorre el registro completo", () => {
    const sweep = list([ROUTES_FILE], { A11Y_LEVEL: "sweep" });
    expect(list([ROUTES_FILE], { A11Y_LEVEL: "sweep", A11Y_ROUTE_AREAS: "metas" })).toEqual(sweep);
  });
}, 180_000);
