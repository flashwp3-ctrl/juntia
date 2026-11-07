# Data Model — 004 · Presupuestos opcionales y metas (P0-3)

Esquema de base de datos y tipos de dominio que P0-3 añade sobre los de la 002 y la
003 (`specs/002-cuentas-y-gastos-privados/data-model.md`,
`specs/003-pareja-y-balances/data-model.md`). Aplica ADR-013 (con sus notas de §2.3 y
§5.1), ADR-001 punto 7, ADR-002, ADR-004 (nota de la decisión 22.7), ADR-007,
ADR-010 (notas de las decisiones 22.13 y 22.17) y el maestro §5.1–§5.3, §5.6, §7.3 y
§15.4. Identificadores en inglés y `snake_case` en SQL, salvo las cinco métricas de
DEC-G04 (`docs/CONVENTIONS.md` A.1 y A.4). Las migraciones de `supabase/migrations/`
son la única fuente; esto es su especificación, no su código. Lo marcado **decisión
del plan** está justificado en [research.md](research.md).

**Migraciones nuevas, nunca editar las aplicadas.** Las siete migraciones de `main`
ya están en producción (T029 de la 003). Todo cambio a sus funciones, políticas o
restricciones va en una migración nueva con `create or replace`, `drop … if exists`
y `alter`, nunca reescribiendo un archivo existente.

## 1. Roles

| Rol | Novedad en P0-3 |
| --- | --- |
| `juntia_writer` | Dueño de las funciones nuevas de escritura. `select`, `insert` y `update` por columna sobre las tablas nuevas, según §2 y §5. Sigue `nologin nobypassrls` y sin ser dueño de tablas |
| `juntia_membership` | Sin cambios. Sus auxiliares booleanas (`is_couple_member`…) son las únicas funciones que aparecen en políticas (research R6) |
| `authenticated`, `anon` | Sin cambios de modelo: `authenticated` lee por vistas de `public` y llama a funciones de entrada |

## 2. Tablas nuevas de `juntia_data`

Todas son **tablas controladas** (ADR-013 §2; spec FR-001): RLS activada, `revoke
all` para `anon` y `authenticated` (incluidos `TRUNCATE`, `REFERENCES` y `TRIGGER`),
`select` para `authenticated` solo por las vistas, y escritas solo por funciones de
`juntia_writer`. Claves UUID (`gen_random_uuid()`). Importes en unidades menores,
`bigint`, múltiplos de 100 (pesos enteros, ADR-002 nota 20.8), máximo
`99999999900` (como `shared_fields` de la 003).

### 2.1 `budgets` — identidad de un presupuesto

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `owner_user_id` | `uuid` → `auth.users` | Presupuesto de Yo. **XOR** con `group_id` |
| `group_id` | `uuid` → `groups` | Presupuesto de Nosotros. Solo parejas `active` (trigger, como `transactions_check_group`) |
| `category_id` | `text not null` | Con `category_kind`, FK compuesta `(category_id, category_kind) → categories(id, kind)`: nunca «Ingresos» (decisión 22.8) |
| `category_kind` | `text not null default 'expense'` | `check (category_kind = 'expense')`. Columna discriminadora: una FK no admite constantes, así que el tipo se fija en una columna local que solo puede valer `expense` (revisión del PR #64, F64-2) |
| `currency` | `text not null default 'COP'` | `check (currency = 'COP')` |
| `version` | `integer not null default 1` | Sube en cada cambio; es la `expectedVersion` |
| `created_by`, `created_at`, `updated_by`, `updated_at` | | Auditoría visible |

Índice único `budgets_one_per_key (coalesce(owner_user_id, group_id), category_id,
currency)`: **una configuración por clave** (§7.3). No hay columna de estado: el
estado de un mes es el de su versión vigente (research R7).

### 2.2 `budget_versions` — límite y vigencia (solo inserción)

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `budget_id` | `uuid not null` → `budgets` | |
| `effective_month` | `date not null` | `check (extract(day from effective_month) = 1)`. **Lo fija el servidor**: el mes en curso en `America/Bogota` (Q7; research R4) |
| `limit_minor` | `bigint` | `null` = desactivado desde ese mes; si no, `> 0`, múltiplo de 100, ≤ `99999999900`. **Nunca 0** (DEC-R01) |
| `changed_by` | `uuid not null` | `= current_uid()` |
| `changed_at` | `timestamptz not null default clock_timestamp()` | Desempata dos cambios del mismo mes |

**Límite que rige en el mes M:** el `limit_minor` de la fila con mayor
`(effective_month, changed_at)` entre las de `effective_month ≤ M`. Si no hay
ninguna, o es `null`, el mes no tiene presupuesto (`budget: null`).

### 2.3 `savings_goals` — la meta

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `owner_user_id` | `uuid` → `auth.users` | Meta personal. **XOR** con `group_id` (DEC-G01) |
| `group_id` | `uuid` → `groups` | Meta compartida. Solo parejas `active` al crear |
| `name` | `text not null` | `btrim`, 1–60 caracteres |
| `goal_type` | `text not null` | `check (goal_type in ('travel','home','wedding','vehicle','education','emergency','other'))`. Da el ícono Duotone del fallback (GoalCard). **Decisión del plan**; la lista se aprueba viendo la pantalla del PR C |
| `target_minor` | `bigint not null` | `> 0`, múltiplo de 100, ≤ `99999999900` |
| `currency` | `text not null default 'COP'` | `check (currency = 'COP')`; igual a la del grupo |
| `target_month` | `date` | Opcional; primer día del mes (Q9 trabaja por meses) |
| `status` | `text not null default 'active'` | `check (status in ('active','completed','archived'))` |
| `version` | `integer not null default 1` | `expectedVersion` de editar, lograr y archivar |
| `created_by`, `created_at`, `updated_by`, `updated_at`, `completed_at`, `archived_at` | | `completed_at` ⇔ estado `completed`; `archived_at` ⇔ `archived` |

Transiciones (decisión 22.15): `active → completed` («Dar por lograda»), `active →
archived` y `completed → archived` (solo con saldo 0 y sin solicitudes pendientes).
La persona no puede volver atrás desde `archived`. Un trigger `goals_guard_transition`
rechaza cualquier otra transición con `JT214`, salvo una.

**Reactivación automática** (revisión del PR #64, F64-1; precisión de las decisiones 22.15 y
22.17, aprobada por los fundadores el 7 de noviembre de 2026, opción (a)). Archivar exige saldo 0, pero un gasto
financiado por la meta puede anularse después, o se le puede quitar el uso. **Anular
siempre se permite**: el `void` del uso se inserta aunque la meta esté `archived`, los
fondos vuelven a cada aportante y, en la misma transacción, la meta pasa sola a
`active` (`archived_at` a `null`, `version` + 1). Solo lo hacen
`void_shared_expense`, `void_transaction` y `remove_goal_usage`, y el trigger solo admite
`archived → active` cuando en la misma transacción se insertó un `void` de un uso de esa
meta. Queda en `audit_events` (`entity_type = 'goal'`, `action = 'reactivate'`, con el
gasto y el importe devuelto), y la respuesta de la función lo devuelve para el aviso
«La meta {nombre} volvió a estar activa: se devolvieron $X». **La regla de archivar no
cambia.**

### 2.4 `goal_ledger_entries` — el ledger (solo inserción)

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `goal_id` | `uuid not null` → `savings_goals` | |
| `kind` | `text not null` | `check (kind in ('contribution','withdrawal','usage','void'))` |
| `member_user_id` | `uuid` → `auth.users` | Aportante. Obligatorio ⇔ `contribution` o `withdrawal`, y siempre `= created_by` (DEC-G06: nadie aporta ni retira por otro) |
| `amount_minor` | `bigint` | Obligatorio y `> 0`, múltiplo de 100, salvo en `void`, donde es `null` |
| `entry_date` | `date` | Obligatorio ⇔ `contribution` o `withdrawal`; hoy o pasada en `America/Bogota`, y no anterior a la creación de la meta (Q12). Un uso cuenta en el mes de su gasto (Q18) |
| `funding_mode` | `text` | Obligatorio ⇔ `contribution`; `check (funding_mode in ('reserved','transferred_declared'))` (DEC-G03) |
| `reason` | `text` | Retiro: obligatorio, 1–140 caracteres (DEC-G02). Anulación: `check (reason in ('undo','void','remove_usage','expense_voided'))` |
| `transaction_id` | `uuid` → `transactions` | Obligatorio ⇔ `usage` |
| `confirmation_id` | `uuid` → `goal_usage_confirmations` | En el uso creado al aprobar una solicitud |
| `voids_entry_id` | `uuid unique` → `goal_ledger_entries` | Obligatorio ⇔ `void`. Único: nunca se anula dos veces (research R1) |
| `created_by` | `uuid not null` | `= current_uid()` |
| `created_at` | `timestamptz not null default clock_timestamp()` | Ventana de deshacer (research R8) |

Un asiento está **vivo** si ningún `void` lo apunta. Un `void` solo apunta a un
`contribution`, `withdrawal` o `usage`, nunca a otro `void`.

### 2.5 `goal_usage_allocations` — de quién son los fondos usados (solo inserción)

| Columna | Tipo | Regla |
| --- | --- | --- |
| `entry_id` | `uuid not null` | pk con `member_user_id`. Con `entry_kind`, FK compuesta `(entry_id, entry_kind) → goal_ledger_entries(id, kind)`, que exige un índice único `(id, kind)` en el ledger |
| `entry_kind` | `text not null default 'usage'` | `check (entry_kind = 'usage')`: una asignación solo puede colgar de un asiento de uso (F64-2) |
| `member_user_id` | `uuid not null` | Aportante de la meta (integrante activo si es compartida; el dueño si es personal) |
| `amount_minor` | `bigint not null` | `> 0`, múltiplo de 100 |

La suma de las asignaciones de un uso es exactamente su `amount_minor` (trigger de
restricción diferido, como las partes de la 003). Anular el uso anula sus
asignaciones: no se borran.

### 2.6 `goal_usage_confirmations` — solicitudes de fondos ajenos

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `goal_id` | `uuid not null` → `savings_goals` | Compartida |
| `transaction_id` | `uuid not null` → `transactions` | Gasto compartido de la misma pareja |
| `requested_by` | `uuid not null` | Quien registra el gasto con meta |
| `member_user_id` | `uuid not null` | A quien se pide; `≠ requested_by` |
| `amount_minor` | `bigint not null` | Cantidad exacta, `> 0`, múltiplo de 100 (§15.5) |
| `status` | `text not null default 'pending'` | `check (status in ('pending','approved','rejected','cancelled'))`. **No vence** (§15.5) |
| `usage_entry_id` | `uuid` → `goal_ledger_entries` | ⇔ `approved` |
| `resolved_by`, `resolved_at` | | ⇔ estado distinto de `pending` |
| `version` | `integer not null default 1` | |
| `created_at` | `timestamptz not null default clock_timestamp()` | |

Índice único parcial `(transaction_id) where status = 'pending'`: como mucho una
solicitud pendiente por gasto (pareja de dos, una meta por gasto). Solo `update` por
columna (`status`, `usage_entry_id`, `resolved_by`, `resolved_at`, `version`), y un
trigger que solo admite `pending →` otro estado.

### 2.7 Cambios en tablas de la 002 y la 003

- **`audit_events`**: el `check` de `entity_type` añade `budget`, `goal`, `goal_entry` y `usage_request`, y el de `action` añade `complete`, `archive`, `approve`, `reject`, `remove_usage` y `reactivate` (F64-1) (se reemplazan los `check` con nombre que dejó la 003). Toda escritura de P0-3 deja su evento con actor, instante, valor anterior y nuevo; los asientos del ledger guardan el asiento, no un antes y después.
- **`idempotency_records`**: el `check` de `action` añade las catorce acciones de [contracts/database.md](contracts/database.md), «Estado de una escritura».
- **`transactions`**: un trigger de restricción diferido nuevo (§3, «Ningún uso vivo en un gasto no activo»). Ninguna columna nueva.

## 3. Invariantes que no dependen de la función (ADR-013 §2.4)

| Invariante | Mecanismo |
| --- | --- |
| Presupuestos solo de categorías de gasto; asignaciones solo de asientos de uso | Columnas discriminadoras con `check` y FK compuestas (§2.1, §2.5). pgTAP: un `insert` directo como `juntia_writer` de un presupuesto de `income` y de una asignación sobre un aporte fallan (`23503`/`23514`) |
| Ledger, asignaciones y versiones de presupuesto de solo inserción | Trigger `before update or delete` que falla con `JT222` para **cualquier** rol (research R1) |
| Saldo ≥ 0 por aportante | Trigger `before insert` que **bloquea la meta** y comprueba que, después del asiento, `disponible(g, m) ≥ 0`; si no, `JT220` (research R2). Cubre los tres asientos que reducen el disponible: un **retiro** en `goal_ledger_entries`, una **asignación de uso** en `goal_usage_allocations` y un **`void` que anula un aporte** (el aportante `m` es el `member_user_id` del aporte anulado). Anular un retiro o un uso solo aumenta el disponible y no se comprueba. Así la regla no depende de la función (ADR-013 §2.4) |
| Una meta por gasto; meta y gasto del mismo contexto y moneda | Trigger `before insert` en usos y solicitudes: todos los usos y solicitudes de un `transaction_id` comparten `goal_id`, y el contexto del gasto es el de la meta (DEC-G06); `JT203`/`JT224` |
| Uso ≤ gasto | Trigger `before insert` en `goal_usage_allocations`: la suma de usos vivos del gasto no supera su importe; `JT209`. Las funciones ya lo comprueban bajo el bloqueo del movimiento |
| Ningún uso vivo en un gasto no activo (F63-4) | Trigger de restricción diferido en `transactions` (`after update of status, amount_minor`): si el gasto queda anulado con usos vivos, o su importe queda por debajo de lo usado, falla con `JT213` |
| Aportes solo a metas `active`; en `archived`, solo el `void` de un uso | Trigger `before insert` en el ledger; `JT202`. El `void` de un uso en una meta archivada se admite y la reactiva (§2.3, F64-1) |
| Un presupuesto por clave | Índice único de §2.1 |
| Límite nunca 0 | `check` de §2.2 |

## 4. Saldos (derivados, nunca guardados)

Por aportante `m` y meta `g`, solo con asientos vivos:

```
disponible(g, m) = Σ aportes(m) − Σ retiros(m) − Σ asignaciones de usos vivos a m
goal_balance(g)  = Σ_m disponible(g, m)
```

`progress = goal_balance / target`, mostrado como entero truncado (FR-034). Las
solicitudes pendientes **no** cuentan (FR-053).

## 5. Políticas

Patrón de la 003. Lectura `for select to authenticated, juntia_writer`; escritura
solo `to juntia_writer`. **Ninguna política llama a una función invoker que lea
`juntia_data`**: se usan subconsultas en línea y las auxiliares booleanas de
`juntia_membership` (research R6).

| Tabla | Lectura | Inserción (`juntia_writer`) | Actualización (`juntia_writer`) |
| --- | --- | --- | --- |
| `budgets` | `owner_user_id = auth.uid()` o `is_couple_member(group_id)` | Lo mismo, y `created_by = auth.uid()` | Lo mismo en `using` y `with check`; columnas `version`, `updated_by`, `updated_at` |
| `budget_versions` | `exists` del presupuesto visible | `exists` del presupuesto visible y `changed_by = auth.uid()` | — |
| `savings_goals` | `owner_user_id = auth.uid()` o `is_couple_member(group_id)` | Lo mismo, y `created_by = auth.uid()` | Lo mismo; columnas de §2.3 salvo identidad, contexto y moneda |
| `goal_ledger_entries` | `exists` de la meta visible | `exists` de la meta visible y `created_by = auth.uid()`, y `member_user_id` nulo o `= auth.uid()` | — |
| `goal_usage_allocations` | `exists` del asiento visible | `exists` del asiento visible | — |
| `goal_usage_confirmations` | `exists` de la meta visible | `requested_by = auth.uid()` y meta visible | Meta visible (las funciones deciden quién resuelve) |

Una persona nunca ve la meta, el presupuesto ni los asientos personales del otro:
las metas personales solo cumplen `owner_user_id = auth.uid()` (DEC-G06; FR-086).

## 6. Funciones de la 002 y la 003 que se redefinen

En una migración nueva, con `create or replace` y la misma firma (las entradas de
`public` no cambian). Las cuatro toman ya el movimiento bloqueado; añaden los
niveles 4 y 5 del orden global (research R3).

| Función | Cambio | Fuente |
| --- | --- | --- |
| `juntia_private.transaction_goal_funded(uuid)` | Cuerpo: `exists` de un uso vivo con ese `transaction_id`. Misma firma, `stable`, `search_path = ''`, `execute` solo para `juntia_writer` | FR-007; FR-035 de la 003 |
| `void_shared_expense` y `void_transaction` | Antes de anular: bloquea las metas y solicitudes del gasto, anula sus usos vivos (`reason = 'expense_voided'`) y cancela la solicitud pendiente, en la misma transacción | Q17; FR-057, FR-059 |
| `update_shared_expense` y `update_transaction` | Si el importe nuevo queda por debajo de los usos vivos, `JT213`. El resto de campos no toca el uso | Q17 |
| `reclassify_to_shared` | Sin cambio de código: ya llama a `transaction_goal_funded` con el movimiento bloqueado. Su prueba con datos llega con esta migración | ADR-001 punto 7 |

## 7. Vistas de `public` (`security_invoker = true`, importes como texto)

Detalle en [contracts/database.md](contracts/database.md). Todas de **una sola
sentencia**; las que agregan llevan columnas de filtro (`context`, `month`,
`goal_id`) en lugar de parámetros (research R5 y R6).

**Dos conceptos que no se mezclan** (revisión del PR #64, F64-3):

- **`context`** (`me`/`us`) es el **contexto de presentación**, el del selector Yo/Nosotros. Lo llevan las vistas que agregan por contexto: `budget_months`, `goal_activity` y `metric_months`.
- **`goal_scope`** (`personal`/`shared`) es **de quién es la meta**: `personal` si tiene `owner_user_id`, `shared` si tiene `group_id`. Lo llevan `goals_overview` y `goals_totals`, que **no** tienen `context`.

Una pantalla elige metas por `goal_scope`, con **una sola consulta**: en Nosotros, `goal_scope = 'shared'`; en Yo, todas las visibles, que la interfaz separa en «Tus metas» (`personal`) y «Metas compartidas» (`shared`, con «Tus aportes» = `my_available_minor`). Los totales salen de `goals_totals` por `goal_scope`: el total de las personales nunca incluye una compartida, y el «Apartado en metas compartidas» de Nosotros nunca incluye una personal.

| Vista | Qué |
| --- | --- |
| `budget_months` | Por contexto (`context`), categoría y mes: límite vigente (o `null`), consumo, restante, estado (`none`/`within`/`near`/`over`), `budget_id` y `version`. Yo consume privados más la parte propia de lo compartido; Nosotros, el total del grupo (ADR-004) |
| `budget_history` | Cambios de un presupuesto: mes desde el que rige, límite anterior y nuevo, autor y fecha |
| `goals_overview` | Una fila por meta visible, con `goal_scope`, saldo, progreso, `target_month`, estado, versión, `has_pending_request` y `my_available_minor` (lo disponible de quien mira; en las personales coincide con el saldo). Sin `context` |
| `goals_totals` | Una fila por `goal_scope` con las metas activas visibles: saldo total, disponible de quien mira y número de metas |
| `goal_member_balances` | Por meta y aportante: aportado, retirado, usado y disponible |
| `goal_entries` | Asientos de una meta (vivos y anulados, marcados), con el gasto vinculado de los usos. Orden total para el cursor: `(effective_date desc, created_at desc, id desc)` |
| `usage_requests` | Solicitudes con su gasto, meta, cantidad y estado, visibles para los dos |
| `goal_activity` | Asientos para Actividad, por contexto y mes, con el mismo orden total |
| `metric_months` | Las cinco métricas DEC-G04 por `context` (`me`/`us`) y mes (FR-060 a FR-063) |
| `expense_goal_funding` | Por gasto visible: meta, usado, pendiente y si se puede mover (para el detalle, B4 y la LimitNote) |

## 8. Tipos de dominio (`src/domain/`)

| Módulo | Qué |
| --- | --- |
| `budgets/` | `BudgetMonth`, `budgetState(consumed, limit)` (cerca ≥ 85 % por comparación exacta), `displayedPercent` (truncado), `limitInForce(versions, month)` |
| `goals/` | `Goal`, `LedgerEntry`, `memberAvailable`, `goalBalance`, `progress` (truncado), `proposeFunding(available, amount)` (proporcional, mayor residuo, pesos enteros, ADR-002), `goalPace` (Q9) |
| `metrics/` | `gasto_consumo`, `aporte_a_metas`, `retiro_de_metas`, `gasto_financiado_con_meta`, `total_destinado_neto`, con `NotAvailable` distinto de `0` (CONVENTIONS A.4; TESTING §6) |
| `analysis/` | `monthComparison(current, previous)` (Q10) |
| `golden/` | Partes A a D del dataset de P0-3, con fechas, y la prueba cronológica (spec, «Dataset dorado») |

## 9. Transiciones de una solicitud y de un uso

```
                                    aprobar (quien recibe)
registrar gasto con meta ─▶ pending ─────────────────────▶ approved ─(uso vivo)
                               │  rechazar (quien recibe)
                               ├────────────────────────▶ rejected
                               │  cancelar (quien pide), quitar el uso, anular el gasto
                               └────────────────────────▶ cancelled

uso vivo ── quitar el uso / anular el gasto / deshacer ──▶ uso anulado (asiento void)
```

Ninguna transición vuelve a `pending`, y ninguna escribe importes fuera del ledger.
