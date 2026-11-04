# Evidencia · CLS de «no encontrado»

Fecha: 4 de noviembre de 2026. Corrige el pendiente declarado en [`../evidence-typography/README.md`](../evidence-typography/README.md): con Onest, la descripción de «no encontrado» se movía al llegar la fuente a 362, 363, 384 y 385 px (CLS 0,001625 y 0,000826 en carga fría). El maestro §15.7 exige CLS = 0 exacto.

Build de producción servido con `JUNTIA_INTERNAL_SURFACE=1 next start -p 3100`, Chromium de Playwright 1.64.1, Windows 11. Los arneses son desechables y se copian en [`harness/`](harness/).

## Causa

Por debajo de `lg`, la descripción de los estados (`StateBlock` en `src/components/shell/provisional-state.tsx`) ocupaba todo el ancho disponible, hasta 22rem. Entre 360 y 392 px ese ancho cambia con el viewport. En algunos anchos, el respaldo calibrado y Onest cortan la línea en palabras distintas, y al llegar la fuente el texto centrado se mueve. Ningún `size-adjust` puede igualar el corte en todos los anchos.

## Corrección

La descripción tiene un ancho máximo fijo de **20rem (320 px)** por debajo de `lg`. Desde 360 px, el ancho es siempre 320 px y el corte de línea es el que ya se había comprobado sin movimiento a 360 px. En `lg` no cambia nada.

Efecto visual a 390 px: la descripción pasa de 350 a 320 px de ancho. En «no encontrado» sigue en tres líneas, con una medida más cómoda. En las descripciones de una línea (`/actividad`, `/metas`) no hay cambio visible, y en `/plan` sigue en dos líneas. Capturas a 390 px, en claro y oscuro: `ruta-que-no-existe`, `actividad`, `plan` y `metas`.

## Resultados

| Verificación | Resultado | Salida |
| --- | --- | --- |
| Barrido 360–1023 px, fuente frente a respaldo | «No encontrado»: máximo **0,91 px**, 0 anchos ≥ 3 px (antes 19,95 px y 4 anchos). Rutas de producto sin cambio (máximo 2,38 px) | [fallback-sweep.txt](fallback-sweep.txt) |
| Carga fría de `/ruta-que-no-existe`, condiciones de R2, a 360, 362, 363, 384, 385 y 390 px, dos temas | **CLS = 0 en 12 de 12** | [cls-r2.txt](cls-r2.txt), bloque A |
| R2 con «no encontrado» añadido: 7 rutas × 2 temas a 390 px | **CLS = 0 en 14 de 14**, sin cuadro del tema contrario; el control negativo detecta el destello | [cls-r2.txt](cls-r2.txt), bloque B |
| `npm run verify` | Pasa | — |
| `test:a11y` (axe) | 36 de 36 | — |

Desde este PR, el arnés de R2 ([`harness/r2.cjs.txt`](harness/r2.cjs.txt)) incluye `/ruta-que-no-existe` en su lista de rutas. Quien vuelva a ejecutar R2 mide también «no encontrado».
