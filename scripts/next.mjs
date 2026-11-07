// `npm run dev` y `npm run start`: Next en el puerto de Juntia (PORT, 3400 por defecto; scripts/app-port.mjs), nunca
// en el 3000 de otro proyecto. Si el puerto está ocupado, dice qué PID lo tiene y no arranca ni cierra nada.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { appPort, assertPortFree } from "./app-port.mjs";

const [mode, ...rest] = process.argv.slice(2);
if (mode !== "dev" && mode !== "start") {
  console.error("Uso: node scripts/next.mjs dev|start [argumentos de next]");
  process.exit(1);
}
try {
  const port = appPort();
  await assertPortFree(port);
  const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [next, mode, "--port", String(port), ...rest], { stdio: "inherit", env: { ...process.env, PORT: String(port) } });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
