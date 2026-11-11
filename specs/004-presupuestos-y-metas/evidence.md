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

# Evidencia · 004 · PR B · Plan y presupuestos

Rama `feat/004-b-plan-budgets`, sobre `main` en `bd408b9` (PR A fusionado). Todo lo de abajo es **iteración contra
`juntia-dev`** (decisión 18) o local: no es evidencia de CI (ADR-011 §9.8); el gate es la pasada `ready_for_review` que
lanza el gestor. Sin runs lanzados por el agente, sin migraciones nuevas, sin producción, sin `--force` del lock. El
`juntia-dev` se compartió con la sesión del PR C: cada corrida esperó a que el lock estuviera libre y lo soltó al terminar.

## Commits

| Commit | Qué |
| --- | --- |
| `0d75086`, `20ae0f6` | Encargo del gestor: `document-title` intermitente de `routes.a11y.ts` (run 42543237243). Sin cambio de comportamiento |
| `dea1bdc` | T029–T032, pruebas en rojo (y el copy de Plan, para que fallen por la funcionalidad y no por cadenas) |
| `3d7fbc3` | T033–T034, Plan y la hoja de presupuesto |
| `5d3b288` | T035, selector de specs y su integración en el job `e2e` |
| `41a995e` | T037–T038, revisión de acabado (Impeccable) y barrido local |
| `eebd501` | Spec 5: textos dentro de `main` (fallo del `e2e:dev` completo) |

## Encargo del gestor · `document-title` (run 42543237243)

Causa, leída en el log del intento 1 del job `e2e`: `toHaveTitle(/\S/)` pasó y **después** axe vio el `<title>` vacío. Tras la
Server Action de M3b, `router.refresh()` vuelve a transmitir los metadatos y React quita y pone el título; el escaneo es
asíncrono y dura segundos, así que la espera previa no bastaba. `analyzeAtRest` (`tests/support/a11y.ts`) corre todas las
reglas salvo `document-title`, espera a que `document.title` no esté vacío (espera de Playwright, sin tiempos fijos) y solo
entonces corre `document-title` con el axe ya inyectado, y une sus violaciones. Las reglas auditadas no cambian; sin título,
falla igual. Lo usan `routes.a11y.ts` y el `axe()` común.

- `npm run e2e:dev -- tests/a11y/routes.a11y.ts --grep "M3b"`: **2/2**, 17,8 s.
- La primera versión reinyectaba axe con un segundo `AxeBuilder`: en el `e2e:dev` completo, `couple-shared.a11y.ts` (muchos
  estados en un test) pasó de su límite de 30 s dos veces. Con el axe ya inyectado (`20ae0f6`), ese test baja de
  23,5–29,5 s a 17–19 s por tema; `--grep "Nosotros · axe|M3b"` **4/4**, 41,8 s.

## T036 · workers

Confirmado en la sección T022–T023 de arriba: la propuesta 2:false se **retiró** («No se considera demostrado que aumentar
workers sea estable»; recomendación final: no fijar aumento ni `fullyParallel`). **No se tocan los workers del job `e2e`**;
el workflow solo gana el selector. Si el gate pasa de 480 s, rige la mitigación de contracts/ci.md: (a) no es segura, (b)
ya aplicada en la spec 5, (c) fundadores.

## T032a · rojo contra `juntia-dev`

Local antes del código: dominio `budgets.test.ts` **6 fallan / 9 pasan** (`budgetChangeKind is not a function`);
`src/features/plan/plan.test.tsx` y `tests/e2e-select.test.ts` fallan al importar módulos que no existen.

`next build` comprueba los tipos de los tests, así que para el rojo E2E se apartaron un momento esos tres archivos de unidad
(restaurados después y commiteados con el resto). Así el rojo es de la funcionalidad, no del build:

- `npm run e2e:dev -- tests/e2e/budgets.e2e.ts`: build pasó 10,21 s; **2 fallan** — test 1 en `getByText('$240.000 · sin
  presupuesto')` (Plan seguía provisional); test 2 en el control positivo (el HTML de Nosotros no trae el presupuesto
  compartido sembrado). La siembra (pareja, seis compartidos y `create_budget` real) funcionó en los dos.
- `npm run e2e:dev -- tests/a11y/plan.a11y.ts`: build pasó 9,28 s; **1 falla** en
  `getByRole('img', { name: 'Mercado: 640.000 de 900.000, 71 %' })`.

## Verde

- Componentes `src/features/plan`: **21/21** (BudgetIndicator en sus cinco estados, la hoja, el historial, Plan sin
  presupuesto, primera persona en Yo, nada en el almacenamiento). Dominio `budgets`: **15/15**. Selector: **18/18**.
- `npm run e2e:dev -- tests/e2e/budgets.e2e.ts tests/a11y/plan.a11y.ts`: **2/2** E2E (≈14 s y ≈12 s) y **1/1** axe (10
  estados: Nosotros con presupuesto, hoja con historial, conflicto, crear y Yo sin presupuesto, claro y oscuro, **0
  violaciones**).
- Barrido local, `A11Y_LEVEL=sweep npm run e2e:dev -- tests/a11y/plan.a11y.ts`: **2/2**. 56 mediciones (cuatro pantallas ×
  siete anchos × dos temas) sin scroll horizontal; 200 % sin scroll ni texto cortado en las cuatro; 44 px: «Editar el
  presupuesto de Mercado» 366×94, «Crear presupuesto de Hogar» 53,9×44, «Crear presupuesto» 350×52, «Límite mensual»
  350×85,6, «Guardar cambios» 350×52, «Desactivar presupuesto» 350×44; teclado: fila → Enter → foco en el límite; Escape
  cierra; «Crear» de una fila → foco en el límite. La primera pasada encontró dos fallos reales, corregidos en `41a995e`: el
  botón opcional se salía a 200 % y el foco inicial no llegaba al límite (AmountInput usa su propia ref).
- El barrido oficial (`@sweep`, T039) sigue siendo del gestor en CI.

## `e2e:dev` completo y `verify` (antes del push)

Tres corridas completas, sin argumentos, PORT=3400, workers por defecto de `e2e:dev`:

| # | Commit | Resultado | Fallo |
| --- | --- | --- | --- |
| 1 | `41a995e` | exit 1, 390,99 s; E2E 29/30, axe 94/95 | Spec 5, primera aserción: `getByText` vio la copia oculta que Next transmite fuera de `main` (`loading.tsx` nuevo) → `eebd501`. Y `couple-shared` light, límite de 30 s en «Mover a Pareja» |
| 2 | `eebd501` | exit 1, 389,39 s; E2E **30/30**, axe 94/95 | `couple-shared` dark, límite de 30 s dentro de `analyzeAtRest` → `20ae0f6` |
| 3 | `20ae0f6` | **exit 0, 320,85 s**; build 10,72 s; E2E **30/30** 62,70 s; axe **95/95** 246,19 s | — |

Siguen fuera por contrato las E2E `@mail`, `@sweep` y `evidence`. Este tiempo local no mide el job de CI (461 s en T024,
tope 480 s); la spec 5 añade dos tests de ≈14 s y ≈13 s y `plan.a11y.ts` uno de ≈20 s.

`npm run verify` final sobre `20ae0f6`: **exit 0, 81,87 s** (< 90 s); lint sin errores (solo el aviso preexistente de
`balance-panel.tsx:61`), typecheck, dominio **84/84**, componentes **735 pasan / 2 omisiones previstas**. `git diff --check`
pasa.

## Selector (T035) sobre este PR

`node scripts/e2e-select.mjs --base origin/main` en la rama: corren `access-account`, `annotate`, `couple-settle` y
`budgets`; «Spec 4: todavía no existe». Motivo: el PR toca `.github/`, `scripts/` y `tests/support/` (regla 6, todas las
existentes) además del área de presupuestos. Coincide con el fixture «PR B con el selector» de contracts/ci.md.

## T038 · capturas e Impeccable

28 PNG en `specs/004-presupuestos-y-metas/evidence/pr-b/`, de `juntia-dev` (cuentas `@seed.test`), 390 y 1440, claro y
oscuro: Plan en Nosotros con y sin presupuesto, Plan en Yo con y sin presupuesto, hoja de editar con historial, hoja de
crear y conflicto. Las de 390 son de página completa: la barra inferior fija se dibuja sobre las últimas líneas. En
`conflicto` el historial muestra varias ediciones de Tomás porque el script de captura cambió el presupuesto en cada una de
las cuatro capturas. Spec temporal sin commitear, como en la 003.

Impeccable: detector `impeccable detect --json src/features/plan` → **0 hallazgos**. Revisión de acabado
(`impeccable-finish-reviewer`) contra el comp 04·2, el spec de BudgetIndicator y las capturas:

| # | Hallazgo | Qué se hizo (`41a995e`) |
| --- | --- | --- |
| 1 | El modo sin presupuesto se leía como cinco avisos de crear (US-1) | Las categorías sin presupuesto, una sola lista punteada con divisores; el bloque «Sin presupuesto» plano y después de lo gastado |
| 2 | A 390, CERCA DEL LÍMITE y EXCEDIDO partían la fila de arriba | El badge va al final de la línea de estado |
| 3 | En un conflicto el campo seguía activo con el valor rechazado | Campo bloqueado, «Tu cambio a $X no se guardó.», solo «Revisar» sigue |
| 4 | En Yo, «Sara creó…» cuando Sara es quien mira | Primera persona en Yo («Creaste…», «Tú · fecha») |
| 5 | «Sin presupuesto» como título se confunde con el estado de cada fila | **Sin cambio**: redacción de los fundadores (T041) |
| 6 | A 1440 «Crear presupuesto» quedaba lejos de la lista | Va debajo de la lista |

## Para los fundadores (T041) y el gestor

- Copy nuevo de `copy.plan` (es.ts) para aprobar en pantalla, incluido el punto 5 de arriba y «Te pasaste por» en Yo.
- Lecturas de ejecución, sin alcance nuevo: el resumen del mes es `gasto_consumo` de `metric_months`; el porcentaje se
  muestra con consumo 0, cerca y excedido (el comp no lo pone en «dentro» ni en el excedido; US-04 pide 118 %); un
  presupuesto desactivado sin gasto en el mes no se pinta, y al volver a crear su categoría se reactiva con
  `update_budget` (la clave única es por categoría); Plan enseña solo el mes en curso.
- `copy.us.activeDescription` («Las metas y el plan de los dos llegan en una próxima versión…») ya no lo usa Plan; lo sigue
  usando Metas hasta el PR C, que lo puede ajustar.
- T040 (CLS de Plan con el `loading.tsx` nuevo) y T041 siguen pendientes, humanas. T039, abajo.

## T039 · barrido completo de accesibilidad (hecha por el gestor)

Run **42851485512** (`workflow_dispatch`, `a11y_sweep=true`), sobre `6183ac2`, lanzado por el gestor: **verde**. Job `e2e`
en **396 s** (axe 167 s, Supabase 137 s, build 61 s); job `app` en **150 s**. Datos del gestor; el agente no lanzó el run.

## Gate del PR #67 · run 42849936048 (sobre `6183ac2`) y decisión de los fundadores

Todas las pruebas en verde (E2E **34/34**, axe **95/95**). El job `e2e` falló solo por el presupuesto: **517 s** frente a
< 480 s (Supabase 139 s, build 89 s, E2E 69 s, axe 194 s). El gestor lo llevó a los fundadores según contracts/ci.md (c).

Decisión de los fundadores del 10 de noviembre de 2026: el tope del job `e2e` sube de 480 s a 660 s. Medición del gate del
PR #67 (run 42849936048): 517 s con las specs 1, 2, 3 y 5 (Supabase 139 s, build 89 s, E2E 69 s, axe con sesión 194 s); la
mitigación (a) no fue segura (medición del PR A) y la (b) no basta, porque la mayor parte es preparación fija; se aplicó la
(c) de contracts/ci.md. Con ella, el `timeout-minutes` del job `e2e` pasa de 10 a 12 (el agente señaló que 660 s quedaba
por encima de los 600 s en que GitHub cancelaba el job; el gestor lo aprobó).

Aplicado en un solo commit: `jobBudget` de `scripts/ci.mjs` (480 → 660), `timeout-minutes: 12` solo en el job `e2e` de
`.github/workflows/ci.yml`, y la decisión en `contracts/ci.md`, `docs/TESTING.md` §9 y el maestro §15.10 (decisiones 19.5 y
21.4 y una nota tras la decisión 21). Ninguna prueba comprobaba el 480.

## Revisión del gestor del PR #67 (antes de ChatGPT)

Un solo commit y un solo push. Sin `e2e:dev` completo en esta ronda (lo indicó el gestor); solo las pruebas afectadas, con
el lock.

| # | Hallazgo | Qué se hizo | Prueba |
| --- | --- | --- | --- |
| 1 | La prueba de prefetch podía pasar sin comprobar nada | Cada RSC se registra en el acto (`{ after, body: Promise }`), se esperan todos con `Promise.all` y se exige al menos uno posterior al cambio de contexto | Spec 5 2/2 |
| 2 | «Revisando el valor vigente…» sin salida | El caso JT219 acepta un presupuesto ya desactivado («Ahora no tiene presupuesto.» y «Revisar»); mientras no llega lo vigente, «Volver a cargar» pide la página otra vez | Dos tests de componente |
| 3 | El conflicto podía nombrar a quien mira | `BudgetChange.byMe` (el servidor compara con quien mira); «Cambiaste este presupuesto en otro lugar.» y «Ya creaste este presupuesto en otro lugar.» | Un test de componente |
| 4 | Moneda inconsistente | «Quedan $X», «Se pasaron por $X» y «Te pasaste por $X» con `formatMoney` (glosario, Restante). El nombre accesible de la barra sigue sin `$`: es el patrón de la 003 para `role="img"` («Tomás pagó 910.100; le corresponden 1.340.000; debe 429.900»). La línea «640.000 de 900.000» sigue como el comp 04·2 | Tests con el texto literal |
| 5 | Una spec fuera del mapa no correría | `tests/e2e-select.test.ts` exige que `SPECS` cubra cada `tests/e2e/*.e2e.ts` | Selector 19/19 |
| 6 | Menores | Fuera `copy.plan.sheet.deactivating`; la prueba de almacenamiento falla también con `indexedDB.open`; en `analyzeAtRest`, la comprobación del título y `axe.run` van en el mismo `page.evaluate` (si el título falta, se espera dentro de la página) | Componentes; M3b 4/4 |

Salidas:

- Componentes de Plan y selector: **43/43**.
- `e2e:dev` dirigido (`budgets.e2e.ts`, `plan.a11y.ts`, `routes.a11y.ts` y `couple-shared.a11y.ts` con `--grep "spec 5|Plan ·|Nosotros · axe|M3b"`): spec 5 **2/2** (17,6 s y 14,6 s), Plan **1/1**, las cuatro rutas de Plan y M3b **4/4**; `couple-shared` **0/2** por el límite de 30 s del test (fallan dentro de la **primera** pasada de axe, no en la de `document-title`). Ese build tardó 29,37 s frente a 10 s, con la máquina cargada.
- `couple-shared` solo, repetido: **2/2**, 28,7 s y 25,2 s. Es el rango que ya tenía en el PR A (23,5–29,5 s). **Riesgo para el gate:** ese test de la 003 va muy cerca de su límite de 30 s cuando el equipo está ocupado. No se toca en este PR.
- `npm run verify`: la primera corrida falló por un test ajeno, `profile-form.test.tsx` › P2, que superó 5 s con la máquina cargada (componentes 67 s). La repetición pasó: **exit 0, 85,97 s**, dominio 84, componentes **739 pasan / 2 omisiones previstas**. `git diff --check` pasa.

## Revisión de ChatGPT del PR #67 (sobre `c26e9d6`)

Un solo commit y un solo push. Solo las pruebas afectadas contra `juntia-dev`, con el lock; **sin `db:dev:reset`**.

| # | Hallazgo | Qué se hizo | Prueba |
| --- | --- | --- | --- |
| F67-1 | La rejilla de categorías seguía activa durante un JT219 | `CategoryChoice` queda deshabilitada con un conflicto a la vista, y `onSelect` lo ignora | Test de componente: tras JT219 todas las categorías están deshabilitadas, un clic en Transporte no cambia Hogar y «Revisar» abre Hogar con su límite vigente |
| F67-2 | El prefetch de la spec 5 no demostraba haber inspeccionado el RSC de Plan | Ver abajo | Spec 5 2/2 y prueba de mutación |
| F67-3 | El inventario del selector no veía specs anidadas | `readdirSync(..., { recursive: true })` | Con una spec temporal en `tests/e2e/zz-probe/` la prueba falla («expected [ 'tests/e2e/zz-probe/probe.e2e.ts' ] to deeply equal []»); sin ella pasa |

**F67-2, lo que se encontró.** Con un diagnóstico temporal se vio que **todos** los cuerpos RSC capturados medían 0: en las
respuestas RSC transmitidas, `response.text()` de Playwright falla y el `.catch(() => "")` lo convertía en una cadena vacía.
Así que ni esta versión ni la anterior inspeccionaban nada; las negativas pasaban por vacío. Ahora:

- Los RSC se interceptan con `page.route` y `route.fetch()`: el cuerpo real se lee al responder y se entrega tal cual a la
  página; un fallo al leerlo hace fallar la prueba.
- Cada petición se registra al **empezar** (en el manejador de la ruta), con su ruta y con `underUs`, que se activa solo
  cuando Plan de Nosotros ya está pintado (la cookie ya dice Nosotros).
- En Yo se llega a Plan desde Inicio en el cliente y se exige que ese RSC de `/plan` traiga el presupuesto personal de
  Sara: control de que la captura ve un presupuesto personal cuando viaja.
- En Nosotros se exige al menos un RSC de `/plan` iniciado bajo Nosotros, que su cuerpo traiga el presupuesto compartido
  sembrado (control positivo) y que ningún RSC iniciado bajo Nosotros traiga los marcadores personales (negativas de antes).
- **Mutación**: con `underUs` activo desde el principio (las peticiones de Yo cuentan como de Nosotros) la prueba **falla**
  en «RSC de /plan pedido en Nosotros». Sin la mutación, **2/2** (34,8 s en total).

Salidas:

- Componentes de Plan y selector: **44/44**.
- `npm run e2e:dev -- tests/e2e/budgets.e2e.ts`: **2/2**.
- `npm run verify`: la primera corrida pasó (exit 0, 740 componentes) en 115,02 s con el equipo cargado (lint 43,68 s);
  la repetición: **exit 0, 86,70 s** (< 90 s), dominio 84, componentes **740 pasan / 2 omisiones previstas**.
  `git diff --check` pasa.

## Re-revisión de ChatGPT del PR #67 (sobre `7de0fed`) · F67-4

F67-1, F67-2 y F67-3 quedaron cerrados. F67-4: la respuesta del cambio de Yo a Nosotros se marcaba como de Yo y no se
inspeccionaba. Un solo commit, solo en la prueba (`tests/e2e/budgets.e2e.ts`); sin cambios de producción ni `db:dev:reset`.

- **Tres fases, marcadas al empezar cada petición**: `me` antes del clic en «Nosotros»; `switch` desde justo antes del clic
  hasta que Plan de Nosotros se ve (la barra de Mercado 640.000 de 900.000); `us` después. Las respuestas de `switch` y `us`
  pasan las negativas.
- **Qué petición es la transición**: el selector escribe la cookie en el navegador (`writeContextCookie`, `document.cookie`) y
  `ContextView` llama a `router.refresh()`, que hace un **GET con `_rsc` a `/plan`**; no hay Server Action. Aun así el
  interceptor captura también los POST con `Next-Action` a `/` y `/plan`, por si el cambio pasara a una.
- **Controles**: hay al menos una respuesta de la fase `switch` con cuerpo, y la de `/plan` trae ya el presupuesto compartido
  sembrado. Se conservan los de `7de0fed`: el RSC de Plan en Yo trae el presupuesto personal; al menos un RSC de `/plan`
  iniciado en `us` trae el compartido; y las lecturas directas de HTML y RSC sin interceptar, con la cookie válida, ausente y
  no válida.
- **Mutación**: el interceptor añade «123.400» (marca personal de Sara) **solo** al cuerpo capturado de las respuestas que
  empezaron en `switch`. Resultado: **1 failed**, «respuesta de /plan en la fase switch», recibido `["123.400"]`. Sin la
  mutación: **2/2** (37,0 s en total), `npm run e2e:dev -- tests/e2e/budgets.e2e.ts` contra `juntia-dev`.

`npm run verify`: la primera corrida falló por tres tests ajenos que superaron 5 s con el equipo cargado (`app-port.test.ts`
y dos de `review-f57.test.tsx`; este commit no toca nada que Vitest corra). La repetición: **exit 0**, dominio 84, componentes
**740 pasan / 2 omisiones previstas**, en **98,80 s**: por encima del presupuesto de 90 s, con los componentes en 68 s frente a
41–52 s en las corridas anteriores de hoy (otra sesión trabajaba en el mismo equipo). `git diff --check` pasa.

## Gate del PR #67 · run 42847381388 (sobre `2d257a9`): `--project` y las specs

Falló el paso «E2E smoke (selected specs)» del job `e2e`. El selector eligió bien (todas, por tocar el workflow), pero
`scripts/ci.mjs` ejecutaba `npm run test:e2e:smoke -- <specs>` sobre `playwright test --project e2e`; como `--project` admite
varios valores, Playwright tomó los archivos como nombres de proyecto: «Project(s) "tests/e2e/access-account.e2e.ts", …
not found». En local no salió porque `e2e:dev` arma su comando por otro camino (`scripts/dev-target/e2e-plan.mjs`).

Arreglo (un solo commit y un solo push, que lanza el gate):

- `package.json`: `--project=<nombre>` con `=` en `test:e2e:smoke` y en los demás scripts con el mismo patrón
  (`test:a11y`, del mismo job, y `test:unit`, `test:components` y `test:integration`, de Vitest). Las líneas del workflow
  con `--project e2e` / `--project evidence` van seguidas de opciones, no de archivos, y no cambian.
- `scripts/ci.mjs`: el armado de los argumentos de npm pasa a `npmArgs(command, env)`, exportado; importado por una prueba,
  el módulo no ejecuta nada.
- `tests/ci-command.test.ts` (proyecto `components`): ejecuta el comando real que arma `ci.mjs` con `--list`, sin correr
  nada. Con una spec lista solo `budgets.e2e.ts`; con dos, solo esas dos; sin `E2E_SPECS`, las cuatro de `tests/e2e`. Exige
  salida 0 y que no aparezca «not found».

Salidas locales:

- `tests/ci-command.test.ts`: **3/3**. Con el script viejo (`--project e2e`) puesto a mano: **2 fallan** (los dos casos
  con specs) y el de sin specs pasa; restaurado.
- El camino exacto del job, con la lista del gate y `--list` (añadido dentro de `E2E_SPECS` para no correr nada):
  `E2E_SPECS="tests/e2e/access-account.e2e.ts tests/e2e/annotate.e2e.ts tests/e2e/couple-settle.e2e.ts tests/e2e/budgets.e2e.ts --list" node scripts/ci.mjs run test:e2e:smoke`
  → `playwright test --project=e2e tests/e2e/access-account.e2e.ts … tests/e2e/budgets.e2e.ts --list`, **exit 0, «Total:
  34 tests in 4 files»** (incluye las `@mail`, que en el job sí corren).
- `A11Y_JOB=e2e npm run test:a11y -- --list` → `playwright test --project=a11y --list`, **«Total: 95 tests in 5 files»**,
  como en `e2e:dev`.
- `node scripts/ci.mjs summary` sigue funcionando como módulo principal.
- `npm run verify`: la primera corrida falló en typecheck (el parámetro `env` del `.mjs` tomaba el tipo `ProcessEnv`; se
  tipó con JSDoc). La repetición: **exit 0, 65,68 s**; `vitest run --project=domain` 84, `vitest run --project=components`
  **743 pasan / 2 omisiones previstas**. `git diff --check` pasa.

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

Componentes y dominio (local, corrida intermedia de `vitest --project components --project domain`, 71 archivos): **815 pasan, 2 fallan, 2 omisiones previstas**; los 2 fallos eran los casos de `/metas` de `product-routes.test.tsx`, que se quitan al ajustar `src/app/(app)/product-routes.test.tsx`, que exigía Metas «sin datos» (FR-044 de la 002): Metas ya lee metas reales y se prueba en `src/features/goals`, como antes pasó con Inicio y Actividad. `tests/a11y/job-selection.test.ts` falló una vez mientras la sesión del PR B usaba el puerto; aislado, pasa.

## T052 · [V] View Transitions con App Router — primera corrida (sustituida abajo, en «Revisión del gestor del PR #68»)

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

## Revisión del gestor del PR #68 · correcciones

Un solo commit nuevo sobre `f577a94`; mismo PR en borrador, sin CI.

| # | Hallazgo | Corrección | Prueba |
| --- | --- | --- | --- |
| 1 | La tabla de Actividad en Yo (xl) pintaba todas las transacciones y después todos los asientos | `Table` usa la misma lista ordenada que `DayList` (`days()`) | `activity-goals.test.tsx`, «Yo desde xl…»: falla con la vista anterior, pasa ahora |
| 2 | El tipo del filtro del layout se arrastraba de Yo a Nosotros | Tipo normalizado en la vista de pareja (`income` → «Todos»; `goals` sin metas cargadas → «Todos»), usado en el control, el filtrado y el anuncio; lo mismo para `goals` en Yo | Dos casos nuevos: fallan con la vista anterior, pasan ahora |
| 3 | Anular un aporte con fondos ya usados decía «Esta meta no admite esta operación» | `DbError` lee el `detail` de JT204 (`available_minor`, solo entero en texto) y llega al rechazo como `detail.availableMinor`. Retirar dice el máximo del servidor; anular y deshacer usan `copy.goals.errors.fundsUsed` / `fundsUsedWith` | `errors.test.ts` (detail válido, raro y ausente) y dos casos en `goals.test.tsx` |
| 4 | Goal Journey sin morph (T052) | Opción (b): la lista pasa a `metas/(lista)/` y su `loading.tsx` ya no cubre `/metas/[id]`; indicador de navegación pendiente en la tarjeta (`useLinkStatus`, «Abriendo {meta}…»); se quita `originOf()` y el rectángulo guardado | T052 abajo; spec 4 y `goals.a11y.ts` repetidas |
| 5 | Empates de orden en Actividad | Mismo orden en las dos vistas: fecha desc; dentro del día, gastos e ingresos (y liquidaciones en Nosotros) y después los asientos de metas; luego `created_at` desc y `id` como último desempate | Cubierto por el caso del punto 1 |
| 6 | «Retirar» con 0 disponible | Acción deshabilitada con `copy.goals.withdrawSheet.nothing` | Caso nuevo en `goals.test.tsx` |
| 7 | Diálogos de anular y de estado sin «¿Cerrar sin confirmar?» | `UnconfirmedClose` común (marco de hojas, anular y estado): Escape y «Cerrar aviso» con resultado desconocido preguntan | Dos casos nuevos |
| 8 | `goalTransition` decía siempre «no se puede archivar» | `goalRejection(..., { transition })`; sin texto propio, el general | Caso de «Dar por lograda» |
| 9 | Lecturas en serie | Inicio: `goalPeople()` en el `Promise.all`. Actividad en Nosotros ya no lo llama | Typecheck y spec 4 |
| 10 | Carrera del prefetch y test que no podía fallar | Spec 4: se guardan las promesas de `response.text()`, `await Promise.all` y `fetched.length > afterSwitch`. «No suma al gasto» se pinta con los gastos reales de octubre (412.900) | Spec 4 2/2; componentes |
| 11 | 815 frente a 743 | Conciliado arriba: 815 era una corrida intermedia de los dos proyectos juntos; `verify` informa por proyecto (dominio y componentes) | — |

**Interpretación de orden (punto 5)**, para revisión: dentro de un mismo día, los asientos de metas van después de los movimientos. Motivo: el total que encabeza cada día es solo gasto, y poner el ahorro debajo evita leerlo como parte de ese total (DEC-G04). Entre asientos o entre movimientos del mismo día manda `created_at` desc y, con el mismo instante, el `id`, para que el orden sea total y estable.

### T052 · segunda corrida (tras la opción b)

Misma prueba temporal (no versionada), Chromium **156.0.8078.4**, `PORT=3500 npm run e2e:dev -- tests/e2e/goals.e2e.ts tests/e2e/zz-vt-check.e2e.ts tests/a11y/goals.a11y.ts`: **exit 0, 147,92 s** (build 40,90 s; E2E dirigido **7/7, 55,4 s**, incluida la spec 4; axe de metas **2/2, 48,6 s**). Resumen de los grupos de cada View Transition, sin errores (`error: null`; `finished: false` porque se lee mientras la transición aún corre):

```
{"motion":"no-preference","open":[{"finished":false,"error":null,"groups":["::view-transition-group(goal-title-{id})","::view-transition-group(goal-ribbon-{id})","::view-transition-group(goal-photo-{id})","::view-transition-group(root)"]}],"close":[]}
{"motion":"reduce","open":[{"finished":false,"error":null,"groups":["::view-transition-group(root)"]}],"close":[]}
{"T052":"sin API (respaldo Motion)","motion":"no-preference","startViewTransition":false,"open":[],"close":[]}
{"T052":"sin API (respaldo Motion)","motion":"reduce","startViewTransition":false,"open":[],"close":[]}
```

- **Apertura en Chromium: cumple.** La tarjeta y la meta inmersiva forman el par: `goal-photo`, `goal-title` y `goal-ribbon` animan entre las dos. Con movimiento reducido solo queda el fundido de la página (las reglas de `globals.css` quitan la animación de los grupos con nombre).
- **Cierre (Escape → `/metas`): no hay transición**, porque la lista sí suspende en su Skeleton (`(lista)/loading.tsx`). No se probaron más variantes, por indicación del gestor.
- **Respaldo sin la API (`layoutId` de Motion)**: en esta corrida no se medía su animación (ver la tercera corrida, que sí lo mide y lo corrige). La navegación, el foco al título, Escape y la vuelta del foco a la tarjeta cumplen en los cuatro casos.
- **WebKit**: sigue sin instalar; lo corre el gestor si el fundador autoriza la descarga.
- **CLS de la carga de `/metas`** (lista con Skeleton, 3 metas, Chromium, PerformanceObserver de `layout-shift`): **0 a 390 y 0 a 1440**. Es una medición de iteración; T054 la hace el gestor.

### Cierre local de la ronda

- Componentes de metas, Inicio, Actividad, `src/app/(app)` y `errors.test.ts`: **13 archivos, 177/177**. Registro de axe (`tests/a11y`, Vitest): **11/11**; `/metas` sigue en el registro aunque la página viva en `(lista)`.
- `npm run verify`: **exit 0, 88,91 s** (presupuesto < 90 s; el lint tardó 35,6 s frente a 16,7 s de la corrida anterior, con la otra sesión usando el equipo). Dominio **78/78**; componentes **752 pasan / 2 omisiones previstas**, 59 archivos; typecheck verde; lint sin errores (aviso preexistente de `balance-panel.tsx:61`).
- `e2e:dev` completo no se repite en esta ronda (indicación del gestor); se repitieron la spec 4 y `goals.a11y.ts` porque cambió la estructura de rutas de `/metas`.

### T052 · tercera corrida: Chromium y WebKit (el gestor instaló `webkit-2370` con la autorización del fundador)

La misma prueba temporal (no versionada) corre ahora con dos motores. WebKit se lanza desde la prueba con `webkit.launch()` de Playwright 1.64.1, porque la configuración del repo solo tiene Chromium y `e2e:dev` no admite otro proyecto. Además, en cada cuadro se mide si la meta inmersiva lleva una transformación en línea: así anima el respaldo `layoutId` de Motion. Comando: `PORT=3500 npm run e2e:dev -- tests/e2e/zz-vt-check.e2e.ts`. Resultado: **7 pasan, 2 fallan**, 56,0 s; los dos fallos son los de WebKit con la API. Resumen por caso:

```
{"browser":"chromium","version":"156.0.8078.4","mode":"con API","motion":"no-preference","startViewTransition":true,"layoutFrames":{"layout":0,"sampled":12},"open":[{"finished":false,"error":null,"groups":["::view-transition-group(goal-photo-{id})","::view-transition-group(goal-ribbon-{id})","::view-transition-group(goal-title-{id})","::view-transition-group(root)"]}],"close":[]}
{"browser":"chromium","version":"156.0.8078.4","mode":"con API","motion":"reduce","startViewTransition":true,"layoutFrames":{"layout":0,"sampled":11},"open":[{"finished":false,"error":null,"groups":["::view-transition-group(root)"]}],"close":[]}
{"browser":"chromium","version":"156.0.8078.4","mode":"sin API (respaldo Motion)","motion":"no-preference","startViewTransition":false,"layoutFrames":{"layout":15,"sampled":15},"open":[],"close":[]}
{"browser":"chromium","version":"156.0.8078.4","mode":"sin API (respaldo Motion)","motion":"reduce","startViewTransition":false,"layoutFrames":{"layout":0,"sampled":14},"open":[],"close":[]}
{"browser":"webkit","version":"27.2","mode":"sin API (respaldo Motion)","motion":"no-preference","startViewTransition":false,"layoutFrames":{"layout":7,"sampled":7},"open":[],"close":[]}
{"browser":"webkit","version":"27.2","mode":"sin API (respaldo Motion)","motion":"reduce","startViewTransition":false,"layoutFrames":{"layout":0,"sampled":5},"open":[],"close":[]}
{"CLS":"/metas","width":390,"value":0}
{"CLS":"/metas","width":1440,"value":0}
T052 · webkit · con API · movimiento no-preference → Error: expect(page).toHaveURL(…/metas/{id}) failed · Received "http://localhost:3500/metas"
T052 · webkit · con API · movimiento reduce        → Error: expect(page).toHaveURL(…/metas/{id}) failed · Received "http://localhost:3500/metas"
```

- **Respaldo `layoutId` de Motion (sin la API): sí anima.** Chromium sin la API: 15 de 15 cuadros con transformación mientras la meta entra; WebKit 27.2: 7 de 7. Con movimiento reducido, 0 en los dos: no hay desplazamiento ni escala, como pide MOTION_SYSTEM §4. Esto corrige la segunda corrida, que decía «sin animación medible»: allí no se medía la transformación.
- **WebKit 27.2 con la API nativa** (Playwright 27.2 sí trae `document.startViewTransition`): la navegación desde la tarjeta no se completó. Para descartar que la causara el espía de la prueba, corrí un diagnóstico aparte en WebKit **sin espía**, con la URL muestreada desde Node, una llamada a la página con límite propio y los eventos `crash` y `close`. Fueron cuatro corridas de diagnóstico; la última, que es la concluyente:

```
{"diag":"webkit con API sin espía","caso":"tarjeta → meta inmersiva","version":"27.2","clickReturned":true,"crashed":true,"closedEvent":false,"samples":[{"ms":278,"path":"/metas","responsive":true,"title":"Metas"},{"ms":1446,"path":"/metas/{id}","responsive":true,"title":null},{"ms":3011,"path":"/metas/{id}","responsive":true,"title":null},{"ms":6016,"path":"/metas/{id}","responsive":true,"title":null}],"errors":[]}
{"diag":"webkit con API sin espía","caso":"Metas → Actividad (sin tarjetas de meta)","version":"27.2","clickReturned":true,"crashed":false,"closedEvent":false,"samples":[{"ms":264,"path":"/actividad","responsive":true,"title":"Actividad"},{"ms":1010,"path":"/actividad","responsive":true,"title":"Actividad"},{"ms":3013,"path":"/actividad","responsive":true,"title":"Actividad"},{"ms":6012,"path":"/actividad","responsive":true,"title":"Actividad"}],"errors":[]}
```

  - Al tocar la tarjeta, **el proceso de la página de WebKit se cae** (`crash: true`). La URL llega a `/metas/{id}`, pero la página ya no pinta nada (`h1` nulo) y no hay errores de consola.
  - La navegación de control sin tarjetas de meta (Metas → Actividad) funciona: sin caída y con su título.
  - Las corridas de diagnóstico anteriores acabaron en «página cerrada» o en el límite de 120 s, lo que también encaja con la caída.
  - **Alcance de este dato**: es el WebKit de Playwright para Windows (build 2370, versión 27.2), no Safari en macOS ni en iOS. No se puede afirmar que Safari se caiga. Tampoco se puede descartar: en este WebKit, la View Transition con nombre de la meta tumba la página.
- **Estado de T052 tras la tercera corrida** (antes de la verificación humana de abajo):
  - **Chromium: apertura cumple** (par `goal-photo`, `goal-title`, `goal-ribbon`); el cierre no tiene transición; el respaldo anima.
  - **WebKit de Playwright: el respaldo cumple; con la API nativa, la página se cae.**

### T052 · verificación humana en Safari real y decisión del gestor (10 de noviembre de 2026)

- **Quién y dónde**: el fundador, en su iPhone, con **Safari** real. Versión de iOS: **por confirmar** (la confirma el gestor con el fundador).
- **Build**: `62072be`, compilado en local y servido por la red local (LAN) contra `juntia-dev`. No es un despliegue ni una corrida de CI.
- **Resultado**: **al abrir una meta, la View Transition anima, y Safari no se cae.**
- **Decisión del gestor**: se queda como está. View Transition nativa más el respaldo `layoutId` de Motion, FR-076 sin cambios. No se limita la View Transition a Chromium ni se quita.
- **Limitación del port de Playwright WebKit para Windows**: build 2370, versión 27.2. Con la API nativa, el proceso de la página se cae (`crash: true`) al iniciarse la View Transition de la meta; la salida es la de la tercera corrida, arriba. Safari real no reproduce la caída, así que se registra como limitación de ese port, no de la app. Consecuencia: una prueba automática de Goal Journey en ese WebKit tendría que quitar la API, como hace el caso «sin API» de la prueba temporal.
- **Limitación conocida, sin cambio en este PR**: al cerrar la meta (Escape o ×, de vuelta a `/metas`) no hay View Transition, porque la lista suspende en su Skeleton (`(lista)/loading.tsx`) y no se forma el par. El gestor se lo muestra a los fundadores en T056.
- **Estado de T052**: **cerrada** para la apertura, en Chromium (salida de las corridas segunda y tercera) y en Safari real (verificación humana de arriba). El respaldo de Motion queda verificado en Chromium y en el WebKit de Playwright sin la API. Siguen fuera: el cierre, que es la limitación de arriba, y el back-swipe de iPhone, aplazado por la decisión 19.1.
- Las pruebas temporales (`zz-vt-check.e2e.ts`, `zz-webkit-diag.e2e.ts`) no se versionan; sus copias y salidas se conservan fuera del repositorio.

## Decisiones del fundador del 10 de noviembre de 2026 · GoalStack

- **«Ver todas» en Inicio lleva a Metas.** La pila acepta `seeAllHref`; en Inicio es un enlace a `/metas`, que conserva el contexto (cookie). En Metas, «Ver todas» sigue desplegando la cuadrícula allí mismo, con «Ver en pila». Pruebas: `goals.test.tsx` y `home-goals.test.tsx`.
- **Deslizar en vertical recorre la pila** (COMPONENT_SPECIFICATIONS, GoalStack):
  - **Cómo funciona.** La tarjeta frontal se arrastra en vertical con Motion (`drag="y"`, vuelve a su sitio con el spring `card`). Hacia arriba trae la siguiente al frente; hacia abajo, la anterior. Cuenta a partir de 64 px de recorrido o 500 px/s de velocidad, y un gesto más horizontal que vertical no cuenta (`swipeStep`).
  - **Dónde.** Solo en la frontal y con más de una meta; nunca en el abanico de escritorio. `touch-pan-x` solo en esa tarjeta, así que fuera de la pila la página se desplaza como siempre.
  - **Movimiento reducido.** La tarjeta no sigue al dedo (`dragElastic: 0`) y el cambio es inmediato.
  - **Clic al soltar.** Se descarta desde que empieza el arrastre hasta 350 ms después de soltar, para que soltar no abra la meta. El filtro va en la lista y no en la tarjeta, porque al soltar la tarjeta arrastrada ya pasó atrás. Además, el enlace no es arrastrable de forma nativa.
  - **Alternativas.** Tocar la que asoma y «Ver todas» siguen igual.
  - **Pruebas de componente.** Los umbrales de `swipeStep` (seis casos); solo la frontal lleva el gesto, y no con una sola meta.
  - **Comprobación en móvil emulado.** Prueba temporal, no versionada, contra `juntia-dev`: Chromium 156 a 390 × 844 con `hasTouch` e `isMobile`, tres metas compartidas, gesto de 140 px hacia arriba y después hacia abajo. Fueron seis corridas, que encontraron y corrigieron dos fallos: el arrastre nativo del enlace, y el clic al soltar que abría la meta. Corrida final: **2/2, 21,3 s**.

```
{"swipe":"no-preference","boxesAfterDrag":["342","342","342","342","342","342"]}
{"swipe":"no-preference","first":0,"afterUp":1,"afterDown":0,"tapOpens":true}
{"swipe":"reduce","boxesAfterDrag":["342","342","342","342","342","342"]}
{"swipe":"reduce","first":0,"afterUp":1,"afterDown":0,"tapOpens":true}
```

  La frontal queda quieta tras el gesto (misma posición durante 1,5 s), y un toque posterior abre la meta frontal.
  - **Regresión.** `PORT=3500 npm run e2e:dev -- tests/e2e/goals.e2e.ts tests/a11y/goals.a11y.ts`: **exit 0, 106,65 s** (spec 4 2/2; axe de metas 2/2). Componentes de metas, Inicio y Actividad: **105/105**. No se reinició `juntia-dev`.
- **Orden de la pila** («al frente, la meta con el aporte más reciente»): **pendiente**. `goals_overview` no trae la fecha del último aporte; se le preguntó al gestor si usar una consulta más sobre `goal_entries` o una migración, y si «más reciente» es `effective_date` o `created_at`.

## Prefetch RSC en las specs 3 y 4 (revisión del gestor del PR #68; mismo hallazgo que F67-2 del PR B)

- **Hallazgo** (de la sesión del PR B, `7de0fed`). En Playwright, `response.text()` devuelve "" con las respuestas RSC transmitidas, y el `.catch(() => "")` lo ocultaba. Por eso la parte de prefetch de la spec 4 (`goals.e2e.ts`) y de la spec 3 (`couple-settle.e2e.ts`, ya en `main`) no inspeccionaba ningún cuerpo.
- **Arreglo** (commit `6bde71b`), un helper común en `tests/support/rsc-capture.ts`:
  - intercepta con `page.route(url => url.searchParams.has("_rsc"))` y lee el cuerpo con `route.fetch()` y `response.text()`;
  - entrega la respuesta sin cambios (`route.fulfill({ response, body })`);
  - marca cada petición al empezar, con su ruta y con si se inició ya en Nosotros;
  - si la lectura falla, la prueba falla: no hay `catch` que la cambie por "".
- **Spec 4.** Control en Yo: el RSC de `/metas` (navegación de Inicio a Metas en el cliente) trae el id y el nombre de la meta personal. En Nosotros:
  - ningún RSC trae marcadores personales;
  - hay al menos un RSC de `/metas` iniciado en Nosotros;
  - y trae la meta compartida sembrada (control positivo).
- **Spec 3**, el mismo esquema: en Yo, el RSC de `/actividad` trae los privados de Sara. En Nosotros:
  - ningún RSC trae privados;
  - hay al menos un RSC de `/actividad`;
  - y trae «Carulla Laureles».
  - Es un arreglo de prueba: no cambia comportamiento.
- **Verde** contra `juntia-dev`: `PORT=3500 npm run e2e:dev -- tests/e2e/goals.e2e.ts tests/e2e/couple-settle.e2e.ts --grep "HTML"` da **2/2, 46,7 s** (build 17,10 s, total 66,25 s).
- **Mutación 1**: en el helper, `underUs = true` desde el inicio, de modo que toda petición de Yo cuenta como de Nosotros. **Las dos fallan** en el control de Yo:
  - spec 3: «el RSC de Actividad en Yo trae los privados», recibido `false`;
  - spec 4: «el RSC de Metas en Yo trae la meta personal», recibido `false`.
- **Mutación 2**: comprobar como de Nosotros todas las peticiones (`rsc.read(() => true)`), incluidas las de Yo. **Las dos fallan** en la comprobación negativa:
  - spec 3: «RSC de /actividad pedido en Nosotros» con «Taxi a la oficina», «Reembolso EPS», «Regalo de cumpleaños», «Almuerzo con el equipo», «4500000» y «5970000», entre otros;
  - spec 4: «RSC de /metas/{id personal} pedido en Nosotros», con el id de la meta personal.
- Las dos mutaciones fueron temporales, sin commit; los archivos se restauraron con `git checkout`.

## Ronda del 10 de noviembre de 2026 · tintes, orden de la pila, hover del abanico

Decisiones del fundador, traídas por el gestor. Commits locales `223260a` (tintes), `c33f105` (migración y orden), `3b5ba60` (hover), `6bde71b` y `c9bf37a` (RSC) y `19d9855` (pgTAP), en un solo push.

### Tinte por tipo de meta

- BRAND_FOUNDATION, «tinte de la categoría de la meta»; Juntia DS v1, «08 Tintes de meta».
- **Tokens.** Los 28 tokens `color.goal.tint.{tipo}.{bg,initial,icon,edge}` en claro y oscuro: en `src/styles/tokens.css` (claro, oscuro y respaldo sin JavaScript, que la prueba de igualdad del tema oscuro confirma) y en `docs/design/DESIGN_SYSTEM.md`.
- **Aplicación.** Cada tarjeta, capa de la pila, meta inmersiva y fila de archivada declara `data-goal-tint`. Además:
  - el texto secundario sobre el tinte usa `status.pending`;
  - el riel de la cinta lleva un borde interior de 1,5 px en `.edge`;
  - las capas traseras conservan su tinte, sin atenuarse, con un filete de 1 px;
  - el «+» va sin tinte, con contorno punteado de 2 px y el botón elevado;
  - la ficha de lograda va rellena de tinta y la de archivada, con contorno y el ícono de archivar.
- **Regla del fallback** actualizada en `COMPONENT_SPECIFICATIONS.md`.
- **Pruebas.** Cada `goal_type` pinta su tinte, con sus cuatro variables en el CSS y en los tres bloques de tokens; el texto secundario de la tarjeta usa `status.pending`; las traseras llevan filete y no se atenúan.
- **Limitación conocida, aceptada por el gestor y pendiente de la aprobación en pantalla.** En claro, el tramo rayado de Tomás queda a 1,3–1,6:1 contra el tinte, y a 1,6:1 contra el riel, como en todo el sistema. El patrón y los importes por persona en texto llevan la información. No se cambia la cinta.

### Orden de la pila: migración `20261110120000_goal_last_contribution.sql`

- **Migración.** `create or replace view public.goals_overview` con la definición anterior intacta y dos columnas al final: `last_contribution_date` (date) y `last_contribution_created_at` (timestamptz). Solo cuentan aportes no anulados; sin aportes, null. El nombre del archivo lleva `_goal`, así que entra en el área de metas del selector.
- **Orden de GoalStack** (`stackOrder`), en Metas (Yo y Nosotros) y en Inicio:
  - al frente, el aporte más reciente, por `effective_date` y, el mismo día, por `created_at`;
  - sin aportes, detrás;
  - los empates, por creación, la más antigua primero;
  - por último, el `id`.
  - En Yo se conserva la separación por `goal_scope`.
- **Pruebas de componente**: fecha, empate del mismo día, metas sin aportes.
- **`npm run db:dev:reset`** (autorizado por el usuario en esta sesión): **pasó, 12,43 s**, con 12 migraciones.
- **`npm run test:db:dev`**:
  - **Primera corrida: falló** en el archivo nuevo `13b` («could not determine which collation to use for string comparison», al comparar los nombres de columna de `information_schema`). Todo el pgTAP existente pasó, incluidos los 483 controles de privilegios.
  - **Segunda corrida**, tras corregir la prueba con `array_agg(... collate "C")`: **pasó, 122,44 s**. `13b_goal_last_contribution` **13/13**: columnas, tipos y posición; `security_invoker`; aporte anulado que no cuenta; empate del mismo día; meta sin aportes con null; Tomás sigue sin ver la meta personal. `01_privileges` **483**: los grants de la vista se conservan.
- **Ensayo de restauración**: `scripts/order-restore-data.mjs` trabaja sobre tablas y no lee vistas. Las integraciones que leen `goals_overview` usan `select("*")` o `id`.
- **`npm run test:integration:dev`** (corrió la suite entera: los argumentos de archivo no se aplican): **145 pasan, 9 omisiones previstas, 413,87 s**.
- **Tipos**: `database.types.ts` se actualizó a mano, con el mismo formato y orden alfabético que el generador. `db:types:check` solo corre en el job `db` de CI.
- **Producción**: no se tocó; la migración la aplica el gestor después del merge.

### Hover y foco del abanico

- Juntia DS v1, «08·7 Abanico · hover y foco»; MOTION_SYSTEM §4.1; COMPONENT_SPECIFICATIONS, GoalStack.
- **Estado.** `data-fan-active` en GoalStack, con 60 ms de margen al salir y salto directo a otra tarjeta. Responde solo al puntero de ratón y al `focus-visible`.
- **Efecto en CSS.** Solo con `(hover: hover) and (pointer: fine)` y desde lg. El movimiento usa el spring `card` como curva `linear()` de 580 ms, generada del mismo muelle 260/28/1. La sombra pasa de `float` a `overlay` en 180 ms. Con movimiento reducido: sin desplazamiento ni escala, la segunda conserva sus 4° y solo cambia la sombra, en 120 ms lineal.
- **Ajuste mínimo, para que lo vea el gestor.** Con hover en una tarjeta trasera, el «+» también se desplaza 24 px, para no chocar con la tercera; el paso del abanico no cambia.
- **Medición en Chromium con movimiento normal y hover en la segunda y la tercera capa**: sin scroll horizontal a 1024, 1280 y 1440 (`scrollWidth = clientWidth`). A 1024, el «+» desplazado sobresale 16 px del área de contenido (borde derecho en 1012 frente a 996), dentro del margen de la página.

```
{"fanHover":1024,"layer":"1","before":{"s":1024,"c":1024},"during":{"s":1024,"c":1024,"plusRight":1012,"mainRight":996}}
{"fanHover":1280,"layer":"1","before":{"s":1280,"c":1280},"during":{"s":1280,"c":1280,"plusRight":1196,"mainRight":1240}}
{"fanHover":1440,"layer":"1","before":{"s":1440,"c":1440},"during":{"s":1440,"c":1440,"plusRight":1196,"mainRight":1400}}
```

- **Pruebas de componente**:
  - hover inmediato y reposo a los 60 ms;
  - salto directo a otra tarjeta sin volver al reposo;
  - un toque no activa el hover;
  - el foco de teclado activa el mismo efecto, con el anillo y su offset de 2 px;
  - fuera del abanico no hay estado;
  - el bloque de movimiento reducido no desplaza ni escala, y conserva los 4°.

### Cierre de la ronda

- **`PORT=3500 npm run e2e:dev` completo, primera corrida**, sobre la base reiniciada pero con las 145 integraciones recién sembradas: **exit 1, 422,69 s**; E2E 28/30, axe 97/98. Fallaron tres pruebas ajenas a metas:
  - E5 de Anotar: el héroe siguió en $412.900;
  - 50/50 de la spec 3: héroe no encontrado;
  - axe de Nosotros: la lista de «Mover a Pareja» no apareció.
  - Son los mismos tres casos intermitentes que registró el PR A con fixtures acumuladas («T026»).
- **Las tres, dirigidas** (`tests/e2e/annotate.e2e.ts tests/e2e/couple-settle.e2e.ts tests/a11y/couple-shared.a11y.ts`): **exit 0, 129,21 s**; E2E 21/21 y axe 2/2.
- **Completo tras un nuevo `db:dev:reset`**, como en el PR A: **exit 0, 335,74 s**. Build 11,32 s; E2E sin @mail **30/30, 67,95 s**, con las specs 3 y 4 y su captura de RSC; axe con sesión **98/98, 255,09 s**, con `goals.a11y.ts` en los dos temas y `routes.a11y.ts`. Siguen fuera @mail, `@sweep` y el proyecto evidence.
- **`npm run verify`**: **exit 0, 77,68 s**. Dominio **78/78**; componentes **778 pasan / 2 omisiones previstas**, 59 archivos; typecheck verde; lint sin errores (aviso preexistente de `balance-panel.tsx:61`).
- **Capturas.** 42 PNG en `evidence/pr-c/capturas/` a 390 y 1440 en los dos temas, con metas de viaje, vivienda, boda, vehículo, emergencias y educación:
  - Metas, la pila, el abanico, la inmersiva e Inicio;
  - el abanico con hover y movimiento normal (`metas-abanico-hover-movimiento-nosotros-1440-{light,dark}.png`): la tarjeta se endereza, sube y se desplaza 24 px, y las de su derecha y el «+» se desplazan con ella;
  - el abanico con hover y movimiento reducido (`metas-abanico-hover-nosotros-1440-*.png`): conserva el giro y no se mueve.
- Las pruebas temporales de captura no se versionan.

## Revisión del gestor de `70b87b5..9464d58` · correcciones

Un solo push; el PR sigue en borrador.

1. **Bloqueante · RSC clasificado por su cookie** (`tests/support/rsc-capture.ts`). Cada petición `_rsc` se marca al empezar con su propia cookie (`route.request().headerValue("cookie")` contiene `juntia_context=us`). Se quitó `nowUnderUs`: ya no hay una bandera que la prueba mueva a mano, y el `router.refresh()` del cambio Yo → Nosotros, que viaja con la cookie nueva, se inspecciona como de Nosotros.
   - **Control positivo del cambio**: justo después de ver Nosotros, hay al menos un RSC de Nosotros de la ruta del cambio con datos compartidos: `/` con «Carulla Laureles» en la spec 3 y `/metas` con el id de la meta compartida en la spec 4. Ninguno trae marcadores privados.
   - **Mutación** (temporal, restaurada desde una copia en el scratchpad; sin commit): en el helper se añadió « Bicicleta secreta Regalo de cumpleaños» solo al cuerpo de la primera respuesta de Nosotros de la ruta de la página (la del cambio). `--grep "HTML"` en las specs 3 y 4: **las dos fallan** en la comprobación del cambio: «RSC de / del cambio a Nosotros» con «Regalo de cumpleaños» (spec 3) y «RSC de /metas del cambio a Nosotros» con «Bicicleta secreta» (spec 4). Una primera variante, que marcaba la primera respuesta de Nosotros fuera cual fuera su ruta, cayó en prefetches (`/actividad`, `/`) y también falló.
2. **Inicio en Yo mezcla ámbitos.** `stackSort`: primero las personales y, dentro de cada ámbito, `stackOrder`. Prueba: una compartida con un aporte de ayer queda detrás de dos personales más antiguas.
3. **Área de hover fija.** Los listeners siguen en el `li` (capa), que ya no se transforma; el movimiento va en dos envoltorios internos: `[data-fan-tilt]` (contragiro, pivote en la esquina inferior izquierda) y `[data-fan-card]` (desplazamiento y escala, pivote abajo al centro).
4. **Pivote en reposo.** La capa ya no lleva `transform-origin` fuera de las capas de Tailwind: en reposo mantiene el `lg:origin-bottom-left` aprobado. Medido en Chromium a 1440: capa 0 `140px 114px`, sin giro; capas 1 y 2 `0px 228px`, con 4° y 7°; envoltorios sin transformación.
5. **El foco de teclado no se pierde con el ratón.** GoalStack recuerda la tarjeta con `focus-visible`; al salir el ratón, el efecto vuelve a ella en lugar de apagarse.
6. **El frente se guarda por id** (`frontId`), no por índice: un `router.refresh` que reordena la pila no cambia la meta del frente.
7. **Pruebas nuevas.** `goal-stack-drag.test.tsx`: deslizar arriba y abajo cambia de verdad el frente (y por debajo del umbral, no); el frente se conserva por id tras reordenar; con movimiento reducido `dragElastic` es 0 y sin él es mayor. `goals.test.tsx`: el enlace lleva el anillo (`focus-visible:outline-2`, `outline-solid`, `outline-focus`) además del offset; estructura de envoltorios; bloques CSS (la capa no tiene reglas propias; movimiento reducido sin `translate`, `scale` ni `rotate`); foco tras la salida del ratón; orden por ámbito en Inicio de Yo. Las cuatro de comportamiento fallan con el `goal-stack.tsx` anterior.

**Comprobación en navegador** (prueba temporal sin versionar, Chromium, 1440, movimiento normal, tres metas compartidas). Para cada capa, el puntero se lleva desde fuera a un punto que esa capa tiene visible junto al borde inferior y a las esquinas giradas, y se cuentan durante 1,5 s los cambios de `data-fan-active`:

```
{"probes":[{"layer":"0","spot":"borde inferior","flips":1,"sequence":"0"},{"layer":"0","spot":"esquina inferior izquierda","flips":1,"sequence":"0"},{"layer":"0","spot":"esquina inferior derecha","flips":1,"sequence":"0"},{"layer":"0","spot":"esquina superior derecha","flips":1,"sequence":"0"},
 {"layer":"1","spot":"borde inferior","flips":1,"sequence":"1"},{"layer":"1","spot":"esquina inferior izquierda","flips":1,"sequence":"1"},{"layer":"1","spot":"esquina inferior derecha","flips":1,"sequence":"1"},{"layer":"1","spot":"esquina superior derecha","flips":1,"sequence":"1"},
 {"layer":"2","spot":"borde inferior","flips":1,"sequence":"2"},{"layer":"2","spot":"esquina inferior izquierda","flips":1,"sequence":"2"},{"layer":"2","spot":"esquina inferior derecha","flips":0,"sequence":""},{"layer":"2","spot":"esquina superior derecha","flips":1,"sequence":"2"}]}
{"ring":{"card":true,"outline":"2px solid rgb(46, 88, 102)","offset":"2px","active":"1"}}
```

Un solo cambio por punto, sin bucles de entrada y salida. En la esquina inferior derecha de la tercera capa, el punto calculado quedó fuera de la zona activa (0 cambios, sin estado). El anillo de foco es de 2 px en `focus.ring` con su offset de 2 px.

**Corridas**
- `PORT=3500 npm run e2e:dev -- tests/e2e/goals.e2e.ts tests/e2e/couple-settle.e2e.ts <prueba temporal> tests/a11y/goals.a11y.ts`: **exit 0, 148,19 s** (build 15,93 s; E2E 8/8, 88,19 s; axe 2/2, 41,83 s).
- `npm run verify`, primera corrida: **exit 1** por un tiempo agotado (5 s) en `src/features/expenses/review-f57.test.tsx`, ajeno a metas; ese archivo solo pasa 19/19. Segunda corrida: **exit 0, 100,43 s** (aviso de presupuesto de 90 s). Dominio **78/78**; componentes **785 pasan / 2 omisiones previstas**, 60 archivos; typecheck y lint verdes.

## Integración de `main` tras el PR B (`4fadbf5`)

Merge de `origin/main`, sin rebase, en el mismo push que las correcciones de la ronda anterior.

- **Conflictos**:
  - `src/features/shared/write-result.ts`: `WriteError`, `WriteAction` y `REJECTED` suman los presupuestos del PR B y las metas del PR C; se conserva `detail`, con `WriteRejectionDetail`.
  - `src/app/(app)/product-routes.test.tsx`: el PR B sacó Plan y el PR C sacó Metas, así que ya no queda ninguna ruta de producto sin datos. La prueba conserva lo que no depende de los datos de una página: en las seis rutas de producto, el AppShell no muestra el aviso de versión base ni cifras en sus nombres accesibles (FR-044).
  - `evidence.md`: se conservan las secciones del PR B y del PR C, en ese orden.
  - `src/lib/copy/es.ts` y `tests/support/a11y.ts` se fusionaron sin conflicto; el typecheck lo confirma.
- **Selector de specs**: `scripts/e2e-select.mjs` ya mapea la spec 4 a `tests/e2e/goals.e2e.ts`; `tests/e2e-select.test.ts` pasa.
- **Captura de RSC de la spec 5** (`tests/e2e/budgets.e2e.ts`): usa sus propias fases (`me`, `switch`, `us`), que se mueven a mano. El helper `tests/support/rsc-capture.ts`, que clasifica cada petición por su cookie, sirve también para ella. No se migra en este PR: queda anotado para un PR aparte.
- **Corridas tras el merge**:
  - `PORT=3500 npm run e2e:dev -- tests/e2e/goals.e2e.ts tests/e2e/budgets.e2e.ts tests/a11y/goals.a11y.ts`: **exit 0, 138,32 s**. Build 33,89 s; E2E de las specs 4 y 5 **4/4, 54,53 s**; axe **2/2, 48,35 s**.
  - `npm run verify`, tres corridas:
    - La primera, **exit 1**: `tests/a11y/job-selection.test.ts`, que llega de `main`, encontró ocupado el puerto 3400 (otro proceso, no lanzado por esta sesión).
    - La segunda, con `PORT=3500`, **exit 1**: otra vez el tiempo agotado de 5 s de `review-f57.test.tsx`, ajeno a metas. Solo, ese archivo pasa 19/19.
    - La tercera, con `PORT=3500`, **exit 0, 94,72 s** (aviso de presupuesto de 90 s). Dominio **84/84**; componentes **836 pasan / 2 omisiones previstas**, 63 archivos; typecheck y lint verdes.

## F68-1 · conflicto de versión al editar una meta (revisión externa del PR #68 sobre `090c13b`)

- **Hallazgo.** Tras JT011, la hoja atribuía siempre el cambio a la pareja (`changedBy: partnerName`). Además, solo hacía `router.refresh()`: un segundo «Guardar» mandaba los valores viejos del formulario con la versión nueva de las props, y la base ya no detectaba el conflicto.
- **Arreglo** (`goal-form-sheet.tsx`), con el patrón de `budget-sheet.tsx` del PR B:
  - la versión (`base`) y la clave (`key`) de la intención son estado de la hoja, no se leen de las props al guardar;
  - al recibir JT011, la hoja entra en conflicto: campos y «Guardar» bloqueados, y `submit` no escribe;
  - mientras no llega el refresco, se muestra «Revisando la versión vigente…» con «Volver a cargar»;
  - cuando llega una versión distinta de la intentada, se dicen lo que no se guardó y los valores vigentes (nombre, tipo, objetivo y fecha);
  - «Revisar» carga lo vigente en el formulario, toma su versión y una clave nueva (`crypto.randomUUID()`), y solo entonces se puede guardar.
- **Autor.** La lectura de la meta no trae quién la cambió, y no se añadió una migración. El aviso es neutral: «Esta meta cambió mientras la editabas.». `goalRejection` ya no acepta `changedBy` y `copy.goals.errors.someone` desapareció. `copy.goals.errors.versionConflict` es neutral («Esta meta cambió en otro lugar. Ya ves lo último.») y lo usa también `goal-status-dialog.tsx` (lograr y archivar), que ya pedía la página otra vez y no tiene valores que sobrescribir. El copy nuevo de `copy.goals.sheet.conflict` queda para T056.
- **Pruebas de componente** (`goal-form-conflict.test.tsx`, 3):
  - tras JT011: ningún nombre, «Guardar» ausente y campos bloqueados, también con `requestSubmit`; «Revisando…» con «Volver a cargar», que vuelve a pedir la página; con la versión nueva, lo intentado y lo vigente;
  - «Revisar»: el formulario muestra lo vigente, y el segundo envío lleva `expectedVersion` 4, los valores vigentes y una clave distinta;
  - el diálogo de lograr muestra el texto neutral.
  - **Mutaciones** (temporales, restauradas desde una copia): sin la clave nueva en «Revisar», falla la segunda; con «Guardar» visible durante el conflicto, falla la primera.
- **E2E** (spec 4, `goals.e2e.ts`): Sara abre «Editar meta» y cambia el nombre. Desde otra sesión suya (`updateGoal` con su cliente), la meta pasa a «Japón 2027» con otro objetivo. Al guardar:
  - aviso de conflicto con lo intentado y lo vigente, sin «Tomás» ni «Alguien»;
  - sin «Guardar» y con el campo bloqueado;
  - la base conserva «Japón 2027» y la versión ganadora, también después de «Revisar»;
  - tras una nueva edición y «Guardar», la base tiene el nombre nuevo, el objetivo ganador y la versión + 1.
- **Corridas**:
  - `PORT=3500 npm run e2e:dev -- tests/e2e/goals.e2e.ts tests/a11y/goals.a11y.ts`: **exit 0, 130,52 s**. Build 29,89 s; E2E **3/3, 60,84 s** (la nueva, 6,1 s); axe **2/2, 38,31 s**.
  - `PORT=3500 npm run verify`: **exit 0, 73,09 s**. Dominio **84/84**; componentes **839 pasan / 2 omisiones previstas**, 64 archivos; typecheck y lint verdes.

## F68-2 · texto del conflicto en lograr y archivar (re-revisión externa sobre `d241836`)

- `copy.goals.errors.versionConflict` afirmaba «Ya ves lo último» cuando el `router.refresh()` podía no haber llegado o haber fallado. Ahora dice: «Esta meta cambió en otro lugar. Revisa su estado antes de intentarlo de nuevo.». Lo usa `goal-status-dialog.tsx`.
- La prueba del diálogo (`goal-form-conflict.test.tsx`) ahora exige además que el texto no afirme que la página ya se actualizó (`/ya ves|lo último|actualiz/i`).
- Corridas:
  - `vitest --project components src/features/goals`: **81/81**, 4 archivos.
  - `PORT=3500 npm run verify`: **exit 0, 68,47 s**. Dominio **84/84**; componentes **839 pasan / 2 omisiones previstas**, 64 archivos; typecheck y lint verdes.

---

# Evidencia · 004 · PR D · Gasto con meta y confirmaciones

Rama `claude/004-d-goal-expense-d92653`, sobre `main` en `7b42b3a` (PR A, B y C fusionados). Tareas T057–T066 y T059a, más el encargo del fundador del selector de tipos de meta; T067–T069 son humanas. Todo se ejecutó en local o contra `juntia-dev` con los scripts `:dev`, el guardia y el lock (puerto 3400); **no es evidencia de CI** (ADR-011 §9.8) y no se lanzó ningún run. Ninguna migración.

## T057–T059 · pruebas escritas primero (commit `24c2e78`)

- Componentes: `src/features/expenses/goal-funding/goal-funding.test.tsx` (31 casos): «Dinero del mes» por defecto y la ruta mínima; B1 pide solo las metas del contexto de la hoja (en Nosotros `{ context: "us" }` y ninguna personal, ni deshabilitada; cambiar la hoja a Nosotros vuelve a pedir y olvida la elección; un fallo de carga no se presenta como «no hay metas»); FundingLedger (propuesta 1.619.048 / 1.380.952 con mayor residuo, «Faltan $19.048», «Sobran $80.952», topes por aportante, uso ≤ gasto, Guardar bloqueado); B3 con «Japón ahora $11.340.000 → $9.720.000» y «Si Tomás aprueba $9.720.000 → $8.340.000»; la carga que viaja (solo meta, fondos propios y pedidos); Yo sin solicitud; ConfirmationBadge en sus cinco estados y «NO SE REGISTRÓ» solo con rechazo confirmado (con `unknown`: «Reintentar» y «Comprobar estado», campos bloqueados); B4 («No vence», «Cancelar solicitud»), B5 («Tus aportes en Japón $5.220.000 → $3.840.000», reparto, lo usado por Sara), B7, aportes cambiados (JT204 con el disponible) y versión vieja bloqueada hasta «Revisar» sin atribución; «Quitar el uso» con la versión del gasto, sobre un gasto anulado con su mensaje y «USO QUITADO» en el historial; la LimitNote; la confirmación de eliminar con el aviso del uso; la reactivación de F64-1; y el «Deshacer» de un gasto con meta.
- Spec E2E 4 (`tests/e2e/goals.e2e.ts`, +1 caso): dos sesiones con el dataset dorado (Sara pide 1.380.000 a Tomás; Tomás aprueba; una segunda solicitud, sembrada por la función real, la rechaza; los estados se ven en las dos sesiones al navegar) y la privacidad de B1: HTML y RSC de Inicio en Nosotros y la **respuesta de la Server Action de B1** sin la meta personal, con control positivo en Yo (la captura sí ve «Bicicleta de ruta» cuando viaja) y control positivo en Nosotros (la respuesta trae Japón). B1 no es una ruta: sus metas llegan por una Server Action al elegir «Con una meta», por eso se inspecciona esa respuesta (`route.fetch()`, como `tests/support/rsc-capture.ts`, que no se tocó).
- A11y: `tests/a11y/goal-expense.a11y.ts`, un caso ligero con los dos temas en el mismo contexto (B1–B3, B4, B7, B5, la LimitNote y la confirmación de quitar el uso; 390 px) y un caso `@sweep` (siete anchos, 200 % y 44 px).

## T059a · rojo contra `juntia-dev`

- Componentes (local): `npx vitest run --project=components src/features/expenses/goal-funding/` → **1 archivo falla, sin pruebas cargadas**: los módulos de `goal-funding/` no existían.
- E2E y axe: como en el PR C, `next build` hace typecheck de todo el repo y la prueba de componentes refería módulos inexistentes, así que se apartó **temporalmente** (sin commit) y se restauró después. `npm run e2e:dev -- tests/e2e/goals.e2e.ts tests/a11y/goal-expense.a11y.ts tests/a11y/goals.a11y.ts --grep "gasto con meta|Gasto con meta|Metas · axe ligero"`: build **pasó (36,37 s)**; E2E **1 falla** (`getByRole('radiogroup', { name: 'Cómo se pagó' })` no existe; la siembra del dataset dorado pasó); axe **falla** el caso nuevo por lo mismo. Total 324,47 s, exit 1.
- Selector de tipos (con el código viejo restaurado solo para esta corrida): `npm run e2e:dev -- tests/a11y/goals.a11y.ts --grep "Metas · axe ligero"` → **2 fallan** (claro y oscuro), y solo a 1440 px: `tipos de meta por fila` esperado `[4, 3]`, recibido `[7]`; `etiquetas de tipo cortadas` recibido `["Emergencias"]`. A 390 px ya iba 4 + 3. Es exactamente el problema que reportó el fundador.

## T060–T064 · implementación (commits `d00e2d4`, `629782b`)

- `src/features/expenses/goal-funding/`: Server Actions (`loadFundingGoalsAction`, `createExpenseWithGoalAction`, aprobar, rechazar, cancelar, quitar el uso, el deshacer y «Comprobar estado» con `write_status`), FundingLedger, B1 (`goal-picker.tsx`), B3 (`funding-effect.tsx`), ConfirmationBadge, la tarjeta de solicitud, «Quitar el uso» con la LimitNote y el contexto de financiación de Actividad. Lecturas en `src/features/goals/funding-load.ts` (`expense_goal_funding`, `usage_requests`, `goal_member_balances`; en Nosotros solo metas compartidas) y `src/lib/db/` (`listGoalsByScope`, `expenseGoalFundingFor`, `fundedSharedExpenses`).
- Las escrituras del gasto con meta viajan en `goalActions.funding`: el layout no cambia.
- La anulación (privada y compartida) devuelve `reactivatedGoals`; eliminar y quitar el uso dicen «La meta {nombre} volvió a estar activa: se devolvieron $X».
- Corrección de paso: las notas de «Apartado para metas» de Inicio (PR C) iban en gris sobre el verde de ahorro (4,38:1); axe del caso nuevo lo detectó y pasan a tinta.
- Encargo del fundador (commit propio `d00e2d4`): el selector de tipos de la hoja de meta va en 4 columnas en todos los anchos (4 + 3), con etiquetas que pueden partir línea y nunca se cortan; los siete tipos aprobados, sin íconos ni tipos nuevos.

## T065 · iteración dirigida contra `juntia-dev`

| Corrida | Resultado |
| --- | --- |
| 1.ª: E2E nueva + `goal-expense.a11y.ts` + `goals.a11y.ts` ligero | E2E: todo el recorrido pasa salvo la última aserción (`getByText` no exacto encontraba también la nota «Tomás no aprobó…»; se hace exacta). `goals.a11y.ts` **2/2 pasan** (el selector 4 + 3 ya en verde a 390 y 1440). `goal-expense.a11y.ts` falla: `color-contrast` en la nota de Inicio (arriba) |
| 2.ª: E2E nueva + `goal-expense.a11y.ts` | E2E **pasa, 28,6 s**. Axe: `color-contrast` del subtítulo de la meta elegida en B1 (gris sobre verde) y `aria-prohibited-attr` (un `aria-label` en un `<p>` de B5). Se corrigen: tinta en la elegida y texto solo para lectores de pantalla |
| 3.ª: `goal-expense.a11y.ts` | **Pasa, 19,1 s**; 0 violaciones serias o críticas en los 12 estados (6 × 2 temas) |

## T066 · capturas e Impeccable

- 54 capturas a **390 y 1440 en claro y oscuro** en `specs/004-presupuestos-y-metas/evidence/pr-d/capturas/`, con un script temporal no versionado contra `juntia-dev`: «Cómo se pagó», B1, B2 y B3, B2 con «Faltan» y Guardar bloqueado, B4 en Actividad con CON META, B4/B6/B7 en el detalle, B5 en Inicio de Tomás y en la meta, la LimitNote con «Quitar el uso», la confirmación, «Uso quitado», eliminar con el aviso del uso, la reactivación y la hoja «Nueva meta» a 1440 con los tipos en 4 + 3. Las notificaciones de una sola vez (13–15) solo a 390. Son capturas de iteración, no de CI.
- Impeccable: el CLI `impeccable detect` no está instalado en este equipo, así que no hay salida del detector; el hook de diseño de Impeccable revisó cada archivo editado sin hallazgos deterministas. Revisión visual sobre las capturas, con dos ajustes: la fila de uso en Actividad dice de quién son los aportes («Aportes de Sara · Tiquetes a Tokio», B4), y la tarjeta de solicitud dentro del detalle no repite el título del gasto.
- Hallazgo aparte, previo al PR D y fuera de su alcance: con la hoja de Anotar abierta, cruzar los 768 px (hoja ↔ diálogo) la remonta y pierde el monto escrito. Lo vio el script de capturas; no se corrigió aquí.

## T065 · corridas completas antes del push

| Corrida | Resultado |
| --- | --- |
| `npm run e2e:dev` completo (1.ª, sobre `629782b`) | **exit 1, 409,12 s**. E2E 32/34: falla «UX 2: la hoja de 390 px abre ajustada al contenido» (la hoja medía 776 px; límite 728) porque la fila nueva «Cómo se pagó» sumaba ~80 px; y «Cambiar Yo/Nosotros…» de la spec 3 por tiempo (57,6 s). Axe 99/100: «Nosotros · axe de Inicio…» de `couple-shared.a11y.ts` agotó sus 30 s |
| Arreglo (`c83da15`) | «Cómo se pagó» pasa a ser una ficha en la fila de «Hoy · Solo tú» con el valor elegido («Dinero del mes» o la meta), que abre la subhoja; el selector «Dinero del mes · Con una meta» queda arriba de B1. Sin fila nueva en la hoja. Las pruebas abren la ficha primero |
| Dirigida: UX 2 de la spec 2, «Cambiar Yo/Nosotros» de la 3, la E2E nueva y los a11y de pareja y de PR D | **Todo pasa**; `couple-shared.a11y.ts` ligero en 29,3 s y 27,8 s (al borde de 30 s) |
| `npm run e2e:dev` completo (2.ª, sobre `c83da15`) | **exit 1, 417,44 s**: la E2E nueva esperaba el cierre de la hoja 5 s y la escritura tardó más bajo la carga de la suite; el `@serial` de movimiento de la spec 3 (que en local corre en paralelo con todo) no vio el total nuevo a tiempo; y otra vez el límite de 30 s de `couple-shared.a11y.ts`. Aislados, los tres pasan (11,5 s, 32,4 s, 27,9 s y 27,2 s) |
| Arreglo (`446cdca`) | La E2E nueva espera el cierre hasta 15 s (el plazo de una escritura, FR-093); el caso ligero de `couple-shared.a11y.ts` lleva `test.slow()`, como los demás a11y con sesión de la 004, sin cambiar qué audita |
| **`npm run e2e:dev` completo (final)** | **exit 0, 452,52 s.** Build 16,85 s; E2E sin @mail **34/34, 101,87 s**; axe con sesión **100/100, 332,57 s**. Fuera, por contrato: las E2E @mail, `@sweep` y el proyecto evidence |
| **`npm run verify`** | **exit 0, 93,95 s: supera el presupuesto de 90 s (aviso del script, no bloquea).** Lint verde (solo el aviso previo de `balance-panel.tsx:61`); typecheck verde; dominio **84/84**; componentes **870 pasan / 2 omisiones previstas**, 65 archivos (59,29 s) |

- Componentes: en una corrida intermedia, con la máquina cargada, 4 casos de otros archivos agotaron su límite de 5 s; la siguiente corrida dio 519/519 y `verify` 870/870.
- **Presupuesto del job `e2e`**: la E2E nueva tarda ~28–42 s en `juntia-dev` y el a11y nuevo ~19–28 s. El gate del PR C midió 556 s con las cinco specs; con lo de este PR el job puede acercarse a los 660 s. El PR D corre las cinco specs por el selector (añade archivos en `tests/a11y/`, regla 6), como el PR C. No se tocó el workflow ni el tope; la medición es la del gate (gestor).

## Estado de las tareas del PR D

| Tarea | Estado |
| --- | --- |
| T057–T059 | Hechas (`24c2e78`) |
| T059a | Hecha: rojo local y contra `juntia-dev`, salidas arriba |
| T060–T064 | Hechas (`629782b`, `c83da15`) |
| Encargo del fundador (tipos 4 + 3) | Hecho (`d00e2d4`), con su comprobación a 390 y 1440 y la captura 16 |
| T065 | Hecha: dirigidas en verde, `e2e:dev` completo y `verify` en verde (este con aviso de tiempo) |
| T066 | Hecha: 54 capturas y revisión visual; sin salida del CLI de Impeccable (no instalado) |
| T067–T069 | Humanas (gestor y fundadores) |

## Revisión del gestor del PR #69 (sobre `2a20dd8`) · correcciones

1. **JT213 al editar** (bloqueante): la edición privada y la compartida dicen «Primero quita el uso de la meta o usa menos», sin «Reintentar» (ni «Comprobar estado»); los campos siguen editables. Dos pruebas de componentes nuevas.
2. **«Comprobar estado» de un gasto con meta en Yo**: se clasifica por valor (`funded-context.ts`: `payer_user_id` de texto y `parts` presentes = Nosotros). Prueba unitaria `goal-funding/write-status.test.ts` con los dos payloads; con la lógica vieja falla el caso de Yo (comprobado: 1 falla, 2 pasan) y con la nueva pasa. La forma real la confirma `tests/integration/planning-adapters.test.ts` contra `juntia-dev`: el payload privado guardado trae `payer_user_id: null` y `split_mode: null`.
3. **Privacidad de Anotar en la spec 4**: en lugar de pedir `/` a mano, la navegación y el prefetch con `tests/support/rsc-capture.ts` (cada RSC clasificado por su cookie). Control positivo en Yo: el RSC de Inicio trae «Bicicleta de ruta» y su id. Mutación: el mismo detector de fugas, sobre ese RSC de Yo, la encuentra; sin eso la prueba no probaría nada. En Nosotros (cambio de contexto, Actividad e Inicio con hover), ningún RSC la lleva y el de Inicio trae Japón. La parte de la Server Action de B1 no cambia.
4. **Tiempo del CI**: el selector clasifica `tests/a11y/**/*.a11y.ts` como neutro (decisión del gestor), con tres fixtures nuevos en `tests/e2e-select.test.ts` (axe solo, PR D con su axe y `tests/support/` que sigue compartido) y la nota en `contracts/ci.md`. Recorte de la E2E nueva (mitigación b): sin las aserciones de saldo tras crear, aprobar y rechazar (`listGoals`, `goalMemberBalances`; las cubren integración y pgTAP), que pasan a comprobar el estado de la solicitud; y el B1 de Tomás solo comprueba que su respuesta no filtra, al final, sin abrir y descartar la hoja a mitad del recorrido. `test.slow()` en `couple-shared.a11y.ts` se queda: su caso ligero midió 48,2 s en la corrida dirigida de esta ronda (más de sus 30 s) y el recorte de la E2E no lo afecta.
5. JT225 en el deshacer de un gasto con meta usa `copy.goals.errors.undoNotAvailable`.
6. La reactivación de F64-1 va además de «Gasto eliminado» («Gasto eliminado. La meta … volvió a estar activa: …»).
7. Eliminar un compartido con solo una solicitud pendiente dice «La solicitud pendiente también se cancela.»; el aviso de los fondos solo con uso aplicado.
8. Actividad en Nosotros lee `usage_requests` una vez: `monthFunding` devuelve también las pendientes.
9. Las cuentas de FundingLedger y el uso inicial, en `bigint`.
10. Tarjeta de solicitud con resultado desconocido: el aviso se puede cerrar con «¿Cerrar sin confirmar?» (el mismo `UnconfirmedClose` de las hojas de metas); al cerrar se dice «No pudimos confirmar si se guardó. Revisa el estado de la solicitud antes de volver a intentarlo.», se pide la página otra vez y las acciones vuelven con la MISMA clave (repetir es la misma intención). Prueba de componentes nueva.

Corridas de esta ronda (solo lo afectado; no se tocó `tests/support/` ni los fixtures compartidos, así que no hay `e2e:dev` completo):

| Corrida | Resultado |
| --- | --- |
| `vitest --project components src/features/expenses` | **207/207** |
| `npm run test:integration:dev` (corre la suite entera) | **exit 0**: 20 archivos, **145 pasan / 9 omitidas**; `planning-adapters.test.ts` 1/1 |
| `e2e:dev -- goals.e2e.ts goal-expense.a11y.ts couple-shared.a11y.ts` (grep de los casos) | La E2E nueva falló después de la privacidad (ya en verde): la sesión de Sara se abría en Yo y su script inicial reinstalaba «Yo» en cada carga; se separan las dos sesiones. Axe **3/3** (`couple-shared` 48,2 s y 26,4 s; `goal-expense` 27,2 s) |
| `e2e:dev -- tests/e2e/goals.e2e.ts` | **exit 0, 118,12 s**: spec 4 **4/4**, el caso nuevo en **36,7 s** |
| `npm run verify` | **exit 0, 69,86 s**: lint (solo el aviso previo), typecheck, dominio 84/84, componentes **879 / 2 omisiones previstas** |

Selector para este PR tras el cambio: **sigue pidiendo las cinco** por `scripts/e2e-select.mjs`, `tests/e2e-select.test.ts`, `src/components/ui/expense-row.tsx` y `src/features/shared/` (`write-result.ts`, `shared-row.tsx`); la regla de axe ya no cuenta.

## Desviaciones aprobadas por los fundadores (10 de noviembre de 2026, tras ver las capturas)

1. **Ficha «Cómo se pagó» con subhoja.** Desviación aprobada por los fundadores el 10 de noviembre de 2026: en lugar de una fila propia (comp 04·11), «Cómo se pagó» es una ficha en la fila «Hoy · Solo tú» que abre una subhoja, para que la hoja de 390 px respete su altura máxima (UX 2); «Dinero del mes» sigue por defecto y la ruta mínima no cambia. Nota corta con la misma referencia en `docs/design/COMPONENT_SPECIFICATIONS.md`, flujo «Gasto con meta», sin reescribir el comp.
2. **Metas logradas en B1.** FR-050 de `spec.md` dice ahora «una sola meta activa o lograda (nunca archivada; Q15 y FR-032: una meta lograda admite usos) del mismo contexto (aprobado por los fundadores el 10 de noviembre de 2026)». Ninguna prueba citaba el texto viejo de FR-050.

## Revisión de ChatGPT del PR #69 (sobre `87f0437`) · F69-1 a F69-4

- **F69-1.** Editar y eliminar un gasto **privado** (con o sin meta, un solo camino) siguen el contrato común: `updateTransactionAction` y `voidTransactionAction` devuelven `ok`/`rejected`/`unknown` con `runWrite`; «Comprobar estado» nuevo, `privateWriteStatusAction`, lee `write_status` con `update_transaction` y `void_transaction` (las dos acciones ya se guardan en `idempotency_records` desde la 002: `20261105000300_money_functions.sql`, líneas 86 y 123). La edición usa `useWrite` en la hoja (15 s, campos bloqueados, «Reintentar» con la misma clave, «Comprobar estado»; un rechazo confirmado no ofrece reintentar). La eliminación usa `useWrite` con «¿Cerrar sin confirmar?». Lo recuperado de una eliminación trae `reactivatedGoals` como la respuesta normal. **La creación no cambia** (ruta mínima de la spec 2); el «Deshacer» de una creación privada adapta su lectura al resultado nuevo, con los mismos textos y «Reintentar» con la misma clave ante un desconocido. Pruebas nuevas en `src/features/expenses/private-writes.test.tsx` (respuesta perdida después del commit y «Comprobar estado», en editar y en eliminar; cierre con desconocido; rechazos confirmados) y las existentes adaptadas (`annotate-sheet`, `delete-dialog`, `edit-sheet`, `annotate-shared`, `goal-funding`).
- **F69-2.** Los avisos de conflicto y de «ya eliminado» de un compartido son neutrales: «Este gasto cambió en otro lugar. Revisa su estado antes de intentarlo de nuevo.» y «Este gasto ya se eliminó.» (para T069). `couple-shared.a11y.ts` comprueba ahora que el aviso no nombra a nadie (falla ante «Tomás…», «Sara…» o «Alguien…»), y `shared-edit.test.tsx` también.
- **F69-3.** «Comprobar estado» de `void_shared_expense` conserva `reactivatedGoals`; `void_settlement` no cambia. `src/features/expenses/void-status.test.ts` compara la respuesta normal con la recuperada en un compartido y en un privado; con el código anterior falla el compartido (1 de 3) y con el nuevo pasan los 3.
- **F69-4.** Tras un desconocido en una escritura con «Reintentar» y «Comprobar estado» propios (gasto con meta, compartido, edición), Guardar queda deshabilitado; solo siguen esas dos acciones (prueba en `private-writes.test.tsx`). La creación privada conserva su regla: tras un fallo ambiguo, Guardar es el mismo reintento con la misma clave (decisión del fundador del 5 de noviembre de 2026; la prueba existente lo exige).

| Corrida | Resultado |
| --- | --- |
| `npm run verify` | **exit 0, 99,27 s: supera el presupuesto de 90 s (aviso).** Lint (solo el aviso previo), typecheck, dominio 84/84, componentes **888 / 2 omisiones previstas** |
| `npm run e2e:dev` completo | **exit 1, 501,10 s.** E2E 31/34, axe 98/100. Fallan: «gasto compartido 50/50…» y el `@serial` de movimiento de la spec 3, y el `@serial` de movimiento de la spec 2 (el número héroe no sube a tiempo tras anotar y la app lleva a Actividad); y `goals.a11y.ts` y `plan.a11y.ts` por **«ensure_profile falló en la siembra»** (entorno) |
| Dirigidas: las tres E2E, `goals.a11y.ts` y `plan.a11y.ts` | Los dos a11y y el `@serial` de la spec 2 pasan; los dos casos de la spec 3 vuelven a fallar |
| La misma prueba («gasto compartido 50/50…») sobre **`87f0437`** (los cambios de esta ronda apartados con un stash etiquetado y restaurados después) | **También falla**, igual. No es una regresión de esta ronda: ese código pasó el `e2e:dev` completo de antes (`446cdca`, exit 0). El síntoma es que la revalidación tras anotar no llega dentro del ~1 s que espera el resaltado de E5 en `juntia-dev` hoy |
| Specs 1, 2, 3 y 4 + `couple-shared.a11y.ts` | **exit 1, 229,44 s.** E2E 29/32: los mismos dos casos de la spec 3 y, esta vez, «N → monto → categoría reciente → Guardar…» de la spec 2, por la misma causa (el héroe sigue en $412.900 y la página pasa a Actividad). La spec 1 y la spec 4 pasan; `couple-shared.a11y.ts` 2/2 |

Las fallas de héroe/E5 no tocan código de esta ronda (la creación no cambió) y se reproducen en el commit anterior; quedan para el gate de CI, que es la evidencia.

## Regresión de E5 en Inicio de Nosotros (pedido del gestor sobre `5c80a3b`)

- **Reinicio de `juntia-dev`**: `npm run db:dev:reset` lo **denegó el clasificador de permisos** de esta sesión; no se ejecutó ni se buscó otro camino. Todo lo de abajo corre sobre el `juntia-dev` acumulado.
- **Comparación por versión** (worktree aparte, `git worktree add --detach`, con su propio `npm ci`), con `npm run e2e:dev -- tests/e2e/couple-settle.e2e.ts --grep 'motion activo'` («@serial motion activo: E5 al anotar en Nosotros…», spec 3), una corrida por fila:

| Versión | Resultado |
| --- | --- |
| `main` (`7b42b3a`) | 5 de 6 pasan |
| PR D `87f0437` | 0 de 2 |
| PR D `5c80a3b` | 0 de 5 |
| `5c80a3b` sin leer solicitudes en Inicio (prueba temporal) | 3 de 5 |
| `5c80a3b` con esa lectura en paralelo (prueba temporal) | 0 de 4 |
| **Con la corrección** | **6 de 7** |

- **Causa**: el PR D añadió a Inicio de Nosotros una lectura de `usage_requests`; en este `juntia-dev` esa consulta es lenta y la revalidación tras anotar no llega dentro de la ventana del resaltado de E5 (~1 s), así que la app lleva a Actividad y el héroe no se ve subir. Leerla en paralelo no basta: es la rama más lenta.
- **Corrección**: `goals_overview` ya trae `has_pending_request`; Inicio solo lee las solicitudes si alguna meta tiene una pendiente, y Actividad solo si hay usos en el mes o alguna pendiente (`loadHomeGoals`, `monthFunding`). Sin solicitudes, la revalidación no paga esa lectura.
- La spec 2 («N → monto…» y su `@serial`) da lo mismo en `87f0437` y en `5c80a3b` (pasan en dirigida). «Gasto compartido 50/50…» de la spec 3 **falla también en `main`**.

| Corrida completa | Resultado |
| --- | --- |
| `npm run e2e:dev` sobre **`main`** (`7b42b3a`) | **exit 1, 468,62 s**: E2E 30/33 («N → monto…» y el `@serial` de la spec 2, «gasto compartido 50/50…» de la spec 3), axe 98/99 (`couple-shared.a11y.ts`, 30 s agotados) |
| `npm run e2e:dev` sobre el PR D **con la corrección** | **exit 1, 502,09 s**: E2E 31/34 (el `@serial` de la spec 2, «gasto compartido 50/50…» y el `@serial` de la spec 3, que en la completa corre en paralelo con todo), axe 99/100 (`balance.a11y.ts`, 30 s agotados) |
| `npm run verify` | **exit 0, 105,52 s** (aviso: más de 90 s). Componentes **888 / 2 omisiones previstas**. Antes, dos casos de `goal-funding.test.tsx` agotaban su límite de 5 s con la máquina cargada; ese archivo usa ahora 15 s, como otras pruebas de hojas |

En la corrida completa local, los casos de E5 y los límites de 30 s fallan igual en `main` que en el PR D: la diferencia atribuible al PR D era la del `@serial` dirigido, y queda corregida.

## E5 espera el árbol revalidado (causa propuesta por la revisión de `5c80a3b`, confirmada con traza)

- **Traza** (E2E temporal, no versionada, contra `juntia-dev`; Inicio de Nosotros, anotar $100.000; tiempos en ms desde Enter; 3 corridas): la Server Action responde a 470 / 384 / 393; el árbol revalidado llega con la fila y el héroe a **1.508 / 1.427**; en la tercera, `pushState /actividad?mes=2026-11` sale a **1.433** (60 cuadros después del guardado) y la fila aparece a 2.912, ya en Actividad. Es la carrera de los 60 cuadros de `annotate-provider.tsx` con un RSC lento.
- **Corrección** (`annotate-provider.tsx`, `annotate-sheet.tsx`): cada árbol que entrega el servidor llega al proveedor como unos `children` nuevos del layout. La hoja marca el inicio de la escritura (`onWriteStart`) y E5 espera un árbol **posterior** a esa marca: si trae la fila, la resalta en la misma pantalla; si llega sin ella, lleva a Actividad del mes a los 3 cuadros; si no llega nunca, el tope de seguridad de 10 s pide otra revalidación y lleva a Actividad, como antes. Sin esperas fijas. El comportamiento aprobado de E5 no cambia.
- **Pruebas de componentes** (`annotate-sheet.test.tsx`, con `requestAnimationFrame` controlado y una `revalidate()` que vuelve a entregar los `children`): refresco lento (100 cuadros sin árbol nuevo, no navega; llega con la fila, no navega), árbol sin la fila (navega a los pocos cuadros, no antes) y tope de seguridad (10 s). Con el proveedor anterior las tres fallan; con el nuevo pasan. `home-reveal.test.tsx` (F51-13) revalida antes de esperar la navegación, con la misma intención. Las dos pruebas F45-2 de navegación revalidan tras guardar.

| Corrida | Resultado |
| --- | --- |
| Traza con la corrección (3 corridas) | La acción a 491 / 300 / 327; el héroe sube en Inicio a **1.557 / 1.253 / 1.308**; **ningún `pushState`** |
| Dirigida: «N → monto…» y el `@serial` de la spec 2; «gasto compartido 50/50…» y el `@serial` de la spec 3 | **4/4 pasan** («gasto compartido 50/50…» fallaba también en `main`) |
| `npm run verify` | **exit 0, 67,72 s**: dominio 84/84, componentes **890 / 2 omisiones previstas** |
| **`npm run e2e:dev` completo** | **exit 0, 409,95 s**: build 11,45 s; E2E **34/34** (125,80 s); axe con sesión **100/100** (271,44 s) |

El reinicio de `juntia-dev` no se hizo (el clasificador de permisos lo denegó): todo lo anterior corre sobre el `juntia-dev` acumulado.

## F69-5 · E5 decide por los ids que trae el servidor, no por la llegada de un árbol (revisión de `7afdbe5`)

- **Hallazgo**: `trees.current > reveal.since` solo probaba que el layout había entregado unos `children` nuevos, no que fueran los de esta escritura. Un `router.refresh()` ajeno (volver a la pestaña) sin la fila llevaba a Actividad aunque el árbol bueno llegara después.
- **Corrección** (la más simple ligada a la escritura): las listas montadas ya informan al proveedor de los ids de su mes con `useListScope` (Inicio informa de todos los del mes, aunque pinte 5). Ahora informan también Inicio y Actividad de Nosotros. E5 decide así:
  1. ninguna lista de la pantalla es del mes del gasto (otro mes, o una ruta sin lista): la fila no puede estar ahí y va a Actividad enseguida;
  2. la lista del mes ya trae ese id pero la fila no se ve (fuera de los 5 recientes): va a Actividad a los 3 cuadros;
  3. todavía no lo trae: espera, aunque lleguen árboles ajenos, hasta el tope de 10 s; entonces pide otra revalidación y va a Actividad, como antes.
  Se quitan el contador de árboles y `onWriteStart`.
- **Pruebas** (`annotate-sheet.test.tsx`): regresión exigida. Primero llega un árbol ajeno sin la fila y pasan 80 cuadros sin navegar; luego llega el posterior con la fila guardada, que se resalta en Inicio. Con el proveedor de `7afdbe5` falla; con el nuevo pasa. Se mantienen el refresco lento, otro mes (ahora sin esperar), fuera de los 5 recientes (el servidor trae el id; Inicio no lo pinta), sin revalidación (tope de 10 s) y F51-13.

| Corrida | Resultado |
| --- | --- |
| `vitest --project components src/features` | **536/536** |
| `npm run verify` | **exit 0, 106,37 s: supera el presupuesto de 90 s (aviso).** Dominio 84/84, componentes **890 / 2 omisiones previstas** |
| `npm run e2e:dev -- tests/e2e/annotate.e2e.ts tests/e2e/couple-settle.e2e.ts` (specs 2 y 3 completas) | **exit 0, 137,20 s**: **21/21**, E2E 107,63 s |

## Barrido T068 (run 42939346411 sobre `7afdbe5`) · «Quitar el uso de la meta» al 200 %

- **Fallo** (el único de 107): `goal-expense.a11y.ts`, «detalle con LimitNote · 200 %: sin scroll horizontal», 392 / 390. `Button` no parte su etiqueta (`whitespace-nowrap`, alto fijo) y «Quitar el uso de la meta» no cabía al 200 %.
- **Arreglo**, sin tocar el `Button` compartido: los botones del gasto con meta (`goal-funding/wrap-label.ts`: el disparador y la confirmación de quitar el uso; aprobar, rechazar, cancelar y «Revisar» de la tarjeta de solicitud) pueden partir la etiqueta en dos líneas. Conservan el alto mínimo de su tamaño, y las dos caras (reposo y carga) siguen en la misma celda: el ancho no salta al cargar y nada se corta.
- **Comprobación nueva** en el `@sweep` del archivo: el detalle con meta (LimitNote, «Quitar el uso», Editar y Eliminar) a **320 px**, con el texto normal y al 200 %.
- `A11Y_LEVEL=sweep npm run e2e:dev -- tests/a11y/goal-expense.a11y.ts`: **exit 0, 32,23 s.** Sin scroll horizontal en los siete anchos y los dos temas (B2/B3, B5 y el detalle). Al 200 %: Anotar 390/390, B5 390/390 y detalle **390/390**; detalle a 320 px **320/320** y a 320 px · 200 % **320/320**, sin texto cortado. Objetivos: «Aprobar $200.000» 171,8×44, «Rechazar» 138,9×44 y «Quitar el uso de la meta» 320×52.
- Pasada ligera del archivo: **exit 0, 53,29 s.** `npm run verify`: **exit 0, 101,60 s** (aviso: más de 90 s), componentes 890 / 2 omisiones previstas.
- **Fuera de alcance, para el gestor:** a 320 px y al 200 %, en Inicio de Nosotros, el título «Japón» de la tarjeta de la pila (GoalCard del PR C, `line-clamp-2`) queda cortado. El barrido oficial empieza en 360 y ahí no ocurre. No se tocó.

## F69-6 · E5 cuando el gasto se guarda en un contexto distinto del de la página (revisión de `ac92923`)

- **Hallazgo**: la hoja tiene su propio selector Yo/Nosotros y guardar no cambia el contexto de la app. Un compartido anotado desde Inicio en Yo (o un privado desde Inicio en Nosotros) dejaba a E5 esperando los 10 s, porque la lista del mes estaba montada pero nunca iba a traer ese id. Al final llevaba a Actividad de un contexto que tampoco lo enseña.
- **Corrección**:
  1. `Reveal` lleva `context`, el de la escritura (privado `me`, compartido `us`, gasto con meta el suyo).
  2. `useListScope(month, ids, contexts)`: cada lista se registra por separado (`useId`), con su mes, sus contextos y sus ids. Ya no hay unión por mes (punto 5 opcional). Actividad de Yo pasa `["me"]` y Nosotros (Inicio y Actividad) `["us"]`. Inicio de Yo pasa `["me", "us"]` cuando hay pareja, y entonces informa también de los ids de tu parte de lo compartido.
  3. La fila de tu parte compartida en Inicio de Yo (`HighlightSharedPart`) lleva `data-transaction-id` y el mismo estado «nueva» que `ExpenseRow`. Si E5 la encuentra y el gasto es de otro contexto, la resalta en el contexto de la página.
  4. Las listas candidatas son las del mes del gasto que pintan su contexto. Si no hay ninguna, E5 termina enseguida. Si una ya trae el id y la fila no se ve, termina a los 3 cuadros. Si no lo trae, espera hasta el tope de 10 s. Cuando el gasto es del contexto de la página, «terminar» es lo de antes: otra revalidación y Actividad del mes. Cuando es de otro contexto, E5 solo deja de mirar: no navega, no espera y no cambia el contexto. Queda el aviso «Gasto guardado · Deshacer».
- **Pruebas** (`reveal-context.test.tsx`, 4 nuevas):
  - un compartido desde una vista de Yo que no pinta lo compartido termina al primer cuadro, sin `push` ni `refresh`;
  - el inverso, un privado desde Inicio en Nosotros, termina igual;
  - en Inicio de Yo con pareja, E5 espera la lista y luego resalta la parte compartida (`data-new`), sin navegar;
  - en Inicio de Yo con pareja, si el compartido llega fuera de los 5 recientes, termina a los pocos cuadros sin ir a Actividad de Yo.
  
  Las de `annotate-sheet.test.tsx` y `home-reveal.test.tsx` siguen igual: el arnés pasa ahora `["me"]`.

| Corrida | Resultado |
| --- | --- |
| `vitest --project components` (completo) | **894/894, 2 omisiones previstas** |
| `npm run verify` | 1.ª corrida: **falló** con 3 *timeouts* de componentes, entre ellos `shared-edit.test.tsx:147`, «una respuesta tardía de «Deshacer»…», que no toca este cambio (la misma suite pasa sola). 2.ª corrida: **exit 0, 103,41 s** (aviso: más de 90 s); dominio 84/84, componentes 894 / 2 omisiones previstas |
| `npm run e2e:dev -- tests/e2e/annotate.e2e.ts tests/e2e/couple-settle.e2e.ts` (specs 2 y 3 completas) | **exit 0, 139 s**: build 24,08 s; **21/21** (1,8 min) |

## F69-7 · Una lista en carga cuenta como candidata (revisión de `e2d9ef3`)

- **Hallazgo**: durante Nosotros → Yo, ContextView enseña el Skeleton de Yo hasta que llega el RSC. Un privado confirmado en ese momento no encontraba ninguna lista de Yo montada. E5 lo trataba como «la página no puede mostrarlo» y llevaba a Actividad, aunque Inicio en Yo lo iba a enseñar.
- **Corrección**: el registro se hace en `ContextView`, el único punto que sabe que el Skeleton de un contexto concreto está esperando su RSC. Las páginas con lista (Inicio y Actividad) le pasan `listMonth`. Mientras pinta el Skeleton del contexto elegido, ya hidratado, se registra una lista de ese mes y contexto sin ids. La vista real la reemplaza al montar, porque el Skeleton se desmonta en el mismo commit. Metas, Plan y Balance no pasan `listMonth` y siguen saliendo enseguida. No se recupera el contador de árboles ni cambian los tiempos.
- **E5 distingue tres casos**:
  - sin lista compatible: termina enseguida, como en F69-6;
  - con una lista compatible en carga o que todavía no trae el id: espera, con el tope de 10 s;
  - con una lista que ya trae el id: resalta la fila o, si no se ve, termina tras 3 cuadros.
- **Pruebas** (`reveal-context.test.tsx`):
  - la regresión exigida: Skeleton de Inicio durante Nosotros → Yo; un privado confirmado antes del RSC pasa 40 cuadros sin navegar; luego monta Inicio de Yo con el id y la fila se resalta. **Sin `listMonth` falla**: `push` se llama una vez;
  - el contraste: una página sin `listMonth` sale enseguida a Actividad.
  
  Se mantienen las de F69-5 y F69-6.

| Corrida | Resultado |
| --- | --- |
| `vitest reveal-context.test.tsx` | **6/6**; con `listMonth` quitado del arnés, la regresión **falla** (`push` llamado 1 vez) |
| `npm run verify` | **exit 0, 80,14 s**: dominio 84/84, componentes **896 / 2 omisiones previstas** |
| `npm run e2e:dev -- tests/e2e/annotate.e2e.ts tests/e2e/couple-settle.e2e.ts`, 1.ª | **exit 1, 143 s: 20/21**. Falló «desconocido: respuesta perdida…» (`annotate.e2e.ts:360`): Actividad seguía en «Cargando movimientos» (loading.tsx) cuando se agotaron los 5 s. El RSC de `juntia-dev` iba lento; la página es de Yo y no pinta Skeleton de contexto |
| La misma prueba sola, ×2 | **1/1 y 1/1** (14,9 s y 10,2 s) |
| Specs 2 y 3, 2.ª | **exit 0, 107 s**: build 9,84 s; **21/21** (1,6 min) |
