import { DbError, mapDbError } from "./errors";
// La clausura conserva argumentos y clave: solo errores transitorios de PostgreSQL.
export async function withRetry<T>(request: () => PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    let result;
    try { result = await request(); } catch (error) { throw mapDbError(error); }
    if (!result.error && result.data !== null) return result.data;
    const error = mapDbError(result.error);
    if (error.kind !== "retryable") throw error;
    if (attempt === 2) throw new DbError("retryExhausted");
    await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 50));
  }
  throw new DbError("retryExhausted");
}
