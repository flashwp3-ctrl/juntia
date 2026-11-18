# Evidencia · 005 · Gate privado conjunto «funcional + espectacular» (P0-4)

> **Privacidad (regla 8 de [tasks.md](tasks.md); plan, «PR C · Evidencia y cierre», F85-6).** Al repositorio solo
> entran capturas con datos de prueba (runner o `juntia-dev`) o de producción **anonimizadas** de forma opaca por quien
> las hizo, más recuentos, tiempos, huellas cortas e identificadores de run o de despliegue. Las imágenes y clips
> originales, los nombres identificables y las firmas se quedan con los fundadores, fuera del repositorio. Una captura de
> producción solo entra si el hallazgo no se reproduce con el dataset. **Nunca** clips `.mov` ni `.mp4`; **nunca**
> contraseñas, tokens, correos ni los textos de las aprobaciones.
>
> **Qué es evidencia** (regla 7): lo automatizado, el CI sobre el commit que se fusiona o el candidato, con su número de
> run; lo de laboratorio y lo humano, una salida reproducible aquí. Lo que corre contra `juntia-dev` es iteración, no
> evidencia. Nada se marca «verificado» sin salida.

La crea el PR A (T012); la cierra el PR C (T103). Cada sección dice qué tarea la llena.

## Entrada al gate (FR-001)

Llenan T001, T002 y T003.

| Requisito | Estado | Salida |
| --- | --- | --- |
| T001 · prerrequisitos técnicos | pendiente | |
| T002 · salida interna real de P0-3 (004-T084) | pendiente | |
| T003 · PR documental de cierre de P0-3 (004-T085) | pendiente | |

## Paso 0b · Mediciones en producción

Llenan T004–T011 (interpretación I9: entran en el siguiente PR del slice que la toque y, como muy tarde, en el C).

| Medición | Quién | Fecha | Dispositivo | Resultado |
| --- | --- | --- | --- | --- |

## Cobertura de dinero y privacidad (FR-011, I5)

Llena T017; la cierra T103. Parte de la tabla de la spec («Cobertura de dinero y privacidad») y actualiza las filas que
el PR A cubre. Ninguna prueba se duplica en otra capa: US-08 está en dominio y en integración porque cada capa detecta un
fallo distinto (la aritmética y la agregación de la vista; Anexo A de [tasks.md](tasks.md)).

| Historia | Cubierta por | Estado |
| --- | --- | --- |
| US-01 Gasto privado sin presupuesto | 11a, money SC-007, budgets.test (null ≠ 0), dataset de octubre | — |
| US-02 Cena en pareja | balances.test, 11_shared_money, E2E 3 | — |
| US-03 70/30 | allocations.test | — |
| US-04 Presupuesto activo y desactivado | planningScenarios.us04, plan.test, 12_budgets, E2E 5 | — |
| US-05 Privacidad RLS | 06, 08, 11a, 13a, controlled-tables, money SC-007, casos de privacidad de las E2E | — |
| US-06 Auditoría | 05, 08, 11 (anulación de liquidaciones), money | — |
| US-07 Presupuesto sugerido | — | **No aplica**: fuera de MVP-1 («No bloquea MVP-1», §4) |
| US-08 Sin doble conteo | 11a, dataset de octubre; **dominio** `src/domain/allocations/allocations.test.ts` «US-08 literal: 400.000 al 50/50 → 400.000 del grupo, 200.000 a cada persona, nunca 800.000»; **integración** `tests/integration/money-us08.test.ts` «US-08 literal en la vista: …» (`couple_month_summary` y `couple_balance` en una sentencia) | Cerrado por el PR A (T013, T014) |
| US-09 Liquidez | componentes (analysis, goal-funding, goals) | — |
| US-10 Corrección tras liquidar | balances.test, concurrency | — |
| US-11 Miembros salientes | `supabase/tests/01_privileges` (lista exacta de funciones, sin salida ni expulsión); couple.test (LimitNote) | Se cita, sin prueba nueva (T016) |
| US-12 Captura rápida | E2E 2 (tiempo de laboratorio y doble toque) | Falta la mediana en teléfono real → FR-055 (T093) |
| US-13 Presupuesto ausente | componentes de plan y presupuestos, E2E 5; **componentes** «US-13 · … no exige presupuesto (005 T016)» en `src/features/auth/sign-up-form.test.tsx`, `src/features/expenses/annotate-sheet.test.tsx`, `src/features/home/home.test.tsx` y `src/features/couple/couple.test.tsx` | Cerrado por el PR A (T016) |
| US-14 Transición de contexto | casos de cookie, HTML, RSC y prefetch en las E2E 1, 3, 4 y 5 | — |
| US-15 Escritorio | comprobaciones a 1440 del barrido | Juicio humano → FR-030, FR-080 |
| US-16 Shared Balance | componentes (settle, shared-balance) | Juicio humano → FR-030 |
| US-17 Movimiento reducido | routes.a11y, casos @serial de las E2E 2 y 3 | Más la revisión humana → FR-031 |
| US-18 Meta individual | planningScenarios.us18, metrics, 13a | — |
| US-19 Meta compartida | planningScenarios.us19, E2E 4, 13_goals | — |
| US-20 Gasto con meta | goals (integración), metrics, 13_goals | — |
| US-21 Reserva frente a transferencia | goals.test (`transferred_declared`); **componentes** `src/features/goals/goals.test.tsx` «US-21 · modo del aporte, tal cual y nunca verificado (005 T015)» | Cerrado por el PR A (T015) |
| US-22 Privacidad de metas | 13_goals, 13a, 13b, metrics, E2E 4 | — |
| US-23 Retiro y anulación seguros | 13_goals, goal-races, goals (integración) | — |

| Punto de §15.6.3 | Cubierto por |
| --- | --- |
| 1. Atomicidad de Mover a Pareja | 11_shared_money, concurrency, E2E 3 |
| 2. Idempotencia | 08, 10, 11, 12, 13; money, shared-money, goals |
| 3. `goal_usage_confirmations` | 13_goals, goals, goal-races |
| 4. RLS de metas | 13a, 13b, metrics, E2E 4 |
| 5. Registro inicial del gasto con meta | 13_goals, goals |
| 6. Autorización posterior de fondos ajenos | 13_goals, goals, goal-races, E2E 4 |
| 7. Ediciones concurrentes de presupuesto | 12_budgets, budgets (integración), E2E 5 |

**Borrado de cuenta (FR-067, D2):** `tests/integration/account-deletion.test.ts`, once casos del contrato §6 (T039).

## Inventario heredado (FR-002, FR-003)

Llena T017 con la tabla borrador de T010; la cierra T103.

| Fila o tarea | Estado | Dueño y paso | Salida |
| --- | --- | --- | --- |

## PR A

Llenan T043 (qué añade, comandos locales, preparación del punto de control) y T049 (resultados del punto de control).

### Qué añade (T043)

| Grupo | Tareas | Piezas |
| --- | --- | --- |
| 1A | T012–T017 | Este archivo; US-08 en dominio (`allocations.test.ts`) y en las vistas de Inicio · Nosotros (`tests/integration/money-us08.test.ts`); US-21 (`goals.test.tsx`); US-13 en registro, Anotar, Inicio e invitación |
| 1B | T018–T021 | `states-matrix.md`; estados del registro de accesibilidad; casos `@sweep` de `routes.a11y.ts`; el `skip` del gesto CDP fuera de Chromium |
| 1C | T022–T028 | Proyectos `e2e-webkit`, `evidence-webkit` y `evidence-firefox`; arneses `release-cls`, `release-lcp`, `inp` (tres variantes), `release-goalstack` y `release-long-lists`; `scripts/dev-target/seed-long-lists.mjs` |
| 1D | T029–T034 | `scripts/cls-frames/recorder.js` y `compare.mjs`; `tests/cls-frames.test.ts`; `tests/evidence/cls-frames.capture.ts` con los controles 1 a 6; fixture real en `tests/fixtures/cls-frames/` |
| 1E | T035–T038 | `inputs-guard` y el job `release` (17 tramos); `tests/ci-workflow.test.ts`; presupuesto de 600 s sin bloquear; `docs/TESTING.md` §3 y §9 |
| 1F | T039–T042 | `scripts/account-deletion/` (fases, estado, `--resume`, `--abort`); once casos en `tests/integration/account-deletion.test.ts`; N1: `allocations_check_sum` no se suspende |

Los arneses de laboratorio llevan la etiqueta `@release`: el job `evidence` los excluye y cada tramo de `release` corre
solo esa etiqueta.

### Comandos locales (iteración contra `juntia-dev`; no son evidencia)

| Comando | Resultado |
| --- | --- |
| `npm run test:integration:dev -- account-deletion money-us08` | 12 de 12 (238 s, latencia a East US) |
| `npm run e2e:dev -- tests/evidence/cls-frames.capture.ts` con `CLS_FRAMES_SET=routes-1` y pocas cargas | Corre; acceso sin ventana (sin esqueleto) y sin desplazamientos; Inicio · Nosotros retiene ~1,8 s de esqueleto |
| Vitest de dominio y componentes de lo tocado, `tsc --noEmit`, `eslint .` | En verde |

### Preparación del punto de control (T045)

`gh workflow run ci.yml --ref <rama del PR A> -f release_lab=true`, sola. Qué corre cada tramo
(`scripts/release-leg.mjs`):

| Tramo | Navegador | Qué corre |
| --- | --- | --- |
| `cls-inicio-yo` … `cls-metas` (7) | Chromium | `release-cls.capture.ts`, una ruta: 40 cargas en claro y 10 en oscuro, CPU 6× y red lenta; API y grabador a la vez (control 7) |
| `cls-controls-chromium` | Chromium | `cls-frames.capture.ts`, controles 1 a 6 (10 cargas cada uno, más 10 de 0,5 px) |
| `lab-interaction` | Chromium | `inp.capture.ts` (tres variantes), `release-lcp`, `release-goalstack`, `release-long-lists`, `--workers 1` |
| `webkit-e2e-1`, `-2` | WebKit | `--project=e2e-webkit --shard=N/2`, sin `@serial` y después `@serial` con un worker |
| `webkit-cls-1`, `firefox-cls-1` | WebKit, Firefox | Controles 1 a 6 |
| `webkit-cls-2`, `firefox-cls-2` | WebKit, Firefox | A1, A2, A4, Inicio en Yo y en Nosotros: 10 cargas en claro y 5 en oscuro |
| `webkit-cls-3`, `firefox-cls-3` | WebKit, Firefox | Actividad, Balance, Plan, Análisis y Metas: igual |

La retención en el servidor de cada ruta (research R5) está en `tests/evidence/release-support.ts`. Inicio en Nosotros
retiene `settlements` y no `transactions`, porque con pareja activa el layout de `(app)` lee `couple_expenses` y bloquear
`transactions` retendría el layout entero.

## Barrido (`@sweep`)

Llenan T051 y T072.

| Run | Commit | Duración | Fallos |
| --- | --- | --- | --- |

## Laboratorio por arnés

Rotulado siempre **«laboratorio»**, con método, emulación, navegador y versión. Llenan T049 (primera salida, punto de
control) y T073 (candidato).

### CLS en Chromium (FR-050)

| Tramo | Run | Cargas | CLS > 0 | Máximo | Rótulo |
| --- | --- | --- | --- | --- | --- |

### Comparador por fotogramas, por motor y control (FR-051)

| Motor y versión | Método (§3.2) | Control 1 | 2 | 3 | 4 | 5 | 6 | 7 | ¿Fiable? | Run |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

| Ruta | Motor | Cargas | Con desplazamientos | CLS = 0 por fotogramas | Run |
| --- | --- | --- | --- | --- | --- |

### INP (FR-052)

| Variante | Ancho | CPU | Interacciones | INP abrir | INP guardar | < 200 ms | Run |
| --- | --- | --- | --- | --- | --- | --- | --- |

### LCP (FR-054)

| Ruta | Ancho | Condiciones | Cargas | Mediana | Máximo | Rótulo | Run |
| --- | --- | --- | --- | --- | --- | --- | --- |

### GoalStack con 6 metas (FR-053; D3)

| Animación | Ancho | % en ≤ 18,2 ms | Fotograma más largo | Pasa | Run |
| --- | --- | --- | --- | --- | --- |

### Listas largas (FR-043)

| Vista | Ancho | Filas | Solapes | Scroll horizontal | «Cargar más» y total | Run |
| --- | --- | --- | --- | --- | --- | --- |

## Tabla de CWV (FR-056)

Llena T103. **Regla: ninguna cifra se rotula «p75».** Lo no medible dice «no medible en p75 real: motivo».

| Métrica | Qué | Dónde | Método | Rótulo |
| --- | --- | --- | --- | --- |

## S1–S5 (FR-030)

Llenan T006 (primera pasada) y T082 (final).

## Criterios del handoff (FR-034)

Llena T082.

## Dispositivo

Llenan T004, T007, T008 y las verificaciones del paso 6 (T083–T088, T093). Fila de dispositivo: modelo, versión del
sistema, fecha y commit desplegado.

## Periodo de uso (D4)

Llenan T094–T096.

## Valoraciones (FR-081)

Llena T100.

## Lista de MVP-2 (FR-083)

Llenan T011, T055 y T101.

## SC-001 a SC-012

Llena T103.

| SC | Run o salida | Estado |
| --- | --- | --- |
