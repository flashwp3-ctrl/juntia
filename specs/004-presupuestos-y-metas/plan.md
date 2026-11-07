# Implementation Plan: 004 · Presupuestos opcionales y metas (P0-3)

**Branch**: `docs/spec-004-plan` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5) | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-presupuestos-y-metas/spec.md`, mergeada en `main` por el PR #63 (`f8285d8`), con la decisión 22 (22.1–22.19) y las precisiones de la revisión del PR #63 (F63-1 a F63-5).

**Status**: Draft — fase Plan. No avanza a Tasks sin el merge de su PR documental (ADR-012 §3.1). Este archivo no contiene `tasks.md`.

> **Qué es este documento.** Dice **cómo** se construye lo que la spec ya fijó.
> No amplía el alcance ni decide nada que no sea local y reversible. Lo que es una
> **decisión del plan** se marca así para que el revisor la pueda objetar; lo que
> no es local ni reversible está en «Para los fundadores», al final. En este
> archivo, `[P]` significa **propuesta** y `[V]` **verificación pendiente**
> (maestro §15.9).

## Summary

P0-3 añade la planificación: presupuestos mensuales opcionales por categoría en Yo y
Nosotros, metas personales y compartidas con un ledger de aportes, retiros y usos, el
gasto pagado con una meta con la aprobación de los fondos del otro, las cinco
métricas de DEC-G04, Plan, Análisis (S3) y Metas con S5. Se entrega en **cinco PR
(A–E)** (decisión 22.1).

Enfoque técnico, con lo verificado contra `juntia-dev` en [research.md](research.md):

- **ADR-013 tal cual.** Las seis tablas nuevas son tablas controladas; escriben
  funciones `security definer` de `juntia_writer`; se lee por vistas
  `security_invoker` de una sola sentencia. La spike mostró que una lectura con
  parámetro no puede ser una función invoker, y que una política no puede llamar a
  una auxiliar invoker que lea `juntia_data` (R6): se aplica ADR-013 al pie de la letra.
- **Ledger de solo inserción**: las anulaciones son asientos `void`, y un trigger
  rechaza `update` y `delete` para cualquier rol (R1).
- **Saldo ≥ 0 por aportante con el bloqueo de la meta**, más un trigger `before
  insert` que toma el mismo bloqueo. La prueba mostró que un trigger diferido **no**
  basta: dejó a un aportante en −40.000 (R2).
- **Orden global de bloqueos**: persona → grupo → presupuesto **o** movimiento → meta →
  solicitud. Las carreras de FR-112, en los dos órdenes y sin barrera, terminan sin
  interbloqueo y sin usos vivos en gastos anulados (R3).
- **Presupuestos como identidad + historial** (`budgets` + `budget_versions`): el límite
  que rige en un mes sale de la última versión vigente; desactivar es una versión con
  `null` (R4, R7).
- **Cuatro funciones de la 002 y la 003 se redefinen** en una migración nueva (anular y
  editar gasto, privado y compartido) para quitar el uso o rechazar el cambio, y
  `transaction_goal_funded` deja de devolver `false` (data-model §6).
- **Dos specs E2E**, la 5 en el PR B y la 4 en el PR C, con el job `e2e` por debajo de
  480 s (R9).
- **Sin dependencias nuevas.**

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`) sobre Node 24 LTS; SQL y PL/pgSQL sobre PostgreSQL 17.

**Primary Dependencies**: las de la 003, sin cambios: Next 16.4.4, React 19.3.1, Motion 14.9.0, Phosphor 2.1.10, Radix Dialog 1.3.1, Tailwind 4.3.4, `@supabase/supabase-js` 2.118.0, `@supabase/ssr` 0.12.7, Supabase CLI 2.121.0.

**Storage**: Supabase PostgreSQL. Producción en el proyecto Free de la segunda fundadora; `juntia-dev` para iterar (decisión 18); Supabase local en el runner para el gate. Navegador: las cookies `juntia_theme` y `juntia_context` y `localStorage["juntia:context"]` de antes. **Nada nuevo en el almacenamiento del navegador** (FR-094).

**Testing**: Vitest (`domain`, `components`, `integration`), pgTAP con `supabase test db`, Playwright + axe en Chromium.

**Target Platform**: navegadores modernos, móvil y escritorio; Vercel Hobby (decisión 13).

**Project Type**: aplicación web, monolito modular Next.js.

**Performance Goals**: maestro §15.7. CLS = 0 en las cargas con Skeleton de Plan, Análisis y Metas; INP < 200 ms al abrir Anotar y al guardar un gasto con meta (laboratorio).

**Constraints**: sin Docker en los equipos; importes nunca como `number`; ningún camino de persona usa `service_role`; nada personal en el HTML, el RSC ni el prefetch de Nosotros; 360–1440 px sin scroll horizontal; 44 px; movimiento reducido; texto al 200 %; copy en `src/lib/copy/es.ts`; job `e2e` < 480 s bloqueante; **migraciones nuevas, nunca editar las ya aplicadas en producción**.

**Scale/Scope**: 2 personas y una pareja. 4 migraciones nuevas; 6 tablas; 14 funciones de escritura; 4 de la 002 y la 003 redefinidas más `transaction_goal_funded`; 10 vistas; rutas `/plan`, `/plan/analisis`, `/metas`, `/metas/[id]`; Inicio, Actividad y Anotar ampliados.

## Constitution Check — comprobación de jerarquía

*GATE: debe pasar antes de la investigación de la Fase 0 y se repite después del
diseño de la Fase 1.* La constitución es un puntero (ADR-012 §3.4): esta sección
comprueba la jerarquía de `AGENTS.md` §2.

**Fuentes leídas antes de rellenarla:** `AGENTS.md`, `CLAUDE.md`, el maestro (§2, §5,
§7, §10, §11 P0-3, §12.2 y §15 con las decisiones 1–22 y «Dataset dorado»), ADR-001,
ADR-002, ADR-004, ADR-007, ADR-010, ADR-011, ADR-012 y ADR-013, `docs/TESTING.md`,
`docs/CONVENTIONS.md`, `docs/GLOSSARY.md`, `docs/design/HANDOFF_CLAUDE_CODE.md`,
`COMPONENT_SPECIFICATIONS.md`, `MOTION_SYSTEM.md` §4 y §5,
`RESPONSIVE_SPECIFICATIONS.md`, los comps 04·2, 04·3, 04·4, 04·6, 04·7, 04·11–04·13 y
05·7–05·8, la spec 004, el plan, el data-model, los contratos y la evidencia de la 003,
las siete migraciones de `main` y el código de `src/` afectado.

### Propuestas `[P]` que toca el slice

| Elemento `[P]` | ¿Afecta al alcance? | ¿Requiere aprobación antes de implementar? | Resolución (quién, cuándo, dónde) | ¿Bloquea el plan? |
| --- | --- | --- | --- | --- |
| GoalStack | Sí — P0-3 | Sí | **Aprobado en su forma**, decisión 22.2, con la caída a lista si falla el rendimiento; en pantalla, en el PR C | No |
| FundingLedger | Sí — P0-3 | Sí | **Aprobado en su forma**, decisión 22.3; en pantalla, en el PR D | No |
| ConfirmationBadge y solicitud pendiente | Sí — P0-3 | Sí | **Aprobado en su forma**, decisión 22.3; en pantalla, en el PR D | No |
| ChangePreview en B3 | Sí — P0-3 | Sí | **Aprobado en su forma**, decisión 22.3; en pantalla, en el PR D | No |
| PlanningNote | Sí — P0-3 | Sí | **Aprobada en su forma**, solo en Análisis, decisión 22.4; en pantalla, en el PR E | No |
| Personas + patrón | No | Sí | `person.1–2` en cintas y desgloses; en pantalla, en los PR C y D | No |
| Gasto, ingreso y liquidación en tinta | No | Sí | Junto a aportes, retiros y usos; en pantalla, en el PR C | No |
| Texto ampliado hasta 200 % | No | No — requisito obligatorio | Se aplica y se prueba | No |

### Verificaciones `[V]` que toca el slice

| Elemento `[V]` | Tipo | Salida real | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| Ledger de solo inserción con anulaciones (FR-002) | Decide cómo se construye | **Hecha** contra `juntia-dev`: research R1 | No |
| Saldo ≥ 0 por aportante bajo concurrencia | Decide cómo se construye | **Hecha**: research R2, con control negativo | No |
| Orden global de bloqueos y carreras de FR-112 | Decide cómo se construye | **Hecha**: research R3, en los dos órdenes y sin barrera | No |
| Vigencia mensual del presupuesto (Q7) | Decide cómo se construye | **Hecha**: research R4 | No |
| Lectura consistente de métricas y saldos | Decide cómo se construye | **Hecha**: research R5 y R6 | No |
| Todas las de «Comprueban lo construido» del inventario de la spec | Comprueba lo construido | Pendiente; responsable y cierre en la spec y en cada PR de abajo | No |

### ADR que necesita el slice

| ADR | Qué decide para este slice | Estado | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| ADR-001 punto 7 | Mover a Pareja bloqueado por un uso de meta | Aceptado | No |
| ADR-002 + nota 20.8 | Pesos enteros y mayor residuo (propuesta de FundingLedger) | Aceptado | No |
| ADR-004 + nota 22.7 | Presupuestos opcionales, no aditivos, con vigencia mensual | Aceptado | No |
| ADR-007 | Correcciones auditadas; nada se edita ni se borra | Aceptado | No |
| ADR-010 + notas 22.13 y 22.17 | Ledger, anulación de aportes y reversión del uso | Aceptado | No |
| ADR-011, ADR-012, ADR-013 | Pruebas y CI, flujo de especificación, acceso a datos | Aceptados | No |
| **ADR-014** (fotos de metas) | Fuera de P0-3 (decisión 22.6); antes de P0-4 | No existe; no lo necesita este slice | No |

**Ninguna decisión del plan es nueva y significativa**: las de research (R1 asientos
`void`, R2 trigger que bloquea, R3 orden de bloqueos, R4/R7 historial de presupuestos,
R8 ventanas de 60 s, R9 siembra) son locales y reversibles antes de tener datos, y R6
es la aplicación literal de ADR-013. Ninguna necesita ADR.

### Erratas que afectan al slice

Ninguna pendiente (`docs/design/README.md`).

### Conflictos entre documentos superiores

Los resolvió la spec (lecturas 1 a 12) y la decisión 22: el selector «¿Quién aporta?»
no se construye, el aporte de 04·7 es a Japón, el texto «en la cuenta de Sara» se
sustituye, y B1 en Nosotros no consulta ni pinta metas personales. Ninguno queda
abierto.

**Resultado del gate**: **PASA.**

## Project Structure

### Documentation (this feature)

```text
specs/004-presupuestos-y-metas/
├── spec.md              # Specify + Clarify (PR #63)
├── plan.md              # Este archivo
├── research.md          # Fase 0: spike contra juntia-dev y decisiones
├── data-model.md        # Fase 1: esquema y tipos
├── quickstart.md        # Fase 1: comprobación manual
├── contracts/
│   ├── database.md      # Vistas y funciones de public
│   ├── errors.md        # JT201–JT226
│   ├── server-actions.md# Resultado de escritura, almacenamiento, deshacer, contexto, lecturas
│   └── ci.md            # Jobs, specs 4 y 5, presupuesto e2e y barrido
└── tasks.md             # Fase 2, en su propio PR
```

### Source Code (repository root)

```text
supabase/
├── migrations/                                    # NUEVAS; ninguna existente se edita
│   ├── 2026111x000100_budgets.sql                 # PR A · punto de control 1
│   ├── 2026111x000200_goals_tables.sql            # PR A · punto de control 1
│   ├── 2026111x000300_goal_functions.sql          # PR A
│   └── 2026111x000400_goal_funding.sql            # PR A · punto de control 2: gasto con meta, solicitudes, redefinición de la 002/003, métricas
├── seed.sql                                       # + parte P0-3 del dataset para la siembra
└── tests/
    ├── 01_privileges.test.sql   # + tablas, funciones y triggers nuevos
    ├── 03_views.test.sql        # + vistas nuevas; ninguna personal en Nosotros
    ├── 05_direct_writes.test.sql# + tablas nuevas
    ├── 12_budgets.test.sql      # nuevo
    └── 13_goals.test.sql        # nuevo
src/
├── domain/
│   ├── budgets/  goals/  metrics/  analysis/   # nuevos (data-model §8)
│   └── golden/                                  # + partes A–D de P0-3 y prueba cronológica
├── lib/
│   ├── db/            # budgets.ts, goals.ts, goal-usage.ts, metrics.ts; errors.ts y types.ts ampliados
│   └── copy/es.ts     # plan, goals, goalExpense, analysis; errores JT2nn
├── features/
│   ├── plan/          # Plan, BudgetIndicator, hoja de presupuesto, historial
│   ├── analysis/      # Análisis S3, Chart, PlanningNote
│   ├── goals/         # Metas, GoalStack, GoalCard, inmersiva S5, aporte, retiro, historial
│   ├── expenses/      # «Cómo se pagó», FundingLedger, B3, quitar el uso, LimitNote
│   ├── home/, activity/  # bloques de metas y asientos
│   └── shared/        # ConfirmationBadge, tarjeta de solicitud
└── app/(app)/
    ├── plan/page.tsx, plan/analisis/page.tsx
    └── metas/page.tsx, metas/[id]/page.tsx
tests/
├── integration/   # budgets.test.ts, goals.test.ts, goal-races.test.ts, metrics.test.ts; export.test.ts ampliado
└── e2e/
    ├── budgets.e2e.ts     # spec E2E 5 (nace en el PR B, crece en el E)
    ├── goals.e2e.ts       # spec E2E 4 (nace en el PR C, crece en el D)
    └── fixtures.ts        # seedCouple() con la parte P0-3 del dataset
```

**Structure Decision**: el monolito de la 001 a la 003. Los módulos de dominio nuevos
son los que el maestro §7.2 ya prevé (`budgets`, `goals`) más `metrics` y
`analysis`.

## Cómo se construye cada parte

| Parte | Cómo | Fuente |
| --- | --- | --- |
| Presupuestos | `create_budget`, `update_budget` (desactivar = `null`); vistas `budget_months` y `budget_history`; mes de vigencia fijado por el servidor | data-model §2.1–§2.2; R4, R7 |
| Metas | `create_goal`, `update_goal`, `complete_goal`, `archive_goal`; `goals_overview` y `goals_totals` por `goal_scope` | data-model §2.3, §7 |
| Ledger | `contribute_to_goal`, `withdraw_from_goal`, `void_goal_entry`; asientos `void`; solo inserción; trigger de saldo que bloquea la meta | R1, R2; data-model §2.4, §3 |
| Gasto con meta | `create_expense_with_goal` (punto 5 de §15.6.3); `approve_usage_request` (punto 6), `reject_usage_request`, `cancel_usage_request`; `remove_goal_usage` | R3; contracts/database.md |
| Funciones de antes | `void_*` y `update_*` redefinidas; `transaction_goal_funded` conectado | data-model §6 |
| Métricas | `metric_months`, una sola sentencia; el dominio las reproduce y las prueba con las siete filas | R5; FR-060 |
| Lecturas | Vistas de una sola sentencia para totales; `readByCursor` generalizado para listas; filtro por `context` (Yo/Nosotros) o por `goal_scope` (de quién es la meta) en el servidor | R5, R6; data-model §7 |
| Escrituras en el cliente | `ok` / `rejected` / `unknown`, 15 s, `write_status`, nada en el navegador, un deshacer | contracts/server-actions.md |
| S3 y S5 | Motion for React; View Transitions con respaldo; solo con datos o confirmación del servidor | R10 |

## PR de implementación A–E

Cada PR sale de `main` con el anterior mergeado (salvo B y C, que pueden ir en
paralelo después de A, en worktrees distintos y con un solo agente en `juntia-dev` a la
vez). Cada uno pasa el gate completo (`verify` + jobs del mismo commit), lleva su
evidencia en `specs/004-presupuestos-y-metas/evidence.md` y para en la revisión
humana. **Se itera contra `juntia-dev`**; el CI corre solo en los puntos de control de
[contracts/ci.md](contracts/ci.md) y en el gate, que es la pasada de marcar listo.
**Paso fijo de B a E:** pasada de Impeccable a 390 y 1440 px en los dos temas, y
barrido completo de accesibilidad lanzado por el gestor (decisión 21.2).

### PR A · Base de datos, seguridad y dominio

**Alcance.** Las cuatro migraciones nuevas, el dominio (`budgets`, `goals`, `metrics`,
`analysis` y las partes A–D del dataset dorado con la prueba cronológica),
`src/lib/db/` de presupuestos, metas y uso, los errores `JT201`–`JT226`, los tipos
generados, pgTAP e integración, la siembra de la parte P0-3. El glosario añade
`budget_versions`, `goal_type`, los cuatro `kind` del ledger, `void`,
`goal_usage_confirmations.status` y las vistas. **Sin pantallas.**

**FR y US:** FR-001–FR-007, FR-010–FR-016, FR-030–FR-034, FR-040–FR-042, FR-051–FR-055,
FR-057–FR-063, FR-080–FR-081 (servidor), FR-090–FR-097, FR-110–FR-112, FR-117; US-10
entera y la mitad de servidor de US-2, US-5, US-6, US-7 y US-8.

**Orden obligatorio:**

1. **Punto de control 1 — `budgets` y `goals_tables`**: tablas, triggers de solo
   inserción, de saldo, de contexto y de transición, RLS, vistas. **Ninguna función que
   escriba.** pgTAP `01`, `03`, `05`, `12` y `13` (la parte sin funciones). Salida:
   ADR-013 [V] 1, 2 y 7 sobre las tablas nuevas; escritura directa imposible; ninguna
   vista de Nosotros con datos personales.
2. **`goal_functions`**: presupuestos, metas, aportes, retiros y anulaciones, con
   `12_budgets` y `13_goals` completos e integración de concurrencia.
3. **Punto de control 2 — `goal_funding`**: gasto con meta, solicitudes, quitar el uso,
   la redefinición de `void_shared_expense`, `void_transaction`,
   `update_shared_expense` y `update_transaction`, el cuerpo nuevo de
   `transaction_goal_funded` y `metric_months`. Las cuatro redefiniciones van en esta
   migración, la primera en la que existe un uso de meta, y antes de cualquier commit
   que los use. Salida: carreras de FR-112, `transaction_goal_funded` con datos (Mover
   a Pareja con `JT116`), las siete filas de DEC-G04 en dominio y en
   `metric_months`.

**Pruebas por capa:**

| Capa | Qué |
| --- | --- |
| Dominio | Las siete filas de DEC-G04 con `test.each`, «No disponible» distinto de 0, negativos sin `Math.max`; vistas que concilian sin sumarse (−120.000 + 120.000 = 0); saldo y disponible por aportante con propiedades (≥ 0); `budgetState` con comparación exacta y consumo 0 (estado «dentro», 0 %); `displayedPercent` truncado (92 %, 46 %, 65 %); `limitInForce`; `proposeFunding` (mayor residuo, suma exacta); `goalPace` (6.660.000 en 6 meses → 1.110.000); `monthComparison`; el dataset dorado de P0-3 y su prueba cronológica (F63-1) |
| SQL/RLS (pgTAP) | Privilegios efectivos de tablas, funciones y triggers nuevos; cada tabla con su RLS para Sara, Tomás y una tercera cuenta; metas y presupuestos personales invisibles para el otro, también anulados y por agregados; solo inserción para cualquier rol; **el trigger de saldo con un `insert` directo como `juntia_writer`** de un retiro, una asignación y un `void` que anula un aporte, cada uno por encima del disponible, que fallan con `JT220`; cada función con éxito, rechazo por RLS, repetición idempotente, misma clave con otra huella y cada validación (aporte a nombre de otro, aprobar la propia solicitud, uso sin aprobación, retiro ajeno, archivar con saldo); `transaction_goal_funded` con datos; una política rota a propósito que hace fallar la función |
| Integración | Las carreras de FR-112 con `raceUnderLock` en los dos órdenes (aprobar contra cancelar, retirar, quitar el uso y anular el gasto; dos usos; dos aprobaciones; editar contra desactivar presupuesto; dos creaciones de la misma clave; **dos anulaciones del mismo aporte o de dos aportes de la misma persona, y anular un aporte contra retirar**, con el disponible ≥ 0 en todos los casos) con la invariante «ningún uso vivo en un gasto no activo» y sin interbloqueos; idempotencia y `write_status` de cada escritura nueva; las cuatro funciones redefinidas contra gastos con y sin meta; lectura consistente de `metric_months` y `budget_months`; el paginador generalizado (F64-4) con más de 500 filas, fechas repetidas y escrituras entre páginas sobre `goal_entries`, `budget_history` y `usage_requests`, más las pruebas de la 002 y la 003 con la firma nueva; completitud y no duplicar de las metas en Yo (F64-3); importes de ida y vuelta (`9007199254740993`); exportación con lo nuevo, sin personales del otro ni duplicados |
| E2E | Ninguna nueva; corren las specs 1, 2 y 3 |

**`[V]` que cierra:** ADR-013 [V] 1–7 sobre lo nuevo; `goal_usage_confirmations`;
RLS de metas; registro inicial y autorización posterior del gasto con meta (puntos 5 y
6 de §15.6.3, SQL); ediciones concurrentes de presupuesto (SQL); idempotencia (SQL);
las siete filas; `transaction_goal_funded` (función); dataset en orden cronológico.

**Medición de workers (mitigación a de [contracts/ci.md](contracts/ci.md)):** contra
`juntia-dev`, sin CI extra, `npm run e2e:dev` con 1, 2 y 4 workers, con y sin
`fullyParallel`, sobre las specs 1, 2 y 3 y su axe con sesión. Para poder medir, el PR A
hace que `playwright.config.ts` lea el número de workers y `fullyParallel` de una
variable (por defecto, lo de hoy) y que `e2e:dev` la reenvíe, porque su lista blanca
rechaza `--workers`. Se registra en la evidencia si los usuarios y parejas
sembrados por worker aíslan los datos (cero fallos, cero lecturas cruzadas) y cuánto
baja el tiempo. El número de workers que use el job `e2e` sale de esa medición.

**Integración obligatoria de F64-1:** aportar, gastar todo con la meta, archivarla y
anular el gasto: la anulación se aplica, los fondos vuelven, la meta queda `active` con
su auditoría y el resultado trae `reactivated_goals`. Lo mismo con «Quitar el uso» y con
un gasto privado y su meta personal. Archivar con saldo sigue fallando con `JT214`.

**Criterios de salida:** job `db` verde en el último commit, con las salidas de los dos
puntos de control; la medición de workers en la evidencia; dataset dorado de P0-3 en dominio e integración; cero accesos
cruzados; cero duplicados; cero usos vivos en gastos no activos; revisión humana del
SQL.

### PR B · Plan y presupuestos

**Alcance.** Plan en Yo y Nosotros (resumen, BudgetIndicator con sus estados, «sin
presupuesto · Crear», texto de presupuestos opcionales), hoja de crear y editar con
desactivar, historial y conflicto de versión. **Nace la spec E2E 5.** Además, por ser el
primer PR con una spec nueva: el **selector de specs por área** integrado en el job
`e2e`, con su prueba (F64-5), y, si la medición del PR A lo permite, los workers del job
con las dos pasadas de `@serial` (F64-6) ([contracts/ci.md](contracts/ci.md)).

**FR y US:** FR-010–FR-018 (interfaz), FR-020, FR-085–FR-087 (Plan), FR-090–FR-095,
FR-100–FR-103, FR-113 (BudgetIndicator), FR-114 (spec 5), FR-115; US-1 (Plan) y US-2.

**Pruebas:** componentes de BudgetIndicator (dentro, cerca, excedido, consumo 0 y sin
presupuesto, que nunca dice 0 %), de la hoja (límite no válido, `unknown`, conflicto
con «{nombre} cambió este presupuesto») y del historial. **Spec E2E 5 (nace):** crear,
editar con conflicto entre Sara y Tomás, desactivar y volver a «sin presupuesto», con
HTML, RSC y prefetch de Plan en Nosotros sin presupuestos personales. Axe de Plan y la
hoja.

**Punto de control:** al nacer la spec 5, `gh workflow run` para medir el job `e2e`.

**`[V]` que cierra:** ediciones concurrentes de presupuesto (aviso en pantalla);
privacidad por ámbito en Plan; umbrales de §15.7 de Plan.

**Criterios de salida:** gate verde con las specs 1, 2, 3 y 5 por debajo de 480 s;
capturas; Impeccable; barrido; aprobación visual.

### PR C · Metas, aportes, retiros y S5

**Alcance.** Metas en Yo y Nosotros (decisión 22.11), GoalStack y abanico, GoalCard
con el fallback, la meta inmersiva con Goal Journey, crear, editar, dar por lograda y
archivar, Registrar aporte (sin «¿Quién aporta?»), historial con filtros, Retirar con
motivo, «Deshacer» y «Anular aporte», ritmo (Q9), estados vacío y de error, los bloques
de metas y «Apartado para metas» en Inicio y los asientos en Actividad. **Nace la spec
E2E 4.**

**FR y US:** FR-030–FR-037, FR-040–FR-044, FR-070, FR-071 (asientos), FR-075–FR-077,
FR-085–FR-087 (Metas), FR-090–FR-095, FR-098–FR-103, FR-113 (retiro y fila), FR-114
(spec 4), FR-115; US-4, US-5, US-6 y US-9.

**Pruebas:** componentes de GoalCard, GoalStack (0, 1, 2, 3 y más metas; «Ver todas»),
Registrar aporte (vista previa 11.840.000 · 65 %, sin selector de aportante), Retirar
(rechazo con el máximo), la fila de retiro que nunca parece ingreso, el deshacer único
con tres orígenes y la inmersiva con movimiento reducido. **Spec E2E 4 (nace):** crear
una meta compartida, aportar y comprobar que el número héroe de Inicio no cambia,
retirar, y HTML, RSC y prefetch de Metas en Nosotros sin metas personales. Axe de Metas,
la inmersiva y las hojas.

**Punto de control:** al nacer la spec 4, `gh workflow run` para medir el job `e2e`.

**`[V]` que cierra:** View Transitions con App Router (el back-swipe en iPhone queda
con la decisión 19.1); rendimiento de GoalStack y del abanico (gestor, laboratorio,
decisión 22.2); privacidad por ámbito en Metas; umbrales de §15.7 de Metas.

**Criterios de salida:** gate verde con las specs 1, 2, 3 y 4 por debajo de 480 s;
capturas; Impeccable; barrido; aprobación visual de GoalStack, personas y tinta.

### PR D · Gasto con meta y confirmaciones

**Alcance.** «Cómo se pagó» en Anotar con «Dinero del mes» por defecto (la ruta mínima
no cambia), B1 solo con metas del contexto, FundingLedger con la propuesta
proporcional, B3, el registro con la solicitud, B4 a B7 en las dos sesiones, la
solicitud en Inicio y en la meta, «Quitar el uso de la meta», la anulación y la edición
de un gasto con meta, la fila CON META con su uso, y la LimitNote de Mover a Pareja.
**La spec E2E 4 crece.**

**FR y US:** FR-050–FR-059 (interfaz), FR-071–FR-072, FR-085 (B1), FR-090–FR-095,
FR-113 (FundingLedger), FR-114 (caso de dos sesiones), FR-115; US-7 y US-8.

**Pruebas:** componentes de FundingLedger (topes, «Suman $X de $Y», Guardar bloqueado),
B3 con «ahora» y «si aprueba», ConfirmationBadge en sus cinco estados («NO SE
REGISTRÓ» solo con rechazo confirmado), la tarjeta pendiente y la LimitNote. **Spec E2E
4 (crece):** el caso de la matriz «Financiación ajena → aprobar/rechazar» con dos
contextos autenticados, y el caso de privacidad de B1 (F63-3): Sara con metas
personales, Tomás sin ellas, y nada personal en el HTML, el RSC ni el prefetch de
Anotar en Nosotros. Axe de B1–B7.

**`[V]` que cierra:** `goal_usage_confirmations` (recorrido de dos sesiones);
`transaction_goal_funded` (pantalla); idempotencia de las escrituras de la interfaz.

**Criterios de salida:** gate verde con las specs 1, 2, 3 y 4 por debajo de 480 s;
capturas; Impeccable; barrido; aprobación visual de FundingLedger, ConfirmationBadge y
B3.

### PR E · Análisis, PlanningNote, exportación y cierre

**Alcance.** Análisis (S3) en `/plan/analisis` con sus cuatro capítulos, con y sin
presupuesto, la comparación con el mes anterior (Q10), Chart con tabla equivalente y
PlanningNote con «Cómo se calcula»; el acceso desde Plan y desde «En qué se fue»; la
exportación con todo lo autorizado. **La spec E2E 5 crece.** Cierre de la etapa.

**FR y US:** FR-021–FR-025, FR-060–FR-063 (interfaz), FR-080–FR-081, FR-100–FR-103,
FR-113 (PlanningNote), FR-114 (Análisis), FR-115; US-3.

**Pruebas:** componentes de los capítulos, la comparación (sin mes anterior no hay
«+X %»), Chart (nunca apila ahorro y gasto) y PlanningNote (negativo con su texto;
nunca «Total gastado»). **Spec E2E 5 (crece):** Análisis con y sin presupuesto. La
descarga de la exportación sigue en la spec 1. Axe de Análisis.

**`[V]` que cierra:** umbrales de §15.7 de Análisis; barrido completo de cierre de
P0-3; salida interna.

**Criterios de salida:** gate verde con las cinco specs por debajo de 480 s; capturas;
Impeccable; barrido de cierre; aprobación visual de PlanningNote; **salida interna
aprobada por los dos fundadores (SC-012)**.

## Dónde se mide cada criterio de éxito

| SC | Dónde | PR |
| --- | --- | --- |
| SC-001 | Capturas de 390 y 1440 px en los dos temas; Impeccable | B–E |
| SC-002 | axe ligero en el job `e2e`; barrido de cierre | B–E |
| SC-003 | Dominio (`test.each`) e integración (`metric_months`) | A |
| SC-004 | Dominio e integración con el dataset dorado | A |
| SC-005 | Integración del escenario de los tiquetes | A |
| SC-006 | Propiedades del dominio | A |
| SC-007 | pgTAP de vistas; specs 4 y 5 (HTML, RSC y prefetch); componentes | A–D |
| SC-008 | Integración de doble envío y de carreras | A |
| SC-009 | pgTAP y llamada directa a las funciones | A |
| SC-010 | Laboratorio, reportado como tal | B, C, E |
| SC-011 | Componentes con movimiento reducido; revisión humana | C, E |
| SC-012 | Uso real de los dos fundadores | E |
| SC-013 | Evidencia de cada `[V]`, con responsable y cierre | A–E |

## Riesgos

- **Presupuesto del job `e2e`.** 60 s de margen sobre la línea base de 420 s (R9)
  probablemente no alcanzan para dos specs nuevas. La mitigación está prevista en
  [contracts/ci.md](contracts/ci.md), en orden y sin subir el tope: (a) workers de
  Playwright en el job `e2e`, cuya seguridad se mide en el PR A contra `juntia-dev`;
  (b) no repetir en las specs 4 y 5 lo que ya cubre otra capa o spec; (c) solo si las
  dos no bastan, los fundadores.
- **Redefinir funciones en producción.** Las cuatro funciones de anular y editar ya
  atienden datos. La migración las sustituye con la misma firma y el mismo contrato;
  sus pruebas de la 002 y la 003 siguen corriendo sin cambios, y se añaden las de gasto
  con meta.
- **Migraciones en producción.** Las aplica el gestor, con el «sí» de un fundador antes
  de cada paso de escritura y desde un worktree desechable (patrón de T029 de la 003).
  Si para entonces hay datos reales, la copia de la decisión 19.3 va antes.
- **`juntia-dev` compartido.** Las pruebas de concurrencia de otra rama pueden fallar
  si dos suites corren a la vez en la misma base (research, ejecución 2): un solo
  agente a la vez, como ya dice la decisión 18.

## Constitution Check — repetición después del diseño

- Ningún requisito de la spec queda sin dueño en un PR (FR de cada PR arriba).
- Ninguna decisión nueva significativa se toma en el plan. Las del plan son locales y
  reversibles antes de tener datos.
- Ningún `[P]` que afecta al alcance queda abierto.
- `docs/TESTING.md`, `AGENTS.md`, `.github/`, `scripts/` y `package.json` no se tocan
  en esta rama.

**Resultado:** **PASA.**

## Para los fundadores

**Aprobado el 7 de noviembre de 2026** («Aprobamos», comunicado por el gestor en
nombre de los dos; la segunda fundadora lo confirma con el merge de este PR): los
puntos 1 a 4 de abajo, tal como están. El punto 5 es la mitigación pedida por el gestor
en su revisión del plan y no necesita una decisión de los fundadores salvo que llegue al
paso (c).

**Precisión de las decisiones 22.15 y 22.17, aprobada el 7 de noviembre de 2026**
(revisión del PR #64, F64-1; Alejandro, en nombre de los dos: «a»; la segunda
fundadora la confirma con el merge de este PR). Anular un gasto financiado por una meta,
o quitarle el uso, **siempre se permite**, también si la meta ya está archivada: el
`void` del uso se inserta, los fondos vuelven a cada aportante y la meta vuelve sola a
`active` en la misma transacción, con auditoría y el aviso «La meta {nombre} volvió a
estar activa: se devolvieron $X». La regla de archivar (saldo 0 y sin solicitudes
pendientes) no cambia. Detalle en data-model §2.3 y contracts/database.md; la prueba
de integración obligatoria está en el PR A.

Nada de este plan es una decisión nueva y difícil de revertir: no hace falta ningún
ADR. Las decisiones del plan que tocan cómo se ve o se comporta algo:

1. **«Quitar el uso» de un gasto ya anulado falla** con un mensaje, en lugar de decir
   «quitado» (research R3). **Aprobado.**
2. **Deshacer acepta hasta 60 s en el servidor** para aportes, retiros y gastos con
   meta, aunque el aviso dure 6 s, como en la 003 (research R8). **Aprobado.**
3. **Tipos de meta** para el ícono del fallback: viaje, vivienda, boda, vehículo,
   educación, emergencias y otra (data-model §2.3). **Aprobados**; la aprobación final
   es en pantalla, en el PR C.
4. **Una solicitud aprobada cuyo uso se quita después** se muestra como «Uso quitado»,
   no como pendiente (research R3). **Aprobado.**
5. **El presupuesto del job `e2e` se defiende sin subir el tope**: primero workers de
   Playwright (medidos en el PR A), después no repetir casos entre specs, y solo si
   las dos cosas no bastan se les pregunta ([contracts/ci.md](contracts/ci.md)). El
   tope no se mueve solo.

## Complexity Tracking

| Añadido | Por qué hace falta | Alternativa más simple descartada porque |
| --- | --- | --- |
| Trigger `before insert` que bloquea la meta | Saldo ≥ 0 por aportante por cualquier camino | Trigger diferido: la prueba lo vio fallar con −40.000 (R2) |
| Asientos `void` en el ledger | Solo inserción, nunca se edita un importe | Columna `status` mutable: rompe «solo inserción» (R1) |
| `budget_versions` aparte | Vigencia mensual e historial con autor, valor anterior y nuevo | Una fila por mes: copiar límites y decidir meses vacíos (R7) |
| Vistas con `context`, `goal_scope` y `month` en lugar de funciones con parámetros | Lecturas consistentes que `authenticated` puede ejecutar | Funciones invoker: `permission denied for schema juntia_data` (R6) |
| Redefinir cuatro funciones de la 002 y la 003 | Ningún uso vivo en un gasto anulado ni por encima de su importe (Q17) | Un trigger solo: daría el error, pero no quitaría el uso en la misma operación |
