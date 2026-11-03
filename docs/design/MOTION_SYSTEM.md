# MOTION_SYSTEM.md — Juntia v1 · I2 Bosque & Arena
Lote 3 de 5. Visual: `Juntia DS v1 - 03 Motion.dc.html` · prototipo: `Juntia DS v1 - 03b Prototipo Motion.dc.html`. El prototipo demuestra Goal Journey y Shared Balance con transiciones CSS; no es la implementación final.

## Principios
1. **El movimiento explica el dinero:** solo se anima lo que cambió.
2. **Nunca bloquea:** toda ruta funciona aunque se interrumpa la animación.
3. **Continuidad:** lo que persiste se transforma, no se re-monta.
4. **Contención:** L2 solo en dos momentos, uno por pantalla.

## Tokens
- **duration:** instant 120 · quick 180 · standard 240 · expressive 420 · journey 560 (ms)
- **ease:** standard (.2,0,0,1) · enter (.2,.8,.2,1) · exit (.4,0,1,1) · emphasized (.3,0,0,1)
- **spring (stiffness/damping/mass):** snappy 520/38/1 · gentle 300/30/1 · sheet 380/36/1 · card 260/28/1
- **stagger:** 40 ms, máximo 6 · **counter:** 240 ms con Intl.NumberFormat('es-CO') y tabular-nums

## Reglas técnicas
- Animar solo transform y opacity; las barras animan width con contain: layout (o scaleX).
- useReducedMotion() + prefers-reduced-motion: el crossfade reemplaza desplazamientos y escalas.
- View Transitions solo en Goal Journey; sin soporte, layoutId de Motion.
- Sin CLS: los skeletons replican la geometría.
- El tema cambia con una transición de color de 180 ms y un script bloqueante en <head> para evitar el destello. Con reduced motion, el cambio es instantáneo.

## 1. Context Transition · Yo → Nosotros
*L1 · estándar.* Cambia el contexto completo sin perder el lugar. No es espectáculo: dice qué datos ahora son de los dos.

- **Storyboard:** Yo (0 ms) → Perilla y salida (0–180 ms · spring snappy) → Entrada + contador (180–420 ms · enter) → Nosotros (420 ms)
- **Inicial:** Inicio en contexto Yo: total personal, movimientos personales y privados.
- **Final:** Inicio en Nosotros: total compartido, balance y metas compartidas. Los privados desaparecen.
- **Compartidos:** Segmented (perilla), titular, importe héroe (counter) y contenedor de lista.
- **Coreografía:**
  - `0–180 ms` La perilla se desliza (spring snappy). Lo exclusivo de Yo sale con opacidad 1 → 0 e y 0 → −4 (exit, 140 ms).
  - `120–300 ms` El importe héroe cuenta del valor anterior al nuevo (counter de 240 ms, standard). El titular hace crossfade.
  - `180–420 ms` Los bloques nuevos (balance, metas compartidas) entran con y 8 → 0 y opacidad, en stagger de 40 ms, máximo 4.
- **Interrupción:** Si se vuelve a tocar, la animación se invierte desde el estado actual (spring) y el contador apunta al nuevo destino sin reiniciar.
- **Touch:** Toque en el segmento o deslizamiento sobre el segmentado. Sin swipe en toda la pantalla, que entraría en conflicto con las listas.
- **Teclado:** Tab al segmentado, flechas ←/→ y anuncio aria-live «Ahora ves: Nosotros».
- **Reduced motion:** Crossfade de 120 ms del contenido. La perilla salta sin desplazarse y el contador muestra el valor final.
- **Fallback:** Sin View Transitions: Motion layout + AnimatePresence. Es intra-página y no la necesita.

## 2. Expense Flow · registro rápido
*L1 · estándar, acento L2 al guardar.* La ruta debe sentirse instantánea. La animación confirma qué cambió; no hace esperar.

- **Storyboard:** Toque en Anotar (0 ms · press snappy) → Hoja + teclado (0–320 ms · spring sheet) → Guardar (servidor OK · baja 200 ms) → Lista + contador + toast (0–1200 ms)
- **Inicial:** Cualquier pantalla con el botón Anotar.
- **Final:** La misma pantalla con los totales y el saldo actualizados, la fila nueva resaltada y un toast con Deshacer.
- **Compartidos:** La hoja nace del borde inferior (sin morph desde el botón). La fila nueva pasa a la posición 0 de la lista (layout animation).
- **Coreografía:**
  - `0–120 ms` Press del botón (scale .96, spring snappy). La hoja sube con el spring sheet y el teclado nativo abre en paralelo.
  - `Guardar` El botón pasa a cargando sin cambiar de ancho. Al confirmar el servidor, la hoja baja (exit, 200 ms).
  - `+0–240 ms` El total cuenta hacia arriba (counter standard). El saldo anterior se tacha y el nuevo entra con y 6 → 0.
  - `+80–1200 ms` La fila nueva entra arriba (layout, spring gentle) y su fondo savingSubtle se desvanece en 1,2 s. Toast con Deshacer durante 6 s.
- **Interrupción:** Arrastrar la hoja hacia abajo con datos pide confirmar «Descartar gasto». Deshacer revierte con la coreografía inversa.
- **Touch:** La hoja se arrastra desde el asa. Se cierra con un deslizamiento de más de 120 px o con velocidad mayor a 800 px/s.
- **Teclado:** Atajo N en escritorio, foco en el monto, Enter guarda y Escape cierra. El foco vuelve al disparador.
- **Reduced motion:** La hoja aparece con fade de 120 ms. El contador muestra el valor final y el resaltado se mantiene sin desvanecerse.
- **Fallback:** Motion layout; nada depende de View Transitions.

## 3. Shared Balance · actualización de obligaciones
*L2 · insignia.* Muestra qué cambió en el saldo: el hueco se llena, el exceso se devuelve y queda al día. No simula una transferencia.

- **Storyboard:** Por saldar (0 ms) → El hueco se llena (0–420 ms · expressive) → El exceso se devuelve (200–620 ms) → Liquidado (620–900 ms)
- **Inicial:** SharedBalance en POR SALDAR: Tomás debe 429.900 y Sara puso 429.900 de más.
- **Final:** Las dos barras terminan justo en su marca. Aparece LIQUIDADO y una fila de liquidación en Actividad (no es gasto).
- **Compartidos:** Las barras persisten (no se re-montan). El monto de la sugerencia es un counter. El badge hace morph de POR SALDAR a LIQUIDADO.
- **Coreografía:**
  - `0–420 ms` En la barra del deudor, el tramo rayado de liquidación crece desde lo pagado hasta la marca (width, expressive).
  - `200–620 ms` En la barra del acreedor, el exceso pierde el relleno y queda el contorno punteado de «recibió».
  - `0–600 ms` El monto cuenta de 429.900 a 0 (counter emphasized) y se reemplaza por «Al día».
  - `620–900 ms` El badge cambia a LIQUIDADO (scale .9 → 1, spring snappy) y el check se dibuja (pathLength 0 → 1, 240 ms).
- **Interrupción:** La animación solo empieza cuando el servidor confirma; mientras tanto, el botón muestra cargando. Si falla, no se anima nada y aparece un toast con Reintentar.
- **Touch:** Registrar liquidación abre una hoja de confirmación (monto editable para pagos parciales y fecha) → confirmar.
- **Teclado:** Tab y Enter. Al terminar, aria-live anuncia «Liquidación registrada. Tomás y Sara quedan al día».
- **Reduced motion:** Corte al estado final con crossfade de 160 ms; el anuncio se mantiene.
- **Fallback:** Intra-componente con Motion; no usa View Transitions.

## 4. Goal Journey · tarjeta → meta inmersiva
*L2 · insignia.* La foto no se corta ni se reemplaza: es la misma tarjeta que crece. Así la meta se siente como un lugar.

- **Storyboard:** Pila (0 ms) → Se eleva (0–120 ms · snappy) → Se expande (120–500 ms · card / View Transition) → Hoja + cinta (300–700 ms)
- **Inicial:** GoalStack en Inicio o Metas: la tarjeta frontal tiene foto, nombre, % y cinta.
- **Final:** Meta inmersiva: foto a pantalla completa (móvil) o foto + panel (escritorio), con la hoja en la parada 1.
- **Compartidos:** Foto (view-transition-name: goal-photo-{id}), nombre (goal-title-{id}) y cinta (goal-ribbon-{id}).
- **Coreografía:**
  - `0–120 ms` La tarjeta se eleva: scale 1 → 1,03 y la sombra pasa de float a overlay (spring snappy). Las de atrás bajan 12 px y se desvanecen.
  - `120–500 ms` Expansión con continuidad geométrica: el rect y el radio (26 → 38) se interpolan con spring card. La foto mantiene su object-position en el focal point.
  - `180–480 ms` El título pasa de 36 a 84 px (morph del rect) y los metadatos hacen crossfade.
  - `300–700 ms` La hoja sube (spring sheet), los tramos de la cinta crecen desde 0 en stagger de 80 ms y los hitos aparecen en stagger de 40 ms.
- **Interrupción:** Cerrar durante la expansión invierte desde el estado actual. Si la tarjeta de origen ya no existe, la meta baja 24 px con fade de 200 ms.
- **Touch:** Toque para abrir. Deslizar hacia abajo desde la foto más de 120 px cierra siguiendo el dedo (la escala va de 1 a 0,9).
- **Teclado:** Enter abre y Escape cierra. El foco va al título y al cerrar vuelve a la tarjeta de origen.
- **Reduced motion:** Crossfade de 200 ms entre vistas, sin escala ni desplazamiento. La cinta aparece ya llena.
- **Fallback:** Con la API: document.startViewTransition con view-transition-name compartidos. Sin la API: layoutId de Motion. [V] Probar con App Router.

## 5. Spending Story · el mes en capítulos
*L1 · reveal progresivo.* El análisis mensual se lee como una historia corta: cuánto, en qué, comparado con qué. Cada dato aparece cuando llega su turno.

- **Storyboard:** Capítulo 1 · cuánto (0–400 ms · counter) → Capítulo 2 · en qué (en vista · stagger 40) → Capítulo 3 · comparado (barras desde la base) → Capítulo 4 · lo apartado (separado del gasto)
- **Inicial:** Análisis mensual cargado, con el scroll arriba.
- **Final:** Todos los capítulos visibles. El orden de lectura nunca depende de la animación.
- **Compartidos:** Ninguno entre pantallas. El selector de mes hace crossfade de los valores.
- **Coreografía:**
  - `En vista (30%)` Cada capítulo entra con y 12 → 0 y opacidad (enter, 320 ms), una sola vez.
  - `Capítulo 2` Las fichas de categoría crecen en ancho hasta su proporción (spring gentle, stagger de 40 ms).
  - `Capítulo 3` Las barras crecen desde la base en stagger de 40 ms; el mes actual, en tinta, aparece al final.
  - `Cambio de mes` Counters de 240 ms y las barras interpolan su altura, sin re-entrada.
- **Interrupción:** Con scroll rápido no se encolan animaciones: lo que ya pasó la vista aparece en su estado final.
- **Touch:** Scroll nativo y selector de mes con flechas de 44 px. Sin scroll-jacking.
- **Teclado:** Las secciones son regiones con encabezado y el selector es un grupo de botones.
- **Reduced motion:** Todo visible desde el inicio; los cambios de mes son instantáneos.
- **Fallback:** No usa View Transitions.

## 6. Loading Delight · skeleton → contenido
*L0 · micro.* Cargar no es un show: la forma ya está en su sitio y el contenido aparece encima.

- **Storyboard:** Skeleton (0 ms · pulso 1,6 s) → El héroe primero (datos · fade 180 ms) → Lista (stagger 40 · máx. 6) → Foto decodificada (fade 240 ms · scale 1,02 → 1)
- **Inicial:** Skeleton con la geometría exacta del contenido final.
- **Final:** Contenido completo, sin desplazamiento de layout (CLS 0).
- **Compartidos:** Cada bloque del skeleton mide lo mismo que su contenido, que lo reemplaza en el mismo lugar.
- **Coreografía:**
  - `> 300 ms` El skeleton solo aparece si la carga pasa de 300 ms. Pulso de opacidad 1 → .55 cada 1,6 s.
  - `Datos listos` Crossfade de skeleton a contenido (180 ms) en orden de lectura: héroe, balance, metas, lista.
  - `Lista` Las filas entran en stagger de 40 ms, máximo 6.
  - `Foto` Al terminar decode(), la foto aparece en 240 ms con scale 1,02 → 1 sobre #2A2D31.
- **Interrupción:** Si falla, el skeleton se reemplaza por el error de ese bloque, no de toda la página.
- **Touch:** Pull to refresh solo en Actividad (nativo).
- **Teclado:** El contenedor tiene aria-busy y al terminar se anuncia el título de la sección.
- **Reduced motion:** Skeleton estático y contenido sin fade.
- **Fallback:** No usa View Transitions.

## Pendiente [V]
- View Transitions con App Router (Goal Journey).
- Springs a 55 fps o más en Android de gama media con la foto a pantalla completa.
- Gesto de cierre frente al back-swipe de iOS.

## Cuenta (L0–L1, sin momentos insignia)
- **Entrada desde el avatar:** push estándar (x 24 → 0 + opacidad, `standard` 220 ms). El avatar no hace morph.
- **Subpantallas y retorno:** mismo push; Atrás lo invierte. Si se interrumpe, termina en el estado final.
- **Cambio de tema:** transición de color de 180 ms del sistema global (sección de principios); la tarjeta seleccionada mueve su anillo (`instant`). Con reduced motion, instantáneo.
- **Guardar perfil:** botón en «Guardando…» y luego el toast de éxito (`gentle`). El avatar se actualiza sin animación.
- **Invitación:** el badge cambia de PENDIENTE a ACTIVA con crossfade de 180 ms. Error con el patrón de toast.
- **Confirmaciones y errores:** diálogo con escala .98 → 1 y opacidad (`standard`).
- **Reduced motion:** todo pasa a solo opacidad o a cambio instantáneo.
- **Mover a Pareja · Deshacer:** el toast ofrece «Deshacer» 6 s solo si el servidor lo permite; al deshacer, la fila resaltada colapsa (240 ms) y el saldo vuelve con counter. Con reduced motion, cambio instantáneo.
- **Uso de meta aprobado:** la cinta de la meta baja con `spring gentle` y el badge pasa de PENDIENTE a APROBADO con crossfade de 180 ms.
