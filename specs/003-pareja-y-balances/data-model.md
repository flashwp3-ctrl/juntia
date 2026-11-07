# Data Model — 003 · Pareja y balances (P0-2)

Esquema de base de datos y tipos de dominio que P0-2 añade sobre el de la 002
(`specs/002-cuentas-y-gastos-privados/data-model.md`). Aplica ADR-013 (con la nota
de implementación de §5.1, aprobada por los fundadores el 6 de noviembre de 2026; ver [research.md](research.md)
R1), ADR-001, ADR-002 (con su nota de implementación de la decisión 20.8), ADR-003
y ADR-007 (con su enmienda de la decisión 20.11), y el maestro §5 y §7.3.
Identificadores en inglés y `snake_case` en SQL (`docs/CONVENTIONS.md` A.1). Las
migraciones de `supabase/migrations/` son la única fuente; esto es su
especificación, no su código. Lo marcado **decisión del plan** está justificado en
[research.md](research.md).

## 1. Roles

| Rol | Atributos | Novedad en P0-2 |
| --- | --- | --- |
| `juntia_writer` | `nologin nobypassrls`, no es dueño de ninguna tabla | Nuevas funciones y políticas sobre las tablas de pareja |
| `juntia_membership` | `nologin nobypassrls`, no es dueño de ninguna tabla | **Nuevo** (research R1; nota de implementación de ADR-013 §5.1, aprobada el 6 de noviembre de 2026). Solo `select` sobre `groups`, `group_members` y `group_invitations`, con políticas `using (true)` para ese rol. Es dueño de las auxiliares de membresía `security definer`, que devuelven solo un booleano. No escribe nada |
| `authenticated`, `anon`, `supabase_auth_admin` | Los de Supabase | Sin cambios de modelo: `authenticated` lee por vistas y llama a funciones de entrada |

## 2. Tablas nuevas de `juntia_data`

Todas son **tablas controladas** (ADR-013 §2; spec FR-001): RLS activada,
`revoke all` para `anon` y `authenticated` (incluidos `TRUNCATE`, `REFERENCES` y
`TRIGGER`), escritas solo por funciones de `juntia_writer`. Claves UUID.

### 2.1 `groups` — la pareja

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `uuid` pk | `gen_random_uuid()` |
| `kind` | `text not null` | `check (kind = 'couple')`. El dominio se modela para N; P0 solo crea parejas (§15.5) |
| `status` | `text not null` | `check (status in ('provisional','active','discarded'))` (spec FR-010) |
| `owner_user_id` | `uuid not null` → `auth.users` | Inmutable. La propietaria |
| `currency` | `text not null default 'COP'` | `check (currency = 'COP')`, inmutable (ADR-002) |
| `time_zone` | `text not null default 'America/Bogota'` | `check (time_zone = 'America/Bogota')` en P0 |
| `version` | `integer not null default 1` | Sube en cada cambio de estado **y en cada «Generar enlace nuevo»** (revisión del PR #49, F49-3). Es la `expectedVersion` que M4 envía al regenerar y al anular, leída de `my_couple.version` |
| `created_at`, `activated_at`, `discarded_at` | `timestamptz` | `activated_at` no nulo ⇔ estado activa o posterior; `discarded_at` no nulo ⇔ descartada |

**Transiciones.** Solo existen las tres del diagrama. Las protegen la RLS, dos
triggers y las funciones **juntos** (revisión del PR #49, segunda ronda, F49-5);
ninguno de los tres basta solo:

```
create_invitation                 accept_invitation
(nada) ──────────▶ provisional ───────────────────▶ active   (final en P0: ADR-003)
                       │
                       │ cancel_invitation
                       └─────────────────────────▶ discarded (final)
```

1. **Trigger `groups_guard_transition`** (`before update`, para cualquier rol,
   también `juntia_writer`). Ve `OLD` y `NEW` y `current_uid()`, que la RLS no
   puede comparar entre sí (ver §5). Solo admite:
   - **provisional → provisional**, cambiando únicamente `version` (regenerar). Solo
     si quien llama es la propietaria;
   - **provisional → discarded**, solo si quien llama es la propietaria y no hay otro
     integrante activo;
   - **provisional → active**, solo si quien llama **no** es la propietaria, ya tiene
     su membresía activa con `join_order = 2` en esta pareja, la pareja tiene
     **exactamente dos** membresías activas (la propietaria con `join_order = 1` y
     quien llama) y existe una invitación de esta pareja **pendiente, sin vencer y
     dirigida al correo de quien llama**.

   Cualquier otra transición, o cualquier `update` de una fila `active` o
   `discarded`, falla con `JT119` (`invalidCoupleTransition`). El `select … for
   update` de la raíz no dispara triggers de `update`, así que bloquear una pareja
   activa sigue funcionando.

   **Precisión tras el PR A (T010, interpretación del gestor).** Una pareja
   `discarded` no es visible para `juntia_writer` por RLS (`is_group_member` es
   falso y ya no es la provisional propia): un `update` directo sobre ella afecta a
   **0 filas** sin efectos, y las funciones lo convierten en error al comprobar
   `row_count`. `JT119` sobre una descartada queda como **defensa en
   profundidad** para cualquier `update` que llegue al trigger (por ejemplo, como
   dueño de la tabla), y pgTAP lo ejerce así.
2. **Trigger de restricción diferido `groups_check_state`** (`after insert or
   update` en `groups`, `group_members` y `group_invitations`, `deferrable
   initially deferred`). Al final de la transacción comprueba, para cada pareja
   tocada:
   - `provisional`: exactamente una membresía activa, la de la propietaria;
   - `active`: exactamente dos membresías activas, con `join_order` 1 (la
     propietaria) y 2, y **una invitación `accepted` con `accepted_by` igual a la
     integrante de `join_order` 2**, aceptada en esta misma transacción si la pareja
     se activó en ella;
   - `discarded`: ninguna membresía activa y ninguna invitación pendiente.

   Así una activación sin aceptación válida se revierte entera, aunque algo hubiera
   pasado el primer trigger.
3. **Funciones.** La única que activa es `accept_invitation`, que inserta la
   membresía, activa la pareja y marca la invitación como aceptada (con
   `accepted_by` y `accepted_at`) en ese orden y en una sola transacción. Ninguna
   otra función escribe `status = 'active'`.

Una pareja `provisional` o `discarded` no tiene movimientos, partes ni
liquidaciones: lo comprueban las funciones y un `check` por clave foránea
compuesta no es posible, así que lo protege un trigger en `transactions` y
`settlements` que exige `groups.status = 'active'` al insertar (spec FR-004).

### 2.2 `group_members`

| Columna | Tipo | Regla |
| --- | --- | --- |
| `group_id` | `uuid not null` → `groups` | pk compuesta con `user_id` |
| `user_id` | `uuid not null` → `auth.users` | |
| `role` | `text not null` | `check (role in ('owner','member'))` |
| `status` | `text not null` | `check (status in ('active','released'))`. `released` solo al descartar una pareja provisional |
| `join_order` | `smallint not null` | `check (join_order in (1,2))`: 1 la propietaria, 2 el integrante. Da el color (`person.1`, `person.2`) y el desempate del reparto (ADR-002, nota de la 20.8) |
| `joined_at`, `released_at` | `timestamptz` | |

Índices únicos parciales:

- `group_members_one_couple_per_person (user_id) where status = 'active'`: una
  pareja provisional o activa por persona (spec FR-004).
- `group_members_max_two (group_id, join_order) where status = 'active'`: como
  `join_order` solo admite 1 y 2, nunca hay un tercero activo (FR-004, US-10).

Un trigger impide pasar de `released` a `active` y liberar a un integrante de una
pareja `active` (ADR-003).

### 2.3 `group_invitations`

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `group_id` | `uuid not null` → `groups` | |
| `email` | `text not null` | `check (email = lower(btrim(email)))` |
| `token_hash` | `text not null unique` | `check (token_hash ~ '^[0-9a-f]{64}$')`: SHA-256 en hex. **El token nunca se guarda** (FR-012, FR-012a; research R3) |
| `status` | `text not null` | `check (status in ('pending','accepted','cancelled','replaced'))`. «Vencida» no es un estado guardado: es `pending` con `expires_at <= now()`, calculado en el servidor |
| `expires_at` | `timestamptz not null` | `created_at + 7 days` (§15.5) |
| `created_by` | `uuid not null` | La propietaria |
| `inviter_display_name` | `text not null` | Copia del nombre visible de la propietaria al crear o regenerar la invitación. Es lo único de ella que ve quien recibe la invitación antes de aceptar (M6), porque la RLS de `profiles` no le deja leer su perfil. **Decisión del plan** |
| `accepted_by`, `accepted_at` | `uuid`, `timestamptz` | No nulos ⇔ `accepted` |
| `replaced_by` | `uuid` → `group_invitations` | No nulo ⇔ `replaced` (Generar enlace nuevo) |
| `created_at` | `timestamptz` | |

Índice único parcial `group_invitations_one_pending (group_id) where status =
'pending'`: nunca hay dos enlaces válidos a la vez (FR-012).

### 2.4 `transaction_allocations` — las partes

| Columna | Tipo | Regla |
| --- | --- | --- |
| `transaction_id` | `uuid not null` → `transactions` | pk compuesta |
| `user_id` | `uuid not null` → `auth.users` | Integrante activo del grupo del gasto (función y trigger) |
| `amount_minor` | `bigint not null` | `check (amount_minor >= 0 and amount_minor % 100 = 0)`: pesos enteros (nota de ADR-002) |

Una fila por integrante, también con parte 0: así la tabla dice quién participa y
quién no (spec FR-019a). **Trigger de restricción diferido** al final de la
transacción: para cada gasto de grupo activo, las partes suman exactamente
`amount_minor` y al menos una es positiva (FR-004, FR-019). Un gasto privado no
tiene filas.

### 2.5 `settlements` — liquidaciones (tabla propia)

**Decisión del plan** (spec FR-002; research R6): las liquidaciones viven en su
propia tabla, no en `transactions`. No tienen categoría, pagador ni partes, tienen
dirección y su propio ciclo de anulación (enmienda de ADR-007); separarlas evita
que una consulta de gastos las sume por error (FR-029).

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `group_id` | `uuid not null` → `groups` | Pareja `active` (trigger) |
| `from_user_id`, `to_user_id` | `uuid not null` | Integrantes activos y distintos (`check`) |
| `amount_minor` | `bigint not null` | `check (amount_minor > 0 and amount_minor % 100 = 0)` |
| `currency` | `text not null default 'COP'` | Igual a la del grupo |
| `settlement_date` | `date not null` | Hoy o pasada en `America/Bogota` (Q10): la función lo valida |
| `note` | `text` | Opcional, ≤ 140, mismo `check` que `transactions.description` |
| `status` | `text not null default 'active'` | `check (status in ('active','voided'))`. Nunca se edita otro campo (trigger) ni se borra (ADR-007, enmienda) |
| `voided_at`, `voided_by`, `void_reason` | | No nulos ⇔ `voided`; `void_reason in ('void','undo')` |
| `version` | `integer not null default 1` | `expectedVersion` para anular (FR-057) |
| `created_by`, `created_at` | | Autor visible para los dos |

## 3. Cambios en tablas de la 002

### 3.1 `transactions`

- Se **retira** `transactions_private_only_p0_1` (spec FR-005).
- `group_id` gana su clave foránea a `groups`.
- **Nueva** `payer_user_id uuid` → `auth.users`: obligatoria en los gastos de grupo
  (`check (group_id is null or payer_user_id is not null)`), nula en los privados.
  Integrante activo del grupo (función y trigger). Editable (Q12).
- **Nueva** `moved_from_transaction_id uuid` → `transactions`: en el compartido
  que crea Mover a Pareja, apunta al privado anulado; **nunca** se expone a quien
  no es su autora (FR-036, FR-041). `moved_to_transaction_id` en el privado
  anulado, simétrica. Una restauración de «Deshacer» de Mover a Pareja apunta a su
  compartido anulado con `restored_from_transaction_id` (Q15).
- **Nueva** `split_mode text`: `check (split_mode in ('equal','percent','amount'))`
  en gastos de grupo y nula en los privados. Guarda el modo elegido; los
  porcentajes elegidos se guardan en `split_percents smallint[]` solo cuando el
  modo es `percent`. Las partes de `transaction_allocations` son la verdad del
  dinero; el modo y los porcentajes solo sirven para volver a abrir la edición
  como estaba (FR-022).
- `transactions_income_private` y `transactions_private_owner_is_author` se
  quedan. Nueva `transactions_group_no_owner`: `group_id is null or owner_user_id
  is null`.
- El trigger `transactions_guard_update` añade `payer_user_id`, `split_mode` y
  `split_percents` a lo editable y sigue rechazando el cambio de `group_id`,
  `owner_user_id` y `type` (no hay «mover a Yo», ADR-001 punto 8).

### 3.2 `audit_events`

`entity_type in ('transaction','settlement','group','invitation')` y `action in
('create','update','void','move','restore','accept','cancel','regenerate')`.
`reason` amplía a `('delete','undo','void')`. Sigue siendo de solo inserción. Las
filas de una pareja las lee **solo** quien las escribió, salvo «Anotado por» y
«Editado por» de los gastos compartidos, que salen de columnas de `transactions`
(`created_by`, `updated_by`, `updated_at`), no de la auditoría (spec
Assumptions; Q12).

`transactions` gana `updated_by uuid` para «Editado por X · fecha».

### 3.3 `idempotency_records`

`action` amplía su `check` con: `create_shared_expense`, `update_shared_expense`,
`void_shared_expense`, `reclassify_to_shared`, `undo_reclassify_to_shared`,
`register_settlement`, `void_settlement`, `create_invitation`,
`regenerate_invitation`, `cancel_invitation` y `accept_invitation`. El protocolo
`pending → completed` de la 002 no cambia.

### 3.4 `profiles`

La lectura de `authenticated` pasa de «la propia» a «la propia **o** la del otro
integrante de mi pareja activa» (`juntia_private.shares_couple_with(user_id)`).
Del otro integrante **solo** se obtienen `display_name`, `role` y `join_order`, y
**solo** por la vista `couple_members`; nunca el correo, el tema ni
`first_entry_completed` (CoupleStatus; spec «Visibilidad del otro»).

**En el mismo commit** que amplía `profiles_read`, `my_profile` pasa a filtrar
`where user_id = (select auth.uid())` explícitamente (revisión del PR #49, F49-1).
Hoy la filtra solo la RLS: con la política ampliada devolvería también el perfil de
la pareja, con su tema y su primera entrada.

### 3.5 Inventario de compatibilidad con la 002 (revisión del PR #49, F49-1 y F49-2)

La rama de grupo de la RLS cambia lo que «ve» cualquier consulta que confíe solo
en ella. Este es el inventario **completo** de lo que la 002 tiene en `main`
(`d2e1c64`) y lo que el PR A le hace, en el mismo commit que amplía cada política.

**Vistas que hoy filtran solo por la RLS** (las cuatro de la 002):

| Vista | Riesgo con la RLS ampliada | Cambio en el PR A |
| --- | --- | --- |
| `my_profile` | Devolvería el perfil de la pareja (tema, primera entrada) | `where user_id = (select auth.uid())` |
| `my_transactions` | Devolvería los gastos compartidos como si fueran privados (R2, demostrado en el preflight) | `where owner_user_id = (select auth.uid()) and group_id is null` |
| `my_transaction_months` | Contaría meses con solo compartidos | Ídem |
| `my_recent_categories` | Mezclaría las categorías de lo compartido en E1 de Yo | Ídem |

**Funciones de la 002 que escriben** (las seis, más `ensure_profile`):

| Función | Riesgo | Cambio en el PR A |
| --- | --- | --- |
| `update_transaction` | Busca solo por `id` (`money_functions.sql`, l. 90): con la rama de grupo podría editar un gasto compartido sin partes ni bloqueo del grupo | La búsqueda exige `group_id is null and owner_user_id = juntia_private.current_uid()`; si no, `JT010`. Comprueba `row_count` = 1 en el `update` del movimiento y en el de `idempotency_records` |
| `void_transaction` | Ídem (l. 127): podría anular un compartido saltándose `void_shared_expense` | Ídem |
| `create_transaction` | Sin riesgo de grupo (inserta privado propio) | `row_count` = 1 al completar `idempotency_records` |
| `complete_first_entry`, `update_display_name`, `set_theme` | Ya filtran `where user_id = uid`; la política de escritura de `profiles` no cambia | `row_count` = 1 en su `update` (no-op silencioso, R1) |
| `ensure_profile` | `insert … on conflict do nothing` y `select … into` | Falla si el `select` final no encuentra el perfil, en vez de devolver `null` |

Pruebas (pgTAP e integración): con Sara y Tomás emparejados, `my_profile` de cada
uno devuelve solo su perfil y `couple_members` solo los tres campos del otro;
`update_transaction` y `void_transaction` contra un gasto compartido —por la
función de entrada y por SQL directo, con la cuenta de cada integrante— fallan con
`JT010` y el gasto, sus partes, su versión y la auditoría quedan iguales; y cada
una de las siete funciones, con una política rota a propósito, falla en vez de
devolver éxito.

## 4. Auxiliares de membresía (`juntia_private`, dueño `juntia_membership`)

`language sql stable security definer set search_path = ''`, devuelven solo un
booleano, `execute` solo para `authenticated` y `juntia_writer` (ADR-013 §5.1).
No tienen recursión porque leen con la política `using (true)` de
`juntia_membership`, no con la de quien llama (research R1).

| Función | Verdadera cuando |
| --- | --- |
| `is_group_member(group_id)` | Quien llama es integrante `active` del grupo, en cualquier estado del grupo salvo `discarded` |
| `is_couple_member(group_id)` | Ídem y el grupo está `active` |
| `is_invited_to(group_id)` | Hay una invitación `pending` del grupo para el correo verificado de quien llama |
| `shares_couple_with(user_id)` | Quien llama y `user_id` son integrantes activos de la misma pareja `active` |

`current_email()` (`security invoker`, de `postgres`) lee el correo de los claims
del JWT; una sesión de Juntia implica un correo verificado, porque Auth no deja
entrar sin verificar (`enable_confirmations = true`, 002).

## 5. Políticas

| Tabla | `authenticated` (select) | `juntia_writer` |
| --- | --- | --- |
| `groups` | `is_group_member(id)` | select: `is_group_member(id) or is_invited_to(id) or (owner_user_id = current_uid() and status = 'provisional')` (la última rama, precisada en el PR A, deja que la primera creación inserte la membresía de la propietaria; las descartadas siguen invisibles); insert: `owner_user_id = current_uid() and status = 'provisional'`; update: la política única `groups_writer_update` de la tabla siguiente, con los triggers de §2.1 |
| `group_members` | `is_group_member(group_id)` | select: propia o `is_group_member`; insert: la fila propia **y** o bien `role = 'owner' and join_order = 1` en una pareja provisional cuya propietaria es quien llama, o bien `role = 'member' and join_order = 2 and is_invited_to(group_id)`; update: solo la fila propia |
| `group_invitations` | `is_group_member(group_id)` (la propietaria ve la suya; **nunca** el hash fuera de las funciones: la vista no lo expone) | select y update: `is_group_member(group_id) or email = current_email()`; insert: `created_by = current_uid() and is_group_member(group_id)` |
| `transactions` | `owner_user_id = auth.uid() or (group_id is not null and is_couple_member(group_id))` | Ídem para select; insert y update por rama: privada propia o de grupo con `is_couple_member` |
| `transaction_allocations` | Existe el movimiento visible (subconsulta sobre `transactions`, que aplica su RLS) | Ídem; insert y delete solo por las funciones de gasto compartido |
| `settlements` | `is_couple_member(group_id)` | select, insert y update de estado: `is_couple_member(group_id)` |

**`update` de `groups` para `juntia_writer`: una sola política, que decide
quién y no qué transición** (revisión del PR #49, F49-5, segunda ronda).

| Política | `USING` (fila antes) | `WITH CHECK` (fila después) |
| --- | --- | --- |
| `groups_writer_update` | `owner_user_id = current_uid() or is_group_member(id) or is_invited_to(id)` | La misma expresión |

**Por qué una sola, y no tres ni `RESTRICTIVE`.** PostgreSQL combina con `OR` las
políticas permisivas de un mismo comando, por separado en `USING` y en `WITH
CHECK`. Con tres políticas por transición, el `USING` de una y el `WITH CHECK` de
otra se cruzaban: la propietaria podía pasar su provisional a `active` sin que nadie
aceptara. Hacerlas `RESTRICTIVE` no lo arregla: siguen sin poder comparar la fila de
antes con la de después, que es lo que define una transición. **Solo un trigger ve
`OLD` y `NEW` a la vez.** La opción más simple es, por tanto, que la RLS diga
**quién** puede tocar la fila (una política que no se cruza con nada) y que el
trigger `groups_guard_transition` y el trigger diferido `groups_check_state` de §2.1
digan **qué transición** y con qué membresías e invitación. El `select … for update`
de las operaciones de dinero también pasa por este `USING`.

**La barrera es la suma de la RLS, los dos triggers y las funciones**, no la RLS
sola: la RLS limita quién, el primer trigger valida cada transición con quien
llama, el segundo comprueba el estado final al confirmar y las funciones son el
único camino que activa. Pruebas (pgTAP) **como `juntia_writer` con `update`
directo** (`set local role juntia_writer` y los claims de quien llama), que deben
fallar **sin efectos** (estado, versión, membresías e invitaciones iguales):

1. la propietaria pasa a `active` su pareja provisional con un solo integrante;
2. cualquiera de los dos integrantes pasa una pareja `active` a `discarded` o a
   `provisional`;
3. la propietaria pasa una pareja `discarded` a `provisional` o a `active`.

Y, además, por las funciones con la política y los triggers definitivos (no los
simplificados del spike, `with check (true)`, research R1): la propietaria
descarta su provisional; quien no está invitado no puede activar; la aceptación
válida activa.

El spike R1 demostró que esta combinación no tiene recursión y que una tercera
cuenta no ve nada.

## 6. Vistas de `public` (`security_invoker = true`)

Importes siempre como `text` (ADR-013 §4). Contrato en
[contracts/database.md](contracts/database.md).

**Cambio obligatorio en las vistas de la 002 (research R2; §3.5):** `my_profile`
filtra ahora `user_id = auth.uid()`, y `my_transactions`,
`my_transaction_months` y `my_recent_categories` filtran **explícitamente**
`owner_user_id = auth.uid() and group_id is null`. Hoy dependen solo de la RLS, y
el spike demostró que con la rama de grupo de la RLS empezarían a devolver los
gastos compartidos. Es la lección F44-1 aplicada a las vistas.

| Vista nueva | Filas | Para |
| --- | --- | --- |
| `my_couple` | 0 o 1: la pareja provisional o activa de quien llama, con su estado, rol, `join_order` y, para la propietaria de una provisional, el correo invitado y la caducidad de la invitación pendiente | Mi pareja M1–M4, decidir si hay Nosotros |
| `couple_members` | Los integrantes activos de mi pareja: `user_id`, `display_name`, `role`, `join_order` | Avatares, «Pagó X», CoupleStatus |
| `couple_expenses` | Gastos activos de mi pareja activa con `payer_user_id`, `split_mode`, `created_by`, `updated_by`, `updated_at`, `version` y las partes agregadas como `jsonb` (`{user_id: amount_text}`) | Actividad y detalle en Nosotros, desglose del Balance |
| `couple_settlements` | Liquidaciones de mi pareja, activas y anuladas, con su estado | Actividad en Nosotros, historial del Balance |
| `my_shared_parts` | Gastos activos de mi pareja con mi parte (`my_part_minor` como texto) | Filas «Compartido · tu parte» en Yo |
| `couple_transaction_months` | Meses con gastos o liquidaciones activos de mi pareja | Flechas de Actividad en Nosotros |

Ninguna vista de pareja tiene una columna de un movimiento privado ni
`moved_from_transaction_id` (FR-036). `my_transactions` expone a la autora el
destino de un privado movido para el detalle de su historial («movido a Pareja»).

## 7. Lecturas agregadas: vistas de una sola sentencia

**Decisión del plan** (FR-043; research R4): los totales y el Balance son **vistas
`security_invoker` de una sola sentencia**, que PostgreSQL ejecuta con una única
instantánea. Nunca se suman páginas ni se calcula nada en dos lecturas.

- Una función `language sql` normal **no sirve** para leer como `authenticated`:
  su cuerpo se resuelve al ejecutarse y `authenticated` no tiene `usage` sobre
  `juntia_data` (ADR-013 §2.1). El spike lo confirmó con `permission denied for
  schema juntia_data` (research R4).
- Si una lectura necesita parámetros que una vista no admite, la alternativa
  verificada es una función con **cuerpo SQL estándar** (`begin atomic … end`), que
  se resuelve al crearla, como `current_uid()` en la 002. Ninguna lectura de P0-2
  lo necesita: los meses se filtran sobre la vista.
- Una función PL/pgSQL que hace varias lecturas debe ser `stable`: así todas usan
  la instantánea de la llamada. Con `volatile` cada sentencia ve una instantánea
  nueva (research R4). Las funciones que escriben son `volatile` a propósito: tras
  esperar el bloqueo del grupo tienen que ver lo que escribió la otra operación.

| Vista | Devuelve | Para |
| --- | --- | --- |
| `couple_month_summary` | Una fila por mes: gasto del mes, desglose por categoría y número de gastos, todo como texto | Inicio y Actividad en Nosotros |
| `me_month_summary` | Una fila por mes: privados, parte compartida y `gasto_consumo` de Yo | Inicio y Actividad en Yo. Sustituye la suma en el servidor de la aplicación de la 002, para que el total de Yo sea consistente |
| `couple_balance` | Una fila por integrante: pagado, le corresponde, enviadas, recibidas y `net_owed`, como texto | Balance, módulo de Inicio y hoja de liquidación |

`computeBalance` del dominio (FR-025) es la referencia: las pruebas de integración
comparan `couple_balance` con `computeBalance` sobre los mismos datos, y el
dataset dorado fija los dos (el spike ya dio Sara +42990000 / Tomás −42990000 en
`beforeSettlement` y +22990000 / −22990000 en `afterSettlement`).

## 8. Tipos de dominio (`src/domain/`)

| Módulo | Tipos y funciones nuevas |
| --- | --- |
| `domain/allocations/` | `SplitMode = 'equal' \| 'percent' \| 'amount'`; `splitAmount(amount: Money, mode, participants: OrderedMember[], values)` → `Allocation[]` en pesos enteros con el mayor residuo y desempate por `joinOrder` (ADR-002, nota de la 20.8); `validateSplit` («Faltan $X», «Sobran $X»); `nextSplitOnParticipantsChange(prev, participants)` con la regla de FR-019a (restaurar solo si las dos partes eran positivas; si no, 50/50). Algoritmo **versión 1** |
| `domain/balances/` | `computeBalance(expenses, settlements, members)` → por integrante `paid`, `share`, `settledOut`, `settledIn`, `net`; `settlementSuggestion(balance)` deudor → acreedor; invariante «la suma de `net` es 0» |
| `domain/couple/` | `CoupleStatus = 'none' \| 'provisional' \| 'active'`; `InvitationView` (`pending`, `expired`, …) y `isExpired(invitation, now)` |
| `domain/transactions/` | `meMonthSummary` añade la parte compartida; `groupByDay` acepta filas de liquidación |
| `domain/golden/` | `october-2026.ts` añade `sharedOctober2026` (las seis filas de la spec, copiadas), `settlementOctober25` y los estados `beforeSettlement` y `afterSettlement` (spec F47-9) |

## 9. Transiciones de un gasto compartido y de una liquidación

```
              create_shared_expense / reclassify_to_shared
   (nada) ──────────────────────────────────────────▶ active (v1)
                                                         │ update_shared_expense(expected = v)
                                                         ├────────────────────────────────▶ active (v+1)
                                                         │ void_shared_expense(expected = v, reason = delete | undo)
                                                         │ undo_reclassify_to_shared(expected = v)  ── crea un privado nuevo
                                                         └────────────────────────────────▶ voided (final)

              register_settlement                       void_settlement(expected = v, reason = void | undo)
   (nada) ──────────────────────▶ active (v1) ─────────────────────────────────────────────▶ voided (final)
```

Cada flecha escribe su fila de `audit_events` en la misma transacción y bloquea
la raíz del grupo antes de leer el saldo (FR-006).
