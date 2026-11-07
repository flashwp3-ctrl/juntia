# Evidencia — 003 PR A

Rama `feat/003-a-database`, base `main` `0c25e8b`. Sin producción ni datos reales.

## Estado de la revisión F52 — preflight verde; borrador

F52-1 y F52-2 corregidos: 723 SQL, 63 integración / 9 omisiones y verify 52,13 s.
La auditoría de modos, el rojo observado y las esperas reales están al final.
Se publica un único push; el run final y sus salidas quedan en la descripción
del PR #52 para evitar otro push documental. T028 humana continúa pendiente.
## Historial previo — T027 verde sobre e6b30b4; revisión F52 al final

El gestor confirmó que ambos bloqueos pertenecen al esquema de PR A y autorizó
T026a/T026b dentro de este PR, sin cambiar tasks.md. T027 verde: 42295377639.
T028 y T029 siguen siendo humanas. Los apartados posteriores conservan el
historial de rojos y pausas, con su estado a la hora indicada.

### T026 / preflight T027 · resultados de la iteración final

`npm run test:db:dev`: 15 archivos, **700 comprobaciones pasan**, incluidas las
cuatro de 12_restore_schema; total remoto 75,37 s (con red y reset). Sin fallos.
El presupuesto de test:db <60 s corresponde al runner y se medirá allí.

`npm run test:integration:dev` pasa, incluida la carrera de caducidad tras esperar
el bloqueo y los cinco casos de restauración. Sin 429 ni fallos de autenticación;
se mantienen 28 signInWithPassword para la ejecución completa dev. Los casos
nuevos de restauración usan SQL dentro de transacciones de prueba, sin sesiones Auth.

`npm run e2e:dev` pasa: build 19,54 s; E2E sin correo 29,18 s; axe con sesión
152 casos verdes en 426,45 s, sin violaciones; total 476,96 s. Las tres rutas de
correo siguen declaradas como exclusivas de CI. No se añadieron specs E2E.

`npm run verify` pasa en 78,44 s: lint 22,11 s, tipos 12,39 s, dominio 42 tests
(1,70 s de comando), componentes 302 pasan / 2 omitidos (42,24 s). Presupuestos
locales respetados; los presupuestos SQL y de jobs se medirán en T027.

### T026a · límites locales y CI

Rojo observado: el test esperaba 1000 y encontraba 30. Verde: los tres límites
sign_in_sign_ups, token_refresh y token_verifications son 1000 en config.toml.
Comentario añadido literalmente: «Solo stack local/CI; nunca se aplica al alojado
(no usamos supabase config push). Los límites de juntia-dev y de producción se
gestionan en el panel». Búsqueda en scripts y .github: ninguna llamada a
supabase config push. Ningún ajuste alojado modificado.

### T026b · restauración con garantías conservadas

Rojo observado antes del cambio: las dos comprobaciones pgTAP de las FK diferidas
fallaban; los casos de importación fallaban por ausencia del validador. Las tres
FK de trazabilidad y la FK replaced_by de invitaciones se conservan y pasan a
DEFERRABLE INITIALLY DEFERRED. Una FK huérfana sigue dando 23503 al comprobarla.

El respaldo cifrado, data.sql, manifiesto y hash mantienen su formato. El
restaurador ordena una copia temporal: grupos, membresías por join_order,
invitaciones, movimientos, partes y liquidaciones. Carga y comprobación explícita
de invariantes en una sola transacción, con todos los triggers activos. No se usa
session_replication_role en la restauración ni se requiere superusuario. Los
backups antiguos siguen usando las migraciones y el cargador de su propio SHA.

La integración pasa con postgres de juntia-dev y verifica rolsuper=false: parejas
provisionales, activas y descartadas, ciclo privado↔compartido y texto UTF-8.
Cuatro negativos rechazan partes incorrectas, vínculos huérfanos, más de dos
miembros y una provisional inconsistente, sin datos persistidos. runnerSql usa
stdin UTF-8 en lugar de argv para conservar texto en Windows y evitar incluir SQL
en mensajes de error. Los cuatro tests locales del ordenamiento/configuración
pasan, incluidos literales con comillas, saltos de línea y contenido similar a SQL.

Los nueve negativos del drill se conservan. N10 elimina solo la segunda membresía
de una pareja sintética dedicada y recalcula el hash del data.sql alterado: debe
rechazarse por RESTORE_INVARIANTS, no por el hash. La ejecución completa del drill
y la evidencia definitiva de restauración corresponden a T027 en CI.

## Historial — bloqueo comunicado y resuelto por autorización posterior (15:16 Bogotá)

El preflight de importación demostró una incompatibilidad con el restaurador
actual. No se lanza T027 ni se cambian los mecanismos de restauración o Auth sin
decisión del gestor. T026/E2E y el verde de la carrera añadida de caducidad están
pendientes; no se afirma que el gate final esté cerrado.

`test:db:dev` más reciente: las **696 comprobaciones funcionales pasan** (10: 47,
11: 76). Los únicos dos fallos pertenecen a la sonda temporal de importación.
Runner 76,47 s. La sonda y su transacción hicieron rollback y se conservan como
documentación en `restore-insert-probe.txt`, fuera de la suite permanente: sus
INSERT inválidos deben ser rechazados en operación normal, no se propone
debilitar las invariantes para convertir esa sonda en verde.

### Bloqueo de restauración reproducido

`scripts/backup.sh` usa `pg_dump --data-only --column-inserts
--on-conflict-do-nothing`; ambos restauradores importan los INSERT en una
transacción con triggers y FKs activos. La sonda ejercitó esos mismos INSERT,
con datos sintéticos y mediante `npm run test:db:dev`:

```text
not ok 1 - restaurar el ciclo privado/compartido mediante INSERT por fila
23503: insert or update on table "transactions" violates foreign key constraint
"transactions_moved_to_transaction_id_fkey"
not ok 2 - restaurar gastos de grupo antes de las membresías
JT111: notCoupleMember (transactions_check_group)
```

El ciclo privado/compartido no tiene un orden de INSERT que satisfaga ambas FKs
inmediatas. Además, pg_dump no puede deducir la dependencia de un gasto respecto
de group_members que solo aparece en un trigger. No se ejecutó el ensayo de
restauración fuera de CI: esto es una comprobación SQL del mecanismo de importación,
sin evidencia [V]. Hace falta definir una vía de importación controlada y sus
validaciones, o una solución equivalente, antes del gate. No se tocó producción,
backup.sh, restore-drill.sh ni restore-plain.sh; no se cambió ninguna FK/trigger.

### Capacidad de Auth del runner CI, detectada por inspección

`supabase/config.toml`, auth.rate_limit.sign_in_sign_ups, sigue en **30/5 min**;
no hay override en .github o scripts. La suite dev actual usa **28** inicios de
sesión; los casos de correo exclusivos de CI añaden **5** por seedUser (uno en
el primer recovery, dos llamadas al helper recoveryLink, uno normal A5 y uno
token_hash). Son **33 signInWithPassword**, más seis solicitudes públicas de
registro en auth/foundation/confirm-code. Esto es un recuento de código, no un
429 observado en CI: T027 no se lanzó. Se reporta antes de gastar el run; no se
modificó configuración ni se eligió otra autenticación.

### Últimas comprobaciones y commits

Pruebas: `7779baf`. Invitaciones: `9cfccf5`. Dinero compartido, write_status,
redefiniciones privadas y FR-035: `f5138db`. El test nuevo de expiración tras
esperar al grupo falló por aceptar una invitación caducada (promesa resuelta con
status active), con 52 tests previos pasando y 9 omisiones. Se corrigieron las
dos lecturas de accept_invitation para usar clock_timestamp; pgTAP 47 pasa,
pero la carrera API aún necesita repetirse. La integración posterior a pgTAP se
detuvo por el lock tomado entre comandos por la sonda protegida; no se solaparon
operaciones ni se forzó el lock. No hubo otro 429.

La corrección de caducidad y su test quedan en `14150b9` (rojo observado antes de
la corrección; verde API pendiente). T021 y la ampliación de T024 están en
`3dd8e0b`. El helper seedCouple y las sesiones por rol/worker T025 están en
`1fe65fb` (su test se escribió en `7779baf`, se vio fallar por helper ausente y
luego pasó). Los tipos se conservaron tal como los emitió la CLI, sin transformar.
Quedan explícitamente pendientes T026, T027 y las revisiones humanas T028.

El siguiente apartado conserva el estado anterior y la cronología de iteración.

## Estado anterior de la iteración (15:01 Bogotá)

T012 y T016 están verdes; T027 **todavía no se ha lanzado**. El PR #52 sigue
en borrador. Los apartados de pausa posteriores documentan la historia de las
aclaraciones y del 429; ya quedaron resueltos por el gestor.

1D está implementada y en iteración. Commits locales: `7779baf` (tests y
reutilización de sesiones), `9cfccf5` (T019). T020–T025 aún sin commit.
Último verde SQL, antes de añadir las comprobaciones de reloj: 14 archivos,
694 comprobaciones (10: 47, 11: 74), runner 76,91 s. Tipos public regenerados de
forma directa, con guardia/lock, CLI 2.121.0 y sin Docker.
Integración verde: **52 pasan, 9 omitidos**, 75,78 s Vitest y 76,60 s runner;
incluye el test nuevo T025 de dos workers/parejas, estado por rol y dorado opcional.
Total actual de inicios de sesión: **28** (los 24 de T018a más cuatro de ese test
nuevo T025). El mismo conjunto de T018a bajó de 64 previstos a 24; la nueva
cobertura T025 explica los cuatro adicionales.

`npm run verify` pasa en 67,85 s: lint 20,38 s, tipos 3,54 s, dominio 42 tests
y componentes 298 pasan/2 omitidos. Falta repetir sobre el commit del gate.

La revisión posterior añadió tests que detectan un defecto de now(): fecha de
creación anterior a la escritura y ventana de deshacer dependiente de la hora
de inicio de la transacción. Rojo observado en pgTAP: casos 19, 33 y 52; los
fallos posteriores son consecuencia de que un deshacer vencido se ejecutó.
T020 ya usa clock_timestamp para fechar tras los bloqueos y validar los 60 s;
verde pendiente. Otro test de dos sesiones revalida una invitación que caduca
mientras espera al grupo; su rojo está pendiente por el lock ajeno. No se usan
pausas fijas para fabricar ninguna de esas ventanas.

No hay 429 desde el ajuste humano y la espera de ventana. T026/E2E y T027 están
pendientes; T028 es humana y el PR no se marcará listo unilateralmente.

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

## T016 — punto de control 2 (CI)

Run [42270138082](https://github.com/flashwp3-ctrl/juntia/actions/runs/42270138082),
commit `bf9f26b2c927aa53c4f85bf117c7107487912ba4`: **success**.
Jobs `db`, `app` y `e2e` en verde; `evidence` omitido por diseño.
Sin relanzamientos. Salidas del job `db` (128072264578):

```text
All tests successful.
Files=12, Tests=573
Test API: Test Files 8 passed (8)
database.types.ts coincide con public generado en el runner.
Camino A: MANIFIESTO COINCIDE; usuario restaurado entra
Camino B: MANIFIESTO COINCIDE; base temporal borrada
ENSAYO LISTO: A y B, nueve controles negativos rechazados
```

| Control | Resultado | Duración | Presupuesto |
| --- | --- | --- | --- |
| test:db | pasó | 13,81 s | < 60 s |
| test:integration | pasó | 8,99 s | — |
| db:types:check | pasó | 1,14 s | — |
| db:restore-drill | pasó | 32,05 s | — |
| Job db (incluye instalación) | success | 262,07 s | < 360 s |

## Pausa por regla 6 antes de T019–T021

T017 tiene un archivo de pruebas en preparación; todavía no se ha ejecutado su
rojo y no se han implementado funciones nuevas. T018/T018a siguen pendientes.
T020 dice «ocho funciones de dinero compartido y write_status», mientras T018 y
contracts/database.md enumeran siete escrituras de dinero más la lectura
write_status. plan.md (Scale/Scope) confirma once escrituras nuevas: cuatro de
invitación y siete de dinero. Se solicita confirmar que el alcance de T020 es
esas siete escrituras más write_status; no se modifica tasks.md ni el plan y no
se inventa una octava escritura.

## T020 — alcance confirmado

«tasks dice ocho; el contrato define siete escrituras + write_status; se implementa el contrato. Errata confirmada por el gestor».
El gestor confirmó continuar 1D sin editar tasks.md. Se incluyen también las
redefiniciones de update_transaction y void_transaction y las comprobaciones
row_count de las siete escrituras de la 002 que exige T020.

## T017/T018/T018a — preparación y rojo de 1D

Antes de código de funciones nuevas, `npm run test:db:dev` falló en 57,14 s:

```text
10_couple: no invita al propio correo
caught: 42883: function public.create_invitation(text, unknown, text) does not exist
wanted: JT108
11_shared_money: importe cero
caught: 42883: function public.create_shared_expense(text,text,text,text,text,uuid,text,smallint[],jsonb) does not exist
wanted: JT003
```

Son ausencias de implementación, no errores de sintaxis de los tests. El runner
ejecutó las cinco migraciones existentes; el resto de pgTAP conservó su verde.
Después se completaron más casos y el inventario de privilegios para las nuevas
entradas. Los tres archivos de integración T018a están escritos. Sus intentos
todavía no corrieron: el guardia rechazó tomar el lock de `fix/ux-batch-1`/`e2e`,
vivo y ajeno. Se espera, sin `dev:unlock` y sin implementar T019–T021 antes del rojo.

## FR-035 — punto de extensión aprobado por el gestor

«Punto de extensión transaction_goal_funded, false en P0-2; P0-3 conecta la consulta y añade la prueba con datos y la LimitNote».

Se seguirá la definición explícita del gestor: stable, search_path vacío,
EXECUTE solo de juntia_writer; consulta tras bloquear el privado, antes de
escribir. El test sustituye el cuerpo por true dentro de su transacción y exige
JT116 sin cambios en privado, partes, versión ni idempotency_records. La pausa
por indefinición de FR-035 queda resuelta; no se añaden tablas ni columnas.

Se retiró la alternativa generateLink/verifyOtp de los fixtures antes de
ejecutarla. Se conserva signInWithPassword y se amplió únicamente el diagnóstico
de fallo (name/status/code/message, con secretos y correo redactados). No se
rodeará un límite del entorno; T019/T020 esperan el rojo completo de T018a.

## T018a — diagnóstico exacto del límite de Auth (6 de noviembre, 14:12 Bogotá)

Repetición con `npm run test:integration:dev`, después de esperar el lock E2E
ajeno, con signInWithPassword original y sin generar enlaces de sesión.
Los 22 casos nuevos se recolectaron y ejecutaron (imports diferidos dentro de los
casos). Resultado: **22 fallaron, 29 pasaron, 9 omitidos**; Vitest 26,98 s y
runner 28,14 s. La ausencia de funciones o módulos explica algunos fallos, pero
otros son de autenticación y **no cuentan como rojo válido** de T018a.

Error exacto observado en signInWithPassword, sin credenciales ni correos:

```json
{"name":"AuthApiError","status":429,"code":"over_request_rate_limit","message":"Request rate limit reached"}
```

Esto confirma un límite de solicitudes de Auth en juntia-dev; esta prueba no
determina la cuota ni su ventana configurada. No se cambió la configuración,
ningún límite, el método de autenticación ni el runner para rodearlo. No se
implementan T019/T020 ni se aplica ninguna función nueva antes del rojo completo.
No hubo CI adicional. Se reporta el bloqueo del entorno al gestor.

## T018a/T025 — sesiones reutilizadas y rojo completo (14:25 Bogotá)

Alejandro confirmó límites de Auth elevados por él a 1000/5 min; el agente no
modificó esos ajustes. Último 429 al terminar el run de las 14:12 (fin aprox.
14:13); repetición a las **14:25:58**, más de cinco minutos después. Sigue
signInWithPassword, sin otro mecanismo.

Antes, los archivos nuevos creaban 25 parejas en los caminos completos: 50
inicios de sesión más los 14 existentes, **64 previstos**. El rojo anterior
cortaba algunos caminos antes de su segunda pareja; no son 64 medidos.
Ahora se reservan por archivo dos parejas en concurrency/shared-money y una en
consistency. Se reutilizan los JWT; entre casos se limpian solo datos sintéticos
de sus UUID, conservando usuarios/perfiles/sesiones. La preparación usa
session_replication_role local a su conexión/transacción: no cambia triggers ni
políticas globales ni las conexiones de las peticiones bajo prueba. Otros
archivos tienen otros usuarios. Las carreras conservan dos sesiones reales.

Recuento posterior observado: concurrency 4, shared-money 4, consistency 2,
auth 3, controlled-tables 2, export 3, foundation 2, money 2 = **22** en el contador
de createTestUser; más las **2** sesiones de seed.test por seedUser = **24**.

`npm run test:integration:dev`: **22 fallos nuevos por implementación ausente**,
29 pasan y 9 omisiones declaradas; 29,20 s Vitest, 30,16 s runner. Los 22 casos se
recolectan y ejecutan: veinte fallan por create_invitation ausente en PostgREST;
dos por los módulos invitation-token/couple ausentes. **Sin fallos de Auth,
sin 429 ni fallos de preparación.** Rojo completo de T018a obtenido antes de
implementar/aplicar T019–T021. Continúa 1D.

## Revisión humana

### Pausa de 1D: comprobación de FR-035 sin modelo de financiación

El primer rojo de integración terminó en 27,48 s: tres archivos fallidos, 14
casos fallidos, 29 pasaron y 9 omisiones declaradas. Dos archivos fallaron por
módulos de src/lib/db todavía ausentes; las carreras iniciales por create_invitation
ausente en PostgREST. Algunos casos posteriores fallaron al autenticar sus
fixtures: **no** se dan por válido el rojo completo ni T018a por terminada.
Se preparó una siembra con sesiones reales mediante generateLink/verifyOtp,
sin enviar correos y limitada a estas nuevas cuentas sintéticas. Falta repetirla
contra dev: la sesión E2E ajena volvió a tomar el lock y se esperó sin forzar.

Se apartó el borrador de couple_functions antes de repetir ese rojo; ninguna
función nueva se ha aplicado a dev ni se ha hecho commit de implementación 1D.

Antes de T020 se detectó otra falta de definición: spec FR-035 exige desde P0-2
una comprobación de financiación de meta; contracts/errors.md reserva JT116 y
deja la prueba con datos para P0-3. El maestro nombra goal_ledger_entries para
P0, pero el esquema actual y data-model de la 003 no incluyen la tabla ni el
contrato de consulta del vínculo de financiación. No se inventa una columna,
consulta dinámica ni auxiliar que devuelva false. Se pide al gestor definir el
punto de extensión o confirmar cómo se cumple FR-035 en este PR sin implementar
el modelo de P0-3. Pausa por regla 6; tasks/spec/plan no se modifican.

T028 pendiente: revisión de ChatGPT y del SQL por los fundadores antes de marcar listo.

## T027 — primer gate y corrección local de restauración

Run [42292790033](https://github.com/flashwp3-ctrl/juntia/actions/runs/42292790033),
SHA `8124842d37127b33f7e752e5221abda9b1a7c7db`: app/e2e success, db failure
solo en restore. SQL: 700 tests / 7,20 s; API: 12 archivos / 23,98 s;
tipos exactos / 1,55 s. Job db 250,72 s; humo 12 tests / 25,13 s,
axe 152 / 251,06 s; job e2e 462,83 s (<480 s). Sin 429.

El log del drill terminaba tras el reset porque la salida de psql quedaba en el
temporal eliminado al salir. Se reprodujo el dump completo de datos sintéticos,
obtenido de juntia-dev con guardia y lock, en PostgreSQL 17 local efímero,
ligado a 127.0.0.1, sin Docker. Error exacto:

```
ERROR: query would be affected by row-level security policy for table "groups"
CONTEXT: SQL statement "select * from juntia_data.groups where id=gid"
```

pg_dump emite SET row_security = off. Los triggers definer de juntia_membership
necesitan aplicar sus políticas, y off hace fallar esas consultas. Regresión
observada en rojo (1 fallo / 4 verdes) antes del cambio. El cargador cambia solo
esa directiva a on en la copia temporal; el respaldo y su hash quedan intactos.
Cinco tests locales verdes y carga completa del dump real sintético en una sola
transacción, validador y restricciones inmediatas: exit=0. Todas las reglas y
RLS activas. No se añade un bypass ni se cambia el procedimiento de respaldo.

Repetición API dev para reproducir el estado anterior al dump: 58 pasan / 9
omisiones, 81,64 s runner, 28 inicios de sesión, sin fallos de Auth. El único
reintento de T027 queda pendiente de terminar los checks locales de la corrección.
### Preflight del único reintento T027

Código `e6b30b491ffbe0db40a2805a7b9d63643267ea1f`. Run
[42295377639](https://github.com/flashwp3-ctrl/juntia/actions/runs/42295377639).
`verify` sobre ese commit: 70,24 s, 42 dominio, 303 componentes / 2 omisiones.
El lint inicial vio tres avisos de imports de un helper local ignorado de dump;
se retiró el helper y se repitió lint: limpio. No eran archivos del PR.

Carga positiva del dump completo en PostgreSQL 17 local: exit=0. N10 usa el
mutador real del drill; copia alterada cargada en otra base nueva, con todas las
reglas activas: RESTORE_INVARIANTS: pareja/membresias/invitaciones, rollback y
cero grupos persistidos. Un intento de vaciar la base local positiva fue
rechazado por la protección append-only de audit_events (immutableField), sin
saltársela; por eso N10 se probó en una base nueva. No se debilitó ninguna regla.
El intento de usar los scripts Bash completos en Windows terminó antes de la
carga y no cuenta como ensayo de restauración; la prueba SQL de dump completo y
N10 sí se ejecutó con psql 17. El drill A/B y sus diez controles completos siguen
siendo responsabilidad del run de CI. El cluster local se detuvo y se eliminaron
solo sus temporales propios, con las rutas comprobadas. Ningún ajuste alojado.

### Matriz de verificaciones cerrada por T027 (42295377639)

| Verificación | Prueba que la ejercita en T027 |
| --- | --- |
| ADR-013 V1 · writer/identidad/RLS | 01_privileges, 04_writer, 10_couple, 11_shared_money; foundation API y llamadas SQL como authenticated |
| V2 · escritura directa imposible | 05_direct_writes, 10a_couple_tables, 11a_shared_tables; controlled-tables API, JWT real y tres UPDATE writer sin efectos |
| V3 · atomicidad | 10/11 con política rota, rechazo JT116 sin cambios, RAISE en money API; importación negativa con rollback |
| V4 · concurrencia e idempotencia | 47 casos de ciclo de pareja, 76 de dinero; 15 carreras API y doble envío/write_status de todas las escrituras |
| V5 · versión esperada | regenerate version+1, update/void compartido y liquidación; carreras de edición con un ganador |
| V6 · dinero exacto | parser y límites heredados en 08; API shared-money devuelve 9007199254740993 como texto, tipos monetarios sin number |
| V7 · privilegios efectivos | 01: 310 comprobaciones; 10a/11a; pg_has_role membership falso para anon/authenticated/writer; FR-035 sin EXECUTE anon/authenticated |
| V8/V9 · regresión de vistas y claims | 02_claims, 03_views y foundation API; security_invoker y filtro propio en las cuatro vistas de la 002 |
| Repartos/computeBalance/dorado | 42 tests de dominio; consistency API: 284000000, ±42990000 → ±22990000 y consumo de Yo 191290000 |
| Liquidación/anulación/conversión | 11_shared_money: versiones, partes, dirección, límite, ventana 60 s, financiación y row_count |
| Lecturas consistentes | tres consistency API: snapshot, paginación con escrituras y dataset dorado |
| T026a/T026b | límites locales 1000, sin config push; FK conservadas/diferidas; dump ordenado, RLS on y N10 explícito |
## T027 — gate corregido (salidas del job db)

Run [42295377639](https://github.com/flashwp3-ctrl/juntia/actions/runs/42295377639),
SHA de código `e6b30b491ffbe0db40a2805a7b9d63643267ea1f`.
Único reintento autorizado, tras corregir localmente el primer fallo. App, db y
e2e success; evidence omitido por diseño. No se lanzaron otros runs.

Salida del job db 128159140545:

```text
All tests successful.
Files=15, Tests=700
Test Files 12 passed (12)
Tests 67 passed (67)
database.types.ts coincide con public generado en el runner.
Camino A: MANIFIESTO COINCIDE; usuario restaurado entra
Camino B: MANIFIESTO COINCIDE; base temporal borrada
N1-migration: rechazo esperado, exit=1, sin marca de éxito
N2-count: rechazo esperado, exit=1, sin marca de éxito
N3-sha: rechazo esperado, exit=1, sin marca de éxito
N4-data-hash: rechazo esperado, exit=1, sin marca de éxito
N5-partial-restore: rechazo esperado, exit=1, sin marca de éxito
N6-backup: rechazo esperado, exit=1, sin marca de éxito
N7-existing: rechazo esperado, exit=1, sin marca de éxito
N8-drop: rechazo esperado, exit=1, sin marca de éxito
N9-decrypt: rechazo esperado, exit=2, sin marca de éxito
N10-couple-invariant: rechazo esperado, exit=1, sin marca de éxito
N10: pareja inválida rechazada por invariantes, con hash de datos correcto
ENSAYO LISTO: A y B, diez controles negativos rechazados
```

| Control | Resultado | Duración | Presupuesto |
| --- | --- | --- | --- |
| test:db | pasó · 700 | 9,41 s | <60 s |
| test:integration | pasó · 67 | 22,49 s | — |
| db:types:check | pasó | 1,34 s | — |
| db:restore-drill | pasó · A/B + N1–N10 | 37,92 s | — |
| Job db (incluye instalación) | success | 290,29 s | <360 s |

La etiqueta histórica del step del workflow aún dice nueve negativos; no se
modificó el workflow. La salida ejecutada demuestra los diez, incluido N10.
El runner dev también conserva su etiqueta histórica de nueve: sus scripts no
se tocaron en este PR. Esto no omite ninguna comprobación.
### Cierre de T027 y límites del entregable

Run 42295377639: **success** sobre e6b30b4. Salidas finales adicionales:

```text
Dominio: 42 passed
Componentes en Linux CI: 305 passed
E2E smoke (specs existentes 1 y 2): 12 passed
Axe con sesión: 152 passed
```

| Control | Resultado | Duración | Presupuesto |
| --- | --- | --- | --- |
| test:unit | pasó · 42 | 1,92 s | <15 s |
| test:components | pasó · 305 | 53,32 s | — |
| Job app (incluye instalación) | success | 192,67 s | <360 s |
| test:e2e:smoke | pasó · 12 | 24,15 s | <180 s |
| test:a11y | pasó · 152 | 247,45 s | — |
| Job e2e (incluye instalación) | success | 460,03 s | <480 s |

Las comprobaciones de la matriz anterior quedan verificadas por estas salidas
CI y las de db, sobre el mismo commit de código del verify local (70,24 s).
Los dos casos que se omiten en components local por plataforma pasan en Linux.
T012: 42264891265. T016: 42270138082. T027: 42295377639; primer intento fallido
42292790033, diagnosticado y corregido antes del único relanzamiento permitido.

T002–T027, más T005b/T018a y T026a/T026b autorizadas, quedan implementadas y
verificadas en su alcance de PR A. T028 sigue pendiente: revisión de ChatGPT y
aprobación del SQL de las cuatro migraciones por los fundadores, registradas
en el PR antes de marcarlo listo. T029 es del gestor después del merge y no se
ejecutó. No se modificaron tasks.md, el plan, vitest.config.mts, workflows ni
scripts del guardia/lock de dev; ninguna funcionalidad de PR B/C/D implementada.
No se tocó producción ni se usaron datos reales o service_role en rutas de app.

El commit documental posterior solo incorpora esta evidencia: el código validado
por verify y CI permanece en e6b30b491ffbe0db40a2805a7b9d63643267ea1f.
## Revisión de ChatGPT F52 — reparto y prueba de carreras

La revisión recibida se refiere a e6b30b4. Restauración, RLS, privilegios e
interpretaciones previas aprobadas se conservan. F52-1 cambia únicamente el
cálculo de equal dentro de validate_shared_split, en la misma migración no
aplicada a producción. No cambian las firmas públicas ni el modelo de datos.

### F52-1 · aclaración aprobada

«equal es siempre entre los dos integrantes; un solo participante se envía como percent 100/0 o amount total/0 (FR-019a). Confirmado por el gestor; el PR C lo respeta en la hoja de Anotar compartida».

| Modo | Auditoría antes de la corrección | Regla comprobada ahora |
| --- | --- | --- |
| equal | pesos/denominador derivados de partes positivas: aceptaba 100/0 o 0/100 | dos integrantes activos, peso 1 cada uno y denominador 2; mayor residuo y join_order; comparar p_parts, JT110 si difiere |
| percent | pesos tomados de p_split_percents, no de p_parts; no se encontró la debilidad de equal | dos enteros 0–100 que suman 100, cálculo independiente y comparación exacta; 100/0 y 0/100 válidos |
| amount | p_parts es la definición explícita; no calculaba pesos ni participantes | enteros no negativos, múltiplos de 100, dos integrantes activos, suma exacta y al menos una positiva; ninguna reinterpretación como pesos |
| update/reclassify | ambos llaman al mismo validador; heredaban el fallo equal | las mismas tres reglas, con regresión de rechazo sin efectos, reparto par y residuo impar |

La capa de envío compartida por create/update/reclassify traduce una selección
explícita de UNA allocation del dominio a percent 100/0, completando el otro
integrante y el orden con couple_members. Amount conserva la definición manual.
Dos allocations equal no se traducen: $1 puede repartirse legítimamente 1/0 por
redondeo. nextSplitOnParticipantsChange y splitAmount conservan sus firmas; la
frontera queda documentada en shared-expenses.ts y probada por integración.

Rojo antes del SQL y de la traducción: pgTAP no rechazaba equal 100/0 ni 0/100,
y se veían cambios en snapshots; el fallo aceptado provocó fallos posteriores de
fixture/versión. API: 5 regresiones nuevas fallan, 58 tests pasan, 9 omisiones;
tres rechazos resolvían con éxito, la equivalencia detectaba aceptación distinta
al dominio y un participante daba invalidSplit. Sin fallos de Auth ni 429.

13_split_validation añade casos de create/update/reclassify y comparación de
movimientos, partes, versión, auditoría e idempotencia ante rechazo. Sara tiene
UUID mayor que Tomás y paga Tomás en los casos compartidos: el residuo de
$100.001 sigue correspondiendo a Sara por join_order. Integración compara 30
combinaciones de importe/modo, incluyendo extremos, $1 y un solo participante,
con splitAmount; también prueba la traducción real de la selección del dominio.

### F52-2 · barrera comprobada, sin escenarios nuevos

Se mantienen los 15 casos. La barrera captura su propio pg_backend_pid y solo
libera tras ver DOS PID distintos esperando en pg_stat_activity, unidos por
pg_blocking_pids a esa barrera; comprueba nombre de RPC y bloqueo real.

- Raíz de grupo: transactionid/tuple y lock de relación groups.
- Segunda petición de la misma persona en invitaciones: advisory del UUID de
  esa persona, con classid/objid/objsubid verificados; sigue la cadena hasta la
  primera petición que espera el grupo. No se exige un lock de grupo inexistente.
- Creaciones y aceptaciones cruzadas: barrera de persona, por UUID ordenado,
  y ambos contendientes observados antes de liberar.
- Privado→compartido contra editar: barrera de movimiento privado; ambos
  esperan transactions y se observa una sola fila activa mientras siguen bloqueados.

No hay sleeps; solo polling de estado observable con timeout. Las consultas
monitorean su cadena de bloqueantes, no un count global que pueda incluir otro
archivo. Referencia del mecanismo: pg_blocking_pids en PostgreSQL 17,
https://www.postgresql.org/docs/17/functions-info.html#FUNCTIONS-INFO-SESSION-TABLE.

La primera pasada posterior al fix cortó en el arnés pgTAP: lives_ok no estaba
visible para writer sin USAGE del esquema de la extensión. 13 aplica el mismo
grant temporal de 05/10a, dentro de BEGIN/ROLLBACK; no cambia permisos de app.
Después, test:db:dev pasa: 16 archivos, 723 tests (13: 23), 97,37 s remotos con
reset/red. El presupuesto definitivo de test:db se mide en el runner.

Una pasada API intermedia confirmó las cinco regresiones F52-1 y 14 de las 15
carreras, pero un cliente psql de sondeo quedó detenido y el caso de regenerar
agotó sus 60 s. La inspección de solo lectura, con guardia y nuestro lock activo,
mostró la barrera idle in transaction y ningún RPC esperando: el sondeo cliente
no había terminado. Se cerró solo ese hijo psql, validando PID/padre; el arnés
limpió su barrera y el guardia mantuvo el lock. No se forzó ningún lock ni se
cambió Auth. El sondeo ahora termina SQL y cliente explícitamente (; y \q),
tiene timeout de 5 s, y la barrera envía COMMIT/ROLLBACK y \q explícitos.
El timeout opcional de runnerSql solo se usa aquí; el resto de llamadas conserva
su comportamiento y el SQL de restauración permanece intacto.

verify del estado final: 52,13 s; dominio 42, componentes 303 / 2 omisiones de
plataforma; lint y tipos limpios. API final: 63 pasan / 9 omisiones declaradas, 131,71 s de runner, sin 429.
Los 15 casos de concurrency pasan; 17 barreras registran los dos PID con su
bloqueo real antes del commit, incluida la misma persona y privado→compartido.
Se conservan 28 signInWithPassword por ejecución completa dev, sesiones por archivo.

Para respetar el único push de esta revisión, el identificador, resultado y
salidas del único gate de CI sobre el SHA publicado se registran en la
[descripción del PR #52](https://github.com/flashwp3-ctrl/juntia/pull/52) y en el
reporte final del agente. No se hará un segundo push documental tras ese run.
T028 sigue requiriendo revisión humana antes de marcar listo el borrador.
---

# Evidencia — 003 PR B · Mi pareja e invitaciones

Rama `claude/feat-003-b-couple-f0d9d2`, base `main` `623bc3c` (PR A mergeado). Sin
producción ni datos reales. Todo lo de esta sección es **iteración contra
`juntia-dev`** (decisión 18) o local: **no es evidencia de ninguna `[V]`**
(ADR-011 §9.8). El único gate es T039, en CI, después de la revisión.

## Estado

- T030–T038 hechas e iteradas en verde; T039 (CI) pendiente tras la revisión de
  ChatGPT; T040 (aprobación visual de los fundadores) pendiente.
- `[V]` «Retorno tras el login»: la prueba existe y pasa en `juntia-dev` (caso
  sin correo); se cierra con la salida del job `e2e` de T039, que corre además el
  caso `@mail` (crear la cuenta y verificarla).

## Tarea → commit → prueba

| Tarea | Commit | Prueba |
| --- | --- | --- |
| T030, T031, T031a, T031c, T031d (tests primero) | `85bf19c` | `src/features/couple/{couple.test.tsx,intent.test.ts,write-result.test.tsx}`; `tests/e2e/access-account.e2e.ts` (2 casos nuevos); `tests/a11y/{couple.a11y.ts,job-selection.test.ts}`, `route-registry.ts`, `tests/support/{seed,states}.ts` |
| Robustez del job `db` (pedido del gestor) | `01b2ca1` | `pg_isready` tras `pg_createcluster` y antes del ensayo; log del cluster si falla. Se comprueba en T039 |
| T031b | `7149682`, `1f694fe` | `write-result.test.tsx` (clasificación y las cuatro escrituras) |
| T032, T035 | `c19fbb9` | `couple.test.tsx` (M1–M4, CoupleStatus, patrones); axe del registro M1–M4 |
| T033 | `8a5ad82` | `couple.test.tsx` (M5–M7); `intent.test.ts`; E2E de invitación |
| T034 | `ba8f27f` | `intent.test.ts` (retorno y borrado); E2E `@mail`; axe A6 y Nosotros |
| T036–T038 (iteración e Impeccable) | `ecaf703`, `77ec256`, `5d49d45` | `e2e:dev`, `test:integration:dev`, `couple.a11y.ts` |

## Rojo antes del código (regla 8; I5)

- **Componentes** (18:32): los tres archivos fallan al resolver
  `./partner-screen`, `./invitation-screen`, `./couple-status`, `./intent`,
  `./invitation-return` y `@/features/shared/write-result`. La prueba de
  descubrimiento `job-selection.test.ts` **pasa ya** en este punto (no depende de
  las pantallas); `route-registry.test.ts` falla solo porque `/invitacion` no
  tiene `page.tsx`.
- **E2E y axe contra `juntia-dev`**, sobre el commit de pruebas `85bf19c` en un
  worktree aparte (el código del PR ya avanzaba en el otro, sin tocar ese
  commit). `next build` comprueba tipos de los tests de componentes, cuyos
  módulos no existían, así que ese worktree los quitó **sin commitear** para
  poder construir la app; las E2E y axe son las del commit. Resultado de
  `npm run e2e:dev`:
  - E2E: **1 falla, 9 pasan**. Falla «invitación → M5 sin datos → entrar →
    volver → M6 → aceptar → M1 para los dos», esperando `getByText('SOLO TÚ')`
    en `/cuenta/pareja` (la página era «llega con P0-2»).
  - axe con sesión: **18 fallan, 164 pasan**. Fallan M6/M7 (4), el barrido de
    anchos y 200 % (espera `SOLO TÚ`), el de teclado y 44 px (espera «Invitar a
    mi pareja») y M3, M3b y la confirmación de anular en los dos temas y anchos
    (12, sin el botón que abre la hoja). Las entradas de M2, M4 y M1 del
    registro **pasaban** en rojo: no tienen `prepare` y auditaban la pantalla
    vieja, que tenía axe limpio. Su contenido lo prueban los componentes y el
    barrido, no esa entrada.

## Verde en `juntia-dev` (T036, T037)

Cuatro pasadas completas de `npm run e2e:dev` (y, desde `0a6f276`, pasadas dirigidas, por ejemplo `npm run e2e:dev -- tests/e2e/access-account.e2e.ts --grep invitación`: 1 de 1 en 33,5 s):

| Pasada | Commit | E2E (sin `@mail`) | axe con sesión | Qué se corrigió |
| --- | --- | --- | --- | --- |
| 1 | `1f694fe` | 10 de 11 (falla solo la captura temporal) | 171 de 182 | Contraste 4,29:1 del texto secundario sobre `surface.sunken` (M3b, M6 a 1440); los radios nuevos de A6 entraban en la comprobación de foco de campos de texto; el barrido contaba como texto cortado el «Volver» `sr-only`; M7 tras M6 era solo un cambio de fragmento sin recarga (`hashchange`) → `ecaf703` |
| 2 | `ecaf703` | **11 de 11** | **182 de 182** | — |
| 3 | `5d49d45` | **11 de 11** | 181 de 182 | Falla `/recuperar · A4b · dark · 1440px` por `document-title` (pantalla de la 002, no tocada; pasó en la pasada 2). Se anota como intermitente y se mira en T039 |
| 4 | `0a6f276` | **10 de 10** (sin la captura temporal) | **182 de 182** | Pasada completa antes del push, tras la mejora de `e2e:dev` dirigido. A4b no se repitió |

La 11.ª E2E es una spec **temporal, sin commitear**, que hace las capturas de
abajo dentro del arnés guardado de `e2e:dev`.

- `npm run test:integration:dev`: **63 pasan, 9 omitidas** (las de correo y el
  `40P01` real, declaradas por el comando), 132,98 s. El PR B no añade
  integración: las reglas del token y las carreras son del PR A.
- `npm run verify` local: lint, typecheck, dominio y **370 componentes** en
  verde, 61,07 s (< 90 s).
- Job `app` de axe reproducido en local (build con la URL inaccesible del job,
  `A11Y_JOB=app`): **53 de 53**, incluidos M5 en el registro y su barrido.

## T038 · barrido, teclado, 200 % y 44 px

Salida de `tests/a11y/couple.a11y.ts` (pasada 2 en `juntia-dev`; M5 en local
con `A11Y_JOB=app`):

- **Sin scroll horizontal** en 360, 390, 430, 768, 1024, 1280 y 1440, en claro y
  oscuro, para Mi pareja M2, M3, M4 pendiente, M4 vencida y M1, `/invitacion` M5,
  M6 y M7, A6 y Nosotros sin pareja: 140 mediciones con `scrollWidth ==
  clientWidth` (126 con sesión + 14 de M5).
- **Texto al 200 %** a 390: las diez pantallas sin scroll horizontal y con
  `cortado: 0`.
- **Teclado**: «Invitar a mi pareja» → hoja con foco en el correo → Enter crea;
  «Copiar enlace» con Enter («Enlace copiado.»); Escape cierra; «Generar enlace
  nuevo» con Enter; «Anular» abre con el foco en «Mantener» y Escape cancela sin
  anular; Tomás acepta con Tab + Enter y llega a M1.
- **44 px** (`boundingBox`): Invitar a mi pareja 350×52 · Crear invitación 350×52
  · Compartir enlace 350×52 · Copiar enlace 350×52 · Generar enlace nuevo
  247,1×44 · Anular 94,9×44 · Mantener 114,8×44 · Anular invitación 131,3×44 ·
  Aceptar invitación 342×52 · Ahora no 342×48 · Entrar y Crear cuenta (M5)
  ≥ 44.
- **axe** M6 y M7: 0 violaciones en los dos temas a 390 y 1440; el registro
  audita M1–M4, M3b, la confirmación de anular, M5, A6 y Nosotros.

## Impeccable (T038; no es evidencia de FR-054)

Revisión de acabado sobre 18 de las 48 capturas contra el comp 04·15 a 390:
M1, M3, M3b, M4, M5, M6 y M7 coinciden; el oscuro se sostiene. Hallazgos:

| # | Hallazgo | Qué se hizo |
| --- | --- | --- |
| 1 | M4 vencida conserva PENDIENTE e «Invitación enviada»; solo la línea dice «venció» | **No se cambia**: el badge y el título son de los fundadores (los cuatro badges de CoupleStatus están fijados). Va a la lista de aprobación |
| 2 | El segundo título de M2 corta «solo» en una línea a 390 | `clamp(26px,7.4vw,30px)` y `text-balance` (`77ec256`) |
| 3 | Con un correo largo, «vence el 13 nov» se parte | Espacios duros en la fecha (`77ec256`, `5d49d45`) |
| 4 | §CoupleStatus dice «nunca el correo del otro», y M4 (comp y build) muestra «Para tomas@…» | Sin cambio de código: es el correo que escribió la propietaria, no el de un integrante. Se lleva a los fundadores para fijar la redacción del documento |

También: la línea del sidebar «Mi cuenta · con To…» se cortaba a 1440 y ahora
pasa a dos líneas (`77ec256`).

## Capturas para T040 (390 y 1440, claro y oscuro)

48 PNG en `specs/003-pareja-y-balances/evidence/pr-b/`, de `juntia-dev`
(cuentas `@seed.test`, por eso los correos largos): M1, M2, M3, M3b, M4
pendiente, M4 vencida, confirmación de anular, M5, M6, M7, A6 y Nosotros sin
pareja.

**Para aprobar viendo la pantalla** (plan, PR B; maestro §15.9): Mi pareja
(anatomía aprobada, 16.6); el botón «Generar enlace nuevo» y su copy; la paleta
de personas con el patrón rayado de la persona 2 (token nuevo
`--person-2-stripe`, valor de `pfill` del comp); el copy nuevo de todo el PR
(`src/lib/copy/es.ts`, incluidos «propietaria» y los textos de Nosotros con
pareja pendiente o activa); la composición de escritorio de `/invitacion`
(marco de las pantallas de acceso) y de A6 con dos tarjetas.

## Lecturas de ejecución (no decisiones; se cambian si el revisor las objeta)

1. **M6 y M7 fuera del registro de axe.** Una ruta va en una sola lista
   (002, contracts/ci.md) y `/invitacion` ya está sin sesión por M5. M6 y M7
   van en `couple.a11y.ts` solo con `A11Y_JOB=e2e` (regla 10, «si no caben en
   el registro»). El barrido de M5 corre en el job `app`.
2. **«Generar enlace nuevo»** escribe al abrir su hoja (operación explícita,
   F47-3), con la clave y el token nacidos en ese clic; la hoja muestra el enlace
   una vez, como M3b.
3. **El par (clave, token) en `sessionStorage`** se escribe al abrir y se borra
   al cerrar o confirmar (contracts §2). Si la pestaña se recarga con un
   `unknown` pendiente, no se reanuda: la hoja nueva es otra intención.
4. **M7 borra la intención también en el caso «primero anula la tuya»**, como
   dice T031; para aceptar después, Tomás vuelve a abrir el enlace.
5. **A6 con «Invitar a mi pareja»** completa la primera entrada y abre M3 con
   `/cuenta/pareja?invitar=1`.
6. **Nosotros** con pareja pendiente o activa, hasta el PR C, dice que la
   invitación está pendiente o que ya son pareja, en vez del «aparece cuando
   exista la pareja» de P0-1.
7. **«Comprobar estado»** consulta `write_status` por una Server Action que solo
   admite las cuatro acciones de invitación; un fallo al comprobar deja el
   estado desconocido como estaba, sin decir «no consta».
