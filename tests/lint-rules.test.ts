// @vitest-environment node
// T012 / ADR-011 §6: hex fuera de tokens, esperas fijas y dependencias de domain.
import { readFile } from "node:fs/promises";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ ignore: false });
const fixture = (name: string) => readFile(`tests/lint-fixtures/${name}`, "utf8");
const restrictedLines = (messages: { ruleId: string | null; line: number }[]) =>
  messages.filter(({ ruleId }) => ruleId === "no-restricted-syntax").map(({ line }) => line);

// 002 T005 / FR-010, FR-011: «Ningún camino que atiende a una persona usa service_role»;
// «src/lib/db/ es la única capa que conoce vistas y funciones» (contracts/ci.md, Lint nuevo).
it("marca claves privilegiadas y accesos fuera de la capa de datos", async () => {
  const [result] = await eslint.lintText(await fixture("data-boundary.ts"), { filePath: "src/features/fixture.ts" });
  expect(restrictedLines(result.messages)).toEqual([1, 2, 3, 4, 5]);
  for (const filePath of ["src/lib/db/fixture.ts", "src/lib/supabase/fixture.ts"]) {
    const [allowed] = await eslint.lintText(await fixture("data-boundary.ts"), { filePath });
    expect(restrictedLines(allowed.messages)).toEqual([1, 2, 3]);
  }
}, 30_000);

it("impide importar ambas capas de datos desde domain", async () => {
  const [result] = await eslint.lintText(await fixture("domain-data.ts"), { filePath: "src/domain/fixture.ts" });
  expect(result.messages.filter(({ ruleId }) => ruleId === "no-restricted-imports").map(({ line }) => line)).toEqual([1, 2]);
});

describe("reglas de lint propias (T012)", () => {
  // En Windows, iniciar ESLint en frío puede superar los 5 s de Vitest.
  // Los 30 s solo aplican a estos fixtures; no cambian el timeout global ni el presupuesto de verify.
  it.each([
    ["hex.tsx", [2, 4, 4]],
    ["hex.css", [4, 8]],
    ["wait.a11y.ts", [5, 6]],
    ["wait.a11y.tsx", [2]],
  ] as const)("marca las líneas exactas de %s y permite las anclas", async (name, lines) => {
    const [result] = await eslint.lintFiles(`tests/lint-fixtures/${name}`);
    expect(restrictedLines(result.messages)).toEqual(lines);
  }, 30_000);
  it("permite los colores en tokens.css", async () => {
    const [result] = await eslint.lintText(await fixture("hex.css"), { filePath: "src/styles/tokens.css" });
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });
  it("impide importar la interfaz desde domain", async () => {
    const [result] = await eslint.lintText(await fixture("domain-import.ts"), { filePath: "src/domain/fixture.ts" });
    expect(result.messages.filter(({ ruleId }) => ruleId === "no-restricted-imports").map(({ line }) => line)).toEqual([1, 2]);
  });
  // F15-1 / FR-003: domain solo importa archivos de domain o módulos integrados de Node.
  it.each([
    ["domain-paths.ts", "src/domain/fixture.ts", [1, 2, 3, 7, 8]],
    ["domain-nested-paths.ts", "src/domain/nested/fixture.ts", [1, 2]],
  ] as const)("resuelve la frontera de %s y permite imports internos y de Node", async (name, filePath, lines) => {
    const [result] = await eslint.lintText(await fixture(name), { filePath });
    const failures = result.messages.filter(({ severity }) => severity === 2);
    expect(failures.map(({ ruleId, line }) => ({ ruleId, line }))).toEqual(
      lines.map((line) => ({ ruleId: "juntia/domain-imports", line })),
    );
  }, 30_000);
});
// F15-3/F15-4: solo especificadores estáticos; cada forma conserva su frontera.
it("vigila todas las formas de importación y rechaza especificadores dinámicos", async () => {
  const [result] = await eslint.lintText(await fixture("domain-import-forms.ts"), { filePath: "src/domain/forms.ts" });
  const messages = result.messages.filter(({ ruleId }) => ruleId === "juntia/domain-imports");
  const outside = [1, 3, 5, 7, 9, 11, 13];
  const dynamic = [16, 17, 18, 19, 20, 21, 22, 23];
  expect(messages.map(({ line, messageId }) => [line, messageId])).toEqual(
    [...outside.map((line) => [line, "outside"]), ...dynamic.map((line) => [line, "dynamic"])],
  );
  expect(messages.filter(({ messageId }) => messageId === "dynamic").every(({ message }) => message === "domain solo admite especificadores literales estáticos")).toBe(true);
}, 30_000);
