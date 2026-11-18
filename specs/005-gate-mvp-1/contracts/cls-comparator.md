# Contrato del comparador de CLS por fotogramas — 005

Aplica Q7 (opción a), FR-051 y SC-005, y la decisión 19.4 («CLS = 0 en Firefox y WebKit»,
sin excepción posible según la decisión 12). Research R4, R5 y R11. **No está
implementado**: lo construye el PR A. Revisión del PR #85 (ChatGPT, en `1a529d8`): F85-5
(posición de layout sin transformaciones; elementos fixed y sticky aparte; controles
negativos nuevos).

## 1. Qué afirma

En una carga con esqueleto de una ruta clave, **entre el primer fotograma con esqueleto y
el primer fotograma con el contenido final, ningún bloque que sigue en la página cambia
de posición de layout.** Es la misma pregunta que responde CLS = 0 en Chromium,
contestada sin la API Layout Instability, que WebKit y Firefox no tienen.

No afirma nada sobre el tiempo ni sobre el aspecto, ni sobre las animaciones que no
mueven el layout: una transformación CSS (por ejemplo, un `translateY` de Motion) no es
un cambio de layout, igual que para la API de Chromium.

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
  - los elementos SVG internos: cuenta el `svg` exterior, que es un elemento con caja;
  - los nodos con `aria-hidden` dentro de un esqueleto.

### 3.2 Cómo mide la posición: sin transformaciones (F85-5)

`getBoundingClientRect()` devuelve la caja **ya transformada**. Por eso, una animación
permitida (un `translateY`, una escala) contaría como desplazamiento, cuando no mueve el
layout de nadie.

**Decisión: anular las transformaciones solo durante la medida.** En cada
`requestAnimationFrame`, el grabador:

1. activa una hoja de estilos propia, `[data-cls-measure] * { transform: none !important;
   translate: none !important; rotate: none !important; scale: none !important; }`,
   poniendo `data-cls-measure` en `html`;
2. lee las cajas con `getBoundingClientRect()`;
3. quita el atributo antes de devolver el control.

Todo ocurre en el mismo `requestAnimationFrame`, antes del pintado, así que nunca se
pinta la página sin transformaciones. Una declaración `!important` del autor gana a los
estilos en línea y a las animaciones CSS y Web Animations (orden de la cascada), así que
cubre las dos maneras que usa Motion de animar `transform`.

**Por qué esta opción y no las otras:**

| Opción | Por qué no |
| --- | --- |
| Sumar `offsetTop` y `offsetLeft` por la cadena de `offsetParent` | Ignora las transformaciones, pero devuelve **enteros** (CSSOM View): un movimiento de 0,5 px puede leerse como 0 o como 1 px según el redondeo, y el control de subpíxel (§5) sería aleatorio. Además, no existe en SVG |
| Clonar el elemento sin transformaciones | Cambia el árbol que se mide y su layout |
| `getBoundingClientRect()` sin más | Cuenta las transformaciones como desplazamientos |

**Coste y límite conocidos:**

- dos recálculos de estilo por fotograma, aceptables en un laboratorio que solo mide
  posiciones;
- una transformación crea bloque contenedor para sus descendientes `fixed`, así que
  anularla movería a esos descendientes. El grabador detecta ese caso (un elemento
  `fixed` cuyo `offsetParent` no es `null`) y lo mide respecto de ese antepasado,
  también sin transformaciones. Si la app no tiene ninguno, el informe lo dice.

### 3.3 Sistemas de coordenadas: normal, fixed y sticky (F85-5)

`top + scrollY` solo vale para los elementos que se desplazan con el documento.

| Clase de bloque | Cómo se detecta | Coordenada que se compara |
| --- | --- | --- |
| **Normal** | Ni él ni ningún antepasado es `fixed` ni `sticky` | Del documento: `left + scrollX`, `top + scrollY` |
| **Fixed** | Él o un antepasado tiene `position: fixed` | Del viewport: `left`, `top` (no se mueven con el scroll) |
| **Sticky** | Él o un antepasado tiene `position: sticky`, y ninguno es `fixed` | Del documento, pero **solo se compara entre fotogramas con el mismo scroll**. Entre dos fotogramas con scroll distinto, su cambio se atribuye al scroll y no cuenta (la API de Chromium tampoco cuenta los movimientos causados por el scroll) |

La clase se calcula una vez por nodo y se vuelve a calcular si cambia su `position`.

### 3.4 Qué guarda en cada fotograma

Cada fotograma es una entrada
`{ t, scrollX, scrollY, skeleton, boxes: [[id, clase, x, y, w, h], …] }`, en px CSS con dos
decimales.

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
  coordenada de su clase (§3.3), cambió en **≥ 1 px CSS**.
- **Subpíxel:** un cambio por debajo de 1 px. No cuenta, y el informe dice cuántos hubo.
- **No es desplazamiento:**
  - que el bloque aparezca o desaparezca;
  - que cambie solo de tamaño con la esquina superior izquierda fija. Un esqueleto que
    crece hacia abajo no se cuenta a sí mismo, pero los bloques que empuja sí;
  - que un bloque sticky cambie entre fotogramas con distinto scroll;
  - una transformación, porque se mide sin ellas (§3.2).
- **Resultado por carga:**
  `{ ruta, motor, tema, ancho, fotogramas, desplazamientos: [{ id, clase, desde, hasta,
  dx, dy, ruta del nodo }], subpixel }`. La ruta del nodo es la `etiqueta.clase` de sus
  antepasados, sin texto.
- **Resultado por ruta y motor:** hay **CLS = 0 por fotogramas** si ninguna carga tiene
  desplazamientos. Una sola carga con uno es un fallo del gate, como en Chromium.

## 5. Fiabilidad: cuándo el método vale y cuándo vuelve a los fundadores

El comparador **es fiable** si, en el punto de control del PR A, se cumplen las seis
condiciones en **los tres motores** (Chromium, WebKit y Firefox), con 10 cargas por
control y motor.

Si cualquiera falla en un motor y no se arregla dentro del PR A, **la decisión vuelve a
los fundadores** con la opción (c) de Q7 («solo WebKit», que exige enmendar la 19.4), sin
marcar nada como medido.

Los controles se inyectan solo en el arnés, con un `addInitScript` propio de cada
control, y nunca en la app.

| # | Control | Qué hace el script de prueba | Resultado exigido |
| --- | --- | --- | --- |
| 1 | **Positivo: desplazamiento real** | 300 ms después del primer fotograma con esqueleto, inserta un bloque de 40 px encima de `main` | Desplazamiento de `main` y de lo que hay debajo con `dy ≈ 40`, **10 de 10** |
| 2 | **Subpíxel** | Mueve `main` 0,5 px con `margin-top` (layout, no transformación) | Subpíxel, **no** desplazamiento, 10 de 10 |
| 3 | **Negativo: ruta quieta** | Carga la pantalla de entrar (A1), sin esqueleto ni cambios | Cero desplazamientos, 10 de 10 |
| 4 | **Negativo: animación con transformación** (nuevo, F85-5) | Durante la carga, anima un bloque con `transform: translateY(24px)` → `0` en 300 ms, una vez con Web Animations y otra con un estilo en línea cambiado por fotograma (las dos vías de Motion) | Cero desplazamientos, 10 de 10. **La API de Chromium da CLS = 0 en las mismas cargas** |
| 5 | **Negativo: scroll con un elemento sticky** (nuevo, F85-5) | En una página con una cabecera `position: sticky` y un bloque `fixed`, desplaza la página 200 px en 10 pasos tras la carga | Cero desplazamientos, 10 de 10; la cabecera y el bloque `fixed` no cuentan, y los bloques normales no cuentan por el scroll |
| 6 | **Concordancia con la API en Chromium** | En las 40 cargas de cada tramo `cls-*` de Chromium, el grabador corre junto a la API | Una carga tiene desplazamientos por fotogramas **si y solo si** la API da CLS > 0. Una carga en la que discrepen se investiga; dos o más, el método no es fiable en ese estado |

Los controles 1 a 5 corren en `cls-controls-chromium`, `webkit-cls-1` y
`firefox-cls-1`. El control 6 corre en los siete tramos `cls-*` de Chromium, sin cargas
extra.

## 6. Qué rutas y cuántas cargas

- **Con sesión:** las de FR-050: Inicio en Yo y en Nosotros, Actividad, Balance, Plan,
  Análisis y Metas, con el dataset sembrado en el runner. El esqueleto se fuerza
  reteniendo la lectura en el servidor durante 1,5 s (R5).
- **Sin sesión:** entrar (A1), crear cuenta (A2) y recuperar (A4), sin retención.
- **Por ruta y motor, fuera de Chromium:** 10 cargas en tema claro y 5 en oscuro,
  alternando 390 y 1440. **Decisión del plan:** la spec no fija el número para fuera de
  Chromium. En Chromium, las 40 de FR-050 cubren el caso intermitente (D21-1 de la 001:
  9 de 40) con el control 6.
- **Sin emulación de CPU ni de red** en WebKit y Firefox, porque Playwright no la ofrece.
  La emulación de Chromium sigue en FR-050.
- **Reparto en tramos y presupuesto:** [ci.md](ci.md), «Presupuesto por tramo».

## 7. Evidencia

- `test-results/evidence/cls-frames.jsonl`, una línea por carga, en el artefacto del
  tramo. El resumen por ruta, motor y control va a `evidence.md` como tabla.
- Vídeo de Playwright solo de las cargas con desplazamiento, para la revisión humana; no
  entra al repositorio.
- La tabla de CWV (FR-056) rotula estas filas «laboratorio · por fotogramas», con el motor
  y su versión.
