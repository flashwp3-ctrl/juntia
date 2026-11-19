# Contrato del comparador de CLS por fotogramas — 005

Aplica Q7 (opción a), FR-051 y SC-005, y la decisión 19.4 («CLS = 0 en Firefox y WebKit»,
sin excepción posible según la decisión 12). Research R4, R5 y R11. **No está
implementado**: lo construye el PR A.

Revisión del PR #85 (ChatGPT):

- **En `1a529d8`, F85-5:** posición de layout sin transformaciones, elementos fixed y
  sticky aparte, y controles negativos nuevos.
- **En `4a820fe`, F85-11:** anular `transform` con `!important` no neutraliza una
  transición CSS activa, que gana en la cascada (ChatGPT lo reprodujo en Chromium). El
  método cambia, y la equivalencia entre motores queda como criterio de calibración del
  PR A, no como afirmación de este contrato.

## 1. Qué afirma

En una carga con esqueleto de una ruta clave, **entre el primer fotograma con esqueleto y
el primer fotograma con el contenido final, ningún bloque que sigue en la página cambia
de posición de layout.** Es la misma pregunta que responde CLS = 0 en Chromium,
contestada sin la API Layout Instability, que WebKit y Firefox no tienen.

No afirma nada sobre el tiempo, ni sobre el aspecto, ni sobre las animaciones que no
mueven el layout. Una transformación CSS (por ejemplo, un `translateY` de Motion, animado
o en transición) no es un cambio de layout, igual que para la API de Chromium.

## 2. Piezas

| Pieza | Archivo | Corre en |
| --- | --- | --- |
| Grabador | `scripts/cls-frames/recorder.js` | La página, antes que sus scripts: `addInitScript` en Playwright; «Inspector Bootstrap Script» en Safari con el Mac (R11) |
| Comparador | `scripts/cls-frames/compare.mjs` | Node, sobre la salida del grabador; puro y sin E/S |
| Arnés | `tests/evidence/cls-frames.capture.ts` | Proyectos `evidence` (Chromium), `evidence-webkit` y `evidence-firefox`; tramos `cls-*`, `webkit-cls-*` y `firefox-cls-*` del job `release` |
| Prueba del comparador | `tests/cls-frames.test.ts` | Vitest, job `app` |

## 3. Grabador

### 3.1 Qué bloques registra

- **Identidad de un bloque:** el propio nodo del DOM. El grabador le asigna un número la
  primera vez que lo ve (`WeakMap`) y lo conserva mientras exista. Un nodo que sale del
  DOM y otro que entra son bloques distintos, aunque se parezcan.
- **Qué nodos:** los `HTMLElement` visibles en el viewport con caja no vacía, hasta 12
  niveles bajo `body`, para no registrar cada `span`.
- **Excluye:**
  - `script`, `style` y los nodos con `display: contents`;
  - los elementos SVG, que no tienen `offsetTop`: cuenta su contenedor HTML;
  - los nodos con `aria-hidden` dentro de un esqueleto.

### 3.2 Cómo mide la posición de layout (F85-5, F85-11)

`getBoundingClientRect()` devuelve la caja **ya transformada**: un `translateY` animado
contaría como desplazamiento. La primera versión de este contrato anulaba las
transformaciones con una hoja `!important` durante la medida. **No basta:** una transición
CSS activa gana a `!important` en la cascada, así que su `transform` seguiría aplicado
(F85-11).

**Método principal: sumar `offsetLeft` y `offsetTop` por la cadena de `offsetParent`**,
más el borde de cada antepasado (`clientLeft`, `clientTop`).

- **Por qué:**
  - CSSOM View define `offsetTop` y `offsetLeft` sobre el layout, **sin aplicar
    transformaciones**. No dependen de cómo se anime la transformación (transición,
    animación CSS, Web Animations o estilo en línea).
  - El grabador **no escribe nada** en la página: no hay hoja que active ni
    animaciones que tocar.
  - No dependen del scroll del documento ni del de los contenedores internos, que la
    API de Chromium tampoco cuenta.
- **Límite que se acepta: resolución de 1 px.** Los dos valores son enteros.
  - **Lo que se garantiza:** todo desplazamiento real de **≥ 1 px** se detecta, porque
    dos posiciones que difieren en 1 px o más nunca se redondean al mismo entero.
  - **Lo que no:** uno de menos de 1 px puede leerse como 0 o como 1 px.
  - **Consecuencia:** el método puede **avisar de más** con un movimiento subpíxel real,
    pero nunca deja pasar uno de 1 px o más. Un aviso de más se investiga con la
    concordancia de Chromium (control 7) y con el vídeo de la carga.
- **Alternativa documentada, solo si la calibración del PR A la pide:** durante la
  medida, pausar todas las animaciones con `document.getAnimations()`, que en los tres
  motores incluye las transiciones CSS (`CSSTransition`); leer `getBoundingClientRect()`
  sin transformaciones y fraccionario; y reanudarlas.
  - **Por qué no es la primera opción:** escribe en la página (pausa y reanuda), mueve
    el reloj de cada animación lo que dura la medida, y aún necesitaría anular los
    `transform` estáticos.
  - **Cuándo se usaría:** solo si un motor no da `offsetTop` coherente con su layout en
    los controles 4 a 6. Su elección se registra en la evidencia del PR A.
- **Opciones descartadas:**

  | Opción | Por qué no |
  | --- | --- |
  | Hoja `!important` con `transform: none` | No neutraliza una transición CSS activa (F85-11) |
  | Clonar el elemento sin transformaciones | Cambia el árbol que se mide y su layout |
  | `getBoundingClientRect()` sin más | Cuenta las transformaciones como desplazamientos |

**No se afirma que los tres motores calculen igual** `offsetTop` y `offsetParent` en todos
los casos (elementos sticky, `fixed` dentro de un antepasado transformado, tablas). Esa
equivalencia es un **criterio de calibración del PR A** (§5): se demuestra con los
controles en cada motor o el método no se da por fiable en ese motor.

### 3.3 Sistemas de coordenadas: normal, fixed y sticky (F85-5)

| Clase de bloque | Cómo se detecta | Coordenada que se compara |
| --- | --- | --- |
| **Normal** | Ni él ni ningún antepasado es `fixed` ni `sticky` | La suma de offsets hasta la raíz: del documento, sin scroll |
| **Fixed** | Él o un antepasado tiene `position: fixed` | La suma de offsets hasta el elemento `fixed`, más la de este, que CSSOM da respecto del viewport (su `offsetParent` es `null`). Si un antepasado transformado es su bloque contenedor (`offsetParent` no nulo), la suma sigue hasta ese antepasado, y lo comprueba el control 6 |
| **Sticky** | Él o un antepasado tiene `position: sticky`, y ninguno es `fixed` | La suma de offsets, pero **solo se compara entre fotogramas con el mismo scroll** (el del documento y los de sus contenedores con scroll). Un cambio entre fotogramas con scroll distinto se atribuye al scroll y no cuenta, como en la API de Chromium |

La clase se calcula una vez por nodo y se vuelve a calcular si cambia su `position`.

### 3.4 Qué guarda en cada fotograma

Cada fotograma es una entrada
`{ t, scroll: [documento, contenedores…], skeleton, boxes: [[id, clase, x, y, w, h], …] }`,
con `x`, `y`, `w` y `h` en px CSS enteros (`offsetWidth` y `offsetHeight` para el
tamaño).

### 3.5 Marcas

- `skeleton = true` mientras exista un elemento con el atributo del esqueleto que ya usa
  `loading.tsx` (el PR A nombra el selector exacto al leerlo).
- El **primer fotograma con esqueleto** y el **primer fotograma final**: sin esqueleto,
  con el `main` de la ruta y dos fotogramas seguidos sin cambios de caja.

### 3.6 Sin texto

El grabador no registra `textContent`, valores de campos ni atributos, salvo la marca
del esqueleto. La prueba del comparador lo afirma sobre una salida real del PR A: ningún
valor tiene letras, salvo los nombres de las claves y de las clases de bloque.

### 3.7 Salida

Un objeto JSON por carga en `window.__clsFrames`, que el arnés lee al final. Con el Mac,
la consola lo imprime con `copy()`.

## 4. Comparador: regla

Para cada par de fotogramas consecutivos `(i, i+1)` entre el primero con esqueleto y el
primero final, ambos incluidos:

- **Desplazamiento:** un bloque presente en los dos fotogramas cuya `x` o `y`, en la
  coordenada de su clase (§3.3), cambió en **≥ 1 px CSS**. Es la resolución del método
  (§3.2).
- **No es desplazamiento:**
  - que el bloque aparezca o desaparezca;
  - que cambie solo de tamaño con la esquina superior izquierda fija. Un esqueleto que
    crece hacia abajo no se cuenta a sí mismo, pero los bloques que empuja sí;
  - que un bloque sticky cambie entre fotogramas con distinto scroll;
  - una transformación, de ningún tipo, porque `offsetTop` y `offsetLeft` no la incluyen.
- **Resultado por carga:**
  `{ ruta, motor, tema, ancho, fotogramas, desplazamientos: [{ id, clase, desde, hasta,
  dx, dy, ruta del nodo }] }`. La ruta del nodo es la `etiqueta.clase` de sus
  antepasados, sin texto.
- **Resultado por ruta y motor:** hay **CLS = 0 por fotogramas** si ninguna carga tiene
  desplazamientos. Una sola carga con uno es un fallo del gate, como en Chromium.

## 5. Fiabilidad: cuándo el método vale y cuándo vuelve a los fundadores

El comparador **es fiable en un motor** si, en el punto de control del PR A, ese motor
cumple las siete condiciones de abajo, con 10 cargas por control. **Se calibra motor a
motor:** que valga en Chromium no dice nada de WebKit ni de Firefox (F85-11).

- **Si falla en un motor**, se prueba la alternativa de §3.2 en ese motor dentro del PR
  A.
- **Si tampoco cumple**, la decisión **vuelve a los fundadores** con la opción (c) de Q7
  («solo WebKit», que exige enmendar la 19.4) o la que corresponda al motor que falle.
  Nada se marca como medido.

Los controles se inyectan solo en el arnés, con un `addInitScript` propio de cada
control, y nunca en la app.

| # | Control | Qué hace el script de prueba | Resultado exigido |
| --- | --- | --- | --- |
| 1 | **Positivo: desplazamiento real** | 300 ms después del primer fotograma con esqueleto, inserta un bloque de 40 px encima de `main` | Desplazamiento de `main` y de lo que hay debajo con `dy` de 40 ± 1, **10 de 10** |
| 2 | **Resolución: 1 px** | Mueve `main` 1 px con `margin-top` (layout, no transformación) | Desplazamiento detectado, **10 de 10**. Además, mueve 0,5 px en otras 10 cargas y **solo se registra** cuántas veces se vio, sin exigir resultado: es la resolución aceptada en §3.2 |
| 3 | **Negativo: ruta quieta** | Carga la pantalla de entrar (A1), sin esqueleto ni cambios | Cero desplazamientos, 10 de 10 |
| 4 | **Negativo: animación con transformación** (F85-5) | Durante la carga, anima un bloque con `transform: translateY(24px)` → `0` en 300 ms, una vez con Web Animations y otra con un estilo en línea cambiado por fotograma (las dos vías de Motion) | Cero desplazamientos, 10 de 10. **En Chromium, la API da CLS = 0 en las mismas cargas** |
| 5 | **Negativo: transición CSS en curso** (nuevo, F85-11) | Un bloque con `transition: transform 400ms` al que se le cambia `transform: translateY(32px)` justo después del primer fotograma con esqueleto, de modo que la transición está activa mientras se mide | Cero desplazamientos, 10 de 10; **la posición medida del bloque no cambia en ningún fotograma de la transición** |
| 6 | **Negativo: scroll con sticky y fixed** (F85-5) | Una cabecera `position: sticky`, un bloque `fixed` y otro `fixed` dentro de un antepasado transformado; tras la carga, desplaza la página 200 px en 10 pasos | Cero desplazamientos, 10 de 10. La cabecera y los bloques `fixed` no cuentan, y los bloques normales no cuentan por el scroll |
| 7 | **Concordancia con la API en Chromium** | En las 40 cargas de cada tramo `cls-*` de Chromium, el grabador corre junto a la API | Una carga tiene desplazamientos por fotogramas **si y solo si** la API da CLS > 0, salvo los avisos de más por resolución (§3.2), que se listan aparte con su vídeo. Una discrepancia que no se explique así se investiga; dos o más, el método no es fiable en Chromium |

**Dónde corren:** los controles 1 a 6, en `cls-controls-chromium`, `webkit-cls-1` y
`firefox-cls-1`. El control 7, en los siete tramos `cls-*` de Chromium, sin cargas extra.

## 6. Qué rutas y cuántas cargas

- **Con sesión:** las de FR-050: Inicio en Yo y en Nosotros, Actividad, Balance, Plan,
  Análisis y Metas, con el dataset sembrado en el runner. El esqueleto se fuerza
  reteniendo la lectura en el servidor durante 1,5 s (R5).
- **Sin sesión:** entrar (A1), crear cuenta (A2) y recuperar (A4), sin retención.
- **Cuenta por motor y ruta (PR B; decisión del gestor del 19 nov 2026, opción a acotada):** en **Firefox**, Inicio · Yo
  y Actividad se miden con una cuenta sembrada **sin pareja**; en Chromium y WebKit, y en las demás rutas, con la pareja del
  dataset. Motivo: esas dos rutas retienen `transactions`, y con una pareja activa el layout de (app) también lee de esa
  tabla (`couple_expenses`), así que la retención bloqueaba el layout entero, no se pintaba el esqueleto y la lectura acababa
  en el estado de error de la ruta (parcial 44433137464: la mitad de las cargas a 390 en Firefox; todas en local). Sin pareja,
  la retención solo frena la página. La parte compartida queda medida en Chromium y WebKit. El resumen del run lo dice por
  ruta y motor (`cuenta`).
- **Cargas inválidas por el arnés (PR B):** una carga que termina en el estado de error de la ruta
  (`data-provisional-state="danger"`) no mide la ruta: se registra aparte («inválida por el arnés (R5)»), se repite una vez y
  nunca cuenta como CLS = 0. Si la repetición también es inválida, la ruta no puede salir en verde.
- **Por ruta y motor, fuera de Chromium:** 10 cargas en tema claro y 5 en oscuro,
  alternando 390 y 1440. **Decisión del plan:** la spec no fija el número para fuera de
  Chromium. En Chromium, las 40 de FR-050 cubren el caso intermitente (D21-1 de la 001:
  9 de 40) con el control 7.
- **Sin emulación de CPU ni de red** en WebKit y Firefox, porque Playwright no la ofrece.
  La emulación de Chromium sigue en FR-050.
- **Reparto en tramos y presupuesto:** [ci.md](ci.md), «Presupuesto por tramo».

## 7. Evidencia

- `test-results/evidence/cls-frames.jsonl`, una línea por carga, en el artefacto del
  tramo. El resumen por ruta, motor y control va a `evidence.md` como tabla, con el
  método que usó cada motor (§3.2).
- Vídeo de Playwright solo de las cargas con desplazamiento, para la revisión humana; no
  entra al repositorio.
- La tabla de CWV (FR-056) rotula estas filas «laboratorio · por fotogramas», con el motor
  y su versión.
