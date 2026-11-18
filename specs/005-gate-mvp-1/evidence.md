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

Llena T017 con la tabla borrador de T010; la cierra T103. **Borrador de T010**, preparado por el agente del PR A en modo de
solo lectura por delegación del gestor; lo revisa el gestor en el PR. Las filas «necesita ejecución» sin tarea en 005 van a
T011 (ninguna es un defecto de producto para el PR B).

Base: rama `claude/p0-4-pr-a-ecbd12` (main en `46d33b5` más los commits del PR A). Fecha: 18 de noviembre de 2026.
Fuentes: `specs/005-gate-mvp-1/spec.md` («Inventario de verificaciones heredadas», FR-002, FR-003, contradicciones 1–18), `specs/005-gate-mvp-1/tasks.md`, las `tasks.md` y `evidence.md` de 001–004, `docs/JUNTIA_MASTER.md` (decisión 19), las etiquetas `db-prod-*` y `gh run view` / `gh pr view` de solo lectura.

Estados: **salida real** (con enlace), **necesita ejecución** (dueño y paso de 005), **EXCEPCIÓN APROBADA** (documento que la registra), **no aplica: motivo**.
«Paso» = paso del plan de 005 (0, 0b, 1 … 9). Un run citado sin registro en el repositorio se marca «sin registrar»: existe en GitHub, pero T103 tiene que pasarlo a `evidence.md`.

---

### 1. Filas del «Inventario de verificaciones heredadas» (spec 005)

Las filas que la spec agrupa con estados distintos se separan (002-T086, 002-T101/T103/T105, 003-T073/T074, 004-T084/T085).

| Fila | Estado | Dueño y paso (de 005 tasks.md) | Salida o motivo |
| --- | --- | --- | --- |
| 002-T086 · teclado nativo, iPhone | necesita ejecución | Cada fundador · T007 (paso 0b), T083 (paso 6) | Aplazada (19.1): `specs/002-cuentas-y-gastos-privados/evidence.md` §T086 |
| 002-T086 · teclado nativo, Android con teclado de terceros | EXCEPCIÓN APROBADA | Los dos · T102 (paso 7, registra la prórroga más allá de MVP-1) | `specs/002-cuentas-y-gastos-privados/evidence.md` §T086 y §T096; `docs/JUNTIA_MASTER.md:1061` (19.2); Q6 (c) |
| 002-T087 · US-12 < 10 s en teléfono | necesita ejecución | Cada fundador · T093 (paso 6, puede ir en el 7) | Aplazada (19.1): 002 evidence §T087 |
| 002-T089 (001-T073) · contraste en iPhone | necesita ejecución | Fundadores · T008 (paso 0b), T084 (paso 6) | Aplazada (19.1): 002 evidence §T089 |
| 002-T090 (001-T074) · sombras en Android | EXCEPCIÓN APROBADA | Los dos · T102 (paso 7) | 002 evidence §T090 (cinco datos, 6 nov 2026); maestro 19.2 |
| 002-T091 (001-T075) · VoiceOver | necesita ejecución | Un fundador · T008 (paso 0b), T084 (paso 6) | Aplazada (19.1): 002 evidence §T091 |
| 002-T092 (001-T075) · TalkBack | EXCEPCIÓN APROBADA | Los dos · T102 (paso 7) | 002 evidence §T092; maestro 19.2 |
| 002-T093 · CLS = 0 en Firefox y WebKit | necesita ejecución | Gestor (agente escribe los arneses) · T029–T034 (paso 1), T045 y T049 (punto de control), T073 (paso 4) | Aplazada (19.4): 002 evidence §T093; método de Q7 (a) |
| 002-T094 · CLS en iPhone con el inspector de Safari | necesita ejecución | Fundador con el Mac y gestor · T075 (paso 4, pedir el Mac), T087 y T088 (paso 6) | Excepción 19.2 vigente (002 evidence §T094), pero Q6 (a) la devuelve a antes de MVP-1; no sirve como cierre |
| 002-T095 · respaldo de Onest en Android | EXCEPCIÓN APROBADA | Los dos · T102 (paso 7) | 002 evidence §T095; maestro 19.2 |
| 002-T097 · primera copia real y restauración | necesita ejecución | Gestor (solo lectura) y fundador con gpg · T009 (paso 0b), T079 (paso 5), T097 (paso 7) | 002 evidence §T097: «Pendiente · Humana» (19.3). Ninguna salida de copia en el repositorio |
| 002-T036 · correo de verificación de la segunda fundadora | necesita ejecución | Segunda fundadora, con el gestor · **sin tarea en 005** (T090 solo cubre recuperación) → T011 | 002 evidence §T036: parcial; la cuenta del primer fundador hecha en dev y prod; falta la segunda fundadora en `juntia-dev` y en `juntia-prod` |
| 002-T101 · descripción y revisión del PR D | necesita ejecución | Los dos · T082 (paso 6, S2 Anotar) | La revisión de código existe (PR #45 fusionado; 002 evidence «Revisión del PR #45»), pero falta la aprobación de las pantallas del PR D (002 evidence §T102, fila SC-001) |
| 002-T103 · SC-012, salida interna de P0-1 | necesita ejecución | Los dos · **sin tarea en 005** (T095 la roza: no pide editar ni eliminar) → T011 | 002 evidence §T103: «Pendiente · Humana» |
| 002-T105 · cierre de F0-b y aceptación de la 002 en el maestro | necesita ejecución | Gestor · **sin tarea en 005** → T011 | 002 evidence §T105: pendiente; maestro §15.1 sigue en «F0-b pendiente en implementación» (`docs/JUNTIA_MASTER.md:744`) |
| 003-T054 · INP de Anotar en Nosotros; CLS de Inicio y Actividad | necesita ejecución | Gestor · T023 y T025 (paso 1), T045 y T049, T073 (paso 4) | `specs/003-pareja-y-balances/evidence.md` «Pendiente para cerrar el slice» (línea 1685); T023 y T025 la consolidan |
| 003-T068 · CLS de Balance | necesita ejecución | Gestor · T023 (paso 1), T073 (paso 4) | Mismo apartado de la 003 evidence |
| 003-T072 · tabla de cierre de `[V]` de la 003 | necesita ejecución | Gestor · T103 (paso 8) | No existe la tabla. Salidas ya disponibles para llenarla: gates 42389653589 y 42403310781, barrido 42404714123 (003 evidence «Cierre del gestor de los PR C y D») |
| 003-T073 · salida interna de P0-2 | necesita ejecución | Los dos · **sin tarea propia en 005** (T092 no tiene liquidaciones; T095 pide una) → T011 | 003 evidence línea 1687: pendiente |
| 003-T074 · cierre de P0-2 | necesita ejecución | Gestor · **sin tarea en 005** → T011 | 003 evidence línea 1688: pendiente |
| 004-T040 · CLS con esqueleto de Plan | necesita ejecución | Gestor · T023 (tramo de Plan, paso 1), T045, T073 (paso 4) | `specs/004-presupuestos-y-metas/evidence.md` §T083, fila «Umbrales de §15.7»: pendiente |
| 004-T054 · GoalStack con 6 metas; CLS de Metas | necesita ejecución | Gestor · T026 y T023 (paso 1), T045, T073 (paso 4); si falla, T055 (paso 2) | 004 evidence §T083: «Pendiente del gestor»; la medición de iteración de la línea 751 no cuenta |
| 004-T067 · INP de Anotar con meta | necesita ejecución | Gestor · T025 (paso 1), T073 (paso 4) | 004 evidence §T083: pendiente |
| 004-T079 · CLS con esqueleto de Análisis | necesita ejecución | Gestor · T023 (paso 1), T073 (paso 4) | 004 evidence §T083: pendiente |
| 004-T080 · gate del PR E | salida real (sin registrar) | Gestor · T103 (paso 8, registrarla) | Run 43045655895 sobre `383d23b` (head del PR #71): `app` y `e2e` en verde, `db` cancelado. Run 43061973171 completo sobre `main` `e771330`: los cuatro jobs en verde. El presupuesto de un solo job lo sustituye la partición del PR #83 (contradicción 11). El merge sin `db` no tiene registro en el repositorio (ver §3) |
| 004-T082 · barrido de cierre de P0-3 y cinco specs | salida real (sin registrar) | Gestor · T103 (paso 8, registrarla); FR-040 lo repite en T072 (paso 4) | Barrido 43050756971 (`workflow_dispatch` sobre `main` `ac520b9`, success) y run completo 43061973171 (`e771330`, success) |
| 004-T041, T056, T069, T081 · revisiones visuales | necesita ejecución | Los dos · T006 (paso 0b) y T082 (paso 6, FR-033); registro en T103 | 004 evidence §T083: «Pendiente de los fundadores». La aprobación de T069 y T081 (11 nov 2026) solo consta en notas del gestor fuera del repositorio. T041 y T056 no tienen ningún registro |
| 004-T084 · salida interna de P0-3 | necesita ejecución | Los dos · T002 (paso 0) | 004 evidence §T083: pendiente. `docs/audits/2026-11-t084/` es la simulación y no cuenta (FR-001) |
| 004-T085 · PR documental de cierre de P0-3 | necesita ejecución | Gestor · T003 (paso 0) | Sin PR. Depende de T002 y de T042 (N1) |
| Decisión 21.2 · barrido «antes de MVP-1» | necesita ejecución | Gestor · T051 (paso 2), T072 (paso 4) | FR-040 |
| Decisión 16.16 · enumeración por la API de Auth | no aplica a MVP-1: pasa al lanzamiento público | Nadie en P0-4 (lo revisa el gestor al abrir el registro) | Q8 (a) en la spec 005; enmienda en la fila 16 de las contradicciones, que lleva T003 |
| `specs/002` data-model · purga de la tabla de idempotencia | necesita ejecución (medir, sin purgar) | Gestor · T099 (paso 7); revisión en la lista de MVP-2, T101 | FR-068; Q12 (a) |

---

### 2. Tareas sin casilla de las specs 001–004

#### 001 · `specs/001-frontend-foundation/tasks.md` (41 tareas; T075 en dos filas)

| Tarea | Qué era (≤ 12 palabras) | Estado | Dueño y paso | Salida o motivo |
| --- | --- | --- | --- | --- |
| T024–T041 (18) | Primitivos, superficie interna, su comprobación HTTP y su paso de CI | salida real | Nadie: hecha | PR #17 (merge `cb14a9f`): commits `66e135d`, `03c7d63`, `d6692a7`, `b432829`, `c8c9854`, `e4be200`, `894b877`, `2e19e91`, `cd4236c`. Inventario de pruebas en 001 evidence §T069. El modal centrado de T035 lo sustituye el PR #81 (contradicción 4); eso no cambia que la tarea se hizo |
| T042–T060 (19) | Selector, AppShell, rutas, estados, aviso de Anotar, 404 y axe | salida real | Nadie: hecha | PR #19 (merge `a3216c0`): commits `dbea173`, `1ed12f3`, `0daa555`, `324d4a9`, `abb0d2b`. El aviso de Anotar (T049, T056) lo retira después la 002 (002 evidence §T104) |
| T072 | Superficie interna en Vercel: producción y preview | salida real | Nadie: hecha. La re-sonda de producción es T077 (paso 5) | 001 evidence §T072 (producción, 4 nov); 002 evidence §T056 (aislamiento en preview) y §T088 (funcionamiento en preview), los dos del 6 nov; `docs/JUNTIA_MASTER.md:1066` |
| T073 | Contraste del shell en dispositivo, dos temas | necesita ejecución | Fundadores · T008 (paso 0b), T084 (paso 6) | Igual que 002-T089, aplazada (19.1) |
| T074 | Sombras táctiles en Android de gama media | EXCEPCIÓN APROBADA | Los dos · T102 (paso 7) | 002 evidence §T090; maestro 19.2 |
| T075 (VoiceOver) | Lector de pantalla iOS sobre el shell y Anotar | necesita ejecución | Un fundador · T008 (paso 0b), T084 (paso 6) | Igual que 002-T091, aplazada (19.1) |
| T075 (TalkBack) | Lector de pantalla Android sobre el shell | EXCEPCIÓN APROBADA | Los dos · T102 (paso 7) | 002 evidence §T092; maestro 19.2 |

#### 002 · `specs/002-cuentas-y-gastos-privados/tasks.md` (12 tareas; T086 en dos filas)

| Tarea | Qué era (≤ 12 palabras) | Estado | Dueño y paso | Salida o motivo |
| --- | --- | --- | --- | --- |
| T033 | Descripción del PR A y revisión humana del SQL | salida real | Nadie: hecha | PR #40 fusionado (`56d0dde`) después de la revisión F40-1 a F40-3 (002 evidence, «Revisión PR #40») |
| T036 | Correo de verificación real de cada fundador | necesita ejecución | Segunda fundadora y gestor · sin tarea → T011 | 002 evidence §T036: falta la segunda fundadora en dev y prod |
| T086 (iPhone) | Teclado nativo con la hoja de Anotar en iPhone | necesita ejecución | Cada fundador · T007 (paso 0b), T083 (paso 6) | Aplazada (19.1) |
| T086 (Android) | Teclado y máscara COP con teclado de terceros | EXCEPCIÓN APROBADA | Los dos · T102 (paso 7) | 002 evidence §T086 y §T096 |
| T087 | Mediana de US-12 en teléfono real | necesita ejecución | Cada fundador · T093 (paso 6 o 7) | Aplazada (19.1) |
| T089 | Contraste en iPhone (001-T073) | necesita ejecución | Fundadores · T008, T084 | Aplazada (19.1) |
| T091 | VoiceOver con Anotar real (001-T075) | necesita ejecución | Un fundador · T008, T084 | Aplazada (19.1) |
| T093 | CLS = 0 en Firefox y WebKit | necesita ejecución | Gestor · T029–T034 (paso 1), T045 y T049, T073 (paso 4) | Aplazada (19.4) |
| T097 | Primera copia real y su restauración | necesita ejecución | Gestor y fundador con gpg · T009 (paso 0b), T079 (paso 5), T097 (paso 7) | 002 evidence §T097: pendiente |
| T101 | Descripción y revisión humana del PR D | necesita ejecución | Los dos · T082 (paso 6) | PR #45 fusionado con revisión F45-1/F45-2; falta la aprobación de las pantallas (SC-001) |
| T102 | Tabla SC-001 a SC-011 de aceptación de la 002 | necesita ejecución | Gestor · T103 (paso 8) | La tabla existe (002 evidence §T102), pero SC-001, SC-003, SC-005, SC-010 y SC-012 siguen pendientes. Se cierran con T082, T093, T073 y T088, T097, y con 002-T103 |
| T103 | SC-012: salida interna de P0-1 con movimientos reales | necesita ejecución | Los dos · sin tarea → T011 | 002 evidence §T103: pendiente |
| T105 | Cierre de F0-b y aceptación de la 002 en el maestro | necesita ejecución | Gestor · sin tarea → T011 | 002 evidence §T105: pendiente |

#### 003 · `specs/003-pareja-y-balances/tasks.md` (5 tareas)

| Tarea | Qué era (≤ 12 palabras) | Estado | Dueño y paso | Salida o motivo |
| --- | --- | --- | --- | --- |
| T054 | INP de Anotar en Nosotros; CLS de Inicio y Actividad | necesita ejecución | Gestor · T023, T025 (paso 1), T073 (paso 4) | 003 evidence línea 1685 |
| T068 | CLS de la carga con esqueleto de Balance | necesita ejecución | Gestor · T023 (paso 1), T073 (paso 4) | 003 evidence línea 1685 |
| T072 | Tabla de cierre de todos los `[V]` de la 003 | necesita ejecución | Gestor · T103 (paso 8) | No existe. Insumos: runs 42389653589, 42403310781 y 42404714123 |
| T073 | Salida interna de P0-2 con cuentas reales | necesita ejecución | Los dos · sin tarea propia → T011 | 003 evidence línea 1687. T092 y T095 la cubren solo en parte: falta el reparto 70/30 o 55/45 y la liquidación parcial más la completa |
| T074 | Cerrar el slice: evidencia, runs y aprobaciones | necesita ejecución | Gestor · sin tarea → T011 | 003 evidence línea 1688 |

#### 004 · `specs/004-presupuestos-y-metas/tasks.md` (89 tareas, ninguna marcada)

| Tarea | Qué era (≤ 12 palabras) | Estado | Dueño y paso | Salida o motivo |
| --- | --- | --- | --- | --- |
| T001 | Prerrequisitos antes del PR A | salida real | Nadie: hecha | 004 evidence §Estado: «T001 declarada hecha por el gestor» |
| T002–T021 (20) | Dominio, errores, glosario, paginador, migraciones, pgTAP, integración, siembra, iteración | salida real | Nadie: hecha | PR #66 (merge `bd408b9`); 004 evidence «Mapa de tareas, commits y pruebas» y §T021 |
| T022–T023 | Habilitar y medir workers | salida real | Nadie: hecha | 004 evidence §«T022–T023 · medición de workers» |
| T024 | Punto de control único (CI) | salida real | Nadie: hecha | Run 42508573805 (004 evidence §«T024 cerrado») |
| T025 | Sección «PR A» de evidence.md | salida real | Nadie: hecha | 004 evidence, secciones del PR A (líneas 1–387) |
| T026 | e2e:dev completo, verify y PR en borrador | salida real | Nadie: hecha | 004 evidence §T026 y «Cierre local final» |
| T027 | Gate del PR A y merge | salida real | Nadie: hecha | Gate 42543237243 (004 evidence §T083); PR #66 fusionado |
| T028 | Migraciones del PR A a producción | salida real | Nadie: hecha | Etiqueta anotada `db-prod-2026-11-08` («P0-3 PR A migrations applied to prod») |
| T029–T035, T032a (8) | Plan, hoja de presupuesto, spec E2E 5, a11y, selector de specs | salida real | Nadie: hecha | PR #67 (merge `4fadbf5`); 004 evidence §PR B (T032a en rojo, selector T035) |
| T036 | Fijar los workers medidos en el job e2e | salida real | Nadie: hecha | 004 evidence §«T036 · workers» |
| T037 | Iterar a verde; e2e:dev y verify | salida real | Nadie: hecha | 004 evidence §«`e2e:dev` completo y `verify`» |
| T038 | Capturas del PR B e Impeccable | salida real | Nadie: hecha | 004 evidence §T038 |
| T039 | Barrido @sweep del PR B | salida real | Nadie: hecha | Run 42851485512 |
| T040 | CLS = 0 con esqueleto de Plan | necesita ejecución | Gestor · T023 (paso 1), T045, T073 (paso 4) | Pendiente (004 evidence línea 508 y §T083) |
| T041 | Aprobar Plan, BudgetIndicator, hoja y copy | necesita ejecución | Los dos · T006 (paso 0b), T082 (paso 6) | Sin registro de aprobación |
| T042–T051, T044a (11) | Metas, hojas, aportes, historial, inmersiva, Inicio y Actividad | salida real | Nadie: hecha | PR #68 (merge `7b42b3a`); 004 evidence §PR C |
| T052 | [V] View Transitions con App Router | salida real (cerrada para la apertura) | Nadie: hecha. Restos: back-swipe → T085 (paso 6); cierre sin View Transition → MVP-2 (Q11, T101) | 004 evidence §T052, verificación en Safari real del 10 nov. Falta la versión de iOS (→ T011) |
| T053 | Capturas del PR C e Impeccable | salida real | Nadie: hecha | 004 evidence §T053 |
| T054 | Rendimiento de GoalStack con 6 metas | necesita ejecución | Gestor · T026, T023 (paso 1), T045, T073 (paso 4) | Pendiente (004 evidence §T083) |
| T055 | Barrido @sweep del PR C | salida real | Nadie: hecha | Run 42862623410 |
| T056 | Aprobar GoalStack, tipos, personas y tinta | necesita ejecución | Los dos · T006, T082 | Sin registro de aprobación |
| T057–T065, T059a (10) | Gasto con meta, FundingLedger, B1–B7, quitar uso, fila CON META | salida real | Nadie: hecha | PR #69 (merge `ff77a3d`); 004 evidence §PR D |
| T066 | Capturas del PR D e Impeccable | salida real | Nadie: hecha | 004 evidence §T066 |
| T067 | INP de Anotar con meta | necesita ejecución | Gestor · T025 (paso 1), T073 (paso 4) | Pendiente |
| T068 | Barrido @sweep del PR D | salida real | Nadie: hecha | Run 42951372008 (el fallido 42939346411 y su arreglo, en 004 evidence); gate 42958244114 |
| T069 | Aprobar FundingLedger, ConfirmationBadge, B3 y copy | necesita ejecución (falta el registro) | Los dos confirman · T082 (paso 6); registro en T103 | Aprobada el 11 nov 2026 según notas del gestor fuera del repositorio; no consta en el repositorio |
| T070–T077, T072a (9) | Análisis, PlanningNote, accesos, exportación, spec 5 ampliada | salida real | Nadie: hecha | PR #71 (merge `ac520b9`); 004 evidence §PR E (T076 en §T076) |
| T078 | Capturas del PR E e Impeccable | salida real | Nadie: hecha | 004 evidence §T078 |
| T079 | CLS = 0 con esqueleto de Análisis | necesita ejecución | Gestor · T023 (paso 1), T073 (paso 4) | Pendiente |
| T080 | Gate del PR E | salida real (sin registrar) | Gestor · T103 (registro) | Runs 43045655895 (`app` y `e2e` en verde; `db` cancelado) y 43061973171 (completo sobre `main`, en verde) |
| T081 | Aprobar Análisis y PlanningNote | necesita ejecución (falta el registro) | Los dos confirman · T082; registro en T103 | Igual que T069 |
| T082 | Barrido de cierre de P0-3 y cinco specs | salida real (sin registrar) | Gestor · T103 (registro) | Runs 43050756971 y 43061973171 |
| T083 | Cerrar la tabla de `[V]` | necesita ejecución | Gestor · T103 (paso 8) | La tabla existe (004 evidence §T083), con filas pendientes. Se cierran con T023, T025 y T026 → T073; con T082 (revisión visual) y con T002 (salida interna) |
| T084 | Salida interna de P0-3 | necesita ejecución | Los dos · T002 (paso 0) | Pendiente; la simulación no cuenta |
| T085 | PR documental de cierre de P0-3 | necesita ejecución | Gestor · T003 (paso 0) | Pendiente |

---

### 3. Necesitan ejecución sin tarea en 005

Ninguno es un defecto de producto, así que ninguno va al PR B. Todos van a T011:

- **002-T036 · T011**: el correo de verificación de la segunda fundadora (en `juntia-dev` y `juntia-prod`) no lo cubre ninguna tarea. T090 prueba la recuperación de acceso, no la verificación. Hay que ampliar T090 o registrar «no aplica» con su motivo.
- **002-T103 · T011**: SC-012 de la 002 (registrar, editar y eliminar movimientos reales y entenderlos sin ayuda). T081, T092 y T095 no piden editar ni eliminar.
- **002-T105 · T011**: el cierre de F0-b y la aceptación de la 002 en el maestro §15.1 no tienen PR asignado. Podría entrar en T003 (004-T085) o en T109.
- **003-T073 · T011**: la salida interna de P0-2 (pareja, reparto 70/30 o 55/45, liquidación parcial y completa, explicar quién debe cuánto). T092 no tiene liquidaciones y T095 pide solo una.
- **003-T074 · T011**: el cierre de P0-2 (resumen de los cuatro PR, runs y aprobaciones, y el estado en el maestro) no tiene tarea. Podría ir con T003.
- **Excepción del merge del PR #71 sin job `db` · T011**: el run 43045655895 tiene `db` cancelado. La aprobación de los fundadores solo consta fuera del repositorio. Hay que registrarla como EXCEPCIÓN APROBADA, con fuente, o citar el run 43061973171 como cobertura.
- **Versión de iOS de la verificación de 004-T052 · T011**: la evidencia dice «por confirmar».

---

### 4. Recuentos por estado

| Tabla | Salida real | Necesita ejecución | EXCEPCIÓN APROBADA | No aplica | Filas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inventario de la spec (§1) | 2 | 25 | 4 | 1 | 32 |
| 001 (41 tareas, 42 filas) | 38 | 2 | 2 | 0 | 42 |
| 002 (12 tareas, 13 filas) | 1 | 11 | 1 | 0 | 13 |
| 003 (5 tareas) | 0 | 5 | 0 | 0 | 5 |
| 004 (89 tareas) | 78 | 11 | 0 | 0 | 89 |
| **Tareas 001–004** | **117** | **29** | **3** | **0** | **149 filas / 147 tareas** |

Sin tarea en 005: 7 puntos, todos para T011 y ninguno para el PR B.
Registros pendientes en `evidence.md` (T103): 004-T080 y 004-T082 (runs sin registrar) y las aprobaciones de 004-T069 y T081.

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
| `npm run e2e:dev` completo (T044), una vez antes del push final | E2E 39 de 39. Axe con sesión 110 de 125: los 15 fallos (12 tiempos agotados o elementos no encontrados en el primer lote paralelo, por la latencia de `juntia-dev`, y 3 «rectángulos distintos del aviso») pasan todos al repetir esos archivos y estados (19 de 19) |

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

### Hallazgos del PR A para el PR B (T011, T055)

Encontrados al iterar los casos nuevos contra `juntia-dev` (no son evidencia: el barrido del paso 2 los registra en CI).
Capturas con datos sembrados, a 390 px.

| Hallazgo | Medida | Captura | Destino |
| --- | --- | --- | --- |
| A4 `/recuperar` con texto al 200 % | documento 397/390 px | [evidence/hallazgo-texto-200-a4-recuperar-390.png](evidence/hallazgo-texto-200-a4-recuperar-390.png) | PR B (FR-042) |
| A5 `/nueva-contrasena` con texto al 200 %: el título «contraseña» se sale | documento 459/390 px | [evidence/hallazgo-texto-200-a5-nueva-contrasena-390.png](evidence/hallazgo-texto-200-a5-nueva-contrasena-390.png) | PR B (FR-042) |
| Detalle de Actividad bajo la hoja «Editar gasto» con texto al 200 %. En la hoja, además, el título queda bajo el botón de cerrar y «Entretenimiento» se parte | documento 402/390 px; la hoja 390/390 | [evidence/hallazgo-texto-200-detalle-edicion-390.png](evidence/hallazgo-texto-200-detalle-edicion-390.png) | PR B (FR-042) |
| Detalle de Actividad bajo «¿Eliminar este gasto?» con texto al 200 % | documento 402/390 px; el diálogo 326/326 | [evidence/hallazgo-texto-200-detalle-eliminar-390.png](evidence/hallazgo-texto-200-detalle-eliminar-390.png) | PR B (FR-042) |
| Inicio · Yo con la raíz al 200 % a 1440 (residuo de F13, I3) | documento 1.447/1.440 px | — (caso `@sweep` b) | PR B (T056, T060) |
| A vigilar en el gate: «rectángulos distintos del aviso» de Anotar, intermitente en `juntia-dev`. Falló en «Inicio con datos extremos · dark», «Actividad con datos extremos» (claro y oscuro) y en el estado anterior al PR «Actividad con datos · dark»; todos pasan al repetir | 2 rectángulos en 10 cuadros | — | Gate del PR A (T050) |

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
