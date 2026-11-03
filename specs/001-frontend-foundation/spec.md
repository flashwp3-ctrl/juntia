# Feature Specification: 001 · Frontend Foundation

**Feature Branch**: `claude/spec-001-specify-2abe28` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5)

**Created**: 2026-11-03

**Status**: Draft — Specify y Clarify hechos. No avanza a Plan sin el merge de su PR documental (ADR-012 §3.1).

**Input**: User description: "Especificación 001 · Frontend Foundation de Juntia: el primer entregable ejecutable de F0-b según el maestro §15.1 y §15.10. Scaffold con el stack congelado del maestro §7.1; tokens de I2 Bosque & Arena con los dos temas y tema que sigue al sistema con script bloqueante; los primitivos del paso 2 del orden de implementación del handoff, incluido AmountInput (teclado nativo, decisión 11); AppShell responsive (barra inferior en móvil, rail desde 1024, sidebar desde 1280; Inicio, Actividad, Metas y Plan, más Balance solo en escritorio; selector Yo/Nosotros que a 1024 va arriba a la derecha del contenido, funciona y recuerda el contexto, sin animación; acceso mínimo a `/cuenta`); el comportamiento provisional completo de §15.10; 390 y 1440 px; CI con los jobs 1, 2 y 5 de ADR-011. Sin servidor, cuentas, base de datos ni ninguna parte del dataset dorado."

> **Qué es este documento.** Dice **qué** construye la 001. **No decide nada**:
> cada requisito cita la decisión que aplica. Jerarquía: maestro (§15 prevalece)
> > ADR > paquete de `docs/design/` y `docs/CONVENTIONS.md` > esta spec
> (`AGENTS.md` §2). En este archivo, `[P]` significa **propuesta** y `[V]`
> **verificación pendiente**, según el maestro §15.9; no significan
> «paralelizable» (eso solo ocurre dentro de `tasks.md`, ADR-012 §3.2).

### Fuentes que aplica

| Fuente | Qué aporta a la 001 |
| --- | --- |
| Maestro §15.1 | La 001 produce el app shell con navegación y selector de contexto, y los primitivos. El Expense Flow es de P0-1. No existe scaffold |
| Maestro §15.3 | Navegación móvil y de escritorio, destinos, Cuenta, selector a 1024, tema solo en Mi cuenta › Apariencia |
| Maestro §15.10, decisiones 4–11 | Balance como destino de escritorio, selector a 1024, tema, Expense Flow en P0-1, acceso mínimo a `/cuenta`, estados vacíos, selector sin animación, teclado nativo |
| Maestro §15.10, «Comportamiento provisional en la 001» | Aviso de versión base, ninguna cifra sin datos, Anotar con aviso, Balance no disponible, `/cuenta`, tema del sistema |
| Maestro §15.10, «Dataset dorado», regla 3 | La 001 no produce ninguna parte del dataset dorado |
| Maestro §7.1, §7.2, §15.2 | Stack congelado, estructura y regla de dependencia; Phosphor con `AppIcon` |
| Maestro §6.3, §10.2, §10.3, §15.7 | Estados equivalentes, umbrales de rendimiento, definición de terminado |
| ADR-011 y `docs/TESTING.md` | Capas de prueba, tope de specs E2E, jobs 1, 2 y 5, reglas duras, presupuestos y arranque progresivo |
| ADR-012 | Formato de esta spec, gates por PR documental, `[P]` y `[V]` |
| `docs/design/HANDOFF_CLAUDE_CODE.md` | Orden de implementación (pasos 1 y 2, AppShell del paso 4), accesibilidad, rendimiento, criterios de aceptación |
| `docs/design/DESIGN_SYSTEM.md`, `COMPONENT_SPECIFICATIONS.md`, `RESPONSIVE_SPECIFICATIONS.md`, `MOTION_SYSTEM.md`, `BRAND_FOUNDATION.md` | Tokens, anatomía de primitivos y AppShell, breakpoints, motion, voz |
| `docs/CONVENTIONS.md` y `docs/GLOSSARY.md` | Idioma por capa, módulo de copy (B.1, B.2), sin i18n (B.3), términos «Yo», «Nosotros», «Mi cuenta» |
| Decisiones de los fundadores del 3 de noviembre de 2026 en Clarify | Contenedor del aviso de Anotar, alcance de «sin animación» y superficie interna de revisión (sección «Clarifications») |

## Clarifications

Las tres respuestas son **decisiones de los fundadores del 3 de noviembre de
2026**, comunicadas por el gestor en la fase Clarify. Esta spec las registra y
las aplica; no las toma.

### Session 2026-11-03

- Q: ¿Qué contenedor presenta el aviso de Anotar (FR-031)? → A: El contenedor real de Anotar: hoja inferior en móvil y diálogo de 520 px desde 768 px. Se construye una sola vez para que P0-1 solo cambie el contenido. BottomSheet y Modal entran en la 001 **únicamente** en la medida en que el aviso los necesita: foco atrapado, Escape, control de cierre, retorno del foco, safe area y movimiento reducido. El aviso sigue sin campos.
- Q: ¿«Sin animación» (decisión 10) incluye el deslizamiento de la perilla del Segmented? → A: No. La perilla se desliza como respuesta propia del control, con el spring de `COMPONENT_SPECIFICATIONS.md` §Tabs / Segmented; con movimiento reducido salta sin desplazarse (`MOTION_SYSTEM.md` §1). No hay transición de contenido S1: ni salida y entrada, ni contador, ni crossfade del titular. S1 llega con P0-2, como dice la consecuencia de la decisión 10.
- Q: ¿Dónde se revisan visualmente los primitivos que el shell no muestra (US-6)? → A: En una superficie interna de revisión: una ruta sin ningún enlace desde la navegación, que devuelve el estado de «no encontrado» en el build de producción. Muestra cada primitivo en sus estados y en los dos temas, solo con valores de las especificaciones de componente, nunca con el caso de octubre ni con la tabla de DEC-G04. Pasa axe en el job 5 como cualquier ruta implementada, sirve para las capturas a 390 y 1440 del PR de implementación y no cuenta como spec E2E. El nombre de la ruta lo propone el plan.

## User Scenarios & Testing *(mandatory)*

Los actores son las dos personas fundadoras —que abren la app en teléfono y en
escritorio y revisan cada PR— y quien implementa la especificación de P0-1, que
recibe el shell y los primitivos para conectar el Expense Flow al servidor.

### User Story 1 - Recorrer la app con la navegación de cada ancho (Priority: P1)

Una persona abre Juntia en su teléfono y ve una barra inferior con Inicio,
Actividad, Anotar integrado al centro, Metas y Plan. En un portátil de 1024 px ve
un rail lateral; a partir de 1280 px, un sidebar con la marca, el selector de
contexto, los destinos —que en escritorio incluyen Balance—, el bloque de Anotar
con el atajo `N` visible y el acceso a Mi cuenta al pie. Se mueve entre destinos
con toque, ratón o teclado, y siempre sabe dónde está.

**Why this priority**: es el entregable que el maestro §15.1 asigna a la 001 y la
base de todos los slices siguientes. Sin shell no hay dónde conectar nada.

**Independent Test**: abrir la app a 360, 390, 430, 768, 1024, 1280 y 1440 px en
los dos temas y recorrer cada destino con toque y con teclado. Entrega valor por
sí sola: es la estructura aprobada, navegable y revisable por los fundadores.

**Acceptance Scenarios**:

1. **Given** un viewport menor de 768 px, **When** la app carga, **Then** aparece la barra inferior flotante con Inicio · Actividad · Anotar · Metas · Plan, Anotar integrado al centro a ras de la barra (no elevado), y el destino actual con su icono relleno sobre ficha (`COMPONENT_SPECIFICATIONS.md` §AppShell, maestro §15.3).
2. **Given** un viewport entre 768 y 1023 px, **When** la app carga, **Then** la barra inferior aparece centrada con un ancho máximo de 560 px (`RESPONSIVE_SPECIFICATIONS.md`, md).
3. **Given** un viewport entre 1024 y 1279 px, **When** la app carga, **Then** no hay barra inferior y aparece el rail de 76 px con los destinos, Balance incluido, Anotar al final del rail y el acceso a Mi cuenta al pie (§15.3, decisión 4).
4. **Given** un viewport de 1280 px o más, **When** la app carga, **Then** aparece el sidebar de 248 px con la marca Juntia, el selector Yo/Nosotros, los destinos de 46 px (Inicio, Actividad, Metas, Plan, Balance), Anotar como bloque fijo con el atajo `N` visible y el acceso a Mi cuenta al pie, sin control de tema (§15.3, decisiones 4 y 6).
5. **Given** cualquier ancho, **When** la persona navega con teclado, **Then** el primer elemento enfocable es «Ir al contenido», la navegación tiene nombre accesible, el destino actual lleva `aria-current="page"` y el foco es visible con el anillo de 2 px (`COMPONENT_SPECIFICATIONS.md` §AppShell, handoff §Accesibilidad).
6. **Given** un viewport menor de 1024 px, **When** la persona busca Balance en la barra, **Then** no lo encuentra: Balance es destino solo en escritorio y la barra móvil no cambia (§15.3).

---

### User Story 2 - Entender que esta versión todavía no guarda datos (Priority: P1)

Una persona abre cualquier destino y entiende, sin que nadie se lo explique, que
esta versión es la base de Juntia y todavía no guarda datos. Ve estados vacíos
diseñados, nunca una cifra, un saldo ni una barra que aparenten venir de sus
finanzas. Balance dice que todavía no está disponible y Mi cuenta dice que la
cuenta llega con el inicio de sesión.

**Why this priority**: es la regla «lo que todavía no existe dice que no existe»
del maestro §15.10. Mostrar un «$0» o un «Al día» sin datos sería presentar algo
simulado como real, que §10.3 prohíbe.

**Independent Test**: recorrer todas las rutas implementadas en los dos temas y
comprobar que el aviso de versión base está visible y que no aparece ninguna
cifra, porcentaje, saldo, estado financiero ni progreso.

**Acceptance Scenarios**:

1. **Given** cualquier ruta del shell, **When** se muestra, **Then** el aviso de que esta versión todavía no guarda datos está visible (§15.10, «Aviso de versión base»).
2. **Given** Inicio, Actividad, Metas o Plan, **When** se muestran, **Then** cada uno presenta su estado vacío diseñado —ícono Duotone en ficha y texto útil, sin ilustraciones de stock (handoff §Auditoría anti-slop)— y ningún dato de ejemplo (decisión 9).
3. **Given** cualquier ruta, **When** se inspecciona su contenido visible y accesible, **Then** no hay «$0», importes, «Al día», «le debe», totales, porcentajes, barras de presupuesto ni progreso de metas (§15.10, «Ninguna afirmación financiera sin datos»).
4. **Given** un ancho de 1024 px o más, **When** la persona abre Balance, **Then** ve un estado de «todavía no disponible» que explica que el balance aparece cuando exista la pareja, nunca «Al día» ni una cifra (§15.10, decisión 4).
5. **Given** cualquier ancho, **When** la persona activa el acceso a Mi cuenta, **Then** llega a `/cuenta`, que dice que la cuenta llega con el inicio de sesión (§15.10, decisión 8).

---

### User Story 3 - Activar Anotar y saber cuándo llega (Priority: P1)

Una persona toca Anotar, o pulsa `N` en escritorio, porque es la acción
protagonista del shell. Se abre un aviso que explica que registrar gastos llega
con la próxima versión. No hay campos que aparenten guardar. Al cerrar el aviso,
el foco vuelve a donde estaba.

**Why this priority**: §15.10 exige que Anotar siga visible y operable aunque no
registre. Es el primer contacto con la acción principal del producto.

**Independent Test**: activar Anotar con toque, clic, Enter y `N`, en móvil y
escritorio; comprobar el aviso, su cierre con Escape y con su control de cierre, y
el retorno del foco al disparador.

**Acceptance Scenarios**:

1. **Given** cualquier ruta del shell, **When** la persona activa Anotar con toque, clic o teclado, **Then** se abre un aviso explícito de que registrar gastos todavía no está disponible y llega con la próxima versión, sin campos de monto, categoría ni botón de guardar (§15.10, «Anotar»).
2. **Given** el foco fuera de un campo de texto, **When** la persona pulsa `N`, **Then** se abre el mismo aviso (§15.10; handoff §Accesibilidad, «atajo N para Anotar»).
3. **Given** el aviso abierto, **When** la persona pulsa Escape o activa el control de cierre, **Then** el aviso se cierra y el foco vuelve al disparador (handoff §Accesibilidad; `MOTION_SYSTEM.md` §2, Teclado).
4. **Given** el aviso abierto, **When** se navega con Tab, **Then** el foco no sale del aviso hasta cerrarlo (`COMPONENT_SPECIFICATIONS.md` §BottomSheet y §Modal, foco atrapado).
5. **Given** un viewport menor de 768 px, **When** se abre el aviso, **Then** aparece como hoja inferior que respeta la safe area; **Given** 768 px o más, **Then** aparece como diálogo centrado de 520 px con scrim (Clarifications, Q1; `RESPONSIVE_SPECIFICATIONS.md`, Sheets y diálogos).

---

### User Story 4 - Cambiar entre Yo y Nosotros y que la app lo recuerde (Priority: P2)

Una persona cambia el selector de Yo a Nosotros. El selector refleja la elección,
un lector de pantalla anuncia el cambio y, al recargar o volver otro día en el
mismo dispositivo, el contexto elegido sigue ahí. El contenido no cambia porque
todavía no hay datos.

**Why this priority**: decisión 10. El selector es parte del shell aprobado, pero
la transición S1 y los datos que cambia llegan con P0-2.

**Independent Test**: cambiar el contexto con toque, clic y flechas de teclado en
móvil, a 1024 y a 1440; recargar y navegar entre destinos; comprobar que se
conserva y que no hay animación de transición de contexto.

**Acceptance Scenarios**:

1. **Given** el selector en Yo, **When** la persona elige Nosotros, **Then** el selector muestra Nosotros como seleccionado y se anuncia «Ahora ves: Nosotros» por una región viva (handoff §Accesibilidad; `MOTION_SYSTEM.md` §1, Teclado).
2. **Given** Nosotros seleccionado, **When** la persona recarga o navega a otro destino, **Then** el contexto sigue siendo Nosotros (decisión 10).
3. **Given** un viewport menor de 1280 px, **When** se muestra un destino principal, **Then** el selector está arriba a la derecha del contenido, también a 1024, y no hay popover desde el rail (§15.3, decisión 5).
4. **Given** un viewport de 1280 px o más, **When** se muestra el shell, **Then** el selector está dentro del sidebar, bajo la marca (§15.3).
5. **Given** cualquier ancho, **When** cambia el contexto, **Then** no se ejecuta la Context Transition: ni salida y entrada de bloques, ni contador, ni crossfade del titular, y el contenido no varía (decisión 10; Clarifications, Q2).
6. **Given** movimiento sin reducir, **When** cambia el contexto, **Then** la perilla del Segmented se desliza con su spring como respuesta propia del control; **Given** movimiento reducido, **Then** salta sin desplazarse (Clarifications, Q2; `COMPONENT_SPECIFICATIONS.md` §Tabs / Segmented; `MOTION_SYSTEM.md` §1).

---

### User Story 5 - Ver la app en el tema del sistema, sin destello (Priority: P2)

Una persona con el sistema en modo oscuro abre Juntia y la ve en oscuro desde el
primer cuadro, sin un destello claro. Si cambia el tema del sistema con la app
abierta, la app lo sigue.

**Why this priority**: §15.10 fija que en la 001 el tema sigue al sistema, con el
script bloqueante y los dos temas completos. No hay selector manual hasta Mi
cuenta › Apariencia.

**Independent Test**: cargar cada ruta emulando `prefers-color-scheme: light` y
`dark`, con red lenta, y comprobar el primer pintado; cambiar la preferencia con
la app abierta.

**Acceptance Scenarios**:

1. **Given** el sistema en oscuro, **When** se carga cualquier ruta, **Then** el primer pintado ya usa el tema oscuro, sin destello del tema claro (`DESIGN_SYSTEM.md` §convención; `MOTION_SYSTEM.md`, Reglas técnicas; §15.10, «Tema»).
2. **Given** la app abierta, **When** cambia la preferencia del sistema, **Then** la app pasa al otro tema con la transición de color de 180 ms, o instantáneamente con movimiento reducido (`MOTION_SYSTEM.md`, Reglas técnicas).
3. **Given** cualquier ancho y ruta, **When** se revisa en los dos temas, **Then** el oscuro tiene composición propia por tokens semánticos y no es una inversión de colores (maestro §6.1; handoff §Trazabilidad, «Oscuro cercano al negro» [A]).
4. **Given** el sidebar o cualquier ruta, **When** se busca un control de tema, **Then** no existe (decisión 6).

---

### User Story 6 - Recibir primitivos listos para conectar P0-1 (Priority: P2)

Quien implementa P0-1 usa los primitivos del paso 2 del orden de implementación
—AppIcon, Avatar, CategoryIcon, Badge, Button, Input, AmountInput, Segmented y
Skeleton— sin tener que reconstruirlos, con sus estados, accesibilidad y tokens
ya resueltos.

**Why this priority**: el maestro §15.1 asigna los primitivos a la 001 y la
decisión 11 mantiene AmountInput aquí. Varios no se muestran en ninguna pantalla
de la 001, así que su verificación vive en la capa de componentes (§15.10,
decisión 11, «Lo que esta decisión no cierra»).

**Independent Test**: las pruebas de componentes de cada primitivo crítico pasan;
la revisión humana del PR ve cada primitivo en sus estados y en los dos temas en
la superficie interna de revisión (Clarifications, Q3; FR-049).

**Acceptance Scenarios**:

1. **Given** AmountInput enfocado en un teléfono, **When** se escribe, **Then** se abre el teclado numérico nativo, el valor se muestra con puntos de miles y sin decimales, y nunca supera 999.999.999 (`COMPONENT_SPECIFICATIONS.md` §Input, Monto; decisión 11).
2. **Given** AmountInput con un valor inválido, **When** se muestra el error, **Then** el borde cambia a `status.danger`, aparece el ícono de error y un mensaje que dice cómo corregir, anunciado de forma educada y enlazado con el campo (`COMPONENT_SPECIFICATIONS.md` §Input).
3. **Given** un importe largo, **When** AmountInput lo muestra, **Then** reduce el tamaño del texto sin cortarlo (`COMPONENT_SPECIFICATIONS.md` §Input; `RESPONSIVE_SPECIFICATIONS.md`, Importes largos).
4. **Given** un Button en estado cargando, **When** se muestra, **Then** conserva su ancho, muestra el indicador giratorio y la etiqueta en gerundio, sin salto de layout (`COMPONENT_SPECIFICATIONS.md` §Button).
5. **Given** un Segmented, **When** se opera con teclado, **Then** las flechas cambian la opción y el rol accesible corresponde al uso (`COMPONENT_SPECIFICATIONS.md` §Tabs / Segmented).
6. **Given** un ícono decorativo, **When** se renderiza, **Then** está oculto a lectores de pantalla; un botón de solo ícono tiene nombre accesible (`DESIGN_SYSTEM.md` §3).
7. **Given** un build de desarrollo o de revisión, **When** se abre la superficie interna de revisión, **Then** muestra cada primitivo en sus estados y en los dos temas; **Given** el build de producción, **Then** esa ruta devuelve el estado de «no encontrado» (Clarifications, Q3).

---

### User Story 7 - Cada PR pasa por CI con los controles que ya aplican (Priority: P3)

Cada push a un PR ejecuta lint, typecheck y build; Vitest de dominio y
componentes; y axe en los dos temas sobre las rutas implementadas. El resumen
declara como **no aplicables** el job 3 (Supabase y RLS) y el job 4 (E2E de humo),
con la especificación que los incorpora.

**Why this priority**: ADR-011 §5, enmienda del 3 de noviembre: la 001 crea el
workflow con los jobs 1, 2 y 5. Un workflow que no ejecuta nada es ruido.

**Independent Test**: abrir un PR de prueba y comprobar que los tres jobs corren
en paralelo, que fallan cuando deben y que el resumen nombra los dos controles no
aplicables.

**Acceptance Scenarios**:

1. **Given** un PR, **When** se empuja un commit, **Then** corren en paralelo el job 1 (lint + typecheck + build), el job 2 (Vitest, proyectos de dominio y de componentes) y el job 5 (axe en los dos temas sobre todas las rutas implementadas) (ADR-011 §5; `docs/TESTING.md` §3).
2. **Given** el resumen del CI y la salida de `verify`, **When** se leen, **Then** los tests SQL/RLS y el E2E de humo figuran como **no aplicables, incorporados por P0-1**; nunca como pasados ni omitidos en silencio (`docs/TESTING.md` §3, regla 1).
3. **Given** un color hex crudo fuera del archivo de tokens o una espera fija en un test de navegador, **When** corre el lint, **Then** falla (ADR-011 §6, reglas 4 y 7).
4. **Given** cualquier run, **When** termina, **Then** publica la duración de cada job y de cada comando contra su presupuesto, y avisa sin fallar si lo supera (ADR-011 §4, «Cuándo empiezan a bloquear»).

---

### Edge Cases

- **Texto ampliado al 200 %.** Las filas pasan a dos líneas, los segmentados se apilan y la barra inferior oculta las etiquetas conservando su nombre accesible (handoff §Accesibilidad; `RESPONSIVE_SPECIFICATIONS.md`). Sin pérdida de contenido ni de función.
- **360 px.** El encabezado móvil debe alojar el acceso a Mi cuenta (44 px) y el selector sin solaparse; el titular baja de tamaño (`RESPONSIVE_SPECIFICATIONS.md` §Cuenta, 360).
- **Safe areas de iOS.** La barra inferior y la hoja del aviso de Anotar respetan `env(safe-area-inset-bottom)` (`RESPONSIVE_SPECIFICATIONS.md`, Safe areas; Clarifications, Q1).
- **Cambio de ancho con el aviso abierto.** Si el viewport cruza 768 px con el aviso abierto, el aviso sigue abierto en el contenedor del nuevo ancho y conserva el foco dentro.
- **Cambios rápidos del selector.** Si la persona cambia de contexto varias veces seguidas, la perilla termina en la última opción elegida y el contexto recordado es ese.
- **`N` mientras se escribe.** Si el foco está en un campo de texto, `N` escribe la letra y no abre el aviso. Con el aviso de Anotar ya abierto, `N` no abre otro.
- **Valor del contexto recordado ilegible o ausente.** Si el dispositivo no tiene un contexto recordado, o el almacenamiento no está disponible (navegación privada, almacenamiento bloqueado), la app arranca en Yo y sigue funcionando; el selector cambia el contexto durante la visita aunque no pueda recordarlo.
- **Script de tema sin almacenamiento ni JavaScript tardío.** El tema se resuelve solo con la preferencia del sistema; sin JavaScript, la página no debe pintar el tema contrario al del sistema. [V] del script con App Router (ver inventario).
- **Ruta de Balance abierta por URL en móvil.** Muestra el mismo estado de «todavía no disponible»; la barra móvil no gana un sexto destino.
- **Rutas de Mi cuenta que todavía no existen** (`/cuenta/perfil`, `/cuenta/pareja`, `/cuenta/apariencia`, `/cuenta/privacidad`, `/cuenta/seguridad`). No se construyen en la 001; si se abren, muestran el estado de «no encontrado» del shell, nunca una pantalla a medio hacer.
- **Ruta inexistente o error de render.** Estado de «no encontrado» y estado de error diseñados dentro del shell, con el aviso de versión base y salida hacia Inicio (maestro §6.3; `AGENTS.md` 11). Ninguno muestra un mensaje técnico crudo (`docs/CONVENTIONS.md` B.1).
- **Sin red.** Las rutas del shell no dependen de datos; si un recurso estático falla, la app no promete guardar nada (handoff §Reglas de negocio de la UI, «Sin red no se guarda»).
- **Importe de 999.999.999 y más.** AmountInput no acepta más de nueve dígitos; al pegar un texto con símbolos, puntos o espacios, conserva solo los dígitos; al pegar algo sin dígitos, no cambia el valor.
- **AmountInput vacío frente a cero.** Vacío no es cero (misma idea que DEC-R01 aplica a `null`): el primitivo distingue «sin valor» de «0» y no decide por sí mismo si cero es válido; lo decide el formulario que lo use, en P0-1.
- **Movimiento reducido.** Todo lo que se mueve en la 001 —pulsación de Button, perilla del Segmented, aparición del aviso, cambio de tema, pulso del Skeleton— pasa a opacidad o a cambio instantáneo, con el mismo resultado final (`MOTION_SYSTEM.md`).
- **1024 px en oscuro.** El comp no dibuja el rail de 1024 en oscuro (`docs/design/screenshots/README.md`); se compone con los tokens semánticos y se revisa en el PR.

## Requirements *(mandatory)*

### Functional Requirements

#### Scaffold y estructura

- **FR-001**: El repositorio MUST tener el scaffold de la aplicación con el stack congelado del maestro §7.1 y la estructura de §7.2. Las versiones exactas se verifican y fijan durante el bootstrap, con lockfile (§7.1).
- **FR-002**: El scaffold MUST incluir solo las dependencias que la 001 necesita (`AGENTS.md` 13 y 19). No incluye cliente de base de datos, autenticación, manifiesto PWA ni librería de i18n (`docs/CONVENTIONS.md` B.3).
- **FR-003**: La capa de dominio MUST existir vacía de reglas financieras y respetar la regla de dependencia de §7.2: no importa interfaz ni SDK. La 001 no crea tipos de dinero, contexto de datos, persona ni moneda: son de P0-1 (§15.10, «Dataset dorado»).

#### Tokens y temas

- **FR-004**: El sistema MUST definir los tokens primitivos y semánticos de `DESIGN_SYSTEM.md` §1 y §2 para los dos temas, aplicados por un atributo de tema en el documento, con las personas reducidas a `person.1` y `person.2` (maestro §15.9, fila «Personas»).
- **FR-005**: El tema MUST seguir a la preferencia del sistema, resuelto antes del primer pintado por un script bloqueante en el documento, sin destello (§15.10, «Tema»; `DESIGN_SYSTEM.md`). No hay selector manual ni persistencia de tema en la 001.
- **FR-006**: Ningún color MUST escribirse como hex crudo fuera del archivo de tokens; una regla de lint lo impide (ADR-011 §6, regla 7).
- **FR-007**: La tipografía MUST ser Instrument Serif para titulares, Geist para interfaz y cifras con `tabular-nums` global, y Geist Mono para metadatos (`BRAND_FOUNDATION.md` §6 [A]; `DESIGN_SYSTEM.md` §1.4). Serif nunca en tablas ni formularios.

#### Primitivos (handoff, orden de implementación, paso 2)

- **FR-008**: El sistema MUST proveer `AppIcon`, wrapper tipado de Phosphor con nombre, peso, tamaño y etiqueta opcional, e imports individuales; decorativo por defecto y con nombre accesible cuando lo lleva (§15.2; `DESIGN_SYSTEM.md` §3). Ninguna otra familia de iconos, ningún emoji.
- **FR-009**: El sistema MUST proveer `Avatar` con color de persona e inicial, para `person.1` y `person.2`. El patrón de tramo por persona no se implementa: es propuesta sin aprobar y en P0 no se usa (§15.9, fila «Personas»).
- **FR-010**: El sistema MUST proveer `CategoryIcon` con los cuatro tamaños, las diez categorías de `DESIGN_SYSTEM.md` §1.3, peso Duotone, la forma según el tipo de fila y el anillo de seleccionado; es decorativo (`COMPONENT_SPECIFICATIONS.md` §CategoryIcon).
- **FR-011**: El sistema MUST proveer `Badge` con los estados de `COMPONENT_SPECIFICATIONS.md` §Badge de estado, siempre ícono + texto.
- **FR-012**: El sistema MUST proveer `Button` con variantes primary, secondary, ghost y danger, tamaños sm/md/lg con área táctil mínima de 44, y estados hover, pressed, focus, disabled y loading (`COMPONENT_SPECIFICATIONS.md` §Button).
- **FR-013**: El sistema MUST proveer `Input` con label, ayuda, error y disabled, y error anunciado y enlazado al campo (`COMPONENT_SPECIFICATIONS.md` §Input).
- **FR-014**: El sistema MUST proveer `AmountInput` con teclado numérico nativo, máscara COP con puntos de miles, sin decimales, máximo 999.999.999, ayuda enlazada, error accesible y reducción de tamaño sin corte (`COMPONENT_SPECIFICATIONS.md` §Input, Monto; decisión 11). Entrega el valor en **pesos enteros, sin aritmética de punto flotante y sin convertirlo a unidades menores**: esa conversión es de `domain/money`, en P0-1 (maestro §5.2).
- **FR-015**: El sistema MUST proveer `Segmented` con riel, perilla y etiqueta, rol accesible según el uso y flechas de teclado. La perilla se desliza con el spring `snappy` y, con movimiento reducido, salta sin desplazarse (`COMPONENT_SPECIFICATIONS.md` §Tabs / Segmented; `MOTION_SYSTEM.md` §1; Clarifications, Q2).
- **FR-016**: El sistema MUST proveer `Skeleton` que replica la geometría del contenido final, con pulso de opacidad sin shimmer, estático con movimiento reducido, contenedor `aria-busy` y texto oculto de carga; solo aparece si la carga supera 300 ms (`COMPONENT_SPECIFICATIONS.md` §Skeleton; `MOTION_SYSTEM.md` §6).
- **FR-017**: Ningún primitivo MUST presentar datos financieros de ejemplo en una ruta de la app; la única excepción es la superficie interna de revisión (FR-049), que no existe en producción. Las pruebas de componentes y esa superficie usan valores de las especificaciones de componente (por ejemplo, el límite 999.999.999), **no** el caso de octubre ni la tabla de DEC-G04, que pertenecen al dataset dorado de P0-1 a P0-3 (§15.10, regla 3).

#### AppShell y navegación

- **FR-018**: El AppShell MUST presentar barra inferior por debajo de 1024 px (centrada y de 560 px como máximo entre 768 y 1023), rail de 76 px entre 1024 y 1279, y sidebar de 248 px desde 1280 (§15.3; `COMPONENT_SPECIFICATIONS.md` §AppShell; `RESPONSIVE_SPECIFICATIONS.md`).
- **FR-019**: Los destinos MUST ser Inicio, Actividad, Metas y Plan en todos los anchos, más Balance solo en el rail y el sidebar, con los iconos `house-simple`, `receipt`, `flag-banner`, `chart-pie-slice` y `scales` y etiqueta textual (§15.3; decisión 4; `DESIGN_SYSTEM.md` §3). Sin sexta pestaña móvil.
- **FR-020**: Anotar MUST estar siempre a un toque: integrado al centro de la barra (54×54, no elevado), al final del rail y como bloque fijo en el sidebar con el atajo `N` visible (§15.3; `RESPONSIVE_SPECIFICATIONS.md`, Anotar gasto).
- **FR-021**: El destino actual MUST mostrarse con icono Fill sobre ficha y `aria-current="page"`; los inactivos, con icono Regular (`DESIGN_SYSTEM.md` §3; `docs/design/screenshots/appshell-tab-activa.png`).
- **FR-022**: El AppShell MUST incluir el enlace «Ir al contenido» y una navegación con nombre accesible (`COMPONENT_SPECIFICATIONS.md` §AppShell).
- **FR-023**: El acceso mínimo a Mi cuenta MUST estar a la izquierda del encabezado de Inicio, Actividad, Metas y Plan en móvil y tablet, al pie del rail y al pie del sidebar; un toque, sin menú, con nombre accesible «Mi cuenta» (§15.3; decisión 8). **No** implementa la anatomía de `AccountButton`, que es propuesta pendiente de P0-1 (§15.9): no muestra avatar con inicial, nombre de persona ni estado de pareja, porque no hay sesión. Usa el icono de Perfil del mapa semántico (`user-circle`, `DESIGN_SYSTEM.md` §3).
- **FR-024**: Cada ancho MUST tener composición propia: a 1440 px el contenido es editorial y limitado, no la vista móvil ampliada (US-15; maestro §6.3; `RESPONSIVE_SPECIFICATIONS.md`, 2xl).

#### Selector Yo/Nosotros

- **FR-025**: El selector MUST ofrecer «Yo» y «Nosotros», ubicarse arriba a la derecha del contenido por debajo de 1280 px —también a 1024— y dentro del sidebar desde 1280; no hay popover desde el rail (§15.3; decisión 5).
- **FR-026**: El selector MUST cambiar el contexto y recordarlo en el mismo dispositivo entre recargas y navegación; sin contexto recordado, arranca en Yo (decisión 10). No se guarda en un servidor ni se sincroniza entre dispositivos.
- **FR-027**: El cambio de contexto MUST anunciarse por una región viva («Ahora ves: Nosotros») y no ejecutar la Context Transition: ni salida y entrada de bloques, ni contador, ni crossfade del titular; el contenido no varía porque no hay datos. La única respuesta animada es el deslizamiento de la perilla del Segmented (FR-015) (decisión 10; Clarifications, Q2; handoff §Accesibilidad).

#### Comportamiento provisional (§15.10)

- **FR-028**: El AppShell MUST mostrar en todas sus rutas un aviso visible de que esta versión todavía no guarda datos, que no se puede descartar y que desaparece cuando P0-1 conecte el servidor (§15.10, «Aviso de versión base»).
- **FR-029**: Ninguna ruta de producto MUST mostrar «$0», importes, «Al día», «le debe», totales, porcentajes, barras de presupuesto ni progreso de metas. Los estados vacíos neutrales están permitidos; las cifras, no (§15.10, «Ninguna afirmación financiera sin datos»). La superficie interna de revisión (FR-049) no es una ruta de producto: no existe en producción, no se enlaza y se identifica como interna.
- **FR-030**: Inicio, Actividad, Metas y Plan MUST mostrar un estado vacío diseñado —ícono Duotone en ficha y texto útil— y ningún dato de ejemplo (decisión 9; handoff §Auditoría anti-slop). Los estados vacíos no ofrecen controles que aparenten funcionar, como «Crear meta» o «Crear presupuesto». El de Plan no sugiere que el presupuesto sea obligatorio (DEC-R01; US-13).
- **FR-031**: Anotar MUST abrir un aviso explícito de que registrar gastos llega con la próxima versión, sin campos que aparenten guardar; se abre también con `N`, se cierra con Escape y con un control de cierre, atrapa el foco y lo devuelve al disparador (§15.10, «Anotar»; handoff §Accesibilidad). El aviso se presenta en **el contenedor real de Anotar**: hoja inferior por debajo de 768 px y diálogo centrado de 520 px desde 768 px, construido una sola vez para que P0-1 solo cambie su contenido (Clarifications, Q1; `RESPONSIVE_SPECIFICATIONS.md`, Sheets y diálogos).
- **FR-031a**: BottomSheet y Modal MUST entrar en la 001 **solo** en lo que el aviso necesita: foco atrapado, Escape, control de cierre, retorno del foco al disparador, safe area y alternativa de movimiento reducido (Clarifications, Q1; `COMPONENT_SPECIFICATIONS.md` §BottomSheet y §Modal). Quedan fuera las paradas `peek`/`full`, el arrastre desde el asa o el contenido y la confirmación de cambios sin guardar, porque el aviso no tiene campos; llegan con P0-1.
- **FR-032**: La ruta de Balance MUST existir y mostrar un estado de «todavía no disponible» que explica que el balance aparece cuando exista la pareja; nunca «Al día» ni una cifra (§15.10, decisión 4). No usa `SharedBalance`, que es propuesta de P0-2 (§15.9).
- **FR-033**: `/cuenta` MUST existir y decir que la cuenta llega con el inicio de sesión (§15.10, decisión 8). En móvil es una pantalla apilada sin barra inferior y con control «Volver» (`caret-left`); en escritorio vive dentro del shell con el acceso a Mi cuenta marcado como actual (`RESPONSIVE_SPECIFICATIONS.md` §Cuenta; `COMPONENT_SPECIFICATIONS.md` §AppShell). No implementa ningún componente de la sección Cuenta (§15.9).
- **FR-034**: Ningún aviso provisional MUST nombrar fases internas («P0-1», «P0-2») en la interfaz ni prometer fechas; dice qué no está disponible todavía y qué lo trae (la próxima versión, el inicio de sesión, la pareja) (`BRAND_FOUNDATION.md` §4).

#### Copy

- **FR-035**: Todo texto visible y todo nombre accesible MUST salir de un módulo de copy tipado y centralizado, en español de Colombia, con tuteo, frases cortas, sin emojis ni exclamaciones (`docs/CONVENTIONS.md` B.1 y B.2; `BRAND_FOUNDATION.md` §4). Un texto inexistente o un parámetro faltante es un error de tipo.
- **FR-036**: El copy MUST usar los términos de `docs/GLOSSARY.md` («Yo», «Nosotros», «Mi cuenta») y ninguna palabra de su §9. La 001 no introduce términos de negocio nuevos ni aprueba los identificadores **[propuesta]** del glosario: el valor recordado del selector es una preferencia de interfaz, no el tipo de contexto de datos (`scope`), que corresponde a P0-1 (§15.10, «Dataset dorado»).

#### Accesibilidad, responsive y motion

- **FR-037**: Todos los objetivos táctiles MUST medir al menos 44×44; las piezas de la barra inferior, 46–56 (handoff §Accesibilidad; §15.7).
- **FR-038**: Todo MUST poder operarse con teclado, con el anillo de foco de 2 px y offset de 2 px en los dos temas, y nunca sin foco visible (handoff §Accesibilidad).
- **FR-039**: No MUST haber scroll horizontal a 360, 390, 430, 1024 ni 1440 px (§15.7), ni pérdida de contenido o función con texto al 200 % (handoff §Accesibilidad).
- **FR-040**: Todo movimiento de la 001 MUST respetar `prefers-reduced-motion` con la alternativa de `MOTION_SYSTEM.md`. Del cambio de contexto solo se anima la perilla del Segmented; el contenido no (decisión 10; Clarifications, Q2).
- **FR-041**: El AppShell MUST respetar las safe areas de iOS en la barra inferior (`RESPONSIVE_SPECIFICATIONS.md`).

#### Calidad y CI

- **FR-042**: El repositorio MUST tener un comando `verify` con lint, typecheck, Vitest de dominio y Vitest de componentes, que declara los tests SQL/RLS como **no aplicables, incorporados por P0-1** (`docs/TESTING.md` §2 y §3).
- **FR-043**: El CI MUST correr en cada push a un PR, en paralelo, los jobs 1 (lint + typecheck + build), 2 (Vitest, proyectos de dominio y de componentes) y 5 (axe en los dos temas sobre todas las rutas implementadas), y declarar como no aplicables los jobs 3 y 4 con la especificación que los incorpora (ADR-011 §5, enmienda; `docs/TESTING.md` §3).
- **FR-044**: El contexto de navegador para axe MUST usar `reducedMotion: 'reduce'` por defecto, solo Chromium en el PR, retries 0 en local y 1 en CI, y ninguna espera fija, con regla de lint que la prohíba (ADR-011 §6, reglas 3–6).
- **FR-045**: Las pruebas MUST vivir en la capa más baja que detecta su fallo (`docs/TESTING.md` §4). Componentes con RTL selectivo, solo en los críticos de la 001: AmountInput (formato, máximo, vacío frente a cero, error accesible), el selector (cambio, recuerdo, anuncio), Anotar (aviso sin campos, `N`, foco) y la ausencia de cifras en las rutas.
- **FR-046**: Cada run MUST medir y publicar la duración de `verify`, de cada proyecto de Vitest y de cada job contra su presupuesto, y solo avisar si lo supera: los presupuestos no bloquean hasta el cierre de P0-2, y ningún techo se mueve por una medición (ADR-011 §4, cláusula anticliquet).
- **FR-047**: La 001 MUST añadir **cero** specs E2E (ver «Specs E2E que añade la 001»).

#### Superficie interna de revisión

- **FR-049**: El sistema MUST tener una superficie interna de revisión de los primitivos: una ruta sin ningún enlace desde la navegación, que en el build de producción devuelve el estado de «no encontrado». Muestra cada primitivo del paso 2 en sus estados y en los dos temas, y se identifica como superficie interna, no como pantalla de producto. El nombre de la ruta lo propone el plan (Clarifications, Q3).
- **FR-050**: La superficie interna MUST usar solo valores de las especificaciones de componente (por ejemplo, el límite 999.999.999 de AmountInput o los textos de los estados de Badge), **nunca** el caso de octubre ni la tabla de DEC-G04 (§15.10, regla 3; Clarifications, Q3).
- **FR-051**: La superficie interna MUST pasar axe en el job 5 como cualquier ruta implementada y servir para las capturas a 390 y 1440 del PR de implementación. No cuenta como spec E2E (Clarifications, Q3; ADR-011 §3).

#### Fuera de alcance (explícito)

- **FR-048**: La 001 MUST NOT incluir servidor, autenticación, base de datos, migraciones, siembra, ninguna parte del dataset dorado, el Expense Flow (E1–E5), BottomSheet y Modal más allá de lo que necesita el aviso de Anotar (FR-031a), la Context Transition S1, SharedBalance, metas, presupuestos, Mi cuenta más allá de `/cuenta` mínima, selector de tema, persistencia del tema, recuerdo del contexto en servidor, PWA, IA, scraping, landing ni modo offline (maestro §2.4, §15.1, §15.10; `CLAUDE.md` 10).

### Key Entities

La 001 no tiene entidades de dominio ni datos persistidos en servidor. Solo maneja
estado de interfaz:

- **Contexto seleccionado**: «Yo» o «Nosotros». Preferencia de interfaz recordada en el dispositivo. No es el tipo de contexto de datos de P0-1 ni autoriza nada.
- **Tema efectivo**: claro u oscuro, derivado de la preferencia del sistema en cada carga. No se guarda.
- **Destino de navegación**: Inicio, Actividad, Metas, Plan y, en escritorio, Balance; más Mi cuenta. Cada uno con etiqueta, icono y ruta.
- **Catálogo de copy**: los textos visibles y nombres accesibles de la 001, tipados y centralizados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A 360, 390, 430, 768, 1024, 1280 y 1440 px, en los dos temas, cada ruta implementada se ve sin scroll horizontal y sin solapamientos; las capturas de 390 y 1440 en los dos temas se adjuntan al PR y las aprueban los dos fundadores (§15.7; ADR-011 §7).
- **SC-002**: Cero violaciones serias o críticas de axe en todas las rutas implementadas, en los dos temas, con la salida real pegada en el PR (ADR-011, fila 16).
- **SC-003**: El 100 % de los objetivos táctiles miden al menos 44×44 px (§15.7).
- **SC-004**: Cero cifras financieras, saldos, porcentajes o estados financieros visibles o accesibles en cualquier ruta, comprobado por pruebas de componentes y por la revisión del PR (§15.10).
- **SC-005**: El aviso de Anotar responde en menos de 200 ms de INP al activarse, medido en laboratorio y reportado como tal, no como p75 real (§15.7; maestro §10.2).
- **SC-006**: CLS = 0 y ningún cuadro con el tema contrario al del sistema en la carga de cada ruta, con red lenta emulada (§15.7; `DESIGN_SYSTEM.md`).
- **SC-007**: El contexto elegido se conserva en el 100 % de las recargas y navegaciones del mismo dispositivo con almacenamiento disponible.
- **SC-008**: Una persona que abre la app por primera vez puede decir, sin ayuda, que esta versión todavía no guarda datos; lo comprueban los dos fundadores en la revisión del PR.
- **SC-009**: Cada run de CI publica la duración de cada job y de cada comando contra su presupuesto, y los controles no aplicables aparecen nombrados como tales.
- **SC-010**: Todas las acciones de la 001 se pueden completar solo con teclado y con movimiento reducido, con el mismo resultado final.

## Assumptions

- **Contexto por defecto: Yo.** Sin contexto recordado, el selector arranca en Yo, como en la captura móvil de referencia (`appshell-contexto-yo-nosotros-390.png`).
- **El recuerdo del contexto es por dispositivo.** Sin servidor ni cuentas (§15.10), se recuerda en el almacenamiento del navegador. Recordarlo en servidor no tiene dueño asignado y queda fuera de la 001.
- **El aviso de versión base no se puede descartar.** §15.10 pide que sea visible mientras no haya persistencia; descartarlo lo haría invisible. Su forma no usa `LimitNote`, que pertenece a la sección Cuenta, propuesta sin aprobar (§15.9); se compone con primitivos aprobados.
- **El selector aparece en los destinos principales y en Balance.** En `/cuenta` móvil, que es una pantalla apilada, no aparece; desde 1280 el sidebar lo muestra siempre.
- **Balance por URL en móvil** muestra el mismo estado provisional; no se enlaza desde ningún sitio en móvil, porque el módulo de Inicio que lo abre llega con P0-2.
- **Estados de «no encontrado» y de error** dentro del shell entran en la 001 como estados mínimos, porque la app ya tiene rutas (maestro §6.3; `AGENTS.md` 11).
- **El copy final se revisa en el PR.** El maestro §15.10 encarga a esta especificación el aspecto y el copy de los estados provisionales; la spec fija qué dice cada uno y el PR revisa la redacción en el módulo de copy.
- **Fuentes**: Instrument Serif, Geist y Geist Mono tienen licencia compatible; se verifica al instalarlas (maestro §6.1).
- **La revisión visual humana es el gate de «Visual y motion»**, fuera de CI (ADR-011 §7).

---

## Inventario de `[P]` que toca la 001

Clasificación en los dos ejes del maestro §15.9. «Toca» quiere decir que la 001
implementa algo relacionado o que debe evitarlo a propósito.

| Elemento `[P]` | ¿Afecta al alcance? | ¿Requiere aprobación antes de implementar? | Situación en la 001 |
| --- | --- | --- | --- |
| Sección Cuenta completa (AccountButton, ProfileHeader, AccountMenuItem, ThemeSelector, CoupleStatus, SensitiveActionConfirmation, LimitNote) | **Sí** — P0-1 y P0-2 | **Sí** | **Resuelto por la decisión 8**: la 001 solo da acceso mínimo a `/cuenta` (FR-023, FR-033). No implementa ninguno de los siete componentes; tampoco usa `LimitNote` para los avisos provisionales |
| Persistencia del tema (`profiles` + cookie) `[P][V]` | **Sí** — P0-1 | **Sí**, y además el `[V]` | **Resuelto por §15.10, «Tema»**: la 001 sigue al sistema y no persiste el tema (FR-005). No se implementa |
| Anotar gasto (flujo E1–E5) | **Sí** — F0-b y P0-1 | **Sí** | **Resuelto por las decisiones 7 y «Anotar» de §15.10**: la 001 solo abre el aviso (FR-031). No se implementa el flujo |
| Teclado nativo para el monto | **Sí** — P0-1 | **Sí** | **Aprobado** el 3 de noviembre de 2026 (decisión 11). AmountInput se construye (FR-014) |
| Teclado propio descartado | **Sí** — P0-1 | **Sí** | **Aprobado** con la fila anterior (decisión 11) |
| Personas configurables, escalables a N (+ patrón) | No — P0 usa `person.1–2` | **Sí** — `person.3–6` y el patrón de tramo | La 001 define solo `person.1–2` y Avatar sin patrón (FR-004, FR-009). Nada que aprobar en la 001 |
| Sara lila → petróleo; Hogar lavanda → azul tenue; superficie oscura #1C1F20 → #191C1F | No | **Sí** — se aprueba viendo la pantalla | Los tres valores entran en los tokens. La superficie oscura se ve en el shell, y `person.1` (Avatar) y la ficha Hogar (CategoryIcon) se ven en la superficie interna de revisión (FR-049): **los tres se pueden aprobar viéndolos en la revisión del PR de implementación de la 001** (Clarifications, Q3) |
| Gasto, ingreso y liquidación en tinta | No | **Sí** — se aprueba viendo la pantalla | Los tokens `finance.*` entran, pero ninguna ruta muestra movimientos: la aprobación pasa al primer slice que los muestre (P0-1) |
| Cuenta reutiliza los fondos de categoría | No | **Sí** | No se toca: la 001 no construye las pantallas de Cuenta |
| Stack de UI sugerido (Phosphor + `AppIcon`, Motion for React, `next/font`) | No | **No** — cerrado por §15.2 y §7.1 | Elección cerrada. La 001 instala solo lo que usa (FR-002) |
| Texto ampliado hasta 200 % | No | **No** — requisito ya obligatorio | Se aplica y se prueba (FR-039) |

No tocados por la 001: SharedBalance, GoalStack, ChangePreview, FundingLedger,
ConfirmationBadge y PlanningNote. Balance y Metas muestran estados provisionales
sin usarlos (FR-030, FR-032).

**Ningún `[P]` que afecte al alcance queda sin resolver:** los cuatro que la 001
toca con alcance «Sí» los cerraron los fundadores (decisiones 7, 8 y 11, y el
comportamiento provisional de §15.10).

## Inventario de `[V]` que toca la 001

Separados según la tabla de ADR-012 §2.

**Deciden cómo se construye — se ejecutan antes de cerrar el plan y se pega la salida:**

| `[V]` | Fuente | Qué hay que ejecutar |
| --- | --- | --- |
| Script de tema bloqueante con App Router | `DESIGN_SYSTEM.md`, convención («[V: validar con Next App Router]») | Comprobar que el tema se aplica antes del primer pintado, sin destello ni error de hidratación, en la versión fijada del framework |
| Compatibilidad exacta de versiones del stack | Maestro §7.1 («verificar durante bootstrap») | Fijar y comprobar las versiones estables de framework, React y librería de motion, con lockfile |
| Herramienta y configuración de la regla de hex crudos | ADR-011, [V] 5 y pregunta abierta 2 | Elegir y probar la regla; «lo resuelve la especificación 001 al crear el scaffold» |
| Demostración de `speckit-plan` | ADR-012, [V] 1 y enmienda §3.4 | El `plan.md` de la 001 muestra ejecutada su comprobación de jerarquía, con estos `[P]`, `[V]`, ADR y erratas |

**Comprueban lo construido — se ejecutan durante la implementación y la salida va al PR:**

| `[V]` | Fuente | Qué se comprueba |
| --- | --- | --- |
| Icono `scales` de Phosphor para Balance | `docs/design/README.md`, Log de cambios, línea 205 | Que el nombre existe en la versión fijada y coincide con el comp |
| Contraste en dispositivos reales | `DESIGN_SYSTEM.md` §4 | Pares texto/fondo del shell en los dos temas |
| Rendimiento de sombras táctiles en gama media | `DESIGN_SYSTEM.md` §4 | Barra inferior y botones en un móvil de gama media |
| Validación real con VoiceOver, TalkBack y axe | Handoff §Accesibilidad | axe en CI (job 5) y prueba manual con lectores en el shell |
| Umbrales de §15.7 aplicables | Maestro §15.7 («Verificado hasta ahora: nada») | CLS en carga, INP al abrir Anotar, scroll horizontal, objetivos táctiles |
| Presupuestos de tiempo | ADR-011, [V] 1 | Primera medición real de `verify`, Vitest y jobs; se reporta, no bloquea |
| `vitest --changed` para el bucle local | ADR-011, [V] 6 | Que funciona en un repositorio sin historial de suite |

**No los toca la 001:** altura del teclado nativo con la hoja de Anotar
(`RESPONSIVE_SPECIFICATIONS.md`) y teclados de terceros en Android (§15.6.2,
dependencia 3), que van a P0-1 según la decisión 11; workers con parejas
aisladas (ADR-011, [V] 3) y forma del claim de RLS, que van a P0-1; View
Transitions, scrim de fotos y abanico de metas, de P0-3.

## ADR, erratas y conflictos

- **ADR que necesita la 001:** ADR-011 y ADR-012, los dos **Aceptados**. La 001 no necesita un ADR nuevo.
- **ADR pendiente que no la afecta:** el de acceso a datos (ORM o `supabase-js`) se escribe antes de P0-1 (§15.10, final). La 001 no tiene base de datos.
- **Erratas pendientes del paquete:** ninguna (`docs/design/README.md`, «Erratas conocidas»).
- **Conflictos entre documentos superiores:** ninguno bloqueante. Dos lecturas en las que manda el maestro, registradas para la revisión:
  1. El handoff §Accesibilidad [A] dice «Personas: color + patrón + inicial», y el maestro §15.9 dice que el patrón de tramo no está aprobado y en P0 no se usa. Manda el maestro: Avatar sin patrón (FR-009).
  2. `COMPONENT_SPECIFICATIONS.md` §Tabs dice que cambiar el contexto dispara la Context Transition; la decisión 10 dice «sin animación». Manda el maestro (FR-027). Los fundadores precisaron el alcance en Clarify (Q2): la perilla se desliza; el contenido no transiciona.

## Specs E2E que añade la 001

**Cero.** El tope de ADR-011 §3 es de 4 a 6 specs E2E para todo P0, con un máximo
de 2 por especificación. Las cinco ya están nombradas y asignadas a recorridos
que la 001 no tiene; ADR-011 lo dice de forma explícita: «la especificación 001
no tiene ninguna spec E2E». La comprobación de axe por ruta (fila 16) es un E2E
barato por ruta y no cuenta como spec E2E. La sexta plaza sigue libre.

| | Antes de la 001 | La 001 añade | Después |
| --- | ---: | ---: | ---: |
| Specs E2E existentes | 0 | 0 | 0 |

## Criterios de aceptación aplicables

### Del handoff («Criterios de aceptación (solo P0)»)

Copiados literalmente. La columna dice si la 001 los puede afirmar.

| Criterio | ¿Aplica a la 001? |
| --- | --- |
| Mi cuenta: los criterios de 05·9 (navegación, perfil, pareja, apariencia, privacidad, sesión y acceso). | **Parcial:** solo la navegación a `/cuenta` (decisión 8). El resto, P0-1 y P0-2 |
| DEC-G04: `total_destinado_neto` reproduce cada fila de la tabla anterior y nunca se rotula «Total gastado» ni ocupa el número héroe. | No — P0-3 |
| Un gasto compartido existe una vez (total en Nosotros, parte en Yo); ninguna pantalla, export ni agregado suma Yo + Nosotros. | No — P0-2. La 001 no muestra agregados |
| Los aportes no cambian `gasto_consumo` ni lo consumido de presupuestos; se atribuyen al aportante real. | No — P0-3 |
| Una liquidación parcial Tomás → Sara 200.000 deja el consumo en 2.840.000 y el saldo en 229.900. | No — P0-2 |
| Un gasto con meta crea un único gasto real; las asignaciones por aportante suman el uso y son independientes del reparto. La meta nunca queda negativa. | No — P0-3 |
| Usar o retirar aportes ajenos sin confirmación del otro integrante queda bloqueado. | No — P0-3 |
| Un retiro nunca se presenta como ingreso. | No — P0-3 |
| Anotar registra privado o compartido desde un solo flujo; la reclasificación privado → compartido deja un único gasto activo y un registro de auditoría. | No — P0-1 y P0-2. La 001 solo abre el aviso |
| No se puede crear un espacio compartido con más de 2 integrantes. | No — P0-2 |
| El saldo de la pareja reproduce el caso de octubre incluyendo una liquidación parcial; la sugerencia es única y no crea transferencias. | No — P0-2 |
| Ambos integrantes pueden crear, editar y desactivar un presupuesto; el historial guarda autor y fecha; una edición concurrente no se pierde en silencio [V]. | No — P0-3 |
| Los dos temas pasan axe sin violaciones serias en Inicio, Actividad, Anotar, Balance y Meta. | **Parcial:** Inicio, Actividad y Balance existen como estados provisionales y pasan axe en los dos temas. Anotar es un aviso, no el flujo, y Meta no existe: **no cuentan como verificados** (`docs/TESTING.md` §3). Balance provisional no verifica el Balance real de P0-2 |
| Todos los momentos de motion respetan `prefers-reduced-motion`. | **Sí**, para los movimientos que la 001 tiene (FR-040) |
| Los datos del caso de octubre (COMPONENT_SPECIFICATIONS) reproducen exactamente los totales mostrados en el diseño. | No — P0-1 a P0-3 (§15.10, «Dataset dorado») |

### Del maestro §15.7 (umbrales que bloquean la aceptación)

| Umbral | ¿Aplica a la 001? |
| --- | --- |
| CLS = 0 en las cargas con skeleton de las rutas clave | **Sí**, en la carga de cada ruta del shell, incluido el script de tema (SC-006). Las rutas de la 001 no cargan datos, así que no hay skeleton en ellas |
| INP < 200 ms al abrir Anotar y al guardar | **Parcial:** al abrir el aviso de Anotar (SC-005). Guardar no existe |
| Mediana < 10 s para registrar un gasto habitual en teléfono real tras el onboarding (US-12) | No — P0-1 |
| Sin scroll horizontal en 360, 390, 430, 1024 y 1440 | **Sí** (SC-001) |
| Objetivos táctiles ≥ 44 px | **Sí** (SC-003) |
