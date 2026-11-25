# Backlog de MVP-2 — Juntia

**Estado: propuesta de ubicación** (24 de noviembre de 2026). El repositorio no
tenía un sitio para el backlog posterior a MVP-1: la única lista es el maestro §11
(«Después de MVP-1»), que está congelado, y los aplazamientos a MVP-2 estaban
repartidos entre las decisiones de §15.10. Este archivo los junta en un solo
lugar. **No es autoridad:** cada fila cita la decisión de la que sale, y si
contradice al maestro, manda el maestro. Si los fundadores aceptan este archivo,
su fila en el mapa de `AGENTS.md` §2b se añade en un PR aparte (tocar `AGENTS.md`
lanza CI).

**Nada de esta lista se implementa ni se despliega antes de declarar MVP-1**
(spec 005; decisión 25.5).

## Funcionalidades

| # | Funcionalidad | Origen | Estado |
| --- | --- | --- | --- |
| 1 | **Planes: viajes, salidas y eventos.** Agrupar gastos en un plan con total, presupuesto opcional, desglose por categoría, quién pagó, foto e histórico, sin cambiar ninguna cifra de dinero | Petición de los fundadores del 24 nov 2026, aprobada por Alejandro para especificarse y diseñarse en paralelo al gate | **Primera funcionalidad de MVP-2.** Spec `specs/006-planes/`: Q1–Q23 respondidas el 24 nov 2026 (Q12 cambiada) y Q24 el 25 nov 2026; decisión 27 del maestro; ADR-014 y ADR-015 aceptados el 25 nov 2026; comps aprobados el 25 nov 2026 (decisión 27.5; `specs/006-planes/design-comps.md`). Para pasar a Plan solo falta declarar MVP-1 |
| 2 | Fotos de portada de las metas | Decisiones 22.6 y 24.13; ADR-014 | Va con Planes, en su PR C (spec 006, Q16; ADR-014 aceptado) |
| 3 | Recurrentes | Maestro §11, MVP-2 | Sin especificar |
| 4 | Presets de captura | Maestro §11, MVP-2 | Sin especificar |
| 5 | Estadísticas mejores | Maestro §11, MVP-2 | Sin especificar |
| 6 | Sugerencia voluntaria de presupuestos con historial suficiente (DEC-R01-S) | Maestro §8.2 y §11 | Sin especificar |
| 7 | Aportes programados y metas avanzadas | Maestro §11, MVP-2 | Sin especificar |

El orden de las filas 3 a 7 es el del maestro, no una prioridad: el maestro dice
«priorización según evidencia».

## Deudas y límites conocidos aplazados a MVP-2

| Tema | Origen |
| --- | --- |
| Issue #53, fila optimista doble | Decisión 24.2 |
| Nivel 2 nocturno de CI (ADR-011 §5) | Decisión 24.3 |
| Medición de campo de Core Web Vitals (RUM) | Decisión 24.5 |
| «Descartar» y el cierre con View Transition | Decisión 24.11 |
| Purga de la tabla de idempotencia (medir y revisar) | Decisión 24.12 |
| Revisión de la excepción de CLS por fuentes tardías | Decisión 26.1 |
| Revisión de la excepción del GoalStack a 390 con la precarga de F02 | Decisión 25.4 |

## Ideas sin decidir

Ideas que salieron de Planes. Ninguna está decidida ni especificada, y cada una
vuelve a los fundadores antes de entrar en una spec.

| Idea | Cuándo se reconsidera |
| --- | --- |
| Renombrar la pestaña «Plan» (presupuestos) a «Presupuesto» | Solo si en el uso real se confunde con «Planes». La spec 006 (Q2 y Q3) evita el choque sin renombrar un destino aprobado |
| Avisarle a la pareja cuando se elimina o se reabre un plan compartido | Hoy no existen notificaciones en Juntia: requiere decidir primero el mecanismo de avisos |

## Propuestas de los fundadores pendientes de análisis

Las propuestas de esta sección **no están aprobadas**, no tienen número de spec y
no forman parte de MVP-2 por estar aquí. Cada una espera el análisis del gestor y
una decisión formal de los fundadores sobre alcance, prioridad y hoja de ruta.

| Propuesta | Documento | Estado |
| --- | --- | --- |
| **Planificación financiera integral.** Agrupa cuatro bloques provisionales: A, recurrentes; B, presupuesto integral y provisiones; C, cuentas, activos, deudas y patrimonio; D, proyecciones y escenarios. Incluye las precisiones de los fundadores del 25 nov 2026 | `docs/propuestas/planificacion-financiera-integral.md` | Registrada el 25 nov 2026. **Pendiente del análisis de su sección 6**, que se hace al terminar el trabajo documental de Planes, solo como documentación y sin tocar el gate de MVP-1. Se solapa con las filas 3 (recurrentes), 6 (DEC-R01-S) y 7 (aportes programados) de la tabla de funcionalidades; el análisis decide cómo se relacionan |

## Fuera de MVP-2 (para no confundir)

Grupos de más de dos (P1), offline robusto, multidivisa, OCR, voz, IA, precios y
scraping siguen donde los pone el maestro (§3, §11 y §12.4). El spike de precios
depende solo de cuatro semanas de uso estable de MVP-1, no de MVP-2.
