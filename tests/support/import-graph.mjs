// Revisión del PR #70 (F70-1..3): el grafo de imports estáticos de src/, sin dependencias. Lo usa tests/a11y-select.test.ts
// para comprobar que ningún archivo asignado a un área lo importa otra área, el layout o un archivo compartido. Un parser
// sencillo: `import … from "…"`, `export … from "…"`, `import "…"` e `import("…")`; resuelve rutas relativas y el alias `@/`
// (tsconfig.json) con las extensiones .ts, .tsx, .js, .mjs e index. Los paquetes (sin `.` ni `@/`) se ignoran.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { posix } from "node:path";

const SOURCE = /\.(?:ts|tsx|js|mjs)$/;
const IMPORT = /(?:\bimport\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?|\bexport\s+(?:type\s+)?[^'";]*?\s+from\s+|\bimport\s*\(\s*)["']([^"']+)["']/g;
const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"];

/** Todos los archivos fuente de un directorio (rutas con `/`, relativas a la raíz del repositorio). */
export function sourceFiles(root = "src") {
  return readdirSync(root, { recursive: true, encoding: "utf8" }).map((name) => posix.join(root, name.replace(/\\/g, "/")))
    .filter((path) => SOURCE.test(path) && statSync(path).isFile());
}

/**
 * Los especificadores que importa un texto fuente con valores. Se ignoran los imports solo de tipos (`import type`,
 * `export type` o `{ type A, type B }`): no cambian lo que se renderiza, y si un tipo cambia, los archivos que lo usan y
 * cambian con él ya están en el diff del PR.
 */
export function importSpecifiers(text) {
  return [...text.matchAll(IMPORT)].filter((match) => !typeOnly(match[0])).map((match) => match[1]);
}

function typeOnly(statement) {
  if (/^(?:import|export)\s+type\s/.test(statement)) return true;
  const braces = statement.match(/^import\s+\{([^}]*)\}\s+from/);
  if (!braces) return false;
  const names = braces[1].split(",").map((name) => name.trim()).filter(Boolean);
  return names.length > 0 && names.every((name) => name.startsWith("type "));
}

/** Resuelve un especificador desde un archivo a una ruta del repositorio, o `null` si es un paquete o no existe. */
export function resolveImport(from, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = posix.join("src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = posix.join(posix.dirname(from), specifier);
  else return null;
  for (const extension of EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Mapa archivo → archivos que lo importan (solo dentro de `files`). */
export function importers(files) {
  const known = new Set(files);
  const byTarget = new Map(files.map((file) => [file, []]));
  for (const file of files) {
    for (const specifier of importSpecifiers(readFileSync(file, "utf8"))) {
      const target = resolveImport(file, specifier);
      if (target && known.has(target) && target !== file) byTarget.get(target).push(file);
    }
  }
  return byTarget;
}

