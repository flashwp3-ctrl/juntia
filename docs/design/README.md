# docs/design — Paquete de diseño aprobado · Juntia v1

Dirección visual elegida: **I2 · Bosque & Arena**. Aprobada el 2 de noviembre de 2026.

## Procedencia

Estos seis documentos se produjeron en el proyecto de Claude Design
«Juntia: Responsive design y design system»
(`https://claude.ai/design/p/caabf357-a0df-4048-886f-8c46c8979c5a`)
y se importaron aquí **sin cambios de contenido**, para que el repositorio sea
autosuficiente y ningún agente dependa de un servicio externo para leerlos.

Los archivos visuales que los acompañan (`Juntia DS v1 - 01 Fundacion` a
`05 Calidad y Handoff`, `03b Prototipo Motion`, `Juntia I2 - Bosque Arena`, y la
exploración previa A→J) siguen viviendo en ese proyecto y **no** se importaron:
son comps HTML grandes, no especificación. Consúltalos ahí cuando necesites ver
una pantalla concreta.

## Qué hay aquí

| Archivo | Contenido |
| --- | --- |
| `HANDOFF_CLAUDE_CODE.md` | **Empieza por aquí.** Decisiones de producto aprobadas, alcance P0 vs P1, DEC-G04 con su tabla de verificación, orden de implementación, reglas de negocio de la UI, accesibilidad, pendientes y criterios de aceptación de P0. |
| `DESIGN_SYSTEM.md` | Tokens primitivos y semánticos, color, tipografía, espacio, elevación, iconografía Phosphor, CSS de referencia para los dos temas. |
| `COMPONENT_SPECIFICATIONS.md` | Anatomía, variantes, estados y a11y de cada componente. Incluye el fixture de octubre que los cálculos deben reproducir. |
| `MOTION_SYSTEM.md` | Principios, tokens de motion y los seis momentos especificados, con fallback de reduced motion. |
| `RESPONSIVE_SPECIFICATIONS.md` | Breakpoints 360/390/768/1024/1280/1440 y reglas por patrón. |
| `BRAND_FOUNDATION.md` | Esencia, personalidad, voz, microcopy y reglas de fotografía de metas. |

## Nota sobre las rutas internas

Los documentos importados se refieren entre sí como `docs/DESIGN_SYSTEM.md`,
`docs/MOTION_SYSTEM.md`, etc., porque así estaban organizados en el proyecto de
diseño. En este repositorio viven todos en `docs/design/`. Se conservó el texto
original en lugar de reescribir las rutas, para que el paquete siga siendo
comparable con su fuente.

El `JUNTIA_MASTER.md` que los documentos citan es `docs/JUNTIA_MASTER.md`.

## Jerarquía

`docs/JUNTIA_MASTER.md` prevalece sobre este paquete ante cualquier conflicto.
Dentro del paquete, `HANDOFF_CLAUDE_CODE.md` es el documento operativo.

Etiquetas que verás en los documentos:
**[A]** aprobado · **[P]** propuesta de refinamiento · **[V]** pendiente de validación técnica.

Un `[V]` no es una decisión tomada: es trabajo de verificación que corresponde a
la fase de implementación. No lo des por resuelto sin ejecutarlo.
