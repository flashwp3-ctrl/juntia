# Evidencia de implementación — 002

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
