# T084 · capturas de las correcciones de la simulación (12 nov 2026)

Capturas a 390 px (escala 2), tema claro, movimiento reducido salvo en las del punto 5. Se tomaron contra juntia-dev con `npm run e2e:dev` y su bloqueo, con un spec temporal que no se commitea. Cada una se tomó cuando terminó la transición: sin `[data-s1]` ni View Transition activa. Los datos salen de una pareja dorada sembrada por las funciones reales, más:

- «Casa» (compartida): Tomás aporta $400.000 y lo anula. Sara aporta $500.000 y $200.000 y retira $400.000 con el motivo «Arreglo de la moto».
- «Fondo sin estrenar» (compartida, sin asientos).
- «Pasajes a Tokio», un gasto de $300.000 pagado con aportes de Sara en Japón.
- Después, el último gasto compartido que anota Sara: «Mercado del sábado», que pagó Tomás, al 55/45.

Esto no es evidencia de gate (ADR-011 §9.8): es iteración.

| Captura | Punto | Qué muestra |
| --- | --- | --- |
| `01-disponible-por-persona-tomas-0.png` | 1 | En «Casa», «Disponible por persona» tiene a Tomás con «Disponible de Tomás $0», aunque su único aporte esté anulado |
| `02-historial-autor-anulado-y-anular.png` | 1, 2, 8 | Historial: el aporte ANULADO dice «De Tomás». «Aportes por persona» y el filtro siguen teniendo a Tomás. Solo el aporte de $200.000 ofrece «Anular aporte»: a Sara le quedan $300.000, que no cubren el de $500.000. El retiro dice «Retiro de la meta» con su motivo |
| `02b-meta-casa-completa.png` | 1, 2, 8 | La misma meta, página completa |
| `03a-archivar-con-fondos-con-nota.png` | 4 | Archivar «Casa», con $300.000: el diálogo trae la nota «Para archivar, la meta debe estar sin fondos…» |
| `03b-archivar-sin-fondos-sin-nota.png` | 4 | Archivar «Fondo sin estrenar», sin fondos ni solicitudes: sin la nota. También se ve a los dos integrantes en $0 |
| `04-escape-foco-en-tarjeta.png` | 3 | Tras Escape en la meta inmersiva, el foco está en la tarjeta de origen (el anillo). La ruedita de «abriendo» en la tarjeta ya salía igual sin este cambio; ver el PR |
| `05-actividad-retiro-de-la-meta.png` | 8 | Actividad · Nosotros: «Retiro de la meta» con «Casa · Arreglo de la moto · Sara» |
| `06-actividad-uso-de-japon.png` | 8 | Actividad: «Uso de Japón», sin «no es un gasto nuevo» |
| `07-detalle-gasto-uso-de-japon.png` | 8 | Detalle de «Pasajes a Tokio»: «Uso de Japón · Aportes de Sara» |
| `08-anotar-pago-quien-anota.png` | 6b | Anotar en Nosotros: el último gasto que anotó Sara lo pagó Tomás al 55/45; el resumen dice «Pagó Sara · 55/45» (abajo, junto a Guardar) |
| `09-presupuesto-conflicto-tu-cambio.png` | 7 | Sara guardó $850.000 en Mercado después de que Tomás lo pusiera en $950.000. El campo trae $950.000, debajo «Tu cambio: $850.000», y el aviso dice «Tomás cambió este presupuesto», «Ahora el límite es $950.000.» y «Revisar» |
| `09b-presupuesto-revisar-tu-cambio.png` | 7 | Tras «Revisar»: el campo editable en $950.000 y «Tu cambio: $850.000» como referencia |
| `10-metas-yo-tu-disponible.png` | 8 | Metas · Yo: «Cada una muestra tu disponible. No se suman a tus metas.» y «Tu disponible $X» bajo cada compartida |
| `11-metas-tras-cambiar-a-nosotros.png`, `11-metas-tras-cambiar-a-yo.png`, `11-plan-analisis-tras-cambiar-a-nosotros.png`, `11-plan-analisis-tras-cambiar-a-yo.png` | 5 | Metas y Análisis después de cambiar Yo↔Nosotros sin movimiento reducido, cuando terminó la transición: con su contenido |

## Sondas de esta pasada

**Punto 3 (foco al cerrar la meta inmersiva).** Se probaron cuatro caminos: abrir desde la tarjeta con un toque, abrir con Enter, llegar por URL y cerrar con ×. Con el cambio, en los cuatro el foco vuelve a la tarjeta de origen. Con el mismo spec sobre el código sin el cambio, solo con los dos `rememberOrigin` quitados, Escape tras llegar **por URL** deja el foco en BODY; los otros tres caminos ya funcionaban.

**Punto 5 (Yo↔Nosotros en Metas y Análisis).** Sin movimiento reducido, se muestreó `main` en cada cuadro durante 2,5 s tras tocar el selector. Los milisegundos son desde el toque:

| Ruta y cambio | Esqueleto invisible | Esqueleto visible | Contenido (entra con S1) |
| --- | --- | --- | --- |
| /metas → Nosotros | 0 | 289 | 1025 |
| /metas → Yo | 0 | 315 | 1066 |
| /plan/analisis → Nosotros | 0 | 303 | 2468 |
| /plan/analisis → Yo | 0 | 299 | 2065 |

Durante los primeros ~300 ms solo se ven la cabecera y la barra. No es un fallo: el `SkeletonGroup` existe y espera 300 ms antes de mostrarse (MOTION_SYSTEM §6, «solo aparece si la carga pasa de 300 ms»). Después se ve el esqueleto hasta que llega el RSC, y el contenido entra con S1 (240 ms + hasta 120 ms de stagger, desde opacidad 0). En ningún caso quedó en blanco después de la transición. Las capturas en blanco de la simulación caen en esas dos ventanas.
