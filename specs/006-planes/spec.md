# Feature Specification: 006 · Planes: viajes, salidas y eventos (MVP-2)

**Feature Branch**: `claude/mvp2-planes-spec-b322a2` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5)

**Created**: 2026-11-24

**Status**: Draft. Specify y Clarify hechos: los fundadores respondieron Q1–Q20 el 24 de noviembre de 2026, aceptaron todas las recomendaciones salvo la de Q12 (que cambia) y confirmaron que MVP-2 mantiene el tope E2E de P0. Las tres preguntas que salieron de la nueva Q12 (Q21–Q23) también están respondidas, el mismo día. **No queda ninguna pregunta abierta.** El PR de la spec (#94) se mergeó el 25 de noviembre de 2026; no avanza a Plan hasta cumplir «Lo que hace falta para pasar a Plan» (ADR-012 §3.1). La decisión está registrada en el maestro §15.10, decisión 27, y ADR-014 (fotos) y ADR-015 (entidad del plan y etiqueta) están **Aceptados** desde el 25 de noviembre de 2026. Q24 la decidió Alejandro el 25 de noviembre de 2026 (Session 2026-11-25).

**Input**: Petición de los fundadores del 24 de noviembre de 2026, aprobada por Alejandro ese día para especificarse y diseñarse en paralelo al gate de MVP-1: «Crear un plan, por ejemplo "Cartagena" o "ir al pueblo", y anotar en él los gastos de esa salida. Esos gastos se siguen viendo en Yo y en Nosotros. Un histórico ("en Cartagena nos gastamos $1.000.000"), abrir el detalle del plan y subirle una foto como en las metas, ver el desglose de quién pagó qué y saber si se pasaron del presupuesto del plan».

> **Qué es este documento.** Dice **qué** construiría Planes y **por qué**. **No
> decide nada**: lo que ya está decidido se cita; lo que no, va a los fundadores
> como pregunta numerada en «Clarifications», con la recomendación del redactor.
> Jerarquía: maestro (§15 prevalece) > ADR > paquete de `docs/design/` y
> `docs/CONVENTIONS.md` > esta spec (`AGENTS.md` §2). En este archivo `[P]`
> significa **propuesta** y `[V]` **verificación pendiente** (maestro §15.9); no
> significan «paralelizable», que solo ocurre dentro de `tasks.md` (ADR-012 §3.2).
>
> **Contexto de fase.** MVP-1 está en su gate (P0-4, spec 005): alcance congelado
> y siete días sin desplegar (decisión 25.5). **Nada de esta spec se implementa ni
> se despliega antes de declarar MVP-1.** Este PR solo añade documentos.
>
> **Desviación de la plantilla, a propósito.** Como en la 003, la 004 y la 005, la
> plantilla de Spec Kit limita a tres los `[NEEDS CLARIFICATION]`; aquí hubo veintitrés
> preguntas, porque el encargo pide que todo lo no decidido llegue a los
> fundadores en lugar de resolverse en la spec.

### Fuentes que aplica

| Fuente | Qué aporta a Planes |
| --- | --- |
| Maestro §2.3, principios 1, 5, 6 y 8; §2.4 (DEC-R17) | Registrar antes de planificar; dimensiones financieras separadas; privacidad por defecto, **también en agregados**; sin culpa; no presumir liquidez |
| Maestro §5.1 y §5.2 | `group_total`, `personal_consumption`, `gross_paid`, `net_owed`: un plan **no** añade métricas de dinero, solo agrupa gastos que ya cuentan una vez |
| Maestro §5.3 (DEC-R01, ADR-004) | Presupuesto opcional, `null` ≠ cero, sin `COALESCE`; atribuciones no aditivas. El presupuesto de un plan **no** es un presupuesto mensual |
| Maestro §5.4 y ADR-007 | Anulación auditada, nunca borrado silencioso de movimientos financieros; edición con versión |
| Maestro §5.5 y ADR-003 | Un grupo nunca ve movimientos privados; al salir de la pareja se revoca el acceso a sus movimientos **y archivos** |
| Maestro §5.6 (DEC-G01 a DEC-G06) | Analogía privada **XOR** compartida para la propiedad del plan; un uso de meta enlazado a un gasto no cuenta dos veces |
| Maestro §7.1, §7.3 y §7.4 | «Supabase Storage privado (P1)»; RLS en tablas y **buckets privados**; vistas `security_invoker`; `attachments` (P1) como algo distinto de una portada |
| Maestro §7.5 | «Limitar almacenamiento, adjuntos y consultas desde el principio» |
| Maestro §11, «Después de MVP-1» | MVP-2 se prioriza «según evidencia»; Planes sale del uso real de los fundadores |
| Maestro §15.3 | Navegación móvil de cinco posiciones, **sin sexta pestaña**; destinos de escritorio |
| Maestro §15.5 | Pareja de exactamente dos; repartos; liquidaciones declarativas; Mover a Pareja; gasto con meta; exportación JSON + CSV |
| Maestro §15.6.2 punto 2 y §15.10, decisiones 22.6 y 24.13 | Fotos de metas fuera de MVP-1; **ADR-014** (Storage privado de fotos) reservado para MVP-2; `[V]` de scrim y luminancia |
| Maestro §15.10, decisiones 20.12, 22.11, 22.15, 23.3 y 24.8 | Edición de gastos compartidos por cualquiera de los dos con versión; metas en Yo y en Nosotros **sin un total que las sume**; archivar sin borrar lo que tiene historia; pagador por defecto; borrado manual de cuenta |
| Spec 005, decisiones del 22 nov 2026 | Once categorías de gasto y rejilla de Anotar de 4 × 3 |
| ADR-013 | Tablas en `juntia_data`, escrituras solo por funciones en `juntia_private`, vistas `security_invoker` en `public`, idempotencia y bloqueo del agregado |
| ADR-011 y `docs/TESTING.md` | Capa más baja que detecta el fallo; tope de specs E2E; iteración contra `juntia-dev` |
| ADR-014 **(Aceptado, 25 nov 2026)** | Fotos de portada en Storage privado: límites, EXIF, borrado, costos |
| ADR-015 **(Aceptado, 25 nov 2026)** | Entidad del plan y su relación con los gastos (etiqueta adicional) |
| `docs/design/` | I2 · Bosque & Arena, Phosphor con `AppIcon`, BRAND §4 (palabras prohibidas) y §5 (fotografía), GoalCard y su fallback `[A]`, BottomSheet, Modal, BudgetIndicator, SharedBalance |
| `docs/GLOSSARY.md` | Términos existentes; ninguno se renombra |

## Clarifications

### Session 2026-11-24

Los fundadores respondieron Q1–Q20 el 24 de noviembre de 2026. Alejandro las
comunicó al gestor en nombre de los dos, y el gestor las trasladó a esta spec.
**Aceptaron todas las recomendaciones salvo Q12**, que cambia. Esta spec las
registra y las aplica, pero no las toma. Quedan pendientes dos cosas:

- su registro como decisión del maestro §15.10, en el PR documental que la recoja;
- la confirmación de la segunda fundadora con el merge.

Los requisitos que aplican una respuesta la citan como «(según Q#)».

| # | Respuesta |
| --- | --- |
| Q1 | (a) Una spec, tres PR: A base de datos, seguridad y dominio; B planes, detalle, histórico y selector, sin fotos; C fotos de portada (ADR-014) |
| Q2 | (a) Interfaz «Planes»; identificador `outings` |
| Q3 | (a) Dentro de Actividad («Movimientos · Planes»), y tarjeta del plan activo en Inicio solo si hay uno |
| Q4 | (a) Privado XOR compartido, como las metas |
| Q5 | (a) Compatibilidad impuesta en la base de datos; un gasto compartido nunca lleva un plan privado |
| Q6 | (a) Gasto privado en plan compartido permitido, con separación estricta: aparte, «Solo tú lo ves», nunca sumado |
| Q7 | (a) Total = gastos activos visibles del plan; «Gastaron en…» / «Gastaste en…» |
| Q8 | (a) Presupuesto total opcional, sin categorías; nunca «te alcanza» |
| Q9 | (a) El presupuesto compara solo con el total compartido |
| Q10 | (a) Pagó / le corresponde / «Diferencia en este plan», enlace a Balance, sin liquidar por plan |
| Q11 | (a) Desglose por categoría, hasta seis y «Ver todas» |
| **Q12** | **Cambia (ver abajo): un plan cerrado queda bloqueado** |
| Q13 | (a) Fechas opcionales que no restringen |
| Q14 | (a) Eliminar quita el plan y sus etiquetas; los gastos no cambian |
| Q15 | (a) Asociar después desde el plan y desde Editar gasto; un plan por gasto; la etiqueta **no** sube la versión del gasto |
| Q16 | (a) Un mecanismo de portada para metas y planes, las dos activas en MVP-2, en el PR C |
| Q17 | Los límites de ADR-014, `[V]` hasta medirlos |
| Q18 | (a) Fila opcional bajo la rejilla, sugerencia sin preselección |
| Q19 | (a) Fotos fuera de la copia y de la exportación; paso de Storage en el borrado de cuenta |
| Q20 | (a) Sin spec E2E nueva. **MVP-2 mantiene el tope de specs E2E de P0** |

**Q12, decisión de los fundadores.** En palabras de Alejandro: «debería de
cerrarse el plan para cuando se vaya a anotar no aparezca entre las opciones, por
ejemplo Cartagena 2024; si la pareja lo cerró no debería aparecer ahí, y podría
haber la opción de volverlo a abrir para corregir valores, agregar cosas etc. y
volverlo a cerrar». La regla que resulta:

1. Hay dos estados, `active` y `closed`. Cerrar es manual y se deshace con
   «Reabrir».
2. Un plan cerrado **no aparece** ni en el selector de Anotar ni en el campo
   «Plan» de Editar gasto.
3. Un plan cerrado **queda bloqueado**:
   - no se le asocian ni se le quitan gastos;
   - no se editan su nombre, sus fechas, su presupuesto ni su foto.

   Para corregir algo, se reabre, se cambia y se vuelve a cerrar.
4. En un plan compartido, cualquiera de los dos puede cerrarlo y reabrirlo, con
   auditoría.
5. **El gasto sigue siendo dinero.** Su importe se puede editar desde Actividad
   aunque esté en un plan cerrado, porque esa edición no depende del plan, y el
   total del plan cerrado refleja el cambio.

La regla 5 dejó tres casos sin decidir, que se abrieron como Q21, Q22 y Q23. Los
fundadores los respondieron el mismo 24 de noviembre de 2026 aceptando las tres
recomendaciones. Alejandro: «Sí, las tres».

| # | Respuesta |
| --- | --- |
| Q21 | (a) Un plan cerrado **no se elimina**: primero se reabre |
| Q22 | (a) Anular un gasto de un plan cerrado **se permite**. El gasto sale del total del plan y la etiqueta se conserva para la auditoría |
| Q23 | Mover a Pareja un gasto privado que está en un plan cerrado:<br>- si el plan es **compartido** (a), la etiqueta pasa al gasto nuevo en la misma operación;<br>- si el plan es **privado** (b), la operación se bloquea y la confirmación pide reabrirlo |

El contexto y las opciones de cada una se conservan abajo.

#### Q21 · Eliminar un plan cerrado

- **Contexto:** Q14 permite eliminar un plan, y Q12 bloquea el plan cerrado. No se dijo si eliminar está bloqueado.
- **Opciones:** (a) un plan cerrado no se elimina: primero se reabre (lo bloqueado no cambia de ninguna forma); (b) se puede eliminar estando cerrado.
- **Recomendación: (a).** Es la lectura más literal de «queda bloqueado», y eliminar solo cuesta un paso más.

#### Q22 · Anular un gasto que está en un plan cerrado

- **Contexto:** La regla 5 permite editar el importe. Anular un gasto también es una operación de dinero, y lo saca del total del plan cerrado (§5.4).
- **Opciones:** (a) se permite, como editar el importe: el gasto sale del total y su etiqueta se conserva para la auditoría; (b) se bloquea mientras el plan esté cerrado.
- **Recomendación: (a).** Es coherente con la regla 5. Con (b), un plan cerrado impediría corregir dinero.

#### Q23 · Mover a Pareja (y su Deshacer) de un gasto privado que está en un plan cerrado

- **Contexto:** Mover a Pareja anula el gasto privado y crea uno compartido (ADR-001). Llevar la etiqueta al gasto nuevo cambia qué gastos tiene el plan, aunque el total no cambie. Si el plan es privado, la etiqueta se pierde (Q5), y eso sí cambia el plan cerrado.
- **Opciones:** (a) se permite. La etiqueta pasa al gasto nuevo si el plan es compartido de esa pareja, como consecuencia de una operación de dinero y no como una asociación. Si el plan es privado, la confirmación avisa que el gasto saldrá de un plan cerrado. (b) Se bloquea mientras el plan esté cerrado, y la confirmación pide reabrirlo.
- **Recomendación: (b) para un plan privado cerrado y (a) para uno compartido.** Con (a) en un plan compartido, el plan no pierde nada. Con un plan privado cerrado, el gasto saldría del plan sin reabrirlo, que es lo que la regla 3 quiere evitar.

### Session 2026-11-25

Alejandro decidió Q24 el 25 de noviembre de 2026, con la opción A. Queda
registrada en el maestro §15.10, decisión 27.4, y en ADR-015 §4.

#### Q24 · Gasto compartido pagado con una meta compartida, en «Quién pagó»

- **Contexto:** Q7 cuenta completo un gasto pagado con una meta. En el balance de
  la pareja, ese gasto conserva su pagador y su reparto, porque los fondos de la
  meta no tocan el reparto (004, FR-058; DEC-G06). En «Quién pagó» de un plan, en
  cambio, atribuirle a una persona un pago que salió de la meta muestra una
  diferencia que nadie sintió. Por ejemplo, el regalo de la boda pagado con la
  meta «Regalos».
- **Respuesta, opción A:**
  1. El gasto aparece en «Quién pagó» como una línea propia, «Pagado con la meta
     {meta}», que no se asigna a ninguno de los dos.
  2. La porción cubierta por la meta no se asigna como pago ni consumo a ninguna
     persona. Al cambiar U, se recalculan `plan_paid`, `plan_share` y la
     diferencia informativa del plan; el Balance real permanece intacto.
  3. Cuenta completo en el total del plan y en el desglose por categoría (Q7).
- **Cifras derivadas del plan, no métricas canónicas (F95-1).** El «pagó» y el
  «le corresponde» de «Quién pagó» son cifras **propias del plan**, con nombre
  propio: `plan_paid` y `plan_share`. **No son `gross_paid`** (maestro §5.1:
  «total que la persona pagó originalmente») ni la suma de
  `transaction_allocations`, y no las reutilizan. Para un gasto de importe A con
  usos de meta aplicados por U (0 ≤ U ≤ A):
  - la línea «Pagado con la meta {meta}» suma U, con una línea por meta;
  - `plan_paid` del pagador suma A − U;
  - `plan_share` reparte A − U entre los participantes (regla de reparto abajo).
    Si U = A, el gasto no suma nada a ninguna persona.

  **Lo que no cambia nunca:** `gross_paid` (sigue siendo A para el pagador), las
  asignaciones originales de `transaction_allocations`, `net_owed`, Balance y
  las cinco métricas de DEC-G04. **Lo que sí se recalcula:** `plan_paid`,
  `plan_share` y la diferencia del plan, cada vez que U cambia (uso aplicado,
  aprobado, quitado o anulado). Ejemplo: Sara paga $400.000, 50/50, y después se
  aplican $150.000 de una meta. `gross_paid` de Sara sigue en $400.000 y Balance
  no cambia; en el plan, `plan_paid` pasa de $400.000 a $250.000, `plan_share`
  de $200.000 a $125.000 cada uno y la diferencia de +$200.000 a +$125.000.

  Se cumple que Σ `plan_paid` + Σ líneas de meta = total del plan, que Σ
  `plan_share` = Σ `plan_paid` y que las diferencias suman cero. Solo cuentan los
  usos **aplicados** y no anulados; los fondos de una solicitud pendiente, rechazada o
  cancelada no descuentan nada, y los propios ya aplicados siguen contando (004, FR-052, FR-053 y FR-055).
- **Regla de reparto de `plan_share` (F95-2).** Los pesos salen de la
  **proporción de las asignaciones originales** del gasto en
  `transaction_allocations`, sea cual sea el modo con que se anotó (50/50,
  Porcentaje o Importe; 003, FR-019). Sobre la base A − U se aplica el algoritmo
  de mayor residuo de ADR-002, en pesos enteros, con el desempate por orden de
  ingreso a la pareja (nota de ADR-002, decisión 20.8). `transaction_allocations`
  no se modifica. Una asignación de 0 da 0. Ejemplo en modo Importe: $400.000
  repartidos Sara $300.000 y Tomás $100.000 (75/25), con $150.000 de meta: la
  base es $250.000 y `plan_share` da $187.500 y $62.500, no los importes
  originales.
- **Confirmación:** los fundadores confirmaron el 25 de noviembre de 2026
  (Alejandro: «Sí, confirmado») que la parte de la meta tampoco cuenta en «le
  corresponde» y que solo cuentan los usos aplicados. La propuesta fue del
  redactor. Los nombres `plan_paid` y `plan_share` y la regla de proporción
  corrigen la redacción (F95-1 y F95-2) sin cambiar esa decisión.
- **Matiz aceptado por los fundadores:** la «Diferencia en este plan» es
  informativa, sin «le debe» (Q10). Puede no coincidir con lo que ese gasto mueve
  en Balance, que conserva el reparto completo y sigue siendo **el único saldo
  real** de la pareja. El enlace a Balance se mantiene. Se descartó repartir el
  importe completo A en «le corresponde», porque con eso las diferencias no suman
  cero y la meta crea una diferencia aparente.

### Preguntas de la etapa Specify

Las Q1–Q20 se conservan tal como se plantearon. Las respuestas están en la tabla
de arriba. Las marcadas **· ADR** dependen de ADR-014 o ADR-015, propuestos en el PR #94 y aceptados el 25 de noviembre de 2026 (decisión 27).

### Lo que ya está decidido y esta spec no reabre

- Un gasto **existe una vez** y cuenta una vez en Yo, Nosotros, presupuestos
  mensuales, balance y Análisis (US-08, DEC-G04). Un plan no cambia ninguna de
  esas cifras.
- Un gasto privado **nunca** es visible para la otra persona, ni por agregados,
  ni por actividad compartida, ni por errores (§2.3.6, §7.4, US-05).
- Presupuesto opcional; ausencia ≠ cero; nunca «te alcanza» (DEC-R01, DEC-R17).
- Los movimientos financieros no se borran: se anulan con auditoría (§5.4).
- Las metas no tienen foto en MVP-1; el fallback de GoalCard es `[A]` (24.13).
- Navegación móvil de cinco posiciones, sin sexta pestaña (§15.3).
- COP única; multimoneda es P2 (§3).

### Contexto y opciones de cada pregunta

#### Q1 · Forma de la especificación y reparto en PR

- **Contexto:** Planes toca base de datos (tabla nueva, relación con `transactions`, RLS), Storage (fotos, ADR-014), Anotar (selector), Actividad y una pantalla nueva con su histórico.
- **Opciones:** (a) una spec, la 006, con tres PR: A, base de datos, seguridad y dominio; B, planes, detalle, histórico y selector en Anotar, **sin fotos**; C, fotos de portada (ADR-014), con las fotos de metas si se responde (a) en Q16; (b) un solo PR; (c) dos specs, Planes y Fotos.
- **Recomendación: (a).** Las fotos son lo más caro y lo más arriesgado y no son dinero; Planes funciona sin ellas con un fallback como el de GoalCard. Separarlas permite usar Planes antes y cerrar ADR-014 con calma.

#### Q2 · Nombre visible e identificador · ADR-015

- **Contexto:** «Plan» ya es un destino de la navegación (presupuestos y Análisis, ruta `/plan`, carpeta `src/features/plan`), y ADR-009 se llama «Planes» (planes de hosting). «Planes» junto a «Plan» confunde en la interfaz y en el código.
- **Opciones:** (a) interfaz «Planes» y un identificador en inglés que no choque: `outings` (tabla `juntia_data.outings`, carpeta `src/features/outings`); (b) interfaz «Salidas»; (c) interfaz «Viajes»; (d) renombrar el destino «Plan» a «Presupuesto».
- **Recomendación: (a).** «Planes» es la palabra de los fundadores y en Colombia «¿qué plan?» cubre viaje, salida y evento. El choque se resuelve en el código con `outings` y en la interfaz con la ubicación (Q3), sin renombrar un destino aprobado. Esta spec usa «plan» para el concepto y `outing` para los identificadores **[propuesta]**.

#### Q3 · Dónde viven Planes en la navegación `[P]`

- **Contexto:** No cabe una sexta pestaña (§15.3). Un plan agrupa movimientos de varios meses; Actividad recorre los movimientos por mes; Metas es ahorro y no debe mezclarse con gasto (§2.3.5).
- **Opciones:** (a) vista dentro de Actividad («Movimientos · Planes»), ruta `/actividad/planes` y detalle `/actividad/planes/[id]`; en escritorio, el mismo segmento dentro de Actividad, sin destino nuevo; (b) sección dentro de Plan; (c) destino propio solo en escritorio, como Balance; (d) dentro de Metas.
- **Recomendación: (a), y en Inicio una tarjeta del plan activo solo si hay uno.** Actividad ya es «lo que pasó» y un plan es una forma de leerlo; (b) suma confusión con el nombre (Q2); (d) mezcla gasto con ahorro. Un destino nuevo en escritorio (c) cambia la navegación aprobada y necesitaría decisión propia.

#### Q4 · Planes privados y compartidos · ADR-015

- **Contexto:** Las metas son privadas **XOR** compartidas (DEC-G01). «Ir al pueblo» puede ser solo de una persona.
- **Opciones:** (a) igual que las metas: un plan es de una persona (`owner_user_id`) **XOR** de la pareja (`group_id`); (b) solo compartidos; (c) solo privados.
- **Recomendación: (a).** Reutiliza el modelo y la RLS de las metas y cubre los dos casos sin inventar reglas.

#### Q5 · Qué gastos admite cada plan · ADR-015

- **Contexto:** Si un gasto **compartido** pudiera llevar un plan **privado**, la fila compartida mostraría a la otra persona que existe un plan suyo que no puede ver.
- **Opciones:** (a) plan compartido ← gastos compartidos de esa pareja y, según Q6, gastos privados de cualquiera de los dos; plan privado ← solo gastos privados de su dueña; (b) solo gastos del mismo contexto que el plan.
- **Recomendación: (a), con la restricción en la base de datos, no solo en la interfaz.** Un gasto compartido nunca lleva un plan privado.

#### Q6 · Un gasto privado (Yo) en un plan compartido · privacidad

- **Contexto:** En Cartagena, un recuerdo personal se anota en Yo pero «es del viaje». Los contratos dicen que un gasto privado no se revela ni por agregados (§2.3.6, §7.4, US-05). Si se suma al total del plan, la pareja vería un total distinto de la suma de lo que puede ver, y deduciría que hay gastos privados y cuánto.
- **Opciones:**
  - (a) **Se permite, con separación estricta.** El total compartido del plan, el que ven los dos, suma **solo** gastos compartidos. Quien tiene privados en el plan ve, debajo y aparte, «Tus gastos privados en este plan · $X · Solo tú lo ves», **sin sumarlo** al total compartido. La otra persona no ve ni el importe, ni el número de gastos, ni que existan, ni cambia ninguna fecha de «actualizado» del plan.
  - (b) **No se permite:** un plan compartido solo admite gastos compartidos; el selector en Yo solo ofrece planes privados.
  - (c) Se permite y se suma al total para quien lo anotó (cada uno vería un total distinto).
- **Recomendación: (a).** Es la regla que ya aplican las metas en Yo (decisión 22.11: «sin un total que las sume») y cubre el caso real. (c) hace que «en Cartagena nos gastamos» sea un número distinto para cada uno y se descarta. Si los fundadores prefieren lo más simple, (b) es segura.
- **Consecuencia de (a) para el «histórico»:** la frase «En Cartagena gastaron $X» usa solo el total compartido; nunca un consolidado con privados.

#### Q7 · Qué es «el total del plan» y cómo se rotula

- **Contexto:** El número héroe del detalle. No puede ser `total_destinado_neto` (DEC-G04, §15.4) ni sumar aportes a metas.
- **Opciones:** (a) suma de los **gastos activos** etiquetados que la persona puede ver en el contexto del plan (en un plan compartido, el gasto completo del grupo, como `group_total`); rótulo «Gastaron en {plan}» en compartidos y «Gastaste en {plan}» en privados; (b) además, la parte de cada uno como héroe.
- **Recomendación: (a).** Es `gasto_consumo` restringido al plan, sin aportes, retiros ni liquidaciones. Un gasto pagado con una meta cuenta por su importe completo (es gasto real; DEC-G04) y se marca «Pagado con una meta», sin restar nada.

#### Q8 · Presupuesto del plan

- **Contexto:** Opcional, como DEC-R01. No es un presupuesto mensual de ADR-004 y no debe mezclarse con ellos.
- **Opciones:** (a) un importe total opcional por plan, sin categorías ni meses; sin presupuesto no hay barra, ni restante, ni exceso; con presupuesto, consumido, porcentaje y «Quedan $X» o «Se pasaron por $X» (GLOSSARY §4), más «Cerca del límite» desde el 85 %; editable por cualquiera de los dos en un plan compartido, con versión y auditoría y sin segunda aprobación, como §15.5; (b) presupuesto por categoría dentro del plan.
- **Recomendación: (a).** Lo pidieron así. Nunca «te alcanza» ni «puedes gastar $X más» (DEC-R17). El presupuesto del plan **no** consume ni modifica los presupuestos mensuales, ni al revés.

#### Q9 · Qué cuenta contra el presupuesto de un plan compartido

- **Contexto:** Con Q6 (a), la dueña de los privados podría querer verlos contra el presupuesto.
- **Opciones:** (a) solo el total compartido; (b) cada persona ve su barra con sus privados sumados.
- **Recomendación: (a).** Una sola barra, la misma para los dos. (b) repite el problema de (c) en Q6.

#### Q10 · «Quién pagó qué» y el balance dentro del plan

- **Contexto:** El saldo real de la pareja es uno, acumulado (decisión 20.9), y las liquidaciones no pertenecen a un plan. Decir «Tomás le debe a Sara $X por Cartagena» haría creer que existen deudas por plan.
- **Opciones:** (a) dentro del plan, por persona: **pagó** (suma de lo que pagó en gastos del plan) y **le corresponde** (suma de sus partes), con la diferencia rotulada «Diferencia en este plan»; un enlace «Ver el balance de la pareja» lleva a Balance, que es el único sitio donde se dice quién le debe a quién; sin liquidar por plan; (b) además, «Liquidar este plan»; (c) solo «pagó», sin «le corresponde».
- **Recomendación: (a).** Reutiliza la lectura pagó/corresponde de SharedBalance, sin crear un segundo saldo. (b) necesitaría liquidaciones por plan, que el maestro no contempla (§5.1, §15.5).

#### Q11 · Desglose por categoría

- **Opciones:** (a) las categorías con gasto en el plan, de mayor a menor, con importe y porcentaje del total del plan, con los íconos de categoría; (b) solo las tres primeras y «Otras».
- **Recomendación: (a)**, con un máximo visible y «Ver todas» si hay más de seis.

#### Q12 · Estado del plan: activo y cerrado

- **Contexto:** El histórico son los planes pasados.
- **Opciones:** (a) `active | closed`; «Cerrar plan» es manual y reversible («Reabrir»); un plan cerrado sale del selector de Anotar pero se puede seguir asociando desde su detalle; (b) se cierra solo al pasar la fecha de fin; (c) cerrado no admite más gastos.
- **Recomendación: (a).** Las fechas son opcionales, así que un cierre automático no siempre es posible, y los gastos se anotan a veces días después.
- **Respuesta (24 nov 2026): cambia.** Un plan cerrado queda bloqueado. Para cambiar algo se reabre (ver «Session 2026-11-24»).

#### Q13 · Fechas del plan

- **Opciones:** (a) inicio y fin opcionales, fin ≥ inicio; **no restringen** qué gastos se pueden asociar (un tiquete se compra semanas antes); en el selector de «asociar después», los gastos dentro de las fechas aparecen primero; (b) las fechas restringen.
- **Recomendación: (a).**

#### Q14 · Eliminar un plan: qué pasa con sus gastos · ADR-015

- **Contexto:** Un plan no es dinero; sus gastos sí. Nada con dinero se borra (§5.4).
- **Opciones:** (a) «Eliminar plan» quita el plan y todas sus etiquetas en una operación atómica, idempotente y auditada; **los gastos no cambian** (ni importe, ni contexto, ni reparto, ni versión) y siguen en Actividad, Inicio, Balance, presupuestos y Análisis; la foto se borra de Storage (ADR-014); la confirmación lo dice: «Los N gastos seguirán en Actividad»; en un plan compartido, puede hacerlo cualquiera de los dos; (b) solo cerrar, nunca eliminar; (c) eliminar solo si no tiene gastos.
- **Recomendación: (a).** Con un plan privado que tiene gastos de la dueña, igual. En un plan compartido con privados asociados (Q6 a), eliminar también quita esas etiquetas, sin revelar a quien elimina que existían; la confirmación cuenta solo los gastos que esa persona ve.

#### Q15 · Asociar después y cambiar de plan

- **Contexto:** Pedido explícito: asociar gastos ya anotados.
- **Opciones:** (a) dos caminos: desde el detalle del plan, «Añadir gastos» abre una lista con selección múltiple (filtrada por contexto válido según Q5 y Q6, con los de las fechas del plan primero) y se aplica en una sola operación atómica e idempotente; y desde Editar gasto, un campo «Plan» que permite poner, cambiar o quitar el plan. (b) solo desde Editar gasto.
- **Recomendación: (a).** Un gasto tiene **como máximo un plan** (ADR-015). Cambiar el plan de un gasto compartido lo puede hacer cualquiera de los dos (como 20.12) y queda auditado.
- **Subpregunta:** ¿poner o quitar un plan cuenta como «edición» del gasto (sube su versión y muestra «Editado por X»)? **Recomendación: no.** La etiqueta no cambia dinero; vive fuera de la fila del gasto (ADR-015, opción recomendada) y su historial está en la auditoría. Si no sube la versión, no choca con una edición concurrente del monto.

#### Q16 · Fotos: alcance y relación con las metas · ADR-014

- **Contexto:** ADR-014 estaba reservado para «Storage privado de fotos de metas» (decisiones 22.6 y 24.13). Una foto de portada de plan es el mismo problema: archivo privado, EXIF, tamaño, RLS, borrado.
- **Opciones:** (a) un solo mecanismo de portada para metas y planes (ADR-014 ampliado); en MVP-2 se activan las dos, con el focal point, el scrim y sus `[V]` de BRAND §5; (b) el mecanismo es común, pero en MVP-2 solo se activa en planes y las metas siguen con el fallback; (c) fotos solo en planes, con un mecanismo propio.
- **Recomendación: (a), en el PR C de Q1.** Los fundadores pidieron «subirle una foto, igual que en las metas»; el diseño de las metas ya prevé la foto (GoalCard, meta inmersiva, `goal-photo-{id}`) y construir el mecanismo dos veces cuesta más. Si se quiere acotar, (b).

#### Q17 · Fotos: límites, formatos y metadatos · ADR-014

- **Opciones:** las de ADR-014: una portada por plan o meta; reencuadre y recodificación en el cliente a JPEG (lado largo ≤ 2048 px, objetivo ≤ 600 KB); entrada JPEG, PNG, WebP y HEIC/HEIF si el navegador la decodifica; rechazo de más de 15 MB de origen; **se eliminan todos los metadatos (EXIF, GPS, XMP)** y el servidor rechaza un archivo que los conserve.
- **Recomendación:** las de ADR-014. Los números son `[V]` hasta medirlos con fotos reales de iPhone.

#### Q18 · Selector de plan en Anotar `[P]`

- **Contexto:** La rejilla de categorías es de 4 × 3 (spec 005, 22 nov 2026) y US-12 exige < 10 s para el gasto habitual. El selector no puede añadir un paso obligatorio.
- **Opciones:** (a) una fila opcional «Plan» debajo de la rejilla, cerrada por defecto («Sin plan»); si hay un plan activo cuya fecha incluye hoy, aparece como sugerencia de un toque, **sin preseleccionarse**; al tocarla se abre una lista con los planes activos válidos para el contexto (Q5, Q6) y «Crear plan» al final; (b) preseleccionar el plan activo; (c) el plan solo en los detalles (E2).
- **Recomendación: (a).** Preseleccionar (b) etiquetaría por error el mercado de la semana durante el viaje. (c) esconde la función que se pidió.

#### Q19 · Copias, exportación y borrado de cuenta con fotos · ADR-014

- **Contexto:** La copia semanal (decisiones 16.11, 19.3 y 24.9) es de la base de datos; los archivos de Storage **no** van en ella. La exportación es JSON + CSV (§15.5). El borrado manual de cuenta (24.8, 25.3) borra filas, no archivos.
- **Opciones:** (a) las fotos son **reemplazables**: no entran en la copia ni en la exportación (que sí incluye los planes y sus gastos), y una restauración deja los planes con el fallback; el procedimiento de borrado de cuenta añade el paso de borrar los objetos de Storage de la persona o la pareja; (b) incluir las fotos en la copia semanal; (c) incluirlas en la exportación como archivos.
- **Recomendación: (a)**, dicho en la interfaz al subir la foto («La foto no se incluye en la exportación»). (b) multiplica el tamaño de la copia y el trabajo manual.

#### Q20 · Pruebas: specs E2E de Planes

- **Contexto:** El tope de 4–6 specs E2E es de P0 (ADR-011); MVP-2 no tiene tope propio.
- **Opciones:** (a) ninguna spec E2E nueva: ampliar la spec de gastos compartidos con «asociar a un plan» y su lectura en el detalle; la privacidad de Q6 se prueba en pgTAP y en integración, que es la capa más baja que la detecta; (b) una spec E2E nueva de Planes.
- **Recomendación: (a)**, y que los fundadores digan si MVP-2 mantiene el tope de P0.

## User Scenarios & Testing *(mandatory)*

Los escenarios aplican las respuestas de los fundadores a Q1–Q23 (24 nov 2026). Si una
respuesta cambia, el escenario que la aplica se reescribe.

### User Story 1 - Crear un plan y anotar en él (Priority: P1)

Sara crea el plan «Cartagena», compartido, con fechas del 5 al 9 de diciembre y
presupuesto de $3.000.000. Durante el viaje, al anotar un gasto en Nosotros,
toca la sugerencia «Cartagena» debajo de las categorías y guarda.

**Why this priority**: Es la petición original y el núcleo de valor.

**Independent Test**: Crear un plan, anotar un gasto compartido con el plan y
comprobar que aparece en el detalle del plan **y** sigue en Actividad, Inicio,
Balance, presupuestos y Análisis con las mismas cifras de antes.

**Acceptance Scenarios**:

1. **Given** una pareja activa sin planes, **When** Sara crea «Cartagena» compartido, **Then** Tomás lo ve en Planes con las mismas fechas y presupuesto, y la auditoría registra quién lo creó.
2. **Given** el plan activo con fechas que incluyen hoy, **When** Tomás abre Anotar en Nosotros, **Then** ve «Cartagena» como sugerencia **sin seleccionar**, y guardar sin tocarla deja el gasto sin plan.
3. **Given** un gasto compartido de $180.000 al 50/50 anotado con el plan, **When** se abre Inicio, Balance y el presupuesto mensual de Restaurantes, **Then** sus cifras son idénticas a las de anotarlo sin plan (US-08).
4. **Given** que se anota con el plan, **When** se mide el tiempo de un gasto habitual sin plan, **Then** sigue por debajo de 10 s (US-12) y el selector no añade ningún paso obligatorio.

---

### User Story 2 - Ver el detalle de un plan (Priority: P1)

Tomás abre «Cartagena» y ve cuánto gastaron, cómo van frente al presupuesto, en
qué se fue, quién pagó qué y la lista de gastos.

**Why this priority**: Es la lectura que pidieron: total, presupuesto, desglose y quién pagó.

**Independent Test**: Con un dataset fijo de gastos del plan, el detalle
reproduce exactamente el total, el porcentaje, el desglose por categoría y el
pagó/corresponde por persona.

**Acceptance Scenarios**:

1. **Given** el plan con $2.400.000 en gastos compartidos y presupuesto de $3.000.000, **When** Tomás abre el detalle, **Then** ve «Gastaron en Cartagena $2.400.000», 80 % del presupuesto y «Quedan $600.000», nunca «te alcanza».
2. **Given** $3.300.000 en gastos, **When** abre el detalle, **Then** ve «Se pasaron por $300.000» con texto, forma y color, nunca solo color.
3. **Given** un plan sin presupuesto, **When** abre el detalle, **Then** no hay barra, ni restante, ni exceso, ni «$0» (DEC-R01).
4. **Given** gastos pagados por Sara y por Tomás con repartos distintos, **When** abre «Quién pagó», **Then** ve por persona «pagó» y «le corresponde» dentro del plan, la diferencia rotulada «Diferencia en este plan» y el enlace al balance de la pareja; en ninguna parte del plan dice «le debe».
5. **Given** un gasto del plan pagado con una meta, **When** abre el detalle, **Then** el gasto cuenta por su importe completo y lleva la marca «Pagado con una meta»; ningún aporte, retiro ni liquidación aparece en el total.
6. **Given** «Boda de Ana» con $860.000 en gastos compartidos: el regalo de $400.000, pagado por completo con la meta compartida «Regalos», y $460.000 más, de los que Sara pagó $300.000 y Tomás $160.000, a repartir 50/50, **When** abre «Quién pagó», **Then** ve la línea «Pagado con la meta Regalos · $400.000», sin asignar a nadie; Sara pagó $300.000 y le corresponden $230.000; Tomás pagó $160.000 y le corresponden $230.000; la diferencia en este plan es +$70.000 y −$70.000; el total del plan es $860.000 y el regalo suma $400.000 en su categoría (según Q24 y Q7).

**Matriz de aceptación de Q24 (F95-3, F95-5 y F95-6).** Gasto compartido de
A = $400.000 en el plan, pagado por Sara, reparto 50/50, con la meta compartida
«Regalos». U es la suma de los asientos de uso **vivos** (aplicados y no
anulados) de ese gasto; varios asientos vivos de la misma meta se suman en una
sola línea y el gasto cuenta una vez. Los fondos propios se aplican al registrar
el gasto; los de la otra persona quedan pendientes hasta que ella apruebe, y un
rechazo o una cancelación solo excluye lo que nunca se aplicó (004, FR-052,
FR-053 y FR-055). Se cubre con pruebas de dominio y de integración de servidor,
**sin spec E2E nueva** (según Q20).

| Caso | U | Resultado esperado en el plan |
| --- | --- | --- |
| Uso parcial aplicado de fondos propios | $150.000 | Línea «Pagado con la meta Regalos» $150.000; `plan_paid` de Sara $250.000; `plan_share` $125.000 y $125.000; diferencia +$125.000 y −$125.000; total $400.000 |
| Solicitud pendiente, sin fondos propios aplicados | $0 | Sin línea de meta; `plan_paid` de Sara $400.000; `plan_share` $200.000 y $200.000 |
| Solicitud pendiente con fondos propios aplicados: Sara aplica $100.000 suyos y pide $150.000 de Tomás | $100.000 | Línea $100.000; `plan_paid` de Sara $300.000; `plan_share` $150.000 y $150.000 |
| Esa solicitud, aprobada | $250.000 | Los dos asientos vivos de la meta ($100.000 + $150.000) se suman en una línea de $250.000, sin duplicar el gasto; `plan_paid` de Sara $150.000; `plan_share` $75.000 y $75.000; total $400.000 |
| Esa solicitud, rechazada o cancelada | $100.000 | Lo propio sigue aplicado: igual que la pendiente con fondos propios. Solo se excluyen los $150.000 que nunca se aplicaron |
| «Quitar el uso de la meta» | $0 | La línea desaparece y las cifras vuelven al caso sin meta |
| Anular el gasto | — | Sale de todas las cifras del plan: total, desglose, línea de meta, `plan_paid` y `plan_share` |
| Editar el gasto con un uso vivo | sin cambio | Se mantiene U ≤ A (004, Q17: bajar el monto por debajo de lo usado se rechaza); con otro monto válido, las cifras del plan se recalculan sobre el A nuevo |

Cada caso se comprueba con **dos comparaciones distintas** (F95-6):

1. **Invariancia por etiqueta.** Para cada estado y cada operación de la
   matriz, se compara el mismo escenario con la etiqueta del plan y sin ella:
   `gross_paid`, `net_owed`, las asignaciones de `transaction_allocations`,
   Balance y las cinco métricas de DEC-G04 **coinciden exactamente**. Planes no
   altera ninguna métrica canónica.
2. **Transición de financiación.** Antes y después de aprobar, quitar el uso,
   editar o anular, las métricas canónicas **cambian exactamente como dice la spec
   004**: al aprobar o al quitar un uso cambian, entre otras,
   `gasto_financiado_con_meta` y `total_destinado_neto`, y al anular el gasto
   cambia todo lo que ese gasto aportaba. El cambio es el mismo con etiqueta y sin
   ella. En el plan solo cambian, además, la línea de la meta, `plan_paid`,
   `plan_share` y la diferencia del plan.

---

### User Story 3 - Un gasto privado en un plan compartido (Priority: P1)

Sara compra un recuerdo para ella en Cartagena, lo anota en Yo y lo asocia a
«Cartagena». Tomás no debe enterarse por ningún camino.

**Why this priority**: Es el punto de privacidad que puede romper el contrato más importante del producto.

**Independent Test**: Con dos cuentas, comprobar por la interfaz **y por consultas directas a la API** que nada del gasto privado llega a Tomás.

**Acceptance Scenarios**:

1. **Given** el gasto privado de Sara de $150.000 en «Cartagena», **When** Sara abre el detalle, **Then** ve el total compartido sin cambios y, aparte, «Tus gastos privados en este plan · $150.000 · Solo tú lo ves», sin sumarlo.
2. **Given** lo mismo, **When** Tomás abre el detalle, la lista, el desglose, el presupuesto, el histórico, Actividad, la exportación y cualquier vista o función de la API, **Then** no hay rastro: ni importe, ni número de gastos, ni categoría, ni cambio en «pagó», ni fecha de actualización distinta.
3. **Given** un plan compartido con dos gastos compartidos y uno privado de Sara, **When** cualquiera de los dos va a eliminarlo, **Then** la confirmación cuenta los gastos que ve esa persona (3 para Sara, 2 para Tomás).
4. **Given** lo mismo, **When** Sara elimina el plan (y, en un plan igual, Tomás), **Then** tres verificaciones separadas (ADR-015 §5 y `[V]` 5; F94-1 y F94-8):
   - **Inspección privilegiada en pgTAP:** el evento compartido de auditoría registra 2 gastos compartidos y nada del privado. La etiqueta del privado se audita en un evento aparte, clasificado para acceso exclusivo de Sara cuando exista un lector autorizado (`visible_to_user_id` = Sara), también cuando el actor es Tomás.
   - **Permisos:** ni Sara, ni Tomás, ni una tercera cuenta pueden leer `audit_events` directamente.
   - **Origen de la confirmación:** el conteo de la confirmación previa sale de las tablas del plan, nunca de la auditoría.
5. **Given** el plan antes y después de que Sara etiquete su gasto privado, **When** se leen con la identidad de Sara y con la de Tomás las siguientes cifras, **Then** las ocho son idénticas en las cuatro lecturas, y solo aparece o cambia la línea «Tus gastos privados» de Sara (ADR-015 §4; F94-3):
   - total;
   - desglose por categoría y sus porcentajes;
   - consumido y restante del presupuesto;
   - «pagó», «le corresponde» y «diferencia» de cada persona.

---

### User Story 4 - Asociar después gastos ya anotados (Priority: P2)

Al volver del pueblo, Sara crea «Ir al pueblo» y le añade los cuatro gastos que
ya había anotado.

**Why this priority**: Pedido explícito, y es la forma más común de llegar tarde a la función.

**Independent Test**: Crear un plan y asociar varios gastos existentes en una sola operación; repetir la operación no duplica nada.

**Acceptance Scenarios**:

1. **Given** cuatro gastos sin plan, **When** Sara usa «Añadir gastos» y elige los cuatro, **Then** los cuatro quedan en el plan en una sola operación, y un doble toque o un reintento no crea nada dos veces.
2. **Given** un gasto compartido con plan, **When** Tomás le cambia el plan desde Editar gasto, **Then** queda en el nuevo plan, la auditoría registra el cambio y el gasto no muestra «Editado por Tomás» ni cambia su versión (según Q15).
3. **Given** un gasto compartido, **When** alguien intenta asociarlo a un plan privado por la API, **Then** se rechaza (Q5).

---

### User Story 5 - Cerrar, reabrir y consultar el histórico (Priority: P2)

Meses después, Tomás abre Planes y ve los cerrados: «Cartagena 2024 · 5–9 dic ·
Gastaron $2.400.000». Al anotar ya no le aparece Cartagena 2024. Sara nota que
falta un taxi del viaje: reabre el plan, lo añade y lo vuelve a cerrar.

**Why this priority**: Pedido explícito; da valor al registro acumulado.

**Independent Test**: Cerrar un plan y comprobar cuatro cosas:
- pasa al histórico con su total;
- sale de Anotar y de Editar gasto;
- rechaza cualquier cambio, también por la API;
- se puede reabrir, cambiar y volver a cerrar.

**Acceptance Scenarios**:

1. **Given** un plan activo, **When** cualquiera de los dos lo cierra, **Then** aparece en el histórico con nombre, fechas y total compartido, y la auditoría registra quién lo cerró (según Q12).
2. **Given** un plan cerrado, **When** alguien abre Anotar o el campo «Plan» de Editar gasto, **Then** el plan no aparece entre las opciones (según Q12).
3. **Given** un plan cerrado, **When** alguien intenta, desde la interfaz o llamando a la API:
   - asociarle o quitarle un gasto;
   - editar su nombre, sus fechas o su presupuesto;
   - cambiar o quitar su foto;

   **Then** se rechaza sin cambiar nada, y la interfaz explica: «Cartagena 2024 está cerrado. Reábrelo para cambiarlo» (según Q12).
4. **Given** un plan cerrado, **When** Sara lo reabre, añade un gasto y lo vuelve a cerrar, **Then** el plan conserva todo lo anterior más el gasto nuevo, y la auditoría registra las tres operaciones.
5. **Given** un gasto de un plan cerrado, **When** alguien edita su importe desde Actividad, **Then** la edición se guarda como cualquier otra y el total del plan cerrado refleja el importe nuevo (según Q12).
6. **Given** un gasto de un plan cerrado que se anula, **When** se lee el histórico, **Then** el total ya no lo incluye y la etiqueta se conserva para la auditoría (§5.4; según Q22).
7. **Given** un gasto privado de Sara en el plan compartido cerrado «Cartagena 2024», **When** lo mueve a Pareja, **Then** el gasto compartido nuevo queda en «Cartagena 2024» en la misma operación, y el plan sigue cerrado (según Q23).
8. **Given** un gasto privado de Sara en su plan privado cerrado «Ir al pueblo», **When** intenta moverlo a Pareja, **Then** la operación no se ejecuta y la confirmación dice: «Ir al pueblo está cerrado. Reábrelo para mover este gasto» (según Q23).

---

### User Story 6 - Eliminar un plan sin perder gastos (Priority: P2)

**Independent Test**: Eliminar un plan con gastos y comprobar que todos los gastos siguen activos, con el mismo importe, reparto, contexto y versión.

**Acceptance Scenarios**:

1. **Given** un plan con 12 gastos, **When** se elimina y se confirma «Los 12 gastos seguirán en Actividad», **Then** el plan desaparece, los 12 gastos siguen intactos y sin plan, y la auditoría lo registra.
2. **Given** un plan con foto, **When** se elimina, **Then** desde el commit de la eliminación la ruta de lectura de la portada responde `404` a las dos personas, también lo que el navegador tenía en caché. Las dos variantes del archivo se borran de Storage después, con reintentos (ADR-014 §5; F94-2).
3. **Given** un plan cerrado, **When** alguien intenta eliminarlo, **Then** la acción no se ofrece, la base de datos la rechaza y la interfaz dice «Reábrelo para eliminarlo» (según Q21).

---

### User Story 7 - Foto de portada (Priority: P3)

Sara sube una foto de la playa a «Cartagena».

**Why this priority**: Pedida, pero no es dinero y tiene su propio ADR; Planes funciona sin ella.

**Independent Test**: Subir una foto de iPhone con ubicación y comprobar que lo guardado no tiene EXIF ni GPS, que pesa dentro del límite y que solo la pareja la puede leer.

**Acceptance Scenarios**:

1. **Given** una foto HEIC de 4 MB con GPS, **When** Sara la sube desde un navegador que la decodifica (o el selector de archivos la entrega ya convertida a JPEG), **Then** lo guardado es un JPEG ≤ 2048 px sin metadatos, y la pantalla dice que la foto no va en la exportación. Si el navegador no puede decodificarla, ver el caso límite «Foto que no se puede decodificar» (Q17, ADR-014 `[V]` 3).
2. **Given** la foto de un plan compartido, **When** una tercera cuenta pide la portada por la ruta de lectura o el objeto directamente a Storage, **Then** se le niega.
3. **Given** un plan sin foto, **When** se muestra, **Then** usa el fallback: tinte, inicial en serif e ícono Phosphor, como GoalCard `[A]`.

---

### Edge Cases

- **Gasto anulado** en un plan: sale de todos los totales del plan y del histórico; la etiqueta se conserva para la auditoría.
- **Mover a Pareja** un gasto privado con plan: si el plan es compartido de esa pareja, el gasto compartido nuevo hereda la etiqueta en la misma operación atómica (ADR-001); si es privado, el gasto nuevo queda sin plan y la confirmación lo dice (según Q5 y Q6). Si el plan está **cerrado**: cuando es compartido, la etiqueta pasa igual; cuando es privado, la operación se bloquea y pide reabrirlo (según Q23). El Deshacer sigue la misma regla.
- **Deshacer** de Anotar o de Mover a Pareja: la etiqueta sigue al gasto o desaparece con él.
- **Salida de la pareja** (cuando exista, ADR-003): quien sale pierde el acceso a los planes compartidos y a sus fotos; sus gastos privados pierden la etiqueta de un plan que ya no ve.
- **Pareja provisional o descartada**: no se pueden crear planes compartidos (como el dinero compartido, 003 FR-010).
- **Plan con cientos de gastos**: lista paginada; los totales salen de una sola lectura consistente.
- **Nombre largo** (hasta 60 caracteres): sin desbordes a 360 px ni con texto al 200 %.
- **Dos personas editan el plan a la vez**: la segunda escritura con versión vieja falla y lo explica (como 16.15).
- **Foto que no se puede decodificar** (HEIC en un navegador sin soporte): mensaje claro de formato no compatible y fallback; no se sube nada a Storage ni se crea una portada.
- **Gasto con fecha futura** (16.13): se puede asociar.
- **Ingresos y liquidaciones**: nunca llevan plan.
- **Gasto de un plan cerrado**: su importe se puede editar desde Actividad y el total del plan cerrado lo refleja (según Q12). Anularlo también se permite: sale del total y la etiqueta se conserva (según Q22). Moverlo a Pareja sigue la regla de Q23.
- **Cerrar mientras otra persona asocia un gasto**: el cierre bloquea el plan. Una asociación concurrente que llegue después falla, no aplica nada y lo explica.

## Requirements *(mandatory)*

### Functional Requirements

#### Entidad y permisos (ADR-015, ADR-013)

- **FR-001**: Un plan tiene nombre (1–60 caracteres), fechas de inicio y fin opcionales (fin ≥ inicio), presupuesto opcional (entero positivo en COP; `null` ≠ 0), tipo visual opcional para el fallback `[P]`, foto de portada opcional (ADR-014) y estado `active | closed`.
- **FR-002**: Un plan es de una persona **XOR** de una pareja activa (según Q4). Los planes privados solo los ve y modifica su dueña; los compartidos, los dos integrantes activos.
- **FR-003**: Las tablas viven en `juntia_data`, se leen por vistas `security_invoker` en `public` y se escriben solo por funciones de `juntia_private`, con idempotencia, auditoría, versión y bloqueo del agregado (ADR-013).
- **FR-004**: Crear, editar, cerrar, reabrir y eliminar un plan quedan en `audit_events` con actor e instante. No se crea otro sistema de auditoría: el PR A amplía con una migración versionada las restricciones de `audit_events` (`entity_type` y `action`) y de `idempotency_records.action`, y añade `visible_to_user_id`. Se conservan la regla de solo inserción, los permisos y la ausencia de lectura para `authenticated`. Hay pgTAP para las cinco operaciones (ADR-015 §1; F94-6).
- **FR-005**: La auditoría compartida de un plan compartido nunca guarda un dato derivado de gastos privados: ni recuentos, ni ids. Lo que dependa de privados va en un evento con `visible_to_user_id` = su dueña. Esa columna clasifica, pero no da permisos ni filtra. Hoy nadie lee `audit_events` desde la app, y un lector autorizado futuro tendrá que filtrar por ella antes de devolver filas, conteos o fechas. La confirmación previa de eliminar se lee de las tablas del plan, nunca de la auditoría (ADR-015 §5; F94-1 y F94-8).

#### Relación con los gastos (ADR-015)

- **FR-010**: Un gasto (`type = 'expense'`) tiene **como máximo un plan**. Ingresos y liquidaciones nunca llevan plan.
- **FR-011**: La etiqueta **no cambia** el importe, el contexto, el reparto, la categoría, la fecha ni el pagador, y **no** altera `group_total`, `personal_consumption`, `gross_paid`, `net_owed`, los presupuestos mensuales, las cinco métricas DEC-G04 ni Análisis. Una prueba lo comprueba comparando las cifras con y sin etiqueta.
- **FR-012**: Reglas de compatibilidad (según Q5 y Q6), impuestas en la base de datos: un gasto compartido solo admite un plan compartido de su misma pareja; un gasto privado admite un plan privado de su dueña y un plan compartido de una pareja activa de la que su dueña es integrante.
- **FR-013**: Asociar, cambiar o quitar el plan de un gasto es una operación atómica e idempotente, auditada; la puede hacer quien puede editar el gasto (la dueña en privados; cualquiera de los dos en compartidos, como 20.12). No sube la versión del gasto (según Q15). **Se rechaza si el plan de origen o el de destino está cerrado** (según Q12), también si se llama directamente a la API.
- **FR-014**: «Añadir gastos» asocia varios gastos en una sola operación; si uno no es compatible o cambió, o si el plan está cerrado, la operación no aplica ninguno y lo explica.
- **FR-015**: Mover a Pareja y su Deshacer conservan o quitan la etiqueta en la misma transacción, según el Edge Case correspondiente.

#### Privacidad (§2.3.6, §7.4, US-05)

- **FR-020**: Ninguna vista, función, agregado, recuento, fecha de actualización, error, exportación o evento de analítica revela a la otra persona un gasto privado asociado a un plan compartido.
- **FR-021**: **Todas** las cifras del detalle de un plan compartido se calculan con un filtro explícito y exclusivo: los gastos compartidos activos de esa pareja. Son el total, el desglose y sus porcentajes, el presupuesto, «pagó», «le corresponde» y «diferencia». Ese filtro deja fuera también los privados de quien consulta, y la RLS es una defensa adicional, no el filtro (ADR-015 §4; F94-3). Los privados propios se muestran aparte, rotulados «Solo tú lo ves», y nunca se suman a una cifra compartida (según Q6 y Q9).
- **FR-022**: pgTAP prueba, con tres cuentas (dueña de los privados, pareja y tercera), cada vista y función de Planes, incluida la llamada directa sin filtros de cliente.

#### Detalle del plan

- **FR-030**: Héroe: «Gastaron en {plan}» (compartido) o «Gastaste en {plan}» (privado) con el total del FR-021. Nunca `total_destinado_neto`, nunca aportes ni liquidaciones.
- **FR-031**: Presupuesto (según Q8 y Q9): sin presupuesto, nada; con presupuesto, consumido, porcentaje, «Quedan $X» o «Se pasaron por $X», y «Cerca del límite» desde el 85 %, con texto y forma además de color. Nunca «te alcanza» ni «puedes gastar» (DEC-R17).
- **FR-032**: Desglose por categoría (según Q11), con `CategoryIcon`.
- **FR-033**: «Quién pagó» (según Q10): por persona, «pagó» y «le corresponde» dentro del plan, y «Diferencia en este plan»; enlace al balance de la pareja; sin «le debe» ni liquidar por plan. Solo en planes compartidos. «Pagó» y «le corresponde» son las cifras derivadas del plan `plan_paid` y `plan_share`, nunca `gross_paid` ni las asignaciones guardadas (ADR-015 §4; F95-1). Un gasto pagado con una meta compartida aparece como una línea propia, «Pagado con la meta {meta}», que no se asigna a nadie, y cuenta completo en el total y en el desglose (según Q24 y Q7). La parte cubierta con la meta (U, solo usos aplicados y no anulados) no se atribuye a nadie: `plan_paid` del pagador suma A − U y `plan_share` reparte A − U con la proporción de las asignaciones originales, en cualquier modo de reparto, con el mayor residuo y el desempate de ADR-002 (F95-2). Las cifras del plan se recalculan cuando U cambia; `gross_paid`, `transaction_allocations`, `net_owed`, Balance y DEC-G04 no cambian. Lo cubre la matriz de Q24 de US-2. La «Diferencia en este plan» es informativa y puede no coincidir con lo que ese gasto mueve en Balance, que conserva el reparto completo y sigue siendo el único saldo real de la pareja.
- **FR-034**: Lista de gastos del plan con el mismo `ExpenseRow` de Actividad y la marca «Pagado con una meta» cuando aplique.
- **FR-035**: Foto de portada o fallback (ADR-014; fallback como GoalCard `[A]`).

#### Lista, histórico y navegación

- **FR-040**: Planes vive donde diga Q3. Activos primero; cerrados en «Histórico», del más reciente al más antiguo, con nombre, fechas y total compartido.
- **FR-041**: En Yo se ven los planes privados propios y, aparte, los compartidos; en Nosotros, solo los compartidos (como 22.11).
- **FR-042**: Cerrar y reabrir (según Q12): manual y reversible. En un plan compartido, lo puede hacer cualquiera de los dos. Es idempotente y queda auditado.
- **FR-043**: Un plan cerrado **queda bloqueado** (según Q12):
  - la base de datos rechaza editar su nombre, sus fechas, su presupuesto o su foto, y asociarle o quitarle gastos;
  - la interfaz no ofrece esas acciones y explica que hay que reabrirlo;
  - su total **sí** cambia si se edita el importe de uno de sus gastos (según Q12) o si se anula uno; en ese caso la etiqueta se conserva (según Q22);
  - no se puede eliminar: primero se reabre (según Q21).
- **FR-044**: Eliminar un plan según Q14, solo si está activo (según Q21).
- **FR-045**: Mover a Pareja un gasto privado que está en un plan cerrado (según Q23):
  - si el plan es compartido de esa pareja, la etiqueta pasa al gasto nuevo en la misma operación atómica. No cuenta como una asociación y no requiere reabrir el plan;
  - si el plan es privado, la operación se rechaza antes de anular nada y pide reabrirlo.

  El Deshacer sigue la misma regla.

#### Anotar y Editar

- **FR-050**: Selector de plan según Q18: opcional, cerrado por defecto, sugerencia sin preselección, solo planes **activos** y compatibles con el contexto elegido, «Crear plan» al final; un plan cerrado nunca aparece (según Q12).
- **FR-051**: Cambiar de contexto en Anotar descarta un plan que deje de ser compatible y lo dice.
- **FR-052**: Editar gasto muestra el campo «Plan» para poner, cambiar o quitar el plan, y solo ofrece planes activos (según Q12). Si el gasto está en un plan cerrado, el campo es de solo lectura y dice «{plan} está cerrado. Reábrelo para quitar este gasto». El resto del gasto se edita como siempre.
- **FR-053**: Actividad muestra la etiqueta del plan en la fila, sin cambiar su altura a 390 px `[P]`.

#### Fotos (ADR-014)

- **FR-060**: Una portada por plan y por meta (según Q16), en un bucket privado de Supabase Storage con RLS por dueña o pareja. Cada portada es una unidad lógica con dos variantes, `full` y `thumb`. Se lee por una ruta autenticada de la app que comprueba la autorización vigente en cada petición, con `Cache-Control: private, no-cache` y ETag (ADR-014 §2; F94-2 y F94-4). Que los fundadores prefieran URL firmadas sería una excepción a §5.5 que tendrían que decidir ellos.
- **FR-061**: Límites, formatos y eliminación de metadatos según Q17 y ADR-014; el servidor rechaza lo que no cumpla.
- **FR-062**: Reemplazar o quitar la foto borra el objeto anterior; eliminar el plan borra su foto.
- **FR-063**: Copias, exportación y borrado de cuenta según Q19.

#### Copy, accesibilidad, responsive y motion

- **FR-070**: Todo el copy nuevo en `src/lib/copy/es.ts` (CONVENTIONS B.1), con las palabras prohibidas de GLOSSARY §9.
- **FR-071**: Diseño a 390 y 1440 px, sin estirar el móvil; estados vacío, carga, error, sin presupuesto, excedido, cerrado, sin foto, con foto, muchos gastos y nombres largos; WCAG AA; texto al 200 %; movimiento reducido; iconos Phosphor con `AppIcon`.
- **FR-072**: Las pantallas salen del prompt de Claude Design de `specs/006-planes/design-prompt.md` y sus `[P]` se aprueban viendo la pantalla.

#### Pruebas y CI

- **FR-080**: Dominio: total del plan, presupuesto (sin, dentro, cerca, excedido), desglose y pagó/corresponde, con un dataset fijo que la etapa Plan define. Para Q24, además:
  - la matriz de Q24 de US-2, en dominio y en integración de servidor, incluidos los dos casos de solicitud pendiente (sin y con fondos propios aplicados), el rechazo que conserva lo propio y la suma de los dos asientos vivos de la misma meta al aprobar (F95-5), cada uno con las dos comparaciones de la matriz (F95-6): **invariancia por etiqueta** (el mismo escenario con y sin etiqueta da `gross_paid`, `net_owed`, `transaction_allocations`, Balance y DEC-G04 idénticos) y **transición de financiación** (antes y después de aprobar, quitar, editar o anular, las métricas canónicas cambian exactamente como dice la spec 004, igual con y sin etiqueta);
  - `plan_share` con uso de meta en los tres modos de reparto (F95-2): 50/50 con una base A − U impar en pesos (p. ej., A = $400.001 y U = $150.000: $125.001 y $125.000, el peso sobrante a quien entró antes en la pareja); Porcentaje 70/30; Importe $300.000 + $100.000 con U = $150.000 ($187.500 y $62.500); e Importe con una asignación de $0, que da 0;
  - en todos, Σ `plan_paid` + Σ líneas de meta = total, Σ `plan_share` = Σ `plan_paid`, y `transaction_allocations` sin modificar.
- **FR-081**: pgTAP: RLS de planes y etiquetas con tres cuentas, compatibilidad de FR-012, idempotencia, eliminación sin tocar gastos, Storage con tres cuentas.
- **FR-082**: Ninguna spec E2E nueva: MVP-2 mantiene el tope de P0 (según Q20). El bloqueo del plan cerrado se prueba en dos capas:
  - pgTAP, con llamadas directas a la API;
  - pruebas de componentes.

#### Fuera de alcance (explícito)

- Liquidar por plan; saldos o deudas por plan.
- Presupuesto por categoría dentro de un plan.
- Varios planes por gasto; planes anidados.
- Enlace entre un plan y una meta de ahorro (p. ej. «Viaje a Japón») `[P]`, a valorar después.
- Recibos o adjuntos por gasto (`attachments`, §7.3): no son portadas y no entran en ADR-014.
- Multimoneda, conversión y gastos en el extranjero con otra moneda (P2).
- Grupos de más de dos personas (P1).
- Sugerencias automáticas de plan por ubicación, IA u OCR.

### Key Entities *(ADR-015 y ADR-014, aceptados)*

- **Plan** (`juntia_data.outings`): id, `owner_user_id` XOR `group_id`, nombre, `starts_on`, `ends_on`, `budget_minor` (nullable), `outing_type` `[P]`, `cover_photo_id` (nullable), `status`, `version`, `created_by`, auditoría.
- **Etiqueta de plan de un gasto** (`juntia_data.outing_transactions`): `transaction_id` (único: un plan por gasto), `outing_id`, `tagged_by`, `tagged_at`. Tabla aparte de `transactions` (ADR-015 §2).
- **Foto de portada** (`juntia_data.cover_photos`, ADR-014): id, propietaria XOR pareja, `full_path` y `thumb_path` (rutas deterministas bajo `…/{cover_id}/`), bytes y `sha256` de cada variante, ancho, alto, focal point `{x,y}`, `status` (`pending | ready`) y `created_by`. Las dos variantes son una sola portada lógica: se suben, reemplazan, borran, barren y restauran juntas (ADR-014 §2 y §5).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con y sin etiqueta de plan, todas las cifras de Inicio, Balance, presupuestos mensuales, Análisis y DEC-G04 son idénticas en el dataset de la etapa Plan (prueba de dominio e integración).
- **SC-002**: Cero fugas: ninguna consulta de la otra cuenta ni de una tercera devuelve dato alguno de un gasto privado asociado a un plan compartido (pgTAP con tres cuentas).
- **SC-003**: El gasto habitual sin plan sigue en mediana < 10 s en teléfono real (US-12); con la sugerencia del plan, un toque más como máximo.
- **SC-004**: Eliminar un plan deja todos sus gastos con el mismo importe, reparto, contexto, categoría, fecha y versión.
- **SC-005**: Ninguna foto guardada conserva EXIF, GPS ni XMP, y ninguna supera el límite de ADR-014.
- **SC-006**: Los dos fundadores leen correctamente, sin ayuda, el total, el presupuesto y «quién pagó» de un plan real, y ninguno interpreta la diferencia del plan como una deuda.
- **SC-007**: Sin scroll horizontal en 360, 390, 430, 1024 y 1440; CLS = 0 en las cargas con skeleton (§15.7, con la excepción 26.1).

## Assumptions

- MVP-1 está declarado antes de empezar a implementar; la spec 005 y sus excepciones siguen vigentes.
- La pareja es de exactamente dos (§15.5); el modelo se escribe para N como el resto del dominio.
- Supabase sigue en plan Free (16.10) cuando se implemente; los límites de Storage se verifican entonces (ADR-014 `[V]`).
- El repositorio es público (25.1): este documento no contiene datos reales ni secretos; los ejemplos son hipotéticos.
- Las cifras de los escenarios (Cartagena, $3.000.000) son hipotéticas y no forman parte del dataset dorado de MVP-1.

## Lo que hace falta para pasar a Plan

1. ~~Que las respuestas Q1–Q23 queden registradas como decisión del maestro §15.10.~~ **Hecho:** decisión 27, en el PR documental posterior al #94, con Q24 incluida.
2. ~~Que ADR-014 y ADR-015 pasen a Aceptado.~~ **Hecho** en ese mismo PR, con fecha del 25 de noviembre de 2026.
3. ~~Que la revisión del PR #94 termine sin hallazgos abiertos.~~ **Hecho:** cuatro rondas, F94-1 a F94-10 cerrados; mergeado el 25 de noviembre de 2026.
4. ~~Que los fundadores confirmen la lectura de «le corresponde» de Q24.~~ **Hecho:** confirmada el 25 de noviembre de 2026, junto con el matiz de Balance.
5. Que los fundadores aprueben los comps de Claude Design (`design-comps.md`), con los **tres** ajustes obligatorios hechos (la foto de 15 MB, la variante de eliminar con 13 gastos y la línea de Q24 en «Quién pagó» de 06·3), con la decisión `[P]` sobre el total compartido en Yo tomada y con sus demás `[P]` marcados.
6. Que MVP-1 esté declarado (spec 005).
