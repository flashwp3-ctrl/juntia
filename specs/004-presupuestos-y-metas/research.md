# Research — 004 · Presupuestos opcionales y metas (P0-3)

**Fase 0 del plan.** Registra la ejecución de los `[V]` cuyo cierre es «antes de
cerrar el plan» (spec, «Inventario de `[V]`», primera tabla) y las decisiones
técnicas del plan. Cada decisión cita la fuente que la obliga; lo que no tiene
fuente superior es una **decisión del plan** —local, reversible antes de tener
datos y no significativa— y se marca así para que el revisor la pueda objetar. Lo
que no es local ni reversible va a los fundadores (plan, «Para los fundadores»).

**Dónde se ejecutó.** Contra **`juntia-dev`** (`itfrhnadovezpahikuol`), con los
comandos del guardia y el bloqueo de la decisión 18 (`npm run db:dev:reset` y
`npm run test:integration:dev`), desde el worktree de esta rama, el 8 de noviembre
de 2026. **Ningún runner ni workflow de GitHub Actions** (regla del gestor). Nada de
esto es evidencia del slice (ADR-011 §9.8): el gate sigue siendo el CI del PR A.

- **Spike desechable, nunca versionado:** una migración
  `supabase/migrations/20261108000100_spike_p0_3.sql` y una prueba
  `tests/integration/spike-p0-3.test.ts`, aplicadas encima de las **siete
  migraciones de `main`** (`f8285d8`). Al terminar se borraron los dos archivos y se
  ejecutó otra vez `npm run db:dev:reset`, que dejó `juntia-dev` con las siete
  migraciones de `main` y nada del spike.
- La spike modela **lo mínimo** para cada `[V]`: las cinco tablas, el historial de
  presupuestos, sus políticas, siete funciones de escritura con el protocolo de la
  002 (`begin_write`/`finish_write`) y dos vistas. Los nombres llevan el prefijo
  `spike_` y no son los del data-model.
- **Tres ejecuciones** de `test:integration:dev` (suite de integración completa más
  las sondas). Las salidas de abajo son las de la **tercera**, salvo donde se indica,
  copiadas del log y recortadas con `…` donde se dice. Supabase CLI 2.121.0 y
  PostgreSQL 17 alojado.

| Ejecución | Qué cambió | Resultado |
| --- | --- | --- |
| 1 | Primer intento | Sondas V1–V3 bien; **V2b (control negativo) dejó un aportante en −40.000**; V4 y V5 fallaron con `permission denied for schema juntia_data` (hallazgos de R2 y R6). Una prueba de `concurrency.test.ts` cayó por una conexión cerrada del pooler |
| 2 | Lecturas como vistas `security_invoker`; trigger `before insert` que bloquea la meta | V1–V4 bien, V2b ya rechaza; V5 falló otra vez por la política del ledger (hallazgo de R6). Cuatro pruebas de `concurrency.test.ts` fallaron mientras la spike corría en paralelo en la misma base; en la ejecución 3 pasan |
| 3 | Políticas con subconsulta en línea | **74 pasadas, 9 omitidas (las de correo), 0 fallos**, 154,67 s. Es la ejecución de referencia |

---

## R1 · `[V]` Ledger de solo inserción con anulaciones

**Fuente.** Spec, «Inventario de `[V]`», primera tabla, fila 1; FR-002; ADR-013 §2.4.

### Lo que se construyó

`goal_ledger_entries` con un trigger `before update or delete` que lanza
`appendOnly` **para cualquier rol**. Para que la prueba demuestre que la barrera es
el trigger y no la falta de permiso, la spike le dio a `juntia_writer` `update` y
`delete` y políticas `using (true)`. La anulación es **un asiento nuevo** de tipo
`void` con `voids_entry_id` único.

### Salida

```
[SPIKE-004] dueño · update: psql:<stdin>:1: ERROR:  appendOnly
[SPIKE-004] dueño · delete: psql:<stdin>:1: ERROR:  appendOnly
[SPIKE-004] juntia_writer · update: psql:<stdin>:1: ERROR:  appendOnly
[SPIKE-004] juntia_writer · delete: psql:<stdin>:1: ERROR:  appendOnly
[SPIKE-004] anular aporte: {"voided":"a1b606c6-61bb-40dd-9a45-bdf53b619e69"}
```

Después de anular, el disponible de Sara vuelve a 0, una segunda anulación falla
con su código propio y el importe del asiento original sigue intacto (`100000`).

### Decisión

- **Las anulaciones son asientos `void` en el mismo ledger**, con `voids_entry_id`
  único (nunca se anula dos veces) y sin importe. Un asiento «vivo» es el que no
  tiene un `void` que lo apunte. **Decisión del plan.** Alternativa descartada: una
  columna `status` mutable, como en `settlements`; obliga a conceder `update` sobre
  el ledger y rompe «solo inserción».
- El trigger de solo inserción cubre `goal_ledger_entries`,
  `goal_usage_allocations` y `budget_versions`.
- `goal_usage_confirmations` **sí** cambia de estado (pendiente → aprobada,
  rechazada o cancelada), como `settlements`, con `update` por columna y versión.
  No guarda importes que cuenten: el uso aprobado es un asiento del ledger.

---

## R2 · `[V]` Saldo ≥ 0 por aportante bajo concurrencia

**Fuente.** Spec, «Inventario de `[V]`», fila 2; DEC-G06; ADR-013 §3; FR-003.

### Salida

Sara con 100.000 aportados; dos retiros de 70.000 a la vez, con la meta bloqueada
por una barrera hasta que los dos esperan:

```
[SPIKE-004] dos retiros esperando la meta: 2 PID en wait_event_type=Lock
[SPIKE-004] retiros con bloqueo: [{"ok":{"id":"8b45ec28-…","available":"3000000"}},{"error":"JT204"}]
```

**Control negativo (ejecución 1).** La misma carrera con una función que **no**
bloquea la meta (y una pausa de 1,5 s entre leer y escribir), con un trigger de
restricción **diferido** que comprueba el saldo al final:

```
[SPIKE-004] retiros sin bloqueo: {"results":[{"ok":{"id":"cb8ecc0d-…"}},{"ok":{"id":"0178f5e4-…"}}],"available":"-4000000"}
```

**Hallazgo: el trigger diferido no basta.** Con `READ COMMITTED`, cada transacción
comprueba su saldo antes de ver el asiento de la otra, y las dos confirman: Sara
queda en −40.000. Un `check` o un trigger diferido no son una barrera de
concurrencia.

**Con un trigger `before insert` que bloquea la meta (ejecución 3):**

```
[SPIKE-004] retiros sin bloqueo: {"results":[{"error":"JT202"},{"ok":{"id":"47815cd9-…"}}],"available":"3000000"}
```

### Decisión

- **Toda función que cambia el saldo de una meta la bloquea** (`select … for
  update` sobre `savings_goals`) antes de leer saldos (FR-004; ADR-013 §3.2).
- **Defensa en profundidad que sí serializa:** un trigger `before insert` en
  `goal_ledger_entries` y en `goal_usage_allocations` toma el mismo bloqueo de la
  meta y comprueba que el disponible del aportante sigue ≥ 0 después del asiento;
  falla con `JT220` (`goalNegative`). Cubre los tres asientos que lo reducen: el
  retiro, la asignación de un uso y el `void` que anula un aporte (revisión del
  gestor del plan: la spike solo probó los dos primeros; el tercero se prueba en el
  PR A con un `insert` directo como `juntia_writer` y con dos carreras, data-model
  §3). Funciona aunque una escritura salte las funciones. **Decisión
  del plan** (ADR-013 §2.4 pide que las invariantes no dependan solo de la función;
  este es el mecanismo que la prueba demostró).
- No se usa un trigger diferido para este saldo: la prueba mostró que no protege.

---

## R3 · `[V]` Orden global de bloqueos y carreras de FR-112

**Fuente.** Spec, «Inventario de `[V]`», fila 3; FR-004; FR-112; revisión del PR
#63, F63-4.

### El orden

Extiende el de la 003 (persona → grupo → movimiento) sin cambiarlo:

| Nivel | Raíz | Cómo | Quién la toma |
| --- | --- | --- | --- |
| 1 | Persona | `pg_advisory_xact_lock(hashtextextended(uuid,0))`, ordenadas por UUID | Pareja (003); **crear un presupuesto personal** (nuevo) |
| 2 | Grupo | `select … for update` sobre `groups` | Toda operación de Nosotros |
| 3 | Presupuesto **o** movimiento | `budgets` **o** `transactions`, por id | Nunca los dos en una operación |
| 4 | Meta | `savings_goals`, por id | Aportes, retiros, usos, anulaciones, archivar |
| 5 | Solicitud | `goal_usage_confirmations`, por id | Aprobar, rechazar, cancelar, quitar el uso, anular el gasto |

**Regla:** una operación nunca pide un nivel igual o inferior a uno que ya tiene,
salvo varias filas del mismo nivel en orden de id. Saltarse niveles está permitido.
El trigger de R2 toma la meta (nivel 4) después del movimiento (nivel 3), que es
compatible.

### Salida

Gasto compartido de 300.000, meta con 200.000 de cada uno; Sara registra el gasto
con 100.000 propios y pide 150.000 a Tomás. Cada carrera con una barrera sobre el
grupo hasta que los dos esperan, en los dos órdenes:

```
[SPIKE-004] aprobar vs quitar (approve-first): {"results":[{"ok":{"usage":"7717c6be-…"}},{"ok":{"voided_usages":2}}],"live":"0","confirmation":"approved","tomas":"20000000","sara":"20000000"}
[SPIKE-004] aprobar vs anular (approve-first): {"results":[{"ok":{"usage":"e07c6f0c-…"}},{"ok":{"voided":"86408e55-…"}}],"tx":"voided","live":"0","confirmation":"approved"}
[SPIKE-004] aprobar vs quitar (remove-first): {"results":[{"ok":{"voided_usages":1}},{"error":"JT212"}],"live":"0","confirmation":"cancelled","tomas":"20000000","sara":"20000000"}
[SPIKE-004] aprobar vs anular (remove-first): {"results":[{"ok":{"voided":"b5cf7b82-…"}},{"error":"JT212"}],"tx":"voided","live":"0","confirmation":"cancelled"}
```

Sin barrera, aprobar, anular, quitar el uso y aportar a la vez, cinco rondas: ningún
`40P01` ni `40001`, entre 141 y 212 ms por ronda, y la invariante en 0 en todas:

```
[SPIKE-004] ronda 1 (156 ms): [{"error":"JT212"},{"ok":{"voided":"8d6c8d0b-…"}},{"ok":{"voided_usages":0}},{"ok":{"id":"369afde8-…","available":"20100000"}}]
…
[SPIKE-004] ronda 5 (212 ms): [{"ok":{"usage":"01f5ac4a-…"}},{"ok":{"voided":"1eea4390-…"}},{"ok":{"voided_usages":0}},{"ok":{"id":"2801a09a-…","available":"20100000"}}]
```

Invariante comprobada después de cada carrera: **ningún asiento de uso vivo está
asociado a un gasto que no esté activo** (`count = 0`).

### Decisiones

- El orden de la tabla es el **orden global**: lo aplican todas las funciones de
  P0-3 y las cuatro de la 002 y la 003 que se redefinen (data-model §6).
- **Aprobar lee la solicitud sin bloquear** para saber qué gasto y qué meta
  bloquear, toma grupo → movimiento → meta → solicitud y **vuelve a leer** la
  solicitud bloqueada antes de decidir. Así un rechazo o una cancelación ganados
  antes se ven.
- **Quitar el uso de un gasto ya anulado** devolvió éxito con 0 usos en la spike
  (rondas 1, 4 y 5). En el producto falla con `JT012` (`transactionVoided`): no hay
  nada que quitar y decir «quitado» sería afirmar algo que no pasó. **Decisión del
  plan.**
- Quitar el uso después de una aprobación deja la solicitud en `approved` con su
  uso anulado. La interfaz lo muestra como «Uso quitado», no como pendiente.
- La spike demuestra el orden sobre los caminos nuevos. Las funciones de la 003
  redefinidas (anular y editar un gasto compartido) se prueban en el PR A con
  `raceUnderLock`, en los dos órdenes (FR-112).

---

## R4 · `[V]` Vigencia mensual del presupuesto

**Fuente.** Spec, «Inventario de `[V]`», fila 4; FR-013; Q7; ADR-004, nota de la
decisión 22.7.

### Lo que se construyó

`budgets` es la **identidad** de una clave (contexto, categoría, moneda), única. Cada
cambio inserta una fila en `budget_versions` (solo inserción) con `effective_month`
y `limit_minor`, que es `null` cuando se desactiva. El límite que rige en un mes es
el de la última versión con `effective_month ≤ mes` (y, a igualdad, la más
reciente).

### Salida

Mercado de Nosotros: Tomás lo crea con 800.000 en octubre, Sara lo sube a 900.000 en
octubre (versión 1), una edición de Tomás con la versión vieja falla con `JT011`,
Sara pone 1.000.000 desde noviembre y Tomás lo desactiva desde diciembre:

```
[SPIKE-004] Mercado por mes: {"budget":"1636b417-…","months":{"2026-09-01":[],"2026-10-01":[{"category_id":"market","limit_minor":"90000000","consumed_minor":"64000000","state":"within"}],"2026-11-01":[{"category_id":"market","limit_minor":"100000000","consumed_minor":"0","state":"within"}],"2026-12-01":[{"category_id":"market","limit_minor":null,"consumed_minor":"0","state":"none"}]}}
[SPIKE-004] dos creaciones de Restaurantes: {"results":[{"ok":{"id":"df10014a-…","version":1}},{"error":"JT011"}],"budgets":"1"}
```

Septiembre no tiene fila: el presupuesto no existía y ese mes no tuvo gastos de
Mercado en la prueba. Diciembre muestra `limit_minor: null` y `state: "none"`:
**ausencia, nunca cero** (DEC-R01).

### Decisiones

- **El servidor fija el mes de vigencia**: el mes en curso en `America/Bogota`. El
  cliente no lo envía (FR-090). La spike lo recibía como parámetro solo para poder
  sembrar varios meses.
- La vista recorre los meses desde la primera versión hasta el mayor entre el mes en
  curso y el último mes con gastos del contexto. La spike usaba «12 meses
  adelante»; el plan acota al último mes con datos.
- Crear dos veces la misma clave a la vez: la segunda espera al grupo (o a la
  persona, en Yo), encuentra la fila y falla. En la spike fue `JT011`; en el producto
  es `JT219` (`budgetAlreadyExists`), para que la interfaz diga quién lo creó. Nunca
  hay dos.

---

## R5 · `[V]` Lectura consistente de métricas y saldos

**Fuente.** Spec, «Inventario de `[V]`», fila 5; FR-096; FR-043 de la 003.

### Salida

Octubre sintético: aportes a Japón de 500.000 (Sara) y 400.000 (Tomás), un aporte de
70.000 de Sara a su meta personal y una cena compartida de 240.000 al 50/50.
`spike_metric_months`, una sola vista, leída por cada persona:

```
[SPIKE-004] métricas de octubre: {"saraUs":{"gasto_consumo":"24000000","aporte_a_metas":"90000000","retiro_de_metas":"0","gasto_financiado_con_meta":"0","total_destinado_neto":"114000000"},"tomasUs":{…igual…},"saraMe":{"gasto_consumo":"12000000","aporte_a_metas":"57000000",…,"total_destinado_neto":"69000000"},"tomasMe":{"gasto_consumo":"12000000","aporte_a_metas":"40000000",…,"total_destinado_neto":"52000000"}}
[SPIKE-004] Tomás lee juntia_data por la API: {"error":"PGRST205"}
```

Nosotros es igual para los dos y no incluye la meta personal de Sara; Yo de Sara
incluye sus 70.000 personales y sus 500.000 a Japón; Yo de Tomás, solo sus 400.000.

### Decisión

- Las cinco métricas, el consumo de cada presupuesto y los saldos de las metas salen
  de **vistas de una sola sentencia**: un `select` sobre una vista se resuelve con
  una sola instantánea, el mecanismo que la 003 ya demostró con inserciones
  concurrentes (research R4 de la 003; su prueba sigue en `consistency.test.ts`, que
  pasó en esta ejecución). Las listas siguen con `readByCursor`.

---

## R6 · Hallazgo: las lecturas con parámetro y las políticas no pueden llamar a funciones invoker que nombren `juntia_data`

**Origen.** Ejecuciones 1 y 2 de la spike.

- La spike empezó con funciones de lectura `security invoker` en `public`, con el
  mes como parámetro. Fallaron con `permission denied for schema juntia_data`:
  `authenticated` no tiene `usage` sobre ese esquema (ADR-013 §2.1), y una función
  invoker que nombra sus tablas se comprueba con los privilegios de quien llama. Una
  **vista** `security_invoker` en `public` sí funciona, como ya decía ADR-013.
- Después, la política de lectura del ledger llamaba a una auxiliar invoker que leía
  `savings_goals`: mismo error, ahora al leer la vista. Con la subquery escrita en
  la política (`exists (select 1 from juntia_data.savings_goals g where g.id =
  goal_id)`) funciona, como las políticas de la 003.

**Decisión.** Todas las lecturas nuevas son **vistas** `security_invoker` con
columnas por las que filtrar (`month`, `context`, `goal_scope`, `goal_id`), como `couple_month_summary`
de la 003. Ninguna política llama a una función invoker que lea tablas de
`juntia_data`; las únicas auxiliares en políticas siguen siendo las booleanas
`security definer` de `juntia_membership` (nota de ADR-013 §5.1). Es la aplicación
literal de ADR-013 («Toda lectura de la aplicación pasa por vistas»), no una decisión
nueva.

---

## R7 · Modelo de presupuestos: identidad más historial

**Fuente.** FR-010 a FR-018; Q7, Q8; ADR-004.

- `budgets` guarda la identidad y la versión (para `expectedVersion`); el límite y su
  vigencia viven en `budget_versions`, solo inserción. El historial que pide FR-018
  (autor, fecha, valor anterior y nuevo, mes desde el que rige) sale de esa tabla con
  `lag()` en una vista. **Decisión del plan.**
- Alternativa descartada: una fila de `budgets` por mes. Obliga a copiar el límite
  cada mes (Q7 decidió que se repite) y a decidir qué pasa con los meses sin fila.
- «Desactivar» es una versión con `limit_minor = null`; reactivar es otra versión con
  límite. No hay columna `status`: el estado de un mes es el de su versión vigente.
  Un límite `0` se rechaza siempre (DEC-R01).

---

## R8 · Ventanas de «Deshacer» en el servidor

**Fuente.** FR-042, FR-059, FR-095; research R7 de la 003.

Mismo criterio que la 003: el aviso dura 6 s y el servidor acepta el deshacer hasta
**60 s** después de la operación (`created_at`), con la versión esperada cuando el
registro la tiene. Se aplica a deshacer un aporte, un retiro y un gasto con meta.
«Anular aporte» desde el historial no tiene ventana: solo exige que los fondos sigan
disponibles (Q13). **Decisión del plan**, ya aprobada para la 003 (plan de la 003,
«Para los fundadores», punto 3).

---

## R9 · Specs E2E 4 y 5 dentro del presupuesto del job `e2e`

**Fuente.** FR-114 a FR-116; decisiones 19.5 y 21; `docs/TESTING.md` §4 y §9.

- **Línea base.** El gate del PR #60 (PR D de la 003) midió el job `e2e` en
  **420 s**, con axe en su nivel ligero en 144 s (decisión 21). Quedan **60 s** hasta
  el techo de 480 s, que ya bloquea.
- **Qué corre cada PR** (`docs/TESTING.md` §4): los PR de metas corren las specs 1, 2,
  3 y 4; los de presupuestos, 1, 2, 3 y 5. Solo el PR E (y la pasada manual de cierre de etapa) corren las
  cinco. Así cada PR suma una spec, no dos.
- **Coste esperado.** La spec 4 necesita dos sesiones (Sara y Tomás) y la 5, una. Las
  dos reutilizan la pareja sembrada por worker (`seedCouple()`), con la parte P0-3 del
  dataset sembrada por SQL, no por la interfaz (regla dura 1). Los estados nuevos de
  axe (unos 20) se agrupan por ruta y tema en el mismo contexto, como en la 003.
- **Riesgo real.** Con 60 s de margen, la spec 4 más los estados de axe de Metas
  pueden superar 480 s. El PR B y el PR C **miden** el job en su punto de control. Si
  supera el techo, el PR se para y va a los fundadores: el presupuesto no se mueve
  por una medición (cláusula anticliquet). Las palancas sin decisión nueva son las
  de la 003: siembra por SQL, agrupar axe y no repetir en E2E lo que cubre la
  integración.

---

## R10 · S3 y S5 con datos reales

**Fuente.** MOTION_SYSTEM §4 y §5; FR-021 a FR-025, FR-075 a FR-077; §15.6.2 puntos 1
y 4.

- **Goal Journey:** la meta inmersiva es una ruta (`/metas/[id]`). Se usa
  `document.startViewTransition` con `view-transition-name` por meta solo donde el
  navegador lo soporta, y `layoutId` de Motion como respaldo. La `[V]` de View
  Transitions con App Router y el back-swipe de iOS se ejecuta en el PR C; el
  back-swipe en un iPhone real queda con los aplazados de la decisión 19.1.
- **GoalStack:** pila con Motion (`spring card`), abanico desde lg. La `[V]` de
  rendimiento del abanico con 6 metas en gama media emulada se mide en el PR C
  (decisión 22.2). Si falla, el PR cae a la lista y vuelve a los fundadores.
- **Spending Story:** `IntersectionObserver` al 30 % por capítulo, una sola entrada;
  con movimiento reducido, todo visible desde el inicio.
- **Sin fotos** (decisión 22.6): el fallback de GoalCard no necesita la `[V]` de
  luminancia del scrim.

---

## R11 · Lo que ya existe y se reutiliza

- `begin_write`, `finish_write`, `current_uid`, `parse_amount_minor`,
  `lock_active_couple`, `is_couple_member` y `write_status` (002 y 003).
- `readByCursor` (`src/lib/db/paginate.ts`), la máquina de escritura del cliente con
  15 s, `unknown` y «Comprobar estado», y el deshacer único (PR C y D de la 003).
- `raceUnderLock` (`tests/integration/support/locked-race.ts`) y `setupCoupleFixtures`
  para las carreras.
- El punto de extensión `juntia_private.transaction_goal_funded` (FR-035 de la 003):
  P0-3 solo cambia su cuerpo.

## Sin dependencias nuevas

Ninguna. Motion, Radix Dialog, Phosphor y `@supabase/*` ya están en el lockfile.
