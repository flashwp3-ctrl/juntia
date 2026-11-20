# ADR-010 — Metas

**Estado:** Aceptado, con notas del 7 de noviembre de 2026 y del 17 y 18 de noviembre de 2026 (fotos a MVP-2; borrado administrativo de cuenta) · **Origen:** documento maestro §12.2 · **Archivo creado:** 7 de noviembre de 2026, con la especificación 004 (P0-3) · **Alcance:** P0

## Decisión (maestro §12.2, sin cambios)

> Ledger auditable separado de consumo; usos enlazados a gasto, sin doble
> contabilización; confirmación para aportes ajenos.

Desarrollo en el maestro §5.1, §5.6 (DEC-G01 a DEC-G06), §7.3, §15.4 y §15.5:

- Una meta es privada **XOR** compartida. Su saldo se deriva de un **ledger
  auditable** (`goal_ledger_entries`): `goal_balance = Σ aportes − Σ retiros − Σ
  usos`, siempre ≥ 0, y también ≥ 0 por aportante.
- Los aportes, retiros y usos **no son gastos** ni se insertan como gastos ficticios
  en `transactions`; no cambian `net_owed`, `group_total` ni el consumo de los
  presupuestos.
- Un uso de meta siempre se enlaza a **un gasto real** del mismo contexto y moneda;
  el gasto cuenta en el consumo y el uso no cuenta dos veces
  (`total_destinado_neto`, §15.4).
- El uso se atribuye a los aportantes cuyos fondos se consumen
  (`goal_usage_allocations`), independiente del reparto del gasto.
- Usar o retirar fondos de otra persona exige su **confirmación explícita**
  (`goal_usage_confirmations`). En el gasto con meta, el gasto y el uso de fondos
  propios se registran de inmediato; los fondos ajenos se aplican solo al aprobar,
  en una operación separada que revalida todo (§15.5; §15.6.3 puntos 5 y 6).

Este archivo existe porque la especificación 004 necesita más detalle del que
cabe en la fila del maestro (`docs/adr/README.md`). **No sustituye ni amplía**
la resolución de §12.2; si la contradice, manda el maestro.

## Nota de implementación · 7 de noviembre de 2026 (decisión 22.13): anular un aporte

Decisión de los fundadores sobre la pregunta Q13 de la especificación 004. US-23
habla de «retiro o anulación de aporte» sin distinguirlos.

1. **Un retiro y una anulación son cosas distintas.** El retiro es una reasignación
   real de fondos propios no consumidos, con motivo, y cuenta en
   `retiro_de_metas` del mes del retiro. La anulación corrige un aporte registrado
   por error: el aporte **sale** de `aporte_a_metas` de su mes y del saldo, como si
   no hubiera existido para las cifras.
2. **Un aporte nunca se edita ni se borra.** Se anula con auditoría (actor,
   instante, aporte anulado) y sigue en el historial marcado como anulado, visible
   para quien lo ve. Para corregir el importe se anula y se registra otro. Es la
   misma regla que ADR-007 da a las liquidaciones.
3. **Quién y cuándo.** Solo quien aportó, y solo mientras esos fondos sigan
   disponibles (no usados en un gasto). Hay un «Deshacer» de 6 s justo después de
   registrar, que es la misma anulación, y «Anular aporte» desde el historial.
4. **Atómica e idempotente**, con la meta bloqueada, como toda operación del ledger.
   El ledger sigue siendo de solo inserción: la anulación es un asiento o un estado
   nuevo, nunca una reescritura del importe; el plan de la 004 fija la forma.

## Nota de implementación · 7 de noviembre de 2026 (decisión 22.17): revertir el uso

Decisión de los fundadores sobre la pregunta Q17 de la especificación 004. ADR-001
punto 7 bloquea Mover a Pareja de un gasto financiado con una meta personal «hasta
que exista una reversión autorizada y auditada» del uso; esa reversión no existía.

1. **«Quitar el uso de la meta»** es una operación propia, atómica e idempotente,
   desde el detalle del gasto: anula los usos aplicados (los fondos vuelven a cada
   aportante) y cancela la solicitud pendiente si la hay, con auditoría. Ningún
   vínculo se borra en silencio. La puede hacer cualquier integrante del contexto
   del gasto, porque solo devuelve fondos a sus dueños.
2. **Anular un gasto con meta** quita el uso en la misma operación, y la
   confirmación lo dice. Un gasto anulado nunca deja fondos de una meta consumidos.
3. **Editar el monto** por debajo de lo ya usado se rechaza; primero se quita el uso
   o se usa menos. Las demás ediciones no tocan el uso.
4. **Una solicitud pendiente** se revalida al aprobar y falla sin cambiar nada si ya
   no cabe (fondos del aportante, estado de la meta o importe del gasto).
5. Con el uso quitado, el punto de extensión `juntia_private.transaction_goal_funded`
   (FR-035 de la 003) devuelve `false` y Mover a Pareja vuelve a estar disponible.

## Nota · 18 de noviembre de 2026: la única excepción a «los aportes no se borran» (maestro §15.10, decisiones 24.8 y 25.3)

**No cambia la decisión.** El ledger de metas sigue siendo de solo inserción: un
aporte nunca se edita ni se borra, y una corrección es una anulación (nota de la
decisión 22.13) o un asiento `void`. Esta nota, escrita en el PR documental de
cierre de P0-3 (004-T085) por la revisión del plan de la 005 (F85-8), añade **una
única excepción**:

1. **El borrado de los asientos de una persona o de una pareja**, con sus usos,
   asignaciones y solicitudes, **solo** con el procedimiento autorizado y ensayado
   del borrado manual de cuenta de MVP-1
   (`specs/005-gate-mvp-1/contracts/account-deletion.md`), con el manifiesto de
   aprobaciones, confirmaciones y exportaciones. Nunca desde la app, nunca por una
   función expuesta y nunca para corregir datos.
2. **El ciclo entre `goal_ledger_entries.confirmation_id` y
   `goal_usage_confirmations.usage_entry_id`** se rompe poniendo a `NULL`
   `confirmation_id`, con `goal_ledger_append_only` suspendido, antes de borrar las
   dos filas. Nunca el otro lado: una solicitud aprobada exige su `usage_entry_id`.
   Los asientos `void` se borran antes que los asientos que anulan.
3. Las demás reglas del procedimiento —una transacción como dueño, locks en orden
   fijo con `lock_timeout`, la suspensión por nombre de solo cinco triggers
   (`audit_events_append_only`, `budget_versions_append_only`,
   `goal_ledger_append_only`, `goal_allocations_append_only` y
   `settlements_guard`), `allocations_check_sum` sin suspender (N1) y la auditoría
   de un actor externo nunca borrada— están en la nota del mismo día de ADR-007 y
   en la de ADR-013.

## Fuera de P0-3

La subida de fotos de las metas queda fuera de P0-3 (decisión 22.6) y necesitará
un ADR propio, **ADR-014** (Storage privado de fotos de metas), antes de P0-4.

> **Nota del 17 de noviembre de 2026** (maestro §15.10, decisión 24.13): las metas
> **no tienen foto en MVP-1**; se queda el fallback aprobado de GoalCard y
> **ADR-014 pasa a MVP-2**. El «antes de P0-4» de arriba queda sin efecto.

## Verificación pendiente [V]

En P0-3 (spec 004): pgTAP de anular un aporte (éxito, aporte de otra persona,
fondos ya usados, repetición idempotente, ya anulado) y de quitar el uso (éxito,
tercera cuenta, repetición idempotente, con solicitud pendiente); integración
concurrente (anular contra usar, quitar el uso contra aprobar, anular el gasto
contra aprobar); y `transaction_goal_funded` con datos.

## Referencias

- `docs/JUNTIA_MASTER.md` §5.1, §5.6, §7.3, §12.2, §15.4, §15.5, §15.6.3 y §15.10 (decisión 22)
- `specs/004-presupuestos-y-metas/spec.md`, Q13, Q14, Q17 y Q18, FR-040 a FR-059
- ADR-001 punto 7 · ADR-007 (anulación auditada) · ADR-013 §2.4 y §3
- `specs/005-gate-mvp-1/contracts/account-deletion.md` y `specs/005-gate-mvp-1/plan.md` (D2; fila 22 de la lista de T085, F85-8)
