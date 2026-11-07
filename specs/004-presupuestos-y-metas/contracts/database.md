# Contrato de base de datos — 004 · Presupuestos opcionales y metas

Lo que la API pública (`public`) ofrece a la aplicación en P0-3, además de lo de la
002 y la 003 (`specs/003-pareja-y-balances/contracts/database.md`). Reglas comunes
(ADR-013), sin cambios:

- Importes **siempre como `text`** de dígitos, en entrada y en salida, también dentro
  de `jsonb`. Solo `remaining_minor` y `total_destinado_neto` pueden llevar signo `-`.
- Cada escritura: función de entrada en `public` (`security invoker`, solo reenvía) →
  función de `juntia_private` (`security definer`, dueño `juntia_writer`, `set
  search_path = ''`). Toda la validación está en la segunda.
- Protocolo de la 002: idempotencia (`begin_write`) → bloqueos → lectura → validación
  → escritura → auditoría → `finish_write`. Misma clave y misma huella devuelve el
  resultado guardado; otra huella, `JT008`.
- Toda `update` comprueba `row_count` (research R1 de la 003).
- **Orden global de bloqueos** (research R3): persona → grupo → presupuesto **o**
  movimiento → meta → solicitud. Nunca se pide un nivel igual o inferior a uno que ya
  se tiene, salvo varias filas del mismo nivel en orden de id.
- El servidor de la aplicación **nunca envía cifras derivadas**: ni saldos, ni
  consumos, ni el mes de vigencia, ni métricas. Solo lo que la persona decide (FR-090).
- **Fechas** en `America/Bogota`: «hoy» es `(now() at time zone 'America/Bogota')::date`.

## Lecturas (vistas `security_invoker`, una sola sentencia)

| Vista | Columnas | Notas |
| --- | --- | --- |
| `budget_months` | `scope` (`me`/`us`), `month`, `category_id`, `budget_id`, `version`, `limit_minor` (`null` sin presupuesto), `consumed_minor`, `remaining_minor` (`null` sin presupuesto; puede ser negativo), `state` (`none`/`within`/`near`/`over`) | Se filtra con `scope=eq.` y `month=eq.AAAA-MM-01`. Una fila por categoría con presupuesto vigente **o** con gasto en el mes. `limit_minor` nunca es `0`. Yo: privados + partes propias; Nosotros: total del grupo (ADR-004). Meses: de la primera versión al mayor entre el mes en curso y el último mes con gastos del contexto (research R4) |
| `budget_history` | `budget_id`, `effective_month`, `previous_limit_minor`, `limit_minor`, `changed_by`, `changed_at` | `previous_limit_minor` con `lag()`. Orden `(changed_at desc)` |
| `goals_overview` | `id`, `scope`, `name`, `goal_type`, `target_minor`, `target_month`, `status`, `version`, `balance_minor`, `progress_percent` (entero truncado), `has_pending_request`, `my_available_minor`, `created_at` | Nosotros: solo compartidas. Yo: personales y compartidas, diferenciadas por `scope` (decisión 22.11). Nunca personales del otro |
| `goal_member_balances` | `goal_id`, `user_id`, `contributed_minor`, `withdrawn_minor`, `used_minor`, `available_minor`, `contribution_count` | Para el historial (04·3) y los topes de FundingLedger |
| `goal_entries` | `id`, `goal_id`, `kind`, `member_user_id`, `amount_minor`, `effective_date`, `funding_mode`, `reason`, `transaction_id`, `transaction_description`, `voided` (boolean), `voided_reason`, `created_by`, `created_at` | Lista por cursor, orden `(effective_date desc, created_at desc, id desc)`. `effective_date` = `entry_date` o, en un uso, la `transaction_date` del gasto (Q18). Los `void` no salen como filas: marcan `voided` |
| `goal_activity` | Las de `goal_entries` más `scope` y `month` | Para Actividad (FR-044): Nosotros, asientos de metas compartidas; Yo, los propios de cualquier meta |
| `usage_requests` | `id`, `goal_id`, `goal_name`, `transaction_id`, `transaction_description`, `transaction_amount_minor`, `requested_by`, `member_user_id`, `amount_minor`, `status`, `version`, `created_at`, `resolved_at` | Visibles para los dos integrantes (B4–B7) |
| `expense_goal_funding` | `transaction_id`, `goal_id`, `goal_name`, `used_minor`, `pending_minor`, `funded` (boolean) | Una fila por gasto visible con uso o solicitud. Alimenta la fila CON META, el detalle y la LimitNote de Mover a Pareja |
| `metric_months` | `scope`, `month`, `gasto_consumo`, `aporte_a_metas`, `retiro_de_metas`, `gasto_financiado_con_meta`, `total_destinado_neto` | Reglas de vista de FR-061 y FR-062. Nosotros nunca incluye metas personales. Un mes aparece si tiene gasto o asientos |

Las vistas de la 002 y la 003 no cambian. Actividad lee `goal_activity` del mes con
`readByCursor` y la combina con gastos y liquidaciones por el mismo orden total, como
el PR D de la 003 combinó las liquidaciones.

## Escrituras

| Función de `public` | Parámetros | Devuelve | Bloquea | Errores propios |
| --- | --- | --- | --- | --- |
| `create_budget` | `p_idempotency_key`, `p_scope` (`me`/`us`), `p_category_id`, `p_limit_minor` | `{budget_id, version, effective_month}` | persona (Yo) o grupo (Nosotros) → presupuesto | `JT105`, `JT219`, `JT221` |
| `update_budget` | `p_idempotency_key`, `p_budget_id`, `p_expected_version`, `p_limit_minor` (texto o `null` para desactivar) | Ídem | persona o grupo → presupuesto | `JT011`, `JT218`, `JT221` |
| `create_goal` | `p_idempotency_key`, `p_scope`, `p_name`, `p_goal_type`, `p_target_minor`, `p_target_month` | La meta | grupo (Nosotros) | `JT105`, `JT215` |
| `update_goal` | `p_idempotency_key`, `p_goal_id`, `p_expected_version`, `p_name`, `p_goal_type`, `p_target_minor`, `p_target_month` | La meta | grupo (si es compartida) → meta | `JT011`, `JT201`, `JT214`, `JT215` |
| `complete_goal` | `p_idempotency_key`, `p_goal_id`, `p_expected_version` | `{id, status, version}` | grupo → meta | `JT011`, `JT201`, `JT214` |
| `archive_goal` | `p_idempotency_key`, `p_goal_id`, `p_expected_version` | `{id, status, version}` | grupo → meta → solicitudes de la meta | `JT011`, `JT201`, `JT214` (saldo o solicitudes) |
| `contribute_to_goal` | `p_idempotency_key`, `p_goal_id`, `p_amount_minor`, `p_entry_date`, `p_funding_mode` | El asiento y el disponible nuevo de quien llama | meta | `JT201`, `JT202`, `JT208`, `JT216` |
| `withdraw_from_goal` | `p_idempotency_key`, `p_goal_id`, `p_amount_minor`, `p_entry_date`, `p_reason` | Ídem | meta | `JT201`, `JT202`, `JT204`, `JT208`, `JT217` |
| `void_goal_entry` | `p_idempotency_key`, `p_entry_id`, `p_reason` (`undo`/`void`) | `{entry_id, voided: true}` | meta | `JT204`, `JT205`, `JT206`, `JT207`, `JT225` |
| `create_expense_with_goal` | Los de `create_shared_expense` (o los de `create_transaction` con `p_scope = 'me'`) más `p_goal_id`, `p_own_minor`, `p_requested_minor` | El gasto con sus partes, el uso propio y la solicitud | grupo → movimiento → meta | Los de crear gasto, `JT203`, `JT204`, `JT209`, `JT223`, `JT224` |
| `approve_usage_request` | `p_idempotency_key`, `p_request_id`, `p_expected_version` | `{request_id, status, usage_entry_id}` | grupo → movimiento → meta → solicitud | `JT011`, `JT012`, `JT204`, `JT209`, `JT210`, `JT211`, `JT212` |
| `reject_usage_request` | `p_idempotency_key`, `p_request_id`, `p_expected_version` | `{request_id, status}` | grupo → solicitud | `JT011`, `JT210`, `JT211`, `JT212` |
| `cancel_usage_request` | `p_idempotency_key`, `p_request_id`, `p_expected_version` | `{request_id, status}` | grupo → solicitud | `JT011`, `JT210`, `JT211`, `JT212` |
| `remove_goal_usage` | `p_idempotency_key`, `p_transaction_id`, `p_expected_version` (del gasto) | `{transaction_id, voided_usages, cancelled_request}` | grupo (si es compartido) → movimiento → metas → solicitudes | `JT010`, `JT011`, `JT012`, `JT226` |

**`create_expense_with_goal`.** Crea el gasto con el mismo código de validación que
`create_shared_expense` o `create_transaction` (una sola función interna, para no
duplicar reglas), y en la misma transacción: el uso propio con su asignación (si
`p_own_minor > 0`) y, si `p_requested_minor > 0`, la solicitud al otro integrante.
`p_own_minor + p_requested_minor` debe ser `> 0` y `≤` el importe del gasto. En Yo,
`p_requested_minor` debe ser `0` y la meta personal del que llama. Es la operación
del punto 5 de §15.6.3: no espera ninguna aprobación.

**`approve_usage_request`.** Lee la solicitud sin bloquear, toma grupo → movimiento →
meta → solicitud y **vuelve a leer** la solicitud antes de decidir (research R3).
Revalida que quien llama es `member_user_id`, que la solicitud sigue `pending` con la
versión esperada, que el gasto sigue activo, que la meta no está archivada, que el
disponible de quien aprueba alcanza y que el uso total no supera el gasto. Crea el
uso con su asignación y marca la solicitud `approved`. Es la operación del punto 6
de §15.6.3.

**`remove_goal_usage`.** Anula todos los usos vivos del gasto (`reason =
'remove_usage'`) y cancela la solicitud pendiente. La puede llamar cualquier
integrante del contexto del gasto (decisión 22.17). Sobre un gasto anulado falla con
`JT012` (research R3). Si no hay nada que quitar, `JT226`.

**Deshacer.** `void_goal_entry` con `undo` y la anulación del gasto con meta con
`undo` exigen menos de **60 s** desde `created_at` (research R8); `void` desde el
historial solo exige que los fondos sigan disponibles (decisión 22.13). El deshacer
de un gasto con meta es `void_shared_expense`/`void_transaction` con `undo`, que ya
anula los usos y cancela la solicitud (data-model §6).

**Las funciones redefinidas de la 002 y la 003** conservan su firma y su contrato;
solo añaden los efectos de data-model §6 y el error `JT213`.

## Estado de una escritura (`write_status`)

Sin cambios de contrato. `idempotency_records.action` admite las acciones nuevas:
`create_budget`, `update_budget`, `create_goal`, `update_goal`, `complete_goal`,
`archive_goal`, `contribute_to_goal`, `withdraw_from_goal`, `void_goal_entry`,
`create_expense_with_goal`, `approve_usage_request`, `reject_usage_request`,
`cancel_usage_request`, `remove_goal_usage`. Los `result` guardados nunca contienen
datos de una meta o un presupuesto personal del otro integrante.

## Privilegios (pgTAP `01`)

La prueba de privilegios efectivos se amplía a las seis tablas nuevas (sin escritura
directa para nadie salvo `juntia_writer` por las columnas de data-model §2), a las
funciones nuevas (`execute` exacto: entrada para `authenticated`, escritura de
`juntia_writer`) y a las funciones de trigger (sin `execute` para `anon` ni
`authenticated`). Sigue la exclusión de funciones de extensiones (F40-2).
