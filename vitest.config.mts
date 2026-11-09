import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // En dev, dos archivos a la vez; las barreras conservan ambos escritores concurrentes.
  test: { ...(process.env.JUNTIA_TEST_TARGET === "dev" ? {maxWorkers:2} : {}), projects: [
    { extends: true, test: { name: "domain", environment: "node", globals: true, include: ["src/domain/**/*.test.ts"] } },
    { extends: true, test: { name: "components", environment: "jsdom", include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"], exclude: ["src/domain/**", "tests/integration/**"], setupFiles: ["./vitest.setup.ts"] } },
    { extends: true, test: { name: "integration", ...(process.env.JUNTIA_TEST_TARGET === "dev" ? {testTimeout:60000,hookTimeout:60000} : {}), environment: "node", include: ["tests/integration/**/*.test.ts"] } },
  ] },
});
