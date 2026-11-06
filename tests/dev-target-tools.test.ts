// @vitest-environment node
// Decisión 18: piezas de `npm run *:dev` sin red. El lector TAP aplica las reglas de pg_prove (CI) a la salida de psql,
// y el bloqueo deja a un solo agente usar juntia-dev desde los worktrees de un clon.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { acquireDevLock, alive, createSignalHandler, killTree, spawnOptionsForTree, unlockDevLock } from "../scripts/dev-target/lock.mjs";
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

  it("con SIGTERM termina el árbol real (hijo y nieto) y solo después suelta el bloqueo", async () => {
    const lock = lockIn();
    const release = acquireDevLock(lock, { branch: "señal", command: "reset" });
    // El hijo lanza un nieto que no termina solo, imprime el PID del nieto y se queda vivo.
    const grandchild = "setInterval(() => {}, 1000)";
    const parent = `const { spawn } = require("node:child_process");
const g = spawn(process.execPath, ["-e", ${JSON.stringify(grandchild)}], { stdio: "ignore" });
process.stdout.write(String(g.pid) + "\\n");
setInterval(() => {}, 1000);`;
    const child = spawn(process.execPath, ["-e", parent], { ...spawnOptionsForTree(), stdio: ["ignore", "pipe", "inherit"] });
    const grandchildPid = Number(await new Promise<string>((resolve) => child.stdout.once("data", (chunk) => resolve(String(chunk).trim()))));
    expect(alive(child.pid!)).toBe(true);
    expect(alive(grandchildPid)).toBe(true);
    const exit = vi.fn();
    let lockDuringKill = false;
    const terminate = async (target: typeof child, signal: NodeJS.Signals) => { lockDuringKill = existsSync(lock); await killTree(target, signal); };
    await createSignalHandler({ release, getChild: () => child, exit, terminate })("SIGTERM");
    expect(lockDuringKill, "el bloqueo sigue mientras se termina el árbol").toBe(true);
    expect(alive(child.pid!), "el hijo ya no existe").toBe(false);
    expect(alive(grandchildPid), "el nieto ya no existe").toBe(false);
    expect(existsSync(lock)).toBe(false);
    expect(exit).toHaveBeenCalledExactlyOnceWith(143);
  }, 30_000);

  it("sin hijo en curso suelta el bloqueo y sale con el código de la señal", async () => {
    const lock = lockIn();
    const exit = vi.fn();
    await createSignalHandler({ release: acquireDevLock(lock, { branch: "s", command: "e2e" }), getChild: () => null, exit })("SIGINT");
    expect(existsSync(lock)).toBe(false);
    expect(exit).toHaveBeenCalledWith(130);
  });
});
