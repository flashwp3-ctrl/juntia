# Comps de diseño · 007 Recurrentes y calendario

**Estado: pendientes.** Todavía no hay comps (26 de noviembre de 2026). El prompt de
`design-prompt.md` está listo para pegar en Claude Design (ronda 2, tras la
revisión F113), pero el conector rechazó la sesión de Claude Code: hace falta que
un fundador inicie sesión (`/design-login`) o que pegue el prompt a mano en el
proyecto `caabf357-a0df-4048-886f-8c46c8979c5a`, como se hizo con Planes. **No se
generan hasta el GO de la revisión del PR.** Cuando existan, este documento dirá
dónde están, los ajustes que pidan los fundadores y las `[V]` que deje Claude
Design, con el mismo esquema que `specs/006-planes/design-comps.md`.

**Jerarquía** (`AGENTS.md` §2). De mayor a menor:

1. el maestro y sus decisiones (§15, en especial las decisiones 28 y 29);
2. los ADR (ADR-016, ADR-017 y ADR-018, y los anteriores que citan) y los
   contratos de dinero y privacidad;
3. el sistema de diseño de `docs/design/` y las convenciones de
   `docs/CONVENTIONS.md` y `docs/GLOSSARY.md`;
4. la spec 007;
5. los comps.

Todo lo que salga de los comps es **propuesta** `[P]` hasta que los fundadores lo
aprueben viendo las pantallas (FR-082; maestro §15.9). Los comps **no deciden el
alcance**, y **un comp no modifica un ADR**, ni la spec, ni una decisión: si un comp
contradice algo de más arriba, se corrige el comp. Pasar a la etapa Plan exige que
los fundadores aprueben los comps, **con el cierre de Q15** («Lo que hace falta
para pasar a Plan», punto 5; decisión 29.10). Ni la aprobación de los comps ni este
documento autorizan el Plan ni la implementación: siguen la precedencia de Planes y
N-8 (28.18).

## Dónde estarán

Nombres de trabajo, a confirmar al crearlos:

| Archivo | Pantallas |
| --- | --- |
| «11a Recurrentes 07-1-07-7» | 07·1 Lista · 07·2 Crear · 07·3 Detalle · 07·4 Editar · 07·5 Cambiar frecuencia · 07·6 Calendario y Q15 · 07·7 Por confirmar, Inicio y Plan |
| «11b Recurrentes 07-8-07-15» | 07·8 Confirmar · 07·9 Vincular · 07·10 Omitir y deshacer · 07·11 Ciclo de vida · 07·12 Aportes programados · 07·13 Actividad · 07·14 Presets · 07·15 Vacíos y límites |

Los comps viven en Claude Design y no se copian al repositorio. Sus cifras son
hipotéticas (`design-prompt.md`, «Datos de ejemplo») y pueden no coincidir con las
de los escenarios de la spec: las pruebas usan las de la spec.

## Cobertura por pantalla

Qué pide cada pantalla y de dónde sale. Todas van a 390 y 1440 px, en claro y en
oscuro, con carga, vacío y error, y con contraste WCAG AA (FR-081; `AGENTS.md` 10 y
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

## Lo que se aprueba viendo los comps `[P]`

| # | Qué | Origen | Opciones que muestran los comps |
| --- | --- | --- | --- |
| P-1 | **Q15: ¿existe el total de gastos previstos?** | Q15; 29.4; FR-045; ADR-017 §4 | (a) sin total, el respaldo; (b) con total, y entonces rigen P1(a), P2(a) y P3(a) de ADR-017 |
| P-2 | Si Q15 es (b): un solo rango o fijos y estimado por separado | ADR-017 §4, «Lo que deciden los comps» | b1 · b2 |
| P-3 | Si Q15 es (b): texto exacto del rótulo y de la ausencia | ADR-017 §4, reglas 1 y 5 | El que propongan los comps; la ausencia, sin cifra |
| P-4 | Nombres visibles: ruta, instancia, estados de la instancia y de la regla, «cuota n de N» y el preset | Q2; FR-080 | Los de trabajo del prompt y las alternativas que proponga Claude Design. Entran en `docs/GLOSSARY.md` solo aprobados |
| P-5 | Texto de «importe desconocido» | ADR-017 §1 y §2 | Nunca $0 ni un guion |
| P-6 | Escritorio del calendario | Q14 | (i) lista ancha con panel; (ii) cuadrícula mensual con lista |
| P-7 | Cómo se reparten lista, calendario y «Por confirmar» dentro de la ruta | 28.8; Q16 | La que propongan los comps |
| P-8 | Lenguaje visual de lo previsto frente a lo real | A.2; FR-011; handoff (proyecciones punteadas) | El que propongan los comps, constante en todas las pantallas |
| P-9 | Textos de la vista previa de la pausa de un compromiso finito | FR-038a; ADR-016 §6.3 | El que propongan los comps |
| P-10 | Módulo de Inicio: forma y qué significa descartarlo | Q16; FR-050 | Ver C-4 |
| P-11 | Fila de presets en Anotar | US9.3; US-12 | La que propongan los comps, sin pasos nuevos |
| P-12 | La programación en el detalle de una meta | Q12; 28.8 | Metas intacta (base) o la variante de C-6 en Yo de la dueña |
| P-13 | Importe vacío en el borrador de un estimado | FR-012; ADR-017 §2 | Vacío con el rango como ayuda, o el que propongan los comps |
| P-14 | «Deshacer» en el toast tras confirmar | Ver C-3 | Con o sin, según C-3 |

## Cuestiones para los fundadores que revela el diseño

El prompt **no las cierra**: pide que los comps las enseñen. Ninguna cambia una
decisión de la 28 o la 29 ni un ADR. Si una respuesta ampliara el alcance, va a la
spec o al ADR que corresponda antes del Plan, no a un comp.

- **C-1 · Confirmar «desde el aviso» sin mostrar importes en Inicio.** SC-004 dice
  que confirmar cuesta un toque «desde el calendario o el aviso», y Q4 exige, en un
  ingreso fijo, confirmar explícitamente el importe mostrado. Pero FR-050 (con
  P3(a)) dice que el módulo de Inicio no incorpora importes previstos. El prompt
  resuelve el diseño sin tocar nada: el módulo de Inicio solo lleva a «Por
  confirmar», y el toque único ocurre allí. **Pregunta:** ¿«el aviso» de SC-004 es
  la entrada «Por confirmar» de Recurrentes, y no el módulo de Inicio? Si los
  fundadores quisieran confirmar desde Inicio, el módulo tendría que mostrar el
  importe de cada instancia, y eso pide revisar FR-050.
- **C-2 · «Por confirmar» significa dos cosas.** Como nombre de trabajo (Q2),
  «Por confirmar» es la instancia pendiente de resolución, porque llegó su fecha o
  porque volvió a quedar pendiente conforme a D1 o P6. El rótulo del
  total de P1(a) también debe decir «por confirmar» (ADR-017 §4), pero ese total
  incluye además las **previstas** futuras del mes. El prompt pide un rótulo que no
  los confunda («sin confirmar»). **Pregunta:** aprobar con los comps un texto
  para cada uno, o cambiar el nombre de trabajo de la instancia vencida.
- **C-3 · Deshacer una confirmación o un vínculo.** La spec no dice si el toast de
  confirmar lleva «Deshacer». Si lo lleva, deshacer sería **anular** el movimiento
  creado, y la instancia volvería a por confirmar por D1, con su auditoría. Anotar
  ya tiene un «Deshacer» de 6 s (COMPONENT_SPECIFICATIONS, «Anotar gasto», E5), pero
  no está dicho si confirmar lo hereda. Tras **vincular**, en cambio, no se creó
  nada: ningún comp puede interpretar «Deshacer un vínculo» como anular un
  movimiento que ya existía. Si quitar un vínculo es posible, y cómo, no lo dice la
  spec. **Pregunta:** ¿con o sin Deshacer en cada caso? Queda abierta.
- **C-4 · Qué es «descartable» en el módulo de Inicio.** Q16 lo pide descartable,
  pero no dice hasta cuándo. Propuesta del prompt `[P]`: se oculta para quien lo
  descarta hasta que otra instancia pase a por confirmar, y cada persona descarta
  el suyo. **Pregunta:** confirmarlo o elegir otra regla. Si guardar el descarte
  necesita datos nuevos, lo decide el Plan.
- **C-5 · «Cuota n de N» fuera de las deudas.** FR-042 y US7.1 dicen «cuota n de
  N» (o el texto que se apruebe, Q2). Para una suscripción con fin, «cuota» suena a
  deuda. El prompt pide también una forma neutra («7 de 24»). **Pregunta:** cuál se
  usa, y si depende del tipo.
- **C-6 · La programación en el detalle de una meta.** La spec pone Recurrentes
  como ruta hija de Plan (28.8) y no dice si la meta muestra su aporte programado.
  Mostrarlo toca una pantalla de MVP-1. El prompt deja **Metas intacta** como
  variante base y pide una **variante explícita** `[P]`: en Yo de la dueña, el
  detalle de la meta muestra su programación con el badge PRIVADO y un enlace a
  Recurrentes; en Nosotros y para la otra persona, nada. **Pregunta:** ¿la base o la
  variante?
- **C-7 · Badge en la pestaña Plan.** La navegación de §15.3 no gana destinos
  (28.8). Un recuento sobre la pestaña Plan no es un destino, pero cambia la barra.
  El prompt no lo pide salvo como `[P]` aparte. **Pregunta:** ¿se descarta?
- **C-8 · Cuántas fechas pasadas crea una fecha inicial antigua.** La spec dice que
  las fechas pasadas quedan por confirmar, sin límite. Una regla con fecha inicial de
  hace un año crea doce por confirmar. El prompt solo pide avisar de cuántas son.
  **Pregunta:** ¿basta con el aviso, o hace falta un límite? Un límite sería un
  cambio de spec.

## Verificaciones `[V]` para cuando existan los comps

No se dan por hechas; la aprobación visual tampoco las cierra:

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

## Al aprobarlos

En el PR documental que registre la aprobación, como hizo Planes en el #96: este
documento pasa a «aprobados» con los archivos y los ajustes; Q15 se cierra en la
spec y en la decisión 29 (29.4); los nombres aprobados entran en
`docs/GLOSSARY.md` (Q2); y las respuestas a C-1 a C-8 se registran donde
correspondan, sin cambiar un ADR aceptado sin su propio procedimiento.
