function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} en el runner`);
  return value;
}
export function runnerEnv() {
  const apiUrl = required("API_URL");
  if (new URL(apiUrl).hostname !== "127.0.0.1") throw new Error("Solo se admite el Supabase efímero del runner");
  return { apiUrl, publishableKey: required("PUBLISHABLE_KEY"), secretKey: required("SECRET_KEY") };
}
