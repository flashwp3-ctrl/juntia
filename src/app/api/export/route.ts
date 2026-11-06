// T069 / FR-057; US-8; contracts/database.md, «Exportación». GET /api/export?format=json|csv con el cliente de la
// petición: 200 con el archivo como adjunto y `Cache-Control: no-store`; 401 sin sesión; 400 con un formato no válido;
// 500 si falla la lectura (D5). Ninguna respuesta de error lleva datos ni el mensaje técnico.
import { exportTransactions, isExportFormat } from "@/lib/db/export";
import { DbError, mapDbError } from "@/lib/db/errors";
import { getSessionClaims } from "@/lib/db/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const status = (code: number) => new Response(null, { status: code, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const client = await createClient();
  if (!(await getSessionClaims(client))) return status(401);
  const format = new URL(request.url).searchParams.get("format");
  if (!isExportFormat(format)) return status(400);
  try {
    const file = await exportTransactions(client, format);
    return new Response(file.body, {
      status: 200,
      headers: { "Content-Type": file.contentType, "Content-Disposition": `attachment; filename="${file.filename}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    return status((error instanceof DbError ? error : mapDbError(error)).kind === "notAuthenticated" ? 401 : 500);
  }
}
