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
