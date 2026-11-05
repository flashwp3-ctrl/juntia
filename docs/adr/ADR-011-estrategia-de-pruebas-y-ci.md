# ADR-011 — Estrategia de pruebas y CI

**Estado:** Aceptado por los fundadores, 3 de noviembre de 2026 (maestro §15.10, decisión 1) · **Origen:** decisión de los fundadores, 2 de noviembre de 2026 · **Condiciones aplicadas:** revisión independiente, 2 de noviembre de 2026 · **Enmienda:** 3 de noviembre de 2026, tras el preflight de Spec Kit · **Alcance:** P0 (MVP-1)

> **Terminología.** En este ADR, «spec E2E *n*» es siempre una spec de Playwright
> de la tabla de §3. Una **especificación** (001, 002…) es un slice de producto.
> Son cosas distintas: la especificación 001 no tiene ninguna spec E2E.

## Contexto

El maestro §10.1 ya reparte las pruebas por nivel de riesgo y §7.1 ya fija la fila
de CI («lint, typecheck, unit de dominio, integración RLS, build y pocos E2E
smoke»). Lo que no existe es la regla que decide **dónde vive cada criterio de
aceptación concreto** ni el presupuesto de tiempo que impide que la suite se
degrade. Sin esa regla, el modo de fallo es conocido y no hace falta imaginarlo:
cada slice añade dos o tres pruebas de navegador para cosas que no necesitan
navegador, nadie las quita, y en seis meses el gate de PR dura cuarenta y cinco
minutos sin que nadie haya decidido que durara eso.

El repositorio está en el punto exacto en el que esa decisión todavía es barata:
**no existe scaffold de aplicación** (maestro §15.1), no hay `package.json`, no
hay suite que migrar. La primera especificación de ingeniería de P0 crea el
scaffold y, con él, la forma de la suite. Si la estrategia no está escrita antes,
la escribe por omisión el primer PR que añada un test.

Hay además dos activos que ya existen y que hoy no están siendo tratados como lo
que son:

- La **tabla de DEC-G04** de `docs/design/HANDOFF_CLAUDE_CODE.md` es, literalmente,
  una tabla de casos parametrizados: siete filas con entradas y salida esperada.
- El **caso de octubre** de `docs/design/COMPONENT_SPECIFICATIONS.md` es un dataset
  dorado con totales verificados a mano (2.840.000 de consumo, 900.000 de aporte,
  saldo 429.900, reparto 55/45 del arriendo).

Ambos se escribieron antes que el código. Esa es precisamente la condición que
hace que un test valga algo.

## Decisión

### 1. Principio rector

> Una prueba E2E se justifica cuando valida una **integración o recorrido
> observable que las capas inferiores no garantizan en conjunto**. No hace falta
> que ninguna de sus partes sea detectable por separado.

La frase que carga el peso es **«en conjunto»**. Un recorrido puede estar hecho de
piezas que el dominio, la RLS y la integración de servidor cubren cada una por su
lado, y seguir siendo un E2E legítimo, porque lo que falla es la costura: la
navegación entre ellas, el estado de cliente que queda obsoleto, la sesión que se
pierde al volver de un enlace. Eso no lo garantiza ninguna de esas capas, por bien
que cada una pase.

Lo que el principio sí excluye es el test de navegador que **reproduce** en la UI
una comprobación que una capa inferior ya hace entera: la aritmética de un saldo,
la clasificación de un movimiento, el rechazo de una escritura no autorizada. Esa
es la ruta por la que una suite acaba durando cuarenta y cinco minutos, y no
aparece por mala suerte: aparece probando en el navegador cosas que no necesitan
navegador.

Para un caso concreto, la pregunta útil no es «¿podría probarse más abajo?», sino
**«¿qué se rompería sin que ninguna capa inferior se entere?»**. Si la respuesta es
«nada», no es un E2E. Si es un recorrido, una redirección, una sesión o una vista
que no se refresca, lo es.

Corolario operativo: **los tests derivan de los criterios de aceptación del
handoff y del maestro, nunca de lo que hace la implementación.** Un test escrito
mirando el código afirma el bug además de la función.

### 2. Ubicación de cada criterio de aceptación de P0

La lista es la de «Criterios de aceptación (solo P0)» de
`docs/design/HANDOFF_CLAUDE_CODE.md`, más una regla de negocio de la UI del mismo
documento que es de privacidad y por tanto bloqueante (maestro §15.6).

| # | Criterio de aceptación | Capa | Herramienta | Por qué no una capa superior |
| --- | --- | --- | --- | --- |
| 1 | `total_destinado_neto` reproduce **cada fila** de la tabla de DEC-G04 y nunca se rotula «Total gastado» ni ocupa el número héroe | Dominio puro | Vitest (`test.each`, 7 filas) | Es aritmética de una función pura (§15.4). Un navegador no añade nada y tarda mil veces más. El rótulo y la jerarquía se revisan en la revisión humana del PR, no con un selector |
| 2 | Un gasto compartido existe una vez: total en Nosotros, parte en Yo; ninguna pantalla, export ni agregado suma Yo + Nosotros | Dominio puro **+ integración** | Vitest · Vitest + Supabase local (exportación autorizada) | La invariante del agregado es de dominio. **Pero la exportación no:** es la costura entre autorización y serialización, y ahí es donde un gasto puede salir dos veces o salir uno que no correspondía. El dominio no ve el serializador y la RLS no ve el archivo |
| 3 | Los aportes no cambian `gasto_consumo` ni lo consumido de presupuestos; se atribuyen al aportante real | Dominio puro | Vitest | Separación de dimensiones financieras (§5.1, DEC-G02). Es cálculo, no render |
| 4 | Una liquidación parcial Tomás → Sara 200.000 deja el consumo en 2.840.000 y el saldo en 229.900 | Dominio puro | Vitest | Dos números contra el dataset dorado. No requiere persistencia ni UI |
| 5 | Un retiro nunca **se presenta** como ingreso | Dominio puro **+ componente** | Vitest · Vitest + RTL (`ExpenseRow`) | La clasificación es de dominio, pero el criterio dice «se presenta», y eso es presentación: el dominio puede clasificar bien y la fila pintarlo igual con «+», ficha de ingreso y color de ingreso. El componente tiene que afirmar el signo, la forma de la ficha y la etiqueta |
| 6 | El saldo de la pareja reproduce el caso de octubre incluyendo la liquidación parcial; la sugerencia es única y no crea transferencias | Dominio puro | Vitest (`computeBalance`) | El handoff ya pide `computeBalance(expenses, settlements, members)` como función pura con tests. «No crea transferencias» se prueba por ausencia de efecto en el dominio |
| 7 | Los datos del caso de octubre reproducen exactamente los totales mostrados en el diseño | Dominio puro | Vitest (fixture dorada) | Es el dataset contra la función. Es el test más barato y el que más protege |
| 8 | Usar o retirar aportes ajenos sin confirmación del otro integrante queda bloqueado | Base de datos / RLS | SQL sobre Supabase local | Es autorización. Probarlo por la UI prueba que el botón está escondido, no que la escritura está prohibida. El ataque no usa el botón |
| 9 | No se puede crear un espacio compartido con más de 2 integrantes | Base de datos / RLS | SQL sobre Supabase local | Misma razón: es una restricción del servidor (§15.5). El formulario que no deja añadir un tercero es cortesía, no la regla |
| 10 | Los movimientos privados nunca **se renderizan** en el contexto Nosotros, ni en los totales ni en las búsquedas | RLS **+ interfaz** | SQL sobre Supabase local · caso de cambio de contexto en la spec E2E 3 | La RLS es imprescindible y no basta: garantiza que **la base no devuelva la fila**, no que una caché de cliente o un render obsoleto no la siga mostrando después de cambiar de Yo a Nosotros. Es la garantía de privacidad central del producto (`AGENTS.md` 6) y las dos mitades son bloqueantes |
| 11 | La reclasificación privado → compartido deja un único gasto activo y un registro de auditoría | Integración de servidor | Vitest + Supabase local, sin navegador | ADR-001 exige transacción única, idempotencia y auditoría. Eso se verifica llamando a la operación y mirando la base, incluida la concurrencia. El navegador no puede provocar la carrera de forma fiable |
| 12 | Un gasto con meta crea un único gasto real; las asignaciones por aportante suman el uso y son independientes del reparto; la meta nunca queda negativa | Integración de servidor | Vitest + Supabase local, sin navegador | §15.6.3 puntos 5 y 6: dos transacciones atómicas e idempotentes distintas. Es comportamiento de servidor bajo concurrencia y reintento |
| 13 | Una edición concurrente de presupuesto no se pierde en silencio **[V]** | Integración de servidor | Vitest + Supabase local, sin navegador | Hacen falta dos escritores simultáneos. Dos navegadores coordinados para eso son lentos, frágiles y no prueban nada que dos clientes no prueben mejor |
| 14 | Mediana < 10 s para anotar un gasto habitual tras el onboarding (US-12, §15.7) | E2E real | Playwright | Es un criterio sobre la experiencia completa: render, teclado, red y persistencia. Ninguna capa inferior lo puede medir |
| 15 | Mi cuenta: navegación, perfil, pareja, apariencia, privacidad, sesión y acceso (05·9) | E2E real | Playwright | Es navegación entre rutas reales con sesión real. Es exactamente lo que un E2E debe cubrir |
| 16 | Los dos temas pasan axe sin violaciones serias en Inicio, Actividad, Anotar, Balance y Meta | E2E barato por ruta | Playwright + axe. **En el PR: las rutas que el PR toca.** La matriz completa de 5 rutas × 2 temas, en el nocturno | Necesita un árbol de accesibilidad real, pero no un flujo: se visita la ruta y se pasa axe. La accesibilidad es criterio de aceptación **de cada slice** (§10.3), así que dejarla entera para el nocturno permitiría mergear un slice con una ruta inaccesible. Correr solo lo tocado mantiene el coste proporcional |
| 17 | Todos los momentos de motion respetan `prefers-reduced-motion` | E2E barato por ruta | Playwright (`use: { reducedMotion: 'reduce' }`) | Es una emulación de media feature del navegador. Además se ejercita de continuo por la regla dura nº 3, no solo en su test |

**Un criterio puede necesitar dos capas, y tres las necesitan** (filas 2, 5 y 10).
No es una concesión al tope: es el principio rector aplicado al revés. Cuando
el criterio habla de lo que el usuario **ve** («se presenta», «se renderizan»), la
capa que calcula bien no demuestra el criterio, y cuando habla de un **artefacto**
que sale del sistema (la exportación), ni el dominio ni la RLS lo ven entero. En
los tres casos **las dos mitades son bloqueantes**; ninguna es opcional ni
«reforzada por» la otra.

La fila 16 (axe) **no es uno de esos casos** y no entra en la cuenta: es una sola
técnica en una sola capa, ejecutada en **dos momentos de CI** —las rutas tocadas
en el PR, la matriz completa en el nocturno—. Dos momentos no son dos capas.

**El criterio «Anotar registra privado o compartido desde un solo flujo»** se parte
en dos mitades que viven en capas distintas: la mitad auditable (reclasificación
atómica) es la fila 11; la mitad de interfaz (un solo flujo para ambos contextos)
viaja en el spec de humo que §10.1 ya exige para «Registro privado». No es un spec
E2E adicional.

### 3. Tope de specs E2E

**4 a 6 specs E2E para TODO P0.** No por slice: en total.

Cada especificación de slice **declara cuántas añade, con un máximo de 2**. Si
quien la escribe cree necesitar más, se detiene y lo plantea; no las añade y lo
menciona después.

El tope no es una preferencia estética. Es el mecanismo que convierte el principio
rector en algo que se puede incumplir visiblemente.

**El reparto concreto son cinco specs.** Las cuatro familias de smoke que nombra
§10.1, más US-12 y Mi cuenta, caben exactamente ahí:

| # | Spec | §10.1 / criterio | Área que cubre |
| --- | --- | --- | --- |
| 1 | Acceso y Mi cuenta | Mi cuenta 05·9 (fila 15) | auth, cuenta, pareja, invitaciones |
| 2 | Anotar gasto, cronometrado (US-12) | «Registro privado» + mediana < 10 s (fila 14, §15.7) | gastos, anotar |
| 3 | Pareja 50/50 y liquidación | «pareja + 50/50 + liquidación» | repartos, balance, liquidaciones, contexto |
| 4 | Meta con aportes y uso | «meta individual/compartida con aportes y uso» | metas |
| 5 | Presupuesto activado/desactivado | «presupuesto activado/desactivado» | presupuestos |

Queda una sexta plaza libre dentro del tope de 4–6; gastarla exige la misma
justificación que cualquier otra spec.

#### Qué specs corre un PR

**Regla: el humo de un PR son las specs E2E 1, 2 y 3, más la spec E2E del área que el PR
toca.** Un PR de metas corre 1, 2, 3 y 4. Uno de presupuestos corre 1, 2, 3 y 5.
Uno que no toca ninguna de esas dos áreas corre las tres de base. **El nocturno
corre siempre las cinco.**

No es una optimización: es lo que impide mergear un slice sin su E2E. §10.1 marca
el smoke como bloqueante, y un slice de metas que mergea sin haber ejecutado nunca
el recorrido de aportes y uso no ha pasado ese gate, por mucho que el nocturno lo
ejecute después — después es cuando ya está en `main`.

La columna «área» de la tabla es lo que decide. Si un PR toca dos áreas, corre las
dos specs; si quien lo escribe duda de qué área toca, corre las cinco.

#### Arranque progresivo

Al principio esas specs no existen. La especificación 001 construye el AppShell, y
en ese momento no hay todavía recorrido de pareja ni de liquidación: la spec E2E 3 no
puede escribirse porque no hay nada que recorra. La regla anterior, leída al pie
de la letra, bloquearía el primer PR del proyecto.

> **Un PR ejecuta todas las specs aplicables que ya existan. Y una funcionalidad
> no se mergea sin añadir y ejecutar su E2E obligatoria.**

Las dos mitades importan, y la segunda es la que no admite lectura flexible. **Lo
que arranca progresivamente es qué specs existen, no la obligación.** Una
funcionalidad sin su E2E no mergea: no «todavía no», no «se añade en el siguiente
PR», no «de momento corremos las que hay». El PR que trae el recorrido de pareja
es el PR que trae la spec E2E 3.

Dicho de otro modo, esto no es una excepción temporal ni una rampa: es el orden
natural de las cosas. **La spec nace con la funcionalidad que prueba**, y por eso
la lista de cinco se completa sola a medida que P0 avanza. Si en algún momento
existe una funcionalidad de P0 sin su spec, no es que el arranque siga en curso:
es que un PR mergeó sin cumplir la regla.

#### Matriz de escenarios: dónde vive cada recorrido

Cinco nombres de archivo no son cobertura. Esta matriz es la que demuestra que los
recorridos que cruzan límites de seguridad o de navegación están verificados, y en
qué capa lo está cada parte. **No amplía el tope:** los cinco recorridos caben como
casos dentro de las cinco specs ya listadas.

| Recorrido | Riesgo que las capas inferiores no cubren en conjunto | Dónde se verifica |
| --- | --- | --- |
| Abrir invitación → iniciar sesión → volver → aceptar | Pérdida del contexto de navegación, de la redirección o de la sesión. El handoff lo pide explícito: «Sin sesión: guardar la intención, autenticar, volver y revalidar token, correo, caducidad, membresía y disponibilidad». La validación del token es de servidor; **que la intención sobreviva al rodeo por el login no lo es** | Caso en la **spec E2E 1**; validación de token, caducidad y un solo uso en integración de servidor |
| Cambiar Yo/Nosotros | Estado de cliente obsoleto o exposición visual de lo privado después del cambio. La RLS impide que la base devuelva la fila; no impide que una caché la siga pintando | Caso en la **spec E2E 3** (es la mitad de interfaz de la fila 10); la mitad de autorización, en RLS |
| Mover a Pareja | Que la vista cambie y los balances se actualicen tras una operación que mueve el gasto de un contexto a otro. La atomicidad y la auditoría ya están abajo (fila 11); lo que no está es que la pantalla refleje el resultado | Caso en la **spec E2E 3**; atomicidad, idempotencia y auditoría en integración de servidor |
| Solicitar financiación ajena → aprobar o rechazar | Coordinación entre **dos sesiones** y actualización de estados en ambas. Un solo cliente no puede demostrar que lo que Sara pide aparece y se resuelve en la vista de Tomás | Caso en la **spec E2E 4**, con dos contextos de navegador; revalidación de permisos, saldos y meta ≥ 0 en integración (fila 12) |
| Exportar datos | Autorización, archivo realmente descargado y experiencia. Que el servidor filtre bien no demuestra que el archivo llegue, ni que contenga lo que dice | **Integración** para el contenido y la autorización (fila 2: sin privados del otro, sin tokens, sin duplicados) · **la descarga, como caso de la spec E2E 1**, porque Exportar vive en «Privacidad y datos», dentro de Mi cuenta |

Los cinco recorridos tienen spec asignada; ninguno queda en «algún sitio donde haya
sesión». Dos consecuencias que conviene no perder de vista. La primera: la spec E2E 4
necesita **dos contextos de navegador autenticados a la vez**, lo que la ata a la
regla dura nº 2 (estados por worker **y por rol**) y no al patrón de sesión única.
La segunda: la exportación es el único recorrido cuyo peso está abajo y no en el
navegador, y así debe quedarse. Su caso en la spec E2E 1 comprueba que **el archivo
llega**, no lo que lleva dentro; un E2E que verifique el contenido del CSV es un
test de serialización disfrazado, y ese contenido ya es la fila 2.

### 4. Presupuestos de tiempo

Hay **dos magnitudes distintas** y confundirlas vuelve el contrato inaplicable. Un
comando local no paga `npm ci`; un job de CI lo paga siempre. Van en dos tablas.

#### Presupuestos de comando — ejecución local pura

Miden **solo la ejecución del comando**, en una máquina con las dependencias ya
instaladas y, donde haga falta, Supabase ya arrancado.

| Comando | Presupuesto |
| --- | --- |
| `verify` local (lint + typecheck + unit de dominio + componentes; SQL/RLS solo en CI, §9) | **< 90 s** |
| Unit de dominio, suite completa | **< 15 s** |
| Tests SQL / RLS (comando medido dentro del job 3 en CI, §9) | **< 60 s** |

#### Presupuestos de job de CI

Miden **el job completo**: checkout, `npm ci`, instalación del navegador, arranque
de servicios y ejecución. Es la lectura honesta, porque es la que espera quien
mira el PR y ve cuánto tarda en ponerse verde.

| Job | Presupuesto |
| --- | --- |
| E2E de humo en PR | **< 3 min** |
| **Gate de PR completo** (el más lento de los jobs en paralelo) | **< 6 min** |
| Nocturno / post-merge | **< 15 min** |

La frase «mide el job» aplica **solo a esta segunda tabla**.

#### Cuándo empiezan a bloquear

Hoy son **objetivos razonados y todavía no medidos**: no existe scaffold ni suite.

> **Los presupuestos pasan a bloquear cuando existan tres de las cinco specs E2E y
> el dominio cubra DEC-G04 y balances.** Coincide con el cierre de P0-2. Hasta
> entonces el job **mide, reporta y avisa** su duración contra el presupuesto, sin
> fallar.

El hito tiene un número a propósito, y no es «la entrega de la 001» ni «cuando la
suite sea representativa». La 001 es la fundación del frontend: **su suite es
pequeña por construcción**, y fijar los techos contra ella sería medirlos contra
una suite que es rápida solo porque está casi vacía. Pero «representativa» tampoco
vale: un hito indefinido no llega nunca, y entonces el presupuesto deja de ser un
contrato por la puerta de atrás, sin que nadie haya decidido abandonarlo. Tres
specs y el dominio con DEC-G04 y balances es comprobable mirando el repositorio,
que es la única clase de hito que se cumple.

A partir de ahí, **superar el presupuesto del humo falla el build**. Sin esa
consecuencia, cada PR añade veinte segundos que nadie nota y en seis meses la
suite vuelve a durar cuarenta y cinco minutos sin que nadie lo haya decidido.

#### Cláusula anticliquet

> **Si la línea base medida supera el techo, el hallazgo es la suite, no el
> techo.** El techo solo se mueve por decisión documentada de los fundadores, nunca
> automáticamente por una medición.

**Esta cláusula aplica desde el primer día, no desde el hito de bloqueo.** Que el
job todavía no falle no autoriza a subir un techo: mientras solo mide, lo que
reporta es cuánto le falta a la suite, no cuánto le sobra al presupuesto.

Es el ADR entero en tres líneas. Sin ella, «ya ajustaremos el umbral cuando
tengamos la línea base» es permiso para que el número siga a la deriva en vez de
contenerla, y el presupuesto deja de ser un contrato para volverse un registro de
lo que la suite ya tarda. Una medición es un dato sobre la suite; no es un
argumento sobre cuánto debería tardar.

#### Mitigación en el humo

**Instalar solo Chromium**: `npx playwright install --with-deps chromium`, nunca
los tres navegadores.

Y conviene dejarlo escrito para quien venga después: **no cachear los binarios del
navegador es una decisión, y la toma la documentación oficial de Playwright**, que
lo **desaconseja** — «Caching browser binaries is not recommended, since the amount
of time it takes to restore the cache is comparable to the time it takes to
download the binaries». La misma página **explica cómo hacerlo si aun así se
decide** (cachear esos directorios «against a hash of the Playwright version»), de
modo que el mecanismo existe y está documentado; lo que no hay es una recomendación
a favor. Quien quiera «arreglarlo» con un `actions/cache` está cambiando una
descarga por una restauración de coste comparable, no quitando trabajo.

### 5. CI en dos niveles

**Nivel 1 — cada push a un PR de código.** Controles (forma y disparadores: enmienda del 4 de noviembre, al final de esta sección):

1. lint + typecheck + build
2. **Vitest: dominio completo y componentes (RTL selectivo)** — el mismo contenido
   que `verify` ejecuta en local, sin los tests SQL/RLS, que van en su propio job
3. Supabase local en contenedor, con migraciones aplicadas y tests SQL de RLS
4. E2E de humo: **las specs E2E 1, 2 y 3, más la spec E2E del área que el PR toca**, solo
   Chromium, instalado con `npx playwright install --with-deps chromium`
5. **axe en los dos temas**: sobre las rutas que el PR toca y, mientras no exista
   el mapa de ruta tocada, sobre todas las rutas ya implementadas

**Nivel 2 — al mergear a `main` y de noche:**

1. E2E completo: **las cinco specs**, en **Chromium + WebKit**
2. axe en la matriz completa: 5 rutas × 2 temas
3. Snapshots visuales de **las 5 rutas** — no de cada componente
4. Rendimiento contra los umbrales del maestro §15.7

El workflow no se escribe en este ADR. Lo implementa la especificación 001 junto
al scaffold, porque un workflow que no ejecuta nada es ruido que además falla.
La descripción operativa está en `docs/TESTING.md`.

**Arranque progresivo de `verify` y del CI** (enmienda del 3 de noviembre, tras
la revisión del PR #6). La definición de `verify` y la lista del nivel 1 son el
destino, no el primer día. Cada control entra con la especificación que trae lo
que controla: la 001 crea el workflow con los **jobs 1, 2 y 5** (lint, typecheck
y build; Vitest de dominio y componentes; axe sobre las rutas implementadas);
**P0-1 incorpora obligatoriamente el job 3** (Supabase local, migraciones y
SQL/RLS), la siembra por base de datos y, con la primera spec E2E, el **job 4**.

Un control todavía no aplicable **se declara no aplicable**, con la especificación
que lo incorpora; nunca aparece como pasado ni se omite en silencio. Ninguna
especificación adelanta infraestructura para que `verify` «pase completo». Y el
contrapositivo: P0-1 no mergea sin el job 3. La tabla completa está en
`docs/TESTING.md` §3.

**Forma del nivel 1 y consumo de minutos** (enmienda del 4 de noviembre de 2026, decisión de los fundadores). Medido sobre los 12 primeros runs del repositorio, cada push consumía entre 6 y 8 minutos facturados de GitHub Actions. Había cuatro causas:

- los PR de solo documentación corrían todo;
- la app se construía dos veces;
- cada job repetía `npm ci` y redondeaba al minuto;
- los runs obsoletos no se cancelaban.

Desde esta enmienda el nivel 1 se organiza así. Sustituye a «jobs en paralelo» y al FR-043 de la especificación 001:

1. **Los controles 1, 2 y 5 van en un solo job, `app`, en serie y por orden de coste:** `npm ci`; lint, typecheck y Vitest, que fallan antes y más barato; un único build; y sobre ese mismo build Chromium (`npx playwright install --with-deps --only-shell chromium`), axe, `check:internal-surface` y `check:theme-script`. Cuando entren, los controles 3 (Supabase y RLS) y 4 (E2E de humo) son jobs propios, porque necesitan servicios.
2. **Un PR que solo toca documentación no corre el CI.** El workflow usa un filtro `paths` que ignora **tipos de archivo documentales**, nunca carpetas enteras, porque carpetas como `.specify/`, `.agents/` y `.claude/` mezclan documentación con scripts ejecutables y con reglas de seguridad como `.claude/settings.json`. Se ignoran `**/*.md`, `docs/**/*.png`, `specs/**/*.png` y `specs/**/*.txt` (texto de evidencia).

   Se vuelve a incluir todo lo que alimenta a una herramienta o a un agente, aunque sea Markdown: `.specify/**` (plantillas que leen los scripts de Spec Kit), `.claude/**` (skills y configuración de Claude Code), `.agents/**` (skills de Codex y de los agentes), `AGENTS.md` y `CLAUDE.md`. El CI no valida el contenido de esos archivos, pero un cambio operativo nunca queda sin CI. Un patrón nuevo solo se añade después de comprobar que esos archivos nunca son entrada del build, de las pruebas ni de las herramientas. Cualquier PR que toque otro archivo corre el nivel 1 completo. **Ningún control se salta por la ruta del cambio dentro de un PR de código**, y en particular nunca los de seguridad del job 3.
3. **Los PR en borrador no corren.** El CI se dispara al marcar el PR como listo (`ready_for_review`) y en cada push posterior. Para la evidencia en rojo y en verde de un borrador, el workflow se lanza a mano (`workflow_dispatch`).
4. **Un push nuevo cancela el run anterior del mismo PR** (`concurrency` con `cancel-in-progress`).
5. **Cada job tiene un tope de 10 minutos** (`timeout-minutes`).

**Nomenclatura.** En esta sección, «job 1» a «job 5» numeran **controles**, no jobs de GitHub Actions. Desde esta enmienda, los controles 1, 2 y 5 corren en el job `app`. Los controles 3 y 4 tendrán jobs propios, cuyos nombres fija P0-1.

Los presupuestos de §4 no cambian. El «gate de PR completo» se mide como el job más lento, que hoy es `app`. Las reglas de esta sección siguen intactas: los controles no aplicables se declaran y el contrapositivo vale («P0-1 no mergea sin el job 3»).

### 6. Siete reglas duras

1. **Sembrar estado por base de datos o API, nunca por la interfaz.** Un helper
   tipo `seedCouple()` inserta directo y devuelve el `storageState`. **Cada worker
   siembra su propia pareja aislada**, y de ahí sale la respuesta al paralelismo:
   `workers: 1` es el scaffold por defecto de Playwright, no un mandato, y el
   riesgo real de paralelizar no es el navegador sino la colisión de datos entre
   workers. Se resuelve en la siembra, no bajando los workers. Con parejas
   aisladas, varios workers son seguros; cuántos caben lo mide la especificación
   001.
2. **Un `storageState` por worker y por rol**, no uno solo para toda la suite.
   Cada worker autentica **a Sara y a Tomás sobre su propia pareja**, reutiliza
   esos dos estados dentro del worker y **no los comparte nunca con otro worker**.
   La documentación de Playwright **distingue explícitamente los dos casos** y lo
   hace exactamente sobre este criterio. Cuenta compartida: «This is the
   **recommended** approach for tests **without server-side state**», y su «When
   not to use» dice «Your tests modify server-side state. … In this case, tests
   must use different accounts». Cuenta por worker, bajo el epígrafe «Moderate: one
   account per parallel worker»: «This is the **recommended** approach for tests
   that **modify server-side state**». **Los tests de Juntia mutan estado de
   servidor en casi todos los casos** —anotan gastos, liquidan, aportan a metas,
   aceptan invitaciones—, así que el caso que nos corresponde es el segundo, y la
   sesión única del patrón básico queda descartada por la misma documentación que
   la recomienda para otros proyectos. El mecanismo documentado es un fixture de
   **scope `worker`** que sobreescribe `storageState` y se diferencia con
   `test.info().parallelIndex`. Dos roles porque la pareja es de exactamente dos
   (§15.5) y hay recorridos que necesitan ambas sesiones a la vez: la confirmación
   de fondos ajenos de la spec E2E 4 no se puede montar con una sola.
3. **`prefers-reduced-motion: reduce` por defecto** en el contexto de Playwright:
   es más rápido, es mucho menos frágil frente a los springs y las View
   Transitions, y ejercita de continuo un criterio de aceptación. **Un** test corre
   con motion activo, para los dos momentos L2.
4. **Cero `waitForTimeout`.** Solo aserciones web-first. Se impone con una regla de
   ESLint, no con buena voluntad.
5. **Retries 0 en local, 1 en CI.** Un test que necesita el segundo intento dos
   veces se saca a cuarentena y se arregla.
6. **Un solo navegador en los PRs.** WebKit solo en el nocturno.
7. **Regla de lint que prohíbe colores hex crudos** fuera de `styles/tokens.css`.

### 7. Relación con §10.1 — refinamiento, no contradicción

§10.1 marca la fila **«Visual y motion»** como **bloqueante para cada flujo
insignia**, con «navegadores reales» como herramienta. **Esa decisión sigue
vigente y este ADR no la toca.**

Lo que este ADR precisa es **dónde se ejecuta ese gate: es humano y queda fuera de
CI.** Se cumple con capturas adjuntas al PR, revisadas por los dos fundadores,
según el procedimiento de §10.3 («el responsable visual revisó capturas del
producto funcionando y registró observaciones») y §10.4.

El motivo es simple: automatizar un criterio subjetivo produce falsos positivos, y
la gente aprende muy rápido a ignorar un check que se pone rojo por una sombra de
un píxel. Un gate que se ignora es peor que ningún gate, porque da cobertura.

Las partes **objetivas** de esa fila sí entran en CI y están en la tabla anterior:
axe en 5 rutas × 2 temas (fila 16), `prefers-reduced-motion` (fila 17), snapshots
visuales de las 5 rutas en el nivel 2 y los umbrales de §15.7.

Este refinamiento no releva de nada más. En particular, **ninguna verificación de
seguridad, autorización o atomicidad se pospone** (maestro §15.6, advertencia de
jerarquía): las filas 8 a 13 son bloqueantes de slice y se ejecutan en CI.

### 8. Aceptación por etapas (enmienda del 3 de noviembre, maestro §15.10, decisión 12)

Un slice puede aceptarse con verificaciones de tipo «comprueban lo construido» todavía sin ejecutar **solo** si dependen de un dispositivo o de una infraestructura que aún no existe, y **solo** si se cumplen las tres condiciones:

1. Cada verificación aplazada pasa a ser **criterio de aceptación obligatorio** de un slice posterior concreto, con dueño y momento, y la especificación de ese slice la copia entre sus criterios.
2. Ninguna se presenta como superada: queda «pendiente: motivo» hasta tener salida real (`AGENTS.md` 12).
3. **Nunca se aplaza** una verificación de seguridad, autorización, aislamiento o atomicidad (§7, último párrafo; maestro §15.6). Si una de aislamiento depende de infraestructura, como la superficie interna en un preview real, se ejecuta en cuanto esa infraestructura existe y antes de usarla.

Una verificación de dispositivo que no se puede ejecutar porque el dispositivo no está disponible solo se cierra con una **excepción formal** aprobada por los fundadores. Esa excepción lleva el estado «EXCEPCIÓN APROBADA», el motivo, el riesgo residual, la mitigación, un responsable y una fecha de revalidación.

La primera aplicación de esta regla es la 001. El maestro §15.10, decisión 12, reparte T072–T075 a P0-1 y fija cuáles admiten excepción. Esta regla no mueve ningún umbral de §4 ni de §15.7.

### 9. Sin Docker en los equipos de desarrollo (enmienda del 4 de noviembre de 2026, maestro §15.10, decisión 17)

Supabase local necesita Docker, y Docker Desktop vuelve lento el equipo de los
fundadores. Los fundadores decidieron no usarlo en sus equipos. Los controles no
cambian; cambia **dónde** corre cada uno.

1. **Dos conceptos distintos:**
   - **`verify` local** ejecuta lint, typecheck, dominio y componentes. Las capas
     que necesitan Supabase (SQL/RLS con pgTAP, integración de servidor y E2E)
     aparecen en su resumen como «SOLO EN CI — pendiente de resultado», con el job
     que las ejecuta. Nunca como pasadas, y tampoco como «no aplicable» una vez
     que el control existe (regla 1 del arranque progresivo, §5).
   - **El gate completo del PR** es `verify` más los jobs 3 y 4 de CI, todos
     sobre el **mismo commit**. Un PR de código está verificado solo cuando el gate
     completo pasa.
2. **Esas capas corren en CI, con Supabase local dentro del runner de GitHub.** El
   job 3 (SQL/RLS e integración de servidor) y el job 4 (E2E de humo) levantan
   Supabase con la CLI, aplican las migraciones y ejecutan sus pruebas. **Corren en
   todo PR de código desde que existen, sin filtro de rutas**: la regla «ningún
   control se salta por la ruta del cambio» de §5 sigue intacta. Lo que se
   optimiza es el coste de cada ejecución (caché, concurrencia que cancela runs
   viejos y tiempos medidos), no qué se ejecuta.
3. **Para iterar sobre una rama antes de abrir el PR**, el workflow se lanza a mano
   (`gh workflow run ci.yml --ref <rama>`), también en borradores. Un lanzamiento
   manual ejecuta los mismos jobs que un push: no hay forma de lanzar solo una
   parte para saltarse un control.
4. **Preflight de plan.** Cuando un plan necesita una salida de SQL antes de que
   exista el job 3 (como la viabilidad de `juntia_writer` de la especificación
   002), se ejecuta en un **runner efímero** con un workflow propio sobre una rama
   desechable que nunca se fusiona. La salida se pega en el plan. Ese preflight
   informa el plan; **no sustituye** las verificaciones definitivas del slice.
   Ese workflow se dispara con `on: push` limitado a la rama del preflight, porque
   `workflow_dispatch` solo funciona con workflows que ya existen en `main`.
5. **Para usar la app en desarrollo** hay un segundo proyecto Supabase Free,
   `juntia-dev`, en la cuenta de la segunda fundadora y en la región de
   producción. No guarda datos reales, no comparte claves con producción y no lo
   usa ninguna prueba automatizada, tampoco el preflight. Las migraciones se le
   aplican con la CLI fijada en el plan y con el destino explícito:
   `supabase db push --remote=<ref de juntia-dev>`. Desde la CLI v3, `db push`
   apunta a la base local si no se indica `--remote`. Antes de aplicar, se
   comprueba que el destino es `juntia-dev`. Ningún equipo guarda una configuración
   enlazada a producción.
6. **Recuperación (decisión 16, 16.11).**
   - La copia de producción la hace un fundador con el cliente `pg_dump`, sin
     Docker, siguiendo el procedimiento de copia de Supabase para que no arrastre
     objetos internos que fallen al restaurar.
   - La **prueba de restauración** del procedimiento se hace en un **runner
     efímero de CI**, con datos de prueba y el mismo esquema, nunca con la copia
     real.
   - La **copia real se restaura de verdad** en un PostgreSQL normal instalado en
     el equipo de un fundador, sin Docker. Se comprueban el descifrado, la
     restauración sin errores de los esquemas y datos de Juntia, y los recuentos
     de filas contra producción. Después ese PostgreSQL se apaga o se desinstala.
     Lo que no se puede reproducir en un PostgreSQL normal (los roles y esquemas
     propios de Supabase) queda cubierto por la prueba del procedimiento en CI.
   - Ningún dato real pasa por CI, ni por sus artefactos ni por sus logs.

   El plan de P0-1 define qué esquemas, roles y datos forman una «copia
   completa».
7. **Presupuestos.** El de `verify` (< 90 s) se mide en local sin las capas de base
   de datos. El de `test:db` (< 60 s) se mide dentro del job 3.
8. **Ninguna función, política o migración se da por probada sin la salida del
   job 3 de ese mismo commit** (`AGENTS.md` 12). «Pasa en local» no existe para la
   base de datos.

**Consecuencias.** Iterar sobre la base de datos cuesta minutos y no segundos, y el
consumo de Actions sube en P0-1 y P0-3, que son los slices con más SQL. El PR A de
P0-1 adapta el resumen de `scripts/verify.mjs` y el del CI a «SOLO EN CI —
pendiente de resultado». Si iterar en CI se vuelve el cuello de botella, la
alternativa es Docker con un límite de memoria en el equipo, y se decide
entonces.

## Consecuencias

- La suite de dominio se convierte en el lugar por defecto. Eso exige que la regla
  de dependencia de §7.2 se cumpla de verdad: `domain` no importa React, Supabase
  ni SDK de Vercel. Si se incumple, el dominio deja de ser testeable en
  milisegundos y toda esta estrategia se cae.
- Los **fixtures tipados** que §15.1 asigna a F0-b dejan de ser material de
  maqueta: pasan a ser el dataset dorado de la suite. **No los produce la 001**,
  que no tiene dominio financiero: crecen por slice —P0-1, P0-2, P0-3—, con
  responsable, fase y reglas en el maestro §15.10, «Dataset dorado». (Enmienda del
  3 de noviembre: la versión anterior se los asignaba a la primera especificación
  de ingeniería.)
- Hace falta un `verify` único y rápido. Un agente que implementa no debe tener que
  elegir qué ejecutar. **Su contenido es exactamente uno, y se enuncia igual en los
  dos documentos:** lint + typecheck + unit de dominio + componentes (RTL
  selectivo) + tests SQL/RLS. En CI ese contenido se parte en dos jobs paralelos
  —Vitest por un lado, SQL/RLS por otro— y eso no cambia qué se ejecuta, solo
  dónde. Desde la enmienda de §9, la parte SQL/RLS corre **solo en CI**: `verify`
  local la marca «SOLO EN CI — pendiente de resultado», y el gate completo del PR
  es `verify` más los jobs de CI sobre el mismo commit.
- Hace falta infraestructura de siembra por base de datos (`seedCouple()` y
  equivalentes) **antes** del primer E2E, y con **dos roles autenticados por
  worker**, no uno. Esto es trabajo real de la **primera especificación que
  introduzca autenticación y Supabase** —la de P0-1—, no un detalle: la spec E2E 4
  no se puede escribir sin ello. **La especificación 001 no puede construirla**:
  no tiene auth ni base de datos. (Enmienda del 3 de noviembre: la versión
  anterior se la asignaba a la 001.)
- Correr axe sobre las rutas tocadas en cada PR obliga a que exista un **mapa de
  ruta tocada** —qué rutas afecta un cambio— que hoy no existe. Mientras no lo
  haya, la lectura conservadora es correr axe sobre **todas las rutas ya
  implementadas**, en los dos temas, también en el PR, y medir si cabe; lo barato
  es visitar la ruta, no el recorrido. **Una ruta que aún no existe nunca cuenta
  como verificada:** el fallback es «corremos las que hay», no «damos por buenas
  las cinco», y cada ruta entra en la comprobación con el PR que la crea.
- El tope de 4 a 6 specs hace que la cobertura de UI dependa de la revisión humana
  del PR y de la fila «Componentes · RTL selectivo» de §10.1, que **sigue vigente**
  y corre dentro del job de Vitest como proyecto aparte. Este ADR no la sustituye.
  **Esa capa no lleva presupuesto de tiempo propio:** cabe dentro de los < 90 s de
  `verify`. Es la consecuencia de tomarse en serio las dos palabras del maestro,
  «selectivo» y «en flujos críticos». Una capa de componentes que necesita un
  presupuesto aparte ya dejó de ser selectiva, y eso es señal de que hay un test
  por componente, no cobertura de los flujos críticos.
- Los presupuestos de tiempo son observables, así que hay que medirlos y
  publicarlos en cada run; un presupuesto que nadie mide no es un contrato.
- Un presupuesto que falla el build puede bloquear un PR por motivos de
  infraestructura y no de código. El procedimiento de cuarentena de
  `docs/TESTING.md` es la válvula, y es deliberadamente incómoda.

## Verificación pendiente [V]

Nada de lo siguiente se ha ejecutado. No existe scaffold, no hay `package.json` y
no se instaló ninguna herramienta durante la redacción de este ADR.

1. **Todos los presupuestos de tiempo.** Son objetivos razonados y todavía no
   medidos. Se **empiezan a medir** con la primera suite real de la
   especificación 001, y pasan a ser **contractuales en el hito de §4**: tres de
   las cinco specs E2E y el dominio cubriendo DEC-G04 y balances. Si una medición
   supera un techo, aplica la cláusula anticliquet: el hallazgo es la suite, no
   el techo. (Enmienda del 3 de noviembre: la versión anterior decía que pasaban
   a ser contractuales con la suite de la 001, lo que contradecía el hito.)
2. **Que el gate de PR completo cabe en 6 minutos** medido como job, una vez
   contados el arranque de Supabase en contenedor y
   `npx playwright install --with-deps chromium`.
3. **Cuántos workers caben** con parejas aisladas y dos roles por worker, y si el
   humo de un PR —tres o cuatro specs según el área— entra en 3 minutos de job con
   ese número.
4. **La elección de mecanismo para los tests de RLS** (pregunta abierta 1).
5. **El nombre y la configuración exactos de la regla de lint de hex crudos.** No se
   verificó ninguna implementación concreta.
6. **Que `vitest --changed` sirve para el bucle local** en un repositorio sin
   historial de suite.

## Referencias

### Del repositorio

- `docs/JUNTIA_MASTER.md` §7.1 (stack y fila «CI»), §7.2 (estructura y regla de
  dependencia del dominio), §10.1 (pruebas según riesgo), §10.2, §10.3, §10.4,
  §12.2, §15.1, §15.4, §15.5, §15.6.3, §15.7, §15.9
- `docs/design/HANDOFF_CLAUDE_CODE.md` — tabla de DEC-G04, «Criterios de aceptación
  (solo P0)», «Reglas de negocio de la UI», «Rendimiento»
- `docs/design/COMPONENT_SPECIFICATIONS.md` — datos de referencia de octubre
- `docs/adr/ADR-001-conversion-privado-compartido.md`
- `docs/TESTING.md` — el documento operativo derivado de este ADR

### Documentación oficial consultada el 2 de noviembre de 2026

Se consultó para **verificar nombres exactos de opciones y mecanismos
soportados**, no para elegir el stack, que está congelado en §7.1.

**Vitest — docs en v5.1.0** (https://vitest.dev)

- `vitest related <archivos>`: «Run only tests that cover a list of source files».
  Funciona con imports estáticos, no con `import()` dinámico.
- `--changed [since]`: «Run tests that are affected by the changed files
  (default: `false`)». La documentación escribe el argumento como `[since]`, no
  como `[commit]`, y **no** explica qué acepta; la opción análoga
  `coverage.changed` sí dice «since a specified commit or branch (e.g.
  `origin/main` or `HEAD~1`)».
- Proyectos: **`test.projects`** dentro de `vitest.config.ts`. La documentación dice
  explícitamente: «The `workspace` is deprecated since 3.2 and replaced with the
  `projects` configuration». `vitest.workspace.ts` **no** se usa. Cada proyecto
  lleva `test.name` y `test.environment` (`'node'` para dominio). `extends` está
  activo por defecto desde Vitest 5.0. Se ejecuta uno con `vitest --project <name>`.
- `test.each` / `describe.each` existen, con tabla de arrays, de objetos o
  plantilla etiquetada. También existen `test.for` / `describe.for`.

**Playwright — versión verbatim más alta vista en las páginas: v1.64.1**
(https://playwright.dev). Las páginas consultadas no muestran una etiqueta
«Version: 1.xx» explícita; v1.64.1 aparece en el tag del contenedor
`mcr.microsoft.com/playwright:v1.64.1-noble` y «Added in: v1.64» en `TestOptions`.

- Autenticación una sola vez: la documentación recomienda el **proyecto `setup` con
  `dependencies`**, no `globalSetup`. Texto literal: «This is the recommended
  approach, as it integrates better with the Playwright test runner». Claves:
  `projects`, `name`, `testMatch: /.*\.setup\.ts/`, `dependencies: ['setup']`,
  `use: { storageState: 'playwright/.auth/user.json' }`, `testProject.teardown`. El
  test de setup guarda con `await page.context().storageState({ path: authFile })`.
  `globalSetup` se documenta como «Option 2», con la advertencia «Beware that
  `globalSetup` and `globalTeardown` lack some features».
- **Cuenta compartida frente a cuenta por worker.** La página de autenticación
  separa «Basic: shared account in all tests» de «Moderate: one account per
  parallel worker», y el criterio que las separa es la mutación de estado de
  servidor. Compartida: «the **recommended** approach for tests **without
  server-side state**», y «When not to use: Your tests modify server-side state. …
  In this case, tests must use different accounts». Por worker: «the
  **recommended** approach for tests that **modify server-side state**». El
  mecanismo del ejemplo es un fixture de scope `worker` que sobreescribe
  `storageState`, diferenciado con `test.info().parallelIndex` y guardado en
  `<outputDir>/.auth/<parallelIndex>.json`. La documentación **no exige** que las
  cuentas estén pre-creadas: sus comentarios admiten crearlas («Acquire a unique
  account, for example create a new one») o tomarlas de una lista existente.
- `fullyParallel`: existe en `testConfig` y en `testProject`. Por defecto «test
  files are run in parallel; tests in a single file are run in order, in the same
  worker process». **El valor por defecto de `fullyParallel` no está indicado** en
  las páginas leídas.
- Sharding: `npx playwright test --shard=x/y`; reporter `'blob'`; mezcla con
  `npx playwright merge-reports --reporter html ./all-blob-reports`.
- **`reducedMotion` confirmado.** Es una propiedad de `TestOptions`, «Added in:
  v1.50». Texto literal: «Emulates `'prefers-reduced-motion'` media feature,
  supported values are `'reduce'`, `'no-preference'`. … Passing `null` resets
  emulation to system defaults. Defaults to `'no-preference'`». Tipo:
  `null | "reduce" | "no-preference"`. Se fija en `use: { reducedMotion: 'reduce' }`
  en `testConfig.use` o `testProject.use`, y se sobreescribe con `test.use()`.
- Aserciones web-first: «web-specific async matchers that will wait until the
  expected condition is met»; timeout por defecto de 5 segundos. La guía de buenas
  prácticas contrapone `await expect(...).toBeVisible()` a
  `expect(await ....isVisible()).toBe(true)`.
- **Advertencia honesta:** las páginas oficiales de Playwright **no mencionan
  `waitForTimeout` ni prohíben las esperas fijas**, y **no recomiendan
  `eslint-plugin-playwright`**. Solo recomiendan ESLint con
  `@typescript-eslint/no-floating-promises`. La regla `playwright/no-wait-for-timeout`
  existe en el plugin **mantenido por la comunidad**
  (`playwright-community/eslint-plugin-playwright`), donde figura en la
  configuración `recommended`. No se verificó su versión ni se instaló. La regla
  dura nº 4 sigue siendo nuestra, no una recomendación oficial.
- CI: `npx playwright install --with-deps`, o `npx playwright install chromium
  --with-deps` para un solo navegador. **Caché de navegadores:** texto literal de la
  página de CI: «Caching browser binaries is not recommended, since the amount of
  time it takes to restore the cache is comparable to the time it takes to download
  the binaries». Es decir, **cachear navegadores está desaconsejado por la
  documentación oficial** — no que sea imposible ni que falte el mecanismo: la
  misma página explica cómo hacerlo si aun así se decide, cacheando esos
  directorios «against a hash of the Playwright version». Lo que no existe es una
  acción oficial recomendada para ello.
  La misma página recomienda `workers: process.env.CI ? 1 : undefined`, que es el
  scaffold por defecto y no un mandato (ver regla dura nº 1).

**Supabase CLI** (https://supabase.com/docs). Ninguna página consultada indica una
versión concreta del CLI.

- Mecanismo documentado principal: **pgTAP**. «pgTAP is a unit testing framework for
  Postgres». Comandos: `supabase test new <name> -t pgtap` y `supabase test db`,
  que «Runs `pg_prove` in a container with unit test files volume mounted from
  `supabase/tests` directory». Cada test corre en su propia transacción y se hace
  rollback. Flags de `supabase test db`: `--db-url`, `--linked`, `--local`.
- Segundo mecanismo documentado: **tests a nivel de aplicación** con
  `@supabase/supabase-js`, y el ejemplo oficial de la página de RLS **usa Vitest**.
  Las claves se obtienen con `supabase status -o env`, que imprime `API_URL`,
  `PUBLISHABLE_KEY` y `SECRET_KEY`.
- Tercer mecanismo documentado: **helpers de la comunidad**
  (`basejump-supabase_test_helpers`) instalados vía `dbdev`. La documentación los
  llama explícitamente «community-maintained». Exponen
  `tests.create_supabase_user()`, `tests.authenticate_as()`,
  `tests.get_supabase_uid()`, `tests.rls_enabled()`,
  `tests.authenticate_as_service_role()`, `tests.clear_authentication()`,
  `tests.freeze_time()`, `tests.unfreeze_time()`.
- RLS en SQL plano, sin dependencias: el ejemplo oficial usa
  `set local role authenticated;` y `set local request.jwt.claim.sub = '<uuid>';`.
  **Inconsistencia documentada:** la página de overview usa en cambio
  `set local "request.jwt.claims"`. La documentación no reconcilia ambas formas.
- CI documentado por Supabase: workflow `.github/workflows/db-tests.yml` con
  `uses: supabase/setup-cli@v1`, `run: supabase start`, `run: supabase test db`.
  **El snippet oficial no incluye `supabase db reset`**, aunque su propia sección de
  troubleshooting dice «Ensure database migrations are run before tests».
- La página de RLS recomienda además una técnica que adoptamos: «Break each policy
  and watch the suite fail» (añadir temporalmente `using (true)` para comprobar que
  el test realmente falla).

**Acciones de CI** (README oficiales)

- `actions/setup-node`: major actual **v7**. Input `cache` con valores `npm`,
  `yarn`, `pnpm`, e input `cache-dependency-path`. El README dice explícitamente:
  «The action does not cache `node_modules`»; cachea los datos globales del gestor
  de paquetes. El caché de npm se activa solo si `package.json` declara
  `packageManager` o `devEngines.packageManager`.
- `actions/cache`: major actual **v6**. Su README conserva un aviso de obsolescencia
  **caducado** («upgrading to version `v4` or `v3` … before February 1st, 2025»);
  no indica una fecha de retirada vigente para v1/v2/v3.
- `supabase/setup-cli`: major actual **v3**. El README dice: «`supabase/setup-cli@v1`
  and `@v2` are legacy and only receive compatibility fixes». Input único:
  `version`. **Nota:** la documentación de Supabase sigue mostrando `@v1` en su
  ejemplo de CI, lo que contradice al README de la propia acción; usar **v3**.
- La página de CI de Playwright usa en su ejemplo `actions/setup-node@v6`, una
  versión por detrás del major actual.

## Preguntas abiertas

### 1. Mecanismo para los tests de RLS — **cerrada: pgTAP en SQL plano**

**Cerrada por los fundadores el 3 de noviembre de 2026** (maestro §15.10, decisión 1): se adopta la recomendación, **pgTAP en SQL plano**, con sus dos condiciones —verificar qué forma del claim usa la versión de Supabase del stack antes de escribir el primer test, y una prueba de extremo a extremo con el cliente real cuando se implemente RLS—. Se conserva el análisis que llevó a la decisión:

| Opción | Qué es | A favor | En contra |
| --- | --- | --- | --- |
| **A. pgTAP en SQL plano** | `supabase test new -t pgtap` + `supabase test db`, cambiando de identidad con `set local role authenticated` y `set local request.jwt.claim.sub` | Cero dependencias fuera del CLI. CI de dos líneas. Rollback por test. Lo más rápido para el presupuesto de < 60 s | Más código repetido por test. La documentación usa dos formas distintas del claim (`request.jwt.claim.sub` vs `"request.jwt.claims"`) y no las reconcilia |
| **B. pgTAP + `basejump-supabase_test_helpers`** | Lo anterior más los helpers instalados vía `dbdev` | `tests.authenticate_as()` y `tests.create_supabase_user()` quitan mucho ruido. `tests.rls_enabled()` es un check directo | Dependencia **mantenida por la comunidad**, fuera del stack congelado de §7.1. Instalar `dbdev` añade un paso al arranque de CI y, por tanto, tiempo al presupuesto |
| **C. Tests de aplicación con `supabase-js` + Vitest** | Dos clientes (publishable / secret) golpeando la API local | Prueba la ruta real que usa la app, PostgREST incluido. Se escribe en TypeScript, como el resto | Más lento que SQL. Prueba la API además de la política, así que un fallo es más ambiguo. Cabe peor en < 60 s |

**Recomendación: empezar con A, y pasar a B solo si la repetición resulta
intolerable en la práctica.** El motivo es el presupuesto y el principio rector
aplicado una capa más abajo: A prueba exactamente la política y nada más, no añade
dependencias al stack congelado ni pasos al arranque de CI, y los tres o cuatro
helpers que echaríamos de menos caben en un `.sql` propio de veinte líneas que
podemos leer y mantener. C queda reservado para el caso en que haga falta verificar
que PostgREST no amplía lo que la política permite; sería un par de tests, no la
suite.

**La revisión independiente acepta la opción A como propuesta para los fundadores**,
con dos condiciones que forman parte de la recomendación y no son opcionales:

1. **Validar el claim ejecutándolo.** Hay que resolver cuál de las dos formas usa
   nuestra versión del stack —`set local request.jwt.claim.sub` (página de RLS) o
   `set local "request.jwt.claims"` (página de overview)—, porque la documentación
   de Supabase usa ambas y no las reconcilia. Un test de RLS que fija un claim que
   el stack ignora **pasa igual**, y entonces la suite afirma una seguridad que no
   existe. Es el peor fallo posible en esta capa, porque es silencioso.
2. **Una prueba de extremo a extremo con el cliente real** cuando se implemente la
   RLS: al menos un caso que compruebe, a través de `supabase-js` y no solo en SQL,
   que la política se aplica por la ruta que usa la aplicación. SQL prueba la
   política; esa prueba comprueba que PostgREST no amplía lo que la política
   permite. No es la suite, son uno o dos casos.

La decisión sigue siendo de los fundadores.

### 2. Herramienta para la regla de lint de colores hex crudos

Está decidida como regla (nº 7); no está decidida su implementación. No se verificó
ninguna. Candidatos razonables: `no-restricted-syntax` de ESLint sobre literales de
plantilla, o Stylelint con `color-no-hex` limitado a todo menos `styles/tokens.css`.
Lo resuelve la especificación 001 al crear el scaffold.

## Preguntas cerradas por el gestor

Se registran aquí, ya resueltas, para que no se reabran por costumbre. El detalle
vive en la parte de la «Decisión» que cada una toca; esta tabla es solo el índice.

**Es un índice, así que se actualiza cuando cambia lo que indexa.** Varias de estas
resoluciones fueron refinadas por las rondas de revisión posteriores, y la columna
dice el **estado vigente**, no el de la ronda en que cada una se cerró. Quien
cambie una decisión de la sección «Decisión» revisa esta tabla en el mismo commit:
un índice que describe mal lo que indexa hace justo el daño que venía a evitar.

| Pregunta | Resolución vigente | Dónde está escrita |
| --- | --- | --- |
| ¿Cómo se reparten el tope de 4–6 specs y las cuatro familias de §10.1? | Cinco specs nombradas: acceso y Mi cuenta · anotar cronometrado (US-12) · pareja 50/50 y liquidación · meta con aportes y uso · presupuesto on/off. **Un PR corre las specs E2E 1, 2 y 3 más la spec E2E del área que toca**, según la columna «Área que cubre»; el nocturno corre siempre las cinco. **Mientras una spec aún no exista, se corren todas las aplicables que ya existan, y ninguna funcionalidad mergea sin añadir y ejecutar su E2E** | Decisión §3, «Qué specs corre un PR» y «Arranque progresivo» |
| ¿El presupuesto del humo mide el job o solo los tests? | El **job** completo — y solo los presupuestos de job: los de comando (`verify`, dominio, SQL/RLS) miden la ejecución sin `npm ci`, en **tabla aparte**. Mitigación: instalar solo Chromium. Cachear navegadores está **desaconsejado** por la documentación oficial de Playwright; el mecanismo existe, la recomendación a favor no | Decisión §4, las dos tablas |
| ¿Se acepta `workers: 1` en CI? | No como dado: es el scaffold por defecto de Playwright. El riesgo real es la colisión de datos entre workers, y se resuelve en la siembra — **una pareja aislada por worker y un `storageState` por worker y por rol**, que es lo que la documentación de Playwright recomienda cuando los tests mutan estado de servidor | Decisión §6, reglas 1 **y 2** |
| ¿Qué presupuesto de tiempo lleva la capa RTL de §10.1? | Ninguno propio: corre dentro del job de Vitest y cabe en los < 90 s de `verify`, que **la incluye en su definición**, «selectivo» y «en flujos críticos» | Consecuencias; definición de `verify` en Decisión §4 |
