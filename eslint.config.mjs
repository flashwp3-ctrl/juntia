import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import css from "@eslint/css";
import { createRequire, isBuiltin } from "node:module";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// F15-1: reutiliza el resolver que Next ya incluye, sin dependencias nuevas.
const requireFromNext = createRequire(import.meta.resolve("eslint-config-next"));
const { resolve: resolveTypeScript } = requireFromNext("eslint-import-resolver-typescript");
const sourceRoot = fileURLToPath(new URL("./src", import.meta.url));
const domainRoot = resolve(sourceRoot, "domain");
const resolverOptions = { project: fileURLToPath(new URL("./tsconfig.json", import.meta.url)) };
const domainImports = {
  meta: {
    type: "problem",
    schema: [],
    messages: { outside: "FR-003 / maestro §7.2: domain solo puede importar archivos de domain o módulos integrados de Node ({{source}})." },
  },
  create(context) {
    function check(source) {
      if (typeof source?.value !== "string" || isBuiltin(source.value)) return;
      const specifier = source.value;
      let target = resolveTypeScript(specifier, context.filename, resolverOptions).path;
      // El plugin import/no-restricted-paths omite los destinos inexistentes.
      // La regla local normaliza los del scaffold incompleto para impedir escapes con ../ o alias.
      if (!target) {
        if (specifier.startsWith("@/")) target = resolve(sourceRoot, specifier.slice(2));
        else if (specifier.startsWith("./") || specifier.startsWith("../") || isAbsolute(specifier)) {
          target = resolve(dirname(context.filename), specifier);
        }
      }
      const destination = target ? relative(domainRoot, target) : null;
      if (destination === null || destination === ".." || destination.startsWith(`..${sep}`) || isAbsolute(destination)) {
        context.report({ node: source, messageId: "outside", data: { source: specifier } });
      }
    }
    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "require") check(node.arguments[0]);
      },
      TSImportEqualsDeclaration(node) {
        if (node.moduleReference.type === "TSExternalModuleReference") check(node.moduleReference.expression);
      },
    };
  },
};

const HEX = "#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])";
const HEX_MSG = "ADR-011 §6, regla 7: usa un token semántico; los hex solo van en src/styles/tokens.css.";
const WAIT_MSG = "ADR-011 §6, regla 4: no uses esperas fijas; usa aserciones web-first.";
const hexSelectors = [
  { selector: `Literal[value=/${HEX}/]`, message: HEX_MSG },
  { selector: `TemplateElement[value.raw=/${HEX}/]`, message: HEX_MSG },
];
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".agents/**", ".claude/skills/**", ".next/**", "node_modules/**", "tests/lint-fixtures/**", "next-env.d.ts"]),
  { files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"], rules: { "no-restricted-syntax": ["error", ...hexSelectors] } },
  { files: ["tests/**/*.{ts,tsx,js,mjs,cjs}"], rules: { "no-restricted-syntax": ["error", ...hexSelectors,
    { selector: "CallExpression[callee.property.name='waitForTimeout']", message: WAIT_MSG },
    { selector: "CallExpression[callee.name='setTimeout']", message: WAIT_MSG },
  ] } },
  { files: ["**/*.css"], plugins: { css }, language: "css/css", languageOptions: { tolerant: true } },
  { files: ["**/*.css"], ignores: ["src/styles/tokens.css"], rules: { "no-restricted-syntax": ["error",
    { selector: "Hash", message: HEX_MSG }, { selector: `Raw[value=/${HEX}/]`, message: HEX_MSG },
  ] } },
  { files: ["src/domain/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}"],
    plugins: { juntia: { rules: { "domain-imports": domainImports } } },
    rules: { "juntia/domain-imports": "error", "no-restricted-imports": ["error", {
    paths: ["react", "react-dom", "next", "motion"],
    patterns: [{ group: ["react/*", "react-dom/*", "next/*", "motion/*", "@phosphor-icons/*", "@radix-ui/*", "@supabase/*", "@/components/*"], message: "Maestro §7.2: domain no depende de la interfaz ni de SDK de proveedores." }],
  }] } },
]);


