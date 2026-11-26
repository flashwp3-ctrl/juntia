# Prompt para Claude Design · 007 Recurrentes y calendario

**Estado:** listo para pegar (26 de noviembre de 2026), **ronda 2** tras la
revisión F113. No se generaron los comps desde Claude Code: el conector de Claude
Design rechazó la sesión, y hay que volver a iniciarla con `/design-login` o pegar
el prompt a mano. **No se generan hasta el GO de la revisión.** Va en el proyecto
de Claude Design `caabf357-a0df-4048-886f-8c46c8979c5a` («Juntia: Responsive
design y design system»), como páginas nuevas **«07 Recurrentes»**, para que
hereden los tokens, las fuentes y los componentes del sistema. Es el mismo
procedimiento que siguió Planes (`specs/006-planes/design-prompt.md`). Por su
tamaño, conviene repartirlo en dos archivos, como allí: **«11a Recurrentes
07-1-07-7»** y **«11b Recurrentes 07-8-07-15»** (nombres de trabajo).

**Jerarquía** (`AGENTS.md` §2). De mayor a menor:

1. el maestro y sus decisiones (§15, en especial las decisiones 28 y 29);
2. los ADR (ADR-016, ADR-017 y ADR-018, y los anteriores que citan) y los
   contratos de dinero y privacidad;
3. el sistema de diseño de `docs/design/` y las convenciones de
   `docs/CONVENTIONS.md` y `docs/GLOSSARY.md`;
4. la spec 007 (`specs/007-recurrentes-calendario/spec.md`);
5. los comps.

Los comps son **propuestas** `[P]`: se aprueban viendo la pantalla y **no deciden
el alcance**. **Un comp no modifica un ADR**, ni la spec, ni una decisión. Si un
comp contradice algo de más arriba, manda lo de arriba y el comp se corrige. Donde
este prompt resume una regla de un ADR, cita la sección: ante cualquier duda,
manda la sección citada, no el resumen.

- **Q15 sigue abierta** (29.4). El prompt pide las dos variantes para que los
  fundadores decidan viéndolas: **(a) sin total** y **(b) con el total de gastos
  previstos**. Si se cierra en (b), rigen P1(a), P2(a) y P3(a) de ADR-017 (29.12).
- **Los nombres visibles** («Recurrentes», «Previsto», «Por confirmar» y los demás)
  son de trabajo (Q2). Se deciden con los comps y entran en `docs/GLOSSARY.md` solo
  aprobados.
- El documento de cobertura y las cuestiones que el diseño deja a los fundadores
  (C-1 a C-8) están en `design-comps.md`. Ningún comp las cierra.

---

## Prompt

> Diseña **Recurrentes y calendario** de Juntia, app de finanzas para parejas, en
> la dirección **I2 · Bosque & Arena**, que está elegida y no se reabre. Usa el
> sistema de este proyecto tal cual: tokens de color de I2 en claro y oscuro,
> **Brygada 1918** para titulares, **Onest** con cifras tabulares para interfaz y
> dinero, **Spline Sans Mono** solo para metadatos (fechas), radios, sombras,
> `BottomSheet`, `Modal` (desde 768 px anclado arriba; confirmaciones centradas),
> `Segmented`, `ExpenseRow` (con sus variantes de gasto, ingreso y aporte),
> `CategoryIcon`, `Badge de estado`, `ChangePreview`, `LimitNote`, `Toast`,
> `Skeleton` y la hoja de Anotar existente. Iconos **solo Phosphor** con los pesos
> del sistema (Regular en línea, Fill activo, Bold en botones, Duotone en fichas);
> nada de emojis. Copy en español de Colombia, tuteo, frases cortas, el nombre
> propio primero («Tomás pagó»), COP sin decimales (`$1.800.000`), sin
> exclamaciones de alarma y sin culpa.
>
> **Qué es una recurrencia.** Una regla que anuncia un movimiento que se espera:
> el arriendo cada mes, el salario dos veces al mes, un aporte mensual a una meta,
> la prima de diciembre o una cuota con número fijo de ocurrencias. Cada regla
> genera **instancias previstas**, una por fecha. Lo previsto **no es real**: no es
> un gasto, un ingreso ni un aporte, no cambia ninguna cifra de Inicio, Actividad,
> Balance, presupuestos, Análisis ni Metas, y **no consume presupuesto**. Solo al
> **confirmar** una instancia se crea el movimiento real, una sola vez. Juntia
> nunca paga, nunca debita y nunca crea nada real por su cuenta.
>
> **Reglas que el diseño no puede romper:**
> 1. **Nunca «te alcanza»**, «puedes pagarlo», «disponible», «saldo», «sobra»,
>    «queda para gastar» ni nada que suponga liquidez o capacidad de pago (DEC-R17).
>    Ninguna cifra prevista se resta de otra, se compara con un presupuesto, se
>    pinta como barra de progreso o se pone «frente a lo real» (ADR-017 §3).
> 2. **Lo previsto nunca se mezcla con lo real**, ni en una suma, ni en una misma
>    tarjeta de cifras, ni en una comparación (ADR-017 §3). Lo previsto tiene un
>    lenguaje visual propio y constante, que se distingue **por forma y texto, no
>    solo por color**: propón uno (por ejemplo, ficha con contorno punteado, como
>    las proyecciones de las metas, e importe en peso de texto secundario) y úsalo
>    en todas las pantallas. Lo real conserva `ExpenseRow` tal como está.
> 3. **Un aporte programado previsto no es ahorro todavía**: no lo pintes con el
>    verde de ahorro relleno ni lo sumes a la meta, a «Tu disponible» ni a nada
>    (FR-032; ADR-018 §2).
> 4. **Privacidad entre Yo y Nosotros** (FR-060 a FR-062; 28.11; ADR-016 §11;
>    ADR-017 §6). Todo es **privado por defecto**: compartir es siempre una acción
>    explícita. Una recurrencia es privada **o** de la pareja, se elige al crearla y
>    no se convierte nunca. En Nosotros solo se ve lo compartido. Lo privado de una
>    persona **nunca** aparece para la otra, ni en listas, ni en recuentos, ni en
>    avisos, ni en totales, ni en errores, ni por huecos: **ni siquiera su
>    existencia**. Los **ingresos** son siempre privados, y los **aportes
>    programados** también, aunque la meta sea compartida. **Cada recuento y cada
>    cifra pertenece a un solo contexto**: nunca una cifra que mezcle las privadas
>    propias con las compartidas.
> 5. **Un aporte confirmado desde una programación es indistinguible** de un aporte
>    manual para la otra persona: sin insignia, sin frecuencia, sin «programado»,
>    sin procedencia (FR-033; ADR-018 §2 y §5).
> 6. **La ausencia no es cero.** Sin recurrencias, sin instancias o con importe
>    desconocido, nunca «$0», ni un guion que se lea como cero (ADR-017 §1, §2 y §4,
>    regla 1).
> 7. **Un importe estimado nunca parece exacto.** Un estimado es siempre un rango
>    («Entre $180.000 y $240.000 · estimado»), nunca su punto medio ni uno solo de
>    sus extremos (ADR-017 §2).
> 8. **Un ingreso previsto nunca es dinero recibido ni seguro.** Un ingreso
>    condicional muestra siempre su condición y su rótulo de condicional (ADR-017
>    §2).
> 9. **Terminar no es pagar.** Una recurrencia que terminó, o una ocurrencia que se
>    consumió en una pausa, nunca se presenta como deuda pagada ni como cuota
>    pagada (FR-037; D5). No uses «pagada», «saldada» ni «al día» para una
>    instancia o una regla; para lo confirmado, «Confirmada» o el texto que
>    propongas con ese sentido.
> 10. `total_destinado_neto` no aparece en estas pantallas, y ninguna cifra se
>    rotula «Total gastado».
> 11. **Nunca se vincula ni se deduplica automáticamente** (FR-015; ADR-016 §7.6 y
>    §9). Juntia sugiere y la persona decide; siempre se puede registrar un
>    movimiento distinto.
>
> **Escrituras: el contrato de resultado de la app** (el de `use-write.ts`, ya en
> producción). Toda acción que escribe (confirmar, vincular, omitir, deshacer,
> editar, cambiar frecuencia, pausar, reanudar, finalizar, eliminar, guardar un
> preset) tiene cuatro estados, y hay que diseñarlos en **confirmar**, **vincular**
> y **cambiar frecuencia**:
> - **guardando**: el botón con su indicador y los campos bloqueados;
> - **éxito**;
> - **rechazo confirmado**: el servidor dijo que no y se sabe por qué (los errores
>   de cada pantalla, abajo). Nada se hizo;
> - **resultado desconocido**: se envió y no hubo respuesta (red caída o 15 s sin
>   respuesta). **No se dice que no se guardó.** Texto de la app: «No pudimos
>   confirmar si se hizo. No lo des por hecho: reintenta lo mismo sin riesgo o
>   comprueba el estado», con **«Reintentar»**, que reenvía la carga
>   original con **la misma clave** (no se hace dos veces), y **«Comprobar estado»**
>   («Comprobando…»), que consulta el resultado de esa clave **sin reenviar** nada. Si al comprobar todavía no consta: «Todavía no consta.
>   Reintentar es seguro: no se hace dos veces». Mientras está desconocido, la
>   acción no se puede enviar de nuevo con otros datos.
>
> Y aparte, **el error de red al cargar** una pantalla (antes de enviar nada), que
> es un error de lectura con «Reintentar» y no dice nada sobre escrituras.
>
> **Navegación.** No hay pestaña nueva: la barra móvil sigue siendo Inicio ·
> Actividad · + · Metas · Plan, y en escritorio, el rail de 76 px desde 1024 y el
> sidebar de 248 px desde 1280, con Balance solo en escritorio. Recurrentes es una
> **ruta hija de Plan**, como Análisis: ruta de trabajo `/plan/recurrentes`. Desde
> el resumen de Plan se llega con una tarjeta o fila «Recurrentes». Dentro de la
> ruta, propón cómo se reparten la lista de recurrencias, el calendario y «Por
> confirmar» (por ejemplo, un segmentado «Calendario · Recurrentes» bajo el título
> y una franja «Por confirmar · 3» arriba) `[P]`. No añadas un badge a la pestaña
> Plan de la barra salvo como variante `[P]` aparte (C-7). El selector Yo/Nosotros
> funciona como en el resto de la app.
>
> **Nombres de trabajo** (Q2; se deciden viendo los comps, propón alternativas si
> alguno no se entiende): la ruta, **«Recurrentes»**; la instancia futura,
> **«Prevista»**; la instancia pendiente de resolución, porque llegó su fecha o
> porque volvió a quedar pendiente conforme a D1 o P6, **«Por confirmar»**;
> la resuelta con un movimiento real, **«Confirmada»**; **«Omitida»**,
> **«Cancelada»**. La recurrencia: **«Activa»**, **«En pausa»**, **«Terminó»**
> (sola, por fecha final o por número de ocurrencias), **«Finalizada»** (a mano) y
> **«Archivada»**. Las dos formas de terminar se distinguen siempre. Para los
> compromisos con número de ocurrencias, «cuota 7 de 24» es el texto de la spec;
> propón también una forma neutra («7 de 24») para lo que no es una cuota, como una
> suscripción (C-5). El preset necesita un nombre que **no se confunda con una
> recurrencia** (por ejemplo, «Atajo» o «Plantilla»): propón uno.
>
> **Pantallas, cada una a 390 px y a 1440 px, en claro y en oscuro, con sus
> estados de carga (skeleton sin saltos), vacío y error. Todo con contraste WCAG
> AA:**
>
> **07·1 Lista de recurrencias.** En Yo: las privadas propias, agrupadas por tipo
> (Gastos · Ingresos · Aportes a metas) y, aparte, las de la pareja, **sin ningún
> total ni recuento que sume las dos listas**. En Nosotros: solo las de la pareja.
> Cada fila: ficha con `CategoryIcon` (o el ícono del tipo), nombre, frecuencia en
> texto («Cada mes, el 5», «El 15 y el último día», «Cada 2 semanas, el lunes»,
> «Una sola vez, el 20 dic»), importe en su forma (fijo, rango o desconocido),
> próxima fecha en mono y estado si no está activa. Las terminadas, finalizadas y
> archivadas, al final y plegadas. Botón «Crear recurrencia». A 1440, propón una
> composición de dos columnas (lista y detalle de la seleccionada, o lista y
> próximas fechas) sin estirar el móvil.
>
> **07·2 Crear una recurrencia** (FR-001, FR-003, FR-060; ADR-016 §3.2 y §3.3;
> ADR-017 §1; ADR-018 §1). BottomSheet en móvil, Modal de 520 px en escritorio.
> Primero el **tipo**: Gasto · Ingreso · Aporte a una meta. Después, según el tipo:
> - **Gasto:** nombre (máx. 60), importe **fijo** o **estimado** (mínimo y máximo),
>   categoría y contexto **Solo yo · La pareja**, con **«Solo yo» seleccionado por
>   defecto** (compartir es una acción explícita, FR-060) y la nota «No se puede
>   cambiar después». En la pareja, tres campos distintos: el **responsable** (quién
>   se encarga de esta obligación), **quién suele pagar** y el **reparto** (50/50,
>   porcentaje o importe, como en Anotar). Responsable y pagador pueden ser personas
>   distintas (FR-001; Q8, Q9).
> - **Ingreso:** solo en Yo. Tipo **Habitual · Extraordinario** y certeza, con sus
>   importes permitidos (ADR-017 §1, «Combinaciones permitidas»):
>   - **Fijo** → solo importe fijo;
>   - **Estimado** → solo rango (mínimo y máximo);
>   - **Condicional** → el texto de la condición (obligatorio, máx. 140 caracteres:
>     «Si se arrienda el local») y un importe **conocido** (fijo), **estimado**
>     (rango) o **desconocido**.
>
>   El formulario no ofrece una combinación que no esté en esa lista. En Nosotros,
>   la opción Ingreso no está disponible y se explica: «Los ingresos son privados:
>   créalos en Yo».
> - **Aporte a una meta:** la meta (propia o compartida, solo activas), importe
>   **solo fijo** (ADR-018 §1, P1(a)) y el modo del aporte (apartado en Juntia o
>   transferencia declarada, los de Metas). Siempre privado, con la nota «Solo tú ves
>   esta programación. Tu pareja solo verá los aportes que confirmes».
> - **Frecuencia:** semanal, quincenal, mensual, trimestral, semestral, anual,
>   personalizada («cada N días, semanas o meses») y **una sola fecha**. En
>   **quincenal**, dos selectores: el primer día del **1 al 15** y el segundo del
>   **16 al último día** (P1; ADR-016 §3.3). En mensual, si el día es 29, 30 o 31, la
>   ayuda «En los meses más cortos, el último día» (ADR-016 §3.2).
> - **Fecha inicial** y **fin**: «Sin fin» · «Hasta una fecha» · «Un número de
>   ocurrencias», nunca los dos a la vez. Vista previa de las **próximas tres
>   fechas** bajo el formulario.
> - Si la fecha inicial está en el pasado, el aviso «Las fechas que ya pasaron
>   quedan por confirmar. No se crea ningún movimiento» con cuántas son (C-8).
> - Errores: importe mínimo ≥ máximo; condición vacía o de más de 140; meta no
>   activa; nombre vacío; segundo día de la quincenal fuera de 16 a 31.
>
> **07·3 Detalle de una recurrencia** (FR-002, FR-035 a FR-037, FR-042; ADR-016
> §6.1, §6.3 y §6.6). Encabezado con nombre en Brygada, tipo, contexto (PRIVADO o
> DE LA PAREJA), estado, importe en su forma, frecuencia y próxima fecha. En una
> compartida, el responsable y quién suele pagar. En un compromiso con número de
> ocurrencias, «cuota 7 de 24» y la fecha de la última. Debajo, las instancias:
> próximas (previstas) y anteriores, con su estado; las confirmadas enlazan con su
> movimiento en Actividad. Si hubo pausas en un compromiso finito, una línea «2
> ocurrencias no generadas por la pausa del 3 al 28 de feb», que nunca dice
> «pagadas» ni «pendientes» (ADR-016 §6.3). Acciones: «Editar», «Cambiar
> frecuencia», «Pausar» / «Reanudar», «Finalizar», «Eliminar». Variantes:
> - **Terminó sola** con instancias anteriores aún por confirmar: siguen visibles y
>   confirmables, y la cabecera dice por qué terminó («Llegó a su fecha final» o
>   «Se programaron sus 24 ocurrencias»), nunca «Pagada».
> - **Finalizada a mano** y **Archivada**, con una instancia por confirmar que
>   reapareció: se sigue pudiendo confirmar, vincular u omitir, con la marca
>   «Recurrencia archivada» (P5; ADR-016 §6.6).
> - **Recurrencia compartida**: «Creada por Sara · editada por Tomás el 12 nov».
> - Una regla finalizada o archivada no se edita (ADR-016 §4): las acciones de
>   edición no aparecen.
>
> **07·4 Editar una recurrencia** (FR-003 a FR-005; ADR-016 §3.4, §4 y §6.1). Qué
> es editable, según ADR-016 §3.4 («Qué es editable»), mientras la regla está
> activa o en pausa:
> - **editables:** importe, categoría, pagador, reparto, responsable, nombre,
>   certeza y condición (con las combinaciones de 07·2), el **día dentro de su
>   periodo**, el **número de ocurrencias** y la **fecha final**; en un aporte,
>   además, el **modo del aporte** (ADR-018 §1);
> - **de solo lectura**, visibles y con su explicación: el **contexto** («Para
>   pasarla a la pareja, crea una nueva y finaliza esta»), el **tipo**, la **meta**
>   de un aporte (no cambia nunca) y la **frecuencia** (con el enlace «Cambiar
>   frecuencia»);
> - en una regla **de una sola fecha**, la fecha solo se edita si la instancia no
>   tiene ningún hecho y la fecha nueva es posterior a hoy; si no, de solo lectura
>   con su motivo.
>
> Antes de guardar, una **vista previa** (`ChangePreview`) con a qué instancias
> afecta: «Se aplica desde el 5 de diciembre. Las que ya llegaron conservan sus
> datos». Si reducir el número de ocurrencias o la fecha final, o mover el día con
> una fecha final, quita instancias, la vista previa las nombra («Se quitan las
> cuotas 21 a 24»). **Límites al reducir** (ADR-016 §6.1): nunca por debajo de las
> ocurrencias que ya llegaron, ni por debajo de una con un hecho (confirmada,
> omitida o vuelta a por confirmar); el campo muestra el mínimo y el error («No
> puede ser menos de 9: la 9 ya está confirmada»). Si una instancia tiene los datos
> fijados por una omisión, la vista previa dice que esa no cambia (P7). Conflicto en
> una compartida: «Tomás cambió esta recurrencia mientras la editabas. Revisa los
> cambios», sin sobrescribir nada.
>
> **07·5 Cambiar frecuencia** (FR-005; ADR-016 §3.4, «Flujo Cambiar frecuencia:
> contrato», y §6.3). Para la persona es un solo paso, aunque por dentro se cierra
> la regla anterior y se crea una nueva, de forma atómica e idempotente. Qué le pasa
> a la anterior depende de si tiene **historia**, que significa que **alguna vez**
> registró un hecho (una confirmación, un vínculo, una omisión, también si se
> deshizo, o una cancelación), no que lo tenga vigente (ADR-016 §6.3):
> - **con historia, se finaliza a mano**, con la lista explícita de las instancias
>   sin resolver que se **cancelan**, incluidas las por confirmar, y la invitación a
>   resolverlas antes;
> - **sin historia, se elimina**: no hay instancias guardadas que cancelar.
>
> Diseña la vista previa completa:
> - la frecuencia nueva y desde cuándo empieza, con la explicación de por qué
>   («El periodo anual de marzo cubre hasta febrero: la mensual empieza en marzo»)
>   y la opción de elegir otra fecha posterior a hoy;
> - lo que la regla anterior **todavía cubre** o conserva (confirmadas, omitidas,
>   vueltas a por confirmar) **junto al calendario nuevo**, para que se vean los
>   solapes, sin deduplicar;
> - en un compromiso con número de ocurrencias, cuántas quedan en la regla nueva y
>   la fecha de la última; si no queda ninguna, el flujo lo explica y solo sigue si
>   la persona amplía el compromiso;
> - en un aporte a una meta que no está activa, el flujo no está disponible y se
>   explica: no sirve para saltarse la pausa por la meta.
>
> Con los cuatro estados de escritura (guardando, éxito, rechazo confirmado y
> resultado desconocido). Rechazo: «Esta recurrencia cambió mientras la revisabas»
> o «La lista de lo que se cancela cambió», con la vista previa recalculada.
>
> **07·6 Calendario** (FR-040 a FR-044; ADR-016 §5; ADR-017 §1 y §2). **En móvil,
> una lista agrupada por fecha, con flechas de mes, sin cuadrícula** (Q14). Por
> defecto, el mes actual y el siguiente. Cada fila: fecha prevista, nombre, importe
> en su forma, estado; en un ingreso condicional, la condición; en un compromiso con
> número de ocurrencias, «cuota n de N»; en lo compartido, quién suele pagar. Las
> **por confirmar** con sus acciones a la vista (Confirmar, Vincular, Omitir); las
> **previstas** con las suyas en un menú; las **confirmadas** enlazan con Actividad.
> Lo real sin instancia **no** aparece: lo real vive en Actividad. **En escritorio,
> propón dos variantes** `[P]` para que los fundadores elijan: (i) la misma lista,
> más ancha, con un panel lateral del día o de la instancia seleccionada; (ii) una
> cuadrícula mensual con la lista del día al lado. En las dos, la lista sigue
> existiendo para lectores de pantalla.
>
> Incluye en Nosotros el paso 4 de la cadena de P6 (abajo, en 07·9): la instancia
> compartida de Plan de celular que vuelve a por confirmar tras el Deshacer.
>
> **07·6 · Q15, dos variantes de la cabecera del mes** (ADR-017 §3, §4, §6 y §7).
> Haz cada mes de 07·6, en Yo y en Nosotros, **en las dos variantes**, para que se
> elija viéndolas. Las dos son pantallas completas y usables:
> - **(a) Sin total.** La cabecera del mes tiene el mes y, como mucho, un recuento
>   de instancias por estado. Ninguna cifra agregada. El calendario funciona igual
>   de bien: cada instancia con su importe, sus acciones y su estado.
> - **(b) Con el total de gastos previstos**, con estas reglas de ADR-017 §4, que no
>   se negocian:
>   - **solo gastos**: nunca ingresos ni aportes, ni una cifra neta;
>   - **solo los sin resolver del mes** (P1(a)): previstas y por confirmar, incluidas
>     las vueltas a por confirmar por anulación (D1) y la compartida de la excepción
>     de P6; las confirmadas, omitidas y canceladas no entran;
>   - **en Yo, solo los gastos privados propios**; **en Nosotros, solo los de la
>     pareja**; nunca juntos (P2(a));
>   - el **rótulo dice exactamente qué incluye** (regla 5): que son gastos, de qué
>     contexto, de qué mes y que están **sin confirmar**, y que no son lo pagado;
>   - **solo aquí**, junto a la lista de las instancias que suma (P3(a)): no en
>     Inicio, ni en la tarjeta de Plan, ni junto a ninguna cifra real (regla 6);
>   - **sin barra, sin porcentaje y sin comparación** con un presupuesto ni con lo
>     gastado (§3);
>   - con estimados, dos formas que hay que mostrar **las dos** `[P]`: **(b1)** un
>     solo rango que suma los fijos en los dos extremos (regla 2: «Entre $2.218.900 y
>     $2.248.900»), y **(b2)** los fijos y el estimado por separado («$2.158.900 en
>     3 gastos fijos · 1 estimado entre $60.000 y $90.000»). Nunca un único número
>     que sume rangos;
>   - **ausencia** (regla 1): si no hay ninguna instancia que sumar, no hay cifra sino
>     una frase neutra: «No hay gastos previstos por confirmar este mes». Nunca «$0»,
>     y nunca «no tienes recurrencias» a partir de esa cifra;
>   - **contrato defensivo** (regla 3): si alguna vez entrara un importe desconocido,
>     la cifra diría que está incompleta y cuántos faltan. Hoy un gasto no puede ser
>     desconocido (§1), así que **no se pide ese comp**.
>
>   Casos que la variante (b) debe enseñar, además de los datos de ejemplo:
>   - un mes **solo con fijos** (sin rango ni «estimado»);
>   - un mes **solo con estimados**: un rango, **sin «$0 fijos»** (regla 4);
>   - una instancia **vuelta a por confirmar por anulación antes de su fecha** (D1):
>     entra, como por confirmar;
>   - la instancia **compartida** que vuelve a por confirmar por la excepción de
>     **P6**: entra en Nosotros;
>   - **posiciones consumidas por una pausa**: no aparecen ni suman;
>   - una instancia **con los valores fijados por P7**: suma el importe que tenía al
>     omitirse, no el actual.
>
>   Cuida que «Por confirmar» como nombre de las instancias vencidas y «sin
>   confirmar» en el rótulo del total, que también incluye las previstas futuras, no
>   se confundan: propón un rótulo que lo deje claro (C-2).
>
> **07·7 «Por confirmar», Inicio y Plan** (FR-050, FR-051; Q16; P3(a); ADR-016
> §6.6; ADR-017 §6). Avisos solo dentro de la app, sin push ni correo.
> - **Por confirmar**: la lista de instancias pendientes de resolución, porque llegó
>   su fecha o porque volvieron a quedar pendientes conforme a D1 o P6, de cualquier
>   mes, la más antigua primero, con sus acciones. Incluye las vueltas a por
>   confirmar aunque su fecha sea futura, y las de recurrencias archivadas,
>   finalizadas o terminadas. «Todo confirmado» como estado vacío, sin
>   celebraciones exageradas.
> - **Módulo de Inicio**: aparece **solo cuando hay instancias por confirmar**, es
>   **descartable** y **sin culpa** («Tienes 3 por confirmar», nunca «Tienes 3 pagos
>   atrasados»). Lleva a Por confirmar. **No muestra importes previstos** (P3(a) y
>   FR-050): ni por instancia ni en total. **Recuentos por contexto**: en Yo, las
>   privadas propias; en Nosotros, las de la pareja. Si en Yo se muestran también las
>   de la pareja, van como un recuento **aparte**, nunca sumado. Cómo queda descartado:
>   propuesta `[P]`, se oculta para quien lo descarta hasta que otra instancia pase a
>   por confirmar, y cada persona descarta el suyo (C-4). No cambia ninguna métrica
>   real de Inicio ni se coloca dentro de una tarjeta de cifras reales.
> - **Resumen de Plan**: la entrada a Recurrentes con su recuento, con la misma regla
>   de un contexto por cifra.
> - **Comparación de Tomás** (F101-2): Inicio, Plan, Por confirmar, la lista y el
>   calendario de Tomás, **en Yo y en Nosotros**, en dos escenarios lado a lado:
>   Sara **con** y **sin** sus recurrencias y aportes programados privados (los de
>   los datos de ejemplo). Las pantallas de Tomás deben ser **idénticas** en los dos:
>   mismos recuentos, misma ausencia, sin huecos, sin filas en blanco y con los mismos
>   errores.
>
> **07·8 Confirmar** (SC-004; FR-012, FR-012a, FR-012b, FR-013, FR-014, FR-016,
> FR-019, FR-021; ADR-016 §7.1 a §7.3 y §7.6; ADR-017 §2). Desde el calendario, Por
> confirmar o el detalle. **Precedencia**, en este orden:
> 1. **¿Cambió la instancia?** Si su posición, su fecha prevista o su versión ya no
>    son las que vio la persona, se **rechaza** sin crear nada (precondición de
>    ADR-016 §7.1): «Esta instancia cambió. Revisa los datos nuevos», con
>    «Revisar».
> 2. Si no cambió, **¿hay movimientos compatibles sugeridos?** (ADR-016 §7.6;
>    FR-014). Se ofrecen **antes de crear nada**: «¿Ya lo anotaste?», con las sugerencias y
>    «Vincular». La persona puede vincular una, o seguir con «No, es otro pago»,
>    que lleva al paso 3: Juntia **no deduplica sola** ni impide registrar un
>    movimiento distinto.
> 3. Sin sugerencias por resolver, según el importe y la certeza (ADR-016 §7.2):
>    **toque único** con **importe fijo** y, en un ingreso, **certeza fija**. El botón dice lo que crea («Confirmar
>    gasto de $95.000»; en un ingreso fijo, el importe que se confirma como recibido:
>    «Recibí $2.600.000»). Al lado, «Cambiar algo antes», que abre el borrador.
>    El **borrador de Anotar** con los datos de la **versión de la instancia**
>    (FR-012a; la hoja de Anotar existente, con una cabecera «De la recurrencia
>    Servicios públicos · prevista el 25 nov») es obligatorio **solo** para un
>    **estimado**, un **importe desconocido** y un **ingreso condicional** (aunque su
>    importe se conozca). Una instancia que cambió no llega aquí: se rechaza en el
>    paso 1. En un ingreso, pide «¿Cuánto
>    recibiste?»; en un estimado, propón si el campo de importe empieza **vacío**,
>    con el rango como ayuda, para no rellenar un número que parezca exacto `[P]`.
>    En lo compartido se pueden cambiar quién pagó y el reparto. Un gasto puede
>    usar «Pagar con una meta» como en Anotar.
>
> **Fechas** (FR-012b, FR-016; D2): la fecha efectiva se puede cambiar y **no
> puede ser posterior a hoy**; la fecha prevista se muestra aparte y no cambia.
> Confirmar una prevista antes de su fecha solo si ya ocurrió: «Solo si ya lo
> pagaste: la fecha no puede ser posterior a hoy».
>
> **Comps obligatorios de 07·8:**
> - **Importe fijo con sugerencia compatible**: Internet, $95.000, por confirmar el
>   12 nov, con un gasto compartido «Internet» de $95.000 que Sara ya anotó a mano
>   ese día. Primero la sugerencia; el toque único no aparece hasta resolverla;
> - **instancia que cambió**: Sara abre la confirmación de Servicios públicos y
>   Tomás edita la recurrencia antes de que guarde. Rechazo confirmado: «Esta
>   instancia cambió. Revisa los datos nuevos», con la instancia recalculada y nada
>   creado;
> - los cuatro estados de escritura (guardando, éxito, rechazo confirmado y
>   resultado desconocido con «Comprobar estado» y «Reintentar»).
>
> Éxito: la instancia pasa a Confirmada y el movimiento aparece en Actividad.
> Propón si el toast lleva «Deshacer» y qué texto tiene `[P]` (C-3; deshacer anula
> el movimiento creado y la instancia vuelve a por confirmar). Otros rechazos:
> «Tomás ya la confirmó» (instancia compartida confirmada por la otra persona); en
> un aporte, «La meta ya no admite aportes».
>
> **07·9 Vincular un movimiento ya anotado** (FR-012b, FR-014, FR-014a, FR-015;
> ADR-016 §7.4, §7.6 y §9). Las sugerencias (como mucho tres) y la búsqueda manual
> («Buscar otro movimiento», por texto) usan **el mismo filtro**, el de ADR-016
> §7.4. Solo aparece un movimiento que cumpla **todo**:
> - **mismo tipo** (gasto con gasto, ingreso con ingreso, aporte con aporte);
> - **mismo contexto**: privado con privado propio; compartido con compartido de la
>   pareja, anotado por cualquiera de los dos; en aportes, **la misma meta y la
>   misma aportante**;
> - **activo**, no anulado;
> - con **fecha efectiva igual a hoy o anterior**;
> - **sin un vínculo previo** y sin cumplir ya otra instancia del mismo contexto.
>
> Son tres cosas distintas (ADR-016 §7.4 y §7.6):
> - el **filtro duro** de §7.4, de arriba, vale para las sugerencias y para la
>   búsqueda;
> - las **sugerencias automáticas** se limitan además a una **ventana alrededor de
>   la fecha prevista** (§7.6; no la calcules) y son **como mucho tres**, ordenadas
>   por importe, categoría y cercanía a la fecha;
> - la **búsqueda manual** no tiene ventana y va **paginada**.
>
> **Nunca vincula solo.**
> Estados: sugerencias; sin sugerencias; búsqueda sin resultados; los cuatro estados
> de escritura; éxito («Vinculado. No se creó ningún movimiento nuevo»); rechazo,
> con el **error genérico** «Ese movimiento no se puede vincular a esta instancia»,
> que **no dice por qué**. Una sugerencia **nunca** muestra un movimiento privado de
> la otra persona. Si propones deshacer un vínculo, **nunca** puede anular un
> movimiento que ya existía antes de vincularlo (C-3, abierta).
>
> **La cadena de P6** (ADR-016 §9; FR-014a, FR-018a), en 07·9, 07·13 y 07·6, con
> los datos de ejemplo:
> 1. Sara confirma su instancia **privada** de Plan de celular: se crea su gasto
>    privado.
> 2. Lo **mueve a Pareja**: su instancia privada sigue **confirmada**, y Tomás ve un
>    gasto compartido normal, sin rastro de la recurrencia privada.
> 3. Tomás **vincula** ese gasto compartido a la instancia compartida de Plan de
>    celular, **sin ninguna advertencia**: la vinculación es igual que cualquier
>    otra.
> 4. Sara **deshace** Mover a Pareja **dentro de los 60 s**, con el gasto en su
>    versión 1, sin liquidaciones y con las demás condiciones de ADR-001 (ADR-016
>    §9): su instancia privada sigue **confirmada**, con su gasto privado
>    restaurado, y la instancia **compartida** vuelve a **por confirmar**. Que Tomás
>    haya vinculado antes no bloquea ese Deshacer, pero tampoco amplía la ventana.
>    Los tiempos de la cadena son ilustrativos.
>
> No crees pantallas nuevas para esto: son estados de 07·6, 07·9 y 07·13.
>
> **07·10 Omitir y deshacer** (FR-017; ADR-016 §6.4 a §6.6). «Omitir esta vez» en
> una por confirmar y en una prevista (omisión anticipada, con acción explícita):
> «No se crea nada». **No prometas que siempre se puede deshacer.** Deshacer sigue
> la precedencia de ADR-016 §6.4 y FR-017, y se detiene en la primera que se
> cumple:
> 1. **La recurrencia está finalizada a mano o archivada** → **no disponible**. Se
>    explica y no reactiva nada.
> 2. **La fecha fijada de la instancia cae dentro de alguna pausa**, pasada o
>    vigente, aunque la recurrencia ya se haya reanudado o haya terminado sola →
>    **no disponible**: «Su fecha quedó dentro de una pausa. Sigue omitida».
> 3. **La instancia había vuelto a por confirmar por una anulación** (D1) → vuelve
>    a **por confirmar**, aunque su fecha sea futura.
> 4. **En el resto**, vuelve a **prevista** o a **por confirmar** según su fecha
>    fijada.
>
> En todos los casos conserva la fecha y la versión que tenía al omitirse (P7): si
> la regla se editó mientras estaba omitida, el aviso «Vuelve con los datos que tenía
> al omitirla». **No hay recuperación manual** (P4; ADR-016 §6.5): si la obligación
> sigue en pie, la ayuda sugiere anotarla o crear una recurrencia de una sola fecha.
> **Antes de omitir** una instancia de una recurrencia **finalizada a mano o
> archivada**, se avisa de que esa omisión no se podrá deshacer (ADR-016 §6.6). No
> se avisa en una que **terminó sola**: allí deshacer sigue disponible según los
> pasos 2 a 4.
>
> **Comps obligatorios de 07·10** (con los datos de ejemplo):
> - **Curso de inglés**, que **terminó sola**, con su omisión de octubre que **sí**
>   se puede deshacer y vuelve a por confirmar; la recurrencia sigue «Terminó»;
> - **Streaming del 20 nov**, confirmada por adelantado y vuelta a por confirmar por
>   la anulación de su gasto: se omite y, al deshacer, vuelve a **por confirmar**,
>   no a prevista;
> - una omisión no disponible por regla archivada y otra por pausa.
>
> **07·11 Pausar, reanudar, finalizar y eliminar** (FR-006, FR-007, FR-036, FR-038,
> FR-038a, FR-076; ADR-016 §6.1 a §6.3).
> - **Pausar**: «Deja de generar fechas nuevas. Lo que ya está por confirmar se
>   queda». En un **compromiso con número de ocurrencias o fecha final**, antes de
>   confirmar, una vista previa del efecto: las ocurrencias que se consumirían si
>   reanudaras en una fecha que se elige, que **cuentan igual** para el total y **no
>   son cuotas pagadas**, y la **fecha final, que no cambia**. Nunca dice que se
>   «aplazan». En un aporte ya pausado por su meta, «Pausar» no está disponible.
> - **Reanudar**: «Vuelve a generar desde hoy. Las fechas de la pausa no vuelven».
>   No disponible si ya no quedan ocurrencias, y se explica.
> - **Finalizar**: confirmación con la **lista exacta** de lo que se cancela (P3). En
>   un compromiso finito, todas las futuras («Se cancelan las cuotas 8 a 24») y las
>   por confirmar que queden; en una recurrencia sin fin, «No se crearán más desde el
>   26 nov» y la lista de las por confirmar que se cancelan. «Los movimientos ya
>   confirmados no cambian».
> - **Eliminar**, según la **historia** de ADR-016 §6.3 (que alguna vez se registró
>   un hecho, aunque ya no esté vigente):
>   - **sin historia**, se borra: «¿Eliminar Clases de natación? Nunca se confirmó,
>     vinculó ni omitió nada. Se borra» (una recurrencia de ejemplo, creada esta
>     semana). Las fechas por confirmar que tuviera desaparecen con
>     ella porque nunca fueron movimientos: **no es una cancelación** y no lleva
>     lista;
>   - **con historia**, se **archiva**, con la misma lista de cancelación que
>     finalizar y «Los movimientos confirmados siguen en Actividad»;
>   - comp obligatorio: **una recurrencia cuya única historia es una omisión
>     deshecha** (Clases de yoga): se **archiva**, no se borra.
> - **Terminó sola**: cómo se ve en la lista y en el detalle, distinta de
>   Finalizada.
>
> **07·12 Aportes programados** (FR-030 a FR-034a; ADR-018 §1 a §6; ADR-016 §7.4).
> - **Metas no cambia.** La variante base del detalle de una meta es la de hoy, sin
>   ningún elemento nuevo. Los aportes programados se crean y se gestionan desde
>   Recurrentes.
> - **Variante explícita de C-6** `[P]`, aparte de la base: en **Yo de Sara**, el
>   detalle de la meta compartida muestra su programación como información propia,
>   con el badge PRIVADO y un enlace a Recurrentes. Su instancia prevista **no** suma
>   a la meta, al progreso ni a «Tu disponible».
> - **En Nosotros, y para Tomás en cualquier contexto**, la meta compartida solo
>   muestra aportes **confirmados**, sin procedencia: idéntica con y sin la
>   programación de Sara. Cuando Sara confirma, Tomás ve un aporte de Sara igual a uno
>   manual.
> - **Confirmar** sigue **toda** la precedencia de 07·8: primero el rechazo si la
>   instancia cambió; después, las sugerencias de aportes manuales compatibles (de la
>   misma meta y de Sara), con «No, es otro pago»; y solo entonces el toque único
>   con el importe fijo («Aportar $300.000») y «Cambiar algo antes», que abre el borrador del aporte para cambiar el importe, la fecha
>   (hoy o pasada) o el modo. Con los cuatro estados de escritura.
> - **Meta lograda o archivada**: la programación queda **en pausa** con el motivo
>   («En pausa: Portátil nuevo se dio por lograda»); no se reanuda sola. Las
>   instancias por confirmar se conservan pero **no se pueden confirmar** («La meta
>   ya no admite aportes nuevos»). Sí se puede **vincular un aporte que ya existía**
>   (P2(b); ADR-018 §6), solo si cumple **todo** el filtro de ADR-016 §7.4: de la
>   misma meta y de Sara, activo, no anulado, con fecha igual a hoy o anterior y sin
>   otro vínculo. Vincularlo no crea un aporte, no mueve dinero y no reactiva la meta
>   ni la recurrencia. También se puede omitir. Reanudar solo con la meta activa otra
>   vez.
> - Llegar al 100 % **no** pausa nada: solo «Dar por lograda» o archivar (D7).
>
> **07·13 Actividad y el movimiento confirmado** (FR-018, FR-018a, FR-019, FR-061;
> ADR-016 §8 y §9). En el detalle de un movimiento creado o vinculado desde una
> instancia, **solo para quien tiene la recurrencia**, una línea «De la recurrencia
> Streaming · 20 nov» que lleva a la instancia. Estados de la cadena de P6:
> - el gasto compartido de Plan de celular, visto por **Tomás**, sin ninguna línea
>   de la recurrencia privada de Sara; con la línea de la recurrencia **compartida**
>   tras vincularlo;
> - visto por **Sara**, con la línea de su recurrencia privada («La sigue cumpliendo
>   este gasto, ahora de la pareja»), solo para ella.
>
> Diseña también, solo para la dueña, el detalle de una instancia que volvió a por
> confirmar porque **su movimiento se anuló**: «El gasto que la confirmaba se anuló.
> Vuelve a estar por confirmar». La fila de Actividad no cambia de altura a 390.
>
> **07·14 Presets de captura** (FR-070 a FR-075), con el nombre que propongas. Una
> plantilla para anotar rápido: **no prevé nada**, no aparece en el calendario ni en
> los avisos ni en ningún total. Diseña:
> - en la hoja de Anotar, una fila opcional de presets que **no añade pasos** al
>   gasto habitual (debe seguir anotándose en menos de 10 s): elegir uno rellena el
>   borrador y **nunca guarda solo**;
> - crear uno a mano y desde un movimiento («Guardar como …»), con los campos que
>   copia: tipo, contexto, categoría, importe opcional, reparto, pagador y nota;
>   nunca usos de metas, liquidaciones ni datos de una recurrencia;
> - privado por defecto, con «Compartir con la pareja» como acción explícita;
> - la lista para gestionarlos y el límite («Llegaste al máximo de …»; el número
>   lo fija la etapa Plan, usa uno de ejemplo).
>
> **07·15 Estados vacíos y límites.** Sin recurrencias, en Yo («Anota lo que se
> repite: el arriendo, el salario, un aporte mensual. Juntia te avisa cuando toque
> confirmarlo. No crea nada por su cuenta.» + «Crear recurrencia») y en Nosotros
> («No hay recurrencias de la pareja», nunca «$0»); Nosotros sin pareja; todo
> confirmado; muchas por confirmar (30); mes del calendario vacío; nombre de 60
> caracteres; condición de 140; importe en rango y desconocido; error de red al
> cargar, distinto del resultado desconocido de una escritura; carga con skeleton;
> texto al 200 %.
>
> **Motion** (describe, no animes de más): confirmar cambia la ficha de la
> instancia de su forma prevista a la real con un cambio breve; omitir la atenúa.
> Nada de celebraciones ni de animaciones de «pérdida». Con movimiento reducido,
> fundidos.
>
> **Accesibilidad (WCAG AA).** Contraste AA en claro y en oscuro, también del
> lenguaje de lo previsto; cada estado con ícono + texto, nunca solo color; las
> acciones de cada fila con nombre completo («Confirmar Internet, 95.000 pesos,
> previsto el 12 de noviembre»); la cuadrícula de escritorio, si la propones, con su
> lista equivalente; foco que vuelve al disparador al cerrar hojas; resultados de
> escritura anunciados con `aria-live`; 44 × 44 como mínimo.
>
> **Entrega:** cada pantalla a 390 y a 1440, claro y oscuro, con los estados
> pedidos, y una nota por pantalla con lo que propones (`[P]`) y lo que habría que
> verificar (`[V]`), sin dar nada por verificado. Las variantes de Q15 van lado a
> lado, igual que los escenarios de la comparación de Tomás.

---

## Datos de ejemplo para los comps

Hipotéticos, solo para el diseño; **no** son parte del dataset dorado. Hoy es el
**14 de noviembre de 2026** en los comps. Sara (petróleo) y Tomás (arena), como en
el resto del sistema.

**De la pareja** (las ven los dos):

| Recurrencia | Importe | Frecuencia | Responsable · paga | Estado en noviembre |
| --- | --- | --- | --- | --- |
| Arriendo | $1.800.000 fijo | Mensual, el 5 | Tomás · Tomás, 50/50 | Confirmada el 5 |
| Internet | $95.000 fijo | Mensual, el 12 | Sara · Sara, 50/50 | Por confirmar (12 nov). Sara ya anotó a mano un gasto compartido «Internet» de $95.000 el 12 nov: es la sugerencia de 07·8 |
| Servicios públicos | Entre $180.000 y $240.000 · estimado | Mensual, el 25 | Sara · Tomás, 50/50 | Prevista (25 nov) |
| Seguro del carro | $1.450.000 fijo | Anual, el 3 de marzo | Tomás · Sara, 60/40 | — |
| Plan de celular | $65.000 fijo | Mensual, el 8 | Tomás · Tomás, 50/50 | Por confirmar (8 nov), hasta el paso 3 de la cadena de P6 |

**Privadas de Sara** (Tomás no ve ninguna, ni su existencia):

| Recurrencia | Importe | Frecuencia | Estado en noviembre |
| --- | --- | --- | --- |
| Streaming | $38.900 fijo | Mensual, el 20 | La del 20 nov: confirmada por adelantado el 12 y vuelta a por confirmar por la anulación de su gasto el 13 (07·10) |
| Gimnasio | $120.000 fijo | Mensual, el 1 | Por confirmar (1 nov) |
| Cuota inicial del apartamento | $2.000.000 fijo | Mensual, el 10, **24 ocurrencias** | Por confirmar, cuota 7 de 24 |
| Peluquería | Entre $60.000 y $90.000 · estimado | Mensual, el 28 | Prevista |
| Plan de celular (privado) | $65.000 fijo | Mensual, el 8 | Confirmada el 8 nov: es el paso 1 de la cadena de P6 |
| Curso de inglés | $180.000 fijo | Mensual, el 10, **6 ocurrencias**, de junio a noviembre | Terminó sola el 10 nov; la de noviembre está confirmada. La de octubre se omitió y se puede deshacer: vuelve a por confirmar (07·10) |
| Clases de yoga | $90.000 fijo | Mensual, el 3, hasta el 31 de octubre | Terminó sola. Su única historia es la omisión del 3 oct, ya deshecha (vuelve a estar por confirmar): al eliminarla se archiva, no se borra (07·11) |
| Salario (ingreso habitual, fijo) | $2.600.000 | Quincenal, el 15 y el último día | Prevista (15 nov) |
| Prima de diciembre (ingreso extraordinario, estimado) | Entre $2.000.000 y $2.600.000 | Una sola vez, el 20 dic | — |
| Arriendo del local (ingreso condicional) | Importe desconocido · «Si se arrienda el local» | Mensual, el 1 | — |
| Aporte a «Fondo de emergencia» (meta compartida) | $300.000 fijo, apartado en Juntia | Mensual, el 1 | Por confirmar (1 nov) |
| Aporte a «Portátil nuevo» (meta privada, dada por lograda el 8 nov) | $150.000 fijo | Mensual, el 15 | En pausa por la meta desde el 8 nov. La del 15 oct sigue por confirmar, y Sara tiene un aporte manual de $150.000 del 16 oct, válido, no anulado y sin vincular: es el de P2(b). La del 15 nov cae en la pausa y no existe |

**Q15 (b), totales de noviembre** con estos datos (solo gastos sin resolver del
mes):

- **Yo, Sara:** Gimnasio ($120.000), Cuota inicial ($2.000.000), Streaming
  ($38.900, vuelta a por confirmar por D1, entra) y Peluquería ($60.000 a $90.000).
  El Plan de celular privado está confirmado y el Curso de inglés no tiene ninguna
  de noviembre sin resolver: no entran. Fijos: $2.158.900 en 3 gastos; estimado:
  entre $60.000 y $90.000. **(b1)** Entre $2.218.900 y $2.248.900. **(b2)**
  $2.158.900 en 3 gastos fijos · 1 estimado entre $60.000 y $90.000.
- **Nosotros**, antes del paso 3 de la cadena de P6: Internet ($95.000), Plan de
  celular ($65.000) y Servicios públicos ($180.000 a $240.000). El Arriendo ya está
  confirmado y no entra. **(b1)** Entre $340.000 y $400.000. **(b2)** $160.000 en 2
  gastos fijos · 1 estimado entre $180.000 y $240.000. Tras el paso 3 (vinculado)
  sale el Plan de celular, y tras el paso 4 (vuelve a por confirmar) entra otra vez.
- **Yo, Tomás:** sin gastos privados previstos: «No hay gastos previstos por
  confirmar este mes». No suma nada de Sara ni de la pareja, y es igual con y sin
  las recurrencias privadas de Sara.

**Presets:** «Almuerzo del trabajo» (Sara, privado, Restaurantes, sin importe) y
«Mercado de la semana» (de la pareja, Mercado, 50/50, sin importe).
