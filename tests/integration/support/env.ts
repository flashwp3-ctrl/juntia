import { assertTestTarget } from "../../support/dev-target";
function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} en el runner`);
  return value;
}
/** Supabase efímero del runner o, en `npm run test:integration:dev`, juntia-dev tras el guardia (decisión 18). */
export function runnerEnv() {
  const apiUrl = required("API_URL");
  assertTestTarget(apiUrl, "La integración de servidor");
  return { apiUrl, publishableKey: required("PUBLISHABLE_KEY"), secretKey: required("SECRET_KEY") };
}
