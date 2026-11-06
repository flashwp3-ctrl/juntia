// @vitest-environment node
// Decisión 18: piezas de `npm run *:dev` sin red. El lector TAP aplica las reglas de pg_prove (CI) a la salida de psql,
// y el bloqueo deja a un solo agente usar juntia-dev desde los worktrees de un clon.
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { acquireDevLock, createSignalHandler, STALE_AFTER_MS } from "../scripts/dev-target/lock.mjs";
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

  it("deja tomarlo una vez, nombra la rama que lo tiene y lo suelta", () => {
    const lock = lockIn();
    const release = acquireDevLock(lock, { branch: "feat/a", command: "test:db" });
    expect(JSON.parse(readFileSync(join(lock, "owner.json"), "utf8"))).toMatchObject({ branch: "feat/a", command: "test:db", pid: process.pid });
    expect(() => acquireDevLock(lock, { branch: "feat/b", command: "e2e" })).toThrow(/juntia-dev está en uso: rama feat\/a, comando test:db/);
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

  it("unos metadatos ilegibles o incompletos no cuentan como abandono", () => {
    const lock = lockIn();
    mkdirSync(lock);
    expect(() => acquireDevLock(lock, { branch: "mia", command: "reset" })).toThrow(/no tiene metadatos legibles/);
    writeFileSync(join(lock, "owner.json"), JSON.stringify({ branch: "a-medias" }));
    expect(() => acquireDevLock(lock, { branch: "mia", command: "reset" })).toThrow(/no tiene metadatos legibles/);
  });

  it("un PID que ya no existe solo es abandono pasado el tiempo prudente", () => {
    const lock = lockIn();
    const startedAt = "2026-11-06T10:00:00.000Z";
    owner(lock, { branch: "vieja", command: "e2e", startedAt, host: "este-equipo", pid: 4242 });
    const options = { host: "este-equipo", isAlive: () => false };
    expect(() => acquireDevLock(lock, { branch: "nueva", command: "reset" }, { ...options, now: () => Date.parse(startedAt) + STALE_AFTER_MS - 1 })).toThrow(/rama vieja/);
    expect(() => acquireDevLock(lock, { branch: "nueva", command: "reset" }, { ...options, isAlive: () => true, now: () => Date.parse(startedAt) + 10 * STALE_AFTER_MS })).toThrow(/rama vieja/);
    const release = acquireDevLock(lock, { branch: "nueva", command: "reset" }, { ...options, now: () => Date.parse(startedAt) + STALE_AFTER_MS });
    expect(JSON.parse(readFileSync(join(lock, "owner.json"), "utf8")).branch).toBe("nueva");
    release();
  });

  it("no toca el bloqueo de otro equipo, por viejo que sea", () => {
    const lock = lockIn();
    owner(lock, { branch: "de-otro", command: "e2e", startedAt: "2026-11-01T00:00:00.000Z", host: "otro-equipo", pid: 1 });
    expect(() => acquireDevLock(lock, { branch: "mia", command: "reset" }, { isAlive: () => false })).toThrow(/rama de-otro/);
  });

  it("con SIGTERM reenvía la señal al hijo y mantiene el bloqueo hasta que el hijo termina", async () => {
    const lock = lockIn();
    const release = acquireDevLock(lock, { branch: "señal", command: "reset" });
    const child = Object.assign(new EventEmitter(), { exitCode: null as number | null, signalCode: null as string | null, kill: vi.fn() });
    const exit = vi.fn();
    const handler = createSignalHandler({ release, getChild: () => child as never, exit });
    const handled = handler("SIGTERM");
    void handler("SIGTERM");
    expect(child.kill).toHaveBeenCalledExactlyOnceWith("SIGTERM");
    expect(existsSync(lock), "el hijo sigue vivo: el bloqueo se mantiene").toBe(true);
    expect(exit).not.toHaveBeenCalled();
    child.emit("close", null, "SIGTERM");
    await handled;
    expect(existsSync(lock)).toBe(false);
    expect(exit).toHaveBeenCalledExactlyOnceWith(143);
  });

  it("sin hijo en curso suelta el bloqueo y sale con el código de la señal", async () => {
    const lock = lockIn();
    const exit = vi.fn();
    await createSignalHandler({ release: acquireDevLock(lock, { branch: "s", command: "e2e" }), getChild: () => null, exit })("SIGINT");
    expect(existsSync(lock)).toBe(false);
    expect(exit).toHaveBeenCalledWith(130);
  });
});
