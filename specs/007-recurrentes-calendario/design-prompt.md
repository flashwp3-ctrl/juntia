# Prompt para Claude Design · 007 Recurrentes y calendario

**Estado:** listo para pegar (26 de noviembre de 2026). No se generaron los comps
desde Claude Code: el conector de Claude Design rechazó la sesión, y hay que volver
a iniciarla con `/design-login` o pegar el prompt a mano. Va en el proyecto de
Claude Design `caabf357-a0df-4048-886f-8c46c8979c5a` («Juntia: Responsive design y
design system»), como páginas nuevas **«07 Recurrentes»**, para que hereden los
tokens, las fuentes y los componentes del sistema. Es el mismo procedimiento que
siguió Planes (`specs/006-planes/design-prompt.md`). Por su tamaño, conviene
repartirlo en dos archivos, como allí: **«11a Recurrentes 07-1-07-7»** y **«11b
Recurrentes 07-8-07-15»** (nombres de trabajo).

**Qué es y qué no.** Los comps que salgan son **propuestas** `[P]`: se aprueban
viendo la pantalla y **no deciden el alcance**, que sale de
`specs/007-recurrentes-calendario/spec.md`, de ADR-016, ADR-017 y ADR-018 y del
maestro §15.10, decisión 29. Si un comp y la spec no coinciden, manda la spec. En
particular:

- **Q15 sigue abierta** (29.4). El prompt pide las dos variantes para que los
  fundadores decidan viéndolas: **(a) sin total** y **(b) con el total de gastos
  previstos**. Si se cierra en (b), rigen P1(a), P2(a) y P3(a) de ADR-017 (29.12).
- **Los nombres visibles** («Recurrentes», «Previsto», «Por confirmar» y los demás)
  son de trabajo (Q2). Se deciden con los comps y entran en `docs/GLOSSARY.md` solo
  aprobados.
- El documento de cobertura y las cuestiones que el diseño deja a los fundadores
  están en `design-comps.md`.

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
>    pinta como barra de progreso o se pone «frente a lo real».
> 2. **Lo previsto nunca se mezcla con lo real**, ni en una suma, ni en una misma
>    tarjeta de cifras, ni en una comparación. Lo previsto tiene un lenguaje visual
>    propio y constante, que se distingue **por forma y texto, no solo por color**:
>    propón uno (por ejemplo, ficha con contorno punteado, como las proyecciones de
>    las metas, e importe en peso de texto secundario) y úsalo en todas las
>    pantallas. Lo real conserva `ExpenseRow` tal como está.
> 3. **Un aporte programado previsto no es ahorro todavía**: no lo pintes con el
>    verde de ahorro relleno ni lo sumes a la meta, a «Tu disponible» ni a nada.
> 4. **Privacidad entre Yo y Nosotros.** Una recurrencia es privada **o** de la
>    pareja, se elige al crearla y no se convierte nunca. En Nosotros solo se ve lo
>    compartido. Lo privado de una persona **nunca** aparece para la otra, ni en
>    listas, ni en recuentos, ni en avisos, ni en totales, ni en errores, ni por
>    huecos: **ni siquiera su existencia**. Los **ingresos** son siempre privados y
>    los **aportes programados** también, aunque la meta sea compartida.
> 5. **Un aporte confirmado desde una programación es indistinguible** de un aporte
>    manual para la otra persona: sin insignia, sin frecuencia, sin «programado»,
>    sin procedencia. Diseña la vista de la meta compartida de Tomás para que se vea
>    que no cambia.
> 6. **La ausencia no es cero.** Sin recurrencias, sin instancias o con importe
>    desconocido, nunca «$0», ni un guion que se lea como cero.
> 7. **Un importe estimado nunca parece exacto.** Un estimado es siempre un rango
>    («Entre $180.000 y $240.000 · estimado»), nunca su punto medio ni uno solo de
>    sus extremos.
> 8. **Un ingreso previsto nunca es dinero recibido ni seguro.** Un ingreso
>    condicional muestra siempre su condición y su rótulo de condicional.
> 9. **Terminar no es pagar.** Una recurrencia que terminó, o una ocurrencia que se
>    consumió en una pausa, nunca se presenta como deuda pagada ni como cuota
>    pagada. No uses «pagada», «saldada» ni «al día» para una instancia o una regla;
>    para lo confirmado, «Confirmada» o el texto que propongas con ese sentido.
> 10. `total_destinado_neto` no aparece en estas pantallas, y ninguna cifra se
>    rotula «Total gastado».
>
> **Navegación.** No hay pestaña nueva: la barra móvil sigue siendo Inicio ·
> Actividad · + · Metas · Plan, y en escritorio, el rail de 76 px desde 1024 y el
> sidebar de 248 px desde 1280, con Balance solo en escritorio. Recurrentes es una
> **ruta hija de Plan**, como Análisis: ruta de trabajo `/plan/recurrentes`. Desde
> el resumen de Plan se llega con una tarjeta o fila «Recurrentes». Dentro de la
> ruta, propón cómo se reparten la lista de recurrencias, el calendario y «Por
> confirmar» (por ejemplo, un segmentado «Calendario · Recurrentes» bajo el título
> y una franja «Por confirmar · 3» arriba) `[P]`. No añadas un badge a la pestaña
> Plan de la barra sin marcarlo como `[P]` aparte. El selector Yo/Nosotros funciona
> como en el resto de la app.
>
> **Nombres de trabajo** (Q2; se deciden viendo los comps, propón alternativas si
> alguno no se entiende): la ruta, **«Recurrentes»**; la instancia futura,
> **«Prevista»**; la instancia cuya fecha llegó sin resolver, **«Por confirmar»**;
> la resuelta con un movimiento real, **«Confirmada»**; **«Omitida»**,
> **«Cancelada»**. La recurrencia: **«Activa»**, **«En pausa»**, **«Terminó»**
> (sola, por fecha final o por número de ocurrencias), **«Finalizada»** (a mano) y
> **«Archivada»**. Las dos formas de terminar se distinguen siempre. Para los
> compromisos con número de ocurrencias, «cuota 7 de 24» es el texto de la spec;
> propón también una forma neutra («7 de 24») para lo que no es una cuota, como una
> suscripción. El preset necesita un nombre que **no se confunda con una
> recurrencia** (por ejemplo, «Atajo» o «Plantilla»): propón uno.
>
> **Pantallas, cada una a 390 px y a 1440 px, en claro y en oscuro, con sus
> estados de carga (skeleton sin saltos), vacío y error:**
>
> **07·1 Lista de recurrencias.** En Yo: las privadas propias, agrupadas por tipo
> (Gastos · Ingresos · Aportes a metas) y, aparte, las de la pareja, **sin ningún
> total que sume las dos listas**. En Nosotros: solo las de la pareja. Cada fila:
> ficha con `CategoryIcon` (o el ícono del tipo), nombre, frecuencia en texto
> («Cada mes, el 5», «El 15 y el último día», «Cada 2 semanas, el lunes», «Una sola
> vez, el 20 dic»), importe en su forma (fijo, rango o desconocido), próxima fecha
> en mono y estado si no está activa. Las terminadas, finalizadas y archivadas, al
> final y plegadas. Botón «Crear recurrencia». A 1440, propón una composición de dos
> columnas (lista y detalle de la seleccionada, o lista y próximas fechas) sin
> estirar el móvil.
>
> **07·2 Crear una recurrencia.** BottomSheet en móvil, Modal de 520 px en
> escritorio. Primero el **tipo**: Gasto · Ingreso · Aporte a una meta. Después,
> según el tipo:
> - **Gasto:** nombre (máx. 60), importe **fijo** o **estimado** (mínimo y máximo),
>   categoría, contexto **Solo yo · La pareja** (con la nota «No se puede cambiar
>   después»), y en la pareja, quién suele pagar y el reparto (50/50, porcentaje o
>   importe, como en Anotar).
> - **Ingreso:** solo en Yo. Tipo **Habitual · Extraordinario**; certeza **Fijo ·
>   Estimado · Condicional**. El condicional pide el texto de la condición (máx. 140
>   caracteres: «Si se arrienda el local») y si el importe es **conocido, estimado o
>   desconocido**. En Nosotros, la opción Ingreso no está disponible y se explica:
>   «Los ingresos son privados: créalos en Yo».
> - **Aporte a una meta:** la meta (propia o compartida, solo activas), importe
>   **solo fijo**, y el modo del aporte (apartado en Juntia o transferencia
>   declarada, los de Metas). Siempre privado, con la nota «Solo tú ves esta
>   programación. Tu pareja solo verá los aportes que confirmes».
> - **Frecuencia:** semanal, quincenal, mensual, trimestral, semestral, anual,
>   personalizada («cada N días, semanas o meses») y **una sola fecha**. En
>   **quincenal**, dos selectores: el primer día del **1 al 15** y el segundo del
>   **16 al último día**. En mensual, si el día es 29, 30 o 31, la ayuda «En los
>   meses más cortos, el último día».
> - **Fecha inicial** y **fin**: «Sin fin» · «Hasta una fecha» · «Un número de
>   ocurrencias», nunca los dos a la vez. Vista previa de las **próximas tres
>   fechas** bajo el formulario.
> - Si la fecha inicial está en el pasado, el aviso «Las fechas que ya pasaron
>   quedan por confirmar. No se crea ningún movimiento» con cuántas son.
> - Errores: importe mínimo ≥ máximo; condición vacía; meta no activa; nombre
>   vacío.
>
> **07·3 Detalle de una recurrencia.** Encabezado con nombre en Brygada, tipo,
> contexto (PRIVADO o DE LA PAREJA), estado, importe en su forma, frecuencia y
> próxima fecha. En un compromiso con número de ocurrencias, «cuota 7 de 24» y la
> fecha de la última. Debajo, las instancias: próximas (previstas) y anteriores, con
> su estado; las confirmadas enlazan con su movimiento en Actividad. Si hubo pausas
> en un compromiso finito, una línea «2 ocurrencias no generadas por la pausa del 3
> al 28 de feb», que nunca dice «pagadas» ni «pendientes». Acciones: «Editar»,
> «Cambiar frecuencia», «Pausar» / «Reanudar», «Finalizar», «Eliminar». Variantes:
> - **Terminó sola** con instancias anteriores aún por confirmar: siguen visibles y
>   confirmables, y la cabecera dice por qué terminó («Llegó a su fecha final» o
>   «Se programaron sus 24 ocurrencias»), nunca «Pagada».
> - **Finalizada a mano** y **Archivada**, con una instancia por confirmar que
>   reapareció: se sigue pudiendo confirmar, vincular u omitir, con la marca
>   «Recurrencia archivada».
> - **Recurrencia compartida**: «Creada por Sara · editada por Tomás el 12 nov».
> - Una regla finalizada o archivada no se edita: las acciones de edición no
>   aparecen.
>
> **07·4 Editar una recurrencia.** Se editan los datos (importe, categoría,
> pagador, reparto, nombre, certeza, condición), el día dentro de su periodo, el
> número de ocurrencias y la fecha final. El **contexto** y el **tipo** se ven de
> solo lectura, con «Para pasarla a la pareja, crea una nueva y finaliza esta». La
> **frecuencia** se ve de solo lectura con el enlace «Cambiar frecuencia». Antes de
> guardar, una **vista previa** (`ChangePreview`) con a qué instancias afecta: «Se
> aplica desde el 5 de diciembre. Las que ya llegaron conservan sus datos». Si
> reducir el número de ocurrencias o mover el día con una fecha final quita
> instancias, la vista previa las nombra («Se quitan las cuotas 21 a 24»). Si una
> instancia tiene los datos fijados por una omisión, la vista previa dice que esa
> no cambia. Conflicto en una compartida: «Tomás cambió esta recurrencia mientras
> la editabas. Revisa los cambios», sin sobrescribir nada.
>
> **07·5 Cambiar frecuencia.** Para la persona es un solo paso, aunque por dentro
> se finaliza la regla anterior y se crea una nueva. Diseña la vista previa
> completa:
> - la frecuencia nueva y desde cuándo empieza, con la explicación de por qué
>   («El periodo anual de marzo cubre hasta febrero: la mensual empieza en marzo»)
>   y la opción de elegir otra fecha posterior a hoy;
> - lo que la regla anterior **todavía cubre** o conserva (confirmadas, omitidas)
>   **junto al calendario nuevo**, para que se vean los solapes;
> - la lista explícita de las instancias **por confirmar** de la anterior que se
>   **cancelan**, con la invitación a resolverlas antes;
> - en un compromiso con número de ocurrencias, cuántas quedan en la regla nueva y
>   la fecha de la última; si no queda ninguna, el flujo lo explica y solo sigue si
>   la persona amplía el compromiso;
> - en un aporte a una meta que no está activa, el flujo no está disponible y se
>   explica.
>
> **07·6 Calendario.** **En móvil, una lista agrupada por fecha, con flechas de
> mes, sin cuadrícula** (Q14). Por defecto, el mes actual y el siguiente. Cada fila:
> fecha prevista, nombre, importe en su forma, estado; en un ingreso condicional, la
> condición; en un compromiso con número de ocurrencias, «cuota n de N»; en lo
> compartido, quién suele pagar. Las **por confirmar** con sus acciones a la vista
> (Confirmar, Vincular, Omitir); las **previstas** con las suyas en un menú; las
> **confirmadas** enlazan con Actividad. Lo real sin instancia **no** aparece: lo
> real vive en Actividad. **En escritorio, propón dos variantes** `[P]` para que
> los fundadores elijan: (i) la misma lista, más ancha, con un panel lateral del día
> o de la instancia seleccionada; (ii) una cuadrícula mensual con la lista del día
> al lado. En las dos, la lista sigue existiendo para lectores de pantalla.
>
> **07·6 · Q15, dos variantes de la cabecera del mes.** Haz cada mes de 07·6, en Yo
> y en Nosotros, **en las dos variantes**, para que se elija viéndolas:
> - **(a) Sin total.** La cabecera del mes solo tiene el mes y, como mucho, un
>   recuento de instancias por estado. Ninguna cifra agregada.
> - **(b) Con el total de gastos previstos**, con estas reglas, que no se negocian:
>   - **solo gastos**: nunca ingresos ni aportes, ni una cifra neta;
>   - **solo los sin resolver del mes**: previstas y por confirmar (las confirmadas,
>     omitidas y canceladas no entran);
>   - **en Yo, solo los gastos privados propios**; **en Nosotros, solo los de la
>     pareja**; nunca juntos;
>   - el **rótulo dice exactamente qué incluye**: que son gastos, de qué contexto,
>     de qué mes y que están **sin confirmar**, y que no son lo pagado;
>   - **solo aquí**, junto a la lista de las instancias que suma: no en Inicio, ni
>     en la tarjeta de Plan, ni junto a ninguna cifra real;
>   - **sin barra, sin porcentaje y sin comparación** con un presupuesto ni con lo
>     gastado;
>   - con estimados, dos formas que hay que mostrar **las dos** `[P]`: **(b1)** un
>     solo rango que suma los fijos en los dos extremos («Entre $2.218.900 y
>     $2.248.900»), y **(b2)** los fijos y el estimado por separado («$2.158.900 en
>     3 gastos fijos · 1 estimado entre $60.000 y $90.000»). Nunca un único número
>     que sume rangos;
>   - **ausencia**: si no hay ninguna instancia que sumar, no hay cifra sino una
>     frase neutra: «No hay gastos previstos por confirmar este mes». Nunca «$0», y
>     nunca «no tienes recurrencias» a partir de esa cifra;
>   - el caso en que todos los gastos del mes son estimados, sin ningún fijo: nunca
>     «$0 fijos».
>   Cuida que «Por confirmar» como nombre de las instancias vencidas y «sin
>   confirmar» en el rótulo del total, que también incluye las previstas futuras, no
>   se confundan: propón un rótulo que lo deje claro.
>
> **07·7 «Por confirmar», Inicio y Plan.** (Q16; avisos solo dentro de la app, sin
> push ni correo.)
> - **Por confirmar**: la lista de instancias cuya fecha llegó sin resolver, de
>   cualquier mes, la más antigua primero, con sus acciones. Incluye las que volvieron
>   a por confirmar porque se anuló su movimiento y las de recurrencias archivadas o
>   terminadas. «Todo confirmado» como estado vacío, sin celebraciones exageradas.
> - **Módulo de Inicio**: aparece **solo cuando hay instancias por confirmar**,
>   es **descartable** y **sin culpa** («Tienes 3 por confirmar», nunca «Tienes 3
>   pagos atrasados»). Lleva a Por confirmar. **No muestra importes previstos**
>   (P3 (a) y FR-050): ni por instancia ni en total. Diseña su versión en Yo y en
>   Nosotros (lo compartido lo ven los dos; lo privado, solo su dueña) y cómo queda
>   descartado: propuesta `[P]`, se oculta para quien lo descarta hasta que otra
>   instancia pase a por confirmar, y cada persona descarta el suyo. No cambia ninguna métrica real de Inicio ni se coloca dentro de una
>   tarjeta de cifras reales.
> - **Resumen de Plan**: la entrada a Recurrentes con el recuento de por confirmar.
> - La vista de Tomás de Inicio en Nosotros, con Sara teniendo instancias privadas
>   por confirmar: el recuento de Tomás **no las cuenta**.
>
> **07·8 Confirmar.** Desde el calendario, Por confirmar o el detalle:
> - **Toque único** solo con **importe fijo** y, en un ingreso, **certeza fija**:
>   el botón dice lo que crea («Confirmar gasto de $95.000»; en un ingreso fijo, el
>   importe que se confirma como recibido: «Recibí $2.600.000»). Al lado, «Cambiar
>   algo antes», que abre Anotar.
> - **Borrador de Anotar** con los datos de la instancia (la hoja de Anotar
>   existente, con una cabecera «De la recurrencia Servicios públicos · prevista el
>   25 nov»): obligatorio para un **estimado**, un **ingreso condicional** (aunque
>   su importe se conozca) y un **importe desconocido**. En un ingreso, pide «¿Cuánto
>   recibiste?»; en un estimado, propón si el campo de importe empieza **vacío**,
>   con el rango como ayuda, para no rellenar un número que parezca exacto `[P]`. La fecha efectiva se puede cambiar y **no puede ser posterior a
>   hoy**; la fecha prevista se muestra aparte y no cambia. En lo compartido se
>   pueden cambiar quién pagó y el reparto. Un gasto puede usar «Pagar con una
>   meta» como en Anotar.
> - **Confirmar una prevista antes de su fecha**: solo si ya ocurrió; el texto lo
>   dice («Solo si ya lo pagaste: la fecha no puede ser posterior a hoy»).
> - Éxito: la instancia pasa a Confirmada y el movimiento aparece en Actividad.
>   Propón si el toast lleva «Deshacer» y qué texto tiene `[P]` (deshacer anula el
>   movimiento real y la instancia vuelve a por confirmar).
> - Errores: «Esta instancia cambió. Revisa los datos nuevos» (alguien editó la
>   regla); «Tomás ya la confirmó» (instancia compartida confirmada por la otra
>   persona); en un aporte, «La meta ya no admite aportes»; sin red, «No se guardó.
>   Revisa tu conexión».
>
> **07·9 Vincular un movimiento ya anotado.** Antes de crear uno, si existe un
> movimiento real compatible, Juntia lo ofrece: «¿Ya lo anotaste?», con **hasta
> tres sugerencias** (`ExpenseRow`: descripción, fecha, importe, quién pagó) y
> «Vincular». **Nunca vincula solo.** Sin sugerencias, o si ninguna es, «Buscar otro
> movimiento»: búsqueda por texto, solo de movimientos del **mismo tipo y del mismo
> contexto** (privado con privado propio; compartido con compartido de la pareja;
> en aportes, de la misma meta y la misma aportante). Estados: sin resultados;
> éxito («Vinculado. No se creó ningún movimiento nuevo»); error («Ese movimiento
> no se puede vincular a esta instancia»), que no dice por qué si el porqué es de
> otra persona. Una sugerencia **nunca** muestra un movimiento privado de la otra
> persona.
>
> **07·10 Omitir y deshacer.** «Omitir esta vez» en una por confirmar y en una
> prevista (omisión anticipada, con acción explícita): «No se crea nada. Puedes
> deshacerlo». Deshacer, en sus variantes:
> - **disponible**: vuelve a por confirmar o a prevista según su fecha; si la regla
>   se editó mientras estaba omitida, el aviso «Vuelve con los datos que tenía al
>   omitirla»;
> - **no disponible porque la recurrencia está finalizada o archivada**: se explica
>   y no reactiva nada;
> - **no disponible porque su fecha cayó en una pausa**, aunque la recurrencia ya
>   se haya reanudado: «Su fecha quedó dentro de una pausa. Sigue omitida».
>   No hay recuperación manual: si la obligación sigue en pie, la ayuda sugiere
>   anotarla o crear una recurrencia de una sola fecha.
> - **antes de omitir** una instancia de una recurrencia archivada o finalizada, se
>   avisa de que esa omisión no se podrá deshacer.
>
> **07·11 Pausar, reanudar, finalizar y eliminar.**
> - **Pausar**: «Deja de generar fechas nuevas. Lo que ya está por confirmar se
>   queda». En un **compromiso con número de ocurrencias o fecha final**, antes de
>   confirmar, una vista previa del efecto: las ocurrencias que se consumirían si
>   reanudaras en una fecha que se elige, que **cuentan igual** para el total y **no
>   son cuotas pagadas**, y la **fecha final, que no cambia**. Nunca dice que se
>   «aplazan».
> - **Reanudar**: «Vuelve a generar desde hoy. Las fechas de la pausa no vuelven».
>   No disponible si ya no quedan ocurrencias, y se explica.
> - **Finalizar**: confirmación con la **lista exacta** de lo que se cancela. En un
>   compromiso finito, todas las futuras («Se cancelan las cuotas 8 a 24» y las por
>   confirmar que queden); en una recurrencia sin fin, «No se crearán más desde el 26
>   nov» y la lista de las por confirmar que se cancelan. «Los movimientos ya
>   confirmados no cambian».
> - **Eliminar**: sin historia, «¿Eliminar Gimnasio? No tiene nada confirmado ni
>   omitido. Se borra». Con historia, se **archiva**, con la misma lista que
>   finalizar y «Los movimientos confirmados siguen en Actividad».
> - **Terminó sola**: cómo se ve en la lista y en el detalle, distinta de
>   Finalizada.
>
> **07·12 Aportes programados.** (ADR-018.)
> - Vista de Sara de una **meta compartida** con su aporte programado: la
>   programación se ve **solo para ella**, como información propia y con el badge
>   PRIVADO, y su instancia prevista **no** suma a la meta, al progreso ni a «Tu
>   disponible». Propón si la meta enlaza con la programación y desde dónde se crea
>   (desde Recurrentes y, si lo propones, una acción en el detalle de la meta, marcada
>   `[P]`).
> - **La vista de Tomás de la misma meta**: idéntica con y sin la programación de
>   Sara. Cuando Sara confirma, Tomás ve un aporte de Sara igual a uno manual.
> - **Confirmar**: toque único con el importe fijo («Aportar $300.000») y «Cambiar
>   algo antes», que abre el borrador del aporte para cambiar el importe, la fecha
>   (hoy o pasada) o el modo.
> - **Meta lograda o archivada**: la programación queda **en pausa** con el
>   motivo («En pausa: Portátil nuevo se dio por lograda»); no se reanuda sola. Las
>   instancias por confirmar se conservan pero **no se pueden confirmar** («La meta
>   ya no admite aportes nuevos»); sí se puede **vincular** un aporte que ya
>   existía, de la misma meta y de Sara («Vincular un aporte que ya hiciste»), y
>   omitir. Reanudar solo con la meta activa otra vez.
> - Llegar al 100 % **no** pausa nada: solo «Dar por lograda» o archivar.
>
> **07·13 Actividad y el movimiento confirmado.** En el detalle de un movimiento
> creado o vinculado desde una instancia, **solo para quien tiene la recurrencia**,
> una línea «De la recurrencia Streaming · 20 nov» que lleva a la instancia. La otra
> persona no ve esa línea en un gasto compartido que nació de una recurrencia
> privada movida a Pareja. Diseña también, solo para la dueña, el detalle de una
> instancia que volvió a por confirmar porque **su movimiento se anuló**: «El gasto
> que la confirmaba se anuló. Vuelve a estar por confirmar». La fila de Actividad no
> cambia de altura a 390.
>
> **07·14 Presets de captura** (con el nombre que propongas). Una plantilla para
> anotar rápido: **no prevé nada**, no aparece en el calendario ni en los avisos ni
> en ningún total. Diseña:
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
> cargar; carga con skeleton; texto al 200 %.
>
> **Motion** (describe, no animes de más): confirmar cambia la ficha de la
> instancia de su forma prevista a la real con un cambio breve; omitir la atenúa.
> Nada de celebraciones ni de animaciones de «pérdida». Con movimiento reducido,
> fundidos.
>
> **Accesibilidad.** Cada estado con ícono + texto, nunca solo color; las acciones
> de cada fila con nombre completo («Confirmar Internet, 95.000 pesos, previsto el
> 12 de noviembre»); la cuadrícula de escritorio, si la propones, con su lista
> equivalente; foco que vuelve al disparador al cerrar hojas; 44 × 44 como mínimo.
>
> **Entrega:** cada pantalla a 390 y a 1440, claro y oscuro, con los estados
> pedidos, y una nota por pantalla con lo que propones (`[P]`) y lo que habría que
> verificar (`[V]`), sin dar nada por verificado. Las variantes de Q15 van lado a
> lado.

---

## Datos de ejemplo para los comps

Hipotéticos, solo para el diseño; **no** son parte del dataset dorado. Hoy es el
**14 de noviembre de 2026** en los comps. Sara (petróleo) y Tomás (arena), como en
el resto del sistema.

**De la pareja** (las ven los dos):

| Recurrencia | Importe | Frecuencia | Paga | Estado en noviembre |
| --- | --- | --- | --- | --- |
| Arriendo | $1.800.000 fijo | Mensual, el 5 | Tomás, 50/50 | Confirmada el 5 |
| Internet | $95.000 fijo | Mensual, el 12 | Sara, 50/50 | Por confirmar (12 nov) |
| Servicios públicos | Entre $180.000 y $240.000 · estimado | Mensual, el 25 | Tomás, 50/50 | Prevista (25 nov) |
| Seguro del carro | $1.450.000 fijo | Anual, el 3 de marzo | Sara, 60/40 | — |

**Privadas de Sara** (Tomás no ve ninguna, ni su existencia):

| Recurrencia | Importe | Frecuencia | Estado en noviembre |
| --- | --- | --- | --- |
| Streaming | $38.900 fijo | Mensual, el 20 | Prevista |
| Gimnasio | $120.000 fijo | Mensual, el 1 | Por confirmar (1 nov) |
| Cuota inicial del apartamento | $2.000.000 fijo | Mensual, el 10, **24 ocurrencias** | Por confirmar, cuota 7 de 24 |
| Peluquería | Entre $60.000 y $90.000 · estimado | Mensual, el 28 | Prevista |
| Salario (ingreso habitual, fijo) | $2.600.000 | Quincenal, el 15 y el último día | Prevista (15 nov) |
| Prima de diciembre (ingreso extraordinario, estimado) | Entre $2.000.000 y $2.600.000 | Una sola vez, el 20 dic | — |
| Arriendo del local (ingreso condicional) | Importe desconocido · «Si se arrienda el local» | Mensual, el 1 | — |
| Aporte a «Fondo de emergencia» (meta compartida) | $300.000 fijo, apartado en Juntia | Mensual, el 1 | Por confirmar (1 nov) |
| Aporte a «Portátil nuevo» (meta privada, dada por lograda el 8 nov) | $150.000 fijo | Mensual, el 15 | En pausa por la meta |

**Q15 (b), totales de noviembre** con estos datos (solo gastos sin resolver del
mes):

- **Yo, Sara:** Gimnasio, Cuota inicial, Streaming y Peluquería. Fijos: $2.158.900
  en 3 gastos; estimado: entre $60.000 y $90.000. **(b1)** Entre $2.218.900 y
  $2.248.900. **(b2)** $2.158.900 en 3 gastos fijos · 1 estimado entre $60.000 y
  $90.000.
- **Nosotros:** Internet y Servicios públicos (el Arriendo ya está confirmado y no
  entra). **(b1)** Entre $275.000 y $335.000. **(b2)** $95.000 en 1 gasto fijo · 1
  estimado entre $180.000 y $240.000.
- **Yo, Tomás:** sin gastos privados previstos: «No hay gastos previstos por
  confirmar este mes». No suma nada de Sara ni de la pareja.

**Presets:** «Almuerzo del trabajo» (Sara, privado, Restaurantes, sin importe) y
«Mercado de la semana» (de la pareja, Mercado, 50/50, sin importe).
