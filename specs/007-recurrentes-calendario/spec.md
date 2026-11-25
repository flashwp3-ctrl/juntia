# Feature Specification: 007 · Recurrentes y calendario (MVP-2)

**Feature Branch**: `claude/007-recurrentes-calendario-bb9ced` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5)

**Created**: 2026-11-25

**Status**: Draft · etapa Specify. Las preguntas Q1–Q19 están **abiertas** y van a los fundadores en Clarify; ninguna se responde en este documento. Spec abierta por el procedimiento de spec nueva de ADR-012 (`[V]` 4, condición 6) con la documentación de Recurrentes autorizada durante el gate de MVP-1 (maestro §15.10, decisiones 28.17 a 28.19).

**Input**: Descripción con que Alejandro invocó `/speckit-specify` el 25 de noviembre de 2026, redactada a partir de la decisión 28 (filas 28.6, 28.8, 28.9, 28.11, 28.13 y 28.17), la propuesta de los fundadores (bloque A, A.1 a A.5), el análisis (§4 fila «R», §6, §9 y §12 N-6) y `docs/BACKLOG_MVP2.md` (filas 3, 4 y 7):

> Recurrentes y calendario, el segundo paso de la hoja de ruta de la decisión 28. Durante el gate de MVP-1 solo se documenta (28.17). Cada persona puede configurar recurrencias de gastos, ingresos y aportes a meta […]. Una recurrencia genera movimientos previstos, que se distinguen siempre de los reales (A.2) […]. Nunca crea por su cuenta un gasto, un ingreso ni un aporte real. Confirmar en un toque crea el movimiento real con su idempotencia y lo vincula 1:1 con la instancia, sin duplicar uno ya registrado. Lo previsto nunca entra en las métricas de lo real […]. Un calendario de lo previsto, como ruta hija de Plan (28.8) […]. Los presets de captura (fila 4) van en la misma spec como concepto distinto […]. Los avisos son solo dentro de la app (28.8). Todo es privado por defecto, sin «total del hogar» […]. Fuera del alcance: saldos, amortización, proyecciones, integraciones bancarias, débitos automáticos y ejecución de pagos. Se mantiene el tope E2E (28.13) y nada afirma «te alcanza» (DEC-R17). La spec no decide […]. Sin cifras reales.

> **Qué es este documento.** Dice **qué** construiría Recurrentes y calendario y
> **por qué**. **No decide nada**: lo que ya está decidido se cita; lo que no, va
> a los fundadores como pregunta numerada en «Clarifications», con la
> recomendación del redactor. Jerarquía: maestro (§15 prevalece) > ADR > paquete
> de `docs/design/` y `docs/CONVENTIONS.md` > esta spec (`AGENTS.md` §2). El
> análisis (`docs/propuestas/analisis-planificacion-financiera.md`) **no es
> autoridad**: se cita por su detalle, y si difiere de la decisión 28, manda la
> decisión. En este archivo `[P]` significa **propuesta** y `[V]` **verificación
> pendiente** (maestro §15.9); no significan «paralelizable», que solo ocurre
> dentro de `tasks.md` (ADR-012 §3.2).
>
> **Contexto de fase.** MVP-1 está en su gate (P0-4, spec 005): alcance
> congelado y siete días sin desplegar (decisión 25.5). La decisión 28.17 solo
> autoriza, durante el gate, **documentación**: spec, ADR propuestos y diseño.
> **Nada de esta spec se implementa, se migra ni se despliega antes de declarar
> MVP-1**, y tampoco antes de que Planes (spec 006) esté aceptada (28.18). Este
> PR solo añade documentos dentro de `specs/007-recurrentes-calendario/`.
>
> **Desviación de la plantilla, a propósito.** Como en la 003 a la 006, la
> plantilla de Spec Kit limita a tres los `[NEEDS CLARIFICATION]`. Aquí hay
> diecinueve preguntas, porque todo lo no decidido llega a los fundadores en
> lugar de resolverse en la spec. Ninguna se marca en línea: viven en
> «Clarifications».
>
> **Sin cifras reales.** El repositorio es público (decisión 25.1). Los importes
> de los ejemplos son **ficticios** y no forman parte del dataset dorado.

### Fuentes que aplica

| Fuente | Qué aporta a Recurrentes y calendario |
| --- | --- |
| Maestro §2.3 y §2.4 (DEC-R17) | Registrar antes de planificar; privacidad por defecto, también en agregados; nunca «te alcanza», «puedes pagarlo» ni «es financieramente seguro» |
| Maestro §5.1 y §15.4 (DEC-G04) | `group_total`, `personal_consumption`, `gross_paid`, `net_cash_outflow`, `net_owed`, `goal_contribution` y `total_destinado_neto`: **nada previsto entra en ninguna**; solo el movimiento real confirmado cuenta, y cuenta una vez |
| Maestro §5.2 | COP, pesos enteros en la entrada, `America/Bogota` |
| Maestro §5.3 (DEC-R01, ADR-004) y decisión 22.8 | Presupuesto opcional, `null` ≠ 0; presupuestos solo por categoría de gasto. Un gasto previsto **no** consume presupuesto |
| Maestro §5.4 y ADR-007 | Anulación auditada; nunca borrado silencioso de movimientos financieros |
| Maestro §5.6 (DEC-G01 a DEC-G06) y ADR-010 | El aporte es destinación, no gasto; ledger aparte; confirmación para operar fondos ajenos; un aporte se anula, nunca se edita (22.13) |
| Maestro §7.3 | `recurring_rules` (P1) con «instancias sin duplicados»; contrato por tipo: `income` es **privado**; las entradas del ledger de metas nunca van a `transactions` como gastos ficticios |
| Maestro §11 y enmienda del 25 nov 2026 | MVP-2 = Planes + Recurrentes y calendario (con presets y aportes programados) + Presupuesto integral v1 |
| Maestro §15.3 y decisión 22.5 | Cinco posiciones en móvil, sin sexta pestaña; Análisis es ruta hija de Plan: el mismo patrón para Recurrentes |
| Maestro §15.5 | Pareja de exactamente dos; repartos 50/50, porcentaje e importe; Gasto con meta; exportación JSON + CSV de lo autorizado |
| Maestro §15.10, decisión 16.3, 16.8 y 16.14 | Selector «Gasto o Ingreso» en Anotar; el «calendario» de lo real son las flechas de mes de Actividad, sin cuadrícula; un gasto no se convierte en ingreso al editar |
| Maestro §15.10, decisión 28 (28.6, 28.8, 28.9, 28.10, 28.11, 28.13, 28.17, 28.18) | Alcance de esta spec, presets como concepto distinto, ruta hija de Plan, avisos solo en la app, ingreso privado en v1, cuotas como gasto real, privacidad por defecto, tope E2E, solo documentación durante el gate, una spec en implementación y otra en documentación |
| Propuesta de los fundadores, bloque A (A.1 a A.5) y «Fuera del alcance inicial» | Campos de la recurrencia, frecuencias, estados de lo previsto, ingresos variables, calendario y compromisos de duración definida |
| Análisis §4 (fila R y «Recurrencias y presets dentro de R»), §6 (ADR-a, ADR-b, ADR-d, ADR-h), §7, §9 (Q4, Q10, Q11, Q13, Q17, Q18) y §12 (N-6) | Valor por sí sola, orden de PR propuesto, preguntas que deben cerrar los ADR, riesgos de doble registro y de reglas de fecha, calendario de lo previsto frente a Actividad |
| `docs/BACKLOG_MVP2.md`, filas 3, 4 y 7 | Recurrentes, presets de captura y aportes programados, absorbidos en esta spec |
| ADR-002, ADR-013 | Dinero en unidades menores y repartos con desempate estable; tablas en esquema no expuesto, escrituras por funciones, idempotencia y bloqueo del agregado |
| ADR-011 y `docs/TESTING.md` | Capa más baja que detecta el fallo; tope de specs E2E; iteración contra `juntia-dev` |
| `docs/design/` | I2 · Bosque & Arena, Phosphor con `AppIcon`, BRAND §4 (palabras prohibidas), BottomSheet, Modal, ExpenseRow y su variante de ingreso |
| `docs/GLOSSARY.md` | Términos existentes; ninguno se renombra. Los términos nuevos entran solo cuando se aprueben (Q2) |

## Clarifications

### Session 2026-11-25 · Preguntas de la etapa Specify

**Todas abiertas.** Las responden los fundadores en Clarify; la «Recomendación» es
del redactor y **no** es una decisión. Las marcadas **· ADR-x** dependen de un
candidato del análisis §6, que se escribe como **Propuesto** y se acepta antes de
la etapa Plan (`AGENTS.md` 17; decisión 28, «Lo que esta decisión no autoriza»).

| # | Tema | Recomendación del redactor | Respuesta |
| --- | --- | --- | --- |
| Q1 | Forma de la spec y reparto en PR | (a) una spec, tres PR: núcleo, calendario y avisos, presets | Pendiente |
| Q2 | Nombres visibles e identificadores | Decidir con los comps; entran en GLOSSARY solo aprobados | Pendiente |
| Q3 | Instancia prevista: fila o cálculo · ADR-a | Lo que fije ADR-a; nunca en `transactions` | Pendiente |
| Q4 | Confirmar y vincular con lo real · ADR-a | Confirmar abre el borrador de Anotar rellenado; vincular es siempre manual | Pendiente |
| Q5 | Estados de una instancia | Cinco estados con significado fijo (abajo) | Pendiente |
| Q6 | Editar una recurrencia · ADR-a | Solo hacia delante; lo confirmado y lo omitido no cambia | Pendiente |
| Q7 | Frecuencias y reglas de fecha | Lista acotada en v1; «personalizada» = cada N días, semanas o meses | Pendiente |
| Q8 | Recurrencias en Nosotros | Privada XOR compartida; cualquiera de los dos edita con versión | Pendiente |
| Q9 | Quién confirma una instancia compartida | Cualquiera de los dos; el pagador sale de la regla y se puede cambiar | Pendiente |
| Q10 | Ingresos variables: estados y rango | Una certeza (habitual, estimado, condicional) y un tipo (habitual o extraordinario) | Pendiente |
| Q11 | Ingresos y movimientos previstos de una sola vez | Se admiten como recurrencia de una sola fecha | Pendiente |
| Q12 | Aportes programados · ADR-d | Solo a metas propias o compartidas, solo por la propia persona; sugerencia que se confirma | Pendiente |
| Q13 | Compromisos de duración definida | Fecha final o número de cuotas; «cuota n de N»; finaliza sola | Pendiente |
| Q14 | Calendario: forma, horizonte y entradas | Lista por fecha con flechas de mes, sin cuadrícula; ruta hija de Plan | Pendiente |
| Q15 | Cifras de lo previsto · ADR-b | Sin totales de lo previsto en v1, o solo rotulados «Previsto» | Pendiente |
| Q16 | Avisos dentro de la app | Entrada «Por confirmar» en Plan y en Inicio, sin push ni correo | Pendiente |
| Q17 | Presets de captura | Rellenan el borrador de Anotar; privados XOR compartidos; PR propio | Pendiente |
| Q18 | Ciclo de vida: pausar, finalizar, eliminar, pareja, exportación y borrado | Archivar lo que tiene historia; exportar; notas de ADR-003 y de la 005 | Pendiente |
| Q19 | Pruebas: specs E2E | Ninguna spec E2E nueva; vínculo en integración, privacidad en pgTAP | Pendiente |

### Lo que ya está decidido y esta spec no reabre

- **Lo previsto no es real.** La existencia de una recurrencia no crea ingresos,
  gastos ni aportes reales antes de que se produzcan (propuesta A.2; análisis §4).
  Un ingreso esperado no aumenta el dinero registrado ni cuenta como recibido
  (A.3).
- **Confirmar crea lo real una vez.** Confirmar en un toque crea un gasto, un
  ingreso o un aporte real con su idempotencia (análisis §4, fila R).
- **Presets ≠ recurrencias** (28.6, Q17). Un preset es una plantilla para anotar
  rápido: no genera obligaciones, movimientos previstos ni compromisos de
  presupuesto. Si comparten tabla o entidad lo decide el Plan; se evalúa
  separarlos en PR propios, y **nunca retrasan el núcleo de recurrencias**.
- **Dónde vive:** Recurrentes es una ruta hija de **Plan**, como Análisis (22.5);
  la navegación de §15.3 no gana destinos (28.8).
- **Actividad sigue siendo lo real.** El calendario de esta spec muestra solo lo
  previsto y su estado; la decisión 16.8 no cambia (N-6).
- **Avisos solo dentro de la app**, inicialmente (28.8). Sin push ni correo.
- **Privado por defecto, sin «total del hogar»** (28.11). El ingreso es
  **privado en v1** y lo registra solo quien lo recibe (28.9; §7.3).
- **Una cuota ya pagada a un tercero es un gasto real**, nunca un mero aporte a
  una meta (28.10). Los aportes previos para reservar dinero sí se permiten.
- **Tope E2E** de P0 para esta spec (28.13; ADR-011 §3).
- **Nunca «te alcanza»** (DEC-R17); presupuesto opcional, `null` ≠ 0 (DEC-R01);
  `total_destinado_neto` nunca es «Total gastado» ni la cifra héroe (DEC-G04).
- **Fuera de alcance** (propuesta A, «Fuera del alcance inicial»; análisis §4):
  saldos, amortización, proyecciones, integraciones bancarias, débitos
  automáticos, ejecución de pagos y conciliación bancaria automática.
- COP única; pareja de exactamente dos, modelo escrito para N (§15.5; 28.4).

### Contexto y opciones de cada pregunta

#### Q1 · Forma de la spec y reparto en PR

- **Contexto:** la spec toca base de datos (reglas, instancias, vínculo con lo real, RLS), el dominio de fechas, Anotar, Actividad, Metas, una ruta nueva bajo Plan y avisos. El análisis §4 propone un orden: núcleo, calendario, presets en PR propio.
- **Opciones:** (a) una spec, la 007, con tres PR: **A**, núcleo de recurrencias (datos, seguridad, dominio, confirmación y vínculo con lo real, aportes programados); **B**, calendario de lo previsto y avisos dentro de la app; **C**, presets de captura, independiente, que puede ir antes o después de B pero nunca bloquea A; (b) A y B juntos, presets en C; (c) un solo PR.
- **Recomendación: (a).** Es el orden del análisis y cumple la condición de 28.6 (los presets no retrasan el núcleo).

#### Q2 · Nombres visibles e identificadores

- **Contexto:** hacen falta nombres para la recurrencia, la instancia prevista, sus estados, el calendario y el preset. 28.7 muestra el criterio: el nombre se evalúa con los comps y entra en `docs/GLOSSARY.md` solo cuando se aprueba. Hay palabras prohibidas en BRAND §4.
- **Opciones:** (a) proponer nombres en el prompt de diseño y decidirlos viendo los comps; (b) fijarlos ahora.
- **Recomendación: (a).** Como hipótesis de trabajo, sin cerrar: «Recurrentes» para la ruta, «Previsto» para la instancia, «Por confirmar» para lo pendiente, y para el preset un nombre que no se confunda con la recurrencia `[P]`.

#### Q3 · Instancia prevista: fila o cálculo · ADR-a

- **Contexto:** ADR-a debe cerrar si la instancia se **materializa** como fila o se **calcula** a partir de la regla, y si lo previsto puede estar en `transactions`. El análisis recomienda que nunca, con tabla aparte, para no tocar ninguna métrica de §5.1. El maestro §7.3 pide «instancias sin duplicados».
- **Opciones:** (a) materializar las instancias de un horizonte acotado; (b) calcularlas y materializar solo las que cambian de estado (confirmada, omitida, cancelada); (c) otra que proponga ADR-a.
- **Recomendación:** que lo decida ADR-a, **Propuesto** antes del Plan, con la restricción del análisis (nada previsto en `transactions`). El redactor no recomienda entre (a) y (b) sin el análisis técnico del ADR.

#### Q4 · Confirmar y vincular con lo real · ADR-a

- **Contexto:** «confirmar en un toque» crea el movimiento real; pero el importe real puede diferir del estimado, y la persona puede haber anotado ya el pago a mano (riesgo «recurrente + gasto real = doble», análisis §7.1).
- **Opciones de confirmación:** (a) un toque crea el movimiento con los datos de la regla, y se puede editar después como cualquier movimiento; (b) un toque abre el borrador de Anotar ya rellenado y otro toque lo guarda; (c) (a) cuando el importe es fijo y (b) cuando es estimado o tiene rango.
- **Opciones de vínculo con un movimiento ya anotado:** (a) manual, eligiendo de una lista de candidatos (misma categoría, contexto y fechas cercanas); (b) sugerido automáticamente y confirmado por la persona; (c) automático.
- **Recomendación: (c) para confirmar y (a) o (b) para vincular, nunca (c).** El vínculo es 1:1: un movimiento real se vincula a una sola instancia y una instancia a un solo movimiento, y repetir la confirmación no crea un segundo movimiento.

#### Q5 · Estados de una instancia

- **Contexto:** A.2 enumera previsto, confirmado o registrado, pendiente, omitido y cancelado, sin definirlos.
- **Propuesta de definición `[P]`:** **previsto**, fecha futura sin resolver; **pendiente**, fecha llegada o pasada sin resolver; **confirmado**, vinculado a un movimiento real; **omitido**, la persona dice que esta vez no ocurrió; **cancelado**, la instancia ya no ocurrirá porque la regla se finalizó o se eliminó.
- **Preguntas:** ¿«previsto» y «pendiente» son dos estados o uno con dos presentaciones? ¿Se puede deshacer «omitido»? ¿Qué pasa con una instancia confirmada cuyo movimiento real se anula (ADR-007): vuelve a pendiente?
- **Recomendación:** la definición de arriba; «omitido» se puede deshacer; si se anula el movimiento real, la instancia vuelve a **pendiente**, con auditoría.

#### Q6 · Editar una recurrencia · ADR-a

- **Contexto:** ADR-a debe cerrar qué pasa con las instancias si se edita la regla.
- **Opciones:** (a) la edición rige hacia delante: las instancias previstas y pendientes se ajustan, las confirmadas y omitidas no cambian; (b) preguntar en cada edición si afecta solo a la próxima o a todas las futuras; (c) solo a las futuras, sin tocar las pendientes.
- **Recomendación: (a)**, con versión (sin sobrescritura silenciosa, como presupuestos, §15.5). (b) se puede valorar en los comps `[P]`.

#### Q7 · Frecuencias y reglas de fecha

- **Contexto:** A.1 pide semanal, quincenal, mensual, trimestral, semestral, anual y personalizada. El análisis §7.3 avisa de quincenal, «último día hábil» y días 29 a 31, y recomienda reglas acotadas en v1, en `America/Bogota`.
- **Preguntas:** ¿quincenal es «cada 14 días» o «dos días fijos del mes» (p. ej., 15 y último)? ¿Qué es «personalizada»? ¿Qué pasa con el día 31 en un mes de 30?
- **Recomendación:** quincenal como dos días fijos del mes; personalizada como «cada N días, semanas o meses»; un día que no existe en el mes cae en el último día de ese mes; **sin** días hábiles ni festivos en v1.

#### Q8 · Recurrencias en Nosotros

- **Contexto:** A.1 pide contexto personal o compartido, responsable y reparto. 28.11: privado por defecto; cada elemento se comparte explícitamente. ADR-015 hizo los planes privados XOR compartidos.
- **Opciones:** (a) una recurrencia es privada XOR de la pareja, se elige al crearla y no se convierte; cualquiera de los dos crea y edita las compartidas, con versión y autor (como presupuestos y gastos compartidos, §15.5 y 20.12); (b) solo quien la creó la edita; (c) se puede convertir de privada a compartida.
- **Recomendación: (a).** Las recurrencias de ingreso solo existen en Yo (28.9). Una recurrencia privada nunca es visible para la otra persona, ni por agregados ni por avisos.

#### Q9 · Quién confirma una instancia compartida

- **Contexto:** al confirmar una instancia de gasto compartido se crea un gasto compartido real, con pagador y reparto. Puede que pague quien no figura como responsable.
- **Opciones:** (a) cualquiera de los dos confirma; el pagador y el reparto salen de la regla y se pueden cambiar en el borrador antes de guardar; (b) solo el responsable; (c) cualquiera, pero el pagador es siempre quien confirma.
- **Recomendación: (a).** Confirmar no crea ninguna liquidación ni transferencia; el gasto entra en Balance como cualquier gasto compartido.

#### Q10 · Ingresos variables: estados y rango

- **Contexto:** A.3 distingue ingresos habituales, extraordinarios, estimados y condicionales; el análisis §4 pide «estados y rango simples». Ejemplo ficticio de la propuesta: una prima estimada entre dos importes.
- **Opciones:** (a) dos dimensiones: **tipo** (habitual o extraordinario) y **certeza** (fijo, estimado con rango mínimo–máximo, o condicional); (b) una sola lista de cuatro estados; (c) solo «fijo» y «estimado con rango».
- **Recomendación: (a).** Un ingreso condicional (p. ej., un arriendo que todavía no existe) se ve en el calendario con su condición y nunca se presenta como seguro. Confirmar exige el importe real recibido.

#### Q11 · Ingresos y movimientos previstos de una sola vez

- **Contexto:** varios ejemplos de A.3 no son periódicos (un ingreso extraordinario, un pago único conocido). Sin esta opción, la persona tendría que inventar una frecuencia.
- **Opciones:** (a) se admite una «recurrencia» de una sola fecha; (b) solo reglas periódicas en v1.
- **Recomendación: (a)**, sin ampliar el alcance más allá del calendario y la confirmación.

#### Q12 · Aportes programados · ADR-d

- **Contexto:** 28.6 y la fila 7 del backlog: los aportes programados son una recurrencia de tipo «aporte a meta». ADR-d debe cerrar si el aporte programado es solo una sugerencia que se confirma, nunca un asiento automático. ADR-010 exige confirmación para operar fondos ajenos.
- **Opciones:** (a) la recurrencia es de la persona que aporta, a una meta suya o compartida; confirmar crea **su** aporte real; nunca aporta en nombre de la otra persona; (b) una recurrencia de aporte compartida que reparte entre los dos.
- **Recomendación: (a).** Preguntas añadidas: ¿la otra persona ve los aportes programados de su pareja a una meta compartida, o solo los aportes confirmados (como hoy)? Recomendación: solo los confirmados `[P]`. Si la meta se completa o se archiva, la recurrencia se pausa sola.

#### Q13 · Compromisos de duración definida

- **Contexto:** A.5: obligaciones con fecha de terminación o número de cuotas (ejemplo: la cuota inicial de un apartamento sobre planos). 28.10: esa cuota, pagada al tercero, es un **gasto real**. Las proyecciones están fuera de esta spec.
- **Opciones:** (a) fecha final **o** número de cuotas; el calendario muestra «cuota n de N»; la recurrencia pasa a finalizada sola tras la última; (b) solo fecha final.
- **Recomendación: (a).** La terminación queda registrada para que una spec posterior (Proyecciones y escenarios) pueda usarla; esta spec no proyecta nada.

#### Q14 · Calendario: forma, horizonte y entradas

- **Contexto:** 28.8: ruta hija de Plan. La decisión 16.8 dejó Actividad sin cuadrícula, con flechas de mes. El análisis §4 propone «saber qué viene este mes y el siguiente». A.4: qué se aproxima, qué está pendiente y qué ya se registró.
- **Opciones:** (a) lista agrupada por fecha, con flechas de mes, sin cuadrícula; (b) cuadrícula mensual en escritorio y lista en móvil; (c) cuadrícula en los dos.
- **Recomendación: (a)** en móvil, y que los comps decidan escritorio `[P]`. Horizonte: el mes actual y el siguiente por defecto, navegable hacia delante y hacia atrás. Entrada desde Plan; un acceso desde Inicio se decide con Q16.

#### Q15 · Cifras de lo previsto · ADR-b

- **Contexto:** ADR-b debe cerrar qué cifras pueden mezclar lo previsto y lo real, y con qué rótulo; regla mínima: ninguna métrica de §5.1 ni de DEC-G04 incluye nada previsto. DEC-R17 prohíbe presentar cualquier cifra como disponibilidad.
- **Opciones:** (a) sin totales de lo previsto en v1: el calendario lista instancias con su importe; (b) un total «Previsto» por mes, separado de todo lo real y sin restar de nada; (c) un «previsto frente a real» del mes.
- **Recomendación: (a) o (b)**, nunca (c) en esta spec: comparar previsto y real como flujo es de Flujo y liquidez (B.7) y el ingreso previsto como base de reparto es del Presupuesto integral v1 (28.3). En Nosotros, no tener recurrencias compartidas no es cero (como 28.9).

#### Q16 · Avisos dentro de la app

- **Contexto:** 28.8: solo dentro de la app, inicialmente. La propuesta (§8.3) y el análisis (ADR-h) mencionan recordatorios solo dentro de la app.
- **Opciones:** (a) una entrada «Por confirmar» con su número en la ruta de Recurrentes y un módulo en Inicio cuando hay pendientes; (b) solo en la ruta de Recurrentes; (c) un aviso al abrir la app.
- **Recomendación: (a)**, sin culpa (§2.3) y descartable. Un aviso de una instancia compartida lo ven los dos; uno privado, solo su dueña.

#### Q17 · Presets de captura

- **Contexto:** 28.6 y Q17 del análisis: plantilla reutilizable para capturar rápido; no prevé nada.
- **Preguntas:** ¿qué guarda (tipo, contexto, categoría, importe opcional, reparto, pagador, nota)? ¿Dónde se usa (Anotar)? ¿Hay presets compartidos en Nosotros? ¿Se crean a mano, desde un movimiento ya anotado, o los dos? ¿Cuántos?
- **Recomendación:** guarda esos campos con el importe **opcional**; se elige en Anotar y rellena el borrador, que se guarda como cualquier movimiento; privado XOR compartido como las recurrencias (Q8); se crea a mano o desde un movimiento; un tope bajo que fije el Plan. PR propio (Q1). El gasto habitual sin preset no se vuelve más lento (US-12).

#### Q18 · Ciclo de vida: pausar, finalizar, eliminar, pareja, exportación y borrado

- **Contexto:** A.1 pide activa, pausada o finalizada. Los movimientos financieros no se borran (§5.4). ADR-003 regula la salida de la pareja. El análisis §6 prevé una nota del contrato de borrado manual de la 005 por cada tabla nueva y una de ADR-013 con las tablas nuevas. §15.5: exportación de lo autorizado.
- **Opciones:** (a) pausar detiene las instancias futuras sin borrar las pasadas; finalizar las cancela; eliminar una recurrencia sin historia la borra y con historia la archiva; los movimientos reales nunca se tocan; (b) eliminar siempre borra la regla y deja los movimientos reales sin vínculo.
- **Recomendación: (a).** Al salir de la pareja, las recurrencias y presets compartidos siguen la regla de ADR-003 para los datos del grupo. La exportación incluye las recurrencias y los presets autorizados; el borrado de cuenta los incluye con su nota.

#### Q19 · Pruebas: specs E2E

- **Contexto:** 28.13: se mantiene el tope de P0; el tope no impide probar los invariantes en su capa. La 006 no añadió ninguna spec E2E (Q20).
- **Opciones:** (a) ninguna spec E2E nueva; (b) una, para confirmar una instancia de punta a punta.
- **Recomendación: (a)** si el tope está agotado: el vínculo previsto–real y la idempotencia en integración de servidor, la privacidad en pgTAP con tres cuentas, las fechas en el dominio y la interfaz en pruebas de componentes. Si hay hueco en el tope, (b). Lo confirma la etapa Plan con el recuento real.

## User Scenarios & Testing *(mandatory)*

Los importes de los escenarios son **ficticios**. «Ana» y «Beto» son personas
hipotéticas, no el dataset dorado.

### User Story 1 - Configurar una recurrencia de gasto y verla prevista (Priority: P1)

Ana configura en Yo una suscripción mensual: nombre, importe fijo, categoría
«Servicios», fecha inicial y frecuencia mensual. Desde ese momento ve sus próximas
instancias como **previstas**, y ninguna cifra real cambia.

**Why this priority**: es el núcleo de la spec (análisis §4: «saber qué viene este
mes y el siguiente») y la base de todo lo demás.

**Independent Test**: crear una recurrencia y comprobar que aparecen sus instancias
previstas y que Inicio, Actividad, Balance, presupuestos, Análisis y DEC-G04 dan
exactamente las mismas cifras que antes.

**Acceptance Scenarios**:

1. **Given** Ana sin recurrencias, **When** crea una recurrencia mensual de gasto con importe fijo, **Then** ve la próxima fecha esperada y las instancias del horizonte como previstas, y no aparece ningún gasto nuevo en Actividad.
2. **Given** una recurrencia activa, **When** Ana consulta su presupuesto de «Servicios», **Then** el consumo no cambia: lo previsto no consume presupuesto.
3. **Given** una recurrencia con importe estimado, **When** Ana la ve en el calendario, **Then** el importe se rotula como estimado y nunca como dinero disponible ni como «te alcanza».

---

### User Story 2 - Confirmar, vincular u omitir una instancia (Priority: P1)

Llega la fecha. Ana confirma la instancia en un toque y se crea el gasto real, que
aparece en Actividad enlazado a la instancia. Otro mes ya lo había anotado a mano:
lo vincula sin duplicarlo. Un mes no hubo cobro: la marca como omitida.

**Why this priority**: es la frontera previsto–real (A.2) y el mayor riesgo de
integridad (doble registro, análisis §7.1).

**Independent Test**: confirmar dos veces la misma instancia (doble toque, reintento
de red) y comprobar que existe un solo gasto; vincular un gasto existente y
comprobar que no se crea otro.

**Acceptance Scenarios**:

1. **Given** una instancia pendiente, **When** Ana confirma, **Then** se crea exactamente un movimiento real, la instancia pasa a confirmada y enlaza con él en Actividad (N-6).
2. **Given** la misma confirmación enviada dos veces, **When** el servidor la procesa, **Then** sigue habiendo un único movimiento real.
3. **Given** un gasto ya anotado a mano, **When** Ana lo vincula a la instancia, **Then** la instancia queda confirmada, no se crea ningún movimiento nuevo y ese gasto no puede vincularse a otra instancia.
4. **Given** una instancia pendiente, **When** Ana la omite, **Then** no se crea nada real y la instancia queda omitida.
5. **Given** una instancia confirmada, **When** se anula su movimiento real (ADR-007), **Then** la instancia deja de estar confirmada según Q5 y no queda ningún vínculo a un movimiento anulado.

---

### User Story 3 - Calendario de lo previsto (Priority: P1)

Desde Plan, Ana abre el calendario y ve qué viene este mes y el siguiente, qué está
pendiente de confirmar y qué ya se registró. Lo real lo sigue viendo en Actividad.

**Why this priority**: es la vista que da el valor de A.4 y la forma de llegar a
confirmar.

**Independent Test**: con instancias en los cinco estados, el calendario las agrupa
por fecha con su estado, y una confirmada abre su movimiento en Actividad.

**Acceptance Scenarios**:

1. **Given** instancias en varios estados, **When** Ana abre el calendario, **Then** ve cada una con su fecha, nombre, importe (fijo, estimado o rango) y estado, y puede confirmar u omitir las pendientes.
2. **Given** la navegación de §15.3, **When** Ana busca el calendario, **Then** está como ruta hija de Plan, sin pestaña ni destino nuevo.
3. **Given** el contexto Nosotros, **When** Beto abre el calendario, **Then** ve solo las recurrencias compartidas, nunca las privadas de Ana, ni por totales ni por huecos.

---

### User Story 4 - Recurrencias compartidas en Nosotros (Priority: P2)

Ana y Beto configuran el arriendo como recurrencia compartida, con su reparto y
quién suele pagarlo. Al confirmar, se crea el gasto compartido real, que entra en
Balance como cualquier otro.

**Why this priority**: muchas obligaciones del hogar son compartidas (A.1), pero el
núcleo funciona en Yo sin esto.

**Independent Test**: confirmar una instancia compartida y comprobar que el gasto
compartido creado tiene el pagador y el reparto esperados y que Balance cambia
exactamente como con un gasto anotado a mano.

**Acceptance Scenarios**:

1. **Given** una recurrencia compartida, **When** cualquiera de los dos la confirma (según Q9), **Then** se crea un gasto compartido con el reparto de la regla, sin liquidación ni transferencia.
2. **Given** una recurrencia privada de Ana, **When** Beto consulta cualquier vista, aviso o exportación, **Then** no aparece ningún rastro de ella.
3. **Given** que los dos editan a la vez la misma recurrencia compartida, **When** guardan, **Then** no hay sobrescritura silenciosa (versión, como §15.5).

---

### User Story 5 - Ingresos recurrentes y variables (Priority: P2)

Ana registra su salario como ingreso habitual con importe fijo y una prima anual
como ingreso extraordinario estimado en un rango. Ninguno cuenta como recibido
hasta que lo confirma con el importe real.

**Why this priority**: A.3 es parte del bloque A, pero el ingreso real ya existe
solo en privado y su uso en el presupuesto es de la spec siguiente.

**Independent Test**: un ingreso previsto no cambia ninguna cifra real; confirmarlo
crea un ingreso privado con el importe introducido.

**Acceptance Scenarios**:

1. **Given** un ingreso estimado con rango, **When** Ana lo ve en el calendario, **Then** se muestra el rango con su certeza y nunca como dinero recibido o disponible.
2. **Given** el contexto Nosotros, **When** Ana intenta crear una recurrencia de ingreso, **Then** no es posible: el ingreso es privado en v1 (28.9).
3. **Given** una instancia de ingreso pendiente, **When** Ana confirma, **Then** debe indicar el importe real y se crea un único ingreso privado.

---

### User Story 6 - Aportes programados a una meta (Priority: P2)

Ana programa un aporte mensual a su meta. Cada mes ve la instancia prevista y, al
confirmarla, se registra su aporte real en el ledger de la meta.

**Why this priority**: fila 7 del backlog (28.6); reutiliza el núcleo.

**Independent Test**: confirmar un aporte programado crea un solo aporte real de la
propia persona y cambia `aporte_a_metas` de DEC-G04 igual que un aporte manual.

**Acceptance Scenarios**:

1. **Given** un aporte programado previsto, **When** no se ha confirmado, **Then** la meta, «Tu disponible» y DEC-G04 no cambian.
2. **Given** una meta compartida, **When** Ana programa un aporte, **Then** solo puede aportar sus propios fondos; nunca aporta en nombre de Beto (ADR-010).
3. **Given** una obligación pagada a un tercero (p. ej., una cuota), **When** Ana configura su recurrencia, **Then** es una recurrencia de gasto, nunca de aporte a meta (28.10).

---

### User Story 7 - Compromisos de duración definida (Priority: P2)

Ana registra una cuota mensual con un número fijo de cuotas. Ve en qué cuota va y,
tras la última, la recurrencia termina sola.

**Why this priority**: A.5; es una extensión pequeña de A.1.

**Independent Test**: con N cuotas, se generan exactamente N instancias y la
recurrencia queda finalizada tras la última.

**Acceptance Scenarios**:

1. **Given** una recurrencia de N cuotas, **When** Ana la consulta, **Then** ve «cuota n de N» (o el texto que se apruebe, Q2) y la fecha de la última.
2. **Given** la última cuota resuelta, **When** pasa su fecha, **Then** la recurrencia queda finalizada y no genera más instancias.

---

### User Story 8 - Avisos dentro de la app (Priority: P2)

Al abrir Juntia, Ana ve que tiene instancias por confirmar y llega a ellas en un
toque. No recibe ni push ni correo.

**Why this priority**: sin aviso, lo pendiente se olvida; pero es secundario al
núcleo.

**Independent Test**: con instancias pendientes, el aviso aparece en los lugares que
fije Q16; sin pendientes, no aparece; nunca revela nada privado de la otra persona.

**Acceptance Scenarios**:

1. **Given** instancias pendientes, **When** Ana abre la app, **Then** ve el aviso dentro de la app y llega a confirmarlas.
2. **Given** instancias privadas pendientes de Ana, **When** Beto abre la app, **Then** su aviso no las cuenta.

---

### User Story 9 - Presets de captura (Priority: P3)

Ana guarda «Almuerzo del trabajo» como preset. En Anotar lo elige y el borrador se
rellena; escribe el importe y guarda. El preset no prevé nada ni aparece en el
calendario.

**Why this priority**: es un concepto distinto, va en PR propio y no puede retrasar
el núcleo (28.6).

**Independent Test**: usar un preset crea un movimiento real idéntico a uno anotado
a mano con los mismos datos; tener presets no crea instancias ni cambia cifras.

**Acceptance Scenarios**:

1. **Given** un preset, **When** Ana lo elige en Anotar, **Then** el borrador se rellena con sus campos y se guarda como cualquier movimiento.
2. **Given** presets guardados, **When** Ana abre el calendario, **Then** no aparece ninguno.
3. **Given** el gasto habitual sin preset, **When** Ana anota, **Then** el recorrido no se alarga (US-12).

### Edge Cases

- Confirmar dos veces, o desde los dos teléfonos de la pareja a la vez, la misma instancia compartida: un solo movimiento real.
- Vincular un gasto que ya está vinculado a otra instancia: se rechaza.
- Anular el movimiento real de una instancia confirmada (Q5).
- Editar la regla con instancias en todos los estados (Q6).
- Recurrencia mensual el día 31, el 29 de febrero, y quincenal en meses de 28 a 31 días (Q7).
- Recurrencia con fecha inicial en el pasado: no crea movimientos reales retroactivos; las fechas pasadas quedan pendientes o se omiten según Q5.
- Pausar y reanudar: las instancias del periodo pausado no reaparecen como pendientes.
- Meta completada o archivada con un aporte programado activo (Q12).
- Categoría de una recurrencia que deja de existir o se renombra.
- Salida de la pareja con recurrencias y presets compartidos (Q18; ADR-003).
- Borrado de cuenta y exportación con recurrencias, instancias y presets (Q18).
- Importe estimado o en rango al confirmar: el importe real se exige siempre.
- Nosotros sin recurrencias compartidas: «no hay ninguna registrada», nunca $0.
- Cambio de mes y de zona horaria: fechas en `America/Bogota` (§5.2).

## Requirements *(mandatory)*

### Functional Requirements

#### Recurrencias (A.1, A.5; fila 3)

- **FR-001**: Una persona puede crear una recurrencia de **gasto**, **ingreso** o **aporte a meta** con nombre, tipo, importe fijo o estimado (Q10), categoría cuando corresponda, fecha inicial, fecha final o número de cuotas opcionales (Q13), frecuencia (Q7), contexto, responsable y reparto cuando corresponda (Q8).
- **FR-002**: Cada recurrencia tiene estado **activa**, **pausada** o **finalizada** y muestra su próxima fecha esperada.
- **FR-003**: Una recurrencia es privada **o** de la pareja, nunca las dos (Q8). Las de ingreso solo existen en Yo (28.9; §7.3).
- **FR-004**: Editar una recurrencia sigue Q6, con versión y sin sobrescritura silenciosa.
- **FR-005**: Pausar, finalizar y eliminar siguen Q18; ninguna de esas acciones modifica ni borra un movimiento real.
- **FR-006**: Una obligación pagada a un tercero se configura como recurrencia de gasto, nunca de aporte a meta (28.10).

#### Lo previsto frente a lo real (A.2; ADR-a, ADR-b)

- **FR-010**: Una recurrencia genera instancias previstas con los estados de Q5; su forma (fila o cálculo) la fija ADR-a (Q3).
- **FR-011**: Ninguna instancia prevista crea, modifica ni se cuenta como un movimiento real. Ninguna métrica de §5.1, ningún presupuesto (DEC-R01, ADR-004), Balance, Análisis ni DEC-G04 incluye nada previsto.
- **FR-012**: Confirmar una instancia crea **exactamente un** movimiento real del tipo de la recurrencia, de forma idempotente (ADR-013), y lo vincula 1:1 con la instancia (Q4).
- **FR-013**: Vincular una instancia con un movimiento ya registrado no crea ningún movimiento; un movimiento real se vincula a una sola instancia y una instancia a uno solo.
- **FR-014**: Omitir una instancia no crea nada real.
- **FR-015**: Si se anula el movimiento real de una instancia confirmada, la instancia cambia de estado según Q5, con auditoría.
- **FR-016**: Al confirmar un ingreso o una instancia con importe estimado o en rango, se exige el importe real.
- **FR-017**: El movimiento real creado al confirmar se ve en Actividad como cualquier otro y enlaza con su instancia (N-6).

#### Ingresos variables (A.3)

- **FR-020**: Un ingreso previsto lleva el tipo y la certeza de Q10, con rango mínimo–máximo cuando es estimado.
- **FR-021**: Un ingreso previsto nunca se presenta como recibido, disponible ni seguro, y nunca alimenta un «te alcanza» (DEC-R17).
- **FR-022**: Si se responde (a) en Q11, se admite un movimiento previsto de una sola fecha.

#### Aportes programados (fila 7; ADR-d)

- **FR-030**: Una recurrencia de aporte a meta pertenece a quien aporta y solo confirma aportes de sus propios fondos (ADR-010; Q12).
- **FR-031**: Confirmar un aporte programado crea un aporte real en el ledger de la meta, idéntico en efecto a un aporte manual (DEC-G04), y nunca una fila en `transactions` (§7.3).
- **FR-032**: Un aporte programado previsto no cambia la meta, «Tu disponible» ni ninguna cifra de DEC-G04.

#### Calendario (A.4; 28.8; N-6)

- **FR-040**: El calendario de lo previsto es una ruta hija de Plan, sin destino de navegación nuevo (§15.3; 22.5).
- **FR-041**: Muestra las instancias del contexto activo con fecha, nombre, importe (fijo, estimado o rango), estado y, en compromisos de duración definida, «cuota n de N»; forma y horizonte según Q14.
- **FR-042**: Desde el calendario se confirma, vincula u omite una instancia pendiente.
- **FR-043**: El calendario no muestra movimientos reales sin instancia: lo real vive en Actividad (16.8).
- **FR-044**: Las cifras agregadas de lo previsto, si existen, siguen Q15 y ADR-b.

#### Avisos (28.8)

- **FR-050**: Los avisos de instancias por confirmar son solo dentro de la app, en los lugares de Q16; sin push ni correo.
- **FR-051**: Un aviso nunca cuenta ni revela instancias privadas de la otra persona.

#### Privacidad (28.11; §2.3.6; §7.4)

- **FR-060**: Todo es privado por defecto; nada se comparte sin una acción explícita.
- **FR-061**: Ninguna vista, aviso, agregado, error o exportación de la otra persona revela recurrencias, instancias o presets privados.
- **FR-062**: Sin «total del hogar». En Nosotros, la ausencia de recurrencias compartidas se dice como ausencia, no como cero.

#### Presets de captura (fila 4; 28.6; Q17)

- **FR-070**: Un preset es una plantilla para Anotar: rellena el borrador y no genera obligaciones, instancias previstas ni compromisos de presupuesto.
- **FR-071**: Guardar un movimiento desde un preset produce el mismo movimiento real que anotarlo a mano.
- **FR-072**: Los presets no aparecen en el calendario ni en los avisos.
- **FR-073**: Los presets van en un PR propio si se responde (a) en Q1, y nunca bloquean el núcleo de recurrencias.

#### Copy, accesibilidad, responsive y motion

- **FR-080**: Todo el copy nuevo en `src/lib/copy/es.ts` (CONVENTIONS B.1), con las palabras prohibidas de GLOSSARY §9 y BRAND §4; los nombres nuevos, según Q2.
- **FR-081**: Diseño a 390 y 1440 px, sin estirar el móvil; estados vacío, carga, error, sin recurrencias, todo confirmado, muchos pendientes, nombres largos e importes en rango; WCAG AA; texto al 200 %; movimiento reducido; iconos Phosphor con `AppIcon`.
- **FR-082**: Las pantallas salen de un prompt de diseño de esta spec y sus `[P]` se aprueban viendo la pantalla (como la 006).

#### Pruebas y CI (ADR-011; 28.13)

- **FR-090**: Dominio: generación de fechas para cada frecuencia y los casos límite de Q7, estados de Q5, cuotas de Q13, y la invariancia de §5.1, presupuestos y DEC-G04 con y sin recurrencias.
- **FR-091**: Integración de servidor: confirmación idempotente, vínculo 1:1, anulación del movimiento vinculado y confirmación concurrente desde dos cuentas de la pareja.
- **FR-092**: pgTAP: RLS de recurrencias, instancias y presets con tres cuentas, privado XOR compartido, ingreso solo privado.
- **FR-093**: Specs E2E según Q19, dentro del tope (28.13).

#### Fuera de alcance (explícito)

- Saldos de cuentas, disponibilidad o liquidez (Cuentas, activos y patrimonio; Flujo y liquidez; DEC-R17).
- Amortización, intereses y desglose de cuotas de crédito (Créditos y deudas; 28.14).
- Proyecciones, escenarios y el uso de la terminación de un compromiso en ellas (Proyecciones y escenarios; 28.12).
- Presupuesto integral, distribución del ingreso previsto y previsto frente a real como flujo (Presupuesto integral v1; Flujo y liquidez).
- Integraciones bancarias, débitos automáticos, ejecución de pagos y conciliación bancaria automática (propuesta A).
- Ingreso compartido (28.9; ADR-j).
- Avisos push o por correo (28.8).
- Estadísticas y DEC-R01-S (28.6).
- Grupos de más de dos (28.4).
- Multimoneda (§3).

### Key Entities *(conceptuales; la forma la fijan ADR-a, ADR-d y el Plan)*

- **Recurrencia**: regla de un movimiento esperado. Propietaria XOR pareja, tipo (gasto, ingreso, aporte a meta), nombre, importe fijo o estimado con rango, certeza (ingresos), categoría, meta (aportes), frecuencia, fecha inicial, fecha final o número de cuotas, responsable, reparto, estado, versión y auditoría.
- **Instancia prevista**: una ocurrencia de la recurrencia en una fecha, con su estado (Q5). Nunca es un movimiento real (Q3).
- **Vínculo instancia–movimiento real**: relación 1:1 entre una instancia confirmada y el gasto, ingreso o aporte real que la cumple, idempotente (Q4).
- **Preset de captura**: plantilla de Anotar, propietaria XOR pareja, con los campos de Q17. Concepto distinto de la recurrencia; si comparten entidad lo decide el Plan (28.6).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con y sin recurrencias, presets e instancias en cualquier estado no confirmado, todas las cifras de Inicio, Actividad, Balance, presupuestos, Análisis, Metas y DEC-G04 son idénticas en el dataset de la etapa Plan.
- **SC-002**: Ninguna secuencia de confirmaciones repetidas o concurrentes produce dos movimientos reales para una misma instancia (cero duplicados en las pruebas de integración).
- **SC-003**: Cero fugas: ninguna consulta de la otra cuenta ni de una tercera devuelve dato alguno de una recurrencia, instancia, aviso o preset privado (pgTAP con tres cuentas).
- **SC-004**: Confirmar una instancia de importe fijo cuesta un toque desde el calendario o el aviso; el gasto habitual sin recurrencia ni preset sigue en mediana < 10 s en teléfono real (US-12).
- **SC-005**: Los dos fundadores distinguen sin ayuda, en una prueba con sus propios datos, lo previsto de lo real en el calendario, y ninguno interpreta un ingreso previsto como dinero recibido o disponible.
- **SC-006**: Sin scroll horizontal en 360, 390, 430, 1024 y 1440; CLS = 0 en las cargas con skeleton (§15.7).

## Assumptions

- MVP-1 está declarado y Planes (006) aceptada antes de implementar esta spec (28.18); la spec 005 y sus excepciones siguen vigentes.
- Durante el gate, esta spec solo avanza en documentación: spec, ADR propuestos y diseño (28.17). Se pausa durante el Plan y las Tasks de Planes y se reanuda al mergear el PR de Tasks de Planes (28.18).
- La pareja es de exactamente dos (§15.5); el modelo se escribe para N.
- El ingreso real ya existe, solo privado (16.3; §7.3); esta spec no lo cambia.
- Las fechas se calculan en `America/Bogota` (§5.2).
- El repositorio es público (25.1): los ejemplos son ficticios y no forman parte del dataset dorado.
- Esta spec no modifica contratos de la 006 (28.18, condición 7).

## Lo que hace falta para pasar a Plan

1. Que los fundadores respondan Q1–Q19 en Clarify y las respuestas queden registradas como decisión del maestro §15.10.
2. Que **ADR-a** (recurrencias y movimientos previstos), **ADR-b** (previsto frente a real en las métricas) y **ADR-d** (aportes programados, ampliación de ADR-010), en lo que afecta a esta spec, se escriban como **Propuestos** y se acepten, con el número que les toque al abrirse.
3. Que la revisión del PR de esta spec termine sin hallazgos abiertos.
4. Que los fundadores aprueben los comps de diseño.
5. Que la secuencia de 28.17 y 28.18 permita la etapa Plan: durante el gate solo se adelanta la documentación de spec, ADR propuestos y diseño, y la documentación de esta spec se pausa mientras Planes hace su Plan y sus Tasks.
