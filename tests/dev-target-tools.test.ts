// @vitest-environment node
// Decisión 18: piezas de `npm run *:dev` sin red. El lector TAP aplica las reglas de pg_prove (CI) a la salida de psql,
// y el bloqueo deja a un solo agente usar juntia-dev desde los worktrees de un clon.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acquireDevLock } from "../scripts/dev-target/lock.mjs";
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

describe("bloqueo de un solo agente", () => {
  let dir = "";
  afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }); });

  it("deja tomarlo una vez, nombra la rama que lo tiene y lo suelta", () => {
    dir = mkdtempSync(join(tmpdir(), "juntia-lock-"));
    const path = join(dir, "juntia-dev.lock");
    const release = acquireDevLock(path, { branch: "feat/a", command: "test:db" });
    expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({ branch: "feat/a", command: "test:db", pid: process.pid });
    expect(() => acquireDevLock(path, { branch: "feat/b", command: "e2e" })).toThrow(/juntia-dev está en uso: rama feat\/a, comando test:db/);
    release();
    acquireDevLock(path, { branch: "feat/b", command: "e2e" })();
  });

  it("recupera un bloqueo abandonado por un proceso que ya no existe en este equipo", () => {
    dir = mkdtempSync(join(tmpdir(), "juntia-lock-"));
    const path = join(dir, "juntia-dev.lock");
    writeFileSync(path, JSON.stringify({ branch: "vieja", command: "e2e", startedAt: "2026-11-01T00:00:00Z", host: hostname(), pid: 2 ** 22 + 7 }));
    const release = acquireDevLock(path, { branch: "nueva", command: "reset" });
    expect(JSON.parse(readFileSync(path, "utf8")).branch).toBe("nueva");
    release();
  });

  it("no toca el bloqueo de otro equipo", () => {
    dir = mkdtempSync(join(tmpdir(), "juntia-lock-"));
    const path = join(dir, "juntia-dev.lock");
    writeFileSync(path, JSON.stringify({ branch: "de-otro", command: "e2e", startedAt: "2026-11-01T00:00:00Z", host: "otro-equipo", pid: 1 }));
    expect(() => acquireDevLock(path, { branch: "mia", command: "reset" })).toThrow(/rama de-otro/);
  });
});
