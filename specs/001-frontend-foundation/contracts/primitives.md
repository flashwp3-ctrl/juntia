# Contrato de los primitivos — 001

Lo que P0-1 puede dar por hecho al usar los primitivos de `src/components/ui/`.
Es un contrato de comportamiento, no de nombres de props definitivos: los nombres
los fija la implementación y no pueden contradecir lo de abajo. La anatomía, los
tamaños y los tokens vienen de `COMPONENT_SPECIFICATIONS.md`; aquí no se repiten.

Común a todos: tokens semánticos (nunca hex), foco visible con anillo de 2 px y
offset de 2 px en los dos temas, área táctil ≥ 44×44 donde son interactivos,
textos visibles y nombres accesibles desde el catálogo de copy, y alternativa de
movimiento reducido para todo lo que se mueve.

| Primitivo | Garantías | Fuente |
| --- | --- | --- |
| `AppIcon` | Solo Phosphor, por nombre tipado del mapa semántico; peso Regular, Fill, Bold o Duotone; tamaño; decorativo (`aria-hidden`) salvo que reciba etiqueta. Imports individuales, sin fuentes de iconos | FR-008, `DESIGN_SYSTEM.md` §3 |
| `Avatar` | Inicial y color de `person.1` o `person.2`. Sin patrón de tramo | FR-009 |
| `CategoryIcon` | Tamaños sm 32, md 40, lg 48, xl 64; las diez categorías; Duotone; forma por tipo de fila (cuadrada, círculo de ahorro, círculo de contorno); anillo de seleccionado; decorativo | FR-010 |
| `Badge` | Los cinco estados de §Badge de estado, siempre ícono + texto | FR-011 |
| `Button` | primary, secondary, ghost, danger; sm, md, lg; hover, pressed, focus, disabled (`aria-disabled`), loading (giro, gerundio, mismo ancho); `<button>` nativo | FR-012 |
| `Input` | label, ayuda, error y disabled; error con borde `status.danger`, ícono `warning-circle`, `aria-invalid`, `aria-errormessage` y anuncio `aria-live="polite"` | FR-013 |
| `AmountInput` | Todo lo de `Input`, más: `inputmode="numeric"`; puntos de miles; sin decimales; ≤ 999.999.999; pegar conserva solo dígitos; entrega `number \| null` en pesos enteros, vacío ≠ 0; reduce el tamaño hasta 28 px sin cortar. No convierte a unidades menores | FR-014 |
| `Segmented` | `radiogroup` o `tablist` según el uso; flechas ←/→ y foco itinerante; perilla con spring `snappy` que salta sin desplazarse con movimiento reducido; no anima al montar | FR-015 |
| `Skeleton` | Geometría del contenido final; pulso de opacidad sin shimmer; estático con movimiento reducido; `aria-busy` en el contenedor y texto oculto de carga; solo aparece pasados 300 ms | FR-016 |
| `BottomSheet` | `role="dialog"` sobre Radix Dialog; foco atrapado; Escape; control de cierre; foco devuelto al disparador; safe area inferior; aparición con spring `sheet` o solo opacidad. **No** trae paradas, arrastre ni confirmación de descarte: P0-1 las añade | FR-031a |
| `Modal` | Ídem, como diálogo centrado de 520 px con scrim. `role="dialog"`; `alertdialog` solo cuando confirme algo destructivo, que en la 001 no existe | FR-031, FR-031a |

Ningún primitivo muestra datos financieros de ejemplo en una ruta de producto
(FR-017). Sus pruebas y la superficie interna usan solo valores de las
especificaciones de componente.
