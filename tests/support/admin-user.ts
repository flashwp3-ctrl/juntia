// Usuarios sembrados ya verificados por la API de administración (decisión 18, ADR-011 §9.9). Si el hook Before User
// Created del proyecto rechaza el correo sintético (403), se añade ese correo a la lista permitida y se reintenta una vez:
// el runner de CI no lo necesita hoy, pero el Auth alojado de juntia-dev puede aplicar el hook también a la API de
// administración. Solo correos `*@seed.test`.
import type { SupabaseClient } from "@supabase/supabase-js";
import { runnerSql } from "../integration/support/sql";

type CreateAttributes = Parameters<SupabaseClient["auth"]["admin"]["createUser"]>[0] & { email: string };

export async function createSeedUser(admin: SupabaseClient, attributes: CreateAttributes) {
  if (!attributes.email.endsWith("@seed.test")) throw new Error("La siembra solo usa correos sintéticos @seed.test");
  const created = await admin.auth.admin.createUser(attributes);
  if (created.error?.status !== 403) return created;
  runnerSql(`insert into juntia_data.signup_allowlist(email) values ('${attributes.email.toLowerCase().replaceAll("'", "''")}') on conflict do nothing`);
  return admin.auth.admin.createUser(attributes);
}
