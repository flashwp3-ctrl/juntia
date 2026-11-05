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
| `db:restore-drill` | `bash scripts/restore-drill.sh` (copia, cifrado y las dos restauraciones con datos de prueba) | Solo job `db` |
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
| `app` | 1, 2 y 5 parcial | Existe | Como en la 001. Desde el PR B, `check:theme-script` pide `/entrar` (las rutas de producto redirigen sin sesión) y axe de rutas autenticadas se va al job `e2e` | Gate < 6 min |
| `db` | 3 | **PR A** | `supabase/setup-cli@v3`; `supabase start` con los servicios mínimos (`-x studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,supavisor`); `npm ci`; `test:db` (comando medido, < 60 s); `test:integration`; `db:types:check`; `db:restore-drill` (cliente y servidor PostgreSQL 17 de PGDG); `supabase stop` | Gate < 6 min |
| `e2e` | 4 y 5 (rutas con sesión) | **PR B** | `supabase start` con Auth y Mailpit; `npm ci`; build con las variables del Supabase local; `npx playwright install --with-deps --only-shell chromium`; `test:e2e:smoke`; `test:a11y` con `storageState` sembrado | Humo < 3 min · Gate < 6 min |

Notas:

- **Claves locales:** `supabase status -o env` → `::add-mask::` de cada clave →
  `$GITHUB_ENV`. Nunca se imprimen (el preflight ya lo hace así).
- **Sin secretos de GitHub:** los jobs usan solo el Supabase del runner. Ningún
  job conoce claves de `juntia-dev` ni de producción.
- **Sin datos reales:** el ensayo de restauración usa datos sembrados en el
  runner (ADR-011 §9.6).
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

## Playwright

| Proyecto | `testDir` | Usa sesión | Desde |
| --- | --- | --- | --- |
| `a11y` | `tests/a11y` | Rutas de acceso e interna sin sesión; producto y Mi cuenta con `storageState` sembrado | 001; con sesión desde el PR B |
| `e2e` | `tests/e2e` | Fixture de scope `worker` que siembra Sara (y Tomás donde haga falta) y sobrescribe `storageState` por `parallelIndex` y rol | PR B |

`reducedMotion: 'reduce'` por defecto, `retries` 0/1, solo Chromium, cero
`waitForTimeout` (las reglas de lint de la 001 ya cubren `tests/**`). Un test con
motion activo para los momentos L2 de E5 (PR C). `playwright/.auth` en
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
| C | igual | **2** nace; corren 1 y 2 | igual |
| D | igual | 1 suma la descarga de Exportar; corren 1 y 2 | igual |
