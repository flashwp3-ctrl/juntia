// Lectura de la salida TAP de un archivo pgTAP, como hace pg_prove en CI. `supabase test db` ejecuta pg_prove dentro de
// un contenedor de Docker, que no existe en los equipos (decisión 17); por eso `test:db:dev` corre cada archivo con psql
// y aplica aquí las mismas reglas: ningún «not ok» sin TODO, el plan coincide con las pruebas y psql termina sin error.

/** @param {string} output salida de `psql -X -qAt -v ON_ERROR_STOP=1 -f archivo` @param {number} exitCode */
export function readTap(output, exitCode) {
  const lines = output.split(/\r?\n/).map((line) => line.trim());
  const results = lines.filter((line) => /^(not )?ok \d+/.test(line));
  const failures = results.filter((line) => line.startsWith("not ok") && !/#\s*TODO/i.test(line));
  const plan = lines.map((line) => line.match(/^1\.\.(\d+)/)).find(Boolean);
  const problems = [];
  if (exitCode !== 0) problems.push(`psql terminó con ${exitCode}`);
  if (!plan) problems.push("sin plan (falta finish() o el archivo se cortó)");
  else if (Number(plan[1]) !== results.length) problems.push(`plan de ${plan[1]} y ${results.length} pruebas`);
  if (results.length === 0) problems.push("ninguna prueba");
  for (const line of failures) problems.push(line);
  return { total: results.length, failed: failures.length, ok: problems.length === 0, problems };
}
