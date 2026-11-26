# ADR-018 — Aportes programados: confirmación, pausa por meta inactiva y concurrencia

**Estado:** **Propuesto** (26 de noviembre de 2026). **Los fundadores decidieron P1 (a) y P2 (b) el 26 de noviembre de 2026** («Decisiones de los fundadores»); con P2 (b) queda decidida la cuestión 29.8, cuyo cierre normativo se registra en el PR de reconciliación posterior. Sigue Propuesto hasta el GO de arquitectura y la revisión final de fidelidad. Es el candidato **ADR-d** del análisis (`docs/propuestas/analisis-planificacion-financiera.md` §6), con el número que le toca al abrirse (maestro §15.10, decisión 29.10). Se acepta antes de la etapa Plan de la spec 007 (`AGENTS.md` 17). No se implementa antes de declarar MVP-1 ni antes de que Planes (spec 006) esté aceptada (28.18, condición 6) · **Origen:** especificación 007 (`specs/007-recurrentes-calendario/spec.md`), Q12, D7, F101-2, F101-7, F101-16, FR-030 a FR-034a y US6; maestro §15.10, decisiones 29.7, 29.8, 29.9 y 29.10; ADR-016 §6.2, §10 y §14; ADR-017 §1 · **Alcance:** MVP-2

En este archivo, las dos `[P]` (P1 y P2) **ya están decididas** por los
fundadores (26 de noviembre de 2026); se conservan sus números como referencia, y
las opciones descartadas quedan como contexto. `[V]` una **verificación pendiente** (maestro §15.9). Los nombres de
tablas, columnas y funciones son de trabajo. Las fechas de los ejemplos son
**ficticias**.

## Contexto

ADR-016 (aceptado) ya fija casi todo lo que necesita un aporte programado: la regla
`kind = goal_contribution` es siempre de su dueña y su `goal_id` es inmutable
(§10), la compatibilidad del vínculo (§7.4), la vuelta a pendiente por un asiento
`void` (D1), la confirmación por la función de MVP-1 (§7.3) y el orden de bloqueo
meta → regla (§14). ADR-017 (aceptado) fija que un aporte nunca tiene importe
`unknown` (§1). Este ADR resuelve **solo** lo que esos dos le dejan:

| # | Cuestión delegada | Origen | Dónde se resuelve |
| --- | --- | --- | --- |
| 1 | `amount_kind` y modo de financiación de los aportes | ADR-017 §1; ADR-016 §10 | §1 (P1 (a), decidida) |
| 2 | Confirmación: crea el aporte real, solo del propio aportante y solo con la meta activa | Q12; FR-030, FR-031, FR-034a; 004, FR-040 | §2 |
| 3 | Privacidad: la programación es privada y el aporte confirmado es indistinguible del manual | Q12; F101-2; FR-033; 29.9 | §2 y §5 |
| 4 | Cómo y quién escribe la pausa `goal_inactive` (D7), sin dar a `juntia_writer` acceso a recurrencias privadas ni revelar su existencia desde Metas | ADR-016 §6.2 y §10; F101-7 | §3 |
| 5 | Una meta reactivada no reanuda la recurrencia | F103-5; ADR-016 §6.2 | §3 |
| 6 | Concurrencia con lograr y archivar, y la carrera entre reanudar y lograr | F101-7, F101-16; US6.6; ADR-016 §14 | §4 |
| 7 | **29.8:** vincular un aporte histórico a una meta inactiva | 29.8; FR-034a | §6 (P2 (b), decidida) |

Lo que no cambia: ADR-010, los estados y las transiciones de Metas
(`goals_guard_transition`, `goal_void_reactivate`), y ninguna función de MVP-1.

**Estado del esquema que importa aquí** (revisado el 26 de noviembre de 2026, sin
modificarlo):

- `goal_write` cambia el estado de una meta a `completed` o `archived` con la meta
  bloqueada, y deja un evento en `audit_events`. `completed_at` y `archived_at`
  guardan el instante del cambio, pero el trigger `goal_void_reactivate` pone
  `archived_at` a nulo cuando una meta archivada vuelve a `active`: **la historia de
  estados de una meta no se puede leer hoy desde la app** (nadie lee
  `audit_events`; ADR-015 §5).
- `contribute_to_goal` exige la meta activa (`goalNotOpen`), un aportante igual a
  quien llama, `entry_date` ≤ hoy (FR-040) y un `funding_mode`
  (`reserved | transferred_declared`).

## Decisión

### 1. Importe y modo de financiación de un aporte programado

- **Importe: solo `fixed`** (P1 (a), decidida). Un aporte programado no admite
  rangos ni importes desconocidos (ADR-017 §1). Con un importe fijo, el toque único
  de ADR-016 §7.2 funciona sin abrir el borrador, y la aportante puede cambiar el
  importe efectivo en el borrador antes de confirmar, conforme a ADR-016. P1 (b),
  fijo o estimado con rango, queda descartada.
- **Modo de financiación:** la versión de la regla guarda el `funding_mode` que
  usará el aporte (`reserved` o `transferred_declared`, los mismos de la 004). Es
  un dato editable de la versión (ADR-016 §4), no un dato del calendario. El
  borrador de confirmación permite cambiarlo antes de guardar.
- La compatibilidad de la versión con la regla (aporte ⇒ `fixed`,
  `funding_mode` obligatorio, nada de certeza ni condición) entra en el contrato de
  integridad de ADR-017 §1, con el mismo mecanismo que elija el Plan.

### 2. Confirmar y privacidad del aporte confirmado

Confirmar un aporte programado es **exactamente** la confirmación de ADR-016 §7.3,
sin pasos propios. En particular:

- el paso 3 bloquea pareja (si la meta es compartida), meta y regla (ADR-016 §14);
- el paso 5 revalida, **bajo el bloqueo de la meta**, que está activa y que la
  fecha efectiva es hoy o pasada (004, FR-040);
- el paso 6 llama a `contribute_to_goal`, que vuelve a exigir lo mismo y que el
  aportante es quien llama. Como la regla de aporte siempre es de su dueña
  (ADR-016 §10) y solo ella puede confirmarla, **nunca se aporta en nombre de la
  otra persona** (Q12; FR-030; ADR-010).

**El aporte confirmado es el de MVP-1** (FR-031): la misma fila del ledger, el mismo
evento de auditoría y la misma idempotencia que uno manual. La relación con la
programación solo vive en `recurring_occurrence_links` y en el evento
`recurring_occurrence / confirm`, privado (`visible_to_user_id` = la dueña;
ADR-016 §12). Para la otra persona es **indistinguible** de un aporte manual en
vistas, exportación, errores y metadatos (F101-2; FR-033; 29.9). Lo verifica la
`[V]` P4 de ADR-016, que aquí se amplía (`[V]` 3).

Un aporte confirmado es dinero de la meta (DEC-G04, `aporte_a_metas`). Antes de
confirmarse, una instancia prevista **no** cambia la meta, «Tu disponible» ni
DEC-G04, y nunca se presenta como fondos reservados (FR-032; ADR-017 §3).

### 3. La pausa por meta inactiva: derivada, no escrita por Metas

**El problema.** D7 pide que la recurrencia se pause cuando la meta pasa a lograda
o archivada. Escribir esa pausa desde `complete_goal` o `archive_goal` obligaría a
cambiar funciones de MVP-1 y a que la sesión de quien logra la meta (que puede ser
Beto) leyera y escribiera reglas privadas de Ana: justo lo que hay que evitar.
Derivarla solo del estado actual de la meta tampoco basta, porque una meta
archivada que vuelve a `active` reanudaría sola la recurrencia (F103-5), y hoy no
queda registro de que estuvo archivada.

**Las causas**, y cómo se quitan:

- la historia de estados de una meta no se guarda en un sitio legible → §3.1;
- el punto desde el que se miran las inactivaciones era implícito y se comparaba
  por fecha, que es ambigua dentro de un mismo día → §3.2: un **ancla explícita**,
  ordenada por un **cursor de eventos**, no por la fecha.

#### 3.1 Historia de estados de la meta y su escritura protegida (F110-4)

Tabla nueva, de solo inserción, `juntia_data.goal_status_events`: `goal_id`,
`goal_version`, `status` (`active`, `completed` o `archived`) y `occurred_at`. La
llena un **trigger `after update of status`** de `savings_goals`, solo cuando
`OLD.status` es distinto de `NEW.status`, en la misma transacción que el cambio.
No modifica ninguna función de MVP-1, ni ADR-010, ni los estados o transiciones de
Metas: solo anota lo que ya ocurre, también la reactivación de
`goal_void_reactivate`.

- **`goal_version` es el cursor** (F110-2): el `NEW.version` de la meta, que toda
  transición incrementa con la meta bloqueada. Es único y creciente por meta y no
  depende de relojes, así que ordena los eventos de forma determinista aunque dos
  tengan el mismo instante. Su autenticidad y su crecimiento estricto forman parte
  del contrato de integridad de abajo (F110-9). `occurred_at` (`clock_timestamp()`
  al insertar) solo da la **fecha civil en Bogotá** del evento, que se usa para los
  intervalos de ADR-016 §6.2 y nunca para ordenar. Si el cambio de estado y la
  inserción cruzan la medianoche, manda el instante de la inserción, que es
  posterior al bloqueo de la meta (F110-10).
- **No sabe nada de recurrencias**: no las lee ni las escribe. Su éxito o su fallo
  no dependen de que exista una programación privada, así que la operación de Metas
  no puede revelarla, ni por errores, ni por resultados, ni por la auditoría ni por
  el tiempo.

**Contrato de escritura protegida.** El mecanismo físico lo fija el Plan, con
ADR-013. Este ADR fija las garantías:

1. **Solo se registran cambios reales** de `OLD.status` a `NEW.status`, con los
   valores de la propia fila, más la siembra administrativa de la migración. Ninguna
   función expuesta puede fabricar un evento.
2. **Quién escribe.** Ni `authenticated` ni `juntia_writer` tienen `insert` sobre la
   tabla. `goal_write` corre como `juntia_writer` y `goal_void_reactivate` es
   `security invoker`, así que el trigger necesita su propio privilegio mínimo: una
   función interna de trigger, sin `execute` para nadie más, con `insert` sobre
   `goal_status_events` y ningún acceso a `recurring_*`. Ni `service_role`, ni un
   dueño sin restricciones, ni una función de `public`.
3. **Sin cambios posteriores.** Ningún rol de la app tiene `update`, `delete` ni
   `truncate`, y un trigger rechaza `update` y `delete` para cualquier rol distinto
   del dueño de la tabla, como en ADR-016 §12. Así el borrado manual de cuenta no
   tiene que suspender un sexto trigger (F110-7; nota del 18 de noviembre de 2026).
4. **Lectura** con la RLS de la meta: la ve quien ve la meta, a través de vistas o
   funciones `security invoker`, sin `usage` de `authenticated` sobre `juntia_data`
   (ADR-013).
5. `juntia_writer` **no gana ningún privilegio** sobre las tablas `recurring_*`.
6. **Dependencia transaccional:** el trigger añade una inserción a cada transición
   de una meta. Si falla, revierte la transición (Consecuencias).

Al migrar, se siembra una fila por cada meta que ya esté lograda o archivada, con su
`completed_at` o `archived_at` y su versión actual.

**Contrato de integridad del cursor y del ancla** (F110-9). El diseño depende de dos
invariantes: la versión de la meta crece de forma estricta en cada transición, y el
ancla (§3.2) solo avanza por una creación o una reanudación legítima. Hoy
`goals_guard_transition` no exige el incremento de versión (solo `version > 0`), y
`juntia_writer` tiene `update` sobre `savings_goals`. Por eso se exige, con el
mecanismo físico a cargo del Plan, sin cambiar las funciones de MVP-1 y sin
abandonar el cursor:

1. **Versión estrictamente creciente y auténtica en los eventos.** Un cambio de
   `status` sin incremento de `version` se rechaza, y la transición no ocurre. Cada
   evento lleva una `goal_version` mayor que la de cualquier evento anterior de la
   misma meta (único por meta).
2. **La versión de la meta no retrocede**, en ninguna actualización, ni invalida el
   cursor.
3. **El ancla solo existe en las reglas de aporte** y **solo avanza** por la creación
   de la regla o por una reanudación válida (§3.2), nunca retrocede y nunca toma un
   valor mayor que la versión actual de la meta.
4. **La reanudación** exige la meta activa bajo su bloqueo y, en la misma
   transacción, cierra la pausa (o materializa la derivada) y avanza el ancla.
5. **Las escrituras incorrectas se rechazan sin alterar el historial**: un `update`
   directo del ancla fuera de esas operaciones, un ancla que retrocede o que se
   adelanta a la meta, o una transición sin incremento de versión.
6. **Privilegios.** El trigger de Metas **no recibe ni necesita** ningún privilegio
   sobre `recurring_*`. Las operaciones autorizadas de Recurrentes sí necesitan una
   **vía protegida** para escribir el ancla: las funciones de crear y reanudar, con
   la protección anterior; ninguna otra.

#### 3.2 El ancla de cada regla y la pausa derivada (F110-1, F110-2, F110-5)

Cada regla de aporte guarda un **ancla**, `goal_ack_version`: la versión de la meta
que la regla ya **tuvo en cuenta**. Se escribe en dos momentos, siempre **bajo el
bloqueo de la meta** y con la versión leída **después** de obtenerlo, nunca la de un
instante anterior a una espera:

- **al crear la regla**, que exige la meta activa;
- **en toda reanudación explícita válida**: la que cierra una pausa manual y la que
  resuelve una pausa por la meta. El cierre de la pausa y el avance del ancla van en
  la misma transacción.

**La pausa `goal_inactive` abierta se deriva** al leer. Para una regla de aporte r
de la meta g:

1. sea e el **primer** evento de g a `completed` o `archived` con `goal_version` >
   `goal_ack_version` de r;
2. si existe e, **y r no tiene una pausa manual abierta**, r tiene una pausa
   `goal_inactive` abierta, con `started_on` = la fecha civil de e en Bogotá;
3. si r tiene una pausa manual abierta, esa pausa **ya cubre** la inactivación, y no
   se deriva ninguna otra: nunca hay dos pausas abiertas a la vez (ADR-016 §6.2);
4. **El fin de la regla no cambia la derivación** (F110-5, F110-8). Hay que
   distinguir dos cosas:
   - **No se generan pausas que cuenten después del fin.** Una pausa derivada que
     empezaría en la fecha del fin o después no afecta a nada: después del fin no hay
     posiciones (ADR-016 §6.1 y §6.3), y el estado «Finalizada» o «Archivada»
     prevalece sobre «Pausada» (ADR-016 §6.1). Cómo se representa ese límite en las
     vistas y en la exportación lo decide el Plan, sin cambiar ADR-016 §6.2.
   - **Las pausas anteriores al fin se conservan.** La terminación automática no
     escribe nada (ADR-016 §6.1), así que una pausa derivada abierta antes sigue en
     el historial efectivo, con las posiciones que consumió. Finalizar a mano,
     archivar y «Cambiar frecuencia» **no son reanudar**: no materializan la pausa
     como cerrada, no avanzan el ancla y la dejan abierta en el historial, igual que
     ADR-016 deja abierta una pausa manual. Así ninguna de esas operaciones recupera
     posiciones consumidas, y la lista de cancelación de ADR-016 §6.3 (P3) se calcula
     sobre ese mismo historial efectivo.

   Ejemplo: compromiso mensual del día 10 con N = 3 (enero a marzo). La meta se
   inactiva el 20 de enero y no se reanuda. El 10 de marzo la regla termina sola: la
   pausa derivada desde el 20 de enero se conserva, febrero y marzo siguen
   consumidas y no reaparecen como pendientes, y deshacer una omisión de febrero
   sigue sin estar disponible (ADR-016 §6.4, regla 2).

Esa pausa entra en el **historial efectivo** de pausas de ADR-016 §6.2 como una
más: la proyección de ADR-016 la usa para el estado de la regla (Pausada), para las
posiciones consumidas y para la precedencia de Deshacer (§6.4). **No hay una
segunda función de estado**: ADR-016 recibe un historial de pausas más completo.

**La escribe su dueña al reanudar.** Reanudar un aporte exige la meta activa bajo su
bloqueo (ADR-016 §6.2) y, en una sola transacción:

- si había una pausa derivada abierta, la **materializa** como fila cerrada de
  `recurring_rule_pauses` (`reason = goal_inactive`, `started_on` derivado y
  `ended_on` = la fecha de la operación);
- si había una pausa manual abierta, la cierra (`ended_on` = la fecha de la
  operación). Esa pausa cubría la inactivación, así que no se escribe ninguna fila
  `goal_inactive`;
- **avanza el ancla** a la versión actual de la meta.

Los eventos posteriores al ancla nueva pueden abrir una pausa nueva.

**La fecha de la operación** (F110-10) de pausar, reanudar, finalizar y archivar una
regla de aporte es la fecha civil en Bogotá de `clock_timestamp()` leída **después
de obtener los bloqueos** de §4, nunca la de `now()`, que es el inicio de la
transacción. Así es coherente con el orden efectivo: una reanudación siempre obtiene
el bloqueo de la meta después de cualquier evento que haya visto, y su fecha nunca
es anterior a la de esos eventos. Ejemplo: una reanudación empieza a las 23:59 y
espera el bloqueo; a las 00:01 se inactiva la meta y a las 00:02 se reactiva; a las
00:03 la reanudación obtiene el bloqueo. Su fecha es la del nuevo día, la pausa
materializada empieza y termina ese día, y `ended_on` nunca queda antes de
`started_on`. Las fechas efectivas de los aportes no cambian: siguen siendo las de
la 004 (FR-040).

**Consecuencias de la regla:**

- **Una meta reactivada no reanuda la recurrencia** (F103-5): la reactivación no
  mueve el ancla, y la pausa sigue abierta hasta que la dueña reanuda.
- **Una segunda inactivación** antes de reanudar no abre otra pausa: la abierta
  empezó en la primera posterior al ancla.
- **El mismo día** (F110-2): archivar a las 9, reactivar a las 11, reanudar a las 14
  y archivar otra vez a las 17. La reanudación deja el ancla en la versión de las
  11, y la pausa materializada va del día al mismo día: un intervalo vacío, que no
  consume ninguna posición (ADR-016 §6.2). El evento de las 17 tiene una versión
  mayor que el ancla y abre una pausa nueva, que empieza ese día.
- **Una reanudación que esperó un bloqueo** usa la versión que lee después de
  obtenerlo. Si mientras esperaba la meta se inactivó, la reanudación falla porque
  la meta ya no está activa.

**Ejemplo con una pausa manual previa** (F110-1; fechas ficticias):

| Fecha | Qué pasa | Resultado para la regla de Ana |
| --- | --- | --- |
| 1 de marzo | Ana crea la regla | Ancla en la versión de ese momento |
| 10 de marzo | Ana la pausa a mano | Pausa manual abierta |
| 20 de marzo | Se archiva la meta | La pausa manual ya la cubre: no se deriva otra |
| 15 de abril | La meta se reactiva | Sigue pausada (la manual sigue abierta) |
| 20 de abril | Ana reanuda | Cierra la manual el 20 de abril y avanza el ancla. No se escribe ninguna fila `goal_inactive` |
| 21 de abril | Lectura | **Activa**: ningún evento es posterior al ancla |
| 5 de mayo | Se archiva otra vez | Pausa derivada abierta desde el 5 de mayo |

**Ejemplo sin pausa manual** (Ana programa un aporte mensual del día 5 a una meta
compartida):

| Fecha | Qué pasa | Resultado para la regla de Ana |
| --- | --- | --- |
| 10 de marzo | Beto da la meta por lograda | Pausa `goal_inactive` abierta desde el 10 de marzo, derivada. Las posiciones del 5 de abril en adelante quedan consumidas |
| 20 de marzo | La meta se archiva | Nada nuevo: la pausa sigue abierta desde el 10 |
| — | La meta archivada vuelve a `active` (`goal_void_reactivate`) | La regla **sigue pausada** |
| 2 de junio | Ana reanuda, con la meta activa | Se escribe la pausa cerrada del 10 de marzo al 2 de junio y avanza el ancla. La posición del 5 de junio se genera |

Una meta lograda no vuelve a `active`: su regla queda pausada hasta que la dueña la
finalice. Sus pendientes anteriores se conservan (ADR-016 §5), y se les puede
vincular un aporte histórico válido según P2 (b) (§6).

**Nadie más escribe en la regla.** `juntia_writer`, en la sesión de quien logra o
archiva la meta, no lee ni escribe recurrencias.

### 4. Concurrencia

Toda operación sobre una regla de aporte que escribe pausas o el ancla, o que
depende del estado de la meta, bloquea **pareja (si la meta es compartida) → meta →
regla**, y revalida bajo esos bloqueos (ADR-016 §14):

| Operación | Orden |
| --- | --- |
| Confirmar un aporte | pareja si la meta es compartida → meta → regla → instancia → `contribute_to_goal` (que vuelve a pedir pareja y meta) |
| Crear, pausar, reanudar, finalizar o archivar una regla de aporte | pareja si la meta es compartida → meta → regla |
| Lograr o archivar la meta (MVP-1) | pareja si la meta es compartida → meta. El trigger de §3.1 inserta en `goal_status_events` sin bloquear ninguna regla |

Como lograr y archivar **no tocan las reglas**, no hay ningún ciclo posible con ellas.
Los resultados salen del orden efectivo:

| Orden efectivo | Resultado |
| --- | --- |
| Confirmar y después lograr | El aporte es válido y se conserva. La meta queda lograda y la regla, pausada desde la fecha de la inactivación (US6.6) |
| Lograr y después confirmar | La confirmación falla con `goalNotOpen` (004) y la instancia queda pendiente (F101-16) |
| Aporte que deja saldo, y después archivar | Archivar sigue sus propios requisitos (22.15; 004, FR-040) |
| Reanudar y después lograr | La regla se reanuda y avanza el ancla; la inactivación posterior abre una pausa nueva |
| Lograr y después reanudar | Reanudar falla: la meta no está activa bajo su bloqueo |
| **Pausar a mano y después inactivar** (F110-3) | La pausa manual cubre la inactivación y no se deriva otra (§3.2, regla 3) |
| **Inactivar y después pausar a mano** (F110-3) | Bajo el bloqueo de la meta, la regla ya está pausada por la meta: pausar no está disponible y no se crea una segunda pausa |

Ningún aporte registrado legítimamente antes del cambio de estado se pierde, y nunca
se crea uno en una meta que no lo admite (US6.6).

### 5. Privacidad

- La programación es privada también en una meta compartida (Q12; ADR-016 §10 y
  §11). Beto no ve reglas, instancias, pausas ni vínculos de Ana.
- `goal_status_events` es información **de la meta**, que los dos ya ven por su
  estado; no menciona recurrencias.
- Lograr, archivar o reactivar una meta no lee recurrencias: sus resultados, errores,
  tiempos y auditoría son idénticos con y sin programaciones privadas (`[V]` 2).
- El aporte confirmado es indistinguible del manual (§2).

### 6. Vincular un aporte histórico a una meta inactiva (29.8) · P2 decidida

**La cuestión** (29.8; FR-034a). Ana hizo un aporte manual cuando la meta estaba
activa y no lo vinculó a su instancia. La meta pasa a lograda o archivada. ¿Puede
vincular después ese aporte a la instancia pendiente? **Crear** un aporte nuevo en
una meta inactiva sigue prohibido en cualquier caso (004, FR-040; F101-16).

**Decisión de los fundadores (26 de noviembre de 2026): (b).** Se permite vincular
un aporte histórico válido y no anulado a su instancia programada aunque la meta
esté lograda o archivada, siempre que sea de la misma meta y la misma aportante y
cumpla **todas** las condiciones de ADR-016 §7.4. El vínculo no crea un aporte
nuevo, no modifica saldos, no mueve fondos y no reactiva la meta ni la recurrencia.
Crear o confirmar aportes nuevos en una meta inactiva sigue prohibido. Con esta
decisión queda decidida la cuestión 29.8; su cierre normativo se registra en el PR
de reconciliación posterior (Consecuencias). El texto literal está en «Decisiones
de los fundadores».

Opciones que se plantearon:

- **(a), descartada. No se puede vincular** mientras la meta no esté activa. Vincular añadiría a
  §7.4 de ADR-016 la condición «meta activa». La instancia se puede omitir o queda
  pendiente.
- **(b), decidida. Se puede vincular un aporte ya existente**, válido y no anulado, de la misma
  meta y la misma aportante (la compatibilidad de ADR-016 §7.4), aunque la meta ya
  no esté activa. No crea dinero ni mueve fondos: solo reconoce que la obligación
  se cumplió cuando la meta estaba activa.
- **(c), descartada.** Como (b), pero solo si el aporte se **registró antes** de la inactivación
  (F110-6). Compara el instante de registro del asiento (`created_at`), no su
  fecha efectiva, porque `contribute_to_goal` admite fechas pasadas. La
  inactivación es la **primera** posterior al ancla de la regla (§3.2): es un
  criterio propio de (c), no una restricción de (b). Los dos instantes se escriben
  bajo el bloqueo de la meta, así que el mismo día decide su orden; **si coinciden**,
  el aporte no cuenta como anterior y (c) rechaza el vínculo. No se añaden columnas
  al ledger.

Por qué (b), como se recomendó: el vínculo no tiene efecto económico, y el aporte,
por definición, se creó con la meta activa (FR-040), así que la condición de (c) se
cumple siempre salvo en reactivaciones, donde no añade protección. (a) dejaría
pendientes que el sistema sabe cumplidas.

## Alternativas consideradas

1. **Escribir la pausa desde `complete_goal` y `archive_goal`.** Cambia funciones
   de MVP-1, da a la sesión de quien logra la meta acceso a reglas privadas ajenas y
   hace que el resultado de Metas dependa de su existencia. Descartada.
2. **Un trigger en `savings_goals` que pause las reglas.** El mismo problema de
   acceso y de revelación que la 1, dentro de la transacción de Metas.
3. **Derivar la pausa solo del estado actual de la meta.** Una meta reactivada
   reanudaría sola la recurrencia (F103-5).
4. **Leer la historia en `audit_events`** con una función privilegiada. Abriría el
   primer lector de la auditoría, con la revisión del contrato de ADR-015 §5 y un
   rol nuevo, para algo que una tabla propia de la meta resuelve sin privilegios.
5. **Que la dueña escriba la pausa la próxima vez que use la app.** Si la meta se
   reactiva antes, la inactivación se pierde. La derivación de §3 no depende de
   cuándo entra nadie.

## Consecuencias

- Una tabla nueva de solo inserción, `goal_status_events`, y un trigger en
  `savings_goals`. Ni ADR-010, ni los estados y transiciones de Metas, ni ninguna
  función de MVP-1 cambian.
- **El trigger añade una inserción y una dependencia transaccional** a cada
  transición de una meta (lograr, archivar, reactivar). Si la inserción falla, la
  transición se revierte. No depende de ninguna recurrencia.
- Una columna `goal_ack_version` en las reglas de aporte (§3.2).
- **Borrado manual de cuenta** (005): `goal_status_events` entra como una tabla más
  de la meta, y su protección de solo inserción deja pasar al dueño de la tabla,
  como ADR-016 §12, así que el procedimiento no suspende un sexto trigger. Los
  detalles, en el Plan.
- **Exportación** (ADR-016 §13): el historial efectivo de pausas que se exporta
  incluye la pausa derivada abierta, aunque no tenga fila. Si se exporta la historia
  completa de estados de la meta lo decide el Plan.
- **Para la reconciliación posterior** (F110-12): en las reglas de aporte, pausar,
  finalizar y archivar pasan a depender de la meta (§4), y las operaciones que
  consultan el historial efectivo para decidir si algo es elegible, como Deshacer
  una omisión (ADR-016 §6.4), lo leen de forma consistente, bajo los bloqueos de §4.
  La spec 007 y, si hace falta, una nota de ADR-016 §14 lo recogen en el PR de
  reconciliación. Este PR no toca ADR-016.
- ADR-016 no cambia: recibe la pausa derivada en su historial de pausas (§6.2), y
  `reason = goal_inactive` se escribe como ya preveía, por la dueña.
- Las restricciones de §1 completan el contrato de ADR-017 §1.
- **La 29.8 queda decidida** con P2 (b). Su cierre normativo (spec 007 y maestro,
  decisión 29) se registra en el PR de reconciliación posterior; este PR no toca la
  spec ni el maestro.

## Verificación pendiente [V]

1. **Historia de la meta y escritura protegida** (§3.1; F110-4):
   - cada cambio real de estado de `savings_goals` deja una fila con su
     `goal_version`, en la misma transacción, también la reactivación de
     `goal_void_reactivate`; una actualización sin cambio de estado no deja
     ninguna;
   - un fallo de la inserción revierte la transición;
   - lograr, archivar y reactivar funcionan con `juntia_writer` y con el trigger
     `security invoker` de la reactivación;
   - **prueba negativa:** `authenticated` y `juntia_writer` no pueden insertar,
     actualizar, borrar ni truncar eventos, y no se puede fabricar una inactivación
     histórica por ninguna función expuesta;
   - el dueño de la tabla sí puede borrar, para el borrado de cuenta;
   - la siembra cubre las metas ya inactivas;
   - **pruebas negativas del cursor** (F110-9): una transición de estado sin
     incremento de `version`, o una actualización que la hace retroceder, se rechaza
     sin dejar evento ni cambiar la meta; dos eventos de la misma meta nunca
     comparten `goal_version`.
2. **Privacidad de Metas** (pgTAP con tres cuentas). Lograr, archivar y reactivar una
   meta compartida dan resultados, errores y auditoría idénticos con y sin una
   programación privada de Ana. `juntia_writer` no tiene ningún privilegio nuevo
   sobre las tablas `recurring_*`.
3. **Equivalencia** (ADR-016 `[V]` P4; 29.9). Un aporte manual de Ana y el mismo
   aporte confirmado desde su programación son indistinguibles para Beto en vistas,
   exportación, errores y metadatos, también en `goals_overview` (fecha del último
   aporte) y en `goal_entries`.
4. **Pausa derivada** (dominio y pgTAP):
   - las posiciones posteriores a la inactivación quedan consumidas;
   - la reactivación no reanuda;
   - reanudar escribe la pausa cerrada con su fecha de inicio derivada y avanza el
     ancla;
   - **el contraejemplo de F110-1** completo (§3.2, ejemplo con pausa manual): la
     lectura justo después de reanudar da la regla activa, y la inactivación
     posterior abre una pausa nueva;
   - con una pausa manual abierta, nunca hay dos pausas abiertas;
   - una segunda inactivación antes de reanudar no cambia el inicio;
   - **el mismo día** (F110-2): inactivar, reactivar y reanudar; una segunda
     inactivación ese día abre una pausa nueva; la pausa del mismo día consume cero
     posiciones; y el cambio de fecha en Bogotá alrededor de la medianoche;
   - eventos con el mismo `occurred_at` se ordenan por `goal_version`;
   - una regla finalizada o archivada no acumula pausas que cuenten después de su
     fin (F110-5);
   - **el caso B de ADR-016 §6.4 con una pausa `goal_inactive`** (F110-8): la regla
     termina sola durante la pausa derivada; las posiciones sin hechos que cayeron en
     ella siguen consumidas y no reaparecen como pendientes; una omitida dentro de la
     pausa sigue sin poder deshacerse; y finalizar a mano o archivar una regla
     pausada por la meta no recupera ninguna posición consumida ni cambia la lista
     de cancelación;
   - **la medianoche con espera real** (F110-10): una reanudación que espera de
     verdad el bloqueo de la meta mientras otra transacción la inactiva y la
     reactiva al otro lado de la medianoche en Bogotá. Se comprueban las fechas
     (`started_on`, `ended_on` ≥ `started_on` y la fecha del evento), no solo el
     cursor;
   - **pruebas negativas del ancla** (F110-9): un `update` directo de
     `goal_ack_version`, un ancla que retrocede, que supera la versión actual de la
     meta o que se escribe en una regla que no es de aporte se rechazan sin alterar
     el historial;
   - Deshacer una omisión respeta la pausa derivada (ADR-016 §6.4, regla 2).
5. **Concurrencia** (ADR-016 `[V]` P9): los siete órdenes de §4, sin interbloqueos,
   en las dos cuentas, incluidas **pausar frente a inactivar** en los dos sentidos
   (F110-3) y **una reanudación que espera el bloqueo** de la meta mientras otra
   transacción la inactiva o la reactiva (F110-2).
6. **Confirmación:** fecha efectiva hoy o pasada; solo la dueña; meta activa bajo el
   bloqueo; `funding_mode` de la versión, y el cambiado en el borrador.
7. **Restricciones de §1** (P1 (a): solo `fixed`; un rango o un `unknown` en una regla de aporte se rechaza), también por SQL directo, y **pruebas negativas
   del ancla** (F110-9): `goal_ack_version` es obligatoria en las reglas de aporte y
   nula en las demás, y solo la escriben las funciones de crear y reanudar.
8. **P2 (b):** vincular un aporte histórico válido y no anulado de la misma meta y
   aportante funciona con la meta lograda o archivada, y **no** crea un asiento, no
   cambia saldos ni la meta, no reactiva la meta ni la recurrencia. Se mantienen
   **todas** las condiciones de ADR-016 §7.4 (autorización previa, bloqueo,
   precondición, compatibilidad, movimiento activo con fecha ≤ hoy y unicidad): un
   aporte anulado, de otra meta o de otra persona se rechaza. Confirmar un aporte
   **nuevo** en esa meta sigue fallando (`goalNotOpen`). No se exige ninguna
   condición temporal adicional respecto a la inactivación de la meta: la de (c) se
   descartó. Se mantienen todas las condiciones de ADR-016 §7.4.

## Decisiones de los fundadores (26 de noviembre de 2026)

Los fundadores aprobaron P1 (a) y P2 (b). Su texto, transmitido por el gestor, se
cita literalmente:

> Decisiones de los fundadores — ADR-018
>
> P1(a) — Aprobada. Los aportes programados tendrán exclusivamente un importe fijo. No se admiten rangos ni importes desconocidos. La aportante podrá modificar el importe efectivo mediante el borrador antes de confirmar, conforme a ADR-016.
>
> P2(b) — Aprobada. Se permite vincular un aporte histórico válido y no anulado a su instancia programada aunque la meta esté lograda o archivada, siempre que corresponda a la misma meta y a la misma aportante y cumpla todas las condiciones de ADR-016 §7.4.
>
> El vínculo no crea un aporte nuevo, no modifica saldos, no mueve fondos y no reactiva la meta ni la recurrencia.
>
> Crear o confirmar aportes nuevos en una meta inactiva sigue prohibido.
>
> Con P2(b) queda decidida la cuestión 29.8, cuyo cierre normativo deberá registrarse en el posterior PR de reconciliación.
>
> Registra literalmente estas decisiones y marca las alternativas descartadas.
>
> Completa las correcciones F110-8 a F110-10 y las precisiones F110-11 y F110-12, sin cambiar la arquitectura propuesta.
>
> ADR-018 permanece Propuesto hasta obtener el GO arquitectónico y la revisión final de fidelidad.
>
> No se reabren ADR-016, ADR-017 ni las decisiones anteriores. Q15 sigue abierta y no se autoriza todavía Plan ni implementación.
>
> Mantener la precedencia de Planes, los gates independientes y las restricciones de N-8.

| # | Cuestión | Decidida | Descartadas | Dónde |
| --- | --- | --- | --- | --- |
| P1 | Importe de un aporte programado | (a) solo fijo; sin rangos ni importes desconocidos; el importe efectivo se puede cambiar en el borrador antes de confirmar (ADR-016) | (b) fijo o estimado con rango | §1; [V] 7 |
| P2 | **29.8:** vincular un aporte histórico a una meta inactiva | (b) se puede vincular un aporte histórico válido y no anulado de la misma meta y aportante, con todas las condiciones de ADR-016 §7.4, aunque la meta esté lograda o archivada; sin crear aportes, mover fondos ni reactivar nada | (a) no se puede; (c) como (b), solo si se registró antes de la primera inactivación posterior al ancla | §6; [V] 8 |

**La 29.8 queda decidida** con P2 (b). Su cierre normativo, en la spec 007 y en la
decisión 29, se registra en el PR de reconciliación posterior. Q15 sigue abierta.
No se reabren ADR-016, ADR-017 ni las decisiones anteriores, y no se autoriza
todavía el Plan ni la implementación. Se mantienen la precedencia de Planes, los
gates independientes y las restricciones de N-8 (28.18).

## Referencias

- `docs/JUNTIA_MASTER.md` §5.6 (DEC-G01 a DEC-G06), §15.4 (DEC-G04) y §15.10
  (decisiones 22.13, 22.15, 29.7, 29.8, 29.9, 29.10, 29.11 y 29.12)
- `specs/007-recurrentes-calendario/spec.md`: Q12, D7, F101-2, F101-7, F101-16,
  FR-030 a FR-034a y US6
- `specs/004-presupuestos-y-metas/spec.md`, FR-040 (aportes de hoy o del pasado)
- ADR-010 · ADR-013 §2 y §3 · ADR-015 §5 · ADR-016 §4, §6.2, §6.4, §7.3, §7.4, §10,
  §11, §12 y §14 · ADR-017 §1 y §3
- `supabase/migrations/` (revisadas el 26 de noviembre de 2026, sin cambios)
