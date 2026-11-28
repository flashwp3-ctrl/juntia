# Los dos fallos del paso 4b sobre el candidato del MVP-1 — 005

**Qué es.** La corrección de los dos fallos del barrido completo de accesibilidad del paso 4b sobre `main` en `64d2cb9` (job
`a11y-session`, 157/159). La autorizaron los fundadores el 27 nov 2026 («Sí, autorizado, corrige los dos en un PR aparte») y está
registrada en el maestro, decisión 30, «Ampliación: los dos fallos del paso 4b…».

Las cifras salen de juntia-dev con datos ficticios: son iteración, no evidencia de CI. Los arneses están en
`tests/evidence/desbordes-117.capture.ts` (casos 9 a 12) y `tests/evidence/cifras-webkit.capture.ts`.

## 1. Análisis en Nosotros a 320 con la raíz al 200 % (`src/features/analysis/month-chart.tsx`)

**Reproducción.** El documento mide 321/320 en local y 326/320 en CI, con la PlanningNote y las cifras exactas abiertas.

**Causa.** La tabla «Ver cifras exactas» tiene layout automático y pedía **280,6 px** en un `figure` de **240**. El mes no baja de
«Octubre» y el importe va entero en una línea (155,5 px): ni sin relleno caben los dos en una fila. A 360 al 200 % también se
salía 0,63 px de su `figure`, sin crear scroll.

**Corrección.** Una container query sobre el `figure` (`@container/cifras`). Por debajo de 17rem, cada fila es una línea flexible:
el mes y el importe en la misma línea si caben y, si no, el importe entero en la siguiente, alineado a la derecha.

- **Cuándo se activa:** solo con el texto ampliado. Al 100 %, el `figure` mide 17,5rem o más.
- **No depende de los datos:** una fila con un mes o un importe más largos también envuelve.
- **Semántica:** los roles ARIA explícitos (`table`, `rowgroup`, `row`, `columnheader`, `rowheader`, `cell`) la conservan al
  cambiar el `display`.

**Medición.** Geometría del `figure`, de la tabla, de las filas y de las celdas, relativa al `figure`:

| | Chromium | WebKit |
| --- | --- | --- |
| 100 %, 8 medidas (los 7 anchos y 320) | 0 diferencias | 0 diferencias |
| `ariaSnapshot`, 11 medidas | idéntico | idéntico |
| 320 al 200 %: tabla en su `figure` | 280,63 → **240**/240 | 280,63 → **240**/240 |
| 360 al 200 % | 280,63 → **280**/280 | 280,63 → **280**/280 |
| 390 al 200 % | 310/310 | 310/310 |
| Documento a 320 al 200 % | 321 → **320** | 321 → **320** |

**El árbol real del navegador.** Chromium expone (CDP `Accessibility.getFullAXTree`), al 100 % y al 200 %: `table` «Gasto por mes,
en pesos», 2 `rowgroup`, 2 `row`, `columnheader` «MES» y «GASTO», `rowheader` «Octubre 2026» y `cell` «$2.840.000».

- Sin los roles, Chromium conserva la tabla, pero no expone el `rowgroup` del `thead`.
- `ariaSnapshot` calcula los roles desde el DOM, así que no ve el árbol real.
- El árbol real de WebKit no se puede consultar desde Playwright. En WebKit, los roles son la defensa documentada para cuando
  cambia el `display`.

**Regresión** (`tests/a11y/analysis.a11y.ts`): en los 7 anchos al 100 % y a 320, 360 y 390 al 200 %, la tabla cabe en su `figure`
y cada importe se ve entero, dentro del `figure` y de la ventana. Sin la corrección fallan 320 y 360 al 200 %, y también el «sin
scroll horizontal» que ya existía.

## 2. La hoja M3 «Invitar a mi pareja» a 390 al 200 % (`SheetTitle`, `src/components/ui/modal.tsx`)

**Reproducción.** En local la prueba pasa, pero por **1,2 px**: el título acaba en 260,8 y la × empieza en 262. En CI falla. El
gestor aprobó seguir con la causa medida.

**Causa.** `SheetTitle` (corrección 5 del PR B) ajusta el título al 200 % para que su palabra más ancha llene **exactamente** la
columna central: `min(1.4375rem, 100cqi / --title-em)`.

- **La estimación:** `--title-em` salía de `longestWordEm`, una estimación por clases de letra (estrechas, medias, anchas,
  mayúsculas, el resto).
- **El margen real:** para «Invitar» daba 3,17 em, y su ancho real en el DOM (Brygada 1918 500 con el tracking −0,015 em del
  título) es **3,114 em**. Quedaba un 1,8 % de holgura, y a «Anotar» un 1,9 %.
- **Por qué falla en CI:** allí el texto se pinta ~2 % más ancho (Análisis: tabla de 286 px en CI frente a 280,6 en local,
  +1,9 %), y «Invitar» salía de su columna.

**Corrección.** `sheetTitleEm` (`src/lib/text-fit.ts`), que solo usa `SheetTitle`:

- **Base:** la suma de los avances de **Brygada 1918 500**, medidos con canvas sobre la fuente real (tabla nueva, caso 10 del
  arnés). En las 23 palabras de los títulos, el ancho con kerning de canvas nunca supera esa suma.
- **Ajuste:** menos el tracking del título y más un **2 %** de margen entre plataformas (la diferencia medida, +1,9 %).
- **Redondeo:** hacia arriba.
- **Lo que no cambia:** `longestWordEm` (tarjetas de meta y acceso).

**Medición** (caso 11; las 11 hojas que se abren con `tests/support/sheets.ts`):

- **Al 100 %: 0 diferencias** en 77 medidas (11 hojas × 7 anchos: tamaño, columna y caja del título). Manda el tope de 1,4375rem,
  23 px.
- **Al 200 %:**

| Hoja | 390 · antes → después (px, % del tope de 46 px) | Holgura de la palabra más ancha |
| --- | --- | --- |
| Invitar a mi pareja | 42,27 (91,9 %) → 41,74 (90,7 %), −1,3 % | 1,79 % → 3,09 % |
| Anotar gasto | 31,78 (69,1 %) → 31,29 (68,0 %), −1,5 % | 1,92 % → 3,52 % |
| Anotar ingreso | 28,41 → 29,06, +2,3 % | 5,04 % → 2,72 % |
| Editar gasto | 34,34 → 35,05, +2,1 % | 4,25 % → 2,14 % |
| Crear / Editar presupuesto | 17,17 → 17,68, +3,0 % | 5,39 % → 2,42 % |
| Nueva meta | 34 → 34,93, +2,7 % | 6,41 % → 3,58 % |
| Registrar aporte | 22,62 → 23,34, +3,2 % | 6,37 % → 3,03 % |
| Retirar de la meta | 30,27 → 30,36, +0,3 % | 3,58 % → 3,27 % |
| Registrar liquidación | 19,1 → 19,28, +0,9 % | 3,12 % → 2,16 % |
| Exportar mis datos | 24,4 → 24,46, +0,2 % | 2,68 % → 2,43 % |

  - **Solo se reducen** las dos hojas que tenían menos del 2 % de holgura. Las otras nueve **crecen**, porque la estimación anterior
    las reducía de más.
  - **La holgura mínima** pasa de 1,79 % a **2,14 %**.
  - A 320 y 360 al 200 % la proporción es la misma (tabla completa en el brief).
- **Observación, previa y fuera de alcance:** a 320 al 200 % la columna del título mide 32 px, y los títulos quedan entre 5,5 y
  20 px. Es el comportamiento aprobado de la corrección 5, que este PR no cambia.

**Regresión** (`tests/a11y/routes.a11y.ts`, `@sweep`): en las 11 hojas, a 320, 360 y 390 al 200 %, la palabra más ancha del título
cabe en su columna con un 2 % de holgura (`SHEET_TITLE_MARGIN`). Sin la corrección falla en «Invitar» y en «Anotar», en los tres
anchos. La prueba de CI («texto al 200 %: M3…») queda como estaba.

## Ronda 2 de la revisión (F119-1 a F119-5)

La revisión adversarial aceptó el alcance, el enfoque de Análisis, los roles, la tabla `BRYGADA_500` y las reducciones de −1,3 % y
−1,5 %. Los hallazgos eran de las pruebas, la evidencia y la documentación, y **no cambia el comportamiento del producto**: en
`src/lib/text-fit.ts` solo cambia el comentario del margen.

- **F119-1: el margen no se pide dos veces.** El 2 % lo reserva la estimación, así que la prueba no lo vuelve a exigir sobre el
  ancho renderizado.
  - **Estimación, sin navegador** (`src/lib/text-fit.test.ts`): para los 14 títulos, `sheetTitleEm` ≥ ancho real de referencia ×
    1,02. El ancho de referencia es el de Brygada 500 con el tracking, medido en el DOM (caso 10).
  - **Regresión negativa:** `longestWordEm` no llega a ese margen para «Invitar» ni para «Anotar». Sin la corrección
    (`sheetTitleEm` = `longestWordEm`), falla en «Invitar a mi pareja» y «Anotar gasto».
  - **Geometría real** (`routes.a11y.ts`): en las 14 hojas, a 320, 360 y 390 al 200 %, la palabra más ancha ≤ su columna (sin
    ×1,02), ninguna línea sale de la columna, el título no se recorta y no solapa botones. En local pasa también sin la corrección,
    porque el fallo necesita el pintado más ancho de CI; por eso la regresión negativa es la de la estimación.
- **F119-2: las 14 variantes.** `sheetCases` suma «Editar ingreso», «Enlace nuevo» (con una invitación pendiente) y «Editar meta».
  - Al 100 %, 0 diferencias en 98 medidas.
  - Al 200 %, las tres nuevas crecen: +2,3 %, +6,4 % y +2,1 %, con una holgura mínima del 2,14 % y sin recortes.
- **F119-3: el 2 % es un margen empírico provisional.** La medida de la diferencia entre plataformas es indirecta: la tabla de
  Análisis es Onest, con otros rellenos y otro reparto de columnas.
  - `measureSheetTitle` espera a `document.fonts.ready` y comprueba Brygada 1918 500 antes de medir.
  - La prueba de geometría deja en sus anotaciones las métricas de cada título (fuente cargada, palabra, columna y holgura). Así,
    el primer CI que la corra registra la medida directa en su plataforma.
- **F119-4: Análisis con seis meses extremos.** Prueba nueva: mayo a septiembre de 2026 con 1 a 5 gastos de 999.999.998 (hasta
  $4.999.999.990), más el octubre dorado. Exige los seis meses, en orden, con su mes y su importe completos calculados de las
  fixtures, en los 7 anchos y al 200 %; y que la tabla cerrada quede oculta con la container query activa.
  - **Sin la corrección**, falla también a 390 al 200 %: documento de 418 y tabla de 378,5 px. Es lo que un umbral fijo no habría
    cubierto.
  - **Con la corrección**, el documento es igual a la ventana en todos los casos.
- **Sobre la semántica:** `ariaSnapshot` calcula los roles desde el DOM. No equivale a comprobar lo que anuncia VoiceOver, ni el
  árbol real de WebKit, que Playwright no expone. En Chromium, el árbol real (CDP) se comprobó aparte.
- **F119-5:** la nota del maestro dice ahora «los dos en un PR aparte, el #119, con un commit por defecto», sin tocar el literal.

## Continuación: el paso 4b sobre `a21b1a9` (159/161)

### 1. `SheetTitle` en CI Linux

**Medida directa** (las 42 anotaciones de «hojas con SheetTitle al 200 %…» del run 46098875205):

- en las 42, la fuente está cargada y el tamaño de letra y la columna son idénticos a los locales;
- lo que cambia es el ancho pintado, y la diferencia es **por letra**: entre −0,42 y **+0,547 px**, a cualquier tamaño de 6 a 42 px;
- como razón va de 0,96 a 1,15, así que no es un porcentaje.

**Explicación (F120-2):** es una **hipótesis técnica fuertemente respaldada** por esas 42 medidas de palabras completas, **no demostrada glifo a glifo**: Chromium con FreeType en Linux redondea el avance de cada glifo a píxeles enteros.

**En CI no cabían 16 de 42:**

- **Reales, con más de 0,5 px de exceso:**
  - «liquidación» y «Registrar» a 320 (+4,02 y +3,02) y a 360 (+2,77 y +2,78);
  - «presupuesto» a 390 (+2,09) y a 360 (+0,95);
  - «Exportar» a 360 (+1,94);
  - «Retirar» a 360 (+0,77).
- **De redondeo**, entre +0,02 y +0,19 a 320: Editar, Exportar, Anotar, Enlace y Nueva.

**Corrección (opción B).** `sheetTitleSize` (`src/lib/text-fit.ts`) da a `SheetTitle` `min(1.4375rem, calc((100cqi −
letras·0,6px) / em), …)`, con un término por palabra. El `em` es la suma de avances de Brygada 500 menos el tracking, sin el 2 %, y
0,6 px por letra es una **reserva empírica** que cubre el máximo medido (0,547), **no una garantía universal**. La reserva va en px
porque, según esa hipótesis, el redondeo es por píxel del dispositivo. Al 100 % manda el tope.

**Medición** (arnés, caso 11; `a21b1a9` frente a la corrección):

- **Al 100 %:** 0 diferencias en 98 medidas.
- **Al 200 %:** bajan entre −0,8 % y −4,6 % a 390, entre −1,6 % y −7,5 % a 360, y entre −3,8 % y −19,1 % a 320. La tabla hoja por
  hoja está en el brief.

**Regresiones** (`src/lib/text-fit.test.ts`, 89 pruebas):

- en las 42 combinaciones, cada palabra cabe a su ancho real más 0,6 px por letra;
- el peor caso medido en Linux (ancho local + 0,547 px por letra) también cabe;
- con la fórmula del #119 no cabía en 16;
- sin la reserva fallan las 42 del peor caso.

La de geometría real (`routes.a11y.ts`) no cambia.

**Limitación previa a 320 al 200 %.** La columna del título mide 32 px (corrección 5), y los títulos quedan entre 4,5 y 10 px. Sin la
reserva, en Linux se cortan. Está en `docs/BACKLOG_MVP2.md` como defecto de diseño pendiente de valoración.

### 2. «SOLO TÚ» resuelto a 2 elementos (`couple.a11y.ts:53`)

**Qué pasa (F120-3).** En CI, `getByText` resolvió a 2 elementos, y el snapshot de CI tiene una sola copia accesible.

- **Mecanismo observado en local:** la copia oculta del streaming de React (`<div hidden id="S:0">`, por
  `src/app/(app)/loading.tsx`), que `getByText` sin filtro de visibilidad cuenta según el momento.
- **Explicación probable del duplicado exacto de CI** (la visible y una oculta a la vez): ese mismo streaming. No se reprodujo en
  local.

**Evidencia local** (arnés, caso 14): con la CPU ×10, 30 de 40 cargas tienen la pastilla solo dentro de `S:0` justo tras `goto`. Sin
freno, 40 de 40 visibles.

**Ni de `ExpenseRow` ni de `SheetTitle`.** Corrección, solo en la prueba: el localizador se acota al grupo «Estado de la pareja».

**El mismo patrón en otras pruebas.** Tratado: `:60`, `:84` y `:122` de `couple.a11y.ts`, acotados al grupo de estado (decisión del
gestor). Los demás no se tocan, porque tienen menos exposición (`:144`, `:162` y `:174`, tras una interacción) o ninguna.

## F120-1: la cabecera de las hojas con el texto ampliado

**El problema.** La revisión del #120 señaló que, con la reserva por letra, el título se achicaba al ampliar el texto: «Crear
presupuesto» pasaba de 23 px a 11,55 px a 360 y a 16,86 px a 390 al 200 %. Eso no acredita FR-042 ni WCAG 1.4.4.

**Autorización y enfoque.** Los fundadores autorizaron adaptar la cabecera (28 nov 2026) y aprobaron el enfoque («Sí, aprobado»):
un corte único y la reserva conservada. Las dos respuestas están en el maestro, decisión 30.

**Implementación.**

- **Las cabeceras:** las de las 6 consumidoras de `SheetTitle` pasan a ser `@container/sheethead`.
- **El título:** en `SheetTitle`, con la cabecera por debajo de `16.5rem`, el título ocupa la fila 2 a todo el ancho y crece hasta
  el tope (46 px al 200 %), en varias líneas si hace falta.
- **El corte:** la cabecera mide 17.5rem o más al 100 % y 14.88rem como mucho al 200 % (arnés, caso 15), así que nunca se activa al
  100 %.
- **Los controles:** `[&>:last-child]:col-start-3` deja la × en la columna 3, y Mi pareja suma `gap-y-2`. Ninguna de las dos
  clases hace nada con una sola fila.
- **Lo que no cambia:** el DOM (y con él el orden de los enfocables) y el único `Dialog.Title`.

**La reserva por letra, conservada.** Con el título en su fila, la fórmula solo manda a 320 al 200 %: «presupuesto» a 41,24 px y
«liquidación» a 45,06 px. Sin la reserva, «presupuesto» iría a 42,4 px, y con el peor caso medido en Linux (+0,547 px × 11 letras)
mediría unos 245 px en una fila de 240.

**Evidencia.**

- **Identidad al 100 %** (caso 18; las 14 hojas, los 7 anchos y los dos temas): 0 diferencias de geometría (cabecera, ×,
  espaciador o icono, título y primer campo, ±0,5 px) y **0 píxeles distintos** en las 196 capturas de la cabecera.
- **Al 200 %, a 320, 360 y 390:** 39 de 42 combinaciones a 46 px, y las 3 restantes (a 320) a lo que da la fórmula.
- **Regresión `@sweep`** (`routes.a11y.ts`): comprueba que el título crece, que va en su fila, que no hay recortes ni solapes, los
  controles de 88 px y en su sitio, un solo `Dialog.Title` y que los enfocables del diálogo, en orden del DOM, sean los mismos que al
  100 % (un inventario, no una navegación real con Tab; el teclado y el foco siguen en las verificaciones del gate). Con la implementación anterior falla en las 42
  combinaciones.
- **Iconos** (caso 17): la × (16×16) y el icono de la meta (22×22) no cambian. Que vayan en px fijos y no crezcan al 200 % es una
  observación previa, registrada en `docs/BACKLOG_MVP2.md`.
