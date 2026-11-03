# docs/design — Paquete de diseño aprobado · Juntia v1

Dirección visual elegida: **I2 · Bosque & Arena**. Aprobada el 2 de noviembre de 2026.

## Procedencia

Estos seis documentos se produjeron en el proyecto de Claude Design
«Juntia: Responsive design y design system»
(`https://claude.ai/design/p/caabf357-a0df-4048-886f-8c46c8979c5a`)
y se importaron aquí para que el repositorio sea autosuficiente y ningún agente
dependa de un servicio externo para leerlos. **Dos de los seis siguen intactos**:
`BRAND_FOUNDATION.md` y `MOTION_SYSTEM.md`. Los otros cuatro tienen líneas
corregidas —por reubicación, en revisión o por decisión de los fundadores— y
cada una está en el **Log de cambios** más abajo.

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
| `COMPONENT_SPECIFICATIONS.md` | 27, 168 | Texto de `danger` sobre `dangerSubtle` (Button `danger`, badge EXCEDIDO): `status.danger` → `coral.700` | **Decisión de los fundadores, 3 de noviembre de 2026 (errata de contraste).** En claro, `status.danger` #B4452F sobre `dangerSubtle` #F8DED6 mide **4,28:1** y no cumple el [A] de `HANDOFF_CLAUDE_CODE.md` §Accesibilidad («todos los pares ≥ 4,5:1»). El primitivo existente `coral.700` #9C3A26 mide **5,39:1**. No se crea ningún color; el oscuro no cambia. Lo detectó axe en el PR B de la 001. |
| `COMPONENT_SPECIFICATIONS.md` | 41, 168 | Etiqueta del Segmented y texto del badge PRIVADO sobre `surface.sunken`: se fija `text.primary` | **Decisión de los fundadores, 3 de noviembre de 2026 (errata de contraste).** El comp pintaba ese texto con `text.secondary` #6C665B, que sobre `sunken` #E7DFD0 mide **4,30:1**; los documentos no fijaban el color. `text.primary` mide **12,95:1**. El 5,1:1 de `text.secondary` en `DESIGN_SYSTEM.md` está calculado sobre `canvas`, no sobre `sunken`. El estado `disabled` del Button (`sunken` + `text.secondary`) no cambia: WCAG 1.4.3 exime a los controles inactivos. |

**Intactos byte a byte** respecto a la importación: `BRAND_FOUNDATION.md`
(3981 B) y `MOTION_SYSTEM.md` (13000 B).

**Cambiados**, todos por las filas de arriba:

- `HANDOFF_CLAUDE_CODE.md`: 21666 B → **21653 B** (−22 B por las rutas de las
  líneas 5 y 6, +9 B por las dos sustituciones de `Settings`).
- `RESPONSIVE_SPECIFICATIONS.md`: 4270 B → **4221 B** (línea 16).
- `COMPONENT_SPECIFICATIONS.md`: 21146 B → 21256 B (línea 94) → **21370 B**
  (líneas 27, 41 y 168, errata de contraste).
- `DESIGN_SYSTEM.md`: 15066 B → **15102 B** (línea 205).

## Erratas conocidas

Registro **temporal** de una discrepancia detectada en el paquete **mientras no
se haya corregido**. Una errata nunca es una segunda fuente normativa: en cuanto
la corrección se aprueba, la entrada sale de aquí y pasa al **Log de cambios**.

**No hay erratas pendientes.** Hubo siete y todas pasaron al Log de cambios:
`Settings` en el handoff, corregido tras la revisión del PR #1; las cuatro de la
navegación de escritorio detectadas al capturar el AppShell (PR #5) y en el
preflight de Spec Kit —popover de contexto, quinto destino Balance, tema en el
sidebar y umbral del sidebar—, resueltas por los fundadores el 3 de noviembre de
2026 (maestro §15.10) salvo el umbral, que era una corrección determinada; y las
dos de contraste del tema claro que detectó axe en el PR B de la 001, resueltas
por los fundadores el mismo día.

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
