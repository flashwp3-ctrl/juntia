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
