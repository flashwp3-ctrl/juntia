# Contrato del borrado manual de cuenta — 005

Aplica Q8 (opción a) y FR-067: en MVP-1, la eliminación de cuenta es un **procedimiento
manual documentado y ensayado en `juntia-dev`**, que ejecuta el gestor con el «sí» de la
persona y cuyo resultado es verificable; la interfaz sigue diciendo «no disponible» y
explica cómo pedirlo; la revisión legal se exige antes de abrir la app a terceros.

> **D2, decidido** (fundadores, 18 nov 2026): opción **(a)** ([../plan.md](../plan.md),
> «Para los fundadores»).
>
> - **Sin pareja activa:** se borra todo lo de la persona.
> - **Con pareja activa:** se borra la pareja completa, con el «sí» escrito de las dos y
>   la exportación previa de cada una.
>
> **Consecuencia que se decide con ella:** el script suspende los triggers de solo
> inserción dentro de una transacción como dueño (§4). Se registra como **nota a ADR-007
> y ADR-013 en el PR documental T085** (fila 19 de la lista de T085 del plan), no como ADR
> nuevo. La excepción a «los aportes no se borran» de ADR-010 va en la misma
> reconciliación (fila 22).
>
> **Nada se ejecuta contra producción** por este plan: solo el ensayo en `juntia-dev`.

Revisión del PR #85 (ChatGPT, en `1a529d8`): este contrato recoge F85-1 (ciclo de claves
foráneas), F85-2 (Auth no es atómico con los datos), F85-3 (consentimientos y
exportaciones verificables) y F85-8 (ADR-010).

## 1. Hechos del esquema que lo condicionan

Comprobados en las migraciones de `main` (`94675ca`):

- **Tablas de `juntia_data`:** `profiles`, `categories`, `transactions`,
  `transaction_allocations`, `settlements`, `groups`, `group_members`,
  `group_invitations`, `budgets`, `budget_versions`, `savings_goals`,
  `goal_ledger_entries`, `goal_usage_allocations`, `goal_usage_confirmations`,
  `idempotency_records`, `audit_events` y `signup_allowlist`.
- **Ninguna clave foránea hacia `auth.users` tiene `on delete`.** El usuario de Auth solo
  se puede borrar cuando no queda ninguna fila que lo nombre.
- **Triggers que rechazan `update` o `delete`:**
  - `audit_events_append_only`, `budget_versions_append_only`,
    `goal_ledger_append_only`, `goal_allocations_append_only` y `settlements_guard`;
  - y sus gemelos `*_no_truncate`, que no se tocan porque el script no usa `truncate`.

  Las demás tablas rechazan la escritura directa por privilegios (ADR-013), no por
  trigger; el script corre como dueño de las tablas.
- **Claves foráneas que se referencian entre sí** (F85-1):

  | Vínculo | Tipo | Diferible | Cómo se resuelve |
  | --- | --- | --- | --- |
  | `goal_ledger_entries.confirmation_id` → `goal_usage_confirmations` (`goals_tables.sql`, línea 50), y `goal_usage_confirmations.usage_entry_id` → `goal_ledger_entries` (línea 45) | **Ciclo entre dos tablas.** Lo cierra una solicitud aprobada (`goal_funding.sql`, ~246–251) | No | **Se rompe poniendo a `NULL` `goal_ledger_entries.confirmation_id`**, con `goal_ledger_append_only` suspendido, antes de borrar las dos filas. No vale el otro lado: `usage_entry_id` no se puede anular en una solicitud aprobada por el `check ((status='approved') = (usage_entry_id is not null))`. `confirmation_id` sí admite `NULL` (`check (confirmation_id is null or kind='usage')`) |
  | `goal_ledger_entries.voids_entry_id` → `goal_ledger_entries` | Autorreferencia | No | Se borran primero los asientos `void` (`kind = 'void'`) y después el resto, en dos sentencias |
  | `goal_usage_allocations (entry_id, entry_kind)` → `goal_ledger_entries (id, kind)` | Hija | No | Se borra antes que el ledger |
  | `transactions.moved_from_transaction_id`, `moved_to_transaction_id`, `restored_from_transaction_id` → `transactions` | Autorreferencias | **Sí** (`initially deferred`) | Se comprueban en el `commit`; el cierre de §3 garantiza que no queda ninguna fila fuera del alcance apuntando a una borrada |
  | `group_invitations.replaced_by` → `group_invitations` | Autorreferencia | **Sí** | Igual |

  Suspender un trigger **no** suspende una clave foránea: por eso el ciclo se rompe con
  datos, no con `disable trigger`.
- **Triggers de restricción diferidos que se disparan con `delete`:**
  `allocations_check_sum` (en `transaction_allocations`). Se comprueba en la prueba
  (§6). Si rechaza un borrado completo en el que el gasto también desaparece, se añade
  por nombre a la lista de triggers suspendidos y a la nota de T085, en el mismo PR A.

## 2. Alcance (D2, opción a)

| Caso | Qué se borra | Consentimiento |
| --- | --- | --- |
| La persona **no tiene pareja activa** | Todo lo que la nombra en las tablas de §1, su fila de `signup_allowlist` y su usuario de Auth | La aprobación de la persona, en el manifiesto (§3) |
| La persona **tiene pareja activa** | **La pareja completa:** las dos personas, el grupo y todo lo de las dos | Las aprobaciones **independientes** de las dos y sus dos exportaciones, en el manifiesto (§3) |

Lo que **no** hace: seudonimizar, borrar a una persona y dejar a la otra con datos
compartidos, ni tocar las copias cifradas ya hechas (su retención es la del fundador que
las guarda; la checklist lo dice).

## 3. Manifiesto previo (F85-3)

Un archivo `deletion-<id>.json` **fuera del repositorio**, en el equipo del gestor, que
el script lee y valida antes de tocar nada. Sin él, o con un campo que falta, **el
script se detiene sin escribir**.

| Campo | Contenido | Qué comprueba el script |
| --- | --- | --- |
| `request_id` | UUID aleatorio de esta petición | Formato |
| `target` | `juntia-dev` o `production` | Coincide con el destino del guardia o del proyecto enlazado |
| `users` | Los UUID de las personas en el alcance: una o dos | Existen en `auth.users` y en `profiles` |
| `group_id` | El grupo, o `null` | Con dos UUID, que son **exactamente** los dos `group_members` activos de ese grupo. Con uno, que no tiene pareja activa; si la tiene, se detiene y dice que el caso es el de la pareja |
| `approvals[]` | Por persona: su UUID, fecha y hora, canal (por ejemplo, mensaje escrito al gestor) y la huella SHA-256 del texto literal de su aprobación | Una por cada UUID de `users`, de personas distintas, cada una con su propia fecha. El texto no entra al manifiesto: lo guarda la persona |
| `exports[]` | Por persona: su UUID, la fecha de la exportación y la huella SHA-256 y el tamaño del archivo JSON que descargó (los calcula ella) | Una por cada UUID de `users`. Si hay pareja, las dos |
| `backup` | En producción: el nombre de la copia del día y la huella de su manifiesto | Que existe y es del mismo día. En `juntia-dev`: `null` |

Además, el script calcula el **cierre** del alcance: todas las filas que nombran a las
personas o a su grupo, y las que esas filas referencian o las referencian a ellas. Si una
fila **fuera** del alcance apunta a una de dentro (por ejemplo, un movimiento de otra
persona movido desde uno de esta), se detiene y la nombra por tabla e id, sin datos.

**En la evidencia:** solo el `request_id`, los ocho primeros caracteres de la SHA-256 de
cada UUID, las fechas de las aprobaciones y exportaciones, y los recuentos por tabla.
Nunca correos, nombres, importes ni los textos de las aprobaciones.

## 4. Procedimiento en fases (F85-2)

`scripts/account-deletion/` (PR A):

- `delete-account.sql`, el borrado de datos;
- `run.mjs`, que orquesta las fases, guarda el estado y hace la recuperación. Es un
  programa de Node y no un `bash`, para que la prueba pueda inyectarle un cliente de Auth
  que falle.

**Por qué en fases:** el borrado de los datos y el del usuario de Auth **no pueden ser
atómicos**. Los datos se borran en una transacción de PostgreSQL y Auth con su API de
administración, y las claves foráneas obligan a borrar los datos antes. El
procedimiento no promete atomicidad entre los dos: promete **un estado verificable y una
recuperación idempotente**.

**Estado de la operación:** `deletion-<id>.state.json`, junto al manifiesto, fuera del
repositorio. Lo escribe `run.mjs` de forma atómica (temporal y renombrado) al terminar
cada fase:

`planned → locked → data_deleted → auth_deleted → verified`

| Fase | Qué hace | Si falla |
| --- | --- | --- |
| **0 · `locked`** | Valida el manifiesto (§3). Bloquea en Auth a cada persona del alcance (`ban_duration` con la API de administración) y cierra sus sesiones, para que nadie pueda entrar y crear un perfil nuevo entre fases. Espera la vida de los tokens de acceso vigentes (el valor del panel de Auth, que el manifiesto copia) | Se puede deshacer: `run.mjs --abort <id>` levanta el bloqueo. No se ha borrado nada |
| **1 · `data_deleted`** | **Una transacción** (`psql -1`, `ON_ERROR_STOP`), como dueño: <br>1. Recuento previo por tabla. <br>2. Suspende por nombre los triggers de §1. <br>3. `update goal_ledger_entries set confirmation_id = null` en las metas del alcance. <br>4. Borra en orden de dependencias: `goal_usage_confirmations`; `goal_usage_allocations`; ledger (`void` primero, después el resto); metas; versiones y presupuestos; asignaciones y movimientos; liquidaciones; invitaciones, miembros y grupo; idempotencia; auditoría; categorías propias; perfiles; filas de `signup_allowlist`. <br>5. Reactiva los triggers con `enable trigger`. <br>6. `set constraints all immediate`. <br>7. Comprueba que no queda ninguna fila que nombre a los UUID. <br>8. `check-invariants.sql` sobre lo que queda | **Dentro de esta fase, cualquier fallo revierte la transacción entera**, incluidos el `update`, los `delete` y la suspensión de triggers: los datos y los triggers quedan como estaban y el estado sigue en `locked`. Se diagnostica y se repite la fase |
| **2 · `auth_deleted`** | Por cada UUID, en orden: si la API dice que el usuario existe, lo borra; si dice que no existe, lo da por borrado. Escribe el estado **después de cada usuario** (`auth_deleted: [uuid…]`) | El estado queda en `data_deleted`, con los usuarios que ya se borraron. Se repite la fase con `run.mjs --resume <id>`: es idempotente, porque un usuario que ya no existe cuenta como hecho. Mientras tanto, los usuarios que quedan siguen bloqueados (fase 0) y sin datos |
| **3 · `verified`** | Para cada UUID: la API de administración no lo encuentra; ninguna tabla de `juntia_data` lo nombra; no está en `signup_allowlist`. Y, si había pareja, el grupo tampoco existe | Si algo no cuadra, el estado no pasa a `verified` y el borrado **no se da por completado**. Se repite la fase que falte |

`run.mjs --resume <id>` lee el estado y sigue desde la primera fase no terminada. Las
fases 1 y 2 detectan su propio trabajo hecho (recuentos a cero, usuarios ausentes) y no
repiten nada.

## 5. Quién y dónde

- **En el ensayo:** el gestor, en `juntia-dev`, con el guardia de destino y un solo
  agente, y la clave de administración de `juntia-dev`.
- **En producción, si algún día se pide:**
  - el gestor ejecuta las fases 0, 1 y 3 con el procedimiento de migraciones (proyecto
    enlazado y el «sí» de un fundador antes de cada fase que escribe);
  - la fase 2 la hace la dueña desde el panel de Supabase, y el gestor registra el
    estado a mano en el mismo archivo;
  - ningún agente ve la contraseña de producción.

## 6. Pruebas

`tests/integration/account-deletion.test.ts` (PR A, job `db`, +5–12 s). Las pruebas
inyectan en `run.mjs` un cliente de Auth del runner que se puede hacer fallar.

1. **Ciclo real (F85-1):** se siembra una pareja con el dataset dorado de P0-1 a P0-3,
   que incluye un gasto con meta cuya solicitud fue aprobada. Así, `confirmation_id` y
   `usage_entry_id` se apuntan de verdad entre sí, y también hay un `void` de aporte y un
   gasto movido a la pareja. Además, una tercera persona sin pareja. Se borra la pareja:
   - no queda nada de las dos;
   - la tercera queda intacta, recuento a recuento;
   - los triggers suspendidos están activos (un `delete` directo sobre `audit_events`
     vuelve a fallar);
   - las invariantes pasan.
2. **Persona sola:** se borra la tercera; la pareja, resembrada, queda intacta.
3. **Fallo dentro de la fase 1:** un error provocado después de los `delete` (por
   ejemplo, una comprobación que falla a propósito). Todo vuelve a estar como antes:
   recuentos iguales, `confirmation_id` sin cambios, triggers activos y estado en
   `locked`.
4. **Fallo de Auth en el primer usuario (F85-2):**
   - el estado queda en `data_deleted` sin usuarios borrados;
   - las dos cuentas siguen bloqueadas y sin datos;
   - `--resume` termina en `verified`, sin datos ni cuentas.
5. **Fallo de Auth en el segundo usuario:**
   - el estado queda en `data_deleted` con el primero borrado;
   - `--resume` borra solo el segundo y termina en `verified`.
6. **Manifiesto incompleto (F85-3):** falta la segunda aprobación, falta la segunda
   exportación, las dos aprobaciones son de la misma persona, los UUID no son los
   miembros del grupo, o una sola persona tiene pareja activa. En cada caso, el script
   se detiene antes de la fase 0 y no escribe nada.
7. **Cierre:** una fila fuera del alcance que apunta a una de dentro detiene el script
   antes de la fase 0.

Si `db` se acerca a 600 s, la prueba pasa al tramo `lab-interaction` del job `release`
([ci.md](ci.md)).

## 7. Ensayo en `juntia-dev` (V15)

El gestor siembra con `db:dev:reset` una pareja (con una solicitud aprobada) y una
persona sola, escribe los dos manifiestos con aprobaciones y exportaciones de prueba, y
ejecuta los dos casos hasta `verified`. **Evidencia:**

- el `request_id` y las huellas cortas de los UUID;
- los recuentos por tabla antes y después;
- la secuencia de estados;
- la salida de `check-invariants.sql`.

## 8. Lo que dice la interfaz

Mi cuenta → Privacidad dice hoy «La solicitud de eliminación todavía no está disponible en
la app. Nada se borra sin que lo confirmes.» (`src/lib/copy/es.ts`, `deleteDescription`).
**No explica cómo pedirla**, que FR-067 exige. El PR B añade una frase que lo explique
(a quién se pide y que la ejecuta el gestor tras confirmar), con su prueba de componentes;
el texto exacto lo aprueban los fundadores en la revisión del PR B. La checklist comprueba
el texto en producción.
