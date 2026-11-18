# BRAND_FOUNDATION.md — Juntia
Dirección oficial: **I2 · Bosque & Arena**. Versión 1.0 (lote 1 de 5). Estado de cada decisión: **[A]** aprobado · **[P]** propuesta · **[V]** pendiente de validar.

## 1. Esencia
- **Promesa:** «Lo tuyo, lo mío y lo nuestro, claro de un vistazo».
- **Territorio:** Warm Editorial Finance. Lino, bosque y arena; piezas táctiles; serif solo en momentos emocionales. [A]
- **Idea de marca:** juntar y avanzar. Se expresa en las metas (la cinta continua y las tarjetas apiladas) y en el balance justo entre personas, no en logotipos ni ilustraciones.

## 2. Personalidad
| Rasgo | Es | No es |
| --- | --- | --- |
| Cálida | lino, bosque, tacto | pastel infantil, cacao |
| Editorial | serif en titulares y metas | serif en datos o formularios |
| Clara | cada cifra dice qué es | totales que mezclan gasto y ahorro |
| Justa | «por saldar», «le toca» | rankings, culpa, alarmas |

## 3. Principios de producto → diseño
1. **Registrar antes de planificar.** Sin presupuesto la interfaz está completa: sin barras vacías ni «límite 0» (DEC-R01).
2. **Tres dimensiones separadas.** Gasto, ahorro destinado y saldo entre personas no comparten color, ícono ni fila de total (DEC-G04).
3. **Privado por defecto.** Candado + «solo yo». En el contexto Nosotros, lo privado no existe visualmente (US-05, DEC-G06).
4. **Movimiento con significado.** Cada animación explica un cambio de dato; con reduced motion el resultado es idéntico.
5. **Proyección ≠ promesa.** Siempre condicional y con fuente («si siguen como en los últimos tres meses…») (DEC-R17).

## 4. Voz y microcopy
- Tuteo, frases cortas, español de Colombia, COP sin decimales: `$186.500`.
- El nombre propio va primero: «Sara pagó», «Tomás le debe a Sara».
- Sin emojis, sin exclamaciones de alarma, sin rankings de pareja.

| Así sí | Así no |
| --- | --- |
| Tomás le debe a Sara $186.500 · Por saldar | Tomás está en deuda |
| Guardaron $900.000 para sus metas. Es ahorro, no gasto. | Total gastado $3.740.000 |
| Apartado en Juntia | Depositado en tu cuenta |
| Transferencia declarada | Transferencia verificada |
| Si siguen como en los últimos tres meses, llegan en abril. | Llegarán en abril |
| Sin presupuesto. Crear presupuesto (opcional) | Presupuesto $0 · excedido |
| Liquidado | Pagado (cuando no hubo transferencia verificada) |
| Registrar aporte | Depositar / Invertir |
| Destinado neto (para planificar) | Total gastado (para gasto + aportes) |
| Porcentaje 55/45 | Proporcional (si no es por ingresos) |
| Retiro de la meta (decisión de los fundadores del 12 de noviembre de 2026; antes «Retiro de meta · reasignación») | Ingreso |

## 5. Fotografía (metas)

> **No aplica a MVP-1** (decisión de los fundadores del 17 de noviembre de 2026; maestro §15.10, decisión 24.13): las metas no tienen foto en MVP-1 y usan el fallback de abajo. Las reglas de foto y sus [V] pasan a MVP-2, con ADR-014.
- **Fuentes:** predeterminadas por tipo de meta (viaje, boda, vivienda…), subidas por el usuario, o **fallback sin foto**.
- **Focal point:** se guarda `focal: {x,y}` en %; recorte con `object-position`. El sujeto va en el tercio superior y el inferior queda para el texto.
- **Scrim:** degradado superior 0→35% (etiqueta) e inferior 50%→82% (título + cifras). El texto blanco debe medir ≥ 4,5:1 sobre el scrim. [V]
- **Fotos claras:** si la luminancia media del tercio inferior es > 0,6, el scrim sube a 90%. **Sujeto pegado al borde:** recorte centrado y nunca texto encima del sujeto.
- **Fallback:** tinte de la categoría de la meta + ícono Phosphor duotono a 96 px, plano, sin degradado.
- **Casos a validar:** viaje (horizontal, cielo claro), boda (vertical, tonos claros), vivienda (interior oscuro), foto con sujeto en el borde. [V]

## 6. Identidad visual (resumen; el detalle está en DESIGN_SYSTEM.md)
- Tipografía: Brygada 1918 (emoción) + Onest (UI) + Onest tabular (dinero) + Spline Sans Mono (solo metadatos). [A] Decisión de los fundadores del 4 de noviembre de 2026 (maestro §15.10, decisión 14); sustituye a Instrument Serif + Geist + Geist Mono. Spline Sans Mono la aprobaron ese mismo día viendo las capturas del PR #32.
- Color: lino/crema, tinta, bosque lleno para la acción, verde texto para el ahorro, personas configurables (petróleo, arena…). [A/P]
- Iconos: Phosphor, con fichas de categoría de fondo suave. [A]
- Oscuro: carbón #121416, sin cacao; la calidez vive en las fichas, las personas y la acción. [A]
