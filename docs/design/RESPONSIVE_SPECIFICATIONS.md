# RESPONSIVE_SPECIFICATIONS.md — Juntia v1 · I2 Bosque & Arena
Lote 4 de 5. Visual: `Juntia DS v1 - 04 Pantallas.dc.html` (secciones 04·7 a 04·9).
Enfoque mobile-first: el diseño base es de 390 px y los breakpoints se aplican con `min-width`.

## Breakpoints
| Token | Ancho | Navegación | Contenedor | Cambios estructurales |
| --- | --- | --- | --- | --- |
| xs | 360 | Barra inferior flotante (4 destinos + Anotar al centro) | 1 columna, margen 20 (cards 14) | Importe héroe 36 px, titular 26. Las fichas de categoría con menos de 20% muestran solo ícono e importe abreviado (K). |
| sm | 390 | Igual | 1 columna | Base del diseño. Héroe 42 px. |
| md | 768 | Barra inferior centrada (máx. 560 px de ancho) | 12 columnas, margen 28 | Meta (7 col) + balance y Anotar (5 col). Recientes y categorías en 2 columnas. Las hojas pasan a diálogos centrados de 520 px. |
| lg | 1024 | **Rail lateral de 76 px** (íconos + Anotar), sin barra inferior | 12 columnas, margen 28 | Meta 7/12 · balance + Anotar 5/12. Sin la tarjeta de resumen «gasto vs. apartado» (se muestra en el texto del héroe). |
| xl | 1280 | **Sidebar de 248 px** con contexto, navegación, Anotar fijo y perfil | 12 columnas, margen 28–40 | Aparece la tarjeta resumen junto al héroe. Actividad en modo maestro-detalle desde 1280. |
| 2xl | 1440 | Sidebar de 248 px | Máximo 1440, margen 40 | Héroe 52–58 px, foto de meta de 470 px de alto. Detalle de 400 px fijo a la derecha en Actividad. |

## Reglas por patrón
- **Contexto Yo/Nosotros:** arriba a la derecha en móvil y tablet; dentro del sidebar en xl y 2xl; en lg, el primer ítem del rail abre un popover con el segmentado.
- **Anotar gasto:** botón central de la barra en móvil y tablet; botón al final del rail en lg; bloque bosque en el sidebar en xl y 2xl, con el atajo `N` visible. Siempre a un toque.
- **Sheets y diálogos:** bottom sheet con dos paradas por debajo de md; desde md, diálogo centrado de 520 px con scrim, foco atrapado y Escape para cerrar. La meta inmersiva nunca es un diálogo: es una ruta.
- **Metas:** pila apilada hasta md; desde lg, la pila se abre en abanico (la tarjeta trasera girada 4°) y aparece «+» para crear una meta. La meta inmersiva usa la foto a pantalla completa y la hoja en móvil; desde lg, la foto ocupa 820 px y el panel de información va a la derecha (I2·4).
- **Listas:** 3 columnas lógicas en móvil (ficha · texto · importe). Desde xl, tabla de 5 columnas con encabezados y el detalle en un panel lateral, sin cambiar de ruta. La fila seleccionada usa fondo sunken.
- **Gráficos:** en móvil, 6 meses con etiquetas abreviadas; desde lg, 12 meses con tooltip accesible por teclado. Siempre hay una tabla equivalente oculta.
- **Shared Balance:** en móvil, pantalla propia con barras de 28 px; desde lg, un módulo en Inicio con barras de 16 px y enlace al desglose.
- **Tipografía fluida:** `money.l: clamp(32px, 8vw, 40px)` · `money.xl: clamp(40px, 4vw, 52px)` · `display.xl: clamp(44px, 4.2vw, 64px)`.
- **Importes largos:** se prueban con $999.999.999. Si el importe no cabe, se reduce con clamp hasta 28 px, sin cortarlo. En filas, el título se corta con elipsis y el importe nunca.
- **Texto ampliado (200%):** las filas pasan a 2 líneas, los segmentados pasan a apilarse verticalmente y la barra inferior oculta las etiquetas y conserva `aria-label`.
- **Safe areas:** `env(safe-area-inset-*)` en la barra inferior, las hojas y la meta inmersiva.

## Pendiente [V]
- Altura real del teclado nativo en Android con la hoja de Anotar abierta (`visualViewport`).
- Rendimiento del abanico de metas en lg con 6 metas o más.

## Cuenta
- **360:** el título del encabezado baja a serif 30 para que entren el AccountButton (44) y el segmented. Las filas pasan a 2 líneas con texto al 200%.
- **390:** pantalla apilada sin barra inferior. Hojas para invitar; diálogo de confirmación centrado.
- **768:** una columna centrada de 600 px. Las hojas pasan a diálogo de 520.
- **1024:** rail de 76 con avatar «Mi cuenta» al pie. Contenido en una columna de 680.
- **1280 / 1440:** sidebar con el perfil al pie. Dos columnas: identidad y secciones (360) + sección abierta (máx. 680). Sin columnas más anchas de 680 para que la lectura no se estire.
