# ADR-007 — Correcciones

**Estado:** Aceptado, con enmienda del 6 de noviembre de 2026 · **Origen:** documento maestro v1.0 §12.2 · **Archivo creado:** 6 de noviembre de 2026, con la especificación 003 (P0-2) · **Alcance:** P0

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

## Verificación pendiente [V]

En P0-2: pgTAP de la anulación (éxito, rechazo con una tercera cuenta, repetición
idempotente y una liquidación ya anulada) e integración concurrente (anular
mientras el otro integrante registra otra liquidación o edita un gasto).

## Referencias

- `docs/JUNTIA_MASTER.md` §5.1, §5.4, §12.2 y §15.10 (decisión 20)
- `specs/003-pareja-y-balances/spec.md`, Q10 y Q11, FR-027 y FR-028
- ADR-013 §3 (idempotencia y bloqueo del agregado)
