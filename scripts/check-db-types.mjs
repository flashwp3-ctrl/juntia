import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const result = spawnSync("supabase", ["gen", "types", "typescript", "--local", "--schema", "public"], { encoding: "utf8" });
if (result.stderr) process.stderr.write(result.stderr);
if (result.error || result.status !== 0) process.exit(result.status || 1);
const output = join(process.env.RUNNER_TEMP ?? ".", "database.types.ts");
mkdirSync(process.env.RUNNER_TEMP ?? ".", { recursive: true });
writeFileSync(output, result.stdout);
const normalize = (value) => value.replaceAll("\r\n", "\n").trimEnd();
if (!existsSync("src/lib/supabase/database.types.ts") || normalize(readFileSync("src/lib/supabase/database.types.ts", "utf8")) !== normalize(result.stdout)) {
  console.error("Los tipos versionados difieren del esquema. Recupera database.types.ts del artefacto del runner.");
  process.exit(1);
}
console.log("database.types.ts coincide con public generado en el runner.");
