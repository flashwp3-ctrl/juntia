# Implementation Plan: 005 · Gate privado conjunto «funcional + espectacular» (P0-4)

**Branch**: `claude/docs-spec-005-plan-6ab237` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5) | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-gate-mvp-1/spec.md`, mergeada en `main` por el PR #84 (`94675ca`), con las doce respuestas de los fundadores del 17 de noviembre de 2026 (Q1–Q12, «Sí, las 12») y la partición del CI del PR #83 (`d9c6721`).

**Status**: Draft — fase Plan. No avanza a Tasks sin el merge de su PR documental (ADR-012 §3.1). Este archivo no contiene `tasks.md`.

> **Qué es este documento.** Dice **cómo** se ejecuta lo que la spec ya fijó: qué
> toca cada PR, qué pruebas añade, cuánto suma a cada job del CI, en qué orden y
> quién hace cada verificación humana. No amplía el alcance ni reabre ninguna
> respuesta de Q1–Q12. Lo que es una **decisión del plan** (local y reversible) se
> marca así para que el revisor la pueda objetar. Lo que obligaba a decidir y no estaba
> en la spec fue a los fundadores como `[NECESITA DECISIÓN]` (D1–D4, en «Para los
> fundadores», al final), con opciones y recomendación; **lo decidieron el 18 de
> noviembre de 2026** y el plan lo aplica. En este archivo, `[P]`
> significa **propuesta** y `[V]` **verificación pendiente** (maestro §15.9).

## Summary

P0-4 no construye pantallas. Ejecuta las pruebas de dinero y privacidad sobre el commit
candidato, cierra los huecos de cobertura que la spec identificó, mide en laboratorio y
en dispositivo, corrige los defectos que salgan y registra la aprobación de los dos
fundadores tras 7 días de uso. Se entrega en **tres PR (A, B y C)** (Q1, opción a), más
el PR documental de declaración, que no es de esta spec.

> **Enmienda del 25 de noviembre de 2026 (maestro §15.10, decisión 30).** Declarar
> MVP-1 es su **aceptación técnica**. Antes de ella va un PR de código acotado a C-1–C-7,
> con regresiones y evidencia nueva, como un PR B adicional (30.2). Los 7 días de uso
> (paso 7, D4) y la valoración tras ellos son la **validación por uso real**, que se
> conserva aplazada (30.6). Las demás tareas del paso 7 se adelantan a antes de la
> declaración. El detalle está en la nota que sigue a la tabla de «Orden de ejecución».

Enfoque, con el detalle y las alternativas en [research.md](research.md):

- **PR A · pruebas y arneses.** Los huecos de FR-012 en dominio, componentes e
  integración; la matriz de estados de FR-041 sobre el registro de accesibilidad que ya
  existe; los arneses de laboratorio que faltan (CLS de 40 cargas en las siete rutas,
  LCP, GoalStack con 6 metas, INP en las tres variantes) y el **comparador de CLS por
  fotogramas** para WebKit y Firefox (Q7, [contracts/cls-comparator.md](contracts/cls-comparator.md)).
  Todo lo de laboratorio vive en un **job nuevo, `release`, que solo se lanza a mano**
  y nunca corre en un PR ([contracts/ci.md](contracts/ci.md)).
- **PR B · correcciones.** El residuo de F13 a 1440 con la raíz al 200 %, F02 si la
  medición en iPhone lo exige (Q4) y lo que encuentren A, el barrido y las revisiones.
  **Dos de los tres puntos de Q11 ya están corregidos en `main`** (commit `829c420`,
  PR #74, con su prueba de componentes): el PR B solo los confirma en navegador real y
  en iPhone (research R8).
- **PR C · evidencia y cierre.** Solo documentos: `evidence.md`,
  [release-checklist.md](release-checklist.md) firmada, los inventarios actualizados y
  las dos valoraciones. No lanza CI.
- **Cero specs E2E nuevas** (FR-090). Las cinco existentes corren completas sobre el
  candidato en Chromium y **una vez en WebKit**, en el job `release`.
- **Ningún job del gate pasa de ~600 s.** Las estimaciones por job están en
  «Presupuesto de CI por PR»; lo que no cabe va al barrido `@sweep` o al job `release`.
- **Sin dependencias nuevas, sin migraciones, sin ADR nuevo.** D2 deja una nota a
  ADR-007 y ADR-013 para el PR documental T085.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`) sobre Node 24 LTS; SQL y PL/pgSQL sobre PostgreSQL 17; Bash en los scripts de copia y restauración.

**Primary Dependencies**: las de la 004, sin cambios: Next 16.4.4, React 19.3.1, Motion 14.9.0, Phosphor 2.1.10, Radix Dialog 1.3.1, Tailwind 4.3.4, `@supabase/supabase-js` 2.118.0, `@supabase/ssr` 0.12.7, Supabase CLI 2.121.0. Pruebas: Vitest 5.1.0, `@playwright/test` 1.64.1, `@axe-core/playwright` 4.14.0. **Nada nuevo**: WebKit y Firefox son navegadores que Playwright ya trae; se instalan solo en el job `release`.

**Storage**: Supabase PostgreSQL (producción en el proyecto Free de la dueña; `juntia-dev` para iterar, decisión 18; Supabase local del runner para el gate y el laboratorio). P0-4 **no cambia el esquema** ni el almacenamiento del navegador.

**Testing**: Vitest (`domain`, `components`, `integration`), pgTAP, Playwright + axe en Chromium para el gate; Playwright en Chromium, WebKit y Firefox para el laboratorio a mano (`release`).

**Target Platform**: navegadores modernos, móvil y escritorio; los dos fundadores usan iPhone con Safari; Vercel Hobby (decisión 13).

**Project Type**: aplicación web, monolito modular Next.js.

**Performance Goals**: maestro §15.7 (bloquean): CLS = 0 en las cargas con esqueleto; INP < 200 ms al abrir Anotar y al guardar; mediana < 10 s en teléfono real (US-12). LCP ≤ 2,5 s como proxy de laboratorio, sin bloqueo automático (Q5, opción c).

**Constraints**: ningún job del gate por encima de ~600 s (presupuesto de 660 s en `e2e` y `a11y-session`, cláusula anticliquet); 2.000 minutos de Actions al mes; ninguna spec E2E nueva; el PR C solo `.md`, `.png` y `.txt`; ningún agente ve la contraseña de producción ni lanza CI (lo lanza el gestor); nada de datos reales en el repositorio (solo recuentos, huellas y tiempos).

**Scale/Scope**: 2 personas y una pareja. 0 migraciones, 0 pantallas, 0 specs E2E. Pruebas nuevas: unas 6 de dominio, componentes e integración; 10–20 casos de axe del nivel ligero; casos `@sweep` nuevos; 5 arneses de laboratorio. 2 jobs nuevos de CI, solo a mano (`release` y su guardia de entradas, `inputs-guard`). 4 documentos nuevos del slice más `release-checklist.md`.

## Constitution Check — comprobación de jerarquía

*GATE: debe pasar antes de la investigación de la Fase 0 y se repite después del diseño de
la Fase 1.* La constitución es un puntero (ADR-012 §3.4): esta sección comprueba la
jerarquía de `AGENTS.md` §2.

**Fuentes leídas antes de rellenarla:** `AGENTS.md`, `CLAUDE.md`,
`.specify/memory/constitution.md` y las plantillas de `.specify/templates/overrides/`, la
spec 005 entera con Q1–Q12, el maestro (§1, §10, §11 P0-4, §15.6, §15.7, §15.9 y §15.10
con las decisiones 12, 16, 18, 19, 21 y 22), ADR-011 y ADR-012, `docs/TESTING.md` (§3,
§4, §9 y los protocolos de restauración y de workers), `.github/workflows/ci.yml` y el
PR #83, `playwright.config.ts`, `tests/evidence/`, `tests/a11y/route-registry.ts`, el
quickstart de la 002 (§4), `docs/audits/2026-11-impeccable.md` y su `f13/README.md`, y
los `plan.md`, `research.md` y `contracts/` de las specs 003 y 004 como modelo.

### Propuestas `[P]` que toca el slice

| Elemento `[P]` | ¿Afecta al alcance? | ¿Requiere aprobación antes de implementar? | Resolución (quién, cuándo, dónde) | ¿Bloquea el plan? |
| --- | --- | --- | --- | --- |
| «Tu disponible · aportaste» (F06) | No — ya construido | Sí, en pantalla | Fundadores, en la revisión de S5 (FR-033) | No |
| Paleta propuesta (Sara petróleo, Hogar azul tenue, superficie oscura) | No | Sí, en pantalla | Fundadores, revisión S1–S5 (FR-033) | No |
| Gasto, ingreso y liquidación en tinta | No | Sí, en pantalla | Fundadores, revisión S1–S5 (FR-033) | No |
| Personas con patrón en `person.1–2` | No | Sí, en pantalla | Fundadores, revisión S1–S5 (FR-033) | No |
| «Cuenta reutiliza los fondos de categoría» | No | Sí, en pantalla | Fundadores, revisión S1–S5 (spec, «Inventario de `[P]`») | No |
| Texto ampliado hasta 200 % | No | No — requisito obligatorio | Se prueba en el barrido (FR-042) | No |

Ningún `[P]` que afecte al alcance queda abierto (spec, «Inventario de `[P]`»).

### Verificaciones `[V]` que toca el slice

| Elemento `[V]` | Tipo | Salida real | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| Fiabilidad del comparador de CLS por fotogramas (Q7) | Decide cómo se construye el arnés | Pendiente. **La spec la asigna al PR A** con salida a los fundadores («solo WebKit») si no es fiable (FR-051); el criterio de fiabilidad está en [contracts/cls-comparator.md](contracts/cls-comparator.md) §5 | No: la spec fija dónde se resuelve y qué pasa si falla |
| Forzar el esqueleto fuera de Chromium sin emulación de CPU ni de red | Decide cómo se construye el arnés | Pendiente; el método (bloqueo de tabla en el servidor, que ya usa `home-states.capture.ts`) es independiente del navegador (research R5). Se comprueba en el PR A con los controles del comparador | No, por la misma razón |
| Todas las del «Inventario de `[V]`» y del «Inventario de verificaciones heredadas» de la spec | Comprueban lo construido | Pendientes; dueño, momento y evidencia en este plan y en [contracts/human-verifications.md](contracts/human-verifications.md) | No |

### ADR que necesita el slice

| ADR | Qué decide para este slice | Estado | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| ADR-001 a ADR-004, ADR-007, ADR-010 | Dinero, repartos, pareja, presupuestos, correcciones y metas: lo que se vuelve a probar | Aceptados | No |
| ADR-011 | Capas, tope de specs, presupuestos de job; «solo Chromium» en el gate (WebKit y Firefox solo en el job `release`, por Q3 y Q7) | Aceptado | No |
| ADR-012, ADR-013 | Flujo de especificación; acceso a datos | Aceptados | No |
| ADR-014 (fotos de metas) | Fuera de MVP-1 (decisión de los fundadores del 17 nov 2026) | No existe; no lo necesita este slice | No |
| **Nota a ADR-007 y ADR-013** para el borrado manual: el script suspende por nombre los triggers de solo inserción dentro de una transacción como dueño | Lo exige D2, opción (a) (fundadores, 18 nov 2026). No es un ADR nuevo: es una operación administrativa excepcional | **Por escribir en el PR documental T085** (fila 19, abajo), con la excepción de ADR-010 para el ledger de metas (fila 22, F85-8) | No |

### Erratas que afectan al slice

Ninguna pendiente en `docs/design/README.md`.

### Conflictos entre documentos superiores

| Conflicto | Documentos | Qué dice la jerarquía | PR de reconciliación | ¿Bloquea el plan? |
| --- | --- | --- | --- | --- |
| Filas 1–18 de «Contradicciones para el PR documental T085» de la spec | Maestro, `docs/TESTING.md`, `docs/design/`, specs 002–004 | Manda la decisión más reciente de los fundadores, ya en el código | T085 o el que lo suceda (fuera de esta spec) | No para el plan; T085 es condición de entrada (FR-001) |
| `docs/TESTING.md` §3 «Nivel 2» describe un nocturno con WebKit que no existe | `docs/TESTING.md`; Q3 | Manda Q3: cinco specs a mano en Chromium y una vez en WebKit (fila 17) | T085; el PR A documenta el job `release` en `docs/TESTING.md` sin tocar el texto del nivel 2 | No |

**Para el PR documental T085**, además de las filas 1–18 de la spec:

- **Fila 19 · Nota a ADR-007 y ADR-013 (D2, opción a; fundadores, 18 nov 2026):** el
  borrado manual de cuenta de MVP-1 suspende por nombre los triggers de solo inserción
  (`audit_events_append_only`, `budget_versions_append_only`,
  `goal_ledger_append_only`, `goal_allocations_append_only` y `settlements_guard`)
  dentro de una sola transacción como dueño de las tablas, los reactiva antes del
  `commit` y comprueba las invariantes. Es una operación administrativa excepcional, con
  el «sí» escrito de la persona (o de las dos, si hay pareja), no un camino de la app
  ([contracts/account-deletion.md](contracts/account-deletion.md)).
- **Fila 20 · Criterio de la decisión 22.2 (D3, opción a):** «falla el rendimiento del
  abanico con 6 metas» = menos de 55 fps (menos del 95 % de fotogramas en ≤ 18,2 ms, o
  alguno > 50 ms) con CPU 4×.
- **Fila 21 · Periodo de uso de Q10 (D4, opción a):** despliegues de producción congelados
  durante los 7 días; un fallo crítico se corrige y los 7 días vuelven a empezar.
  **Enmienda del 25 nov 2026 (decisiones 25.5 y 30):** la regla se aplica al periodo de
  la validación por uso real, aplazada (30.6).
- **Fila 22 · ADR-010, «los aportes no se borran» (revisión del PR #85, F85-8):**
  - ADR-010 y el maestro (DEC-G01..G06, decisión 22) dicen que el ledger de metas es de
    solo inserción y que una corrección es un asiento `void`;
  - la reconciliación añade una **única excepción**: el borrado de los asientos de una
    persona o una pareja **solo** con el procedimiento autorizado y ensayado de
    [contracts/account-deletion.md](contracts/account-deletion.md), con el manifiesto de
    aprobaciones y exportaciones, nunca desde la app ni para corregir datos.

  Va junto a la nota a ADR-007 y ADR-013 de la fila 19.

**Resultado del gate**: **PASA**, sin decisiones abiertas. D1–D4 las decidieron los
fundadores el 18 de noviembre de 2026 (opción a en las cuatro).

## Project Structure

### Documentation (this feature)

```text
specs/005-gate-mvp-1/
├── spec.md                       # Specify + Clarify (PR #84)
├── plan.md                       # Este archivo
├── research.md                   # Fase 0: R1–R14, métodos y alternativas
├── release-checklist.md          # FR-069: creada aquí, sin marcar; se firma en el PR C
├── contracts/
│   ├── ci.md                     # Jobs, presupuestos, job `release`, orden de los runs a mano
│   ├── cls-comparator.md         # Comparador por fotogramas (Q7): entrada, salida, controles, fiabilidad
│   ├── human-verifications.md    # Quién, cuándo, cómo y qué evidencia deja cada verificación humana
│   └── account-deletion.md       # Procedimiento manual de borrado (Q8; D2, opción a)
├── states-matrix.md              # FR-041: la crea el PR A
├── evidence.md                   # La crea el PR A; la cierra el PR C
├── evidence/                     # Salidas .txt y capturas .png (PR A–C)
└── tasks.md                      # Fase 2, en su propio PR
```

No hay `data-model.md` (P0-4 no crea datos de producto; las entidades de evidencia de
la spec se materializan como tablas de `evidence.md`) ni `quickstart.md` (su papel lo
hacen [contracts/human-verifications.md](contracts/human-verifications.md) y la
checklist). **Decisión del plan.**

### Source Code (repository root)

```text
src/                                      # Solo el PR B; el PR A no toca src/
├── features/goals/                       # B: geometría del abanico (residuo de F13), si aplica F02 a S5
├── features/context/ · app/(app)/        # B: solo si F02 exige corregir S1 (research R10)
└── …                                     # B: lo que encuentren A, el barrido y las revisiones
tests/
├── unit/ · src/domain/**/*.test.ts       # A: US-08 literal (400.000 al 50/50)
├── src/features/**/*.test.tsx            # A: US-21 (etiquetas) y US-13 (nunca se exige presupuesto)
├── integration/
│   ├── money-us08.test.ts                # A: US-08 en la vista, una sentencia
│   └── account-deletion.test.ts          # A: el procedimiento de D2 sobre el runner
├── a11y/
│   ├── route-registry.ts                 # A: estados que falten en la matriz de FR-041
│   └── routes.a11y.ts                    # A: casos @sweep: 200 % en hojas, diálogos, A1–A6 e invitación;
│                                         #    raíz al 200 % a 1440; cruzar 768 px con Anotar abierto; foco al llegar por URL
├── e2e/goals.e2e.ts                      # A: el caso del gesto con CDP se salta fuera de Chromium, con su motivo
└── evidence/
    ├── release-cls.capture.ts            # A: CLS de 40 cargas, siete rutas (FR-050)
    ├── release-lcp.capture.ts            # A: LCP de laboratorio (FR-054)
    ├── release-goalstack.capture.ts      # A: abanico con 6 metas (FR-053)
    ├── inp.capture.ts                    # A: ampliado a privado, compartido y con meta (FR-052)
    ├── release-long-lists.capture.ts     # A: listas largas en el runner (FR-043)
    └── cls-frames.capture.ts             # A: comparador por fotogramas (FR-051)
scripts/
├── cls-frames/recorder.js                # A: la parte que corre en la página (también para el Mac, R11)
├── cls-frames/compare.mjs                # A: el comparador puro, con su prueba
├── dev-target/seed-long-lists.mjs        # A: cuenta de listas largas en juntia-dev (FR-043), con el guardia
└── account-deletion/                     # A: el procedimiento de D2 (SQL + run.mjs con fases y estado)
playwright.config.ts                      # A: proyectos e2e-webkit, evidence-webkit, evidence-firefox
.github/workflows/ci.yml                  # A: job `release`, solo workflow_dispatch
tests/ci-workflow.test.ts                 # A: el job `release` nunca corre en pull_request
docs/TESTING.md                           # A: el job `release` y sus entradas (§3 y §9)
```

**Structure Decision**: el monolito de la 001 a la 004. Los arneses nuevos siguen el
patrón de `tests/evidence/` (proyecto `evidence`, fuera del gate, una línea JSON por
medición). El comparador es un módulo puro (`compare.mjs`) más un grabador que se
inyecta en la página, para que la misma pieza sirva en CI y en el iPhone con el Mac.

## Orden de ejecución

Los fundadores fijaron el orden A → barrido y revisión → B → C (Q1). Con la condición de
entrada (FR-001) y lo que cada paso necesita del anterior:

| Paso | Qué | Quién | Necesita | Deja |
| --- | --- | --- | --- | --- |
| **0** | **Entrada al gate**: T084 real (salida interna de los fundadores con cuentas reales) y el PR documental T085 mergeado | Fundadores; gestor | — | FR-001 |
| **0b** | **Mediciones en producción que alimentan el PR B**, sobre lo que ya está en producción: F02 (10 + 10 por fundador), primera pasada de S1–S5 con y sin movimiento, VoiceOver, contraste, teclado y safe areas, y comprobar 002-T097 (FR-004) | Fundadores; gestor | Producción con P0-3 | Hallazgos para B; FR-032 decidido |
| **1** | **PR A** · pruebas, arneses y job `release` | Agente; revisión; gestor marca listo | Paso 0 para marcarlo listo y mergearlo; el borrador puede empezar antes (D1) | Gate verde; un run de `release` en su último commit (calibración del comparador) |
| **2** | **Barrido y laboratorio sobre `main` con A**: `@sweep` a mano y `release` si A no lo cubrió | Gestor | PR A mergeado | Hallazgos para B |
| **3** | **PR B** · correcciones (puede partirse por áreas, Q1) | Agente; revisión; gestor | Pasos 0b y 2 | Gate verde |
| **4** | **Commit candidato** = `main` tras el último PR de código. Sobre él, en serie (nunca en paralelo, porque dos `workflow_dispatch` sobre la misma rama se cancelan): (a) run completo con las cinco specs y el ensayo de restauración; (b) `@sweep`; (c) `release` completo, con WebKit | Gestor | Paso 3 | FR-010, FR-020, FR-040, FR-050–FR-054 |
| **5** | **Despliegue y etiqueta** de producción del candidato (FR-022); sondas de FR-014 y FR-015 | Gestor con la dueña | Paso 4 en verde | Etiqueta `db-prod-*` o `release-mvp-1-*` (research R13) |
| **6** | **Verificaciones en producción con el candidato**: humo de release (FR-021), S1–S5 final (FR-030), dispositivo (FR-044, FR-055, FR-070, FR-072), **Mac prestado** (FR-071), exportación (FR-060), recuperación (FR-063), vuelta atrás (FR-064) | Fundadores; gestor | Paso 5 | Filas de la checklist y de `evidence.md` |
| **7** | **Enmendado por la decisión 30** (nota tras la tabla). **7 días consecutivos de uso diario real** (Q10); al final, copia semanal y **restauración real** (FR-061), registros de Vercel (FR-013), tamaño de la tabla de idempotencia (FR-068) | Fundadores; gestor | Paso 6 | Valoraciones separadas (FR-081) |
| **8** | **PR C** · evidencia y cierre, solo documentos | Agente; fundadores | Paso 7 | `evidence.md` y checklist firmadas |
| **9** | PR documental de **declaración** de MVP-1 (fuera de esta spec, FR-082) | Gestor; fundadores | PR C mergeado, los dos aprueban | Estado del maestro, `AGENTS.md` y `CLAUDE.md` |

**D1, opción (a):** el PR A se escribe e itera en borrador antes de FR-001, y el paso 0b
también puede adelantarse; el PR A no se marca listo ni se mergea hasta que T084 y T085
estén cerrados.

**D4, opción (a):** durante los 7 días del paso 7, **los despliegues de producción se
congelan**. Si aparece un fallo crítico (dinero, privacidad, pérdida de datos o
accesibilidad básica), el periodo se para, se corrige en un PR B, el candidato nuevo pasa
el paso 4 (y los pasos 5 y 6 que su cambio afecte) y **los 7 días vuelven a empezar**. Un
fallo no crítico va a la lista de MVP-2 (FR-083), sin despliegue.

> **Enmienda del 25 de noviembre de 2026 (maestro §15.10, decisión 30).** El orden pasa a
> ser este:
>
> - **Paso 3, ampliado.** Después del merge del PR documental de la decisión 30, un PR de
>   código acotado a C-1–C-7 (30.2 y 30.3), con regresiones y evidencia nueva. Es el
>   último PR de código antes del candidato. Cualquier otra corrección de código
>   necesita una autorización expresa de los fundadores, registrada en el maestro (30.2).
> - **Pasos 4 a 6**, sin cambios, sobre el candidato que incluye ese PR.
> - **Paso 7, partido en dos.**
>   - **Antes de declarar**, después del paso 6: la copia y la **restauración real**
>     (FR-061, V14), los registros de Vercel de la última semana (FR-013) y la tabla de
>     idempotencia (FR-068).
>   - **Validación por uso real**, aplazada (30.6): los 7 días con D4 y la valoración de
>     FR-081.
> - **Paso 8 (PR C) y paso 9 (declaración)**, con lo de la aceptación técnica. No esperan
>   a la validación por uso real.
> - **El resultado del periodo**, cuando ocurra, se registra en un PR documental
>   posterior y en el maestro (30.6).
>
> La sesión guiada de FR-080 se rige por la 30.7.

El ensayo del borrado de cuenta (FR-067) puede hacerse en cualquier momento después del
PR A; no depende del candidato porque corre en `juntia-dev`.

## PR A · Pruebas y arneses que faltan

**Alcance.** Ninguna línea de `src/`. Pruebas en la capa más baja (FR-012), la matriz de
estados (FR-041), los casos `@sweep` que faltan (FR-042, FR-046 y la comprobación de Q11),
los cinco arneses de laboratorio, el comparador de CLS por fotogramas (FR-051), el
proyecto WebKit de las cinco specs (FR-020), la cuenta de listas largas (FR-043), el job
`release` y el procedimiento de borrado con su prueba (D2, opción a).

**FR:** FR-011, FR-012, FR-041, FR-042 (pruebas), FR-043 (siembra y capturas), FR-046
(pruebas), FR-050–FR-054 (arneses), FR-067 (procedimiento, D2 opción a), FR-090, FR-093,
FR-095.

| Archivo | Qué | Capa · job |
| --- | --- | --- |
| `src/domain/money/*.test.ts` (o el archivo de repartos que ya calcula el 50/50) | US-08 literal: 400.000 al 50/50 → 400.000 del grupo, 200.000 a cada uno, nunca 800.000 | Dominio · `app` |
| `tests/integration/money-us08.test.ts` | Lo mismo leído de la vista en una sentencia (los totales del grupo y de cada persona) | Integración · `db` |
| `src/features/goals/*.test.tsx` | US-21: «Apartado en Juntia» y «Transferencia declarada» se pintan tal cual y nunca como verificadas por un banco | Componentes · `app` |
| `src/features/{auth,expenses,home,couple}/*.test.tsx` | US-13: ni el registro, ni Anotar, ni Inicio, ni la invitación piden crear un presupuesto | Componentes · `app` |
| `specs/005-gate-mvp-1/states-matrix.md` + `tests/a11y/route-registry.ts` | FR-041: la matriz estados × pantallas con la prueba o captura de cada celda; los estados que falten se añaden al registro (nivel ligero) o se justifican «no aplica» | Documento + axe · `a11y-session` |
| `tests/a11y/routes.a11y.ts` (`@sweep`) | FR-042: 200 % en hojas, diálogos, A1–A6 e invitación; **raíz al 200 % a 1440 en Inicio · Yo y Metas** (hoy falla: 1.447 px, se corrige en B); FR-046: el foco vuelve al disparador también al llegar por URL; **Anotar con monto escrito, de 390 a 1024 px y vuelta**: el monto sigue (R8) | Barrido, a mano |
| `tests/e2e/goals.e2e.ts` | El caso del gesto con `Input.dispatchTouchEvent` (CDP) se salta fuera de Chromium con su motivo; el gesto real lo cubre FR-070 en iPhone | E2E · sin coste |
| `tests/evidence/release-*.capture.ts`, `inp.capture.ts` | FR-050, FR-052, FR-053, FR-054, FR-043 (research R6, R7) | Laboratorio · `release` |
| `tests/evidence/cls-frames.capture.ts`, `scripts/cls-frames/*` | FR-051: posición de layout por la cadena de `offsetParent`, que no incluye transformaciones ni transiciones; fixed y sticky aparte; siete controles calibrados motor a motor, entre ellos una animación con transformación, una transición CSS en curso y un scroll con sticky (F85-5, F85-11; [contracts/cls-comparator.md](contracts/cls-comparator.md)) | Laboratorio · `release` |
| `tests/cls-frames.test.ts` | El comparador puro con fotogramas sintéticos: un bloque que se mueve 1 px se detecta; uno que aparece o desaparece no cuenta; el desplazamiento por scroll no cuenta; un bloque `fixed` se compara en coordenadas del viewport y uno `sticky` solo entre fotogramas con el mismo scroll (F85-5) | Vitest (proyecto `domain` o el de `scripts/`) · `app` |
| `playwright.config.ts` | Proyectos `e2e-webkit` (Desktop Safari, `tests/e2e`), `evidence-webkit` y `evidence-firefox` (solo `cls-frames.capture.ts`). Ninguno entra en `test:e2e:smoke` ni en `test:a11y` | Config |
| `.github/workflows/ci.yml` + `tests/ci-workflow.test.ts` | Job `release` con entrada `release_lab`, matriz de 17 tramos, `timeout-minutes: 20`, nunca en `pull_request`; job `inputs-guard` y exclusión mutua de `release_lab` con las demás entradas, probada evaluando los `if` en las 16 combinaciones (F85-4) ([contracts/ci.md](contracts/ci.md)) | CI |
| `scripts/dev-target/seed-long-lists.mjs` | FR-043 en `juntia-dev`: una cuenta con ≥ 500 movimientos en un mes, aportes y versiones de presupuesto, con el guardia de destino | Herramienta de dev |
| `scripts/account-deletion/` + `tests/integration/account-deletion.test.ts` | D2, opción (a): sin pareja, todo lo de la persona; con pareja, la pareja completa. Manifiesto con las dos aprobaciones y exportaciones (F85-3); fases con estado y recuperación idempotente de Auth (F85-2); el ciclo `confirmation_id` ↔ `usage_entry_id` se rompe anulando `confirmation_id` (F85-1). Siete pruebas, incluidos los fallos de Auth en el primer y el segundo usuario ([contracts/account-deletion.md](contracts/account-deletion.md)) | Integración · `db` |
| `docs/TESTING.md` | §3 y §9: el job `release`, sus tramos, su tope y que no es del gate. **No** toca el texto del nivel 2 (lo enmienda T085, fila 17) | Documento |

**Punto de control:** un run de `release` (`gh workflow run` por el gestor) sobre el
último commit del PR, antes de marcarlo listo. Calibra el comparador (§5 del contrato),
mide la duración real de cada tramo y deja en `evidence.md` la primera salida de cada
arnés. Si el comparador no es fiable, **se para** y vuelve a los fundadores con «solo
WebKit» (FR-051); el resto del PR A sigue.

**Criterios de salida:** gate verde en el último commit con `a11y-session` < 600 s; el run
de `release` con los 17 tramos terminados (los arneses pueden registrar fallos de
producto, que son hallazgos para B, no fallos del PR); `states-matrix.md` sin celdas sin
dueño; prueba del comparador y de `ci-workflow` en verde; revisión humana.

## PR B · Correcciones

**Alcance.** Defectos, nunca funcionalidades (spec, «Edge Cases»). Cada corrección con su
prueba en la capa más baja que detecta el fallo (FR-094, `docs/TESTING.md` §6). Se parte
en dos PR si las correcciones tocan áreas que el selector clasifica distinto (Q1).

| Corrección | Condición | Cómo (research) | Prueba |
| --- | --- | --- | --- |
| **Residuo de F13** · Inicio · Yo a 1440 con la raíz al 200 % mide 1.447 px | Siempre (Q11; FR-042) | El abanico de GoalStack se activa por **consulta de contenedor en `rem`** y su geometría pasa a `rem`; con la raíz al 200 % el contenedor no llega y cae a la pila (R9) | El caso `@sweep` del PR A pasa; componentes del abanico si cambia la lógica de presentación |
| **Monto perdido al cruzar 768 px** | **Ya corregido** en `829c420` (PR #74), con `annotate-presentation.test.tsx` | Sin código, salvo que el caso `@sweep` o el iPhone en horizontal lo reproduzcan (R8) | La existente; la de `@sweep` del PR A |
| **Marco de foco del monto** | **Ya corregido** en `829c420` | Igual (R8) | La existente (02·5, «sin marco al abrir, anillo después») |
| **F02** · S1 y S5 detrás del esqueleto | Solo si la mediana del paso 0b supera 1 s o un fundador lo juzga un defecto (Q4) | S5: precarga de la meta del frente **del mismo contexto**. S1: la coreografía de contexto arranca con lo que no es dato y los números esperan en su sitio a los datos del contexto correcto. **Nunca** precarga del otro contexto (R10) | Componentes de la transición (ningún número del contexto anterior con el título nuevo); las comprobaciones de HTML, RSC y prefetch de las specs 1, 3, 4 y 5 siguen verdes; nueva medición en iPhone |
| **«Cómo pedir la eliminación»** en Mi cuenta → Privacidad | Siempre (FR-067): hoy el texto dice que no está disponible, pero no cómo pedirla | Una frase de copy en `src/lib/copy/es.ts`; el texto lo aprueban los fundadores en la revisión de B ([contracts/account-deletion.md](contracts/account-deletion.md) §8) | Componentes de la pantalla de privacidad |
| Hallazgos de A, del barrido, del laboratorio y de las revisiones | Si son defectos | Según el hallazgo | Según el hallazgo |

**Criterios de salida:** gate verde; si toca rendimiento o esqueletos, un run de `release`
del tramo afectado; capturas a 390 y 1440 en los dos temas de lo que cambió; aprobación
visual de los fundadores de lo que cambió.

## PR C · Evidencia y cierre (solo documentos)

**Alcance.** `specs/005-gate-mvp-1/evidence.md` completo, [release-checklist.md](release-checklist.md)
con todas las casillas marcadas y firmada (FR-069), `states-matrix.md` final, las tablas de
FR-002 (inventario heredado sin filas «abiertas»), FR-003 (salidas de tareas antiguas),
FR-030 (S1–S5), FR-034 (criterios del handoff), FR-056 (CWV sin «p75») y SC-001 a SC-012,
las dos valoraciones de FR-081 y la lista de MVP-2 de FR-083.

**Formato:** solo `.md`, `.png` y `.txt` bajo `specs/` (`AGENTS.md` 15a).

**Regla única de privacidad de la evidencia (F85-6), para los PR A–C y para la
checklist:**

- **Al repositorio solo entran:**
  - capturas hechas con datos de prueba (el dataset sembrado en el runner o en
    `juntia-dev`);
  - o capturas de producción **anonimizadas**: importes, nombres, comercios, notas,
    metas y correos tapados de forma opaca antes de guardarlas, por la persona que la
    hizo;
  - y recuentos, tiempos, huellas cortas e identificadores de run o de despliegue.
- **Se quedan con los fundadores, fuera del repositorio:**
  - las imágenes y los clips originales de producción;
  - cualquier nombre identificable;
  - las firmas.

  La checklist y `evidence.md` dicen por rol («un fundador», «la dueña», «el gestor») y
  fecha quién hizo o aprobó cada cosa.
- **Prefiere los datos de prueba:** una captura de producción solo entra anonimizada, y
  solo cuando el hallazgo no se reproduce con el dataset.
- **Los clips de vídeo** de los iPhone no entran nunca: un `.mov` o un `.mp4` lanzaría
  CI, y no aportan lo que no dé un fotograma. Al repositorio van fotogramas PNG,
  anonimizados si son de producción, y la tabla de tiempos.

Esta regla sustituye cualquier otra de este plan o de sus contratos.

**No lanza CI.** Si una salida exige un cambio de código, ese cambio va en un PR B
adicional, no en el C.

## Presupuesto de CI por PR

Línea base del gate del PR #83 (run 44230682314, 18 nov 2026): `app` 280 s, `db` 408 s,
`e2e` **321 s**, `a11y-session` **398 s**. Variación reciente: `db` 547 s y `app` 310 s en
el PR #82. Presupuestos: `e2e` y `a11y-session` < 660 s (bloquean); `app` y `db` < 360 s
(solo avisan, y `db` ya lo supera por el ensayo de restauración). **Regla del encargo:
ninguna prueba nueva lleva un job por encima de ~600 s; si no cabe, va a `@sweep` o al job
`release`.** Las cifras de abajo son **estimaciones**; las mide el gate de cada PR.

| Job | Base | PR A | PR B | Estimado tras P0-4 | Si no cabe |
| --- | --- | --- | --- | --- | --- |
| `app` | 280–310 s | +5–10 s (dominio, componentes, comparador puro) | +2–10 s (pruebas de las correcciones) | ≤ 330 s | — |
| `db` | 408–547 s | +7–20 s (US-08 en la vista; las siete pruebas del borrado de D2) | 0 | ≤ 570 s | La prueba de borrado pasa a `release` (tramo `lab-interaction`) si `db` se acerca a 600 s |
| `e2e` | 321 s | 0 (ninguna spec nueva; un `skip` fuera de Chromium) | 0 | 321 s | — |
| `a11y-session` | 398 s | +40–80 s (10–20 casos ligeros nuevos, a ~4 s por estado con los dos temas en el mismo contexto) | 0–10 s | ≤ 490 s | Por encima de **560 s** estimados, los estados restantes de FR-041 van solo a `@sweep` |
| `@sweep` (a mano, en `a11y-session`) | ≈ 430 s (run 43050756971, 11 nov, antes de #82) | +60–150 s (200 % en hojas y diálogos, raíz a 1440, 768 px, foco por URL) | — | 500–650 s, a medir en el paso 2 | Si pasa de 600 s, el barrido se reparte en dos tramos con `--shard` (decisión del plan, [contracts/ci.md](contracts/ci.md)) |
| `release` (nuevo, a mano) | — | 17 tramos en paralelo, cada uno de ~325–655 s estimados con su arranque (una ruta por tramo de CLS en Chromium; dos tramos de WebKit E2E; tres por motor para el comparador) | — | ≈ 145–155 min facturados por lanzamiento completo | Cada tramo que mida más de 600 s se parte en dos (F85-7) |
| `inputs-guard` (nuevo, en el gate y a mano) | — | Segundos: valida las entradas solo en `workflow_dispatch`, y en `pull_request` corre y pasa para que el gate no se omita (F85-9) | — | 1 min facturado por run; el gate arranca 10–20 s más tarde | — |
| `evidence` | sin cambios | 0 | 0 | — | — |

**Minutos de Actions de P0-4 (estimación, recalculada en F85-7 con el arranque de cada
tramo):**

| Partida | Minutos |
| --- | --- |
| Gate del PR A | ≈ 30 |
| Uno o dos gates del PR B | ≈ 30–60 |
| `release` completo, dos lanzamientos: el punto de control del A (que también calibra el comparador) y el candidato, a ≈ 145–155 cada uno | ≈ 290–310 |
| `release` parcial tras un PR B, con `release_legs` | ≈ 20–60 |
| Dos barridos | ≈ 20 |
| Run completo del candidato | ≈ 30 |
| `inputs-guard` en cada run del gate y lanzamiento a mano (1 min facturado cada uno, F85-9) | ≈ 5–10 |
| **Total** | **≈ 425–520 min**, unos 21–26 % del mes |

El PR C y este PR no gastan. **Antes de F85-7, el plan estimaba 220–305 min:** contaba
seis tramos que no cabían en ~600 s con su arranque. El paso 2 no lanza `release` si el
commit del punto de control del A es el que llega a `main`.

## Verificaciones humanas

Quién, cuándo, cómo y qué evidencia deja cada una. El protocolo completo de cada fila
está en [contracts/human-verifications.md](contracts/human-verifications.md).

| Verificación | FR | Quién | Cuándo (paso) | Evidencia |
| --- | --- | --- | --- | --- |
| F02: 10 cambios Yo ↔ Nosotros y 10 aperturas de meta | FR-032 | Cada fundador, su iPhone | 0b (y tras B si se corrige) | Tabla de tiempos por grabación de pantalla; mediana calculada por el gestor |
| Primera pasada de S1–S5, con y sin «Reducir movimiento» | FR-030, FR-031, FR-033 | Los dos | 0b | Notas por fila; capturas PNG |
| Revisión final de S1–S5 y aprobación de los `[P]` | FR-030, FR-033, FR-034 | Los dos, iPhone y 1440 | 6 | Tabla S1–S5 completa, aprobada por los dos |
| Humo de release en producción | FR-021 | Cada fundador, su cuenta y su teléfono | 6 | Checklist con fecha, modelo e iOS |
| Teclado nativo, safe areas, horizontal | FR-044 | Cada fundador | 0b y 6 | Capturas PNG; filas de dispositivo |
| VoiceOver (Anotar, Inicio, Balance, una meta) y contraste en los dos temas | FR-070 | Un fundador con VoiceOver; los dos con contraste | 0b y 6 | Notas por pantalla; capturas |
| Back-swipe de iOS frente al cierre de la meta inmersiva | FR-070 | Los dos | 6 | Nota y clip fuera del repo; fotogramas PNG |
| US-12: mediana < 10 s con ≥ 10 gastos habituales | FR-055 | Cada fundador | 6 (antes de declarar; decisión 30) | Tabla de tiempos por grabación |
| Tema entre dispositivos sin parpadeo | FR-072 | Un fundador | 6 | Nota con los dos dispositivos |
| **CLS en iPhone con el Mac prestado** | FR-071 | Un fundador con el Mac; el gestor prepara el grabador | 6 | Salida del grabador por ruta (`.txt`) y captura de Timelines |
| Exportación JSON y CSV con datos reales | FR-060 | Cada fundador | 6 | Recuentos por tipo, sin contenido |
| Recuperación de acceso | FR-063 | Cada fundador | 6 | Fecha y resultado; límite de envío copiado del panel |
| Vuelta atrás de un despliegue | FR-064 | Dueña de Vercel con el gestor | 6 | Identificadores de despliegue antes y después |
| **7 días consecutivos de uso diario**, con despliegues congelados (D4) | FR-080, FR-081 | Los dos | Validación por uso real, aplazada (decisión 30.6); FR-080 según la 30.7 | Valoración de cada uno, por separado |
| **Restauración real** de la copia con el esquema de P0-3 | FR-061 | Un fundador, en su equipo, con el gestor | Tras el paso 6, antes de declarar (decisión 30.5) | Manifiesto y log de `restore-plain.sh`, sin datos |
| Registros de Vercel de una semana | FR-013 | Dueña de Vercel, o el gestor con su «sí» y solo lectura | Tras el paso 6, antes de declarar (decisión 30.5) | Búsquedas hechas y su resultado, sin pegar líneas con datos |
| Ensayo del borrado de cuenta | FR-067 | Gestor, en `juntia-dev` | Tras el PR A | Recuentos antes y después |

## Dónde se mide cada criterio de éxito

| SC | Dónde | PR / paso |
| --- | --- | --- |
| SC-001 | Run completo del candidato (cinco specs y ensayo de restauración) | Paso 4a; C |
| SC-002 | Tramos `webkit-e2e-1` y `-2` del job `release` | Paso 4c; C |
| SC-003 | Tabla de FR-002 en `evidence.md` | C |
| SC-004 | `@sweep` del candidato | Paso 4b; A (casos), B (correcciones) |
| SC-005 | Tramos `cls-*` (Chromium, 40 + 10 cargas por ruta), `webkit-cls-*` y `firefox-cls-*` (comparador) | A (arneses); paso 4c |
| SC-006 | Tramo `lab-interaction` (INP) | A; paso 4c |
| SC-007 | iPhone de cada fundador | Paso 6 (decisión 30) |
| SC-008 | Exportación real; red de la checklist de humo; registros de Vercel | Paso 6 y antes de declarar (decisión 30) |
| SC-009 | Restauración real | Tras el paso 6, antes de declarar (decisión 30.5) |
| SC-010 | Tabla S1–S5 | Pasos 0b y 6 |
| SC-011 | Valoraciones de FR-081 | Validación por uso real, aplazada (decisión 30.6) |
| SC-012 | Tabla de CWV (FR-056): «laboratorio» con mediana y máximo, nunca «p75» | C |

## Riesgos

- **Instalar WebKit y Firefox en el runner.** `playwright install --with-deps` pide
  librerías por `apt`, y el espejo de Ubuntu ya colgó pasos del CI (PR C de la 002, run
  43045655895). El tramo usa el mismo patrón que Chromium (tope propio, reintento, matar
  el `apt-get` colgado) y, si falla por la red, se relanza solo ese tramo. Nunca en el
  gate.
- **WebKit de Linux no es Safari de iOS.** Los tramos `webkit-e2e-*` prueban el motor, no el
  teléfono. Por eso el humo, VoiceOver, el teclado y el CLS en iPhone siguen siendo
  verificaciones de dispositivo, no se sustituyen.
- **Una prueba de tiempo que solo falla en WebKit** (por ejemplo, el cronómetro de la spec
  2) se diagnostica en B: si la interfaz es lenta en WebKit, es un defecto del gate
  (spec, US-2); si es el arnés, se documenta con su salida, nunca se silencia.
- **El comparador puede no ser fiable** en algún motor. El criterio es objetivo (§5 del
  contrato) y la salida está fijada por la spec: vuelve a los fundadores con «solo
  WebKit».
- **El Mac es prestado y se usa una vez.** Si el CLS en iPhone sale distinto de 0, B
  corrige y hace falta el Mac otra vez. Se pide para el paso 6 con margen de una semana.
- **Un fallo crítico durante los 7 días** (validación por uso real, aplazada por la decisión 30.6) reinicia el periodo (D4, opción a): puede
  alargar esa validación una semana o más.
- **Concurrencia de `workflow_dispatch`.** Dos lanzamientos sobre la misma rama se
  cancelan (grupo `ci-<ref>`). Los runs del paso 4 van en serie.
- **`juntia-dev` compartido.** Un solo agente a la vez (decisión 18); la siembra de
  listas largas usa una cuenta propia y no se borra al resetear sin avisar.

## Constitution Check — repetición después del diseño

- Ningún requisito de la spec queda sin dueño: FR-001–FR-004 (pasos 0 y 0b, C), FR-010–FR-015
  (A, pasos 4–7), FR-020–FR-022 (A, pasos 4–6), FR-030–FR-034 (pasos 0b y 6, B, C),
  FR-040–FR-046 (A, B, pasos 4 y 6), FR-050–FR-056 (A, pasos 4 y 6–7, C), FR-060–FR-069
  (checklist, pasos 6–7, A con D2), FR-070–FR-072 (pasos 0b y 6), FR-080–FR-083 (paso 7, C),
  FR-090–FR-095 (A y B).
- Ninguna decisión nueva significativa se toma en el plan. Las del plan (tramos del job
  `release`, método de forzar el esqueleto, formato de evidencia, `--shard` del barrido
  si hace falta, técnica condicional de F02) son locales y reversibles. Las que no lo
  eran (D1–D4) las decidieron los fundadores el 18 de noviembre de 2026.
- Ningún `[P]` que afecte al alcance queda abierto.
- Specs E2E: siguen en 5 de 4–6. Presupuestos de job: no se mueven.
- Este PR no toca `docs/TESTING.md`, `AGENTS.md`, `.github/`, `scripts/` ni `package.json`.

**Resultado:** **PASA**, sin decisiones abiertas.

## Para los fundadores

Nada de este plan reabre Q1–Q12. Cuatro puntos obligaban a decidir algo que la spec no
decidía. **Los fundadores aprobaron las cuatro recomendaciones el 18 de noviembre de
2026** («dale acepto», Alejandro, comunicado por el gestor; la segunda fundadora lo
confirma con el merge de este PR). Cada punto conserva su contexto y sus opciones como
historia.

### D1 · ¿Puede empezar el PR A antes de que P0-3 esté aceptada?

- **Decidido** (fundadores, 18 nov 2026): opción **(a)**. El PR A se itera en borrador
  ya; no se marca listo ni se mergea hasta que T084 y T085 estén cerrados.

- **Contexto:** FR-001 dice que P0-4 «empieza con P0-3 aceptada»: T084 real y T085
  mergeado. Hoy no lo están (T084 espera los resultados de los fundadores; T085 no está
  abierto). El PR A no cambia la app: solo añade pruebas, arneses y un job a mano.
- **Opciones:**
  - (a) **El PR A se escribe e itera en borrador antes; no se marca listo ni se mergea
    hasta que FR-001 se cumpla.** El paso 0b (mediciones en producción) también puede
    adelantarse, porque mide lo que ya está en producción.
  - (b) El PR A puede mergearse antes de FR-001, porque no toca producto; B, C y el
    candidato sí esperan.
  - (c) Nada de P0-4 empieza hasta FR-001, ni el borrador.
- **Recomendación (aceptada): (a).** Respeta FR-001 en lo que cuenta (nada de P0-4 entra en `main`
  sin P0-3 aceptada) y no deja parado el trabajo que más tarda en construirse, el
  comparador.

### D2 · Alcance del borrado manual de cuenta cuando la persona tiene pareja

- **Decidido** (fundadores, 18 nov 2026): opción **(a)**. Sin pareja, se borra todo lo de
  la persona; con pareja, la pareja completa, con el «sí» de las dos y la exportación
  previa de cada una. La suspensión de triggers como dueño va como nota a ADR-007 y
  ADR-013 en el PR documental T085 (fila 19).

- **Contexto:** Q8 fija un procedimiento manual ensayado en `juntia-dev`, pero no qué se
  borra. Hoy ninguna tabla tiene `on delete cascade` hacia `auth.users`; los movimientos,
  el ledger de metas y la auditoría son de solo inserción con triggers que rechazan
  `delete` para cualquier rol; y los gastos compartidos, las liquidaciones y las metas
  compartidas mezclan a las dos personas. ADR-003 deja fuera de MVP-1 salir o expulsar de
  la pareja. El detalle está en [contracts/account-deletion.md](contracts/account-deletion.md).
- **Opciones:**
  - (a) **Sin pareja activa**, se borra todo lo de la persona y su usuario de Auth. **Con
    pareja activa**, el procedimiento borra **la pareja completa** (las dos cuentas y
    todos sus datos) y exige el «sí» escrito de las dos personas y la exportación previa
    de cada una. El borrado parcial con seudónimo («Persona eliminada») se diseña con la
    eliminación en la interfaz, para el lanzamiento público.
  - (b) Con pareja activa, se borran los datos privados de quien lo pide y su Auth, y en
    los datos compartidos se sustituye su identidad por un seudónimo. Es diseñar ahora
    la salida de un integrante (ADR-003) y cómo se ve en la pantalla de la otra persona.
  - (c) En MVP-1 solo se ensaya el caso sin pareja; con pareja, la petición espera al
    lanzamiento público.
- **Recomendación (aceptada): (a).** Es verificable con recuentos a cero, no inventa una pantalla y
  respeta ADR-003. **Consecuencia que se decide con ella:** el script suspende por nombre
  los triggers de solo inserción dentro de una transacción como dueño, igual que el
  protocolo de restauración de `docs/TESTING.md`. Recomiendo registrarlo como **nota a
  ADR-007 y ADR-013 en el PR documental T085**, no como ADR nuevo, porque no cambia la
  arquitectura sino que añade una operación administrativa excepcional.

### D3 · Criterio de «falla» del abanico con 6 metas (FR-053)

- **Decidido** (fundadores, 18 nov 2026): opción **(a)**. ≥ 55 fps: ≥ 95 % de fotogramas
  en ≤ 18,2 ms y ninguno > 50 ms, con CPU 4×.

- **Contexto:** la decisión 22.2 dice que si «falla el rendimiento del abanico con 6
  metas en gama media», la pantalla cae a la lista y vuelve a los fundadores. Ni la 22.2
  ni la spec dicen qué es fallar, y la consecuencia es un cambio de pantalla.
- **Opciones:**
  - (a) **El mismo umbral que MOTION_SYSTEM fija para los springs: ≥ 55 fps**, medido
    como ≥ 95 % de los fotogramas en ≤ 18,2 ms y ninguno > 50 ms durante el hover, el
    foco y el deslizamiento, con CPU 4× a 1440 (abanico) y a 390 (pila).
  - (b) 60 fps estrictos (≤ 16,7 ms en el 95 %).
  - (c) Sin umbral numérico: el gestor mide y los fundadores juzgan con la grabación.
- **Recomendación (aceptada): (a).** Usa un número que el paquete de diseño ya aprobó para el mismo
  tipo de movimiento y lo hace medible en el laboratorio.

### D4 · ¿Qué pasa con los 7 días si hay que desplegar durante el periodo?

- **Decidido** (fundadores, 18 nov 2026): opción **(a)**. Despliegues congelados durante
  el periodo; si hay un fallo crítico, se corrige y los 7 días vuelven a empezar.
- **Enmienda del 25 nov 2026 (decisiones 25.5 y 30):** el periodo es el de la validación
  por uso real, aplazada (30.6). Ya no precede a la declaración de MVP-1.

- **Contexto:** Q10 pide 7 días consecutivos de uso diario real antes de aprobar, sin
  decir sobre qué versión. Un fallo crítico durante el periodo obliga a corregir y
  desplegar; uno no crítico va a la lista de MVP-2 (FR-083) y no necesita despliegue.
- **Opciones:**
  - (a) **Congelar despliegues de producción durante el periodo**, salvo un fallo
    crítico. Si hay uno, el periodo se para, se corrige en un PR B, el candidato nuevo
    pasa el paso 4 y **los 7 días vuelven a empezar**.
  - (b) Igual que (a), pero tras la corrección basta con **3 días** más sobre el candidato
    nuevo.
  - (c) Sin congelación: cualquier despliegue sigue contando.
- **Recomendación (aceptada): (a).** Lo que se declara es lo que los dos usaron una semana; un fallo
  crítico ya impide aprobar (Q10) y reiniciar es la lectura literal.

## Complexity Tracking

| Añadido | Por qué hace falta | Alternativa más simple descartada porque |
| --- | --- | --- |
| Job `release` con 17 tramos | Las mediciones de FR-050 (350 cargas), FR-051 (dos motores) y FR-020 (WebKit) no caben en ~600 s ni deben correr en cada PR; con el arranque de cada tramo (200–430 s), solo cabe una ruta de CLS por tramo en Chromium (F85-7) | Meterlas en `evidence`: un solo tramo de más de una hora, por encima del tope de 20 min y de la regla de ~600 s. Menos tramos con más cargas: pasan de 600 s |
| Job `inputs-guard`, también en `pull_request` | `release_lab` no puede combinarse con otra entrada sin lanzar dos laboratorios a la vez (F85-4). Corre y pasa en cada PR no borrador porque, si se omitiera, GitHub omitiría los cuatro jobs del gate que dependen de él (F85-9) | Condiciones `if` sin guardia: con una combinación inválida no correría nada y el run saldría verde sin hacer nada. Dependientes con `always()` que aceptan un guardia omitido: cada uno tendría que distinguir a mano «omitido en un PR» de «fallido a mano», y un error en uno solo desbloquearía un lanzamiento inválido |
| Comparador por fotogramas propio | WebKit y Firefox no exponen `layout-shift` (Q7) | Revisión humana fotograma a fotograma: descartada por los fundadores (Q7, opción b) |
| Bloqueo de tabla en el servidor para forzar el esqueleto | WebKit y Firefox no tienen emulación de CPU ni de red en Playwright | Retrasar la respuesta con `page.route`: cambia lo que se carga y en qué orden, y no prueba el streaming real (R5) |
| Tres proyectos de Playwright fuera del gate | WebKit una vez (Q3) y el comparador en dos motores (Q7) | Un proyecto por navegador para todo: metería WebKit en `test:e2e:smoke` |
