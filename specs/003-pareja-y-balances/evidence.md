# Evidencia — 003 PR A

Rama `feat/003-a-database`, base `main` `0c25e8b`. Sin producción ni datos reales.

## Iteración (no cierra [V])

- Preparación: `npm run db:dev:reset`, guardia `itfrhnadovezpahikuol`, 3 migraciones, esquema `tests` presente, 6,97 s. Lock liberado normalmente.
- T002 rojo, antes del código: `npm run test:unit -- src/domain/allocations/allocations.test.ts`, 1 suite fallida: `Cannot find module '.'` (módulo de reparto aún inexistente), 523 ms.
- T002 verde: mismo comando, 4 tests pasan, 620 ms.
- T003/T004/T006 rojo: `npm run test:unit -- src/domain/balances src/domain/couple src/domain/transactions/transactions.test.ts`, módulos de balance y pareja inexistentes; `meMonthSummary is not a function`, 679 ms. Diez tests existentes pasan.
- T003/T004/T006 verde: mismo comando, 3 archivos, 15 tests pasan, 538 ms. `npm run typecheck` terminó con código 0 antes de añadir el fixture compartido y los tests de T007.
- Línea base SQL de la 002: `npm run test:db:dev`, 11 archivos pgTAP pasan, total 37,80 s. Solo las tres migraciones existentes. Lock liberado normalmente.

## T007 — aclaración del gestor, resuelta

T007 exige `src/lib/db/errors.test.ts` en Vitest `domain`. La configuración actual
`vitest.config.mts` incluye solo `src/domain/**/*.test.ts` en ese proyecto y asigna
los tests de `src/lib/db/` al proyecto `components`.

Comando ejecutado después de escribir las nuevas expectativas y antes de implementar
el mapeo:

```text
npm run test:unit -- src/lib/db/errors.test.ts
No test files found, exiting with code 1
projects: domain
include: src/domain/**/*.test.ts
```

La tarea dice Vitest domain; se ejecuta en components, como en la 002 (C10). Error de redacción de tasks.md, sin cambio de alcance.

Aclaración explícita del gestor en este chat: conservar configuración y tareas;
ejecutar `npx vitest run --project components src/lib/db/errors.test.ts`.
Rojo funcional antes del mapeo: 21 fallan (JT101–JT119 y los dos índices 23505),
24 pasan, 787 ms. Verde después: 45 pasan, 492 ms.

T005b y resto de dominio: `npm run test:unit`, 7 archivos, 42 tests pasan,
749 ms; reproduce los dos estados dorados. `npm run typecheck`: código 0.
T008: glosario actualizado con los identificadores aprobados de la 003.

`npm run verify` fuera del sandbox: **pasa**, 55,48 s. Lint 17,96 s;
typecheck 3,35 s; dominio 42 tests (7 archivos), 1,66 s de comando;
components 298 pasan / 2 omitidos (31 archivos), 32,50 s de comando.
El intento anterior dentro del sandbox falló por EPERM en renames de archivos
temporales de las pruebas del lock; no se modificaron esas pruebas ni sus scripts.

## T009 / T010 — iteración SQL

Rojo antes de `couple_foundation`: `npm run test:db:dev`, 32,89 s,
`role "juntia_membership" does not exist`, `relation "public.my_couple" does
not exist`, `relation "juntia_data.groups" does not exist`. Semilla y arnés
anteriores pasan. Solo juntia-dev, lock liberado normalmente.

Primer pase con la migración: 39,03 s; corrigió el inventario esperado de las
cuatro auxiliares y la selección de `NEW.id`/`NEW.group_id` en el trigger.
Todavía no cierra ninguna [V].

## T010 — UPDATE de pareja descartada: interpretación del gestor

El modelo §2.1 exige `JT119` para cualquier UPDATE de una pareja `discarded`.
La política SELECT de writer de §5 permite solo `is_group_member(id) or
is_invited_to(id)`. Tras descartar y liberar la membresía, ambas son falsas.
Aunque `groups_writer_update` contiene `owner_user_id = current_uid()`, PostgreSQL
también exige la visibilidad SELECT: el UPDATE directo afecta a cero filas y no
dispara el trigger BEFORE UPDATE. La fila no cambia, pero no se lanza JT119.

Salida real de `npm run test:db:dev` (solo juntia-dev):

```text
ok 19 - propietaria no activa sola
ok 20 - sin efecto
ok 21 - misma versión
ok 23 - no descarta activa
ok 24 - no devuelve activa a provisional
ok 25 - activa intacta
not ok 26 - no reactiva descartada a provisional
# caught: no exception
# wanted: JT119
not ok 27 - no reactiva descartada a activa
# caught: no exception
# wanted: JT119
ok 28 - descartada intacta
```

Otros dos fallos del archivo son del arnés `has_trigger` (sobrecarga de tres
argumentos), pendientes de corregir; no son evidencia de ausencia de los triggers.
RLS sin recursión, tercera cuenta sin filas, `my_profile` propio y los índices de
unicidad pasan en este pase. No se consideran [V] cerradas: falta CI.

Las descartadas no son visibles a juntia_writer por RLS; el UPDATE directo afecta a 0 filas sin efectos y JT119 queda como defensa en profundidad. Interpretación del gestor; data-model l. 65–66 se precisará en un PR de documentación.

Resolución explícita en este chat: no ampliar SELECT. El caso 3 comprueba cero
filas como writer y, fuera del rol, compara toda la fila del grupo, membresías e
invitaciones con una instantánea anterior. El guard se ejercita también como
postgres (dueño de la tabla) y debe lanzar JT119 sin efectos. No se modifican
spec, plan, tasks.md ni vitest.config.mts. La misma nota va en la descripción del PR.

Para T017/T019 quedan obligatorias las pruebas de cancel/regenerate sobre una
descartada: error, nunca éxito silencioso; y reintento idempotente de cancel con
la misma clave que devuelve el resultado guardado antes de buscar/bloquear la
raíz ya invisible. La comprobación de row_count sigue siendo obligatoria.

Al retomar T010, el runner rechazó la ejecución antes de conectarse: lock de la
rama `fix/ux-batch-1`, comando `e2e`, desde `2026-11-06T17:17:45.771Z`, PID
36792. Se confirmó con una consulta de procesos de solo lectura que el PID
seguía vivo. Se espera su liberación; no se ha usado `--force` ni se ha escrito
en la base durante esta espera. La revisión automática rechazó una inspección
combinada con `dev:unlock`; el comando no se ejecutó. Se sustituyó por consultar
solo el proceso, sin desbloquear nada.

## T010 — salida tras la interpretación y nuevo bloqueo de creación

Tras liberarse el lock, `npm run test:db:dev` adquirió el suyo normalmente,
reinició con las 4 migraciones y terminó en 44,90 s. Se liberó normalmente.
No se ejecutaron comandos de desbloqueo ni se tocó producción.

```text
01_privileges: pasó (296)
03_views: pasó (14)
05_direct_writes: pasó (42)
10a_couple_tables:
ok 26 - RLS: descartada a provisional afecta 0 filas
ok 27 - estado, versión, membresías e invitaciones idénticos tras provisional
ok 28 - RLS: descartada a active afecta 0 filas
ok 29 - estado, versión, membresías e invitaciones idénticos tras active
ok 30 - guard rechaza descartada a provisional sin RLS
ok 31 - guard rechaza descartada a active sin RLS
ok 32 - sin efectos también cuando el guard rechaza
not ok 33 - writer puede crear la raíz provisional y su propia membresía
# died: 42501: new row violates row-level security policy for table "group_members"
```

Los fallos del arnés `has_trigger` quedaron corregidos y esas dos comprobaciones
también pasan (casos 2 y 3). Los demás archivos pgTAP pasan: 00 (1), 02 (4), 04
(18), 06 (12), 07 (28), 08 (45), 09 (6). No es evidencia definitiva de [V]: solo CI.

**Bloqueo reproducido, regla 6.** La política `members_writer_insert`, según
data-model §5, exige que la fila propia de owner pertenezca a una raíz provisional
cuya propietaria es quien llama, comprobándolo con `exists(select ... groups)`.
La política `groups_writer_read` solo admite miembro o invitado. En la primera
creación no existe ninguno todavía: INSERT de groups funciona, pero la consulta
del INSERT de group_members no ve esa raíz y da 42501. El arnés ejecuta ambas
sentencias en un bloque; el fallo revierte toda la creación, sin grupo huérfano.

Resolución explícita posterior del gestor en el chat:

SELECT de groups ampliado a la provisional propia (owner_user_id = current_uid() and status = 'provisional') para que la primera creación pueda insertar la membresía de la propietaria; descartadas invisibles. Autorizado por el gestor; data-model §5, l. 282, se precisará en el PR de documentación.

Se aplica exclusivamente esa disyunción en `groups_writer_read`, sin nueva
política UPDATE ni nueva auxiliar. La misma nota va en la descripción del PR.
Los tests cubren la tercera cuenta sin acceso a la provisional de Sara y que
Sara deja de verla tras descartarla. Tomás, antes de aceptar, no ve la raíz como
`authenticated` (aun concediendo USAGE de esquema solo dentro del test).
`is_invited_to` sí cubre su correo: como `juntia_writer` la política permite leer
las columnas de la raíz `id`, `kind`, `status`, `owner_user_id`, `currency`,
`time_zone`, `version`, `created_at`, `activated_at`, `discarded_at`.
No contiene correo invitado ni token. La persona no puede asumir writer ni
nombrar la tabla con los grants de la app: la lectura de invitación de la app
será únicamente `preview_invitation` (T019), cuyo resultado está limitado por
el contrato. Esa función aún no existe y no se presenta como verificada.

Las pruebas de funciones para descartadas y el reintento idempotente de cancelar siguen asignadas a
T017/T019: aún no existen esas funciones y no se presentan como verificadas.

## T010/T011 — iteración en verde

La prueba positiva de primera creación había fallado antes del cambio SELECT
(42501 sobre `group_members`, salida anterior). Tras aplicar únicamente la
disyunción autorizada por el gestor:

```text
npm run test:db:dev
4 migraciones; esquema tests presente
00: 1 / 01: 296 / 02: 4 / 03: 14 / 04: 18 / 05: 42
06: 12 / 07: 28 / 08: 45 / 09: 6 / 10a: 42
Todos pasan; total 52,48 s (iteración alojada, no presupuesto de CI).

npm run test:integration:dev
7 archivos pasan / 1 omitido
29 tests pasan / 9 omitidos declarados
Vitest: 25,50 s; runner completo: 26,67 s.
```

Las 9 omisiones son las 8 pruebas de correo declaradas por el runner y el 40P01
real de `money.test.ts`; siguen obligatorias en CI. Las tres pruebas de UPDATE
directo comparan el estado completo fuera de writer; las descartadas además se
ejercitan como dueño de tabla para JT119. Tomás invitado tiene las dos lecturas
de rol documentadas arriba. No se añadió una política UPDATE ni una auxiliar.

Tipos obtenidos mediante CLI **2.121.0**, destino explícito
`--project-id itfrhnadovezpahikuol --schema public` (solo lectura, sin imprimir
`.env.test`). La API de metadatos alojada devuelve un formato distinto al del
generador local del runner: se extrajeron las filas de las dos vistas nuevas
con el AST de TypeScript y se renderizaron con la plantilla ya versionada del
generador local; el resto del archivo conserva el original. `npm run typecheck`
pasa. **La comparación byte a byte sigue pendiente de `db:types:check` en T012**;
no se presenta como pasada. El intento previo por el conector devolvió falta
de permisos y se utilizó esta alternativa de CLI de solo lectura.

Grupo 1A guardado en `1d2cac1` (`feat: add P0-2 allocation and balance domain`),
con autor local configurado, sin falsear autoría. SQL/semilla/tests de T009–T010
quedan como trabajo en curso sin commit; tipos generados y T011 pendientes.
Sin push ni PR; sin runs de CI. T013–T027 no iniciadas, T028 pendiente de humanos.

## Checkpoints CI

T012: **verde**, run [42264891265](https://github.com/flashwp3-ctrl/juntia/actions/runs/42264891265),
commit `080410a93b0b8416b10034bd37c299cc60221d08`. `app`, `db` y `e2e` en verde;
`evidence` omitido porque este checkpoint no solicita capturas. Sin relanzamiento.
T016 y T027 pendientes.

Salida real extraída del log del job `db` de T012:

```text
All tests successful.
Files=11, Tests=508
Test API: Test Files 8 passed (8)
database.types.ts coincide con public generado en el runner.
Camino A: MANIFIESTO COINCIDE; usuario restaurado entra
Camino B: MANIFIESTO COINCIDE; base temporal borrada
ENSAYO LISTO: A y B, nueve controles negativos rechazados
test:db: pasó, 6.92 s (< 60 s)
test:integration: pasó, 10.85 s
db:types:check: pasó, 1.46 s
db:restore-drill: pasó, 31.16 s
Job db (incluye instalación): success, 282.23 s (< 360 s)
```

T012 cierra el mecanismo de membresía de esta migración: identidad/RLS sin
recursión, privilegios efectivos y ausencia de escrituras directas, con la salida
pgTAP del checkpoint. Las [V] sobre dinero compartido siguen pendientes de T016/T027.

Antes de T012: `npm run verify` pasa en **43,00 s** tras los cambios de T010 y
los tipos nuevos: lint 11,75 s, typecheck 2,77 s, dominio 42 tests / 1,40 s de
comando, components 298 pasan / 2 omitidos / 27,08 s de comando. SQL/RLS,
integración y E2E siguen marcadas pendientes del resultado de CI, como corresponde.

## T013 — rojo antes de la segunda migración

`npm run test:db:dev`, 45,73 s: faltan `public.couple_expenses`,
`transactions.payer_user_id` y el trigger de suma; `11a_shared_tables` falla por
la columna aún inexistente, antes de cualquier implementación de shared_money_tables.
No hay errores de sintaxis del arnés. Los tests de pareja de T010 (42) siguen pasando.

## T014/T015 — iteración de tablas y lecturas compartidas

- Tras la migración: las vistas reprodujeron Octubre (Nosotros 284000000,
  consumo Sara 191290000, partes Tomás 134000000 y saldo 42990000 → 22990000 sin
  variar el consumo). Se corrigió el orden de los BEFORE triggers para conservar
  los errores de inmutabilidad de la 002 y se dejó el CHECK de contexto como
  autoridad para combinaciones inválidas.
- El primer pase de integración rechazó escrituras privadas (`forbidden`): el
  trigger diferido nuevo también se convocaba para privados al terminar la petición.
  Se limita por `WHEN (new.group_id is not null)` y su fila local es `record`;
  no se concedió USAGE sobre `juntia_data` a la app ni se amplió la RLS.
- Pruebas adicionales, vistas en rojo antes de corregir el CHECK: porcentajes
  con elementos nulos e índices distintos de 1/2 daban éxito; el CHECK ahora exige
  un array unidimensional, base 1 y sin null. El caso de suma también se ejecuta
  al cambiar el importe del gasto, no solo al cambiar partes.
- Último pase: `npm run test:db:dev` **pasa**, 5 migraciones, 52,71 s. Por archivo:
  00 (1), 01 (310), 02 (4), 03 (21), 04 (18), 05 (48), 06 (12), 07 (31), 08 (45),
  09 (6), 10a (42), 11a (35).
- `npm run test:integration:dev` **pasa**, 29 tests y las 9 omisiones esperadas,
  Vitest 25,82 s, runner 27,29 s. La 002 sigue en verde.

Los triggers de dinero siguen siendo `security invoker`. Al implementar T020,
las funciones deben hacer cumplir las restricciones diferidas al concluir sus
escrituras, todavía en el contexto de writer (sin nuevos privilegios). Esto se
comprobará por la API en T018a/T023. No se escribe una función de dinero en T014.

Tipos de T014: regeneración **directa** con la CLI 2.121.0, `--db-url` sin
contraseña y `--schema public`; no se usa el formato de la API de metadatos ni
una transformación posterior. Comando de lectura ejecutado con los mismos
`checkDevTarget`, `cleanPgEnv`, `dbUrlWithoutPassword` y `runInSession` del runner,
lock propio y filtro de salida; PGPASSWORD solo en el entorno del hijo. Sin
Docker, sin cambios a scripts o dependencias. El lock ajeno se esperó sin forzar;
antes de generar se repitió `test:db:dev` para restaurar el esquema de la rama
(todo pasa, 51,54 s). La sesión de lectura terminó y liberó su lock normalmente.
La coincidencia definitiva del archivo generado sigue siendo de T016.

Antes de T016, `npm run verify` fuera del sandbox pasa en **44,94 s**: lint
9,84 s, typecheck 3,17 s, dominio 42 tests / 1,53 s de comando, componentes
298 pasan y 2 omitidos / 30,41 s de comando. El intento aislado anterior repitió
el EPERM de las pruebas temporales del lock; se corrigió el modo de ejecución,
sin cambiar esas pruebas ni scripts. La nueva generación de tipos es íntegra,
directa y sin transformación; `db:types:check` de T016 debe confirmarla.

## Revisión humana

T028 pendiente: revisión de ChatGPT y del SQL por los fundadores antes de marcar listo.
