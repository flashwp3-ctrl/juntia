# Diagnóstico: «rectángulos distintos del aviso» en axe con sesión — 005, F111-12

**Qué es.** El diagnóstico que pidió la revisión adversarial del PR #111 (ronda 2, F111-12) sobre los fallos intermitentes de
`tests/a11y/routes.a11y.ts` en `npm run e2e:dev`. **No corrige nada**: ni el producto ni el arnés, sin `skip` ni más
tolerancia. Termina con una propuesta para que los fundadores decidan si la autorizan, en un PR aparte. Es iteración
contra `juntia-dev`, no evidencia de CI.

## El fallo

- **Dónde:** el bloque de producto de `routes.a11y.ts` (l.312–319). Abre Anotar con su disparador visible
  (`annotateFrames`, l.67–86), guarda en cada cuadro (`requestAnimationFrame`) el rectángulo del diálogo o de la hoja y
  exige un único rectángulo en 10 cuadros (`new Set(notice.rects).size === 1`). No falla AxeBuilder, sino esta aserción
  geométrica.
- **Cuándo:** en `e2e:dev` completo, con 8 workers. En la ronda 1, `/ · Inicio con datos · dark · 390px`; con el código de
  `main` falló igual (esa vez en claro). En la ronda 2, `/actividad` (con datos y mes vacío), `/metas` y `/balance`, en
  claro a 390. Aisladas pasan a veces y fallan otras.
- **Lo que precede en la prueba:** justo antes, `knobFrames` (l.51–65) pulsa «Nosotros», registra la perilla durante 10
  cuadros y **vuelve a pulsar «Yo»** sin esperar a que el cambio de contexto termine. Después se abre Anotar.

## Reproducción

Arnés `tests/evidence/f111-12.capture.ts`. Corre con `F111_12=1 npm run e2e:dev -- tests/evidence/f111-12.capture.ts`.

- **Qué mide:** la misma medición de `annotateFrames`, 12 veces por ruta (`/`, `/actividad`, `/metas` y `/balance`), a 390,
  en claro y con movimiento reducido, con un usuario sembrado con movimientos del mes. Por cada serie registra la ruta, el
  cuadro en que aparece la hoja, los 10 rectángulos (`top/left/width/height`) y qué componente cambió. Guarda un trace por
  ruta.
- **Variables:**
  - `F111_12_CPU`: ralentización de CPU por CDP, para simular la carga de 8 workers.
  - `F111_12_KNOB=1`: antes de medir hace lo mismo que `knobFrames` («Nosotros» 10 cuadros y vuelta a «Yo»). *(Histórico: variables del arnés en el PR #111. El arnés vigente usa `F111_12_ORDER`, `F111_12_CPU` y `F111_12_COUPLE`; ver «PR aparte de F111-12».)*
  - `F111_12_LABEL`: el nombre de la corrida.
- **Candidato:** la rama del PR #111. **`main`:** los mismos archivos de `src/` que `main` (`git checkout main -- src`),
  con el mismo arnés.

| Código | CPU | Paso de `knobFrames` | Series | Con más de un rectángulo | Por ruta (`/`, `/actividad`, `/metas`, `/balance`) |
| --- | ---: | --- | ---: | ---: | --- |
| candidato | 1× | no | 48 | **0** | 0 · 0 · 0 · 0 |
| candidato | 6× | no | 48 | **0** | 0 · 0 · 0 · 0 |
| `main` | 1× | no | 48 | **0** | 0 · 0 · 0 · 0 |
| `main` | 6× | no | 48 | **0** | 0 · 0 · 0 · 0 |
| candidato | 1× | sí | 48 | **28** | 11 · 6 · 1 · 10 |
| candidato | 6× | sí | 48 | **29** | 8 · 3 · 8 · 10 |
| `main` | 1× | sí | 48 | **26** | 10 · 5 · 2 · 9 |
| `main` | 6× | sí | 48 | **30** | 7 · 6 · 7 · 10 |

**En todas las series con más de un rectángulo, el cambio es el mismo:** `142.41/0.00/390.00/701.59` →
`142.00/0.00/390.00/702.00`. Solo cambian `top` y `height`, en **0,41 px**, a mitad de la serie, y una vez. Ejemplo,
`/balance`, candidato, CPU 6×, serie 2: cinco cuadros con 701,59 y cinco con 702,00. Sin el paso previo, la hoja se queda
en 701,59 los 10 cuadros.

**Qué significa que una corrida «pase» (F111-17).** Las 8 corridas de `f111-12.capture.ts` terminaron y escribieron sus series. Eso dice que la instrumentación funcionó, **no** que se cumpla la aserción del gate: el arnés mide y no exige un único rectángulo.

## Clasificación

- **No lo causa el PR #111.** Se reproduce igual con `src/` de `main` (26 y 30 de 48) y con el candidato (28 y 29 de 48).
- **No es carga de CPU.** Sin el paso previo, 0 de 192 series con y sin ralentizar; con él, casi la mitad, también a 1×.
- **Lo dispara el propio orden del arnés.** La hoja se abre mientras el cambio de contexto que dejó `knobFrames` todavía se
  está aplicando. Cuando termina dentro de la ventana de 10 cuadros, la hoja se vuelve a pintar y se mueve 0,41 px.
- **Y hay un efecto real del producto, mínimo:** la hoja sí cambia de rectángulo, aunque menos de medio píxel y sin
  animación. No es un salto perceptible ni un movimiento con movimiento reducido. Pero existe: una aserción estricta lo ve.

**Hipótesis del mecanismo, no demostrada (F111-16).** `BottomSheet` (`src/components/ui/bottom-sheet.tsx`, l.128–142, `holdKey`)
fija en un `useLayoutEffect` sin dependencias, en cada render, `minHeight = min(${offsetHeight}px, max)`. `offsetHeight`
redondea a entero: el alto natural es 701,59 y el mínimo queda en 702, así que la hoja anclada abajo sube su borde
0,41 px. Si no hay un render posterior dentro de la ventana, no se ve. El cambio de contexto provoca ese render. Coincide
con las cifras (701,59 → 702,00, entero), pero no se instrumentó el efecto: confirmarlo es parte de la propuesta.

> **Nota histórica de la ronda 1 del PR #116 (26 nov 2026), superada (F116-6).** Decía que el mecanismo «quedaba confirmado por medición». La ronda 2 lo precisa: lo **medido** es que todos los saltos caen en el cuadro en que cambia `min-height`; que lo haga `holdKey` con `offsetHeight` es una **inferencia** por lectura del código. Ver «PR aparte de F111-12», «Instrumentación de `BottomSheet`».

**Lo que no está demostrado (F111-16).** Dos cosas quedan como hipótesis:

- el mecanismo de `offsetHeight`;
- que esperar a que termine el cambio de contexto antes de abrir Anotar elimine el fallo.

Ninguna se ha probado: el arnés no instrumentó el efecto de `BottomSheet` ni corrió una variante con esa espera. Lo demostrado es la correlación con el paso de `knobFrames` y que `main` y el candidato dan lo mismo.

> **Nota histórica de la ronda 1 del PR #116 (26 nov 2026), superada (F116-6).** Decía que el mecanismo «quedaba confirmado» y que las «0 de 192» series eran de la secuencia nueva. Esa secuencia era la espera por red (con `F111_12_KNOB` y `F111_12_WAIT`), que la revisión descartó (F116-1 y F116-2) y ya no existe. La ronda 2 cambia el orden de la prueba y el arnés usa `F111_12_ORDER`. Lo vigente está en «PR aparte de F111-12».

**En resumen:** la causa parece mixta. El arnés mide un estado de transición que crea él mismo, y el producto tiene un ajuste
subpíxel al volver a pintarse. No es un defecto de C-1 a C-7, ni una regresión.

## Propuesta para los fundadores (PR aparte, si la autorizan)

1. **Arnés (recomendado; que elimine el fallo es una hipótesis no demostrada, F111-16).** En `routes.a11y.ts`, después de `knobFrames`, esperar a que el cambio de vuelta a «Yo» termine
   antes de abrir Anotar (por ejemplo, con una aserción web-first sobre el contexto ya aplicado), sin tocar la tolerancia
   ni la aserción. Así se mide el estado estable que la prueba quiere vigilar. Es un cambio de pruebas, pero toca una
   prueba del gate: necesita autorización.
2. **Producto (opcional, a valorar).** En `BottomSheet`, medir el alto con un valor fraccionario
   (`getBoundingClientRect().height`) en vez de `offsetHeight`, o redondear igual en los dos lados, para que volver a
   pintarse no mueva la hoja. Antes, instrumentar el efecto para confirmar la hipótesis. Toca un componente de producto y
   está fuera de la excepción de la decisión 30.2: necesita autorización expresa.
3. **Mientras tanto,** el paso 4 (CI sobre el candidato) dirá si el fallo aparece en el runner. Si aparece, es este mismo
   caso: no lo introduce el PR #111.

## PR aparte de F111-12: instrumentación y aislamiento (26 de noviembre de 2026)

**Autorización.** Los fundadores la dieron el 26 nov 2026 y está registrada en el maestro, decisión 30, «Ampliación de la
excepción de 30.2: F111-12». Cubre dos cosas: aislar la prueba geométrica sin rebajar el criterio e instrumentar
`BottomSheet` sin cambiar el producto. **No se cambió ningún archivo de producto.**

### Instrumentación de `BottomSheet` (sin cambiar el producto)

El arnés `tests/evidence/f111-12.capture.ts` muestrea, en cada cuadro del aviso (`requestAnimationFrame`) y junto al
rectángulo de la hoja, tres datos del área con scroll de la hoja (el `body` de `BottomSheet`, la que fija `holdKey`):

- `style.minHeight`;
- `offsetHeight`;
- el alto fraccionario (`getBoundingClientRect().height`).

Un `MutationObserver` sobre el atributo `style` anota además en qué cuadro cambia `minHeight`.

**Qué se demostró (medido, F116-4).** Con el orden antiguo de la prueba, todas las series con salto lo tienen en el mismo cuadro
en que cambia `minHeight`. Ese cambio no aparece nunca sin salto.

| Corrida | Series con salto | Saltos en el cuadro en que cambia `minHeight` | `minHeight` sin salto |
| --- | ---: | ---: | ---: |
| `main` 6×, orden antiguo (vuelta a «Yo» en un `evaluate` aparte; variante de la ronda 1) | 37 de 48 | 37 de 37 | 0 |
| `main` 6×, orden antiguo exacto, sin pareja (ronda 2) | 8 de 48 | 8 de 8 | 0 |
| `main` 6×, orden antiguo exacto, con pareja (ronda 2) | 4 de 48 | 4 de 4 | 0 |

Los valores también son medidos:

- **Antes del salto:** alto del área **673,59** y `offsetHeight` **674**; `minHeight` vacío al abrir la hoja.
- **En el cuadro del salto:** `minHeight` pasa a `min(674px, 100dvh - 96px)`, el área a 674,00 y la hoja de 701,59 a 702,00
  (**+0,41 px**), con el borde superior de 142,41 a 142,00.
- **Con pareja:** 44 de 48 series tienen el alto inicial fraccionario.

**Qué se infirió, sin instrumentarlo (F116-4):**

- **Que quien fija `minHeight` es el `useLayoutEffect` de `holdKey`.** Se apoya en la lectura del código (`bottom-sheet.tsx`,
  l.128–142: `minHeight = min(${offsetHeight}px, max)`) y en que el valor observado tiene exactamente esa forma. No se
  instrumentaron el efecto ni los commits de React.
- **Que el 674 es el redondeo de 673,59 que hace `offsetHeight`.** Lo dice la especificación de `offsetHeight` (entero) y
  coincide con lo medido, pero no se aisló.
- **Por qué `minHeight` no se fija al abrir.** El área vive en un Portal de Radix, que se monta en un commit posterior;
  mientras `body.current` es `null`, el efecto sale sin hacer nada, y no vuelve a correr hasta otro render de `BottomSheet`.
  Es lectura del código.

**Conclusión.** La medición correlaciona sin excepción el salto de 0,41 px con el cambio de `minHeight` que hace la hoja; la
atribución a `holdKey` y al redondeo de `offsetHeight` es la explicación coherente con el código. **No se corrige aquí.** La
revisión adversarial y los fundadores la dejan para más adelante, con medición fraccionaria y autorización aparte.

### Aislamiento de la prueba (sin rebajar el criterio)

**Ronda 1 de la revisión del PR #116 (NO-GO).** La primera versión movía la vuelta a «Yo» fuera de `knobFrames` y esperaba a
que el contexto se asentara siguiendo las peticiones RSC. La revisión la rechazó por dos motivos:

- **F116-1:** `/cuenta` a 1440 tiene el selector visible pero no monta `ContextView`, así que no hay un refresco contextual
  garantizado ni `[data-context-view]`, y la espera podía no cumplirse.
- **F116-2:** el seguimiento de red contaba como asentamiento una petición fallida o incidental, no comprobaba el HTTP ni que
  React hubiera aplicado los datos, y no tenía una señal fiable para usuarios sin pareja.

**Cambio de la ronda 2: el orden, sin esperas de red.** En `tests/a11y/routes.a11y.ts`, dentro del bloque de rutas de producto:

1. **Primero, el aviso de Anotar**, con la página en reposo: después de la carga, axe, la geometría y el foco, como antes.
   `annotateFrames` y sus dos aserciones no cambian.
2. **Después, la perilla**, con `knobFrames` **sin cambios**: pulsa «Nosotros», mide 10 cuadros y pulsa «Yo» dentro del
   callback del 10.º cuadro, en el mismo `evaluate`. Su aserción no cambia.
3. **Una comprobación nueva:** la vuelta a «Yo» quedó aplicada, con
   `[data-context-selector] [role="radio"][data-value="me"]:visible` y `aria-checked="true"`. Es una señal de presentación que
   ya existe y vale también en `/cuenta`, que no monta `ContextView`.

Desaparecen `trackRsc`, `settleContext` y `backToMe`: **no hay esperas de red ni heurísticas**, y la prueba no depende de
`ContextView`, de la pareja ni de las cookies.

**Por qué es legítimo y no rebaja el criterio:**

- Las dos mediciones (perilla y aviso), sus 10 cuadros y sus aserciones (`new Set(…).size === 1`) son las mismas. No se
  descarta ninguna medición, no hay tolerancia, `skip` ni reintentos, y **no se aumentan los timeouts del gate** (F116-7).
- Solo cambia el orden: el aviso se mide en el estado base, como pide el comentario de la propia prueba («los momentos de
  motion de las rutas de producto se miden en su estado base»). Antes, la prueba medía el aviso en mitad de una transición
  que provocaba ella misma.
- Tras el aviso, a una ruta de producto no le queda ninguna comprobación que dependa del contexto. El bloque siguiente solo
  corre en la superficie interna, que no es de producto. Que la perilla vaya la última no deja nada midiendo una transición en
  curso.
- La prueba sigue detectando un salto que el producto haga con la página en reposo. El salto de `holdKey` solo aparece si la
  hoja se vuelve a pintar dentro de la ventana; con el orden antiguo exacto, el arnés lo sigue viendo (8 y 4 de 48, arriba).

### Evidencia, antes y después (ronda 2)

**El arnés** reproduce la prueba con fidelidad: cada repetición vuelve a cargar la ruta (como cada caso de la prueba), espera
al selector hidratado (como la prueba) y usa el mismo `knobFrames` y la misma medición del aviso. Tiene dos órdenes:

- **antiguo exacto:** la vuelta a «Yo» dentro del 10.º cuadro, en el mismo `evaluate` (F116-3), y el aviso justo después;
- **nuevo:** el aviso primero y la perilla después.

Las corridas son de 12 series por ruta (`/`, `/actividad`, `/metas` y `/balance`), a 390, en claro y con movimiento reducido.
El código de producto es `main` en `bab833a`, que ya incluye el PR #111.

| Orden | CPU | Usuario | Series | Con más de un rectángulo |
| --- | ---: | --- | ---: | ---: |
| antiguo exacto | 6× | sin pareja | 48 | **8** (`/` 4 · `/actividad` 1 · `/metas` 2 · `/balance` 1) |
| antiguo exacto | 6× | con pareja | 48 | **4** (`/` 1 · `/actividad` 2 · `/metas` 0 · `/balance` 1) |
| nuevo | 1× | sin pareja | 48 | **0** |
| nuevo | 6× | sin pareja | 48 | **0** |
| nuevo | 6× | con pareja | 48 | **0** |

En el orden nuevo, la comprobación de «Yo» se cumplió en las 144 repeticiones.

**Corridas históricas, con el código de cada una (F116-5).** No se mezclan con la tabla anterior:

- **Diagnóstico del PR #111.** Arnés sin recarga por repetición y orden antiguo en dos `evaluate` (una variante, no el orden
  exacto). Con `src/` de `main` en `3c7c277` y con el candidato `80f8712`: 26–30 de 48 con el paso de la perilla y 0 de 192 sin
  él.
- **Ronda 1 del PR #116 (base `c44c39f`).**
  - Instrumentación con la misma variante: 37 de 48 (`main`, 6×).
  - La versión con esperas de red, ya retirada: 0 de 192 en `main` y en `80f8712`.
  - Iteraciones descartadas de aquella espera: una se colgaba, otra tenía una expresión regular rota y otra pulsaba antes de
    hidratar.

**Límites del arnés (F116-7).**

- **Timeout.** El arnés es opt-in y no forma parte del gate. Su `test.setTimeout` pasa de 15 a 20 min porque recarga la ruta en cada repetición. Ningún timeout del gate aumenta.
- **Contexto del navegador.** El arnés reutiliza el mismo contexto entre repeticiones: recargar la ruta **no equivale** a un contexto nuevo con cookies y almacenamiento limpios, que es lo que tiene cada caso de la suite.

**Qué significa que una corrida del arnés «pase» (F111-17).** Que terminó y escribió sus series. Las cifras son lo medido, no
una prueba del gate. La prueba del gate es la suite axe.

### Suite axe y barrido a 1440 (contra juntia-dev; iteración, no CI)

**Barrido a 1440 en local (ronda 2).**

- **Comando:** `A11Y_LEVEL=sweep npm run e2e:dev -- --project a11y --grep " (/|/actividad|/metas|/plan|/balance|/cuenta) · [^·]+ · (light|dark) · 1440px"`. `A11Y_LEVEL=sweep` incluye fuera de CI los casos `@sweep` de las rutas de producto a 1440, en los dos temas: 50 casos.
- **Resultado:** 48/50.
  - **`/cuenta · C1` a 1440:** pasa en claro y en oscuro, con aviso en diálogo de 1 rectángulo en 10 cuadros, perilla en 1 posición y la comprobación de «Yo» cumplida.
  - **Todas las rutas de producto:** aviso en 1 rectángulo y perilla en 1 posición en los 26 casos en que se miden.
  - **Los 2 fallos:** `/actividad · Actividad con datos extremos`, en claro y en oscuro. Falla el ancho del documento: la tabla «Movimientos del mes» llega a 1511 px, frente a un ancho de 1440, y lo señala `assertLayout`, que corre antes del bloque que cambia este PR. Con `routes.a11y.ts` de la base (`bab833a`) fallan igual (1511 px). **Es un defecto previo**, ajeno a F111-12 y fuera del alcance de este PR; queda reportado al gestor.

**Suite axe a 390 (`npm run e2e:dev -- --project a11y`), ronda 2.**

- **Resultado:** 125/125 en 6,3 min, con 8 workers. Los 24 avisos dan 1 rectángulo y las 24 perillas, 1 posición.
- **Antes del cambio** (`origin/main`, ronda 1): también 125/125. Como el fallo es intermitente, **la suite sola no demuestra el arreglo**; la evidencia de la causa y del arreglo es la del arnés.
- **El CI del paso 4 es el que cuenta.**


## Lo que no se conserva en el repositorio

Los traces de Playwright (`test-results/f111-12/*.zip`) llevan las cookies de sesión de las cuentas sembradas. Se quedan
en local y no se suben. Los registros por serie (JSON) quedan en el log de cada corrida y se resumen en la tabla.
