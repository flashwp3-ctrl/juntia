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
