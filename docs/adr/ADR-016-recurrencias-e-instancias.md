# ADR-016 — Recurrencias e instancias previstas: modelo de dominio y datos

**Estado:** **Propuesto** (25 de noviembre de 2026). Es el candidato **ADR-a** del análisis (`docs/propuestas/analisis-planificacion-financiera.md` §6), con el número que le toca al abrirse (maestro §15.10, decisión 29.10). Se acepta antes de la etapa Plan de la spec 007 (`AGENTS.md` 17). No se implementa antes de declarar MVP-1 ni antes de que Planes (spec 006) esté aceptada (28.18, condición 6) · **Origen:** especificación 007 (`specs/007-recurrentes-calendario/spec.md`), «Cuestiones que la tabla deja a ADR-a», FR-005, FR-009b, FR-010, FR-012a, FR-014a, FR-017, FR-018a, FR-036 y FR-038a; maestro §15.10, decisiones 29.3, 29.5, 29.6 y 29.7 · **Alcance:** MVP-2

En este archivo `[P]` es una **propuesta** que necesita decisión de los
fundadores y `[V]` una **verificación pendiente** (maestro §15.9). Los nombres
de tablas y columnas son de la capa de datos y de trabajo: los nombres visibles
se deciden con los comps y entran en `docs/GLOSSARY.md` solo aprobados (spec 007,
Q2). Las fechas y los importes de los ejemplos son **ficticios**.

## Contexto

La spec 007 fija **qué** hace Recurrentes y calendario y deja a este ADR **cómo**
se representa. La decisión 29.7 y la spec le delegan estas cuestiones:

| # | Cuestión delegada | Origen | Dónde se resuelve |
| --- | --- | --- | --- |
| 1 | Instancia: fila o cálculo; nada previsto en `transactions` | Q3; FR-010, FR-011 | §1 y §2 |
| 2 | Identidad estable y sin duplicados al editar fecha o frecuencia | Q6 (29.3); FR-005 | §3 |
| 3 | Versión de la instancia al confirmar | F101-6; FR-012a | §4 |
| 4 | Representación de los estados, incluida «pendiente de resolución» antes de su fecha | Q5; D1, F101-4 | §5 |
| 5 | Historial de pausas, posiciones consumidas y su trazabilidad | D5; F101-14, F101-15, F101-18 | §6 |
| 6 | Precedencia de Deshacer una omisión con varias pausas, con un caso de dos pausas | F101-21 (29.7) | §6.4 |
| 7 | Recuperación manual excepcional distinta de la reanudación | F101-18 | §6.5 |
| 8 | Dónde se muestra una pendiente de una recurrencia archivada | F101-8 iii | §6.6 |
| 9 | Regla quincenal | Q7 `[P]` (29.5); FR-009b | §3.3 |
| 10 | Vínculo 1:1 idempotente, compatibilidad en el servidor y algoritmo de sugerencias | Q4 (29.2); F101-1; FR-013 a FR-016 | §7 |
| 11 | Sustitución técnica (Mover a Pareja y su Deshacer) y su trazabilidad privada | F101-3, F101-13; FR-018a | §8 |
| 12 | **Obligatoria:** el reemplazo compartido como candidato a un vínculo posterior | F101-19; FR-014a | §9 |
| 13 | Concurrencia entre confirmar un aporte y lograr o archivar la meta (compartida con ADR-d) | F101-7, F101-16 | §10 y §14 |
| 14 | RLS y privacidad de la existencia | F101-2; FR-061, FR-092 | §11 |
| 15 | Exportación y borrado | Q18; FR-078 | §13 |

Lo que no se puede romper:

- **Lo previsto no es real** (A.2). Ninguna métrica de §5.1, ningún presupuesto,
  Balance, Análisis ni DEC-G04 incluye nada previsto (FR-011).
- Un movimiento real existe una vez y cuenta una vez (US-08, DEC-G04).
- Los movimientos no se borran (§5.4); las ediciones llevan versión y auditoría.
- Todo es privado por defecto, también la **existencia** de lo privado (28.11,
  F101-2).
- ADR-001, ADR-003, ADR-010 y ADR-015 no cambian, y ninguna función de MVP-1 ni de
  Planes se bloquea porque un movimiento esté vinculado a una instancia (F101-3).

**Estado del esquema** (revisado el 25 de noviembre de 2026 en
`supabase/migrations/`, sin modificarlo). Este ADR se apoya en lo que ya existe:

- `juntia_data.transactions`: `type` (`expense | income`), `owner_user_id`
  **XOR** `group_id`, `status` (`active | voided`), `transaction_date`, `version`.
  El trigger `transactions_guard_update` hace **inmutables** el tipo, el autor, el
  dueño, el grupo y la moneda. El ingreso solo es privado
  (`transactions_income_private`).
- Mover a Pareja (`reclassify_to_shared`) anula el privado y le pone
  `moved_to_transaction_id`; el compartido nuevo lleva `moved_from_transaction_id`.
  Su Deshacer (`undo_reclassify_to_shared`) anula el compartido y crea un privado
  nuevo con `restored_from_transaction_id`. Solo lo puede hacer quien movió, con la
  versión 1, en 60 s y sin liquidaciones posteriores.
- `juntia_data.goal_ledger_entries`: el aporte es un asiento `contribution` con
  `member_user_id` = autor; su anulación es un asiento `void` con
  `voids_entry_id` (decisión 22.13). Una meta pasa de `active` a `completed` o
  `archived`, y no vuelve a `active`.
- `audit_events` e `idempotency_records` tienen listas cerradas de entidades y
  acciones que cada spec amplía con una migración (ADR-015 §1). La columna
  `audit_events.visible_to_user_id` la añade el PR A de la spec 006 (ADR-015 §1);
  como Planes se implementa antes (28.18), este ADR la da por existente.
- El maestro §7.3 ya nombra la tabla `recurring_rules` («instancias sin
  duplicados»). Este ADR conserva ese nombre.

## Decisión

### 1. Lo previsto vive aparte y nunca entra en `transactions`

Las recurrencias y sus instancias viven en tablas propias de `juntia_data`. Nada
previsto se escribe nunca en `transactions`, en `transaction_allocations` ni en
`goal_ledger_entries`. Las garantías son estructurales, no de convención:

1. **Ninguna clave ni columna nueva en las tablas de dinero.** Las tablas de este
   ADR apuntan a `transactions` y a `goal_ledger_entries`; nunca al revés. Una
   recurrencia no puede aparecer en una vista de dinero por un `join` olvidado.
2. **Ninguna vista ni función de métricas lee las tablas de este ADR.** Se prueba
   con `pg_depend` (las vistas de §5.1, presupuestos, Balance, Análisis, metas y
   DEC-G04 no dependen de ninguna tabla `recurring_*`) y con la invariancia de
   SC-001 (`[V]` 1).
3. **El único camino de lo previsto a lo real es confirmar** (§7), que llama a la
   misma escritura que Anotar o que el aporte manual. Lo real que resulta es
   idéntico a uno anotado a mano y cuenta como él; antes de confirmar no existe.
4. **Las tablas son controladas** (ADR-013 §2): guardan importes previstos y la
   lista de ADR-013 dice que ninguna tabla nueva con importes queda fuera. Se
   escriben solo por funciones `security definer` de `juntia_writer`, con
   idempotencia, bloqueo y auditoría.

### 2. Materialización: se calcula, y hay fila solo cuando hay algo que guardar

**Elección: la opción (b) de Q3, precisada.** Una instancia se **calcula** a partir
de la regla, su calendario y sus versiones. Se **materializa** —tiene fila en
`recurring_occurrences`— solo cuando hay algo de ella que guardar:

- se confirma o se vincula (§7);
- se omite, también anticipadamente (D3);
- se cancela al finalizar a mano o al archivar (Q18, D6);
- se fija su versión porque volvió a pendiente tras una anulación económica (D1).

**Regla de existencia.** Una instancia materializada **existe siempre**, con su
posición, su fecha prevista y su versión: ni una pausa, ni el fin de la regla, ni
una edición la quitan ni la mueven. La generación (calendario, pausas, fin)
decide solo las instancias **no materializadas**.

Por qué no (a), materializar un horizonte:

- haría falta un proceso que genere filas cada día (no hay ninguno en el stack y
  añadiría infraestructura) o escribir al leer, que las lecturas por vistas
  `security_invoker` no admiten;
- cada edición de la regla tendría que reescribir filas futuras, y cada pausa
  borrarlas o marcarlas: más estados, más auditoría y más ocasiones de duplicar;
- el horizonte sería arbitrario: el calendario navega hacia delante sin límite
  (Q14).

Coste de (b): las lecturas calculan. Se acota así: la generación es aritmética de
fechas sobre un rango pedido, y las filas materializadas se leen con un índice por
`(rule_id, position)`. Los umbrales de §15.7 se miden en el Plan (`[V]` 7).

**Dónde se calcula.** La autoridad es SQL: una función de `juntia_private`
genera las posiciones y fechas de una regla en un rango, y las funciones que
escriben la usan para validar (§7). El dominio en TypeScript tiene el mismo
algoritmo, puro, para las vistas previas de los formularios y para las pruebas de
dominio de FR-090. Las dos implementaciones se prueban contra la **misma tabla de
casos** (`[V]` 2). Es el patrón de ADR-013 §6.2: el dominio calcula y la función
vuelve a comprobar.

### 3. Calendario, posiciones e identidad estable

#### 3.1 Identidad

La identidad de una instancia es **`(rule_id, position)`**: el número de la
ocurrencia en el calendario de la regla, 1, 2, 3… La posición:

- es la que numera «cuota n de N» (FR-035, FR-042);
- **cuenta también las posiciones consumidas por una pausa** (D5): una pausa no
  renumera nada;
- **nunca se reutiliza**: una edición de calendario continúa la numeración (§3.4).

`recurring_occurrences` tiene `unique (rule_id, position)`. Dos filas para la misma
ocurrencia no pueden existir. Dos ocurrencias distintas en la misma fecha tampoco,
por construcción del calendario (§3.3 y §3.4).

#### 3.2 Frecuencias y día de referencia (Q7; FR-009, FR-009a)

El calendario de una regla se describe con:

| Campo | Valores | Notas |
| --- | --- | --- |
| `unit` | `once`, `day`, `week`, `month`, `semimonth` | `once` es la regla de una sola fecha (Q11) |
| `interval` | entero ≥ 1 | `week` 1 = semanal; `month` 1, 3, 6 y 12 = mensual, trimestral, semestral y anual; «personalizada» = cualquier `day`, `week` o `month` con N. `once` y `semimonth` solo admiten 1 |
| `anchor_date` | fecha | Primera fecha del calendario (o del segmento, §3.4) |
| `ref_day` | 1–31 | En `month`: el día de `anchor_date`, conservado como **día de referencia** |
| `semimonth_days` | dos días | Solo en `semimonth` (§3.3) |
| `end_date` o `occurrence_count` | uno de los dos, o ninguno | Q13; nunca los dos a la vez |

- **`month`.** La fecha de la posición n es el día `ref_day` del mes
  `anchor + (n−1)·interval`; si ese día no existe en el mes, cae en el último día
  del mes, y el día de referencia se conserva: 31 de enero → 28 o 29 de febrero →
  31 de marzo. Un anual del 29 de febrero cae el 28 en los años no bisiestos y el
  29 en los bisiestos. `ref_day = 31` equivale a «último día del mes».
- **`day` y `week`.** `anchor + (n−1)·interval` días o semanas.
- **`once`.** Una sola posición, en `anchor_date`.
- Todas las fechas son `date` en `America/Bogota`, sin días hábiles ni festivos.
  «Hoy» es `(now() at time zone 'America/Bogota')::date`.
- **Fin.** Con `end_date`, solo existen las posiciones con fecha ≤ `end_date`. Con
  `occurrence_count` = N, solo las posiciones 1 a N.

#### 3.3 Quincenal: dos días fijos sin colisión `[P]` (Q7; FR-009b)

Quincenal son **dos días fijos del mes**, no «cada 14 días» (que es la
personalizada «cada 2 semanas»). La spec deja la colisión a este ADR: con 30 y 31,
los dos caerían el último día de febrero.

**Recomendación `[P]` (la del redactor de la spec, 29.5):** al crearla, el primer
día va del **1 al 15** y el segundo del **16 al 31** (31 = «último día»). Se valida
con un `check` en la versión. Cada uno se ajusta con su día de referencia, pero el
primero nunca se ajusta (todo mes tiene 15 días) y el segundo nunca baja de 28. La
colisión no puede ocurrir, y ninguna fecha se mueve ni se pierde.

Las posiciones se numeran en orden: (mes 1, día 1), (mes 1, día 2), (mes 2, día
1)… a partir de la primera fecha ≥ `anchor_date`.

Alternativas descartadas:

- **Una sola instancia en la fecha coincidente:** pierde una obligación real.
- **Mover la segunda al día siguiente:** cambia una fecha que la persona no eligió
  y puede saltar de mes.
- **Permitir cualquier par y avisar:** deja el caso abierto para la otra persona
  de una recurrencia compartida, que no eligió los días.

#### 3.4 Editar el calendario sin duplicar (Q6, 29.3; FR-005)

Una edición que solo cambia **datos** (importe, categoría, pagador, reparto,
nombre, certeza, condición) crea una versión nueva (§4) y **no toca el
calendario**: las posiciones y sus fechas siguen iguales.

Una edición que cambia el **calendario** (`unit`, `interval`, `anchor_date`,
`ref_day`, `semimonth_days`) **corta** el calendario en dos segmentos:

1. **Lo que se conserva.** Se conservan todas las posiciones con fecha ≤ hoy
   (pendientes o resueltas) y todas las materializadas, aunque su fecha sea
   futura (confirmadas o vinculadas antes de tiempo, omitidas anticipadamente,
   pendientes por D1). La última posición conservada es **c**, con fecha **f(c)**.
2. **Lo que se descarta.** Las posiciones futuras **no materializadas** del
   segmento anterior. Eran previstas: no tenían nada guardado, y Q6 dice que la
   edición rige para ellas.
3. **El segmento nuevo** empieza en la posición **c + 1**, con el calendario nuevo
   y una fecha de arranque **a**. Por omisión, **a** es la primera fecha del
   calendario nuevo que cumple **a > hoy** y **a ≥ f(c) + un intervalo nuevo**.
   Ese «un intervalo» es lo que evita la duplicación semántica: si la cuota de
   noviembre del día 15 ya está pendiente y la regla pasa al día 20, la próxima
   es el 20 de **diciembre**, no un segundo noviembre.
4. **El servidor exige** a > hoy y a > f(c). Así ninguna fecha del segmento nuevo
   puede repetir ni preceder a una conservada, y la numeración nunca se reutiliza.
5. La versión guarda `segment_start_position` = c + 1 y `segment_anchor_date` = a.
   La fecha de la posición n la da el segmento que la contiene.

**Excepción a «la edición cambia las previstas».** Una prevista **materializada**
(solo existe tras deshacer una omisión anticipada, D3) conserva su posición y su
fecha, porque se materializó; sí toma la versión de datos nueva (§4). Es la regla
de existencia de §2.

**`[P]` Fecha de arranque elegida por la persona.** Recomendación: el formulario
muestra la fecha por omisión de (3) con su vista previa («La próxima será el 20 de
diciembre») y deja cambiarla a cualquier fecha que cumpla (4). La alternativa es
no dejar cambiarla: más simple, pero obliga a crear otra recurrencia cuando el
cobro se adelanta de verdad.

En un compromiso de N ocurrencias, N sigue contando posiciones: si la edición
cambia la frecuencia, cambia la fecha de la última, y la vista previa lo dice.
Editar N es una edición explícita con versión; una pausa nunca lo cambia (D5).

### 4. Versiones (Q6; F101-6; FR-004, FR-012a)

`recurring_rule_versions` es de **solo inserción**. Cada versión guarda todos los
datos de la regla: tipo de importe (`fixed`, `range`, `unknown`), importes en
unidades menores, categoría, pagador, reparto, responsable, nombre, tipo y certeza
del ingreso, texto de la condición (≤ 140 caracteres; F101-10) y el calendario del
segmento. Lleva `version_no` y **`effective_after`**: la fecha (hoy, en Bogotá) en
que se hizo la edición. La versión 1 no tiene `effective_after`.

**Qué versión tiene cada instancia:**

| Instancia | Su versión |
| --- | --- |
| No materializada, con fecha prevista d | La última versión con `effective_after` < d (o la 1). Una edición hecha el día E rige para las fechas > E: las pendientes (d ≤ E) conservan la suya (Q6, FR-004) |
| Materializada y resuelta (confirmada, omitida, cancelada) | La que se guardó al materializarla. **Nunca cambia** |
| Materializada y pendiente por D1 | La que tenía al confirmarse. **Nunca cambia**, aunque su fecha sea futura (F101-4) |
| Materializada y prevista (tras deshacer una omisión anticipada) | La que tenía; la función de editar se la actualiza, en la misma transacción, como a cualquier prevista |

**Confirmar usa la versión de la instancia, no la vigente** (F101-6). La función
de confirmar lee la versión de la instancia en el servidor. Para el toque único,
el cliente envía el `version_no` que mostró. Si no coincide —alguien editó la
regla entre medias—, la función falla con un error de conflicto, como las
ediciones de presupuesto (ADR-013 §3.5), y nunca confirma con datos que la
persona no vio.

**Concurrencia de ediciones.** `recurring_rules.version` con
`where version = $esperada` (ADR-013 §3.5; US4.3). Dos ediciones simultáneas de
una recurrencia compartida nunca se sobrescriben en silencio.

**El contexto no es un dato editable** (F101-11): `owner_user_id`, `group_id`,
`kind` y, en aportes, `goal_id` viven en `recurring_rules`, no en la versión, y un
trigger los hace inmutables, como `transactions_guard_update`.

**Una regla finalizada (sola o a mano) o archivada no se edita.** La tabla de la
spec no le da salida, y editar N o la fecha final de una terminada sola la
reactivaría.

### 5. Estados de la instancia: cómo se representan (Q5; D1–D4)

El estado **no se guarda en una columna**: se **deriva** en una sola función, con
esta precedencia. Así no hay dos fuentes que puedan contradecirse, y una anulación
hecha desde Actividad no necesita escribir en las tablas de este ADR (§8).

| Orden | Condición | Estado |
| --- | --- | --- |
| 1 | La fila tiene `cancelled_at` | **Cancelada** |
| 2 | La fila tiene `skipped_at` (omisión vigente) | **Omitida** |
| 3 | Tiene un vínculo vigente y su **movimiento efectivo** está activo (§8) | **Confirmada** |
| 4 | Tiene un vínculo vigente y su movimiento efectivo está anulado económicamente | **Pendiente** (D1), aunque la fecha no haya llegado |
| 5 | Fecha prevista ≤ hoy | **Pendiente** |
| 6 | En otro caso | **Prevista** |

El paso 4 es la **representación de «pendiente de resolución» antes de su fecha**
(F101-4): una instancia que estuvo confirmada y cuyo movimiento se anuló
económicamente es pendiente sea cual sea su fecha. Se distingue de una pendiente
por fecha por su vínculo vigente con un movimiento anulado, que la vista expone
como un indicador (`reopened`), no como un sexto estado. Ese vínculo solo deja de
ser vigente cuando la instancia se vuelve a confirmar o vincular (§7.4), así que
una reabierta que se omite y cuya omisión se deshace vuelve a **pendiente**, no a
prevista: D1 prevalece sobre la fecha y una edición posterior no la reescribe.

**Columnas de `recurring_occurrences`** (de trabajo): `id`, `rule_id`, `position`,
`planned_date`, `rule_version_id`, `skipped_at`, `skipped_by`, `cancelled_at`,
`cancelled_by`, `cancel_reason` (`ended_manual | archived`), `created_at`,
`created_by`. `planned_date` y `position` son inmutables; `cancelled_at` se fija
una vez y no vuelve; `skipped_at` se pone y se quita (D3) con auditoría. Un trigger
rechaza cualquier otra transición (§12).

**Correspondencia con la tabla «Estados y transiciones» de la spec:**

| Fila de la spec | Mecanismo |
| --- | --- |
| — → Prevista; Prevista → Pendiente al llegar la fecha | Pasos 5 y 6: nada se escribe |
| Prevista → Prevista al editar | §4: la versión por fecha (o la actualización de la materializada) |
| Pendiente → Pendiente al editar | §4: `effective_after` < d no se cumple; la materializada no cambia |
| Pendiente o Prevista → Confirmada | §7: se materializa y se inserta el vínculo; D2 exige fecha efectiva ≤ hoy |
| Confirmada → Pendiente por anulación económica, también tras una sustitución técnica | Paso 4; nada se escribe al anular (§8) |
| Pendiente o Prevista → Omitida | Se materializa con `skipped_at` |
| Omitida → Prevista o Pendiente | Se quita `skipped_at`, con la precedencia de §6.4 |
| Confirmada → Confirmada por sustitución técnica | §8: el movimiento efectivo sigue la cadena de ADR-001 |
| Prevista → no se genera al pausar | §6: posición consumida, no materializada |
| Pendiente → Pendiente al pausar, terminar sola o inactivarse la meta | Paso 4 o 5, o materializada: la generación no la toca (§2) |
| Prevista o Pendiente → Cancelada | §6.3: se materializa con `cancelled_at` |
| Confirmada, omitida o cancelada → sin cambio | Pasos 1 a 3: ninguna edición, pausa ni fin escribe en ellas |

### 6. Ciclo de vida de la recurrencia y pausas (D4–D7; F101-14, F101-15, F101-18, F101-21)

#### 6.1 Estado de la recurrencia

`recurring_rules.lifecycle` guarda solo lo que una persona decide: `open`,
`ended_manual` (con `ended_on`) o `archived` (con `archived_on`). El resto se
deriva:

| Orden | Condición | Estado |
| --- | --- | --- |
| 1 | `lifecycle = archived` | **Archivada** |
| 2 | `lifecycle = ended_manual` | **Finalizada · a mano** |
| 3 | No queda ninguna posición con fecha > hoy (agotó N o pasó `end_date`) | **Finalizada · sola**, también si estaba pausada (F101-15) |
| 4 | Tiene una pausa abierta | **Pausada** |
| 5 | En otro caso | **Activa** |

La terminación automática **no escribe nada** y no depende de ningún proceso: es
un hecho del calendario. Por eso no puede «olvidarse» de ocurrir, y una terminada
sola no se puede reanudar (no tiene posiciones futuras). No cancela ni oculta las
pendientes anteriores (Q13).

#### 6.2 Historial de pausas

`recurring_rule_pauses`: `id`, `rule_id`, `started_on`, `ended_on` (nulo mientras
dure), `reason` (`manual | goal_inactive`), `created_by`, `ended_by`, con
`created_at` y `ended_at`.

- **Intervalo pausado:** una fecha prevista d cae en la pausa si
  **`started_on` < d** y (**`ended_on` es nulo o d < `ended_on`**). La fecha del
  propio día de la pausa no cae: ese día la instancia ya era pendiente y se
  conserva (Q18). La del día de la reanudación tampoco: desde ese día la regla
  vuelve a generar. Pausar y reanudar el mismo día deja un intervalo vacío.
- **Una sola pausa abierta** por regla (índice único parcial) y sin solapes: una
  pausa nueva empieza en o después del fin de la anterior.
- **Solo inserción**, salvo fijar `ended_on` una vez (§12). El historial es la
  **trazabilidad** que piden D5 y F101-18: el estado de una ocurrencia depende de
  él, no del estado actual de la regla.
- `reason = goal_inactive` es la pausa de un aporte programado cuya meta pasa a
  lograda o archivada (D7). **Cómo y quién la escribe lo fija ADR-d** (§10).
- Reanudar exige una acción explícita de la persona autorizada, quedar posiciones
  y, en aportes, una meta activa. Como una meta lograda o archivada no vuelve a
  activa, una pausa `goal_inactive` no se reanuda en la práctica.

#### 6.3 Posiciones consumidas, finalizar, archivar y eliminar

- **Posiciones consumidas** (D5; F101-15). Una posición no materializada cuya
  fecha cae en un intervalo pausado **no se genera y no se materializa**: ni como
  cancelada ni como ninguna otra cosa. Se deriva del calendario y del historial de
  pausas, que son inmutables, y cuenta para N. El detalle de un compromiso puede
  enumerarlas («2 ocurrencias no generadas por la pausa del …») sin
  presentarlas nunca como cuotas pagadas ni como pendientes. **Por qué no
  materializarlas como canceladas:** «cancelada» significa en la spec «la regla se
  finalizó o se eliminó»; mezclarlas confundiría dos hechos distintos y obligaría
  a escribir al pausar.
- **Antes de pausar un compromiso de duración definida** (FR-038a), la función de
  vista previa calcula y devuelve las posiciones que caerían en la pausa si se
  reanudara en una fecha dada y la fecha de la última, que no cambia. El texto
  exacto es de los comps.
- **Finalizar a mano** (Q18, FR-007) y **eliminar con historia** (D6, FR-076). En
  una transacción: fija `lifecycle`; materializa como **canceladas** todas las
  instancias sin resolver que existen —las pendientes por fecha, las
  materializadas sin resolver y las previstas materializadas—; y desde entonces no
  se genera ninguna. La confirmación previa lista exactamente esas instancias, que
  la función recibe y comprueba (si la lista cambió, falla con conflicto).
- **`[P]` Previstas no materializadas al finalizar.** Recomendación: **no se
  materializan**; dejan de generarse, y la confirmación lo dice («No se crearán
  más desde el …»). Materializarlas exigiría elegir un horizonte arbitrario, porque
  una regla sin fin tiene infinitas. La spec escribe «Prevista → Cancelada»: con
  esta propuesta, lo cumple la prevista materializada, y la no materializada
  desaparece del calendario en lugar de aparecer como cancelada. La alternativa es
  materializar como canceladas las del horizonte por omisión del calendario (este
  mes y el siguiente).
- **«Con historia»** significa que la regla tiene al menos una instancia
  materializada o un vínculo. **Sin historia**, eliminar borra la regla, y sus
  versiones y pausas caen por cascada (§12); las pendientes calculadas desaparecen
  con ella porque nunca fueron reales.

#### 6.4 Deshacer una omisión: precedencia (D3, D4, D5; F101-14, F101-18, F101-21)

La función de deshacer evalúa, en este orden, y se detiene en la primera que se
cumple:

1. **La recurrencia está finalizada a mano o archivada** → **no disponible**. No la
   reactiva, y lo cancelado sigue cancelado (D4).
2. **La fecha prevista cae en cualquier intervalo pausado** del historial, pasado o
   vigente (§6.2) → **no se reintroduce**: la acción no está disponible y la
   instancia sigue omitida (D5; F101-14, F101-18). Lo decide el historial de la
   ocurrencia, no el estado actual de la regla: vale aunque ya se haya reanudado o
   haya terminado sola.
3. **En otro caso**, se quita la omisión y la instancia vuelve a **prevista o
   pendiente según su fecha** (D3), con su versión (§4). Una reabierta por D1
   vuelve a pendiente (§5, paso 4).

Una recurrencia terminada sola llega al paso 3 si la fecha no cayó en una pausa
(D4: con la terminación automática sí está disponible). Una recurrencia pausada
llega al paso 3 con una fecha anterior al inicio de **todas** sus pausas o entre
dos de ellas, y la instancia queda pendiente (F101-14). La precedencia no añade
estados ni transiciones a la tabla de la spec: ordena filas que ya existen.

**Representación de F101-14:** «no se reintroduce» es **no disponible**; la
instancia conserva su omisión y su historia, y la interfaz explica por qué. No se
convierte en una posición consumida, porque ya estaba materializada.

**Caso de prueba con dos pausas** (dominio y pgTAP; fechas ficticias de un mismo
año). Recurrencia mensual del día 10, abierta, que empieza el 10 de enero.

- Pausa 1: del 1 de febrero al 1 de marzo (intervalo: 2 de febrero a 28 de
  febrero). Consume la posición del 10 de febrero.
- Pausa 2: desde el 20 de abril, abierta (intervalo: 21 de abril en adelante).

| Paso | Instancia | Historia | Cuándo se deshace | Regla que decide | Resultado esperado |
| --- | --- | --- | --- | --- | --- |
| a | 10 de enero | Omitida el 12 de enero | 2 de mayo (pausada) | 3 | **Pendiente**: anterior a las dos pausas (F101-14) |
| b | 10 de febrero | Omitida anticipadamente el 25 de enero | 2 de mayo | 2 (pausa 1, ya terminada) | **No disponible**, sigue omitida (F101-18) |
| c | 10 de abril | Omitida el 11 de abril | 2 de mayo | 3 | **Pendiente**: entre las dos pausas, anterior a la 2 |
| d | 10 de mayo | Omitida anticipadamente el 15 de abril | 2 de mayo | 2 (pausa 2, vigente) | **No disponible** |
| e | — | Se reanuda el 1 de junio (pausa 2 = 21 de abril a 31 de mayo) | — | — | El 10 de junio se genera; el 10 de mayo sigue consumido |
| f | 10 de mayo | La de d | 5 de junio (activa) | 2 (pausa 2, ya terminada) | **No disponible** (F101-18) |
| g | 10 de junio | Omitida anticipadamente el 2 de junio | 5 de junio | 3 | **Prevista**: su fecha no llegó y no cae en ninguna pausa (D3) |
| h | 10 de abril | Omitida otra vez el 6 de junio; la regla se finaliza a mano el 7 | 8 de junio | 1 | **No disponible** (D4), aunque por fecha sería pendiente |

Variante de terminación automática: la misma regla con N = 5 (enero a mayo) llega
a **finalizada · sola** el 10 de mayo, aunque siga pausada (F101-15). Deshacer la
omisión de a da **pendiente** (regla 3) y la de d, **no disponible** (regla 2).

#### 6.5 Recuperación manual excepcional `[P]` (F101-18)

**Recomendación: no existe en v1.** Si una obligación del periodo pausado sigue
existiendo, la persona la registra con Anotar o con una recurrencia de una sola
fecha (Q11). Así D5 se mantiene sin excepciones: una pausa nunca recupera nada, y
nada consumido se confunde con una cuota pendiente. Si los fundadores la quieren,
sería una acción distinta de reanudar, sobre una sola posición consumida, que la
materializa como pendiente con auditoría y sin cambiar N ni la fecha final.

#### 6.6 Pendiente de una recurrencia archivada o finalizada a mano `[P]` (F101-8 iii)

Una instancia confirmada de una recurrencia ya archivada (o finalizada a mano)
cuyo movimiento se anula económicamente vuelve a pendiente (D1, paso 4 de
§5). **Recomendación:** se muestra en «Por confirmar» y en el calendario, en su
fecha prevista, con una marca de «recurrencia archivada» (o «finalizada»), y en el
detalle de la recurrencia archivada. Se puede **confirmar, vincular u omitir**,
porque es una obligación real sin resolver. Su omisión no se puede deshacer (D4,
regla 1 de §6.4). La alternativa es mostrarla solo en el detalle de la archivada,
que la esconde justo cuando hay algo que resolver.

### 7. Confirmar y vincular (Q4, 29.2; F101-1, F101-5, F101-6, F101-17)

#### 7.1 Toque único o borrador

El servidor solo acepta el **toque único** (confirmar con los datos de la versión,
sin borrador) cuando la versión de la instancia tiene **importe fijo** y, si es un
ingreso, **certeza fija** (FR-012; F101-17). En un ingreso fijo, la petición
incluye el importe mostrado y la función comprueba que coincide (confirmación
explícita, Q4). En cualquier otro caso —rango, importe desconocido, ingreso
condicional aunque su importe previsto sea conocido— la confirmación llega desde
el borrador de Anotar, con los campos que la persona guardó.

#### 7.2 Confirmar

Una función por tipo de recurrencia, que en una sola transacción:

1. registra la idempotencia (ADR-013 §3.1);
2. bloquea en el orden de §14 (pareja, meta, regla) y materializa la instancia
   (`insert … on conflict do nothing` y después `select … for update`);
3. comprueba que la posición existe en el calendario, que no está consumida por
   una pausa y que el estado derivado es **prevista o pendiente**. Si ya está
   confirmada —por ejemplo, la otra persona confirmó antes la misma instancia
   compartida—, falla con `occurrenceAlreadyResolved` sin escribir nada (US4.4);
4. comprueba que la fecha efectiva es **≤ hoy** (D2, F101-5) y, en aportes, la
   regla de la 004 (FR-040);
5. crea el movimiento **llamando a la misma función que escribe** un gasto, un
   gasto compartido, un ingreso, un gasto con meta (28.10) o un aporte manual,
   con una clave de idempotencia derivada de la suya de forma determinista. Así el
   movimiento, su auditoría y su efecto en las cifras son idénticos a los de uno
   anotado a mano (FR-071, FR-031, F101-2);
6. inserta el vínculo (§7.4) y su auditoría (§12).

Reintentar con la misma clave devuelve el mismo resultado sin crear nada (FR-013).
Dos personas con claves distintas sobre la misma instancia se ordenan por el
bloqueo de la regla, y la segunda recibe el error del paso 3.

#### 7.3 Vincular un movimiento ya anotado

La función de vincular valida en el servidor, en este orden, y falla con un error
único `linkNotAllowed` en los pasos 2 a 5:

1. el movimiento existe **y quien llama lo puede ver** (RLS). Si no, el mismo error
   que un movimiento inexistente;
2. **mismo tipo** (gasto con gasto, ingreso con ingreso, aporte con aporte);
3. **mismo contexto**: en una instancia privada, un movimiento privado cuyo dueño
   es el dueño de la regla, que es quien llama; en una compartida, un gasto
   compartido del mismo grupo, anotado por cualquiera de los dos; en un aporte
   programado, un asiento `contribution` de la **misma meta** cuyo
   `member_user_id` es el dueño de la regla, que es quien llama;
4. el movimiento está **activo** (no anulado; en aportes, sin asiento `void`) y su
   fecha es **≤ hoy** (D2);
5. el movimiento **no cumple ya otra instancia del mismo contexto**: no tiene un
   vínculo ordinario (índice único, §7.4) y, en una instancia privada, no es el
   movimiento efectivo de otra instancia privada de quien llama a través de la
   trazabilidad de §8 (se comprueba recorriendo `restored_from` y `moved_from`
   hacia atrás).

**Por qué este orden no revela nada** (F101-2). El paso 5 solo se alcanza con un
movimiento compatible, y un movimiento compatible solo puede estar vinculado a una
instancia que quien llama también ve: la suya propia, o una compartida. La
trazabilidad privada de la otra persona nunca entra en la comprobación (§9).

Categoría, fecha e importe **nunca** se comprueban al vincular: son solo
heurísticas para sugerir (F101-1). La fecha efectiva no se copia al vínculo: se lee
del movimiento, que es su única fuente (FR-016). Si después alguien edita el
movimiento (fecha, importe, categoría), el vínculo no cambia y la edición no se
bloquea (F101-3).

#### 7.4 El vínculo ordinario

`recurring_occurrence_links`: `id`, `occurrence_id`, `transaction_id` **XOR**
`goal_entry_id`, `mode` (`created | linked`), `created_by`, `created_at` y
`superseded_at`.

- **`unique (transaction_id)`** y **`unique (goal_entry_id)`**: un movimiento tiene,
  en toda su historia, como mucho **un vínculo ordinario**. Como un movimiento
  anulado no vuelve a estar activo, nunca hace falta reutilizarlo.
- **Índice único parcial `(occurrence_id) where superseded_at is null`**: una
  instancia tiene como mucho un vínculo vigente.
- **Cuando el movimiento vinculado se anula económicamente**, el vínculo **no se
  toca en ese momento** (la anulación es una función de MVP-1 que no sabe de
  recurrencias, §8). La instancia ya se lee como pendiente (§5, paso 4). La
  siguiente confirmación o vinculación de esa instancia marca el vínculo antiguo
  con `superseded_at` en la misma transacción y crea el nuevo. El historial queda
  completo y la cardinalidad 1:1 la impone la base de datos.
- Un vínculo nunca se borra desde la app (§12).

#### 7.5 Algoritmo de sugerencias y búsqueda manual (F101-1)

Una función de lectura `security invoker`, con la sesión de quien consulta:

1. **Filtro duro**, con las mismas comprobaciones de §7.3, escritas como filtros
   **explícitos** en la consulta (`owner_user_id = auth.uid()` en lo privado,
   `group_id = regla.group_id` en lo compartido, meta y aportante en los aportes).
   La RLS es una defensa adicional, no el filtro (como ADR-015, F94-3). Por eso una
   sugerencia nunca usa ni muestra un movimiento privado de la otra persona.
2. **Ventana de sugerencia:** fecha del movimiento entre d − w y d + w, donde d es
   la fecha prevista y w es la mitad del intervalo de la regla, entre 3 y 15 días
   (15 en `once`), y nunca después de hoy.
3. **Orden determinista:**
   1. importe: igual al fijo, o dentro del rango; un importe desconocido no ordena;
   2. misma categoría (gastos);
   3. menor distancia a d;
   4. `created_at` más reciente;
   5. `id`.

   Se ofrecen como mucho tres, y **nunca se vincula sin la acción de la persona**
   (FR-015).
4. **Búsqueda manual:** el mismo filtro duro, sin ventana, con búsqueda por texto
   de la descripción y paginación por cursor (como la exportación).

El Plan puede ajustar w y el número de sugerencias con evidencia; el filtro duro y
el orden determinista no se cambian sin revisar este ADR.

### 8. Anulación económica frente a sustitución técnica (F101-3, F101-13; D1)

**Mecanismo: el movimiento efectivo se deriva de la cadena que ADR-001 ya
guarda.** Ni ADR-001 ni sus funciones cambian, y ninguna escribe en las tablas de
este ADR.

**Movimiento efectivo** de un vínculo a un **gasto privado**: se parte del gasto
vinculado y se sigue la cadena:

- si tiene `moved_to_transaction_id`, se pasa al compartido nuevo (Mover a Pareja);
- si existe un gasto con `restored_from_transaction_id` igual a él, se pasa a ese
  privado restaurado (Deshacer);
- si no se cumple ninguna, ese es el movimiento efectivo.

El recorrido tiene un tope de pasos como defensa contra ciclos. El movimiento
efectivo de un vínculo a un **gasto compartido**, a un **ingreso** o a un
**aporte** es el propio movimiento vinculado: no hay cadena, porque solo un gasto
privado se mueve.

- La anulación es **técnica** si el gasto anulado tiene un sucesor en la cadena, y
  **económica** si no lo tiene. No hace falta ninguna columna nueva: lo dicen
  `moved_to_transaction_id` y `restored_from_transaction_id`.
- **Anular económicamente** (ADR-007; en aportes, el asiento `void` de ADR-010 y
  22.13) no escribe nada en las tablas de este ADR: la instancia se lee
  **pendiente** (§5, paso 4) desde ese instante, con su fecha prevista y su
  versión (D1).
- **La trazabilidad privada de la sustitución** es la composición del vínculo
  ordinario de la instancia privada (que apunta al gasto privado original, del
  mismo dueño) y de la cadena de ADR-001. **No es un vínculo** ni cuenta como tal
  (FR-014, F101-19): no ocupa la clave única de §7.4 ni el índice de vínculo
  vigente. Solo la lee quien ve la instancia, porque se recorre desde ella.
- **Auditoría:** el vínculo tiene la suya (§12) y la sustitución la tiene en
  `audit_events` (`move`, `void` con razón `undo`, `restore`), como hoy.

**Cadena de F101-13** (instancia privada de Ana; T1, T2 y T3 son gastos):

| Operación | Movimientos activos | Vínculo y cadena | Movimiento efectivo | Instancia |
| --- | --- | --- | --- | --- |
| Confirmar | T1 (privado) | Vínculo → T1 | T1, activo | Confirmada |
| Mover a Pareja | T2 (compartido) | T1 anulado, `moved_to` = T2 | T2, activo | Confirmada |
| Deshacer, si se permite | T3 (privado restaurado) | T2 anulado; T3 `restored_from` = T2 | T3, activo | Confirmada |
| Anulación económica de T3 (o de T2 sin Deshacer) | ninguno | sin sucesor | anulado | **Pendiente** (D1) |

Hay siempre como mucho un movimiento económico activo por instancia, la
instancia no se puede volver a confirmar mientras ese movimiento esté activo
(paso 3 de §7.2), la recurrencia sigue privada y el vínculo nunca pasa a otro
contexto: sigue apuntando a T1.

**Lo que Beto ve.** T2 es un gasto compartido normal. Ninguna vista compartida
tiene columnas de este ADR; las funciones de editar, anular o liquidar T2 no leen
las tablas de recurrencias, así que ningún error ni bloqueo depende de ellas. Las
vistas compartidas ya ocultan `moved_from_transaction_id` a quien no movió
(`shared_payload`). Beto no puede descubrir la recurrencia a través de T2 (F101-2).

### 9. F101-19 (obligatoria): el reemplazo compartido como candidato a un vínculo posterior `[P]`

**El caso.** Ana confirmó una instancia privada con T1 y lo movió a Pareja; T2 es
el compartido. T2 es el movimiento efectivo de la instancia privada de Ana por la
trazabilidad. Beto, o la propia Ana, quiere vincular T2 a una instancia de una
recurrencia **compartida** compatible (por ejemplo, la que crearon al pasar el
arriendo a Nosotros, F101-11).

La decisión tiene que respetar tres cosas a la vez (FR-014a): unicidad, integridad
económica (una sola operación activa y ningún gasto nuevo) y privacidad (un rechazo
no revela la recurrencia privada de Ana).

| Opción | Unicidad | Integridad económica | Privacidad | Problema |
| --- | --- | --- | --- | --- |
| A. Rechazar: T2 no es vinculable mientras sea movimiento efectivo de otra instancia | Sí | Sí | **No** | Beto ve un gasto compartido, activo y compatible que no se puede vincular sin motivo visible. Excluirlo en silencio de las sugerencias y rechazarlo en la búsqueda revela que algo privado lo usa. Un error genérico también lo revela |
| B. Permitir y quitárselo a Ana: el vínculo de Beto deja la instancia de Ana pendiente | Sí | Sí | Sí | Una acción de Beto cambia en silencio un estado privado de Ana, y no es una anulación económica: contradice D1 |
| **C. Permitir y coexistir (recomendada)** | **Sí, por contexto** | **Sí** | **Sí** | Un mismo gasto real cumple una instancia privada de Ana (por trazabilidad) y una compartida (por vínculo ordinario) |
| D. Bloquear Mover a Pareja de un gasto vinculado | Sí | Sí | Sí | Contradice F101-3: ninguna función de MVP-1 se bloquea por un vínculo |

**Recomendación `[P]`: C.** Reglas:

1. **Unicidad por contexto.** Un movimiento es el movimiento efectivo de como
   mucho **una instancia por contexto**. Puede ser a la vez el final de la
   trazabilidad de una instancia privada y el vínculo ordinario de una compartida,
   nunca de dos instancias del mismo contexto (lo imponen la clave única de §7.4 y
   el paso 5 de §7.3).
2. **El vínculo de T2 se valida como cualquier otro** (§7.3) y la trazabilidad
   privada de Ana no interviene: ni en la validación, ni en las sugerencias, ni en
   los errores. El resultado es el mismo lo haga Beto o Ana, así que el
   comportamiento no depende de quién pregunta.
3. **Integridad.** No se crea ningún gasto; T2 sigue siendo el único movimiento
   activo de cada instancia. Las instancias no son métricas (FR-011), así que
   ninguna cifra cuenta dos veces.
4. **Anulación económica de T2:** las dos instancias vuelven a pendiente (D1).
5. **Deshacer de Ana después del vínculo de Beto** (60 s, versión 1, sin
   liquidaciones; no hay otro caso): la instancia privada de Ana sigue confirmada
   con T3. La compartida vuelve a pendiente, porque su movimiento efectivo es T2
   —sin cadena, §8— y está anulado: para el contexto compartido, el gasto salió de
   él. El vínculo de Beto no es una operación dependiente que bloquee el Deshacer
   (ADR-001 punto 6; spec 003, Q15; F101-3).
6. **Solo para Ana**, el detalle puede indicar que el gasto también cumple su
   recurrencia privada. A Beto nunca se le dice nada.

### 10. Aportes programados: lo que fija este ADR y lo que deja a ADR-d

Este ADR fija para los aportes lo mismo que para el resto:

- la regla `kind = goal_contribution` es siempre de su dueña (`owner_user_id`
  obligatorio, `group_id` nulo), con `goal_id` inmutable, también en una meta
  compartida (Q12);
- la compatibilidad de §7.3 (misma meta, mismo aportante, asiento `contribution`
  sin `void`);
- el vínculo a `goal_entry_id` y la vuelta a pendiente por un asiento `void` (D1),
  sin cadena;
- que confirmar un aporte **nuevo** exige la meta activa y se revalida en la misma
  transacción, después de bloquear la meta (§14). Con ese orden, los tres casos de
  US6.6 salen del orden efectivo: el aporte confirmado antes de lograr la meta es
  válido; la confirmación posterior falla con el error de meta no abierta de la 004
  y la instancia sigue pendiente; archivar después sigue sus propios requisitos
  (22.15).

**ADR-d fija** (sin modificar ADR-010): cómo se escribe la pausa `goal_inactive` al
lograr o archivar la meta (D7), incluido el caso en que lo hace la otra persona sin
poder leer la regla privada; el modo de financiación del aporte confirmado; la
revalidación completa de F101-7 y F101-16; y la cuestión de 29.8 (vincular un aporte
histórico a una meta inactiva), que sigue **abierta**. Este ADR no la decide: §7.3
no incluye ninguna condición sobre el estado de la meta al **vincular**, y ADR-d o
los fundadores la añaden o la descartan. Confirmar un aporte **nuevo** en una meta
inactiva sigue prohibido en cualquier caso.

### 11. Seguridad: tablas controladas, RLS y privacidad de la existencia (F101-2)

**Tablas** (en `juntia_data`, controladas, RLS activada, sin privilegios de
escritura para `authenticated`; ADR-013 §2):

| Tabla | Qué guarda |
| --- | --- |
| `recurring_rules` | Identidad y contexto inmutables (`kind`: `expense`, `income` o `goal_contribution`; `owner_user_id` **XOR** `group_id`; `goal_id`), `lifecycle`, `version`, `created_by`, fechas |
| `recurring_rule_versions` | Datos y calendario de cada versión (§3, §4). Solo inserción |
| `recurring_rule_pauses` | Historial de pausas (§6.2) |
| `recurring_occurrences` | Instancias materializadas (§5) |
| `recurring_occurrence_links` | Vínculos ordinarios (§7.4) |

**Invariantes en la base de datos**, no solo en las funciones:

- `check`: un ingreso o un aporte programado nunca tiene `group_id` (28.9, Q12);
  `goal_id` sí y solo sí `kind = goal_contribution`; un importe desconocido solo en
  un ingreso condicional; un rango con mínimo < máximo; los días de la quincenal
  (§3.3); `end_date` y `occurrence_count` no a la vez;
- trigger de inmutabilidad del contexto (§4);
- trigger de **compatibilidad del vínculo**, que repite §7.3 (tipo, contexto,
  meta y aportante) con los datos de la regla y del movimiento, como el de
  ADR-015 §3: aunque una función tenga un error, un vínculo incompatible no entra
  (SC-007).

**RLS.** Una regla se lee si `owner_user_id = auth.uid()` o si quien lee es
integrante activo de `group_id` (`is_couple_member`, como las metas). Las demás
tablas se leen si se puede leer su regla. `juntia_writer` tiene sus propias
políticas para validar, bloquear y escribir (ADR-013 §2).

**Privacidad de la existencia.** Que la otra persona no vea las filas no basta. Por
eso:

1. **Ninguna vista existente gana columnas** de este ADR: ni Actividad, ni los
   gastos compartidos, ni los asientos de metas, ni la última contribución, ni la
   exportación de lo existente. El enlace de Actividad a la instancia se lee de una
   vista aparte (`occurrence_links` de quien consulta), que la capa de servidor une
   a la lista. Para Beto, esa vista no devuelve nada sobre lo de Ana (FR-019).
2. **Las funciones de MVP-1 y de Planes no leen estas tablas**: anular, editar,
   mover, liquidar, aportar, lograr o archivar no fallan ni cambian por la
   existencia de una recurrencia privada ajena. La pausa por meta inactiva (ADR-d)
   tiene que cumplir esto también.
3. **El movimiento creado al confirmar es idéntico al manual** (§7.2, paso 5):
   mismas columnas, misma auditoría visible, misma idempotencia de la escritura de
   dinero. La procedencia solo vive en las tablas de este ADR y en su auditoría
   privada (§12). Es la prueba de equivalencia de 29.9 (`[V]` 4).
4. **Errores**: una regla o una instancia que quien llama no ve da el mismo error
   que una inexistente; los rechazos de vínculo siguen §7.3.
5. **Agregados y avisos**: los conteos de «Por confirmar» y los totales que fije
   ADR-b se calculan solo sobre lo que quien consulta ve, con filtros de contexto
   explícitos, y en Nosotros solo sobre las reglas compartidas.

### 12. Auditoría, idempotencia y escrituras protegidas

- **`audit_events`** se amplía como en ADR-015 §1 (borrar y recrear la restricción
  con la lista ampliada):
  - `entity_type`: `recurring_rule`, `recurring_occurrence`;
  - `action`: añade `pause`, `resume`, `end`, `confirm`, `link`, `skip`, `unskip`;
    reutiliza `create`, `update`, `archive`, `cancel` y `delete`.

  Cada evento de una regla **privada** lleva `visible_to_user_id` = su dueña,
  también cuando el actor es ella. Los de una regla compartida lo dejan nulo. El
  evento del movimiento real creado al confirmar es el mismo que el de un
  movimiento manual y **no menciona la recurrencia**; la relación solo está en el
  evento `recurring_occurrence / confirm`, privado si la regla lo es. Nadie lee
  `audit_events` desde la app (ADR-015 §5), y el contrato para futuros lectores se
  aplica igual.
- **`idempotency_records.action`** recibe las acciones nuevas de escritura. Las
  claves son por actor, así que no revelan nada a la otra persona.
- **Escrituras protegidas.** `juntia_writer` tiene solo los privilegios que cada
  función necesita: `insert` en todas; `update` por columnas (`lifecycle` y sus
  fechas; `ended_on` y `ended_by` de una pausa; `skipped_*`, `cancelled_*` y
  `rule_version_id` de una instancia; `superseded_at` de un vínculo); `delete` solo
  sobre `recurring_rules`, para eliminar una regla sin historia, comprobado en la
  función. Además, un trigger por tabla rechaza `update` y `delete` fuera de esas
  transiciones (versiones: ninguno; pausas: `ended_on` una vez; vínculos:
  `superseded_at` una vez; instancias: §5), **para cualquier rol distinto del
  dueño de la tabla**.
- **Por qué esa excepción del dueño.** Las acciones referenciales en cascada (al
  eliminar una regla sin historia) y el borrado manual de cuenta (005) corren como
  dueño de las tablas. Con la excepción, ninguno necesita suspender estos
  triggers, y la lista de **cinco** triggers suspendidos por nombre de la nota del
  18 de noviembre de 2026 (ADR-007, ADR-010 y ADR-013; decisión 25.3) **no cambia**
  (`[V]` 6). Para la app y `juntia_writer` la protección es la misma que la de los
  registros de solo inserción de ADR-013 §2.4.
- **Índice nuevo en una tabla de P0:** `transactions(restored_from_transaction_id)
  where restored_from_transaction_id is not null`, para recorrer la cadena de §8.
  No cambia ninguna fila, restricción, trigger ni función de `transactions`.

### 13. Exportación y borrado (Q18; FR-078)

**Exportación** (§15.5, JSON + CSV), con la sesión y la RLS de quien exporta y
proyección explícita, como la de hoy (sin UUID internos, importes como texto):

- las reglas que ve (las suyas y las compartidas), con su contexto, su estado
  derivado y sus versiones;
- su historial de pausas;
- las instancias con fecha prevista ≤ fecha de la exportación, más todas las
  materializadas, con su estado derivado, su posición y su versión. Las previstas
  no materializadas no se exportan: se pueden reconstruir con la regla;
- los vínculos, como referencia al movimiento exportado en el mismo archivo. El
  Plan fija esa referencia sin UUID internos (por ejemplo, un identificador local
  del archivo). En una instancia privada con sustitución técnica, la referencia es
  al movimiento efectivo (T2 o T3), que también está en la exportación de quien
  exporta.

La exportación de Beto no contiene ninguna regla, instancia, pausa ni vínculo
privados de Ana, y sus aportes en una meta compartida salen sin ninguna columna
nueva (F101-2).

**Borrado manual de cuenta** (005, `contracts/account-deletion.md`). El Plan añade
una nota del contrato por cada tabla nueva:

- las reglas privadas de la persona se borran, y sus versiones, pausas,
  instancias y vínculos caen por cascada (§12);
- las compartidas se borran con la pareja, que se borra completa (D2 de la 005);
- los eventos de auditoría siguen la regla vigente del procedimiento, incluida la
  de actor externo;
- los vínculos se borran antes que los movimientos a los que apuntan, por el orden
  de las claves foráneas; el procedimiento lo fija en su orden de bloqueos;
- ningún trigger nuevo se suspende (§12).

La salida de la pareja sigue bloqueada (ADR-003; FR-077).

### 14. Concurrencia: orden de bloqueo

Toda función de este ADR, y las que ADR-d añada para los aportes, adquiere los
bloqueos en este orden fijo (ADR-013 §3.3):

1. la pareja (`lock_active_couple`), si la regla es compartida o el movimiento lo
   es;
2. la meta, si es un aporte;
3. la regla (`recurring_rules … for update`);
4. la instancia materializada;
5. los movimientos, por `id`, como hacen hoy las funciones de MVP-1.

La pareja y la meta van antes que la regla porque las funciones de MVP-1 ya las
bloquean primero. Si ADR-d hace que lograr o archivar una meta escriba una pausa,
esa función bloqueará la meta y después la regla: el mismo orden. Confirmar contra
editar, pausar, finalizar o confirmar desde la otra cuenta se ordena por el bloqueo
de la regla. Los reintentos por `40P01` o `40001` siguen ADR-013 §3.4.

## Alternativas consideradas

1. **Materializar un horizonte** (Q3 (a)). Descartada en §2: necesita un proceso
   periódico o escribir al leer, y cada edición o pausa reescribe filas.
2. **Guardar el estado de la instancia en una columna.** Obligaría a que las
   funciones de anular de MVP-1 (gasto, gasto compartido, aporte) escribieran en
   estas tablas, o a un trigger en `transactions` y en el ledger: tocaría funciones
   y tablas de P0 y abriría un camino por el que un error de Beto podría depender de
   una recurrencia privada de Ana.
3. **Una tabla de trazabilidad escrita por Mover a Pareja.** Duplicaría la cadena
   que ADR-001 ya guarda y exigiría cambiar `reclassify_to_shared` y su Deshacer.
4. **Identidad por fecha prevista.** Una edición de frecuencia o de fecha cambiaría
   la identidad de las instancias y abriría la puerta a duplicados.
5. **Identidad por periodo** (el mes, la quincena). No sirve para «cada N días» ni
   para cambios de frecuencia entre unidades.
6. **Materializar las posiciones consumidas como canceladas** (F101-15). Descartada
   en §6.3.
7. **Una columna `recurring_occurrence_id` en `transactions`.** Toca la tabla
   controlada de P0, convierte vincular en una edición del gasto (versión, «Editado
   por») y lo haría visible para la otra persona en un gasto compartido.

## Consecuencias

- Cinco tablas controladas nuevas, sus vistas `security_invoker`, sus funciones de
  entrada y de escritura, y pgTAP con tres cuentas (FR-092).
- Una función SQL de calendario y su gemela en el dominio, probadas con la misma
  tabla de casos.
- Las lecturas calculan; el Plan mide contra §15.7.
- Ampliación de las listas de `audit_events` e `idempotency_records`, y un índice
  parcial en `transactions`.
- **Ningún ADR anterior necesita enmienda.** ADR-001, ADR-003, ADR-007, ADR-010,
  ADR-013, ADR-014 y ADR-015 se aplican tal como están. Este ADR depende de la
  columna `visible_to_user_id` que añade el PR A de la spec 006 (ADR-015 §1).
  ADR-013 §2 se aplica: las tablas nuevas entran en su lista de tablas
  controladas, como pide su texto.
- El contrato de borrado de la 005 gana una nota por tabla (§13), sin cambiar la
  lista de triggers suspendidos.
- La spec 007 no cambia. Las `[P]` de este ADR, si los fundadores las cambian, se
  reflejan aquí antes de aceptarlo.

## Verificación pendiente [V]

1. **Lo previsto no toca lo real.** `pg_depend`: ninguna vista ni función de
   métricas, presupuestos, Balance, Análisis, metas ni DEC-G04 depende de una
   tabla `recurring_*`. Y SC-001: las cifras son idénticas con y sin recurrencias,
   con instancias en todos los estados no confirmados, con el dataset del Plan.
2. **Calendario gemelo.** La función SQL y la del dominio dan las mismas posiciones
   y fechas en la tabla de casos: cada frecuencia, día 29 a 31, 29 de febrero en
   años bisiestos y no bisiestos, quincenal en meses de 28 a 31 días, fin por fecha
   y por N, y segmentos tras una edición.
3. **Sin duplicados** (FR-005, SC-002). Integración: ediciones de calendario con
   instancias en todos los estados y con materializadas futuras; ninguna posición
   se repite y ninguna fecha del segmento nuevo es ≤ f(c). Incluye el ejemplo del
   día 15 al 20.
4. **Equivalencia de F101-2** (29.9). Un aporte manual de Ana y el mismo aporte
   confirmado desde su recurrencia privada son indistinguibles para Beto en las
   vistas, la exportación, los errores y los metadatos (`max(created_at)`, conteos).
   Lo mismo para un gasto privado movido a Pareja después de confirmarlo.
5. **Cadena de F101-13 y opción C de §9** en integración, con dos cuentas: 1, 1, 1
   y 0 movimientos activos; la instancia privada confirmada hasta la anulación
   económica; el vínculo de Beto a T2 aceptado sin ningún error distinto del que
   daría sin la recurrencia de Ana; y el Deshacer posterior con la compartida en
   pendiente y la privada confirmada.
6. **Excepción del dueño en los triggers** (§12). En PostgreSQL 17, dentro de una
   acción referencial en cascada, `current_user` es el dueño de la tabla que la
   recibe, y el trigger lo deja pasar. Con `juntia_writer`, el mismo `delete` o
   `update` falla. El ensayo del borrado de cuenta en `juntia-dev` pasa sin
   suspender ningún trigger nuevo.
7. **Rendimiento.** Calendario de dos meses, «Por confirmar» e Inicio con el número
   de reglas del dataset del Plan, dentro de los umbrales de §15.7.
8. **Las transiciones de la tabla de la spec** (SC-006), con el caso de dos pausas
   de §6.4 y su variante de terminación automática, en dominio y pgTAP.
9. **Concurrencia.** Confirmación simultánea desde las dos cuentas de la misma
   instancia compartida (un solo gasto); confirmar contra editar, pausar y
   finalizar; y, con ADR-d, los tres órdenes de US6.6.
10. **Compatibilidad en la base de datos.** Cada fila «No» de la tabla de
    compatibilidad de la spec la rechaza el trigger aunque se llame a la función
    de escritura directamente por SQL (SC-007).
11. **Llamada anidada** (§7.2, paso 5). Una función `security definer` de
    `juntia_writer` que llama a otra del mismo dueño conserva `current_uid()`, la
    RLS y la idempotencia de la interior con la clave derivada; volver a bloquear
    la pareja o la meta ya bloqueadas no espera; y un reintento de la exterior no
    duplica el movimiento.

## Cuestiones para los fundadores `[P]`

| # | Cuestión | Recomendación | Dónde |
| --- | --- | --- | --- |
| P1 | Días de la quincenal (Q7, 29.5) | Primer día 1–15 y segundo 16–31 (31 = último) | §3.3 |
| P2 | Fecha de arranque tras una edición de calendario | Por omisión la de §3.4, con vista previa, y la persona la puede cambiar dentro de los límites | §3.4 |
| P3 | Previstas no materializadas al finalizar a mano o eliminar con historia | No se materializan como canceladas: dejan de generarse y la confirmación lo dice | §6.3 |
| P4 | Recuperación manual excepcional (F101-18) | No existe en v1 | §6.5 |
| P5 | Pendiente de una recurrencia archivada o finalizada (F101-8 iii) | Visible en «Por confirmar» y en el calendario, con su marca, y se puede resolver | §6.6 |
| P6 | **F101-19 (obligatoria):** el reemplazo compartido como candidato a un vínculo | Opción C: se permite y coexiste, con unicidad por contexto | §9 |

## Referencias

- `docs/JUNTIA_MASTER.md` §2.3, §5.1, §5.2, §5.4, §5.6, §7.3, §7.4, §15.4, §15.5,
  §15.7 y §15.10 (decisiones 16.13, 22.13, 22.15, 25.3, 28 y 29)
- `specs/007-recurrentes-calendario/spec.md`: Clarifications, «Precisiones de la
  revisión F101», «Compatibilidad de vínculos», «Estados y transiciones»,
  «Cuestiones que la tabla deja a ADR-a», FR-001 a FR-038a, FR-061, FR-076 a
  FR-078 y FR-090 a FR-092
- `docs/propuestas/analisis-planificacion-financiera.md` §6 (ADR-a) y §7.1
- ADR-001 · ADR-003 · ADR-007 · ADR-010 · ADR-011 · ADR-013 §2, §3, §4 y §6 ·
  ADR-015 §1, §3 y §5
- `specs/003-pareja-y-balances/spec.md`, Q15 (Deshacer de Mover a Pareja)
- `specs/005-gate-mvp-1/contracts/account-deletion.md`
- `supabase/migrations/` (revisadas el 25 de noviembre de 2026, sin cambios)
