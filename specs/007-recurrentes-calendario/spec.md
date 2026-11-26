# Feature Specification: 007 · Recurrentes y calendario (MVP-2)

**Feature Branch**: `claude/007-recurrentes-calendario-bb9ced` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5)

**Created**: 2026-11-25

**Status**: Draft · Specify y Clarify hechos. Los fundadores respondieron Q1–Q19 el 25 de noviembre de 2026: aceptaron las recomendaciones salvo Q4, Q6 y Q15, que cambian, y precisaron Q7, Q12, Q13, Q17 y Q18. **Q15 no está cerrada**: el total de gastos previstos se explora en los comps, con «sin totales» como respaldo. Las respuestas y D1–D7 están registradas en el maestro §15.10, decisión 29. La revisión adversarial F101 se aplicó, y los fundadores confirmaron sus siete decisiones (D1 a D7) el 25 de noviembre de 2026, con precisiones en D3, D4 y D5. Spec abierta por el procedimiento de spec nueva de ADR-012 (`[V]` 4, condición 6) con la documentación de Recurrentes autorizada durante el gate de MVP-1 (maestro §15.10, decisiones 28.17 a 28.19). **ADR-a está aceptado como ADR-016** (25 de noviembre de 2026; maestro §15.10, decisión 29.11), con las decisiones P1–P7 de los fundadores, reconciliadas en esta spec («Session 2026-11-25 · ADR-016»).

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
> plantilla de Spec Kit limita a tres los `[NEEDS CLARIFICATION]`. Aquí hubo
> diecinueve preguntas, porque todo lo no decidido llega a los fundadores en
> lugar de resolverse en la spec. Ninguna se marca en línea: viven en
> «Clarifications», con sus respuestas.
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

### Session 2026-11-25 · Clarify

Los fundadores respondieron Q1–Q19 el 25 de noviembre de 2026; el gestor
transmitió su texto a esta sesión. Aceptaron las recomendaciones de la etapa
Specify **salvo Q4, Q6 y Q15**, y precisaron Q7, Q12, Q13, Q17 y Q18. Las
preguntas, con su contexto y la recomendación original, se conservan abajo tal
como se plantearon («Contexto y opciones de cada pregunta»); **si difieren, manda
esta tabla**. Las respuestas están registradas en el maestro §15.10, decisión 29.
Las marcadas **· ADR-x** dejan detalle al candidato del análisis §6, que se
escribe como **Propuesto** y se acepta antes de la etapa Plan (`AGENTS.md` 17).

| # | Tema | Respuesta de los fundadores (25 nov 2026) |
| --- | --- | --- |
| Q1 | Forma de la spec y reparto en PR | **(a)**: una spec, tres PR (A núcleo, B calendario y avisos, C presets); los presets no retrasan el núcleo. El Plan confirma la distribución técnica |
| Q2 | Nombres visibles e identificadores | **(a)**: se deciden con los comps y entran en GLOSSARY solo aprobados |
| Q3 | Instancia prevista: fila o cálculo · ADR-a | **Recomendación aceptada**: lo decide ADR-a, con la restricción de que nada previsto va a `transactions`. Resuelto por ADR-016 (§1 y §2) |
| Q4 | Confirmar y vincular · ADR-a | **Cambia.** Confirmar: **(c)**, un toque con los datos de la versión de la instancia (F101-6) si el importe es fijo, con la opción de abrir Anotar antes de guardar; Anotar si es estimado o en rango. Vincular: **(b)**, sugerido y confirmado por la persona, más búsqueda manual; nunca automático y solo con movimientos compatibles (F101-1). Precisiones abajo |
| Q5 | Estados de una instancia | **Recomendación aceptada**: cinco estados; «omitido» se deshace; anular el movimiento real devuelve la instancia a pendiente (alcance precisado en F101-3 y F101-4, D1) |
| Q6 | Editar una recurrencia · ADR-a | **Cambia a (c)**: la edición cambia solo las instancias futuras sin resolver. Precisiones abajo |
| Q7 | Frecuencias y reglas de fecha | **Recomendación aceptada, con precisiones**: día de referencia y colisión quincenal (abajo) |
| Q8 | Recurrencias en Nosotros | **(a)**: privada XOR compartida, elegida al crearla y **sin conversión posterior** en ningún sentido (F101-11); cualquiera de los dos edita las compartidas con versión. Los aportes programados son siempre privados (Q12) |
| Q9 | Quién confirma una instancia compartida | **(a)**: cualquiera de los dos; pagador y reparto de la versión de la instancia (F101-6), cambiables en Anotar antes de guardar |
| Q10 | Ingresos variables | **(a)**: tipo (habitual o extraordinario) y certeza (fijo, estimado con rango, condicional, con su condición e importe conocido, estimado o desconocido, F101-10) |
| Q11 | Previstos de una sola fecha | **(a)**: se admiten |
| Q12 | Aportes programados · ADR-d | **(a), con precisiones** (abajo) |
| Q13 | Compromisos de duración definida | **(a), con precisiones** (abajo) |
| Q14 | Calendario | **(a)** en móvil (lista por fecha, flechas de mes, sin cuadrícula); escritorio con los comps; ruta hija de Plan |
| Q15 | Cifras de lo previsto · ADR-b | **Abierta hasta los comps.** Se explora **(b)**, un total mensual de gastos previstos, con **(a)**, sin totales, como respaldo. No es una (b) cerrada. Condiciones abajo |
| Q16 | Avisos dentro de la app | **(a)**: «Por confirmar» en la ruta de Recurrentes y módulo en Inicio con pendientes; sin push ni correo |
| Q17 | Presets de captura | **Recomendación aceptada, con precisiones** (abajo) |
| Q18 | Ciclo de vida | **(a), con precisiones** (abajo) |
| Q19 | Pruebas: specs E2E | **Recomendación aceptada**: ninguna spec E2E nueva si el tope está agotado; si hay hueco, una. El Plan confirma el recuento **sin aumentar el tope** |

Además: no se reabre ninguna decisión anterior y no se incorpora nada del
Presupuesto integral, Créditos, Patrimonio ni Flujo y liquidez.

Las filas Q4, Q5, Q8, Q9 y Q10 llevan la referencia a la revisión F101 que las
precisa (subsección «Precisiones de la revisión F101», abajo). Esas precisiones
no cambian ninguna respuesta; las que dependían de los fundadores (D1 a D7)
están confirmadas.

#### Precisiones de los fundadores

**Q4 · Confirmar y vincular.**

- Un importe fijo se confirma en un toque con los datos de la versión de la
  instancia (F101-6), pero se puede
  abrir Anotar antes de guardar si el importe, la fecha real, el pagador o el
  reparto son distintos.
- Un ingreso estimado o condicional exige el importe efectivamente recibido. En
  un ingreso de certeza fija, la confirmación explícita del importe mostrado basta.
- Si existe un movimiento real compatible, se ofrece vincularlo antes de crear
  otro. La persona también puede buscar uno a mano cuando no aparece ninguna
  sugerencia.
- Nunca se vincula automáticamente ni se usa información privada de la otra
  persona para sugerir coincidencias.
- Se conserva el mecanismo existente de Gasto con meta cuando hay una reserva
  previa real, con las condiciones de 28.10 y ADR-010.
- La **fecha prevista** de la instancia y la **fecha efectiva** del movimiento
  real son datos distintos.

**Q6 · Edición.** La edición cambia solo las instancias **previstas** (futuras sin
resolver). Las **pendientes** cuya fecha ya pasó conservan los datos y la versión
de la regla que les correspondían; las confirmadas, omitidas y canceladas no
cambian. El importe efectivo se ajusta al confirmar. ADR-016 resuelve la identidad estable
(regla y posición, una posición por periodo) y que una edición no genere
duplicados. **Qué se edita (P2):** los datos, el día dentro de su periodo, N y la
fecha final; cambiar la unidad, el intervalo o el origen es el flujo «Cambiar
frecuencia» (FR-005). **Excepción aprobada (P7):** una instancia que se omitió
conserva para siempre la fecha y la versión fijadas al omitirla, también si la
omisión se deshace, y las ediciones posteriores no la cambian.

**Q7 · Fechas.**

- **Día de referencia.** Cuando una fecha mensual (o trimestral, semestral o
  anual) no existe en un mes, cae en el último día de ese mes, y el día original
  se conserva como referencia para los siguientes. Ejemplo: una recurrencia del
  día 31 genera 31 de enero, 28 (o 29) de febrero y 31 de marzo, no 28 de marzo.
- **Colisión quincenal.** Con dos días fijos del mes, cada uno con su día de
  referencia, los dos podrían caer en la misma fecha en un mes corto (p. ej., 30
  y 31 en febrero). **Regla decidida (P1; ADR-016 §3.3): al crearla, y también al editar los días,
  el primer día va del 1 al 15 y el segundo del 16 al 31 (31 = «último día»).** Así el segundo, aunque se ajuste,
  nunca baja de 28 y la colisión no puede ocurrir. Se descartaron generar una sola
  instancia en la fecha coincidente (pierde una obligación) y mover la segunda
  (cambia una fecha que la persona no eligió).
- `America/Bogota`, sin días hábiles ni festivos en v1.

**Q12 · Aportes programados.**

- La programación es **privada**, también cuando la meta es compartida. La otra
  persona solo ve los aportes confirmados, según el contrato existente.
- La recurrencia se **pausa** cuando la meta se completa o se archiva, y no se
  reanuda sin una acción explícita de su propietaria.
- Un aporte previsto nunca representa fondos reservados ni modifica «Tu
  disponible».

**Q13 · Compromisos con fin.**

- El número de cuotas cuenta las **ocurrencias programadas**, no las cuotas
  efectivamente pagadas.
- La **terminación automática** deja de generar instancias, pero no cancela ni
  oculta las pendientes anteriores. Se distingue de la **finalización manual**.
- Una recurrencia terminada nunca se presenta como prueba de que una deuda está
  pagada.

**Q15 · Cifras de lo previsto.** Saber cuánto está previsto pagar en un mes es
parte del valor de Recurrentes. Se explora en los comps un **total mensual de
gastos previstos**, separado de ingresos y aportes programados, con un rótulo que
diga exactamente qué incluye. Condiciones:

- nunca se mezcla con métricas de movimientos reales;
- no suma ingresos, gastos y aportes en una cifra neta;
- los ingresos condicionales no se presentan como seguros;
- un importe desconocido no se trata como cero;
- si solo se cuentan importes fijos pendientes de confirmar, se dice;
- ADR-b define el tratamiento de estimados, rangos, estados y privacidad;
- no se calculan excedentes, disponibilidad financiera, capacidad de pago ni
  previsto frente a real;
- en Nosotros, solo información compartida autorizada; la ausencia no es cero.

La presentación definitiva se aprueba viendo los comps. Si una cifra sencilla no
se puede comunicar con claridad sin ampliar el alcance, se queda **(a)**. En
cualquier caso, **el total de previstos no es liquidez ni disponibilidad**
(DEC-R17; decisión 28, «Lo que no cambia»).

**Q17 · Presets.**

- Al crear un preset desde un movimiento, se copian solo los campos autorizados
  de la plantilla; nunca vínculos financieros, identificadores de liquidación,
  usos de metas ni datos de la instancia recurrente.
- Privado por defecto; compartirlo requiere una acción explícita.
- Usarlo siempre rellena un borrador; nunca guarda un movimiento por sí solo.

**Q18 · Ciclo de vida.**

- Pausar detiene las ocurrencias futuras y conserva las pendientes anteriores.
- Reanudar no recupera las ocurrencias del periodo pausado.
- Finalizar a mano informa qué instancias sin resolver se cancelarán y pide
  confirmación. En compromisos con N o con fecha final se cancelan todas las
  futuras; en una recurrencia sin fin, las previstas dejan de generarse (P3).
- La terminación automática por fecha o número de cuotas conserva las
  pendientes (Q13).
- Ninguna de estas acciones modifica los movimientos reales.
- La exportación y el borrado de cuenta incluyen también las instancias, sus
  estados y sus vínculos autorizados, no solo las reglas y los presets.

#### Precisiones de la revisión F101

La revisión adversarial del PR #101 sobre `7fb3bef` dio doce hallazgos (F101-1 a
F101-12). Los que son corrección directa se aplican en la spec. Siete dependían
de una decisión de los fundadores (D1 a D7). **Los fundadores los confirmaron el
25 de noviembre de 2026**, con precisiones en D3, D4 y D5; el gestor transmitió
su texto. Ninguno reabre una respuesta de Clarify, y Q15 sigue abierta hasta los
comps.

| Decisión | Hallazgo | Respuesta de los fundadores |
| --- | --- | --- |
| D1 | F101-4 · anular devuelve a pendiente | Aceptada tal como se recomendó |
| D2 | F101-5 · confirmación anticipada solo si el hecho ya ocurrió | Aceptada tal como se recomendó |
| D3 | F101-8 (i) · omitir una instancia futura | Aceptada, con precisión: deshacer la omisión la devuelve a prevista o pendiente según su fecha, si el ciclo de vida de la recurrencia lo permite |
| D4 | F101-8 (ii) · deshacer una omisión tras finalizar a mano | Aceptada, con precisión: no reactiva una recurrencia finalizada a mano o archivada; se distingue de la terminación automática, que conserva las obligaciones pendientes |
| D5 | F101-8 (iv) · pausar un compromiso de N ocurrencias | Aceptada, con precisiones (abajo) |
| D6 | F101-9 · eliminar con historia | Aceptada tal como se recomendó |
| D7 | F101-7 · el disparador es lograda o archivada | Aceptada tal como se recomendó |

- **F101-1 · Compatibilidad de vínculos.** Que alguien pueda ver un movimiento no
  lo hace vinculable. Solo se vincula un movimiento del **mismo tipo**, del **mismo
  contexto** (privado con privado del mismo dueño; compartido con compartido del
  mismo grupo) y, en aportes programados, de la **misma meta y el mismo
  aportante** (tabla «Compatibilidad de vínculos»). Categoría, fecha e importe son
  solo heurísticas para sugerir. La autorización y la compatibilidad se validan en
  el servidor. El algoritmo de búsqueda lo fija ADR-016 §7.6.
- **F101-2 · Privacidad de la programación.** El enlace desde Actividad a la
  instancia solo existe para quien tiene autorización sobre ella. Para la otra
  persona, un aporte confirmado desde una programación privada **no se distingue**
  de un aporte manual equivalente: sin insignia, identificador, frecuencia ni
  procedencia, ni en vistas, exportación, errores o metadatos. Se protege también
  la **existencia** de la programación, no solo su contenido.
- **F101-3 · Sustitución técnica (Mover a Pareja).** ADR-001 anula el gasto
  privado y crea su reemplazo compartido. Esa anulación **técnica**, parte de una
  sustitución auditada (Mover a Pareja y su Deshacer), no es la anulación
  **económica** que corrige o elimina un hecho. Invariantes: una sola operación
  económica activa por instancia; la recurrencia original sigue siendo privada; el
  vínculo no se traslada a un movimiento de otro contexto (F101-1); los vínculos y
  las sustituciones quedan auditados; se respetan ADR-001, ADR-010 y ADR-015. El
  mecanismo lo resuelve ADR-016 §8. Ninguna función existente de MVP-1 ni de Planes se
  bloquea por tener una instancia vinculada.
- **F101-4 · Anulación (D1).** Al anular **económicamente** el movimiento real de
  una instancia confirmada, la instancia vuelve a **pendiente de resolución**, con
  su fecha prevista y su versión histórica, **aunque su fecha no haya llegado**.
  Así una edición posterior de la regla no la reescribe (Q6). Se quita la
  excepción «o a prevista si la fecha aún no llegó». Cómo se representa el estado lo fija ADR-016 §5.
- **F101-5 · Confirmación anticipada (D2).** Confirmar o vincular antes de la
  fecha prevista solo se permite si el hecho económico **ya ocurrió**: fecha
  efectiva igual a hoy o anterior. Los aportes conservan la regla de la 004
  (FR-040: hoy o pasado). La regla general de fechas futuras de los movimientos
  anotados a mano no cambia (16.13; 002, Q13).
- **F101-6 · Versión al confirmar.** La confirmación y el borrador se rellenan con
  los datos de la **versión de la regla que corresponde a la instancia** (importe,
  categoría, pagador y reparto), no con la regla vigente. Es un contrato que ADR-016 conserva aunque calcule las ocurrencias futuras al vuelo.
- **F101-7 · Aportes y estado de la meta (D7 en el disparador).** La pausa
  automática se dispara cuando la meta pasa **formalmente** a lograda («Dar por
  lograda», manual, 22.15) o a archivada; llegar al 100 % no basta. Las instancias
  anteriores se conservan (Q18) pero no se pueden confirmar mientras la meta no
  esté activa; no se reanuda hacia una meta que no está activa; el estado de la
  meta y la autorización se revalidan en la misma operación que registra el
  aporte, con la concurrencia entre confirmar y lograr o archivar cubierta.
  ADR-010 y los estados de Metas no cambian.
- **F101-8 · Casos de la tabla de estados.**
  - (i) **D3.** Se puede **omitir anticipadamente** una instancia futura con una
    acción explícita. Si se deshace la omisión, la instancia vuelve a **prevista o
    pendiente según su fecha**, siempre que el ciclo de vida de la recurrencia lo
    permita (D4). La regla completa, con la reapertura por D1, el historial de pausas y la
    fecha y la versión históricas, es la precedencia de ADR-016 §6.4 (FR-017).
  - (ii) **D4.** Deshacer una omisión **no reactiva** una recurrencia finalizada a
    mano ni archivada: en ese caso no está disponible, y lo cancelado sigue
    cancelado. Esto se distingue de la **terminación automática**, que conserva
    las obligaciones pendientes: con una recurrencia terminada sola, deshacer una
    omisión sí está disponible.
  - (iii) Si se anula un movimiento después de archivar la recurrencia, la
    instancia pendiente que resulta se conserva con trazabilidad. Sigue visible en «Por confirmar» y en el calendario, y se puede resolver sin reactivar la recurrencia; no recupera las instancias canceladas en la finalización (P5; ADR-016 §6.6).
  - (iv) **D5.** Pausar un compromiso de duración definida **consume las
    posiciones del calendario original**: las ocurrencias del periodo pausado no se
    generan pero cuentan, la fecha final no se extiende y reanudar no las recupera
    automáticamente. La pausa nunca cambia en silencio el número de ocurrencias.
    Además:
    - una ocurrencia consumida durante una pausa **no equivale a una cuota
      pagada**;
    - **omitir tampoco equivale a conservar una obligación pendiente**;
    - si la obligación sigue existiendo y aún no se ha pagado, **se conserva como
      pendiente** cuando corresponda: pausar no es la herramienta para eso;
    - **antes de pausar** un compromiso de duración definida, se explica el efecto
      sobre las próximas ocurrencias y su fecha final;
    - ADR-016 §6 resuelve su representación y trazabilidad, sin amortización ni gestión de deuda: las posiciones consumidas no se materializan, y no hay recuperación manual excepcional en v1 (P4).
  - Nada de amortización ni de saldos de deuda.
- **F101-9 · Eliminar con historia (D6).** Equivale a **archivar** la recurrencia
  y **cancelar** sus instancias sin resolver, con la misma confirmación que la
  finalización manual: se muestra la lista de lo que se cancela. Los movimientos
  reales y sus vínculos históricos autorizados se conservan.
- **F101-10 · Ingresos condicionales.** Se representa conceptualmente la
  **condición** de la que depende el ingreso (texto), su certeza y si el importe es
  **conocido, estimado o desconocido**. El calendario muestra la condición. Un
  importe desconocido no es cero. Para confirmar se pide lo realmente recibido. No
  hay motor de condiciones: el formato lo deciden el ADR y el diseño.
- **F101-11 · Contexto inmutable (Q8).** Una recurrencia nunca cambia de privada a
  compartida ni al revés. Para cambiar de contexto se crea una recurrencia nueva y
  se cierra la anterior. No es lo mismo que Mover a Pareja, que opera sobre gastos
  reales.
- **F101-12 · Ajustes menores.** Recuento de respuestas de la tabla de estados;
  ADR-010 y 22.13 en la anulación de aportes (FR-018); ADR-003 mantiene bloqueada
  la salida de la pareja (FR-077); «cuota n de N» solo con un total de
  ocurrencias (FR-042); tope bajo de presets fijado en el Plan (FR-075); alcance
  del toque único (SC-004).

**Ronda 2 de la revisión (sobre `495eb69`).** Cierra F101-1, 2, 4, 5, 6, 9, 11 y
12, y abre F101-13 a F101-17. Son correcciones directas: ninguna requiere decisión
de los fundadores, y no reabren D1–D7. Fijan resultados funcionales y dejan la
representación a ADR-a o ADR-d.

- **F101-13 · Anulación económica después de una sustitución técnica.**
  Resultados de la cadena completa:

  | Operación | Movimientos económicos activos | Instancia |
  | --- | --- | --- |
  | Confirmación inicial | 1 privado | Confirmada |
  | Mover a Pareja | 1 compartido | Confirmada |
  | Deshacer Mover a Pareja, cuando se permite | 1 privado restaurado | Confirmada |
  | Anulación económica del movimiento activo (el reemplazo compartido o el privado restaurado) | 0 | Pendiente de resolución (D1) |

  La trazabilidad de la sustitución **no es un vínculo ordinario** entre
  contextos incompatibles (F101-1) y es **privada**: la otra persona no puede
  descubrir la recurrencia a través del gasto compartido (F101-2). El modelo físico lo fija ADR-016 §8; ADR-001 no cambia.
- **F101-14 · Deshacer una omisión durante una pausa.** Una ocurrencia cuya fecha
  fijada no cae en ningún intervalo pausado vuelve a pendiente. Una que cae en un
  periodo pausado no se reintroduce como prevista. Si la recurrencia se reanuda,
  rigen D3 y D5, sin recuperar el periodo pausado. La regla completa es la de
  ADR-016 §6.4 (FR-017): la acción no está disponible y la instancia sigue omitida.
- **F101-15 · Terminación automática durante una pausa.** Una recurrencia pausada
  pasa a finalizada · sola cuando se agotan sus posiciones o llega su fecha final,
  y ya no se puede reanudar. Las N posiciones programadas no son las instancias
  que realmente se generan. Las pendientes anteriores siguen visibles. Las posiciones consumidas no se materializan (ADR-016 §6.3).
- **F101-16 · Concurrencia con el estado de la meta.** Manda el orden efectivo:
  - un aporte confirmado antes de que la meta se dé por lograda es válido;
  - después, se rechaza y la instancia queda pendiente;
  - archivar sigue sus requisitos (22.15; 004, FR-040).

  Confirmar un aporte **nuevo** en una meta inactiva está prohibido. Si se puede
  **vincular** un aporte histórico válido es una cuestión explícita para ADR-d o
  para los fundadores.
- **F101-17 · Ingreso condicional con importe conocido.** En ingresos, el toque
  único exige **certeza fija**. Un ingreso condicional abre el borrador y pide el
  importe recibido, aunque su importe previsto sea conocido.
- **Ajuste de FR-004.** La edición no reescribe ninguna instancia pendiente de
  resolución, vencida o no (D1).

**Ronda 3 de la revisión (sobre `97ce697`).** Cierra F101-13, 15, 16 y 17, y
acepta dos lecturas del redactor: la referencia de F101-14 es la fecha prevista, y
la anulación del privado restaurado devuelve a pendiente. Precisa dos puntos sin
estados, mecanismos ni funciones nuevos:

- **F101-18 · El periodo pausado sigue contando tras reanudar o terminar sola.**
  Una ocurrencia cuya fecha prevista cayó en un periodo pausado no se reintroduce
  al deshacer su omisión, aunque la recurrencia ya esté reanudada o haya terminado
  sola: depende del historial de la ocurrencia, no del estado actual. Ejemplo
  ficticio: se omite el 15 de enero el día 1, se pausa el 5, se reanuda el 20 y se
  deshace la omisión el 21: no vuelve.
- **F101-19 · Cardinalidad y trazabilidad privada.** El vínculo ordinario 1:1,
  sujeto a la compatibilidad, y la trazabilidad privada de una sustitución técnica
  son cosas distintas. La trazabilidad no es un vínculo ni cuenta como tal. El caso del reemplazo compartido candidato a un vínculo posterior lo resuelve
  ADR-016 §9 con la opción C, coexistencia (P6; FR-014a).
- **F101-20.** La precisión vigente de Q4 dice «ingreso de certeza fija».

#### Compatibilidad de vínculos (F101-1)

Vale para la sugerencia, la búsqueda manual y la validación en el servidor. Un
movimiento anulado o ya vinculado a otra instancia nunca es vinculable.

| Instancia de… | Movimiento candidato | ¿Vinculable? |
| --- | --- | --- |
| Gasto privado de A | Gasto privado de A | **Sí** |
| Gasto privado de A | Gasto compartido de la pareja de A | No (privada con compartida) |
| Gasto compartido de la pareja G | Gasto compartido de G, anotado por cualquiera de los dos | **Sí** |
| Gasto compartido de G | Gasto privado de A o de B | No (compartida con privada) |
| Gasto (privado o compartido) | Ingreso | No (tipo distinto) |
| Ingreso de A | Ingreso privado de A | **Sí** |
| Ingreso de A | Gasto de A | No (tipo distinto) |
| Aporte programado de A a la meta M | Aporte de A a M | **Sí** |
| Aporte programado de A a M | Aporte de B a M | No (otro aportante) |
| Aporte programado de A a M | Aporte de A a otra meta | No (otra meta) |
| Cualquiera | Movimiento anulado o ya vinculado | No |

#### Estados y transiciones (Q5, Q6, Q13, Q18 y revisión F101)

Reconcilia las cuatro respuestas y la revisión F101 en una sola tabla. La
implementación (fila o cálculo, identidad estable, representación de los estados)
la fija ADR-016; aquí solo se fija el comportamiento. Las decisiones D1 a D7
de los fundadores (revisión F101) están confirmadas.

**Recurrencia.** El contexto (privada o compartida) no cambia nunca (F101-11).

| Estado | Genera instancias nuevas | Cómo se llega | Cómo se sale |
| --- | --- | --- | --- |
| **Activa** | Sí, desde su fecha inicial o desde la reanudación | Crear; reanudar | Pausar; finalizar a mano; terminar sola; eliminar |
| **Pausada** | No. Las ocurrencias del periodo pausado no se generan; en un compromiso de N ocurrencias cuentan igual y la fecha final no cambia; reanudar no las recupera; ninguna equivale a una cuota pagada, y antes de pausar se explica el efecto sobre las próximas ocurrencias y la fecha final (D5, F101-8 iv) | Pausar; la meta de un aporte programado pasa a lograda o archivada (D7, F101-7) | Reanudar, solo con acción explícita, si quedan posiciones y no ha llegado la fecha final y, en aportes, solo hacia una meta activa; terminar sola (F101-15); finalizar a mano; eliminar |
| **Finalizada · sola** | No | Desde activa o pausada, cuando pasa la fecha final o se agotan las N posiciones programadas (Q13; F101-15) | Ninguna: ya no se reanuda |
| **Finalizada · a mano** | No | Finalizar a mano, tras ver la lista de instancias que se cancelan y confirmar (Q18) | Ninguna |
| **Archivada** | No | Eliminar con historia: se muestra la misma lista y se confirma (D6, F101-9) | Ninguna |

Eliminar una recurrencia sin historia la borra. Con historia, la archiva (fila de
arriba). En ningún caso cambia un movimiento real ni un vínculo histórico
autorizado.

**Instancia.** «Hoy» es la fecha en `America/Bogota`.

| Desde | Evento | Hacia | Notas |
| --- | --- | --- | --- |
| — | La recurrencia activa alcanza una ocurrencia dentro del horizonte | **Prevista** | Tiene la versión que corresponde a su posición según ADR-016 §4 o, si tuvo un hecho, la versión histórica fijada desde su primer hecho. Calcularla no la materializa |
| Prevista | Llega su fecha prevista | **Pendiente** | Conserva su versión (Q6) |
| Prevista | Se edita la regla (datos, día dentro de su periodo, N o fecha final; P2), y la posición sigue dentro del calendario | Prevista | Toma la versión nueva, sin duplicados (ADR-016 §3.4). **Excepción aprobada a Q6 (P7):** una instancia con fecha y versión fijadas por una omisión, deshecha o no, las conserva. Cambiar la unidad, el intervalo o el origen no es una edición: «Cambiar frecuencia» (FR-005) |
| Prevista, sin hechos | Un cambio autorizado de N, de la fecha final o del día deja su posición fuera del calendario (p. ej., mensual del día 10 con fin el 15 de marzo que pasa al día 20: la de marzo sale) | — | Deja de existir funcionalmente (ADR-016 §3.4 y §6.1), con vista previa que la nombra. No es un estado nuevo. Nunca afecta a una posición con hechos |
| Pendiente | Se edita la regla | Pendiente | **No cambia**: conserva su versión (Q6) |
| Pendiente | Confirmar o vincular | **Confirmada** | Un solo movimiento real compatible (F101-1), con los datos de su versión (F101-6); fecha efectiva hoy o anterior |
| Prevista | Confirmar o vincular | **Confirmada** | Solo si la fecha efectiva es hoy o anterior (D2, F101-5) |
| Pendiente | Omitir | **Omitida** | No crea nada real |
| Prevista | Omitir, con acción explícita | **Omitida** | Omisión anticipada (D3, F101-8 i) |
| Omitida | Deshacer, paso 1: la recurrencia está finalizada a mano o archivada | — | No disponible: no reactiva la recurrencia y lo cancelado sigue cancelado (D4, F101-8 ii; ADR-016 §6.4) |
| Omitida | Deshacer, paso 2: la fecha fijada de la instancia cae dentro de cualquier intervalo pausado, histórico o vigente (ADR-016 §6.2), tanto si sigue pausada como si se reanudó o terminó sola | — | No disponible: la instancia sigue omitida. Depende del **historial de la ocurrencia**, no del estado actual de la recurrencia (D5; F101-14, F101-18). No hay recuperación manual excepcional en v1 (P4) |
| Omitida | Deshacer, paso 3: en otro caso (recurrencia activa, pausada o terminada sola) | **Pendiente** si sigue en pie la reapertura por D1; si no, **prevista o pendiente** según su fecha fijada | Se quita la omisión y se conservan la fecha y la versión históricas (P7; D3; ADR-016 §6.4). Ejemplo: una instancia del 20 de febrero confirmada por adelantado el 5, cuyo movimiento se anula el 6, que se omite el 7 y se deshace el 8, queda **pendiente**, no prevista. La terminación automática conserva las obligaciones pendientes (D4) |
| Confirmada | Anulación **económica** de su movimiento real (ADR-007; en aportes, ADR-010 y 22.13) | **Pendiente** | Aunque su fecha no haya llegado; conserva fecha prevista y versión (D1, F101-4). Vale también para el reemplazo compartido o el privado restaurado de una sustitución técnica (F101-13). Si la recurrencia ya está archivada o finalizada a mano, se conserva con trazabilidad, sigue visible y se puede resolver sin reactivarla; no recupera las instancias canceladas (P5; F101-8 iii) |
| Confirmada | Sustitución **técnica** auditada (Mover a Pareja y su Deshacer, ADR-001) | Confirmada | Sigue con exactamente un movimiento económico activo (el reemplazo compartido, o el privado restaurado tras Deshacer) y no se puede volver a confirmar; la trazabilidad no es un vínculo ordinario entre contextos y es privada; mecanismo en ADR-016 §8 (F101-3, F101-13). **Excepción contextual (P6):** tras el Deshacer, una instancia **compartida** vinculada de forma ordinaria al reemplazo compartido vuelve a pendiente |
| Prevista | Pausar | No se generan las del periodo pausado | Reanudar no las recupera (Q18) |
| Pendiente | Pausar, terminar sola (desde activa o pausada), o la meta del aporte deja de estar activa | Pendiente | Se conserva y sigue visible; un aporte nuevo no se confirma mientras la meta no esté activa (F101-7, F101-15, F101-16) |
| Prevista o pendiente | Finalizar a mano, o eliminar con historia | **Cancelada** | Solo tras confirmar la lista (Q18; D6 en eliminar, F101-9). En compromisos con N o con fecha final se cancelan todas las futuras; en una recurrencia sin fin, las previstas dejan de generarse (P3) |
| Confirmada, omitida o cancelada | Cualquier edición, pausa o finalización | Sin cambio | Ningún movimiento real cambia |

**Cuestiones que la tabla dejaba a ADR-a: resueltas por ADR-016** (aceptado el 25
de noviembre de 2026, con P1–P7).

- Cómo se representa «pendiente de resolución» cuando su fecha no ha llegado (F101-4) → ADR-016 §5: un vínculo vigente con un movimiento anulado económicamente.
- Si las ocurrencias del periodo pausado existen como canceladas o no existen, y su trazabilidad en compromisos de duración definida (D5) → ADR-016 §6.3: no se materializan; se derivan del calendario y del historial de pausas.
- La identidad estable de una instancia → ADR-016 §3: la regla y la posición, con una posición por periodo; cambiar la unidad, el intervalo o el origen es «Cambiar frecuencia» (P2).
- La regla quincenal de Q7 → ADR-016 §3.3 (P1).
- El mecanismo y el modelo físico de la sustitución técnica de F101-3 y su Deshacer, con su trazabilidad privada (F101-13) → ADR-016 §8: el movimiento efectivo se deriva de la cadena de ADR-001.
- Cómo se representa una omisión deshecha durante una pausa (F101-14) y si las posiciones consumidas se materializan como canceladas (F101-15) → ADR-016 §6.4 y §6.3: la acción no está disponible y la instancia sigue omitida; las consumidas no se materializan.
- Dónde se muestra una instancia pendiente de una recurrencia archivada (F101-8 iii) → ADR-016 §6.6 (P5).
- El algoritmo de búsqueda de movimientos compatibles (F101-1) → ADR-016 §7.6.
- **Obligatoria:** el reemplazo compartido de una sustitución técnica como candidato a un vínculo posterior (F101-19) → ADR-016 §9 (P6, opción C).
- Cómo se guarda el historial de pausas de una ocurrencia, y si existe una recuperación manual excepcional (F101-18) → ADR-016 §6.2 y §6.5: no existe en v1 (P4).
- La concurrencia entre confirmar un aporte y lograr o archivar la meta (F101-7, F101-16) → ADR-016 §10 y §14, en la parte que le toca. El resto, compartido con ADR-d, sigue pendiente.
- Además, ADR-016 §6.4 fija la precedencia de F101-21 y lo que recupera Deshacer una omisión (P7).

**Cuestión para ADR-d o para los fundadores.** Si se puede vincular a una instancia
un aporte histórico válido de una meta que ya no está activa. Crear aportes nuevos
en ella sigue prohibido (F101-16).

### Session 2026-11-25 · ADR-016

ADR-a se escribió como ADR-016 (`docs/adr/ADR-016-recurrencias-e-instancias.md`,
PR #103), se revisó y se aceptó (maestro §15.10, decisión 29.11). Los fundadores
decidieron el 25 de noviembre de 2026 sus siete propuestas (P1–P7) con las opciones
recomendadas y estas precisiones, transmitidas por el gestor. **Prevalecen** sobre
cualquier texto anterior de esta spec que las contradiga, también sobre
«Contexto y opciones de cada pregunta»; las precisiones vigentes y los FR ya están
reconciliados con ellas.

| # | Tema | Decisión de los fundadores (literal) | Dónde se aplica en esta spec |
| --- | --- | --- | --- |
| P1 | Colisión quincenal (Q7) | «Días del 1 al 15 y del 16 al 31. Aprobada.» | Precisión de Q7; FR-009b |
| P2 | Qué se puede editar | «Opción A, edición restringida y flujo atómico e idempotente de Cambiar frecuencia. Aprobada, incluyendo la cancelación explícita de las pendientes que no se trasladan.» Se editan los datos, el día dentro de su periodo, N y la fecha final; cambiar la unidad, el intervalo o el **origen** exige «Cambiar frecuencia» | Precisión de Q6; tabla de estados; FR-004; FR-005; casos límite |
| P3 | Previstas al finalizar a mano o eliminar con historia | «Opción A, cancelación de todas las futuras en compromisos finitos y cese de generación en recurrencias sin fin. Aprobada.» | Precisión de Q18; tabla de estados; FR-007; FR-076; casos límite |
| P4 | Recuperación manual excepcional (F101-18) | «Sin recuperación manual excepcional en v1. Aprobada.» | Tabla de estados; FR-017; F101-8 (iv) |
| P5 | Pendiente de una recurrencia archivada o finalizada (F101-8 iii) | «Las pendientes legítimas que permanezcan o reaparezcan tras el archivo o la finalización siguen visibles y son resolubles sin reactivar la recurrencia. Esto no recupera las instancias canceladas durante la finalización.» | F101-8 (iii); tabla de estados; FR-018 |
| P6 | Reemplazo compartido como candidato a un vínculo (F101-19) | «Opción C, coexistencia. Aceptamos expresamente el riesgo de duplicación semántica entre obligaciones independientes de distintos contextos. Priorizamos la privacidad, la unicidad de los vínculos ordinarios y la integridad del dinero real. Aceptamos también la excepción contextual tras Deshacer Mover a Pareja. No se introduce deduplicación entre contextos ni ningún aviso que revele programaciones privadas.» | F101-19; tabla de estados; FR-014a; FR-018a; Key Entities; casos límite |
| P7 | Qué recupera Deshacer una omisión | «Opción A. Aceptamos que una instancia conserve permanentemente la fecha y la versión fijadas, incluso después de deshacer una omisión y ante ediciones posteriores. Aprobamos expresamente esta excepción a Q6.» | Precisión de Q6; tabla de estados; FR-004; FR-017; Key Entities |

Además: «No ampliar el alcance, no añadir mecanismos nuevos y no iniciar
implementación». **Q15 y la cuestión de la decisión 29.8 siguen abiertas.**

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

Se conservan tal como se plantearon en la etapa Specify, con la recomendación
original del redactor. Las respuestas y sus precisiones están en «Session
2026-11-25 · Clarify»; donde difieren, mandan las respuestas.

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
hipotéticas, no el dataset dorado. Los estados y las transiciones son los de la
tabla «Estados y transiciones» de Clarifications.

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
4. **Given** una recurrencia mensual del día 31 que empieza en enero, **When** Ana mira sus instancias, **Then** ve 31 de enero, 28 (o 29) de febrero y 31 de marzo: el día original se conserva como referencia (Q7).
5. **Given** una recurrencia privada, **When** Ana quiere que pase a Nosotros, **Then** no puede cambiarle el contexto: crea una recurrencia compartida nueva y cierra la anterior (F101-11).

---

### User Story 2 - Confirmar, vincular u omitir una instancia (Priority: P1)

Llega la fecha. Si el importe es fijo y nada cambió, Ana confirma en un toque con
los datos de la versión de la instancia. Si esta vez el importe, la fecha real, el
pagador o el reparto son distintos, abre Anotar antes de guardar. Si ya había
anotado el pago a mano, Juntia le ofrece vincular ese movimiento en lugar de crear
otro. Un mes no hubo cobro: lo marca como omitido.

**Why this priority**: es la frontera previsto–real (A.2) y el mayor riesgo de
integridad (doble registro, análisis §7.1).

**Independent Test**: confirmar dos veces la misma instancia (doble toque, reintento
de red) y comprobar que existe un solo movimiento; con un movimiento compatible ya
anotado, comprobar que se ofrece vincularlo y que vincularlo no crea otro; con uno
incompatible, comprobar que el servidor rechaza el vínculo.

**Acceptance Scenarios**:

1. **Given** una instancia de importe fijo sin movimiento compatible, **When** Ana confirma en un toque, **Then** se crea exactamente un movimiento real con los datos de la versión de la instancia (F101-6), la instancia pasa a confirmada y, para Ana, enlaza con él en Actividad (N-6).
2. **Given** una instancia de importe fijo, **When** Ana elige abrir Anotar antes de guardar y cambia el importe, la fecha efectiva, el pagador o el reparto, **Then** el movimiento real guarda esos datos y la instancia conserva su fecha prevista.
3. **Given** una instancia de importe estimado o en rango, **When** Ana confirma, **Then** se abre Anotar con el borrador rellenado con los datos de su versión y nada se guarda hasta que ella lo guarda.
4. **Given** la misma confirmación enviada dos veces, **When** el servidor la procesa, **Then** sigue habiendo un único movimiento real.
5. **Given** un movimiento real compatible ya anotado (mismo tipo y mismo contexto, tabla «Compatibilidad de vínculos»), **When** Ana va a confirmar, **Then** se le ofrece vincularlo antes de crear otro; si lo acepta, la instancia queda confirmada sin crear ningún movimiento, y ese movimiento no puede vincularse a otra instancia.
6. **Given** que no aparece ninguna sugerencia, **When** Ana busca a mano un movimiento compatible y lo vincula, **Then** el resultado es el mismo que en el escenario 5.
7. **Given** una instancia privada de Ana y un gasto compartido que ella puede ver, **When** intenta vincularlo, **Then** el servidor lo rechaza (privada con compartida); y ninguna sugerencia usa ni revela un movimiento privado de Beto.
8. **Given** una instancia pendiente, **When** Ana la omite, **Then** no se crea nada real y la instancia queda omitida; puede deshacerlo según la precedencia de ADR-016 §6.4 (FR-017).
9. **Given** una instancia confirmada, **When** se anula económicamente su movimiento real (ADR-007), **Then** la instancia vuelve a pendiente de resolución, con su fecha prevista y su versión, aunque esa fecha no haya llegado, con auditoría y sin movimiento económico activo que la cumpla (D1, F101-4; ADR-016 §5 y §7.5).
10. **Given** una instancia de gasto y una meta con reserva previa real, **When** Ana confirma abriendo Anotar, **Then** puede usar el mecanismo existente de Gasto con meta, con sus condiciones (28.10, ADR-010).
11. **Given** una instancia prevista cuya fecha aún no llega, **When** Ana la confirma o la vincula, **Then** solo puede hacerlo con una fecha efectiva de hoy o anterior; un aporte, solo con fecha de hoy o pasada (004, FR-040) (D2, F101-5).
12. **Given** una instancia privada confirmada, **When** Ana mueve su gasto a Pareja (ADR-001), lo deshace si se permite y, más tarde, se anula económicamente el gasto que esté activo, **Then** en cada paso hay exactamente el número de movimientos activos de la tabla de F101-13 (1 privado; 1 compartido; 1 privado restaurado; 0), la instancia sigue confirmada hasta la anulación económica y entonces vuelve a pendiente de resolución; la recurrencia sigue privada, nunca se puede volver a confirmar mientras haya un movimiento activo, y Beto no puede descubrir la recurrencia a través del gasto compartido (F101-3, F101-13).
13. **Given** una instancia prevista, **When** Ana la omite anticipadamente con una acción explícita, **Then** queda omitida sin esperar a su fecha; si después lo deshace, rige la precedencia de ADR-016 §6.4 (FR-017): no está disponible si la recurrencia está finalizada a mano o archivada, ni si su fecha fijada cae dentro de cualquier intervalo pausado, aunque después se reanudara o terminara sola; en otro caso vuelve a pendiente si sigue reabierta por D1 o, si no, a prevista o pendiente según su fecha fijada, con la fecha y la versión históricas (D3, D4; F101-18; P7).

---

### User Story 3 - Calendario de lo previsto (Priority: P1)

Desde Plan, Ana abre el calendario y ve qué viene este mes y el siguiente, qué está
pendiente de confirmar y qué ya se registró. Lo real lo sigue viendo en Actividad.

**Why this priority**: es la vista que da el valor de A.4 y la forma de llegar a
confirmar.

**Independent Test**: con instancias en los cinco estados, el calendario las agrupa
por fecha con su estado, y una confirmada abre su movimiento en Actividad.

**Acceptance Scenarios**:

1. **Given** instancias en varios estados, **When** Ana abre el calendario, **Then** ve cada una con su fecha prevista, nombre, importe (fijo, estimado, rango o desconocido) y estado, y puede confirmar, vincular u omitir las pendientes, y las previstas con las reglas de D2 y D3 (F101-5 y F101-8 i).
2. **Given** la navegación de §15.3, **When** Ana busca el calendario, **Then** está como ruta hija de Plan, sin pestaña ni destino nuevo.
3. **Given** el contexto Nosotros, **When** Beto abre el calendario, **Then** ve solo las recurrencias compartidas, nunca las privadas de Ana ni sus aportes programados, ni por totales ni por huecos.
4. **Given** que los comps aprueban el total mensual de gastos previstos (Q15), **When** Ana lo ve, **Then** su rótulo dice exactamente qué incluye, está separado de ingresos y aportes, no trata un importe desconocido como cero y nunca se presenta como disponibilidad ni capacidad de pago.
5. **Given** un ingreso condicional, **When** Ana lo ve en el calendario, **Then** ve la condición de la que depende (F101-10).

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

1. **Given** una recurrencia compartida, **When** cualquiera de los dos la confirma (Q9), **Then** se crea un gasto compartido con el pagador y el reparto de la versión de la instancia (F101-6), o con los que se indiquen en Anotar antes de guardar, sin liquidación ni transferencia.
2. **Given** una recurrencia privada de Ana, **When** Beto consulta cualquier vista, aviso o exportación, **Then** no aparece ningún rastro de ella, ni de su existencia.
3. **Given** que los dos editan a la vez la misma recurrencia compartida, **When** guardan, **Then** no hay sobrescritura silenciosa (versión, como §15.5).
4. **Given** que los dos confirman a la vez la misma instancia compartida, **When** el servidor procesa las dos, **Then** existe un solo gasto compartido.

---

### User Story 5 - Ingresos recurrentes y variables (Priority: P2)

Ana registra su salario como ingreso habitual con importe fijo, una prima anual
como ingreso extraordinario estimado en un rango y un arriendo que depende de que
el inmueble se arriende, con importe desconocido. Ninguno cuenta como recibido
hasta que lo confirma.

**Why this priority**: A.3 es parte del bloque A, pero el ingreso real ya existe
solo en privado y su uso en el presupuesto es de la spec siguiente.

**Independent Test**: un ingreso previsto no cambia ninguna cifra real; confirmarlo
crea un único ingreso privado con el importe recibido.

**Acceptance Scenarios**:

1. **Given** un ingreso estimado con rango o condicional, **When** Ana lo ve en el calendario, **Then** se muestra con su certeza (y su condición, si la tiene) y nunca como dinero recibido, seguro o disponible.
2. **Given** el contexto Nosotros, **When** Ana intenta crear una recurrencia de ingreso, **Then** no es posible: el ingreso es privado en v1 (28.9).
3. **Given** una instancia de ingreso estimado, condicional o de importe desconocido, **When** Ana confirma, **Then** debe indicar el importe efectivamente recibido y se crea un único ingreso privado.
4. **Given** una instancia de ingreso de **certeza fija**, **When** Ana confirma explícitamente el importe mostrado, **Then** eso basta como importe recibido; si recibió otro, lo cambia en Anotar.
5. **Given** un ingreso de importe desconocido, **When** aparece en cualquier vista, **Then** se muestra como desconocido, nunca como $0 (F101-10).
6. **Given** una instancia de ingreso **condicional** cuyo importe previsto es conocido, **When** Ana confirma, **Then** no hay recorrido de un toque: se abre el borrador de Anotar y se pide el importe efectivamente recibido (F101-17).

---

### User Story 6 - Aportes programados a una meta (Priority: P2)

Ana programa un aporte mensual a una meta. Cada mes ve la instancia prevista y, al
confirmarla, se registra su aporte real en el ledger de la meta.

**Why this priority**: fila 7 del backlog (28.6); reutiliza el núcleo.

**Independent Test**: confirmar un aporte programado crea un solo aporte real de la
propia persona y cambia `aporte_a_metas` de DEC-G04 igual que un aporte manual.

**Acceptance Scenarios**:

1. **Given** un aporte programado previsto, **When** no se ha confirmado, **Then** la meta, «Tu disponible» y DEC-G04 no cambian, y el aporte previsto nunca se presenta como fondos reservados.
2. **Given** una meta compartida, **When** Ana programa y confirma un aporte, **Then** solo aporta sus propios fondos (ADR-010), y para Beto ese aporte es indistinguible de un aporte manual equivalente: sin insignia, identificador, frecuencia ni procedencia, en vistas, exportación, errores o metadatos; Beto tampoco puede saber que la programación existe (F101-2).
3. **Given** una obligación pagada a un tercero (p. ej., una cuota), **When** Ana configura su recurrencia, **Then** es una recurrencia de gasto, nunca de aporte a meta (28.10).
4. **Given** un aporte programado activo, **When** la meta pasa formalmente a lograda («Dar por lograda») o a archivada, **Then** la recurrencia se pausa; llegar al 100 % no basta (D7, F101-7).
5. **Given** instancias pendientes de una meta que ya no está activa, **When** Ana intenta confirmar un aporte nuevo desde ellas o reanudar la recurrencia, **Then** no puede: las instancias se conservan, pero no se confirma ningún aporte nuevo ni se reanuda hacia una meta que no está activa.
6. **Given** un aporte programado y un cambio de estado de la meta casi simultáneos, **When** el servidor los procesa en un orden efectivo, **Then** (F101-16):
   - si el aporte se confirma antes de que la meta se dé por lograda, el aporte es válido y se conserva, la meta queda lograda y la recurrencia en pausa;
   - si la meta se da por lograda antes de confirmar, la confirmación se rechaza y la instancia queda pendiente;
   - si el aporte deja saldo y después se intenta archivar la meta, rigen los requisitos que ya existen para archivar (22.15; 004).

   Ningún aporte registrado legítimamente antes del cambio de estado se pierde, y nunca se crea un aporte nuevo en una meta que no lo admite (004, FR-040).

---

### User Story 7 - Compromisos de duración definida (Priority: P2)

Ana registra una cuota mensual con un número fijo de ocurrencias. Ve en qué
ocurrencia va y, tras la última, la recurrencia deja de generar instancias.

**Why this priority**: A.5; es una extensión pequeña de A.1.

**Independent Test**: con N posiciones programadas y sin pausas, se generan exactamente N instancias; con una pausa, se generan menos, porque las posiciones del periodo pausado se consumen sin generarse, y N no cambia. Tras la
última, la recurrencia termina sola y las instancias anteriores sin resolver siguen
pendientes.

**Acceptance Scenarios**:

1. **Given** una recurrencia de N ocurrencias, **When** Ana la consulta, **Then** ve «cuota n de N» (o el texto que se apruebe, Q2), donde n es el número de la ocurrencia programada y no el de cuotas pagadas, y la fecha de la última. Si el compromiso solo tiene fecha final, no se inventa N.
2. **Given** que llega la fecha de la última ocurrencia con otras anteriores aún pendientes, **When** la recurrencia termina sola, **Then** no genera más instancias y las pendientes anteriores siguen pendientes, visibles y confirmables.
3. **Given** una recurrencia terminada sola, **When** Ana la consulta, **Then** se distingue de una finalizada a mano y nada la presenta como prueba de que una deuda está pagada.
4. **Given** un compromiso de N ocurrencias, **When** Ana va a pausarlo, **Then** antes de confirmar se le explica el efecto sobre las próximas ocurrencias y la fecha final; al pausar y reanudar, las ocurrencias del periodo pausado se consumen sin generarse, la fecha final no se extiende, N no cambia, reanudar no las recupera y nada las presenta como cuotas pagadas (D5, F101-8 iv).
5. **Given** un compromiso pausado, **When** se agotan sus posiciones o llega su fecha final durante la pausa, **Then** la recurrencia pasa a finalizada · sola, ya no se puede reanudar y las pendientes anteriores siguen visibles y confirmables (F101-15).

---

### User Story 8 - Avisos dentro de la app (Priority: P2)

Al abrir Juntia, Ana ve que tiene instancias por confirmar y llega a ellas en un
toque. No recibe ni push ni correo.

**Why this priority**: sin aviso, lo pendiente se olvida; pero es secundario al
núcleo.

**Independent Test**: con instancias pendientes, el aviso aparece en la ruta de
Recurrentes y en Inicio (Q16); sin pendientes, no aparece; nunca revela nada privado
de la otra persona.

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

1. **Given** un preset, **When** Ana lo elige en Anotar, **Then** el borrador se rellena con sus campos y nada se guarda hasta que ella guarda.
2. **Given** presets guardados, **When** Ana abre el calendario, **Then** no aparece ninguno.
3. **Given** el gasto habitual sin preset, **When** Ana anota, **Then** el recorrido no se alarga (US-12).
4. **Given** un gasto compartido con uso de meta, liquidación relacionada o vínculo con una instancia, **When** Ana crea un preset desde él, **Then** el preset copia solo los campos autorizados de la plantilla y nunca esos vínculos, identificadores, usos de meta ni datos de la instancia.
5. **Given** un preset nuevo, **When** Ana lo crea, **Then** es privado salvo que ella lo comparta con una acción explícita.

### Edge Cases

- Confirmar dos veces, o desde los dos teléfonos de la pareja a la vez, la misma instancia compartida: un solo movimiento real.
- Vincular un movimiento ya vinculado, anulado o incompatible (otro tipo, otro contexto, otra meta u otro aportante): el servidor lo rechaza (F101-1).
- La sugerencia de vínculo nunca usa ni muestra movimientos privados de la otra persona.
- Anular económicamente el movimiento de una instancia confirmada: vuelve a pendiente de resolución, aunque su fecha no haya llegado (D1, F101-4).
- Mover a Pareja, o deshacerlo, un gasto vinculado a una instancia privada: una sola operación económica activa, la instancia no vuelve a confirmarse y el vínculo no pasa a otro contexto (F101-3).
- Confirmar antes de la fecha prevista: solo con fecha efectiva de hoy o anterior; la fecha prevista no cambia (D2, F101-5).
- La regla cambia después de generarse una instancia: confirmar usa los datos de la versión de la instancia (F101-6).
- Editar la regla con instancias en todos los estados: solo cambian las previstas (Q6); las pendientes vencidas conservan su versión, y una instancia con fecha y versión fijadas por una omisión, deshecha o no, tampoco cambia (excepción aprobada, P7).
- Editar el día dentro de su periodo: ninguna fecha genera dos instancias (ADR-016 §3.4). Cambiar la unidad, el intervalo o el origen no es una edición: es «Cambiar frecuencia», que finaliza la regla anterior y crea otra, y cancela de forma explícita las pendientes que no se trasladan (P2; FR-005).
- Vincular el reemplazo compartido de una sustitución técnica a una recurrencia compartida: se permite y coexiste con la trazabilidad privada, sin deduplicación entre contextos ni avisos que revelen programaciones privadas (P6; FR-014a).
- Recurrencia mensual del día 31 y del 29 de febrero; quincenal en meses de 28 a 31 días (Q7).
- Recurrencia con fecha inicial en el pasado: no crea movimientos reales retroactivos; las fechas pasadas quedan pendientes y la persona las confirma, vincula u omite.
- Pausar y reanudar: las ocurrencias del periodo pausado no se generan y reanudar no las recupera; las pendientes anteriores a la pausa siguen. En un compromiso de duración definida, las ocurrencias del periodo pausado se consumen: cuentan para N, la fecha final no se extiende y no son cuotas pagadas; antes de pausar se explica el efecto (D5).
- Terminación automática con pendientes anteriores: siguen pendientes (Q13).
- Finalización manual con pendientes: se informa cuáles se cancelan y se pide confirmación (Q18); en compromisos con N o con fecha final, también todas las futuras (P3). Después, deshacer una omisión no está disponible ni reactiva la recurrencia (D4); con una recurrencia terminada sola, sí (D3, D4), siempre sujeto al historial de pausas (ADR-016 §6.4, paso 2).
- Eliminar con historia: se archiva y se cancelan las instancias sin resolver, con la misma lista y confirmación (D6, F101-9).
- Anular un movimiento después de archivar la recurrencia: la instancia pendiente se conserva con trazabilidad (F101-8 iii).
- Meta dada por lograda o archivada con un aporte programado activo: se pausa, sin reanudación automática ni hacia una meta inactiva; llegar al 100 % no basta (D7, F101-7).
- Confirmar un aporte mientras la otra persona logra o archiva la meta: se revalida en la misma operación (F101-7).
- Cambiar de contexto una recurrencia: no se puede; se crea otra (F101-11).
- Categoría de una recurrencia que deja de existir o se renombra.
- Salida de la pareja: sigue bloqueada por ADR-003; esta spec no la implementa (FR-077).
- Borrado de cuenta y exportación con reglas, instancias y sus estados, vínculos autorizados y presets (Q18), sin revelar programaciones privadas a la otra persona (F101-2).
- Importe estimado o en rango al confirmar un gasto: se abre Anotar; en un ingreso estimado, condicional o de importe desconocido se exige el importe recibido.
- Total de previstos con instancias de importe desconocido o en rango: nunca se cuentan como cero (Q15).
- Nosotros sin recurrencias compartidas: «no hay ninguna registrada», nunca $0.
- Cambio de mes y de zona horaria: fechas en `America/Bogota` (§5.2).

## Requirements *(mandatory)*

### Functional Requirements

Las decisiones D1 a D7 de la revisión F101 están confirmadas por los fundadores
(25 de noviembre de 2026); cada FR afectado cita la suya.

#### Recurrencias (A.1, A.5; fila 3)

- **FR-001**: Una persona puede crear una recurrencia de **gasto**, **ingreso** o **aporte a meta** con nombre, tipo, importe (fijo, estimado con rango o, en ingresos condicionales, desconocido; Q10, F101-10), categoría cuando corresponda, fecha inicial, fecha final o número de ocurrencias opcionales (Q13), frecuencia (Q7), contexto, responsable y reparto cuando corresponda (Q8).
- **FR-002**: Cada recurrencia tiene estado **activa**, **pausada**, **finalizada** (sola o a mano) o **archivada** (eliminada con historia), según la tabla «Estados y transiciones». Muestra su próxima fecha esperada.
- **FR-003**: Una recurrencia de gasto es privada **o** de la pareja, nunca las dos (Q8), y **su contexto no cambia nunca**: para cambiarlo se crea una recurrencia nueva y se cierra la anterior (F101-11). Las de ingreso solo existen en Yo (28.9; §7.3). Las de aporte a meta son siempre privadas de quien aporta, también cuando la meta es compartida (Q12).
- **FR-004**: Editar una recurrencia cambia solo sus instancias previstas (futuras sin resolver). Todas las instancias pendientes de resolución, vencidas o no (D1), conservan los datos y la versión de la regla que les correspondían; las confirmadas, omitidas y canceladas no cambian (Q6). Editar nunca cambia el contexto (FR-003). Hay versión y no hay sobrescritura silenciosa. Lo editable es lo que fija ADR-016 §3.4 (P2): los datos, el día dentro de su periodo, N y la fecha final; la unidad, el intervalo y el origen no se editan (FR-005). **Excepción a Q6 aprobada por los fundadores (P7):** una instancia con fecha y versión fijadas por una omisión, también si la omisión se deshizo, no cambia con ninguna edición posterior.
- **FR-005**: Una edición del día nunca genera dos instancias para la misma ocurrencia: la identidad es la regla y la posición, con una posición por periodo (ADR-016 §3.1 y §3.4; Q6). Cambiar la unidad, el intervalo o el origen no es una edición: es el flujo «Cambiar frecuencia», con el contrato completo de ADR-016 §3.4 (P2): atómico e idempotente; la regla anterior se finaliza a mano si tiene historia o se elimina si no la tiene; las pendientes de la anterior no se trasladan y se cancelan de forma explícita, en la lista que se confirma; lo que la anterior conserva se muestra junto al calendario nuevo, sin deduplicación; el origen de la nueva respeta el límite entre frecuencias; en un compromiso con N, si N′ ≤ 0 no se crea ninguna regla salvo que se amplíe de forma explícita; y en un aporte exige la meta activa y no sirve para saltarse una pausa por meta inactiva.
- **FR-006**: Pausar, reanudar, finalizar, terminar sola y eliminar siguen la tabla «Estados y transiciones»; ninguna de esas acciones modifica ni borra un movimiento real ni un vínculo histórico autorizado.
- **FR-007**: Finalizar a mano muestra qué instancias sin resolver se cancelarán y pide confirmación (Q18). En compromisos con N o con fecha final se cancelan todas las futuras; en una recurrencia sin fin, las previstas dejan de generarse sin cancelarse (P3).
- **FR-008**: Una obligación pagada a un tercero se configura como recurrencia de gasto, nunca de aporte a meta (28.10).

#### Fechas (Q7)

- **FR-009**: Las frecuencias son semanal, quincenal, mensual, trimestral, semestral, anual, personalizada («cada N días, semanas o meses») y una sola fecha (Q11). Las fechas se calculan en `America/Bogota`, sin días hábiles ni festivos.
- **FR-009a**: Una fecha mensual (y trimestral, semestral o anual) que no existe en un mes cae en el último día de ese mes, y el **día de referencia** original se conserva para los meses siguientes (31 de enero → 28 o 29 de febrero → 31 de marzo).
- **FR-009b**: Los dos días de una quincenal nunca generan dos instancias en la misma fecha; al crearla, y también al editar los días, el primer día va del 1 al 15 y el segundo del 16 al 31, donde 31 es «último día» (P1; ADR-016 §3.3 y §3.4).

#### Lo previsto frente a lo real (A.2; ADR-a, ADR-b)

- **FR-010**: Una recurrencia genera instancias con los estados de Q5; su forma la fija ADR-016 (Q3): se calcula, y solo se guardan sus hechos, sin poner nada previsto en `transactions`.
- **FR-011**: Ninguna instancia prevista crea, modifica ni se cuenta como un movimiento real. Ninguna métrica de §5.1, ningún presupuesto (DEC-R01, ADR-004), Balance, Análisis ni DEC-G04 incluye nada previsto.
- **FR-012**: Confirmar una instancia de **importe fijo** se hace en un toque con los **datos de la versión de la instancia**, y antes de guardar se puede abrir Anotar para cambiar el importe, la fecha efectiva, el pagador o el reparto. En **ingresos**, el toque único exige **certeza fija**: no basta con que el importe sea conocido. Confirmar una instancia de **importe estimado, en rango o desconocido**, o un ingreso **condicional** aunque su importe sea conocido, abre Anotar con el borrador rellenado con los datos de su versión (Q4 (c); F101-6; F101-17).
- **FR-012a**: Los datos de la versión de la instancia (importe, categoría, pagador y reparto) son los de la versión que corresponde a su posición según ADR-016 §4 o, si tuvo un hecho, los de la versión histórica fijada desde su primer hecho; no los de la regla actual. Calcular una instancia no la materializa (ADR-016 §2; F101-6).
- **FR-012b**: Una instancia prevista solo se confirma o se vincula con una fecha efectiva de hoy o anterior; los aportes, con la regla de la 004 (FR-040: hoy o pasado). La regla general de fechas futuras de los movimientos anotados a mano no cambia (16.13; 002, Q13) (D2, F101-5).
- **FR-013**: Confirmar crea **exactamente un** movimiento real del tipo de la recurrencia, de forma idempotente (ADR-013), y lo vincula 1:1 con la instancia.
- **FR-014**: Antes de crear un movimiento, si existe uno real **compatible** (tabla «Compatibilidad de vínculos»), se ofrece vincularlo. La persona también puede buscar uno compatible a mano. Vincular no crea ningún movimiento; un movimiento real se vincula a una sola instancia y una instancia a uno solo (Q4 (b)). La trazabilidad privada de una sustitución técnica no es un vínculo y no cuenta para esta cardinalidad (FR-018a; F101-19).
- **FR-014a**: Solo es compatible un movimiento del mismo tipo y del mismo contexto (privado con privado del mismo dueño; compartido con compartido del mismo grupo) y, en aportes, de la misma meta y el mismo aportante. Categoría, fecha e importe solo sirven para sugerir. La autorización y la compatibilidad se validan en el servidor; el algoritmo de búsqueda lo fija ADR-016 §7.6 (F101-1). Cuando el reemplazo compartido de una sustitución técnica es candidato a un vínculo posterior (p. ej., Beto lo vincula a una recurrencia compartida compatible), **se permite y coexiste** (P6, opción C; ADR-016 §9): se valida como cualquier otro vínculo, sin que la trazabilidad privada de Ana intervenga en la validación, las sugerencias ni los errores. Un movimiento cumple como mucho una instancia por contexto. Los fundadores aceptan expresamente el riesgo de duplicación semántica entre obligaciones independientes de distintos contextos; no hay deduplicación entre contextos ni ningún aviso que revele programaciones privadas (F101-19).
- **FR-015**: Nunca se vincula automáticamente, y las sugerencias nunca usan información privada de la otra persona.
- **FR-016**: La instancia guarda su **fecha prevista**; el movimiento real, su **fecha efectiva**. Son datos distintos y ninguno sobrescribe al otro.
- **FR-017**: Omitir una instancia pendiente no crea nada real. Una instancia prevista también se puede omitir anticipadamente con una acción explícita (D3). Deshacer sigue la precedencia de ADR-016 §6.4: (1) si la recurrencia está finalizada a mano o archivada, no se puede deshacer (D4); (2) si la fecha fijada de la instancia cae dentro de cualquier intervalo pausado, histórico o vigente (intervalo de ADR-016 §6.2: una fecha d cae en una pausa si el inicio de la pausa < d y, si la pausa terminó, d < el día de la reanudación), no se puede deshacer y la instancia sigue omitida (D5; F101-14, F101-18); (3) en otro caso se quita la omisión: si sigue en pie la reapertura por D1, vuelve a **pendiente**; si no, queda prevista o pendiente según su fecha fijada (D3). En todos los casos conserva la fecha y la versión históricas (P7). Una ocurrencia cuya fecha **cayó en un periodo pausado no se reintroduce al deshacer**, aunque la recurrencia ya esté reanudada o haya terminado sola: depende del historial de la ocurrencia, no del estado actual de la recurrencia (D5; F101-18). No hay recuperación manual excepcional en v1 (P4); el historial de pausas lo fija ADR-016 §6.2. Omitir no equivale a conservar una obligación pendiente (D5).
- **FR-018**: Si se **anula económicamente** el movimiento real de una instancia confirmada (ADR-007; en aportes, ADR-010 y la 22.13), la instancia vuelve a **pendiente de resolución**, con su fecha prevista y su versión histórica, aunque esa fecha no haya llegado, con auditoría. Vale también cuando el movimiento anulado es el reemplazo compartido de una sustitución técnica, o el privado restaurado por su Deshacer (F101-13). Si la recurrencia ya está archivada, la instancia se conserva con trazabilidad (D1, F101-4; F101-8 iii). Esa pendiente, y cualquier pendiente legítima que permanezca tras el archivo o la finalización, sigue visible y se puede resolver sin reactivar la recurrencia; esto no recupera las instancias canceladas en la finalización (P5).
- **FR-018a**: Una anulación **técnica** que forma parte de una sustitución auditada (Mover a Pareja y su Deshacer, ADR-001) no devuelve la instancia a pendiente. Resultados funcionales de la cadena (F101-13): tras la confirmación inicial, 1 movimiento privado activo y la instancia confirmada; tras Mover a Pareja, 1 compartido y confirmada; tras Deshacer, cuando se permite, 1 privado restaurado y confirmada; tras la anulación económica del movimiento activo, 0 y pendiente de resolución (FR-018). La trazabilidad de la sustitución **no es un vínculo ordinario** entre contextos incompatibles (F101-1) y es **privada**: la otra persona no puede descubrir la recurrencia a través del gasto compartido (F101-2). Invariantes: una sola operación económica activa por instancia; la recurrencia original sigue privada; vínculos y sustituciones auditados; ADR-001, ADR-010 y ADR-015 se respetan y no cambian; ninguna función de MVP-1 ni de Planes se bloquea. Esa trazabilidad **no es un vínculo ordinario ni cuenta como tal** (Key Entities). Si el reemplazo compartido es candidato a un vínculo posterior, se permite y coexiste (P6; FR-014a). **Excepción contextual aprobada (P6):** tras el Deshacer, una instancia **compartida** vinculada de forma ordinaria al reemplazo compartido vuelve a pendiente, porque para su contexto el gasto salió; la instancia privada sigue confirmada como dice este requisito. El mecanismo y el modelo físico los fija ADR-016 §8 y §9 (F101-3, F101-19).
- **FR-019**: El movimiento real creado o vinculado se ve en Actividad como cualquier otro. El enlace a su instancia solo existe para quien tiene autorización sobre ella (N-6; F101-2). Confirmar una instancia de gasto conserva el mecanismo de Gasto con meta cuando hay una reserva previa real (28.10, ADR-010).

#### Ingresos variables (A.3)

- **FR-020**: Un ingreso previsto lleva un tipo (habitual o extraordinario), una certeza (fijo, estimado con rango mínimo–máximo o condicional) y, si es condicional, el texto de la **condición** de la que depende; su importe puede ser **conocido, estimado o desconocido** (Q10; F101-10). No hay motor de condiciones: el formato lo deciden el ADR y el diseño.
- **FR-021**: Al confirmar un ingreso estimado, condicional (aunque su importe previsto sea conocido) o de importe desconocido se abre el borrador y se exige el importe efectivamente recibido; solo en un ingreso de **certeza fija** basta la confirmación explícita del importe mostrado (Q4; F101-17).
- **FR-022**: Un ingreso previsto nunca se presenta como recibido, disponible ni seguro, un importe desconocido nunca se muestra como cero, y nada alimenta un «te alcanza» (DEC-R17).
- **FR-023**: Se admite un movimiento previsto de una sola fecha (Q11).

#### Aportes programados (fila 7; ADR-d)

- **FR-030**: Una recurrencia de aporte a meta pertenece a quien aporta y solo confirma aportes de sus propios fondos (ADR-010; Q12).
- **FR-031**: Confirmar un aporte programado crea un aporte real en el ledger de la meta, idéntico en efecto a un aporte manual (DEC-G04), y nunca una fila en `transactions` (§7.3).
- **FR-032**: Un aporte programado previsto no cambia la meta, «Tu disponible» ni ninguna cifra de DEC-G04, y nunca se presenta como fondos reservados.
- **FR-033**: La programación es privada, también en una meta compartida. Para la otra persona, un aporte confirmado desde una programación es **indistinguible** de un aporte manual equivalente: sin insignia, identificador, frecuencia ni procedencia, en vistas, exportación, errores o metadatos. Se protege también la **existencia** de la programación (F101-2).
- **FR-034**: La recurrencia se pausa cuando la meta pasa **formalmente** a lograda («Dar por lograda», 22.15) o a archivada; llegar al 100 % no basta. Solo su propietaria la reanuda, con una acción explícita y solo hacia una meta activa (D7, F101-7).
- **FR-034a**: Mientras la meta no esté activa, sus instancias se conservan pero **no se confirma ningún aporte nuevo** (004, FR-040). Si se puede **vincular** a una instancia un aporte histórico válido, registrado cuando la meta estaba activa, no lo decide esta spec: es una cuestión explícita para ADR-d o para los fundadores, y la prohibición de crear aportes nuevos se mantiene. El estado de la meta y la autorización se revalidan en la misma operación que registra el aporte; según el orden efectivo, un aporte confirmado antes del cambio de estado es válido y se conserva, y uno posterior se rechaza y deja la instancia pendiente (US6.6; 22.15). ADR-010 y los estados de Metas no cambian (F101-7, F101-16).

#### Compromisos de duración definida (A.5; Q13)

- **FR-035**: N cuenta las **posiciones programadas**, no las cuotas pagadas ni las instancias que realmente se generan: con pausas se generan menos de N (D5); «cuota n de N» numera posiciones.
- **FR-036**: La terminación automática deja de generar instancias y no cancela ni oculta las pendientes anteriores. Ocurre desde activa o desde **pausada**, cuando se agotan las posiciones o se llega a la fecha final; una recurrencia que ya agotó sus posiciones no se puede reanudar (F101-15). Las posiciones consumidas no se materializan (ADR-016 §6.3).
- **FR-037**: Una recurrencia terminada nunca se presenta como prueba de que una deuda está pagada. Sin amortización ni saldos de deuda.
- **FR-038**: Pausar un compromiso de N ocurrencias consume las posiciones del calendario original: las ocurrencias del periodo pausado no se generan pero cuentan para N, la fecha final no se extiende, reanudar no las recupera automáticamente y solo se puede si quedan posiciones y no ha llegado la fecha final (F101-15) y la pausa nunca cambia en silencio N. Una ocurrencia consumida durante una pausa no equivale a una cuota pagada (D5, F101-8 iv).
- **FR-038a**: Antes de pausar un compromiso de duración definida se explica el efecto sobre las próximas ocurrencias y su fecha final, y se pide confirmación. Si una obligación sigue existiendo y aún no se ha pagado, se conserva como pendiente cuando corresponda: ni pausar ni omitir la conservan. ADR-016 §6 resuelve la representación y la trazabilidad, sin amortización ni gestión de deuda (D5).

#### Calendario (A.4; 28.8; N-6)

- **FR-040**: El calendario de lo previsto es una ruta hija de Plan, sin destino de navegación nuevo (§15.3; 22.5).
- **FR-041**: En móvil es una lista agrupada por fecha con flechas de mes, sin cuadrícula; escritorio se decide con los comps (Q14). Muestra por defecto el mes actual y el siguiente.
- **FR-042**: Cada instancia muestra fecha prevista, nombre, importe (fijo, estimado, rango o desconocido), estado, la condición en ingresos condicionales y, **solo cuando el compromiso tiene un total de ocurrencias**, «cuota n de N». Si solo tiene fecha final, no se inventa N.
- **FR-043**: Desde el calendario se confirma, vincula u omite una instancia pendiente; una prevista, solo con las reglas de FR-012b y FR-017.
- **FR-044**: El calendario no muestra movimientos reales sin instancia: lo real vive en Actividad (16.8).

#### Total de lo previsto (Q15; ADR-b)

- **FR-045**: Se **explora en los comps** un total mensual de **gastos previstos**, separado de ingresos y aportes programados, con un rótulo que diga exactamente qué incluye. Si no se puede comunicar con claridad sin ampliar el alcance, no hay totales (Q15 (a)).
- **FR-046**: Si existe, ese total: nunca se mezcla con métricas de movimientos reales; nunca suma ingresos, gastos y aportes en una cifra neta; no presenta como seguros los ingresos condicionales; no trata importes desconocidos como cero; si solo cuenta importes fijos pendientes, lo dice; en Nosotros usa solo lo compartido autorizado y la ausencia no es cero.
- **FR-047**: El total de lo previsto **no es liquidez ni disponibilidad**: nunca se calculan a partir de él excedentes, disponible, capacidad de pago ni previsto frente a real (DEC-R17; decisión 28, «Lo que no cambia»). El tratamiento de estimados, rangos, estados y privacidad lo fija ADR-b.

#### Avisos (28.8)

- **FR-050**: Los avisos de instancias por confirmar son solo dentro de la app: una entrada «Por confirmar» con su número en la ruta de Recurrentes y un módulo en Inicio cuando hay pendientes, sin culpa y descartable (Q16). Sin push ni correo.
- **FR-051**: Un aviso nunca cuenta ni revela instancias privadas de la otra persona.

#### Privacidad (28.11; §2.3.6; §7.4)

- **FR-060**: Todo es privado por defecto; nada se comparte sin una acción explícita.
- **FR-061**: Ninguna vista, aviso, sugerencia de vínculo, agregado, error, metadato o exportación de la otra persona revela recurrencias, instancias, aportes programados o presets privados, ni su existencia (F101-2).
- **FR-062**: Sin «total del hogar». En Nosotros, la ausencia de recurrencias compartidas se dice como ausencia, no como cero.

#### Presets de captura (fila 4; 28.6; Q17)

- **FR-070**: Un preset es una plantilla para Anotar: rellena el borrador y nunca guarda un movimiento por sí solo. No genera obligaciones, instancias previstas ni compromisos de presupuesto.
- **FR-071**: Guardar un movimiento desde un preset produce el mismo movimiento real que anotarlo a mano.
- **FR-072**: Los presets no aparecen en el calendario, en los avisos ni en el total de lo previsto.
- **FR-073**: Un preset guarda tipo, contexto, categoría, importe opcional, reparto, pagador y nota. Se crea a mano o desde un movimiento existente; en ese caso copia solo esos campos y nunca vínculos financieros, identificadores de liquidación, usos de metas ni datos de una instancia recurrente.
- **FR-074**: Un preset es privado por defecto y solo queda compartido por una acción explícita de su autor.
- **FR-075**: Los presets van en un PR propio (Q1) y nunca bloquean el núcleo de recurrencias. Hay un tope **bajo** de presets; su valor lo fija el Plan.

#### Ciclo de vida, exportación y borrado (Q18)

- **FR-076**: Eliminar una recurrencia sin historia la borra. Con historia, la **archiva** y cancela sus instancias sin resolver, con la misma lista y confirmación que la finalización manual (FR-007), y la misma regla de P3 para las futuras. Los movimientos reales y sus vínculos históricos autorizados se conservan (D6, F101-9).
- **FR-077**: La salida y la expulsión de la pareja siguen **bloqueadas** por ADR-003 hasta que exista su ADR; esta spec no las implementa. Cuando existan, las recurrencias y los presets compartidos seguirán lo que ese ADR fije para los datos del grupo.
- **FR-078**: La exportación (§15.5) y el borrado manual de cuenta (005) incluyen reglas, instancias con sus estados, sus vínculos autorizados y presets, con la nota del contrato de borrado por cada tabla nueva, y nunca revelan a la otra persona una programación privada (F101-2).

#### Copy, accesibilidad, responsive y motion

- **FR-080**: Todo el copy nuevo en `src/lib/copy/es.ts` (CONVENTIONS B.1), con las palabras prohibidas de GLOSSARY §9 y BRAND §4; los nombres nuevos se deciden con los comps y entran en GLOSSARY solo aprobados (Q2).
- **FR-081**: Diseño a 390 y 1440 px, sin estirar el móvil; estados vacío, carga, error, sin recurrencias, todo confirmado, muchos pendientes, nombres largos, importes en rango o desconocidos y condiciones largas; WCAG AA; texto al 200 %; movimiento reducido; iconos Phosphor con `AppIcon`.
- **FR-082**: Las pantallas salen de un prompt de diseño de esta spec y sus `[P]` se aprueban viendo la pantalla (como la 006), incluido el total de Q15.

#### Pruebas y CI (ADR-011; 28.13)

- **FR-090**: Dominio: generación de fechas para cada frecuencia, el día de referencia y la quincenal (Q7), todas las transiciones de la tabla de estados, ocurrencias de Q13 (también con pausa), la versión de la instancia al confirmar (F101-6), la tabla de compatibilidad (F101-1) y la invariancia de §5.1, presupuestos y DEC-G04 con y sin recurrencias.
- **FR-091**: Integración de servidor: confirmación idempotente, vínculo 1:1, rechazo de vínculos incompatibles, anulación económica frente a sustitución técnica, incluida la cadena completa de F101-13 (confirmar, Mover a Pareja, Deshacer y anulación económica del movimiento activo), confirmación concurrente desde dos cuentas de la pareja, los tres órdenes efectivos entre confirmar un aporte y lograr o archivar la meta (US6.6), y edición sin duplicados (FR-005).
- **FR-092**: pgTAP con tres cuentas: RLS de recurrencias, instancias y presets; privado XOR compartido; ingreso solo privado; aportes programados privados, sin revelar su existencia ni su procedencia en un aporte confirmado (F101-2); el enlace de Actividad a la instancia solo para quien tiene autorización; sugerencias sin datos privados ajenos.
- **FR-093**: Ninguna spec E2E nueva si el tope está agotado; si hay hueco, una para confirmar una instancia de punta a punta. El Plan confirma el recuento **sin aumentar el tope** (Q19; 28.13).

#### Fuera de alcance (explícito)

- Saldos de cuentas, disponibilidad o liquidez (Cuentas, activos y patrimonio; Flujo y liquidez; DEC-R17).
- Amortización, intereses, saldos de deuda y desglose de cuotas de crédito (Créditos y deudas; 28.14).
- Proyecciones, escenarios y el uso de la terminación de un compromiso en ellas (Proyecciones y escenarios; 28.12).
- Presupuesto integral, distribución del ingreso previsto, excedentes y previsto frente a real (Presupuesto integral v1; Flujo y liquidez).
- Integraciones bancarias, débitos automáticos, ejecución de pagos y conciliación bancaria automática (propuesta A).
- Ingreso compartido (28.9; ADR-j).
- Motor de condiciones para ingresos condicionales (F101-10).
- Salida y expulsión de la pareja (ADR-003; FR-077).
- Avisos push o por correo (28.8).
- Estadísticas y DEC-R01-S (28.6).
- Grupos de más de dos (28.4).
- Multimoneda (§3).

### Key Entities *(conceptuales; la forma la fijan ADR-016 (ADR-a), ADR-d y el Plan)*

- **Recurrencia**: regla de un movimiento esperado. Propietaria XOR pareja, **inmutable en su contexto** (los aportes, siempre propietaria), tipo (gasto, ingreso, aporte a meta), nombre, importe (fijo, estimado con rango o desconocido), tipo, certeza y condición en ingresos, categoría, meta (aportes), frecuencia con su **día de referencia**, fecha inicial, fecha final o número de ocurrencias, responsable, reparto, estado (activa, pausada, finalizada sola o a mano, archivada), versiones y auditoría.
- **Instancia prevista**: una ocurrencia de la recurrencia, con identidad estable (la regla y la posición, ADR-016), **fecha prevista** (fijada para siempre desde su primer hecho, P7), número de ocurrencia, la **versión** de la regla que le corresponde (cuyos datos usa al confirmar, F101-6) y su estado (Q5 y tabla de estados). Nunca es un movimiento real (Q3).
- **Vínculo instancia–movimiento real (ordinario)**: relación idempotente y auditada entre una instancia y un gasto, ingreso o aporte real, sujeta a la compatibilidad (F101-1). El vínculo **vigente** y el **estado del movimiento** son cosas distintas (ADR-016 §5 y §7.5): con el movimiento efectivo activo, la instancia está confirmada; con el movimiento anulado económicamente, el vínculo sigue vigente y la instancia está pendiente de resolución (D1). Una nueva confirmación o vinculación sustituye el vínculo anterior y conserva la historia autorizada. Cardinalidad: un movimiento tiene como mucho **un vínculo ordinario en toda su historia**, y una instancia, como mucho **un vínculo vigente**. La fecha efectiva se lee del movimiento. Solo es visible para quien tiene autorización sobre la instancia (F101-2).
- **Trazabilidad privada de una sustitución técnica**: registro auditado de que, tras Mover a Pareja o su Deshacer, el movimiento activo de una instancia confirmada es el reemplazo (compartido o privado restaurado). **No es un vínculo ordinario ni cuenta como tal**: no está sujeta a la compatibilidad ni a la cardinalidad 1:1 del vínculo, es privada de quien tiene autorización sobre la instancia y la otra persona no puede descubrir con ella la recurrencia (F101-3, F101-13, F101-19). Si el reemplazo es candidato a un vínculo ordinario posterior, se permite y coexiste (P6; FR-014a). El modelo físico de las dos lo fija ADR-016 §7.5 y §8.
- **Preset de captura**: plantilla de Anotar, privada por defecto o de la pareja por acción explícita, con los campos de FR-073. Concepto distinto de la recurrencia; si comparten entidad lo decide el Plan (28.6).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con y sin recurrencias, presets e instancias en cualquier estado no confirmado, todas las cifras de Inicio, Actividad, Balance, presupuestos, Análisis, Metas y DEC-G04 son idénticas en el dataset de la etapa Plan.
- **SC-002**: Cero duplicados en las pruebas de integración en las tres garantías que aprueba ADR-016, y solo en ellas:
  1. **identidad única** de cada instancia por (regla, posición), también tras ediciones del día y con «Cambiar frecuencia»;
  2. **unicidad del vínculo ordinario** (un vínculo por movimiento en toda su historia y uno vigente por instancia) y **del movimiento efectivo por contexto** (ADR-016 §7.5 y §9);
  3. **ninguna duplicación de movimientos** al repetir, o lanzar en paralelo, la misma intención (confirmaciones repetidas o concurrentes, sustituciones técnicas).

  No promete deduplicar obligaciones independientes: ni entre reglas (los solapes de «Cambiar frecuencia» solo se muestran, P2) ni entre contextos (P6). En la cadena de F101-13, para la instancia **privada** (confirmar, Mover a Pareja, Deshacer, anulación económica), el número de movimientos activos es 1, 1, 1 y 0, y la instancia queda pendiente de resolución solo tras la anulación económica. Con P6 (ADR-016 §9), si el reemplazo compartido se vincula a una instancia compartida:

  | Paso | Instancia privada | Instancia compartida | Movimientos activos |
  | --- | --- | --- | --- |
  | Confirmar el privado | Confirmada | — | 1 |
  | Mover a Pareja | Confirmada | — | 1 |
  | Vincular el reemplazo a la compartida | Confirmada | Confirmada | 1 |
  | Deshacer Mover a Pareja | Confirmada | Pendiente | 1 |
  | Anular el privado restaurado | Pendiente | Pendiente | 0 |

  Las verificaciones de producto de ADR-016 (P3, P5 y P9) concretan estas pruebas.
- **SC-003**: Cero fugas: ninguna consulta, sugerencia de vínculo, aviso, exportación, error o metadato de la otra cuenta ni de una tercera devuelve dato alguno de una recurrencia, instancia, aporte programado o preset privado, **ni revela su existencia**; un aporte confirmado desde una programación privada es indistinguible de uno manual para la otra persona (pgTAP con tres cuentas; F101-2).
- **SC-004**: Confirmar cuesta un toque desde el calendario o el aviso **solo** cuando la instancia es de importe fijo (en ingresos, además, de certeza fija; F101-17), nada cambió y no hay un movimiento compatible sugerido por resolver; el gasto habitual sin recurrencia ni preset sigue en mediana < 10 s en teléfono real (US-12).
- **SC-005**: Los dos fundadores distinguen sin ayuda, en una prueba con sus propios datos, lo previsto de lo real en el calendario, y ninguno interpreta un ingreso previsto, un aporte programado o el total de previstos como dinero recibido, reservado o disponible.
- **SC-006**: Las transiciones de la tabla «Estados y transiciones» se cumplen todas en las pruebas de dominio, incluidas pausa y reanudación (también en compromisos de duración definida, con N y la fecha final intactos, D5), terminación sola con pendientes, finalización manual, archivo, omisión anticipada y su deshacer según el ciclo de vida (D3, D4), anulación económica y sustitución técnica.
- **SC-007**: Ningún vínculo incompatible de la tabla «Compatibilidad de vínculos» se acepta en el servidor (integración y pgTAP).
- **SC-008**: Sin scroll horizontal en 360, 390, 430, 1024 y 1440; CLS = 0 en las cargas con skeleton (§15.7).

## Assumptions

- MVP-1 está declarado y Planes (006) aceptada antes de implementar esta spec (28.18); la spec 005 y sus excepciones siguen vigentes.
- Durante el gate, esta spec solo avanza en documentación: spec, ADR propuestos y diseño (28.17). Se pausa durante el Plan y las Tasks de Planes y se reanuda al mergear el PR de Tasks de Planes (28.18).
- La pareja es de exactamente dos (§15.5); el modelo se escribe para N.
- El ingreso real ya existe, solo privado (16.3; §7.3); esta spec no lo cambia.
- Las fechas se calculan en `America/Bogota` (§5.2).
- El repositorio es público (25.1): los ejemplos son ficticios y no forman parte del dataset dorado.
- Esta spec no modifica contratos de la 006 (28.18, condición 7), ni ADR-001, ADR-003, ADR-010 ni los estados de Metas, y no incorpora nada del Presupuesto integral, Créditos, Patrimonio ni Flujo y liquidez.

## Lo que hace falta para pasar a Plan

1. ~~Que los fundadores respondan Q1–Q19.~~ **Hecho** el 25 de noviembre de 2026 (Session 2026-11-25 · Clarify). Registradas, con D1–D7, en el maestro §15.10, **decisión 29**, que también recoge lo que falta para pasar a Plan (29.10).
2. ~~Que los fundadores confirmen las decisiones D1 a D7 de la revisión F101.~~ **Hecho** el 25 de noviembre de 2026, con precisiones en D3, D4 y D5 («Precisiones de la revisión F101»).
3. Que **ADR-a** (recurrencias y movimientos previstos: forma e identidad de la instancia, representación de «pendiente de resolución», edición sin duplicados, regla quincenal, compatibilidad y búsqueda de vínculos, sustitución técnica), **ADR-b** (previsto frente a real en las métricas y el total de Q15) y **ADR-d** (aportes programados, ampliación de ADR-010, con la concurrencia de F101-7), en lo que afecta a esta spec, se escriban como **Propuestos** y se acepten, con el número que les toque al abrirse. **ADR-a: hecho**, aceptado como ADR-016 el 25 de noviembre de 2026, con P1–P7 (maestro §15.10, decisión 29.11). Faltan **ADR-b** y **ADR-d**.
4. Que la revisión del PR de esta spec termine sin hallazgos abiertos.
5. Que los fundadores aprueben los comps de diseño, incluida la decisión de Q15 entre el total de gastos previstos y ningún total.
6. Que la secuencia de 28.17 y 28.18 permita la etapa Plan: durante el gate solo se adelanta la documentación de spec, ADR propuestos y diseño, y la documentación de esta spec se pausa mientras Planes hace su Plan y sus Tasks.

**Nota para la etapa Plan** (no es un requisito nuevo). La revisión sugiere una
**prueba de equivalencia** para F101-2: un aporte manual de Ana y el mismo aporte
confirmado desde su recurrencia privada deben ser indistinguibles para Beto en
vistas, exportación, errores y metadatos. Encaja en las pruebas de FR-092 y
SC-003; el Plan decide su capa.
