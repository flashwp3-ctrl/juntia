# ADR-018 — Aportes programados: confirmación, pausa por meta inactiva y concurrencia

**Estado:** **Propuesto** (26 de noviembre de 2026). Es el candidato **ADR-d** del análisis (`docs/propuestas/analisis-planificacion-financiera.md` §6), con el número que le toca al abrirse (maestro §15.10, decisión 29.10). Se acepta antes de la etapa Plan de la spec 007 (`AGENTS.md` 17). No se implementa antes de declarar MVP-1 ni antes de que Planes (spec 006) esté aceptada (28.18, condición 6) · **Origen:** especificación 007 (`specs/007-recurrentes-calendario/spec.md`), Q12, D7, F101-2, F101-7, F101-16, FR-030 a FR-034a y US6; maestro §15.10, decisiones 29.7, 29.8, 29.9 y 29.10; ADR-016 §6.2, §10 y §14; ADR-017 §1 · **Alcance:** MVP-2

En este archivo `[P]` es una **propuesta** que necesita decisión de los
fundadores y `[V]` una **verificación pendiente** (maestro §15.9). Los nombres de
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
| 1 | `amount_kind` y modo de financiación de los aportes | ADR-017 §1; ADR-016 §10 | §1 (P1) |
| 2 | Confirmación: crea el aporte real, solo del propio aportante y solo con la meta activa | Q12; FR-030, FR-031, FR-034a; 004, FR-040 | §2 |
| 3 | Privacidad: la programación es privada y el aporte confirmado es indistinguible del manual | Q12; F101-2; FR-033; 29.9 | §2 y §5 |
| 4 | Cómo y quién escribe la pausa `goal_inactive` (D7), sin dar a `juntia_writer` acceso a recurrencias privadas ni revelar su existencia desde Metas | ADR-016 §6.2 y §10; F101-7 | §3 |
| 5 | Una meta reactivada no reanuda la recurrencia | F103-5; ADR-016 §6.2 | §3 |
| 6 | Concurrencia con lograr y archivar, y la carrera entre reanudar y lograr | F101-7, F101-16; US6.6; ADR-016 §14 | §4 |
| 7 | **29.8:** vincular un aporte histórico a una meta inactiva | 29.8; FR-034a | §6 (P2, sin cerrar) |

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

- **Importe:** según P1. Recomendación: **solo `fixed`**. Un aporte programado es
  una decisión propia de cuánto apartar; con un importe fijo, el toque único de
  ADR-016 §7.2 funciona sin abrir el borrador. Con P1 (b), un rango abriría el
  borrador al confirmar, como un gasto estimado. En ningún caso `unknown`
  (ADR-017 §1).
- **Modo de financiación:** la versión de la regla guarda el `funding_mode` que
  usará el aporte (`reserved` o `transferred_declared`, los mismos de la 004). Es
  un dato editable de la versión (ADR-016 §4), no un dato del calendario. El
  borrador de confirmación permite cambiarlo antes de guardar.
- La compatibilidad de la versión con la regla (aporte ⇒ `fixed` o lo que diga P1,
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

**La causa** es que la historia de estados de una meta no se guarda en un sitio
legible. **Se quita la causa:**

1. **Historia de estados de la meta.** Tabla nueva, de solo inserción,
   `juntia_data.goal_status_events`: `goal_id`, `status` (`active`, `completed`,
   `archived`), `occurred_at`. La llena un **trigger `after update of status`** de
   `savings_goals` que inserta una fila por cada cambio de estado, en la misma
   transacción que el cambio. No modifica ninguna función de MVP-1, ni ADR-010, ni
   los estados o transiciones de Metas: solo anota lo que ya ocurre, también la
   reactivación de `goal_void_reactivate`.
   - **No sabe nada de recurrencias**: no las lee ni las escribe. Su éxito o su
     fallo no dependen de que exista una programación privada, así que la operación
     de Metas no puede revelarla, ni por errores, ni por resultados, ni por la
     auditoría ni por el tiempo.
   - Se lee con la RLS de la meta: la ve quien ve la meta. No es una tabla de
     dinero ni guarda importes.
   - Al migrar, se siembra una fila por cada meta que ya esté lograda o archivada,
     con su `completed_at` o `archived_at`.
2. **La pausa `goal_inactive` abierta se deriva** al leer, para la regla de aporte
   r de la meta g:
   - el **ancla** de r es el final de su última pausa `goal_inactive` guardada o, si
     no tiene, su creación;
   - si existe un evento de g a `completed` o `archived` con `occurred_at`
     posterior al ancla, r tiene una pausa `goal_inactive` **abierta**, con
     `started_on` = la fecha, en Bogotá, del **primero** de esos eventos.

   Esa pausa abierta entra en el historial de pausas de ADR-016 §6.2 como una más:
   la proyección de ADR-016 la usa para el estado de la regla (Pausada), para las
   posiciones consumidas y para la precedencia de Deshacer (§6.4). **No hay una
   segunda función de estado**: ADR-016 recibe un historial de pausas más
   completo.
3. **La escribe su dueña, al reanudar.** Reanudar un aporte programado exige la
   meta activa (ADR-016 §6.2) y es una acción explícita de la dueña. Esa operación,
   que ya escribe en su propia regla, **materializa** la pausa derivada como una
   fila cerrada de `recurring_rule_pauses` (`reason = goal_inactive`,
   `started_on` derivado y `ended_on` = hoy). Desde ese momento el ancla avanza y la
   pausa deja de derivarse.
   - Si cuando la meta se inactivó la regla ya tenía una **pausa manual abierta**,
     esa pausa la cubría: reanudar cierra la manual y no escribe ninguna fila
     `goal_inactive`, de modo que no hay solapes (ADR-016 §6.2).
   - **Pausar** a mano no está disponible mientras la regla esté pausada por la
     meta.
4. **Una meta reactivada no reanuda la recurrencia** (F103-5). La reactivación es
   un evento a `active` y no mueve el ancla: la pausa derivada sigue abierta hasta
   que la dueña reanuda. Una segunda inactivación antes de reanudar no abre otra
   pausa: la abierta empezó en la primera.
5. **Nadie más escribe en la regla.** `juntia_writer`, en la sesión de quien logra o
   archiva la meta, no lee ni escribe recurrencias, y no gana ningún privilegio
   sobre ellas.

**Ejemplo** (fechas ficticias). Ana programa un aporte mensual del día 5 a una meta
compartida.

| Fecha | Qué pasa | Resultado para la regla de Ana |
| --- | --- | --- |
| 10 de marzo | Beto da la meta por lograda | Pausa `goal_inactive` abierta desde el 10 de marzo, derivada. Las posiciones del 5 de abril en adelante quedan consumidas |
| 20 de marzo | La meta se archiva | Nada nuevo: la pausa sigue abierta desde el 10 |
| — | La meta archivada vuelve a `active` (`goal_void_reactivate`) | La regla **sigue pausada** |
| 2 de junio | Ana reanuda, con la meta activa | Se escribe la pausa cerrada del 10 de marzo al 2 de junio. La posición del 5 de junio se genera |

Una meta lograda no vuelve a `active`: su regla queda pausada hasta que la dueña la
finalice. Sus pendientes anteriores se conservan (ADR-016 §5), y si se pueden
vincular depende de P2.

### 4. Concurrencia

Los órdenes de bloqueo son los de ADR-016 §14. Este ADR los aplica a sus dos casos:

| Operación | Orden |
| --- | --- |
| Confirmar un aporte | pareja si la meta es compartida → meta → regla → instancia → `contribute_to_goal` (que vuelve a pedir pareja y meta) |
| Reanudar un aporte | pareja si la meta es compartida → meta → regla |
| Lograr o archivar la meta (MVP-1) | pareja si la meta es compartida → meta. El trigger de §3 inserta en `goal_status_events` sin bloquear ninguna regla |

Como lograr y archivar **ya no tocan las reglas**, no hay ningún ciclo posible con
ellas. Los resultados salen del orden efectivo:

| Orden efectivo | Resultado |
| --- | --- |
| Confirmar y después lograr | El aporte es válido y se conserva. La meta queda lograda y la regla pausada desde la fecha de la inactivación (US6.6) |
| Lograr y después confirmar | La confirmación falla con `goalNotOpen` (004) y la instancia queda pendiente (F101-16) |
| Aporte que deja saldo, y después archivar | Archivar sigue sus propios requisitos (22.15; 004, FR-040) |
| Reanudar y después lograr | La regla se reanuda, y la inactivación posterior abre una pausa nueva (el ancla ya avanzó) |
| Lograr y después reanudar | Reanudar falla: la meta no está activa bajo su bloqueo |

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

### 6. Vincular un aporte histórico a una meta inactiva (29.8) `[P]` P2

**La cuestión** (29.8; FR-034a). Ana hizo un aporte manual cuando la meta estaba
activa y no lo vinculó a su instancia. La meta pasa a lograda o archivada. ¿Puede
vincular después ese aporte a la instancia pendiente? **Crear** un aporte nuevo en
una meta inactiva sigue prohibido en cualquier caso (004, FR-040; F101-16).

Opciones:

- **(a) No se puede vincular** mientras la meta no esté activa. Vincular añadiría a
  §7.4 de ADR-016 la condición «meta activa». La instancia se puede omitir o queda
  pendiente.
- **(b) Se puede vincular un aporte ya existente**, válido y no anulado, de la misma
  meta y la misma aportante (la compatibilidad de ADR-016 §7.4), aunque la meta ya
  no esté activa. No crea dinero ni mueve fondos: solo reconoce que la obligación
  se cumplió cuando la meta estaba activa.
- **(c)** Como (b), pero solo si la fecha del aporte es anterior a la
  inactivación.

**Recomendación: (b).** El vínculo no tiene efecto económico, y el aporte, por
definición, se creó con la meta activa (FR-040), así que la condición de (c) se
cumple siempre salvo en reactivaciones, donde no añade protección. (a) dejaría
pendientes que el sistema sabe cumplidas. **Esta decisión es de los fundadores**:
este ADR no la cierra.

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
  función de MVP-1 cambian. Entra en el contrato del borrado manual de cuenta (005)
  como una tabla más de la meta, y en la exportación, si el Plan lo decide, como
  historia de la meta.
- ADR-016 no cambia: recibe la pausa derivada en su historial de pausas (§6.2), y
  `reason = goal_inactive` se escribe como ya preveía, por la dueña.
- Las restricciones de §1 completan el contrato de ADR-017 §1.
- **La 29.8 sigue abierta** hasta que los fundadores decidan P2.

## Verificación pendiente [V]

1. **Historia de la meta.** Cada cambio de estado de `savings_goals` deja una fila
   en `goal_status_events` en la misma transacción, también la reactivación de
   `goal_void_reactivate`. Un fallo revierte el cambio. La siembra cubre las metas ya
   inactivas.
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
   - con una pausa manual abierta, no hay solapes;
   - una segunda inactivación antes de reanudar no cambia el inicio;
   - Deshacer una omisión respeta la pausa derivada (ADR-016 §6.4, regla 2).
5. **Concurrencia** (ADR-016 `[V]` P9): los cinco órdenes de §4, sin interbloqueos,
   en las dos cuentas.
6. **Confirmación:** fecha efectiva hoy o pasada; solo la dueña; meta activa bajo el
   bloqueo; `funding_mode` de la versión, y el cambiado en el borrador.
7. **Restricciones de §1** según P1, también por SQL directo.
8. **Si P2 es (b) o (c):** vincular un aporte no anulado de la misma meta y
   aportante funciona con la meta inactiva, y nunca crea un asiento; uno anulado, de
   otra meta o de otra persona se rechaza (ADR-016 §7.4).

## Cuestiones para los fundadores `[P]`

| # | Cuestión | Opciones | Recomendación | Dónde |
| --- | --- | --- | --- | --- |
| P1 | Importe de un aporte programado | (a) solo fijo; (b) fijo o estimado con rango. Nunca desconocido (ADR-017 §1) | (a): un aporte es una decisión propia, y el toque único funciona sin abrir el borrador | §1 |
| P2 | **29.8:** vincular un aporte histórico a una meta inactiva | (a) no se puede; (b) se puede vincular un aporte existente, no anulado, de la misma meta y aportante; (c) como (b), solo si es anterior a la inactivación | (b): no tiene efecto económico y no deja pendientes que ya se cumplieron. Crear aportes nuevos sigue prohibido | §6 |

## Referencias

- `docs/JUNTIA_MASTER.md` §5.6 (DEC-G01 a DEC-G06), §15.4 (DEC-G04) y §15.10
  (decisiones 22.13, 22.15, 29.7, 29.8, 29.9, 29.10, 29.11 y 29.12)
- `specs/007-recurrentes-calendario/spec.md`: Q12, D7, F101-2, F101-7, F101-16,
  FR-030 a FR-034a y US6
- `specs/004-presupuestos-y-metas/spec.md`, FR-040 (aportes de hoy o del pasado)
- ADR-010 · ADR-013 §2 y §3 · ADR-015 §5 · ADR-016 §4, §6.2, §6.4, §7.3, §7.4, §10,
  §11, §12 y §14 · ADR-017 §1 y §3
- `supabase/migrations/` (revisadas el 26 de noviembre de 2026, sin cambios)
