// @vitest-environment node
// 004 PR B · T032 — capa: unidad de scripts/ (como la prueba del guardia), proyecto `components`.
// Criterio literal (tasks.md, T032): «las fixtures de contracts/ci.md (PR B con y sin selector, C, D, E, exportación aislada,
// Anotar aislado, `src/components/`, solo documentación, sin clasificar, base ausente) y la regla de specs que todavía no
// existen (no se pasan; el resumen las anota)». Cumple: F64-5.
// Si un PR real no da lo que su fixture espera, se corrige el mapa del selector o el fixture, nunca a mano en el workflow.
import { describe, expect, it } from "vitest";
import { changedFiles, selectSpecs, SPECS, summary } from "../scripts/e2e-select.mjs";

type Selection = { specs: number[]; run: string[]; missing: number[]; all: boolean; reasons: string[] };
const select = selectSpecs as (changed: string[] | null, exists?: (path: string) => boolean) => Selection;
const files = SPECS as Record<number, string>;
// Hoy (PR B): existen las specs 1, 2, 3 y 5; la 4 nace en el PR C.
const beforeC = (path: string) => path !== files[4];
const afterC = () => true;

const PR_B = ["src/app/(app)/plan/page.tsx", "src/features/plan/plan-screen.tsx", "src/features/plan/budget-sheet.tsx", "src/domain/budgets/index.ts",
  "src/lib/db/budgets.ts", "src/lib/copy/es.ts", "src/lib/db/errors.ts", "tests/e2e/budgets.e2e.ts"];
const PR_C = ["src/app/(app)/metas/page.tsx", "src/app/(app)/metas/[id]/page.tsx", "src/features/goals/goal-card.tsx", "src/domain/goals/index.ts",
  "src/lib/db/goals.ts", "src/features/home/home-view.tsx", "src/features/activity/activity-view.tsx", "src/lib/copy/es.ts", "tests/e2e/goals.e2e.ts"];
const PR_D = ["src/features/expenses/goal-funding/funding-ledger.tsx", "src/features/expenses/annotate-sheet.tsx", "src/lib/db/goal-usage.ts",
  "src/lib/db/errors.ts", "src/lib/copy/es.ts", "tests/e2e/goals.e2e.ts"];
const PR_E = ["src/app/(app)/plan/analisis/page.tsx", "src/features/analysis/analysis-screen.tsx", "src/domain/analysis/index.ts",
  "src/domain/metrics/index.ts", "src/lib/db/export.ts", "src/lib/copy/es.ts", "tests/e2e/budgets.e2e.ts"];

describe("selector de specs E2E por área (contracts/ci.md, F64-5)", () => {
  it.each([
    ["PR B con el selector (toca scripts/ y .github/): las existentes por la regla 6, la 4 anotada", [...PR_B, "scripts/e2e-select.mjs", ".github/workflows/ci.yml"], beforeC, [1, 2, 3, 4, 5], [4], true],
    ["PR B sin el selector (una corrección posterior del área)", PR_B, beforeC, [1, 2, 3, 5], [], false],
    ["PR C", PR_C, afterC, [1, 2, 3, 4], [], false],
    ["PR D", PR_D, afterC, [1, 2, 3, 4], [], false],
    ["PR E (métricas: las dos áreas)", PR_E, afterC, [1, 2, 3, 4, 5], [], true],
    ["un cambio en src/components/ dentro de un PR de área", [...PR_C, "src/components/ui/button.tsx"], afterC, [1, 2, 3, 4, 5], [], true],
    ["exportación aislada", ["src/lib/db/export.ts"], afterC, [1, 2, 3, 4, 5], [], true],
    ["Anotar aislado", ["src/features/expenses/annotate-sheet.tsx"], afterC, [1, 2, 3, 4], [], false],
    ["solo documentación", ["docs/TESTING.md", "specs/004-presupuestos-y-metas/evidence.md", "README.md"], afterC, [1, 2, 3], [], false],
    ["un neutro (Balance)", ["src/features/balance/balance-panel.tsx", "src/lib/copy/es.ts"], afterC, [1, 2, 3], [], false],
    ["un archivo sin clasificar", ["src/features/nueva-cosa/rara.tsx"], afterC, [1, 2, 3, 4, 5], [], true],
    ["migración y prueba SQL de presupuestos", ["supabase/migrations/20261120000100_budget_fix.sql", "supabase/tests/12_budgets.test.sql"], afterC, [1, 2, 3, 5], [], false],
    ["migración y prueba SQL de metas", ["supabase/migrations/20261120000200_goal_fix.sql", "supabase/tests/13_goals.test.sql"], afterC, [1, 2, 3, 4], [], false],
    ["una migración que no es de metas ni de presupuestos", ["supabase/migrations/20261120000300_couple_fix.sql"], afterC, [1, 2, 3, 4, 5], [], true],
    ["la meta inmersiva", ["src/app/(app)/metas/[id]/page.tsx"], afterC, [1, 2, 3, 4], [], false],
  ] as const)("%s", (_name, changed, exists, specs, missing, all) => {
    const result = select([...changed], exists);
    expect(result.specs).toEqual(specs);
    expect(result.missing).toEqual(missing);
    expect(result.all).toBe(all);
    expect(result.run).toEqual(specs.filter((spec) => !missing.includes(spec as never)).map((spec) => files[spec]));
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("base ausente (clon superficial, evento sin PR o fallo de git): todas las existentes, con la 4 anotada", () => {
    expect(changedFiles(null, () => "")).toBeNull();
    expect(changedFiles("origin/main", () => { throw new Error("fatal: bad revision"); })).toBeNull();
    expect(changedFiles("origin/main", () => "src/lib/db/budgets.ts\n\nREADME.md\n")).toEqual(["src/lib/db/budgets.ts", "README.md"]);
    const result = select(null, beforeC);
    expect(result).toMatchObject({ specs: [1, 2, 3, 4, 5], missing: [4], all: true });
    expect(result.run).toEqual([files[1], files[2], files[3], files[5]]);
  });

  it("una spec prevista que todavía no existe nunca se pasa a Playwright ni se da por aprobada: el resumen la anota", () => {
    const result = select(PR_C, beforeC);
    expect(result.run).not.toContain(files[4]);
    expect(result.missing).toEqual([4]);
    const text = summary(result) as string;
    expect(text).toContain("Spec 4: todavía no existe");
    for (const spec of [1, 2, 3]) expect(text).toContain(files[spec]);
  });

  it("las rutas de Windows se normalizan antes de clasificar", () => {
    expect(select(["src\\features\\plan\\plan-screen.tsx"], afterC).specs).toEqual([1, 2, 3, 5]);
  });
});
