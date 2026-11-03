// @vitest-environment node
// T012 / ADR-011 §6: hex fuera de tokens, esperas fijas y dependencias de domain.
import { readFile } from "node:fs/promises";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ ignore: false });
const fixture = (name: string) => readFile(`tests/lint-fixtures/${name}`, "utf8");
const restrictedLines = (messages: { ruleId: string | null; line: number }[]) =>
  messages.filter(({ ruleId }) => ruleId === "no-restricted-syntax").map(({ line }) => line);

describe("reglas de lint propias (T012)", () => {
  it.each([
    ["hex.tsx", [2, 4, 4]],
    ["hex.css", [4, 8]],
    ["wait.a11y.ts", [5, 6]],
  ] as const)("marca las líneas exactas de %s y permite las anclas", async (name, lines) => {
    const [result] = await eslint.lintFiles(`tests/lint-fixtures/${name}`);
    expect(restrictedLines(result.messages)).toEqual(lines);
  });
  it("permite los colores en tokens.css", async () => {
    const [result] = await eslint.lintText(await fixture("hex.css"), { filePath: "src/styles/tokens.css" });
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });
  it("impide importar la interfaz desde domain", async () => {
    const [result] = await eslint.lintText(await fixture("domain-import.ts"), { filePath: "src/domain/fixture.ts" });
    expect(result.messages.filter(({ ruleId }) => ruleId === "no-restricted-imports").map(({ line }) => line)).toEqual([1, 2]);
  });
});
