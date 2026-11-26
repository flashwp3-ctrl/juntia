# Comps de diseño · 007 Recurrentes y calendario

**Estado: aprobados** el 26 de noviembre de 2026 por los dos fundadores, que
hicieron la evaluación visual ese día (maestro §15.10, decisión 29.14; su texto,
literal, en «Aprobación de los fundadores»). **Q15 se cerró en (b)**, con la
variante b2; P-1 a P-14 quedan decididas y C-1 a C-8, respondidas. Los comps salen
del prompt de `design-prompt.md`, en su versión con GO de la revisión del PR #113,
tuvieron el GO de la revisión del PR #114 y no deciden el alcance. La aprobación
visual **no verifica** las `[V]` de abajo, que siguen abiertas. Este documento
sigue el esquema de `specs/006-planes/design-comps.md`.

**Jerarquía** (`AGENTS.md` §2). De mayor a menor:

1. el maestro y sus decisiones (§15, en especial las decisiones 28 y 29);
2. los ADR (ADR-016, ADR-017 y ADR-018, y los anteriores que citan) y los
   contratos de dinero y privacidad;
3. el sistema de diseño de `docs/design/` y las convenciones de
   `docs/CONVENTIONS.md` y `docs/GLOSSARY.md`;
4. la spec 007;
5. los comps.

Lo que salía de los comps era **propuesta** `[P]` hasta que los fundadores lo
aprobaran viendo las pantallas (FR-082; maestro §15.9), y lo aprobaron el 26 de
noviembre de 2026 (29.14). Los comps **no deciden el alcance**, y **un comp no
modifica un ADR**, ni la spec, ni una decisión: si un comp contradice algo de más
arriba, manda lo de arriba. Con la aprobación y el cierre de Q15 queda cumplido el
punto 5 de «Lo que hace falta para pasar a Plan» (decisión 29.10). Ni la aprobación
de los comps ni este documento autorizan el Plan, las Tasks ni la implementación:
siguen la precedencia de MVP-1, de Planes y de N-8 (28.18).

## Dónde están

Están en el proyecto de Claude Design `caabf357-a0df-4048-886f-8c46c8979c5a`
(«Juntia: Responsive design y design system»), el mismo de Planes, repartidos en dos
páginas:

| Archivo | Pantallas |
| --- | --- |
| «Juntia DS v1 - 11a Recurrentes 07-1-07-7.html» | 07·1 Lista · 07·2 Crear · 07·3 Detalle · 07·4 Editar · 07·5 Cambiar frecuencia · 07·6 Calendario y Q15 · 07·7 Por confirmar, Inicio y Plan |
| «Juntia DS v1 - 11b Recurrentes 07-8-07-15.html» | 07·8 Confirmar · 07·9 Vincular y la cadena de P6 · 07·10 Omitir y deshacer · 07·11 Ciclo de vida · 07·12 Aportes programados · 07·13 Actividad · 07·14 Atajos (presets) · 07·15 Vacíos y límites |

Las dos páginas comparten el código de la carpeta `recurrentes/` del proyecto: los
tokens de I2, copiados de `src/styles/tokens.css`, los componentes, los datos de
ejemplo y una sección por pantalla. Cada sección lleva sus notas «Lo que proponemos»
`[P]` y «Por verificar y reglas que aplica» `[V]`.

Los comps viven en Claude Design, como los de Planes. A diferencia de Planes, hay
una **captura PNG por sección** en `comps/` (de `07-01.png` a `07-15.png`), para
revisarlos sin acceso al proyecto. Son capturas a escala 1, comprimidas con paleta.
No sustituyen a los comps: si difieren, mandan los del proyecto.
Sus cifras son hipotéticas (`design-prompt.md`, «Datos de ejemplo») y pueden no
coincidir con las de los escenarios de la spec: las pruebas usan las de la spec.

## Cómo se hicieron, y en qué se diferencian de los de Planes

- **Los escribió Claude Code** con el conector de Claude Design, a partir del prompt,
  una vez que los fundadores iniciaron sesión. No los generó el asistente de Claude
  Design, como en Planes.
- **Son páginas HTML con React** (`.html` y la carpeta `recurrentes/`), no `.dc.html`.
  Se pueden ver y comentar en Claude Design, pero sus textos no se editan con clic en
  el editor de componentes. Un ajuste se pide por comentario o se hace en el código
  de `recurrentes/`.
- **Cada marco móvil mide 390 px de ancho y crece con su contenido**: una pantalla
  larga, o una hoja larga, se ve entera en lugar de cortada a 844 px. Los de
  escritorio miden 1440 px. Cada estado está en claro y en oscuro.
- **Formato aceptado por los fundadores** (26 de noviembre de 2026): HTML con React,
  con los ajustes por comentarios y no con edición directa. Aceptar el formato **no**
  es aprobar visualmente los comps: la aprobación visual llegó después, el mismo
  día (29.14).
- **Datos añadidos**, ficticios, para ilustrar los casos que pide el prompt y que sus
  datos de ejemplo no cubrían:
  - Mantenimiento de bicicleta: archivada, con una pendiente que reapareció por D1;
  - Clases de natación: sin historia;
  - Clases de piano: N′ = 0;
  - Revista digital: finalizada a mano;
  - Bono de mitad de año: una sola fecha ya confirmada;
  - la pausa del 3 de junio al 28 de julio de la Cuota inicial;
  - la cuota 12, omitida por adelantado;
  - las omisiones de Peluquería en agosto y diciembre;
  - los gastos sugeridos en 07·9.

  No cambian las cifras de Q15 del prompt.

## Anchos y temas: qué hay y qué se revisó

**Anchos** (F114-13). Son tres afirmaciones distintas:

- **cada sección** tiene representación móvil (390 px) y de escritorio (1440 px);
- **cada estado** está en claro y en oscuro (abajo);
- **no todos los estados** tienen su propio comp a 1440. El escritorio de cada
  sección muestra su pantalla principal, o un estado representativo en Modal, y los
  demás estados se ven a 390. No se duplican comps en escritorio.

**Temas.** Son dos cosas distintas, y aquí se separan (F114-9).

- **Está en los dos temas.** Desde la ronda 2 de la revisión del PR #114, todos los
  comps (cada pantalla y cada estado) están en claro y en oscuro. Lo comprueba un
  recuento automático de los pies de las dos páginas: 61 en claro y 61 en oscuro en
  la 11a, y 76 y 76 en la 11b, sin ningún comp de un solo tema.
- **Se revisó visualmente en los dos temas**, mirando las capturas de `comps/`:
  - 07·2: todos sus estados;
  - 07·5: cancelación, rechazo y resultado desconocido;
  - 07·8: rechazo, advertencia, resultado desconocido y borrador de un estimado;
  - 07·9: rechazo genérico, resultado desconocido y la cadena de P6;
  - 07·11: acciones destructivas.

  Además, se midió el contraste de los botones primario, secundario y de peligro en
  los dos temas: todos superan 4,5:1. En el resto de pantallas, la versión oscura
  existe, pero su revisión visual queda como `[V]` (abajo).

## Cobertura por pantalla

Qué pide cada pantalla y de dónde sale. Cada sección tiene comps a 390 y a 1440 px;
cada estado está en claro y en oscuro, pero no todos tienen su propio comp a 1440
(«Anchos y temas», arriba). Incluyen carga, vacío y error, y contraste WCAG AA (FR-081; `AGENTS.md` 10 y
11). Las escrituras de 07·5, 07·8 y 07·9 enseñan los cuatro estados del contrato
de `use-write.ts`: guardando, éxito, rechazo confirmado y resultado desconocido con
«Comprobar estado» y «Reintentar» sobre la misma intención idempotente (ADR-013).

| Pantalla | Qué cubre | Spec | ADR |
| --- | --- | --- | --- |
| **07·1 Lista de recurrencias** | Lista por tipo; Yo con las privadas propias y las de la pareja aparte, sin total ni recuento común; Nosotros solo lo compartido; estados de la regla; ruta hija de Plan | FR-002, FR-003, FR-040, FR-060 a FR-062; US1, US4.2; Q8, Q14 | ADR-016 §6.1 (estados derivados), §11 (privacidad); ADR-017 §6 |
| **07·2 Crear una recurrencia** | Tipo; «Solo yo» por defecto y compartir como acción explícita; responsable distinto de quien paga; importe según el tipo y la certeza (fijo → fijo, estimado → rango, condicional → fijo, rango o desconocido); condición ≤ 140; ingreso solo en Yo; aporte siempre privado, solo fijo y con modo de aporte; contexto inmutable; frecuencias, quincenal 1–15 y 16–31, día de referencia; fin por fecha o por N; fecha inicial pasada | FR-001, FR-003, FR-008, FR-009 a FR-009b, FR-020, FR-023, FR-030, FR-060; US1.1, US1.4, US5.2, US6.3; Q7, Q8, Q9, Q10, Q11, Q13; 28.11 | ADR-016 §3.2, §3.3 (P1); ADR-017 §1 (combinaciones permitidas); ADR-018 §1 (P1(a), `funding_mode`) |
| **07·3 Detalle de una recurrencia** | «Cuota n de N» solo con N; posiciones consumidas sin presentarlas como pagadas ni pendientes; terminó sola frente a finalizada; pendientes de una archivada o finalizada, visibles y resolubles; responsable y pagador; autoría en compartidas; no se edita una regla cerrada | FR-002, FR-018, FR-035 a FR-037, FR-042; US7.1 a US7.3, US7.5; Q13, F101-8 iii, F101-15 | ADR-016 §4, §6.1, §6.3, §6.6 (P5) |
| **07·4 Editar** | Editables y de solo lectura según ADR-016 §3.4 («Qué es editable»): contexto, tipo, meta y frecuencia de solo lectura; modo del aporte editable; la fecha de una regla de una sola fecha solo sin hechos y posterior a hoy; vista previa; instancias que aparecen o desaparecen; límites al reducir N o la fecha final, con su error; omisiones con datos fijados; conflicto de versión | FR-003, FR-004, FR-005; US1.5, US4.3; Q6, P2, P7, F101-11 | ADR-016 §3.4 («Qué es editable», regla de una sola fecha, puntos 1 a 7), §4, §6.1 (límites al reducir), §7.1; ADR-018 §1 |
| **07·5 Cambiar frecuencia** | Un solo paso, atómico e idempotente; con historia (por existencia de filas) se finaliza a mano y sin historia se elimina; origen de la nueva y por qué; lo que cubre la anterior junto al calendario nuevo, sin deduplicar; cancelación explícita de las sin resolver; N′ y el caso N′ ≤ 0; aporte con meta inactiva; estados de escritura | FR-005, FR-076; P2 | ADR-016 §3.4 («Flujo Cambiar frecuencia: contrato», 1 a 3), §6.3 («con historia»); ADR-018 §3.2 |
| **07·6 Calendario** | Lista por fecha con flechas de mes en móvil, sin cuadrícula; mes actual y siguiente; formas del importe; condición; «cuota n de N»; acciones según el estado; sin movimientos reales sin instancia; escritorio en dos variantes; paso 4 de la cadena de P6 en Nosotros | FR-040 a FR-044, FR-022; US3.1 a US3.3, US3.5, US5.1, US5.5; Q14, N-6, F101-10 | ADR-017 §1 y §2; ADR-016 §5, §9 |
| **07·6 · Q15** | (a) sin total, completa y usable; (b) total de gastos sin resolver del mes por contexto, con rótulo exacto, solo en el calendario, en b1 y b2; ausencia sin cifra; casos solo fijos, solo estimados, D1 antes de su fecha, P6, consumidas por pausa y P7; `unknown_count` como contrato defensivo, sin comp | FR-045 a FR-047, FR-062; US3.4; Q15 | ADR-017 §3, §4 (P1(a), P2(a), P3(a), reglas 1 a 6, «Lo que deciden los comps»), §6, §7 |
| **07·7 Por confirmar, Inicio y Plan** | Lista de por confirmar, incluidas las reabiertas por D1 y las de reglas archivadas; módulo de Inicio solo con pendientes, descartable, sin culpa y sin importes; recuentos de un solo contexto; comparación de Tomás en Yo y en Nosotros con y sin las programaciones privadas de Sara | FR-050, FR-051, FR-060 a FR-062, FR-018; US8; Q16, P3(a), F101-2 | ADR-016 §5 (paso 4), §6.6, §11; ADR-017 §4 («Dónde se ve»), §6 |
| **07·8 Confirmar** | Precedencia: 1) rechazo si la instancia cambió (§7.1), sin crear nada; 2) sugerencias compatibles antes de crear, sin deduplicación automática; 3) toque único con importe fijo y certeza fija en ingresos, o borrador con los datos de la versión solo para estimado, desconocido o ingreso condicional; fecha efectiva ≤ hoy y fecha prevista aparte; Gasto con meta; comps de Internet con sugerencia y de instancia que cambió; estados de escritura; rechazos de ya resuelta y meta inactiva | SC-004; FR-012, FR-012a, FR-012b, FR-013, FR-014, FR-016, FR-019, FR-021; US2.1 a US2.6, US2.10, US2.11, US4.1, US4.4, US5.3, US5.4, US5.6; Q4, Q9, D2, F101-5, F101-6, F101-17 | ADR-016 §7.1 (`occurrenceChanged`), §7.2, §7.3 (`occurrenceAlreadyResolved`), §7.6; ADR-017 §2; ADR-018 §2, §4 (`goalNotOpen`) |
| **07·9 Vincular** | Filtro duro de §7.4 en sugerencias y búsqueda (tipo, contexto, meta y aportante, activo y no anulado, fecha efectiva ≤ hoy, sin vínculo previo ni otra instancia del mismo contexto); sugerencias con la ventana de §7.6 y como mucho tres; búsqueda manual sin ventana y paginada; nunca automático; error genérico; cadena de P6, con el Deshacer dentro de los 60 s y las condiciones de ADR-001; deshacer un vínculo no anula un movimiento previo | FR-012b, FR-014, FR-014a, FR-015, FR-018a; US2.5 a US2.7, US2.12; Q4 (b), F101-1, F101-19 | ADR-016 §7.4, §7.6, §9 (P6) |
| **07·10 Omitir y deshacer** | Omitir por confirmar y por adelantado, sin prometer que siempre se deshace; precedencia en cuatro pasos (regla cerrada, pausa, reapertura por D1, fecha fijada); P7; P4; aviso antes de omitir en una regla archivada; comps del Curso de inglés y de Streaming | FR-017 (con D1); US2.8, US2.13; D1, D3, D4, D5, F101-14, F101-18, P4, P7 | ADR-016 §5 (paso 4), §6.4 (precedencia y P7), §6.5 (P4), §6.6 |
| **07·11 Pausar, reanudar, finalizar y eliminar** | Pausa simple y de compromiso finito con vista previa; reanudar sin recuperar; finalizar con la lista exacta según P3; eliminar sin historia (se borra, sin lista) o con historia por existencia de filas (se archiva con lista); comp de Clases de yoga; terminó sola | FR-006, FR-007, FR-036, FR-038, FR-038a, FR-076; US7.2, US7.4, US7.5; Q18, D5, D6, P3 | ADR-016 §6.1 a §6.3 (vista previa de la pausa: «el texto es de los comps»; P3; «con historia»); ADR-018 §4 |
| **07·12 Aportes programados** | Metas intacta como variante base; programación en el detalle de la meta solo en la variante de C-6, en Yo de Sara; en Nosotros y para Tomás, solo aportes confirmados sin procedencia; confirmar con toda la precedencia de 07·8, incluidas las sugerencias de aportes manuales compatibles; pausa por meta lograda o archivada; sin confirmar aportes nuevos; vínculo de P2(b) solo si cumple todo §7.4; el 100 % no pausa | FR-030 a FR-034a; US6.1 a US6.6; Q12, D7, F101-2, F101-7, F101-16 | ADR-018 §1, §2, §3.2, §4, §5, §6 (P2(b)); ADR-016 §7.4, §10 |
| **07·13 Actividad** | Enlace a la instancia solo para quien la tiene; cadena de P6 vista por Tomás y por Sara; texto de la reabierta por anulación, solo para la dueña; fila sin cambio de altura | FR-018, FR-018a (con P6), FR-019, FR-061; US2.9, US2.12; N-6, F101-2, F101-3, F101-13 | ADR-016 §8 («Lo que Beto ve»), §9 |
| **07·14 Presets** | Fila opcional en Anotar sin pasos nuevos; rellena y nunca guarda; creación a mano y desde un movimiento con los campos permitidos; privado por defecto; tope; fuera del calendario, los avisos y el total | FR-070 a FR-075; US9; Q17, 28.6 | — (el Plan decide la entidad; 28.6) |
| **07·15 Vacíos y límites** | Sin recurrencias en Yo y en Nosotros sin «$0»; sin pareja; todo confirmado; 30 por confirmar; nombre de 60 y condición de 140; rango y desconocido; error de red al cargar, distinto del resultado desconocido; skeleton; 200 % | FR-062, FR-081 | ADR-017 §1 y §2 (desconocido nunca $0) |

**Fuera de los comps, a propósito:** saldos, liquidez, amortización, proyecciones,
previsto frente a real, ingreso compartido, push y correo, grupos de más de dos
(spec, «Fuera de alcance»). La exportación y el borrado (FR-078) no tienen pantalla
nueva: siguen los de MVP-1.

## Aprobación de los fundadores (26 de noviembre de 2026)

Los dos fundadores hicieron la evaluación visual de los comps el 26 de noviembre de
2026, con el GO de la revisión del PR #114, y el gestor transmitió su texto. Está
registrado en el maestro §15.10, decisión 29.14, y la spec 007 está reconciliada
(«Session 2026-11-26 · Comps»). Texto literal:

> Estamos de acuerdo con las recomendaciones, con las siguientes precisiones:
>
> Q15 y propuestas P-1 a P-14
>
> * Q15(b): sí al total mensual de gastos previstos.
> * P-2: b2, con los importes fijos y estimados separados. Una sola variante para todos, sin configuración adicional.
> * P-3: aprobamos el rótulo y la nota.
> * P-4 / Q2: aprobamos los nombres propuestos.
> * P-5: importe desconocido, nunca $0.
> * P-6: lista ancha con panel en escritorio.
> * P-7 a P-11: aprobados tal como están en los comps.
> * P-12: variante base, mantener Metas intacta.
> * P-13: importe vacío con el rango como ayuda.
> * P-14: Deshacer durante 6 segundos, conforme a C-3.
>
> C-1 a C-8
>
> * C-1: Inicio lleva a Por confirmar. No se confirma directamente desde Inicio ni se muestran allí importes previstos.
> * C-2: mantener «Por confirmar» como estado y «sin confirmar» en el rótulo del total.
> * C-3: Deshacer durante 6 segundos después de confirmar, no después de vincular. Debe contemplar gastos, ingresos y aportes, respetando el contrato de anulación correspondiente, las autorizaciones y la concurrencia. La instancia vuelve a Por confirmar conforme a D1. No se elimina la auditoría ni se amplían permisos.
> * C-4: descarte individual hasta que otra instancia autorizada del contexto correspondiente pase a Por confirmar. No puede revelar indirectamente programaciones privadas de la otra persona.
> * C-5: «7 de 24» como forma neutra.
> * C-6: mantener Metas intacta.
> * C-7: descartamos el badge en la pestaña Plan.
> * C-8: aviso previo con el número exacto de instancias pendientes, sin límite funcional arbitrario. Se conserva el modelo de cálculo de ADR-016, sin crear movimientos reales ni materializar instancias innecesariamente.
>
> Mantener abiertas todas las verificaciones [V].
>
> Registrar las decisiones en un PR exclusivamente documental, reconciliando la spec, el maestro, GLOSSARY, design-comps y los demás documentos que corresponda. No modificar ADR aceptados fuera de su procedimiento.
>
> No iniciar Plan, Tasks ni implementación. Se mantiene la precedencia de MVP-1, Planes y N-8.
>
> Enviar el nuevo PR a revisión adversarial independiente antes de fusionarlo.

## Propuestas `[P]`: decididas

| # | Qué | Origen | Opciones que mostraban los comps | Decisión (29.14) |
| --- | --- | --- | --- | --- |
| P-1 | **Q15: ¿existe el total de gastos previstos?** | Q15; 29.4; FR-045; ADR-017 §4 | (a) sin total, el respaldo; (b) con total, y entonces rigen P1(a), P2(a) y P3(a) de ADR-017 | **(b)**: «Q15(b): sí al total mensual de gastos previstos.» Entran en vigor P1(a), P2(a) y P3(a) de ADR-017 |
| P-2 | Si Q15 es (b): un solo rango o fijos y estimado por separado | ADR-017 §4, «Lo que deciden los comps» | b1 · b2 | **b2**: «b2, con los importes fijos y estimados separados. Una sola variante para todos, sin configuración adicional.» |
| P-3 | Si Q15 es (b): texto exacto del rótulo y de la ausencia | ADR-017 §4, reglas 1 y 5 | El que propongan los comps; la ausencia, sin cifra | «aprobamos el rótulo y la nota.» Son los de 07·6: «Gastos de {mes} sin confirmar · solo tuyos» o «· de la pareja», con su nota («Previstos y por confirmar de tus gastos privados. No es lo pagado ni dinero disponible.»), y la ausencia sin cifra («No hay gastos previstos por confirmar este mes.») |
| P-4 | Nombres visibles: ruta, instancia, estados de la instancia y de la regla, «cuota n de N» y el preset | Q2; FR-080 | Los de trabajo del prompt y las alternativas que proponga Claude Design | «P-4 / Q2: aprobamos los nombres propuestos.» Cierra Q2; están en `docs/GLOSSARY.md`. El preset es «Atajo»; la posición, «7 de 24» (C-5) |
| P-5 | Texto de «importe desconocido» | ADR-017 §1 y §2 | Nunca $0 ni un guion | «importe desconocido, nunca $0.» |
| P-6 | Escritorio del calendario | Q14 | (i) lista ancha con panel; (ii) cuadrícula mensual con lista | **(i)**: «lista ancha con panel en escritorio.» |
| P-7 | Cómo se reparten lista, calendario y «Por confirmar» dentro de la ruta | 28.8; Q16 | La que propongan los comps | «aprobados tal como están en los comps.» |
| P-8 | Lenguaje visual de lo previsto frente a lo real | A.2; FR-011; handoff (proyecciones punteadas) | El que propongan los comps, constante en todas las pantallas | Ídem |
| P-9 | Textos de la vista previa de la pausa de un compromiso finito | FR-038a; ADR-016 §6.3 | El que propongan los comps | Ídem |
| P-10 | Módulo de Inicio: forma y qué significa descartarlo | Q16; FR-050 | Ver C-4 | Ídem, con la respuesta a C-4 |
| P-11 | Fila de presets en Anotar | US9.3; US-12 | La que propongan los comps, sin pasos nuevos | Ídem |
| P-12 | La programación en el detalle de una meta | Q12; 28.8 | Metas intacta (base) o la variante de C-6 en Yo de la dueña | **Base**: «variante base, mantener Metas intacta.» |
| P-13 | Importe vacío en el borrador de un estimado | FR-012; ADR-017 §2 | Vacío con el rango como ayuda, o el que propongan los comps | «importe vacío con el rango como ayuda.» |
| P-14 | «Deshacer» en el toast tras confirmar | Ver C-3 | Con o sin, según C-3 | **Con**: «Deshacer durante 6 segundos, conforme a C-3.» |

## Lo que la aprobación cambia respecto a los comps

Los fundadores no pidieron ajustes, y los comps no se rehacen. Donde una decisión
descarta algo que los comps enseñan, manda la decisión:

- **07·6, Q15 (a) y b1:** quedan como contexto. Rige (b) en la variante b2.
- **07·6, escritorio (ii), la cuadrícula mensual:** descartada (P-6).
- **07·12b, la variante de C-6:** descartada (P-12 y C-6). Metas queda intacta.
- **«cuota 7 de 24»:** los comps lo escriben así en la Cuota inicial del
  apartamento, en varias pantallas (por ejemplo, 07·1, 07·3, 07·6 y 07·11). Con
  C-5, la forma de la posición es
  «7 de 24». La aprobación no dice si «cuota» se conserva en algún tipo de
  compromiso, y este documento no lo decide.
- **Errata de 07·2f** (encontrada al registrar C-8): con «Empieza 12 ago 2026» y hoy
  14 de noviembre de 2026, el aviso dice «quedan por confirmar: **3** (12 sep, 12
  oct, 12 nov)», pero la fecha del 12 de agosto también pasó: el número exacto es
  **4**. C-8 pide el número exacto, así que la implementación cuenta el 12 de
  agosto. El comp no se corrige en esta aprobación.

## Cuestiones para los fundadores que revela el diseño: respondidas

El prompt **no las cerraba**: pedía que los comps las enseñaran. Los fundadores las
respondieron el 26 de noviembre de 2026 (29.14). Se conserva cada pregunta tal como
se planteó, con su respuesta literal debajo. Ninguna respuesta cambia una decisión
de la 28 o la 29 ni un ADR; lo que necesita detalle técnico queda para el Plan, y
si exigiera cambiar un contrato aceptado, irá a un ADR antes del Plan.

- **C-1 · Confirmar «desde el aviso» sin mostrar importes en Inicio.** SC-004 dice
  que confirmar cuesta un toque «desde el calendario o el aviso», y Q4 exige, en un
  ingreso fijo, confirmar explícitamente el importe mostrado. Pero FR-050 (con
  P3(a)) dice que el módulo de Inicio no incorpora importes previstos. El prompt
  resuelve el diseño sin tocar nada: el módulo de Inicio solo lleva a «Por
  confirmar», y el toque único ocurre allí. **Pregunta:** ¿«el aviso» de SC-004 es
  la entrada «Por confirmar» de Recurrentes, y no el módulo de Inicio? Si los
  fundadores quisieran confirmar desde Inicio, el módulo tendría que mostrar el
  importe de cada instancia, y eso pide revisar FR-050.
  **Respuesta (29.14):** «Inicio lleva a Por confirmar. No se confirma directamente desde Inicio ni se muestran allí importes previstos.» «El aviso» de SC-004 es la entrada «Por confirmar» de Recurrentes. Spec: SC-004 y FR-050. Como en 07·7.
- **C-2 · «Por confirmar» significa dos cosas.** Como nombre de trabajo (Q2),
  «Por confirmar» es la instancia pendiente de resolución, porque llegó su fecha o
  porque volvió a quedar pendiente conforme a D1 o P6. El rótulo del
  total de P1(a) también debe decir «por confirmar» (ADR-017 §4), pero ese total
  incluye además las **previstas** futuras del mes. El prompt pide un rótulo que no
  los confunda («sin confirmar»). **Pregunta:** aprobar con los comps un texto
  para cada uno, o cambiar el nombre de trabajo de la instancia pendiente de resolución.
  **Respuesta (29.14):** «mantener «Por confirmar» como estado y «sin confirmar» en el rótulo del total.» Spec: Q2 y FR-045; `docs/GLOSSARY.md`. Como en 07·6.
- **C-3 · Deshacer una confirmación o un vínculo.** La spec no dice si el toast de
  confirmar lleva «Deshacer». Si lo lleva, deshacer sería **anular** el movimiento
  creado, y la instancia volvería a por confirmar por D1, con su auditoría. Anotar
  ya tiene un «Deshacer» de 6 s (COMPONENT_SPECIFICATIONS, «Anotar gasto», E5), pero
  no está dicho si confirmar lo hereda. Tras **vincular**, en cambio, no se creó
  nada: ningún comp puede interpretar «Deshacer un vínculo» como anular un
  movimiento que ya existía. Si quitar un vínculo es posible, y cómo, no lo dice la
  spec. **Pregunta:** ¿con o sin Deshacer en cada caso? Queda abierta.
  **Respuesta (29.14):** «Deshacer durante 6 segundos después de confirmar, no después de vincular. Debe contemplar gastos, ingresos y aportes, respetando el contrato de anulación correspondiente, las autorizaciones y la concurrencia. La instancia vuelve a Por confirmar conforme a D1. No se elimina la auditoría ni se amplían permisos.» Spec: FR-013a. Como en 07·8i (con Deshacer) y 07·9 (sin Deshacer tras vincular). **Para el Plan:** cómo cumple cada anulación sus autorizaciones y su concurrencia, sin cambiar ADR-016 ni ADR-018 (spec, «Session 2026-11-26 · Comps»).
- **C-4 · Qué es «descartable» en el módulo de Inicio.** Q16 lo pide descartable,
  pero no dice hasta cuándo. Propuesta del prompt `[P]`: se oculta para quien lo
  descarta hasta que otra instancia pase a por confirmar, y cada persona descarta
  el suyo. **Pregunta:** confirmarlo o elegir otra regla. Si guardar el descarte
  necesita datos nuevos, lo decide el Plan.
  **Respuesta (29.14):** «descarte individual hasta que otra instancia autorizada del contexto correspondiente pase a Por confirmar. No puede revelar indirectamente programaciones privadas de la otra persona.» Spec: FR-050. **Para el Plan:** dónde se guarda el descarte.
- **C-5 · «Cuota n de N» fuera de las deudas.** FR-042 y US7.1 dicen «cuota n de
  N» (o el texto que se apruebe, Q2). Para una suscripción con fin, «cuota» suena a
  deuda. El prompt pide también una forma neutra («7 de 24»). **Pregunta:** cuál se
  usa, y si depende del tipo.
  **Respuesta (29.14):** ««7 de 24» como forma neutra.» Spec: US7.1 y FR-042; `docs/GLOSSARY.md`. Ver «Lo que la aprobación cambia respecto a los comps».
- **C-6 · La programación en el detalle de una meta.** La spec pone Recurrentes
  como ruta hija de Plan (28.8) y no dice si la meta muestra su aporte programado.
  Mostrarlo toca una pantalla de MVP-1. El prompt deja **Metas intacta** como
  variante base y pide una **variante explícita** `[P]`: en Yo de la dueña, el
  detalle de la meta muestra su programación con el badge PRIVADO y un enlace a
  Recurrentes; en Nosotros y para la otra persona, nada. **Pregunta:** ¿la base o la
  variante?
  **Respuesta (29.14):** «mantener Metas intacta.» Con P-12: el detalle de una meta no muestra su aporte programado. La variante de 07·12b queda descartada.
- **C-7 · Badge en la pestaña Plan.** La navegación de §15.3 no gana destinos
  (28.8). Un recuento sobre la pestaña Plan no es un destino, pero cambia la barra.
  El prompt no lo pide salvo como `[P]` aparte. **Pregunta:** ¿se descarta?
  **Respuesta (29.14):** «descartamos el badge en la pestaña Plan.» La barra de §15.3 no cambia. Ningún comp lo mostraba.
- **C-8 · Cuántas fechas pasadas crea una fecha inicial antigua.** La spec dice que
  las fechas pasadas quedan por confirmar, sin límite. Una regla con fecha inicial de
  hace un año crea doce por confirmar. El prompt solo pide avisar de cuántas son.
  **Pregunta:** ¿basta con el aviso, o hace falta un límite? Un límite sería un
  cambio de spec.
  **Respuesta (29.14):** «aviso previo con el número exacto de instancias pendientes, sin límite funcional arbitrario. Se conserva el modelo de cálculo de ADR-016, sin crear movimientos reales ni materializar instancias innecesariamente.» Spec: casos límite («Recurrencia con fecha inicial en el pasado»). Ver la errata de 07·2f abajo. **Para el Plan:** cómo se cuenta sin materializar.

## Verificaciones `[V]` abiertas

No se dan por hechas; la aprobación visual del 26 de noviembre de 2026 tampoco las
cierra («Mantener abiertas todas las verificaciones [V]», 29.14). Además de las de cada
sección de los comps:

- revisión visual en oscuro de las pantallas que no lista «Anchos y temas» (arriba): 07·1,
  07·3, 07·4, 07·6, 07·7, 07·10, 07·12, 07·13, 07·14 y 07·15;
- contraste WCAG AA de todo el texto y de lo previsto (por ejemplo, el contorno
  punteado y el importe secundario) en claro y en oscuro, y que lo previsto se
  distinga de lo real sin color;
- que ningún texto de los comps use las palabras de GLOSSARY §9, BRAND §4, DEC-R17
  ni DEC-G04, y que nada diga «pagada» de una instancia ni de una regla (ADR-017
  `[V]` 7; FR-037);
- que las vistas de Tomás sean idénticas con y sin las programaciones privadas de
  Sara, en Yo y en Nosotros (07·7, 07·12, 07·13): recuentos, ausencia, huecos y
  errores. Es la prueba visual de F101-2, que después se verifica en pgTAP (FR-092;
  SC-003);
- que las cifras de Q15 (b) cuadren con los datos de ejemplo: Yo de Sara, entre
  $2.218.900 y $2.248.900; Nosotros antes del paso 3 de P6, entre $340.000 y
  $400.000; Yo de Tomás, sin cifra;
- que la variante (a) de Q15 sea completa y usable, no una versión recortada de la
  (b);
- que ningún comp dé el toque único con una sugerencia compatible sin resolver, ni
  prometa que una omisión siempre se puede deshacer, ni diga «No se guardó» ante un
  resultado desconocido;
- **SC-008 completo**, en la implementación: sin scroll horizontal a 360, 390, 430,
  1024 y 1440 px, y CLS = 0 en las cargas con skeleton (§15.7). Los comps solo se
  hacen a 390 y 1440, y no verifican los demás anchos;
- que el texto al 200 % y los nombres de 60 caracteres no rompan las filas a 390.

## Al aprobarlos: hecho

En el PR documental que registra la aprobación, como hizo Planes en el #96:

- este documento pasa a «aprobados», con el texto literal y cada `[P]` y cada C
  decididas;
- Q15 se cierra en la spec y en la decisión 29 (29.4 y la nueva 29.14), y entran en
  vigor P1–P3 de ADR-017, que solo lleva una nota fechada, sin cambiar decisiones;
- los nombres aprobados entran en `docs/GLOSSARY.md` (Q2);
- las respuestas a C-1 a C-8 se registran en la spec, sin cambiar un ADR aceptado;
  lo que necesita detalle técnico (C-3, C-4 y C-8) queda para el Plan;
- `docs/BACKLOG_MVP2.md` registra el diseño aprobado.
