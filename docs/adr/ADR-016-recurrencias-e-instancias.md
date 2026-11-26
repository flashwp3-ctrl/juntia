# ADR-016 — Recurrencias e instancias previstas: modelo de dominio y datos

**Estado:** **Propuesto** (25 de noviembre de 2026; ronda 2 tras la revisión F103 del PR #103). Es el candidato **ADR-a** del análisis (`docs/propuestas/analisis-planificacion-financiera.md` §6), con el número que le toca al abrirse (maestro §15.10, decisión 29.10). Se acepta antes de la etapa Plan de la spec 007 (`AGENTS.md` 17). No se implementa antes de declarar MVP-1 ni antes de que Planes (spec 006) esté aceptada (28.18, condición 6) · **Origen:** especificación 007 (`specs/007-recurrentes-calendario/spec.md`), «Cuestiones que la tabla deja a ADR-a», FR-005, FR-009b, FR-010, FR-012a, FR-014a, FR-017, FR-018a, FR-036 y FR-038a; maestro §15.10, decisiones 29.3, 29.5, 29.6 y 29.7 · **Alcance:** MVP-2

En este archivo `[P]` es una **propuesta** que necesita decisión de los
fundadores y `[V]` una **verificación pendiente** (maestro §15.9). Los nombres
de tablas y columnas son de la capa de datos y de trabajo: los nombres visibles
se deciden con los comps y entran en `docs/GLOSSARY.md` solo aprobados (spec 007,
Q2). Las fechas y los importes de los ejemplos son **ficticios**; los ejemplos
con fechas usan un año ficticio **no bisiesto**.

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
  (`transactions_income_private`). Las vistas `my_transactions` y
  `couple_expenses` solo devuelven movimientos activos.
- Mover a Pareja (`reclassify_to_shared`) anula el privado y le pone
  `moved_to_transaction_id`; el compartido nuevo lleva `moved_from_transaction_id`.
  Su Deshacer (`undo_reclassify_to_shared`) anula el compartido y crea un privado
  nuevo con `restored_from_transaction_id`. Solo lo puede hacer quien movió, con la
  versión 1, en 60 s y sin liquidaciones posteriores.
- `juntia_data.goal_ledger_entries`: el aporte es un asiento `contribution` con
  `member_user_id` = autor; su anulación es un asiento `void` con
  `voids_entry_id` (decisión 22.13).
- **Estados de una meta.** `active → completed`, `active → archived` y
  `completed → archived`. Además, **una meta archivada vuelve a `active`** cuando,
  en la misma transacción, se anula un asiento de uso: lo permite
  `goals_guard_transition` y lo hace el trigger `goal_void_reactivate`, con su
  evento `goal / reactivate` (spec 004, «Quitar el uso de la meta» y anular un
  gasto con meta). Una meta lograda no vuelve a `active`.
- Bloqueos de MVP-1: `lock_planning_goal` bloquea la pareja **antes** que la meta
  cuando la meta es compartida; `create_expense_with_goal` bloquea la pareja, crea
  y bloquea el gasto nuevo y después bloquea la meta.
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
2. **Ninguna vista ni función de métricas lee las tablas de este ADR.** Se
   comprueba de tres formas (`[V]` P1): `pg_depend` para las vistas; inspección del
   texto de **todas** las funciones (`pg_proc.prosrc`) de métricas, presupuestos,
   Balance, Análisis, metas y DEC-G04, porque `pg_depend` no ve las tablas citadas
   dentro de PL/pgSQL ni de SQL dinámico; y la invariancia de SC-001 con
   instancias en **todos** los estados.
3. **El único camino de lo previsto a lo real es confirmar** (§7), que llama a la
   misma escritura que Anotar o que el aporte manual. Lo real que resulta es
   idéntico a uno anotado a mano y cuenta como él; antes de confirmar no existe.
4. **Las tablas son controladas** (ADR-013 §2): guardan importes previstos y la
   lista de ADR-013 dice que ninguna tabla nueva con importes queda fuera. Se
   escriben solo por funciones `security definer` de `juntia_writer`, con
   idempotencia, bloqueo y auditoría.

### 2. Materialización: se calcula, y solo los **hechos** se guardan

**Elección: la opción (b) de Q3, precisada.** Una instancia se **calcula** a partir
de la regla, su calendario, sus versiones y su historial de pausas. Lo único que se
guarda de ella son **hechos**: decisiones de una persona o del sistema que el
cálculo no puede reproducir. Hay tres:

| Hecho | Qué es | Dónde se guarda |
| --- | --- | --- |
| **Omisión** | La persona dijo que esta vez no ocurre (también por adelantado, D3) | `skipped_at` de la instancia |
| **Cancelación** | La regla se finalizó a mano o se eliminó con historia (Q18, D6) | `cancelled_at` de la instancia |
| **Vínculo** | La instancia se confirmó o se vinculó, aunque después su movimiento se anule (D1) | Una fila en `recurring_occurrence_links` |

**Regla de los hechos.** El comportamiento de una instancia —su estado, su fecha,
su versión, si una pausa la consume, si una edición la cambia— depende **solo** de
sus hechos vigentes, **nunca de que exista o no una fila física**. La fila de
`recurring_occurrences` es solo el contenedor de los hechos. Una fila sin ningún
hecho vigente (por ejemplo, tras deshacer una omisión) se comporta exactamente
igual que una instancia sin fila: dos recurrencias iguales se comportan igual
aunque su historial de filas sea distinto. Así desaparecen las excepciones que
dependían de la fila (F103-4, F103-10).

Mientras una instancia tiene un hecho vigente, su **fecha prevista y su versión
quedan fijadas**: las que tenía cuando se registró el primer hecho vigente. Sin
hechos, se calculan (§3 y §4). Un vínculo nunca deja de ser un hecho: una
instancia que se confirmó una vez queda fijada para siempre, que es lo que pide D1
(«conserva su fecha prevista y su versión»).

Por qué no (a), materializar un horizonte:

- haría falta un proceso que genere filas cada día (no hay ninguno en el stack y
  añadiría infraestructura) o escribir al leer, que las lecturas por vistas
  `security_invoker` no admiten;
- cada edición de la regla tendría que reescribir filas futuras, y cada pausa
  borrarlas o marcarlas: más estados, más auditoría y más ocasiones de duplicar;
- el horizonte sería arbitrario: el calendario navega hacia delante sin límite
  (Q14).

Coste de (b): las lecturas calculan. Se acota así: la generación es aritmética de
fechas sobre un rango pedido, y las instancias con hechos se leen con un índice por
`(rule_id, position)`. Los umbrales de §15.7 se miden en el Plan (`[V]` P7).

**Dónde se calcula.** El calendario es una función **pura** (solo aritmética sobre
sus argumentos, sin leer tablas) en `juntia_private`, `immutable`, con `execute`
para `juntia_writer` y `authenticated`; no da acceso a ningún dato. Las funciones
que escriben la usan para validar (§7), y las lecturas de `public` la usan para
listar. El dominio en TypeScript tiene el mismo algoritmo, puro, para las vistas
previas y las pruebas de FR-090. Las dos implementaciones se prueban contra la
**misma tabla de casos** (`[V]` P2). Es el patrón de ADR-013 §6.2: el dominio
calcula y la función vuelve a comprobar.

### 3. Calendario, posiciones e identidad estable

#### 3.1 Identidad

La identidad de una instancia es **`(rule_id, position)`**: el número de la
ocurrencia en el calendario de la regla, 1, 2, 3… La posición:

- es la que numera «cuota n de N» (FR-035, FR-042);
- **cuenta también las posiciones consumidas por una pausa** (D5): una pausa no
  renumera nada;
- **nunca se reutiliza ni se renumera**: una edición de calendario cambia la fecha
  de las posiciones editables, no su número (§3.4).

`recurring_occurrences` tiene `unique (rule_id, position)`: dos filas para la
misma ocurrencia no pueden existir. Dos posiciones distintas sí pueden caer en la
misma fecha tras una edición de calendario con posiciones fijadas (§3.4): son dos
ocurrencias distintas, no un duplicado.

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
  del mes, y el día de referencia se conserva: 31 de enero → 28 de febrero → 31 de
  marzo (29 de febrero en un año bisiesto). Un anual del 29 de febrero cae el 28 en
  los años no bisiestos y el 29 en los bisiestos. `ref_day = 31` equivale a
  «último día del mes».
- **`day` y `week`.** `anchor + (n−1)·interval` días o semanas.
- **`once`.** Una sola posición, en `anchor_date`.
- Todas las fechas son `date` en `America/Bogota`, sin días hábiles ni festivos.
  «Hoy» es `(now() at time zone 'America/Bogota')::date`.
- **Fin por N.** Con `occurrence_count` = N, solo existen las posiciones 1 a N.
- **Fin por fecha.** Con `end_date`, solo existen las posiciones con fecha ≤
  `end_date`.

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

#### 3.4 Editar el calendario: segmentos con posiciones fijadas (Q6, 29.3; FR-005)

Una edición que solo cambia **datos** (importe, categoría, pagador, reparto,
nombre, certeza, condición) crea una versión nueva (§4) y **no toca el
calendario**.

Una edición que cambia el **calendario** (`unit`, `interval`, `ref_day`,
`semimonth_days` o la fecha de arranque) abre un **segmento** nuevo. Hecha el día
E:

1. **Corte.** **c** es la mayor posición cuya fecha (fijada o calculada) es ≤ E.
   Las posiciones 1 a c conservan el calendario anterior: ya llegaron (pendientes o
   resueltas), y Q6 dice que la edición no las toca.
2. **Posiciones editables.** Todas las posiciones > c **sin hechos vigentes** son
   previstas y reciben el calendario nuevo (Q6), incluidas las que tienen una fila
   sin hechos (§2). No se descarta ninguna: cambian de fecha.
3. **Posiciones fijadas.** Las posiciones > c **con hechos vigentes** (confirmadas
   o vinculadas antes de tiempo, omitidas por adelantado, reabiertas por D1,
   canceladas) conservan su número, su fecha y su versión. No desaparecen y no se
   mueven.
4. **Asignación por ranura.** El segmento nuevo genera las fechas s₁ < s₂ < … a
   partir de una fecha de arranque **a**. La posición c + k recibe la fecha sₖ. Si
   la posición c + k está fijada, conserva su fecha y la ranura sₖ **no se genera
   aparte**: la ocupa la posición fijada. Así, entre las posiciones editables y las
   fijadas, cada posición tiene exactamente una fecha, ninguna obligación desaparece
   y ninguna ranura se duplica.
5. La versión guarda `segment_start_position` = c + 1 y `segment_anchor_date` = a.
   La fecha de una posición sin hechos la da el segmento que la contiene; la de una
   fijada, su hecho.

**Contraejemplo de la revisión (F103-1), resuelto.** Mensual del día 10. El 20 de
enero, enero (posición 1) está pendiente, febrero y marzo son previstas y abril
(posición 4) está omitida por adelantado. Se pasa al día 20. c = 1 y a = 20 de
febrero. Febrero → 20 de febrero, marzo → 20 de marzo, abril sigue omitida el 10
de abril (la ranura del 20 de abril la ocupa ella) y la posición 5 es el 20 de
mayo.

Si la frecuencia cambia mucho (de mensual a semanal, por ejemplo), una posición
fijada puede quedar con una fecha fuera del orden de sus vecinas. Es correcto: su
fecha es un hecho, la posición sigue siendo un número de orden del calendario y el
calendario se lista por fecha.

**Fecha de arranque a** (F103-2). La regla depende de qué periodos ya están
cubiertos:

- **Límite inferior B.** B es el **comienzo del periodo** que contiene la fecha que
  la posición c + 1 tenía en el calendario anterior:
  - en `month`, el día 1 de ese mes;
  - en `semimonth`, el día 1 o el 16, según la mitad del mes;
  - en `week`, el lunes de esa semana;
  - en `day` y `once`, la propia fecha.

  Todo periodo anterior a B ya tiene su ocurrencia (la posición c o una anterior),
  y el periodo de B todavía no la tiene.
- **Por omisión, a es la primera fecha del calendario nuevo ≥ B.** Ejemplos:
  - del día 15 al 20, con la cuota del 15 de noviembre ya pendiente: B = 1 de
    diciembre y a = 20 de diciembre, sin un segundo noviembre;
  - del día 31 al 15, con enero ya llegado: B = 1 de febrero y a = 15 de febrero,
    sin perder febrero.
- **a puede ser ≤ hoy.** Solo puede ocurrir dentro del periodo en curso, así que
  como mucho una posición queda pendiente al instante. Es la obligación de ese
  periodo, que no estaba cubierta, y la vista previa lo dice («La de febrero pasa
  al 15 y queda por confirmar»).
- **Sin ninguna posición conservada** (c = 0: la regla aún no había llegado a su
  primera fecha), el segmento nuevo es el calendario nuevo desde la fecha de
  arranque que indique la persona, como al crearla. Las posiciones fijadas se
  respetan igual (punto 3).

**`[P]` P2 · Elegir otra fecha de arranque.** El servidor **nunca** acepta una a
< B: sería un periodo ya cubierto (el «segundo noviembre»). Opciones:

- (a) **recomendada**: la persona puede elegir una a **posterior** a la de por
  omisión. La vista previa nombra los periodos que se quedan sin ocurrencia
  («Diciembre no tendrá cuota»). Es una omisión explícita de periodos, no un
  borrado silencioso;
- (b) la fecha de arranque siempre es la de por omisión. Más simple, pero obliga a
  crear otra recurrencia cuando el cobro de verdad se aplaza.

En un compromiso de N ocurrencias, N sigue contando posiciones: si la edición
cambia la frecuencia, cambia la fecha de la última, y la vista previa lo dice.
Editar N o la fecha final es una edición explícita con versión; una pausa nunca los
cambia (D5).

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
| Sin hechos vigentes, con fecha d | La última versión con `effective_after` < d (o la 1). Una edición hecha el día E rige para las fechas > E: las pendientes (d ≤ E) conservan la suya (Q6, FR-004), y las previstas toman la nueva |
| Con hechos vigentes (omitida, cancelada, confirmada o reabierta por D1) | La fijada al registrar el primer hecho vigente. **Nunca cambia**, aunque su fecha sea futura (F101-4) |

Una omisión deshecha deja la instancia sin hechos: vuelve a la versión y a la fecha
calculadas, y una edición posterior la cambia como a cualquier prevista (Q6). Si se
vuelve a omitir, se fijan los valores de ese momento.

**Edición de la regla.** `recurring_rules.version` con `where version = $esperada`
(ADR-013 §3.5; US4.3). Dos ediciones simultáneas de una recurrencia compartida
nunca se sobrescriben en silencio.

**El contexto no es un dato editable** (F101-11): `owner_user_id`, `group_id`,
`kind` y, en aportes, `goal_id` viven en `recurring_rules`, no en la versión, y un
trigger los hace inmutables, como `transactions_guard_update`.

**Una regla finalizada (sola o a mano) o archivada no se edita.** La tabla de la
spec no le da salida, y editar N o la fecha final de una terminada sola la
reactivaría.

### 5. Estados de la instancia: cómo se representan (Q5; D1–D4)

El estado **no se guarda en una columna**: se **deriva** de los hechos (§2) en una
sola función, con esta precedencia. Así no hay dos fuentes que puedan
contradecirse, y una anulación hecha desde Actividad no necesita escribir en las
tablas de este ADR (§8).

| Orden | Condición | Estado |
| --- | --- | --- |
| 1 | Hecho de cancelación | **Cancelada** |
| 2 | Hecho de omisión | **Omitida** |
| 3 | Vínculo vigente y su **movimiento efectivo** está activo (§8) | **Confirmada** |
| 4 | Vínculo vigente y su movimiento efectivo está anulado económicamente | **Pendiente** (D1), aunque la fecha no haya llegado |
| 5 | Sin hechos y su fecha cae en un intervalo pausado (§6.2) | No existe: **posición consumida** |
| 6 | Sin hechos y la posición no pertenece al calendario vigente (después de N, después de `end_date`, o tras finalizar a mano o archivar) | No existe |
| 7 | Sin hechos y fecha ≤ hoy | **Pendiente** |
| 8 | Sin hechos y fecha > hoy | **Prevista** |

El paso 4 es la **representación de «pendiente de resolución» antes de su fecha**
(F101-4): la instancia conserva su vínculo vigente con un movimiento anulado, y la
vista lo expone como un indicador (`reopened`), no como un sexto estado. Ese
vínculo solo deja de ser vigente cuando la instancia se vuelve a confirmar o
vincular (§7.4). Por eso una reabierta que se omite y cuya omisión se deshace
vuelve a **pendiente**, no a prevista: D1 prevalece sobre la fecha y una edición
posterior no la reescribe. Los pasos 5 y 6 solo afectan a instancias **sin
hechos**: una pausa o el fin de la regla nunca hacen desaparecer una omitida, una
confirmada, una reabierta ni una cancelada.

**Los cuatro casos de F103-4:**

| Caso | Hechos | Pausa que cubre su fecha | Fin de la regla | Edición de calendario |
| --- | --- | --- | --- | --- |
| Prevista con una fila sin hechos (omisión deshecha) | Ninguno | Queda **consumida**, como si nunca hubiera tenido fila | No se genera | Recibe la fecha y la versión nuevas (Q6) |
| Omitida por adelantado | Omisión | Sigue **omitida**, no consumida. Deshacer sigue §6.4 | Sigue omitida | Conserva su fecha y versión |
| Confirmada por adelantado | Vínculo | Sigue confirmada. Si se anula su movimiento durante la pausa, pasa a **pendiente** (D1) y se puede resolver | Igual | Conserva su fecha y versión |
| Pendiente por D1 | Vínculo con movimiento anulado | Sigue **pendiente** y se puede confirmar, vincular u omitir, aunque la regla esté pausada | Sigue pendiente y resoluble (§6.6) | Conserva su fecha y versión |

**Columnas de `recurring_occurrences`** (de trabajo): `id`, `rule_id`, `position`,
`planned_date`, `rule_version_id`, `skipped_at`, `skipped_by`, `cancelled_at`,
`cancelled_by`, `cancel_reason` (`ended_manual | archived`), `created_at`,
`created_by`. `position` es inmutable. `planned_date` y `rule_version_id` solo
cambian cuando se registra un hecho en una fila que no tenía ninguno vigente.
`cancelled_at` se fija una vez y no vuelve, y `skipped_at` se pone y se quita (D3)
con auditoría. Un trigger rechaza cualquier otra transición (§12).

**Correspondencia con la tabla «Estados y transiciones» de la spec:**

| Fila de la spec | Mecanismo |
| --- | --- |
| — → Prevista; Prevista → Pendiente al llegar la fecha | Pasos 7 y 8: nada se escribe |
| Prevista → Prevista al editar | §3.4 y §4: fecha y versión calculadas |
| Pendiente → Pendiente al editar | §3.4 (posición ≤ c) y §4 (`effective_after` < d no se cumple) |
| Pendiente o Prevista → Confirmada | §7: vínculo; D2 exige fecha efectiva ≤ hoy |
| Confirmada → Pendiente por anulación económica, también tras una sustitución técnica | Paso 4; nada se escribe al anular (§8) |
| Confirmada → Confirmada por sustitución técnica | §8: el movimiento efectivo sigue la cadena de ADR-001 |
| Pendiente o Prevista → Omitida | Hecho de omisión |
| Omitida → Prevista o Pendiente | Se quita la omisión, con la precedencia de §6.4 |
| Prevista → no se genera al pausar | Paso 5: posición consumida |
| Pendiente → Pendiente al pausar, terminar sola o inactivarse la meta | Paso 7 (su fecha es anterior a la pausa) o paso 4 |
| Prevista o Pendiente → Cancelada | §6.3: hecho de cancelación |
| Confirmada, omitida o cancelada → sin cambio | Pasos 1 a 3: ninguna edición, pausa ni fin cambia un hecho |

### 6. Ciclo de vida de la recurrencia y pausas (D4–D7; F101-14, F101-15, F101-18, F101-21)

#### 6.1 Estado de la recurrencia

`recurring_rules.lifecycle` guarda solo lo que una persona decide: `open`,
`ended_manual` (con `ended_on`) o `archived` (con `archived_on`). El resto se
deriva:

| Orden | Condición | Estado |
| --- | --- | --- |
| 1 | `lifecycle = archived` | **Archivada** |
| 2 | `lifecycle = ended_manual` | **Finalizada · a mano** |
| 3 | **Fin por N:** la fecha de la posición N es ≤ hoy | **Finalizada · sola**, también si estaba pausada (F101-15) |
| 3 | **Fin por fecha:** hoy > `end_date` | **Finalizada · sola**, también si estaba pausada |
| 3 | **Una sola fecha:** su fecha es ≤ hoy | **Finalizada · sola** |
| 4 | Tiene una pausa abierta | **Pausada** |
| 5 | En otro caso | **Activa** |

**El agotamiento de N y el cumplimiento de la fecha final son condiciones
distintas** (F103-2). Un compromiso mensual del día 10 con fecha final el 31 de
enero tiene una sola posición, el 10 de enero, pero sigue **activo** hasta el 31 y
pasa a finalizada · sola el 1 de febrero: hasta entonces se puede pausar o editar
como cualquier otro. Con N, en cambio, termina el día de su última posición: ya no
queda ninguna que generar.

La terminación automática **no escribe nada** y no depende de ningún proceso: es
un hecho del calendario. Por eso no puede «olvidarse» de ocurrir, y una terminada
sola no se puede reanudar. No cancela ni oculta las pendientes anteriores (Q13).

#### 6.2 Historial de pausas

`recurring_rule_pauses`: `id`, `rule_id`, `started_on`, `ended_on` (nulo mientras
dure), `reason` (`manual | goal_inactive`), `created_by`, `ended_by`, con
`created_at` y `ended_at`.

- **Intervalo pausado:** una fecha d cae en la pausa si **`started_on` < d** y
  (**`ended_on` es nulo o d < `ended_on`**). La fecha del propio día de la pausa no
  cae: ese día la instancia ya era pendiente y se conserva (Q18). La del día de la
  reanudación tampoco: desde ese día la regla vuelve a generar. Pausar y reanudar
  el mismo día deja un intervalo vacío.
- **Una sola pausa abierta** por regla (índice único parcial) y sin solapes: una
  pausa nueva empieza en o después del fin de la anterior.
- **Solo inserción**, salvo fijar `ended_on` una vez (§12). El historial es la
  **trazabilidad** que piden D5 y F101-18: el estado de una posición depende de él,
  no del estado actual de la regla.
- `reason = goal_inactive` es la pausa de un aporte programado cuya meta pasa a
  lograda o archivada (D7). **Cómo y quién la escribe lo fija ADR-d** (§10).
- **Reanudar** exige una acción explícita de la dueña o de un integrante en una
  compartida, quedar posiciones y, en aportes, una meta **activa** en ese momento.
  Una meta archivada que vuelve a `active` (por `goal_void_reactivate`) **no
  reanuda** la recurrencia: su dueña la puede reanudar de forma explícita si la
  meta está activa y quedan posiciones (F103-5).

#### 6.3 Posiciones consumidas, finalizar, archivar y eliminar

Tres cosas distintas, que no se mezclan (F103-12):

| Qué | Cuenta para N | Tiene instancia | Ejemplo |
| --- | --- | --- | --- |
| **Posición del calendario** | Sí | Depende de lo de abajo | Toda posición 1…N |
| **Posición consumida** | Sí | **No**: sin hechos y con su fecha en un intervalo pausado | El 10 de febrero de §6.4, si nadie la tocó |
| **Instancia omitida** | Sí | Sí, con su hecho de omisión, aunque su fecha caiga en una pausa | El 10 de mayo del caso d de §6.4 |

- **Las posiciones consumidas no se materializan** (D5; F101-15): ni como canceladas
  ni como ninguna otra cosa. Se derivan del calendario y del historial de pausas,
  que no cambian. El detalle de un compromiso puede enumerarlas («2 ocurrencias no
  generadas por la pausa del …») sin presentarlas nunca como cuotas pagadas ni como
  pendientes. **Por qué no materializarlas como canceladas:** «cancelada» significa
  en la spec «la regla se finalizó o se eliminó»; mezclarlas confundiría dos hechos
  distintos y obligaría a escribir al pausar.
- **Antes de pausar un compromiso de duración definida** (FR-038a), una función de
  vista previa calcula las posiciones que caerían en la pausa si se reanudara en
  una fecha dada, y la fecha de la última, que no cambia. El texto es de los comps.
- **Finalizar a mano** (Q18, FR-007) y **eliminar con historia** (D6, FR-076). En
  una transacción, la función fija `lifecycle` y registra el hecho de cancelación
  en todas las instancias **sin resolver**: las pendientes por fecha (sin hechos),
  las reabiertas por D1 y, según P3, las previstas. La confirmación previa lista
  exactamente esas instancias, y la función las recibe con la precondición de §7.1.
  Si la lista cambió, falla con conflicto.
- **«Con historia»** significa que la regla tiene alguna fila en
  `recurring_occurrences` o en `recurring_occurrence_links`. Esas filas solo se
  crean al registrar un hecho y la app nunca las borra, así que la condición no
  cambia con el tiempo. **Sin historia**, eliminar borra la regla con sus
  versiones y pausas (§12). Las pendientes calculadas desaparecen con ella porque
  nunca fueron reales.

**`[P]` P3 · Previstas al finalizar a mano o eliminar con historia.** La spec dice
«Prevista → Cancelada». Cancelar es registrar un hecho por instancia, y cuántas
previstas hay depende del tipo de compromiso:

| Tipo | Previstas restantes |
| --- | --- |
| Con N posiciones | Finitas: hasta N |
| Con fecha final | Finitas: hasta `end_date` |
| Sin fin | Infinitas |

- (a) **recomendada**: en los compromisos **con N o con fecha final**, se registra
  la cancelación de **todas** las previstas restantes; la confirmación las lista
  («Se cancelan las cuotas 7 a 12»). **Sin fin**, dejan de generarse sin
  materializarse, y la confirmación dice «No se crearán más desde el …». Cumple la
  spec al pie de la letra donde es finito, y no inventa un horizonte donde no lo
  es;
- (b) en todos los casos, dejan de generarse sin materializarse. Es la propuesta de
  la ronda 1. Más simple, pero en un compromiso con N las cuotas restantes no se
  ven como canceladas;
- (c) en todos los casos se cancelan las del horizonte por omisión del calendario
  (este mes y el siguiente), y en los finitos, todas. Añade un horizonte arbitrario
  a la regla sin fin.

Con (a) y (c), la spec ya se cumple. **Con (b), o en la parte sin fin de (a), la
spec 007 se reconcilia antes de Plan** (consecuencias).

#### 6.4 Deshacer una omisión: precedencia (D3, D4, D5; F101-14, F101-18, F101-21)

Deshacer quita el hecho de omisión. Se calcula primero **la fecha que tendría la
instancia sin ese hecho**: la fijada, si conserva otro hecho (un vínculo, D1); si
no, la calculada con el calendario vigente (§2). Después se evalúa, en este orden,
y se detiene en la primera que se cumple:

1. **La recurrencia está finalizada a mano o archivada** → **no disponible**. No la
   reactiva, y lo cancelado sigue cancelado (D4). La interfaz lo dice antes de
   ofrecer la acción.
2. **Esa fecha cae en cualquier intervalo pausado** del historial, pasado o vigente
   (§6.2) → **no disponible**: la instancia sigue omitida (D5; F101-14, F101-18).
   Lo decide el historial de la posición, no el estado actual de la regla: vale
   aunque ya se haya reanudado o haya terminado sola.
3. **En otro caso**, se quita la omisión. Una reabierta por D1 vuelve a
   **pendiente** (§5, paso 4). Sin otros hechos, la instancia vuelve a **prevista o
   pendiente según su fecha** (D3), con la versión calculada (§4).

Una recurrencia terminada sola llega al paso 3 si la fecha no cayó en una pausa
(D4: con la terminación automática sí está disponible). Una recurrencia pausada
llega al paso 3 con una fecha anterior al inicio de **todas** sus pausas o entre
dos de ellas, y la instancia queda pendiente (F101-14). La precedencia no añade
estados ni transiciones a la tabla de la spec: ordena filas que ya existen.

**Representación de F101-14:** «no se reintroduce» es **no disponible**. La
instancia conserva su omisión y su historia, y la interfaz explica por qué. Quitar
la omisión la convertiría en una posición consumida, que desaparece: se prefiere
que la persona siga viendo lo que decidió.

**Caso de prueba A, con dos pausas** (dominio y pgTAP; año ficticio no bisiesto).
Recurrencia mensual del día 10, abierta, sin fin, que empieza el 10 de enero.

- Pausa 1: del 1 de febrero al 1 de marzo (intervalo: 2 a 28 de febrero). La
  posición 2, el 10 de febrero, cae en ella.
- Pausa 2: desde el 20 de abril, abierta (intervalo: desde el 21 de abril).

| Paso | Posición | Historia | Cuándo se deshace | Regla que decide | Resultado esperado |
| --- | --- | --- | --- | --- | --- |
| a | 1 · 10 de enero | Omitida el 12 de enero | 2 de mayo (regla pausada) | 3 | **Pendiente**: anterior a las dos pausas (F101-14) |
| b | 2 · 10 de febrero | Omitida por adelantado el 25 de enero, antes de la pausa 1 | 2 de mayo | 2 (pausa 1, ya terminada) | **No disponible**, sigue omitida (F101-18) |
| c | 4 · 10 de abril | Omitida el 11 de abril | 2 de mayo | 3 | **Pendiente**: entre las dos pausas, anterior a la 2 |
| d | 5 · 10 de mayo | Omitida por adelantado el 15 de abril, antes de la pausa 2 | 2 de mayo | 2 (pausa 2, vigente) | **No disponible** |
| e | — | Se reanuda el 1 de junio (pausa 2: 21 de abril a 31 de mayo) | — | — | La posición 6, el 10 de junio, se genera. La 5 **sigue omitida** (tiene hecho), no consumida |
| f | 5 · 10 de mayo | La de d | 5 de junio (regla activa) | 2 (pausa 2, ya terminada) | **No disponible** (F101-18) |
| g | 6 · 10 de junio | Omitida por adelantado el 2 de junio | 5 de junio | 3 | **Prevista**: su fecha no llegó y no cae en ninguna pausa (D3) |
| h | 4 · 10 de abril | Omitida otra vez el 6 de junio; la regla se finaliza a mano el 7 | 8 de junio | 1 | **No disponible** (D4), aunque por fecha sería pendiente |

La posición 3 (10 de marzo) no se toca: es pendiente desde el 10 de marzo.

**Caso de prueba B, terminación automática durante una pausa** (independiente del
A). Mensual del día 10, N = 5 (enero a mayo), con las mismas dos pausas y las mismas
omisiones a, b, c y d, sin reanudar nunca la pausa 2.

| Comprobación | Resultado esperado |
| --- | --- |
| Estado el 9 de mayo | **Pausada** (queda la posición 5) |
| Estado el 10 de mayo | **Finalizada · sola**, aunque la pausa 2 siga abierta (F101-15) |
| Reanudar el 11 de mayo | No disponible: no quedan posiciones |
| Deshacer a el 11 de mayo | **Pendiente** (regla 3; D4 permite deshacer con la terminación automática) |
| Deshacer d el 11 de mayo | **No disponible** (regla 2) |
| «Cuota n de N» de la posición 5 | 5 de 5, omitida; nunca se presenta como pagada |

**Casos límite** para la tabla compartida de SQL y TS (`[V]` P2):

- una posición en el día de inicio de una pausa: **no** cae en ella;
- una posición en el día de la reanudación: **se genera**;
- pausar y reanudar el mismo día: intervalo vacío, nada consumido;
- una posición el día después del inicio: consumida.

#### 6.5 Recuperación manual excepcional `[P]` P4 (F101-18)

**Recomendación: no existe en v1.** Una posición consumida no se recupera. Si la
obligación de ese periodo sigue existiendo:

- **Anotar** registra el movimiento real cuando se paga, pero **no recupera por sí
  solo** la obligación consumida: no hay ninguna instancia que vincular;
- para tenerla en el calendario como obligación por confirmar, la persona crea una
  **recurrencia de una sola fecha** (Q11), que sí la representa.

Así D5 se mantiene sin excepciones: una pausa nunca recupera nada, y nada consumido
se confunde con una cuota pendiente. La alternativa, si los fundadores la quieren,
sería una acción distinta de reanudar, sobre una sola posición consumida, que
registra un hecho nuevo («recuperada») y la deja pendiente con auditoría, sin
cambiar N ni la fecha final. Añadiría un cuarto tipo de hecho y una fila a la tabla
de estados de la spec, que habría que reconciliar.

#### 6.6 Pendiente de una recurrencia archivada o finalizada a mano `[P]` P5 (F101-8 iii)

Una instancia confirmada de una recurrencia ya archivada (o finalizada a mano)
cuyo movimiento se anula económicamente vuelve a pendiente (D1, paso 4 de §5).

**Recomendación:** se muestra en «Por confirmar» y en el calendario, en su fecha
prevista, con una marca de «recurrencia archivada» (o «finalizada»), y en el
detalle de la recurrencia. Se puede **confirmar, vincular u omitir**, porque es una
obligación real sin resolver. Las funciones de §7 lo permiten porque **validan la
instancia por sus hechos, no por si la regla sigue generando**: la operación no
reactiva la regla ni genera ninguna otra posición. Si se omite, esa omisión no se
puede deshacer (D4, regla 1 de §6.4), y la interfaz lo dice **antes** de omitir.

La alternativa es mostrarla solo en el detalle de la recurrencia archivada, que la
esconde justo cuando hay algo que resolver.

### 7. Operar sobre una instancia: precondición, confirmar y vincular (Q4, 29.2; F101-1, F101-5, F101-6, F101-17)

#### 7.1 Precondición común: la instancia que vio la persona (F103-3)

**Toda** operación sobre una instancia lleva la identidad de lo que la persona vio,
y el servidor la comprueba **bajo el bloqueo** (§14), antes de escribir nada. Es la
misma regla para todas, no solo para el toque único:

- confirmar con un toque o desde el borrador de Anotar;
- vincular, desde una sugerencia o desde la búsqueda manual;
- omitir y deshacer la omisión;
- la lista de una finalización a mano o de una eliminación con historia.

La identidad esperada es `(rule_id, position, planned_date, version_no)`. Bajo el
bloqueo, la función recalcula la instancia y exige que la posición, la fecha
prevista y la versión **sigan siendo las mismas**. Si no, falla con
`occurrenceChanged`, no escribe nada (ni el movimiento, ni el vínculo, ni la
idempotencia como completada) y la interfaz ofrece volver a abrirla con los datos
nuevos.

Ejemplo: Ana abre Anotar desde la posición 5 (10 de febrero). Beto edita el
calendario de la recurrencia compartida, y la posición 5 pasa al 20 de febrero.
Ana guarda el borrador: el servidor rechaza la operación completa. No se crea el
gasto ni se vincula nada.

Las operaciones de ciclo de vida (pausar, reanudar, finalizar, archivar, editar)
llevan además `recurring_rules.version` esperada. La forma del token (campos
sueltos o un resumen firmado) la fija el Plan.

#### 7.2 Toque único o borrador

El servidor solo acepta el **toque único** (confirmar con los datos de la versión,
sin borrador) cuando la versión de la instancia tiene **importe fijo** y, si es un
ingreso, **certeza fija** (FR-012; F101-17). En un ingreso fijo, la petición
incluye el importe mostrado y la función comprueba que coincide (confirmación
explícita, Q4). En cualquier otro caso —rango, importe desconocido, ingreso
condicional aunque su importe previsto sea conocido— la confirmación llega desde
el borrador de Anotar, con los campos que la persona guardó.

#### 7.3 Confirmar

Una función por tipo de recurrencia, que en una sola transacción:

1. registra la idempotencia (ADR-013 §3.1);
2. **autoriza la regla**: quien llama la puede ver (RLS) y, en una privada, es su
   dueña. Si no, el mismo error que una regla inexistente;
3. bloquea en el orden de §14;
4. **valida la elegibilidad antes de materializar nada:** recalcula la instancia,
   comprueba la precondición de §7.1 y exige que el estado derivado sea **prevista
   o pendiente** (pasos 4, 7 y 8 de §5). Una posición consumida, fuera del
   calendario o ya resuelta no es elegible. Si ya está confirmada —por ejemplo, la
   otra persona confirmó antes la misma instancia compartida—, falla con
   `occurrenceAlreadyResolved` sin escribir nada (US4.4). Una reabierta por D1 es
   elegible aunque la regla esté pausada, finalizada o archivada (§6.6);
5. comprueba que la fecha efectiva es **≤ hoy** (D2, F101-5) y, en aportes, la
   regla de la 004 (FR-040) y que la meta esté activa;
6. crea el movimiento **llamando a la misma función que escribe** un gasto, un
   gasto compartido, un ingreso, un gasto con meta (28.10) o un aporte manual,
   con una clave de idempotencia derivada de la suya de forma determinista. Así el
   movimiento, su auditoría y su efecto en las cifras son idénticos a los de uno
   anotado a mano (FR-071, FR-031, F101-2);
7. **solo entonces** materializa la fila de la instancia si no existía
   (`insert … on conflict do nothing`), fijando su fecha y su versión, e inserta el
   vínculo (§7.5) y su auditoría (§12).

Si cualquier paso falla, **todo revierte**: el movimiento, la idempotencia interior
y la exterior, la fila y el vínculo (`[V]` C2). Reintentar con la misma clave
devuelve el mismo resultado sin crear nada (FR-013). Dos personas con claves
distintas sobre la misma instancia se ordenan por el bloqueo de la regla, y la
segunda recibe el error del paso 4.

#### 7.4 Vincular un movimiento ya anotado

La función de vincular, en este orden:

1. **autoriza la instancia solicitada antes de mirar ningún candidato**: quien
   llama ve la regla y, en una privada, es su dueña. Si no, el mismo error que una
   regla inexistente;
2. bloquea en el orden de §14, incluido el movimiento candidato;
3. revalida bajo el bloqueo la precondición de §7.1 y la elegibilidad de §7.3,
   paso 4;
4. valida el candidato, y falla con un error único `linkNotAllowed` en los pasos
   (b) a (e):
   - (a) el movimiento existe **y quien llama lo puede ver** (RLS). Si no, el mismo
     error que un movimiento inexistente;
   - (b) **mismo tipo**: gasto con gasto, ingreso con ingreso, aporte con aporte;
   - (c) **mismo contexto**. En una instancia privada, un movimiento privado cuyo
     dueño es el dueño de la regla, que es quien llama. En una compartida, un gasto
     compartido del mismo grupo, anotado por cualquiera de los dos. En un aporte
     programado, un asiento `contribution` de la **misma meta** cuyo
     `member_user_id` es el dueño de la regla, que es quien llama;
   - (d) el movimiento está **activo** (no anulado; en aportes, sin asiento
     `void`) y su fecha es **≤ hoy** (D2);
   - (e) el movimiento **no cumple ya otra instancia del mismo contexto** (§9, regla
     1). No tiene un vínculo ordinario (índice único, §7.5). En una instancia
     privada, tampoco es el movimiento efectivo de otra instancia privada de quien
     llama a través de la trazabilidad de §8. Para comprobarlo se recorre la
     cadena **completa** hacia atrás (`restored_from_transaction_id` y
     `moved_from_transaction_id`) con las filas bloqueadas: el índice único de
     `transaction_id` no impide reutilizar un sucesor de la cadena (F103-8).

**Por qué este orden no revela nada** (F101-2). El paso (e) solo se alcanza con un
movimiento compatible, y un movimiento compatible solo puede estar vinculado a una
instancia que quien llama también ve: la suya propia, o una compartida. La
trazabilidad privada de la otra persona nunca entra en la comprobación (§9).

Categoría, fecha e importe **nunca** se comprueban al vincular: son solo
heurísticas para sugerir (F101-1). La fecha efectiva no se copia al vínculo: se lee
del movimiento, que es su única fuente (FR-016). Si después alguien edita el
movimiento (fecha, importe, categoría), el vínculo no cambia y la edición no se
bloquea (F101-3).

#### 7.5 El vínculo ordinario

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

#### 7.6 Algoritmo de sugerencias y búsqueda manual (F101-1)

Una función de lectura `security invoker`, con la sesión de quien consulta, que
primero autoriza la instancia (como §7.4, paso 1) y después:

1. **Filtro duro**, con las comprobaciones de §7.4, escritas como filtros
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

Cada sugerencia lleva la identidad esperada de la instancia (§7.1), y vincular la
revalida bajo el bloqueo: una sugerencia que quedó abierta mientras la regla
cambió falla con `occurrenceChanged`. El Plan puede ajustar w y el número de
sugerencias con evidencia; el filtro duro y el orden determinista no se cambian
sin revisar este ADR.

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

La cadena puede tener varias conversiones y restauraciones seguidas (mover,
deshacer, mover otra vez…). El recorrido tiene un **límite defensivo** de pasos
(64) contra ciclos: si se alcanza, la función falla con un error interno en lugar
de dar un estado, y la prueba lo cubre (`[V]` P5). El movimiento efectivo de un
vínculo a un **gasto compartido**, a un **ingreso** o a un **aporte** es el propio
movimiento vinculado: no hay cadena, porque solo un gasto privado se mueve.

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
  (FR-014, F101-19): no ocupa la clave única de §7.5 ni el índice de vínculo
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
(§7.3, paso 4), la recurrencia sigue privada y el vínculo nunca pasa a otro
contexto: sigue apuntando a T1.

**Lo que Beto ve.** T2 es un gasto compartido normal. Ninguna vista compartida
tiene columnas de este ADR; las funciones de editar, anular o liquidar T2 no leen
las tablas de recurrencias, así que ningún error ni bloqueo depende de ellas. Las
vistas compartidas ya ocultan `moved_from_transaction_id` a quien no movió
(`shared_payload`). Beto no puede descubrir la recurrencia a través de T2 (F101-2).

### 9. F101-19 (obligatoria): el reemplazo compartido como candidato a un vínculo posterior `[P]` P6

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
| **C. Permitir y coexistir (recomendada)** | **Sí, por contexto** | **Sí** | **Sí** | Un mismo gasto real cumple una instancia privada de Ana (por trazabilidad) y una compartida (por vínculo ordinario). Son obligaciones independientes (abajo) |
| D. Bloquear Mover a Pareja de un gasto vinculado | Sí | Sí | Sí | Contradice F101-3: ninguna función de MVP-1 se bloquea por un vínculo |

**Recomendación: C.** Distingue tres niveles de unicidad, que no son lo mismo:

1. **Unicidad del vínculo ordinario.** Un movimiento tiene como mucho un vínculo
   ordinario en toda su historia, y una instancia como mucho uno vigente (§7.5). La
   impone la base de datos.
2. **Unicidad por contexto del movimiento efectivo.** Un movimiento es el movimiento
   efectivo de como mucho **una instancia por contexto**. Puede ser a la vez el
   final de la trazabilidad de una instancia privada y el vínculo ordinario de una
   compartida, nunca de dos instancias del mismo contexto. La imponen §7.5 y el
   recorrido completo de la cadena bajo bloqueo de §7.4 (e).
3. **Obligaciones independientes, con resoluciones independientes.** La instancia
   privada de Ana y la compartida son **dos obligaciones distintas** para el
   sistema, aunque las dos personas sepan que son la misma deuda del mundo real. C
   **no las deduplica entre contextos**, y no puede hacerlo sin reintroducir la
   fuga de F101-19: para saber que son la misma, el sistema tendría que relacionar
   la instancia compartida con la privada de Ana.

Reglas de C:

- **El vínculo de T2 se valida como cualquier otro** (§7.4), y la trazabilidad
  privada de Ana no interviene ni en la validación, ni en las sugerencias, ni en
  los errores. El resultado es el mismo lo haga Beto o Ana.
- **Integridad.** No se crea ningún gasto, y T2 sigue siendo el único movimiento
  activo de cada instancia. Las instancias no son métricas (FR-011), así que
  ninguna cifra cuenta dos veces.
- **Anulación económica de T2.** Las dos instancias vuelven a pendiente (D1) y cada
  una se resuelve por separado. **Riesgo aceptado con C:** si las dos personas
  entienden que son la misma obligación, cada una podría reponerla por su lado y
  registrar dos pagos reales. Es el mismo riesgo que existe hoy si dos personas
  anotan el mismo gasto a mano. Lo mitigan el copy (solo para Ana, el detalle de su
  instancia dice que el gasto que la cumplía se anuló) y las sugerencias de
  vínculo, que ofrecen el pago ya anotado antes de crear otro. No lo elimina.
- **Deshacer de Ana después del vínculo de Beto** (60 s, versión 1, sin
  liquidaciones; no hay otro caso). La instancia privada de Ana sigue confirmada
  con T3. La compartida vuelve a **pendiente**, porque su movimiento efectivo es
  T2 —sin cadena, §8— y está anulado: para el contexto compartido, el gasto salió
  de él. **Esto no es una consecuencia de D1** (que habla de la anulación
  económica): es parte de la opción C y **se aprueba con ella**. El vínculo de Beto
  no es una operación dependiente que bloquee el Deshacer (ADR-001 punto 6; spec
  003, Q15; F101-3).
- **Solo para Ana**, el detalle puede indicar que el gasto también cumple su
  recurrencia privada. A Beto nunca se le dice nada.

Las opciones A, B y D quedan descartadas por las razones de la tabla.

### 10. Aportes programados: lo que fija este ADR y lo que deja a ADR-d

Este ADR fija para los aportes lo mismo que para el resto:

- la regla `kind = goal_contribution` es siempre de su dueña (`owner_user_id`
  obligatorio, `group_id` nulo), con `goal_id` inmutable, también en una meta
  compartida (Q12);
- la compatibilidad de §7.4 (misma meta, mismo aportante, asiento `contribution`
  sin `void`);
- el vínculo a `goal_entry_id` y la vuelta a pendiente por un asiento `void` (D1),
  sin cadena;
- que confirmar un aporte **nuevo** exige la meta activa y se revalida en la misma
  transacción, después de bloquear la pareja (si la meta es compartida) y la meta
  (§14). Con ese orden, los tres casos de US6.6 salen del orden efectivo: el aporte
  confirmado antes de lograr la meta es válido; la confirmación posterior falla con
  el error de meta no abierta de la 004 y la instancia sigue pendiente; archivar
  después sigue sus propios requisitos (22.15);
- que una meta archivada que vuelve a `active` no reanuda la recurrencia (§6.2).

**ADR-d fija** (sin modificar ADR-010 ni las transiciones de Metas):

- cómo se escribe la pausa `goal_inactive` al lograr o archivar la meta (D7). Dos
  límites:
  - **no puede dar a `juntia_writer` acceso general a las recurrencias privadas**:
    la otra persona, al lograr o archivar una meta compartida, no puede leer ni
    escribir libremente las reglas privadas de Ana;
  - **la operación de Metas no puede revelar su existencia** por errores,
    bloqueos, tiempos ni resultados distintos;
- qué ocurre con la recurrencia cuando la meta se reactiva por
  `goal_void_reactivate`, sin tocar esa transición;
- el modo de financiación del aporte confirmado;
- la revalidación completa de F101-7 y F101-16;
- la cuestión de 29.8 (vincular un aporte histórico a una meta inactiva), que
  sigue **abierta**. Este ADR no la decide: §7.4 no incluye ninguna condición sobre
  el estado de la meta al **vincular**, y ADR-d o los fundadores la añaden o la
  descartan. Confirmar un aporte **nuevo** en una meta inactiva sigue prohibido en
  cualquier caso.

### 11. Seguridad: tablas controladas, RLS y privacidad de la existencia (F101-2)

**Tablas** (en `juntia_data`, controladas, RLS activada, sin privilegios de
escritura para `authenticated`; ADR-013 §2):

| Tabla | Qué guarda |
| --- | --- |
| `recurring_rules` | Identidad y contexto inmutables (`kind`: `expense`, `income` o `goal_contribution`; `owner_user_id` **XOR** `group_id`; `goal_id`), `lifecycle`, `version`, `created_by`, fechas |
| `recurring_rule_versions` | Datos y calendario de cada versión (§3, §4). Solo inserción |
| `recurring_rule_pauses` | Historial de pausas (§6.2) |
| `recurring_occurrences` | Contenedor de los hechos de omisión y cancelación, con la fecha y la versión fijadas (§2, §5) |
| `recurring_occurrence_links` | Vínculos ordinarios (§7.5) |

**Invariantes en la base de datos**, no solo en las funciones:

- `check`: un ingreso o un aporte programado nunca tiene `group_id` (28.9, Q12);
  `goal_id` sí y solo sí `kind = goal_contribution`; un importe desconocido solo en
  un ingreso condicional; un rango con mínimo < máximo; los días de la quincenal
  (§3.3); `end_date` y `occurrence_count` no a la vez;
- trigger de inmutabilidad del contexto (§4);
- trigger de **compatibilidad del vínculo**, que repite §7.4 (b) y (c) —tipo,
  contexto, meta y aportante— con los datos de la regla y del movimiento, como el
  de ADR-015 §3: aunque una función tenga un error, un vínculo incompatible no
  entra (SC-007);
- la protección del borrado de §12.

**RLS.** Una regla se lee si `owner_user_id = auth.uid()` o si quien lee es
integrante activo de `group_id` (`is_couple_member`, como las metas). Las demás
tablas se leen si se puede leer su regla. `juntia_writer` tiene sus propias
políticas para validar, bloquear y escribir (ADR-013 §2).

**Lecturas sin privilegios nuevos.** `authenticated` sigue **sin `usage` sobre
`juntia_data`** (ADR-013 §2.1). Las lecturas de `public` son vistas
`security_invoker`, o funciones `security invoker` con **cuerpo SQL estándar**
(`begin atomic` o `return`), que se resuelven al crearlas como la auxiliar
`current_uid` (nota de ADR-013 del 4 nov 2026). La función pura de calendario
(§2) es la única de `juntia_private` que recibe `execute` para `authenticated`
además de las auxiliares que ya lo tienen. Si un cuerpo estándar no basta para
alguna lectura, el Plan lo resuelve con una vista, nunca concediendo `usage` sobre
`juntia_data` (`[V]` C3).

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
   tiene que cumplir esto también (§10).
3. **El movimiento creado al confirmar es idéntico al manual** (§7.3, paso 6):
   mismas columnas, misma auditoría visible, misma idempotencia de la escritura de
   dinero. La procedencia solo vive en las tablas de este ADR y en su auditoría
   privada (§12). Es la prueba de equivalencia de 29.9 (`[V]` P4).
4. **Errores**: una regla o una instancia que quien llama no ve da el mismo error
   que una inexistente; los rechazos de vínculo siguen §7.4.
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
- **Privilegios de `juntia_writer`:** `insert` en las cinco tablas; `update` por
  columnas (`lifecycle` y sus fechas; `ended_on` y `ended_by` de una pausa;
  `skipped_*`, `cancelled_*`, `planned_date` y `rule_version_id` de una instancia;
  `superseded_at` de un vínculo); **`delete` solo sobre `recurring_rules`**; ningún
  `delete` sobre las otras cuatro.
- **Triggers de transición** en las cuatro tablas hijas: rechazan cualquier
  `update` fuera de las transiciones permitidas (versiones: ninguna; pausas:
  `ended_on` una vez; vínculos: `superseded_at` una vez; instancias: §5) y
  cualquier `delete`, salvo cuando corre como **dueño de la tabla**, que solo
  ocurre en una cascada desde `recurring_rules` y en el borrado administrativo de
  cuenta.
- **Protección en la raíz** (F103-7). Un trigger `before delete` en
  `recurring_rules` rechaza el borrado de una regla **con historia** (§6.3) para
  cualquier rol distinto del dueño de la tabla. Así `juntia_writer` no puede
  borrar una regla con historia aunque lo intente por SQL directo, se salte la
  función y la cascada deje pasar los triggers hijos: el borrado se para antes de
  llegar a la cascada. Es la regla de ADR-013 §2.4: las invariantes no dependen
  solo de las funciones.
- **Vía administrativa explícita.** El único camino que borra reglas con historia
  es el borrado manual de cuenta de la 005, que corre como dueño de las tablas, con
  su manifiesto, sus aprobaciones y su auditoría (§13).
- **Compatibilidad con la nota del 18 de noviembre de 2026** (ADR-007, ADR-010 y
  ADR-013; decisión 25.3), que suspende por nombre solo cinco triggers. Con la
  excepción del dueño, el procedimiento **no debería** necesitar suspender ninguno
  de los nuevos. **No está demostrado:** lo decide la `[V]` C1, ensayada en
  `juntia-dev` **antes de cerrar el Plan**. Si resulta que hace falta suspender
  alguno, o que la excepción del dueño no se comporta como se espera dentro de una
  cascada, el Plan **no** amplía la lista por su cuenta: se escribe una nota de
  compatibilidad en este ADR y en los tres afectados, y se revisa antes de
  implementar.
- **Índice nuevo en una tabla de P0:** `transactions(restored_from_transaction_id)
  where restored_from_transaction_id is not null`, para recorrer la cadena de §8.
  No cambia ninguna fila, restricción, trigger ni función de `transactions`.

### 13. Exportación y borrado (Q18; FR-078)

**Exportación** (§15.5, JSON + CSV), con la sesión y la RLS de quien exporta y
proyección explícita, como la de hoy (sin UUID internos, importes como texto):

- las reglas que ve (las suyas y las compartidas), con su contexto, su estado
  derivado y sus versiones;
- su historial de pausas;
- **las instancias**:
  - todas las de fecha ≤ fecha de exportación;
  - todas las que tienen hechos;
  - las previstas calculadas hasta el **último día del mes siguiente** al de la
    exportación, que es el horizonte por omisión del calendario (Q14).

  Cada una lleva su estado derivado, su posición, su fecha y su versión. Más allá
  de ese horizonte, las previstas se reconstruyen con la regla, que también se
  exporta;
- **los vínculos vigentes**, como referencia al movimiento exportado en la misma
  colección de gastos, ingresos o aportes. Para una instancia privada con
  sustitución técnica, la referencia es al movimiento efectivo (T2 o T3), que
  también está en la exportación de quien exporta;
- **una colección histórica aparte** (F103-9) para los vínculos cuyo movimiento ya
  no está activo: los de las instancias reabiertas por D1 y los marcados con
  `superseded_at`. Las colecciones de movimientos reales siguen saliendo de
  `my_transactions`, `couple_expenses` y las del ledger, que solo devuelven lo
  activo: **ningún movimiento anulado entra en ellas**, y ADR-001 no cambia. La
  colección histórica guarda, por vínculo, solo lo necesario para entenderlo:
  - la fecha efectiva, el tipo, el importe como texto, el contexto y «anulado»;
  - si la anulación fue técnica o económica;
  - la referencia a la instancia.

  Se lee con la RLS de quien exporta, desde una vista `security_invoker` nueva. El
  Plan fija la referencia sin UUID internos (por ejemplo, un identificador local
  del archivo).

**La exportación de Beto es indistinguible con y sin la recurrencia privada de
Ana** (F101-2): no lee ninguna regla, instancia, pausa ni vínculo privados de Ana,
sus aportes en una meta compartida salen sin ninguna columna nueva y sus
colecciones existentes no cambian. Se prueba comparando byte a byte la exportación
de Beto con y sin la recurrencia (`[V]` P4).

**Borrado manual de cuenta** (005, `contracts/account-deletion.md` y
`scripts/account-deletion/`). El procedimiento se conserva **completo**, y el Plan
lo amplía con las cinco tablas en cada una de sus partes:

| Parte del procedimiento | Qué añade el Plan |
| --- | --- |
| **Alcance y cierre** (`scope.sql`, `closure.sql`) | Las cinco tablas en las listas explícitas de `scope.sql`, con su recuento. El cierre de alcance incluye las reglas privadas de las personas del alcance y las compartidas de la pareja |
| **Columnas que nombran personas** | `owner_user_id` y `created_by` de las reglas; `created_by` de las versiones; `created_by` y `ended_by` de las pausas; `created_by`, `skipped_by` y `cancelled_by` de las instancias; `created_by` de los vínculos |
| **Entidades auditadas** | `recurring_rule` y `recurring_occurrence` en la lista de entidades cuyos eventos borra o conserva el procedimiento, con la regla vigente del actor externo |
| **Referencias externas** (`blocked_external_link`) | Un vínculo de una regla fuera del alcance a un movimiento del alcance, o al revés, detiene el procedimiento antes de empezar. Con las reglas de §7.4 no debería existir; si existe, lo decide un fundador |
| **Bloqueos** | Las cinco tablas en el orden fijo de bloqueos, con `lock_timeout`, antes de leer nada |
| **Orden de borrado** | Los vínculos antes que los movimientos a los que apuntan, por las claves foráneas; las instancias, pausas y versiones antes que la regla, o por la cascada como dueño |
| **Triggers** | Ninguno nuevo se suspende, si la `[V]` C1 lo confirma (§12) |
| **Comprobación final** | Ninguna fila de las cinco tablas nombra a una persona borrada, y `check-invariants.sql` incluye las invariantes de §11 |

La salida de la pareja sigue bloqueada (ADR-003; FR-077).

### 14. Concurrencia: orden de bloqueo

Toda función de este ADR, y las que ADR-d añada para los aportes, adquiere los
bloqueos en este orden fijo (ADR-013 §3.3):

1. **la pareja** (`lock_active_couple`), si es compartida **cualquiera** de estas:
   la regla, el movimiento que se crea o se vincula, o **la meta destinataria** de
   un aporte. Un aporte privado a una meta compartida bloquea la pareja (F103-6);
2. **la meta**, si es un aporte o un gasto con meta;
3. **la regla** (`recurring_rules … for update`);
4. **la instancia**, si ya tiene fila;
5. **los movimientos existentes**, por `id`: el candidato a vincular y la cadena de
   §8, cuando hay que recorrerla.

**Compatibilidad con MVP-1, sin reescribirlo:**

- `lock_planning_goal`, que usan aportar, lograr, archivar y anular asientos,
  bloquea la pareja (si la meta es compartida) y después la meta. Es el mismo
  prefijo.
- `create_expense_with_goal` bloquea la pareja, **crea** el gasto nuevo, lo bloquea
  y después bloquea la meta. Cuando confirmar llama a esa función (§7.3, paso 6),
  la pareja y la meta ya están bloqueadas por la función exterior. La interior las
  vuelve a pedir dentro de la misma transacción sin esperar, y el gasto que bloquea
  es nuevo: ninguna otra transacción puede tenerlo.
- Las funciones de MVP-1 que bloquean gastos existentes y después la meta
  (solicitudes de uso) no bloquean nunca una regla, así que no forman ciclo con el
  paso 5.

Si ADR-d hace que lograr o archivar una meta escriba una pausa, esa función
bloqueará la pareja (si la meta es compartida), la meta y después la regla: el
mismo orden.

Confirmar contra editar, pausar, finalizar o confirmar desde la otra cuenta se
ordena por el bloqueo de la regla. Los reintentos por `40P01` o `40001` siguen
ADR-013 §3.4, pero **no sustituyen al orden**: un interbloqueo es un error de
diseño que la prueba de concurrencia tiene que poder detectar (`[V]` P9).

## Alternativas consideradas

1. **Materializar un horizonte** (Q3 (a)). Descartada en §2: necesita un proceso
   periódico o escribir al leer, y cada edición o pausa reescribe filas.
2. **Que el comportamiento dependa de que exista la fila.** Era la regla de la
   ronda 1 («una materializada existe siempre»). Hacía que dos recurrencias iguales
   se comportaran distinto según su historial de filas (F103-4) y obligaba a
   excepciones a Q6 (F103-10). Sustituida por la regla de los hechos (§2).
3. **Cortar el calendario después de la última posición conservada** (ronda 1).
   Dejaba sin resolver las previstas intercaladas entre posiciones fijadas
   (F103-1). Sustituida por la asignación por ranura (§3.4).
4. **Guardar el estado de la instancia en una columna.** Obligaría a que las
   funciones de anular de MVP-1 (gasto, gasto compartido, aporte) escribieran en
   estas tablas, o a un trigger en `transactions` y en el ledger: tocaría funciones
   y tablas de P0 y abriría un camino por el que un error de Beto podría depender de
   una recurrencia privada de Ana.
5. **Una tabla de trazabilidad escrita por Mover a Pareja.** Duplicaría la cadena
   que ADR-001 ya guarda y exigiría cambiar `reclassify_to_shared` y su Deshacer.
6. **Identidad por fecha prevista.** Una edición de frecuencia o de fecha cambiaría
   la identidad de las instancias y abriría la puerta a duplicados.
7. **Identidad por periodo** (el mes, la quincena). No sirve para «cada N días» ni
   para cambios de frecuencia entre unidades. Los periodos sí sirven para el
   límite inferior B de §3.4.
8. **Materializar las posiciones consumidas como canceladas** (F101-15). Descartada
   en §6.3.
9. **Una columna `recurring_occurrence_id` en `transactions`.** Toca la tabla
   controlada de P0, convierte vincular en una edición del gasto (versión, «Editado
   por») y lo haría visible para la otra persona en un gasto compartido.

## Consecuencias

- Cinco tablas controladas nuevas, sus vistas `security_invoker`, sus funciones de
  entrada y de escritura, y pgTAP con tres cuentas (FR-092).
- Una función pura de calendario en SQL y su gemela en el dominio, probadas con la
  misma tabla de casos.
- Las lecturas calculan; el Plan mide contra §15.7.
- Ampliación de las listas de `audit_events` e `idempotency_records`, y un índice
  parcial en `transactions`.
- **Ningún ADR anterior necesita enmienda**, salvo que la `[V]` C1 lo exija (§12).
  ADR-001, ADR-003, ADR-007, ADR-010, ADR-013, ADR-014 y ADR-015 se aplican tal
  como están. Este ADR depende de la columna `visible_to_user_id` que añade el PR A
  de la spec 006 (ADR-015 §1). ADR-013 §2 se aplica: las tablas nuevas entran en su
  lista de tablas controladas, como pide su texto.
- El contrato de borrado de la 005 y `scope.sql` se amplían con las cinco tablas
  (§13).
- **Reconciliación de la spec 007.** Toda `[P]` que los fundadores aprueben y que
  cambie el comportamiento que la spec describe **obliga a reconciliar la spec 007
  antes de la etapa Plan**, en un PR documental propio (ADR-012 §3.1: cada gate es
  el merge de un PR documental). Hoy afecta a:
  - P3 con la opción (b), o con la parte sin fin de la (a) («Prevista →
    Cancelada»);
  - P4 si se aprueba la recuperación manual (una fila nueva en la tabla de
    estados);
  - P5, si se quiere que la spec diga explícitamente que una reabierta de una
    recurrencia archivada se puede resolver.

  Las demás `[P]` concretan lo que la spec deja a este ADR y no la cambian.

## Verificación pendiente [V]

Se dividen en dos grupos. Las **de construcción** (C) deciden cómo se construye y
se ensayan en `juntia-dev` **antes de cerrar el Plan**: si alguna falla, el Plan
vuelve a este ADR. Las **de producto** (P) verifican el comportamiento durante la
implementación.

### De construcción, antes de cerrar el Plan

- **C1. Borrado y triggers** (§12, §13). En PostgreSQL 17, en `juntia-dev`, cinco
  casos:
  1. `juntia_writer` borra directamente un vínculo: **rechazado**;
  2. `juntia_writer` borra por SQL directo una regla con historia: **rechazado**
     por la protección en la raíz, antes de la cascada;
  3. la función borra una regla sin historia: **permitido**, y la cascada borra
     sus versiones y pausas (dentro de la cascada, `current_user` es el dueño de la
     tabla y los triggers hijos lo dejan pasar);
  4. el borrado administrativo de cuenta, con reglas, instancias, vínculos y
     pausas en el alcance: **permitido**, sin suspender ningún trigger nuevo;
  5. un fallo a mitad del borrado de cuenta: **reversión completa**, incluida la
     reactivación de los cinco triggers.

  Si el caso 3 o el 4 necesitan suspender algún trigger nuevo, se escribe la nota
  de compatibilidad de §12 antes de implementar.
- **C2. Llamada anidada** (§7.3, paso 6). Una función `security definer` de
  `juntia_writer` que llama a otra del mismo dueño conserva `current_uid()`, la RLS
  y la idempotencia de la interior con la clave derivada. Volver a bloquear la
  pareja o la meta ya bloqueadas no espera, también en un aporte privado a una meta
  compartida y en un gasto con meta compartida. Un reintento de la exterior no
  duplica el movimiento. Si falla la inserción del vínculo después de crear el
  movimiento, **todo revierte**, incluida la idempotencia interior: un reintento
  posterior con la misma clave vuelve a crear el movimiento una sola vez.
- **C3. Lecturas sin `usage` sobre `juntia_data`** (§11). Las funciones de lectura
  con cuerpo SQL estándar y las vistas leen las tablas nuevas con
  `authenticated`, sin conceder `usage` sobre `juntia_data` ni ningún privilegio de
  esquema que ADR-013 prohíba.

### De producto

- **P1. Lo previsto no toca lo real** (§1). `pg_depend` para las vistas; búsqueda
  de `recurring_` en `pg_proc.prosrc` de todas las funciones de métricas,
  presupuestos, Balance, Análisis, metas y DEC-G04 (PL/pgSQL y SQL dinámico); y
  SC-001: las cifras son idénticas con y sin recurrencias, con instancias en
  **todos** los estados (también confirmadas, reabiertas y canceladas), con el
  dataset del Plan.
- **P2. Calendario gemelo.** La función SQL y la del dominio dan las mismas
  posiciones y fechas en la tabla de casos: cada frecuencia, días 29 a 31, 29 de
  febrero en años bisiestos y no bisiestos, quincenal en meses de 28 a 31 días,
  fin por fecha y por N, segmentos con posiciones fijadas, el límite B de §3.4 por
  unidad, y los casos límite de pausa de §6.4.
- **P3. Sin duplicados ni pérdidas al editar** (FR-005, SC-002). Integración con
  ediciones de calendario con instancias en todos los estados, incluido el
  contraejemplo de §3.4 (posiciones fijadas **no consecutivas** intercaladas con
  editables): ninguna posición se repite, ninguna prevista desaparece, todas las
  editables reciben el calendario nuevo y ninguna fecha del segmento nuevo cae en
  un periodo ya cubierto. Incluye «del 15 al 20», «del 31 al 15» y c = 0.
- **P4. Equivalencia de F101-2** (29.9). Un aporte manual de Ana y el mismo aporte
  confirmado desde su recurrencia privada son indistinguibles para Beto en las
  vistas, la exportación (byte a byte), los errores y los metadatos
  (`max(created_at)`, conteos). Lo mismo para un gasto privado movido a Pareja
  después de confirmarlo.
- **P5. Cadena de F101-13 y opción C** (§8, §9), en integración, con dos cuentas:
  - 1, 1, 1 y 0 movimientos activos, y la instancia privada confirmada hasta la
    anulación económica;
  - una cadena con **varias** conversiones y restauraciones (mover, deshacer,
    mover, deshacer) y el límite defensivo del recorrido;
  - el vínculo de Beto a T2, aceptado sin ningún error distinto del que daría sin
    la recurrencia de Ana;
  - el Deshacer posterior, con la compartida en pendiente y la privada confirmada;
  - Ana no puede vincular T3 a otra instancia privada suya (unicidad por contexto).
- **P6. Precondición de §7.1.** Un borrador, una sugerencia abierta, una búsqueda
  manual, una omisión y una lista de finalización **obsoletos** (la regla cambió de
  calendario o de versión entre medias) fallan con `occurrenceChanged` sin escribir
  nada.
- **P7. Rendimiento.** Calendario de dos meses, «Por confirmar» e Inicio con el
  número de reglas del dataset del Plan, dentro de los umbrales de §15.7.
- **P8. Las transiciones de la tabla de la spec** (SC-006), con los cuatro casos de
  §5, el caso A de dos pausas y el caso B de terminación automática de §6.4, en
  dominio y pgTAP; y la diferencia entre fin por N y fin por fecha de §6.1.
- **P9. Concurrencia.**
  - Confirmación simultánea desde las dos cuentas de la misma instancia
    compartida: un solo gasto.
  - Confirmar contra editar, pausar y finalizar.
  - Un aporte privado a una meta compartida mientras la otra persona da la meta por
    lograda: sin interbloqueo, con el resultado del orden efectivo.
  - Un gasto con meta compartida confirmado contra una solicitud de uso.
  - Con ADR-d, los tres órdenes de US6.6.
- **P10. Compatibilidad en la base de datos.** Cada fila «No» de la tabla de
  compatibilidad de la spec la rechaza el trigger aunque se llame a la función de
  escritura directamente por SQL (SC-007).

## Cuestiones para los fundadores `[P]`

| # | Cuestión | Opciones | Recomendación | Dónde |
| --- | --- | --- | --- | --- |
| P1 | Días de la quincenal (Q7, 29.5) | Primer día 1–15 y segundo 16–31; una instancia en la fecha coincidente; mover la segunda; cualquier par con aviso | Primer día 1–15 y segundo 16–31 (31 = último) | §3.3 |
| P2 | Fecha de arranque tras una edición de calendario | (a) la de por omisión o una posterior, con la vista previa de los periodos sin ocurrencia; (b) siempre la de por omisión. Nunca anterior a B | (a) | §3.4 |
| P3 | Previstas al finalizar a mano o eliminar con historia | (a) cancelar todas en los compromisos con N o fecha final, y dejar de generar sin fin; (b) dejar de generar en todos; (c) cancelar las del horizonte por omisión, y todas en los finitos | (a); con (b), o en la parte sin fin de (a), se reconcilia la spec | §6.3 |
| P4 | Recuperación manual excepcional (F101-18) | No existe (Anotar registra el pago; una recurrencia de una sola fecha representa la obligación); o una acción propia que deja la posición pendiente | No existe en v1 | §6.5 |
| P5 | Pendiente de una recurrencia archivada o finalizada (F101-8 iii) | Visible en «Por confirmar» y en el calendario, y resoluble sin reactivar la regla; o solo en el detalle de la archivada | La primera | §6.6 |
| P6 | **F101-19 (obligatoria):** el reemplazo compartido como candidato a un vínculo | A rechazar; B quitárselo a Ana; **C coexistir**; D bloquear Mover a Pareja | C, con sus consecuencias: obligaciones independientes, el riesgo de reponer dos veces tras anular T2, y la compartida en pendiente tras el Deshacer, que se aprueba con C | §9 |

## Referencias

- `docs/JUNTIA_MASTER.md` §2.3, §5.1, §5.2, §5.4, §5.6, §7.3, §7.4, §15.4, §15.5,
  §15.7 y §15.10 (decisiones 16.13, 22.13, 22.15, 25.3, 28 y 29)
- `specs/007-recurrentes-calendario/spec.md`: Clarifications, «Precisiones de la
  revisión F101», «Compatibilidad de vínculos», «Estados y transiciones»,
  «Cuestiones que la tabla deja a ADR-a», FR-001 a FR-038a, FR-061, FR-076 a
  FR-078 y FR-090 a FR-092
- `docs/propuestas/analisis-planificacion-financiera.md` §6 (ADR-a) y §7.1
- ADR-001 · ADR-003 · ADR-007 · ADR-010 · ADR-011 · ADR-012 §3.1 · ADR-013 §2, §3,
  §4, §5 y §6 · ADR-015 §1, §3 y §5
- `specs/003-pareja-y-balances/spec.md`, Q15 (Deshacer de Mover a Pareja)
- `specs/004-presupuestos-y-metas/spec.md` (estados de las metas y reactivación)
- `specs/005-gate-mvp-1/contracts/account-deletion.md` y `scripts/account-deletion/`
- `supabase/migrations/` (revisadas el 25 de noviembre de 2026, sin cambios)
