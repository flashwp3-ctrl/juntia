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
- Ampliación de T016 tras la precisión del gestor: pasada en rojo completa,
  `39 failed | 55 passed | 16 skipped (110)`, `150.09 s` Vitest / `150.75 s`
  runner. Incluye las 18 carreras, las catorce escrituras, F64-1 privado y
  compartido, paginación de 1101 filas por lista y exportación global.
  Se mantienen diferenciadas las siete pruebas no ejecutadas por el fallo del
  hook de exportación y las nueve omisiones previstas. No es salida de CI.
- T017, primera iteración SQL (`115.19 s`): `12_budgets` **22/22**, y las
  primeras **50 pruebas de `13_goals`** (metadatos, aportes, retiros, anulaciones,
  idempotencia, permisos y políticas rotas) pasan. Los nueve definer nuevos
  cumplen el control de privilegios. El resto sigue rojo por T018 ausente y el
  inventario de entradas espera todavía sus cinco RPC. No se cierra el grupo.
- T017, integración (`125.46 s` total): presupuestos **4/4**, carreras de anular
  el mismo aporte y anular contra retirar **en ambos órdenes** pasadas. Los
  fallos restantes corresponden a financiación, siembra/exportación pendientes
  y a las redefiniciones privadas aún no aplicadas en esa ejecución.
- T018, primera pasada SQL (`117.77 s`): privilegios **483**, vistas **32**,
  presupuestos **22** y tablas de metas **24** pasan. El bloque de funciones de
  metas pasa hasta aprobar/rechazar/cancelar; quitar/anular descubre una referencia
  `g.id` ambigua en el helper común. Se corrigió el alias y se amplió el
  inventario exacto de writer de 20 a 34 implementaciones; segunda pasada en curso.

## Precisión del gestor · DEC-G04 (resuelta)

El plan, PR A, orden obligatorio 3, pide «las siete filas de DEC-G04 en dominio y
en `metric_months`». Pero `docs/TESTING.md` §6 define «Octubre · Yo, Tomás» como
«No disponible» porque la fixture no define sus gastos privados, y prohíbe
interpretarlo como cero. La vista autenticada como Tomás conoce los registros
persistidos de Tomás; el esquema no define una marca de datos incompletos.
No se añade esa marca ni se fabrica un `null` en SQL.

El gestor confirmó en este chat: **siete filas en dominio y seis con importes
definidos en integración SQL** contra `metric_months`. Para «Yo, Tomás · octubre»
se comprueban en SQL únicamente `aporte_a_metas = 40000000`, `retiro_de_metas = 0`
y `gasto_financiado_con_meta = 0` (unidades menores). **No se afirma consumo ni
destinado neto de Tomás**, pues sus privados no están definidos (003, F47-9).
Se añade aislamiento de métricas privadas en ambos sentidos entre Sara y Tomás.
No se modifica la spec ni el plan. La implementación continúa con esta precisión.

## Mapa de tareas, commits y pruebas (hasta T021)

| Tarea | Commit | Prueba / estado |
| --- | --- | --- |
| T001 | Gestor | Declarada hecha; no modificada |
| T002–T007 | e7bdb31 | Dominio 78/78, siete filas DEC-G04 y cronología; rojo registrado |
| T008–T010 | e7bdb31, 52d00a4 | Errores/paginador 81/81, glosario y transportes monetarios |
| T011 | e7bdb31 | 30/30 tras esperar la condición de foco; causa y baseline documentados |
| T012–T014 | 247aa63, 1869e80, 52d00a4, 0df4d4a | Tablas, RLS, diez vistas y tipos; pgTAP completo verde en dev |
| T015–T016 | af65881 (rojo), 1869e80, 52d00a4 | 103 pasan / 9 omisiones previstas; carreras en ambos órdenes, privacidad, recuperación de las 14 escrituras, F64-1 y páginas de 1101 filas |
| T017–T018 | 1869e80, 0df4d4a | Cuatro migraciones nuevas; pgTAP completo verde, funciones y regresiones P0-1/P0-2 |
| T019–T020 | 52d00a4, 0df4d4a | Adaptadores reales, exportación global y siembra SQL aislada; tipos generados directos |
| T021 | Código 0df4d4a; salidas en este documento | SQL 112.89 s; integración 271.50 s; E2E 28/28, 100.67 s total |
| T022–T023 | Pendientes tras T024 | No se ha modificado la configuración Playwright de workers ni ejecutado la medición |
| T024 | Gestor | Run 42458621877: app/e2e verdes, db rojo en restaurador. Corrección 0deaae6 verificada localmente; listo para el único relanzamiento autorizado del gestor |
| T025 | Este documento, en curso | Las [V] siguen abiertas hasta el run de CI; faltan T023/T024 |
| T026 | Parcial | Verify local; completo e2e:dev y verify final tras workers, antes del push final; revisión de ChatGPT pendiente |
| T027–T028 | Gestor | Gate ready_for_review y migraciones a producción pendientes; ninguna operación en producción |

## PR A · avance T018–T020 (iteración local, no cierre de [V])

- T018: `test:db:dev` completo verde, **121.18 s**: privilegios 483, vistas 32, writer 18, presupuestos 22, funciones de metas 88, tablas de presupuestos 13 y de metas 24. Se conservaron las regresiones previas.
- Integración tras T018: **92 passed / 2 failed / 16 skipped**, 144.85 s del runner. Las 18 carreras nuevas y las ocho pruebas de financiación/reactivación pasan; fallan dataset dorado y exportación todavía ausentes. Siete omisiones adicionales son pruebas bloqueadas por timeout del hook de exportación, no omisiones previstas.
- T019: prueba nueva de tipos públicos vista en rojo (falta `limit_minor`); tipos generados por CLI fijado 2.121.0 contra el ref de dev explícito, schema public. La prueba ampliada recorre el AST, incluye todos los nombres monetarios nuevos y pasa (2/2). Adaptador real visto en rojo antes de crear módulos.
- T020: aislamiento de metas/presupuestos añadido al test existente de dos workers, visto en rojo sin la siembra P0-3. Implementada siembra SQL histórica con opción golden; las aportaciones del otro solo se incluyen en metas compartidas.
- Incidencia del lanzador: aunque run.mjs pasaba --testTimeout/--hookTimeout=60000, el proyecto integration seguía dando errores a 10000 ms (segunda pasada: múltiples hooks). Se aplicaron **los mismos 60 s ya prescritos** por TESTING.md §2 en la configuración del proyecto, solo con JUNTIA_TEST_TARGET=dev; no cambia el timeout de CI ni los presupuestos.
- `typecheck` verde. Lint sin errores; se quitó el import nuevo sin usar. Persiste únicamente el warning preexistente balance-panel.tsx:61.

- Generación definitiva T019: CLI 2.121.0 **directa por --db-url sin contraseña**, usando checkDevTarget, cleanPgEnv, dbUrlWithoutPassword y runInSession (mismo método de la 003). Contraseña solo en el entorno del hijo, guardia y lock propios; sin Docker ni transformación del resultado. Se sustituyó la generación inicial por --project-id, cuyo formato era el de la API de metadatos. Los espacios del archivo son los que emite el generador y no se corrigen manualmente; db:types:check lo validará en T024.
- Verify fuera del sandbox: **52.79 s**, dominio **78/78**, componentes **678 pasan / 2 omisiones previstas**; lint sin errores y typecheck verde. El intento sandbox previo falló en los tests de puertos/procesos de Windows; no se cambiaron esas pruebas.
- Pasadas completas posteriores: 98 pasan / 4 fallan / 9 omisiones (233.19 s); 98 pasan / 5 fallan / 9 omisiones (203.51 s). Se conservan como fallidas: statement_timeout de dev en carreras/recuperación de escrituras, una barrera agotada y la matriz repetida de exportación a 60 s. No se aumentó ningún límite.
- Ajuste de iteración: maxWorkers=2 **solo bajo JUNTIA_TEST_TARGET=dev**, entre archivos de integración (las dos peticiones de cada carrera y sus barreras siguen concurrentes). Se elimina la repetición redundante de exportar en páginas de 2 y 3: quedan ambos formatos, archivo completo y página de 1, con escrituras entre páginas y las 1101 filas por historial en su prueba específica. Configuración de concurrencia: [Vitest maxWorkers](https://main.vitest.dev/config/maxworkers). CI conserva sus defaults y sus presupuestos. Nueva pasada completa en curso.

- Integración completa con concurrencia de archivos acotada: **19 archivos pasan / 1 omitido; 103 pruebas pasan / 9 omisiones previstas**, **301.70 s** del runner (301.02 s Vitest). No fallos de barrera ni de RPC. Exportación 7/7, dataset dorado y privacidad 6/6, carreras 18/18, funciones 8/8, historiales 1101 filas, aislamiento de siembra y adaptadores reales incluidos. No cambia el límite de tiempo de CI.
- Revisión adicional: el porcentaje en goals_overview se convertía a int4, que puede desbordar con target $1 y aportes admitidos. Regresión pgTAP añadida antes de corregir; ejecución roja en curso.

- Regresión de progreso: primer intento **117.82 s**, inválido por un delimitador SQL de la prueba (no se cuenta como rojo funcional). Delimitador corregido, segundo intento **115.03 s**, rojo real con `integer out of range` en 13a_goal_tables: target 100 y aportes válidos. Se elimina solo el cast int4; se conserva trunc() y el valor entero sin tope artificial. Nueva pasada SQL completa en curso.
- Tipo F64-1: prueba nueva de `VoidResult.reactivated_goals` vista en rojo con TS2339 antes de añadir el campo opcional de reactivaciones (importes string). Typecheck vuelve a verde; no cambia la firma de las operaciones de P0-1/P0-2.

## T021 · cierre local sobre el esquema final

Código validado: `0df4d4a571e2e451bb793a3ee405359600f0a945`. Los siete archivos de migración anteriores no cambian; el diff incorpora exactamente las cuatro migraciones de PR A.

`npm run test:db:dev`:

```text
13a_goal_tables.test.sql: pasó (25), incluida regresión de progreso
test:db:dev (total): pasó · 112.89 s
```

`npm run test:integration:dev`:

```text
Test Files 19 passed | 1 skipped (20)
Tests 103 passed | 9 skipped (112)
Duration 270.90s
test:integration:dev (total): pasó · 271.50 s
```

Las nueve omisiones son las ocho pruebas declaradas de correo/Auth y 40P01 real: solo CI. No hay hooks fallidos ni pruebas bloqueadas contadas como omisiones.

Comando dirigido de las specs 1, 2 y 3, con PORT=3400:

```text
npm run e2e:dev -- tests/e2e/access-account.e2e.ts tests/e2e/annotate.e2e.ts tests/e2e/couple-settle.e2e.ts
28 passed (1.2m)
next build (juntia-dev): pasó · 26.82 s
E2E dirigido (sin @mail): pasó · 71.43 s
e2e:dev (total): pasó · 100.67 s
```

Incluye descargas JSON/CSV, privacidad HTML/RSC/prefetch, Anotar, Mover a Pareja y Balance. Las cuatro E2E @mail solo corren en CI. No se ejecutó el proyecto evidence ni se produjeron capturas locales: ADR-011 §9.8 las reserva al CI. Este PR no modifica interfaz; B–E quedan fuera.

T022–T023 esperan el punto de control del gestor conforme a la precisión inicial. El e2e:dev completo y verify de salida final (T026) se ejecutarán tras la medición y antes del push final. No se marca el PR ready_for_review.

Verify sobre el código final, fuera del sandbox (los tests Windows necesitan identificar sus procesos/puertos):

```text
npm run verify
lint: pasó (1 warning preexistente en balance-panel.tsx:61, sin errores)
typecheck: pasó
dominio: 12 archivos, 78 pruebas pasan
componentes: 54 archivos, 678 pasan / 2 omisiones previstas
verify (total): pasó · 72.67 s (< 90 s)
```

**Listo para T024** tras publicar el SHA de este cierre. Se mantiene el borrador; el gestor lanza el run. Los tiempos anteriores son de iteración local, no sustituyen db:types:check ni cierran las [V].

## T024 · run 42458621877 y corrección del restaurador

El gestor comunicó el run [42458621877](https://github.com/flashwp3-ctrl/juntia/actions/runs/42458621877), SHA 3ca8643: app y e2e verdes (e2e 445 s); db rojo en db:restore-drill por «Tabla no prevista en el restaurador». Los RESTORE_INVARIANTS de controles negativos no son fallos del protocolo. El agente no lanzó ese run ni lanzará el relanzamiento.

**Cambio del protocolo de restauración (AGENTS §17)**: autorizado expresamente por el gestor en este chat, con suspensión de triggers nombrados, misma transacción, equivalentes y negativos por regla, rol postgres alojado y revisión de ChatGPT/gestor antes del merge. No se modifica ninguna migración.

| Trigger suspendido por nombre | Invariante equivalente sobre el snapshot | Controles N11 (también integración) |
| --- | --- | --- |
| goal_ledger_guard | Void existente, no void-de-void, misma meta; fechas desde creación y no futuras; aportante/actor del ámbito; saldo vivo ≥ 0 por meta y aportante; contexto del gasto, estado e intervalos archivados; una meta por gasto | invalid-void, void-of-void, future-entry, before-creation, foreign-contributor, goal-negative, member-negative, wrong-context, voided-expense, two-goals, archived-entry, completed-contribution |
| goal_allocation_guard | entry_kind y asiento usage (FK compuesta activa), atribución a quien creó el uso e integrante autorizado, disponible no negativo, suma de asignaciones conciliada, uso vivo ≤ gasto | allocation-kind, allocation-nonusage, foreign-allocation, member-negative, over-expense |
| goal_confirmation_guard | Meta compartida y contexto/moneda de gasto correctos, integrantes activos, solicitante y consentimiento, vínculo aprobado recíproco, pending solo sobre gasto activo/meta no archivada; sin actividad en intervalo archivado | personal-request, foreign-request-member, wrong-request-context, wrong-request-member, approval-link, pending-voided-expense, archived-request |
| goal_void_reactivate | Solo void de uso cierra un intervalo archivado; reactivación auditada con gasto y devolución conciliada; estado final y rearchivo posteriores coherentes | missing-reactivation, wrong-refund, activation-without-void; positivos active y archivada de nuevo con auditoría intacta |

Controles adicionales de restricciones que **nunca se desactivan**: category-kind, income-category (FK compuesta), scope-xor, goal-scope-xor, duplicate-budget y zero-limit. Un límite null sigue siendo desactivación válida; no se convierte en cero. El parser rechaza UPDATE, DELETE y SET session_replication_role. Se conservan activos los triggers de P0-1/P0-2, los de solo inserción, las comprobaciones diferidas de sumas y los internos de FK.

Solo se cambia temporalmente goal_ledger_entries_confirmation_id_fkey: NOT DEFERRABLE → DEFERRABLE INITIALLY DEFERRED → NOT DEFERRABLE. Los asientos preceden a asignaciones/solicitudes y los no-void a sus voids. La copia original y sus valores permanecen intactos. planning-load-start comprueba propiedades iniciales; planning-load-end fuerza las restricciones, reactiva los cuatro triggers con ENABLE, vuelve a forzar restricciones y restablece la FK. check-invariants.sql corre después y antes del COMMIT exterior. PostgreSQL exige la comprobación preliminar para vaciar eventos pendientes antes de ENABLE; no se desactiva ningún trigger interno para evitarla. Fallar en cualquier punto revierte datos y DDL.

El manifiesto ya descubre dinámicamente todas las tablas de juntia_data y usa su PK completa para count/MD5 de filas. La integración ejecuta la consulta real del script; el drill exige las seis líneas de recuentos/huellas. No se añadió una lista parcial que pudiera omitir tablas futuras.

N11 usa una copia sintética por regla, modifica solo sus filas conocidas y recalcula data_sha256 antes de cifrar. Además de exit ≠ 0 y ausencia de marca de éxito, exige el marcador de la regla o de las restricciones: una mera discrepancia de manifiesto no cuenta. Los caminos A/B, login, cifrado y limpieza siguen solo en CI.

Iteración:

- Unidad nueva en rojo: tests/restore-data.test.ts, 1 falla / 5 pasan, «Tabla no prevista en el restaurador». Tras la lista, orden y protocolo, 6/6; ampliada a 8/8 con preservación de las filas de cada corrupción y validación del cierre.
- Primera integración: 20 fallan / 109 pasan / 9 omisiones, 386.22 s Vitest. Reprodujo el impedimento real de postgres alojado: cannot ALTER TABLE goal_ledger_entries because it has pending trigger events. Se añadió el drenaje preliminar de restricciones; se conserva la comprobación posterior a ENABLE.
- Siguiente integración: restauración 26/26, pero una carrera ajena interferida por DDL; total 1 falla / 128 pasan / 9 omisiones, 408.72 s. Se agrupó la carga de cada fixture en un viaje SQL y se espera la disponibilidad conjunta de los tres bloqueos DDL con NOWAIT, sin reintentar datos ni aserciones.
- Siguiente: 1 falla / 131 pasan / 9 omisiones, 378.89 s del runner. Las 18 carreras pasan; el positivo antiguo de restauración detectó que se exigía auditoría de reactivación sin un void. Corregida la condición y ampliado el positivo con rearchivo, preservación de estado y número de auditorías. Nueva pasada en curso.
- Typecheck verde. Bash -n de restore-drill.sh y restore-plain.sh verde fuera del sandbox; en sandbox MSYS fue rechazado por permisos del sistema, sin ejecutar ningún drill.

### Corrección T024 · cierre local

Código: `0deaae696b7766a373a9cbdee10e8194b91d6fcb` (protocolo, invariantes, fixture, 32 controles N11, pruebas y docs/TESTING.md). Ninguna migración modificada. PR #66 conserva el borrador y requiere la revisión expresa del protocolo por ChatGPT/gestor antes del merge.

- Iteración siguiente: 2 fallan / 134 pasan / 9 omisiones, 384.31 s. Ambos fallos fueron las aserciones nuevas de estado con CRLF de Windows (active\r / archived\r); el estado SQL y todas las negativas eran correctos. Se normalizan los finales de línea del resultado, sin modificar datos ni expectativas.
- Integración completa final de restauración: **20 archivos pasan / 1 omitido; 138 pruebas pasan / 9 omisiones previstas**, **387.63 s Vitest / 388.33 s del runner**. Incluye **35 casos de restore-planning** (32 corrupciones rechazadas, dos snapshots válidos y manifiesto), los cinco anteriores de restore y todas las carreras.
- Los positivos comprueban **current_user=postgres y rolsuper=false** en juntia-dev, ciclo aprobado, FK compuesta, void posterior a su asiento, histórico archivado y rearchivo tras devolver/retirar. Verifican estado y auditoría intactos, triggers habilitados y FK NOT DEFERRABLE antes del cierre; las negativas comprueban ausencia de sus datos y propiedades originales tras el rollback.
- Endurecimiento adicional del formato de entrada: el caso INSERT ON CONFLICT DO UPDATE se vio en rojo antes de prohibirlo. Solo se admite el sufijo vacío o ON CONFLICT DO NOTHING emitido por pg_dump. Se conserva el header real de search_path y se rechazan las formas SET LOCAL/SESSION y set_config de replicación. **Unidad 8/8** y verify después de este endurecimiento.
- Sintaxis de Bash y JavaScript y git diff --check pasan. Comparación de supabase/migrations: **sin cambios**.

`npm run verify`, fuera del sandbox:

```text
Dominio: 78 pasan
Componentes: 681 pasan / 2 omisiones previstas
Lint: sin errores (warning preexistente balance-panel.tsx:61)
Typecheck: pasa
Primera medición: exit 0, 105.62 s; aviso: supera el presupuesto de 90 s
Segunda medición aislada, mismo código: exit 0, 91.81 s; aviso: supera el presupuesto de 90 s
```

**El aviso de tiempo local permanece abierto**; se conservan ambas mediciones. No se subió ningún umbral ni se cambió la suite para ocultarlo. Los controles funcionales de restauración están verdes; el relanzamiento T024 comprobará el drill completo, los caminos A/B, login y manifiestos en CI. Las 32 variantes N11 están preparadas y sus corrupciones se verificaron por integración/unidad; **el drill completo no se ha ejecutado en dev**. El agente no lanza CI ni marca ready_for_review. T022–T023 y el gate final siguen pendientes.

## Segundo T024 · run 42501082729 (80abe35): diagnóstico y corrección N10

Se leyó el log existente, sin lanzar CI. El job db 128793769610 contiene, en este orden, «Camino A: MANIFIESTO COINCIDE; usuario restaurado entra», «Camino B: MANIFIESTO COINCIDE; base temporal borrada», «N10-couple-invariant: rechazo esperado, exit=1» y «Falló db:restore-drill». No alcanza la confirmación del motivo de N10 ni N11. El reset y GPG aparecen después porque scripts/ci.mjs publica todo stdout antes de stderr: no indican una nueva restauración A fallida. Según el gestor, app y e2e están verdes (439 s).

Causa reproducida: N10 elimina la segunda membresía del grupo al que ahora pertenece el gasto compartido de la fixture P0-3. allocations_check_member rechaza con JT111 antes del validador de invariantes. El grep anterior exigía exclusivamente el marcador RESTORE_INVARIANTS de pareja y terminaba silenciosamente con exit 1. La corrección admite solo ese marcador o JT111/JT119, rechazos específicos de membresía/transición; permisos 42501, FK 23503, otras excepciones y marcadores en DETAIL no satisfacen N10. No se cambia ninguna migración, trigger, permiso ni protocolo transaccional autorizado.

| Cambio | Prueba | Commit |
| --- | --- | --- |
| Etapas, exit y ERR sin comandos/argumentos/log crudo; clasificación SQL segura | restore-diagnostics.test.ts: salida privada falsa, exit 17, test silencioso exit 1, estados permitidos y rechazados | Único commit de esta corrección, el que contiene esta sección |
| Rechazo temprano N10 y conservación del motivo preciso | restore-planning.test.ts: grupo inválido sin P0-3 → invariante; con P0-3 → JT111; rollback y propiedades intactas | Mismo commit |
| Metadatos seguros de rol/propiedad en A y B | describe-role.sql y prueba de integración de las seis tablas; postgres no superusuario con capacidad de dueño en juntia-dev | Mismo commit |

Pruebas vistas en rojo antes del código: los cuatro casos de restore-diagnostics.test.ts fallaron por falta de los módulos de diagnóstico/progreso. Después pasan 4/4; junto a restore-data.test.ts pasan 12/12. Un error inicial de sintaxis del propio test se corrigió antes de esa pasada y no se cuenta como rojo funcional.

Validación final local (solo juntia-dev para base de datos):

- npm run test:integration:dev: exit 0; 141 pruebas pasan / 9 omisiones previstas, 20 archivos pasan / 1 omitido; runner **391.67 s** (Vitest 391.47 s). Incluye restore-planning.test.ts **38 casos** y los cinco casos anteriores de restauración, los 32 negativos P0-3, N10 en ambos contextos y comprobación del rol.
- npm run verify: exit 0, **63.14 s**, dentro de 90 s: dominio 78 pasan; componentes 685 pasan / 2 omisiones; lint sin errores (warning preexistente balance-panel.tsx:61); typecheck pasa. Las mediciones previas se conservan arriba, no se cambió el presupuesto.
- Bash -n: restore-drill.sh, restore-plain.sh y restore-progress.sh pasan; git diff --check pasa; supabase/migrations sin cambios.

A usa DB_URL generado por Supabase local y B PG configurado como postgres por el workflow. No se imprimieron sus valores. Los caminos A/B del run existente demuestran que ALTER/SET CONSTRAINTS y carga ya funcionaban: no hay motivo para cambiar a un rol de mayor privilegio. Se añade una sonda antes de la carga para que el próximo run registre current_user/session_user, superuser, propietarios y capacidad de dueño de ambas conexiones. El rol efectivo local de A aún no se ha observado directamente; en juntia-dev la aserción postgres:false y la capacidad de dueño de las seis tablas pasan. No se ejecutó Supabase local ni el drill completo; esas comprobaciones siguen reservadas al CI del gestor.

**Lista la corrección para un relanzamiento del punto de control por el gestor**, tras un único commit y push. PR #66 sigue en borrador. Sin runs lanzados por el agente ni acceso a producción. T022–T023, T028 del gestor y gate final siguen pendientes.
