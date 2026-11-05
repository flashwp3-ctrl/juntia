# Data Model — 002 · Cuentas y gastos privados (P0-1)

Esquema de base de datos y tipos de dominio de P0-1. Aplica ADR-013 (§1–§5, con
su enmienda de §2.3) y el maestro §5 y §7.3. Identificadores en inglés y
`snake_case` en SQL (`docs/CONVENTIONS.md` A.1). Las migraciones de
`supabase/migrations/` son la única fuente; esto es su especificación, no su
código. Lo marcado **decisión del plan** está justificado en
[research.md](research.md) R8.

## 1. Esquemas y roles

| Esquema | Expuesto por la API | Contiene en P0-1 |
| --- | --- | --- |
| `public` | Sí (único en `api.schemas`) | Vistas `security_invoker` y funciones de entrada `security invoker` |
| `juntia_data` | No | `profiles`, `categories`, `transactions`, `audit_events`, `idempotency_records`, `signup_allowlist` |
| `juntia_private` | No | Funciones que escriben (`security definer`, de `juntia_writer`), `current_uid()`, validaciones internas y el hook del registro |

| Rol | Atributos | Para qué |
| --- | --- | --- |
| `juntia_writer` | `nologin nobypassrls`, no es dueño de ninguna tabla | Dueño de las funciones que escriben; sus propias políticas |
| `authenticated` | El de Supabase | Lee por las vistas; llama a las funciones de entrada |
| `anon` | El de Supabase | Nada de Juntia |
| `supabase_auth_admin` | El de Supabase | Ejecuta el hook de la lista permitida |

**Primera migración, en este orden** (research R1):

1. `create schema juntia_data`, `juntia_private`; `revoke all on schema … from
   public, anon, authenticated`.
2. `create role juntia_writer nologin nobypassrls` dentro de un `DO` que no falla
   si ya existe (los roles son del clúster).
3. `grant juntia_writer to postgres` y `grant usage, create on schema
   juntia_private to juntia_writer`; `grant usage on schema juntia_data to
   juntia_writer`. Al final de la migración que asigna los dueños, `revoke create
   on schema juntia_private from juntia_writer` (e.5: revocar no rompe nada).
4. `alter default privileges` en los tres esquemas: sin `execute` de funciones
   para `public`, `anon` ni `authenticated`; sin grants en tablas y secuencias
   nuevas (ADR-013 §5.4). Se comprueba con la prueba de privilegios efectivos, no
   se supone.
5. `drop extension if exists pg_graphql` (FR-005; ADR-013 §5.3). Quitarlo o
   desactivarlo, en local y en `juntia-dev`, es un **criterio de salida del PR
   A**. Si el proyecto alojado no lo permite, **el PR A se para y lo reporta**; no
   cambia a la alternativa de «ninguna tabla controlada en su esquema» (revisión
   del PR #37, F37-8).
6. `juntia_private.current_uid()` (enmienda de ADR-013 §2.3): `language sql
   stable security invoker return auth.uid();`, de `postgres`, `execute` solo
   para `juntia_writer`.

**Reparto en tres migraciones** (revisión del PR #37, F37-2; plan, PR A):

| Migración | Contiene | Punto de control después |
| --- | --- | --- |
| `foundation` | Lo de arriba, `profiles`, `categories`, `signup_allowlist`, el hook, `my_profile` y las funciones de perfil | 1: [V] 1 (con `ensure_profile`) y 9, y lo que ya se pueda de 2, 7 y 8 |
| `controlled_tables` | `transactions`, `audit_events`, `idempotency_records`, sus triggers, políticas y grants, y las vistas de movimientos. **Ninguna función de dinero** | 2: [V] 1, 2, 7, 8 y 9 definitivas sobre todas las tablas controladas y vistas |
| `money_functions` | `create_transaction`, `update_transaction`, `void_transaction`, `parse_amount_minor`, `request_fingerprint` | — |

## 2. Tablas de `juntia_data`

RLS **activada en todas**. `anon` y `authenticated`: `revoke all` en tablas y
secuencias, incluidos `TRUNCATE`, `REFERENCES` y `TRIGGER`. Claves UUID (sin
secuencias).

### 2.1 `profiles`

| Columna | Tipo | Regla |
| --- | --- | --- |
| `user_id` | `uuid` PK | FK a `auth.users(id)`; sin `on delete` (eliminar cuenta no existe en P0, §15.6.1) |
| `display_name` | `text not null` | Recortado, 1–60 caracteres (**decisión del plan**), sin saltos de línea |
| `theme` | `text not null default 'system'` | `check (theme in ('light','dark','system'))` |
| `first_entry_completed_at` | `timestamptz` | `null` = la próxima entrada muestra A6 |
| `created_at`, `updated_at` | `timestamptz not null default now()` | Auditoría técnica |

Sin columna de color: en P0-1 el avatar de la persona usa `person.1` (color del
sistema, no editable, §15.5); P0-2 decide la asignación dentro de la pareja. El
correo **no** se copia aquí: sale de los claims de la sesión.

### 2.2 `categories`

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `text` PK | Una de las diez claves de abajo |
| `kind` | `text not null` | `check (kind in ('expense','income'))` |
| `sort_order` | `smallint not null` | Orden de `DESIGN_SYSTEM.md` §1.3 |

`unique (id, kind)` para la FK compuesta. Sembrada por la migración; sin
escritura por nadie más. Catálogo (`DESIGN_SYSTEM.md` §1.3; claves de
`CategoryIcon` de la 001):

| `id` | `kind` | Nombre visible (`es.ts`) | Phosphor |
| --- | --- | --- | --- |
| `market` | expense | Mercado | shopping-cart-simple |
| `restaurants` | expense | Restaurantes | fork-knife |
| `home` | expense | Hogar | house-line |
| `transport` | expense | Transporte | car-profile |
| `health` | expense | Salud | first-aid-kit |
| `entertainment` | expense | Entretenimiento | film-slate |
| `shopping` | expense | Compras | shopping-bag |
| `services` | expense | Servicios | wifi-high |
| `income` | income | Ingresos | arrow-down-left |
| `other` | expense | Otra | dots-three-outline |

### 2.3 `transactions` (tabla controlada)

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `uuid` PK `default gen_random_uuid()` | |
| `type` | `text not null` | `check (type in ('expense','income'))`. Inmutable. P0-2 amplía el `check` si las liquidaciones viven aquí |
| `created_by` | `uuid not null` | FK `auth.users(id)`. Autora. Inmutable |
| `owner_user_id` | `uuid` | FK `auth.users(id)`. Propietaria del movimiento privado. Inmutable |
| `group_id` | `uuid` | Sin FK en P0-1 (no hay `groups`). Inmutable |
| `amount_minor` | `bigint not null` | `check (amount_minor > 0)`. Unidades menores ISO 4217 |
| `currency` | `text not null default 'COP'` | `check (currency = 'COP')`. Inmutable |
| `category_id` | `text not null` | FK compuesta con `type` |
| `transaction_date` | `date not null` | Fecha elegida, sin hora; define el mes (maestro §5.2). Futuras permitidas (Q13) |
| `description` | `text` | `null` o 1–140 caracteres recortados (**decisión del plan**) |
| `status` | `text not null default 'active'` | `check (status in ('active','voided'))` |
| `voided_at`, `voided_by` | `timestamptz`, `uuid` | Los dos puestos si y solo si `status = 'voided'` |
| `version` | `integer not null default 1` | `check (version >= 1)`; +1 en cada edición y anulación |
| `created_at`, `updated_at` | `timestamptz not null default now()` | Auditoría técnica, no periodo |

Restricciones (FR-007; maestro §7.3, «Contrato por tipo»):

- `transactions_scope_xor`: `(owner_user_id is not null) <> (group_id is not null)`.
- `transactions_private_only_p0_1`: `group_id is null`. **P0-2 la quita.**
- `transactions_income_private`: `type <> 'income' or group_id is null` (se queda en P0-2).
- `transactions_private_owner_is_author`: `group_id is not null or owner_user_id = created_by`.
- `transactions_voided_consistency`: `(status = 'voided') = (voided_at is not null and voided_by is not null)`.
- FK `(category_id, type) → categories (id, kind)`: «Ingresos» solo con `income`, las demás solo con `expense`.

Triggers:

- `transactions_guard_update` (`before update`): rechaza cambiar `type`,
  `created_by`, `owner_user_id`, `group_id`, `currency` o `created_at`
  (`JT013`); rechaza cualquier cambio sobre una fila ya `voided` (`JT012`);
  rechaza pasar de `voided` a `active`. Corre para todos los roles: la regla no
  depende de la función.
- Sin `delete` para nadie: ni grant ni política (un movimiento se anula, no se
  borra, maestro §5.4).

Índices: `(owner_user_id, transaction_date desc) where status = 'active'` (mes y
meses con movimientos); `(owner_user_id, category_id, created_at desc) where
status = 'active'` (recientes).

### 2.4 `audit_events` (tabla controlada, solo inserción)

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `occurred_at` | `timestamptz not null default now()` | Instante |
| `actor_user_id` | `uuid not null` | FK `auth.users(id)` |
| `entity_type` | `text not null` | `check (entity_type = 'transaction')` en P0-1 |
| `entity_id` | `uuid not null` | El movimiento |
| `action` | `text not null` | `check (action in ('create','update','void'))` |
| `reason` | `text` | `null`, o `'delete'` / `'undo'` cuando `action = 'void'` |
| `before`, `after` | `jsonb` | Valores anterior y nuevo (`before` es `null` al crear); importes como texto |

Trigger `audit_events_append_only` (`before update or delete`, por fila) y otro
`before truncate` (por sentencia): rechazan siempre, **también a
`juntia_writer`** (ADR-013 §2.4 y [V] 2). Sin lectura para `authenticated` en
P0-1: ninguna pantalla la muestra.

### 2.5 `idempotency_records` (tabla controlada)

| Columna | Tipo | Regla |
| --- | --- | --- |
| `actor_user_id` | `uuid not null` | |
| `action` | `text not null` | `create_transaction`, `update_transaction`, `void_transaction` |
| `idempotency_key` | `uuid not null` | La genera el cliente al abrir la hoja o el diálogo (FR-036) |
| `request_fingerprint` | `text not null` | `sha256` hex del `jsonb` normalizado de los argumentos salvo la clave |
| `status` | `text not null default 'pending'` | `check (status in ('pending','completed'))` |
| `result` | `jsonb` | `null` mientras `pending`; lo que devolvió la primera ejecución cuando `completed`. `check ((status = 'pending') = (result is null))` |
| `created_at` | `timestamptz not null default now()` | |
| `completed_at` | `timestamptz` | `null` mientras `pending` |

PK `(actor_user_id, action, idempotency_key)`. Sin purga en P0-1 (volumen de dos
personas); se revisa antes de MVP-1.

**Protocolo (ADR-013 §3.1, corrección del 4 de noviembre de 2026 tras el bloqueo
de la implementación del PR A).** La función inserta la fila `pending` **al
principio**, antes del bloqueo de la raíz, y la completa **al final** con
`update … set status = 'completed', result = …, completed_at = now() where …
and status = 'pending'`, dentro de la **misma transacción**. Si la operación
falla, la transacción revierte y la fila `pending` desaparece con ella, así que
nunca queda una clave a medias. Una segunda petición con la misma clave espera en
el índice de la PK hasta que la primera termina: si encuentra `completed` con la
misma huella, devuelve `result`; con otra huella, `JT008`. Un trigger
`idempotency_records_guard` (`before update`) hace la fila **inmutable salvo esa
única transición**: rechaza cualquier cambio de `actor_user_id`, `action`,
`idempotency_key`, `request_fingerprint` y `created_at`, cualquier `update` de una
fila ya `completed` y cualquier transición distinta de `pending → completed`, también
para `juntia_writer`.

### 2.6 `signup_allowlist`

| Columna | Tipo | Regla |
| --- | --- | --- |
| `email` | `text` PK | `check (email = lower(email))` |
| `added_at` | `timestamptz not null default now()` | |

Solo la lee `supabase_auth_admin` (política `for select to supabase_auth_admin
using (true)`). Nadie la escribe por la API: se cambia con el SQL del
quickstart. Los correos reales no van en migraciones (research R4).

## 3. Privilegios y políticas

**Grants** (todo lo no listado queda revocado):

| Objeto | `authenticated` | `juntia_writer` | `supabase_auth_admin` |
| --- | --- | --- | --- |
| esquema `juntia_data` | — (sin `usage`) | `usage` | `usage` |
| esquema `juntia_private` | `usage` (la función de entrada llama a la que escribe) | `usage` (`create` solo durante la migración) | `usage` |
| `profiles` | `select` | `select`, `insert`, `update (display_name, theme, first_entry_completed_at, updated_at)` | — |
| `categories` | `select` | `select` | — |
| `transactions` | `select` | `select`, `insert`, `update (amount_minor, category_id, transaction_date, description, status, voided_at, voided_by, version, updated_at)` | — |
| `audit_events` | — | `insert` | — |
| `idempotency_records` | — | `select`, `insert`, `update (status, result, completed_at)` | — |
| `signup_allowlist` | — | — | `select` |
| funciones de entrada (`public`) | `execute` | — | — |
| funciones que escriben (`juntia_private`) | `execute` | dueño | — |
| `current_uid()` | — | `execute` | — |
| hook del registro | — | — | `execute` |

`select ... for update` de las funciones exige `update` y política de `update`
sobre las filas que bloquean (ADR-013 §2.2): `juntia_writer` las tiene en
`transactions`. En `idempotency_records`, el `update` por columnas sirve solo para
completar la fila al final (§2.5) y el trigger impide cualquier otro cambio.

**Políticas** (todas con `(select auth.uid())`, que no está afectada por R1):

| Tabla | Para | Política |
| --- | --- | --- |
| `profiles` | `authenticated` select · `juntia_writer` select, update | `user_id = (select auth.uid())` |
| `profiles` | `juntia_writer` insert | `with check (user_id = (select auth.uid()))` |
| `categories` | `authenticated`, `juntia_writer` select | `using (true)` (catálogo del sistema) |
| `transactions` | `authenticated` select · `juntia_writer` select, update | `owner_user_id = (select auth.uid())` (P0-2 añade la rama de grupo) |
| `transactions` | `juntia_writer` insert | `with check (created_by = (select auth.uid()) and owner_user_id = (select auth.uid()))` |
| `audit_events` | `juntia_writer` insert | `with check (actor_user_id = (select auth.uid()))` |
| `idempotency_records` | `juntia_writer` select, insert | `actor_user_id = (select auth.uid())` |
| `idempotency_records` | `juntia_writer` update | `using (actor_user_id = (select auth.uid()) and status = 'pending') with check (actor_user_id = (select auth.uid()) and status = 'completed')` |
| `signup_allowlist` | `supabase_auth_admin` select | `using (true)` |

Ni `authenticated` ni `juntia_writer` tienen `delete` ni `truncate` en ninguna
tabla. Ninguna política usa `user_metadata` (maestro §7.4).

## 4. Vistas de `public` (`security_invoker = true`)

Importes **siempre como `text`** (ADR-013 §4). `select` solo para
`authenticated`. Contrato completo en [contracts/database.md](contracts/database.md).

| Vista | Filas | Para |
| --- | --- | --- |
| `my_profile` | La propia | AccountButton, Mi perfil, Apariencia, A6 |
| `my_transactions` | Activas propias | Inicio, Actividad, detalle, exportación |
| `my_transaction_months` | Un mes por fila con movimientos activos | Flechas de Actividad |
| `my_recent_categories` | Hasta 5 categorías de gasto por último uso | E1 de Anotar |

## 5. Funciones

Cada operación son dos funciones (ADR-013 §2.3): entrada en `public`
(`security invoker`, `set search_path = ''`, solo reenvía) y la que escribe en
`juntia_private` (`security definer`, de `juntia_writer`, `set search_path = ''`,
nombres cualificados, comentario que justifica el `definer`). **Toda** la
autorización y la validación están en la segunda.

| Operación | Entrada (`public`) | Escribe | Tablas |
| --- | --- | --- | --- |
| Crear o completar el perfil | `ensure_profile()` | `juntia_private.ensure_profile()` | `profiles` |
| Marcar A6 vista | `complete_first_entry()` | ídem | `profiles` |
| Cambiar nombre visible | `update_display_name(p_display_name)` | ídem | `profiles` |
| Cambiar tema | `set_theme(p_theme)` | ídem | `profiles` |
| Crear movimiento | `create_transaction(…)` | ídem | `idempotency_records`, `transactions`, `audit_events` |
| Editar movimiento | `update_transaction(…)` | ídem | ídem |
| Anular (eliminar o deshacer) | `void_transaction(…)` | ídem | ídem |

Orden dentro de cada función de dinero (FR-006; research R8.4): identidad
(`current_uid()` no nulo, `JT001`) → validación de argumentos → idempotencia →
bloqueo de la fila (editar y anular) → comprobación de versión y estado →
escritura → auditoría → completar la fila `pending` de `idempotency_records` con
el resultado (§2.5), en la misma transacción.

Internas en `juntia_private`, sin `execute` para `anon` ni `authenticated`:
`parse_amount_minor(text) returns bigint` (solo dígitos, sin signo, ≤ 19
cifras; `JT002`), `request_fingerprint(jsonb) returns text`.

**Hook** `juntia_private.before_user_created_hook(event jsonb) returns jsonb`,
`security invoker`, `set search_path = ''`: compara
`lower(event->'user'->>'email')` con la lista; devuelve `{}` o `{"error":
{"http_code": 403, "message": …}}`. Se registra en `config.toml` y, en los
proyectos alojados, en el panel de Auth (quickstart).

## 6. Tipos de dominio (`src/domain/`, TypeScript puro)

No importan React, Next, Supabase ni nada de `src/lib/db` (regla de lint de la
001, FR-010).

| Módulo | Tipos y funciones |
| --- | --- |
| `domain/money/` | `Currency = 'COP'`; `Money = { amountMinor: bigint; currency: Currency }`; `moneyFromPesos(pesos: bigint)` (×100 exacto); `parseAmountMinor(text)` y `serializeAmountMinor(money)` (texto ↔ `bigint`, sin `number`); `formatMoney(money)` con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`; `MAX_COP_PESOS = 999_999_999n` |
| `domain/transactions/` | `TransactionType = 'expense' \| 'income'`; `TransactionStatus = 'active' \| 'voided'`; `CategoryId` (las diez claves) y `CATEGORY_CATALOG` con su `kind` y orden; `Transaction`; `validateDraft(draft)` (monto > 0, ≤ máximo, categoría del tipo, fecha válida, descripción ≤ 140); `monthKey(date)` (`AAAA-MM`); `todayInBogota(now)`; `monthSummary(rows, month)` → `{ expenseTotal: Money; byCategory; incomeTotal: Money }`, donde el gasto excluye ingresos (FR-019); `groupByDay(rows)`; `fillRecentCategories(recent)` (research R8.8); `monthBounds(months, current)` para las flechas |
| `domain/golden/` | `october-2026.ts`: `ContextKind = 'me' \| 'us'`, `PersonId = 'sara' \| 'tomas'`, `GoldenCurrency = 'COP'` y `saraPrivateOctober2026`, con las ocho filas de gasto y el ingreso de la tabla «Dataset dorado de P0-1» de la spec, **copiadas, no recalculadas** (§15.10, «Dataset dorado», regla 1). P0-2 y P0-3 lo amplían |

`ContextKind` es el `ContextChoice` de interfaz de la 001 (`"me" | "us"`), no el
`scope` de datos (`docs/GLOSSARY.md` §10).

## 7. Transporte (`src/lib/db/types.ts`)

Tipos de lo que devuelven las vistas y funciones: **todo importe es `string`**
(FR-008). `src/lib/db/` es la única capa que conoce nombres de vistas y
funciones, convierte con `parseAmountMinor` al `Money` del dominio y traduce los
errores (`contracts/errors.md`). Un test de tipos (`expectTypeOf`) afirma que
ningún campo de importe de `database.types.ts` es `number` (ADR-013 §4.3).

## 8. Transiciones de un movimiento

```
            create_transaction
   (nada) ───────────────────────▶ active (version 1)
                                      │  update_transaction(expected = v)
                                      ├──────────────────────────────▶ active (v + 1)
                                      │  void_transaction(expected = v, reason = delete | undo)
                                      └──────────────────────────────▶ voided (v + 1)  ── final
```

Un `voided` no vuelve a `active` ni se edita (FR-018). Cada flecha escribe una
fila de `audit_events` en la misma transacción.
