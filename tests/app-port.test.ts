// @vitest-environment node
// Puerto local de Juntia: una sola fuente (PORT, 3400 por defecto) para `next dev`/`next start`, Playwright y
// `e2e:dev`, fuera del 3000 y el 3100 de otro proyecto del mismo equipo. Nunca se reutiliza lo que haya en el puerto
// y, si está ocupado, se dice qué PID lo tiene y no se cierra nada.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:net";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appOrigin, appPort, assertPortFree, DEFAULT_PORT, listeningPids, nextArgs, parseNetstat, parseSs, portInUse, webServer } from "../scripts/app-port.mjs";

describe("appPort y appOrigin", () => {
  it("usan 3400 sin PORT o con PORT vacío", () => {
    expect(DEFAULT_PORT).toBe(3400);
    expect(appPort({})).toBe(3400);
    expect(appPort({ PORT: "" })).toBe(3400);
    expect(appOrigin({})).toBe("http://localhost:3400");
  });
  it("leen PORT para un segundo servidor", () => {
    expect(appPort({ PORT: "3500" })).toBe(3500);
    expect(appOrigin({ PORT: "3500" })).toBe("http://localhost:3500");
  });
  it.each(["abc", "3400x", "34.5", "0", "80", "70000", "-1"])("rechazan PORT=%s nombrando la variable", (value) => {
    expect(() => appPort({ PORT: value })).toThrow(/PORT/);
  });
});

describe("argumentos de next (F58-1)", () => {
  it.each([["-p", "3000"], ["--port", "3000"], ["--port=3000"], ["-p3000"], ["-p=3000"], ["-p+3000"], ["--turbo", "-p", "3000"]])("rechaza %s pidiendo la variable PORT", (...args) => {
    expect(() => nextArgs("dev", args, {})).toThrow(/PORT/);
  });
  it("con PORT=3500 o sin PORT fija el puerto comprobado y conserva el resto", () => {
    expect(nextArgs("dev", ["--turbo"], { PORT: "3500" })).toEqual(["dev", "--port", "3500", "--turbo"]);
    expect(nextArgs("start", [], {})).toEqual(["start", "--port", "3400"]);
    expect(nextArgs("start", ["--hostname", "127.0.0.1", "--keepAliveTimeout", "5000"], {})).toEqual(["start", "--port", "3400", "--hostname", "127.0.0.1", "--keepAliveTimeout", "5000"]);
  });
  it("el lanzador se niega antes de arrancar Next", () => {
    const result = spawnSync(process.execPath, [join(process.cwd(), "scripts", "next.mjs"), "dev", "--port", "3000"], { encoding: "utf8", timeout: 15_000 });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/PORT/);
    expect(result.stdout).not.toMatch(/Next\.js|Ready/);
  });
});

describe("webServer de Playwright", () => {
  it("nunca reutiliza un servidor y apunta al mismo puerto que la app", () => {
    expect(webServer({})).toMatchObject({ command: "npm run start", url: "http://localhost:3400/entrar", reuseExistingServer: false, env: { PORT: "3400" } });
    expect(webServer({ PORT: "3500" })).toMatchObject({ url: "http://localhost:3500/entrar", reuseExistingServer: false, env: { PORT: "3500" } });
  });
});

describe("quién escucha en el puerto", () => {
  it("lee netstat de Windows en cualquier idioma, IPv4 e IPv6, sin confundir otros puertos ni conexiones", () => {
    const netstat = [
      "  Proto  Dirección local          Dirección remota        Estado           PID",
      "  TCP    0.0.0.0:3400           0.0.0.0:0              ESCUCHANDO       5120",
      "  TCP    [::]:3400              [::]:0                 LISTENING       5120",
      "  TCP    127.0.0.1:3400         127.0.0.1:51234        ESTABLISHED     5120",
      "  TCP    127.0.0.1:51234        127.0.0.1:3400         ESTABLISHED     7777",
      "  TCP    0.0.0.0:34000          0.0.0.0:0              LISTENING       8888",
      "  TCP    0.0.0.0:13400          0.0.0.0:0              LISTENING       9999",
      "  TCP    127.0.0.1:3400         0.0.0.0:0              LISTENING       6000",
      "  UDP    0.0.0.0:3400           *:*                                    1111",
    ].join("\r\n");
    expect(parseNetstat(netstat, 3400)).toEqual([5120, 6000]);
  });
  it("lee ss de Linux", () => {
    const ss = [
      'LISTEN 0 511 *:3400 *:* users:(("next-server (v1",pid=4321,fd=21))',
      'LISTEN 0 511 0.0.0.0:34000 0.0.0.0:* users:(("node",pid=1,fd=3))',
      "LISTEN 0 4096 127.0.0.1:3400 0.0.0.0:*",
    ].join("\n");
    expect(parseSs(ss, 3400)).toEqual([4321]);
  });
  it("usa netstat en Windows y lsof, con ss de respaldo, en POSIX", () => {
    const calls: string[] = [];
    const run = (file: string) => { calls.push(file); return file === "netstat" ? "  TCP    0.0.0.0:3400   0.0.0.0:0   LISTENING   42" : file === "lsof" ? null : 'LISTEN 0 1 *:3400 *:* users:(("x",pid=43,fd=1))'; };
    expect(listeningPids(3400, { platform: "win32", run })).toEqual([42]);
    expect(listeningPids(3400, { platform: "linux", run })).toEqual([43]);
    expect(calls).toEqual(["netstat", "lsof", "ss"]);
  });
});

describe("puerto ocupado", () => {
  let server: Server | null = null;
  afterEach(async () => { if (server) await new Promise((done) => server!.close(done)); server = null; });
  const listen = async (host?: string) => {
    server = createServer();
    await new Promise<void>((done) => server!.listen(0, host, done));
    return (server.address() as { port: number }).port;
  };

  it("lo detecta con un servidor en todas las interfaces o solo en 127.0.0.1, y lo ve libre al cerrarse", async () => {
    const port = await listen();
    expect(await portInUse(port)).toBe(true);
    await new Promise((done) => server!.close(done));
    server = null;
    expect(await portInUse(port)).toBe(false);
    expect(await portInUse(await listen("127.0.0.1"))).toBe(true);
  });

  it("se niega nombrando el puerto, sin cerrar el proceso que lo tiene", async () => {
    const port = await listen();
    await expect(assertPortFree(port)).rejects.toThrow(new RegExp(`puerto ${port} está ocupado.*no reutiliza`));
    expect(server!.listening).toBe(true);
  });

  it.runIf(process.platform === "win32")("nombra el PID real del proceso que escucha (Windows)", async () => {
    const port = await listen();
    await expect(assertPortFree(port)).rejects.toThrow(new RegExp(`PID ${process.pid}\\b`));
  });

  it("pasa con el puerto libre", async () => {
    const port = await listen();
    await new Promise((done) => server!.close(done));
    server = null;
    await expect(assertPortFree(port)).resolves.toBeUndefined();
  });
});

describe("ningún localhost:3000 en lo que arranca o configura la app", () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
  it.each(["playwright.config.ts", "scripts/dev-target/run.mjs", ".github/workflows/ci.yml", "supabase/config.toml", "package.json"])("%s", (path) => {
    expect(read(path)).not.toMatch(/localhost:3000|127\.0\.0\.1:3000|-p 3000|--port 3000/);
  });
  it("el SITE_URL del CI y el site_url de Supabase local usan el puerto por defecto", () => {
    const origin = `http://localhost:${DEFAULT_PORT}`;
    const ci = [...read(".github/workflows/ci.yml").matchAll(/SITE_URL: (\S+)/g)].map((match) => match[1]);
    expect(ci.length).toBeGreaterThan(0);
    expect(new Set(ci)).toEqual(new Set([origin]));
    expect(read("supabase/config.toml")).toContain(`site_url = "${origin}"`);
    expect(read("supabase/config.toml")).toContain(`additional_redirect_urls = ["${origin}", "http://127.0.0.1:${DEFAULT_PORT}"]`);
  });
  it("dev y start pasan por el lanzador que lee PORT", () => {
    const { scripts } = JSON.parse(read("package.json"));
    expect(scripts.dev).toBe("node scripts/next.mjs dev");
    expect(scripts.start).toBe("node scripts/next.mjs start");
  });
});
