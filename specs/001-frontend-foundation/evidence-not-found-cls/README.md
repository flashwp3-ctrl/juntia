# Evidencia · CLS de «no encontrado»

Fecha: 4 de noviembre de 2026. Corrige el pendiente declarado en [`../evidence-typography/README.md`](../evidence-typography/README.md): con Onest, la descripción de «no encontrado» se movía al llegar la fuente a 362, 363, 384 y 385 px (CLS 0,001625 y 0,000826 en carga fría). El maestro §15.7 exige CLS = 0 exacto.

Build de producción servido entonces con `JUNTIA_INTERNAL_SURFACE=1 next start -p 3100`, Chromium de Playwright 1.64.1, Windows 11. Los arneses son desechables y se copian en [`harness/`](harness/).

> **Para volver a ejecutarlos (desde el 7 de noviembre de 2026):** el 3000 y el 3100 son de otro proyecto de esta máquina; Juntia nunca los usa. Sirve el build con `JUNTIA_INTERNAL_SURFACE=1 npm run start` (puerto `PORT`, por defecto 3400; un segundo servidor, `PORT=3500`) y pasa el origen a los arneses con `BASE=http://localhost:3400`, que también es su valor por defecto. Las URL con 3100 de las salidas guardadas son el registro de aquella ejecución.

## Causa

Por debajo de `lg`, el bloque de los estados (`StateBlock` en `src/components/shell/provisional-state.tsx`) ocupaba todo el ancho disponible, hasta 22rem. Ese ancho cambia con el viewport. En algunos anchos, el respaldo calibrado y la fuente real cortan una línea en palabras distintas, y al llegar la fuente el texto centrado se mueve. Ningún `size-adjust` puede igualar el corte en todos los anchos.

## Corrección

Por debajo de `lg`, el bloque entero (título, descripción y acciones) tiene **un ancho fijo en px, no en rem**:

- **320 px** cuando caben, que es siempre con la fuente raíz al 100 % desde 360 px de viewport;
- **280 px** cuando el contenedor mide menos de 320 px (`@container`, `@max-[320px]`). Pasa con la fuente raíz ampliada: al 200 %, los márgenes laterales crecen y entre 360 y 399 px no caben 320. 280 px es lo que deja libre una pantalla de 360 px al 200 %.

Así el bloque solo tiene dos anchos posibles y nunca sigue al viewport. En `lg` no cambia nada.

Esto responde a la revisión adversarial del PR #33, que pedía cambios: un primer intento con `max-w-[20rem]` solo en la descripción seguía dependiendo del viewport con la fuente raíz ampliada. Al medirlo aparecieron dos casos más con la fuente al 200 %: el título de «no encontrado» se movía a 438–440 px (CLS 0,0147) y la descripción de Inicio a 385 px (CLS 0,0013).

**Efecto visual.** A 390 px, el bloque pasa de 352 a 320 px de ancho. «No encontrado» sigue en tres líneas, `/plan` en dos, y `/actividad` y `/metas` en una. Con la fuente raíz al 200 % a 360 px, el bloque mide 280 px, sin scroll horizontal ([captures.txt](captures.txt)).

## Resultados

| Verificación | Resultado | Salida |
| --- | --- | --- |
| Barrido 360–1023 px, fuente real frente a respaldo, 7 rutas, fuente raíz al **100 %** | 0 anchos ≥ 3 px. «No encontrado»: máximo 0,91 px (antes 19,95 px y 4 anchos) | [fallback-sweep.txt](fallback-sweep.txt) |
| El mismo barrido con la fuente raíz al **200 %** | 0 anchos ≥ 3 px en las 7 rutas (con el límite de 22rem eran 14 anchos en 5 rutas, hasta 111 px) | [fallback-sweep.txt](fallback-sweep.txt) |
| Carga fría de «no encontrado» a 360, 362, 363, 384, 385 y 390 px, fuente al 100 %, dos temas (bloque A) | **CLS = 0 en 12 de 12** | [cls-r2.txt](cls-r2.txt) |
| R2 con «no encontrado» añadido: 7 rutas a 390 px, dos temas, fuente al 100 % (bloque B) | **CLS = 0 en 14 de 14**, sin cuadro del tema contrario; el control negativo detecta el destello | [cls-r2.txt](cls-r2.txt) |
| Carga fría con la fuente al 200 %: 7 rutas a 360, 382, 385, 386, 390 y 399 px, dos temas (bloque C200) | **CLS = 0 en 84 de 84** | [cls-r2.txt](cls-r2.txt) |
| Carga fría con la fuente al 200 % en los anchos que fallaban antes: `/actividad` a 443 px y «no encontrado» a 438, 439, 440, 768, 1024 y 1440 px (bloque D200) | **CLS = 0 en 14 de 14** | [cls-r2.txt](cls-r2.txt) |
| `npm run verify` | Pasa | — |
| `test:a11y` (axe) | 36 de 36 | — |

En total, **124 cargas en frío con CLS = 0**: 26 con la fuente raíz a 16 px y 98 a 32 px. Cada carga registra el tamaño real de la fuente raíz (`rootFontSize`).

## Cómo se forzó cada caso

- **Barrido** ([`harness/sweep.cjs.txt`](harness/sweep.cjs.txt)). La regla del respaldo está escrita en el arnés y se imprime en la salida: `html.fb{--font-onest:"Onest Fallback";--font-brygada:"Brygada Fallback"}`. Antes de medir cada ruta, el arnés comprueba con `getComputedStyle().fontFamily` que la clase cambia la familia de `Onest, "Onest Fallback", sans-serif` a `"Onest Fallback", sans-serif`, y aborta si no cambia. Invocación: `node sweep.cjs <base> <rutas> <100%|200%>`. Es una comparación estática de geometrías: la carga fría es la medición de CLS.
- **Carga fría** ([`harness/r2.cjs.txt`](harness/r2.cjs.txt)). Son las condiciones de R2: contexto nuevo, caché deshabilitada, CPU 6×, 400 kbit/s y 400 ms. `ROOT=200%` añade `html{font-size:200% !important}` al `<head>` con un script de inicio. No usa `page.route`, porque `route.fetch` descarga fuera de la red emulada y anula la limitación: una primera medición hecha así dio 0 sin ser válida y se descartó.

Desde este PR, el arnés de R2 incluye `/ruta-que-no-existe` en su lista de rutas.
