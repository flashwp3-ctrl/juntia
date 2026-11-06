// FR-036; ADR-013 §3: la clave de idempotencia nace en el cliente, una por intención (abrir la hoja, un aviso de
// «Deshacer», un diálogo de eliminar) y se reusa en cada reintento. UUID v4 con `crypto.randomUUID` y, donde no existe
// (contexto no seguro), con `crypto.getRandomValues`.
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
