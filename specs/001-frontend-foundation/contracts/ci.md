# Contrato de `verify` y del CI — 001

Aplica ADR-011 §4–§6 y `docs/TESTING.md` §2–§3 con el arranque progresivo: la
001 crea los jobs 1, 2 y 5; los jobs 3 y 4 los incorpora P0-1.

## Scripts de `package.json`

| Script | Qué ejecuta |
| --- | --- |
| `lint` | `eslint .` (incluye CSS con `@eslint/css`). Sin banderas: los fixtures se excluyen en la configuración |
| `typecheck` | `tsc --noEmit` |
| `test:unit` | `vitest run --project domain --passWithNoTests` |
| `test:components` | `vitest run --project components`. Incluye `tests/lint-rules.test.ts`, que lintea los fixtures a propósito |
| `test:a11y` | `playwright test --project a11y`. El `webServer` de `playwright.config.ts` ejecuta `npm run start` con `env: { JUNTIA_INTERNAL_SURFACE: "1" }` sobre el build ya hecho, que funciona igual en Windows y en Linux |
| `check:internal-surface` | `node scripts/check-internal-surface.mjs` (FR-053): sobre el build ya hecho, arranca `next start` con el entorno de producción y con el de un preview, y pide `/interno/primitivos` con distintos `Host` |
| `verify` | `node scripts/verify.mjs` |
| `build`, `start`, `dev` | Next |

`test:db` y `test:e2e*` **no se crean** en la 001: no se adelanta
infraestructura (`docs/TESTING.md` §3, regla 2).

## Salida de `verify`

Ejecuta en orden lint, typecheck, `test:unit` y `test:components`; se detiene en
el primer fallo. Al final imprime una tabla así (forma, no valores):

```
verify · 001
control             resultado                                      duración   presupuesto
lint                pasó                                           12,4 s     —
typecheck           pasó                                            6,1 s     —
unit (domain)       0 pruebas — la 001 no tiene dominio financiero   0,9 s     < 15 s
components          pasó (N pruebas)                                9,8 s     — (dentro de verify)
SQL/RLS             NO APLICABLE — lo incorpora P0-1                 —         < 60 s
verify (total)                                                     29,2 s     < 90 s
```

Si un tiempo supera su presupuesto, la fila dice «SUPERA EL PRESUPUESTO (aviso)»
y el proceso **no** cambia su código de salida por eso (ADR-011 §4, «Cuándo
empiezan a bloquear»). La cláusula anticliquet aplica: el presupuesto no se edita
por una medición.

## Workflow `.github/workflows/ci.yml`

- Disparo: `pull_request` (cada push a un PR). Permisos mínimos (`contents: read`).
- Acciones: `actions/checkout@v7`, `actions/setup-node@v7` con `node-version: 24`
  y `cache: npm`.
- Tres jobs **en paralelo**, cada uno con `npm ci`:

| Job | Pasos | Presupuesto de job |
| --- | --- | --- |
| 1 · `lint-typecheck-build` | `npm run lint`, `npm run typecheck`, `npm run build` | Gate de PR < 6 min |
| 2 · `vitest` | `npm run test:unit`, `npm run test:components` | Gate de PR < 6 min |
| 5 · `a11y` | `npm run build` (una sola vez, sin variables: la ruta interna lee el entorno al servir); `npx playwright install --with-deps chromium`; `npm run test:a11y`; `npm run check:internal-surface` | Gate de PR < 6 min |

`check:internal-surface` falla el job si alguna respuesta no es la esperada:

| `next start` con | `Host` de la petición | Esperado |
| --- | --- | --- |
| `VERCEL=1 VERCEL_ENV=production` + URLs de prueba | dominio de producción de prueba | 404 |
| `VERCEL=1 VERCEL_ENV=production` + URLs de prueba | URL de despliegue de prueba | 404 |
| `VERCEL=1 VERCEL_ENV=preview` + URLs de prueba | URL de despliegue de prueba | 200 |
| `VERCEL=1 VERCEL_ENV=preview` + URLs de prueba | URL de rama de prueba | 200 |
| `VERCEL=1 VERCEL_ENV=preview` + URLs de prueba | dominio de producción de prueba (alias) | 404 |
| ninguna variable | `localhost` | 404 |

Las «URLs de prueba» son valores ficticios de `VERCEL_URL`, `VERCEL_BRANCH_URL` y
`VERCEL_PROJECT_PRODUCTION_URL` fijados en el script; nunca los dominios reales.
El caso `JUNTIA_INTERNAL_SURFACE=1` → 200 ya lo cubre `test:a11y` (FR-052).

- Cada job guarda la hora de inicio en su primer paso y, en un último paso con
  `if: always()`, escribe en `$GITHUB_STEP_SUMMARY` su duración y la de cada
  comando contra el presupuesto; si lo supera, emite `::warning::` y termina con
  éxito.
- El resumen del job 1 incluye siempre:

```
| Job | Estado |
| --- | --- |
| 3 · Supabase local, migraciones y SQL/RLS | NO APLICABLE — lo incorpora P0-1 |
| 4 · E2E de humo | NO APLICABLE — la primera spec E2E nace en P0-1 |
```

- **Sin caché de navegadores** (ADR-011 §4, «Mitigación en el humo»).
- Playwright: `retries: process.env.CI ? 1 : 0`, `reducedMotion: 'reduce'`, solo
  Chromium, ninguna espera fija.

## Reglas de lint propias

En `eslint.config.mjs`, sobre `eslint-config-next/core-web-vitals` y
`eslint-config-next/typescript` (research R3):

| Regla | Archivos | Qué prohíbe |
| --- | --- | --- |
| Hex crudo | `**/*.{js,jsx,mjs,cjs,ts,tsx}`; `**/*.css` salvo `src/styles/tokens.css` | Literales, plantillas, valores CSS y valores de `--propiedades` con `#rgb`, `#rgba`, `#rrggbb` o `#rrggbbaa` |
| Espera fija | `tests/**/*.ts` | `*.waitForTimeout(...)` y `setTimeout(...)` |
| Dependencia de `domain` | `src/domain/**` | Importar `react`, `react-dom`, `next`, `motion`, `@phosphor-icons/*`, `@radix-ui/*`, `@supabase/*` o `@/components/*` |

`tests/lint-fixtures/**` está en `globalIgnores`: `eslint .` nunca los ve, y una
bandera olvidada no puede romper el job 1. `tests/lint-rules.test.ts` los lintea
con `new ESLint({ ignore: false })` en entorno `node` y afirma las líneas exactas
que cada regla debe marcar (research R3).
