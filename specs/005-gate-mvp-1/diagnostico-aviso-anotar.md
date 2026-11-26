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
  - `F111_12_KNOB=1`: antes de medir hace lo mismo que `knobFrames` («Nosotros» 10 cuadros y vuelta a «Yo»).
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

> **Actualización del 26 nov 2026.** Instrumentado en el PR aparte: el mecanismo **queda confirmado por medición** (37 de 37 saltos en el cuadro en que `holdKey` fija `min-height` con `offsetHeight` 674 sobre un alto de 673,59). Ver «PR aparte de F111-12».

**Lo que no está demostrado (F111-16).** Dos cosas quedan como hipótesis:

- el mecanismo de `offsetHeight`;
- que esperar a que termine el cambio de contexto antes de abrir Anotar elimine el fallo.

Ninguna se ha probado: el arnés no instrumentó el efecto de `BottomSheet` ni corrió una variante con esa espera. Lo demostrado es la correlación con el paso de `knobFrames` y que `main` y el candidato dan lo mismo.

> **Actualización del 26 nov 2026.** Las dos se midieron en el PR aparte. El mecanismo queda confirmado. Con la secuencia nueva, las series con más de un rectángulo son 0 de 192 en el arnés (`main` y candidato, CPU 1× y 6×). Ver «PR aparte de F111-12».

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

El arnés `tests/evidence/f111-12.capture.ts` registra en cada cuadro, junto al rectángulo de la hoja, tres datos del área
con scroll de la hoja (el `body` de `BottomSheet`, la que fija `holdKey`): `style.minHeight`, `offsetHeight` y el alto
fraccionario (`getBoundingClientRect().height`). Además, con un `MutationObserver`, anota en qué cuadro cambia `minHeight`.

**Resultado** (`main`, CPU 6×, con el orden antiguo de la prueba —vuelta a «Yo» inmediata—, 48 series):

| Medida | Resultado |
| --- | --- |
| Series con más de un rectángulo | 37 de 48 |
| Saltos que ocurren en el mismo cuadro en que se fija `minHeight` | **37 de 37** |
| Cuadros en que se fija `minHeight` sin salto | **0** |
| Alto inicial del área fraccionario, con `offsetHeight` redondeado | 48 de 48: alto **673,59**, `offsetHeight` **674** |
| Valor fijado | `min(674px, 100dvh - 96px)` |
| Efecto | el área pasa de 673,59 a 674,00 y la hoja de 701,59 a 702,00: **+0,41 px**, con el borde superior de 142,41 a 142,00 |
| `minHeight` al abrir la hoja | vacío en todas las series; se fija en un cuadro posterior (el 6.º o 7.º en los ejemplos) |

**Conclusión: el mecanismo queda confirmado por medición.** El salto de 0,41 px es `holdKey`, que fija `minHeight` con
`offsetHeight`, un entero redondeado (674) de un alto fraccionario (673,59). Ocurre cuando ese efecto corre por primera vez con
la hoja ya montada, en un render de `BottomSheet` posterior a abrirla.

**Lo que no está instrumentado (lectura del código).** Por qué `minHeight` no se fija al abrir. El `useLayoutEffect` corre en
cada render de `BottomSheet`, pero el área vive dentro del Portal de Radix, que se monta en un commit posterior; mientras
`body.current` es `null`, el efecto sale sin hacer nada. Así que `minHeight` se fija en el siguiente render de `BottomSheet`,
y el cambio de contexto lo provoca dentro de la ventana de 10 cuadros. Es coherente con la medición, pero no se midió.

**¿Es un defecto real del producto?** Es un ajuste de menos de medio píxel, sin animación, una sola vez por apertura y solo si
la hoja se vuelve a pintar después de abrirse. No es perceptible. Pero es real: la hoja cambia de rectángulo sin que cambie
su contenido. **No se corrige aquí** (la autorización no lo cubre). **Propuesta aparte, para que la autoricen los
fundadores:** en `holdKey`, medir con el alto fraccionario (`getBoundingClientRect().height`) en vez de `offsetHeight`, o
fijar `minHeight` también en el primer render con el área montada, para que volver a pintarse no mueva la hoja. Con esa
corrección, la espera de la prueba seguiría siendo correcta: mide el estado estable.

### Aislamiento de la prueba (sin rebajar el criterio)

**Cambio en `tests/a11y/routes.a11y.ts`:**

- Antes, `knobFrames` pulsaba «Nosotros», medía la perilla 10 cuadros y **volvía a «Yo» en el acto**. Después se abría Anotar
  con el cambio de contexto en curso.
- Si la vuelta llegaba con la petición de «Nosotros» en vuelo, el orden de las respuestas decidía si había un segundo refresco.
  En una corrida de diagnóstico, 2 de 48 repeticiones a CPU 6× no tuvieron segundo refresco y la cookie se quedó en `us`. Por
  eso no había un punto de espera determinista sin cambiar el orden.
- **Ahora:** `knobFrames` mide la perilla igual y no vuelve a «Yo». `settleContext(…, "us")` espera a que «Nosotros» termine.
  `backToMe` pulsa «Yo» (con el servidor ya en «Nosotros», la app siempre pide la página otra vez). `settleContext(…, "me")`
  espera a que esa petición termine y «Yo» esté pintado. Después se mide el aviso igual que antes.
- **`settleContext(objetivo)` espera a cuatro cosas:**
  - ninguna petición RSC en vuelo;
  - la cookie `juntia_context` del documento en el objetivo (la app la escribe justo antes de cada `router.refresh()` del
    cambio);
  - terminada una petición con esa cookie, posterior a la última con la otra;
  - para «Yo», su vista pintada; en los dos casos, sin esqueleto en `main`.
- Son aserciones web-first (`expect.poll` y `expect` sobre localizadores) con el tiempo por defecto: **sin `waitForTimeout`,
  sin timeouts nuevos ni más altos.**

**Por qué no rebaja el criterio:**

- `annotateFrames` y su aserción (`new Set(notice.rects).size === 1` en 10 cuadros, contando desde el primer cuadro con la
  hoja) no cambian. No se descarta ninguna medición, no hay tolerancia y no hay `skip`.
- La perilla se mide igual (10 cuadros tras pulsar «Nosotros») y con la misma aserción.
- Lo único que cambia es **cuándo** empieza la medición del aviso: con el contexto ya asentado, que es el estado que la prueba
  quiere vigilar, en vez de en mitad de una transición que provoca la propia prueba.
- La prueba sigue detectando un salto que el producto haga con el contexto asentado. Con el orden antiguo, el mismo salto de
  `holdKey` aparece y la medición lo ve (37 de 48, arriba).

### Evidencia, antes y después

Arnés `tests/evidence/f111-12.capture.ts`, con `F111_12_KNOB=1`:

- **Sin `F111_12_WAIT`:** el orden antiguo, con la vuelta a «Yo» inmediata.
- **Con `F111_12_WAIT=1`:** la secuencia nueva, con las mismas funciones que la prueba (copiadas, para no importar el archivo
  de pruebas).

12 series por ruta (`/`, `/actividad`, `/metas` y `/balance`), a 390, en claro y con movimiento reducido. «Candidato» es la
rama del PR #111 (`src/` de `80f8712`).

| Código | CPU | Orden | Series | Con más de un rectángulo | Esperas sin cumplir |
| --- | ---: | --- | ---: | ---: | ---: |
| `main` | 6× | antiguo (instrumentado) | 48 | **37** | — |
| `main` | 1× | nuevo | 48 | **0** | 0 |
| `main` | 6× | nuevo | 48 | **0** | 0 |
| candidato | 1× | nuevo | 48 | **0** | 0 |
| candidato | 6× | nuevo | 48 | **0** | 0 |

Las corridas del orden antiguo de la primera parte de este documento (26–30 de 48 con `knobFrames`) son coherentes con la
fila de 37 de 48.

**Lo que no vale como evidencia** (iteraciones del criterio de espera, que quedan aquí por transparencia):

- Una versión que exigía un refresco de «Yo» tras la vuelta inmediata se colgó a CPU 6×, cuando no hubo segundo refresco.
- Otra, con una expresión regular rota (`;s*` en vez de `;\s*`), no leía la cookie: sus 96 esperas fallaron y la medición siguió
  tras el tiempo por defecto.
- En la primera corrida de la versión final, una repetición a CPU 6× pulsó «Nosotros» antes de hidratar. Era un fallo del
  arnés, que no esperaba `data-hydrated` como sí hace la prueba; está corregido y repetido (la fila «candidato · 6×»).

Ninguna de esas corridas aparece en la tabla.

**Qué significa que una corrida «pase» (F111-17).** Las corridas del arnés terminaron y escribieron sus series. «0» en la tabla
es lo que midieron, **no** una prueba del gate. La prueba del gate es la suite axe; ver «Suite axe completa».

### Suite axe completa (`npm run e2e:dev -- --project a11y`, contra juntia-dev; iteración, no CI)

| Corrida | Resultado |
| --- | --- |
| **Antes** (`origin/main`, sin el cambio) | **125/125**. El fallo es intermitente: esta vez no apareció (24 de 24 «aviso en hoja, 1 rectángulo(s)»). En las rondas 1 a 3 del PR #111 falló 1, 4 y 2 veces por corrida |
| **Después** (con el cambio) | **125/125**. Los 24 avisos dan 1 rectángulo y todas las esperas nuevas se cumplen. Duración: 7,4 min frente a 7,0 |

Como el fallo es intermitente y la corrida de antes también pasó, **la suite completa sola no demuestra el arreglo**: solo que el cambio no rompe nada y que las esperas se cumplen en la suite real. La evidencia de la causa y del arreglo es la del arnés, arriba. El CI del paso 4 es el que cuenta.

## Lo que no se conserva en el repositorio

Los traces de Playwright (`test-results/f111-12/*.zip`) llevan las cookies de sesión de las cuentas sembradas. Se quedan
en local y no se suben. Los registros por serie (JSON) quedan en el log de cada corrida y se resumen en la tabla.
