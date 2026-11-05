# Contrato de `verify` y del CI — 002

Aplica ADR-011 §4, §5 (con sus enmiendas) y §9, y `docs/TESTING.md` §2–§3. Parte
del contrato de la 001 (`specs/001-frontend-foundation/contracts/ci.md`) y dice
solo lo que cambia. **Nada de esto está implementado**; entra por PR según la
tabla del final.

## Scripts nuevos de `package.json`

| Script | Qué ejecuta | Dónde corre |
| --- | --- | --- |
| `test:db` | `supabase test db` (pgTAP en `supabase/tests/`) | Solo job `db` |
| `test:integration` | `vitest run --project integration` (supabase-js contra el Supabase local del runner; sin navegador) | Solo job `db` |
| `db:types:check` | `supabase gen types typescript --local --schema public` comparado con `src/lib/supabase/database.types.ts` | Solo job `db` |
| `db:restore-drill` | `bash scripts/restore-drill.sh`, con `set -euo pipefail` y un `trap` que limpia y conserva el código de salida. **Modo CI** (`backup-manifest.sh --mode ci --sha "$GITHUB_SHA"`): el esquema es el del **commit que se verifica**, sin etiqueta. Siembra datos de prueba, hace la copia (`data.sql` + manifiesto, research R6), la cifra y la restaura **desde una base vacía** por los dos caminos: A, Supabase local con `supabase db reset` a las migraciones de ese SHA, sin semilla, y los datos; B, PostgreSQL 17 normal de PGDG con `plain-postgres-bootstrap.sql`, cada migración de ese SHA con `ON_ERROR_STOP` y los datos. `--verify` del manifiesto obligatorio en los dos; columnas de `auth` del arranque comparadas con el stack. **Controles negativos**: migración rota, recuento alterado en el manifiesto, otro SHA en el manifiesto y `data.sql` modificado; cada uno debe terminar con código distinto de 0 y sin la marca de éxito, o el job falla. Además: tras una restauración fallida **no queda ninguna base `juntia_restore*`** (consulta a `pg_database`) y existe su log con `exit=` distinto de 0; tras una copia fallida **no queda ningún archivo de salida** (`juntia-*.tar.gpg`, `juntia-*.manifest.txt`) ni carpeta `.juntia-backup.*`; una copia contra un nombre existente falla y deja ese archivo con el mismo `sha256`; un `dropdb` inyectado que falla (`DROPDB=false`) hace salir la restauración con código distinto de 0, el log registra `exit=1` y «DROP FALLÓ» y no aparece «RESTAURACIÓN LISTA», que es el único marcador de éxito y solo se emite tras la limpieza completa; una comprobación de descifrado que no coincide impide publicar | Solo job `db` |
| `test:e2e:smoke` | `playwright test --project e2e` (specs E2E que existan) | Solo job `e2e` |

La CLI es la del workflow (`supabase/setup-cli@v3`, `version: 2.121.0`), no una
dependencia de npm (research R8.12).

## Salida de `verify` (ADR-011 §9.1)

`scripts/verify.mjs` sigue ejecutando lint, typecheck, `test:unit` y
`test:components`, y cambia sus filas de base de datos. Forma, no valores:

```
verify · 002
control                 resultado                                                  duración   presupuesto
lint                    pasó                                                       12,4 s     —
typecheck               pasó                                                        6,1 s     —
unit (domain)           pasó (N pruebas)                                            1,9 s     < 15 s
components              pasó (N pruebas)                                            9,8 s     — (dentro de verify)
SQL/RLS (pgTAP)         SOLO EN CI — pendiente de resultado · job db                —         < 60 s (en el job)
integración servidor    SOLO EN CI — pendiente de resultado · job db                —         —
E2E de humo             NO APLICABLE — la spec E2E 1 nace en el PR B de la 002      —         < 3 min (job)
verify (total)                                                                    30,2 s     < 90 s
```

Desde el PR B, la fila de E2E dice «SOLO EN CI — pendiente de resultado · job
e2e». **Nunca** dice «pasó» ni se omite (TESTING §3, regla 1). El código de
salida de `verify` no depende de esas filas.

## Workflow `.github/workflows/ci.yml`

Disparadores, permisos, `concurrency`, filtro de rutas documentales y
`timeout-minutes: 10` **no cambian** (ADR-011 §5). Los jobs nuevos corren en
**todo PR de código**, sin filtro de rutas propio (ADR-011 §9.2).

| Job | Control | Entra | Pasos | Presupuesto |
| --- | --- | --- | --- | --- |
| `app` | 1, 2 y 5 parcial | Existe | Como en la 001. Desde el PR B, `check:theme-script` pide `/entrar` (las rutas de producto redirigen sin sesión) y axe corre aquí **solo para los estados que no necesitan sesión** (tabla «Axe» de abajo) | Gate < 6 min |
| `db` | 3 | **PR A** | `supabase/setup-cli@v3`; `supabase start` con los servicios mínimos (`-x studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,supavisor`); `npm ci`; `test:db` (comando medido, < 60 s); `test:integration`; `db:types:check` (desde el primer commit del PR A, con una prueba pgTAP de humo y una de integración mínima, sin `passWithNoTests`); `db:restore-drill` (cliente y servidor PostgreSQL 17 de PGDG); `supabase stop` | Gate < 6 min |
| `e2e` | 4 y 5 (estados que necesitan sesión) | **PR B** | `supabase start` con Auth y Mailpit; `npm ci`; build con las variables del Supabase local; `npx playwright install --with-deps --only-shell chromium`; `test:e2e:smoke`; `test:a11y` con `storageState` sembrado | Humo < 3 min · Gate < 6 min |

Notas:

- **Claves locales:** `supabase status -o env` → `::add-mask::` de cada clave →
  `$GITHUB_ENV`. Nunca se imprimen (el preflight ya lo hace así).
- **Sin secretos de GitHub:** los jobs usan solo el Supabase del runner. Ningún
  job conoce claves de `juntia-dev` ni de producción.
- **Sin datos reales:** el ensayo de restauración usa datos sembrados en el
  runner (ADR-011 §9.6).
- **Coste del ensayo:** se queda en el job `db` de cada PR de código mientras el
  PR A lo tiene que demostrar. Después del PR A, moverlo a un workflow propio (en
  los merges a `main` y antes del primer dato real) **exige una decisión
  explícita en ADR-011**; no se decide aquí, y mientras no exista sigue en `db`.
- **Resumen** (`scripts/ci.mjs summary`): cada job publica sus tiempos contra el
  presupuesto. La tabla del job `app` cambia «3 · … NO APLICABLE — lo incorpora
  P0-1» por «3 · Supabase local, migraciones y SQL/RLS · job `db`» y, desde el PR
  B, lo mismo con el 4. Superar un presupuesto da `::warning::` y no falla
  (ADR-011 §4, hasta el cierre de P0-2).
- **`supabase start` tardó 96–118 s** en el preflight (research R8.13). Se mide y
  se reporta en cada run; no se mueve ningún techo.
- **Lanzamiento manual:** `gh workflow run ci.yml --ref <rama>` corre los
  mismos jobs (ADR-011 §9.3). Es la forma de probar la base de datos antes de
  abrir el PR.

## Axe: clasificación por la sesión que necesita el estado real

ADR-011 §5, enmienda «Axe en dos jobs», precisada en la segunda revisión del PR
#37. Lo que decide el job **no es el grupo de rutas** (`(auth)` o `(app)`), sino si
el estado real que se audita necesita una sesión. Un registro único,
`tests/a11y/route-registry.ts`, lista cada ruta y estado con `session: 'none' |
'user' | 'recovery'`.

| Estado | Ruta | Sesión real | Job de axe |
| --- | --- | --- | --- |
| A1, A1b, A1c, A1d, aviso de verificado, S3 | `/entrar` | Ninguna | `app` |
| A2 | `/crear-cuenta` | Ninguna | `app` |
| A3 | `/verificar-correo` | Ninguna | `app` |
| A4, A4b, aviso de enlace caducado | `/recuperar` | Ninguna | `app` |
| A5 | `/nueva-contrasena` | **De recuperación** (la crea `/auth/confirm` con `type=recovery`) | `e2e` |
| A6 | `/primera-entrada` | **De usuario** | `e2e` |
| Inicio, Actividad, detalle, Mi cuenta y sus subrutas, Metas, Plan, Balance | `(app)` | De usuario | `e2e` |
| Sesión caducada (Anotar) | dentro de `(app)` | De usuario, que caduca | `e2e` |
| No encontrado, superficie interna | — | Ninguna | `app` |

Si un estado sin sesión cambia al tener sesión (por ejemplo, `/entrar` con
sesión lleva a Inicio), se audita el estado **sin** sesión, que es el que se ve.
A5 sin sesión de recuperación no es A5: termina en el aviso de enlace caducado
de `/recuperar`, que ya está en la lista de `app`.

**Prueba de cobertura** (PR B, donde el reparto empieza a aplicar; Vitest
`components` en entorno `node`): recorre los `page.tsx` de `src/app` y afirma que
**cada ruta implementada está en exactamente una de las dos listas**, que **las dos
listas juntas cubren todas las rutas**, que cada entrada se audita en **los dos
temas** y que ninguna entrada con `session: 'user'` o `'recovery'` cae en `app`.
Una ruta nueva sin clasificar hace fallar `verify`.

## Playwright

| Proyecto | `testDir` | Usa sesión | Desde |
| --- | --- | --- | --- |
| `a11y` | `tests/a11y` | Según el registro de rutas de la sección «Axe»: sin sesión en `app`; con sesión de usuario o de recuperación sembrada en `e2e` | 001; con sesión desde el PR B |
| `e2e` | `tests/e2e` | Fixture de scope `worker` que siembra Sara (y Tomás donde haga falta) y sobrescribe `storageState` por `parallelIndex` y rol | PR B |

`reducedMotion: 'reduce'` por defecto, `retries` 0/1, solo Chromium, cero
`waitForTimeout` (las reglas de lint de la 001 ya cubren `tests/**`). Un test con
motion activo para los momentos L2 de E5 (PR D). `playwright/.auth` en
`.gitignore`. El número de workers se mide en el PR B y se reporta (ADR-011 [V] 3).

## Lint nuevo

| Regla | Archivos | Qué prohíbe |
| --- | --- | --- |
| Sin clave de servicio en la app | `src/**` | Los identificadores `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y la cadena `service_role` (FR-011). `tests/support/**` sí puede usarlos |
| Capa de datos | `src/**` salvo `src/lib/db/**` y `src/lib/supabase/**` | Llamar a `.rpc(` o `.from(` (FR-010: solo `src/lib/db/` conoce vistas y funciones) |

La regla de dependencia de `domain` de la 001 ya prohíbe `@supabase/*` y
`@/lib/*` de interfaz; se amplía a `@/lib/db/*` y `@/lib/supabase/*`.

## Qué entra en cada PR

| PR | Jobs | Specs E2E | `verify` |
| --- | --- | --- | --- |
| A | `app` + **`db`** | 0 | Filas de base de datos «SOLO EN CI»; E2E «NO APLICABLE» |
| B | + **`e2e`** | **1** nace | E2E «SOLO EN CI» |
| C | igual | 1 suma la descarga de Exportar; corre la 1 | igual |
| D | igual | **2** nace; corren 1 y 2 | igual |

Orden C/D de la decisión 16.18 (4 nov 2026).
