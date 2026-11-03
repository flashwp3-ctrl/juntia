# ADR-001 — Conversión de un gasto privado a compartido

**Estado:** Aceptado · **Origen:** documento maestro v1.0 §12.2 · **Detalle acordado:** fase de diseño, 2 de noviembre de 2026 · **Alcance:** P0

## Contexto

Una persona registra un gasto en su contexto privado y después descubre que
corresponde a la pareja. La forma intuitiva de resolverlo —un interruptor que
cambia el contexto del registro— es la equivocada: convierte silenciosamente un
dato privado en uno visible para otra persona, altera balances ya consultados y
no deja rastro de qué pasó ni de quién lo hizo.

El problema se agrava cuando el gasto privado ya consumió fondos de una meta
personal: cambiar su contexto dejaría una asignación de meta apuntando a un
gasto que ya no es de quien aportó.

## Decisión

La conversión **no es un toggle invisible**. Es una operación explícita,
atómica y auditada que anula el gasto privado y crea uno compartido.

1. **Una sola acción del usuario** (Contexto Yo → Nosotros más la elección del
   reparto), una sola transacción en el servidor.
2. **El pagador original se mantiene.** No se reasigna quién puso el dinero.
3. **Nunca existen dos gastos activos.** El privado queda anulado y el
   compartido creado dentro de la misma transacción; no hay ventana en la que
   ambos cuenten.
4. **Idempotencia obligatoria** mediante `idempotency_key`: reintentar la misma
   operación no duplica nada.
5. **Auditoría.** Queda registro del gasto anulado, del nuevo, del autor y del
   momento. La auditoría no se borra al deshacer.
6. **Deshacer** se ofrece solo inmediatamente después y solo si el servidor
   confirma que no hay operaciones dependientes.
7. **Bloqueo por financiación de meta.** Si el gasto privado está financiado con
   una meta personal, la conversión se bloquea y la interfaz explica que primero
   hay que revertir ese uso con una operación autorizada y auditada. **No se
   borran los vínculos de meta en silencio.**
8. **No existe «mover a Yo»** (compartido → privado) en P0: devolvería a un
   contexto privado un dato que la otra persona ya vio.

## Consecuencias

- El modelo de datos necesita estado de anulación y referencia entre el registro
  anulado y su reemplazo, no un campo `context` mutable.
- La RLS debe cubrir también el registro anulado: su visibilidad no cambia por
  haber sido anulado.
- Los agregados y las exportaciones deben excluir los registros anulados sin
  perderlos del historial.
- La interfaz muestra una vista previa de los balances antes de confirmar
  (`ChangePreview`), porque la operación afecta a otra persona.

## Verificación pendiente [V]

Transacción única, comportamiento bajo concurrencia, idempotencia y RLS del
registro anulado. Por probar durante la implementación; no se da por resuelto.

## Referencias

- `docs/JUNTIA_MASTER.md` §12.2 y §15.5
- `docs/design/HANDOFF_CLAUDE_CODE.md` — flujo «Mover a Pareja»
- `docs/design/COMPONENT_SPECIFICATIONS.md` — ChangePreview, flujo Mover a Pareja
