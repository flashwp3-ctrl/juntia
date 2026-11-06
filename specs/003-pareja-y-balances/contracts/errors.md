# Errores: código → error de dominio → copy — 003

Amplía la tabla de la 002 (`specs/002-cuentas-y-gastos-privados/contracts/errors.md`),
que sigue vigente sin cambios para `JT001`–`JT017`. Mismas reglas: la capa
`src/lib/db/errors.ts` traduce cada código a un error de dominio tipado; la
interfaz lo muestra con su clave de `src/lib/copy/es.ts`; **el mensaje técnico
nunca llega a la pantalla** y un código desconocido cae en `unexpected`. Las claves
de copy son propuestas del plan; la redacción final la aprueban los fundadores en
cada PR (`docs/CONVENTIONS.md` B.1). Las palabras prohibidas del glosario §9 se
comprueban en la revisión del copy.

## Rechazo confirmado frente a resultado desconocido (FR-059, precisión F47-4)

Todo código `JTnnn` es un **rechazo confirmado**: la función falló, la transacción
se revirtió y **no se escribió nada**. Solo con un rechazo confirmado la interfaz
puede decir «no se guardó», «no se movió» o «no se registró».

Son **resultado desconocido**: un error de red, un tiempo agotado, una respuesta
perdida, un 5xx sin código `JT` y el agotamiento de los reintentos de
`40P01`/`40001`. Con ellos la interfaz **nunca** afirma que no se escribió:
conserva la clave, bloquea la intención y ofrece «Reintentar» (misma clave) o
«Comprobar estado» (contracts/server-actions.md).

## Códigos nuevos (`JT1nn`, P0-2)

| Código | Error de dominio | Origen | Clave de copy | Dónde se ve |
| --- | --- | --- | --- | --- |
| `JT101` | `alreadyInCouple` | Quien crea o acepta ya tiene una pareja provisional o activa | `copy.couple.errors.alreadyInCouple` | M3 (crear) y M7 con el texto de «primero anula la tuya» cuando es una provisional propia (US-1, escenario 9) |
| `JT102` | `invitationNotFound` | La propietaria opera sobre una invitación que no existe o no es suya | `copy.couple.errors.invitationGone` | M4 |
| `JT103` | `invitationAlreadyAccepted` | Anular o generar enlace sobre una pareja que ya está activa (gana aceptar, FR-010b) | `copy.couple.errors.alreadyAccepted` («Ya no se puede anular: la invitación se aceptó») | M4 → M1 |
| `JT104` | `invitationInvalid` | Token sin coincidencia, vencido, usado, anulado, reemplazado, para otro correo o pareja no provisional. **Un solo código para todos los motivos** (FR-014) | `copy.couple.invitation.invalid` (M7) | M7 |
| `JT105` | `coupleNotActive` | Operación de dinero de grupo sin pareja activa | `copy.couple.errors.notActive` | Nosotros sin pareja; no debería llegar |
| `JT106` | `nothingToSettle` | Liquidar con saldo 0 | `copy.balance.settle.errors.nothingToSettle` | Hoja de liquidación (no hay botón con saldo 0) |
| `JT107` | `settlementExceedsPending` | Importe mayor que el saldo pendiente (§5.1); incluye la segunda de dos liquidaciones del total concurrentes | `copy.balance.settle.errors.exceedsPending` (dice el máximo vigente) | Hoja de liquidación |
| `JT108` | `invalidEmail` | Correo invitado vacío, mal formado o el propio | `copy.couple.invite.errors.email` | M3 |
| `JT109` | `invalidTokenHash` | Hash que no son 64 hex | `copy.errors.unexpected` | Bug del cliente |
| `JT110` | `invalidSplit` | Partes que no suman, no múltiplos de 100, sin participante positivo, porcentajes fuera de 0–100 o que no suman 100 | `copy.annotate.split.errors.invalid` | E3. No debería llegar: el dominio lo valida antes |
| `JT111` | `notCoupleMember` | Pagador o participante que no es integrante activo | `copy.errors.unexpected` | Nunca en uso normal (el cliente no puede elegir a nadie más) |
| `JT112` | `settlementNotFound` | Anular una liquidación inexistente o de otra pareja | `copy.balance.settlement.errors.notFound` | Detalle de liquidación |
| `JT113` | `settlementVoided` | Anular una liquidación ya anulada | `copy.balance.settlement.errors.alreadyVoided` | Detalle de liquidación |
| `JT114` | `invalidSettlementDate` | Fecha futura o no válida (Q10) | `copy.balance.settle.errors.date` | Hoja de liquidación |
| `JT115` | `moveNotAllowed` | Mover un ingreso, un movimiento ajeno, uno ya anulado o sin pareja activa | `copy.move.errors.notAllowed` | A2/A3 |
| `JT116` | `moveFundedByGoal` | El privado está financiado con una meta (ADR-001 punto 7). En P0-2 nunca ocurre (no hay metas); la comprobación existe | `copy.move.limit` (LimitNote) | A1 |
| `JT117` | `undoNotAvailable` | Deshacer Mover a Pareja fuera de la ventana o con una operación dependiente posterior (Q15) | `copy.move.errors.undoNotAvailable` | Toast de A4 |
| `JT119` | `invalidCoupleTransition` | Trigger `groups_guard_transition` o `groups_check_state`: una transición de la pareja que no está permitida | `copy.errors.unexpected` | Nunca en uso normal: solo una escritura que salta las funciones |
| `JT118` | `invalidSplitMode` | Modo fuera de `equal`/`percent`/`amount` | `copy.errors.unexpected` | Nunca en uso normal |

`JT011` (`versionConflict`) y `JT012` (`transactionVoided`) de la 002 se reutilizan
para los gastos compartidos y las liquidaciones (`expectedVersion`, FR-057), con
copy propia de pareja: «{nombre} cambió este gasto antes» (`copy.shared.errors.versionConflict`)
y «{nombre} ya lo eliminó» (`copy.shared.errors.alreadyDeleted`). El nombre sale de
`couple_members`, no del error.

## Postgres

| Código | Tratamiento |
| --- | --- |
| `23505` sobre `group_members_one_couple_per_person` o `group_invitations_one_pending` | No debería llegar (la función bloquea antes, research R3). Si llega, se traduce a `JT101` y se registra |
| `40P01`, `40001` | Reintento en servidor con la misma clave, como en la 002 (FR-058). Agotado = **resultado desconocido** |
