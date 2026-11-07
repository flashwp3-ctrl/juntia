# Evidencia · 004 · PR A

## Precisión del gestor · T024

El gestor precisó en este chat: **T024 después de T019–T021 y antes de
T022–T023**. Manda el texto de T024 («con T019–T021 hechos»). I1 se lee
«antes de la interfaz de usuario», no antes de `src/lib/db/`. El punto de
control valida tipos y regresiones de Anotar, Mover a Pareja y Balance en un
solo run. Los cambios de workers de T022–T023 los valida el gate final.
El gestor lanza T024 cuando T021 esté en verde contra `juntia-dev`.

## Estado

Base: `3135ecb` (`main`, actualizado desde origin). Rama: `feat/004-a-database`.
T001 declarada hecha por el gestor. T027 y T028 son humanas.
Las salidas de `juntia-dev` son iteración, no cierre de verificaciones [V].
Ningún run de CI lanzado por el agente. Producción no se utiliza.

## Iteración local · grupo 1A

- T002–T005: `npm run test:unit -- src/domain/budgets/budgets.test.ts src/domain/goals/goals.test.ts src/domain/metrics/metrics.test.ts src/domain/analysis/analysis.test.ts`.
  Rojo: `Test Files 4 failed (4)`, módulos `./index` inexistentes. Después del código:
  `Test Files 4 passed (4); Tests 27 passed (27); Duration 607ms`.
- T007: `npm run test:unit -- src/domain/golden/planning-2026.test.ts`.
  Control negativo: creación de Japón alterada a 2026-01-01; `1 failed | 9 passed`;
  falla `cronología ... expected false to be true`. Restaurada la fecha aprobada
  2025-12-01: `10 passed (10); Duration 452ms`.
- T008/T010: `npm run test:components -- src/lib/db/errors.test.ts src/lib/db/paginate.test.ts`.
  Rojo: `31 failed | 50 passed` (26 códigos, dos índices, tres claves nuevas).
  Después del código: `81 passed (81); Duration 599ms`.
- T011, base: 30 procesos independientes con
  `node node_modules/vitest/vitest.mjs run --project components src/features/expenses/annotate-shared.test.tsx -t 'Subhoja.*Enter'`.
  Salida: `baseline failures: 0/30`. No se reprodujo el fallo de CI.
  Causa identificada: el heading aparece al montar la vista; `openSplit` enfoca
  con `requestAnimationFrame`, después. El test comprobaba el foco al aparecer
  el heading, antes de que necesariamente corriera ese frame. Se conserva el
  componente y se espera la condición de foco con `waitFor`, sin espera fija
  ni reintentos del test. Repetición posterior: `T011 failures: 0/30` (30/30).
- Dominio completo: `npm run test:unit` → `12 passed (12); 78 passed (78); Duration 971ms`.
- T012 rojo completo: `npm run test:db:dev` → guardia `itfrhnadovezpahikuol`,
  reinicio correcto (`7 migraciones; esquema tests: true`), fallo esperado de `01`,
  `05`, `12a` y `13a`: `relation juntia_data.budgets does not exist` / `savings_goals
  does not exist`; `has_table` falla en las seis tablas. Total `89.90 s`.
  Las pruebas nuevas no fallaron por sintaxis. Lock liberado por el runner.

## Iteración de tablas · T013–T014

- Se crearon los archivos con la CLI fijada (`supabase@2.121.0 migration new`),
  sin editar las siete migraciones previas.
- Presupuestos: `12a_budget_tables.test.sql` → `pasó (13)` en `juntia-dev`.
- Primera pasada de ambas tablas: `01_privileges` → `pasó (442)`,
  `05_direct_writes` → `pasó (84)`, y las suites previas pasan.
  `13a` detectó correctamente un fallo de reactivación: la comparación de `xmin`
  con el xid superior no reconocía el subxid de `lives_ok` (savepoint). También
  detectó el acceso a un campo de `NEW` de la otra tabla del trigger diferido.
  Se corrigieron ambos; pasada posterior: **salida 0**, `106.05 s` en dev.
  `12a_budget_tables` → `pasó (13)` y `13a_goal_tables` → `pasó (24)`.
  Todas las suites SQL previas pasan. Esta salida no cierra [V] de CI.
- Lint: 0 errores, 1 aviso preexistente en `balance-panel.tsx:61`.
- Typecheck: salida 0 antes de las migraciones (solo SQL después).

## T015–T016 · en curso, sin implementación de funciones

- PgTAP de funciones, primera pasada en rojo: `npm run test:db:dev`,
  total `113.87 s`; `create_budget`, `update_budget` y las funciones de metas
  no existen (`42883`). Las suites de tablas y las anteriores siguen pasando.
  Después se añadieron más casos de financiación: todavía no ejecutados.
- Integración nueva escrita en `budgets.test.ts`, `goals.test.ts`,
  `goal-races.test.ts`, `metrics.test.ts`, con soporte de preparación SQL.
  Primera pasada finalizada, salida 1: `24 failed | 55 passed | 16 skipped (95)`;
  `6 failed | 10 passed | 1 skipped (17)` archivos; `131.91 s` Vitest,
  `132.76 s` total del runner. Los RPC nuevos y `metric_months` no existen
  (`PGRST202` / `PGRST205`); las carreras sin RPC no llegan a la barrera.
  También fallan cuatro regresiones de movimientos privados con `forbidden` y
  el `beforeAll` de exportación (sus siete casos no llegaron a ejecutarse).
  Esos siete no se confunden con las nueve omisiones previstas de correo/40P01.
  Las redefiniciones de T018 siguen pendientes; no se declara el código listo.
- No existen todavía `goal_functions` ni `goal_funding`; no se ha implementado
  T017–T018 ni las capas siguientes.

## Discrepancia pendiente de precisión humana · DEC-G04

El plan, PR A, orden obligatorio 3, pide «las siete filas de DEC-G04 en dominio y
en `metric_months`». Pero `docs/TESTING.md` §6 define «Octubre · Yo, Tomás» como
«No disponible» porque la fixture no define sus gastos privados, y prohíbe
interpretarlo como cero. La vista autenticada como Tomás conoce los registros
persistidos de Tomás; el esquema no define una marca de datos incompletos.
No se añade esa marca ni se fabrica un `null` en SQL.

Se pidió precisión al gestor: siete filas en dominio; las seis con importes
definidos en integración SQL; y el caso «No disponible» en dominio más las
pruebas de privacidad/RLS. Pendiente de respuesta. Detención según la regla 6
del encargo. La ejecución en curso termina normalmente para liberar su lock.

## Mapa parcial de tareas y commits

| Tarea | Commit | Prueba / estado |
| --- | --- | --- |
| T002–T007 | `e7bdb31` | Dominio 78/78; rojo previo y control cronológico registrados arriba |
| T008–T010 | `e7bdb31` | Errores/paginador 81/81; glosario incorporado; transportes posteriores pendientes |
| T011 | `e7bdb31` | 30/30 tras esperar la condición de foco |
| T012–T014 | `247aa63` | pgTAP completo verde en dev; tipos generados pendientes, con T019 según precisión de T024 |
| T015–T016 | Trabajo en curso | Pruebas en rojo; cobertura aún en construcción, no se declaran terminadas |
| T017–T023 | Pendiente | Sin implementación de funciones ni capas posteriores |
| T024 | Gestor | No listo: T021 no está verde |
| T027–T028 | Gestor | No ejecutadas; sin operaciones en producción |
