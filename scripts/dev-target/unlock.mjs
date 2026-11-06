// `npm run dev:unlock [-- --force]` (decisión 18, F48-2): el bloqueo de juntia-dev nunca se recupera solo. Sin --force
// enseña a quién pertenece y no toca nada; con --force lo borra. Antes, comprueba que no queda ningún proceso de ese
// comando (Vitest, Playwright, psql, `supabase db reset`).
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { unlockDevLock } from "./lock.mjs";

const commonDir = resolve(spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).stdout.trim());
const { removed, message } = unlockDevLock(join(commonDir, "juntia-dev.lock"), { force: process.argv.includes("--force") });
console.log(message);
process.exitCode = removed || message.startsWith("No hay bloqueo") ? 0 : 1;
