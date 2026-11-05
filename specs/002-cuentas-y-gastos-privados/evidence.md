# Evidencia de implementación — 002

## Revisión PR #40 — F40-1, F40-2 y F40-3

5 de noviembre de 2026. Cambios solicitados por el fundador tras la revisión:
instantánea común de copia/manifiesto; nota e inventario sobre la revocación
global de funciones de postgres, sin cambiarla; N6 con un commit real y rechazo
demostrable en el manifiesto. Sin cambios de migraciones ni merge.

### F40-1 — rojo antes de corregir la copia

Prueba escrita primero en `restore-drill.sh`, commit
`21aff49fb71bbd4d049da58be9fc9349457b4644`. CI automático del PR
[42050531430](https://github.com/flashwp3-ctrl/juntia/actions/runs/42050531430).
`gh run watch 42050531430 --exit-status --interval 20`: exit 1 esperado.
Log íntegro: [f40-concurrent-red.txt](evidence/f40-concurrent-red.txt).

Un wrapper de pg_dump exclusivo de la prueba hace el dump real y luego otra
conexión confirma un INSERT sintético en signup_allowlist, antes del manifiesto.
La restauración A debe seguir coincidiendo con la copia anterior al INSERT.

```text
COPIA LISTA: juntia-2026-11-05T150352.tar.gpg
F40-1: escritura concurrente confirmada; snapshot importado=false
-table=juntia_data.signup_allowlist|4|0fd0be4a10ffd3f98eef7244b10c4caf
+table=juntia_data.signup_allowlist|3|3f12309080bde11c0f76b5163c9ddff8
Job app: success, 158.60 s
Job db: failure, 229.88 s
```

El manifiesto tenía cuatro filas mientras el dump solo contenía tres: la copia
se publicaba y fallaba al verificar la restauración, que es el defecto F40-1.
El SHA de integración de GitHub que aparece en el manifiesto del run es
`cc54dd20cf011eb4aab74df9c81c42606bc941f6`; el head del PR probado es el commit
de pruebas citado arriba.

El artefacto `auth-bootstrap-description`, descargado con
`gh run download 42050531430 --name auth-bootstrap-description`, también recoge
el inventario de firmas/ACL (sin cuerpos, claves ni datos personales):
[postgres-execute-inventory.txt](evidence/f40-inventory/postgres-execute-inventory.txt).
Hay siete entradas públicas y `tests.authenticate_as(uuid)`, cuyo GRANT explícito
es el de T003/seed.sql. No aparecen otras funciones de postgres ejecutables por
anon o authenticated. F40-2 añade la comprobación bloqueante para PUBLIC y esos
dos roles, con sondas que detectan cada concesión fuera del contrato.

Validación local de sintaxis antes de publicar la corrección:
`bash -n scripts/backup.sh`, `bash -n scripts/backup-manifest.sh` y
`bash -n scripts/restore-drill.sh`, todos exit 0. `git diff --check`: sin salida,
exit 0. `git diff -- supabase/migrations`: sin salida; la revocación global se
conserva intacta.

### F40 — comprobación de las correcciones

Commits pequeños: `b100a65` añade nota e inventario F40-2; `9dae176` cambia N6
al commit real de foundation y habilita historial completo en el job db;
`4e5e198777780d9e1831d750ae8d4b3d19a4dd44` implementa la instantánea común y
actualiza quickstart §4.1 (conexión directa o pooler de sesión, nunca transacción).
El run [42052290510](https://github.com/flashwp3-ctrl/juntia/actions/runs/42052290510)
falló antes de alcanzar el ensayo por un error del arnés nuevo, no por un
fallo del mecanismo de RLS ni de una migración:

```text
01_privileges.test.sql:49: ERROR: constant of the type regrole cannot be used here
Files=10, Tests=296
Job app: success, 117.91 s
Job db: failure, 178.18 s
```

`gh run watch 42052290510 --exit-status --interval 20`: exit 1.
Log completo: [f40-inventory-harness-red.txt](evidence/f40-inventory-harness-red.txt).
La vista temporal consulta ahora el OID de postgres en pg_roles en lugar de
guardar una constante regrole no admitida. El predicado de dueño, la lista
permitida y los grants permanecen iguales.

El diagnóstico de N6 se probó primero en la capa de unidad, con psql simulado
que devuelve las tres versiones aplicadas y el commit real cbccec8 que solo
contiene foundation. No se ejecutó Supabase ni PostgreSQL local. Comando:
[f40-n6-diagnostic-command.txt](evidence/f40-n6-diagnostic-command.txt).

```text
Antes (exit 1 de la prueba):
F40-3 unidad de diagnóstico (psql simulado, sin Supabase local): manifest-exit=1
F40-3: assertion failed: falta diagnóstico de validación del manifiesto

Después (exit 0 de la misma prueba):
F40-3 unidad de diagnóstico (psql simulado, sin Supabase local): manifest-exit=1
MANIFIESTO RECHAZADO: migraciones aplicadas no coinciden (sha=cbccec832d338402bc7262973b8e0b539d6dddff)
```

Salidas: [rojo](evidence/f40-n6-diagnostic-local-red.txt) y
[verde de unidad](evidence/f40-n6-diagnostic-local-green.txt). El mensaje se emite
únicamente tras comparar las migraciones aplicadas con las del commit, después
de leerlas en la instantánea. El test de CI N6 exige ese mensaje, código no nulo,
cero archivos publicados/temporales y cero sesiones exportadoras restantes.

### F40 — verde completo con la escritura concurrente y N6 real

5 de noviembre de 2026. Head probado:
`a267ec9eaade26c091bfafec61a5f3465f0c796e`. Run del PR
[42053806709](https://github.com/flashwp3-ctrl/juntia/actions/runs/42053806709),
`gh run watch 42053806709 --exit-status --interval 20`: exit 0.
Salida completa: [f40-green.txt](evidence/f40-green.txt).
`npm run verify` sobre ese mismo head: exit 0, 25.85 s; salida íntegra en
[f40-local-verify.txt](evidence/f40-local-verify.txt).

```text
01_privileges.test.sql ....... ok
Files=10, Tests=324; Result: PASS
Test Files 4 passed (4); Tests 17 passed (17) [integration]
database.types.ts coincide con public generado en el runner.
F40-1: escritura concurrente confirmada; snapshot importado=true
Camino A: MANIFIESTO COINCIDE; usuario restaurado entra
F40-1: dump y manifiesto comparten instantánea; restauración A excluye la escritura concurrente
Camino B: MANIFIESTO COINCIDE; base temporal borrada
N6-backup: rechazo esperado, exit=1, sin marca de éxito
MANIFIESTO RECHAZADO: migraciones aplicadas no coinciden (sha=cbccec832d338402bc7262973b8e0b539d6dddff)
N6-cleanup: sin archivos publicados ni temporales; exportadoras restantes=0
ENSAYO LISTO: A y B, nueve controles negativos rechazados
Job app: success, 164.49 s; Job db: success, 237.72 s [resúmenes internos]
supabase start: 112 s; test:db: 6.41 s (< 60 s)
```

Los seis casos pgTAP añadidos comprueban el inventario vacío fuera del contrato,
el default global cerrado en un esquema ajeno a Juntia y la detección de grants
PUBLIC, anon y authenticated mediante sondas revertidas. La nota fechada de
ADR-013 §5.4 documenta el efecto global y los grants futuros explícitos; ninguna
migración ni privilegio real se modificó. N6 llega al diagnóstico solo después
de crear el worktree del commit real, hacer el dump y leer las migraciones
aplicadas en la instantánea. Su limpieza comprueba cero sesiones exportadoras,
además de cero archivos publicados y temporales. N1–N8 salieron con 1 y N9 con 2;
todos sin marca de éxito.

`git diff 2f83712..HEAD -- supabase/migrations`: sin salida. Los commits de código
son `4e5e198` (instantánea) y `7506a1a` (diagnóstico); `ccd10d0` corrige la vista
del arnés. El siguiente commit solo incorpora este registro y los dos logs de
verde. El CI automático del PR se espera también sobre ese último commit; su
estado y enlace se reflejan en la descripción del PR, sin lanzar un run duplicado.
No se usa Docker/WSL local, no hay datos reales en CI y no se hace merge.

## PR A — detenido antes de T001

Fecha: 4 de noviembre de 2026 (America/Bogota).
Base: `33a2276cdc4a7e962912a1bc451b48316d7ee474`.
Rama: `feat/002-a-database`.

### Bloqueo del contrato: completar el registro de idempotencia

La implementación se detiene por instrucción del fundador: «Si algo no
cuadra, detente y repórtalo; no lo resuelvas por tu cuenta».

- ADR-013 §3.1 exige insertar primero la clave y la huella en
  `idempotency_records`, antes del bloqueo de la raíz (§3.2).
- `data-model.md` §2.5 declara `result jsonb not null`.
- `data-model.md` §3 solo concede `select, insert` a `juntia_writer`
  sobre esa tabla y solo define políticas de `select, insert`.
- `data-model.md` §5 exige este orden: idempotencia → bloqueo →
  comprobación de versión y estado → escritura → auditoría → guardar el
  resultado en `idempotency_records`.

El contrato no permite completar al final el registro insertado al principio.
Insertar un resultado provisional no resuelve la ausencia de permiso y política
de actualización; insertar únicamente al final incumple el orden obligatorio.
Cambiar los grants, las políticas o el protocolo requiere una corrección
revisada del contrato antes de implementar. No se ha elegido una alternativa.

### Preparación realizada — salidas reales

El primer intento dentro del sandbox falló con permisos sobre `.git` y sin
acceso a GitHub; se repitió con escalación autorizada. No hubo rechazo del
revisor automático.

```text
$ git status --short
(sin salida: checkout limpio)
$ git log -1 --oneline
33a2276 Merge pull request #38 from flashwp3-ctrl/docs/spec-002-tasks
$ git rev-parse origin/main
33a2276cdc4a7e962912a1bc451b48316d7ee474

$ git fetch origin main
From https://github.com/flashwp3-ctrl/juntia
 * branch            main       -> FETCH_HEAD
$ git config core.hooksPath .githooks
(sin salida)
$ git switch -c feat/002-a-database origin/main
branch 'feat/002-a-database' set up to track 'origin/main'.
Switched to a new branch 'feat/002-a-database'
$ gh api repos/flashwp3-ctrl/juntia --jq '{full_name,permissions}'
{"full_name":"flashwp3-ctrl/juntia","permissions":{"admin":false,"maintain":false,"pull":true,"push":true,"triage":true}}

$ node --version
v24.22.1
$ npm --version
11.1.0
$ npm view @supabase/supabase-js@2.118.0 version
2.118.0
$ npm view @supabase/ssr@0.12.7 version
0.12.7

$ git branch --show-current
feat/002-a-database
$ git rev-parse HEAD
33a2276cdc4a7e962912a1bc451b48316d7ee474
$ git config core.hooksPath
.githooks
```

La identidad Git existente se consultó y no se cambió.

### Estado de los entregables

- T001–T015: pendientes; bloqueo del contrato detectado antes de implementar.
- T016: pendiente; no se alcanzó la tarea humana y no se solicitó contraseña.
- T017–T033: pendientes; no se adelantaron etapas.
- Bootstrap y puntos de control 1 y 2: sin commits ni runs nuevos.
- ADR-013 [V] 1, 2, 7, 8 y 9: pendientes; ninguna ejecutada en este PR.
- Ensayo de restauración y nueve controles negativos: pendientes.
- Tiempos de jobs `app` y `db`: no medidos; no se lanzó CI.
- Tests y build: no ejecutados en esta preparación.
- Push y PR: no realizados.
- Capturas: no aplicables, PR sin interfaz.

Este archivo registra el bloqueo; no constituye la finalización de T031.

## Reanudación — bloqueo resuelto por PR #39

El fundador autorizó continuar tras la corrección documental mergeada en
`806bb49` ([PR #39](https://github.com/flashwp3-ctrl/juntia/pull/39)).
Se conserva arriba el registro histórico del bloqueo. La corrección define
`pending → completed`, resultado nulo mientras está pendiente, actualización
por columnas, RLS y trigger de inmutabilidad; T017 probará ese contrato.

```text
$ git fetch origin main
From https://github.com/flashwp3-ctrl/juntia
 * branch            main       -> FETCH_HEAD
$ git merge origin/main
Updating 33a2276..806bb49
Fast-forward
 specs/002-cuentas-y-gastos-privados/data-model.md | 31 +++++++++++++++++++----
 specs/002-cuentas-y-gastos-privados/tasks.md      |  2 +-
 2 files changed, 27 insertions(+), 6 deletions(-)
$ npx --yes supabase@2.121.0 init
Finished supabase init.
A new version of Supabase CLI is available: v3.0.0 (currently installed v2.121.0)
```

Se conserva la CLI 2.121.0 del contrato; el aviso no autoriza actualizarla.

### T001–T007 — preparación del bootstrap (en curso)

```text
$ npm install --save-exact @supabase/supabase-js@2.118.0 @supabase/ssr@0.12.7
added 15 packages, and audited 494 packages in 47s
8 moderate severity vulnerabilities
exit=0

$ npm run test:components -- tests/lint-rules.test.ts  (antes de T005)
FAIL marca claves privilegiadas y accesos fuera de la capa de datos
AssertionError: expected [] to deeply equal [ 1, 2, 3, 4, 5 ]
FAIL impide importar ambas capas de datos desde domain
AssertionError: expected [] to deeply equal [ 1, 2 ]
Test Files 1 failed (1)
Tests 2 failed | 9 passed (11)
Duration 10.60s
exit=1

$ npm run test:components -- tests/lint-rules.test.ts  (después de T005)
Test Files 1 passed (1)
Tests 11 passed (11)
Duration 4.74s
exit=0

$ npx vitest list --project integration
[integration] tests/integration/smoke.test.ts > la API del runner responde sin exponer datos a anon
exit=0
$ git check-ignore supabase/.temp/
supabase/.temp/
```

La primera ejecución de `verify` se lanzó por error antes de terminar `npm ci`:
falló lint con «eslint is not recognized». No prueba el código y se repetirá
cuando la instalación termine. No se marca como pasada.

```text
$ npm ci
npm warn deprecated eslint@9.39.5: This version is no longer supported.
added 487 packages, and audited 494 packages in 59s
8 moderate severity vulnerabilities
exit=0
$ git diff --check  (tras normalizar los saltos de línea de los archivos editados)
(sin salida)
exit=0
```

### T007 — dependencia circular de la primera generación de tipos

Pendiente de aclaración por el fundador antes del primer commit de implementación.
T007 exige «desde el primer commit del PR A» un `database.types.ts` «generado en
el runner sobre el esquema sin migraciones de Juntia», además de su comparación
bloqueante. El runner necesita recibir antes un commit con el job nuevo para
poder generar ese archivo. No existe aún esa primera salida generada.

El bootstrap preparado conserva `db:types:check` bloqueante y un artefacto con
la salida generada, pero no se ha hecho commit, push ni lanzamiento de CI:
publicar primero sin el archivo supondría una excepción literal a T007.
Se retiró el marcador provisional local `Database = never`; no se presenta
como archivo generado ni se incluye en ningún commit.

Propuesta para revisión del fundador (no ejecutada): un commit preparatorio
del bootstrap, un run que genere los tipos y falle la comparación por falta
del archivo; recuperar el artefacto, versionarlo y ejecutar el bootstrap
completo en verde antes de T008/T012. La comprobación no se omite, no se usa
Docker local y no se altera el orden de las migraciones. Esta propuesta
necesita autorización explícita porque T007 exige los tipos desde el primer
commit.

El bloqueo original de idempotencia sigue resuelto por PR #39; este punto
es independiente. T015 y T016 no se han alcanzado. No se consumieron minutos
de Actions en esta reanudación.

### Verify del bootstrap preparado — salida real

Commit: cambios locales sobre `806bb49`, sin commit de implementación.
Extracto literal de la salida de `npm run verify` (exit 0):

```text
Test Files  9 passed (9)
     Tests  87 passed (87)
  Duration  9.73s (environment 42%, tests 27%, import 14%, setup 13%, transform 3%)

verify · 002
```

La tabla del comando registró lint 11.77 s, typecheck 3.44 s, dominio
sin archivos de test 2.02 s (no hay dominio financiero todavía), componentes
11.19 s y total 28.43 s contra < 90 s. SQL/RLS e integración dijeron
«SOLO EN CI — pendiente de resultado · job db» y E2E «NO APLICABLE — la spec
E2E 1 nace en el PR B de la 002». No es el gate completo del PR.

## Excepción de bootstrap autorizada por el fundador

El fundador autorizó explícitamente un commit preparatorio y un run con rojo
esperado **solo en `db:types:check`**, seguido de descarga con `gh run download`,
inspección del artefacto, commit propio de los tipos y un run completo verde.
La comparación sigue bloqueante, sin `continue-on-error`; el artefacto se
conserva en el workflow para cada migración posterior. Esta autorización
resuelve la dependencia circular de T007; no cambia las etapas ni los gates.

### Ejecución preparatoria — rojo esperado

Fecha: 4 de noviembre de 2026, America/Bogota.
Commit: `5e38f845e026a44e9b4e54223e96266b0e2e612c`.
Run: [41970243181](https://github.com/flashwp3-ctrl/juntia/actions/runs/41970243181).

```text
$ git push -u origin feat/002-a-database
 * [new branch] feat/002-a-database -> feat/002-a-database
$ gh workflow run ci.yml --ref feat/002-a-database
$ gh run watch 41970243181 --exit-status --interval 15
X db in 3m36s
  ✓ Start Supabase and reset the runner database
  ✓ Test SQL
  ✓ Test API
  X Check generated types
  ✓ Preserve generated public types
✓ app in 3m20s
exit=1
$ gh run download 41970243181 --name database-types --dir specs/002-cuentas-y-gastos-privados/evidence/type-generation-bootstrap
(sin salida, exit=0)
```

La generación terminó bien; la comparación falló por ausencia del primer
archivo versionado, conforme a la excepción autorizada. Ningún control omitido
ni `continue-on-error`. El artefacto contenía un solo `database.types.ts`:
se leyó completo y se buscó `https?://`, prefijos de claves, JWT, contraseñas
y correos (sin coincidencias). Solo contiene tipos genéricos, el esquema
`public` vacío y `Constants` con sus enums vacíos; no hay datos de personas.
Se movió sin editar a `src/lib/supabase/database.types.ts`.

Salida real de los tiempos del resumen:

```text
supabase start: 119 s
| test:db | pasó | 8.69 s | < 60 s |
| test:integration | pasó | 0.68 s | — |
| db:types:check | falló | 1.11 s | — |
| Job db (incluye instalación) | failure | 211.30 s | < 360 s |
| Job app (incluye instalación) | success | 191.09 s | < 360 s |
```

Log completo (con claves enmascaradas por Actions):
[`evidence/bootstrap-preparatory.txt`](evidence/bootstrap-preparatory.txt).

### Verificación local del commit de tipos

Commit: `6ea9b3f27e3453ae3b8e883f7cadb8acd8677950`.
`database.types.ts` descargado sin editar: SHA256
`8bd40c6b84ae9057dbecbb57c894ba490b6df91401d56c8d7ffbbd1ff399d120`.

Extracto de `npm run verify`, exit 0:

```text
Test Files  9 passed (9)
     Tests  87 passed (87)
  Duration  10.70s (environment 38%, tests 30%, import 17%, setup 14%, transform 1%)
```

Tabla real: lint 10.44 s, typecheck 3.58 s, dominio sin archivos 1.49 s,
componentes 11.93 s, total 27.44 s (< 90 s). SQL/RLS e integración siguen
«SOLO EN CI» y E2E «NO APLICABLE»; no se atribuye a este comando ninguna prueba
de base de datos.

### Bootstrap completo — verde

Commit: `6ea9b3f27e3453ae3b8e883f7cadb8acd8677950`.
Run: [41970766206](https://github.com/flashwp3-ctrl/juntia/actions/runs/41970766206).

```text
$ gh workflow run ci.yml --ref feat/002-a-database
$ gh run watch 41970766206 --exit-status --interval 20
✓ app in 2m40s
✓ db in 3m10s
  ✓ Start Supabase and reset the runner database
  ✓ Test SQL
  ✓ Test API
  ✓ Check generated types
  ✓ Preserve generated public types
exit=0
supabase start: 111 s
| test:db | pasó | 5.76 s | < 60 s |
| test:integration | pasó | 0.88 s | — |
| db:types:check | pasó | 1.36 s | — |
| Job db (incluye instalación) | success | 180.00 s | < 360 s |
| Job app (incluye instalación) | success | 156.24 s | < 360 s |
```

Las duraciones de `gh run watch` incluyen setup/post del job; el resumen interno
mide desde su primer paso. Ambas se conservan sin cambiar presupuestos.
Log: [`evidence/bootstrap-green.txt`](evidence/bootstrap-green.txt).
T001–T007 terminadas con la excepción de arranque autorizada; no hay migraciones.

### T008–T011 — dominio, dataset y copy

Extractos reales de `npm run test:unit`, en orden, antes de crear cada módulo:

```text
T008: Error: Cannot find module './index' imported from src/domain/money/money.test.ts
Test Files 1 failed (1); Tests no tests; Duration 293ms; exit=1
Después: Test Files 1 passed (1); Tests 16 passed (16); Duration 343ms; exit=0

T009: Error: Cannot find module './index' imported from src/domain/transactions/transactions.test.ts
Test Files 1 failed | 1 passed (2); Tests 16 passed (16); Duration 386ms; exit=1
Después: Test Files 2 passed (2); Tests 22 passed (22); Duration 372ms; exit=0

T010: Error: Cannot find module './october-2026' imported from src/domain/golden/october-2026.test.ts
Test Files 1 failed | 2 passed (3); Tests 22 passed (22); Duration 355ms; exit=1
Después: Test Files 3 passed (3); Tests 23 passed (23); Duration 498ms; exit=0
$ npm run typecheck
exit=0
```

La salida completa del último dominio está en `evidence/domain-green.txt`.
Los tests del dataset afirman 41290000 unidades menores de gasto, 8600000 de
ingreso aparte y las ocho categorías literales.

Detalles locales necesarios: TypeScript apunta ahora a ES2020 para los literales
`bigint`; `test:unit` ya no usa `passWithNoTests`; el proyecto de dominio usa
globals tipados de Vitest para mantener intacta la frontera de imports del
dominio. El primer `verify` detectó imports de `vitest` bloqueados por esa
regla; se quitaron esos imports, sin debilitar la regla. Se conserva la salida
en `evidence/domain-and-sql-red-local-verify.txt`.

T011 añade las claves exactas de `contracts/errors.md` y las diez categorías
de producto en `es.ts`; redacción pendiente de revisión humana del PR A.

### T012 — pruebas antes de foundation: rojo observado

Fecha: 5 de noviembre de 2026, America/Bogota.
Commit: `7c04dab16e763929bb6341787d32d02427347c6c`.
Run: [41971899990](https://github.com/flashwp3-ctrl/juntia/actions/runs/41971899990).
Comandos: `gh workflow run ci.yml --ref feat/002-a-database` y
`gh run watch 41971899990 --exit-status --interval 20` (exit 1 esperado).

Extractos reales:

```text
00_smoke.test.sql ....... ok
01_privileges.test.sql:9: ERROR: schema "juntia_data" does not exist
02_claims.test.sql:9: ERROR: role "juntia_writer" does not exist
03_views.test.sql:4: ERROR: relation "public.my_profile" does not exist
04_writer.test.sql:6: ERROR: relation "juntia_data.profiles" does not exist
06_profiles.test.sql:6: ERROR: relation "juntia_data.profiles" does not exist
09_allowlist.test.sql:4: ERROR: relation "juntia_data.signup_allowlist" does not exist
✓ integration tests/integration/smoke.test.ts (1 test) 67ms
Test Files 1 failed | 1 passed (2)
Tests 1 failed | 3 passed (4)
AssertionError: expected { code: 'PGRST202', …(3) } to be null
```

`app` pasó en 2m47s. `db` falló en 3m11s solo en pruebas nuevas: arranque,
reset y comparación de tipos pasaron. pgTAP tardó 5.85 s (< 60 s);
el resumen midió `db` 184.44 s y `app` 161.89 s (< 360 s).
Log completo: [`evidence/foundation-red.txt`](evidence/foundation-red.txt).
Es el rojo requerido **antes** de crear `foundation`, no el punto de control
1 de T015 ni un fallo del mecanismo real: la migración aún no existía.

Después del rojo se añadió a la integración una sonda SQL temporal para observar
los claims reales de PostgREST; se elimina en `finally`. No modifica la migración.

### Primera ejecución de foundation — arnés interrumpido y tipos generados

Commit: `4c6c94c3fe9ae0246fdd0826740261ab366d43fe`.
Run: [41972604571](https://github.com/flashwp3-ctrl/juntia/actions/runs/41972604571).
`gh run watch 41972604571 --exit-status --interval 20`: exit 1.
Log completo: [`evidence/foundation-first-run.txt`](evidence/foundation-first-run.txt).

```text
00_smoke.test.sql ....... ok
01_privileges.test.sql .. All 76 subtests passed
02_claims.test.sql ...... ok
03_views.test.sql ....... ok
04_writer.test.sql ...... All 3 subtests passed
06_profiles.test.sql .... ok
01_privileges.test.sql:22: ERROR: could not determine which collation to use for string comparison
04_writer.test.sql:9: ERROR: could not determine which collation to use for string comparison
CONTEXT: PL/pgSQL function results_eq(refcursor,refcursor,text)
09_allowlist.test.sql:5: ERROR: permission denied to set role "supabase_auth_admin"
✓ [V9] PostgREST fija request.jwt.claims y no el claim legacy
✓ [V1/V8] ensure_profile por HTTP conserva la identidad y es idempotente
× [V2/V7] POST/PATCH/DELETE directos y perfiles privados no son accesibles
AssertionError: expected [ 'PGRST205', 'PGRST106', '42501' ] to include '21000'
✓ [V7] GraphQL no puede exponer datos ni esquemas de Juntia
```

La [V] 1 **no está cerrada**: el arnés abortó en una comparación de catálogos
antes de terminarla; no hubo una aserción negativa del mecanismo. No se ha
modificado el dueño de ninguna función para resolverlo. Se sustituyeron las
comparaciones `results_eq` afectadas por comparaciones de listas JSONB exactas,
que no dependen de collation. Para el hook, pgTAP comprueba grants y resultados;
la integración de Auth, con la clave publicable, prueba el rol real en lugar
de conceder a `postgres` poder asumir `supabase_auth_admin`.

El rechazo `21000` en una mutación sin filtro no demuestra los permisos:
se añadió un filtro válido a PATCH/DELETE, manteniendo la lista estricta de
errores de autorización. Es coherente con la protección de operaciones sin
condición de [pg-safeupdate, documentación de PostgREST](https://docs.postgrest.org/en/stable/integrations/pg-safeupdate.html).
La causa concreta se confirmará al repetir; no se acepta `21000` para fabricar
un verde.

```text
supabase start: 129 s
| test:db | falló | 9.23 s | < 60 s |
| test:integration | falló | 1.43 s | — |
| db:types:check | falló | 1.07 s | — |
| Job db (incluye instalación) | failure | 192.66 s | < 360 s |
| Job app (incluye instalación) | success | 149.45 s | < 360 s |
$ gh run download 41972604571 --name database-types --dir specs/002-cuentas-y-gastos-privados/evidence/type-generation-foundation
exit=0
```

El artefacto se leyó completo y se buscó URLs, JWT, claves, contraseñas y correos:
ninguna coincidencia. Contiene solo tipos, `my_profile`, las cuatro entradas de
perfil y constantes de enums vacíos. Movido sin editar a `database.types.ts`,
SHA256 `2c7b564edbf1edbe8aecd729571e6b9134cfa849ac3c77d5f43f9a788ee90694`.
La CLI genera espacios al final de una línea vacía: se conserva la salida original
para la comparación exacta, y `git diff --check` lo avisa. No se omite el check de tipos.

Se añadió a `foundation` un `NOTICE` del rol efectivo y de login, sin claves,
para que T016 pueda registrar quién ejecuta realmente la migración alojada.

## Punto de control 1 — T015

Fecha: 5 de noviembre de 2026, America/Bogota.
Commit: `cbccec832d338402bc7262973b8e0b539d6dddff`.
Run: [41973425784](https://github.com/flashwp3-ctrl/juntia/actions/runs/41973425784).
Log: [`evidence/checkpoint-1-green.txt`](evidence/checkpoint-1-green.txt).

```text
$ gh workflow run ci.yml --ref feat/002-a-database
$ gh run watch 41973425784 --exit-status --interval 20
✓ app in 1m55s
✓ db in 3m24s
exit=0

00_smoke.test.sql ....... ok
01_privileges.test.sql .. ok
02_claims.test.sql ...... ok
03_views.test.sql ....... ok
04_writer.test.sql ...... ok
06_profiles.test.sql .... ok
09_allowlist.test.sql ... ok
All tests successful.
Files=7, Tests=137
Result: PASS

Test Files 2 passed (2)
Tests 6 passed (6)
database.types.ts coincide con public generado en el runner.
```

| Verificación temprana | Salida real y alcance |
| --- | --- |
| [V] 1 | `04_writer.test.sql ... ok` y la integración completa pasó: dueño `juntia_writer`, sin LOGIN/BYPASSRLS, sin ser dueño de profiles; implementación llamada por SQL como authenticated; identidad propia y rechazo RLS de perfil ajeno desde un definer desechable de writer; `current_uid` nulo sin claims. **No falló el mecanismo ni se cambió a funciones de postgres.** |
| [V] 2, parte disponible | `06_profiles.test.sql ... ok` y el archivo de integración pasó: escrituras directas SQL sobre profiles rechazadas, POST/PATCH/DELETE por HTTP rechazados también en my_profile y con perfiles privados; privacidad entre Sara y Tomás. |
| [V] 7, parte disponible | `01_privileges.test.sql ... ok`: grants de esquemas/tablas/columnas/funciones y defaults, sin CREATE, sin definer público, sin GraphQL; integración de esquemas privados y GraphQL pasó. |
| [V] 8, parte disponible | `03_views.test.sql ... ok`, `my_profile` invoker y lectura sin USAGE sobre juntia_data; integración de lectura pasó. |
| [V] 9 | `02_claims.test.sql ... ok` y la sonda HTTP del claim pasó: JSON `request.jwt.claims`, sin claim legacy, mismo sub en auth.uid/current_uid. |

Las [V] 2, 7 y 8 son **solo la parte disponible en foundation**; las cinco
definitivas sobre todas las tablas controladas y vistas siguen pendientes de T020.
La sonda de claims se eliminó antes de regenerar tipos, que contienen únicamente
las cuatro funciones de perfil. No hay funciones de dinero.

Tiempos reales del resumen (presupuestos sin cambios):

```text
supabase start: 128 s
| test:db | pasó | 9.01 s | < 60 s |
| test:integration | pasó | 1.76 s | — |
| db:types:check | pasó | 1.20 s | — |
| Job db (incluye instalación) | success | 196.37 s | < 360 s |
| Job app (incluye instalación) | success | 111.43 s | < 360 s |
```

`app` también ejecutó 23 tests de dominio, 87 de componentes, build, 36 casos
de axe y los checks de superficie interna y tema. El único aviso de Actions
fue el cambio de imagen de ubuntu-latest; ningún control falló.

## T016 — pausa humana obligatoria

**Ejecución reportada por el fundador el 5 de noviembre de 2026.** Proyecto
`juntia-dev`, ref `itfrhnadovezpahikuol`. La aplicación y las consultas alojadas
las ejecutó el fundador; no el agente. No se solicitó ni recibió contraseña.

Región East US (North Virginia), aceptada por los fundadores y documentada en
quickstart §3 por `f0bc3af62794c98b6c2122b36a5ce4d802de651c`. Antes de continuar:

```text
$ git pull --no-rebase origin feat/002-a-database
From https://github.com/flashwp3-ctrl/juntia
 * branch feat/002-a-database -> FETCH_HEAD
Already up to date.
```

Salida aportada por el fundador (no observada de nuevo por el agente):

```text
project-ref: itfrhnadovezpahikuol
projects list: juntia-dev enlazado
dry-run: Would push these migrations: • 20261105000100_foundation.sql
push: Initialising login role
Applying migration 20261105000100_foundation.sql...
Finished supabase db push.
migration list --linked: 20261105000100 en Local y en Remote

db query --linked (solo lectura):
pg_graphql_installed = 0
postgres_member_of_writer = true
complete_first_entry: owner=juntia_writer, prosecdef=true
ensure_profile: owner=juntia_writer, prosecdef=true
set_theme: owner=juntia_writer, prosecdef=true
update_display_name: owner=juntia_writer, prosecdef=true
juntia_writer: login=false, bypassrls=false
juntia_data.categories: owner=postgres, RLS activo
juntia_data.profiles: owner=postgres, RLS activo
juntia_data.signup_allowlist: owner=postgres, RLS activo
```

Sin semilla. La CLI usó un rol de acceso temporal («Initialising login role»),
sin contraseña de la base; **no imprimió el NOTICE**. Rol migrador efectivo:
**evidencia indirecta** de `current_user = postgres`, por la propiedad de las
tablas que crea esta migración (no les cambia el dueño). No se atribuye un
`session_user` concreto ni se presenta el NOTICE como observado.

**Exposed schemas: confirmado por el fundador el 5 de noviembre de 2026.**
Venía con `graphql_public` además de `public`; el fundador quitó
`graphql_public` y guardó. Ahora muestra solo `public` y «1 of 4 schemas exposed».
Exposed tables y functions siguen en 0 en el panel y no se tocaron;
Automatically expose new tables está apagado. Es evidencia reportada por
el fundador, no una captura tomada por el agente.

Comprobaciones adicionales aportadas: en `public` solo está la vista
`my_profile`, con SELECT solo para authenticated; las cuatro entradas públicas
tienen EXECUTE para authenticated y no para anon. **Pendiente antes del PR B:**
dejar el mismo ajuste de esquemas expuestos en `juntia-prod`.

T016 cerrada con esta confirmación. El fundador autorizó seguir con T017 en
adelante. El rol migrador sigue registrado como evidencia indirecta, nunca
como un NOTICE observado.

Desde `feat/002-a-database`, los comandos exactos de quickstart §3 son:

```bash
npx --yes supabase@2.121.0 login
npx --yes supabase@2.121.0 link --project-ref itfrhnadovezpahikuol
npx --yes supabase@2.121.0 projects list
cat supabase/.temp/project-ref
npx --yes supabase@2.121.0 db push --linked --dry-run
npx --yes supabase@2.121.0 db push --linked
```

Antes de los dos `db push`, `project-ref` debe ser `itfrhnadovezpahikuol`.
El dry-run debe anunciar **solo `20261105000100_foundation.sql`**. Si el destino
o la lista no coincide, parar. Nunca `--include-seed`.

Para la evidencia, el fundador entrega la salida del dry-run y push sin claves,
el `NOTICE foundation migrator` si la CLI lo imprime y la comprobación de
propiedad/GraphQL. Consultas de lectura en el SQL Editor de **juntia-dev**:

```sql
select extname from pg_extension where extname = 'pg_graphql';
select pg_has_role('postgres', 'juntia_writer', 'MEMBER') as postgres_member_of_writer;
select p.proname, pg_get_userbyid(p.proowner) as owner, p.prosecdef
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'juntia_private' and p.proname in
  ('ensure_profile', 'complete_first_entry', 'set_theme', 'update_display_name')
order by p.proname;
```

Además, confirmar en API / Data API que **Exposed schemas = solo public**.
El rol del SQL Editor no se atribuye al login de db push: en esta ejecución
el fundador aceptó la evidencia indirecta de la propiedad de las tablas,
sin atribuir un NOTICE ni un session_user que no se observaron.
**Si pg_graphql no se puede quitar o desactivar, el PR A se detiene.**

## Estado al entregar la pausa T016 (registro histórico)

- T001–T015: completadas con el run del punto de control 1 y las salidas anteriores.
- T016: pendiente humana; T017 en adelante no iniciadas.
- Punto de control 2, funciones de dinero, restauración y nueve controles negativos: pendientes del gate T016.
- PR: no abierto; el PR A aún no está terminado.
- Excepción del contrato: arranque de tipos autorizado por el fundador, con su rojo y verde registrados. Se conservó el mismo camino de artefactos para foundation.
- Incidencias de ejecución: arnés de collation/rol y peticiones sin filtro corregidos sin ampliar privilegios ni aceptar errores genéricos como prueba de autorización; log del fallo conservado.
- Sin Docker Desktop, WSL, datos reales, push a main, rebase, force-push ni merge de PR.

### Verificación local sobre el mismo commit del punto de control 1

`npm run verify` ejecutado con HEAD
`cbccec832d338402bc7262973b8e0b539d6dddff`, exit 0.
Salida completa: [`evidence/checkpoint-1-same-commit-verify.txt`](evidence/checkpoint-1-same-commit-verify.txt).

```text
Test Files 3 passed (3)
Tests 23 passed (23)
Test Files 9 passed (9)
Tests 87 passed (87)
```

Tabla real: lint 13.03 s; typecheck 3.45 s; dominio 1.72 s (< 15 s);
componentes 10.71 s; verify total 28.90 s (< 90 s).
SQL/RLS e integración «SOLO EN CI»; E2E «NO APLICABLE».
El commit posterior de entrega contiene solo este registro, los logs de
verificación y las casillas de tareas: la migración y el código siguen siendo
los del commit de punto de control citado, sin un run adicional documental.

## juntia-dev tras PR A — aplicación reportada por el fundador

Fecha: **5 de noviembre de 2026**. Proyecto `juntia-dev`, ref
`itfrhnadovezpahikuol`. Commit aplicado: `027a5b2`.
El fundador ejecutó el dry-run, el push y las consultas de solo lectura;
el agente registra su reporte, sin atribuirse una ejecución ni una observación
directa de esas comprobaciones.

El dry-run listó únicamente estas dos migraciones, posteriores a foundation:

```text
20261105000200_controlled_tables.sql
20261105000300_money_functions.sql
```

Salida final del push aportada por el fundador:

```text
Finished supabase db push.
```

`migration list --linked`: `000100`, `000200` y `000300` en **Local y Remote**
(sufijos de las versiones reportados por el fundador).

Resultado aportado de `db query --linked` (solo lectura):

```text
pg_graphql: ausente
juntia_data: 6 tablas, dueño postgres y RLS activo
juntia_private: 7 definers, dueño juntia_writer y search_path=""
public: 7 entradas invoker, EXECUTE para authenticated y no para anon
public: 4 vistas con security_invoker=true, SELECT solo para authenticated
Permisos en public y juntia_data: ninguno distinto de SELECT para anon o authenticated
Triggers presentes: 4
Movimientos: 0
```

Este registro complementa T016 con la aplicación de controlled_tables y
money_functions a desarrollo. No acredita aplicación a producción ni sustituye
la revisión humana del SQL de T033.

## T017 — pruebas previas a controlled_tables

Fecha: 5 de noviembre de 2026. Commit `12709ce43ecb9ee5e07c4da2fc81881f73185caf`.
Run: [42035071059](https://github.com/flashwp3-ctrl/juntia/actions/runs/42035071059).
Comandos: `gh workflow run ci.yml --ref feat/002-a-database`;
`gh run watch 42035071059 --exit-status --interval 20` (exit 1 esperado).
Log completo: [`evidence/controlled-tables-red.txt`](evidence/controlled-tables-red.txt).

```text
00_smoke.test.sql .......... ok
01_privileges.test.sql:14: ERROR: relation "juntia_data.transactions" does not exist
03_views.test.sql:8: ERROR: relation "public.my_transactions" does not exist
04_writer.test.sql:36: ERROR: relation "juntia_data.transactions" does not exist
05_direct_writes.test.sql:8: ERROR: relation "juntia_data.transactions" does not exist
07_transactions.test.sql:31: ERROR: relation "juntia_data.transactions" does not exist
Test Files 2 passed (2)
Tests 6 passed (6)
```

Arranque, reset, integración de foundation y tipos pasaron. `app` pasó en
2m33s; `db` falló en 3m9s por los objetos aún no implementados. `test:db` tardó
6.43 s (< 60 s). No es un fallo del mecanismo [V] 1: se trata del rojo previo
exigido por T017 antes de escribir la migración.

## T018–T019 — tablas, vistas e integración antes de fijar los tipos

Commit `359a663b367cc6472fe47dde726f74135a6c2772`.
Run [42036309887](https://github.com/flashwp3-ctrl/juntia/actions/runs/42036309887).
`gh run watch ... --exit-status --interval 20`: exit 1, solo por tipos antiguos.

```text
All tests successful.
Files=9, Tests=273
Result: PASS
Test Files 3 passed (3)
Tests 9 passed (9)
app: success, 2m45s
db: failure, 2m40s; solo Check generated types
supabase start: 92 s
test:db: 6.40 s (< 60 s)
Job app (resumen interno): 160.88 s
Job db (resumen interno): 153.44 s
```

La RLS de writer pasó en las tablas nuevas, incluida inserción ajena rechazada
y `SELECT ... FOR UPDATE` limitado a filas propias. También pasaron las pruebas
del protocolo pending/completed y de la auditoría inmutable. No existe aún
ninguna función de dinero.

Log: [`evidence/controlled-generation.txt`](evidence/controlled-generation.txt).
Artefacto descargado con `gh run download 42036309887 --name database-types
--dir specs/002-cuentas-y-gastos-privados/evidence/type-generation-controlled`.
Se leyó completo, sin claves, URLs ni datos: solo las cuatro vistas y funciones
de perfil, tipos auxiliares y constantes. Se movió sin editar a su ruta final.
SHA256 `0211ee4bf5cd3eb06ae54406475ab5937636f8a90f62da0d336bad8586c30c02`.

## T020 — punto de control 2

5 de noviembre de 2026. Commit `0d48a9372088fc35c43e2c88d5d2519639b7f0b7`.
Run [42037086359](https://github.com/flashwp3-ctrl/juntia/actions/runs/42037086359).
`gh workflow run ci.yml --ref feat/002-a-database` y
`gh run watch 42037086359 --exit-status --interval 20`: exit 0.
Log íntegro: [checkpoint-2-green.txt](evidence/checkpoint-2-green.txt).

```text
All tests successful.
Files=9, Tests=273
Result: PASS
Test Files 3 passed (3)
Tests 9 passed (9)
app: success, 3m18s (resumen interno 192.93 s)
db: success, 3m58s (resumen interno 229.16 s)
supabase start: 138 s
test:db: 13.81 s (< 60 s)
test:integration: 2.69 s
db:types:check: 1.26 s
```

Las salidas pgTAP `04_writer` ([V] 1), `05_direct_writes` y la integración
([V] 2), `01_privileges` ([V] 7), `03_views` ([V] 8) y `02_claims` más la
sonda HTTP de foundation ([V] 9) pasan con las tres tablas controladas. El
log conserva cada archivo y el resultado real del conjunto; no hay funciones
de dinero en este commit. `npm run verify` sobre ese mismo SHA: exit 0,
29.88 s, 23 pruebas de dominio y 87 de componentes; salida en
[checkpoint-2-local-verify.txt](evidence/checkpoint-2-local-verify.txt).
Los techos no se cambian; el arranque por encima de 60 s queda medido.

## T021, T023–T025 — pruebas previas de dinero

5 de noviembre de 2026, commit `3eb0695a2569e59144580a2c949069ac6285a312`.
Run [42039337632](https://github.com/flashwp3-ctrl/juntia/actions/runs/42039337632).
Dispatch manual y `gh run watch 42039337632 --exit-status --interval 20`:
exit 1 esperado; [log íntegro](evidence/money-red.txt).

```text
08_money_functions.test.sql:5: ERROR: function juntia_private.parse_amount_minor(unknown) does not exist
Files=10, Tests=273
Test Files 1 failed | 3 passed (4)
Cannot find module '../../src/lib/db/transactions'
app typecheck: faltan errors, types, transactions y las dos RPC en tipos generados
supabase start: 120 s
Job app: failure, 35.36 s (resumen interno)
Job db: failure, 186.58 s (resumen interno)
```

El humo y las pruebas anteriores pasan. Antes de implementar `errors.ts`,
`npm run test:components -- --run src/lib/db/errors.test.ts src/lib/db/types.test.ts`
falló localmente por `Cannot find module './errors'` (exit 1).
Después de implementarlo: 1 archivo, 24 pruebas pasadas, exit 0.
Los tipos se mantienen pendientes de generación en el runner: `npm run typecheck`
solo señala que faltan `create_transaction` y `update_transaction` en el tipo
generado anterior. No se editan ni se relaja la comprobación.

## T022 — funciones y generación de tipos

Commit `74b6e72`, run [42040320912](https://github.com/flashwp3-ctrl/juntia/actions/runs/42040320912).
`gh run watch ... --exit-status --interval 20`: exit 1;
[log completo](evidence/money-generation.txt).

```text
08_money_functions.test.sql .. ok
04_writer: Failed test 4: cuatro implementaciones propiedad de writer
have: complete_first_entry, create_transaction, ensure_profile, set_theme, update_display_name, update_transaction, void_transaction
want: complete_first_entry, ensure_profile, set_theme, update_display_name
Files=10, Tests=318; Failed: 1
Test Files 4 passed (4); Tests 17 passed (17)
40P01 real se reintenta con la misma clave: passed (1358 ms)
supabase start: 109 s; test:db: 5.83 s
Job app: failure, 42.20 s; Job db: failure, 188.84 s (resúmenes internos)
```

La lista explícita del inventario de definers se actualiza a las siete funciones
previstas; el mecanismo de identidad/RLS no falló y los puntos de control 1 y 2
conservan sus verdes previos. `db:types:check` y el typecheck de app también
fallaron por los tipos anteriores, como se esperaba antes de descargar el artefacto.
`gh run download 42040320912 --name database-types --dir .../type-generation-money`:
descargado y leído completo; solo definiciones, sin claves, URLs ni datos.
Se movió sin editar a `src/lib/supabase/database.types.ts`.
SHA256 `46d68f6321aec0845190f461a332d757240fcca9348dae589da09b66e47ea25c`.
`npm run typecheck` con el artefacto: exit 0.
El artefacto `auth-bootstrap-description` contiene solo la definición de `auth.uid()`
y el catálogo de columnas (ninguna fila), para versionar el arranque T027 contra
la versión real del stack. El siguiente gate comprobará estos tipos sin cambios.

## T027–T030 — rojo previo del ensayo

Antes de escribir los scripts de copia/restauración se escribió `restore-drill.sh`
con los dos caminos y los nueve negativos. Git Bash (sin Docker ni WSL):

```text
bash -n scripts/restore-drill.sh
syntax-exit=0
bash scripts/restore-drill.sh
FALTA: scripts/backup-manifest.sh
test-exit=1
```

Ejecución real del ensayo: pendiente de completar los scripts y el runner PGDG 17.

## T030 — primer ensayo completo y tipos verdes

5 de noviembre de 2026, commit `698f04e5e3ec8d5c49fa16fd2c99019a3e6554b5`.
Run [42041786375](https://github.com/flashwp3-ctrl/juntia/actions/runs/42041786375),
dispatch manual y `gh run watch ... --exit-status --interval 20`: exit 0.
Salida completa: [restore-first-green.txt](evidence/restore-first-green.txt).
`verify` sobre el mismo SHA, exit 0, 20.41 s:
[restore-first-local-verify.txt](evidence/restore-first-local-verify.txt).

```text
Files=10, Tests=318; Result: PASS
Test Files 4 passed (4); Tests 17 passed (17)
database.types.ts coincide con public generado en el runner.
Camino A: MANIFIESTO COINCIDE; usuario restaurado entra
Auth: columnas y auth.uid() coinciden con el stack
Camino B: MANIFIESTO COINCIDE; base temporal borrada
exit=0 base=juntia_restore_20261105T140958_12851 creada_por_este_script=1
N1-migration: rechazo esperado, exit=1, sin marca de éxito
N2-count: rechazo esperado, exit=1, sin marca de éxito
N3-sha: rechazo esperado, exit=1, sin marca de éxito
N4-data-hash: rechazo esperado, exit=1, sin marca de éxito
N5-partial-restore: rechazo esperado, exit=1, sin marca de éxito
N5-cleanup: bases restantes=0; log con exit distinto de cero
N6-backup: rechazo esperado, exit=128, sin marca de éxito
N6-cleanup: sin archivos publicados ni temporales
N7-existing: rechazo esperado, exit=1, sin marca de éxito
N7-integridad: sha256 del archivo existente idéntico
N8-drop: rechazo esperado, exit=1, sin marca de éxito
N8-cleanup: DROP FALLÓ, exit=1; job borró la base propia; bases restantes=0
N9-decrypt: rechazo esperado, exit=2, sin marca de éxito
N9-cleanup: sin archivos publicados ni temporales
ENSAYO LISTO: A y B, nueve controles negativos rechazados
supabase start: 104 s; test:db: 5.89 s (< 60 s)
Job app: success, 153.34 s; Job db: success, 224.09 s (resúmenes internos)
```

Sin cambios de techo ni datos reales. El registro de migraciones del arranque
plain conserva las versiones aplicadas para exigir la misma comparación del
manifiesto en ambos destinos. Los hooks de fallo solo se aceptan en modo CI;
el modo producción exige etiqueta `db-prod-*`. El glosario solo cambia las dos
filas `voided`; `scope` conserva su condición de propuesta.

### Corrección final de T024 — objeto de red del SDK

Antes de la corrección se añadió al caso existente el error de fetch envuelto
por PostgREST y se ejecutó `npm run test:components -- --run src/lib/db/errors.test.ts`:

```text
HTTP, red y desconocidos sin filtrar mensaje técnico: failed
AssertionError: expected 'unexpected' to be 'network'
Tests 1 failed | 23 passed (24)
```

Después de traducir el objeto con código vacío y mensaje de fetch/abort:
`Test Files 1 passed (1); Tests 24 passed (24)`, exit 0. Ningún mensaje técnico
se devuelve al producto. Se repetirá el gate completo porque cambió código.

## T032 — gate final

La corrección de red `e9c9046856693498739446c42d16baed844bd153` pasó el run
[42042730228](https://github.com/flashwp3-ctrl/juntia/actions/runs/42042730228),
con `gh run watch ... --exit-status --interval 20`, exit 0, y verify local del
mismo SHA, exit 0 (20.70 s). Salidas:
[network-fix-green.txt](evidence/network-fix-green.txt) y
[network-fix-local-verify.txt](evidence/network-fix-local-verify.txt).

```text
Job app: success, 126.58 s; Job db: success, 265.82 s (resúmenes internos)
supabase start: 126 s; test:db: 10.63 s (< 60 s)
ENSAYO LISTO: A y B, nueve controles negativos rechazados
```

**Gate de entrega terminado**, 5 de noviembre de 2026:
commit `314ec31f78171ce672ee1e1f4652ed1278dacb3f`, run
[42043654607](https://github.com/flashwp3-ctrl/juntia/actions/runs/42043654607).
Incluye en la migración los comentarios de justificación de cada definer
exigidos por ADR-013 §5.7. `npm run verify` sobre ese mismo SHA: exit 0,
23.09 s; [salida local](evidence/final-local-verify.txt).
Dispatch manual y `gh run watch 42043654607 --exit-status --interval 20`:
exit 0; [log completo](evidence/final-green.txt).

```text
Test Files 3 passed (3); Tests 23 passed (23) [domain]
Test Files 11 passed (11); Tests 112 passed (112) [components]
01_privileges.test.sql ....... ok
02_claims.test.sql ........... ok
03_views.test.sql ............ ok
04_writer.test.sql ........... ok
05_direct_writes.test.sql .... ok
Files=10, Tests=318; Result: PASS
Test Files 4 passed (4); Tests 17 passed (17) [integration]
36 passed [axe]
database.types.ts coincide con public generado en el runner.
Camino A: MANIFIESTO COINCIDE; usuario restaurado entra
Camino B: MANIFIESTO COINCIDE; base temporal borrada
exit=0 base=juntia_restore_20261105T142206_12915 creada_por_este_script=1
ENSAYO LISTO: A y B, nueve controles negativos rechazados
app in 2m20s; db in 4m22s [gh run watch]
Job app: success, 136.37 s; Job db: success, 255.15 s [resúmenes internos]
supabase start: 115 s; test:db: 6.10 s (< 60 s)
```

[V] 1: `04_writer` pasa con identidad, autorización, RLS y bloqueos propios/ajenos.
[V] 2: `05_direct_writes` e integración pasan, incluidos los guards inmutables.
[V] 7: `01_privileges` pasa con privilegios efectivos/defaults y GraphQL ausente.
[V] 8: `03_views` pasa sin USAGE de datos para authenticated y vistas invoker.
[V] 9: `02_claims` y la sonda HTTP de foundation pasan con el JWT real.
La salida de pg_prove es resumida por archivo en los éxitos; no se inventan líneas
TAP individuales que la CLI no imprime. [V] 3–6 quedan cubiertas por la inyección
de rollback, concurrencia, precisión y deadlock de las ocho pruebas de dinero.

Negativos del gate final: N1=1, N2=1, N3=1, N4=1, N5=1, N6=128,
N7=1, N8=1, N9=2; todos sin marcador de éxito. N5 deja cero bases y log de fallo;
N6 y N9 no publican archivos ni dejan temporales; N7 conserva el SHA256 existente;
N8 registra DROP FALLÓ/exit=1 y el job borra después esa base. Los manifiestos
íntegros, recuentos y hashes están en el log enlazado; no hay datos reales.
No se movieron techos. El commit posterior de evidencia solo guarda esta salida,
los logs y las casillas; no modifica ningún archivo ejecutable ni migración.

## T033 — entrega para revisión

Descripción en inglés preparada con Objective, Files, Decisions, Commands,
Screenshots (no aplica), Risks and pending y atribución final de Codex; incluye
los dos checkpoints, el gate, las pruebas del Anexo A y «E2E specs added: 0».
Se entrega mediante `gh pr create --base main --head feat/002-a-database
--body-file <archivo temporal>` sin `--draft`. Su URL se comunica en la entrega.
La revisión humana del SQL permanece pendiente de los fundadores: T033 conserva
la casilla sin marcar y el PR no se mergea. También quedan pendientes la revisión
del copy y T034–T038 en producción antes del PR B.

Desviaciones de procedimiento: solo el circuito de tipos/artefactos autorizado
por el fundador y la región dev aceptada. Se conservan los rojos esperados, los
fallos de arnés/inventario y su corrección. Ninguna ampliación de alcance ni
sustitución del mecanismo writer de ADR-013.

## T031 — reservas de evidencia de los PR siguientes

No se adelantan tareas ni verificaciones de interfaz. Las secciones siguientes
se rellenan en el PR que les corresponde; no constituyen evidencia de ejecución.

### T034

Fecha: 5 de noviembre de 2026, America/Bogota. Commit aplicado: `56d0dde`
(merge del PR #40 en `main`). Etiqueta: `db-prod-2026-11-05`.

**Quién.** Lo ejecutó Claude Code en el equipo de Alejandro, con su sesión de la
CLI y su confirmación explícita antes de cada paso de escritura; no la segunda
fundadora desde su equipo, como decía quickstart §3. El enlace a producción duró
solo esta sesión: se desenlazó al terminar y el equipo volvió a `juntia-dev`.
Ningún otro agente trabajó en la carpeta mientras estuvo enlazada. La regla se
ajustó en quickstart §3 y ADR-011 §9.5 en este mismo PR.

```text
$ npx --yes supabase@2.121.0 link --project-ref enwaxmwgldqohfawxhdm
$ npx --yes supabase@2.121.0 projects list
     ●    | vvnhzhfmvqhmvdehxndw | enwaxmwgldqohfawxhdm | juntia-prod | South America (São Paulo) | 2026-11-04 22:29:10
          | vvnhzhfmvqhmvdehxndw | itfrhnadovezpahikuol | juntia-dev  | East US (North Virginia)  | 2026-11-04 23:19:18
$ cat supabase/.temp/project-ref
enwaxmwgldqohfawxhdm
$ npx --yes supabase@2.121.0 db push --linked --dry-run
Initialising login role...
DRY RUN: migrations will *not* be pushed to the database.
Would push these migrations:
 • 20261105000100_foundation.sql
 • 20261105000200_controlled_tables.sql
 • 20261105000300_money_functions.sql
$ npx --yes supabase@2.121.0 db push --linked
Applying migration 20261105000100_foundation.sql...
Applying migration 20261105000200_controlled_tables.sql...
Applying migration 20261105000300_money_functions.sql...
Finished supabase db push.
$ npx --yes supabase@2.121.0 migration list --linked
   `20261105000100` | `20261105000100` | `2026-11-05 00:01:00`
   `20261105000200` | `20261105000200` | `2026-11-05 00:02:00`
   `20261105000300` | `20261105000300` | `2026-11-05 00:03:00`
$ git tag -a db-prod-2026-11-05 -m "Migraciones aplicadas a producción" 56d0dde
$ git push origin db-prod-2026-11-05
 * [new tag]         db-prod-2026-11-05 -> db-prod-2026-11-05
$ npx --yes supabase@2.121.0 unlink
Unlinking project: enwaxmwgldqohfawxhdm
Finished supabase unlink.
$ npx --yes supabase@2.121.0 link --project-ref itfrhnadovezpahikuol
$ cat supabase/.temp/project-ref
itfrhnadovezpahikuol
```

Sin `--include-seed`. La CLI no imprimió el `NOTICE foundation migrator`; las
tablas creadas son de `postgres` (abajo), igual que en `juntia-dev`.

### T035

Fecha: 5 de noviembre de 2026, tras el push de T034 (`db-prod-2026-11-05`).
Comprobación de solo lectura con `db query --linked` mientras producción estaba
enlazada, antes de `unlink`. La consulta exacta y su salida están en
[`evidence/t035-prod-readonly-check.txt`](evidence/t035-prod-readonly-check.txt);
el resumen:

| Comprobación | Resultado en `juntia-prod` |
| --- | --- |
| `pg_graphql` | No instalada (`pg_graphql_installed = 0`) |
| Tablas de `juntia_data` | `audit_events`, `categories`, `idempotency_records`, `profiles`, `signup_allowlist`, `transactions`: dueño `postgres`, RLS activo |
| Definers de `juntia_private` | `complete_first_entry`, `create_transaction`, `ensure_profile`, `set_theme`, `update_display_name`, `update_transaction`, `void_transaction`: dueño `juntia_writer`, `search_path=""` |
| Entradas de `public` | Las 7, `security invoker`; EXECUTE para `authenticated`, no para `anon` |
| Vistas de `public` | `my_profile`, `my_recent_categories`, `my_transaction_months`, `my_transactions`: `security_invoker=true`, SELECT solo para `authenticated` |
| Privilegios distintos de SELECT para `anon` o `authenticated` en `public` y `juntia_data` | Ninguno |
| Triggers | `audit_events_append_only`, `audit_events_no_truncate`, `idempotency_records_guard`, `transactions_guard_update` |
| Movimientos | 0 |

**Exposed schemas** (panel de `juntia-prod`, Integrations › Data API › Settings,
captura tras recargar:
[`evidence/t035-prod-exposed-schemas.webp`](evidence/t035-prod-exposed-schemas.webp),
sin claves ni datos): «1 of 4 schemas exposed», solo `public`. «Exposed tables
0 of 10» y «Exposed functions 0 of 21» no se tocaron; «Automatically expose new
tables» apagado.

**Resultado: pasa.** Producción sigue sin datos reales: falta la primera copia y
su restauración (quickstart §4.1 y §4.3) y la configuración de Auth (T036–T038).

### T036

**Parcial, 5 de noviembre de 2026.** `juntia-dev`: **Alejandro recibió de verdad**
el correo de verificación (plantilla por defecto de Supabase) y, después, el de
recuperación; la prueba la hizo el gestor en el Chrome de Windows de Alejandro,
con su autorización, con `npm run dev` en `http://localhost:3000` (commit
e819450) y gastó los 2 correos de esa hora. Sin direcciones en esta evidencia.

**Falta:** el correo de verificación de la segunda fundadora en `juntia-dev`, y
los dos en `juntia-prod` cuando se pruebe allí.

### T037

**Hecha por el gestor el 5 de noviembre de 2026, con la confirmación de
Alejandro** (sin correos ni claves):

| Ajuste | `juntia-dev` | `juntia-prod` |
| --- | --- | --- |
| Hook Before User Created → `juntia_private.before_user_created_hook` | Activado | Activado |
| Contraseña mínima | 8 | 8 |
| Confirm email | Activado | Activado |
| Site URL | `http://localhost:3000` | `https://juntia.vercel.app` |
| Redirect URLs | `http://localhost:3000/**` y `https://juntia-*-flashwp3-8258.vercel.app/**` | `https://juntia.vercel.app/**` |
| Lista permitida | Los dos fundadores | Los dos fundadores |
| «Exposed schemas» solo `public` | Comprobado en el PR A | T035 |
| Plantillas de correo | **No editables en Free sin SMTP propio.** Decisión del mismo día («Adaptar la app»): se usan las plantillas por defecto y `/auth/confirm` acepta su `code` (quickstart §3, paso 1, enmendado) | Igual |

### T038

**Hecha por el gestor el 5 de noviembre de 2026, con la confirmación de
Alejandro.** Variables de Vercel por nombre, sin valores:

| Entorno | Variables |
| --- | --- |
| Production | `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de `juntia-prod`; `SITE_URL` |
| Preview | `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de `juntia-dev`; sin `SITE_URL` (la app usa el origen de la petición) |

Ninguna clave secreta en Vercel.

### PR B · T039–T050 (tests primero e implementación)

Rama `feat/002-b-access`, PR #43. Salidas literales en
[`evidence/pr-b/`](evidence/pr-b/). Los tests se vieron fallar antes que el código
(`docs/TESTING.md` §6):

| Tarea | Rojo | Verde |
| --- | --- | --- |
| T039 `auth-errors` | [`t039-red.txt`](evidence/pr-b/t039-red.txt) (módulo inexistente) | [`t039-green.txt`](evidence/pr-b/t039-green.txt): 11 pruebas |
| T040 ThemeSelector, ProfileForm, LimitNote | [`t040-red.txt`](evidence/pr-b/t040-red.txt) | [`t040-green.txt`](evidence/pr-b/t040-green.txt): 22 pruebas de `src/features` |
| T041 dominio (`volver`, nombre visible) | [`t041-red.txt`](evidence/pr-b/t041-red.txt): con la expresión anterior `/^\/(?!\/)/`, `"/\\evil"` → `/\evil` | [`t041-green.txt`](evidence/pr-b/t041-green.txt): 5 pruebas |
| T042 integración (`auth.test.ts`) | — (solo CI) | job `db` de ab6a1b1: 22 pruebas de integración en verde, incluidas F37-7 (`/auth/v1/signup` con 7 caracteres → 422 `weak_password`, 0 usuarios) y Tomás sin tocar el perfil de Sara |
| T046 script de tema | [`t046-red.txt`](evidence/pr-b/t046-red.txt): 4 fallos de la cookie | [`t046-green.txt`](evidence/pr-b/t046-green.txt): 20 pruebas; `check:theme-script` pide `/entrar` y pasa (job `app`) |
| T050 spec E2E 1 | [`t050-red-unprotected-route.txt`](evidence/pr-b/t050-red-unprotected-route.txt): con `/actividad` fuera de `PRODUCT` en `src/lib/routes.ts`, «ruta protegida sin sesión» falla en la redirección | job `e2e` de ab6a1b1: 6 de 6 |

T043: el build marca todas las rutas de producto y de Mi cuenta como dinámicas
(ƒ) y `ƒ Proxy (Middleware)`:
[`t043-build-routes.txt`](evidence/pr-b/t043-build-routes.txt). La spec 1
comprueba `Cache-Control: private, no-store` en `/cuenta` con sesión.

**T045 · cada estado y qué lo cubre** (reparto decidido por el gestor el 5 de
noviembre de 2026: Alejandro hace dos comprobaciones a mano contra `juntia-dev`;
el resto queda cubierto por las pruebas automáticas y la evidencia sin correo).
Leyenda: **M** = a mano por Alejandro en `npm run dev` contra `juntia-dev`;
**D** = demostrado por el agente contra `juntia-dev` sin correo
([`t045-sin-correo-juntia-dev.txt`](evidence/pr-b/t045-sin-correo-juntia-dev.txt));
**A** = automático en el Supabase del runner (spec E2E 1 `tests/e2e/access-account.e2e.ts`,
axe `tests/a11y/routes.a11y.ts` con `route-registry.ts`, integración en el job `db`).

| Estado | Cubierto por |
| --- | --- |
| A2 crear cuenta, A3 verifica tu correo (correo permitido) | **M 1** ✅ · A: spec 1, «registro permitido» |
| Correo de verificación recibido (T036) | **M 1** ✅ |
| Enlace de verificación abierto en el mismo navegador → A1 con aviso de verificado | **M 1** ✅ (camino `code` de la plantilla por defecto) · A: spec 1 (camino `token_hash`) e integración `confirm-code.test.ts` (camino `code` contra GoTrue) |
| A1 entrar → A6 primera entrada → Inicio | **M 1** ✅ hasta A6 («Hola, Alejandro»; Inicio tras «Continuar» lo cubre la spec 1) · A: spec 1, «registro permitido» |
| A4 recuperar, A4b enlace enviado | **M 2** ✅ · A: spec 1, «recuperación uniforme» |
| Enlace de recuperación → A5 contraseña nueva → Inicio | **M 2** ✅ (camino `code`; con sesión tras guardar, en `/primera-entrada` porque A6 seguía sin completar) · A: spec 1 (`token_hash`) e integración `confirm-code.test.ts` (`code`) |
| Registro no permitido: la misma A3 y ninguna cuenta | A: spec 1, «registro no permitido o de una cuenta existente» (403 del hook y 422) |
| A1b contraseña incorrecta | **D** (respuesta real de `juntia-dev`) · A: axe, entrada A1b |
| A1c cuenta sin verificar | A: axe, entrada A1c (cuenta sembrada sin confirmar) |
| A1d error de red | A: axe del job `app` (Supabase inaccesible a propósito) |
| Aviso de verificado, S3 cerraste sesión | A: spec 1 y axe |
| Enlace usado o caducado → aviso sin datos de la cuenta | **D** (`error_code=otp_expired` y `token_hash` inválido) · A: spec 1 (enlace usado; recuperación fechada dos horas atrás) e integración (enlace repetido por la plantilla por defecto) |
| Enlace abierto en otro navegador | **D** (registro → A1 verificado; recuperación → aviso propio) · A: `confirm.test.ts` e integración `confirm-code.test.ts` |
| Ruta protegida sin sesión → Entrar → vuelve | **D** (`/actividad?mes=2026-10`) · A: spec 1 |
| Mi cuenta: C1, perfil P1–P5, pareja, privacidad D1/D2, seguridad G1 | A: spec 1 (perfil) y axe con sesión de todas las rutas; P2–P5 y la sesión caducada en pruebas de componentes y axe |
| Tema: apariencia oscuro y segundo dispositivo oscuro antes de `<body>` | A: spec 1 y arnés de T053 |
| Cerrar sesión → S3 y ninguna ruta de producto sin volver a entrar | A: spec 1 |

**Comprobación a mano (M), 5 de noviembre de 2026**, en `juntia-dev`, con `npm run
dev` en `http://localhost:3000` (commit e819450), en el Chrome de Windows de
Alejandro, por el gestor con su autorización; resultados reportados por el gestor:

1. **Registro:** `/crear-cuenta` con el correo de Alejandro (en la lista
   permitida) → `/verificar-correo`. Llegó el correo con la plantilla por
   defecto. El enlace, abierto desde Gmail en otra ventana del mismo Chrome, llevó
   a `/entrar` con «Tu correo está verificado. Ya puedes entrar.», sin sesión.
   Entrar con correo y contraseña llevó a `/primera-entrada` (A6, «Hola,
   Alejandro»).
2. **Recuperación:** `/recuperar` → mensaje neutro. Llegó el correo; el enlace
   llevó a A5; con la contraseña nueva quedó la sesión abierta, en
   `/primera-entrada`.

**¿El registro canjeó el `code` o cayó en el caso de otro navegador?** Las dos
salidas son la misma pantalla por diseño (la sesión del enlace de registro se
cierra a propósito: spec, caso límite «Verificación desde otro dispositivo»), así
que la pantalla no lo distingue. El log del servidor dev sí: `GET
/auth/confirm?code=…&next=signup → 303` con **1718 ms** de código de aplicación
(canje, `ensure_profile` y cierre de sesión: tres llamadas a `juntia-dev`), frente
a **14 ms** del caso sin verificador medido antes en el mismo servidor, que no
llama a la red. La recuperación: **528 ms** (canje y `ensure_profile`). Conclusión:
el `code` se canjeó en los dos; **no es un bug** y no hay nada que corregir.

**Enmienda del 5 de noviembre de 2026 · `/auth/confirm` con dos caminos.**
`src/features/auth/confirm.ts` resuelve `token_hash` (plantillas del repo, Supabase
local y runner) y `code` (plantilla por defecto de los proyectos alojados en Free).
Test de componentes `confirm.test.ts` visto en rojo
([`confirm-code-red.txt`](evidence/pr-b/confirm-code-red.txt)) y en verde en local;
`tests/integration/confirm-code.test.ts` recorre contra el GoTrue del runner la URL
de la plantilla por defecto (`/auth/v1/verify?token=…&redirect_to=…`): code canjeado
en el mismo navegador, otro navegador sin verificador y enlace repetido (Auth
devuelve el error en la consulta → aviso de enlace caducado). Salida: 2 de 2 en el
job `db` del run [42093325736](https://github.com/flashwp3-ctrl/juntia/actions/runs/42093325736)
([`t059-gate-e38af80.txt`](evidence/pr-b/t059-gate-e38af80.txt)).

T048 (sesión caducada): estado del registro de axe y capturas
`cuenta_perfil--sesion-caducada--*`: la sesión se borra con la página abierta,
«Guardar cambios» responde `copy.errors.sessionExpired` con «Entrar de nuevo» y
el nombre escrito sigue en el campo.

**Interpretación de ejecución (T051), para el revisor.** Las dos listas del
registro son las de la sesión que necesita cada ruta. A1b, A1c y A4b no necesitan
sesión pero sí la respuesta real de Auth, que el job `app` no tiene: se marcan
`needsAuthApi` y se auditan en el job `e2e`, sin cambiar la lista de su ruta. A1d
se audita en `app`, donde Supabase es inaccesible a propósito (el error de red
real). Si se prefiere otra lectura, cambia el registro, no el alcance.

### T051

**2026-11-05 · ab6a1b1 · run [42090711264](https://github.com/flashwp3-ctrl/juntia/actions/runs/42090711264).**
Prueba de cobertura: se vio fallar con `/cuenta/pareja` sin clasificar
([`t051-red-unclassified.txt`](evidence/pr-b/t051-red-unclassified.txt)) y pasa
([`t051-green.txt`](evidence/pr-b/t051-green.txt)). Axe sin violaciones serias ni
críticas en los dos temas y a 390 y 1440:

- job `app`: 44 de 44, cada línea «0 serias o críticas»
  ([`t051-a11y-app-ab6a1b1.txt`](evidence/pr-b/t051-a11y-app-ab6a1b1.txt));
- job `e2e`: 76 de 76 (72 auditorías con «0 serias o críticas» y las 4 de la barra
  de `/cuenta`) ([`t051-a11y-e2e-ab6a1b1.txt`](evidence/pr-b/t051-a11y-e2e-ab6a1b1.txt)).

Corregido durante el PR, con salida: `text.secondary` sobre `surface.sunken` en
claro daba 4,29:1 (LimitNote, perfil del sidebar, hoja de exportar); ahora usa
`--comp-field-muted-fg`, el par ya corregido en F16-1.

**Hallazgo que no se corrige aquí (tokens aprobados):** `action.primaryHover` en
oscuro con `text.onAction` mide 4,32:1, por debajo de 4,5:1, mientras el puntero
está sobre un botón primario
([`t051-a11y-app-local-hover-finding.txt`](evidence/pr-b/t051-a11y-app-local-hover-finding.txt)).
Axe audita el estado en reposo; el token queda para decisión de los fundadores.

### T052

Job `e2e` creado (Supabase del runner con Auth y Mailpit, build con sus
variables, `test:e2e:smoke` y axe con sesión). `app`, `db` y `e2e` en verde sobre
ab6a1b1, run [42090711264](https://github.com/flashwp3-ctrl/juntia/actions/runs/42090711264)
([`t059-gate-ab6a1b1.txt`](evidence/pr-b/t059-gate-ab6a1b1.txt)). Humo:
`test:e2e:smoke` 14,40 s (< 180 s). Job `e2e` 364,91 s, **por encima de 360 s
(aviso)**: incluye los ~40 s de la medición de T054, que solo corre en ese
lanzamiento manual; `supabase start` 108 s. No se mueve ningún techo.

### T053

`[V]` **2026-11-05 · ab6a1b1 · run [42089287324](https://github.com/flashwp3-ctrl/juntia/actions/runs/42089287324) (job `evidence`).**
Arnés de `evidence-plan/` sobre `/entrar`, `/crear-cuenta`, `/recuperar`,
`/cuenta`, `/cuenta/perfil`, `/cuenta/apariencia` y `/cuenta/seguridad`, con cinco
casos cada una (cookie contraria al sistema en los dos sentidos, `system`, valor
no válido y sin cookie), CPU 6× y red lenta: **35 de 35 con CLS = 0, el tema
esperado al aparecer `<body>` y ningún cuadro del tema contrario**
([`t053-tema-cls-runner.txt`](evidence/pr-b/t053-tema-cls-runner.txt)).

Lo que el arnés encontró antes y se corrigió en el PR: el titular de A1 (48 px)
medía 360 px reales y 371 px con el respaldo en una columna de 360 (CLS 0,0053 en
local); los botones de Mi perfil, la nota de «Esta sesión» y el perfil del
sidebar dependían de las métricas de la fuente (CLS 0,00013 y 0,00068 en el
runner); y el enlace «Crear cuenta», alineado a la derecha (0,000009). El job
instala Arial y Georgia, sobre las que se ajustan los respaldos de Onest y
Brygada (`globals.css`): sin ellas el runner mide otro respaldo que no es el de la
app. La escritura desde el perfil y los dos dispositivos los cubre la spec 1
(«un segundo dispositivo oscuro antes de `<body>`»).

### T054

`[V]` **2026-11-05 · ab6a1b1 · run [42090711264](https://github.com/flashwp3-ctrl/juntia/actions/runs/42090711264).**

| Workers | Duración | Salida | Resultado |
| --- | --- | --- | --- |
| 1 | 13 s | exit 0 | 6 passed (12,4 s) |
| 2 | 13 s | exit 0 | 6 passed (12,8 s) |
| 4 | 13 s | exit 0 | 6 passed (12,7 s) |

([`t054-workers.txt`](evidence/pr-b/t054-workers.txt)). Sin fallos con ninguno.
**Lectura honesta:** con una sola spec en un solo archivo y sin `fullyParallel`,
Playwright da el archivo entero a un worker, así que 2 y 4 no reparten trabajo y
la duración no cambia. El aislamiento entre workers se prueba aparte en
`tests/integration/seed.test.ts` (job `db`, verde): dos workers siembran usuarios
y `storageState` distintos y el dataset dorado de uno no aparece en el otro. La
medición con reparto real llega con la spec 2 (PR D). Ningún techo se mueve.

### T055

**Humana (gestor), pendiente:** 001-T072 parte 1 tras el primer despliegue de
producción con Supabase.

### T056

**Humana (dueña y gestor), pendiente:** commit propio de la dueña en
`feat/002-b-access` para el primer preview y 001-T072 parte 2 antes de usarlo.

### T057

**2026-11-05 · ab6a1b1 · run [42089287324](https://github.com/flashwp3-ctrl/juntia/actions/runs/42089287324).**
92 capturas a 390 y 1440 en claro y oscuro, con cuentas sembradas en el runner
(ningún dato real), en [`evidence/pr-b/capturas/`](evidence/pr-b/capturas/),
nombradas `ruta--estado--ancho--tema.png`: acceso (A1, A1b, A1c, aviso de
verificado, S3, A2, A2 con validación, A3, A4, A4b, aviso de enlace caducado, A5,
A6), Inicio con AccountButton, Mi cuenta (C1, P1, Mi pareja, T1, D1, D2, G1) y la
sesión caducada. A1d (error de red) solo existe sin Supabase y se capturó en
local. **Pasada de los siete anchos** (360, 390, 430, 768, 1024, 1280 y 1440) en
los dos temas: 308 de 308 filas sin scroll horizontal y sin elementos fuera de la
ventana ([`t057-pasada-siete-anchos.txt`](evidence/pr-b/t057-pasada-siete-anchos.txt)).
Los solapamientos se revisan sobre las capturas.

**Para aprobar viendo la pantalla:** «Cuenta reutiliza los fondos de categoría»
(fichas de C1 y de la columna de secciones); la sesión caducada (pantalla nueva);
y la composición de escritorio de las pantallas de acceso (04·17 solo dibuja
390): la misma columna de 440 sobre una tarjeta elevada, con la marca arriba a la
izquierda.

### T058

**2026-11-05.** Pasada fija de Impeccable, auditoría y crítica, a 390 y 1440:
el detector de código no encontró nada en `src/features/auth`,
`src/features/account`, `src/app/(auth)`, `src/app/(app)/cuenta` ni
`inline-notice.tsx`; el detector sobre la página servida
([`t058-impeccable-detect.txt`](evidence/pr-b/t058-impeccable-detect.txt)) marca
`icon-tile-stack` en A2, A3 y A4: es el botón «Volver» de 44 y la ficha de 64 de
A3 que dibuja el comp aprobado 04·17. **No se aplica**: cambiarlo reabriría la
dirección aprobada (`CLAUDE.md` 7). Los hallazgos de contraste y de CLS se
corrigieron (T051, T053). Revisión visual de las capturas: coinciden con
04·14–04·19 salvo lo que se lista como propuesta o desviación en la descripción
del PR.

### Revisión del PR #43 (ChatGPT): F43-1 a F43-4 y el menor

**F43-2 (bloqueante), el gate de 81b60e9 en rojo**, run
[42112383415](https://github.com/flashwp3-ctrl/juntia/actions/runs/42112383415):
la aserción de foco fallaba en A1d (`app`) y A1b (`e2e`) con «email: input none,
marco none» ([`f43-2-focus-red.txt`](evidence/pr-b/f43-2-focus-red.txt)). **Era
el arnés, no el componente:** tras enviar el formulario el foco quedaba en el
botón «Entrar», `document.body.focus()` no lo movía (el body no es enfocable) y
el Tab salía del botón al enlace siguiente, así que el campo de correo nunca
recibía el foco. El arnés ahora enfoca el campo, sale con Shift+Tab y vuelve con
Tab, y exige `document.activeElement === campo` antes de medir. Verde en local
contra `juntia-dev` en los 8 casos de A1b y en A1, A2, A4 y la superficie interna
([`f43-2-focus-green.txt`](evidence/pr-b/f43-2-focus-green.txt)). A1d solo existe
en el job `app` (sin Supabase) y lo cubre el gate de este push.

**F43-3, `next` decidía el flujo de un `code`.** Con una sesión ya establecida,
`resolveConfirm` decide ahora por el claim `amr` de esa sesión, leído con
`getClaims()`: `recovery` conserva la sesión y va a A5; cualquier otro método, o
un `amr` ilegible, se trata como verificación (se cierra la sesión, nunca A5).
`next` solo orienta los avisos cuando no hay sesión (otro navegador, fragmento del
reenvío). Pruebas: `confirm.test.ts` (unidad, rojo y verde) e integración contra el
GoTrue del runner en `confirm-code.test.ts`: un `code` de registro con
`next=recovery` y uno de recuperación con `next=signup` siguen su flujo real, y el
log del job `db` registra el `amr` observado de cada sesión.

**F43-4, A5 aceptaba sesiones normales.** La página `/nueva-contrasena` y la Server
Action `setNewPassword` exigen en el servidor `isRecentRecovery(claims)`:
método `recovery` en `amr`, de hace una hora como mucho (la vida del enlace,
`otp_expiry = 3600`). Sin sesión → A4 con el aviso de enlace caducado; con una
sesión normal → Seguridad y sesión (G1). Pruebas: `recovery-session.test.ts`
(unidad, rojo y verde); integración: una sesión iniciada con contraseña da `false`
y la de recuperación `true`, con los claims reales del runner; spec E2E 1, «ruta
protegida»: con sesión normal, `/nueva-contrasena` lleva a `/cuenta/seguridad`; el
positivo (enlace de recuperación → A5 → contraseña nueva) sigue en la spec 1.
`secure_password_change` no se tocó.

**F43-1, un fallo al guardar el tema se mostraba como éxito.** ThemeSelector
recuerda el último tema confirmado por el perfil; ante cualquier error que no sea
`sessionExpired` vuelve a él (`data-theme`, cookie y selección) y muestra
`copy.errors.saveFailed`, la clave de `contracts/errors.md` para un guardado
fallido. Con `sessionExpired` conserva la elección del dispositivo y pide volver a
entrar (T048). Prueba de componentes con `persist()` → `{ ok: false, error:
"failed" }` (rojo y verde).

**F43-1, segunda ronda (concurrencia).** Si una escritura correcta respondía cuando
ya había otra elección en vuelo, se ignoraba y el confirmado no avanzaba; un fallo
posterior revertía al tema inicial y dejaba el perfil en otro tema. Ahora las
escrituras se serializan con una cola de «última elección pendiente»: como mucho una
en vuelo, la elección más reciente espera su turno (las intermedias se descartan), y
cada escritura correcta actualiza el confirmado aunque ya no sea la última. Las
opciones no se deshabilitan, así que las flechas del radiogroup siguen funcionando.
Pruebas con promesas controladas: dos guardados seguidos (el segundo espera al
primero; una respuesta «adelantada» del segundo no cambia nada), uno correcto y
otro fallido (revierte a dark, el tema realmente guardado) y varias elecciones
mientras guarda (solo se envía la última). En las tres, el perfil, la cookie,
`data-theme` y la selección coinciden al final. Rojo con la implementación anterior
([`f43-1-queue-red.txt`](evidence/pr-b/f43-1-queue-red.txt)) y verde
([`f43-1-queue-green.txt`](evidence/pr-b/f43-1-queue-green.txt)).

**Menor, el fragmento en una variable de módulo.** Entrar guarda solo el aviso ya
interpretado (verificado, caducado o ninguno); la cadena del fragmento, que puede
llevar tokens, no se conserva y se borra de la URL.

**Segundo push (gate de 9eca9e6 en rojo, run
[42116416520](https://github.com/flashwp3-ctrl/juntia/actions/runs/42116416520)).**
`app` y `db` en verde; `e2e` rojo en A5 por el camino `token_hash` (spec 1 y axe):
la recuperación caía en «verificado»
([`f43-3-token-hash-red.txt`](evidence/pr-b/f43-3-token-hash-red.txt)). El job
`db` registró el `amr` real: `recovery` (code de recuperación), `email/signup`
(code de registro), `password` (sesión con contraseña). `verifyOtp` (token_hash),
en cambio, firma la sesión con `otp` para cualquier tipo, así que ahí el `amr` no
distingue. Corrección: por `token_hash` cuenta el `type`, que GoTrue verifica con
el token (un `type` cambiado no verifica y sale caducado: lo prueba la integración);
la guarda de A5 acepta `recovery` u `otp` recientes, porque `otp` solo nace de un
enlace de correo y `/auth/confirm` cierra en el acto las sesiones de registro;
`password`, `email/signup` y `token_refresh` solos se rechazan. Rojo y verde de
unidad: [`f43-3-token-hash-unit-red.txt`](evidence/pr-b/f43-3-token-hash-unit-red.txt),
[`f43-3-token-hash-unit-green.txt`](evidence/pr-b/f43-3-token-hash-unit-green.txt);
integración nueva del camino `token_hash` en `confirm-code.test.ts`.

Rojo de F43-1, F43-3 y F43-4 en las pruebas de unidad y de componentes:
[`f43-red.txt`](evidence/pr-b/f43-red.txt); verde: [`f43-green.txt`](evidence/pr-b/f43-green.txt)
(37 pruebas en `src/features`). `npm run verify` en local pasó (32,6 s). El gate
de CI de este push (PR listo) es el definitivo: SHA y run en T059.

### T059

**Gate final: el run de CI del push que cierra la revisión del PR #43** (cabeza de
`feat/002-b-access`, PR listo): su SHA y su run quedan en la descripción del PR,
porque registrarlos aquí exigiría otro commit y otro gate. Los runs anteriores:
81b60e9 en rojo por el arnés de foco (run
[42112383415](https://github.com/flashwp3-ctrl/juntia/actions/runs/42112383415),
F43-2 arriba) y 9eca9e6 en rojo por A5 en el camino `token_hash` (run
[42116416520](https://github.com/flashwp3-ctrl/juntia/actions/runs/42116416520), arriba).

**Gate sobre e38af80** (con la enmienda de
`/auth/confirm`): `npm run verify` en local pasó (22,8 s, < 90 s) y el run
[42093325736](https://github.com/flashwp3-ctrl/juntia/actions/runs/42093325736)
tiene `app` 152 s (axe 44/44), `db` 254 s (24 pruebas de integración, incluidas
las dos del camino `code`) y `e2e` 353 s (spec 1 6/6 en 13,3 s; axe 76/76) en verde
([`t059-gate-e38af80.txt`](evidence/pr-b/t059-gate-e38af80.txt)). Presupuestos:
`test:db` 5,74 s (< 60), humo 13,34 s (< 180), los tres jobs por debajo de 360 s.
El gate anterior, sobre ab6a1b1 (run
[42090711264](https://github.com/flashwp3-ctrl/juntia/actions/runs/42090711264)),
queda en [`t059-gate-ab6a1b1.txt`](evidence/pr-b/t059-gate-ab6a1b1.txt); las
capturas y T053 son de ese commit, y la enmienda solo cambia el aviso de Entrar
con `?aviso=enlace`. Los commits posteriores solo añaden evidencia.

### T060

**Aprobado por Alejandro el 5 de noviembre de 2026; pendiente la segunda fundadora**
(SC-001 pide los dos). Vio las 15 pantallas principales a 390 px en claro y, a 1440 px,
las tres marcadas para aprobar viendo la pantalla, que quedan aprobadas por él: la
composición de escritorio de las pantallas de acceso, el estado de sesión caducada y
«Cuenta reutiliza los fondos de categoría» (propuesta §15.9). La casilla de T060 se
marca cuando apruebe la segunda fundadora.

### T071

Fecha, commit, comando/procedimiento y salida: **pendiente: PR C**.

### T072

Fecha, commit, comando/procedimiento y salida: **pendiente: PR C**.

### T073

Fecha, commit, comando/procedimiento y salida: **pendiente: PR C**.

### T074

Fecha, commit, comando/procedimiento y salida: **pendiente: PR C**.

### T075

Fecha, commit, comando/procedimiento y salida: **pendiente: PR C**.

### T076

Fecha, commit, comando/procedimiento y salida: **pendiente: PR C**.

### T079

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T084

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T085

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T086

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T087

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T088

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T089

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T090

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T091

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T092

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T093

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T094

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T095

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T096

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T097

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T098

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T099

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T100

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T101

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T102

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T103

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T104

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.

### T105

Fecha, commit, comando/procedimiento y salida: **pendiente: PR D**.
