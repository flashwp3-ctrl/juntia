# Prompt para Claude Design · 006 Planes

**Estado:** listo para pegar (24 de noviembre de 2026). No se creó el proyecto desde
Claude Code: el conector de Claude Design rechazó la sesión (hay que volver a
iniciarla con `/design-login`). Pegarlo en el proyecto de Claude Design
`caabf357-a0df-4048-886f-8c46c8979c5a` («Juntia: Responsive design y design
system»), como una página nueva **«06 Planes»**, para que herede los tokens, las
fuentes y los componentes del sistema.

**Qué es y qué no.** Los comps que salgan son **propuestas** `[P]`: se aprueban
viendo la pantalla y no deciden el alcance, que depende de las respuestas a Q1–Q20
de `specs/006-planes/spec.md`. Los comps siguen la **recomendación** de cada
pregunta; donde una respuesta cambie, se ajusta el comp.

---

## Prompt

> Diseña la funcionalidad **Planes** de Juntia, app de finanzas para parejas, en
> la dirección **I2 · Bosque & Arena**, que está elegida y no se reabre. Usa el
> sistema de este proyecto tal cual: tokens de color de I2 en claro y oscuro,
> **Brygada 1918** para titulares, **Onest** con cifras tabulares para interfaz y
> dinero, **Spline Sans Mono** solo para metadatos (fechas), radios, sombras,
> `BottomSheet`, `Modal` (desde 768 px anclado arriba; confirmaciones centradas),
> `ExpenseRow`, `CategoryIcon`, `BudgetIndicator`, `SharedBalance`, `LimitNote` y
> el fallback sin foto de `GoalCard` (tinte, inicial gigante en serif e ícono
> Duotone). Iconos **solo Phosphor** con los pesos del sistema (Regular en línea,
> Fill activo, Bold en botones, Duotone en fichas); nada de emojis. Copy en
> español de Colombia, tuteo, frases cortas, COP sin decimales (`$2.400.000`).
>
> **Qué es un plan.** Un viaje, una salida o un evento («Cartagena», «Ir al
> pueblo», «Boda de Ana»). Tiene nombre, fechas opcionales, presupuesto opcional,
> foto de portada opcional y estado activo o cerrado. Puede ser **personal**
> o **de la pareja**. Al anotar un gasto se puede elegir un plan además de la
> categoría. El plan es una **etiqueta adicional**: el gasto sigue contando igual
> en Yo, Nosotros, el balance, los presupuestos del mes y Análisis. Un gasto
> tiene como máximo un plan. El plan **no es una meta**: no guarda dinero ni tiene
> aportes; no lo pintes con el verde de ahorro.
>
> **Reglas que el diseño no puede romper:**
> 1. Nunca «te alcanza», «puedes gastar $X más» ni nada que suponga liquidez. Con
>    presupuesto: «Quedan $600.000» o «Se pasaron por $300.000», y «Cerca del
>    límite» desde el 85 %, siempre con texto y forma, no solo color.
> 2. Sin presupuesto no hay barra, ni «$0», ni restante, ni exceso.
> 3. Dentro de un plan **nadie «le debe»** a nadie: por persona se muestra
>    «Pagó» y «Le corresponde», y «Diferencia en este plan». El saldo real de la
>    pareja vive en Balance; pon un enlace «Ver el balance de la pareja».
> 4. Un gasto privado (Yo) asociado a un plan de la pareja **nunca** aparece para
>    la otra persona ni se suma al total compartido. Quien lo anotó lo ve aparte,
>    debajo del total: «Tus gastos privados en este plan · $150.000 · Solo tú lo
>    ves», con el badge PRIVADO (candado). Diseña las dos vistas (Sara y Tomás) del
>    mismo plan para que se vea que la de Tomás no cambia.
> 5. El número héroe del plan es «Gastaron en Cartagena» (compartido) o «Gastaste
>    en Ir al pueblo» (personal). Nunca «Total gastado» con aportes ni «destinado».
> 6. Un gasto pagado con una meta cuenta completo y lleva la marca «Pagado con una
>    meta».
>
> **Navegación.** No hay pestaña nueva: la barra móvil sigue siendo Inicio ·
> Actividad · + · Metas · Plan. Planes vive **dentro de Actividad**, con un
> segmentado «Movimientos · Planes» bajo el título; rutas `/actividad/planes` y
> `/actividad/planes/[id]`. En escritorio, igual dentro de Actividad (rail de 76 px
> desde 1024, sidebar de 248 px desde 1280). Ojo con la palabra: el destino «Plan»
> (presupuestos) ya existe; que la pantalla nunca los confunda.
>
> **Pantallas, cada una a 390 px y a 1440 px, en claro y en oscuro:**
>
> **06·1 Lista de planes e histórico.** Activos arriba como tarjetas con portada
> (o fallback), nombre en Brygada, fechas en mono, total y, si hay presupuesto, una
> barra fina. Debajo, «Histórico»: planes cerrados en filas compactas, del más
> reciente al más antiguo: «Cartagena · 5–9 dic 2026 · Gastaron $2.400.000». Botón
> «Crear plan». En Yo: personales y, aparte, «De la pareja», sin un total que sume
> las dos listas. En Nosotros: solo los de la pareja. A 1440, rejilla editorial de
> dos o tres columnas con el histórico como columna lateral; no estires el móvil.
>
> **06·2 Crear y editar un plan.** BottomSheet en móvil, Modal de 520 px en
> escritorio. Campos: nombre (máx. 60), de quién es (Solo yo · La pareja), tipo
> visual opcional (viaje, salida, evento, otro: propone íconos Phosphor, por
> ejemplo `airplane-tilt`, `map-pin`, `confetti`, `dots-three`), fechas opcionales
> (inicio y fin), presupuesto opcional con el texto «Opcional. Sin presupuesto
> también funciona» y foto opcional. Muestra el error «La fecha de fin no puede ser
> anterior a la de inicio».
>
> **06·3 Detalle del plan.** Héroe con la portada (foto con scrim y focal point, o
> fallback), nombre, fechas, «PERSONAL» o «DE LA PAREJA» y el total. Bloques, en
> este orden: presupuesto (tres variantes: sin presupuesto, al 80 % con «Quedan
> $600.000», excedido con «Se pasaron por $300.000»); «En qué se fue», desglose por
> categoría con `CategoryIcon`, importe y porcentaje (máximo seis y «Ver todas»);
> «Quién pagó», con Sara (petróleo) y Tomás (arena): pagó, le corresponde,
> diferencia en este plan y el enlace al balance; la lista de gastos con
> `ExpenseRow`; acciones «Añadir gastos», «Editar», «Cerrar plan» / «Reabrir»,
> «Eliminar plan». A 1440: foto y cifras en una columna fija a la izquierda y los
> bloques a la derecha, como la meta inmersiva en escritorio. Incluye la variante
> del punto 4 (vista de Sara con privados y vista de Tomás).
>
> **06·4 Añadir gastos a un plan (asociar después).** Lista de gastos con selección
> múltiple, los de las fechas del plan primero, con buscador; solo los compatibles
> con el plan. Botón «Añadir 4 gastos». Estado de éxito y de error («Uno de los
> gastos cambió. Revisa la selección»).
>
> **06·5 Selector de plan en Anotar.** La hoja de Anotar actual: monto arriba y la
> rejilla de categorías de **4 × 3**. Debajo de la rejilla, una fila opcional
> «Plan · Sin plan». Si hay un plan activo cuyas fechas incluyen hoy, aparece como
> **sugerencia de un toque, sin seleccionar** («¿Es de Cartagena?»). Al tocar la
> fila, una lista corta de planes activos válidos para el contexto y «Crear plan»
> al final. No añade ningún paso obligatorio: el gasto habitual debe seguir
> anotándose en menos de 10 s. Variantes: sin planes (la fila no aparece o queda
> mínima, propón), con sugerencia, con plan elegido, y el aviso al cambiar de
> contexto «Cartagena es de la pareja; este gasto ya no lleva plan» cuando aplique.
> Incluye también el campo «Plan» en Editar gasto y la etiqueta del plan en la fila
> de Actividad sin cambiar su altura a 390.
>
> **06·6 Estados vacíos y límites.** Sin planes («Agrupa los gastos de un viaje o
> una salida. Siguen contando igual en Yo y Nosotros.» + «Crear plan»); plan sin
> gastos; histórico vacío; sin pareja en Nosotros; carga (skeleton sin saltos);
> error de red; nombre de 60 caracteres; plan con 200 gastos; texto al 200 %.
>
> **06·7 Foto de portada.** Elegir foto, reencuadrar arrastrando el focal point,
> vista previa sobre la tarjeta y el héroe, nota «La foto no se incluye en la
> exportación. Guardamos una copia sin ubicación ni datos de la cámara.»,
> cambiar y quitar. Estados: subiendo, error de formato, demasiado grande. Prueba
> el scrim con cuatro fotos: playa con cielo claro (horizontal), boda en tonos
> claros (vertical), interior oscuro y sujeto pegado al borde.
>
> **06·8 Confirmaciones.** «¿Eliminar Cartagena? Los 12 gastos seguirán en
> Actividad, sin plan. La foto se borra.»; «¿Cerrar Cartagena? Deja de aparecer al
> anotar. Puedes reabrirlo.»
>
> **Motion** (describe, no animes de más): la tarjeta del plan crece hasta el
> detalle con la misma continuidad que la meta inmersiva (`plan-photo-{id}`), y con
> movimiento reducido es un fundido. Nada de animaciones de «pérdida» al pasarse
> del presupuesto.
>
> **Entrega:** cada pantalla a 390 y a 1440, claro y oscuro, con los estados
> pedidos, y una nota por pantalla con lo que propones (`[P]`) y lo que habría que
> verificar (`[V]`), sin dar nada por verificado.

---

## Datos de ejemplo para los comps

Hipotéticos, solo para el diseño; **no** son parte del dataset dorado.

| Plan | De quién | Fechas | Presupuesto | Gastos compartidos |
| --- | --- | --- | --- | --- |
| Cartagena | La pareja | 5–9 dic 2026 | $3.000.000 | $2.400.000: Restaurantes $980.000, Transporte $720.000, Hogar (hospedaje) $520.000, Ocio $180.000. Pagó Sara $1.500.000, Tomás $900.000; a cada uno le corresponde $1.200.000 |
| Ir al pueblo | Solo Sara | sin fechas | sin presupuesto | Privados de Sara: $310.000 |
| Boda de Ana | La pareja | 14 feb 2027 | $800.000 | $860.000 (excedido por $60.000) |

Privado de Sara asociado a Cartagena: Compras $150.000 (solo lo ve Sara).
