import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import css from "@eslint/css";

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
  { files: ["tests/**/*.ts"], rules: { "no-restricted-syntax": ["error", ...hexSelectors,
    { selector: "CallExpression[callee.property.name='waitForTimeout']", message: WAIT_MSG },
    { selector: "CallExpression[callee.name='setTimeout']", message: WAIT_MSG },
  ] } },
  { files: ["**/*.css"], plugins: { css }, language: "css/css", languageOptions: { tolerant: true } },
  { files: ["**/*.css"], ignores: ["src/styles/tokens.css"], rules: { "no-restricted-syntax": ["error",
    { selector: "Hash", message: HEX_MSG }, { selector: `Raw[value=/${HEX}/]`, message: HEX_MSG },
  ] } },
  { files: ["src/domain/**/*.{ts,tsx,js,jsx}"], rules: { "no-restricted-imports": ["error", {
    paths: ["react", "react-dom", "next", "motion"],
    patterns: [{ group: ["react/*", "react-dom/*", "next/*", "motion/*", "@phosphor-icons/*", "@radix-ui/*", "@supabase/*", "@/components/*"], message: "Maestro §7.2: domain no depende de la interfaz ni de SDK de proveedores." }],
  }] } },
]);


