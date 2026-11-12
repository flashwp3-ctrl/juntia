# Contrato de la API de datos — 002

Lo único que el cliente de Supabase alcanza: vistas y funciones de entrada de
`public` (ADR-013 §1). Todas exigen un JWT de `authenticated`; para `anon` no
hay `select` ni `execute`. Se llaman **solo desde el servidor** con el cliente
de la petición (`src/lib/db/`, ADR-013 §6.1). Esquema en
[../data-model.md](../data-model.md); errores en [errors.md](errors.md).

**Convenciones del transporte**

- Importes: **siempre `string`** de dígitos en unidades menores, en entrada y en
  salida (`"4500000"` = 45.000 pesos). Nunca número JSON (ADR-013 §4).
- Fechas de movimiento: `string` `AAAA-MM-DD`. Instantes: ISO 8601 con zona.
- Claves de idempotencia: UUID v4 en texto, generado en el cliente al abrir la
  hoja o el diálogo y reutilizado en cada reintento (FR-036).
- Un error es un `RAISE` con `errcode` `JTnnn`; PostgREST lo devuelve con
  `code` igual al SQLSTATE y HTTP 400. Nada del mensaje técnico llega a la
  pantalla.

## Vistas

### `public.my_profile`

| Campo | Tipo | Nota |
| --- | --- | --- |
| `display_name` | `string` | |
| `theme` | `'light' \| 'dark' \| 'system'` | |
| `first_entry_completed` | `boolean` | `first_entry_completed_at is not null` |

Cero filas si `ensure_profile()` todavía no corrió.

### `public.my_transactions`

Movimientos **activos** de quien llama (`status = 'active'` en la vista; RLS por
`owner_user_id` en la tabla).

| Campo | Tipo |
| --- | --- |
| `id` | `string` (uuid) |
| `type` | `'expense' \| 'income'` |
| `category_id` | una de las diez claves |
| `transaction_date` | `string` `AAAA-MM-DD` |
| `description` | `string \| null` |
| `amount_minor` | `string` |
| `currency` | `'COP'` |
| `version` | `number` (entero pequeño, no importe) |
| `created_at`, `updated_at` | `string` ISO |

Uso: el servidor filtra por mes (`transaction_date >= inicio and < siguiente`) y
ordena por `transaction_date desc, created_at desc`. La exportación omite `id` y
`version`.

### `public.my_transaction_months`

| Campo | Tipo |
| --- | --- |
| `month` | `string` `AAAA-MM-01` |
| `count` | `number` |

### `public.my_recent_categories`

Hasta cinco filas de categorías de **gasto**, por último uso.

| Campo | Tipo |
| --- | --- |
| `category_id` | clave |
| `last_used_at` | `string` ISO |

## Funciones de entrada

### `public.ensure_profile() returns jsonb`

Idempotente. Si no hay perfil, lo crea con `display_name` tomado de
`user_metadata.display_name` del JWT (recortado; si falta o no es válido, la
parte local del correo) y `theme = 'system'`. Devuelve la fila de `my_profile`.
Errores: `JT001`.

### `public.complete_first_entry() returns jsonb`

Pone `first_entry_completed_at = now()` si es `null`. Devuelve `my_profile`.
Errores: `JT001`.

### `public.update_display_name(p_display_name text) returns jsonb`

Devuelve `my_profile`. Errores: `JT001`, `JT014`.

### `public.set_theme(p_theme text) returns jsonb`

`p_theme` en `light | dark | system`. Devuelve `my_profile`. Errores: `JT001`,
`JT015`.

### `public.create_transaction(...) returns jsonb`

| Parámetro | Tipo SQL | Regla |
| --- | --- | --- |
| `p_idempotency_key` | `text` | UUID |
| `p_type` | `text` | `expense` o `income` |
| `p_amount_minor` | `text` | Dígitos; > 0; múltiplo de 100 (pesos enteros); ≤ `99999999900` |
| `p_category_id` | `text` | Del catálogo y de ese tipo |
| `p_transaction_date` | `text` | `AAAA-MM-DD` válida; futura permitida (Q13) |
| `p_description` | `text` | `null`, o 1–140 caracteres tras recortar; vacía se guarda `null` |

Devuelve el movimiento con la forma de `my_transactions`. La misma clave con la
misma intención devuelve **el mismo resultado** y no escribe nada más; con otra
intención, `JT008`.

Errores: `JT001`, `JT002`, `JT003`, `JT004`, `JT005`, `JT006`, `JT007`, `JT008`,
`JT009`.

### `public.update_transaction(...) returns jsonb`

| Parámetro | Tipo SQL | Regla |
| --- | --- | --- |
| `p_idempotency_key` | `text` | UUID, uno por apertura del diálogo de edición |
| `p_transaction_id` | `uuid` | Propio y activo |
| `p_expected_version` | `integer` | La `version` leída al abrir la edición |
| `p_amount_minor`, `p_category_id`, `p_transaction_date`, `p_description` | `text` | Como en crear; el tipo no se envía ni cambia (Q14) |

Devuelve el movimiento con `version + 1`. Audita `before` y `after`. Un
movimiento ajeno o inexistente da `JT010` (la RLS no deja distinguirlos, y así
debe ser). Versión distinta: `JT011`. Ya anulado: `JT012`.

Errores: `JT001`–`JT003`, `JT005`–`JT012`.

### `public.void_transaction(...) returns jsonb`

| Parámetro | Tipo SQL | Regla |
| --- | --- | --- |
| `p_idempotency_key` | `text` | UUID |
| `p_transaction_id` | `uuid` | Propio |
| `p_expected_version` | `integer` | Leída al abrir el detalle, o la `version` devuelta por `create_transaction` para «Deshacer» |
| `p_reason` | `text` | `delete` (diálogo «Eliminar») o `undo` (toast de 6 s) |

Devuelve `{ id, status: 'voided', version }`. Audita con `action = 'void'` y el
motivo. El servidor no impone los 6 s de «Deshacer»: el toast desaparece y la
interfaz ya no lo ofrece (edge case); después solo queda «Eliminar».

Errores: `JT001`, `JT008`–`JT012`, `JT017`.

## Lo que **no** existe en la API

Ningún `insert`, `update` ni `delete` sobre vistas ni tablas (ADR-013 [V] 2); ni
`juntia_data` ni `juntia_private` como perfil de PostgREST (`PGRST106`); ni
`/graphql/v1` (`pg_graphql` desactivado); ni lectura de `audit_events`,
`idempotency_records` ni `signup_allowlist`.

## Auth (Supabase, no nuestra)

| Llamada (`@supabase/ssr`, en Server Actions) | Para |
| --- | --- |
| `auth.signUp({ email, password, options: { data: { display_name }, emailRedirectTo } })` | A2 |
| `auth.resend({ type: 'signup', email })` | A3 «Reenviar enlace» |
| `auth.signInWithPassword` | A1 |
| `auth.resetPasswordForEmail(email, { redirectTo })` | A4 y G1 |
| `auth.verifyOtp({ token_hash, type })` en `/auth/confirm` | Verificación (`signup`) y recuperación (`recovery`) con las plantillas del repo (Supabase local y del runner) |
| `auth.exchangeCodeForSession(code)` en `/auth/confirm?next=…` | Lo mismo con la plantilla por defecto de los proyectos alojados (enmienda del 5 nov 2026, quickstart §3, paso 1) |
| `auth.updateUser({ password })` | A5 |
| `auth.signOut({ scope: 'local' })` | S1–S3 |
| `auth.getClaims()` en `proxy.ts` y en cada lectura | Sesión validada (FR-026) |

Las plantillas del repo (`supabase/templates/`, solo Supabase local y runner) usan `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`
en `config.toml`. Los proyectos alojados en Free usan la plantilla por defecto, que no se puede editar sin SMTP propio (quickstart §3, paso 1).

## Exportación (route handler propio)

`GET /api/export?format=json|csv` → `200` con `Content-Disposition: attachment;
filename="juntia-datos-AAAA-MM-DD.<ext>"` y `Cache-Control: no-store`;
`401` sin sesión; `400` con formato no válido; `500` si falla la lectura (D5).
El nombre era `juntia-movimientos-…` hasta la auditoría Impeccable de noviembre de 2026 (F23, aprobada por los
fundadores el 11 de noviembre): el archivo también trae metas, aportes y presupuestos.

JSON:

```json
{
  "exported_at": "2026-11-04T15:02:11-05:00",
  "currency": "COP",
  "note": "<copy en el PR, revisado en es.ts: no sirve para restaurar>",
  "transactions": [
    { "transaction_date": "2026-10-03", "type": "expense", "category": "transport",
      "category_name": "Transporte", "description": "Taxi a la oficina",
      "amount_minor": "4500000", "currency": "COP",
      "created_at": "…", "updated_at": "…" }
  ]
}
```

CSV: las mismas columnas de cada movimiento, cabecera en la primera fila, RFC
4180, UTF-8 con BOM, y `'` delante de cualquier celda que empiece por `=`, `+`,
`-` o `@`.
