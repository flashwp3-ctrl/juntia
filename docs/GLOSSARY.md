# GLOSSARY.md — Vocabulario del dominio · Juntia

El puente entre cómo se habla del producto (español), cómo se escribe en el
código (inglés, salvo las cinco métricas de DEC-G04) y qué lee la persona en la
pantalla (español es-CO).

**Cada identificador de esta tabla sale de un documento aprobado.** La columna
**Fuente** dice de cuál. Donde no existía ninguno, el identificador va marcado
**[propuesta]** y lo aprueba la especificación que primero lo necesite.

La columna **Precisión** recoge las distinciones que el producto no puede
perder, tomadas de `docs/design/BRAND_FOUNDATION.md` §4 («Así sí / Así no») y de
las reglas de negocio de `docs/design/HANDOFF_CLAUDE_CODE.md`. **No son estilo:
son el motivo de que el término exista.**

Reglas de nombres e idioma: `docs/CONVENTIONS.md`.

---

## 1. Contextos, personas y pareja

| Término (español) | Identificador | Fuente | String de interfaz | Precisión |
| --- | --- | --- | --- | --- |
| Contexto personal | `owner_user_id` · literal `'private'` **[propuesta]** | §7.3 «Scope privado **XOR** grupo»; DEC-G01. El eje está decidido; **el literal no** | «Yo» | Los movimientos privados **nunca** se renderizan en el contexto Nosotros, ni en totales ni en búsquedas (handoff, reglas de UI). |
| Contexto compartido | `group_id` · literal `'group'` **[propuesta]** | §7.3; DEC-G01. El eje está decidido; **el literal no** | «Nosotros» | Un grupo nunca ve movimientos privados, aunque sean de las mismas personas (§5.5). |
| Tipo de contexto | `scope: 'private' \| 'group'` **[propuesta]** | §7.3 y DEC-G01 definen el eje privado **XOR** grupo; **no congelan ni el nombre del tipo ni sus literales** | — | **Propuesta completa: nombre del tipo y valores.** La semántica no se discute; el nivel de autoridad del nombre sí. Mientras no se apruebe, `'private'` y `'group'` son marcadores de lectura, no identificadores vigentes. |
| Grupo | `groups` | §7.3 | — | `couple` admite **máximo dos** integrantes activos; `group` N es P1 (§5.5, §15.5). |
| Pareja | `groups` con tipo `couple` | §5.5, §7.3 | «Pareja» · `CoupleStatus` | Exactamente dos en P0. El dominio se modela para N, la UI no lo habilita (§15.5). |
| Integrante | `group_members` | §7.3 | «Integrante» | La membresía es la autoridad, no una lista enviada por el cliente (§7.3). |
| Propietaria del grupo | rol `owner` | §5.5 | — | Solo `owner` administra invitaciones, roles y cierre en P0. |
| Integrante sin rol de administración | rol `member` | §5.5 | — | Registra y consulta según permisos. |
| Invitación | `group_invitations` | §7.3 | «Invitación» · badges PENDIENTE / NO VÁLIDA | 7 días, **un solo uso**, token guardado como hash, una activa por pareja, asociada a un correo verificado (§15.5). |
| Perfil | `profiles` | §7.3 | «Mi cuenta» · `ProfileHeader` | Nombre visible editable; correo visible y **no** editable; avatar con inicial, sin foto (§15.5). |
| Resumen histórico de exintegrante | `member_history_snapshots` | §7.3, ADR-003 | — | Propiedad del exintegrante; **sin datos de terceros**. No da acceso a los registros activos del grupo. |

---

## 2. Movimientos

| Término (español) | Identificador | Fuente | String de interfaz | Precisión |
| --- | --- | --- | --- | --- |
| Movimiento | `transactions` | §7.3 | — | Privado **XOR** de grupo. Nunca se borra: se anula con auditoría (§5.4). |
| Gasto | tipo `expense` | §7.3 | «Gasto» · `ExpenseRow` variante gasto | En P0 puede ser privado o de grupo. Es lo único que consume presupuesto. |
| Ingreso | tipo `income` | §7.3 | «Ingreso» · `ExpenseRow` variante ingreso (+) | **Privado únicamente** en P0. No cuenta como consumo (§5.3). |
| Liquidación | tipo `settlement` · métrica `settlement` | §5.1, §7.3 | **«Liquidado»**, nunca «Pagado» cuando no hubo transferencia verificada | **No es un gasto**: no suma al consumo ni a las categorías. Solo grupal, entre dos miembros, sin categoría presupuestal. Juntia **nunca crea una transferencia**; registra la liquidación declarada. |
| Pagador | `payer_user_id` | §7.3 | «pagó Tomás» | Aplica a gastos. En Mover a Pareja **el pagador original se mantiene** (handoff). |
| Origen y destino de una liquidación | `from_user_id` / `to_user_id` | §7.3 | «Tomás → Sara» | Aplica solo a liquidaciones. |
| Fecha del movimiento | `transaction_date` | §5.2 | «hoy», «12 oct» | Define el mes presupuestal. `created_at`/`updated_at` son auditoría, no periodo. |
| Anulación | estado `voided` **[propuesta]** | §5.4 describe la anulación; no da identificador | — | Excluye el movimiento de los agregados **conservando** su rastro de auditoría. No es borrado. |
| Reclasificar privado → compartido | `reclassifyToShared()` **[propuesta]** | El flujo está en §15.5, handoff y ADR-001; la función no está nombrada | «Mover a Pareja» | Una transacción **atómica e idempotente** anula el privado y crea el compartido. **Nunca hay dos gastos activos.** Deshacer solo inmediato y solo si el servidor confirma que no hay dependencias. No existe «mover a Yo» general en P0. |

---

## 3. Reparto, saldos y liquidación

| Término (español) | Identificador | Fuente | String de interfaz | Precisión |
| --- | --- | --- | --- | --- |
| Reparto | `transaction_allocations` · `domain/allocations` | §7.2, §7.3 | «50/50» · «Porcentaje» · «Importe» | La suma de las partes es **exactamente** el importe del gasto. **Nunca se asume 50/50** (handoff). |
| Porcentaje personalizado | — (modo de reparto) | §15.5, handoff | «Porcentaje 55/45» | Es un reparto porcentual **configurable**; **no** significa proporcional a ingresos (handoff, §Terminología; BRAND §4). |
| Parte que le corresponde | parte de `transaction_allocations` | §5.1 «partes asignadas» | «le corresponde $1.500.000» | Es lo distinto de «pagó». Separarlos es la razón de ser de `SharedBalance`. |
| Total pagado | `gross_paid` | §5.1 | «pagó $186.500» | Refleja pagos, **no consumo**: no altera presupuesto. |
| Consumo personal | `personal_consumption` | §5.1 | — | Gastos privados propios **más** las partes que le corresponden en gastos de grupo. Sí altera presupuestos personales. |
| Total del grupo | `group_total` | §5.1 | — | Gastos activos del grupo y periodo. Nunca incorpora gastos privados (§5.3). |
| Flujo neto en el sistema | `net_cash_outflow` | §5.1 | — | Salidas por gastos + liquidaciones enviadas − recibidas. **Sin fingir saldo bancario.** |
| Saldo neto | `net_owed` · `computeBalance(expenses, settlements, members)` · `domain/balances` | §5.1, §7.2, handoff §Orden de implementación | «Le deben» · «Debe» · «Al día» · `SharedBalance` | Positivo = el grupo le debe a la persona. La suma de balances del grupo **da cero**. Las metas **no** alteran `net_owed` (§5.1, DEC-G06). |
| Sugerencia de liquidación | — | §15.5, handoff | «Tomás → Sara $186.500» | Determinista, deudor → acreedor, por el saldo pendiente real. **Nunca crea una transferencia.** |
| Por saldar | estado | `COMPONENT_SPECIFICATIONS.md` §Badge de estado | «POR SALDAR» (badge neutro punteado) | Se dice «Tomás le debe a Sara», **no** «Tomás está en deuda» (BRAND §4). |

---

## 4. Presupuesto y categorías

| Término (español) | Identificador | Fuente | String de interfaz | Precisión |
| --- | --- | --- | --- | --- |
| Presupuesto | `budgets` · `domain/budgets` | §7.2, §7.3 | «Presupuesto» · `BudgetIndicator` | **Opcional siempre.** Ausencia ≠ cero: el frontend recibe `budget: null` o un estado tipado, nunca un `COALESCE` a 0 (DEC-R01). |
| Sin presupuesto | `budget === null` | §5.3, §7.3 | «Sin presupuesto · Crear presupuesto (opcional)» | **Nunca** «Presupuesto $0 · excedido» ni una barra vacía fingiendo límite (BRAND §4, DEC-R01). |
| Restante | `budget_remaining` | §5.2 | «Quedan $X» | **Existe solo si hay presupuesto activo.** Puede ser negativo y se dice «Se pasaron por X», no se oculta en cero. |
| Excedido | estado | `COMPONENT_SPECIFICATIONS.md` | «EXCEDIDO» · «CERCA DEL LÍMITE» (≥ 85%) | — |
| Categoría | `categories` | §7.3 | «Mercado», «Restaurantes»… · `CategoryIcon` | Catálogo canónico del sistema en P0; categorías propias son P1. Las no asignadas **sí** cuentan en el total del contexto (§5.2). |
| Asequibilidad | — | DEC-R17 | — | Juntia **nunca** dice «te alcanza», «puedes pagarlo» ni «es financieramente seguro». Un presupuesto holgado no demuestra tener el dinero. |

---

## 5. Metas

| Término (español) | Identificador | Fuente | String de interfaz | Precisión |
| --- | --- | --- | --- | --- |
| Meta | `savings_goals` · `goal` · `domain/goals` | §7.2, §7.3, DEC-G01 | «Meta» · `GoalCard`, `GoalStack` | Propietario privado (`owner_user_id`) **XOR** grupo (`group_id`). **No** es cuenta bancaria, instrumento de inversión ni billetera custodiada (DEC-G01). |
| Monto objetivo | `target` | DEC-G05 | «$11.340.000» | Positivo. La fecha objetivo es **opcional**. |
| Estado de la meta | `active \| completed \| archived` | DEC-G01 | «Lo lograron» (completada) | Alcanzar el objetivo **no** implica que se haya comprado nada (DEC-G05). |
| Asiento del libro de la meta | `goal_ledger_entries` | §7.3 | — | Registro inmutable y auditado. **No** se inserta como gasto ficticio en `transactions` (§7.3). |
| Aporte a una meta (operación) | `goal_contribution` | §5.1, DEC-G02 | **«Registrar aporte»**, nunca «Depositar» ni «Invertir» (BRAND §4) | Es **destinación de dinero, no gasto de consumo**. No altera presupuesto, `net_owed` ni `group_total`. Un aporte **no es una transferencia**: «el dinero sigue donde lo tengan» (handoff). |
| Retiro de una meta (operación) | `goal_withdrawal` | §5.1, DEC-G02 | **«Retiro de meta · reasignación»**, nunca «Ingreso» (BRAND §4) | Desasignación auditada de aportes **propios no consumidos**, con motivo. **No es ingreso ganado**: es reasignación. |
| Uso de fondos de una meta | `goal_usage` | §5.1, DEC-G02 | «Pagar con una meta» | Siempre vinculado a **un gasto real** (`transaction_id`). El gasto vinculado sí cuenta; el uso **no cuenta dos veces**. |
| Reparto del uso por aportante | `goal_usage_allocations` | §7.3, DEC-G04 | `FundingLedger`: «Fondos de la meta · de quién son» | La suma es **exactamente** el uso total. El uso se atribuye a **los aportantes cuyos fondos se consumen**, no automáticamente al 50/50 del gasto. |
| Confirmación de uso de fondos ajenos | `goal_usage_confirmations` | §7.3, DEC-G02, DEC-G06 | «PENDIENTE DE Tomás» · `ConfirmationBadge` | Sin confirmación **no se ejecuta**; no hay autorización implícita. **No vence.** Mientras está pendiente, esos fondos **no se descuentan ni cuentan como financiación**. Si se rechaza o cancela, **el gasto permanece** (§15.5). |
| Modo de financiación | `funding_mode` | DEC-G03, §7.3 | — | Dos valores, abajo. Ninguno permite inferir saldo bancario real ni liquidez. |
| Dinero apartado dentro de Juntia | `reserved` | DEC-G03 | **«Apartado en Juntia»**, nunca «Depositado en tu cuenta» (BRAND §4) | Asignación **virtual**, sin salida bancaria demostrada. |
| Transferencia declarada por la persona | `transferred_declared` | DEC-G03 | **«Transferencia declarada»**, nunca «Transferencia verificada» (BRAND §4) | Movimiento declarado **sin verificación externa**. P0 no concilia con bancos. |
| Saldo de la meta | `goal_balance` | DEC-G05 | «$8.340.000 de $11.340.000» | `Σ contributions − Σ withdrawals − Σ usages`, **siempre ≥ 0**. Una operación no puede forzarlo negativo. |
| Progreso | `progress` | DEC-G05 | «74%» · cinta de `GoalCard` | `goal_balance / target`. Si se supera, el excedente se muestra de forma neutra. |
| Ritmo y proyección | — | `COMPONENT_SPECIFICATIONS.md` §GoalCard | «Si siguen como en los últimos tres meses, llegan en abril» | **Siempre como estimación**, con patrón punteado. Nunca «Llegarán en abril» (BRAND §4, handoff). |

---

## 6. Las cinco métricas de DEC-G04

**Única excepción a la regla de inglés** (ver `docs/CONVENTIONS.md` §2): son los
nombres de un contrato financiero con fórmula aprobada y tabla de verificación.

| Término (español) | Identificador | Fuente | String de interfaz | Precisión |
| --- | --- | --- | --- | --- |
| Gasto de consumo | `gasto_consumo` | §15.4, DEC-G04, handoff | «Gasto» | Compras y servicios reales: privados **más** la parte asignada según la vista. **No incluye aportes a metas.** |
| Aporte a metas (métrica del periodo) | `aporte_a_metas` | §15.4, DEC-G04, handoff | «Apartado para metas» · «Guardaron $900.000 para sus metas. Es ahorro, no gasto.» | **Agregado del periodo**, no un asiento (ver §8). En Nosotros es el total; en Yo solo los aportes propios. **No se suman entre vistas.** |
| Retiro de metas (métrica del periodo) | `retiro_de_metas` | §15.4, DEC-G04, handoff | «Retiros» | Dinero liberado en el periodo. **Reasignación, no ingreso.** |
| Gasto financiado con meta | `gasto_financiado_con_meta` | §15.4, DEC-G04, handoff | «Pagado con una meta» | Porción de un gasto real pagada con fondos ya asignados. **El gasto sigue contando en `gasto_consumo`**; esto solo lo identifica. |
| Destinado neto | `total_destinado_neto` | §15.4, DEC-G04, handoff | **«Destinado neto (para planificar)»** · `PlanningNote` | `gasto_consumo + aporte_a_metas − retiro_de_metas − gasto_financiado_con_meta`. **Métrica de planificación, no de consumo ni de liquidez.** **Nunca** se rotula «Total gastado» (BRAND §4, DEC-G04, §15.4), **nunca** es el número héroe, puede ser **negativa** y entonces se explica el signo: «Negativo: liberaron de metas más de lo que destinaron». Solo aparece como nota secundaria explicada, en Análisis. |

Los cálculos deben reproducir **fila por fila** la tabla de verificación de
siete casos de `docs/design/HANDOFF_CLAUDE_CODE.md` §DEC-G04.

---

## 7. Dinero, integridad y auditoría

| Término (español) | Identificador | Fuente | String de interfaz | Precisión |
| --- | --- | --- | --- | --- |
| Importe | `Money` · `domain/money` | §7.2 | `$186.500` | Entero de **unidades menores ISO 4217** (`bigint`), nunca `float`. Formato: `Intl.NumberFormat('es-CO', …)` con `maximumFractionDigits: 0` y `tabular-nums` (handoff). |
| Moneda | código ISO 4217 | §5.2 | «COP» | COP fija en P0. Una operación con moneda distinta **se rechaza**, no se convierte en silencio. |
| Clave de idempotencia | `idempotency_key` · `idempotency_records` | §5.4, §7.3, handoff | — | La genera el cliente por **intención de escritura**; el servidor impone unicidad por actor/acción/contexto. Evita duplicados por doble toque o reintento. |
| Atomicidad | — | §5.4, §7.3, §15.6.3 | — | Gasto + reparto, aporte, retiro y uso de meta con gasto enlazado se confirman o revierten **como una unidad**. Nunca queda un gasto sin reparto válido. |
| Auditoría | `audit_events` | §7.3, §5.4 | — | Actor, instante, valor anterior y nuevo. **Sin edición directa desde el cliente.** |
| Vista previa del cambio | `ChangePreview` | `COMPONENT_SPECIFICATIONS.md` | «antes → después» | Solo cifras visibles para quien mira; **nunca** movimientos privados del otro. |
| Limitación explicada | `LimitNote` | `COMPONENT_SPECIFICATIONS.md` | «Salir de la pareja», «Eliminar tu cuenta», «No se puede mover este gasto» | Lo que la app **no** hace se explica con texto, **no** se muestra como un control deshabilitado. |
| Privado | — | §5.5, §7.4, handoff | badge «PRIVADO» (candado) | Los gastos privados **jamás** son visibles para la otra persona, ni por agregados ni por actividad compartida. Una aportación privada tampoco (DEC-G06). |

---

## 8. `goal_contribution` vs. `aporte_a_metas` — resuelto

Conviven en los documentos y se parecen; **no son lo mismo** y confundirlos
produce exactamente el doble conteo que DEC-G04 existe para evitar.

| | `goal_contribution` | `aporte_a_metas` |
| --- | --- | --- |
| **Qué es** | Un **asiento individual**: una aportación concreta a una meta | Una **métrica agregada de un periodo y una vista** |
| **Dónde vive** | Fila de `goal_ledger_entries` (§7.3) | Resultado de una función pura del dominio (§15.4) |
| **Granularidad** | Un aporte, un actor, un instante, un `funding_mode` | Suma de las asignaciones del periodo |
| **Idioma** | Inglés, como el resto del esquema | Español, por la excepción DEC-G04 |
| **Fuente** | §5.1 lo define como «aporte registrado a una meta»; DEC-G02 lo nombra como la **operación** «aportar (`goal_contribution`)»; §7.3 lo ubica en `goal_ledger_entries` | DEC-G04 y §15.4 lo definen como «**nuevas asignaciones en el periodo**», en paralelo a las otras cuatro métricas |

**Relación:** `aporte_a_metas` de un periodo y una vista = suma de los
`goal_contribution` de ese periodo visibles en esa vista. En «Nosotros» es el
total; en «Yo» **solo los aportes propios**, y los dos **no se suman entre sí**
(DEC-G04).

**Resuelto con los documentos, no escalado.** La distinción estaba implícita en
§5.1 + DEC-G02 (operación) frente a DEC-G04 + §15.4 (métrica del periodo), pero
no escrita en ningún sitio. Esta sección la hace explícita; no decide nada
nuevo. Lo mismo vale para los otros dos pares: `goal_withdrawal` (asiento) ↔
`retiro_de_metas` (métrica), y `goal_usage` (asiento) ↔
`gasto_financiado_con_meta` (métrica).

---

## 9. Palabras prohibidas

De `docs/design/BRAND_FOUNDATION.md` §4. Un string que use la columna derecha es
un defecto, no una preferencia de estilo.

| Se dice | No se dice |
| --- | --- |
| Tomás le debe a Sara $186.500 · Por saldar | Tomás está en deuda |
| Guardaron $900.000 para sus metas. Es ahorro, no gasto. | Total gastado $3.740.000 |
| Apartado en Juntia | Depositado en tu cuenta |
| Transferencia declarada | Transferencia verificada |
| Si siguen como en los últimos tres meses, llegan en abril. | Llegarán en abril |
| Sin presupuesto. Crear presupuesto (opcional) | Presupuesto $0 · excedido |
| Liquidado | Pagado (cuando no hubo transferencia verificada) |
| Registrar aporte | Depositar / Invertir |
| Destinado neto (para planificar) | Total gastado (para gasto + aportes) |
| Porcentaje 55/45 | Proporcional (si no es por ingresos) |
| Retiro de meta · reasignación | Ingreso |

Además: tuteo, frases cortas, es-CO, COP sin decimales, el nombre propio
primero («Sara pagó»), sin emojis, sin exclamaciones de alarma y sin rankings de
pareja.

---

## 10. Identificadores propuestos

**Tres identificadores** de este glosario son propuestas, porque los documentos
aprobados describen el concepto pero no lo nombran. Los aprueba la primera
especificación que los necesite; hasta entonces **no son autoridad**.

La marca **[propuesta]** aparece en **cinco filas**: las tres de la tabla de
abajo y, además, «Contexto personal» y «Contexto compartido», porque usan los
literales del tipo propuesto.

| Propuesta | Concepto que nombra | Dónde está descrito sin nombre |
| --- | --- | --- |
| `scope: 'private' \| 'group'` **y sus dos literales** | El tipo del eje privado/compartido y los valores que lo nombran | §7.3 «Scope privado **XOR** grupo» y DEC-G01 (`owner_user_id` XOR `group_id`) definen el eje, **no los literales** |
| `voided` | El estado de un movimiento anulado | §5.4 «Anulación: excluir el gasto anulado de agregados actuales; conservar su rastro de auditoría» |
| `reclassifyToShared()` | La operación «Mover a Pareja» | §15.5, handoff §Flujos, ADR-001 |

La propuesta del tipo **incluye sus dos literales**: donde las filas de las
secciones 1 y 2 escriben `'private'` o `'group'`, lo hacen como marcador de lectura
y no como identificador vigente. Lo que está decidido es el eje privado **XOR**
grupo y sus columnas (`owner_user_id`, `group_id`), no cómo se escriben los valores.

Todo lo demás de este glosario **ya estaba escrito** en el maestro o en el
paquete de diseño.

---

## 11. Cómo se mantiene

- Un término de negocio nuevo entra al código **con su fila aquí**, no después.
- Si el maestro o un documento de `docs/design/` ya da un identificador, se usa
  **tal cual**; este glosario no renombra nada.
- Cuando una especificación aprueba un identificador **[propuesta]**, se quita
  la marca y se cita la especificación en la columna Fuente.
- Las reglas de idioma y de git están en `docs/CONVENTIONS.md`.
