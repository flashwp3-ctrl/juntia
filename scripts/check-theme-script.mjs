// T022 / FR-005: el script bloqueante debe estar dentro de head, antes de body y sin async/defer/src.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { once } from "node:events";

const require = createRequire(import.meta.url);
const reservation = createServer();
reservation.listen(0, "127.0.0.1");
await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--port", String(port)], { env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
try {
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`El servidor no arrancó: ${output}`)), 30000);
    const receive = (chunk) => { output += chunk; if (/Ready in/.test(output)) { clearTimeout(deadline); resolve(); } };
    server.stdout.on("data", receive);
    server.stderr.on("data", receive);
    server.once("error", (error) => { clearTimeout(deadline); reject(error); });
    server.once("exit", (code) => { clearTimeout(deadline); reject(new Error(`El servidor terminó con ${code}: ${output}`)); });
  });
  // T046 (002): desde el PR B las rutas de producto exigen sesión y redirigen; se pide /entrar, que se sirve sin ella.
  const response = await fetch(`http://127.0.0.1:${port}/entrar`, { redirect: "manual" });
  const html = await response.text();
  const headStart = html.search(/<head\b/i);
  const headEnd = html.search(/<\/head>/i);
  const bodyStart = html.search(/<body\b/i);
  const head = html.slice(headStart, headEnd);
  const scripts = [...head.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const script = scripts.find((match) => match[2].includes("prefers-color-scheme") && match[2].includes("data-theme"));
  const checks = [
    ["/entrar responde 200", response.status === 200],
    ["head precede a body", headStart >= 0 && headEnd > headStart && bodyStart > headEnd],
    ["script de tema inline dentro de head", Boolean(script)],
    ["script sin src, async ni defer", Boolean(script) && !/\b(?:src|async|defer)(?:\s|=|$)/i.test(script[1])],
    ["html sin data-theme fijado por el servidor", !/<html\b[^>]*\bdata-theme\b/i.test(html)],
  ];
  for (const [name, passed] of checks) console.log(`${passed ? "OK" : "FALLÓ"} · ${name}`);
  if (checks.some(([, passed]) => !passed)) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (server.exitCode === null) { server.kill(); await once(server, "exit"); }
}
