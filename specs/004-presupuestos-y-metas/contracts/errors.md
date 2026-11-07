# Errores: código → error de dominio → copy — 004

Amplía las tablas de la 002 (`JT001`–`JT017`) y la 003 (`JT101`–`JT119`), que siguen
vigentes. Mismas reglas: `src/lib/db/errors.ts` traduce cada código a un error de
dominio tipado; la interfaz lo muestra con su clave de `src/lib/copy/es.ts`; el
mensaje técnico nunca llega a la pantalla y un código desconocido cae en
`unexpected`. Las claves de copy son propuestas del plan; la redacción final la
aprueban los fundadores en cada PR (`docs/CONVENTIONS.md` B.1), con las palabras
prohibidas del glosario §9.

## Rechazo confirmado frente a resultado desconocido

Sin cambios respecto a la 003 (FR-059 de la 003; FR-093): todo código `JTnnn` es un
**rechazo confirmado** (la transacción se revirtió y no se escribió nada). Red, tiempo
agotado (15 s), respuesta perdida, 5xx sin código y reintentos de `40P01`/`40001`
agotados son **resultado desconocido**: la interfaz nunca afirma que no se escribió.

## Códigos nuevos (`JT2nn`, P0-3)

| Código | Error de dominio | Origen | Clave de copy | Dónde se ve |
| --- | --- | --- | --- | --- |
| `JT201` | `goalNotFound` | La meta no existe o no es visible | `copy.goals.errors.notFound` | Detalle, hojas |
| `JT202` | `goalNotOpen` | Aporte a una meta lograda o archivada; cualquier asiento en una archivada | `copy.goals.errors.notOpen` | Registrar aporte |
| `JT203` | `goalContextMismatch` | Meta de otro contexto o moneda que el gasto (DEC-G06) | `copy.errors.unexpected` | Nunca en uso normal: B1 solo ofrece las del contexto |
| `JT204` | `insufficientMemberFunds` | Retiro, uso, aprobación o anulación que dejaría a un aportante por debajo de 0; el mensaje lleva el disponible vigente | `copy.goals.errors.insufficient` («Puedes retirar hasta $X»; en B5, «Tus aportes cambiaron: ahora tienes $X en {meta}») | Retirar, B2, B5, historial |
| `JT205` | `entryNotFound` | Asiento inexistente o no visible | `copy.goals.errors.entryNotFound` | Historial |
| `JT206` | `entryNotVoidable` | Anular un aporte ajeno, un `void` o un asiento que no lo admite | `copy.errors.unexpected` | Nunca en uso normal |
| `JT207` | `entryAlreadyVoided` | Anular dos veces | `copy.goals.errors.alreadyVoided` | Historial |
| `JT208` | `invalidEntryDate` | Fecha futura o anterior a la creación de la meta (Q12) | `copy.goals.errors.date` | Registrar aporte, Retirar |
| `JT209` | `usageExceedsExpense` | El uso total superaría el importe del gasto | `copy.goalExpense.errors.exceedsExpense` | B2, B5 |
| `JT210` | `requestNotFound` | Solicitud inexistente o de otra pareja | `copy.goalExpense.errors.requestGone` | B4, B5 |
| `JT211` | `notRequestParty` | Aprobar o rechazar sin ser a quien se pide; cancelar sin ser quien pide | `copy.errors.unexpected` | Nunca en uso normal |
| `JT212` | `requestResolved` | La solicitud ya se aprobó, rechazó o canceló (incluye perder una carrera, research R3) | `copy.goalExpense.errors.resolved` («Esta solicitud ya se resolvió») | B4, B5 |
| `JT213` | `amountBelowGoalUsage` | Editar el importe por debajo de lo usado de una meta, o dejar un uso vivo en un gasto anulado | `copy.goalExpense.errors.removeUsageFirst` («Primero quita el uso de la meta o usa menos») | Editar gasto |
| `JT214` | `goalTransitionNotAllowed` | Lograr o archivar fuera de las transiciones de data-model §2.3; archivar con saldo o con solicitudes pendientes | `copy.goals.errors.cannotArchive` / `cannotComplete` | Detalle de meta |
| `JT215` | `invalidGoal` | Nombre, tipo, objetivo o mes objetivo no válidos | `copy.goals.form.errors.*` | Nueva meta, Editar meta |
| `JT216` | `invalidFundingMode` | Modo fuera de `reserved`/`transferred_declared` | `copy.errors.unexpected` | Nunca en uso normal |
| `JT217` | `withdrawalReasonRequired` | Retiro sin motivo o con más de 140 caracteres | `copy.goals.withdraw.errors.reason` | Retirar |
| `JT218` | `budgetNotFound` | Presupuesto inexistente o no visible | `copy.plan.errors.notFound` | Plan |
| `JT219` | `budgetAlreadyExists` | Crear un presupuesto que ya existe para esa clave (incluye perder una carrera de creación) | `copy.plan.errors.alreadyExists` («{nombre} ya creó este presupuesto») con «Revisar» | Plan |
| `JT220` | `goalNegative` | Trigger de R2: un asiento dejaría a un aportante por debajo de 0 | `copy.goals.errors.insufficient` | No debería llegar: las funciones lo comprueban antes |
| `JT221` | `invalidBudget` | Límite 0, negativo, no múltiplo de 100, mayor que el máximo, o categoría de ingreso | `copy.plan.form.errors.limit` | Crear y editar presupuesto |
| `JT222` | `appendOnly` | `update` o `delete` sobre un registro de solo inserción | `copy.errors.unexpected` | Nunca en uso normal |
| `JT223` | `invalidUsageAllocation` | Asignaciones que no suman el uso, no son múltiplos de 100 o de quien no es aportante | `copy.goalExpense.errors.allocation` | B2. No debería llegar: el dominio valida antes |
| `JT224` | `oneGoalPerExpense` | Segunda meta en un mismo gasto (decisión 22.16) | `copy.errors.unexpected` | Nunca en uso normal |
| `JT225` | `goalUndoNotAvailable` | Deshacer un aporte, un retiro o un gasto con meta fuera de los 60 s (research R8) | `copy.goals.errors.undoNotAvailable` | Toast |
| `JT226` | `nothingToRemove` | Quitar el uso de un gasto que no tiene uso ni solicitud | `copy.goalExpense.errors.nothingToRemove` | Detalle del gasto |

`JT011` (`versionConflict`) se reutiliza en presupuestos, metas y solicitudes con copy
propia: «{nombre} cambió este presupuesto» (`copy.plan.errors.versionConflict`, con el
valor vigente y «Revisar»), «{nombre} cambió esta meta» y «La solicitud cambió». `JT012`
(`transactionVoided`) se reutiliza al aprobar o quitar el uso de un gasto anulado.
`JT116` (`moveFundedByGoal`) **empieza a ocurrir**: su LimitNote («No se puede mover
este gasto») llega con el PR D.

## Postgres

| Código | Tratamiento |
| --- | --- |
| `23505` sobre `budgets_one_per_key` o el índice de una solicitud pendiente | No debería llegar (la función bloquea antes). Si llega, se traduce a `JT219` o `JT212` y se registra |
| `40P01`, `40001` | Reintento en servidor con la misma clave (FR-097). Agotado = **resultado desconocido** |
