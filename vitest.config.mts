import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { projects: [
    { extends: true, test: { name: "domain", environment: "node", globals: true, include: ["src/domain/**/*.test.ts"] } },
    { extends: true, test: { name: "components", environment: "jsdom", include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"], exclude: ["src/domain/**", "tests/integration/**"], setupFiles: ["./vitest.setup.ts"] } },
    { extends: true, test: { name: "integration", environment: "node", include: ["tests/integration/**/*.test.ts"] } },
  ] },
});
