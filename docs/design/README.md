# docs/design — Paquete de diseño aprobado · Juntia v1

Dirección visual elegida: **I2 · Bosque & Arena**. Aprobada el 2 de noviembre de 2026.

## Procedencia

Estos seis documentos se produjeron en el proyecto de Claude Design
«Juntia: Responsive design y design system»
(`https://claude.ai/design/p/caabf357-a0df-4048-886f-8c46c8979c5a`)
y se importaron aquí para que el repositorio sea autosuficiente y ningún agente
dependa de un servicio externo para leerlos. **Ninguno de los seis sigue
intacto**: todos tienen líneas corregidas —por reubicación, en revisión o por
decisión de los fundadores— y cada una está en el **Log de cambios** más abajo.
(Hasta el 4 de noviembre de 2026 seguían intactos `BRAND_FOUNDATION.md` y
`MOTION_SYSTEM.md`; el primero cambió con la decisión 14 y el segundo en el PR C
de P0-3, registrado a posteriori por 004-T085.)

## Qué hay aquí

| Archivo | Contenido |
| --- | --- |
| `HANDOFF_CLAUDE_CODE.md` | **Empieza por aquí.** Decisiones de producto aprobadas, alcance P0 vs P1, DEC-G04 con su tabla de verificación, orden de implementación, reglas de negocio de la UI, accesibilidad, pendientes y criterios de aceptación de P0. |
| `DESIGN_SYSTEM.md` | Tokens primitivos y semánticos, color, tipografía, espacio, elevación, iconografía Phosphor, CSS de referencia para los dos temas. |
| `COMPONENT_SPECIFICATIONS.md` | Anatomía, variantes, estados y a11y de cada componente. Incluye el fixture de octubre que los cálculos deben reproducir. |
| `MOTION_SYSTEM.md` | Principios, tokens de motion y los seis momentos especificados, con fallback de reduced motion. |
| `RESPONSIVE_SPECIFICATIONS.md` | Breakpoints 360/390/768/1024/1280/1440 y reglas por patrón. |
| `BRAND_FOUNDATION.md` | Esencia, personalidad, voz, microcopy y reglas de fotografía de metas. |

## Política de edición de estos documentos

Los seis documentos son **fuente aprobada**. Eso no los congela: los corrige un
proceso, no una prohibición.

- **Corrección de reubicación** —rutas rotas por la estructura de carpetas de
  este repositorio—. Se aplica directamente y se registra en el **Log de
  cambios**. No cambia el significado de nada.
- **Corrección sustantiva** —nombres, valores, decisiones, redacción—.
  **Permitida mediante revisión humana y PR**, registrada en el Log de cambios
  indicando quién la aprobó. **No se aplica dentro de un PR de código.**
- **La procedencia la preserva git**, no una prohibición. La importación
  prístina de los seis documentos está en el commit `f2150de`; cualquier
  edición posterior es visible en el historial.

Toda edición a un archivo importado queda registrada en el **Log de cambios**.

## Nota sobre las rutas internas

`HANDOFF_CLAUDE_CODE.md` citaba los demás documentos como `docs/DESIGN_SYSTEM.md`,
`docs/MOTION_SYSTEM.md`, etc., porque así estaban organizados en el proyecto de
diseño; en este repositorio viven todos en `docs/design/`. Esas rutas se
corrigieron a nombre pelado (ver el Log de cambios) y la cita del maestro se
corrigió a `../JUNTIA_MASTER.md`. Los demás documentos ya se citaban entre sí
con nombre pelado, que resuelve bien dentro de `docs/design/`, y **no se
tocaron**. Esas dos son las únicas correcciones de reubicación del paquete; las
otras dos ediciones del handoff son sustantivas y están justificadas en el Log.

## Log de cambios respecto al paquete importado

| Archivo | Líneas | Cambio | Motivo |
| --- | --- | --- | --- |
| `HANDOFF_CLAUDE_CODE.md` | 5 | `JUNTIA_MASTER.md` → `../JUNTIA_MASTER.md` | Reubicación: el maestro vive un directorio por encima. Ruta rota en este repositorio. |
| `HANDOFF_CLAUDE_CODE.md` | 6 | `docs/DESIGN_SYSTEM.md`, `docs/COMPONENT_SPECIFICATIONS.md`, `docs/MOTION_SYSTEM.md`, `docs/RESPONSIVE_SPECIFICATIONS.md`, `docs/BRAND_FOUNDATION.md` → mismos nombres sin el prefijo `docs/` | **Reubicación.** Los cinco viven en el mismo directorio que el handoff. Rutas rotas en este repositorio. |
| `HANDOFF_CLAUDE_CODE.md` | 159 | `ThemeProvider, Settings` → `ThemeProvider, ThemeSelector` | **Corrección sustantiva aprobada por revisión independiente del PR #1.** No existe ningún componente `Settings` en el paquete: la estructura aprobada es «Mi cuenta», rutas `/cuenta/*` (maestro §15.3), y el componente del tema es `ThemeSelector` (`COMPONENT_SPECIFICATIONS.md` §Cuenta). Error de trazabilidad, no decisión artística. |
| `HANDOFF_CLAUDE_CODE.md` | 163 | `SharedBalance, Settings` → `SharedBalance, CoupleStatus` | **Corrección sustantiva aprobada por revisión independiente del PR #1.** El estado de la pareja lo presenta `CoupleStatus` (`COMPONENT_SPECIFICATIONS.md` §Cuenta), no un componente `Settings` inexistente. |
| `RESPONSIVE_SPECIFICATIONS.md` | 16 | «en lg, el primer ítem del rail abre un popover con el segmentado» → el selector va «arriba a la derecha del contenido en móvil, tablet y lg» | **Decisión de los fundadores, 3 de noviembre de 2026** (maestro §15.10, decisión 5). Resuelve la errata del popover: el comp nunca lo dibujó y ponía el wordmark en ese sitio. |
| `COMPONENT_SPECIFICATIONS.md` | 94 | «Escritorio (≥ 1024): sidebar» → «Escritorio (≥ 1280): sidebar», con «Entre 1024 y 1279: rail de 76 px» | **Corrección determinada** por la jerarquía: manda el maestro §15.3. No requería decisión. |
| `COMPONENT_SPECIFICATIONS.md` | 94 | «perfil y tema abajo» → «perfil abajo» | **Decisión de los fundadores, 3 de noviembre de 2026** (maestro §15.10, decisión 6). El tema vive solo en Mi cuenta › Apariencia, como dibuja el comp. |
| `COMPONENT_SPECIFICATIONS.md` | 94 | Destinos sin enumerar → «(Inicio, Actividad, Metas, Plan, Balance)» | **Decisión de los fundadores, 3 de noviembre de 2026** (maestro §15.10, decisión 4). Balance es destino propio en escritorio, como dibuja el comp en el rail y en el sidebar. |
| `DESIGN_SYSTEM.md` | 205 | Mapa semántico de navegación: se añade `Balance=` `scales` (solo escritorio) | **Decisión de los fundadores, 3 de noviembre de 2026** (maestro §15.10, decisión 4). El icono es el que dibuja el comp; el nombre `scales` de Phosphor se confirma al implementar el rail en la 001 **[V]**. |
| `COMPONENT_SPECIFICATIONS.md` | 27, 168 | Texto de `danger` sobre `dangerSubtle` (Button `danger`, badge EXCEDIDO): `status.danger` → `coral.700` **solo en claro**; en oscuro sigue `status.danger` | **Decisión de los fundadores, 3 de noviembre de 2026 (errata de contraste).** En claro, `status.danger` #B4452F sobre `dangerSubtle` #F8DED6 mide **4,28:1** y no cumple el [A] de `HANDOFF_CLAUDE_CODE.md` §Accesibilidad («todos los pares ≥ 4,5:1»). El primitivo existente `coral.700` #9C3A26 mide **5,39:1**. No se crea ningún color. En oscuro, `coral.700` sobre `dangerSubtle` #3A211B daría 2,16:1, así que se mantiene `status.danger` #F0A08C (7,16:1); la precisión de tema la pidió la revisión del PR #16 (F16-2). Lo detectó axe en el PR B de la 001. |
| `COMPONENT_SPECIFICATIONS.md` | 94 | Sidebar y rail: se fijan los colores (fondo compartido `surface.raised` en claro y `charcoal.950` en oscuro; destinos inactivos del sidebar en `linen.800` en claro y `charcoal.200` en oscuro; los del rail, en `text.secondary`) | **Precisión determinada por el comp** (revisión del PR #19, 001 PR C). Los documentos no fijaban esos colores; el comp `Juntia DS v1 - 04 Pantallas` (04·5, 04·7–04·9) los dibuja así. Ningún color nuevo. Contraste de los destinos inactivos: en el sidebar, 7,88:1 en claro sobre `raised` y 11,62:1 en oscuro sobre `charcoal.950`; en el rail, 4,63:1 y 6,95:1 (`specs/001-frontend-foundation/evidence-c/contrast.md`). |
| `HANDOFF_CLAUDE_CODE.md` | 131 | Estados vacíos: ficha de 88 px, radio 28 e ícono de 42; texto de apoyo en `linen.800` en claro y `text.secondary` en oscuro | **Precisión determinada por el comp** (revisión del PR #19). El handoff solo decía «un ícono Duotone en una ficha»; el comp 04·6 «Estados de pantalla» dibuja una ficha de 88 con la proporción de CategoryIcon (radio del 32 % del lado), mayor que sus tamaños de 32 a 64. Texto de apoyo: 8,75:1 en claro sobre `canvas` y 6,78:1 en oscuro. |
| `COMPONENT_SPECIFICATIONS.md` | 41 | «perilla raised» → «perilla con elevación `elevation.raised` y fondo `surface.overlay` en claro y `charcoal.600` en oscuro» | **Precisión determinada por el comp** (F17-3 de la revisión del PR #17). «raised» era ambiguo entre la superficie y la elevación. El bloque «Tabs · Segmented y subrayado» de `Juntia DS v1 - 02 Componentes` dibuja la perilla con fondo #FCFAF5 (claro) y #3A4045 (oscuro), y en claro con la sombra exacta de `elevation.raised`; `surface.raised` (#EEE7DA) apenas se distinguiría del riel `sunken` (#E7DFD0). En oscuro el comp usa `0 2px 0 #2C3135` en vez del anillo de `elevation.raised`; se mantiene `elevation.raised` para no crear una sombra fuera del sistema. Extracto literal del comp en `specs/001-frontend-foundation/evidence-b/F17-3-comp-knob.txt` (PR #17). |
| `COMPONENT_SPECIFICATIONS.md` | 36 | Mensaje de error del Input: texto en `coral.700` en claro y `status.danger` en oscuro. **Regla general: en claro, todo texto de peligro va en `coral.700`**; `status.danger` queda para bordes e iconos, donde basta 3:1 | **Extensión de la decisión de los fundadores del 3 de noviembre de 2026 (errata de contraste, F17-1 de la revisión del PR #17).** El Input se puede usar sobre cualquier superficie: `status.danger` #B4452F mide **4,46:1** sobre `raised` #EEE7DA y **4,14:1** sobre `sunken`. `coral.700` mide ≥ 5,21:1 sobre `canvas`, `overlay`, `raised` y `sunken`. En oscuro, `status.danger` #F0A08C mide ≥ 7,33:1 sobre las mismas superficies y no cambia. |
| `COMPONENT_SPECIFICATIONS.md` | 35 | Placeholder del Input y prefijo «$» del monto sobre `surface.sunken`: se fija `linen.800` en claro y `text.secondary` en oscuro | **Decisión de los fundadores, 3 de noviembre de 2026 (errata de contraste, F16-1 de la revisión del PR #16).** El documento no fijaba su color y el PR B usaba `text.secondary`, que sobre `sunken` mide **4,30:1** en claro; WCAG 1.4.3 también exige contraste al placeholder. El primitivo existente `linen.800` #48443C mide **7,32:1** y sigue más tenue que el valor escrito (`text.primary`, 12,95:1). En oscuro, `text.secondary` #A29C92 sobre `sunken` #22262A mide 5,59:1 y no cambia. |
| `COMPONENT_SPECIFICATIONS.md` | 41, 168 | Etiqueta del Segmented y texto del badge PRIVADO sobre `surface.sunken`: se fija `text.primary` | **Decisión de los fundadores, 3 de noviembre de 2026 (errata de contraste).** El comp pintaba ese texto con `text.secondary` #6C665B, que sobre `sunken` #E7DFD0 mide **4,30:1**; los documentos no fijaban el color. `text.primary` mide **12,95:1**. El 5,1:1 de `text.secondary` en `DESIGN_SYSTEM.md` está calculado sobre `canvas`, no sobre `sunken`. El estado `disabled` del Button (`sunken` + `text.secondary`) no cambia: WCAG 1.4.3 exime a los controles inactivos. |
| `BRAND_FOUNDATION.md`, `DESIGN_SYSTEM.md`, `HANDOFF_CLAUDE_CODE.md`, `COMPONENT_SPECIFICATIONS.md` | 52; §1.4 y 66; 84, 127 y 149; 73 y 152 | Tipografía: Instrument Serif → **Brygada 1918**, Geist → **Onest**; Geist Mono → **Spline Sans Mono** | **Decisión de los fundadores, 4 de noviembre de 2026** (maestro §15.10, decisión 14), para Brygada 1918 y Onest. Spline Sans Mono fue propuesta del gestor: los dos fundadores la aprobaron el mismo día viendo las capturas del PR #32, y la marca de propuesta de la fila `meta.mono` de §1.4 se cerró. La auditoría de Impeccable marcó la pareja anterior como sobreusada; las tres fuentes nuevas pasan su detector, tienen licencia OFL y soportan el español. La escala de §1.4 se recalibró en el PR de implementación (#32): titulares de Brygada al 88 % de los tamaños anteriores, a 500 y 600, y la escala de Onest sin cambios. |
| `COMPONENT_SPECIFICATIONS.md`, `DESIGN_SYSTEM.md`, `MOTION_SYSTEM.md` | §GoalCard, §GoalStack, §FundingLedger y Análisis; tokens `color.goal.tint.*` y su nota; §4.1 nueva | Tintes por tipo de meta en el fallback sin foto (`223260a`), hover y foco del abanico (`3b5ba60`), las dos desviaciones aprobadas del PR D (`87f0437`), la tabla «Ver cifras exactas» de Análisis (`8d215f2`) y el deslizamiento horizontal de la pila (`c0374fd`) | **Decisiones de los fundadores del 10 y 11 de noviembre de 2026**, aplicadas dentro de los PR de código de P0-3 (#68, #69, #71 y #73), **contra la política de edición de arriba**, y sin fila en este log. Se registran a posteriori en el PR documental de cierre de P0-3 (004-T085); el detalle de cada una está en su commit y en `specs/004-presupuestos-y-metas/evidence.md`. No se reescriben |
| `COMPONENT_SPECIFICATIONS.md`, `RESPONSIVE_SPECIFICATIONS.md` | §BottomSheet y §Modal; tabla de breakpoints (md), «Sheets y diálogos» y Cuenta (768) | «Diálogo centrado de 520 px» → diálogo de 520 px **anclado arriba** desde md, centrado en horizontal y que crece por abajo; las confirmaciones siguen centradas | **Decisión de los fundadores, 12 de noviembre de 2026** (maestro §15.10, decisión 23.5), implementada en el PR #81 (17 nov) con `docs/audits/2026-11-dialogs/README.md`. Registrada por 004-T085 |
| `DESIGN_SYSTEM.md` | §1.4, dos viñetas nuevas | Texto en `rem` en el código (los px son referencia a 16 px de raíz; excepción F79-3) y campos de texto de al menos 16 px por debajo de md o con puntero táctil | **Decisiones de los fundadores del 11 y el 17 de noviembre de 2026** (maestro §15.10, decisiones 23.1 y 23.6; PR #79 y #82). Registradas por 004-T085 |
| `BRAND_FOUNDATION.md` | §4, tabla «Decir / No decir» | «Retiro de meta · reasignación» → «Retiro de la meta» | **Decisión de los fundadores, 12 de noviembre de 2026** (maestro §15.10, decisión 23.4; PR #80). El concepto no cambia: un retiro es reasignación, nunca ingreso. Registrada por 004-T085 |
| `BRAND_FOUNDATION.md`, `COMPONENT_SPECIFICATIONS.md`, `DESIGN_SYSTEM.md`, `HANDOFF_CLAUDE_CODE.md`, `RESPONSIVE_SPECIFICATIONS.md` | BRAND §5; §GoalCard «Fotografía»; [V] finales; Accesibilidad «Fotos» y «Pendiente»; 2xl y «Metas» | Nota «no aplica a MVP-1» en las reglas de foto de metas y sus [V]; el texto aprobado se conserva para MVP-2 | **Decisión de los fundadores, 17 de noviembre de 2026** (maestro §15.10, decisión 24.13): metas sin foto en MVP-1, ADR-014 a MVP-2. Registrada por 004-T085 |
| `HANDOFF_CLAUDE_CODE.md` | Decisiones (eliminación de cuenta y «READY WITH BLOCKERS»), «Datos», Accesibilidad («Texto ampliado») y «Pendiente» (Android) | Notas que remiten al maestro: la eliminación de cuenta va al lanzamiento público con un procedimiento manual en MVP-1; la confirmación técnica de Supabase no es un pendiente; la técnica del 200 % está decidida; el teclado de Android queda en la excepción prorrogada. El estado «READY WITH BLOCKERS» se conserva como historia | **Maestro §15.6 (nota final) y §15.10, decisiones 23.1, 24.6 y 24.8** (17 nov 2026). Registradas por 004-T085 |
| `DESIGN_SYSTEM.md` | [V] finales | Las sombras táctiles en Android quedan en la excepción prorrogada más allá de MVP-1 | **Maestro §15.10, decisión 24.6** (17 nov 2026). Registrada por 004-T085 |

**Intacto byte a byte** respecto a la importación: ninguno. `MOTION_SYSTEM.md` lo estuvo (13000 B) hasta el PR C de
P0-3: 13000 B → **14208 B** (§4.1 nueva, hover y foco del abanico, `3b5ba60`).

**Cambiados**, todos por las filas de arriba:

- `BRAND_FOUNDATION.md`: 3981 B → 4204 B (línea 52, decisión 14) → 4199 B (línea 52,
  Spline Sans Mono aprobada) → **4524 B** (§4 y §5, 004-T085).
- `HANDOFF_CLAUDE_CODE.md`: 21666 B → 21653 B (−22 B por las rutas de las
  líneas 5 y 6, +9 B por las dos sustituciones de `Settings`) → 21825 B
  (línea 131, ficha de los estados vacíos) → 22010 B (líneas 84, 127 y 149, decisión 14)
  → 21954 B (líneas 84 y 127, Spline Sans Mono aprobada) → **23017 B** (Decisiones,
  «Datos», Accesibilidad y «Pendiente», 004-T085).
- `RESPONSIVE_SPECIFICATIONS.md`: 4270 B → 4221 B (línea 16) → **4706 B** (md, 2xl,
  «Sheets y diálogos», «Metas» y Cuenta a 768, 004-T085).
- `COMPONENT_SPECIFICATIONS.md`: 21146 B → 21256 B (línea 94) → 21653 B
  (líneas 27, 35, 36, 41 y 168, errata de contraste) → 21742 B (línea 41,
  precisión de la perilla) → 21962 B (línea 94, colores del sidebar y el rail) →
  22022 B (líneas 73 y 152, decisión 14) → 22116 B (línea 73, tamaños de
  GoalCard con la escala recalibrada en el PR #32) → 25551 B (PR de código de P0-3,
  registrados a posteriori) → **26398 B** (§BottomSheet, §Modal y §GoalCard, 004-T085).
- `DESIGN_SYSTEM.md`: 15066 B → 15102 B (línea 205) → 15541 B (tabla de §1.4 y
  línea 66, decisión 14) → 16540 B (líneas 50 a 53 y 66 a 68, escala
  recalibrada en el PR #32) → 16531 B (líneas 64, 66 y 67, Spline Sans Mono
  aprobada) → 22880 B (tintes de meta del PR C de P0-3, registrados a posteriori) →
  **23954 B** (§1.4 y [V] finales, 004-T085).

## Erratas conocidas

Registro **temporal** de una discrepancia detectada en el paquete **mientras no
se haya corregido**. Una errata nunca es una segunda fuente normativa: en cuanto
la corrección se aprueba, la entrada sale de aquí y pasa al **Log de cambios**.

**No hay erratas pendientes.** Hubo nueve y todas pasaron al Log de cambios:
`Settings` en el handoff, corregido tras la revisión del PR #1; las cuatro de la
navegación de escritorio detectadas al capturar el AppShell (PR #5) y en el
preflight de Spec Kit —popover de contexto, quinto destino Balance, tema en el
sidebar y umbral del sidebar—, resueltas por los fundadores el 3 de noviembre de
2026 (maestro §15.10) salvo el umbral, que era una corrección determinada; y las
cuatro de contraste del tema claro —dos que detectó axe en el PR B de la 001, la
del placeholder que encontró la revisión del PR #16 y la del mensaje de error
que encontró la revisión del PR #17—, resueltas por los
fundadores el mismo día.

## Referencias visuales originales

Los comps de pantalla **no están en el repositorio**. Viven en el proyecto de
Claude Design `caabf357-a0df-4048-886f-8c46c8979c5a`, en los archivos
`Juntia DS v1 - 01 Fundacion` a `05 Calidad y Handoff`, `03b Prototipo Motion`
y `Juntia I2 - Bosque Arena` (más la exploración previa A→J).

**Por qué no se importaron:** no son HTML estático. Cargan `./support.js`, usan
elementos propios `<x-dc>` y `<helmet>`, plantillas `{{ }}` y una clase
`DCLogic`. Vendorizarlos exigiría arrastrar ~2,5 MB de runtime ajeno al producto
a un repositorio que todavía no tiene scaffold de aplicación.

**Quién puede consultarlos:** cualquier agente o persona con acceso al MCP de
Claude Design abre ese proyecto directamente. Quien no lo tenga depende de las
capturas.

### Capturas de referencia visual

Las capturas viven en [`screenshots/`](screenshots/), con su propio
[`README.md`](screenshots/README.md) que registra de qué archivo y sección del
comp salió cada una, el enlace al comp y la fecha de captura. **Son referencia
visual, no fuente de medidas:** los números viven en
`COMPONENT_SPECIFICATIONS.md`, `RESPONSIVE_SPECIFICATIONS.md` y
`DESIGN_SYSTEM.md`.

**Objetivo global: 24 capturas.** Las cinco rutas nombradas en los criterios de
aceptación de `HANDOFF_CLAUDE_CODE.md` —**Inicio, Actividad, Anotar, Balance y
Meta**—, con **Inicio en sus dos contextos (Yo y Nosotros)**, cada una a **390 y
1440 px** y en **claro y oscuro**: 6 vistas × 2 anchos × 2 temas.

**Regla de exigibilidad: por slice, no por adelantado.** Se exigen las capturas
de una pantalla o patrón **antes de implementarlo**, no las 24 antes de empezar.
Un slice que no toca Balance ni Metas no se bloquea por no tener sus capturas.

**Lo que necesita la especificación 001 (Frontend Foundation):** las capturas
del **AppShell y la navegación con sus estados** —tabbar móvil con `+`
integrado, rail de 1024 y sidebar de 1280, pestaña activa, selector de contexto
Yo/Nosotros— en los anchos y temas pertinentes. No necesita las de Balance ni
las de Meta, porque no las implementa.

**Estado: lo de la 001 ya está.** Ocho archivos en [`screenshots/`](screenshots/):
tabbar de 390 en claro y oscuro, rail de 1024, sidebar de 1440 en claro y
oscuro, pestaña activa contra una inactiva, y el segmentado Yo/Nosotros en
móvil y en escritorio (dos archivos, porque en el comp están en sitios
distantes). **Dos cosas no se capturaron porque el comp no las dibuja:** el
rail de 1024 en oscuro y el popover del segmentado en el rail. Están
registradas en el README de esa carpeta. El popover ya no hace falta: los
fundadores decidieron que a 1024 el selector va arriba a la derecha del
contenido (maestro §15.10, decisión 5).

Tres de esos ocho archivos son pantallas completas y no solo recortes de
navegación: el rail de 1024 y los dos sidebars de 1440 muestran **Inicio en
contexto Nosotros** de borde a borde. Con eso, del objetivo global de 24 quedan
cubiertas las dos de **Inicio · Nosotros · 1440** (claro y oscuro).

**Siguen pendientes las otras 22:** Inicio a 390 en ambos contextos, Inicio ·
Yo a 1440, y Actividad, Anotar, Balance y Meta en los dos anchos y los dos
temas. No se pretende cubrirlas de una vez. Un slice que toque alguna de esas
pantallas pide las suyas antes de implementarla.

## Jerarquía

`docs/JUNTIA_MASTER.md` prevalece sobre este paquete ante cualquier conflicto.
Dentro del paquete, `HANDOFF_CLAUDE_CODE.md` es el documento operativo.

Etiquetas que verás en los documentos:
**[A]** aprobado · **[P]** propuesta de refinamiento · **[V]** pendiente de validación técnica.

Un `[V]` no es una decisión tomada: es trabajo de verificación que corresponde a
la fase de implementación. No lo des por resuelto sin ejecutarlo.

Un `[P]` **tampoco** es una decisión tomada: es una propuesta de refinamiento.
Cuando afecta al alcance de una especificación requiere **gate humano** antes de
implementarse y **no se cierra dentro de un PR de código**. Aprobar la dirección
I2 no aprobó los `[P]`. La interpretación formal de las tres etiquetas y el
inventario completo de los `[P]` del paquete están en el maestro **§15.9**.
