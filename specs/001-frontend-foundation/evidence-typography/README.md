# Evidencia · decisión 14 (tipografía de marca)

Fecha: 4 de noviembre de 2026. Build de producción servido con `JUNTIA_INTERNAL_SURFACE=1 next start -p 3100` (el 3000 lo ocupaba otro proceso). La línea base de `main` (`f6ef453`, con Geist) se compiló en un worktree aparte y se sirvió en el 3200 con el mismo comando. Chromium de Playwright 1.64.1 en Windows 11. Los arneses son desechables y se copian en [`harness/`](harness/); no forman parte de `tests/`.

## Capturas para los fundadores

32 PNG de página completa: las seis rutas de producto, «no encontrado» (`ruta-que-no-existe`) y `/interno/primitivos`, a 390 y 1440 px, en claro y oscuro. Nombre: `<ruta>-<ancho>-<tema>.png`. [captures.txt](captures.txt) registra el estado HTTP de cada carga y las fuentes cargadas al capturar.

La marca `[P]` de Spline Sans Mono (`meta.mono`) sigue abierta: solo aparece en `/interno/primitivos` y la cierran los fundadores al ver estas capturas.

## Resultados

| Verificación | Resultado | Salida |
| --- | --- | --- |
| `npm run verify` | Pasa: lint, typecheck, 85 pruebas de componentes | [verify.txt](verify.txt) |
| `test:a11y` (axe) | 36 de 36 | [a11y.txt](a11y.txt) |
| `check:internal-surface` | 12 de 12 OK, sin fuga | [check-internal-surface.txt](check-internal-surface.txt) |
| `check:theme-script` | 5 de 5 OK | [check-theme-script.txt](check-theme-script.txt) |
| R2: 6 rutas × 2 temas, CPU 6×, 400 kbit/s, 400 ms | **CLS = 0 en 12 de 12**, sin cuadro del tema contrario; el control negativo detecta el destello | [cls-r2.txt](cls-r2.txt) |
| Repetición de R2, 4 iteraciones | **0 de 48 con CLS > 0**, sin cuadro del tema contrario | [cls-repeat-48.txt](cls-repeat-48.txt) |
| Scroll horizontal: 8 rutas × 360, 390, 430, 768, 1024, 1280 y 1440 × 2 temas | 0 de 112 | [verify-typo.txt](verify-typo.txt) `HSCROLL` |
| Texto al 200 % a 360 y 390, 6 rutas × 2 temas | Sin scroll, título sin solaparse con el selector | [verify-typo.txt](verify-typo.txt) `TEXT_200` |
| Contraste de texto, 8 rutas × 390 y 1440 × 2 temas | Todos ≥ 4,5:1 salvo el botón `aria-disabled` de la superficie interna (4,3:1, `#6C665B` sobre `#E7DFD0`), idéntico en `main` y exento por ser un control inactivo | [verify-typo.txt](verify-typo.txt) `CONTRAST` |
| JavaScript por ruta, misma medición en `main` y en la rama | Transferido igual (236,8 KB con gzip de `next start`); decodificado +0,3 KB (750,9 → 751,2 KB) por las clases de los titulares | [js-per-route.txt](js-per-route.txt) |
| Fuentes precargadas | 70,1 KB en `main` → 70,0 KB: la itálica de Brygada no se precarga | Ver abajo |
| `impeccable detect` por URL, 8 rutas × 1440 y 390 | `overused-font`: 0 (en `main`: «Primary font: geist»). Quedan `icon-tile-stack` (ficha de 88 px del estado, anatomía aprobada) y `nested-cards` en la superficie interna. La 404 no se puede escanear por URL (responde 404) | [impeccable-detect.txt](impeccable-detect.txt) |

### Respaldo calibrado (D-01)

`size-adjust` por peso, medido como relación de anchos sobre las 134 cadenas de `src/lib/copy/es.ts` ([`harness/ratios.cjs`](harness/ratios.cjs)): Onest/Arial 400 → 1,0398, 500 → 1,0508, 600 → 0,9900; Brygada/Georgia 400 → 1,0415, 500 → 1,0501, 600 → 0,9079, 700 → 0,9253, e itálicas. Las sobreescrituras verticales son las de cada fuente divididas por el ajuste.

**Desviación de la media en Onest 400: se usa 1,049.** Con 1,0398, la descripción de «no encontrado» cortaba distinto a 360 px y su primera línea se movía 18,5 px. Barrido de cada ancho entre 360 y 1023 px, donde los estados van centrados ([fallback-sweep.txt](fallback-sweep.txt)):

| | Rutas de producto, máximo | «No encontrado» |
| --- | --- | --- |
| `main` (Geist) | 2,08 px | cambia de corte en 4 anchos (370–373), hasta 8,6 px |
| Rama, Onest 400 = 1,0398 | 2,38 px | 9 anchos, entre ellos 360 |
| **Rama, Onest 400 = 1,049** | **2,38 px** | 4 anchos (362, 363, 384, 385), hasta 20 px |

Chrome ignora movimientos de menos de 3 px. La 404 no está en R2; en 360, 390, 1024 y 1440 su residuo es 0,9 px. Los cuatro anchos que quedan son de la misma clase que ya tenía `main`.

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
