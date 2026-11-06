// @vitest-environment node
// Decisión 18: piezas de `npm run *:dev` sin red. El lector TAP aplica las reglas de pg_prove (CI) a la salida de psql,
// y el bloqueo deja a un solo agente usar juntia-dev desde los worktrees de un clon.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { acquireDevLock, alive, killTree, unlockDevLock } from "../scripts/dev-target/lock.mjs";
import { openDevSession } from "../scripts/dev-target/session.mjs";
import { readTap } from "../scripts/dev-target/tap.mjs";

describe("lector TAP de test:db:dev", () => {
  it("pasa con todas las pruebas ok y el plan al final (no_plan) o al principio (plan)", () => {
    expect(readTap("ok 1 - a\nok 2 - b\n1..2\n", 0)).toMatchObject({ ok: true, total: 2, failed: 0 });
    expect(readTap("1..1\nok 1 - a\n", 0).ok).toBe(true);
  });
  it.each([
    ["un not ok", "ok 1 - a\nnot ok 2 - b\n# Failed test 2\n1..2\n", 0, /not ok 2 - b/],
    ["un plan que no coincide", "ok 1 - a\n1..2\n", 0, /plan de 2 y 1 pruebas/],
    ["sin plan", "ok 1 - a\n", 0, /sin plan/],
    ["psql con error", "ok 1 - a\n1..1\n", 3, /psql terminó con 3/],
    ["ninguna prueba", "", 0, /ninguna prueba/],
  ])("falla con %s", (_, output, code, problem) => {
    const tap = readTap(output, code);
    expect(tap.ok).toBe(false);
    expect(tap.problems.join(" · ")).toMatch(problem);
  });
  it("no cuenta como fallo un not ok marcado TODO", () => {
    expect(readTap("ok 1 - a\nnot ok 2 - b # TODO pendiente\n1..2\n", 0).ok).toBe(true);
  });
});

describe("bloqueo de un solo agente (F48-2)", () => {
  let dir = "";
  afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }); });
  const lockIn = () => { dir = mkdtempSync(join(tmpdir(), "juntia-lock-")); return join(dir, "juntia-dev.lock"); };
  const owner = (lock: string, data: object) => { mkdirSync(lock); writeFileSync(join(lock, "owner.json"), JSON.stringify(data)); };
  const orphan = { branch: "vieja", command: "e2e", startedAt: "2026-11-06T10:00:00.000Z", host: "este-equipo", pid: 4242, runId: "11111111-1111-4111-8111-111111111111" };

  it("deja tomarlo una vez, nombra rama y ejecución, y lo suelta", () => {
    const lock = lockIn();
    const release = acquireDevLock(lock, { branch: "feat/a", command: "test:db" });
    const meta = JSON.parse(readFileSync(join(lock, "owner.json"), "utf8"));
    expect(meta).toMatchObject({ branch: "feat/a", command: "test:db", pid: process.pid });
    expect(meta.runId).toMatch(/^[0-9a-f-]{36}$/);
    expect(() => acquireDevLock(lock, { branch: "feat/b", command: "e2e" })).toThrow(new RegExp(`en uso: rama feat/a, comando test:db.*ejecución ${meta.runId}`));
    release();
    expect(existsSync(lock)).toBe(false);
    acquireDevLock(lock, { branch: "feat/b", command: "e2e" })();
  });

  it("de seis procesos que lo piden a la vez, solo uno lo obtiene", async () => {
    const lock = lockIn();
    const lockModule = pathToFileURL(join(process.cwd(), "scripts", "dev-target", "lock.mjs")).href;
    const script = `import { acquireDevLock } from ${JSON.stringify(lockModule)};
let release = null;
try { release = acquireDevLock(${JSON.stringify(lock)}, { branch: "carrera", command: "e2e" }); process.stdout.write("ok\\n"); }
catch { process.stdout.write("ocupado\\n"); }
process.stdin.resume(); process.stdin.on("end", () => { if (release) release(); });`;
    const children = Array.from({ length: 6 }, () => spawn(process.execPath, ["--input-type=module", "-e", script], { stdio: ["pipe", "pipe", "inherit"] }));
    const answers = await Promise.all(children.map((child) => new Promise<string>((resolve) => child.stdout.once("data", (chunk) => resolve(String(chunk).trim())))));
    expect(answers.filter((answer) => answer === "ok")).toHaveLength(1);
    expect(answers.filter((answer) => answer === "ocupado")).toHaveLength(5);
    await Promise.all(children.map((child) => new Promise((resolve) => { child.once("close", resolve); child.stdin.end(); })));
    expect(existsSync(lock)).toBe(false);
  }, 30_000);

  it("un bloqueo cuyo dueño murió no se recupera solo: se niega y remite a dev:unlock", () => {
    const lock = lockIn();
    owner(lock, orphan);
    expect(() => acquireDevLock(lock, { branch: "nueva", command: "reset" }, { host: "este-equipo", isAlive: () => false }))
      .toThrow(/bloqueo huérfano: rama vieja.*ejecución 11111111-1111-4111-8111-111111111111.*npm run dev:unlock -- --force/);
    expect(JSON.parse(readFileSync(join(lock, "owner.json"), "utf8")).branch).toBe("vieja");
  });

  it("unos metadatos ilegibles o incompletos tampoco se recuperan", () => {
    const lock = lockIn();
    mkdirSync(lock);
    expect(() => acquireDevLock(lock, { branch: "mia", command: "reset" })).toThrow(/sin metadatos legibles.*dev:unlock/);
    writeFileSync(join(lock, "owner.json"), JSON.stringify({ branch: "a-medias" }));
    expect(() => acquireDevLock(lock, { branch: "mia", command: "reset" })).toThrow(/sin metadatos legibles/);
  });

  it("dev:unlock enseña el dueño y solo borra con --force", () => {
    const lock = lockIn();
    expect(unlockDevLock(lock)).toMatchObject({ removed: false, message: expect.stringMatching(/No hay bloqueo/) });
    owner(lock, orphan);
    const shown = unlockDevLock(lock, { host: "este-equipo", isAlive: () => false });
    expect(shown.removed).toBe(false);
    expect(shown.message).toMatch(/rama vieja.*ejecución 11111111.*ese PID ya no existe.*--force/);
    expect(existsSync(lock)).toBe(true);
    expect(unlockDevLock(lock, { force: true, host: "este-equipo", isAlive: () => false }).removed).toBe(true);
    expect(existsSync(lock)).toBe(false);
  });

});

// F48-2 (tercera ronda): la sesión (session.mjs) es el único punto que suelta el bloqueo. Con una señal no empieza
// ningún paso nuevo y el bloqueo sigue mientras quede algún proceso del árbol del paso en curso.
describe("sesión de juntia-dev: cancelación y liberación (F48-2)", () => {
  let dir = "";
  afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }); });
  const lockIn = () => { dir = mkdtempSync(join(tmpdir(), "juntia-session-")); return join(dir, "juntia-dev.lock"); };
  const firstLine = (stream: NodeJS.ReadableStream) => new Promise<string>((resolve) => stream.once("data", (chunk) => resolve(String(chunk).trim())));
  // Hijo que lanza un nieto y se queda vivo; imprime los dos PID.
  const treeScript = (grandchild: string) => `const { spawn } = require("node:child_process");
const g = spawn(process.execPath, ["-e", ${JSON.stringify(grandchild)}], { stdio: "ignore" });
process.stdout.write("child:" + process.pid + " grand:" + g.pid + "\\n");
setInterval(() => {}, 1000);`;
  const pids = (line: string) => ({ child: Number(/child:(\d+)/.exec(line)![1]), grand: Number(/grand:(\d+)/.exec(line)![1]) });

  it("cancelar termina el árbol real, ningún paso nuevo empieza y close() espera antes de soltar", async () => {
    const lock = lockIn();
    const exit = vi.fn();
    let lockWhileTerminating = false;
    const session = openDevSession({ lockDir: lock, branch: "s", command: "prueba", exit,
      terminate: async (child, signal) => { lockWhileTerminating = existsSync(lock); await killTree(child, signal); } });
    const child = session.spawn(process.execPath, ["-e", treeScript("setInterval(() => {}, 1000)")], { stdio: ["ignore", "pipe", "inherit"] })!;
    const { grand } = pids(await firstLine(child.stdout!));
    const cancelled = session.cancel("SIGTERM");
    expect(session.spawn(process.execPath, ["-e", "0"], {}), "no empieza ningún paso después de la señal").toBeNull();
    await session.close();
    await cancelled;
    expect(lockWhileTerminating).toBe(true);
    expect(alive(child.pid!)).toBe(false);
    expect(alive(grand)).toBe(false);
    expect(existsSync(lock)).toBe(false);
    expect(exit).toHaveBeenCalledExactlyOnceWith(143);
  }, 30_000);

  it("sin señal, close() suelta el bloqueo; sin close() (salida fatal) el bloqueo queda huérfano", async () => {
    const lock = lockIn();
    await openDevSession({ lockDir: lock, branch: "s", command: "prueba", exit: vi.fn() }).close();
    expect(existsSync(lock)).toBe(false);
    const fatal = `import { openDevSession } from ${JSON.stringify(pathToFileURL(join(process.cwd(), "scripts", "dev-target", "session.mjs")).href)};
openDevSession({ lockDir: ${JSON.stringify(lock)}, branch: "fatal", command: "prueba" });
throw new Error("fatal");`;
    const crashed = spawn(process.execPath, ["--input-type=module", "-e", fatal], { stdio: "ignore" });
    expect(await new Promise((resolve) => crashed.once("close", resolve))).not.toBe(0);
    expect(existsSync(lock), "el estado del árbol no se conoce: no se suelta en exit").toBe(true);
    expect(() => acquireDevLock(lock, { branch: "otra", command: "reset" })).toThrow(/huérfano.*dev:unlock/);
  }, 30_000);

  // El flujo real del runner con una señal de verdad. Windows no entrega SIGTERM a un manejador de otro proceso
  // (process.kill lo termina sin más), así que esta variante solo corre en POSIX; en Windows cubre la anterior.
  it.skipIf(process.platform === "win32")("runner real: SIGTERM con un nieto que ignora SIGTERM; el bloqueo sigue hasta que el árbol termina", async () => {
    const lock = lockIn();
    const marker = join(dir, "segundo-paso");
    const stubborn = "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000); setTimeout(() => process.exit(0), 3000)";
    const runner = `import { openDevSession } from ${JSON.stringify(pathToFileURL(join(process.cwd(), "scripts", "dev-target", "session.mjs")).href)};
const session = openDevSession({ lockDir: ${JSON.stringify(lock)}, branch: "runner", command: "prueba" });
const step = (args) => new Promise((resolve) => {
  const child = session.spawn(process.execPath, args, { stdio: ["ignore", "pipe", "inherit"] });
  if (!child) return resolve(false);
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.on("close", () => resolve(true));
});
try {
  await step(["-e", ${JSON.stringify(treeScript(stubborn))}]);
  await step(["-e", ${JSON.stringify(`require("node:fs").writeFileSync(${JSON.stringify(marker)}, "x")`)}]);
} finally { await session.close(); }`;
    const proc = spawn(process.execPath, ["--input-type=module", "-e", runner], { stdio: ["ignore", "pipe", "inherit"] });
    const { child, grand } = pids(await firstLine(proc.stdout!));
    const closed = new Promise<number | null>((resolve) => proc.once("close", resolve));
    proc.kill("SIGTERM");
    await vi.waitFor(() => expect(alive(child), "el hijo directo termina con la señal").toBe(false), { timeout: 5000, interval: 25 });
    expect(alive(grand), "el nieto ignora SIGTERM y sigue vivo").toBe(true);
    expect(existsSync(lock), "con el nieto vivo, el bloqueo sigue").toBe(true);
    expect(await closed).toBe(143);
    expect(alive(grand)).toBe(false);
    expect(existsSync(lock)).toBe(false);
    expect(existsSync(marker), "ningún paso empezó después de la señal").toBe(false);
  }, 30_000);
});
