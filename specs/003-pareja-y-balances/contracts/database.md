# Contrato de base de datos — 003 · Pareja y balances

Lo que la API pública (`public`) ofrece a la aplicación en P0-2, además de lo de
la 002 (`specs/002-cuentas-y-gastos-privados/contracts/database.md`). Reglas
comunes (ADR-013):

- Importes **siempre como `text`** de dígitos, en entrada y en salida, también
  dentro de `jsonb`. Las partes y los saldos pueden ser negativos solo en
  `net_minor` (con signo `-`); todo lo demás es positivo o cero.
- Cada escritura: función de entrada en `public` (`security invoker`, solo
  reenvía) → función de `juntia_private` (`security definer`, dueño
  `juntia_writer`, `set search_path = ''`). Toda la validación está en la segunda.
- Cada escritura recibe `p_idempotency_key uuid-text` y aplica el protocolo de la
  002: idempotencia → bloqueos → lectura → validación → escritura → auditoría →
  completar el registro. Misma clave y misma huella devuelve el resultado
  guardado; misma clave con otra huella, `JT008`.
- **Toda `update` dentro de una función comprueba el número de filas afectadas**
  (`get diagnostics … row_count`) y falla si no es el esperado: con RLS, un
  `update` sin permiso no da error, solo afecta a 0 filas (research R1, hallazgo
  del spike).
- **Bloqueos, siempre en este orden** (ADR-013 §3.3; research R3): primero las
  raíces de persona (`pg_advisory_xact_lock` por usuario, ordenadas por UUID),
  después la raíz del grupo (`select … for update` sobre `groups`), después las
  filas de movimiento (ordenadas por UUID). Ninguna operación toma un bloqueo de
  persona después de uno de grupo.

## Lecturas (vistas `security_invoker`)

| Vista | Columnas | Notas |
| --- | --- | --- |
| `my_transactions` (cambia) | Las de la 002 + `moved_to_transaction_id` | Ahora filtra `owner_user_id = auth.uid() and group_id is null` explícitamente (research R2) |
| `my_transaction_months`, `my_recent_categories` (cambian) | Las de la 002 | Mismo filtro explícito |
| `my_couple` | `group_id`, `status` (`provisional`/`active`), `role`, `join_order`, `version`, `invitation_id`, `invitation_email`, `invitation_expires_at`, `invitation_expired` (boolean) | Las columnas de invitación solo para la propietaria de una pareja provisional; nulas en las demás filas. **Nunca** el hash |
| `couple_members` | `user_id`, `display_name`, `role`, `join_order` | Solo de mi pareja activa. **Nunca** el correo |
| `couple_expenses` | `id`, `transaction_date`, `category_id`, `description`, `amount_minor`, `payer_user_id`, `split_mode`, `split_percents`, `parts` (`jsonb` `{user_id: text}`), `created_by`, `created_at`, `updated_by`, `updated_at`, `version`, `moved_from_me` (boolean: solo verdadero para la autora del movimiento) | Activos de mi pareja activa. Orden total para el cursor: `(transaction_date desc, created_at desc, id desc)` |
| `couple_settlements` | `id`, `settlement_date`, `from_user_id`, `to_user_id`, `amount_minor`, `note`, `status`, `created_by`, `created_at`, `voided_by`, `voided_at`, `version` | Activas y anuladas |
| `couple_transaction_months` | `month`, `count` | Meses con gastos o liquidaciones activos |
| `my_shared_parts` | `id`, `transaction_date`, `category_id`, `description`, `amount_minor`, `my_part_minor`, `payer_user_id` | Gastos compartidos activos con mi parte, para Yo |
| `couple_month_summary` | `month`, `total_minor`, `by_category` (`jsonb`), `count` | Una fila por mes; se filtra con `month = eq.AAAA-MM-01`. **Una sola sentencia** (research R4) |
| `me_month_summary` | `month`, `private_minor`, `shared_part_minor`, `consumption_minor`, `by_category` | `gasto_consumo` de Yo; una sola sentencia |
| `couple_balance` | Una fila por integrante: `user_id`, `paid_minor`, `share_minor`, `settled_out_minor`, `settled_in_minor`, `net_minor` | Una sola sentencia. La sugerencia la calcula `settlementSuggestion` del dominio sobre estas filas |

## Escrituras

| Función de `public` | Parámetros | Devuelve | Bloquea | Errores propios |
| --- | --- | --- | --- | --- |
| `create_invitation` | `p_idempotency_key`, `p_email`, `p_token_hash` | `{group_id, invitation_id, expires_at}` | persona (quien invita) | `JT101`, `JT108`, `JT109` |
| `regenerate_invitation` | `p_idempotency_key`, `p_group_id`, `p_expected_version` (la `version` de `my_couple` que leyó M4), `p_token_hash` | Ídem, con el `invitation_id` nuevo y la `version` nueva (+1) | persona, grupo | `JT102`, `JT103`, `JT011`, `JT109` |
| `cancel_invitation` | `p_idempotency_key`, `p_group_id`, `p_expected_version` | `{group_id, status: 'discarded'}` | persona, grupo | `JT102`, `JT103`, `JT011` |
| `preview_invitation` | `p_token_hash` | `{inviter_display_name, expires_at}` o `JT104` | — (solo lectura, `stable`, `security definer` de `juntia_writer`: lee la invitación por la política «correo de quien llama», nunca por el hash solo) | `JT104` (igual para todos los motivos) |
| `accept_invitation` | `p_idempotency_key`, `p_token_hash` | `{group_id, status: 'active'}` | persona (quien acepta), grupo | `JT101`, `JT104` |
| `create_shared_expense` | `p_idempotency_key`, `p_amount_minor`, `p_category_id`, `p_transaction_date`, `p_description`, `p_payer_user_id`, `p_split_mode`, `p_split_percents`, `p_parts` (`jsonb` `{user_id: text}`) | El gasto con sus partes | grupo | `JT003`, `JT005`, `JT006`, `JT007`, `JT105`, `JT110`, `JT111`, `JT118` |
| `update_shared_expense` | Ídem + `p_transaction_id`, `p_expected_version` | Ídem | grupo, movimiento | Ídem + `JT010`, `JT011`, `JT012` |
| `void_shared_expense` | `p_idempotency_key`, `p_transaction_id`, `p_expected_version`, `p_reason` (`delete`/`undo`) | `{id, status, version}` | grupo, movimiento | `JT010`, `JT011`, `JT012`, `JT017` |
| `reclassify_to_shared` | `p_idempotency_key`, `p_transaction_id`, `p_expected_version`, `p_split_mode`, `p_split_percents`, `p_parts` | `{voided_private_id, shared: …}` | grupo, movimiento privado | `JT010`, `JT011`, `JT012`, `JT110`, `JT115`, `JT116` |
| `undo_reclassify_to_shared` | `p_idempotency_key`, `p_shared_transaction_id`, `p_expected_version` | `{restored_private_id}` | grupo, movimientos | `JT011`, `JT012`, `JT117` |
| `register_settlement` | `p_idempotency_key`, `p_amount_minor`, `p_settlement_date`, `p_note` | La liquidación con `pending_before` y `pending_after` | grupo | `JT105`, `JT106`, `JT107`, `JT114` |
| `void_settlement` | `p_idempotency_key`, `p_settlement_id`, `p_expected_version`, `p_reason` (`void`/`undo`) | `{id, status, version}` | grupo | `JT112`, `JT113`, `JT011` |

**Dirección de la liquidación.** `register_settlement` no recibe ni deudor ni
acreedor: los deriva del saldo, bajo el bloqueo del grupo (§5.1, FR-027). Así la
dirección no se puede invertir desde el cliente y la segunda de dos liquidaciones
del total concurrentes ve el saldo ya en 0 (research R3, sonda 7).

**Partes.** El servidor de la aplicación calcula las partes con `splitAmount` del
dominio y las envía; la función comprueba que suman el importe, que son múltiplos
de 100, que hay al menos una positiva, que cada `user_id` es integrante activo y
que el modo y los porcentajes son coherentes. Un trigger diferido lo vuelve a
comprobar (ADR-013 §6.2).

**Ventana de «Deshacer».** `undo_reclassify_to_shared`, `void_shared_expense` con
`undo` y `void_settlement` con `undo` exigen que la operación tenga menos de
**60 s** en el servidor (`created_at`), además de la versión esperada. La ventana
visible es de 6 s (toast); los 60 s de servidor cubren la latencia y los
reintentos sin dejar una puerta abierta indefinida. **Decisión del plan**
(research R7).

**Regenerar dos veces a la vez** (revisión del PR #49, F49-3): dos pestañas pulsan
«Generar enlace nuevo» con claves distintas y la misma `p_expected_version`. La
primera reemplaza la invitación y sube `groups.version`; la segunda espera al
bloqueo del grupo, ve otra versión y falla con `JT011` **sin** reemplazar nada: el
enlace válido es el de la primera. M4 relee `my_couple` y muestra que el enlace ya
se regeneró.

## Estado de una escritura (`write_status`)

Para «Comprobar estado» tras un resultado `unknown` (revisión del PR #49, F49-4):

| Función de `public` | Parámetros | Devuelve |
| --- | --- | --- |
| `write_status` | `p_action` (una de las acciones de `idempotency_records`), `p_idempotency_key` | `{state: 'completed', result}` o `{state: 'not_found'}` |

- Es de **solo lectura** (`stable`, `security definer` de `juntia_writer`), y **no
  ejecuta ni reintenta nada**.
- Busca solo por `(actor_user_id = current_uid(), action, idempotency_key)`, con la
  política de lectura de `juntia_writer` sobre `idempotency_records` (la de la 002,
  `actor_user_id = auth.uid()`). Nadie puede consultar la clave de otra persona: da
  `not_found`, igual que una clave que no existe.
- `result` es **el mismo** `result` guardado que habría devuelto el reintento, ya
  limitado a lo que esa persona puede ver (las funciones nunca guardan datos
  privados del otro en `result`).
- Nunca expone `idempotency_records`: ni la huella, ni las fechas, ni otras filas.
- `pending` no se ve nunca: el registro pasa a `completed` en la misma transacción
  que la escritura, así que una escritura en curso o revertida da `not_found`.
  Entonces la interfaz dice que todavía no consta y que reintentar es seguro. El
  reintento con la misma clave, si la primera sigue en curso, espera a su índice
  único y devuelve su resultado.

Prueba de integración: la escritura confirma, la respuesta se pierde (el cliente de
prueba la descarta); `write_status` devuelve `completed` y el mismo `result`; se
repite `write_status` y después el reintento con la misma clave: **una sola**
escritura, ningún duplicado y ninguna fila nueva en `audit_events`. Con la clave de
Sara, `write_status` desde la sesión de Tomás da `not_found`.

## Privilegios (pgTAP `01`)

La prueba de privilegios efectivos de la 002 se amplía a:

- `juntia_membership`: solo `select` sobre `groups`, `group_members` y
  `group_invitations`; ningún otro privilegio sobre tablas, secuencias ni
  esquemas, salvo `usage` de `juntia_data` y `juntia_private`; dueño de exactamente
  las cuatro auxiliares; `nologin`, `nobypassrls`, no es dueño de ninguna tabla.
- Las cuatro auxiliares: `security definer`, `search_path = ''`, devuelven
  `boolean`, `execute` solo para `authenticated` y `juntia_writer`.
- **Nadie hereda `juntia_membership`** (revisión del PR #49, F49-6):
  `pg_has_role(r, 'juntia_membership', 'MEMBER')` y `pg_has_role(r,
  'juntia_membership', 'USAGE')` son **falsos** para `anon`, `authenticated` y
  `juntia_writer` (lo mismo para `juntia_writer` como rol objetivo desde `anon` y
  `authenticated`). `postgres` sí es miembro, porque lo necesita para `alter
  function … owner to`, igual que con `juntia_writer` en la 002.
- El inventario de funciones ejecutables por `public`, `anon` y `authenticated`
  sigue la lección F40-2 de la 002 y **excluye las funciones que pertenecen a una
  extensión** (`pg_depend` con `deptype = 'e'`), para que una versión nueva de
  `pgcrypto` o `pgtap` no rompa la prueba ni oculte una concesión de Juntia.
