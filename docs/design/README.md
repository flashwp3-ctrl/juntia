# docs/design — Paquete de diseño aprobado · Juntia v1

Dirección visual elegida: **I2 · Bosque & Arena**. Aprobada el 2 de noviembre de 2026.

## Procedencia

Estos seis documentos se produjeron en el proyecto de Claude Design
«Juntia: Responsive design y design system»
(`https://claude.ai/design/p/caabf357-a0df-4048-886f-8c46c8979c5a`)
y se importaron aquí para que el repositorio sea autosuficiente y ningún agente
dependa de un servicio externo para leerlos. **Cinco de los seis están intactos;
el sexto tiene dos líneas corregidas** por la reubicación de carpetas: ver el
**Log de cambios** más abajo.

## Qué hay aquí

| Archivo | Contenido |
| --- | --- |
| `HANDOFF_CLAUDE_CODE.md` | **Empieza por aquí.** Decisiones de producto aprobadas, alcance P0 vs P1, DEC-G04 con su tabla de verificación, orden de implementación, reglas de negocio de la UI, accesibilidad, pendientes y criterios de aceptación de P0. |
| `DESIGN_SYSTEM.md` | Tokens primitivos y semánticos, color, tipografía, espacio, elevación, iconografía Phosphor, CSS de referencia para los dos temas. |
| `COMPONENT_SPECIFICATIONS.md` | Anatomía, variantes, estados y a11y de cada componente. Incluye el fixture de octubre que los cálculos deben reproducir. |
| `MOTION_SYSTEM.md` | Principios, tokens de motion y los seis momentos especificados, con fallback de reduced motion. |
| `RESPONSIVE_SPECIFICATIONS.md` | Breakpoints 360/390/768/1024/1280/1440 y reglas por patrón. |
| `BRAND_FOUNDATION.md` | Esencia, personalidad, voz, microcopy y reglas de fotografía de metas. |

## Principio para editar estos documentos

Los seis documentos son **fuente aprobada**.

- **Permitido:** correcciones forzadas por la reubicación en este repositorio
  (rutas que apuntaban a otra estructura de carpetas). No cambian el significado.
- **Prohibido:** correcciones de sustancia —nombres de componentes, decisiones,
  valores, redacción—. Esas se registran en **Erratas conocidas**, nunca
  editando el artefacto aprobado.

Toda edición a un archivo importado queda registrada en el **Log de cambios**.

## Nota sobre las rutas internas

`HANDOFF_CLAUDE_CODE.md` citaba los demás documentos como `docs/DESIGN_SYSTEM.md`,
`docs/MOTION_SYSTEM.md`, etc., porque así estaban organizados en el proyecto de
diseño; en este repositorio viven todos en `docs/design/`. Esas rutas se
corrigieron a nombre pelado (ver el Log de cambios) y la cita del maestro se
corrigió a `../JUNTIA_MASTER.md`. Los demás documentos ya se citaban entre sí
con nombre pelado, que resuelve bien dentro de `docs/design/`, y **no se
tocaron**.

## Log de cambios respecto al paquete importado

| Archivo | Líneas | Cambio | Motivo |
| --- | --- | --- | --- |
| `HANDOFF_CLAUDE_CODE.md` | 5 | `JUNTIA_MASTER.md` → `../JUNTIA_MASTER.md` | Reubicación: el maestro vive un directorio por encima. Ruta rota en este repositorio. |
| `HANDOFF_CLAUDE_CODE.md` | 6 | `docs/DESIGN_SYSTEM.md`, `docs/COMPONENT_SPECIFICATIONS.md`, `docs/MOTION_SYSTEM.md`, `docs/RESPONSIVE_SPECIFICATIONS.md`, `docs/BRAND_FOUNDATION.md` → mismos nombres sin el prefijo `docs/` | Reubicación: los cinco viven en el mismo directorio que el handoff. Rutas rotas en este repositorio. |

**Los otros cinco documentos siguen intactos**, byte a byte respecto a la
importación: `BRAND_FOUNDATION.md` (3981 B), `COMPONENT_SPECIFICATIONS.md`
(21146 B), `DESIGN_SYSTEM.md` (15066 B), `MOTION_SYSTEM.md` (13000 B) y
`RESPONSIVE_SPECIFICATIONS.md` (4270 B). Ninguna edición de este log cambia el
significado de una decisión.

## Erratas conocidas

Discrepancias de sustancia detectadas en el paquete aprobado. **No se corrigen
editando el artefacto**: se registran aquí y manda el nombre vigente.

| Dónde | Dice | Nombre vigente | Nota |
| --- | --- | --- | --- |
| `HANDOFF_CLAUDE_CODE.md` líneas 159 y 163, tabla de trazabilidad | `Settings` como componente (filas «Tema Light/Dark/System» y «P0 pareja de dos; grupos N = P1») | La estructura aprobada es **«Mi cuenta»**, rutas `/cuenta/*` (maestro §15.3), con los componentes `ThemeSelector`, `CoupleStatus` y `AccountMenuItem` (`COMPONENT_SPECIFICATIONS.md` §Cuenta). | No existe ningún componente `Settings` en el paquete. Al implementar, leer `Settings` como el componente de Cuenta que corresponda. |

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

### Capturas que necesitará la primera especificación

Requisito documentado aquí; **las capturas todavía no existen y generarlas es
tarea aparte**. Cuando se produzcan, viven en `docs/design/screenshots/`.

Mínimo exigible: las cinco rutas nombradas en los criterios de aceptación de
`HANDOFF_CLAUDE_CODE.md` —**Inicio, Actividad, Anotar, Balance y Meta**—, con
**Inicio en sus dos contextos (Yo y Nosotros)**, cada una a **390 y 1440 px** y
en **claro y oscuro**. Son 6 vistas × 2 anchos × 2 temas = **24 capturas**.

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
