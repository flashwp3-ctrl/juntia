// 004 PR D (revisión del gestor del PR #69, 2): el contexto de un `create_expense_with_goal` guardado, por el VALOR de sus
// campos. El payload privado sale de `to_jsonb(tx)` y también trae `payer_user_id` y `split_mode`, con `null`: mirar si la
// clave existe lo clasificaba como de Nosotros y «Comprobar estado» nunca resolvía un gasto con meta en Yo.
export function fundedContext(result: Record<string, unknown>): "me" | "us" {
  return typeof result.payer_user_id === "string" && result.parts !== null && typeof result.parts === "object" ? "us" : "me";
}
