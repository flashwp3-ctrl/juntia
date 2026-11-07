---

description: "Lista de tareas de la especificación 004 · Presupuestos opcionales y metas (P0-3)"
---

# Tasks: 004 · Presupuestos opcionales y metas (P0-3)

> En este archivo, `[P]` significa **paralelizable** (archivos distintos, sin
> dependencias). **No** es la marca de propuesta del paquete de diseño. Una
> tarea que implementa algo propuesto lo dice en palabras —«propuesta
> §15.9»— y nunca con la etiqueta suelta.

**Input**: `specs/004-presupuestos-y-metas/` — [spec.md](spec.md) (PR #63), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md) y [contracts/](contracts/) (PR #64, `94d0fae`).

**Status**: Draft — fase Tasks. No avanza a Implement sin el merge de su PR documental (ADR-012 §3.1).

**Cómo se escribió.** A partir de `.specify/templates/tasks-template.md` y de su override `.specify/templates/overrides/tasks-template.md`, a mano, **sin invocar la skill `speckit-tasks`** (está marcada `disable-model-invocation`; mismo procedimiento que la 003). La pasada de consistencia que haría `speckit-analyze` está en el [Anexo B](#anexo-b--cobertura-y-consistencia).

**Quién lo ejecuta**: el agente de cada PR, a partir de este archivo mergeado. Cada tarea lleva sus rutas, el requisito que cumple, **cómo se itera** y **cuál es su prueba**. **Las tareas no deciden y no amplían el alcance**: si una no se puede cumplir sin decidir algo que no está en la spec, el plan o sus auxiliares, la implementación se detiene y lo reporta (`AGENTS.md` 17). Las tareas **Humanas** las ejecuta la persona que nombran; el agente las prepara y pega su salida.

**Tests**: se rigen por `docs/TESTING.md` y ADR-011, que prevalecen sobre
cualquier heurística genérica. Cada criterio va en **la capa más baja que puede
detectar su fallo** (`docs/TESTING.md` §4); cada tarea de test nombra su capa, su
archivo y el criterio que cubre. **No** se genera un contract test por endpoint ni
por interfaz (ADR-012 §4). Las pruebas salen de «Pruebas por capa» de cada PR del
plan; la auditoría está en el [Anexo A](#anexo-a--auditoría-de-las-tareas-de-test-adr-012-4).

**Specs E2E que añade este slice (obligatorio)**: **2**, las reservadas para P0-3 en `docs/TESTING.md` §4: la **spec E2E 5 «Presupuesto activado/desactivado»** (`tests/e2e/budgets.e2e.ts`), que **nace en el PR B** y **crece en el PR E** con Análisis, y la **spec E2E 4 «Meta con aportes y uso»** (`tests/e2e/goals.e2e.ts`), que **nace en el PR C** y **crece en el PR D** con el caso de dos sesiones «Financiación ajena → aprobar/rechazar». Total en P0 tras la 004: **5 specs**; queda la sexta plaza libre. La pasada de axe no es una spec E2E.

**Organization**: una fase previa de prerrequisitos y una fase por PR, **A → (B ‖ C) → D → E** (decisión 22.1; plan, «PR de implementación A–E»), con la aceptación de P0-3 dentro del PR E. B y C pueden ir en paralelo después de A, en worktrees distintos, **con un solo agente a la vez en `juntia-dev`**. Dentro de cada fase, grupos en orden; dentro de cada grupo, las `[P]` pueden ir a la vez. Las tareas de historia llevan `[USn]`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable con las demás `[P]` **de su grupo y de su PR**: archivos distintos, sin dependencias entre ellas y **sin competir por `juntia-dev`, por el mismo checkout, servidor o puerto, ni por un run de CI**. Una tarea que usa `juntia-dev`, compila, sirve la app, ejecuta `npm ci` o lanza CI no lleva `[P]`.
- **[Story]**: historia de la spec (US1…US10). Configuración, CI, evidencia y aceptación no llevan etiqueta.
- **Humana**: la ejecuta una persona (fundadores o gestor, según se diga); nunca un agente por su cuenta.
- Debajo de cada tarea: **Cumple**, **Itera** y **Prueba / terminado cuando**.

## Reglas que aplican a todas las tareas

Se enuncian una vez. Una tarea que las incumpla no está terminada.

1. **Pruebas primero y en rojo** (`docs/TESTING.md` §6). Unitarias, pgTAP, integración, E2E y a11y se escriben **antes** que el código que prueban, se ven fallar **contra `juntia-dev`** (o en local, las de dominio y componentes) y solo después se escribe el código. Cada test copia como comentario el criterio literal que cubre, con su referencia. En pgTAP la identidad se fija solo con `set local role …` y `set local "request.jwt.claims" = '…'`.
2. **Iterar contra `juntia-dev`, nunca contra el CI** (decisión 18; [contracts/ci.md](contracts/ci.md)): `npm run db:dev:reset`, `npm run test:db:dev`, `npm run test:integration:dev` y `npm run e2e:dev`, con su guardia y su **lock**; un solo agente a la vez; si otra sesión tiene el lock, se espera y nunca se fuerza un lock ajeno. **Solo las pruebas afectadas** mientras se itera (`npm run e2e:dev -- tests/e2e/<archivo>.e2e.ts`, `-- tests/a11y/<archivo>.a11y.ts`, `--grep`, `--only-changed`) y **`npm run e2e:dev` completo una vez, justo antes del push final** de cada PR.
3. **CI: una sola pasada por PR, la de marcarlo listo** (`ready_for_review`), que lanza el **gestor** después de la revisión de ChatGPT con el PR en borrador. **Ninguna pasada manual** salvo el **único punto de control del PR A** (T024, justificado en la interpretación I1). Las correcciones de una revisión se juntan en **un solo push** (`AGENTS.md` 15a). Nada de runners ni workflows para spikes ni verificaciones.
4. **Toda evidencia de un `[V]` sale del CI** sobre el commit que se fusiona, nunca de `juntia-dev` (ADR-011 §9.8); `juntia-dev` sirve para iterar.
5. **Migraciones nuevas, nunca editar las aplicadas** en producción; las funciones de la 002 y la 003 se redefinen con `create or replace` en una migración nueva (data-model §6).
6. **Importes nunca como `number`** (FR-005; ADR-013 §4). **Ningún camino que atiende a una persona usa `service_role`** (FR-006). **El servidor recalcula toda cifra de dinero** (FR-090).
7. **Escrituras en el cliente** (FR-093–FR-095; [contracts/server-actions.md](contracts/server-actions.md)): `ok` / `rejected` / `unknown`, **15 s**, «Comprobar estado» con `write_status`, **nada en `localStorage`, `sessionStorage` ni IndexedDB**, y **un solo «Deshacer» pendiente** con la máquina de la 003.
8. **Copy**: toda cadena visible y todo nombre accesible salen de `src/lib/copy/es.ts` (FR-100), con las palabras prohibidas del glosario §9. La redacción final la aprueban los fundadores en cada PR.
9. **Los elementos propuestos se construyen tal como se aprobaron** (decisiones 22.2–22.4; maestro §15.9); la aprobación final es en pantalla, en el PR que los construye.
10. **Toda `update` en una función que escribe comprueba `row_count`**, y cada función tiene una prueba con una política rota a propósito (research R1 de la 003).
11. **Cada archivo a11y respeta `A11Y_JOB` y los dos niveles de la decisión 21**: nivel ligero (cada pantalla y estado una vez, 390 px, dos temas) en el PR; barrido completo con `@sweep`, fuera de la pasada del PR.
12. **Ninguna espera fija**; `reducedMotion: 'reduce'` por defecto; `retries` 0/1; solo Chromium (ADR-011 §6).
13. **Ninguna afirmación sin salida real** (`AGENTS.md` 12 y 18). Un `[V]` se cierra pegando su salida en `specs/004-presupuestos-y-metas/evidence.md`.
14. **Producción**: las migraciones las aplica el **gestor**, desde un worktree desechable, con el «sí» de un fundador antes de cada paso de escritura; si ya hay datos reales, primero la copia de la decisión 19.3.

## Interpretaciones de ejecución

No son decisiones: son lecturas necesarias para ejecutar donde el plan no fija el detalle. Si el revisor las objeta, se cambian sin tocar el alcance.

| # | Dónde | Lectura | Por qué |
| --- | --- | --- | --- |
| I1 | T024 | El plan nombra **dos** puntos de control de CI en el PR A (tras las tablas y tras `goal_funding`). Se **juntan en uno**, después de las cuatro migraciones y antes de la interfaz del dominio en `src/lib/db/`. Se conserva uno porque el job `db` comprueba lo que `juntia-dev` no puede: `db:types:check`, el ensayo de restauración, los controles negativos de §9.6 y el Supabase limpio del runner (la propiedad de las funciones de extensiones, F40-2, ya difirió entre los dos). Fallar ahí a mitad de PR es más barato que fallar en el gate final, que también es un run completo | Regla del gestor (mínimo de CI); `docs/TESTING.md` §2 |
| I2 | T039, T056 | El plan pide en los PR B y C un `gh workflow run` «al nacer la spec» para medir el job `e2e`. **No se lanza**: la medición se hace con la pasada `ready_for_review` (el gate), que ya corre el job completo. Si supera 480 s, el PR no se fusiona y se aplica la mitigación de [contracts/ci.md](contracts/ci.md) en orden (a → b → c) | Regla del gestor: ninguna pasada manual fuera del PR A |
| I3 | T020 | La generalización del paginador (F64-4) va en el PR A, con las listas nuevas, y mantiene las llamadas de la 002 y la 003 sin cambios de comportamiento | contracts/server-actions.md §5 |
| I4 | T076 | La exportación cambia de **contenido** en el PR A (servidor, FR-080 y FR-081) y en el PR E solo se comprueba que la descarga de la spec 1 sigue y se aprueba el texto de «qué incluye» de la hoja de Exportar | plan, PR A y PR E |
| I5 | T011 | El arreglo de la prueba intermitente de la 003 va en el PR A por encargo del gestor (primer PR de código posterior); no cambia comportamiento | Nota del gestor; run 42392865487 del PR #58 |

---

## Phase 0: Prerrequisitos

- [ ] T001 **Humana (gestor)**: antes del PR A, comprobar que `main` contiene el plan (`94d0fae`) y este archivo mergeados, que el `.env.test` del clon principal apunta a `juntia-dev` sin ninguna clave de producción, que `psql` 17 está disponible y que `juntia-dev` está libre (`npm run dev:unlock` no enseña dueño)
  - Cumple: decisión 18; reglas 2 y 3.
  - Prueba / terminado cuando: `npm run db:dev:reset` funciona contra `juntia-dev` (salida sin claves en `evidence.md`).

---

## Phase 1: PR A · Base de datos, seguridad y dominio

**Purpose**: las cuatro migraciones nuevas, el dominio, el dataset dorado de P0-3, `src/lib/db/`, los errores `JT201`–`JT226`, los tipos generados, pgTAP, integración, la siembra, la medición de workers y el arreglo de una prueba intermitente. **Sin pantallas** (plan, PR A). Corren las specs E2E 1, 2 y 3.

**Orden obligatorio** (plan, PR A): `budgets` y `goals_tables` → `goal_functions` → `goal_funding` → punto de control único (I1) → `src/lib/db/` y siembra.

### Grupo 1A — dominio, errores y glosario (tests primero; T002–T006 `[P]`; T007 después de T002–T006)

- [ ] T002 [P] [US2] Test de **dominio** en `src/domain/budgets/budgets.test.ts` y después `src/domain/budgets/index.ts`: `budgetState` (dentro, cerca ≥ 85 %, excedido, con comparación exacta en unidades menores), `displayedPercent` truncado y `limitInForce(versions, month)`
  - Casos: 640.000/900.000 → 71 %; 240.000/260.000 → 92 % cerca; 360.000/340.000 → excedido por 20.000; 1.180.000/1.000.000 → 118 %; consumo igual al límite → «Quedan $0» sin excedido; **consumo 0 con presupuesto activo → «dentro», 0 %**, distinto de `null`; 99,6 % nunca se muestra como 100 %; vigencia: octubre 900.000, noviembre 1.000.000, diciembre desactivado → `null`, septiembre sin versión → `null`.
  - Cumple: FR-013, FR-015, FR-016; FR-110; US-2 escenarios 4 y 5; decisión 22.7.
  - Itera: `npm run test:unit -- --changed`.
  - Prueba / terminado cuando: el test se vio fallar y pasa.

- [ ] T003 [P] [US4] [US5] [US6] Test de **dominio** en `src/domain/goals/goals.test.ts` y después `src/domain/goals/index.ts`: `memberAvailable`, `goalBalance`, `progress` (truncado), `proposeFunding` (proporcional a lo disponible, mayor residuo, pesos enteros, ADR-002) y `goalPace` (Q9)
  - Casos: propiedades (saldo ≥ 0 por aportante; asignaciones que suman el uso); Japón 11.340.000/18.000.000 → 63 %; 9.720.000 → 54 %; 8.340.000 → 46 %; vista previa 11.840.000 → **65 %**; faltan 6.660.000 en 6 meses → 1.110.000; meta sin fecha o vencida → sin ritmo; anulados no cuentan.
  - Cumple: FR-034, FR-037, FR-051; FR-110; decisiones 22.9 y 22.16.
  - Itera / prueba: como T002.

- [ ] T004 [P] Test de **dominio** en `src/domain/metrics/metrics.test.ts` y después `src/domain/metrics/index.ts`: `gasto_consumo`, `aporte_a_metas`, `retiro_de_metas`, `gasto_financiado_con_meta` y `total_destinado_neto`, con `NotAvailable` distinto de `0`
  - Casos: `test.each` con **las siete filas** de la tabla de DEC-G04 (spec, dataset parte C); sin `Math.max` (−200.000 y −120.000 válidos); propiedad «las vistas concilian sin sumarse» (Sara −120.000 + Tomás +120.000 = Nosotros 0); financiado solo con usos aplicados y en el mes del gasto (decisión 22.18).
  - Cumple: FR-060, FR-061, FR-062; FR-110; SC-003; ADR-011 fila 1.
  - Itera / prueba: como T002.

- [ ] T005 [P] [US3] Test de **dominio** en `src/domain/analysis/analysis.test.ts` y después `src/domain/analysis/index.ts`: `monthComparison(current, previous)` (decisión 22.10)
  - Casos: mes anterior sin gastos → sin comparación; con gastos → diferencia en pesos, porcentaje entero y hasta dos categorías con mayor aumento; nunca un gasto concreto.
  - Cumple: FR-023; FR-110.
  - Itera / prueba: como T002.

- [ ] T006 [P] Fixture del dataset dorado de P0-3 en `src/domain/golden/` (archivo nuevo junto a `october-2026.ts`, sin tocar sus filas): parte A (Japón con sus 21 aportes, **las fechas de la pareja** —invitación 30 nov 2025, activación y creación de Japón 1 dic 2025— y el primer aporte 27 dic 2025), parte B (presupuestos de Nosotros de octubre con su historia), parte C (siete filas) y parte D (Bicicleta creada el 1 ago 2026; tiquetes en `ticketsPending`, `ticketsApproved`, `ticketsRejected`; US-04, US-18, US-19). Solo datos, **copiados**, no recalculados
  - Cumple: spec, «Dataset dorado de P0-3»; maestro §15.10, reglas 1, 2 y 4; decisión 22.19; F63-1.
  - Prueba / terminado cuando: `npm run typecheck` pasa y las filas coinciden con las tablas de la spec.

- [ ] T007 Test de **dominio** del dataset en `src/domain/golden/` (después de T002–T006): totales de la parte A (Sara 6.120.000 en 11 · Tomás 5.220.000 en 10; agosto 1.050.000, septiembre 1.000.000, octubre 900.000); presupuestos de la parte B; las siete filas con T004; los escenarios de la parte D con T003; y la **prueba cronológica**: invitación ≤ activación ≤ creación de cada meta compartida ≤ su primer aporte; creación de cada meta personal ≤ su primer aporte; ningún asiento de la parte A posterior al 31 de octubre; ningún gasto ni liquidación compartidos antes de octubre de 2026; y 429.900 / 229.900 / 2.840.000 de P0-2 sin cambios
  - Cumple: SC-004; FR-110; F63-1.
  - Prueba / terminado cuando: se vio fallar contra un fixture mal ordenado y pasa con el real.

- [ ] T008 [P] Ampliar `src/lib/db/errors.ts` y `src/lib/db/errors.test.ts` (proyecto `components`, como en la 002 y la 003) con `JT201`–`JT226`, sus errores de dominio y sus claves de `src/lib/copy/es.ts` según [contracts/errors.md](contracts/errors.md); `23505` sobre `budgets_one_per_key` y sobre el índice de una solicitud pendiente se traducen a `JT219` y `JT212`
  - Cumple: FR-006 (códigos y copy), FR-100.
  - Prueba / terminado cuando: cada código tiene su error y su clave; la redacción queda listada en el PR para los fundadores.

- [ ] T009 [P] Actualizar `docs/GLOSSARY.md` con `budget_versions`, `category_kind`, `goal_type`, los cuatro `kind` del ledger y `void`, `entry_kind`, `goal_usage_confirmations.status`, `goal_scope` frente a `context`, `goals_totals` y las vistas nuevas, citando la 004
  - Cumple: plan, PR A; `docs/GLOSSARY.md` §11.
  - Prueba / terminado cuando: cada identificador de negocio nuevo de [data-model.md](data-model.md) tiene su fila.

- [ ] T010 [P] Paginador generalizado (F64-4) en `src/lib/db/paginate.ts` y `src/lib/db/paginate.test.ts`: clave declarada por lista (una o dos columnas de orden y un id único al final), con `afterFilter` sobre esa clave; las llamadas de la 002 y la 003 siguen igual. Test primero: casos de la tabla de [contracts/server-actions.md](contracts/server-actions.md) §5 en el paginador puro
  - Cumple: FR-096; F64-4.
  - Itera: `npm run test:unit -- --changed` y los tests existentes de `paginate` y `export`.
  - Prueba / terminado cuando: las pruebas nuevas se vieron fallar y pasan, y las de la 002 y la 003 siguen verdes sin cambios.

- [ ] T011 [P] Arreglar la prueba intermitente `src/features/expenses/annotate-shared.test.tsx` › «Subhoja Reparto (2a) › Enter en el resumen abre la subhoja con el foco en …»: falló en el run 42392865487 del PR #58 porque el foco cayó en el contenedor de la hoja. Encontrar la causa (orden de efectos del foco al abrir la subhoja) y arreglarla en la prueba o en el componente, sin `waitForTimeout` ni reintentos
  - Cumple: interpretación I5; regla 12.
  - Itera: el test 30 veces seguidas (`vitest --project components -t "Subhoja Reparto" --repeat=30` o equivalente).
  - Prueba / terminado cuando: 30 de 30 en verde y la causa queda escrita en `evidence.md`.

### Grupo 1B — tablas y vistas (en serie; tests primero)

- [ ] T012 Tests **SQL/RLS (pgTAP)** antes de las migraciones: `supabase/tests/01_privileges.test.sql` (tablas, triggers y funciones nuevos; `execute` exacto; sin funciones de extensiones, F40-2), `03_views.test.sql` (las diez vistas; **ninguna vista de Nosotros con metas o presupuestos personales**; `goals_overview` sin `context` y con `goal_scope`), `05_direct_writes.test.sql` (escritura directa imposible en las seis tablas), `12a_budget_tables.test.sql` y `13a_goal_tables.test.sql` (la parte sin funciones: RLS con Sara, Tomás y una tercera cuenta; **solo inserción** para cualquier rol; **FK compuestas con columna discriminadora**: un `insert` directo como `juntia_writer` de un presupuesto de `income` y de una asignación sobre un aporte fallan, F64-2; **trigger de saldo** con `insert` directo de un retiro, una asignación y un `void` que anula un aporte por encima del disponible → `JT220`; **meta archivada**: aporte, retiro y anulación de un aporte rechazados con `JT202`, solo el `void` de un uso admitido; transiciones de la meta; un presupuesto por clave)
  - Cumple: FR-001, FR-002, FR-003; FR-111; SC-007; data-model §2–§5; F64-1, F64-2.
  - Itera: `npm run test:db:dev` (deben fallar: no hay migraciones).
  - Prueba / terminado cuando: fallan por la ausencia de los objetos, no por sintaxis.

- [ ] T013 Migración nueva `supabase/migrations/2026111x000100_budgets.sql`: `budgets` (con `category_kind` y la FK compuesta), `budget_versions`, triggers (solo inserción, pareja activa), RLS, vistas `budget_months` y `budget_history` (con el `id` de la versión y `lag()` particionado), y los cambios de `audit_events` e `idempotency_records` de data-model §2.7. Regenerar `src/lib/supabase/database.types.ts`
  - Cumple: FR-001, FR-003, FR-010, FR-013–FR-015; data-model §2.1, §2.2, §2.7; F64-2, F64-4.
  - Itera: `npm run db:dev:reset` y `npm run test:db:dev`.
  - Prueba / terminado cuando: la parte de presupuestos de T012 pasa en `juntia-dev`.

- [ ] T014 Migración nueva `supabase/migrations/2026111x000200_goals_tables.sql`: `savings_goals`, `goal_ledger_entries` (índice único `(id, kind)`), `goal_usage_allocations` (con `entry_kind` y la FK compuesta), `goal_usage_confirmations`, todos los triggers de data-model §3 (solo inserción, saldo con bloqueo de la meta incluido el `void` de un aporte, una meta por gasto, uso ≤ gasto, ningún uso vivo en gasto no activo, transiciones de la meta con la reactivación automática de F64-1), RLS con subconsultas en línea (research R6) y las vistas de metas (`goals_overview`, `goals_totals`, `goal_member_balances`, `goal_entries`, `goal_activity`, `usage_requests`, `expense_goal_funding`)
  - Cumple: FR-001–FR-004; FR-030, FR-034; FR-085, FR-086 (vistas); data-model §2.3–§2.6, §3, §5, §7; F64-1, F64-2, F64-3.
  - Itera / prueba: como T013, hasta que T012 pasa entero.

### Grupo 1C — funciones, `src/lib/db/` e integración (solo después de T014)

- [ ] T015 Tests **pgTAP** de funciones, antes de escribirlas: `supabase/tests/12_budgets.test.sql` y `13_goals.test.sql`. Cada función de [contracts/database.md](contracts/database.md) con éxito, rechazo con una tercera cuenta, repetición idempotente, misma clave con otra huella, cada validación y una política rota a propósito. Casos nombrados: aporte a nombre de otro; retiro ajeno (decisión 22.14); aprobar la propia solicitud; uso de fondos ajenos sin solicitud aprobada; archivar con saldo o con una pendiente (`JT214`); crear un presupuesto que ya existe (`JT219`); límite 0 (`JT221`); `transaction_goal_funded` con datos (verdadero con uso vivo, falso tras quitarlo); `reclassify_to_shared` con `JT116`; las cuatro funciones redefinidas contra gastos con y sin meta (anular quita el uso; editar por debajo de lo usado → `JT213`)
  - Cumple: FR-007, FR-011, FR-012, FR-040, FR-041, FR-054, FR-055, FR-057; FR-111; SC-009; §15.6.3 puntos 3 y 4.
  - Itera: `npm run test:db:dev` (deben fallar).

- [ ] T016 Tests de **integración** antes de las funciones, en `tests/integration/budgets.test.ts`, `goals.test.ts`, `goal-races.test.ts` y `metrics.test.ts`:
  - **Carreras de FR-112** con `raceUnderLock`, en los dos órdenes: aprobar contra cancelar, contra retirar, contra «Quitar el uso» y contra anular el gasto; dos usos; dos aprobaciones; editar contra desactivar presupuesto; dos creaciones de la misma clave; **dos anulaciones del mismo aporte, de dos aportes de la misma persona, y anular un aporte contra retirar**. Invariantes: «ningún uso vivo en un gasto no activo», disponible ≥ 0 por aportante, sin interbloqueos permanentes (research R3).
  - **Gasto con meta**: registro inicial atómico (un gasto, uso propio, solicitud; meta ≥ 0) y aprobación separada con revalidación; el escenario de los tiquetes en sus tres estados con el balance de la pareja igual (SC-005).
  - **F64-1**: aportar, gastar todo con la meta, archivarla y anular el gasto → la anulación se aplica, los fondos vuelven, la meta queda `active` con auditoría `reactivate` y el resultado trae `reactivated_goals`; lo mismo con «Quitar el uso» y con un gasto privado y su meta personal; **repetir la anulación con la misma clave no crea un segundo `void` ni una segunda auditoría**.
  - **Idempotencia y `write_status`** de cada escritura nueva (respuesta perdida, reintento, `not_found` con la clave de otra persona).
  - **Lecturas**: `metric_months` = funciones del dominio con el dataset; `budget_months` y `metric_months` no mezclan dos estados con escrituras concurrentes; **paginador** con más de 500 filas, fechas y `created_at` repetidos y escrituras entre páginas sobre `goal_entries`, `budget_history` y `usage_requests`; **completitud y no duplicar** de las metas en Yo (F64-3); importes de ida y vuelta con `9007199254740993`; exportación con lo nuevo, sin personales del otro ni duplicados.
  - Cumple: FR-052–FR-055, FR-057–FR-059, FR-063, FR-080, FR-081, FR-091, FR-092, FR-096, FR-097; FR-112; SC-005, SC-006, SC-008.
  - Itera: `npm run test:integration:dev` (deben fallar).

- [ ] T017 Migración nueva `supabase/migrations/2026111x000300_goal_functions.sql`: `create_budget`, `update_budget`, `create_goal`, `update_goal`, `complete_goal`, `archive_goal`, `contribute_to_goal`, `withdraw_from_goal`, `void_goal_entry`, con el orden global de bloqueos (research R3), el mes de vigencia fijado por el servidor, las ventanas de 60 s y `row_count`
  - Cumple: FR-011, FR-012, FR-031–FR-033, FR-040–FR-042, FR-091, FR-092; decisiones 22.7, 22.12–22.15.
  - Itera: `npm run test:db:dev` y `npm run test:integration:dev` hasta que su parte de T015 y T016 pasa.

- [ ] T018 Migración nueva `supabase/migrations/2026111x000400_goal_funding.sql`: `create_expense_with_goal`, `approve_usage_request`, `reject_usage_request`, `cancel_usage_request`, `remove_goal_usage` (falla con `JT012` sobre un gasto anulado), **la redefinición** de `void_shared_expense`, `void_transaction`, `update_shared_expense` y `update_transaction` (misma firma), el **cuerpo nuevo de `transaction_goal_funded`**, la reactivación automática de F64-1 y la vista `metric_months`
  - Cumple: FR-007, FR-050–FR-059 (servidor), FR-060–FR-063 (servidor); data-model §6; decisiones 22.16–22.18; F64-1.
  - Itera / prueba: hasta que T015 y T016 pasan enteros en `juntia-dev`.

- [ ] T019 `src/lib/db/`: `budgets.ts`, `goals.ts`, `goal-usage.ts` y `metrics.ts` (una función por operación y por lectura; `context` y `goal_scope` como en [contracts/database.md](contracts/database.md)), los tipos de transporte con importes como `string`, las acciones nuevas en `write-status.ts` y el reintento de `40P01`/`40001` con la misma clave
  - Cumple: FR-005, FR-006, FR-093 (servidor), FR-097; ADR-013 §6.4.
  - Itera: `npm run test:integration:dev` y `npm run verify`.
  - Prueba / terminado cuando: ningún campo de importe es `number` en los tipos generados de `public` (prueba existente ampliada).

- [ ] T020 Siembra de la parte P0-3 del dataset **por SQL** dentro de `seedCouple()` (`tests/e2e/fixtures.ts`, `tests/integration/support/`), una vez por worker, con la opción de dataset dorado como en la 003
  - Cumple: FR-117; `docs/TESTING.md` §5, reglas 1 y 2; interpretación I3.
  - Itera: `npm run test:integration:dev` (la prueba de `seed.test.ts` ampliada: dos workers no se ven las metas ni los presupuestos).
  - Prueba / terminado cuando: el aislamiento entre workers se cumple también para lo nuevo.

- [ ] T021 Iteración de cierre del grupo en `juntia-dev`: `npm run test:db:dev` y `npm run test:integration:dev` completos en verde, y las specs E2E 1, 2 y 3 con `npm run e2e:dev -- tests/e2e/<archivo>.e2e.ts` (las funciones redefinidas no rompen Anotar, Mover a Pareja ni el balance)
  - Prueba / terminado cuando: los tres comandos en verde, salida sin claves.

### Grupo 1D — medición de workers (después de T021)

- [ ] T022 Habilitar la medición (mitigación (a) de [contracts/ci.md](contracts/ci.md)): `playwright.config.ts` lee el número de workers y `fullyParallel` de una variable con el valor actual por defecto; `scripts/dev-target/` la reenvía en `e2e:dev` (sin abrir la lista blanca de argumentos de F55-1 más allá de esa variable), con su prueba en `tests/dev-target-guard.test.ts` o la de `e2e-plan`
  - Cumple: plan, PR A, «Medición de workers»; F64-6.
  - Prueba / terminado cuando: con la variable sin fijar, el comportamiento es exactamente el de hoy.

- [ ] T023 Medir contra `juntia-dev` con `npm run e2e:dev`: 1, 2 y 4 workers, con y sin `fullyParallel`, sobre las specs 1, 2 y 3 y su axe con sesión, con **las dos pasadas** de `@serial` (paralela con `--grep-invert @serial` y aparte con `--grep @serial` y 1 worker). Registrar en `evidence.md` una tabla con tiempo, fallos y la comprobación de que ningún worker ve datos de otro
  - Cumple: plan, PR A; contracts/ci.md, mitigación (a); F64-6.
  - Prueba / terminado cuando: la tabla está en la evidencia con su recomendación (combinación segura o «no es seguro, por …»).

### Grupo 1E — punto de control, evidencia y salida

- [ ] T024 **Punto de control único (CI)**, interpretación I1: lo lanza el **gestor** con `gh workflow run ci.yml --ref <rama>` sobre el commit de T018 (con T019–T021 hechos), una sola vez
  - Cumple: ADR-013 [V] 1–7 sobre lo nuevo; ADR-011 §9.8.
  - Prueba / terminado cuando: el job `db` está verde y su salida (pgTAP, integración, `db:types:check`) se pega en `evidence.md` con el número de run.

- [ ] T025 `specs/004-presupuestos-y-metas/evidence.md` con la sección «PR A»: salidas de T011, T021, T023 y T024, las `[V]` cerradas con su run, y las desviaciones si las hubo
  - Cumple: SC-013; regla 13.

- [ ] T026 `npm run e2e:dev` **completo una vez** y `npm run verify` justo antes del push final; PR en borrador con la descripción de `AGENTS.md` 15; revisión de ChatGPT con el PR en borrador
  - Prueba / terminado cuando: los dos comandos en verde con su salida en el PR.

- [ ] T027 **Humana (gestor)**: marcar el PR A como listo (la única pasada del gate), comprobar el job `db` y `e2e` verdes en el último commit, y pedir el merge a la dueña
  - Cumple: criterios de salida del PR A; regla 3.

- [ ] T028 **Humana (gestor, con el «sí» de un fundador antes de cada paso)**: aplicar las cuatro migraciones a producción desde un worktree desechable (dry-run, `migration list`, etiqueta), con la copia de la decisión 19.3 primero si ya hay datos reales
  - Cumple: regla 14; patrón de T029 de la 003.
  - Prueba / terminado cuando: `migration list` en producción coincide con `main`, salida en `evidence.md`.

---

## Phase 2: PR B · Plan y presupuestos

**Purpose**: Plan en Yo y Nosotros con BudgetIndicator, la hoja de presupuesto, el historial y el conflicto de versión; **nace la spec E2E 5**; el **selector de specs por área** y, si T023 lo permite, los workers del job `e2e` con las dos pasadas de `@serial`. Corren las specs existentes que diga el selector (en este PR, por tocar el workflow: 1, 2, 3 y 5, con la 4 anotada como «todavía no existe»).

### Grupo 2A — tests primero (`[P]` entre sí)

- [ ] T029 [P] [US1] [US2] Tests de **componentes** en `src/features/plan/`: BudgetIndicator (dentro, cerca, excedido con rayado e ícono, consumo 0 con «Quedan $X · 0 %», **sin presupuesto nunca dice 0 %**), la hoja (límite no válido, `unknown` con campos bloqueados y «Comprobar estado», conflicto «{nombre} cambió este presupuesto» con el valor vigente), el historial (autor, fecha, anterior y nuevo) y Plan sin presupuesto (sin «$0», «excedido», «te alcanza»)
  - Cumple: FR-015–FR-018, FR-020, FR-093, FR-100; FR-113; US-1 escenarios 1–5; US-2 escenarios 2, 6 y 7.

- [ ] T030 [P] [US2] **Spec E2E 5** `tests/e2e/budgets.e2e.ts`, en rojo contra `juntia-dev`: crear Restaurantes en Nosotros, editar con conflicto entre Sara y Tomás (dos `storageState`), desactivar y volver a «sin presupuesto»; HTML, RSC y prefetch de Plan en Nosotros sin presupuestos personales de ninguno
  - Cumple: FR-114 (spec 5); FR-085; US-2.
  - Itera: `npm run e2e:dev -- tests/e2e/budgets.e2e.ts`.

- [ ] T031 [P] **a11y** `tests/a11y/plan.a11y.ts`: nivel ligero (Plan en Yo y Nosotros, con y sin presupuesto, la hoja, el conflicto, el historial; 390 px, dos temas) y `@sweep` (siete anchos, 200 %, teclado, 44 px), en rojo
  - Cumple: FR-101, FR-102; FR-115.
  - Itera: `npm run e2e:dev -- tests/a11y/plan.a11y.ts`.

- [ ] T032 [P] Tests del **selector** de specs (prueba de `scripts/`, como la del guardia): las fixtures de [contracts/ci.md](contracts/ci.md) (PR B con y sin selector, C, D, E, exportación aislada, Anotar aislado, `src/components/`, solo documentación, sin clasificar, base ausente) y la regla de **specs que todavía no existen** (no se pasan; el resumen las anota)
  - Cumple: F64-5.

### Grupo 2B — implementación (en serie: comparten `es.ts` y el shell)

- [ ] T033 [US1] [US2] Plan en `src/app/(app)/plan/page.tsx` y `src/features/plan/`: resumen del mes, presupuestos con BudgetIndicator, categorías con gasto y sin presupuesto («$X · sin presupuesto · Crear»), texto de presupuestos opcionales, «Último cambio», lecturas de `budget_months` por `context` sin consultar nada personal en Nosotros
  - Cumple: FR-017, FR-018, FR-020, FR-085–FR-087; US-1, US-2.
  - Itera: componentes de T029 y `e2e:dev -- tests/e2e/budgets.e2e.ts`.

- [ ] T034 [US2] Hoja de presupuesto (crear, editar, desactivar) con la máquina de escritura de la 003: clave al abrir, 15 s, `unknown`, «Comprobar estado», nada en el navegador, un solo «Deshacer»; conflicto `JT011` y `JT219` con «Revisar»
  - Cumple: FR-011, FR-012, FR-093–FR-095, FR-098, FR-099.

- [ ] T035 Selector `scripts/e2e-select.mjs` con el mapa de áreas de [contracts/ci.md](contracts/ci.md) y su integración en el paso del job `e2e` que ejecuta `node scripts/ci.mjs run test:e2e:smoke` (archivos existentes seleccionados; resumen con qué corrió, por qué y qué specs previstas todavía no existen); `fetch-depth` suficiente para la base
  - Cumple: F64-5.
  - Prueba / terminado cuando: T032 pasa.

- [ ] T036 Si T023 lo dio por seguro: fijar en el job `e2e` la combinación medida, con la pasada paralela `--grep-invert @serial` y la pasada aparte `--grep @serial --workers 1` (mecanismo del job `evidence`). Si no, se registra el motivo y no se toca
  - Cumple: contracts/ci.md, mitigación (a); F64-6.

### Grupo 2C — salida

- [ ] T037 Iterar hasta verde T029–T032 en `juntia-dev`; después `npm run e2e:dev` **completo una vez** y `npm run verify` antes del push final
- [ ] T038 Capturas de 390 y 1440 px en los dos temas (Plan en Yo y Nosotros, con y sin presupuesto, hoja, conflicto, historial) y pasada de Impeccable; evidencia «PR B»
  - Cumple: SC-001; plan, paso fijo de B a E.

- [ ] T039 **Humana (gestor)**: lanzar el **barrido completo de accesibilidad** (`@sweep`, decisión 21.2) y marcar el PR listo (gate, que mide el job `e2e`, I2); si el job pasa de 480 s, no se fusiona y se aplica la mitigación en orden
  - Cumple: SC-002; FR-115, FR-116; decisión 19.5.

- [ ] T040 **Humana (gestor, laboratorio)**: CLS = 0 en la carga con Skeleton de Plan; reportado como laboratorio
  - Cumple: SC-010 (Plan); §15.7.

- [ ] T041 **Humana (fundadores)**: aprobar en pantalla Plan, BudgetIndicator, la hoja y el copy
  - Cumple: SC-001; regla 9.

---

## Phase 3: PR C · Metas, aportes, retiros y S5

**Purpose**: Metas en Yo y Nosotros, GoalStack, GoalCard con el fallback, la meta inmersiva con Goal Journey, crear, editar, lograr y archivar, aportes, retiros, anulaciones, historial, ritmo, Inicio y Actividad; **nace la spec E2E 4**. Corren las specs 1, 2, 3 y 4.

### Grupo 3A — tests primero (`[P]` entre sí)

- [ ] T042 [P] [US4] [US5] [US6] [US9] Tests de **componentes** en `src/features/goals/`, `src/features/home/` y `src/features/activity/`: GoalCard (fallback por `goal_type`, «Lo lograron» como sugerencia, excedente neutro), GoalStack (0, 1, 2, 3 y más; «Ver todas» siempre; lista para lector de pantalla), Registrar aporte (**sin «¿Quién aporta?»**, vista previa 11.840.000 · 65 %, modo y fecha nunca futura), Retirar (máximo, motivo), **la fila de retiro nunca se presenta como ingreso** (signo, ficha, etiqueta), historial (anulados marcados, filtros por persona), Metas en Yo separadas por `goal_scope` sin sumar compartidas en el total personal, el **deshacer único** con tres orígenes, Inicio con «Apartado para metas» aparte del héroe, y la inmersiva con movimiento reducido
  - Cumple: FR-032–FR-037, FR-040–FR-044, FR-070, FR-071, FR-076, FR-095, FR-100; FR-113; US-4, US-5, US-6, US-9.

- [ ] T043 [P] [US4] [US5] [US6] **Spec E2E 4** `tests/e2e/goals.e2e.ts`, en rojo: crear una meta compartida, aportar y comprobar que el número héroe de Inicio no cambia, retirar; HTML, RSC y prefetch de Metas en Nosotros sin metas personales
  - Cumple: FR-114 (spec 4); FR-085.
  - Itera: `npm run e2e:dev -- tests/e2e/goals.e2e.ts`.

- [ ] T044 [P] **a11y** `tests/a11y/goals.a11y.ts`: ligero (Metas vacío y con metas en Yo y Nosotros, inmersiva, hojas de meta, aporte, retiro, historial, error) y `@sweep`, en rojo
  - Cumple: FR-101, FR-102; FR-115.

### Grupo 3B — implementación (en serie)

- [ ] T045 [US4] Metas en `src/app/(app)/metas/page.tsx` y `src/features/goals/`: una consulta de `goals_overview` y `goals_totals` por pantalla (Nosotros `shared`; Yo todas, separadas por `goal_scope`), GoalStack con pila y abanico desde lg (aprobado en su forma, decisión 22.2), GoalCard con el fallback y los siete `goal_type` (aprobados, decisión del plan 3), estados vacío y de error
  - Cumple: FR-035, FR-036; FR-085–FR-087; US-4.

- [ ] T046 [US4] Hojas de crear, editar, «Dar por lograda» y archivar meta, con la máquina de escritura (15 s, `unknown`, `write_status`, nada en el navegador)
  - Cumple: FR-030–FR-033, FR-093, FR-094.

- [ ] T047 [US5] [US6] Registrar aporte, Retirar, «Deshacer» de 6 s y «Anular aporte» desde el historial, con el deshacer único de la 003
  - Cumple: FR-040–FR-042, FR-095, FR-098.

- [ ] T048 [US5] Historial de una meta con filtros por persona, leído con el paginador generalizado
  - Cumple: FR-043, FR-096.

- [ ] T049 [US4] Meta inmersiva `src/app/(app)/metas/[id]/page.tsx` con Goal Journey: View Transitions con `view-transition-name` por meta y `layoutId` de respaldo, interrupción reversible, teclado y movimiento reducido; ritmo según la decisión 22.9; la cinta solo anima tras la confirmación del servidor
  - Cumple: FR-037, FR-075–FR-077; SC-011.

- [ ] T050 [US9] Inicio («Apartado para metas» aparte del héroe y el módulo de metas) y Actividad (asientos de metas con su ficha, «Gasto {mes} · Apartado» separado, filtro «Aportes»), leyendo `goal_activity` del mes y combinándola por el mismo orden total que las liquidaciones
  - Cumple: FR-044, FR-070, FR-071.

### Grupo 3C — salida

- [ ] T051 Iterar hasta verde T042–T044; `npm run e2e:dev` completo una vez y `npm run verify` antes del push final
- [ ] T052 **[V] View Transitions con App Router** (§15.6.2 punto 1): comprobar Goal Journey con y sin la API (respaldo `layoutId`) en Chromium y WebKit locales; el back-swipe en iPhone queda con los aplazados de la decisión 19.1. Salida en `evidence.md`
- [ ] T053 Capturas de 390 y 1440 px en los dos temas (Metas en Yo y Nosotros, pila y abanico, inmersiva, hojas, historial, Inicio, Actividad) y Impeccable; evidencia «PR C»
- [ ] T054 **Humana (gestor, laboratorio)**: **[V] rendimiento de GoalStack y del abanico** con 6 metas en gama media emulada (decisión 22.2); si falla, el PR cae a la lista y vuelve a los fundadores. Y CLS = 0 en la carga con Skeleton de Metas
  - Cumple: SC-010 (Metas); §15.6.2 punto 4.
- [ ] T055 **Humana (gestor)**: barrido completo de accesibilidad y marcar el PR listo (gate y medición del job `e2e`, I2)
  - Cumple: SC-002; FR-116.
- [ ] T056 **Humana (fundadores)**: aprobar en pantalla GoalStack, los tipos de meta, las personas con su patrón y la tinta junto al verde del ahorro
  - Cumple: SC-001; decisiones 22.2 y del plan 3.

---

## Phase 4: PR D · Gasto con meta y confirmaciones

**Purpose**: «Cómo se pagó» en Anotar, B1–B7, FundingLedger, la solicitud en las dos sesiones, «Quitar el uso», anular y editar un gasto con meta, la LimitNote de Mover a Pareja; **la spec E2E 4 crece**. Corren las specs 1, 2, 3 y 4.

### Grupo 4A — tests primero (`[P]` entre sí)

- [ ] T057 [P] [US7] [US8] Tests de **componentes** en `src/features/expenses/goal-funding/` y `src/features/expenses/annotate-sheet.tsx`: «Dinero del mes» por defecto (ruta mínima intacta), B1 **solo con metas del contexto** (en Nosotros ninguna personal, ni deshabilitada), FundingLedger (propuesta proporcional, topes, «Suman $X de $Y», Guardar bloqueado), B3 con «ahora» y «si aprueba», ConfirmationBadge en sus cinco estados («NO SE REGISTRÓ» solo con rechazo confirmado), la tarjeta pendiente con «No vence» y «Cancelar solicitud», «Uso quitado», la LimitNote de Mover a Pareja, la confirmación de eliminar que avisa del uso y el aviso de reactivación «La meta {nombre} volvió a estar activa: se devolvieron $X»
  - Cumple: FR-050–FR-053, FR-056, FR-057, FR-059, FR-072; FR-113; US-7, US-8; F64-1.

- [ ] T058 [P] [US7] **Spec E2E 4 (crece)** en `tests/e2e/goals.e2e.ts`, en rojo: el caso de la matriz «Financiación ajena → aprobar/rechazar» con **dos contextos autenticados** (Sara pide, Tomás aprueba en un caso y rechaza en otro; los estados se ven en las dos sesiones al navegar), y el **caso de privacidad de B1** (F63-3): Sara con metas personales, Tomás sin ellas, nada personal en el HTML, el RSC ni el prefetch de Anotar en Nosotros
  - Cumple: FR-114 (dos sesiones); FR-085; SC-009 (recorrido).

- [ ] T059 [P] **a11y** `tests/a11y/goal-expense.a11y.ts`: ligero (B1–B7, la tarjeta pendiente, la LimitNote) y `@sweep`, en rojo

### Grupo 4B — implementación (en serie)

- [ ] T060 [US7] «Cómo se pagó» en `src/features/expenses/annotate-sheet.tsx` y B1 en `goal-funding/`: lectura de `goals_overview` con `goal_scope = 'shared'` en Nosotros y `'personal'` en Yo, sin ninguna otra consulta de metas
  - Cumple: FR-050, FR-085.

- [ ] T061 [US7] FundingLedger y B3 en `goal-funding/`, con `proposeFunding` del dominio para mostrar y `create_expense_with_goal` para escribir (el servidor recalcula y valida)
  - Cumple: FR-051, FR-052, FR-058, FR-090.

- [ ] T062 [US7] B4–B7: la solicitud en Inicio, en la meta y en la fila del gasto; aprobar, rechazar y cancelar con versión esperada y la máquina de escritura; sin tiempo real (`visibilitychange` → `router.refresh()`)
  - Cumple: FR-053–FR-056, FR-092, FR-093.

- [ ] T063 [US8] «Quitar el uso de la meta», eliminar un gasto con meta (con el aviso en la confirmación) y la edición del importe por debajo de lo usado (`JT213` con su texto); el «Deshacer» de un gasto con meta; el aviso de reactivación de F64-1
  - Cumple: FR-057, FR-059, FR-095; F64-1.

- [ ] T064 [US8] Fila CON META con su uso en Actividad y en el detalle (`expense_goal_funding`), y la LimitNote «No se puede mover este gasto» en lugar de «Mover a Pareja»
  - Cumple: FR-071, FR-072; `JT116`.

### Grupo 4C — salida

- [ ] T065 Iterar hasta verde T057–T059; `npm run e2e:dev` completo una vez y `npm run verify` antes del push final
- [ ] T066 Capturas de 390 y 1440 px en los dos temas (B1–B7 en las dos sesiones, LimitNote, quitar el uso, reactivación) e Impeccable; evidencia «PR D»
- [ ] T067 **Humana (gestor, laboratorio)**: INP < 200 ms al abrir Anotar y al guardar un gasto con meta
  - Cumple: SC-010 (Anotar con meta); §15.7.
- [ ] T068 **Humana (gestor)**: barrido completo de accesibilidad y marcar el PR listo (gate)
- [ ] T069 **Humana (fundadores)**: aprobar en pantalla FundingLedger, ConfirmationBadge, B3 y el copy de la solicitud y de «Uso quitado»
  - Cumple: SC-001; decisión 22.3.

---

## Phase 5: PR E · Análisis, PlanningNote, exportación y cierre

**Purpose**: Análisis (S3) en `/plan/analisis`, PlanningNote, el acceso desde Plan e Inicio, la comprobación de la exportación; **la spec E2E 5 crece**; aceptación de P0-3. Corren las cinco specs (métricas: las dos áreas).

### Grupo 5A — tests primero (`[P]` entre sí)

- [ ] T070 [P] [US3] Tests de **componentes** en `src/features/analysis/`: los cuatro capítulos con el dataset (2.840.000; desglose; «$900.000 · Sara $500.000 · Tomás $400.000. Va aparte: no es gasto.»), comparación (sin mes anterior no hay «+X %»), Chart (nunca apila ahorro y gasto; tabla equivalente), **PlanningNote** (3.740.000; negativo con «Negativo: liberaron de metas más de lo que destinaron»; «Cómo se calcula» con `aria-expanded` y signos con texto; nunca «Total gastado» ni número héroe) y movimiento reducido
  - Cumple: FR-021–FR-025, FR-063; FR-113; US-3; SC-011.

- [ ] T071 [P] [US3] **Spec E2E 5 (crece)** en `tests/e2e/budgets.e2e.ts`, en rojo: Análisis con y sin presupuesto (con presupuesto muestra límite y desviación; sin presupuesto, ninguna barra fingida); HTML, RSC y prefetch de Análisis en Nosotros sin datos personales
  - Cumple: FR-114 (Análisis); FR-085.

- [ ] T072 [P] **a11y** `tests/a11y/analysis.a11y.ts`: ligero (Análisis en Yo y Nosotros, con y sin presupuesto, PlanningNote abierta) y `@sweep`, en rojo

### Grupo 5B — implementación (en serie)

- [ ] T073 [US3] Análisis en `src/app/(app)/plan/analisis/page.tsx` y `src/features/analysis/`: selector de mes, cuatro capítulos con `metric_months` y `budget_months`, S3 con la coreografía de MOTION_SYSTEM §5 y su fallback
  - Cumple: FR-021, FR-022, FR-024, FR-025, FR-063.
- [ ] T074 [US3] PlanningNote en el capítulo 4 (aprobada en su forma, decisión 22.4)
  - Cumple: FR-024, FR-063.
- [ ] T075 [US3] Acceso a Análisis desde Plan («Ver el análisis de {mes}») y desde «En qué se fue» de Inicio; comparación con `monthComparison`
  - Cumple: FR-021, FR-023; decisión 22.5.
- [ ] T076 Exportación: comprobar que el caso de descarga de la spec 1 sigue verde con el contenido nuevo (I4) y actualizar el texto de «qué incluye» de la hoja de Exportar
  - Cumple: FR-080, FR-081 (interfaz).

### Grupo 5C — salida del PR E

- [ ] T077 Iterar hasta verde T070–T072; `npm run e2e:dev` completo una vez y `npm run verify` antes del push final
- [ ] T078 Capturas de 390 y 1440 px en los dos temas (Análisis en Yo y Nosotros, con y sin presupuesto, PlanningNote) e Impeccable; evidencia «PR E»
- [ ] T079 **Humana (gestor, laboratorio)**: CLS = 0 en la carga con Skeleton de Análisis
  - Cumple: SC-010 (Análisis).
- [ ] T080 **Humana (gestor)**: marcar el PR listo (gate con las cinco specs; el job `e2e` por debajo de 480 s)
- [ ] T081 **Humana (fundadores)**: aprobar en pantalla Análisis y PlanningNote
  - Cumple: SC-001; decisión 22.4.

---

## Phase 6: Aceptación de P0-3 (dentro del PR E)

- [ ] T082 **Humana (gestor)**: **barrido completo de accesibilidad de cierre de P0-3** (decisión 21.2) y **las cinco specs E2E completas a mano** con «Run workflow» (no hay nocturno; [contracts/ci.md](contracts/ci.md)); salidas en `evidence.md`
  - Cumple: SC-002; FR-115.
- [ ] T083 Cerrar en `evidence.md` la tabla de [V] de abajo: cada `[V]` con su run o su salida, o «aplazada por decisión 19» cuando corresponda
  - Cumple: SC-013.
- [ ] T084 **Humana (fundadores)**: **salida interna** (SC-012): con sus cuentas reales, crear una meta individual y otra compartida, aportar cada uno, registrar un gasto con meta con una aprobación, crear un presupuesto, desactivarlo, comprobar que gastos y metas siguen y explicar sin ayuda la diferencia entre gasto y ahorro destinado (quickstart, §2–§7)
- [ ] T085 **Humana (gestor)**: con la salida interna aprobada, actualizar el estado de P0-3 en el maestro y en `AGENTS.md`/`CLAUDE.md` en un PR documental aparte (no en un PR de código)

---

## Verificaciones `[V]`: responsable y cierre

| `[V]` | Tarea | Responsable | Cierre |
| --- | --- | --- | --- |
| ADR-013 [V] 1, 2 y 7 sobre las tablas nuevas | T012–T014, T024 | CI (pgTAP) | Antes del merge del PR A |
| ADR-013 [V] 3–6 sobre las funciones nuevas | T015–T018, T024 | CI (pgTAP e integración) | Antes del merge del PR A |
| `goal_usage_confirmations`: bloqueo sin consentimiento y revalidación | T015, T016 (SQL); T058 (dos sesiones) | CI | PR A; recorrido, PR D |
| RLS de metas privadas y compartidas | T012, T015 | CI (pgTAP) | PR A |
| Registro inicial del gasto con meta (§15.6.3 punto 5) | T016, T018 | CI (integración) | PR A |
| Autorización posterior de fondos ajenos (punto 6) | T016, T018 | CI (integración) | PR A |
| Aprobar contra quitar el uso y contra anular el gasto | T016 | CI (integración) | PR A |
| Ediciones concurrentes de presupuesto (punto 7) | T016 (SQL); T029, T030 (aviso) | CI | PR A; pantalla, PR B |
| Idempotencia de las escrituras que mueven dinero (punto 2) | T015, T016; T034, T046, T047, T061–T063 | CI | Cada PR que añade la escritura |
| Las siete filas de DEC-G04 | T004, T016 | CI (dominio e integración) | PR A |
| `transaction_goal_funded` conectado | T015 (función); T057, T064 (pantalla) | CI | PR A; pantalla, PR D |
| Dataset dorado en orden cronológico | T007 | CI (dominio) | PR A |
| View Transitions con App Router | T052 | Implementador del PR C | PR C; back-swipe en iPhone, fundadores, antes de MVP-1 (decisión 19.1) |
| Rendimiento de GoalStack y del abanico | T054 | Gestor (laboratorio) | PR C |
| Luminancia del scrim de fotos | — | — | No aplica: fotos fuera de P0-3 (decisión 22.6) |
| Privacidad por ámbito | T030, T043, T058, T071 | CI (specs 4 y 5) | PR B a E |
| Umbrales de §15.7 | T040, T054, T067, T079 | Gestor (laboratorio) | PR B, C, D y E |
| Presupuesto del job `e2e` | T023 (medición), T039, T055, T068, T080 (gates) | CI | Cada gate de B a E |
| Barrido completo de accesibilidad | T039, T055, T068, T082 | Gestor | Cada PR con pantallas y cierre de P0-3 |
| Revisión visual de los elementos propuestos | T041, T056, T069, T081 | Fundadores | PR B a E |
| Salida interna | T084 | Fundadores | Antes de aceptar P0-3 |

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0** antes de todo.
- **PR A** (Phase 1) bloquea todo lo demás. Dentro: 1A en paralelo; 1B → 1C → 1D → 1E en serie.
- **PR B** (Phase 2) y **PR C** (Phase 3) después de A, en paralelo si hay dos worktrees; **un solo agente usa `juntia-dev` a la vez**: si los dos lo necesitan, se turnan por el lock.
- **PR D** (Phase 4) después de C (usa Metas y su spec 4).
- **PR E** (Phase 5 y 6) después de B, C y D.

### User Story Dependencies

- US-1, US-2 (presupuestos): PR A (servidor) y PR B.
- US-4, US-5, US-6, US-9 (metas): PR A y PR C.
- US-7, US-8 (gasto con meta): PR A, PR C y PR D.
- US-3 (Análisis): PR A, B, C y E.
- US-10 (seguridad): entera en el PR A.

### Dentro de cada fase

Tests primero y en rojo (regla 1) → migraciones o pantallas → iteración dirigida en `juntia-dev` → `e2e:dev` completo una vez → push → revisión de ChatGPT → gate.

### Parallel Opportunities

T002–T006, T008–T011 en el PR A; los grupos «tests primero» de cada PR; y los PR B y C entre sí, con el lock de `juntia-dev` como única restricción.

## Parallel Example: Grupo 1A

```bash
Task: "T002 Test de dominio de presupuestos en src/domain/budgets/budgets.test.ts"
Task: "T003 Test de dominio de metas en src/domain/goals/goals.test.ts"
Task: "T004 Test de dominio de las cinco métricas en src/domain/metrics/metrics.test.ts"
Task: "T005 Test de dominio de la comparación en src/domain/analysis/analysis.test.ts"
Task: "T006 Fixture del dataset dorado de P0-3 en src/domain/golden/"
```

## Implementation Strategy

### Cinco PR (decisión 22.1)

| PR | Fases | Tareas | Specs E2E que corre |
| --- | --- | --- | --- |
| A | 0 y 1 | T001–T028 | 1, 2, 3 |
| B | 2 | T029–T041 | Las que diga el selector: 1, 2, 3 y 5 (la 4 todavía no existe) |
| C | 3 | T042–T056 | 1, 2, 3, 4 |
| D | 4 | T057–T069 | 1, 2, 3, 4 |
| E | 5 y 6 | T070–T085 | 1–5 |

### CI por PR (mínimo)

Una pasada por PR, la de marcarlo listo, que lanza el gestor (regla 3). La única
excepción es el punto de control del PR A (T024, I1). Las cinco specs completas y el
barrido de cierre corren a mano al cerrar P0-3 (T082). No hay nocturno ni push a
`main` (decisión de los fundadores del 7 de noviembre de 2026).

### Qué no se hace en ningún punto

- No se editan migraciones aplicadas en producción.
- No se guardan intenciones de escritura en el almacenamiento del navegador.
- No se sube el tope del job `e2e` por una medición.
- No se suben fotos de metas (decisión 22.6).
- No se añaden disparadores `schedule` ni `push` al workflow.

## Notes

- Las tareas citan la spec por FR, SC y US, y el plan por PR y sección.
- Un commit por tarea o por grupo lógico; mensajes en inglés (`docs/CONVENTIONS.md` B.4).

---

## Anexo A — Auditoría de las tareas de test (ADR-012 §4)

| Tareas | Archivo | Capa | Qué cubre | Por qué esa capa |
| --- | --- | --- | --- | --- |
| T002–T007 | `src/domain/{budgets,goals,metrics,analysis,golden}/` | Dominio | Aritmética de presupuestos, saldos, métricas, comparación y dataset | Funciones puras (ADR-011 filas 1, 3, 7) |
| T008, T010 | `src/lib/db/errors.test.ts`, `paginate.test.ts` | Unidad | Traducción de errores y paginador | Lógica sin red |
| T011 | `annotate-shared.test.tsx` | Componentes | Foco al abrir la subhoja | Ya existía; se estabiliza |
| T012, T015 | `supabase/tests/*.test.sql` | SQL/RLS | Autorización, solo inserción, FK, triggers, cada función | «¿El ataque usa el botón?» No: RLS (ADR-011 fila 8) |
| T016 | `tests/integration/*.test.ts` | Integración | Carreras, atomicidad, idempotencia, lecturas, exportación, F64-1 | Dos escritores y la base real (filas 2, 12, 13) |
| T020, T022, T032 | `seed.test.ts`, prueba de `scripts/` | Integración / unidad | Aislamiento por worker, variable de workers, selector | Infraestructura de pruebas |
| T029, T042, T057, T070 | `src/features/**.test.tsx` | Componentes | «Se presenta»: signo, ficha, etiqueta, estados, PlanningNote | El dominio puede acertar y la fila pintar mal (fila 5) |
| T030, T043, T058, T071 | `tests/e2e/budgets.e2e.ts`, `goals.e2e.ts` | E2E (specs 5 y 4) | Recorridos, dos sesiones, HTML/RSC/prefetch | Lo que ninguna capa inferior ve (matriz de recorridos) |
| T031, T044, T059, T072 | `tests/a11y/*.a11y.ts` | Accesibilidad | axe ligero y `@sweep` | Fila 16 de ADR-011; decisión 21 |

No hay tests redundantes: lo que cubre la integración (saldos, versiones,
carreras) no se repite en E2E (contracts/ci.md, mitigación (b)).

---

## Anexo B — Cobertura y consistencia

Pasada hecha a mano en lugar de `speckit-analyze`: todo requisito y criterio tiene al
menos una tarea; ninguna tarea carece de respaldo; y la terminología coincide.

### B.1 Requisitos funcionales

| FR | Tareas |
| --- | --- |
| FR-001 | T012–T014 |
| FR-002 | T012, T014 |
| FR-003 | T012–T014 |
| FR-004 | T014, T016, T017 |
| FR-005 | T016, T019 |
| FR-006 | T008, T019; regla 6 |
| FR-007 | T015, T018, T064 |
| FR-010 | T013 |
| FR-011, FR-012 | T015–T017, T034 |
| FR-013 | T002, T013, T017 |
| FR-014 | T013, T016 |
| FR-015 | T002, T013, T029 |
| FR-016 | T002, T029 |
| FR-017, FR-018 | T029, T033 |
| FR-020 | T029, T033 |
| FR-021, FR-022 | T070, T073, T075 |
| FR-023 | T005, T075 |
| FR-024, FR-025 | T070, T073, T074 |
| FR-030, FR-031 | T014, T017, T046 |
| FR-032, FR-033 | T015, T017, T042, T046 |
| FR-034 | T003, T014, T042 |
| FR-035, FR-036 | T042, T045 |
| FR-037 | T003, T042, T049 |
| FR-040, FR-041 | T015, T017, T042, T047 |
| FR-042 | T016, T017, T047 |
| FR-043 | T042, T048 |
| FR-044 | T042, T050 |
| FR-050 | T057, T060 |
| FR-051 | T003, T057, T061 |
| FR-052, FR-053 | T016, T018, T057, T061, T062 |
| FR-054, FR-055 | T015, T016, T018, T062 |
| FR-056 | T057, T062 |
| FR-057 | T015, T016, T018, T057, T063 |
| FR-058 | T016, T018, T061 |
| FR-059 | T016, T018, T057, T063 |
| FR-060–FR-062 | T004, T016, T018 |
| FR-063 | T016, T018, T070, T073, T074 |
| FR-070, FR-071 | T042, T050, T064 |
| FR-072 | T057, T064 |
| FR-075–FR-077 | T042, T049, T052 |
| FR-080, FR-081 | T016, T076 |
| FR-085–FR-087 | T012, T030, T033, T043, T045, T058, T060, T071 |
| FR-090 | T061; regla 6 |
| FR-091, FR-092 | T015–T017, T062 |
| FR-093, FR-094 | T019, T029, T034, T046; regla 7 |
| FR-095 | T042, T047, T063 |
| FR-096 | T010, T016, T048 |
| FR-097 | T016, T019 |
| FR-098, FR-099 | T034, T047 |
| FR-100 | T008, T029; regla 8 |
| FR-101, FR-102 | T031, T044, T059, T072; T038, T053, T066, T078 |
| FR-103 | T045, T053 |
| FR-110 | T002–T005, T007 |
| FR-111 | T012, T015 |
| FR-112 | T016 |
| FR-113 | T029, T042, T057, T070 |
| FR-114 | T030, T043, T058, T071 |
| FR-115 | T031, T039, T044, T055, T068, T082 |
| FR-116 | T023, T039, T055, T068, T080 |
| FR-117 | T020 |

**Todos los FR tienen al menos una tarea.**

### B.2 Criterios de éxito

| SC | Tareas |
| --- | --- |
| SC-001 | T038, T041, T053, T056, T066, T069, T078, T081 |
| SC-002 | T039, T055, T068, T082 |
| SC-003 | T004, T016 |
| SC-004 | T006, T007, T016 |
| SC-005 | T016 |
| SC-006 | T003, T004 |
| SC-007 | T012, T030, T043, T058, T071 |
| SC-008 | T016 |
| SC-009 | T015, T058 |
| SC-010 | T040, T054, T067, T079 |
| SC-011 | T042, T049, T070 |
| SC-012 | T084 |
| SC-013 | T025, T083 |

**Todos los SC tienen al menos una tarea.**

### B.3 Tareas sin respaldo

Ninguna. Las que no citan un FR tienen su origen:

- T001: prerrequisito de la decisión 18.
- T009: glosario, que el plan pide en el PR A.
- T011: encargo del gestor (I5).
- T022, T023, T032, T035, T036: mitigación del presupuesto `e2e` y selector (contracts/ci.md; F64-5, F64-6).
- T024: punto de control único (I1).
- T028: migraciones a producción, regla 14.
- T085: cierre del slice.

### B.4 Terminología

Coinciden en spec, plan, data-model, contratos y tasks: `budget_versions`,
`category_kind`, `entry_kind`, `goal_scope` frente a `context`, `goals_totals`,
`metric_months`, `transaction_goal_funded`, `remove_goal_usage`, `JT201`–`JT226`,
`reactivated_goals`, `ticketsPending`/`ticketsApproved`/`ticketsRejected`, las cinco
métricas en español, y las specs E2E 4 «Meta con aportes y uso» y 5 «Presupuesto
activado/desactivado».

### B.5 Hallazgos

Ninguno exige cambiar la spec ni el plan. Tres observaciones, resueltas aquí:

1. **Los puntos de control de CI del plan** (dos en el PR A, uno en B y otro en C) se
   reducen a **uno**, en el PR A, por la regla del gestor; las mediciones de B y C se
   hacen con la pasada del gate (I1, I2).
2. **La generalización del paginador** (F64-4) no tenía PR fijado: va en el PR A (I3).
3. **El arreglo de la prueba intermitente** de la 003 no es requisito de la 004: va
   en el PR A por encargo del gestor (I5) y no cambia comportamiento.
