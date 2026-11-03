# Contrato de `verify` y del CI — 001

Aplica ADR-011 §4–§6 y `docs/TESTING.md` §2–§3 con el arranque progresivo: la
001 crea los jobs 1, 2 y 5; los jobs 3 y 4 los incorpora P0-1.

## Scripts de `package.json`

| Script | Qué ejecuta |
| --- | --- |
| `lint` | `eslint .` (incluye CSS con `@eslint/css`) |
| `typecheck` | `tsc --noEmit` |
| `test:unit` | `vitest run --project domain --passWithNoTests` |
| `test:components` | `vitest run --project components` |
| `test:a11y` | `playwright test --project a11y`. El `webServer` de `playwright.config.ts` ejecuta `npm run build && npm run start` con `env: { JUNTIA_INTERNAL_SURFACE: "1" }`, que funciona igual en Windows y en Linux |
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
| 5 · `a11y` | `npx playwright install --with-deps chromium`; `npm run test:a11y`, que compila con `JUNTIA_INTERNAL_SURFACE=1` y prueba contra `next start` | Gate de PR < 6 min |

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
