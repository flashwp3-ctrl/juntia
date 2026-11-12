# Capturas de F13: texto ampliado (auditoría de Impeccable, noviembre de 2026)

F13 pasa a `rem` los tamaños de texto para que, con la letra del sistema o del navegador al 200 %, crezca todo el texto y no solo los botones. Decisión de los fundadores del 11 de noviembre de 2026: **con el texto ampliado, todo el texto escala**.

Las capturas salen de dos specs temporales de Playwright que **no se commitean**, corridos con `npm run e2e:dev -- <spec>` contra juntia-dev, uno sobre `main` (`f23fb97`, en un worktree aparte) y otro sobre la rama, el mismo día y con los mismos datos. El 200 % es `html { font-size: 200% !important }`, inyectado antes de pintar. Son capturas de iteración, no evidencia de gate (ADR-011 §9.8).

- **Recorrido F13**: la pareja dorada (`seedCouple` con `golden: true`), los movimientos privados de Sara y los compartidos del mes en curso. Siete pantallas en Nosotros (Inicio también en Yo), a 390 y 1440 px, en claro y oscuro: `inicio-yo`, `inicio-nosotros`, `actividad`, `balance`, `metas`, `plan` y `cuenta`. El correo de la cuenta sembrada, que es aleatorio, va tapado en magenta.
- **Recorrido F79** (revisión del PR #79): la misma pareja más una liquidación de hoy, un aporte de hoy y dos metas de nombre largo, «Emergencias» (compartida) y «Vacaciones familiares» (personal), que quedan al frente de su pila. Actividad en Nosotros (fila compartida, liquidación y aporte) y en Yo, Metas en Nosotros y en Yo, e Inicio en Nosotros.

Nombre de archivo: `pantalla-ancho-tema.png`.

| Carpeta | Qué es |
| --- | --- |
| `100/` | Recorrido F13 en la rama a la escala por defecto. Idéntico al píxel a `main` salvo lo que se explica abajo; las de `main` no se guardan porque son las mismas |
| `200-antes/` | Recorrido F13 en `main` con la raíz al 200 %: botones gigantes y filas, importes y etiquetas a 11–15 px; Actividad ensancha la página a 841 px |
| `200-despues/` | Recorrido F13 en la rama con la raíz al 200 % |
| `f79-320-360/` | Recorrido F79 en la rama a 320 y 360 px, raíz a 16 px, claro y oscuro: idéntico a `main` |
| `f79-200/` | Recorrido F79 en la rama a 320 y 390 px con la raíz al 200 % (32 px), claro |

## 1. A la escala por defecto no cambia nada

Comparación píxel a píxel de `main` y la rama (`compare.mjs`: R, G y B exactos, sin tolerancia):

| Recorrido | Resultado |
| --- | --- |
| F13 · 390 y 1440 (28) | **25 idénticas.** `actividad-390` claro y oscuro: idénticas byte a byte en los 390 px visibles; solo desaparece el lienzo sobrante (ver abajo). `actividad-1440-light`: 5 píxeles con un nivel de diferencia (ver abajo) |
| F79 · 320 y 360 (20) | **12 idénticas.** Las 8 de Actividad (Nosotros y Yo, 320 y 360, claro y oscuro): **idénticas byte a byte en la zona visible**; solo desaparece el lienzo sobrante. Ninguna fila se apila con la letra normal a 320 (`.row-stack`, 0 de 8 en Nosotros y 0 de 11 en Yo) |

- **El lienzo sobrante de Actividad** es un fallo que `main` ya tenía con la letra normal: a 390 la página medía 585 px de ancho (1.298 en Yo a 320). Los nombres `sr-only` de las fichas de categoría son `absolute` y su bloque contenedor quedaba fuera del scroller de F16, que por eso no los recortaba. La rama hace `relative` al scroller.
- **Los 5 píxeles de `actividad-1440-light`**: x = 287, uno por fila de la tabla, 246,242,234 → 247,243,235. No es visible. Aparecen desde que el scroller de fichas es `relative` (una pasada de la rama sin ese cambio dio 0) y se repiten igual en todas las pasadas. La hipótesis, no comprobada, es el redondeo del suavizado en la esquina de cada fila al cambiar el orden de pintado; no hay cambio de tamaño ni de posición.

## 2. Con la raíz al 200 % crece todo el texto, sin recortes ni scroll horizontal a 320 y 390

- **F13 a 390**, claro y oscuro: `scrollWidth` igual a `clientWidth` en las siete pantallas, ningún texto cortado (la comprobación `overflow` de `tests/support/a11y.ts`) y **ningún nodo de texto visible por debajo de 18 px** (en `main` quedaban «Gasto noviembre» a 12 px, «HOY · 11 NOV» a 11, «Le deben 859.800» a 13…).
- **F79 a 320 y 390**: sin scroll horizontal ni texto cortado en las cinco pantallas; todas las filas apiladas (8 de 8 y 11 de 11). El título de la meta crece y nunca se parte ni se recorta:

| Título | 320 · 16 px | 320 · 200 % | 390 · 16 px | 390 · 200 % |
| --- | --- | --- | --- | --- |
| «Emergencias» | 26 px | **31,2 px**, una línea | 31,2 px | **42,1 px**, una línea |
| «Vacaciones familiares» | 26 px | **35,6 px**, dos líneas | 31,2 px | **48 px**, dos líneas |
| «Japón» | 26 px | **52 px** | 31,2 px | **52 px** |

Lo que hizo falta, además de pasar a `rem`, para que el texto ampliado quepa. Nada de esto se activa a 16 px:

| Dónde | Qué pasaba al 200 % | Qué hace ahora |
| --- | --- | --- |
| Filas de movimiento, aporte, liquidación y menú de cuenta (`.row-stack`) | El título quedaba en dos letras («Ca…») junto a la cifra | Con la fila por debajo de 16rem (a 16 px la más estrecha, a 320, mide 17,5rem), la cifra baja a una segunda línea, a lo ancho de la fila y a la derecha (RESPONSIVE: «las filas pasan a 2 líneas») |
| Cifras héroe y de resumen (Inicio, Metas, detalle, Actividad) | `$11.340.000` a 80 px se salía de la pantalla | `--money-l-fit` y `--money-m-fit`: crecen hasta donde cabe la columna; a 16 px dan el token exacto. Excepción aceptada por el gestor (F79-3): su suelo sigue en px |
| Saldo de Balance | Se salía de su tarjeta a 1440 | Se ajusta a su tarjeta con `cqi` |
| Columnas de ícono de 40 y 44 px, avatar de 52/72/88, campo del reparto | La ficha (en rem) se salía de su columna en px y montaba el texto | Columnas y tamaños en `rem` |
| Botón `lg` | «Crear presupuesto» se salía | Alto mínimo y dos líneas si hace falta |
| Plan (indicador de presupuesto) | Nombre e importe se montaban | La fila se parte en dos líneas |
| Desglose de Balance | Las partes «S» y «T» se tocaban; el total se salía 2 px | Las partes se apilan (por debajo de 16rem) y el total baja de línea |
| Cabeceras del saldo (módulo de Inicio y de Balance) | «Ver balance ›» sacaba la flecha de la pantalla a 320 | `flex-wrap`: el enlace baja de línea |
| Selector de mes de Actividad | «Noviembre» montaba la flecha | Por debajo de 16rem el mes sube a su línea y las flechas quedan debajo |
| Segmentado «Todos · Gastos · Aportes» | A 320 los segmentos se montaban | Prop `wrap` (por defecto, los de ancho completo): por debajo de 16rem pasan a otra fila |
| Tarjeta de meta | El título se partía («Bicicl de…») o se recortaba; la que asoma por detrás se alargaba y tapaba «Ver todas» | Mínimo en rem y tope por el ancho de su palabra más larga (`longestWordEm`); relleno, ícono y reserva en px; la que asoma no reserva el alto de su contenido invisible por debajo de `lg` |
| Sidebar desde 1280 | Ancho fijo de 248 px: «Yo/Nosotros», los destinos y la cuenta se montaban | Ancho en `rem` (15,5) y altos mínimos |

## 3. Lo que no se resolvió, y por qué

- **1440 con la raíz al 200 %: Inicio en Yo mide 1.447 px.** El abanico de metas desde `lg` tiene una geometría fija en px (cartas de 280 px desplazadas 224 y 448). Esta combinación no la ve nadie: los breakpoints de Tailwind están en `rem` y, con la letra del navegador o del sistema al 200 %, las media queries también se doblan, así que una pantalla de 1440 px se presenta con el diseño de menos de `lg`, donde el abanico es una pila. La raíz inyectada solo dobla la raíz, no las media queries. **Esto se razonó, no se midió**: emular el ajuste real con `Page.setFontSizes` de CDP no cambió la raíz en este Chromium. Las otras seis pantallas a 1440 no desbordan.
- **Nombres de meta de tres o más líneas**: el título conserva `line-clamp-2`, como a 16 px. Un nombre largo de muchas palabras termina en «…» en la segunda línea con la letra normal y con la ampliada; el nombre completo está en el nombre accesible de la tarjeta.
- **Títulos truncados con elipsis** (el encabezado «Hola, S…» de F08, descripciones largas en filas): son truncados intencionados y el nombre completo está en el nombre accesible. El selector de contexto no se monta sobre el título.
- Hojas, diálogos, A1–A6 e invitación no están en el recorrido de capturas.
