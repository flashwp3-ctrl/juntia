// @vitest-environment node
// F44-3 (revisión del PR #44): «neutraliza también \t, \r o \n iniciales y caracteres de control antes de un operador, y
// mantén el escapado RFC 4180». Capa: unidad (`components`, `node`); el archivo completo lo prueba la integración.
import { expect, it } from "vitest";
import { csvCell } from "./export";

it("neutraliza operadores y controles al principio y conserva el escapado RFC 4180", () => {
  for (const [value, cell] of [
    ["=SUM(A1)", "'=SUM(A1)"], ["+57", "'+57"], ["-1", "'-1"], ["@HOY", "'@HOY"],
    ["\t=1", "'\t=1"], ["\tTexto", "'\tTexto"], ["\u0001@x", "'\u0001@x"], ["\u007f=1", "'\u007f=1"], ["  =1", "'  =1"],
    ["\r+57", "\"'\r+57\""], ["\n-cmd", "\"'\n-cmd\""], ["=a,b", "\"'=a,b\""],
    ["Texto normal", "Texto normal"], ["a,b", "\"a,b\""], ['Dijo "hola"', '"Dijo ""hola"""'], ["1 + 1", "1 + 1"], ["", ""],
  ] as const) expect(csvCell(value), JSON.stringify(value)).toBe(cell);
  expect(csvCell(null)).toBe("");
});
