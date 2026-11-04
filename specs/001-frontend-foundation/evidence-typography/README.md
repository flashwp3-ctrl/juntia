# Evidencia · decisión 14 (tipografía de marca)

Fecha: 4 de noviembre de 2026. Build de producción servido con `JUNTIA_INTERNAL_SURFACE=1 next start -p 3100` (el 3000 lo ocupaba otro proceso). La línea base de `main` (`f6ef453`, con Geist) se compiló en un worktree aparte y se sirvió en el 3200 con el mismo comando. Chromium de Playwright 1.64.1 en Windows 11. Los arneses son desechables y se copian en [`harness/`](harness/) como `.cjs.txt`, para que no entren en el lint; no forman parte de `tests/`. Para ejecutarlos, cópialos fuera del repositorio sin la extensión `.txt`.

## Aprobación de los fundadores

Aprobado por los dos fundadores el 4 de noviembre de 2026: las 32 capturas, Spline Sans Mono para `meta.mono` y los tamaños de montos del código (40 px en móvil, 52 px en escritorio). Los comps de Claude Design, que redujeron los montos un 7 %, se alinearán con el código al diseñar P0-1.

## Capturas

32 PNG de página completa: las seis rutas de producto, «no encontrado» (`ruta-que-no-existe`) y `/interno/primitivos`, a 390 y 1440 px, en claro y oscuro. Nombre: `<ruta>-<ancho>-<tema>.png`. [captures.txt](captures.txt) registra el estado HTTP de cada carga y las fuentes cargadas al capturar.

Spline Sans Mono solo aparece en `/interno/primitivos`. Su marca de propuesta en `meta.mono` se cerró con la aprobación de arriba.

## Resultados

| Verificación | Resultado | Salida |
| --- | --- | --- |
| `npm run verify` | Pasa: lint, typecheck, 85 pruebas de componentes | [verify.txt](verify.txt) |
| `test:a11y` (axe) | 36 de 36 | [a11y.txt](a11y.txt) |
| `check:internal-surface` | 12 de 12 OK, sin fuga | [check-internal-surface.txt](check-internal-surface.txt) |
| `check:theme-script` | 5 de 5 OK | [check-theme-script.txt](check-theme-script.txt) |
| R2: 6 rutas × 2 temas, CPU 6×, 400 kbit/s, 400 ms | **CLS = 0 en 12 de 12**, sin cuadro del tema contrario; el control negativo detecta el destello | [cls-r2.txt](cls-r2.txt) |
| Repetición de R2, 4 iteraciones | **0 de 48 con CLS > 0**, sin cuadro del tema contrario | [cls-repeat-48.txt](cls-repeat-48.txt) |
| «No encontrado» en carga fría, condiciones de R2, 2 temas | **CLS > 0 en 8 de 8** a 362, 363, 384 y 385 px (0,001625 y 0,000826), con origen el texto de la descripción; **0 en 4 de 4** a 360 y 390 px. Corregido después en [`../evidence-not-found-cls/`](../evidence-not-found-cls/README.md) | [cls-404-widths.txt](cls-404-widths.txt) |
| Scroll horizontal: 8 rutas × 360, 390, 430, 768, 1024, 1280 y 1440 × 2 temas | 0 de 112 | [verify-typo.txt](verify-typo.txt) `HSCROLL` |
| Texto al 200 % a 360 y 390, 6 rutas × 2 temas | Sin scroll, título sin solaparse con el selector | [verify-typo.txt](verify-typo.txt) `TEXT_200` |
| Contraste de texto, 8 rutas × 390 y 1440 × 2 temas | Todos ≥ 4,5:1 salvo el botón `aria-disabled` de la superficie interna (4,3:1, `#6C665B` sobre `#E7DFD0`), idéntico en `main` y exento por ser un control inactivo | [verify-typo.txt](verify-typo.txt) `CONTRAST` |
| JavaScript por ruta, misma medición en `main` y en la rama | Transferido igual (236,8 KB con gzip de `next start`); decodificado +0,3 KB (750,9 → 751,2 KB) por las clases de los titulares | [js-per-route.txt](js-per-route.txt) |
| Fuentes precargadas | 70,1 KB en `main` → 70,0 KB: la itálica de Brygada no se precarga | Ver abajo |
| `impeccable detect` por URL, 8 rutas × 1440 y 390 | `overused-font`: 0 (en `main`: «Primary font: geist»). Quedan `icon-tile-stack` (ficha de 88 px del estado, anatomía aprobada) y `nested-cards` en la superficie interna. La 404 no se puede escanear por URL (responde 404) | [impeccable-detect.txt](impeccable-detect.txt) |

### Respaldo calibrado (D-01)

`size-adjust` por peso, medido como relación de anchos sobre las 134 cadenas de `src/lib/copy/es.ts` ([`harness/ratios.cjs.txt`](harness/ratios.cjs.txt)): Onest/Arial 400 → 1,0398, 500 → 1,0508, 600 → 0,9900; Brygada/Georgia 400 → 1,0415, 500 → 1,0501, 600 → 0,9079, 700 → 0,9253, e itálicas. Las sobreescrituras verticales son las de cada fuente divididas por el ajuste.

**Desviación de la media en Onest 400: se usa 1,049.** Con 1,0398, la descripción de «no encontrado» cortaba distinto a 360 px y su primera línea se movía 18,5 px. Barrido de cada ancho entre 360 y 1023 px, donde los estados van centrados ([fallback-sweep.txt](fallback-sweep.txt)):

| | Rutas de producto, máximo | «No encontrado» |
| --- | --- | --- |
| `main` (Geist) | 2,08 px | cambia de corte en 4 anchos (370–373), hasta 8,61 px |
| Rama, Onest 400 = 1,0398 | 2,38 px | 9 anchos, entre ellos 360 |
| **Rama, Onest 400 = 1,049** | **2,38 px** | 4 anchos (362, 363, 384, 385), hasta 19,95 px |

Chrome ignora movimientos de menos de 3 px. La 404 no está en R2; en 360, 390, 1024 y 1440 su residuo es 0,9 px. En los cuatro anchos que quedan, la cuenta es la misma que en `main` (4), pero **el desplazamiento máximo sube de 8,61 a 19,95 px**: no se comporta igual que `main`.

**CLS real en esos anchos ([cls-404-widths.txt](cls-404-widths.txt)).** En carga fría, con las condiciones de R2 y en los dos temas, el CLS es **0,001625** a 362 y 363 px y **0,000826** a 384 y 385 px: mayor que 0 en las 8 cargas. Hay un solo desplazamiento por carga, hacia los 5,8 s, cuando llega Onest, y su origen es el nodo de texto de la descripción («La dirección no existe…»). A 360 y 390 px, CLS = 0 en las 4 cargas. **Quedó pendiente en este PR y se corrigió después: ver [`../evidence-not-found-cls/`](../evidence-not-found-cls/README.md).** No se midió el CLS en carga fría de `main` en sus anchos 370–373. (La primera pasada del arnés perdió el detalle de la fuente porque `outerHTML` no existe en un nodo de texto; la versión corregida es [`harness/r2-404.cjs.txt`](harness/r2-404.cjs.txt).)

`font-display` sigue en `swap`. El respaldo de Brygada se llama «Brygada Fallback» y no «Brygada 1918 Fallback»: `next/font` no entrecomilla el respaldo, y un token que empieza por cifra invalida el `font-family` entero, con lo que los titulares caían a Onest.

### Fuentes precargadas

| | `main` | Rama |
| --- | --- | --- |
| Titulares | Instrument Serif 15,0 KB | Brygada 1918 23,4 KB |
| Interfaz | Geist 29,3 KB | Onest 33,8 KB |
| Metadatos | Geist Mono 10,1 KB | Spline Sans Mono 12,8 KB |
| Otra | Instrument Serif itálica 15,7 KB | — |
| **Total** | **70,1 KB** | **70,0 KB** |

La itálica de Brygada (24,4 KB) se declara en una segunda llamada con `preload: false` y la misma familia: se descarga solo si un texto la pide. Las dos llamadas emiten la familia con su nombre real, «Brygada 1918», sin hash, así que `font-serif italic` encuentra la cara itálica. [italic-probe.txt](italic-probe.txt): un `<em class="font-serif italic">` inyectado pide `308e5095…woff2` solo después de insertarse, y Chrome lo pinta con `Brygada-1918-Medium-Italic`, sin itálica sintética.
