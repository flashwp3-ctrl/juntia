# ADR-007 — Correcciones

**Estado:** Aceptado, con enmienda del 6 de noviembre de 2026 y nota del 18 de noviembre de 2026 (borrado administrativo de cuenta) · **Origen:** documento maestro v1.0 §12.2 · **Archivo creado:** 6 de noviembre de 2026, con la especificación 003 (P0-2) · **Alcance:** P0

## Decisión (maestro §12.2)

> Ajustes auditados recalculan balances; liquidaciones inmutables.

Desarrollo en el maestro §5.4:

- Una **edición** registra quién la hizo, cuándo, el valor anterior y el nuevo, y
  recalcula las partes y los saldos en una sola operación atómica.
- Una **anulación** excluye el gasto de los agregados y conserva su rastro de
  auditoría, sin borrar las liquidaciones relacionadas.
- Si una corrección invierte el saldo de un gasto ya liquidado, se muestra el
  saldo revisado. Una transferencia real nunca se «revierte» sin un asiento
  explícito nuevo.

Este archivo existe porque la especificación 003 necesita más detalle del que
cabe en la fila del maestro (`docs/adr/README.md`). **No sustituye** la
resolución de §12.2; la enmienda de abajo está registrada en el maestro §15.10,
decisión 20, que prevalece.

## Enmienda · 6 de noviembre de 2026 (decisión 20.11)

**La tomaron los fundadores** al responder la pregunta Q11 de la especificación
003. Alejandro la comunicó en nombre de los dos y la segunda fundadora la
confirma con el merge del PR de la especificación.

**El problema.** Antes de la enmienda, una liquidación registrada por error (otro
importe, otra persona, una duplicada) solo se podía compensar con otra liquidación
en sentido contrario. El maestro §5.1 la prohíbe, porque aumenta el sobrepago.
Así que el error quedaba en el saldo sin forma de corregirlo.

**La enmienda.** «Inmutable» significa, a partir de ahora, **que nunca se edita
ni se borra**. Una liquidación **sí se puede anular**:

1. La anula cualquiera de los dos integrantes, igual que cualquiera de los dos
   puede registrarla (decisión 20.10).
2. La anulación es una operación propia: atómica, idempotente, con el grupo
   bloqueado y con auditoría (actor, instante, liquidación anulada).
3. La liquidación anulada **sale del saldo** y **sigue en el historial**, marcada
   como anulada y visible para los dos. Ninguno de sus campos cambia.
4. Justo después de registrarla hay un «Deshacer» de 6 s, que es la misma
   anulación.
5. Para corregir el importe se anula la liquidación y se registra otra nueva,
   con las reglas de siempre: deudor → acreedor y un importe que no supere el
   saldo pendiente (§5.1).

**Lo que no cambia.** Una liquidación nunca se edita, nunca se borra y nunca se
reescribe en silencio porque cambie un gasto (US-06, US-10). Nunca existe una
liquidación que aumente el sobrepago de forma deliberada.

## Nota · 18 de noviembre de 2026: el borrado administrativo de cuenta (maestro §15.10, decisiones 24.8 y 25.3)

**No cambia la decisión.** Registra una excepción limitada, decidida por los
fundadores al aprobar el plan de la especificación 005 (D2, opción a) y escrita en
el PR documental de cierre de P0-3 (004-T085).

**El contexto.** En MVP-1 la eliminación de cuenta es un procedimiento manual
(maestro §15.6.1, enmienda del 17 de noviembre de 2026). Ninguna clave foránea
hacia `auth.users` tiene `on delete`, y las liquidaciones y la auditoría tienen
triggers que rechazan `update` y `delete` para cualquier rol. Sin una excepción,
los datos de una persona que pide irse no se podrían borrar nunca.

**La excepción.** El procedimiento de
`specs/005-gate-mvp-1/contracts/account-deletion.md` (`scripts/account-deletion/`)
puede borrar las liquidaciones y la auditoría de las personas de su alcance:

1. **Solo ese procedimiento**, autorizado y ensayado en `juntia-dev`, con el
   manifiesto de aprobaciones, confirmaciones por canal propio y exportaciones de
   cada persona. Nunca desde la app, nunca por una función expuesta y nunca para
   corregir datos: una liquidación equivocada se sigue **anulando** (enmienda del
   6 de noviembre de 2026).
2. **Una sola transacción, como dueño de las tablas.** Toma todas las tablas que
   toca **en un orden fijo y con `lock_timeout`** antes de leer nada; si no las
   consigue, revierte sin cambiar nada y el error es recuperable. Suspende **por
   nombre** solo cinco triggers: `audit_events_append_only`,
   `budget_versions_append_only`, `goal_ledger_append_only`,
   `goal_allocations_append_only` y `settlements_guard`. Los reactiva con
   `enable trigger` antes del `commit`, comprueba las restricciones diferidas y las
   invariantes, y cualquier fallo revierte también la suspensión.
3. **`allocations_check_sum` no se suspende.** Se comprobó el 18 de noviembre de
   2026 en `juntia-dev` (caso 1 de 005-T039, N1): un borrado completo en el que el
   gasto también desaparece lo cumple. Tampoco se tocan los triggers
   `*_no_truncate` (el script no usa `truncate`), las claves foráneas ni
   `session_replication_role`.
4. **Nunca borra la auditoría de un actor externo.** Si una persona de fuera del
   alcance dejó auditoría sobre algo del alcance, el procedimiento se detiene antes
   de empezar (`blocked_external_link`) y la decisión sobre ese registro es de los
   fundadores.
5. **Con pareja activa se borra la pareja completa**, con el «sí» de las dos
   (D2). No se diseña aquí la salida de un integrante, que sigue en ADR-003.

**Lo que no cambia.** Para la app y para cualquier otro camino, una liquidación
nunca se edita ni se borra, y la auditoría es de solo inserción.

## Verificación pendiente [V]

En P0-2: pgTAP de la anulación (éxito, rechazo con una tercera cuenta, repetición
idempotente y una liquidación ya anulada) e integración concurrente (anular
mientras el otro integrante registra otra liquidación o edita un gasto).

## Referencias

- `docs/JUNTIA_MASTER.md` §5.1, §5.4, §12.2 y §15.10 (decisión 20)
- `specs/003-pareja-y-balances/spec.md`, Q10 y Q11, FR-027 y FR-028
- ADR-013 §3 (idempotencia y bloqueo del agregado) y su nota del 18 de noviembre de 2026
- `specs/005-gate-mvp-1/contracts/account-deletion.md` y `specs/005-gate-mvp-1/plan.md` (D2; filas 19 y 22 de la lista de T085)
