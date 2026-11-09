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

**Cierre anterior a F66 (7d1ed14)**: T024 verde en 42508573805; T022–T023 medidos y documentados, sin aumento de workers recomendado; integración 142 verdes / 9 omisiones; completo final 1:false verde (407.98 s), verify final verde (62.55 s). PR en borrador para revisión del gestor y ChatGPT; gate final y producción siguen siendo humanos. Las secciones de avance anteriores se conservan como historial. La validación vigente de F66 está en el cierre de este documento.

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

## T024 cerrado · run 42508573805 · 5be221a

El gestor confirmó el checkpoint [42508573805](https://github.com/flashwp3-ctrl/juntia/actions/runs/42508573805), sobre 5be221ac4bc84b6a9ea955cd64425568d04579e1: **app verde 250 s; db verde 409 s; e2e verde 461 s**. El restore-drill completo con P0-3, sus caminos A/B y los negativos terminan en verde. El job db cierra T024 y las verificaciones ADR-013 [V] 1–7 aplicadas a las migraciones nuevas, con pgTAP, integración, tipos y restauración del mismo commit. El job db supera su presupuesto de aviso de 360 s; e2e queda a 19 s del tope bloqueante de 480 s. No se alteran presupuestos ni se lanza CI adicional por el agente.

T022–T023 empiezan después de este checkpoint, conforme a la precisión del gestor. La configuración de workers que use CI no se fija aquí: T036 pertenece al PR B. El gate del commit final lo lanzará el gestor al marcarlo listo después de su revisión y la de ChatGPT.

Lectura del job db 128816477634 del run verde: A informa current_user=session_user=postgres, superuser=false; B informa postgres, superuser=true. Las seis tablas son propiedad de postgres y can_act_as_owner=true en ambos caminos. Queda resuelta con salida real del runner la duda del rol local; no se cambió ningún rol ni privilegio. Marcador final: «ENSAYO LISTO: A y B, diez controles previos y 32 controles P0-3 rechazados». Check generated types, Test API y restore-drill constan success.

## T022–T023 · medición de workers

T022 usa una sola variable opt-in, JUNTIA_PLAYWRIGHT_MEASURE=W:true|false (W = 1, 2 o 4). Sin variable, ni workers ni fullyParallel se fijan: se conserva exactamente el default previo. e2e:dev valida la variable antes del guardia/lock y la hereda al hijo; no se abre la lista blanca F55-1. En modo de medición se excluyen @mail y @serial en la primera pasada de cada proyecto y se corre @serial aparte con --workers 1. Cero reintentos; axe serial sin casos se permite explícitamente. Los dos casos de motion activo, y solo esos, se etiquetan @serial.

Test primero: suite nueva en rojo por módulo de medición inexistente; después 63 pasan / 2 omisiones al ejecutar junto a dev-target-tools. Se consolidaron los 13 casos nuevos dentro de tests/dev-target-tools.test.ts (la prueba de e2e-plan, como pide T022). Cubren defaults, seis combinaciones, entradas inválidas, filtros, dos pasadas por proyecto y rechazo de workers/config/grep-invert externos. Antes de la primera medición hubo un build fallido por un parámetro sin tipo en ese test (8.07 s); se corrigió y no se cuenta como resultado de workers porque no arrancó Playwright.

Entorno: Windows, i7-12700H, 20 CPU lógicas, 16 GiB, Node 24.22.1, Playwright 1.64.1. App de producción local en PORT=3400, solo juntia-dev, guardia y lock por cada comando. Las muestras no se solaparon entre sí ni con verify. Durante 1:false se ejecutó un typecheck breve (3.8 s); se conserva como factor de ruido de esa muestra. No es un benchmark de laboratorio controlado. Orden: 1:false, 1:true, 2:false, 2:true, 4:false, 4:true. Una muestra por combinación; no se reintentaron los fallos. Los datos por cuenta y pareja son sintéticos y únicos; no se reinicia el proyecto entre muestras. Estos tiempos no incluyen instalación/Supabase del runner y no son equivalentes al tiempo del job de CI.

Cada comando dirigido incluye las specs 1–3 (access-account, annotate, couple-settle) y los cuatro archivos axe existentes (routes, couple, couple-shared, balance). Todos se pasan por sus rutas .e2e.ts/.a11y.ts a npm run e2e:dev. Cada combinación selecciona 26 E2E en primera pasada, 2 E2E seriales y 94 casos ligeros axe; la pasada axe serial selecciona 0 casos. Quedan fuera @mail (4 E2E, solo CI), @sweep y evidence, como siempre. Con 4 workers y fullyParallel=false solo hay 3 workers efectivos de E2E porque hay 3 archivos; axe tiene 4.

| Workers | fullyParallel | Build s | E2E sin serial s | Serial E2E / axe s | Axe sin serial s | Total s | Fallos | Aislamiento* |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | false | 9.44 | 162.03 | 16.55 / 3.35 | 277.66 | 471.15 | 0 | RLS4 verde |
| 1 | true | 10.63 | 151.80 | 17.42 / 3.44 | 283.79 | 468.11 | 0 | RLS4 verde |
| 2 | false | 12.99 | 115.87 | 16.47 / 2.48 | 236.83 | 385.79 | 0 | RLS4 verde |
| 2 | true | 9.17 | 105.81 | 17.91 / 2.72 | 146.65 | 283.24 | 1 E2E | RLS4 verde |
| 4 | false | 9.36 | 86.54 | 16.10 / 3.43 | 216.62 | 333.06 | 1 E2E | RLS4 verde |
| 4 | true | 8.95 | 82.86 | 16.30 / 3.46 | 90.35 | 202.93 | 1 E2E + 2 axe | RLS4 verde |

El total incluye listado @mail y arranque de procesos/servidores, además de las columnas; las pasadas seriales vacías también tienen ese coste. Salidas originales de las seis ejecuciones en logs locales ignorados workers-W-P.log; esta tabla transcribe todas las filas del resumen del runner.

Los tres fallos E2E son couple-settle.e2e.ts, «gasto compartido 50/50», línea 54: no encuentra data-counting-amount visible para $186.400 en 5 s. El contexto conservado de 4:true muestra heading Actividad, contexto Nosotros y «Gasto compartido de noviembre $186.400», con el movimiento correcto. Es coherente con el fallback existente de annotate-provider.tsx que, tras 60 cuadros sin fila confirmada visible, navega a Actividad; es una inferencia apoyada por el contexto y el código, no una traza temporal. No se cambió ese comportamiento ni la aserción para esconder el fallo. Con 4:true, los dos casos axe couple-shared (light/dark) agotan 30 s al llegar a la lista de revisión de Mover a Pareja, línea 130; no son violaciones axe y no se subió ningún timeout.

**Propuesta inicial retirada tras T026: 2 workers, fullyParallel=false**, con primera pasada sin @serial y segunda con @serial y 1 worker. Reducción local de 85.36 s (18.1 %) frente a 1:false. No se recomiendan los modos con fallos aunque sean más rápidos. No se fija esa combinación en CI: T036 pertenece al PR B; el default de este PR sigue sin cambiar. El control de cuatro parejas pasó sin lecturas cruzadas; la adopción sigue condicionada al gate final del gestor; no garantiza por sí sola bajar el job de CI de 480 s.

*Aislamiento: control común de integración, no un contador instrumentado entre los procesos Playwright de cada fila. La prueba T023 siembra concurrentemente cuatro parejas doradas por el mismo seedCouple que usan los workers (índices 40–43), verifica 12 IDs distintos (4 grupos y 8 personas), ocho archivos de sesión diferentes y los datos propios de cada pareja. Desde Sara y Tomás de las otras tres parejas consulta explícitamente los IDs ajenos en goals_overview, budget_history, couple_expenses y my_transactions: **96 consultas, todas vacías y sin errores**. Las pruebas E2E de privacidad HTML/RSC/prefetch también pasan en las seis combinaciones; no se observó fuga de datos. Los fallos de los tres modos descartados fueron los de interfaz/tiempo descritos arriba.

Cierre de integración: npm run test:integration:dev, **20 archivos pasan / 1 omitido; 142 pruebas pasan / 9 omisiones previstas**, Vitest **434.02 s**, paso **434.67 s**, runner **434.82 s**. seed.test.ts pasa 4/4, incluida la prueba nueva (30.589 s). Las propiedades de aislamiento de la propuesta 2:false quedan comprobadas en la capa RLS; las duraciones siguen siendo solo iteración de dev. No se cambiaron las políticas para obtener el resultado ni se accedió a producción.

## T026 · cierre y sincronización de S4

Primer completo, sin argumentos dirigidos y con JUNTIA_PLAYWRIGHT_MEASURE=2:false: **415.39 s, exit 1**, 26 E2E no seriales y 94 axe pasan; una de las dos seriales falla. Es un fallo distinto de los de la matriz: S4 registra solo 2 valores distintos cuando la prueba lee el MutationObserver, y la aserción exige más de 2. El log muestra «4 cambios; animando: 2». Se conserva en workers-final-e2e-before-s4.log; no se cuenta como una pasada verde ni se reintenta sin cambios.

Causa de sincronización en el test: SharedBalance cambia LIQUIDADO y el heading al aplicar la confirmación, mientras data-s4 permanece animating hasta acabar S4. La prueba esperaba esos textos y leía el observer inmediatamente, antes del final de la animación. Se añade espera al inicio registrado por el observer y a la retirada de data-s4=animating antes de leer la muestra final. **No se toca la app**, no se debilitan las aserciones de animación/valores intermedios, ni se añade timeout fijo, reintento o cambio de presupuesto. Es una corrección de sincronización del caso medido de T023/T026, sin decisión nueva de producto.

La matriz anterior conserva las seis muestras originales, todas tomadas con el mismo test anterior; no se reemplazan por cifras posteriores. El cambio afecta solo a la espera del paso serial común de 1 worker, no al reparto de las otras pasadas.

Después de verlo en rojo, prueba dirigida: npm run e2e:dev -- tests/e2e/couple-settle.e2e.ts --grep 'motion activo', sin variable de medición: **1/1 pasa**, 28.91 s del runner; S4 observa **41 cambios, 38 animando**. Se ejecuta un segundo completo por esta corrección concreta; su salida se registra a continuación.

verify previo a la corrección del test: **exit 0, 61.03 s**, dominio 78; componentes 698 pasan / 2 omisiones previstas; lint sin errores (warning preexistente balance-panel.tsx:61); typecheck pasa. Se repite verify después del completo corregido, justo antes del push, como pide T026.

Segundo completo con 2:false, tras la espera correcta de S4: **425.61 s, exit 1** (workers-final-e2e-2-false.log). Fallan el E2E 50/50 (héroe de Inicio no encontrado), el caso serial E5 antes de llegar a S4 (héroe $2.940.000 no encontrado, tras observar el anterior $2.840.000) y axe compartido light por timeout global de 30 s esperando el conflicto «Tomás cambió este gasto antes». Pasan 25 E2E no seriales, 1 serial y 93 axe. La espera añadida a S4 no modifica ninguno de esos puntos de fallo.

**La propuesta 2:false queda retirada. No se considera demostrado que aumentar workers sea estable**, aunque las pruebas de RLS sí pasan sin cruces. El fallo en una pasada ya forzada a 1 worker impide atribuir toda la inestabilidad a la concurrencia. No se cambian los flujos ni sus aserciones para recomendar paralelismo; no se fija ningún número de workers en CI.

Siguiente control de entorno, después de acabar y soltar el lock: npm run db:dev:reset **pasa, 10.79 s**, 11 migraciones y esquema tests confirmado. Elimina solo las fixtures sintéticas acumuladas en juntia-dev; el guardia se ejecuta y no se usa --force ni se toca producción. Se comprueban primero, dirigidos, los dos recorridos afectados con 1:false sobre ese estado fresco, como el arranque del runner; solo después se valida el completo con ese perfil. La matriz anterior no se sustituye por estas salidas.

Control dirigido después del reset: JUNTIA_PLAYWRIGHT_MEASURE=1:false; npm run e2e:dev -- tests/e2e/couple-settle.e2e.ts --grep 'gasto compartido 50/50|motion activo': **2/2 pasan**, primera pasada 8.99 s, serial 11.44 s, runner **30.51 s**. S4 registra 41 cambios, 38 animando. Se pasa al completo sin argumentos con 1:false; la recomendación final es **no fijar un aumento de workers ni fullyParallel**. Las opciones de mitigación siguientes pertenecen al PR B; no se cambia su alcance aquí.

### Cierre local final · 1:false

Completo sin argumentos dirigidos, JUNTIA_PLAYWRIGHT_MEASURE=1:false, después del reset y de los dos recorridos dirigidos: **exit 0, 407.98 s**. Salida en workers-final-e2e-1-false.log: build 8.68 s; E2E no seriales **26/26, 123.10 s**; seriales **2/2, 17.98 s**; axe **94/94, 254.87 s**; axe serial **0 casos, 2.39 s** de proceso. S4: 41 cambios, 38 animando. Siguen omitidas por contrato las cuatro E2E @mail y el barrido @sweep; no se lanzaron correos ni el proyecto evidence contra dev.

**Recomendación final T023: no fijar un aumento de workers ni activar fullyParallel en CI.** Para este cierre local se usó 1:false. Las seis muestras y las dos pasadas completas fallidas posteriores quedan registradas; 2:false dejó de cumplir cero fallos y no se conserva su propuesta inicial. El control común RLS de cuatro parejas sí pasó sin cruces. La matriz se tomó en orden, con fixtures acumuladas y una sola muestra por combinación; los tiempos y el control posterior limpio no aíslan por sí solos la causa de la degradación (concurrencia, volumen o latencia). No se afirma que reiniciar arregle un defecto de la app ni se ocultan los fallos de dev.

T036 permite no tocar el job si T023 no demuestra seguridad/estabilidad; el PR B seguirá las siguientes mitigaciones del contrato sin elevar el tope. Este PR conserva los defaults sin variable, el workflow y sus presupuestos. El tope bloqueante de 480 s sigue vigente: el checkpoint en CI fue 461 s; 407.98 s de dev no garantiza el tiempo del gate final.

| Tarea | Estado de este cierre | Commit / prueba |
| --- | --- | --- |
| T001 | Hecha por el gestor | Sin cambios |
| T002–T021 | Implementadas y regresiones verificadas | Mapa anterior; checkpoint verde 42508573805 sobre 5be221a |
| T022 | Configuración opt-in y lista blanca preservada | Commit de este cierre; dev-target-tools 63 pasan / 2 omisiones |
| T023 | Seis combinaciones, dos pasadas y control de aislamiento; no se adopta aumento | Commit de este cierre; matriz completa, RLS 96/96 lecturas ajenas vacías |
| T024 | Verde, cerrado por el gestor | Run 42508573805, SHA 5be221a; tipos, db y restaurador verdes |
| T025 | Evidencia actualizada | Este documento conserva rojos, verdes, tiempos y límites |
| T026 | Completo local verde; verify final se registra debajo | 407.98 s, 122 pruebas; revisión de ChatGPT pendiente, PR en borrador |
| T027 | Pendiente, humana | Revisión del gestor, ChatGPT y gate ready_for_review sobre el SHA final |
| T028 | Pendiente, humana después del merge | No se utiliza producción desde esta rama |

No se modifican spec.md, plan.md, tasks.md, las migraciones ni el workflow. No se implementa ningún entregable de PR B–E. Sin procesos ajenos terminados, sin puertos 3000/3100, sin lock forzado, sin valores de .env.test publicados y sin runs de CI lanzados por el agente. El mapa con el SHA concreto de este cierre se publica en la descripción del PR.

verify final después del completo verde: **exit 0, 62.55 s** (presupuesto sin cambios <90 s); dominio **78/78**, componentes **698 pasan / 2 omisiones previstas**, 55 archivos. Lint sin errores (solo el warning preexistente balance-panel.tsx:61); typecheck pasa. git diff --check pasa; comparaciones de migraciones, workflow, spec.md, plan.md y tasks.md sin cambios en este cierre. Los logs de validación permanecen locales e ignorados; no se versionan sesiones ni credenciales.

## Revisión final del PR #66 · F66-1 y F66-2

El gestor comunicó la revisión de ChatGPT sobre 7d1ed14: solo F66-1 y F66-2 pendientes; el resto aprobado. Autorizó corregir 20261107230952_goal_funding.sql porque aún no se aplicó en producción. Solo se cambia esa migración, el tipo de respuesta del adaptador, las regresiones de integración y esta evidencia. No se cambia el protocolo de restauración ni el workflow.

**Rojo previo al SQL**: npm run test:integration:dev contra juntia-dev, **3 fallan / 142 pasan / 9 omisiones previstas**, Vitest 375.07 s, runner 376.30 s. F66-1: el UPDATE de la segunda sesión con versión obsoleta resuelve en lugar de devolver JT011. F66-2: la creación financiada privada deja create_transaction adicional y la compartida deja create_shared_expense adicional. No se imprimieron claves.

**F66-1**: con el movimiento ya bloqueado, remove_goal_usage devuelve fondos y cancela la solicitud, luego actualiza version, updated_at y updated_by y exige row_count=1. La auditoría conserva versión y metadatos antes/después; el resultado versionado se guarda en su registro idempotente. El auxiliar común de devolución y las dos anulaciones no se cambian. La regresión usa dos sesiones reales: Tomás quita el uso, Sara intenta editar con la versión anterior, y el reintento de Tomás verifica el mismo resultado y una sola auditoría.

**F66-2**: insert_transaction reutiliza la inserción privada/compartida, las partes, su validación y la auditoría sin crear/completar registros de idempotencia. Los campos privados conservan la validación previa a la huella y los compartidos reutilizan shared_fields. Las RPC existentes preservan su huella, permisos, respuesta e intención. El gasto con meta llama al auxiliar bajo la única intención exterior. Ambos auxiliares son invoker con search_path vacío, revocados a public/anon/authenticated y ejecutables por juntia_writer. La regresión privada/compartida compara el inventario de acciones por actor antes y después: delta exacta de un registro, misma respuesta al repetir y JT008 con otra huella.

SQL verde: npm run test:db:dev **126.63 s**, reinicia 11 migraciones, confirma esquema tests y pasa todo pgTAP (**20 archivos, 1091 aserciones**, incluidos 483 controles de privilegios y 88 de metas). No se lanzó CI; el gate del SHA final es del gestor.

Primera integración con el SQL corregido: **144 pasan / 1 falla / 9 omisiones**, 390.46 s. Pasan las tres F66, las 18 carreras de metas y los 38 casos de restore-planning. Falla la carrera existente regenerate_invitation contra aceptar, primero aceptar: JT011 en vez de JT103 al comprobar el perdedor. En el rojo anterior a F66 ese caso pasaba. La barrera registró ambos PID esperando; el error es compatible con que regenerar ganara y dejara la versión obsoleta. La prueba y ambas RPC de invitación están fuera del diff. Se conserva el fallo y se hace una sola comprobación completa tras reset limpio, sin cambiar esa prueba, sus expectativas ni los timeouts.

Comprobación tras db:dev:reset (9.97 s), con el mismo código: **20 archivos pasan / 1 omitido; 145 pruebas pasan / 9 omisiones previstas**, Vitest 374.54 s, runner **375.56 s**. Incluye la carrera de invitaciones, las tres F66, la restauración y las regresiones de las RPC antiguas. No se subió ningún timeout ni se cambió la prueba que falló.

E2E completo F66: reset previo **8.65 s**, luego npm run e2e:dev sin argumentos, PORT=3400, perfil local conservador 1:false, cero reintentos: **exit 0, 431.43 s**. Build 14.24 s; 26 E2E no seriales 122.75 s; 2 seriales 15.53 s; 94 axe 273.44 s; pasada axe serial vacía 3.63 s. S4: 41 cambios, 38 animando. Siguen fuera cuatro E2E @mail, @sweep y evidence según contrato. Este tiempo local no sustituye la medida del job e2e de CI (461 s en T024, tope 480 s). No se cambió ninguna opción del workflow ni se lanzó CI.

verify final **59.80 s, exit 0**: 78 dominio, 698 componentes verdes y 2 omisiones previstas, typecheck verde y solo el aviso preexistente de balance-panel.tsx:61. git diff --check pasa. SQL e integración/e2e completos verdes; no se tocó producción. F66-1 y F66-2 se publican en un solo commit y un solo push con el PR en borrador; gate ready_for_review a cargo del gestor.


---

# Evidencia · 004 · PR C · Metas, aportes, retiros y S5

Rama `claude/004-c-goals-6b13e8`, sobre `main` en `bd408b9` (PR A fusionado). Tareas T042–T053 y T044a; T054–T056 son humanas. Todo lo de esta sección se ejecutó en local o contra `juntia-dev` con los scripts `:dev`, el guardia y el lock (`PORT=3500`); **no es evidencia de CI** (ADR-011 §9.8) y no se lanzó ningún run. El lock no se forzó nunca: cuando lo tenía la sesión del PR B, se esperó a que lo soltara.

## T042–T044 · pruebas escritas primero (commit `e33bf8e`)

- Componentes: `src/features/goals/goals.test.tsx` (GoalCard con los siete `goal_type`, «Lo lograron» y excedente; GoalStack 0/1/2/3+ y «Ver todas»; Metas en Yo y Nosotros; Registrar aporte sin «¿Quién aporta?» y vista previa 11.840.000 · 65 %; Retirar con máximo y motivo; fila de retiro que no parece ingreso; historial con anulados y filtros; inmersiva con movimiento reducido; iconos `flag-banner`, `piggy-bank`, `arrow-u-up-left`, `flag-checkered`), `goal-undo.test.tsx` (deshacer único con tres orígenes: aporte, retiro y liquidación de la 003), `src/features/home/home-goals.test.tsx` y `src/features/activity/activity-goals.test.tsx`.
- Spec E2E 4: `tests/e2e/goals.e2e.ts` (2 casos). Axe: `tests/a11y/goals.a11y.ts` (ligero: 1 caso por tema a 390 con 9 estados; `@sweep`: siete anchos, 200 %, teclado y 44 px). Registro de axe: `/metas/[id]` con el estado «Meta no encontrada».

## T044a · rojo

- Componentes (local): `npx vitest run --project components src/features/goals src/features/home/home-goals.test.tsx src/features/activity/activity-goals.test.tsx` → **4 archivos fallan, 9 pruebas fallan**; `goals.test.tsx` no carga («Failed to resolve import "./goal-card"»), el resto por ausencia (`offerGoalUndo is not a function`, región «Apartado para metas» no encontrada, radio «Aportes» no encontrado).
- E2E y axe contra `juntia-dev`: la primera corrida no llegó a las pruebas porque `next build` hace typecheck de todo el repo y las pruebas de componentes referían módulos inexistentes («Failed to type check», 26,5 s). Para ver la E2E fallar por la funcionalidad se apartaron **temporalmente** esos cuatro archivos (sin commit) y se repitió:
  - `npm run e2e:dev -- tests/e2e/goals.e2e.ts`: build **pasó (9,44 s)**, **2 fallan** — «meta compartida…»: `getByRole('heading', { name: 'Todavía no tienen metas' })` no encontrado; «Metas en Nosotros: ni el HTML…»: el control positivo no encuentra «Japón compartido» en `/metas`. La siembra pasó en los dos.
  - `npm run e2e:dev -- tests/a11y/goals.a11y.ts` (A11Y_JOB=e2e): build **pasó (8,16 s)**, **2 fallan** (light y dark), por el mismo encabezado ausente.
  - Después se restauraron los archivos (`git checkout -- src/features`).

## T045–T050 · implementación (commits `4974554`, `a17858b`)

- Metas (`src/app/(app)/metas/page.tsx`, `loading.tsx`), meta inmersiva (`metas/[id]/page.tsx`), `src/features/goals/*`, bloques de Inicio (`src/features/home/goals-home.tsx`) y asientos en Actividad (Yo y Nosotros, también en el detalle). Lecturas en `src/features/goals/load.ts`: en Nosotros solo `goal_scope = 'shared'` (y `goal_member_balances` solo de esos ids); en Yo `goals_overview` en una consulta y el total de `goals_totals` con `personal`. Server Actions en `src/features/goals/actions.ts` con `ok`/`rejected`/`unknown`, 15 s y `write_status`. El «Deshacer» de aportes y retiros usa la máquina única del proveedor de Anotar (`offerGoalUndo`, con su propio «Comprobar estado» para funcionar sin pareja).
- Ninguna migración nueva; `src/lib/db/goals.ts` gana `goalMemberBalancesFor` y `getGoal` (lecturas).

## T051 · iteración dirigida contra `juntia-dev`

| Corrida | Resultado |
| --- | --- |
| `e2e:dev -- tests/e2e/goals.e2e.ts` (1.ª) | 2 fallan: el radio nativo del tipo era `sr-only` y no se podía pulsar (timeout 30 s); y la prueba de privacidad contaba como fuga el id de la meta personal en `/metas/{id_personal}`, donde vuelve solo porque es la URL pedida (no salen nombre ni importes). Arreglos: el radio cubre la ficha con opacidad 0; el marcador del id no se aplica a la ruta que lo contiene; `test.slow()` en el recorrido de dos sesiones |
| `e2e:dev -- tests/e2e/goals.e2e.ts` (2.ª) | **2/2 pasan, 43,7 s** (build 12,19 s, total 58,32 s) |
| `e2e:dev -- tests/a11y/goals.a11y.ts` (1.ª) | 2 fallan: `color-contrast` (gris secundario sobre el verde de ahorro, 4,38:1; y medición durante el fundido de entrada de la inmersiva) y `label-content-name-mismatch` en el enlace de la tarjeta. Arreglos: texto en tinta sobre el fallback (como pide GoalCard), nombre del enlace por un texto oculto y contenido visual `aria-hidden`, sin fundido propio con movimiento reducido |
| `e2e:dev -- tests/a11y/goals.a11y.ts` (2.ª) | **2/2 pasan, 46,5 s** |

Componentes y dominio (local): **815 pasan / 2 omisiones previstas** tras ajustar `src/app/(app)/product-routes.test.tsx`, que exigía Metas «sin datos» (FR-044 de la 002): Metas ya lee metas reales y se prueba en `src/features/goals`, como antes pasó con Inicio y Actividad. `tests/a11y/job-selection.test.ts` falló una vez mientras la sesión del PR B usaba el puerto; aislado, pasa.

## T052 · [V] View Transitions con App Router — **queda abierta**

Prueba temporal (no versionada) contra `juntia-dev` con `npm run e2e:dev`: siembra una pareja y una meta, abre la tarjeta en Metas, comprueba el foco y cierra con Escape. Envuelve `Document.prototype.startViewTransition` para contar las transiciones y leer sus pseudoelementos.

Navegador: **Chromium 156.0.8078.4** (Playwright 1.64.1, headless). Resultado: **4/4 pasan, 24,1 s**:

```
{"T052":"con API","motion":"no-preference","browserName":"chromium","version":"156.0.8078.4","startViewTransition":true,"open":[],"close":[]}
{"T052":"con API","motion":"reduce","browserName":"chromium","version":"156.0.8078.4","startViewTransition":true,"open":[],"close":[]}
{"T052":"sin API (respaldo Motion)","motion":"no-preference","browserName":"chromium","version":"156.0.8078.4","startViewTransition":false,"open":[],"close":[]}
{"T052":"sin API (respaldo Motion)","motion":"reduce","browserName":"chromium","version":"156.0.8078.4","startViewTransition":false,"open":[],"close":[]}
```

- **Se cumple** en los cuatro casos: la ruta se abre, el foco va al título (`h1`), Escape vuelve a `/metas` y el foco vuelve a la tarjeta de origen; el valor final está en el DOM.
- **No se cumple**: React no inicia ninguna View Transition al abrir ni al cerrar (`open: []`, `close: []`), y el respaldo `layoutId` tampoco anima. Causa: el morph solo ocurre si el destino se pinta en el mismo commit que la navegación (página precargada; guía de View Transitions de Next 16). `/metas/[id]` es dinámica (cookie de contexto y base) y suspende primero en `metas/loading.tsx`, así que no se forma el par.
- **WebKit**: no está instalado en este equipo (solo `chromium-1248` en `ms-playwright`); instalarlo es una descarga que no se hizo sin permiso. Sin salida de WebKit.
- **Back-swipe de iPhone**: con los aplazados de la decisión 19.1.
- Opciones para el gestor, no decididas aquí: (a) precarga completa del enlace de la tarjeta, revisando la regla de prefetch por contexto de la 003; (b) quitar el límite de carga de `/metas/[id]` y aceptar la espera sin Skeleton; (c) aceptar la entrada sin morph en P0-3 y cerrar el `[V]` como «no cumple».

## T053 · capturas e Impeccable

- Capturas locales contra `juntia-dev` con el dataset dorado y aportes del mes, a **390 y 1440 en claro y oscuro**, en `specs/004-presupuestos-y-metas/evidence/pr-c/capturas/` (40 PNG): Metas en Nosotros (pila y abanico) y en Yo, Inicio y Actividad en los dos contextos, la meta inmersiva con historial y las hojas de aporte, retiro y editar. Son capturas de iteración, no de CI; en las de página completa la barra inferior fija aparece a media página, y las hojas pueden salir a mitad de su fundido de 120 ms.
- Impeccable (`critique`, solo revisión). Detector: `impeccable detect --json src/features/goals src/features/home/goals-home.tsx` → **`[]`, exit 0**. Sin superposición en el navegador: la app solo corre contra `juntia-dev` bajo el lock. Revisión de diseño en un subagente aislado: 27/40 en Nielsen, «específico de Bosque & Arena», 8 hallazgos. Corregidos en `a17858b`: la capa que asoma cortaba su título y tapaba el ícono; el abanico tapaba los nombres de atrás y dejaba hueco antes de «Crear meta»; «Disponible tuyo» aparecía en la fila de la pareja (ahora «Tus aportes» y «Aportes de {nombre}»); «Anular aporte» se repetía como botón de texto en cada fila (ahora botón de ícono de 44 px); los aportes iban antes que los gastos dentro del día; una sola meta personal quedaba estrecha en escritorio; y se restituye el anillo de foco del título. Además, un colapso de márgenes ocultaba las capas de la pila en móvil (visto en las capturas). **Abierto**: el campo de fecha nativo se ve «11/09/2026» en un navegador en inglés; comprobar con es-CO.

## T051 · cierre local antes del push

- `PORT=3500 npm run e2e:dev` **completo, una vez**, sin argumentos y sin variable de medición (defaults del repo): **exit 0, 342,90 s**. Build 14,06 s; E2E sin @mail **30/30, 82,12 s** (incluye la spec 4); axe con sesión **98/98, 245,10 s** (incluye `goals.a11y.ts` ligero y `/metas/[id]` del registro). Fuera, por contrato: las E2E @mail, `@sweep` y el proyecto evidence.
- `npm run verify`: **exit 0, 61,26 s** (presupuesto < 90 s). Dominio **78/78**; componentes **743 pasan / 2 omisiones previstas**, 59 archivos; typecheck verde; lint sin errores (solo el aviso preexistente de `balance-panel.tsx:61`).
- **Presupuesto del job `e2e` (riesgo)**: la spec 4 añade ~44 s y el axe de metas ~47 s en `juntia-dev`. El checkpoint del PR A midió 461 s en CI con tope bloqueante de 480 s; con lo de este PR es probable que el gate lo supere. No se tocó el workflow ni el tope; la medición y la mitigación (a → b → c de contracts/ci.md) son del gestor en el gate (I2).

| Tarea | Estado |
| --- | --- |
| T042–T044 | Hechas (`e33bf8e`) |
| T044a | Hecha: rojo local y contra `juntia-dev`, salidas arriba |
| T045–T050 | Hechas (`4974554`, `a17858b`) |
| T051 | Hecha: dirigidas en verde, completo y `verify` en verde |
| T052 | **Abierta**: Chromium sí (salida arriba), sin morph; WebKit sin instalar |
| T053 | Hecha: 40 capturas, detector y revisión de Impeccable con sus correcciones |
| T054–T056 | Humanas (gestor y fundadores) |
