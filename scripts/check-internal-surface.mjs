// T039 / FR-053, SC-002: sobre el build ya hecho, el despliegue de producción no expone /interno/primitivos.
// contracts/ci.md: arranca `next start` con el entorno de cada destino y pide la ruta con distintos Host.
// URLs de prueba ficticias; nunca dominios reales. El caso JUNTIA_INTERNAL_SURFACE=1 → 200 lo cubre test:a11y.
import { spawn } from "node:child_process";
import { request } from "node:http";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { once } from "node:events";

const require = createRequire(import.meta.url);
const ROUTE = "/interno/primitivos";
const INTERNAL_TITLE = "Superficie interna de revisión";
const urls = {
  VERCEL_URL: "juntia-prueba123-equipo.vercel.app",
  VERCEL_BRANCH_URL: "juntia-git-rama-prueba-equipo.vercel.app",
  VERCEL_PROJECT_PRODUCTION_URL: "juntia-produccion.example",
};
const destinations = [
  { name: "VERCEL=1 VERCEL_ENV=production + URLs de prueba", env: { VERCEL: "1", VERCEL_ENV: "production", ...urls }, cases: [
    { host: urls.VERCEL_PROJECT_PRODUCTION_URL, label: "dominio de producción", expected: 404 },
    { host: urls.VERCEL_URL, label: "URL de despliegue", expected: 404 },
  ] },
  { name: "VERCEL=1 VERCEL_ENV=preview + URLs de prueba", env: { VERCEL: "1", VERCEL_ENV: "preview", ...urls }, cases: [
    { host: urls.VERCEL_URL, label: "URL de despliegue", expected: 200 },
    { host: urls.VERCEL_BRANCH_URL, label: "URL de rama", expected: 200 },
    { host: urls.VERCEL_PROJECT_PRODUCTION_URL, label: "dominio de producción (alias)", expected: 404 },
  ] },
  { name: "ninguna variable", env: {}, cases: [{ host: "localhost", label: "localhost", expected: 404 }] },
];

// Entorno del proceso padre sin ninguna señal que abra la superficie: cada fila parte de cero.
function baseEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^(VERCEL|JUNTIA_INTERNAL_SURFACE$|NODE_ENV$)/.test(key)) delete env[key];
  return env;
}

async function freePort() {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const { port } = reservation.address();
  await new Promise((resolve, reject) => reservation.close((error) => (error ? reject(error) : resolve())));
  return port;
}

async function start(env) {
  const port = await freePort();
  const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--port", String(port)], { env: { ...baseEnv(), ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`El servidor no arrancó: ${output}`)), 30000);
    const receive = (chunk) => { output += chunk; if (/Ready in/.test(output)) { clearTimeout(deadline); resolve(); } };
    server.stdout.on("data", receive);
    server.stderr.on("data", receive);
    server.once("error", (error) => { clearTimeout(deadline); reject(error); });
    server.once("exit", (code) => { clearTimeout(deadline); reject(new Error(`El servidor terminó con ${code}: ${output}`)); });
  });
  return { server, port };
}

// fetch no deja fijar la cabecera Host; http.request sí. Con `rsc`, pide la variante RSC independiente que usa la
// navegación del cliente (cabecera `RSC: 1` y parámetro `_rsc`), además del HTML (revisión del PR #27, F27-1).
// Next responde una redirección 307 cuando `_rsc` no coincide con las cabeceras; se sigue una vez.
function status(port, host, rsc, path = rsc ? `${ROUTE}?_rsc` : ROUTE, hops = 0) {
  return new Promise((resolve, reject) => {
    const headers = rsc ? { host, RSC: "1" } : { host };
    const req = request({ host: "127.0.0.1", port, path, headers }, (res) => {
      if (rsc && res.statusCode === 307 && res.headers.location && hops === 0) {
        res.resume();
        res.on("end", () => status(port, host, rsc, res.headers.location, 1).then(resolve, reject));
        return;
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ code: res.statusCode, body, type: String(res.headers["content-type"] ?? "") }));
    });
    req.on("error", reject);
    req.end();
  });
}

const rows = [];
for (const destination of destinations) {
  const { server } = await start(destination.env).then((started) => (destination.started = started));
  try {
    for (const { host, label, expected } of destination.cases) {
      for (const rsc of [false, true]) {
        const got = await status(destination.started.port, host, rsc);
        // La variante RSC tiene que llegar de verdad como RSC; si no, la fila no prueba nada.
        const format = rsc ? (got.type.includes("text/x-component") ? "RSC" : `RSC esperado, llegó ${got.type || "sin tipo"}`) : "HTML";
        const closed = expected === 404;
        const hasTitle = got.body.includes(INTERNAL_TITLE);
        // Cerrada: ni el HTML (con su RSC incrustado) ni la respuesta RSC nombran la ruta interna. Abierta: el RSC sí
        // trae el título, prueba de que esa variante lleva los metadatos y de que la fila cerrada no pasa en vacío.
        // Una respuesta RSC de notFound() llega con 200; su código no se compara.
        const leaks = closed && hasTitle;
        const codeOk = rsc ? true : got.code === expected;
        const ok = codeOk && !leaks && (!rsc || (format === "RSC" && (closed || hasTitle)));
        rows.push({ destino: destination.name, host: `${label} (${host})`, formato: format, obtenido: got.code, esperado: expected, fuga: leaks ? "SÍ" : "no", resultado: ok ? "OK" : "FALLÓ" });
      }
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (server.exitCode === null) { server.kill(); await once(server, "exit"); }
  }
}
console.log(`check:internal-surface · ${ROUTE}`);
console.table(rows);
if (rows.length !== 12 || rows.some((row) => row.resultado !== "OK")) process.exitCode = 1;
