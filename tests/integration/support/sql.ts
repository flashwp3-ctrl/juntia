import { execFileSync } from "node:child_process";
import { runnerEnv } from "./env";
export function runnerSql(sql: string): string {
  runnerEnv();
  const url = new URL(process.env.DB_URL ?? "");
  if (url.hostname !== "127.0.0.1") throw new Error("SQL solo en el runner local");
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-qAt", "-c", sql], {
    encoding: "utf8", env: { ...process.env, PGHOST: url.hostname, PGPORT: url.port,
      PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: url.pathname.slice(1) },
  }).trim();
}
