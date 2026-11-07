# Contrato de Server Actions y estado del cliente — 004

Amplía `specs/003-pareja-y-balances/contracts/server-actions.md`, que sigue vigente
entero: resultado de escritura, clave de idempotencia, contexto, cursor y «Comprobar
estado». Aquí solo lo que P0-3 añade o vuelve obligatorio en todas sus escrituras.

## 1. Resultado de una escritura (FR-093)

Cada Server Action de P0-3 devuelve `ok`, `rejected` (con el error de dominio de
[errors.md](errors.md)) o `unknown`. Igual que en la 003:

- La clave nace en el navegador (`crypto.randomUUID()`) **al abrir cada hoja o
  diálogo** y se reutiliza en cada reintento de esa apertura.
- **15 s.** Una escritura o un «Comprobar estado» que no responde en 15 s pasa a
  `unknown` con la misma clave y la misma carga; una respuesta tardía se ignora.
- En `unknown` los campos se bloquean, solo se ofrece «Reintentar» (misma clave,
  misma carga) y «Comprobar estado», que llama a `write_status(acción, clave)`; cerrar
  pregunta «¿Cerrar sin confirmar?». Nunca se dice «no se guardó».
- Con `rejected` los campos siguen editables y se puede decir qué no se guardó.

| Acción | Hoja o diálogo | Acción de `write_status` |
| --- | --- | --- |
| Crear, editar o desactivar presupuesto | Hoja de presupuesto (Plan) | `create_budget`, `update_budget` |
| Crear, editar, lograr o archivar meta | Hoja de meta; confirmación de archivar | `create_goal`, `update_goal`, `complete_goal`, `archive_goal` |
| Registrar aporte | Registrar aporte (04·3) | `contribute_to_goal` |
| Retirar | Hoja de retiro | `withdraw_from_goal` |
| Anular o deshacer un aporte o retiro | Historial; toast | `void_goal_entry` |
| Gasto con meta | Anotar con «Con una meta» (B1–B3) | `create_expense_with_goal` |
| Aprobar, rechazar, cancelar solicitud | B4, B5 | `approve_usage_request`, `reject_usage_request`, `cancel_usage_request` |
| Quitar el uso de la meta | Confirmación desde el detalle del gasto | `remove_goal_usage` |

## 2. Nada en el almacenamiento del navegador (FR-094)

Ninguna intención de escritura (clave, carga, importes, meta elegida, solicitud) se
guarda en `localStorage`, `sessionStorage`, IndexedDB ni cookies. Vive **solo en
memoria** mientras la hoja está abierta o tiene un `unknown` pendiente. Tras recargar,
la pantalla muestra el estado del servidor: si la escritura se confirmó, se ve; si no,
la persona vuelve a empezar. Es la decisión de los fundadores del 7 de noviembre de
2026 (lecciones F55-5 y F55-6 y lote de usabilidad de la 002).

## 3. Un solo «Deshacer» pendiente (FR-095)

Se reutiliza la máquina del PR C y D de la 003 sin cambiar sus reglas (F57-8, F57-9):

- Un único deshacer en curso o sin resolver en toda la app. Mientras exista, los
  «Deshacer» de avisos nuevos se bloquean, también desde el teclado.
- Su resultado se aplica por la identidad de la intención, no por la generación del
  aviso; un aviso posterior nunca pisa la recuperación de uno anterior.
- P0-3 añade tres orígenes: aporte, retiro y gasto con meta. Sus ventanas de servidor
  son las de research R8 (60 s).

## 4. Contexto y privacidad de lectura (FR-085 a FR-087)

- La cookie `juntia_context` y la comprobación de pareja activa de la 003 deciden la
  rama del servidor.
- **En Nosotros** el servidor lee `goals_overview` y `goals_totals` con
  `goal_scope = 'shared'`, `goal_activity`, `budget_months` y `metric_months` con
  `context = 'us'`, y `expense_goal_funding` de gastos compartidos. **Nunca** filtra filas personales después de leerlas: no las
  pide. El selector de metas de B1 en Nosotros lee solo metas con `goal_scope = 'shared'`, sin
  ninguna consulta a metas personales, ni para pintarlas deshabilitadas (F63-3).
- **En Yo** lee las vistas de contexto con `context = 'me'` y `goals_overview` entera en
  **una consulta**, que la interfaz separa por `goal_scope`: «Tus metas» (`personal`) y,
  aparte, «Metas compartidas» con «Tus aportes» = `my_available_minor` (decisión 22.11).
  El total de «Tus metas» sale de `goals_totals` con `goal_scope = 'personal'` y nunca
  incluye una compartida. El selector de B1 en Yo ofrece solo `goal_scope = 'personal'`.
- **Pruebas de F64-3**, en integración y componentes: en Yo aparecen **todas** las metas
  personales de quien mira y **todas** las compartidas de su pareja activa, cada una una
  sola vez (completitud); ningún importe de una compartida entra en el total de las
  personales, ni al revés, y ninguna meta sale dos veces (no duplicar).
- Los `<Link>` de Metas, Plan, Análisis y la meta inmersiva siguen la regla de
  prefetch de la 003 (§4): sin prefetch dependiente de contexto, o invalidado al
  cambiar la cookie. Las specs 4 y 5 comprueban HTML, RSC y prefetch.
- Las cachés del cliente (aviso, resaltado, metas recientes) son **por contexto**.

## 5. Lecturas (FR-096)

- Listas por cursor (`readByCursor`): `goal_entries`, `goal_activity`,
  `budget_history`, `usage_requests`.
- **El paginador se generaliza** (revisión del PR #64, F64-4). Hoy `readByCursor` y
  `afterFilter` (`src/lib/db/paginate.ts`) solo admiten la clave
  `(transaction_date | settlement_date, created_at, id)`. El PR A los cambia, sin
  romper sus llamadas actuales, a una **clave declarada por lista**: una o dos columnas
  de orden y siempre un **id único** al final como desempate, con la misma garantía
  (ninguna fila dos veces; toda fila que existía de principio a fin, una vez; una página
  que falla hace fallar la lectura). Cada vista expone las columnas de su clave y un
  índice que la cubre:

  | Lista | Clave de orden (descendente) | Id único |
  | --- | --- | --- |
  | Gastos y liquidaciones (002, 003) | `transaction_date` o `settlement_date`, `created_at` | `id` |
  | `goal_entries`, `goal_activity` | `effective_date`, `created_at` | `id` del asiento |
  | `budget_history` | `changed_at` | `id` de `budget_versions` |
  | `usage_requests` | `created_at` | `id` de la solicitud |

  En `goal_entries`, la `effective_date` de un uso es la `transaction_date` de su
  gasto, que cambia si se edita la fecha: esa fila no «existió igual» de principio a fin
  y puede salir o no, como ya ocurre con un gasto editado en la 002.
- **`budget_history`** expone el `id` de `budget_versions`, y su
  `previous_limit_minor` es `lag(limit_minor) over (partition by budget_id order by
  changed_at, id)`: el límite anterior es siempre el del mismo presupuesto.
- **Pruebas del paginador** (integración, PR A): más de 500 filas por lista (más de una
  página de `PAGE_SIZE`), muchas filas con la misma fecha y el mismo `created_at`
  (desempate por id), e inserciones y anulaciones entre páginas, para `goal_entries`,
  `budget_history` y `usage_requests`; y las pruebas actuales de la 002 y la 003
  siguen pasando con la firma nueva.
- Totales de una sola sentencia: `budget_months`, `goals_overview`,
  `goal_member_balances`, `metric_months`, `expense_goal_funding`. El servidor de la
  aplicación nunca suma páginas ni recalcula estos totales; el dominio solo los
  **formatea**.
- Vista previa (B3, «Con este aporte»): la calcula el dominio a partir de esas lecturas
  para mostrarla, pero la escritura **vuelve a calcular y validar todo en SQL**
  (FR-090). Si la vista previa quedó vieja, gana el servidor y la interfaz muestra el
  error con el valor vigente.

## 6. Estado que sobrevive a la navegación (FR-098, FR-099)

Mismo proveedor de la 003. Tras un aporte, un retiro o un gasto con meta, si el
registro no está en la pantalla actual, se lleva a la meta o a Actividad en su mes,
con el aviso y el resaltado. La hoja guarda su contexto al abrirse.

## 7. La solicitud en la sesión del otro (FR-056)

Sin tiempo real (decisión 20.16). Tomás ve la solicitud al navegar, al volver a la
pestaña (`visibilitychange` → `router.refresh()`) y tras cada escritura propia: en
Inicio del contexto (tarjeta B5), en la meta y en la fila del gasto. Aprobar o
rechazar lleva la `version` que leyó; si cambió, `JT011` y se relee.
