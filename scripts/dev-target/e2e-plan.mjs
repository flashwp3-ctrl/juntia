// Decisión 18; regla de los fundadores del 7 de noviembre de 2026 (pedida por el gestor en el PR B de la 003): contra
// juntia-dev se corren solo las pruebas afectadas, y el `e2e:dev` completo una vez antes de cada push.
// `npm run e2e:dev -- <args>` reenvía los argumentos a Playwright:
// - sin argumentos, lo de siempre: todo el proyecto `e2e` y todo el `a11y` con A11Y_JOB=e2e, los dos sin @mail;
// - con un `.e2e.ts`, `--grep` o `--only-changed`, solo el proyecto `e2e` (o el que diga `--project e2e|a11y`);
// - con un `.a11y.ts`, ese archivo en el proyecto `a11y` con A11Y_JOB=e2e.
// Los argumentos nunca cambian el destino, la configuración, el entorno ni la exclusión de @mail: lo que podría hacerlo
// se rechaza antes de tomar el bloqueo. El guardia, el lock y el entorno limpio siguen en run.mjs, sin cambios.
const BASE = (project) => ["test", "--project", project, "--grep-invert", "@mail", "--reporter=list"];
const PROJECTS = new Set(["e2e", "a11y"]);

function reject(arg, why) {
  throw new Error(`e2e:dev no acepta «${arg}»: ${why}. Sin argumentos corre la suite completa; con un archivo, --grep o --only-changed, solo eso.`);
}

/** Pasos de Playwright para `e2e:dev` con estos argumentos. Lanza si un argumento podría cambiar destino o configuración. */
export function planE2E(args) {
  if (args.length === 0) {
    return [
      { label: "E2E (sin @mail)", project: "e2e", args: BASE("e2e") },
      { label: "axe con sesión (A11Y_JOB=e2e)", project: "a11y", a11yJob: "e2e", args: BASE("a11y") },
    ];
  }
  const files = { e2e: [], a11y: [] };
  const flags = [];
  let project = null;
  for (let index = 0; index < args.length; index++) {
    const arg = String(args[index]);
    if (arg === "--config" || arg === "-c" || arg.startsWith("--config=")) reject(arg, "cambia la configuración de Playwright");
    if (/_URL\b|_URL=/i.test(arg)) reject(arg, "una URL o variable de entorno cambiaría el destino");
    if (arg === "--grep-invert" || arg === "-gv" || arg.startsWith("--grep-invert=")) reject(arg, "@mail queda siempre fuera");
    if (arg === "--project" || arg.startsWith("--project=")) {
      const value = arg === "--project" ? String(args[++index] ?? "") : arg.slice("--project=".length);
      if (!PROJECTS.has(value)) reject(`${arg}${arg === "--project" ? ` ${value}` : ""}`, "solo se admiten los proyectos e2e y a11y");
      project = value;
      continue;
    }
    if (arg.endsWith(".e2e.ts")) files.e2e.push(arg);
    else if (arg.endsWith(".a11y.ts")) files.a11y.push(arg);
    else flags.push(arg);
  }
  const step = (name) => (name === "a11y"
    ? { label: "axe dirigido (A11Y_JOB=e2e)", project: "a11y", a11yJob: "e2e", args: [...BASE("a11y"), ...files.a11y, ...flags] }
    : { label: "E2E dirigido (sin @mail)", project: "e2e", args: [...BASE("e2e"), ...files.e2e, ...flags] });
  if (project) return [step(project)];
  const steps = [];
  if (files.e2e.length > 0 || files.a11y.length === 0) steps.push(step("e2e"));
  if (files.a11y.length > 0) steps.push(step("a11y"));
  return steps;
}
