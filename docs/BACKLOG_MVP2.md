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

**MVP-2 y la hoja de ruta posterior a MVP-1 están decididos** (maestro §15.10,
decisión 28, 25 de noviembre de 2026). MVP-2 = Planes + Recurrentes y calendario
+ Presupuesto integral v1 (28.2). Orden: Planes → Recurrentes y calendario →
Presupuesto integral v1 → Créditos y deudas → Cuentas, activos y patrimonio →
Flujo y liquidez → Proyecciones y escenarios; estadísticas y sugerencias es
independiente (28.3). Planes conserva su número y su nombre (spec 006). Las specs
nuevas posteriores tienen nombres provisionales y ninguna tiene número: cada una
lo recibe al abrirse, de una en una. Como máximo una spec en implementación y otra
en documentación activa (28.18), solo cuando se cumplan los cuatro prerrequisitos
de la 28.19.

## Funcionalidades

| # | Funcionalidad | Origen | Estado |
| --- | --- | --- | --- |
| 1 | **Planes: viajes, salidas y eventos.** Agrupar gastos en un plan con total, presupuesto opcional, desglose por categoría, quién pagó, foto e histórico, sin cambiar ninguna cifra de dinero | Petición de los fundadores del 24 nov 2026, aprobada por Alejandro para especificarse y diseñarse en paralelo al gate | **Primera funcionalidad de MVP-2.** Spec `specs/006-planes/`: Q1–Q23 respondidas el 24 nov 2026 (Q12 cambiada) y Q24 el 25 nov 2026; decisión 27 del maestro; ADR-014 y ADR-015 aceptados el 25 nov 2026; comps aprobados el 25 nov 2026 (decisión 27.5; `specs/006-planes/design-comps.md`). Para pasar a Plan solo falta declarar MVP-1 |
| 2 | Fotos de portada de las metas | Decisiones 22.6 y 24.13; ADR-014 | Va con Planes, en su PR C (spec 006, Q16; ADR-014 aceptado) |
| 3 | Recurrentes | Maestro §11, MVP-2 | **Absorbida en Recurrentes y calendario** (decisiones 28.3 y 28.6) |
| 4 | Presets de captura | Maestro §11, MVP-2 | **Absorbida en Recurrentes y calendario**, como concepto distinto de las recurrencias (decisión 28.6; Q17). Se evalúa separarlos en PR independientes dentro de la misma spec, sin que retrasen innecesariamente el núcleo; si comparten tabla o entidad lo decide el Plan de la spec |
| 5 | Estadísticas mejores | Maestro §11, MVP-2 | Pasa a la spec de **estadísticas y sugerencias**, independiente y priorizada según evidencia; ya no forma parte de MVP-2 (decisiones 28.2 y 28.6; Q4) |
| 6 | Sugerencia voluntaria de presupuestos con historial suficiente (DEC-R01-S) | Maestro §8.2 y §11 | Pasa a la spec de **estadísticas y sugerencias** (decisiones 28.2 y 28.6; Q4). Esa spec se prioriza según la evidencia de uso; eso es independiente del umbral funcional de DEC-R01-S, que no cambia: con un periodo razonablemente completo admite una hipótesis editable con incertidumbre, y el umbral exacto se calibra con evidencia (maestro §5.3) |
| 7 | Aportes programados y metas avanzadas | Maestro §11, MVP-2 | Los **aportes programados**, absorbidos en Recurrentes y calendario como recurrencia de tipo «aporte a meta» (decisión 28.6; Q4); su lugar en el presupuesto, en el Presupuesto integral v1 (B.6). «Metas avanzadas» sigue sin contenido definido |

El orden de las filas 3 a 7 es el del maestro, no una prioridad. Las filas
absorbidas no se borran: conservan su origen.

## Hoja de ruta de la planificación financiera (decisión 28)

Nombres provisionales, **sin número de spec**. La letra es la etiqueta de trabajo
del análisis (`docs/propuestas/analisis-planificacion-financiera.md` §4), no un
nombre de producto. Ninguna está abierta.

| Paso | Spec (provisional) | Capacidades de la propuesta | Origen | Estado |
| --- | --- | --- | --- | --- |
| 1 | **Recurrentes y calendario** (R) | A.1–A.5; filas 3, 4 y 7 | Decisiones 28.3 y 28.6 | Sin abrir. Su documentación puede adelantarse durante el gate solo tras los cuatro prerrequisitos de la 28.19 (28.17; estado en la sección siguiente), y se pausa durante el Plan y las Tasks de Planes (28.18) |
| 2 | **Presupuesto integral v1**, sin liquidez (P1) | B.1–B.4, B.6; C.9 solo teórico | Decisiones 28.3 y 28.7 | Sin abrir. Capa nueva; nombre preferido «Distribución mensual», **sin cerrar** |
| 3 | **Créditos y deudas** (D) | C.5, C.6, simulador de amortización de un crédito | Decisiones 28.3, 28.10, 28.12, 28.14 y 28.15 | Sin abrir |
| 4 | **Cuentas, activos y patrimonio** (K) | C.1, C.3, C.4, C.7, C.8 | Decisiones 28.3, 28.9 y 28.11 | Sin abrir |
| 5 | **Flujo y liquidez** (P2) | B.7, C.2 | Decisión 28.3 | Sin abrir |
| 6 | **Proyecciones y escenarios** (E) | D.1–D.3, D.4 integral, D.5–D.8 | Decisiones 28.3 y 28.12 | Sin abrir |
| — | **Estadísticas y sugerencias** (S) | B.5; filas 5 y 6 | Decisión 28.3 (Q4) | Independiente; según la evidencia de uso |

### Prerrequisitos de la decisión 28.19

Estado a 25 de noviembre de 2026. Este PR (#100) registra la evidencia de los
prerrequisitos pendientes. Tras su merge, una vez satisfechos los cuatro
prerrequisitos de la decisión 28.19 y con la confirmación de los fundadores,
podrá comenzar exclusivamente la documentación de Recurrentes.

| # | Prerrequisito | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | La decisión 28 está registrada en el maestro §15.10 | Cumplido | PR #99, merge `9d44a5a` |
| 2 | La reconciliación normativa está fusionada: la nota de ADR-012 (§3.1 y `[V]` 4), `AGENTS.md` 14b y este archivo | Cumplido | PR #99, mismo merge |
| 3 | Está verificado cómo selecciona Spec Kit la spec activa y que los worktrees quedan aislados | Verificado, con condiciones de uso, para Spec Kit v1.2.6 y Git Bash en Windows. Cuenta como cumplido con el merge del PR #100 | ADR-012, `[V]` 4. Cada worktree conserva su propio contexto de spec por defecto, pero Spec Kit no aísla las escrituras: `SPECIFY_INIT_DIR`, una `SPECIFY_FEATURE_DIRECTORY` absoluta o con `..`, o un `feature.json` mal escrito llevan la escritura a otro worktree, igual que ejecutar desde el worktree equivocado. Lo cubren las condiciones de uso y las comprobaciones, que reciben el worktree, la rama y la spec asignados (resumen en `AGENTS.md` 14b). La invocación de `speckit-specify` dentro del procedimiento de spec nueva no está ensayada, porque solo la hace una persona; queda rodeada de comprobaciones antes y después |
| 4 | Se cumplen las condiciones previas de Q18 | Cumplido: las cuatro, en la tabla siguiente | Análisis §9, Q18 |

| Condición de Q18 | Estado | Evidencia |
| --- | --- | --- |
| 1. Cerrar las decisiones del análisis | Cumplida | PR #98, merge `a8b91e1`, con los hallazgos F98-1 a F98-14 cerrados. Los fundadores respondieron Q1–Q19 y la regla de N-8 el mismo 25 de noviembre (maestro, decisión 28, preámbulo) |
| 2. Registrarlas formalmente en el maestro | Cumplida | Decisión 28, filas 28.1 a 28.19, en el PR #99, merge `9d44a5a` |
| 3. Completar el trabajo documental pendiente de Planes | Cumplida | En `specs/006-planes/spec.md`, «Lo que hace falta para pasar a Plan», los puntos 1 a 5 están hechos: decisión 27, ADR-014 y ADR-015 aceptados, PR #94, #95 y #96 mergeados, y comps aprobados (27.5). El 6, declarar MVP-1, no es documental. Lo que queda tampoco es documental pendiente: el Plan y las Tasks, que van después de declarar MVP-1, y las `[V]` de la implementación, que son las de `design-comps.md` (contraste del scrim y licencia de las fotos), las de ADR-014 (1 a 8, todas abiertas) y las de ADR-015 (1 a 8). No hay ningún PR abierto sobre Planes |
| 4. Resolver la tensión con «una spec a la vez» | Cumplida | La 28.18 sustituye esa regla de la propuesta §6 (análisis §12, N-8) |

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

## Propuestas de los fundadores

Una propuesta no forma parte de MVP-2 por estar en esta sección: lo decide una
decisión formal de los fundadores sobre alcance, prioridad y hoja de ruta, tras el
análisis del gestor.

| Propuesta | Documento | Estado |
| --- | --- | --- |
| **Planificación financiera integral.** Agrupa cuatro bloques provisionales: A, recurrentes; B, presupuesto integral y provisiones; C, cuentas, activos, deudas y patrimonio; D, proyecciones y escenarios. Incluye las precisiones de los fundadores del 25 nov 2026 | `docs/propuestas/planificacion-financiera-integral.md` · análisis: `docs/propuestas/analisis-planificacion-financiera.md` | **Decidida: decisión 28 del maestro** (25 nov 2026). Registra las respuestas a Q1–Q19 del análisis, la hoja de ruta de arriba, la regla de una spec en implementación y otra en documentación activa (28.18) y sus cuatro prerrequisitos (28.19). Las filas 3, 4 y 7 quedan absorbidas en Recurrentes y calendario, y las 5 y 6 pasan a estadísticas y sugerencias. El análisis sigue sin ser autoridad: manda la decisión 28 |

## Fuera de MVP-2 (para no confundir)

Grupos de más de dos (detrás de la hoja de ruta de la decisión 28; 28.4), offline robusto, multidivisa, OCR, voz, IA, precios y
scraping siguen donde los pone el maestro (§3, §11 y §12.4). El spike de precios
depende solo de cuatro semanas de uso estable de MVP-1, no de MVP-2.
