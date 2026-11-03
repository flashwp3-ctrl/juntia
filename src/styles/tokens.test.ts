// @vitest-environment node
// T014 / FR-005: el respaldo sin JavaScript declara exactamente las propiedades y valores del tema oscuro.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("mantiene el respaldo sin JavaScript idéntico al tema oscuro", () => {
  const css = readFileSync("src/styles/tokens.css", "utf8");
  const dark = css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/)?.[1];
  const fallback = css.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root:not\(\[data-theme\]\)\s*\{([^}]+)\}/)?.[1];
  expect(dark).toBeDefined();
  expect(fallback).toBeDefined();
  const declarations = (block: string) => Object.fromEntries(block.split(";").map((item) => item.trim()).filter(Boolean).map((item) => {
    const colon = item.indexOf(":");
    return [item.slice(0, colon).trim(), item.slice(colon + 1).trim()];
  }));
  expect(declarations(fallback!)).toEqual(declarations(dark!));
});
