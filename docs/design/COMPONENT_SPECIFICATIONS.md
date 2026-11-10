# COMPONENT_SPECIFICATIONS.md — Juntia v1 · I2 Bosque & Arena
Lote 2 de 5. Visual: `Juntia DS v1 - 02 Componentes.dc.html`. Los tokens vienen de `DESIGN_SYSTEM.md`.
Etiquetas: **[A]** aprobado · **[P]** propuesta · **[V]** pendiente de validación técnica.

Convención de component tokens: `comp.<componente>.<parte>.<propiedad>`, que se convierte en `--comp-button-primary-bg`. Cada token apunta a uno semántico, salvo que se indique lo contrario.

## Datos de referencia (octubre, contexto Nosotros)
| Gasto | Monto | Pagó | Reparto | Sara | Tomás |
| --- | --- | --- | --- | --- | --- |
| Arriendo | 1.600.000 | Sara | Porcentaje 55/45 | 880.000 | 720.000 |
| Carulla Laureles | 186.400 | Tomás | 50/50 | 93.200 | 93.200 |
| Mercado del mes | 453.600 | Tomás | 50/50 | 226.800 | 226.800 |
| Cena en Carmen | 240.000 | Sara | 50/50 | 120.000 | 120.000 |
| Internet fibra | 89.900 | Sara | 50/50 | 44.950 | 44.950 |
| EPM | 270.100 | Tomás | 50/50 | 135.050 | 135.050 |
| **Total** | **2.840.000** | S 1.929.900 · T 910.100 | | **1.500.000** | **1.340.000** |

Saldo: Sara +429.900 y Tomás −429.900, así que **Tomás → Sara 429.900 · Por saldar**. Antes de Carulla el saldo era 523.100: Tomás pagó 186.400 y le corresponde la mitad, así que el saldo baja 93.200. Ahorro de octubre: Sara 500.000 (22 oct) + Tomás 400.000 (15 oct) = **900.000 apartado**, que no se suma al gasto. Japón: 11.340.000 de 18.000.000 (Sara 6.120.000 · Tomás 5.220.000); faltan 6.660.000 en 6 meses, o sea 1.110.000/mes sugerido. **P1, solo referencia:** grupo de 3 (Apto Laureles): total 3.600.000 · 40/35/25 · pagaron 2.100.000/900.000/600.000, así que Tomás → Sara 360.000 y Vale → Sara 300.000.


**DEC-G04 en estos datos:** Nosotros = consumo 2.840.000 · aportes 900.000 · `total_destinado_neto` 3.740.000 (planificación, nunca «Total gastado»). Yo, Sara = consumo 1.912.900 (412.900 privados + 1.500.000 parte) · aportes 500.000 · destinado neto 2.412.900. Las vistas no se suman. Tabla completa con retiros y gastos con meta en `HANDOFF_CLAUDE_CODE.md`. «Porcentaje 55/45» es un reparto configurable, no proporcional a ingresos.

---

## Button
- **Anatomía:** contenedor · ícono opcional (Phosphor Bold 17) · etiqueta (label.m; en tamaño lg 16/600).
- **Variantes:** `primary` (bosque lleno, una sola por vista) · `secondary` (pieza raised) · `ghost` (borde 1.5 subtle) · `danger` (fondo dangerSubtle + texto `coral.700` en claro, 5,39:1; `status.danger` en oscuro, 7,16:1).
- **Tamaños:** sm 36 / radio 12 · md 44 / radio 14 · lg 52–56 / radio 18. Área táctil mínima 44.
- **Estados:** hover `action.primaryHover` · pressed `action.primaryPressed` + translateY(2px) y la sombra de canto baja a 0 · focus anillo 2 px `focus.ring` con offset 2 · disabled `surface.sunken` + `text.secondary`, sin sombra, con `aria-disabled` · loading: ícono circle-notch girando a 0,8 s/vuelta, etiqueta en gerundio y ancho fijo (sin salto de layout).
- **Tokens:** `comp.button.primary.bg` → action.primary · `.fg` → text.onAction · `.edge` → `0 3px 0 forest.900` (oscuro `#22402F`) · `.highlight` → `inset 0 1px 0 rgba(255,255,255,.18)`.
- **Motion:** press con spring `snappy`; con reduced motion, sin desplazamiento (solo cambia el color).
- **A11y:** `<button>` nativo; los botones de solo ícono llevan `aria-label`. Contraste del primario: 8,7:1 en claro y 5,3:1 en oscuro.

## Input
- **Anatomía:** label (12/500 soft) · campo 46–48 px radio 14 `surface.sunken` con sombra interior · ícono final opcional · ayuda o error. El placeholder y el prefijo «$» del monto van en `linen.800` en claro (7,32:1 sobre sunken) y en `text.secondary` en oscuro (5,59:1).
- **Estados:** focus anillo 2 px `focus.ring` (sin cambiar el tamaño) · error borde 1.5 `status.danger` + ícono warning-circle + mensaje que dice cómo corregir, con el texto en `coral.700` en claro y `status.danger` en oscuro · disabled fondo canvas + borde punteado.
- **Monto:** `inputmode="numeric"`, máscara COP con puntos de miles, sin decimales, `aria-describedby` hacia la ayuda. Valor máximo 999.999.999; los importes largos reducen el tamaño con `clamp`, sin cortar el texto.
- **A11y:** el error se anuncia con `aria-live="polite"` y se enlaza con `aria-invalid` y `aria-errormessage`.

## Tabs / Segmented
- **Segmented** (Yo/Nosotros, reparto): riel sunken radio 14 · perilla radio 11 con elevación `elevation.raised` y fondo `surface.overlay` en claro y `charcoal.600` en oscuro · etiqueta 13/600 en `text.primary` (12,95:1 sobre sunken). `role="tablist"` o radiogroup según el caso, con flechas de teclado. La perilla se desliza con un layout animation spring `snappy`.
- **Subrayado** (filtros de lista): 14/600 · indicador de 2 px en tinta.
- **Contexto Yo/Nosotros:** siempre visible arriba en móvil y en el sidebar en escritorio. Cambiarlo dispara el motion «Context Transition».

## CategoryIcon
- **Tamaños:** sm 32/17 · md 40/20 (filas) · lg 48/24 (selector) · xl 64/30 (detalle). Radio = 32% del lado.
- **Color:** fondo y pictograma de la tabla 1.3 de DESIGN_SYSTEM, con contraste del pictograma ≥ 5:1 en claro y ≥ 7,5:1 en oscuro.
- **Forma = tipo:** cuadrada (gasto o ingreso) · círculo de ahorro (aporte) · círculo de contorno (liquidación).
- **Peso:** Duotone dentro de la ficha. Seleccionado: anillo 2 px de tinta, sin cambiar el fondo.
- Es decorativo (`aria-hidden`); la categoría se nombra en el texto de la fila.

## ExpenseRow
- **Anatomía:** ficha 40 · título 15/600 con elipsis · meta 12 (avatar 16 de quien pagó + reparto + fecha) · importe 15/600 tabular · badge de estado opcional.
- **Variantes:** gasto (tinta, sin signo) · ingreso (+, ficha arena) · aporte (+, verde ahorro, «ahorro, no es consumo») · liquidación (ícono ⇄, «no es un gasto») · privado (candado; **nunca aparece en el contexto Nosotros**) · por saldar (badge neutro punteado).
- **Estados:** hover fondo sunken radio 14 · pressed scale .99 · nueva (fondo savingSubtle que se desvanece en 1,2 s) · eliminando (colapsa la altura en 240 ms).
- **Responsive:** en móvil va en 3 columnas; desde md pasa a 4 (título · meta · reparto · importe).
- **A11y:** la fila es un enlace al detalle, con nombre accesible «Carulla Laureles, 186.400 pesos, pagó Tomás, 50/50, hoy».

## SharedBalance  [P]
- **Propósito:** separar lo que **pagó** cada persona de lo que **le corresponde**, y mostrar el saldo resultante.
- **Anatomía:** encabezado (title.l + resumen) · fila por persona: avatar + nombre + «pagó X · le corresponde Y (pct)» + estado («Le deben» / «Debe» / «Al día») · barra de 30 px radio 10 · leyenda · sugerencias de liquidación (deudor → acreedor, monto, badge) · acciones.
- **Codificación de la barra (misma escala para todas las personas):** tramo de color = lo pagado hasta la marca · marca vertical de 2 px en tinta = lo que le corresponde · tramo con contorno de tinta pasada la marca = puso de más · hueco punteado = le falta · tramo rayado en tinta al 55% = liquidó · contorno punteado pasada la marca = recibió.
- **Alcance:** P0 = pareja de exactamente dos. Grupos de 3 o más = P1 (la variante «Apto Laureles» es referencia, no criterio de aceptación).
- **Cálculo P0:** `share_i = Σ (parte_i de cada gasto según su reparto)`; `net_i = paid_i − share_i + settled_out_i − settled_in_i`. Repartos 50/50, porcentaje o importe; liquidaciones parciales. Sugerencia determinista: quien tiene `net < 0` → quien tiene `net > 0` por `|net|`. Nunca crea una transferencia. **[V]** Tests de la función pura en Claude Code.
- **P1:** optimización de liquidaciones para N personas, a definir con una decisión de dominio.
- **Reglas:** las liquidaciones no son consumo, no suman al gasto del mes y se listan aparte. No se asume 50/50. Los gastos privados no entran. Los colores de persona son configurables y cada uno lleva un patrón (sólido, rayado o punteado).
- **Estados:** por saldar · liquidado (barras justo en la marca, badge LIQUIDADO) · sin gastos compartidos (vacío con explicación) · cargando (skeleton de las filas).
- **N personas (P1):** una fila por persona; con más de 4 se muestran las 4 con mayor saldo y «Ver todas». Altura máxima de la sección: 4 filas.
- **A11y:** cada fila tiene texto completo. La barra lleva `role="img"` y `aria-label` («Sara pagó 1.929.900; le corresponden 1.500.000; le deben 429.900»). La tabla de desglose está disponible como alternativa.
- **Motion:** ver «Shared Balance» en MOTION_SYSTEM.

## GoalCard
- **Anatomía:** foto (focal point configurable) · scrim · metadatos (overline: COMPARTIDA/PERSONAL + fecha) · nombre (Brygada 1918 a 500, 32 en móvil y 56–132 en el inmersivo: el 88 % de los tamaños anteriores, como la escala de `DESIGN_SYSTEM.md` §1.4; GoalCard no existe en la 001 y su slice confirma los valores con el comp) · % · cinta · importe.
- **Cinta:** riel radio pill de 8–16 px · un tramo por persona (color + patrón) · tramo punteado = próximo aporte planeado (proyección, no certeza) · marca de ritmo = dónde deberían ir para llegar a la fecha (solo si la meta tiene fecha).
- **Fotografía:** scrim degradado `rgba(10,12,13,.42)` arriba hasta 30%, transparente en el centro y `.82` abajo (claro); en oscuro +0,1 de opacidad. Texto siempre blanco con contraste ≥ 4,5:1 medido sobre la zona del scrim. **Focal point** guardado como `{x,y}` 0–1 → `object-position`. Crop: 4:3 en tarjeta, 9:16 en inmersivo móvil y 4:5 en escritorio. Fotos muy claras: el scrim inferior sube a .9 (detección por luminancia media [V]). Sujeto en el borde: el focal point manda y el título nunca se superpone a la zona de 30% alrededor del foco [V].
- **Fallback sin foto:** tinte del tipo de meta (`color.goal.tint.{tipo}.bg`; BRAND_FOUNDATION, «tinte de la categoría de la meta»; decisión del fundador del 10 de noviembre de 2026, Juntia DS v1 «08 Tintes de meta») + inicial gigante en serif en `.initial` + ícono Duotone del tipo en `.icon` (viaje airplane-tilt, vivienda house-line, boda heart, vehículo car-profile, educación graduation-cap, emergencias lifebuoy, otra flag-banner). Texto principal en tinta y secundario en `status.pending`. Sobre el tinte, el riel de la cinta lleva un borde interior de 1,5 px en `.edge`. En la pila y el abanico cada tarjeta conserva su tinte al 100 %; las traseras no se atenúan: la profundidad sale del desplazamiento, la sombra de la frontal y un filete de 1 px. El «+» de crear no lleva tinte. Lograda: ficha rellena de tinta con flag-checkered; archivada: ficha con contorno y archive; el ícono del tipo se queda.
- **Estados:** cargando foto (fondo #2A2D31 + skeleton del texto) · error de foto (fallback) · completada (flag-checkered + «Lo lograron», cinta llena).

## GoalStack  [P]
- **Anatomía:** hasta 3 capas visibles: la frontal completa, la segunda asoma 60 px con nombre y % y la tercera solo un canto de color. Pie con «N metas» + «Ver todas» (siempre visible, alternativa al gesto).
- **Cantidades:** 0 → estado vacío · 1 → solo la tarjeta, sin pila · 2 → frontal + 1 asomando · 3 o más → frontal + 2 · más de 3 → el conteo en el pie.
- **Gestos:** tocar la frontal la abre · tocar la que asoma la trae al frente (spring `card`) · deslizar vertical recorre la pila. Teclado: Tab entre tarjetas y Enter abre. Lector de pantalla: lista de metas, no un carrusel.
- **Escritorio:** la pila se abre en abanico horizontal (la segunda girada 4°) con «+» punteado para crear meta.

## BudgetIndicator (opcional)
- Barra de 8 px · color del pictograma de la categoría · texto «Quedan X».
- **Cerca** (≥ 85%): texto ámbar con ícono warning. **Excedido:** barra rayada coral + «Se pasaron por X» + warning-circle. **Sin presupuesto:** fila punteada + «Crear presupuesto» (nunca un 0%).
- **P0:** cualquiera de los dos integrantes crea, edita o desactiva; se registra autor, fecha e historial; sin segunda aprobación ni activación automática. **Conflicto [V]:** si el otro guardó antes, no se sobrescribe: se muestra «Tomás cambió este presupuesto» con su valor y la opción de revisar.
- **P1:** presupuesto sugerido por historial, siempre con confirmación explícita.

## AppShell / Navigation
- **Móvil (< 768):** barra inferior flotante radio 24, raised, con sombra difusa sutil (0 10px 28px; 10% claro / 45% oscuro) · Inicio · Actividad · Anotar · Metas · Plan · Anotar integrado al centro, a ras de la barra: 54×54, radio 18, bosque, canto de 3 px, sin elevación ni anillo · columnas flexibles con 64 px al centro · etiquetas 11/500 en una línea · la activa en Fill sobre ficha. Respeta `env(safe-area-inset-bottom)`.
- **Tablet (768–1023):** barra inferior + contenido en 2 columnas.
- **Escritorio (≥ 1280):** sidebar de 248 px (fondo `surface.raised` en claro y `charcoal.950` en oscuro; destinos inactivos en `linen.800` en claro y `charcoal.200` en oscuro; el rail de 1024 comparte el fondo, pero sus destinos inactivos van en `text.secondary`) · logotipo · segmented de contexto · destinos de 46 px (Inicio, Actividad, Metas, Plan, Balance) · Anotar como bloque bosque fijo · perfil abajo. **Entre 1024 y 1279:** rail de 76 px (ver `RESPONSIVE_SPECIFICATIONS.md`).
- Skip link «Ir al contenido». `nav` con `aria-label` y `aria-current="page"`.

## BottomSheet
- `surface.overlay`, radio superior 30, asa de 36×5, scrim de carbón al 38% (claro) o 62% (oscuro).
- Alturas de parada: `peek` 380 px · `full` = viewport − 96. Se arrastra desde el asa o el contenido cuando el scroll está en 0.
- Spring `sheet`. Cierre con gesto hacia abajo, botón ×, Escape o toque en el scrim, salvo que haya cambios sin guardar (en ese caso pide confirmación).
- Desde md se convierte en diálogo centrado de 520 px de ancho. Foco atrapado; al cerrar vuelve al disparador.

## Modal
- 400–480 px, radio 26, overlay, elevación overlay. Título serif 28 · cuerpo body.m · acciones a la derecha (la destructiva al final).
- `role="alertdialog"` para las destructivas. El foco inicial va en Cancelar.

## Chart
- Barras mensuales radio 8/3, el mes actual en tinta y el resto en sunken. Etiquetas sobre la barra en 11/600.
- Nunca se apilan ahorro y gasto. Tabla equivalente oculta para lectores de pantalla y tooltip accesible por teclado.
- **Motion:** las barras crecen desde la base (stagger de 40 ms); al cambiar de mes hacen crossfade de valores con counter.

## Skeleton
- Replica la geometría exacta del componente final (alto de fila 60, ficha 40, tarjeta de meta 228).
- Color `skel` (#E7DFD0 / #22262A). Pulso de opacidad 1 → .55 en 1,6 s, ease-in-out. Sin shimmer.
- Reduced motion: estático. `aria-busy="true"` en el contenedor y un texto oculto «Cargando movimientos».

## Toast
- Fondo inverse, radio 16, 14/500, ícono Fill. Acción opcional (Deshacer o Reintentar).
- Duración: 6 s con acción, 4 s sin acción. Se pausa con hover o foco.
- Error: dangerSubtle + texto en tinta + ícono danger. `role="status"` (éxito) o `role="alert"` (error).
- Sube 16 px con spring `gentle`; con reduced motion solo aparece por opacidad.

## ChangePreview  [P]
- Lista de cifras que cambian: etiqueta · antes (tachado, `text.secondary`) → después (`text.primary` 15/600) · nota opcional 12. Solo cifras visibles para quien mira; nunca privados del otro.
- A11y: `role="list"`; cada fila tiene `aria-label` «X: antes …, después …».

## FundingLedger (reparto ≠ fondos)  [P]
- Dos bloques con borde 1.5 `border.subtle`, radio 18 y título overline: «Reparto del gasto · quién lo asume» (barra por persona, define el balance) y «Fondos de la meta · de quién son» (un campo de importe por aportante, con un tope en lo que tiene disponible).
- Validación: la suma de los fondos = importe usado (si no, Guardar se bloquea y se dice cuánto falta); el uso nunca supera el gasto. Badge «Pide aprobación» en la fila del otro integrante. Los fondos propios se aplican al registrar; los ajenos, solo al aprobar.

## ConfirmationBadge y solicitud pendiente  [P]
- PENDIENTE DE {nombre} (neutro, borde punteado, hourglass) · APROBADO (savingSubtle, check-circle) · {nombre} NO APROBÓ (sunken, minus-circle, sin rojo) · NO SE REGISTRÓ (danger, solo errores del sistema) · CON META (savingSubtle, piggy-bank).
- La tarjeta pendiente aclara que el gasto ya está registrado y que solo falta el uso de los fondos del otro; ofrece «Cancelar solicitud». No vence.

## PlanningNote (destinado neto)  [P]
- Nota secundaria en `surface.sunken`, radio 16: overline «Destinado neto · para planificar» · valor 17/600 · frase fija «No es lo gastado ni un saldo bancario» (si es negativo: «Negativo: liberaron de metas más de lo que destinaron»).
- «Cómo se calcula»: botón (≥ 44 px) con `aria-expanded` que despliega un `<dl>` con Gasto, + Aportes, − Retiros, − Gastos pagados con metas, = Destinado neto. Los signos tienen texto accesible («más», «menos», «igual a»).
- Nunca es el número héroe ni se rotula «Total gastado». Se usa en Análisis; se puede reutilizar en cualquier resumen de periodo.

## Flujo Mover a Pareja  [A]
A1 detalle personal (botón secundario «Mover a Pareja») · A2 importe, participantes y reparto; el pagador original se muestra fijo · A3 ChangePreview + aviso de visibilidad · A3b confirmando · A4 resultado con fila «movido desde Yo» y toast con «Deshacer» (solo si el servidor lo permite) · A5 error sin conexión con Reintentar (misma clave). Con financiación de una meta personal: en lugar del botón, LimitNote que explica que primero hay que revertir ese uso. Escritorio: diálogo de 520 px.

## Flujo Gasto con meta  [A]
B1 «Cómo se pagó: Con una meta» + metas del mismo contexto (las personales, deshabilitadas en Nosotros con el motivo) · B2 importe + FundingLedger · B3 efecto «ahora» y «si aprueba» · B4 gasto ya registrado + tarjeta de solicitud pendiente (cancelable, no vence) · B5 la otra persona aprueba o rechaza la cantidad exacta · B6 aprobado · B7 rechazado: el gasto sigue y solo cuentan los fondos propios. Errores: fondos insuficientes por aportante, aportes cambiados antes de aprobar, sin conexión.

## Cuenta (02·9–02·10, pantallas 04·14–04·19)  [P]
### AccountButton
- **Anatomía:** avatar 40 (radio 14, color y patrón de persona) en un área de 44 · anillo de 1,5 px `border.strong` con separación `surface.canvas` · ficha de engranaje de 20 en `surface.raised`.
- **Props:** `user`, `onOpen`. **Estados:** normal, foco (anillo 2 px `focus.ring`), presionado (scale .96). **A11y:** `<button aria-label="Mi cuenta">`, title en escritorio. **Posición:** a la izquierda del encabezado de Inicio, Actividad, Metas y Plan.
- **Sidebar:** fila de 56 «Nombre · Mi cuenta · con {pareja}» + caret; `aria-current="page"` dentro de Cuenta. Rail de 1024: avatar 36 en un área de 48.
### ProfileHeader
Avatar 72 (inicial en Brygada 1918, color del sistema, no editable) · nombre `title.xl` · correo `body.m` (`overflow-wrap:anywhere`) · botón secundario «Editar perfil» de 44. Sin datos financieros.
### AccountMenuItem
Reutiliza la fila de lista. Ficha de 40 con fondo de categoría · título 15/600 · subtítulo 13 · valor + caret. Variantes: navegación, valor, externa (`role="link"`, arrow-up-right) y cargando. Lo que la app no hace no se muestra como fila: se usa LimitNote. Alto mínimo 64. «Cerrar sesión» va separado por un borde `border.strong`, en tinta y no en rojo.
### ThemeSelector
`radiogroup` de 3 tarjetas con miniatura. Flechas cambian y aplican. Seleccionada: anillo 2 px + ícono Fill. El tema cambia con la transición de color de 180 ms de MOTION_SYSTEM (instantáneo con reduced motion). Persistencia [P][V]: `profiles` + cookie leída por el script bloqueante.
### CoupleStatus
Avatares superpuestos (el pendiente con contorno punteado) · badge (ACTIVA, PENDIENTE, SOLO TÚ, NO VÁLIDA) · título serif 32 · línea de contexto. Nunca muestra saldos ni el correo del otro.
### SensitiveActionConfirmation
`alertdialog`, consecuencia en una frase, foco inicial en la opción segura, Escape cancela, botón `danger` con estado «…ando» y error que dice qué quedó igual. Solo para acciones irreversibles (anular invitación). No se usa para cerrar sesión.
### LimitNote
Nota informativa en `surface.sunken`, radio 16, ícono info + título 14/600 + texto 13. No es un control: sin caret, botón ni badge técnico. Se usa en «Salir de la pareja», «Eliminar tu cuenta» y «No se puede mover este gasto». `role="note"`.
### Seguridad y sesión, Exportar
- **Seguridad y sesión:** correo de solo lectura · «Cambiar contraseña» envía un enlace seguro (estado enviado) · «Esta sesión» con Cerrar sesión ghost.
- **Exportar:** hoja con radiogroup JSON/CSV, qué incluye y qué no, estados preparando, listo (Descargar) y error (no se descargó nada). Aclara que no sirve para restaurar.

## Badge de estado
POR SALDAR (neutro, borde punteado, clock) · LIQUIDADO (savingSubtle, check-circle) · EXCEDIDO (danger, texto `coral.700` sobre dangerSubtle en claro y `status.danger` en oscuro) · CERCA DEL LÍMITE (warning) · PRIVADO (sunken, texto `text.primary`, lock). Siempre ícono + texto, 11/600, tracking .06em.

## Anotar gasto (flujo)  [P]
1. **E1 · Monto + categoría:** la hoja abre con foco en el monto y teclado nativo. Muestra las 5 categorías recientes y un resumen editable (fecha, pagador, reparto), con Guardar habilitado al tener monto + categoría.
2. **E2 · Detalles:** descripción, fecha, contexto, pagó, participantes y reparto (50/50 · Porcentaje · Importe).
3. **E3 · Error:** si el personalizado no suma el total, Guardar queda deshabilitado y aparece «Faltan $20.000 por asignar».
4. **E4 · Guardando:** spinner en el botón y campos bloqueados. Sin promesa offline.
5. **E5 · Guardado:** la hoja se cierra, el total cuenta hacia arriba, la fila nueva queda resaltada y el saldo se tacha y se actualiza. Toast con Deshacer de 6 s.
- **Teclado:** nativo `inputmode="numeric"` [P] (ver la comparación en el archivo visual).
- **Escritorio:** diálogo de 520 px con atajo `N`, Enter guarda y Escape cierra.
- **Registro único (DEC-G04):** el mismo flujo registra privado o compartido con el campo Contexto. Un gasto compartido se guarda una vez.
- **Reclasificar privado → compartido:** desde Editar gasto, cambiar Contexto a Nosotros y confirmar el reparto es una sola acción. Anula el privado y crea el compartido de forma atómica y auditada (ADR-001); nunca quedan dos gastos activos. **[V]**
- **Pagar con una meta:** el gasto sigue siendo uno solo; el uso de la meta se asigna por aportante y pide confirmación si usa aportes del otro integrante. **[V]**
