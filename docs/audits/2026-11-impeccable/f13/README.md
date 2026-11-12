# Capturas de F13: texto ampliado (auditoría de Impeccable, noviembre de 2026)

F13 pasa a `rem` los tamaños de texto para que, con la letra del sistema o del navegador al 200 %, crezca todo el texto y no solo los botones. Decisión de los fundadores del 11 de noviembre de 2026: **con el texto ampliado, todo el texto escala**.

Las capturas salen de un spec temporal de Playwright que **no se commitea**, corrido con `npm run e2e:dev -- <spec>` contra juntia-dev. Usa la pareja dorada (`seedCouple` con `golden: true`), los movimientos privados de Sara y los compartidos del mes en curso. Siete pantallas en Nosotros (Inicio también en Yo), a 390 y 1440 px, en claro y oscuro: `inicio-yo`, `inicio-nosotros`, `actividad`, `balance`, `metas`, `plan` y `cuenta`. El 200 % es `html { font-size: 200% !important }`, inyectado antes de pintar. El correo de la cuenta sembrada, que es aleatorio, va tapado en magenta. Son capturas de iteración, no evidencia de gate (ADR-011 §9.8).

Nombre de archivo: `pantalla-ancho-tema.png`.

| Carpeta | Qué es |
| --- | --- |
| `100/` | La rama a la escala por defecto. Es idéntica al píxel a `main` (`f23fb97`) salvo lo que se explica abajo. Las de `main` no se guardan aquí porque son las mismas |
| `200-antes/` | `main` en `f23fb97` con la raíz al 200 %: botones gigantes y filas, importes y etiquetas a 11–15 px; Actividad ensancha la página a 841 px |
| `200-despues/` | La rama con la raíz al 200 % |

## 1. A la escala por defecto no cambia nada

Comparación píxel a píxel de las 28 capturas de `main` y de la rama, las dos tomadas con el mismo spec y la misma máscara (`compare.mjs`: R, G y B exactos, sin tolerancia):

| Resultado | Capturas | Por qué |
| --- | --- | --- |
| Idénticas | 25 de 28 | — |
| `actividad-390-light` y `actividad-390-dark` | 2 | En `main` la página mide **585 px** de ancho a 390, con la escala por defecto: los nombres `sr-only` de las fichas de categoría son `absolute` y su bloque contenedor quedaba fuera del scroller de F16, que por eso no los recortaba. La rama hace `relative` al scroller y la página vuelve a medir 390. **Los 390 px visibles son idénticos byte a byte**; solo desaparece el lienzo sobrante de la derecha |
| `actividad-1440-light` | 1 | 5 píxeles sueltos en x = 287, uno por fila de la tabla, con un nivel de diferencia en cada canal (246,242,234 → 247,243,235). No es visible. Aparecen desde que el scroller de fichas es `relative` (una pasada de la rama sin ese cambio dio 0 píxeles) y se repiten igual en dos pasadas. La hipótesis, no comprobada, es el redondeo del suavizado en la esquina de cada fila al cambiar el orden de pintado; no hay cambio de tamaño ni de posición |

## 2. Con la raíz al 200 % crece todo el texto, sin recortes ni scroll horizontal a 390

`200-despues/` a 390, en claro y oscuro: `scrollWidth` igual a `clientWidth` (390) en las siete pantallas, ningún texto cortado (la comprobación `overflow` de `tests/support/a11y.ts`) y **ningún nodo de texto visible por debajo de 18 px** (en `main` quedaban «Gasto noviembre» a 12 px, «HOY · 11 NOV» a 11, «Le deben 859.800» a 13, etc.).

Lo que hizo falta, además de pasar a `rem`, para que el texto ampliado quepa a 390:

| Dónde | Qué pasaba al 200 % | Qué hace ahora |
| --- | --- | --- |
| Filas de movimiento, aporte y liquidación (`.row-stack`) | El título quedaba en dos letras («Ca…») junto a la cifra | Con la fila por debajo de 18rem (nunca a 16 px), la cifra baja a una segunda línea bajo el texto (RESPONSIVE: «las filas pasan a 2 líneas») |
| Cifras héroe y de resumen (Inicio, Metas, detalle, Actividad) | `$11.340.000` a 80 px se salía de la pantalla | `--money-l-fit` y `--money-m-fit`: crecen hasta donde cabe la columna; a 16 px dan el token exacto |
| Saldo de Balance | Se salía de su tarjeta a 1440 | Se ajusta a su tarjeta con `cqi` |
| Columnas de ícono de 40 y 44 px, avatar de 52/72/88, campo del reparto | La ficha (en rem) se salía de su columna en px y montaba el texto | Columnas y tamaños en `rem` |
| Botón `lg` | «Crear presupuesto» se salía | Alto mínimo y dos líneas si hace falta |
| Plan (indicador de presupuesto) | Nombre e importe se montaban | La fila se parte en dos líneas |
| Desglose de Balance | Las partes «S» y «T» se tocaban; el total se salía 2 px | Las partes se apilan y el total baja de línea |
| Selector de mes de Actividad | «Noviembre» montaba la flecha | Por debajo de 19rem el mes sube a su línea y las flechas quedan debajo |
| Tarjeta de meta | «Bicicleta» se partía («Bicicl de…») | El título no pasa de 8vw (el tamaño de 390 a 16 px) |
| Sidebar desde 1280 | Ancho fijo de 248 px: «Yo/Nosotros», los destinos y la cuenta se montaban | Ancho en `rem` (15,5) y altos mínimos |

## 3. Lo que no se resolvió, y por qué

- **1440 con la raíz al 200 %: Inicio mide 1.535 px (Yo) y 1.456 (Nosotros).** El abanico de metas desde `lg` tiene una geometría fija en px (cartas de 280 px desplazadas 224 y 448). Esta combinación no la ve nadie: los breakpoints de Tailwind están en `rem` y, con la letra del navegador o del sistema al 200 %, las media queries también se doblan, así que una pantalla de 1440 px se presenta con el diseño de menos de `lg`, donde el abanico es una pila y no desborda. La raíz inyectada solo dobla la raíz, no las media queries. **Esto se razonó, no se midió**: emular el ajuste real con `Page.setFontSizes` de CDP no cambió la raíz en este Chromium. Las otras cinco pantallas a 1440 no desbordan.
- **Títulos truncados con elipsis** (el encabezado «Hola, S…» de F08, descripciones largas en filas): son truncados intencionados y el nombre completo está en el nombre accesible. El selector de contexto no se monta sobre el título.
- Hojas, diálogos, A1–A6 e invitación no están en el recorrido de capturas.
