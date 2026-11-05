// Resultado de las Server Actions de Mi cuenta: solo lo que la interfaz necesita, nunca el error técnico.
export type AccountActionError = "invalid" | "sessionExpired" | "failed";
export type AccountActionResult = { ok: true } | { ok: false; error: AccountActionError };
export type SaveNameResult = { ok: true; displayName: string } | { ok: false; error: AccountActionError };
