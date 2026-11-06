// @vitest-environment node
// Decisión 18: piezas de `npm run *:dev` sin red. El lector TAP aplica las reglas de pg_prove (CI) a la salida de psql,
// y el bloqueo deja a un solo agente usar juntia-dev desde los worktrees de un clon.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { acquireDevLock, alive, killTree, TreeStillAliveError, unlockDevLock } from "../scripts/dev-target/lock.mjs";
import { runInSession } from "../scripts/dev-target/session.mjs";
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

// F48-2: la sesión (session.mjs) es el único punto que suelta el bloqueo, y `runInSession` es el flujo que comparte con
// run.mjs (F48-2C). Con una señal no empieza ningún paso nuevo y el bloqueo sigue mientras quede algún proceso del
// grupo de un paso, aunque su proceso principal ya haya terminado (F48-2A).
describe("sesión de juntia-dev: cancelación y liberación (F48-2)", () => {
  let dir = "";
  afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }); });
  const lockIn = () => { dir = mkdtempSync(join(tmpdir(), "juntia-session-")); return join(dir, "juntia-dev.lock"); };
  const sessionModule = () => JSON.stringify(pathToFileURL(join(process.cwd(), "scripts", "dev-target", "session.mjs")).href);
  /** Vida real: en Linux, /proc/<pid>/stat con un estado distinto de Z (un zombi responde a kill(pid, 0)). */
  const reallyAlive = (pid: number) => {
    if (process.platform !== "linux") return alive(pid);
    try { const stat = readFileSync(`/proc/${pid}/stat`, "utf8"); return stat.slice(stat.lastIndexOf(")") + 2)[0] !== "Z"; } catch { return false; }
  };
  const killQuietly = (pid: number | undefined, group = false) => { if (!pid) return; try { process.kill(group ? -pid : pid, "SIGKILL"); } catch { /* ya no existe */ } };

  it("runInSession: el finally espera la cancelación; el bloqueo sigue hasta que termina el árbol (todas las plataformas)", async () => {
    const lock = lockIn();
    const exit = vi.fn();
    let openGate!: () => void;
    const gate = new Promise<void>((resolve) => { openGate = resolve; });
    let flowReturned!: () => void;
    const returned = new Promise<void>((resolve) => { flowReturned = resolve; });
    const grandchild = "setInterval(() => {}, 1000)";
    const child = `const { spawn } = require("node:child_process");
const g = spawn(process.execPath, ["-e", ${JSON.stringify(grandchild)}], { stdio: "ignore" });
process.stdout.write("grand:" + g.pid + "\\n");
setInterval(() => {}, 1000);`;
    let grand = 0;
    const running = runInSession({ lockDir: lock, branch: "s", command: "prueba", exit,
      // La terminación no acaba hasta que la prueba lo decide: así se ve si alguien suelta el bloqueo antes.
      terminate: async (target, signal) => { await killTree(target, signal); await gate; } }, async (session) => {
      const step = session.spawn(process.execPath, ["-e", child], { stdio: ["ignore", "pipe", "inherit"] })!;
      grand = Number(/grand:(\d+)/.exec(await new Promise<string>((resolve) => step.stdout!.once("data", (chunk) => resolve(String(chunk)))))![1]);
      void session.cancel("SIGTERM");
      await new Promise((resolve) => step.once("close", resolve));
      expect(session.spawn(process.execPath, ["-e", "0"], {}), "ningún paso empieza después de la señal").toBeNull();
      flowReturned();
      return grand;
    });
    try {
      await returned;
      for (let tick = 0; tick < 5; tick++) await new Promise((resolve) => setImmediate(resolve));
      expect(existsSync(lock), "el flujo terminó pero la cancelación no: el bloqueo sigue").toBe(true);
      openGate();
      await running;
      expect(reallyAlive(grand)).toBe(false);
      expect(existsSync(lock)).toBe(false);
      expect(exit).toHaveBeenCalledExactlyOnceWith(143);
    } finally {
      openGate();
      killQuietly(grand);
    }
  }, 30_000);

  it("sin señal, close() suelta el bloqueo; sin close() (salida fatal) el bloqueo queda huérfano", async () => {
    const lock = lockIn();
    expect(await runInSession({ lockDir: lock, branch: "s", command: "prueba", exit: vi.fn() }, async () => "hecho")).toBe("hecho");
    expect(existsSync(lock)).toBe(false);
    const fatal = `import { openDevSession } from ${sessionModule()};
openDevSession({ lockDir: ${JSON.stringify(lock)}, branch: "fatal", command: "prueba" });
throw new Error("fatal");`;
    const crashed = spawn(process.execPath, ["--input-type=module", "-e", fatal], { stdio: "ignore" });
    expect(await new Promise((resolve) => crashed.once("close", resolve))).not.toBe(0);
    expect(existsSync(lock), "el estado del árbol no se conoce: no se suelta en exit").toBe(true);
    expect(() => acquireDevLock(lock, { branch: "otra", command: "reset" })).toThrow(/huérfano.*dev:unlock/);
  }, 30_000);

  it("killTree falla de forma explícita si el árbol sigue vivo después del límite; la sesión conserva el bloqueo", async () => {
    const immortal = { pid: 2 ** 22 + 11, exitCode: null, signalCode: null, once: () => immortal };
    await expect(killTree(immortal as never, "SIGTERM", { sigkillAfterMs: 0, giveUpAfterMs: 100, isAlive: () => true })).rejects.toBeInstanceOf(TreeStillAliveError);
    const lock = lockIn();
    const exit = vi.fn();
    const failing = runInSession({ lockDir: lock, branch: "s", command: "prueba", exit,
      terminate: async (child, signal) => { await killTree(child, signal); throw new TreeStillAliveError(child.pid!); } }, async (session) => {
      const step = session.spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" })!;
      await session.cancel("SIGTERM");
      return step.pid;
    });
    await expect(failing).rejects.toBeInstanceOf(TreeStillAliveError);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(existsSync(lock), "el árbol no terminó: el bloqueo se conserva como huérfano").toBe(true);
    // Su dueño (este proceso) sigue vivo: nadie entra; cuando muera, quedará huérfano para dev:unlock --force.
    expect(() => acquireDevLock(lock, { branch: "otra", command: "reset" })).toThrow(/en uso: rama s, comando prueba/);
  }, 30_000);

  // Runner real (runInSession, el mismo flujo de run.mjs) con una señal de verdad y un nieto que ignora SIGTERM y no
  // sale nunca por su cuenta: solo el SIGKILL de killTree al grupo lo termina. Windows no entrega SIGTERM a un manejador
  // de otro proceso y `taskkill /T` no encuentra a los descendientes de una raíz que ya terminó: solo POSIX.
  const runnerScript = (lock: string, child: string, afterFirstStep: string, closedMarker: string, treeMarker: string, readyFile: string, second: string) => `import { readFileSync, writeFileSync } from "node:fs";
import { killTree } from ${JSON.stringify(pathToFileURL(join(process.cwd(), "scripts", "dev-target", "lock.mjs")).href)};
import { runInSession } from ${sessionModule()};
// Vida real del nieto en el momento en que killTree termina, antes de que la sesión suelte el bloqueo.
const grandAlive = () => { try { const pid = readFileSync(${JSON.stringify(readyFile)}, "utf8").trim(); const stat = readFileSync("/proc/" + pid + "/stat", "utf8"); return stat.slice(stat.lastIndexOf(")") + 2)[0] !== "Z"; } catch { return false; } };
await runInSession({ lockDir: ${JSON.stringify(lock)}, branch: "runner", command: "prueba",
  terminate: async (target, signal) => { await killTree(target, signal); writeFileSync(${JSON.stringify(treeMarker)}, JSON.stringify({ grandAlive: grandAlive(), lock: ${JSON.stringify(lock)} })); } }, async (session) => {
  const step = (args, marker) => new Promise((resolve) => {
    const proc = session.spawn(process.execPath, args, { stdio: ["ignore", "inherit", "inherit"] });
    if (!proc) return resolve(false);
    proc.on("close", () => { if (marker) writeFileSync(marker, "x"); resolve(true); });
  });
  await step(["-e", ${JSON.stringify(child)}], ${JSON.stringify(closedMarker)});
  ${afterFirstStep}
  await step(["-e", ${JSON.stringify(`require("node:fs").writeFileSync(${JSON.stringify(second)}, "x")`)}]);
});`;

  it.skipIf(process.platform === "win32").each([
    ["F48-2B: el hijo directo sigue vivo cuando llega la señal", false],
    ["F48-2A: el hijo directo ya terminó (close registrado) y el nieto sigue vivo en su grupo", true],
  ])("runner real · %s", async (_, childExitsFirst) => {
    const lock = lockIn();
    const readyFile = join(dir, "nieto-ready");
    const sigterm = join(dir, "nieto-recibio-sigterm");
    const closedMarker = join(dir, "hijo-close");
    const treeMarker = join(dir, "arbol-terminado");
    const second = join(dir, "segundo-paso");
    const childFile = join(dir, "hijo-pid");
    // El nieto: sin stdio heredado (no retrasa el close del hijo), en el grupo del hijo (detached: false), manejador de
    // SIGTERM instalado ANTES de escribir READY, y nunca sale por su cuenta.
    const grandchild = `const fs = require("node:fs");
process.on("SIGTERM", () => { fs.writeFileSync(${JSON.stringify(sigterm)}, "x"); });
setInterval(() => {}, 1000);
fs.writeFileSync(${JSON.stringify(readyFile)}, String(process.pid));`;
    // El hijo: lanza el nieto y, si es la variante F48-2A, sale con process.exit(0) en cuanto ve READY.
    const child = `const fs = require("node:fs");
const { spawn } = require("node:child_process");
const g = spawn(process.execPath, ["-e", ${JSON.stringify(grandchild)}], { stdio: "ignore", detached: false });
g.unref();
fs.writeFileSync(${JSON.stringify(childFile)}, String(process.pid));
const wait = setInterval(() => { if (fs.existsSync(${JSON.stringify(readyFile)})) { ${childExitsFirst ? "process.exit(0);" : "clearInterval(wait); setInterval(() => {}, 1000);"} } }, 20);`;
    const afterFirstStep = childExitsFirst ? "setInterval(() => {}, 1000); await new Promise(() => {});" : "";
    const proc = spawn(process.execPath, ["--input-type=module", "-e", runnerScript(lock, child, afterFirstStep, closedMarker, treeMarker, readyFile, second)], { stdio: ["ignore", "inherit", "inherit"] });
    const closed = new Promise<number | null>((resolve) => proc.once("close", resolve));
    let grandPid = 0;
    try {
      await vi.waitFor(() => expect(existsSync(readyFile), "READY del nieto").toBe(true), { timeout: 10_000, interval: 25 });
      grandPid = Number(readFileSync(readyFile, "utf8"));
      if (childExitsFirst) {
        await vi.waitFor(() => expect(existsSync(closedMarker), "el runner recibió el close del hijo").toBe(true), { timeout: 10_000, interval: 25 });
        expect(reallyAlive(grandPid), "el nieto sigue vivo, sin su proceso principal").toBe(true);
        expect(existsSync(lock), "el grupo sigue vivo: el bloqueo sigue").toBe(true);
      } else {
        expect(existsSync(closedMarker), "el hijo directo sigue vivo").toBe(false);
      }
      // La señal, solo ahora: READY (manejador instalado) y, en F48-2A, el close del hijo ya observado.
      proc.kill("SIGTERM");
      await vi.waitFor(() => expect(existsSync(sigterm), "el nieto recibió SIGTERM").toBe(true), { timeout: 10_000, interval: 25 });
      expect(reallyAlive(grandPid), "el nieto ignora SIGTERM y sigue vivo hasta el SIGKILL").toBe(true);
      expect(existsSync(lock), "con el nieto vivo, el bloqueo sigue").toBe(true);
      expect(await closed, "el runner sale con el código de SIGTERM").toBe(143);
      expect(JSON.parse(readFileSync(treeMarker, "utf8")), "cuando killTree terminó, antes de soltar el bloqueo, el nieto ya no vivía").toMatchObject({ grandAlive: false });
      expect(reallyAlive(grandPid)).toBe(false);
      expect(existsSync(lock), "el bloqueo se suelta cuando el grupo ya no existe").toBe(false);
      expect(existsSync(second), "ningún paso empezó después de la señal").toBe(false);
    } finally {
      killQuietly(proc.pid);
      if (existsSync(childFile)) killQuietly(Number(readFileSync(childFile, "utf8")), true);
      killQuietly(grandPid);
    }
  }, 40_000);
});
