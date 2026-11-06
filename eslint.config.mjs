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
    messages: { dynamic: "domain solo admite especificadores literales estáticos", outside: "FR-003 / maestro §7.2: domain solo puede importar archivos de domain o módulos integrados de Node ({{source}})." },
  },
  create(context) {
    function check(source, owner) {
      if (!source && !owner) return;
      const specifier = source?.type === "TemplateLiteral" && source.expressions.length === 0
        ? source.quasis[0].value.cooked : source?.value;
      if (typeof specifier !== "string") {
        context.report({ node: source ?? owner, messageId: "dynamic" });
        return;
      }
      if (isBuiltin(specifier)) return;
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
        if (node.callee.type === "Identifier" && node.callee.name === "require") {
          if (node.arguments.length !== 1) context.report({ node, messageId: "dynamic" });
          else check(node.arguments[0], node);
        }
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
const serviceSelectors = [
  { selector: "Identifier[name=/^SUPABASE_(SECRET_KEY|SERVICE_ROLE_KEY)$/]", message: "FR-011: ninguna clave privilegiada en la app." },
  { selector: "Literal[value=/service_role/]", message: "FR-011: ningún rol de servicio en la app." },
  { selector: "TemplateElement[value.raw=/service_role/]", message: "FR-011: ningún rol de servicio en la app." },
  // Decisión 18: la clave secreta de juntia-dev vive en .env.test y solo la leen scripts/dev-target y las pruebas.
  { selector: "Identifier[name=/^(JUNTIA_DEV_|SECRET_KEY$)/]", message: "Decisión 18: la clave y la conexión de juntia-dev solo existen en los scripts de prueba." },
  { selector: "Literal[value=/JUNTIA_DEV_|^SECRET_KEY$|sb_secret_|\\.env\\.test/]", message: "Decisión 18: la clave y la conexión de juntia-dev solo existen en los scripts de prueba." },
  { selector: "TemplateElement[value.raw=/JUNTIA_DEV_|sb_secret_|\\.env\\.test/]", message: "Decisión 18: la clave y la conexión de juntia-dev solo existen en los scripts de prueba." },
];
// F48-4 (decisión 18): src/ no importa nada de scripts/ (el runner de juntia-dev y su clave secreta), ni por ruta
// relativa, ni por alias, ni con export … from, import() o require().
const SCRIPTS_MSG = "Decisión 18: la app no importa scripts/ (runner y guardia de juntia-dev).";
const SCRIPTS_PATH = "/(^|[\\/])scripts[\\/]/";
const scriptSelectors = [
  { selector: `ImportExpression[source.value=${SCRIPTS_PATH}]`, message: SCRIPTS_MSG },
  { selector: `ImportExpression > TemplateLiteral[quasis.0.value.raw=${SCRIPTS_PATH}]`, message: SCRIPTS_MSG },
  { selector: `CallExpression[callee.name='require'] > Literal[value=${SCRIPTS_PATH}]`, message: SCRIPTS_MSG },
  { selector: `CallExpression[callee.name='require'] > TemplateLiteral[quasis.0.value.raw=${SCRIPTS_PATH}]`, message: SCRIPTS_MSG },
];
const scriptImports = { group: ["**/scripts/**", "scripts/**"], message: SCRIPTS_MSG };
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".agents/**", ".claude/skills/**", ".claude/worktrees/**", ".next/**", "node_modules/**", "tests/lint-fixtures/**", "next-env.d.ts"]),
  { files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"], rules: { "no-restricted-syntax": ["error", ...hexSelectors] } },
  { files: ["src/**/*.{js,jsx,mjs,cjs,ts,tsx}"], rules: { "no-restricted-syntax": ["error", ...hexSelectors, ...serviceSelectors, ...scriptSelectors],
    "no-restricted-imports": ["error", { patterns: [scriptImports] }] } },
  { files: ["src/**/*.{js,jsx,mjs,cjs,ts,tsx}"], ignores: ["src/lib/db/**", "src/lib/supabase/**"], rules: { "no-restricted-syntax": ["error", ...hexSelectors, ...serviceSelectors, ...scriptSelectors,
    { selector: "CallExpression[callee.property.name=/^(rpc|from)$/]", message: "FR-010: el acceso a datos pertenece a src/lib/db o src/lib/supabase." },
  ] } },
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
    patterns: [scriptImports, { group: ["react/*", "react-dom/*", "next/*", "motion/*", "@phosphor-icons/*", "@radix-ui/*", "@supabase/*", "@/components/*", "@/lib/db/*", "@/lib/supabase/*"], message: "Maestro §7.2: domain no depende de la interfaz ni de SDK de proveedores." }],
  }] } },
]);


