# Diálogos anclados arriba desde 768 px (decisión de los fundadores, 12 nov 2026)

Capturas del PR que ancla arriba los diálogos de escritorio. Desde 768 px, `Modal` (salvo las confirmaciones) y
`BottomSheet adaptive` van centrados en horizontal y empiezan a `max(48px, 8dvh)` más el inset seguro superior del borde
de arriba: 82 px a 768 × 1024 y 72 px a 1440 × 900. Si el contenido cambia de alto, el diálogo crece o se acorta por
abajo; si no cabe, se desplaza por dentro y nunca pasa de 16 px (más el inset inferior) del borde inferior.

Tomadas contra `juntia-dev` con un spec temporal de Playwright que no se commitea, con movimiento activo. Cada captura
espera a que termine la entrada (el panel con opacidad 1 y sin transform) y dos fotogramas más. Viewports: 768 × 1024
y 1440 × 900, escala 1. Pareja sembrada (Sara y Tomás) con los movimientos compartidos del mes en curso. Tomadas
sobre la rama ya rebasada en `main` con el PR #79 (`35c9b62`); antes del rebase las medidas eran las mismas.

## Índice

| Captura | Qué muestra |
| --- | --- |
| `anotar-gasto-{768,1440}-{light,dark}.png` | Anotar en Gasto, recién abierto con `N`: rejilla de 3 × 3 y «Dinero del mes» |
| `anotar-ingreso-{768,1440}-{light,dark}.png` | El mismo diálogo tras pulsar «Ingreso»: sin la rejilla de gasto ni «Dinero del mes». El encabezado y el segmentado siguen en el mismo sitio; el diálogo se acorta por abajo |
| `meta-aportar-{768,1440}-{light,dark}.png` | Aportar a la meta compartida «Viaje a Cartagena», con 250.000 escritos (aparece la vista previa) |
| `presupuesto-conflicto-{768,1440}-{light,dark}.png` | Editar Mercado en Nosotros tras un conflicto de versión: Tomás lo cambió antes, el campo pasa al valor vigente, «Tu cambio: $850.000» debajo y el aviso con «Revisar» |

## Medidas (borde superior, alto y borde inferior del panel, en px)

| Viewport | Anotar Gasto | Anotar Ingreso | Segmentado (y) Gasto → Ingreso | Aportar vacío → con monto | Presupuesto al abrir → con conflicto |
| --- | --- | --- | --- | --- | --- |
| 768 × 1024 | 82 · 688 · 770 | 82 · 544 · 626 | 159,9 → 159,9 | 82 · 496 → 82 · 553 | 82 · 583 → 82 · 619 |
| 1440 × 900 | 72 · 688 · 760 | 72 · 544 · 616 | 150,0 → 150,0 | 72 · 496 → 72 · 553 | 72 · 643 → 72 · 680 |

Claro y oscuro dan las mismas medidas, salvo el alto del presupuesto, que crece entre pasadas porque cada una añade una
fila al historial de Mercado (la pareja es la misma en las cuatro). El borde superior no cambia en ningún caso.

**Antes del cambio** (misma E2E sobre `main` en `3520896`, centrado con `grid place-items-center`): Gasto → Ingreso
movía el segmentado **72 px** a 768 y a 1440 (el diálogo pierde 144 px de alto y se recentraba la mitad) y **144 px** a
390, donde la hoja está anclada abajo y su borde superior bajaba todo lo que perdía.

**En el celular (390 × 844)**, después del cambio: la hoja de Anotar conserva su alto entre los dos modos (702 px, borde
superior en 142 px en Gasto y en Ingreso). El espacio que deja la rejilla queda encima del pie, que sigue fijo al fondo.

## Por qué `max(48px, 8dvh)`

- La hoja de Anotar en Gasto mide 688 px y es el diálogo más alto de uso diario. Con 8dvh cabe entera sin desplazarse
  desde unos 765 px de alto de ventana (un portátil de 1366 × 768); con 10dvh haría falta 782.
- A 1440 × 900 queda a 72 px del borde, 34 px más arriba que centrada (106 px): la composición de los comps, que
  centraban un diálogo de ese alto, apenas cambia.
- El mínimo de 48 px evita que en ventanas bajas el diálogo toque el borde superior.

## Lo que no cambia

- Las confirmaciones (`size="confirm"`, `alertdialog`) siguen centradas: tienen alto fijo y, si aparece su aviso de
  error, centradas sus botones bajan la mitad de lo que bajarían ancladas arriba.
- Por debajo de 768 px, `Modal` sigue centrado y `BottomSheet` sigue siendo la hoja anclada abajo.
- Entrada y salida: escala .98 → 1 con opacidad en el diálogo y spring desde abajo en la hoja; con movimiento reducido,
  solo fundido (MOTION_SYSTEM.md). El anclaje vive en el contenedor fijo, no en el panel, así que la escala no se mezcla
  con la posición.
