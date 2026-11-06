import { readFileSync, readdirSync, existsSync } from "node:fs"; import { parseEnv } from "node:util"; import { join } from "node:path";
const env = parseEnv(readFileSync("C:/Users/aleja/Documents/PP/Juntia/.env.test", "utf8"));
const u = new URL(env.JUNTIA_DEV_DB_URL); const needles = [u.password, decodeURIComponent(u.password), env.JUNTIA_DEV_SECRET_KEY].filter((v) => v && v.length >= 6);
const dir = process.argv[2]; const files = existsSync(dir) ? readdirSync(dir) : [];
const hits = files.filter((f) => { const t = readFileSync(join(dir, f), "utf8"); return needles.some((n) => t.includes(n)); });
console.log(`logs de npm en ${dir}: ${files.length}; con la contraseña o la clave: ${hits.length}`); for (const f of hits) console.log("  " + f);
