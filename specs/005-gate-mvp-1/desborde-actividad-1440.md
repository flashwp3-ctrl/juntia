# Desbordamiento de Actividad con datos extremos a 1440 px — 005

**Qué es.** La corrección de un desbordamiento horizontal que encontró el barrido local de la revisión del PR #116 (F111-12).
Los fundadores la autorizaron el 26 nov 2026 («Sí, autorizado») como ampliación expresa de la excepción de 30.2, y está
registrada en el maestro, decisión 30, «Ampliación de la excepción de 30.2: desbordamiento de Actividad a 1440 px».

Las cifras salen de juntia-dev con datos ficticios: son iteración, no evidencia de CI.

## El fallo

- **Dónde:** `/actividad · Actividad con datos extremos` a 1440 px, en claro y en oscuro.
- **Qué fallaba:** `assertLayout` de `tests/a11y/routes.a11y.ts` (casos `@sweep`), porque el documento medía 1511 px. Con
  `routes.a11y.ts` de `bab833a` fallaba igual: el fallo es previo al PR #116.
- **Datos extremos:** `seedMovements(…, "extreme")` siembra un gasto de 999.999.999 con la descripción más larga que admite el
  esquema (140 caracteres), y el nombre de perfil más largo (60).

## La causa, demostrada

Arnés `tests/evidence/actividad-1440.capture.ts`. Corre solo con `ACT1440=1 npm run e2e:dev -- tests/evidence/actividad-1440.capture.ts`
y siembra esos datos. A 1440, con y sin el panel de detalle abierto, mide la columna de la lista, la tabla, cada celda de la
primera fila y la descripción. Después repite la medición con CSS de prueba inyectado **solo en la página del arnés**, no en el
producto.

**Sin cambios** (`main` en `67e4f2a`, 1440 px, claro; igual en oscuro y con el panel abierto):

| Medida | Valor |
| --- | ---: |
| Columnas de la rejilla lista/panel | `680px 400px` |
| Columna de la lista | 680 px |
| Tabla (`table-layout: auto`) | **1222,69 px** |
| Celdas de la primera fila: descripción / fecha / importe | **1058,81** / 41,98 / 121,89 |
| Descripción (`span.truncate`): `clientWidth` = `scrollWidth` | **1001 px**: no se recortaba |
| Documento (`scrollWidth`) | **1511 px** |

**Experimentos** (CSS inyectado en la página de prueba):

| CSS | Tabla | Celdas | Documento |
| --- | ---: | --- | ---: |
| `table-layout: fixed` | 680 | 226,66 / 226,66 / 226,69: reparte las columnas a partes iguales y cambiaría el diseño | 1440 |
| `max-width: 0` en la 1.ª celda | 680 | 315,89 / 101,02 / 263,09 | 1440 |
| La descripción sin `nowrap` (solo para comprobar la causa) | 680 | 514,33 / 43,77 / 121,91 | 1440 |

**Causa.**

- La tabla de escritorio de Actividad en Yo (`src/features/activity/activity-view.tsx`, `Table`) usa layout automático.
- En ese layout, el ancho mínimo de una celda es el de su contenido sin romper: la descripción va en una sola línea
  (`truncate`, que incluye `white-space: nowrap`) y la elipsis nunca llegaba a aplicarse. Con 140 caracteres, la celda pedía
  1058,81 px y la tabla salía 542,69 px de su columna de 680.
- Con el panel de detalle abierto, la tabla pasa por debajo del panel y **los importes quedan ocultos tras él** (captura
  `antes-panel-abierto-light-1440`).
- La regresión muestra además que **ya fallaba a 1280** (documento de 1511/1280; tabla de 1223 en una columna de 520). Las
  pruebas de 390 y 1440 no lo cubrían.

## La corrección

En `activity-view.tsx`, la celda de la descripción de cada fila de la tabla pasa a `w-full max-w-0`:

- **`max-w-0`:** la celda deja de pedir el ancho de la descripción entera, y el `truncate` que ya tenía recorta con elipsis.
- **`w-full`:** esa columna se queda con el espacio que sobra, así que la fecha y el importe conservan su ancho de contenido.

Es un cambio de presentación de 1 línea, con su comentario.

**Por qué esta y no otra.** `table-layout: fixed` reparte las columnas por igual y cambia el diseño. Dejar que la descripción
salte de línea cambia el diseño de la fila. Las dos se descartan.

**Después** (1440, claro):

| Medida | Valor |
| --- | ---: |
| Tabla / columna | 680 / 680 px |
| Celdas: descripción / fecha / importe | 516,13 / **41,98** / **121,89** (fecha e importe, igual que antes) |
| Documento | 1440 px |

A 1280: tabla y columna de 520 px, y documento de 1280.

## Condiciones de la autorización → evidencia

| Condición | Evidencia |
| --- | --- |
| Causa demostrada antes de corregir | Tablas de arriba (arnés, sin tocar el producto) |
| Solo presentación estrictamente necesaria; sin rediseñar | 1 línea de clases en una celda (`git diff -- src`). Fecha e importe con el mismo ancho que antes |
| Sin ocultar el desbordamiento ni `overflow-x-hidden` global | No se añade ningún `overflow`; la tabla cabe en su columna |
| Sin recortar cifras: todos los dígitos y signos | La regresión comprueba en cada ancho y tema que el importe `$999.999.999` está a la vista, sin recortar (`scrollWidth` ≤ `clientWidth`) y dentro de la ventana. Se recorta, con elipsis, solo la descripción, que ya era `truncate` y se lee entera en el detalle y en el nombre accesible del enlace |
| Sin reducir la tipografía; se mantiene el 200 % | No se toca ninguna fuente. La regresión comprueba la raíz al 200 % a 390, en los dos temas: 390/390 |
| Responsive, accesibilidad y panel de detalle | Por debajo de 1280, la lista por días no cambia. El panel sigue a la derecha. Suite axe a 390: ver el PR. Componentes de Actividad: 39/39 |
| Regresión con datos extremos, en claro y oscuro, en los 7 anchos y con el panel abierto | `tests/a11y/routes.a11y.ts`, «Actividad con datos extremos: siete anchos, dos temas, lista y panel de detalle abierto…» (`@sweep`). **Sin la corrección falla** (documento de 1511 a 1280 y 1440, en los dos temas y las dos vistas). **Con ella pasa** |
| Sin consultas, permisos, filtros, validaciones, fórmulas ni servidor | `git diff -- src` toca solo `activity-view.tsx`, en clases de presentación. No se aplicó la regla de parada |
| Ampliación registrada en el maestro | Decisión 30, «Ampliación de la excepción de 30.2: desbordamiento de Actividad a 1440 px» |

## Capturas

En `evidence/actividad-1440/`, datos ficticios:

- `antes-panel-abierto-light-1440` y `despues-panel-abierto-light-1440`;
- `antes-lista-dark-1280` y `despues-lista-dark-1280`.

## Observaciones fuera de alcance (no corregidas)

- **La tabla de Actividad en Nosotros** (`couple-activity-view.tsx`) y las filas de metas en la tabla (`goal-entry-cells.tsx`)
  tienen el mismo patrón: layout automático con la descripción `truncate`. No hay datos extremos de Nosotros en las pruebas, y
  no se ha medido. Si se quiere corregir, necesita su propia autorización.
- **Inicio en Yo al 200 % a 390 desborda** («Yo con la parte compartida · 200 %», de `tests/a11y/couple-shared.a11y.ts`:
  434/390). Se salen «Compartido · tu parte $…» y «Ver todo». Es previo: con `activity-view.tsx` de la base falla igual. Es
  ajeno a esta corrección.
