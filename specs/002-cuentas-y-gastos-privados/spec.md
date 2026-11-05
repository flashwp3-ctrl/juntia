# Feature Specification: 002 · Cuentas y gastos privados (P0-1)

**Feature Branch**: `docs/spec-002-specify` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5)

**Created**: 2026-11-04

**Status**: Draft — Specify y Clarify hechos. No avanza a Plan sin el merge de su PR documental (ADR-012 §3.1).

**Input**: User description: "Especificación 002 · P0-1 de Juntia, «Cuentas y gastos privados con UI final, no placeholder» (maestro §11). Auth con correo y contraseña, sesiones seguras, perfiles, migraciones y RLS individual; dinero y movimientos privados (gastos e ingresos), categorías, historial por meses y dashboard sin presupuesto; Expense Flow conectado al servidor; Mi cuenta; exportación de los movimientos propios; copia de seguridad antes de usar datos reales. Acceso a datos según ADR-013. Hereda las verificaciones de la decisión 12. Sin pareja, repartos, balances, presupuestos ni metas."

> **Qué es este documento.** Dice **qué** construye P0-1. **No decide nada**:
> cada requisito cita la decisión que aplica. Jerarquía: maestro (§15 prevalece)
> > ADR > paquete de `docs/design/` y `docs/CONVENTIONS.md` > esta spec
> (`AGENTS.md` §2). En este archivo, `[P]` significa **propuesta** y `[V]`
> **verificación pendiente**, según el maestro §15.9; no significan
> «paralelizable» (eso solo ocurre dentro de `tasks.md`, ADR-012 §3.2).

### Fuentes que aplica

| Fuente | Qué aporta a P0-1 |
| --- | --- |
| Maestro §11, «P0-1» y backlog P0-1a/P0-1b | Alcance del slice y salida interna: una persona registra, edita y anula movimientos reales y los entiende en una UI premium |
| Maestro §15.1 | P0-1 cierra F0-b junto con la 001: Expense Flow conectado al servidor y el dataset dorado de P0-1 |
| Maestro §15.3 y §15.5 | Navegación y rutas de Cuenta; autenticación, perfil, preferencias y exportación cerrados para P0 |
| Maestro §15.6.1 y §15.6.3 | Eliminar cuenta como no disponible; verificaciones que bloquean la aceptación del slice |
| Maestro §15.7 | Umbrales de rendimiento que bloquean la aceptación |
| Maestro §15.10, decisiones 12, 13, 14 y 15, y «Dataset dorado» | Verificaciones heredadas de la 001, dueño del repositorio y despliegue, tipografía, acceso a datos y la parte del dataset dorado de P0-1 |
| Maestro §15.10, decisión 16 | Las doce decisiones de alcance de P0-1 (sección «Clarifications») |
| Maestro §5, §7.1–7.5, §10.1–10.3 | Reglas de dinero, stack, estructura, modelo relacional, privacidad, persistencia y definición de terminado |
| Maestro §3, US-01, US-05, US-06, US-12, US-13, US-15, US-17 | Historias de usuario que P0-1 hace verificables |
| ADR-013 | Acceso a datos: esquemas, `juntia_writer`, concurrencia, importes como texto, privilegios y sus diez `[V]` |
| ADR-011 y `docs/TESTING.md` | Capas de prueba, specs E2E 1 y 2, job SQL/RLS, siembra por base de datos, presupuestos y reglas duras |
| ADR-012 | Formato de esta spec, gates por PR documental, `[P]` y `[V]` |
| `docs/design/HANDOFF_CLAUDE_CODE.md` | Mi cuenta, autenticación, accesibilidad, rendimiento, criterios de aceptación |
| `docs/design/COMPONENT_SPECIFICATIONS.md` | Anotar E1–E5, sección Cuenta, ExpenseRow, Badge, Skeleton, LimitNote, Toast, Modal |
| Claude Design, `Juntia DS v1 - 02 Componentes` (02·5, 02·6) y `04 Pantallas` (04·1, 04·6, 04·7, 04·14, 04·16, 04·17, 04·18, 04·19) | Pantallas y estados que P0-1 construye |
| `docs/CONVENTIONS.md` y `docs/GLOSSARY.md` | Idioma por capa, módulo de copy, nombres |

## Clarifications

Las doce respuestas son **decisiones de los fundadores del 4 de noviembre de
2026**, tomadas sobre la hoja de decisiones de P0-1 con la recomendación del
gestor, y registradas como decisión 16 del maestro §15.10. Esta spec las
registra y las aplica; no las toma. Aprobación: el primer fundador, en la
conversación del 4 de noviembre; la segunda fundadora, con el merge de este PR
documental.

### Session 2026-11-04

- Q1: ¿Una especificación o dos para P0-1? → A: **Una**, la 002, con **cuatro PR de implementación seguidos**: (A) base de datos, seguridad y dinero; (B) Acceso y Mi cuenta; (C) Anotar, editar y eliminar; (D) Inicio, Actividad, exportación y las verificaciones heredadas.
- Q2: ¿Se aprueba el flujo de Anotar E1–E5 `[P]`? → A: **Sí, en su versión privada.** Sin «Pagó», «Participan» ni «Reparto», porque en P0-1 no existe la pareja. Monto, categoría, fecha y descripción, con el «Deshacer» de 6 s al guardar.
- Q3: ¿Cómo se anota un ingreso, que no está diseñado? → A: Con un selector **«Gasto · Ingreso»** arriba de la hoja de Anotar y la categoría «Ingresos». Se diseña siguiendo el sistema y se aprueba viendo la pantalla en el PR C (maestro §15.9).
- Q4: ¿«Eliminar» o «anular»? → A: La interfaz dice **«Eliminar»**, con el diálogo diseñado (02·1, «¿Eliminar este gasto?»). Por dentro, el movimiento queda **anulado y auditado**: sale de listas y totales, pero no se borra (maestro §5.2, §5.4). Sin «Deshacer» después de eliminar.
- Q5: ¿Qué muestra Inicio sin pareja, y Nosotros? → A: En **Yo**, el Inicio diseñado (04·1) sin los bloques compartidos. En **Nosotros**, un estado «todavía no disponible» que explica que llega cuando exista la pareja, como Balance en la 001. Los estados vacío, cargando y error siguen el patrón de 04·6 y el Skeleton de 02·1. Se aprueban viendo las pantallas en el PR D.
- Q6: ¿Se aprueba la sección Cuenta y Acceso `[P]`? → A: **Sí, la anatomía tal como está** (04·14 a 04·19). P0-1 construye todo menos Mi pareja, que muestra «llega con P0-2». En la primera entrada (A6) no aparece «Invitar a mi pareja».
- Q7: ¿Se aprueba la persistencia del tema `[P][V]`? → A: **Sí**: en `profiles` y en una cookie que lee el script bloqueante. Su `[V]` se ejecuta antes de cerrar el plan.
- Q8: ¿Qué es «calendario» en P0-1? → A: El resumen del mes de Actividad con **flechas de mes anterior y siguiente**, y la fecha de cada movimiento elegida en Anotar. Sin vista de cuadrícula.
- Q9: ¿Quién se puede registrar? → A: **Hasta MVP-1, solo los correos de los dos fundadores**, con una lista permitida que valida la base de datos. El aviso de términos dice que es una versión privada de prueba, sin texto legal inventado. Los términos definitivos son pendiente de lanzamiento.
- Q10: ¿Dónde vive Supabase? → A: Proyecto **Free en la cuenta de la segunda fundadora**, región **São Paulo**, con el correo de Supabase para P0-1. Un servidor de correo propio queda para antes de MVP-1.
- Q11: ¿Qué recuperación hace falta antes de datos reales? → A: Antes del primer dato real, **una copia completa de la base, cifrada y guardada fuera de Supabase, y una restauración de prueba en local**, con salida en la evidencia. Después, una copia semanal con un comando documentado que ejecuta un fundador.
- Q12: ¿Exportar entra en P0-1? → A: **Sí**, JSON y CSV de los movimientos privados propios. P0-3 lo completa con la pareja y las metas.

### Session 2026-11-04 (revisión del PR #35)

Tres preguntas que la primera revisión adversarial encontró decididas sin
aprobación. Las respondió el primer fundador el 4 de noviembre de 2026; se suman
a la decisión 16 del maestro y la segunda fundadora las confirma con el merge.

- Q13: ¿Se permite una fecha futura en un movimiento? → A: **Sí.** Actividad tiene que dejar llegar a cualquier mes futuro que tenga movimientos, para que ninguno quede inaccesible.
- Q14: ¿Se puede cambiar de gasto a ingreso, o al revés, al editar? → A: **No.** El tipo queda fijo; para corregirlo se elimina y se anota de nuevo.
- Q15: ¿Qué pasa si el mismo movimiento se edita casi a la vez en dos sitios? → A: **La segunda edición falla y lo explica**, con control de versión, como en los presupuestos. Nada se pierde en silencio.

## User Scenarios & Testing *(mandatory)*

Los actores son las dos personas fundadoras, que usan Juntia con sus datos
reales en el teléfono y en el escritorio, y que revisan cada PR. Sara y Tomás
son los nombres del dataset dorado y de las pruebas.

### User Story 1 - Crear la cuenta, verificarla y entrar (Priority: P1)

Una de las dos personas fundadoras abre Juntia, crea su cuenta con su nombre
visible, su correo y una contraseña, recibe un enlace de verificación y entra.
Si olvida la contraseña, pide un enlace y crea una nueva. Ninguna pantalla revela
si un correo tiene cuenta. Alguien con un correo que no está en la lista
permitida no puede registrarse.

**Why this priority**: sin cuenta no hay datos propios ni RLS que probar. Es la
puerta de todo el slice (maestro §11, P0-1a).

**Independent Test**: con Supabase local, registrar un correo permitido,
verificarlo, entrar, cerrar sesión, recuperar la contraseña y volver a entrar; e
intentar registrar un correo no permitido. Es la parte de acceso de la spec E2E 1.

**Acceptance Scenarios**:

1. **Given** un correo de la lista permitida, **When** la persona completa «Crea tu cuenta» (04·17 A2) y acepta el aviso de versión privada de prueba, **Then** la cuenta queda pendiente de verificación y ve «Verifica tu correo» (A3) con «Reenviar enlace» (§15.5; Q9).
2. **Given** un correo que no está en la lista permitida, **When** intenta crear la cuenta, **Then** no se crea ninguna cuenta y el mensaje es el mismo que vería cualquier persona, sin revelar si el correo existe ni por qué se rechazó (§15.5, «Sin enumeración»; Q9).
3. **Given** una cuenta sin verificar, **When** intenta entrar, **Then** ve el estado A1c y puede pedir otro enlace (04·17).
4. **Given** una cuenta verificada, **When** entra con la contraseña correcta, **Then** llega a la primera entrada (A6) la primera vez, y a Inicio las siguientes; con la contraseña incorrecta ve «Correo o contraseña incorrectos.» (A1b) sin indicar cuál de los dos falló.
5. **Given** «Recupera tu acceso» (A4), **When** pide el enlace para cualquier correo, **Then** ve siempre el mismo «enlace enviado» (A4b), exista o no la cuenta; con el enlace válido crea una contraseña nueva (A5).
6. **Given** una sesión abierta, **When** cierra sesión desde Seguridad y sesión, **Then** ve los estados S1 y S3 («Cerraste sesión en este dispositivo.») y ninguna ruta de producto muestra datos sin volver a entrar.
7. **Given** la primera entrada (A6), **When** la ve, **Then** solo ofrece «Empezar por mi cuenta», sin «Invitar a mi pareja», y dice que no se le pide un presupuesto (Q6; US-13).

---

### User Story 2 - Anotar un gasto privado en segundos (Priority: P1)

Sara toca Anotar (o pulsa `N` en escritorio), escribe el monto con el teclado
nativo, elige una categoría y guarda. Si quiere, abre los detalles y cambia la
fecha o añade una descripción. La hoja se cierra, el total de Inicio sube, la
fila nueva aparece resaltada y un toast le ofrece «Deshacer» durante 6 s.

**Why this priority**: es el flujo central del producto (maestro §15.9, fila de
Anotar) y la salida interna de P0-1. US-12 fija la mediana de menos de 10 s.

**Independent Test**: la spec E2E 2, cronometrada, registra un gasto típico con
sesión sembrada y comprueba que el servidor lo guarda una sola vez aunque se
pulse Guardar dos veces.

**Acceptance Scenarios**:

1. **Given** cualquier ruta de producto, **When** Sara activa Anotar, **Then** se abre la hoja (móvil) o el diálogo de 520 px (≥ 768 px) con el foco en el monto, el teclado nativo `inputmode="numeric"` y la máscara de COP (02·5 E1; decisión 11).
2. **Given** E1, **When** escribe un monto y elige una de las categorías recientes, **Then** Guardar se habilita sin abrir los detalles; el resumen muestra la fecha (hoy por defecto) y no muestra «Pagó», «Participan» ni «Reparto» (Q2).
3. **Given** E2 (detalles), **When** los abre, **Then** puede cambiar categoría, descripción y fecha; el contexto es Yo y no se puede cambiar en P0-1 (Q2).
4. **Given** Guardar pulsado, **When** el servidor responde, **Then** se ve E4 («Guardando…», campos bloqueados) y después E5: la hoja se cierra, el total cuenta hacia arriba, la fila nueva queda resaltada y aparece «Gasto guardado · Deshacer» durante 6 s (02·5).
5. **Given** el toast de E5, **When** Sara pulsa «Deshacer» dentro de los 6 s, **Then** el gasto queda anulado y auditado, el total vuelve a su valor anterior y la fila desaparece (Q2, Q4; maestro §5.4).
6. **Given** un doble toque en Guardar o un reintento por red, **When** llegan dos peticiones con la misma intención, **Then** el servidor registra un solo gasto (maestro §5.4, idempotencia; ADR-013 §3).
7. **Given** un error de red o de servidor, **When** falla el guardado, **Then** la hoja sigue abierta con los datos, aparece «No pudimos guardar… Reintentar» y reintentar usa la misma clave de idempotencia (02·5; ADR-013 §3).
8. **Given** el teléfono real de un fundador tras la primera entrada, **When** registra gastos habituales, **Then** la mediana de tiempo es menor de 10 s (US-12; §15.7).

---

### User Story 3 - Anotar un ingreso privado (Priority: P1)

Sara recibe un reembolso y lo anota desde la misma hoja, eligiendo «Ingreso» en
el selector. El ingreso aparece en Actividad con su signo «+», su ícono y la
ficha de Ingresos, y no cuenta como gasto.

**Why this priority**: el maestro §11 pone los ingresos privados en P0-1, y el
contrato por tipo (§7.3) los define como privados.

**Independent Test**: anotar un ingreso y comprobar en Actividad y en Inicio que
se distingue del gasto y que no suma al gasto del mes.

**Acceptance Scenarios**:

1. **Given** la hoja de Anotar, **When** Sara elige «Ingreso» en el selector «Gasto | Ingreso», **Then** el título, la categoría («Ingresos») y el botón cambian a ingreso, y el resto del flujo es igual (Q3).
2. **Given** un ingreso guardado, **When** aparece en Actividad, **Then** se muestra como la fila de ingreso de 02·1 («+», ficha arena, ícono `arrow-down-left`), en tinta y no en verde (`DESIGN_SYSTEM.md` §4, «Gasto, ingreso y liquidación en tinta» `[P]`).
3. **Given** el gasto del mes en Inicio o en Actividad, **When** hay ingresos en el mes, **Then** el gasto del mes no los incluye (maestro §5.3, «Ingresos y liquidaciones no cuentan como consumo»).

---

### User Story 4 - Editar y eliminar un movimiento con rastro (Priority: P1)

Sara se equivocó en un monto. Abre el detalle del gasto, lo edita y guarda. Otro
gasto lo anotó dos veces: lo elimina, confirmando en el diálogo. Ninguno de los
dos cambios borra el historial.

**Why this priority**: la salida interna de P0-1 es «registra, edita y anula»
(maestro §11), y US-06 exige historial auditado.

**Independent Test**: editar y eliminar con sesión sembrada; comprobar en SQL que
queda un registro de auditoría con actor, instante y valores anterior y nuevo, y
que el eliminado no cuenta en ningún total.

**Acceptance Scenarios**:

1. **Given** el detalle de un movimiento propio (04·1 DETALLE, o el panel de 04·7 en escritorio), **When** Sara elige Editar, **Then** ve la edición de 04·1 sin el texto de pareja («tu pareja verá…»), con monto, categoría, fecha y descripción editables; el tipo (gasto o ingreso) no se puede cambiar (Q2, Q14).
2. **Given** una edición guardada, **When** el servidor la confirma, **Then** el movimiento muestra los valores nuevos y la auditoría guarda actor, instante, valor anterior y nuevo, en una sola operación atómica (maestro §5.4).
3. **Given** el detalle de un movimiento, **When** Sara elige «Eliminar gasto» y confirma en el diálogo «¿Eliminar este gasto?», **Then** el movimiento queda anulado: desaparece de Actividad, de Inicio y de la exportación, y su rastro de auditoría se conserva (Q4; maestro §5.2).
4. **Given** el diálogo de eliminar, **When** Sara cancela o pulsa Escape, **Then** no cambia nada y el foco vuelve al botón.
5. **Given** dos ediciones casi simultáneas del mismo movimiento (dos pestañas), **When** llegan al servidor, **Then** ninguna se pierde en silencio: la segunda, si se basó en una versión anterior, falla con un error que lo explica (Q15; ADR-013 §3).

---

### User Story 5 - Ver Inicio con mis datos, sin presupuesto (Priority: P1)

Sara abre Inicio y ve lo que gastó este mes, por categoría, y sus últimos
movimientos. No hay presupuesto, ni «restante», ni barras vacías, ni nada
compartido. Si cambia a Nosotros, ve que eso llega cuando exista la pareja.

**Why this priority**: es la cara de la salida interna y de US-01 y US-13: el
dashboard funciona sin presupuesto y nunca finge un límite.

**Independent Test**: con el dataset dorado de P0-1 sembrado, Inicio en Yo
muestra exactamente los totales de octubre de Sara; sin datos, muestra el estado
vacío; con la red cortada, el estado de error.

**Acceptance Scenarios**:

1. **Given** el dataset dorado de P0-1 en octubre de 2026, **When** Sara abre Inicio en Yo, **Then** el gasto del mes es **412.900** y la suma por categoría coincide con las filas del dataset (§15.10, «Dataset dorado», regla 2).
2. **Given** Inicio en Yo, **When** se muestra, **Then** no aparecen «Tu parte compartida», filas compartidas, saldos, «presupuesto», «restante», «excedido» ni barras de límite (Q5; US-01; US-13; maestro §5.3).
3. **Given** el selector en Nosotros, **When** se muestra Inicio, Actividad, Metas, Plan o Balance, **Then** se ve el estado «todavía no disponible» que explica que llega cuando exista la pareja, sin ninguna cifra ni dato privado (Q5; US-14).
4. **Given** una cuenta sin movimientos, **When** abre Inicio, **Then** ve el estado vacío diseñado con su texto útil y la invitación a Anotar, nunca «$0» (Q5; 04·6).
5. **Given** la carga de Inicio, **When** los datos todavía no llegaron, **Then** se ve el Skeleton con la misma geometría que el resultado final y CLS = 0 al llegar (02·1; §15.7).
6. **Given** un error de red o de servidor, **When** falla la carga, **Then** se ve el estado de error de red con Reintentar (04·6).
7. **Given** 1024 px o más, **When** abre Inicio, **Then** ve el layout de escritorio de 04·7 sin los módulos compartidos, no el móvil ampliado (US-15).

---

### User Story 6 - Recorrer Actividad por día y por mes (Priority: P2)

Sara abre Actividad y ve sus movimientos agrupados por día («HOY · 24 OCT»,
«AYER»), con el resumen del mes arriba. Va al mes anterior con la flecha, busca
un gasto por su descripción y filtra por tipo o categoría. En escritorio ve la
tabla con el panel de detalle.

**Why this priority**: es el «historial y calendario» del maestro §11. Sin él,
editar y eliminar no tienen dónde vivir.

**Independent Test**: con el dataset sembrado, recorrer octubre y septiembre,
buscar y filtrar, en móvil y a 1440 px.

**Acceptance Scenarios**:

1. **Given** Actividad, **When** se muestra, **Then** los movimientos del mes están agrupados por día, del más reciente al más antiguo, con el resumen «Gasto de octubre» arriba (04·1 ACTIVIDAD).
2. **Given** el resumen del mes, **When** Sara pulsa la flecha de mes anterior o siguiente, **Then** cambia el mes, el resumen y la lista (Q8). Cómo se conserva el mes elegido al recargar lo decide el plan.
3. **Given** movimientos con fecha futura, **When** Sara avanza con la flecha de mes siguiente, **Then** llega hasta el mes más lejano que tenga movimientos; más allá, la flecha no avanza a meses vacíos (Q8, Q13).
4. **Given** el buscador, **When** escribe parte de una descripción, **Then** la lista se filtra a los movimientos del mes que coinciden; el filtro de tipo (gasto o ingreso) y de categoría funcionan igual (04·1, 04·7).
5. **Given** 1440 px, **When** abre Actividad, **Then** ve la tabla de 04·7 (Descripción · Fecha · Monto, sin la columna «Pagó·Reparto», que es de pareja) con el panel de detalle a la derecha.
6. **Given** un mes sin movimientos, **When** lo abre, **Then** ve el estado vacío (04·6 SIN ACTIVIDAD) con texto de contexto privado, no el compartido («Cuando alguno de los dos anote…»).
7. **Given** los límites de mes, **When** un movimiento tiene fecha en el último día del mes, **Then** cuenta en ese mes según la zona horaria `America/Bogota` (maestro §5.2).

---

### User Story 7 - Manejar mi cuenta, mi tema y mi sesión (Priority: P2)

Sara abre Mi cuenta desde el avatar, cambia su nombre visible, elige el tema
oscuro y cambia su contraseña con un enlace seguro. En su otro dispositivo, al
entrar, Juntia ya está en oscuro, sin destello.

**Why this priority**: Mi cuenta es la sección aprobada (Q6) y la persistencia
del tema es el `[P][V]` aprobado (Q7). Cierra el acceso mínimo de la 001.

**Independent Test**: la parte de Mi cuenta de la spec E2E 1 y las pruebas del
tema en dos contextos de navegador.

**Acceptance Scenarios**:

1. **Given** cualquier destino principal, **When** Sara toca el avatar (AccountButton) o el perfil al pie del sidebar, **Then** llega a Mi cuenta (04·14 C1), sin sexta pestaña ni menú (§15.3).
2. **Given** Mi perfil, **When** edita el nombre visible, **Then** ve los estados P1 a P5 (editando, validación, guardando, guardado, error); el correo se muestra y no se puede editar; el avatar usa la inicial y el color del sistema (§15.5, «Perfil»).
3. **Given** Apariencia (04·16 T1), **When** elige Claro, Oscuro o Sistema, **Then** el tema cambia con la transición de 180 ms (instantáneo con movimiento reducido) y queda guardado en el perfil y en una cookie (Q7).
4. **Given** el tema guardado, **When** entra en otro dispositivo o recarga, **Then** el primer pintado ya usa ese tema, sin cuadro del tema contrario y con CLS = 0 (Q7; §15.7).
5. **Given** Seguridad y sesión (G1), **When** pide cambiar la contraseña, **Then** recibe un enlace seguro y ve G2 («enlace enviado»).
6. **Given** Mi pareja, **When** la abre, **Then** ve un estado que dice que la pareja llega con P0-2, sin formulario de invitación (Q6).
7. **Given** Privacidad y datos (D1), **When** la abre, **Then** «Eliminar tu cuenta» aparece como LimitNote de «no disponible», no como botón (§15.6.1).

---

### User Story 8 - Exportar mis movimientos (Priority: P2)

Sara descarga sus movimientos en JSON o CSV desde Privacidad y datos. El archivo
tiene solo lo suyo y la pantalla aclara que no sirve para restaurar.

**Why this priority**: es la protección básica de los datos privados que el
maestro §11 sitúa en P0-1 (Q12).

**Independent Test**: contenido y autorización en integración de servidor; la
descarga real, caso de la spec E2E 1 (`docs/TESTING.md`, matriz de recorridos).

**Acceptance Scenarios**:

1. **Given** Exportar (04·16 D2), **When** elige JSON o CSV y pulsa exportar, **Then** ve «preparando» (D3) y después «listo» (D4) con Descargar; si falla, D5 dice que no se descargó nada.
2. **Given** el archivo, **When** se inspecciona, **Then** contiene solo los movimientos activos de la persona, con importes exactos como texto, y no contiene tokens, identificadores internos de otras personas ni movimientos anulados (§15.5, «Exportación»; ADR-013 §4).
3. **Given** la pantalla de Exportar, **When** se muestra, **Then** dice qué incluye, qué no y que no sirve para restaurar (`COMPONENT_SPECIFICATIONS.md` §Exportar).

---

### User Story 9 - Nadie más ve ni cambia mis datos (Priority: P1)

Tomás tiene su propia cuenta. Aunque llame a la API directamente con su sesión,
no ve ni cambia nada de Sara. Ni siquiera Sara puede escribir sus importes
saltándose las operaciones de Juntia.

**Why this priority**: es US-05 y el bloque «Base de datos/seguridad» que §10.1
marca como **bloqueante**. ADR-013 fija el mecanismo y sus diez `[V]`.

**Independent Test**: tests SQL/RLS con pgTAP en Supabase local y peticiones
reales a la API pública con el JWT de otra persona.

**Acceptance Scenarios**:

1. **Given** dos cuentas, Sara y Tomás, **When** Tomás consulta las vistas de `public` o llama a cualquier función con su JWT, **Then** no obtiene ningún movimiento, total ni dato de Sara (US-05; maestro §7.4).
2. **Given** el JWT de Sara, **When** intenta `insert`, `update` o `delete` directos sobre cualquier tabla controlada por la API pública, **Then** falla, también sobre sus propias filas (ADR-013 §2, [V] 2).
3. **Given** la API pública, **When** se busca `juntia_data` o `juntia_private` por PostgREST o por `/graphql/v1`, **Then** no son alcanzables (ADR-013 §1, §5.3).
4. **Given** las funciones que escriben, **When** se llaman directamente por SQL con el rol `authenticated` y el JWT de otra persona, **Then** aplican la misma autorización, RLS e invariantes (ADR-013 [V] 1).
5. **Given** un importe de `9007199254740993` en unidades menores, **When** se escribe y se lee por funciones y vistas, **Then** vuelve idéntico (ADR-013 §4, [V] 6).

---

### User Story 10 - Empezar a usar datos reales con copia de seguridad (Priority: P2)

Antes de anotar su primer gasto real, un fundador hace una copia completa de la
base, cifrada y fuera de Supabase, y la restaura en un PostgreSQL normal en su
equipo, sin Docker. El procedimiento completo se prueba además en un runner efímero
de CI con datos de prueba (decisión 17). A partir de ahí, una
vez por semana, repite la copia con el comando documentado.

**Why this priority**: el maestro §11 y CLAUDE.md 11 permiten datos reales en
P0-1 solo tras validar la recuperación (Q11).

**Independent Test**: ejecutar el procedimiento de copia y restauración y pegar
la salida en la evidencia del slice.

**Acceptance Scenarios**:

1. **Given** el proyecto de producción, **When** se ejecuta el procedimiento de copia, **Then** produce un archivo cifrado con el esquema y los datos, guardado fuera de Supabase y del repositorio (Q11; maestro §7.4).
2. **Given** el procedimiento de restauración, **When** se prueba en un runner efímero de CI con datos de prueba y el mismo esquema, **Then** termina sin errores y los totales coinciden; **and Given** la copia real, **When** el fundador la descifra y la restaura en un PostgreSQL normal en su equipo, **Then** los esquemas y datos de Juntia restauran sin errores y los recuentos de filas coinciden con producción. La copia real nunca pasa por CI (Q11; decisión 17).
3. **Given** el procedimiento documentado, **When** un fundador lo sigue sin ayuda, **Then** puede repetir la copia semanal (Q11).
4. **Given** que ninguna copia y restauración tiene salida registrada, **When** se pregunta si ya se pueden usar datos reales, **Then** la respuesta es no (Q11; maestro §11).

---

### User Story 11 - Cerrar las verificaciones heredadas y aceptar P0-1 (Priority: P3)

Los fundadores y el gestor cierran las verificaciones que la 001 no podía hacer
(decisión 12), ahora con el flujo real de Anotar y con previews, y aceptan P0-1.

**Why this priority**: P0-1 no se acepta sin ellas (decisión 12). No aportan
funcionalidad nueva, por eso van al final.

**Independent Test**: cada fila de la tabla «Verificaciones heredadas de la
decisión 12» tiene salida real o una excepción formal aprobada.

**Acceptance Scenarios**:

1. **Given** la tabla heredada, **When** se acepta P0-1, **Then** cada fila tiene salida real, o «EXCEPCIÓN APROBADA» donde la tabla la admite, con sus cinco datos (decisión 12).
2. **Given** el primer preview real, **When** está disponible, **Then** T072 parte 2 (aislamiento en preview) se ejecuta **antes** de que nadie lo use (decisión 12; decisión 13, regla 3).

### Edge Cases

- **Sesión caducada a mitad de Anotar:** el guardado falla con un mensaje que pide volver a entrar y no pierde lo escrito en el dispositivo hasta que la persona cierra la hoja. No hay diseño de «sesión caducada»: se compone con el patrón de error y se aprueba viendo la pantalla en el PR B.
- **Verificación de correo desde otro dispositivo:** el enlace verifica la cuenta y lleva a entrar; no hay pantalla de «verificado» diseñada, así que el enlace termina en «Entrar» (A1) con un aviso corto de éxito.
- **Enlace de recuperación caducado o usado:** lleva a pedir otro, sin revelar nada de la cuenta.
- **Monto 0, negativo o con decimales en COP:** no se puede guardar; COP se anota en pesos enteros y se convierte exacto a unidades menores (maestro §5.2).
- **Monto máximo:** 999.999.999 pesos, el máximo de AmountInput (`COMPONENT_SPECIFICATIONS.md` §AmountInput). Un monto mayor no se puede guardar. La prueba de 9007199254740993 de ADR-013 verifica la precisión del transporte, no un importe permitido.
- **Fecha futura:** se permite y el movimiento cuenta en su mes (Q13). Inicio muestra el mes en curso, así que un movimiento futuro aparece en Inicio cuando llega su mes; en Actividad se alcanza con las flechas.
- **Categoría sin elegir:** Guardar no se habilita (02·5 E1).
- **Editar un movimiento ya eliminado** (otra pestaña): falla con un error que lo explica.
- **«Deshacer» después de los 6 s o tras recargar:** ya no está disponible; queda «Eliminar».
- **Dos dispositivos con temas distintos:** gana el último elegido; el otro lo toma en su siguiente carga.
- **Cookie de tema sin perfil** (antes de entrar): las pantallas de acceso siguen al sistema, como en la 001.
- **Correo permitido que ya tiene cuenta:** el registro responde igual que con uno nuevo, sin enumerar.
- **Supabase Free en pausa por inactividad:** la app muestra el error de red y la recuperación está documentada; no se usa un «ping» como garantía (maestro §7.5).
- **Límite de correos de Supabase alcanzado:** el reenvío del enlace dice que se intente más tarde, sin revelar nada.
- **Movimientos de un mes con zona horaria distinta en el dispositivo:** el mes se calcula en `America/Bogota`, no en la zona del dispositivo.

## Requirements *(mandatory)*

### Functional Requirements

#### Base de datos, seguridad y acceso a datos (ADR-013)

- **FR-001**: Supabase local con migraciones SQL versionadas en `supabase/migrations/`, que son la única fuente del esquema (ADR-013, Consecuencias; maestro §7.1).
- **FR-002**: Tres esquemas: `public` (el único expuesto, solo vistas `security_invoker` y funciones de entrada `security invoker`), `juntia_data` (tablas, RLS en todas) y `juntia_private` (funciones que escriben, auxiliares e internas) (ADR-013 §1).
- **FR-003**: Las tablas controladas de P0-1 (`transactions`, `audit_events`, `idempotency_records` y las que el plan añada con importes o autorización) solo se escriben mediante funciones `security definer` de `juntia_private` propiedad de `juntia_writer`, sin `LOGIN`, sin `BYPASSRLS` y sin ser dueño de las tablas (ADR-013 §2).
- **FR-004**: `anon` y `authenticated` no tienen ningún privilegio de escritura ni de alteración sobre `juntia_data`, incluidos `TRUNCATE`, `REFERENCES`, `TRIGGER` y secuencias; `authenticated` solo tiene `select` sobre las tablas que leen las vistas, sin `usage` sobre `juntia_data`, y sin `create` en ningún esquema (ADR-013 §2.1, §5).
- **FR-005**: `pg_graphql` desactivado (ADR-013 §5.3).
- **FR-006**: Cada operación de dinero aplica, en este orden, la idempotencia con huella, el bloqueo de la raíz que valida y después la lectura y la escritura; los errores `40P01` y `40001` se reintentan en servidor un número acotado de veces con la misma clave (ADR-013 §3).
- **FR-007**: Restricciones `check`, claves foráneas, índices únicos y triggers protegen las invariantes de P0-1 por cualquier camino: importes positivos, tipo válido, moneda COP, `income` siempre privado, contexto privado en P0-1, auditoría de solo inserción (ADR-013 §2.4; maestro §7.3, «Contrato por tipo»).
- **FR-008**: Todo importe cruza la frontera SQL ↔ API ↔ TypeScript como texto, en entrada y salida; los tipos de transporte de `src/lib/db/` los declaran `string` (ADR-013 §4).
- **FR-009**: Los tipos generados de `public` se versionan, y el job SQL/RLS del CI los regenera y falla si no coinciden (ADR-013, Consecuencias; ADR-011 §5).
- **FR-010**: `src/lib/supabase/` tiene el cliente de servidor y el de navegador; `src/lib/db/` es la única capa que conoce vistas y funciones; `src/domain/` no importa ninguna de las dos (ADR-013 §6.4; maestro §7.2).
- **FR-011**: Ningún camino que atiende a una persona usa `service_role` (ADR-013 §5).

#### Dinero y movimientos (maestro §5)

- **FR-012**: El dominio tiene un tipo `Money` en unidades menores ISO 4217 con `bigint`, sin `number`; COP se escribe en pesos enteros y se convierte exacto (maestro §5.2).
- **FR-013**: Un movimiento de P0-1 es un **gasto** o un **ingreso**, privado de su autora, con importe positivo, moneda COP, categoría del catálogo canónico, fecha (`transaction_date`, también futura), descripción opcional, estado activo o anulado y un tipo que no cambia después de crearlo (maestro §7.3; Q3, Q4, Q13, Q14).
- **FR-014**: El catálogo de categorías es el de `DESIGN_SYSTEM.md` §1.3; «Ingresos» solo vale para ingresos y las demás solo para gastos. Sin categorías propias (P1).
- **FR-015**: El mes de un movimiento se calcula con `transaction_date` en `America/Bogota` (maestro §5.2).
- **FR-016**: Crear, editar y anular son operaciones atómicas e idempotentes que escriben auditoría con actor, instante, valor anterior y nuevo (maestro §5.4; US-06).
- **FR-017**: Una edición usa control de versión: si el movimiento cambió desde que se leyó, falla con un error propio (Q15).
- **FR-018**: Un movimiento anulado no cuenta en ningún total, lista, búsqueda ni exportación, y no se puede editar (maestro §5.2, §5.4).
- **FR-019**: El gasto del mes es la suma de gastos activos del mes; los ingresos se muestran aparte y nunca se restan ni se suman al gasto (maestro §5.3).
- **FR-020**: El módulo del dataset dorado existe en `src/domain/` con los tipos de contexto, persona y moneda, y la parte de P0-1: los movimientos privados de Sara de octubre de 2026, que suman exactamente 412.900 en gastos (tabla «Dataset dorado de P0-1»), más un ingreso que no suma al gasto (§15.10, «Dataset dorado», reglas 1, 2 y 4).

#### Acceso (04·17)

- **FR-021**: Supabase Auth con correo y contraseña, verificación de correo y recuperación por enlace seguro. Sin Google, Apple, magic link independiente, passkeys ni MFA propio (§15.5).
- **FR-022**: Pantallas y estados de 04·17: Entrar (A1, A1b, A1c, A1d), Crear cuenta (A2), Verifica tu correo (A3), Recuperar (A4, A4b), Contraseña nueva (A5) y Primera entrada (A6, sin «Invitar a mi pareja») (Q6).
- **FR-023**: Ninguna respuesta de acceso, registro ni recuperación revela si un correo tiene cuenta (§15.5).
- **FR-024**: El registro solo se completa para los correos de una lista permitida que la base de datos valida antes de crear el usuario; el plan elige el mecanismo de Supabase y su `[V]` (Q9).
- **FR-025**: El aviso de Crear cuenta dice que Juntia es una versión privada de prueba; no enlaza ni inventa términos legales (Q9).
- **FR-026**: La sesión se valida en el servidor con `getClaims()`, se renueva en `proxy.ts`, se crea un cliente por petición y ninguna respuesta autenticada se guarda en cachés compartidas (ADR-013 §6.5).
- **FR-027**: Las rutas de producto y de Mi cuenta exigen sesión; sin sesión redirigen a Entrar y, tras entrar, vuelven a la ruta pedida.
- **FR-028**: Cerrar sesión muestra S1, S2 si falla y S3 en Entrar (04·16).
- **FR-029**: Un perfil se crea con la cuenta, con el nombre visible de A2, y es la autoridad del nombre y del tema (§15.5).

#### Anotar (02·5, 02·6)

- **FR-030**: La hoja de Anotar de la 001 pasa a ser el flujo real E1–E5 en su versión privada: sin «Pagó», «Participan» ni «Reparto», y con el contexto fijo en Yo (Q2). Añade las paradas, el arrastre y la confirmación de cambios sin guardar que la 001 no construyó (001, FR-031a).
- **FR-031**: Selector «Gasto | Ingreso» arriba de la hoja, con la categoría «Ingresos» para ingreso (Q3).
- **FR-032**: E1 con foco en el monto, `AmountInput` con teclado nativo, máscara de COP y máximo de 999.999.999 pesos, las categorías recientes y Guardar habilitado con monto y categoría (02·5; `COMPONENT_SPECIFICATIONS.md` §AmountInput; decisión 11).
- **FR-033**: E2 con categoría, descripción y fecha; E3 con la validación que aplique a P0-1 (monto válido); E4 «Guardando…» con los campos bloqueados y sin promesa offline; E5 con el conteo del total, la fila resaltada y el toast «Deshacer» de 6 s (02·5).
- **FR-034**: «Deshacer» anula el movimiento recién creado con auditoría (Q2, Q4).
- **FR-035**: El atajo `N` abre Anotar fuera de un campo de texto; Enter guarda y Escape cierra en escritorio (02·5; handoff §Accesibilidad).
- **FR-036**: Un gasto guardado se registra una vez por intención: la clave de idempotencia nace en el cliente al abrir la hoja y se reutiliza en cada reintento (maestro §5.4).

#### Editar y eliminar (04·1, 04·7, 02·1)

- **FR-037**: Detalle de movimiento (04·1 DETALLE y panel de 04·7) con Editar y «Eliminar gasto» (o «Eliminar ingreso»).
- **FR-038**: Edición de 04·1 sin el texto de pareja, con monto, categoría, fecha y descripción; el tipo no se cambia (Q2, Q14).
- **FR-039**: Eliminar con el diálogo de confirmación de 02·1, foco inicial en la opción segura y Escape para cancelar; sin «Deshacer» posterior (Q4).

#### Inicio (04·1, 04·6, 04·7)

- **FR-040**: Inicio en Yo según 04·1 INICIO · YO sin los bloques compartidos: gasto del mes, desglose por categoría y últimos movimientos (Q5).
- **FR-041**: Sin presupuesto, «restante», «excedido», «te alcanza» ni límite cero (maestro §5.3; DEC-R17; US-01, US-09, US-13).
- **FR-042**: Estados vacío, cargando (Skeleton con la geometría final) y error con Reintentar, en los dos temas (Q5; maestro §6.3).
- **FR-043**: Nosotros, en todos los destinos, muestra el estado «todavía no disponible»; el selector sigue funcionando y recordando el contexto como en la 001 (Q5; 001 FR-026).
- **FR-044**: El aviso de versión base de la 001 desaparece cuando P0-1 conecta el servidor (§15.10, «Aviso de versión base»).
- **FR-045**: Escritorio de 04·7 sin los módulos compartidos (US-15).

#### Actividad (04·1, 04·6, 04·7)

- **FR-046**: Lista del mes agrupada por día con el resumen del mes, y flechas de mes anterior y siguiente. La siguiente llega hasta el mes más lejano con movimientos, incluidos los futuros, y no avanza a meses vacíos más allá (Q8, Q13).
- **FR-047**: Búsqueda por descripción y filtros por tipo y categoría dentro del mes (04·1, 04·7).
- **FR-048**: Tabla de escritorio de 04·7 sin la columna «Pagó·Reparto», con panel de detalle.
- **FR-049**: Estado vacío con texto de contexto privado y estado de error de 04·6.

#### Mi cuenta (04·14, 04·16, 04·18, 04·19)

- **FR-050**: AccountButton en el encabezado de Inicio, Actividad, Metas y Plan, y perfil al pie del sidebar; rutas `/cuenta`, `/cuenta/perfil`, `/cuenta/pareja`, `/cuenta/apariencia`, `/cuenta/privacidad` y `/cuenta/seguridad` (§15.3; Q6).
- **FR-051**: Mi cuenta (C1) y Mi perfil (P1–P5) con nombre visible editable, correo no editable y avatar con inicial y color del sistema (§15.5).
- **FR-052**: Apariencia (T1) con ThemeSelector de tres opciones; el tema se guarda en `profiles` y en una cookie que el script bloqueante lee en el primer pintado (Q7).
- **FR-053**: Seguridad y sesión (G1, G2) con correo de solo lectura, cambio de contraseña por enlace y cerrar sesión.
- **FR-054**: Mi pareja con el estado de «llega con P0-2» y sin formulario (Q6).
- **FR-055**: Privacidad y datos (D1) con Exportar y con «Eliminar tu cuenta» como LimitNote de no disponible (§15.6.1).
- **FR-056**: Tablet y escritorio de 04·18 y tema oscuro de 04·19.

#### Exportar (04·16 D2–D5)

- **FR-057**: Exportar JSON y CSV de los movimientos activos propios, con importes como texto, sin tokens, identificadores internos ni datos de otras personas, con los estados D2 a D5 y la aclaración de que no restaura (§15.5; Q12).

#### Operación (Q9, Q10, Q11)

- **FR-058**: Proyecto Supabase Free en la cuenta de la segunda fundadora, región São Paulo, con el correo de Supabase. Las claves van solo en variables de entorno de Vercel y local; ninguna clave privilegiada en `NEXT_PUBLIC_*` (Q10; maestro §7.4).
- **FR-059**: Procedimiento documentado de copia completa cifrada fuera de Supabase con `pg_dump`, prueba de restauración en un runner efímero de CI con datos de prueba, restauración de la copia real en un PostgreSQL normal en el equipo del fundador y copia semanal manual (Q11; decisión 17). Los datos reales no se usan hasta que la primera copia y restauración tienen salida registrada (Q11).

#### Copy, accesibilidad, responsive y motion

- **FR-060**: Todo el texto nuevo vive en `src/lib/copy/es.ts`, incluidos los mensajes de error de las funciones de base de datos (ADR-013 §6.3; `docs/CONVENTIONS.md` B.1).
- **FR-061**: Sin scroll horizontal en 360, 390, 430, 768, 1024, 1280 y 1440 px; texto al 200 % sin pérdida; objetivos táctiles de 44 px; teclado completo; movimiento reducido con el mismo resultado (§15.7; handoff §Accesibilidad; US-17).
- **FR-062**: Los momentos de motion de E5, el conteo del total y la fila resaltada respetan `MOTION_SYSTEM.md` y `prefers-reduced-motion`.

#### Pruebas y CI (ADR-011, `docs/TESTING.md`)

- **FR-063**: Entra el job SQL/RLS del CI con Supabase local, migraciones y `supabase test db`, con su presupuesto de menos de 60 s de comando (ADR-011 §5; `docs/TESTING.md` §3).
- **FR-064**: Entra la siembra por base de datos y un `storageState` por worker y rol (`docs/TESTING.md` §5, reglas 1 y 2). P0-1 mide cuántos workers caben (ADR-011, [V] 3).
- **FR-065**: Entra el job E2E de humo con las specs E2E **1** (Acceso y Mi cuenta, sin pareja ni invitaciones, con la descarga de Exportar) y **2** (Anotar gasto, cronometrado) (`docs/TESTING.md`, «Tope de specs E2E»).
- **FR-066**: Cada PR corre las specs E2E que existan, como dice `docs/TESTING.md` (1 y 2 desde que existan).
- **FR-067**: axe en todas las rutas nuevas, en los dos temas, y `check:internal-surface` y `check:theme-script` siguen pasando.

#### Fuera de alcance (explícito)

- Pareja, invitaciones, gastos compartidos, repartos, balances, liquidaciones y Mover a Pareja (P0-2).
- Presupuestos, Spending Story, metas, `total_destinado_neto` y Análisis (P0-3).
- Eliminar cuenta (bloqueo legal, §15.6.1), términos legales definitivos y servidor de correo propio (antes de MVP-1).
- Categorías propias, recurrentes, adjuntos, reembolsos parciales, offline y vista de calendario en cuadrícula.
- Copia de seguridad automática (Q11).

### Key Entities

- **Perfil**: persona con cuenta. Nombre visible, correo (de Supabase Auth, no editable), color del sistema y tema elegido. Una por cuenta.
- **Movimiento**: gasto o ingreso privado de su autora, con importe en unidades menores, moneda COP, categoría, fecha, descripción opcional, estado (activo o anulado) y versión.
- **Categoría**: entrada del catálogo canónico de `DESIGN_SYSTEM.md` §1.3, con su ícono y sus colores. No editable en P0.
- **Registro de auditoría**: actor, instante, acción (crear, editar, anular), movimiento y valores anterior y nuevo. Solo inserción.
- **Registro de idempotencia**: actor, acción, clave, huella de la petición y resultado guardado.
- **Correo permitido**: entrada de la lista que habilita el registro hasta MVP-1.
- **Copia de seguridad**: archivo cifrado fuera de Supabase con su fecha y la salida de su restauración de prueba. No vive en la base de datos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A 360, 390, 430, 768, 1024, 1280 y 1440 px, en los dos temas, cada ruta nueva se ve sin scroll horizontal ni solapamientos; las capturas de 390 y 1440 en los dos temas van en cada PR de implementación y los dos fundadores las aprueban, incluidas las pantallas nuevas de Q3 y Q5 (§15.7; §15.9).
- **SC-002**: Cero violaciones serias o críticas de axe en todas las rutas implementadas, en los dos temas (ADR-011, fila 16).
- **SC-003**: Mediana menor de 10 s para registrar un gasto habitual en el teléfono real de un fundador tras la primera entrada, medida con al menos 10 registros y reportada con su método (US-12; §15.7).
- **SC-004**: INP menor de 200 ms al abrir Anotar y al guardar, medido en laboratorio y reportado como tal (§15.7).
- **SC-005**: CLS = 0 en las cargas con Skeleton de Inicio y Actividad y en las rutas de acceso y Mi cuenta, con el arnés R2, sin cuadro del tema contrario también con el tema guardado (§15.7; Q7).
- **SC-006**: Las diez `[V]` de ADR-013 tienen salida real en la evidencia; las 1, 2, 7, 8 y 9 definitivas, en el PR A con la primera migración y antes de la primera función de dinero (ADR-013, «Verificación pendiente»).
- **SC-007**: Cero accesos a datos de otra persona en los tests negativos de RLS, por la API y por SQL directo (US-05).
- **SC-008**: Con el dataset dorado sembrado, Inicio y Actividad de octubre de 2026 muestran exactamente 412.900 de gasto de Sara y el desglose por categoría de la tabla (§15.10, «Dataset dorado»).
- **SC-009**: Cero movimientos duplicados en las pruebas de doble envío y reintento (US-12, «sin doble envío»).
- **SC-010**: La primera copia y restauración tienen salida registrada antes del primer movimiento real (Q11).
- **SC-011**: Cada fila de las verificaciones heredadas de la decisión 12 tiene salida real o «EXCEPCIÓN APROBADA» (decisión 12).
- **SC-012**: Los dos fundadores aprueban la salida interna: registran, editan y eliminan movimientos reales y los entienden sin ayuda (maestro §11).

## Assumptions

- **Contexto Yo por defecto**, como en la 001. Nosotros existe como estado «todavía no disponible» hasta P0-2.
- **Una persona, un perfil, un espacio privado.** No hay tabla de grupos en P0-1; P0-2 la añade. El modelo de movimientos deja sitio para el alcance de grupo sin usarlo (maestro §7.3, «Scope privado XOR grupo»).
- **Las categorías recientes** de E1 son las cinco usadas más recientemente por la persona (02·5). Qué se muestra sin historial lo decide el plan, como detalle local.
- **La fecha por defecto** es hoy en `America/Bogota`.
- **Las pantallas que no están diseñadas** (selector de ingreso, Inicio sin pareja, estados de Inicio, sesión caducada, flechas de mes) se componen con primitivos y patrones aprobados y se aprueban viendo la pantalla en su PR (§15.9).
- **La lista permitida** contiene los dos correos de los fundadores. Cambiarla es una operación documentada, no una pantalla.
- **El copy final se revisa en cada PR** en el módulo de copy.
- **La revisión visual humana es el gate de «Visual y motion»**, fuera de CI (ADR-011 §7). Incluye la pasada de Impeccable fija de cada PR de implementación.
- **El Vercel de producción** sigue en la cuenta de la segunda fundadora y se despliega con sus merges (decisión 13).

---

## Dataset dorado de P0-1

Octubre de 2026, contexto Yo de Sara. Los gastos suman **exactamente 412.900**
(`COMPONENT_SPECIFICATIONS.md`, «DEC-G04 en estos datos»: «412.900 privados»).
Las filas las define esta spec (§15.10, «Dataset dorado», regla 2) y la parte
queda **completada por P0-1**.

| Fecha | Tipo | Categoría | Descripción | Importe |
| --- | --- | --- | --- | ---: |
| 3 oct | Gasto | Transporte | Taxi a la oficina | 45.000 |
| 5 oct | Gasto | Servicios | Plan de celular | 59.700 |
| 8 oct | Gasto | Restaurantes | Almuerzo con el equipo | 62.500 |
| 11 oct | Gasto | Salud | Farmacia | 38.400 |
| 14 oct | Gasto | Compras | Libros | 96.000 |
| 18 oct | Gasto | Entretenimiento | Cine | 34.000 |
| 20 oct | Gasto | Mercado | Fruver | 27.300 |
| 23 oct | Gasto | Otra | Regalo de cumpleaños | 50.000 |
| **Total gastos** | | | | **412.900** |
| 21 oct | Ingreso | Ingresos | Reembolso EPS | +86.000 |

El ingreso viene de la fila de ejemplo de 02·1 («Reembolso EPS · Solo yo ·
+$86.000») y **no suma** al gasto. US-01 usa la primera fila (45.000 de
transporte).

## Inventario de `[P]` que toca P0-1

Clasificación en los dos ejes del maestro §15.9.

| Elemento `[P]` | ¿Afecta al alcance? | ¿Requiere aprobación antes de implementar? | Situación en P0-1 |
| --- | --- | --- | --- |
| Anotar gasto (flujo E1–E5) | **Sí** | **Sí** | **Aprobado** en su versión privada (Q2; decisión 16) |
| Sección Cuenta completa | **Sí** — P0-1 (perfil, apariencia) y P0-2 (pareja) | **Sí** | **Aprobada** la anatomía; P0-1 construye todo menos Mi pareja (Q6; decisión 16). CoupleStatus y SensitiveActionConfirmation quedan para P0-2 |
| Persistencia del tema (`profiles` + cookie) `[P][V]` | **Sí** | **Sí**, y el `[V]` | **Aprobada** (Q7; decisión 16); el `[V]` se ejecuta antes de cerrar el plan |
| Gasto, ingreso y liquidación en tinta | No | **Sí** — viendo la pantalla | P0-1 es el primer slice que muestra movimientos: se aprueba en las capturas del PR C y D |
| Cuenta reutiliza los fondos de categoría | No | **Sí** — viendo la pantalla | Se aprueba en las capturas del PR B |
| Teclado nativo para el monto y teclado propio descartado | **Sí** | **Sí** | **Aprobados** el 3 de noviembre de 2026 (decisión 11); `AmountInput` ya existe |
| Texto ampliado hasta 200 % | No | **No** — requisito obligatorio | Se aplica y se prueba (FR-061) |

**Pantallas nuevas que no existían en el diseño** (Q3, Q5, Q8, y la sesión
caducada de los casos límite): no son `[P]` del paquete, pero se tratan igual:
se componen con lo aprobado y los dos fundadores las aprueban viendo la pantalla.

No tocados por P0-1: SharedBalance, GoalStack, ChangePreview, FundingLedger,
ConfirmationBadge, PlanningNote, personas escalables a N y las propuestas de
paleta ya visibles desde la 001.

**Ningún `[P]` que afecte al alcance queda sin resolver.**

## Inventario de `[V]` que toca P0-1

**Deciden cómo se construye — se ejecutan antes de cerrar el plan y se pega la salida:**

| `[V]` | Fuente | Qué hay que ejecutar |
| --- | --- | --- |
| Viabilidad de `juntia_writer` (anticipo de ADR-013 [V] 1) | ADR-013; ADR-011 §9.4 | Un prototipo SQL desechable en el preflight de plan (Supabase local dentro de un runner efímero, ADR-011 §9.4): crear el rol, asignarle una función `security definer`, comprobar que `auth.uid()` devuelve a quien llama y que la RLS se le aplica. Informa el plan; **no sustituye** la [V] 1 definitiva del PR A. Si falla, ADR-013 se reabre antes de cerrar el plan |
| Forma del claim (ADR-013 [V] 9) | ADR-013; decisión 1 | En el mismo preflight, la forma del claim que leen `auth.uid()` y las políticas |
| ADR-013 [V] 10 | ADR-013 | Versiones exactas de `@supabase/supabase-js`, `@supabase/ssr` y la CLI |
| Persistencia del tema | `COMPONENT_SPECIFICATIONS.md` §ThemeSelector; Q7 | Que la cookie llega al script bloqueante y el primer pintado usa el tema guardado, sin destello ni error de hidratación |
| Lista permitida del registro | Q9 | Qué mecanismo de Supabase valida el correo antes de crear el usuario en el plan Free, y que una llamada directa a la API de Auth tampoco lo salta |
| Correo de Supabase | Q10 | El límite real de envíos por hora del plan Free para verificación y recuperación |
| Copia y restauración | Q11 | Qué comando produce una copia completa del proyecto Free y cómo se cifra |

**Comprueban lo construido — se ejecutan durante la implementación y la salida va al PR:**

| `[V]` | Fuente | Qué se comprueba |
| --- | --- | --- |
| ADR-013 [V] 1, 2, 7, 8 y 9, definitivas | ADR-013 | En el **PR A**, con la primera migración y **antes de la primera función de dinero**: `juntia_writer` sobre el esquema real, escritura directa imposible por la API pública, privilegios efectivos, vistas sin `usage` y forma del claim. Si la 1 falla, ADR-013 se reabre antes de seguir |
| ADR-013 [V] 3, 4, 5 y 6 | ADR-013; Q15 | Atomicidad, concurrencia e idempotencia, edición concurrente de movimientos e importes de ida y vuelta |
| Workers con usuarios aislados | ADR-011, [V] 3 | Cuántos workers de Playwright caben con siembra aislada |
| Altura del teclado nativo con la hoja de Anotar | `RESPONSIVE_SPECIFICATIONS.md`; decisión 11 | En iPhone y Android, el teclado no tapa el monto ni Guardar |
| Teclados de terceros en Android | §15.6.2, dependencia 3 | La máscara de COP con al menos un teclado de terceros, o excepción documentada |
| Umbrales de §15.7 | Maestro §15.7 | CLS, INP, mediana de US-12, scroll horizontal y objetivos táctiles |
| Presupuestos de tiempo | ADR-011 | `verify`, SQL/RLS, E2E de humo |
| Verificaciones heredadas | Decisión 12 | La tabla de abajo |

## Verificaciones heredadas de la decisión 12

Copiada **literalmente** del maestro §15.10, decisión 12, como exige la propia
decisión. P0-1 no se acepta si alguna fila sigue sin salida real, salvo una
excepción formal donde la fila la admite.

| Verificación | Dueño | Cuándo |
| --- | --- | --- |
| T072 · Superficie interna en Vercel, parte 1: **aislamiento en producción** (HTML y RSC sin fuga, 404) | Gestor | Justo después del primer despliegue de producción y antes de que nadie use un despliegue. Sin excepción posible: es un control de aislamiento (§15.6; ADR-011 §8). **Hecha el 4 de noviembre de 2026** |
| T072, parte 2: **aislamiento en preview** (un host no autorizado sobre un preview responde 404, la segunda barrera de `isAllowedInternalHost`) | Gestor, con un alias de prueba **no productivo** del tipo `*.vercel.app` que asigna la dueña; nunca el dominio de producción | **Al disponer del primer preview real y antes de que nadie use un preview.** Sin excepción posible: es un control de aislamiento (ADR-011 §8). El preview necesita un commit de la dueña (decisión 13, regla 3) |
| T072, parte 3: **funcionamiento en preview** (la superficie da 200 por las URL de despliegue y de rama) | Fundadores, con sesión en Vercel | Antes de aceptar P0-1. Aplazada por decisión de los fundadores del 4 de noviembre de 2026: comprueba que la superficie se ve donde debe y no es un control de aislamiento |
| T073 · Contraste en dispositivo (iPhone) | Fundadores | Antes de aceptar P0-1; se puede adelantar en cualquier momento |
| T074 · Sombras táctiles en un Android de gama media | Fundadores | Antes de aceptar P0-1. Admite excepción formal si no hay un Android disponible |
| T075 · VoiceOver con el flujo real de Anotar | Fundadores | Al cerrar P0-1. Sin excepción posible, porque los fundadores tienen iPhone |
| T075 · TalkBack con el flujo real de Anotar | Fundadores | Al cerrar P0-1. Admite excepción formal si no hay un Android disponible |
| CLS = 0 fuera de Chromium: Firefox y WebKit con el arnés R2 | Gestor | Antes de aceptar P0-1. Sin excepción posible. El mecanismo que da CLS = 0 en la 001 (`<link rel="expect" blocking="render">`) lo soporta Safari desde la 18.2, pero no Firefox ni Safari anterior; en la 001 solo se demostró en Chromium |
| CLS en un iPhone real | Fundadores | Antes de aceptar P0-1. Admite excepción formal si no hay un Mac para el inspector web de Safari |
| Respaldo tipográfico de la fuente de interfaz en Android (Onest desde la decisión 14) | Fundadores | Antes de aceptar P0-1. Admite excepción formal si no hay un Android disponible |

La excepción formal se registra con sus cinco datos y el estado «EXCEPCIÓN
APROBADA», nunca «verificado» (decisión 12).

## Verificaciones de §15.6.3 que aplican a P0-1

| Punto de §15.6.3 | ¿Aplica? |
| --- | --- |
| 1. Atomicidad de Mover a Pareja | No — P0-2 |
| 2. Idempotencia de las escrituras que mueven dinero | **Sí**: crear, editar, anular y deshacer movimientos (FR-016, FR-036; SC-009) |
| 3. `goal_usage_confirmations` | No — P0-3 |
| 4. RLS de metas | No — P0-3. **Sí** la RLS individual de movimientos y perfiles (US-9) |
| 5 y 6. Gasto con meta | No — P0-3 |
| 7. Ediciones concurrentes de presupuesto | No — P0-3. **Sí** el equivalente en movimientos (FR-017) |

## ADR, erratas y conflictos

- **ADR que aplica:** ADR-013 (Aceptado, decisión 15), ADR-011, ADR-012 y ADR-001 solo como referencia (no hay Mover a Pareja en P0-1). P0-1 no necesita un ADR nuevo.
- **Erratas pendientes del paquete:** ninguna (`docs/design/README.md`).
- **Conflictos entre documentos superiores:** ninguno bloqueante. Dos lecturas, registradas para la revisión:
  1. El maestro dice «anula» y el diseño dice «Eliminar». Resuelto por Q4: la interfaz dice «Eliminar» y el dato se anula.
  2. El diseño de Anotar y de Inicio da por hecha la pareja. Resuelto por Q2 y Q5 para P0-1.

## Specs E2E que añade P0-1

**Dos**, el máximo por especificación (ADR-011 §3).

| | Antes de P0-1 | P0-1 añade | Después |
| --- | ---: | ---: | ---: |
| Specs E2E existentes | 0 | 2 (spec 1 «Acceso y Mi cuenta», spec 2 «Anotar gasto, cronometrado») | 2 |

Cada una entra con el PR que entrega su recorrido, porque una funcionalidad no
se fusiona sin su E2E (`docs/TESTING.md`, «Lo que arranca progresivamente»):

| PR | Spec E2E |
| --- | --- |
| A · Base de datos, seguridad y dinero | Ninguna: no hay recorrido de interfaz. Entran el job SQL/RLS y la siembra |
| B · Acceso y Mi cuenta | **Spec 1** nace, con acceso y Mi cuenta, sin pareja ni invitaciones (P0-2) |
| C · Anotar, editar y eliminar | **Spec 2** nace, cronometrada |
| D · Inicio, Actividad y exportación | La spec 1 suma el caso de descarga de Exportar (`docs/TESTING.md`, matriz de recorridos) |

La sexta plaza sigue libre.

## Criterios de aceptación aplicables

### Del handoff («Criterios de aceptación (solo P0)»)

| Criterio | ¿Aplica a P0-1? |
| --- | --- |
| Mi cuenta: los criterios de 05·9 (navegación, perfil, pareja, apariencia, privacidad, sesión y acceso). | **Sí**, salvo pareja (P0-2) |
| DEC-G04: `total_destinado_neto` reproduce cada fila de la tabla… | No — P0-3 |
| Un gasto compartido existe una vez… | No — P0-2 |
| Los aportes no cambian `gasto_consumo`… | No — P0-3 |
| Una liquidación parcial Tomás → Sara 200.000… | No — P0-2 |
| Un gasto con meta crea un único gasto real… | No — P0-3 |
| Usar o retirar aportes ajenos sin confirmación… | No — P0-3 |
| Un retiro nunca se presenta como ingreso. | No — P0-3 |
| Anotar registra privado o compartido desde un solo flujo… | **Parcial:** Anotar registra privado; compartido y la reclasificación llegan con P0-2 |
| No se puede crear un espacio compartido con más de 2 integrantes. | No — P0-2 |
| El saldo de la pareja reproduce el caso de octubre… | No — P0-2 |
| Ambos integrantes pueden crear, editar y desactivar un presupuesto… | No — P0-3 |
| Los dos temas pasan axe sin violaciones serias en Inicio, Actividad, Anotar, Balance y Meta. | **Parcial:** Inicio, Actividad y Anotar reales; Balance y Meta siguen siendo estados provisionales |
| Todos los momentos de motion respetan `prefers-reduced-motion`. | **Sí** (FR-062) |
| Los datos del caso de octubre reproducen exactamente los totales mostrados en el diseño. | **Sí**, la parte de P0-1: 412.900 de Sara (SC-008) |

### Del maestro §15.7 (umbrales que bloquean la aceptación)

| Umbral | ¿Aplica a P0-1? |
| --- | --- |
| CLS = 0 en las cargas con skeleton de las rutas clave | **Sí** (SC-005) |
| INP < 200 ms al abrir Anotar y al guardar | **Sí** (SC-004) |
| Mediana < 10 s para registrar un gasto habitual en teléfono real tras el onboarding (US-12) | **Sí** (SC-003) |
| Sin scroll horizontal en 360, 390, 430, 1024 y 1440 | **Sí** (SC-001) |
| Objetivos táctiles ≥ 44 px | **Sí** (FR-061) |

### Del maestro §10.3 y CLAUDE.md 11

P0-1 permite pruebas internas con datos reales **solo** después de que la RLS,
las invariantes y la recuperación tengan salida registrada (SC-006, SC-007,
SC-010). El gate premium completo rige el lanzamiento MVP-1, no este slice.
