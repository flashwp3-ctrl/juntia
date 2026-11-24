# DESIGN_SYSTEM.md — Juntia v1 · I2 Bosque & Arena
Lote 1 de 5: **tokens, color, tipografía, espacio, elevación e iconografía**. Los componentes (anatomía, variantes y estados) se documentan en `COMPONENT_SPECIFICATIONS.md` (lote 2). Motion en detalle: `MOTION_SYSTEM.md` (lote 3).

Convención: `categoria.grupo.variante` → variable CSS `--categoria-grupo-variante`. Los temas se aplican con `[data-theme="light"|"dark"]` sobre `<html>` y `System` resuelve con `prefers-color-scheme`. Script inline bloqueante en `<head>` para evitar el destello del tema incorrecto. [V: validar con Next App Router]

## 1. Primitive tokens

### 1.1 Color
- **forest:** `50` #EDF3EE · `100` #D9E5DC · `200` #BFD8C8 · `300` #93C2A6 · `400` #6E9C84 · `500` #4F8068 · `600` #3E6B55 · `700` #2D4B3D · `800` #24402F · `900` #1A3026
- **linen:** `50` #FCFAF5 · `100` #F7F3EB · `200` #EEE7DA · `300` #E7DFD0 · `400` #DDD3C2 · `500` #C9BDA8 · `600` #8C8475 · `700` #6C665B · `800` #48443C · `900` #1A1C1A
- **charcoal:** `50` #F3EFE7 · `200` #D0CAC0 · `400` #A29C92 · `600` #3A4045 · `700` #2C3135 · `750` #1E2125 · `800` #22262A · `850` #191C1F · `900` #121416 · `950` #0F1112
- **sand:** `50` #F8F0E0 · `100` #F1E2C6 · `200` #EAD5AE · `300` #E0C08C · `400` #D3B07A · `500` #C49A55 · `600` #9C7330 · `700` #7A5418
- **petrol:** `100` #DCE8EC · `200` #B9D0D9 · `300` #8FB3C1 · `400` #6F98A8 · `500` #5A8797 · `600` #3F6F7F · `700` #2E5866
- **clay:** `100` #F3E0D6 · `300` #D6A68E · `400` #C4876A · `600` #9A5A3D
- **coral:** `100` #F8DED6 · `300` #F0A08C · `600` #B4452F · `700` #9C3A26 · `dark-bg` #3A211B
- **amber:** `100` #F6E7C2 · `300` #E8C46A · `700` #7A5200 · `dark-bg` #33290F

### 1.2 Personas (configurables, escalables a N) [P]
| Token | Nombre | Claro | Oscuro | Tinta sobre claro |
| --- | --- | --- | --- | --- |
| person.1 | Petróleo | #6F98A8 | #8FB3C1 | 5,5:1 |
| person.2 | Arena | #D3B07A | #E0C08C | 8,4:1 |
| person.3 | Arcilla | #C4876A | #D6A68E | 5,7:1 |
| person.4 | Pizarra | #8F98AA | #AEB5C4 | 5,9:1 |
| person.5 | Oliva | #A3A86E | #BFC38C | 6,8:1 |
| person.6 | Rosa polvo | #C9959A | #DDB0B4 | 6,7:1 |
- P0 usa solo person.1–2 (pareja). person.3–6 quedan definidos para grupos P1.
- Se asignan por orden de ingreso al espacio. En P0 no son editables por el usuario. Con más de 6 personas se cicla con otro patrón.
- **Patrón de tramo** (no depender del color): persona 1 sólido · 2 rayado 135° (4/3 px) · 3 punteado (6 px) · 4 sólido con borde interior · 5 rayado 45° · 6 punteado denso.
- Texto sobre avatar: `color.text.primary` en claro y `color.surface.canvas` en oscuro.
- **Sustitución:** Sara pasa de lila #A992D2 a petróleo #6F98A8. Razón: par frío/cálido con la arena de Tomás, distinguible en gris (luminancia 0,30 frente a 0,46), lejos del bosque de la acción (unos 40° hacia el azul y menos saturación) y sin morados en el sistema.

### 1.3 Categorías (CategoryIcon)
| Categoría | Phosphor | Fondo claro | Ícono claro | Contraste | Fondo oscuro | Ícono oscuro | Contraste |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mercado | shopping-cart-simple | #DDE6D6 | #43603F | 5,5:1 | #222D23 | #A8C69C | 7,6:1 |
| Restaurantes | fork-knife | #F5DDCF | #97472A | 5,0:1 | #36261F | #F2AD8C | 7,7:1 |
| Hogar | house-line | #DCE8EC | #2E5866 | 6,2:1 | #1C2A30 | #9CC3D1 | 7,8:1 |
| Transporte | car-profile | #E9E2D2 | #5E5240 | 5,9:1 | #2A2721 | #CDBFA6 | 8,2:1 |
| Salud | first-aid-kit | #D8EAE4 | #2C6656 | 5,3:1 | #1A2C27 | #92CDB9 | 8,1:1 |
| Ocio | film-slate | #F0E4BC | #6B5410 | 5,7:1 | #322C1A | #E2C774 | 8,4:1 |
| Compras | shopping-bag | #F1DCDD | #8A4048 | 5,5:1 | #33232A | #E6A9B0 | 7,5:1 |
| Servicios | wifi-high | #E1E4EC | #44506A | 6,3:1 | #23262F | #B3BCD1 | 7,9:1 |
| Ingresos | arrow-down-left | #F1E2C6 | #7A5418 | 5,3:1 | #2E2716 | #E3C27A | 8,6:1 |
| Oficina | briefcase | #E3E4CF | #52532A | 6,2:1 | #272A1D | #C0CAA1 | 8,5:1 |
| Ropa | t-shirt | #EEDCE5 | #684257 | 6,4:1 | #33232C | #D6B1C5 | 7,7:1 |
| Otra | tag | #E7E3DA | #4F4B44 | 6,8:1 | #26272A | #C8C3BA | 8,5:1 |
- **Doce categorías** (confirmado por los fundadores el 22 de noviembre de 2026; comp «Juntia DS v1 - 06b Categoria 4x3»; spec 005, «Decisiones de los fundadores que esta spec recoge»; migración `20261122120000_categories_office_clothing.sql`): entran **Oficina** (`office`) y **Ropa** (`clothing`), con tintes derivados de «Liquen» y «Malva polvo» (§2, tintes de meta); «Entretenimiento» pasa a **«Ocio»** (solo el texto; la clave sigue siendo `entertainment`). En la rejilla de Anotar (4 × 3, 208 px) el orden es el de esta tabla sin «Ingresos», «Otra» la última y a dos casillas, y las etiquetas van a 11 px con −0,01 em. Los contrastes son del ícono sobre su fondo; la etiqueta va en tinta (13,3:1 y 13,1:1 en claro; 12,8:1 y 12,9:1 en oscuro).
- **«Otra» usa `tag`**, no `dots-three-outline`: los tres puntos se leen como «más» (comp 06, opción 1c, aprobada el 6 de noviembre de 2026; UX lote 1).

### 1.4 Tipografía
| Token | Familia | Peso | Tamaño/Interlínea | Tracking | Uso |
| --- | --- | --- | --- | --- | --- |
| display.xl | Brygada 1918 | 500 | 56px / 1.04 | -0.015em | Titular de escritorio, meta inmersiva |
| display.l | Brygada 1918 | 500 | 38px / 1.04 | -0.015em | Titular móvil, sección |
| title.l | Brygada 1918 | 500 | 26px / 1.08 | -0.01em | Saludo, nombre de tarjeta |
| title.m | Brygada 1918 | 600 | 21px / 1.12 | -0.005em | Encabezado de bloque |
| money.xl | Onest | 600 | 52px / 1 | -0.035em | Importe héroe escritorio |
| money.l | Onest | 600 | 40px / 1 | -0.03em | Importe héroe móvil |
| money.m | Onest | 600 | 26px / 1.1 | -0.02em | Importe de tarjeta |
| money.s | Onest | 600 | 15px / 1.3 | 0 | Importe de fila |
| body.l | Onest | 400 | 16px / 1.5 | 0 | Párrafos de explicación |
| body.m | Onest | 400 | 15px / 1.45 | 0 | UI general, filas |
| body.s | Onest | 400 | 13px / 1.45 | 0 | Metadatos, ayudas |
| label.m | Onest | 600 | 13px / 1.2 | 0 | Botones, tabs, chips |
| label.s | Onest | 500 | 12px / 1.3 | 0 | Leyendas, captions |
| overline | Onest | 600 | 11px / 1.2 | 0.09em | Etiquetas en mayúscula |
| meta.mono | Spline Sans Mono | 500 | 11px / 1.3 | 0.02em | Fechas y referencias en tablas |
- **Unidades (decisión de los fundadores del 11 de noviembre de 2026, F13; maestro §15.10, decisión 23.1; PR #79).** Los tamaños de esta sección se escriben en px como referencia a 16 px de raíz, pero **en el código todo el texto va en `rem`**, también los `clamp`, para que crezca con el texto ampliado hasta el 200 %. Excepción aceptada por el gestor (F79-3): los suelos de `--money-*-fit` siguen en px.
- **Campos de texto (decisión de los fundadores del 17 de noviembre de 2026; maestro §15.10, decisión 23.6; PR #82).** Por debajo de md o con puntero táctil, todo campo de texto (`input`, `textarea`, `select`) calcula **al menos 16 px** (`max(1rem, 1em)`), aunque su token sea `body.m` (15 px): Safari de iPhone amplía la página al enfocar un campo más pequeño. AmountInput conserva su `clamp`; con ratón en escritorio no cambia nada.
- `font-variant-numeric: tabular-nums` global. Importes héroe fluidos: `money.l: clamp(32px, 8vw, 40px)`, `money.xl: clamp(40px, 4vw, 52px)`.
- Pesos previstos en la implementación: 400, 500, 600 (Onest); 400–700 con itálicas (Brygada 1918); 500 (Spline Sans Mono). Son el subconjunto que carga Juntia, no todos los pesos de cada familia. Las tres familias son decisión de los fundadores (maestro §15.10, decisión 14): Brygada 1918 y Onest desde la decisión, y Spline Sans Mono, propuesta del gestor, aprobada el 4 de noviembre de 2026 viendo las capturas del PR #32.
- **Familias vigentes: Brygada 1918 (titulares y logotipo, este en Medium Itálica), Onest (interfaz y cifras) y Spline Sans Mono (metadatos).** Instrument Serif, Geist y Geist Mono son las familias del paquete original, sustituidas por la decisión 14; solo se nombran en la calibración siguiente como referencia de medida, no se cargan ni se usan.
- **Calibración de la decisión 14.** Brygada 1918 es más ancha que Instrument Serif: los titulares van al 88 % de los tamaños anteriores, con interlineado 1,04 y tracking −0,015 em, como en la comparativa de parejas. Va a **500** porque a 400 se queda delgada en oscuro; `title.m` sube a **600** para que el encabezado pequeño no dependa solo del tamaño. Onest mide casi lo mismo que Geist (ancho medio 469 frente a 467 sobre 1000 y altura de x 527 frente a 530), así que `money.*`, `body.*`, `label.*` y `overline` conservan sus valores. Spline Sans Mono tiene el mismo ancho de celda que Geist Mono (600 sobre 1000) y `meta.mono` también se conserva.
- Titulares del shell (fuera de la tabla, por ser fluidos): título de página `clamp(25px, 7.4vw, 30px)` en móvil y `clamp(39px, 3.7vw, 56px)` desde `lg`; titular de estado 28 px en móvil y 35 px desde `lg`; marca 26 px en el rail y 28 px en el sidebar. AmountInput: 0,68 em por carácter en su `clamp` (Onest 600 tabular mide hasta 0,590 em por carácter en importes formateados, frente a 0,537 de Geist).

### 1.5 Espacio · radio · borde
- **space:** 0 · 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 28 · 32 · 40 · 48 · 56 · 64 · 80 · 96 (px).
- **radius:** `xs` 6 · `sm` 10 · `md` 14 · `lg` 18 · `xl` 22 · `2xl` 26 · `3xl` 32 · `photo` 38 · `pill` 999.
- **border:** hairline 1px · strong 1.5px · focus 2px + offset 2px · pending 1.5px dashed.

### 1.6 Elevación
| Token | Claro | Oscuro |
| --- | --- | --- |
| elevation.raised | `inset 0 1px 0 rgba(255,255,255,.75), 0 2px 0 rgba(26,28,26,.09)` | `inset 0 1px 0 rgba(255,255,255,.05), 0 0 0 1px #2C3135` |
| elevation.float | `0 6px 18px rgba(26,28,26,.12)` | `0 8px 24px rgba(0,0,0,.5), 0 0 0 1px #2C3135` |
| elevation.overlay | `0 18px 40px rgba(26,28,26,.22)` | `0 24px 56px rgba(0,0,0,.6), 0 0 0 1px #3A4045` |
| elevation.sheet | `0 -18px 40px rgba(26,28,26,.18)` | `0 -1px 0 #3A4045, 0 -24px 48px rgba(0,0,0,.55)` |
En oscuro, la elevación se expresa con superficie más clara + hairline; las sombras solo separan overlays.

### 1.7 Motion (primitivos)
- **duration:** `instant` 120ms · `quick` 180ms · `standard` 240ms · `expressive` 420ms · `journey` 560ms
- **ease:** `standard` cubic-bezier(.2,0,0,1) · `enter` cubic-bezier(.2,.8,.2,1) · `exit` cubic-bezier(.4,0,1,1) · `emphasized` cubic-bezier(.3,0,0,1)
- **spring:** `snappy` (stiffness 520 · damping 38 · mass 1) · `gentle` (stiffness 300 · damping 30 · mass 1) · `sheet` (stiffness 380 · damping 36 · mass 1) · `card` (stiffness 260 · damping 28 · mass 1)
- **stagger:** 40ms, máximo 6 elementos (luego aparecen juntos).

### 1.8 Breakpoints y capas
- **bp:** `xs` 360 · `sm` 390 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1440. Diseño base 390; navegación lateral desde `lg` 1024.
- **z:** `base` 0 · `raised` 10 · `sticky` 100 · `nav` 200 · `sheet` 300 · `modal` 400 · `toast` 500 · `tooltip` 600.

## 2. Semantic tokens
| Token | Claro | Oscuro | Uso | Contraste claro | Contraste oscuro |
| --- | --- | --- | --- | --- | --- |
| color.surface.canvas | #F7F3EB | #121416 | Fondo de app |  |  |
| color.surface.raised | #EEE7DA | #191C1F | Piezas táctiles, tarjetas |  |  |
| color.surface.sunken | #E7DFD0 | #22262A | Rieles, segmentados, inputs |  |  |
| color.surface.overlay | #FCFAF5 | #1E2125 | Sheets, modales, popovers |  |  |
| color.surface.inverse | #1A1C1A | #F3EFE7 | Tooltips, toasts |  |  |
| color.text.primary | #1A1C1A | #F3EFE7 | Texto, importes de gasto | 15,5:1 | 16,1:1 |
| color.text.secondary | #6C665B | #A29C92 | Metadatos, ayudas | 5,1:1 | 6,8:1 |
| color.text.onAction | #F7F3EB | #F3EFE7 | Texto sobre acción primaria |  |  |
| color.border.subtle | #DDD3C2 | #2C3135 | Separadores, contornos |  |  |
| color.border.strong | #C9BDA8 | #3A4045 | Inputs, foco secundario |  |  |
| color.action.primary | #2D4B3D | #3E6B55 | Anotar gasto, CTA |  |  |
| color.action.primaryHover | #24402F | #487A61 | Hover |  |  |
| color.action.primaryPressed | #1A3026 | #335B48 | Pressed |  |  |
| color.finance.expense | #1A1C1A | #F3EFE7 | Gasto: tinta, sin signo | 15,5:1 | 16,1:1 |
| color.finance.income | #1A1C1A | #F3EFE7 | Ingreso: tinta + «+» + ícono | 15,5:1 | 16,1:1 |
| color.finance.saving | #2F5A45 | #93C2A6 | Aporte, ahorro destinado | 7,1:1 | 9,2:1 |
| color.finance.savingSubtle | #D9E5DC | #1C2A23 | Fondo de ficha de aporte |  |  |
| color.finance.settlement | #1A1C1A | #F3EFE7 | Liquidación: tinta + ícono ⇄ | 15,5:1 | 16,1:1 |
| color.goal.track | #E7DFD0 | #22262A | Riel de la cinta |  |  |
| color.goal.pace | #1A1C1A | #F3EFE7 | Marca de ritmo | 15,5:1 | 16,1:1 |
| color.goal.projection | #6C665B | #A29C92 | Próximo aporte, punteado | 5,1:1 | 6,8:1 |
| color.goal.tint.travel.bg | #C4DEE6 | #1B333A | Fondo del fallback sin foto · travel («Agua») |  |  |
| color.goal.tint.travel.initial | #95B5BF | #405F69 | Inicial gigante del fallback · travel («Agua») |  |  |
| color.goal.tint.travel.icon | #285764 | #96C7D5 | Ícono Duotone del tipo · travel («Agua») |  |  |
| color.goal.tint.travel.edge | #577F8B | #5B808B | Borde interior de 1,5 px del riel sobre el tinte · travel («Agua») |  |  |
| color.goal.tint.home.bg | #E3CEB9 | #372F27 | Fondo del fallback sin foto · home («Adobe») |  |  |
| color.goal.tint.home.initial | #C1A58F | #695749 | Inicial gigante del fallback · home («Adobe») |  |  |
| color.goal.tint.home.icon | #71472D | #DCB598 | Ícono Duotone del tipo · home («Adobe») |  |  |
| color.goal.tint.home.edge | #8F6A51 | #907764 | Borde interior de 1,5 px del riel sobre el tinte · home («Adobe») |  |  |
| color.goal.tint.wedding.bg | #E7D0DC | #35242D | Fondo del fallback sin foto · wedding («Malva polvo») |  |  |
| color.goal.tint.wedding.initial | #C1A5B4 | #654E5B | Inicial gigante del fallback · wedding («Malva polvo») |  |  |
| color.goal.tint.wedding.icon | #684257 | #D6B1C5 | Ícono Duotone del tipo · wedding («Malva polvo») |  |  |
| color.goal.tint.wedding.edge | #8E6D7F | #896D7C | Borde interior de 1,5 px del riel sobre el tinte · wedding («Malva polvo») |  |  |
| color.goal.tint.vehicle.bg | #D7D9BB | #2A3025 | Fondo del fallback sin foto · vehicle («Liquen») |  |  |
| color.goal.tint.vehicle.initial | #AFB190 | #575E4A | Inicial gigante del fallback · vehicle («Liquen») |  |  |
| color.goal.tint.vehicle.icon | #52532A | #C0CAA1 | Ícono Duotone del tipo · vehicle («Liquen») |  |  |
| color.goal.tint.vehicle.edge | #777953 | #757D63 | Borde interior de 1,5 px del riel sobre el tinte · vehicle («Liquen») |  |  |
| color.goal.tint.education.bg | #C6D2E7 | #1F2739 | Fondo del fallback sin foto · education («Pizarra») |  |  |
| color.goal.tint.education.initial | #9CAAC3 | #4B546A | Inicial gigante del fallback · education («Pizarra») |  |  |
| color.goal.tint.education.icon | #3B4D6E | #B0BEDC | Ícono Duotone del tipo · education («Pizarra») |  |  |
| color.goal.tint.education.edge | #627290 | #68738B | Borde interior de 1,5 px del riel sobre el tinte · education («Pizarra») |  |  |
| color.goal.tint.emergency.bg | #D9E5DC | #1C2A23 | Fondo del fallback sin foto · emergency («Salvia») |  |  |
| color.goal.tint.emergency.initial | #A6BBAF | #40584A | Inicial gigante del fallback · emergency («Salvia») |  |  |
| color.goal.tint.emergency.icon | #2F5A45 | #93C2A6 | Ícono Duotone del tipo · emergency («Salvia») |  |  |
| color.goal.tint.emergency.edge | #658675 | #5A7967 | Borde interior de 1,5 px del riel sobre el tinte · emergency («Salvia») |  |  |
| color.goal.tint.other.bg | #D0CBC5 | #353739 | Fondo del fallback sin foto · other («Piedra») |  |  |
| color.goal.tint.other.initial | #A9A49E | #606265 | Inicial gigante del fallback · other («Piedra») |  |  |
| color.goal.tint.other.icon | #4E4A43 | #C3C8CC | Ícono Duotone del tipo · other («Piedra») |  |  |
| color.goal.tint.other.edge | #726E67 | #828588 | Borde interior de 1,5 px del riel sobre el tinte · other («Piedra») |  |  |
| color.status.pending | #48443C | #D0CAC0 | POR SALDAR, borde punteado | 8,8:1 | 11,3:1 |
| color.status.danger | #B4452F | #F0A08C | Exceso de presupuesto, error | 5,0:1 | 8,9:1 |
| color.status.dangerSubtle | #F8DED6 | #3A211B | Fondo de error |  |  |
| color.status.warning | #7A5200 | #E8C46A | Atención | 6,3:1 | 11,0:1 |
| color.status.warningSubtle | #F6E7C2 | #33290F | Fondo de atención |  |  |
| color.status.success | #2D4B3D | #93C2A6 | Confirmación | 8,7:1 | 9,2:1 |
| color.focus.ring | #2E5866 | #8FB3C1 | Anillo 2 px, offset 2 px | 7,0:1 | 8,3:1 |

Contraste de la acción: texto #F7F3EB sobre #2D4B3D = 8,7:1 · #F3EFE7 sobre #3E6B55 = 5,3:1. Texto secundario sobre raised: claro 4,6:1 · oscuro 6,3:1.

### 2.1 Reglas de significado (obligatorias)
1. **Bosque lleno = acción.** Nunca como color de texto financiero.
2. **Verde texto = ahorro destinado** (aportes, metas), siempre con la ficha redonda de alcancía.
3. **Gasto, ingreso y liquidación en tinta.** Se distinguen por signo, ícono (↙ ingreso, ⇄ liquidación), forma de la ficha y etiqueta.
4. **Coral = exceso de presupuesto o error,** siempre con texto e ícono; nunca para saldos entre personas.
5. **Por saldar = neutro** (borde punteado + reloj), no ámbar ni rojo. **Liquidado** = check + texto, en tinta.
6. El color de una persona no codifica reglas financieras.

- **Tinte por tipo de meta** (decisión del fundador del 10 de noviembre de 2026; BRAND_FOUNDATION, «tinte de la categoría de la meta»; Juntia DS v1, «08 Tintes de meta»): el fallback sin foto usa `color.goal.tint.{tipo}` (siete tipos, cuatro tokens cada uno). Sobre un tinte, el texto principal sigue en tinta y el secundario usa `color.status.pending`, nunca `color.text.secondary`, que no llega a 4,5:1 sobre algunos tintes. Limitación aceptada por el gestor y pendiente de la aprobación en pantalla: en claro, el tramo rayado de la persona 2 queda a 1,3–1,6:1 contra el tinte; el patrón y los importes en texto llevan la información.

### 2.2 CSS (referencia, no código de producción)
```css
[data-theme="light"] {
  --color-surface-canvas: #F7F3EB;
  --color-surface-raised: #EEE7DA;
  --color-surface-sunken: #E7DFD0;
  --color-surface-overlay: #FCFAF5;
  --color-surface-inverse: #1A1C1A;
  --color-text-primary: #1A1C1A;
  --color-text-secondary: #6C665B;
  --color-text-onAction: #F7F3EB;
  --color-border-subtle: #DDD3C2;
  --color-border-strong: #C9BDA8;
  --color-action-primary: #2D4B3D;
  --color-action-primaryHover: #24402F;
  --color-action-primaryPressed: #1A3026;
  --color-finance-expense: #1A1C1A;
  --color-finance-income: #1A1C1A;
  --color-finance-saving: #2F5A45;
  --color-finance-savingSubtle: #D9E5DC;
  --color-finance-settlement: #1A1C1A;
  --color-goal-track: #E7DFD0;
  --color-goal-pace: #1A1C1A;
  --color-goal-projection: #6C665B;
  --color-goal-tint-travel-bg: #C4DEE6;
  --color-goal-tint-travel-initial: #95B5BF;
  --color-goal-tint-travel-icon: #285764;
  --color-goal-tint-travel-edge: #577F8B;
  --color-goal-tint-home-bg: #E3CEB9;
  --color-goal-tint-home-initial: #C1A58F;
  --color-goal-tint-home-icon: #71472D;
  --color-goal-tint-home-edge: #8F6A51;
  --color-goal-tint-wedding-bg: #E7D0DC;
  --color-goal-tint-wedding-initial: #C1A5B4;
  --color-goal-tint-wedding-icon: #684257;
  --color-goal-tint-wedding-edge: #8E6D7F;
  --color-goal-tint-vehicle-bg: #D7D9BB;
  --color-goal-tint-vehicle-initial: #AFB190;
  --color-goal-tint-vehicle-icon: #52532A;
  --color-goal-tint-vehicle-edge: #777953;
  --color-goal-tint-education-bg: #C6D2E7;
  --color-goal-tint-education-initial: #9CAAC3;
  --color-goal-tint-education-icon: #3B4D6E;
  --color-goal-tint-education-edge: #627290;
  --color-goal-tint-emergency-bg: #D9E5DC;
  --color-goal-tint-emergency-initial: #A6BBAF;
  --color-goal-tint-emergency-icon: #2F5A45;
  --color-goal-tint-emergency-edge: #658675;
  --color-goal-tint-other-bg: #D0CBC5;
  --color-goal-tint-other-initial: #A9A49E;
  --color-goal-tint-other-icon: #4E4A43;
  --color-goal-tint-other-edge: #726E67;
  --color-status-pending: #48443C;
  --color-status-danger: #B4452F;
  --color-status-dangerSubtle: #F8DED6;
  --color-status-warning: #7A5200;
  --color-status-warningSubtle: #F6E7C2;
  --color-status-success: #2D4B3D;
  --color-focus-ring: #2E5866;
}
[data-theme="dark"] {
  --color-surface-canvas: #121416;
  --color-surface-raised: #191C1F;
  --color-surface-sunken: #22262A;
  --color-surface-overlay: #1E2125;
  --color-surface-inverse: #F3EFE7;
  --color-text-primary: #F3EFE7;
  --color-text-secondary: #A29C92;
  --color-text-onAction: #F3EFE7;
  --color-border-subtle: #2C3135;
  --color-border-strong: #3A4045;
  --color-action-primary: #3E6B55;
  --color-action-primaryHover: #487A61;
  --color-action-primaryPressed: #335B48;
  --color-finance-expense: #F3EFE7;
  --color-finance-income: #F3EFE7;
  --color-finance-saving: #93C2A6;
  --color-finance-savingSubtle: #1C2A23;
  --color-finance-settlement: #F3EFE7;
  --color-goal-track: #22262A;
  --color-goal-pace: #F3EFE7;
  --color-goal-projection: #A29C92;
  --color-goal-tint-travel-bg: #1B333A;
  --color-goal-tint-travel-initial: #405F69;
  --color-goal-tint-travel-icon: #96C7D5;
  --color-goal-tint-travel-edge: #5B808B;
  --color-goal-tint-home-bg: #372F27;
  --color-goal-tint-home-initial: #695749;
  --color-goal-tint-home-icon: #DCB598;
  --color-goal-tint-home-edge: #907764;
  --color-goal-tint-wedding-bg: #35242D;
  --color-goal-tint-wedding-initial: #654E5B;
  --color-goal-tint-wedding-icon: #D6B1C5;
  --color-goal-tint-wedding-edge: #896D7C;
  --color-goal-tint-vehicle-bg: #2A3025;
  --color-goal-tint-vehicle-initial: #575E4A;
  --color-goal-tint-vehicle-icon: #C0CAA1;
  --color-goal-tint-vehicle-edge: #757D63;
  --color-goal-tint-education-bg: #1F2739;
  --color-goal-tint-education-initial: #4B546A;
  --color-goal-tint-education-icon: #B0BEDC;
  --color-goal-tint-education-edge: #68738B;
  --color-goal-tint-emergency-bg: #1C2A23;
  --color-goal-tint-emergency-initial: #40584A;
  --color-goal-tint-emergency-icon: #93C2A6;
  --color-goal-tint-emergency-edge: #5A7967;
  --color-goal-tint-other-bg: #353739;
  --color-goal-tint-other-initial: #606265;
  --color-goal-tint-other-icon: #C3C8CC;
  --color-goal-tint-other-edge: #828588;
  --color-status-pending: #D0CAC0;
  --color-status-danger: #F0A08C;
  --color-status-dangerSubtle: #3A211B;
  --color-status-warning: #E8C46A;
  --color-status-warningSubtle: #33290F;
  --color-status-success: #93C2A6;
  --color-focus-ring: #8FB3C1;
}
```

## 3. Iconografía · Phosphor
- **Regular:** navegación inactiva, íconos en línea e inputs (20 px; navegación 24).
- **Fill:** pestaña activa y estados dentro de toasts.
- **Bold:** glifos dentro de botones (16–18 px).
- **Duotone:** solo dentro de fichas (categoría y aporte).
- **Ficha:** tamaños sm 32/17 · md 40/20 · lg 48/24 · xl 64/30. Radio = 32% del lado. Ícono al 50%, centrado ópticamente.
- **Forma = tipo de fila:** gasto → ficha cuadrada de categoría · aporte → círculo con fondo de ahorro y piggy-bank · liquidación → círculo de contorno con arrows-left-right · ingreso → ficha arena con arrow-down-left.
- **Mapa semántico:** navegación Inicio=`house-simple`, Actividad=`receipt`, Metas=`flag-banner`, Plan=`chart-pie-slice`, Balance=`scales` (solo escritorio), Nosotros=`users-three`, Perfil=`user-circle`; acciones y estados Agregar=`plus`, Guardar=`floppy-disk`, Editar=`pencil-simple`, Buscar=`magnifying-glass`, Filtrar=`funnel-simple`, Compartir=`share-network`, Dividir=`arrows-split`, Liquidar=`arrows-left-right`, Aportar=`piggy-bank`, Retirar=`arrow-u-up-left`, Meta completada=`flag-checkered`, Volver=`caret-left`, Confirmar=`check`, Advertencia=`warning`, Error=`warning-circle`, Éxito=`check-circle`, Por saldar=`clock`, Privado=`lock-simple`, Sin movimientos=`tray`, Fecha=`calendar-blank`.
- Wrapper tipado `<AppIcon name weight size label? />`; import individual de `@phosphor-icons/react`; los íconos decorativos van con `aria-hidden` y los botones de solo ícono con `aria-label`. Área táctil ≥ 44×44.

## 3a. Marca · 1c «La J que se construye»
**[A] Decisión de los fundadores del 23 de noviembre de 2026**, viendo el comp «Juntia DS v1 - 09b Marca 1c» (Claude Design, proyecto `caabf357-a0df-4048-886f-8c46c8979c5a`; las tres direcciones, en «09 Marca»). Registro en la spec 005, «Decisiones de los fundadores que esta spec recoge». MVP-1 no exigía el logo definitivo; los fundadores lo adelantaron.

- **Forma.** Una J de dos piezas con una junta entre ellas: el **fuste** (bosque) y la **curva** (arena). La junta es la idea —dos piezas que encajan sin fundirse— y nunca se cierra. Logotipo: «Juntia» en **Brygada 1918 Medium Itálica**, −0,005 em, sin modificar. Lockup: isotipo = 0,92 × el cuerpo de «Juntia», separación = 0,27 × el cuerpo, centrados en vertical.
- **Geometría.** Una sola fuente: `src/components/brand/logo-geometry.ts`. Maestro sobre rejilla de 32 (fuste 7 × 17, curva de radio 10,5 con contraforma 3,5, junta de 2 unidades). **Versión pequeña** sobre rejilla de 16 ajustada al píxel (fuste de 3 px, junta de 2 px, contraforma de 4 px): solo para la pestaña del navegador.
- **Versiones y color** (primitivos existentes; tokens `--comp-brand-stem`, `--comp-brand-curve` y `--comp-brand-wordmark`):

| Versión | Fuste | Curva | «Juntia» | Fondo |
| --- | --- | --- | --- | --- |
| A color, claro | `forest.700` #2D4B3D | `sand.500` #C49A55 | `forest.700` | lino o blanco |
| A color, oscuro | `forest.300` #93C2A6 | `sand.300` #E0C08C | `charcoal.50` #F3EFE7 | carbón |
| Una tinta | #1A1C1A | #1A1C1A | #1A1C1A | claro, sin color |
| Negativo | lino | lino | lino | carbón o bosque |
| Pestaña clara (`icon.svg`) | `forest.700` | `sand.600` #9C7330 | — | pestaña del navegador |
| Icono de iPhone y `favicon.ico` | `linen.100` #F7F3EB | `sand.400` #D3B07A | — | baldosa `forest.700` |

  Contrastes: «Juntia» bosque sobre lino 8,7:1; lino claro sobre carbón 16,0:1; una tinta 17,2:1. Isotipo en oscuro: 9,2:1 y 10,6:1 sobre carbón. La curva en arena 500 da 2,3:1 sobre lino (WCAG exime los logotipos; el fuste bosque sostiene la lectura); por eso en la pestaña clara pasa al arena 600, 4,3:1 sobre blanco. Arena #D3B07A sobre bosque: **4,7:1** (el 09 decía 6,7:1, que es el valor del arena 200 #EAD5AE).
- **Espacio mínimo:** x = ½ del alto del isotipo, alrededor del lockup y del isotipo solo. **Tamaños mínimos:** isotipo maestro **24 px**; lockup, isotipo de 20 px con «Juntia» a 22 px. Por debajo de 24 px, solo la versión pequeña.
- **Archivos** (estáticos en `src/app`, generados por `scripts/brand/generate-assets.mjs`): `icon.svg` (versión pequeña, colores por `prefers-color-scheme`), `favicon.ico` (16 y 32 px sobre baldosa bosque: un `.ico` no cambia con el tema y el bosque mide 1,3:1 sobre la pestaña oscura), `apple-icon.png` (180 px, fondo bosque lleno, sin transparencia ni esquinas), `opengraph-image.png` y `twitter-image.png` (1200 × 630). **Sin manifest ni service worker**: la PWA está aplazada por los fundadores.
- **Imagen para compartir.** Bosque liso; logotipo centrado; frase **«Lo tuyo, lo mío y lo nuestro.»** (la A, elegida el 23 nov 2026) y «FINANZAS EN PAREJA» en `sand.200`. Composición centrada para que el recorte cuadrado de WhatsApp conserve el logotipo. **Una sola para todos los enlaces, también la invitación: nunca nombres, montos ni datos.** Ninguna página define su propia tarjeta. Texto de la tarjeta (`description`, `og:description` y `twitter:description`), elegido por los fundadores el 24 de noviembre de 2026: **«Las cuentas de la pareja, claras: quién pagó, cuánto le toca a cada uno y lo que ahorran juntos.»** (`copy.share.description`).
- **En la app** (componente `<Logo>`, SVG `role="img"` con nombre accesible «Juntia», ancho y alto fijos; «Juntia» con `textLength` para que la caja no cambie al llegar la itálica):
  - acceso a 390: arriba de la columna, isotipo de 26 + «Juntia» a 28, en Entrar, Primera entrada y la invitación;
  - acceso desde 1024: arriba a la izquierda del lienzo, isotipo de 28 + «Juntia» a 30;
  - sidebar desde 1280: isotipo de 26 + «Juntia» a 28;
  - rail de 1024 a 1279: el isotipo solo, a 28 px, en lugar de la «J»;
  - **a 390 dentro de la app no hay logo**: la app no tiene barra superior con marca y no se añade (fundadores, 23 nov 2026).
- **Prohibido:** cerrar la junta, unir las piezas o invertir sus colores; rotar, inclinar más, contornear, sombrear o aplicar degradados; el bosque del isotipo sobre un fondo oscuro; «Juntia» en redonda dentro del logo; el maestro por debajo de 24 px; añadir datos de la persona o de la pareja a la imagen para compartir.
- **[V] pendientes de verificar en navegador real** (no se dan por hechos):
  1. que Safari (macOS e iOS) use el `icon.svg` con tema; si no, debe mostrar la baldosa del `favicon.ico`;
  2. que Chrome y Edge cambien el color del `icon.svg` al pasar al tema oscuro sin recargar;
  3. los colores reales de las pestañas de Safari 26 (en el comp son aproximados).

## 4. Cambios propuestos respecto a I2 y al maestro
- [P] Sara lila → petróleo; Hogar lavanda → azul tenue; superficie oscura 1 #1C1F20 → #191C1F.
- [P] Gasto, ingreso y liquidación en tinta (antes el ahorro y el ingreso podían compartir verde).
- [A] DEC-G04 (aprobado el 2 nov 2026, maestro v1.2): `total_destinado_neto` se conserva en el dominio como métrica de planificación, pero nunca como «Total gastado» ni KPI principal. Inicio muestra «Gasto» y «Apartado para metas» por separado; la métrica solo aparece como nota explicada en Análisis.
- [V] Contraste en dispositivos reales, scrim con fotos de usuario, rendimiento de sombras táctiles en gama media. (El scrim con fotos **no aplica a MVP-1**: sin fotos de metas hasta MVP-2, maestro §15.10, decisión 24.13. Las sombras táctiles en Android quedan en la excepción prorrogada más allá de MVP-1, decisión 24.6.)
- [P] Cuenta reutiliza los fondos de categoría para sus fichas de ícono (perfil → hogar, pareja → restaurantes, apariencia → ocio, privacidad → salud, documentos → otro, exportar → servicios). No hay tokens nuevos.
