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
| 1 | **Planes: viajes, salidas y eventos.** Agrupar gastos en un plan con total, presupuesto opcional, desglose por categoría, quién pagó, foto e histórico, sin cambiar ninguna cifra de dinero | Petición de los fundadores del 24 nov 2026, aprobada por Alejandro para especificarse y diseñarse en paralelo al gate | **Primera funcionalidad de MVP-2.** Spec `specs/006-planes/`: Q1–Q20 respondidas el 24 nov 2026 (Q12 cambiada). Quedan abiertas Q21–Q23; ADR-014 y ADR-015 propuestos; prompt de diseño en `specs/006-planes/design-prompt.md` |
| 2 | Fotos de portada de las metas | Decisiones 22.6 y 24.13; ADR-014 | Propuesto junto con Planes (spec 006, Q16) |
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

## Fuera de MVP-2 (para no confundir)

Grupos de más de dos (P1), offline robusto, multidivisa, OCR, voz, IA, precios y
scraping siguen donde los pone el maestro (§3, §11 y §12.4). El spike de precios
depende solo de cuatro semanas de uso estable de MVP-1, no de MVP-2.
