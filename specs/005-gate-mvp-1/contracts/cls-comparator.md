# Contrato del comparador de CLS por fotogramas — 005

Aplica Q7 (opción a), FR-051 y SC-005, y la decisión 19.4 («CLS = 0 en Firefox y WebKit»,
sin excepción posible según la decisión 12). Research R4, R5 y R11. **No está
implementado**: lo construye el PR A.

## 1. Qué afirma

En una carga con esqueleto de una ruta clave, **entre el primer fotograma con esqueleto y
el primer fotograma con el contenido final, ningún bloque que sigue en la página cambia
de posición.** Es la misma pregunta que responde CLS = 0 en Chromium, contestada sin la
API Layout Instability, que WebKit y Firefox no tienen.

No afirma nada sobre el tiempo ni sobre el aspecto: solo sobre la posición.

## 2. Piezas

| Pieza | Archivo | Corre en |
| --- | --- | --- |
| Grabador | `scripts/cls-frames/recorder.js` | La página, antes que sus scripts: `addInitScript` en Playwright; «Inspector Bootstrap Script» en Safari con el Mac (R11) |
| Comparador | `scripts/cls-frames/compare.mjs` | Node, sobre la salida del grabador; puro y sin E/S |
| Arnés | `tests/evidence/cls-frames.capture.ts` | Proyectos `evidence` (Chromium), `evidence-webkit` y `evidence-firefox`; tramos `lab-cls-b`, `webkit-cls` y `firefox-cls` del job `release` |
| Prueba del comparador | `tests/cls-frames.test.ts` | Vitest, job `app` |

## 3. Grabador: entrada y salida

- **Identidad de un bloque:** el propio nodo del DOM. El grabador le asigna un número
  la primera vez que lo ve (`WeakMap`) y lo conserva mientras exista. Un nodo que sale
  del DOM y otro que entra son bloques distintos, aunque se parezcan.
- **Qué nodos registra:** los elementos visibles en el viewport con caja no vacía, con
  un tope de profundidad (por defecto, 12 niveles bajo `body`) para no registrar cada
  `span`. Excluye `script`, `style`, nodos con `display: contents` y los que están en
  `aria-hidden` dentro de un esqueleto.
- **Cada fotograma:** en cada `requestAnimationFrame`, una entrada
  `{ t, scrollX, scrollY, skeleton, boxes: [[id, x, y, w, h], …] }`, con
  `x = rect.left + scrollX` e `y = rect.top + scrollY` en px CSS con dos decimales.
- **Marcas:**
  - `skeleton = true` mientras exista un elemento con el atributo del esqueleto que ya
    usa `loading.tsx` (el PR A nombra el selector exacto al leerlo);
  - el **primer fotograma con esqueleto** y el **primer fotograma final** (sin esqueleto,
    con el `main` de la ruta y dos fotogramas seguidos sin cambios de caja).
- **Sin texto:** el grabador no registra `textContent`, valores de campos ni atributos
  que no sean la marca del esqueleto. La prueba del comparador lo afirma sobre una
  salida real del PR A (ningún campo con letras fuera de los nombres de las claves).
- **Salida:** un objeto JSON por carga en `window.__clsFrames`; el arnés lo lee al final.
  Con el Mac, la consola lo imprime con `copy()`.

## 4. Comparador: regla

Para cada par de fotogramas consecutivos `(i, i+1)` entre el primero con esqueleto y el
primero final, ambos incluidos:

- Un **desplazamiento** es un bloque presente en los dos fotogramas cuya `x` o `y` cambió
  en **≥ 1 px CSS**. Por debajo de 1 px se registra como «subpíxel» y no cuenta; el
  informe dice cuántos hubo.
- **No es desplazamiento:** que el bloque aparezca o desaparezca; que cambie solo de
  tamaño con la esquina superior izquierda fija (un esqueleto que crece hacia abajo
  empuja a otros bloques, y esos sí cuentan); que todo se mueva por scroll (se descuenta
  `scrollX`/`scrollY`).
- **Resultado por carga:** `{ ruta, motor, tema, ancho, fotogramas, desplazamientos:
  [{ id, desde, hasta, dx, dy, ruta del nodo }], subpixel }`. La ruta del nodo es
  `etiqueta.clase` de sus antepasados, sin texto.
- **Resultado por ruta y motor:** **CLS = 0 por fotogramas** si ninguna carga tiene
  desplazamientos. Una sola carga con uno es un fallo del gate, como en Chromium.

## 5. Fiabilidad (cuándo el método vale y cuándo vuelve a los fundadores)

El comparador **es fiable** si, en el punto de control del PR A, se cumplen las cuatro
condiciones en los tres motores. Si cualquiera falla en un motor y no se arregla dentro
del PR A, **la decisión vuelve a los fundadores** con la opción (c) de Q7 («solo WebKit»,
que exige enmendar la 19.4), sin marcar nada como medido.

1. **Control positivo:** un script de prueba inserta, 300 ms después del primer
   fotograma con esqueleto, un bloque de 40 px encima de `main`. En las 10 cargas de cada
   motor, el comparador detecta el desplazamiento de `main` (y de lo que hay debajo) con
   `dy ≈ 40`. **10 de 10.**
2. **Control de subpíxel:** el mismo script mueve `main` 0,5 px. El comparador lo informa
   como subpíxel y no como desplazamiento. **10 de 10.**
3. **Control negativo:** una ruta sin esqueleto ni cambios tras la carga (la pantalla de
   entrar, A1). Cero desplazamientos en **10 de 10** cargas por motor.
4. **Concordancia con la API en Chromium:** en las 40 cargas por ruta de `lab-cls-b`, la
   carga tiene desplazamientos por fotogramas **si y solo si** la API Layout Instability
   da CLS > 0. Una carga en la que discrepen se investiga; dos o más, el método no es
   fiable en ese estado.

Los controles 1 y 2 se inyectan solo en el arnés (`addInitScript` propio del control),
nunca en la app.

## 6. Qué rutas y cuántas cargas

- **Con sesión:** las de FR-050: Inicio en Yo y en Nosotros, Actividad, Balance, Plan,
  Análisis y Metas, con el dataset sembrado en el runner. El esqueleto se fuerza con el
  bloqueo de tabla del servidor durante 1,5 s (R5).
- **Sin sesión:** entrar (A1), crear cuenta (A2) y recuperar (A4), sin bloqueo.
- **Por ruta y motor:** 10 cargas en tema claro y 5 en oscuro, alternando 390 y 1440.
  **Decisión del plan:** la spec no fija el número para fuera de Chromium; 15 por ruta
  caben en ~550 s por motor. Si en Chromium la causa de un CLS fue intermitente (D21-1 de
  la 001, 9 de 40), el control 4 lo vería en las 40 de `lab-cls-b`.
- **Sin emulación de CPU ni de red** en WebKit y Firefox (Playwright no la ofrece); la
  emulación de Chromium sigue en FR-050.

## 7. Evidencia

- `test-results/evidence/cls-frames.jsonl`, una línea por carga, en el artefacto del
  tramo; el resumen por ruta y motor va a `evidence.md` como tabla.
- Vídeo de Playwright solo de las cargas con desplazamiento, para la revisión humana; no
  entra al repositorio.
- La tabla de CWV (FR-056) rotula estas filas «laboratorio · por fotogramas», con el motor
  y su versión.
