# Contrato de `verify` y del CI — 004

Aplica ADR-011 §3, §4 y §9 (decisiones 17, 18, 19.5 y 21) y `docs/TESTING.md`. Parte
de `specs/003-pareja-y-balances/contracts/ci.md` y dice solo lo que cambia. **Nada de
esto está implementado.** `docs/TESTING.md` no cambia. Las únicas excepciones previstas
en `.github/`, `playwright.config.ts` y `scripts/` son las de abajo: la variable de
workers del PR A, para medir (mitigación a); y, en el PR B, la combinación de workers
fijada en el job `e2e` si la medición la da por segura, las dos pasadas de `@serial`
(F64-6) y el selector de specs por área con su prueba (F64-5). Todas van en PR de
código que ya corren CI y se revisan como cualquier cambio de pruebas.

## Jobs

Los jobs `app`, `db` y `e2e` no cambian de forma, disparadores ni `timeout`. Crece su
contenido:

| Job | Qué añade P0-3 | Presupuesto |
| --- | --- | --- |
| `app` | Componentes (BudgetIndicator, Plan, Análisis, PlanningNote, GoalCard, GoalStack, Registrar aporte, Retirar, FundingLedger, ConfirmationBadge, B1–B7) en `components`; dominio (`budgets`, `goals`, `metrics`, `analysis`, `golden`) en `domain`; axe sin sesión de lo que no la necesite | Gate < 6 min; `verify` < 90 s; dominio < 15 s |
| `db` | pgTAP `12_budgets.test.sql`, `13_goals.test.sql` (ledger, solo inserción, saldo por aportante, solicitudes, funciones redefinidas, `transaction_goal_funded`) y la ampliación de `01_privileges`, `03_views` y `05_direct_writes`. Integración: carreras de FR-112 con `raceUnderLock`, idempotencia de cada escritura, lectura consistente, exportación. `db:types:check` con las vistas y funciones nuevas | `test:db` < 60 s (comando) · gate < 6 min |
| `e2e` | **Spec E2E 5** (nace en el PR B, crece en el E) y **spec E2E 4** (nace en el PR C, crece en el D con dos contextos). axe con sesión, nivel ligero, de cada pantalla y estado nuevo | **< 480 s, bloqueante** (decisiones 19.5 y 21.4) |

## El presupuesto del job `e2e` con las specs 4 y 5

Línea base: **420 s** en el gate del PR #60 (research R9). Margen: 60 s.

- Cada PR corre solo la spec de su área además de las 1, 2 y 3 (`docs/TESTING.md`
  §4): B y E corren la 5, C y D la 4. El PR E toca las dos áreas y corre las cinco.
  **Hoy no es así:** `test:e2e:smoke` (`playwright test --project e2e`) corre todos los
  archivos de `tests/e2e/`. El selector de abajo lo convierte en una regla ejecutable.

### Selector de specs por área (revisión del PR #64, F64-5)

Va en el **PR B**, el primero que introduce una spec nueva, porque antes no hay nada que
excluir.

- **Un script determinista**, `scripts/e2e-select.mjs`, recibe la lista de archivos
  cambiados (`git diff --name-only <merge-base>...HEAD`, con la base del PR) y devuelve
  los archivos de spec que corren. Reglas, en este orden:
  1. Las specs 1, 2 y 3 corren **siempre**.
  2. Si algún archivo cambiado es del **área de metas** (`src/features/goals/`,
     `src/domain/goals/`, `src/lib/db/goals*.ts` y `goal-usage.ts`, las migraciones y
     pruebas SQL de metas, `tests/e2e/goals.e2e.ts`), añade la **4**.
  3. Si es del **área de presupuestos** (`src/features/plan/`, `src/features/analysis/`,
     `src/domain/budgets/`, `src/lib/db/budgets.ts`, las migraciones y pruebas SQL de
     presupuestos, `tests/e2e/budgets.e2e.ts`), añade la **5**.
  4. **Opción conservadora: las cinco** si cualquier archivo cambiado no está
     clasificado como de un área o como neutro para E2E (`src/lib/` fuera de los
     anteriores, `src/components/`, `src/app/`, `playwright.config.ts`,
     `tests/e2e/fixtures.ts`, `package.json`, el lockfile, `.github/`, `scripts/`, una
     migración no clasificada), si no se puede calcular la base (clon superficial sin
     ella, evento sin PR) o si el script falla.
  5. El nocturno y el push a `main` corren siempre las cinco, sin selector.
- **Integrado en el comando real del workflow**: el paso del job `e2e` que hoy ejecuta
  `node scripts/ci.mjs run test:e2e:smoke` pasa a ejecutarlo con los archivos que
  devuelve el selector, e imprime en el resumen del job qué specs corrieron y por qué.
  El checkout del job `e2e` trae la historia necesaria para la base (`fetch-depth`
  suficiente); si no la trae, regla 4.
- **Prueba del selector** (proyecto `domain` o una prueba de `scripts/`, como la del
  guardia): una tabla de listas de archivos y su resultado esperado, incluidos solo
  documentación, solo metas, solo presupuestos, los dos, un archivo neutro, uno sin
  clasificar y la base ausente.
- La parte P0-3 del dataset se siembra **por SQL** dentro de `seedCouple()`, una vez
  por worker; ninguna spec crea metas o presupuestos por la interfaz para preparar un
  caso (regla dura 1). El recorrido que la spec comprueba sí usa la interfaz.
- La spec 4 usa los dos `storageState` (Sara y Tomás) del worker; no crea cuentas.
- Los estados de axe nuevos se agrupan por ruta, con los dos temas en el mismo
  contexto, como en la 003.
- **Puntos de control con medición:** el PR B y el PR C lanzan `gh workflow run` una
  vez, cuando nace su spec, para medir el job y registrarlo en la evidencia. El techo
  no se mueve por una medición (cláusula anticliquet).

### Mitigación prevista, en este orden y sin subir el tope

Con 60 s de margen, dos specs nuevas probablemente no caben tal como está el job. Para
no bloquear a mitad del PR B o el C, la mitigación queda decidida aquí:

1. **(a) Más paralelismo de Playwright en el job `e2e`.** Hoy `playwright.config.ts` no
   fija `workers` ni `fullyParallel`: Playwright usa su valor por defecto (la mitad de
   las CPU) y reparte **archivos**, no casos dentro de un archivo, así que una spec
   larga corre entera en un solo worker. La siembra ya es por worker: `tests/e2e/fixtures.ts` siembra con scope `worker`, por
   `parallelIndex`, la Sara privada, la Sara del dataset y la pareja (Sara y Tomás),
   cada una con su `storageState` propio (`docs/TESTING.md` §5, reglas 1 y 2; el
   aislamiento entre workers lo prueba `tests/integration/seed.test.ts`). La medición
   T054 de la 002 no repartía trabajo porque había un solo archivo.
   - **El PR A mide si es seguro**, sin CI extra, con `npm run e2e:dev` contra
     `juntia-dev`: 1, 2 y 4 workers, con y sin `fullyParallel`, sobre las specs y el
     axe existentes. Criterio: cero fallos, cero datos de un worker en otro y el tiempo
     de cada combinación. `e2e:dev` rechaza hoy `--workers` (lista blanca de F55-1), así
     que el PR A añade el mínimo para medir: `playwright.config.ts` lee el número de
     workers y `fullyParallel` de una variable con el valor actual por defecto, y
     `e2e:dev` la reenvía. Va en el PR A porque es un PR de código que ya corre CI.
   - Si es seguro, el PR B fija en el job `e2e` la combinación medida. Si no lo es, se
     registra por qué y se pasa a (b).
   - Lo que de verdad no puede ir en paralelo (por ejemplo, el test con motion activo
     o un caso que cambie algo global) se marca `@serial`, y el job copia **el
     mecanismo** del job `evidence` (`.github/workflows/ci.yml`), no solo la etiqueta:
     una pasada paralela con `--grep-invert @serial` y los workers medidos, y otra pasada
     aparte con `--grep @serial --workers 1`. La medición del PR A incluye las dos
     pasadas, y se mantiene con 1, 2 y 4 workers (revisión del PR #64, F64-6).
2. **(b) No repetir casos.** Las specs 4 y 5 no repiten lo que ya cubre otra spec o una
   capa inferior: el número héroe ya lo comprueba la spec 3; la privacidad de Nosotros
   se comprueba una vez por ruta nueva; las validaciones de importes, versiones y
   saldos viven en integración y pgTAP. Cada caso E2E justifica qué rompería sin que
   ninguna capa inferior se entere (`docs/TESTING.md` §4).
3. **(c) Solo si (a) y (b) no bastan**, el PR se para y va a los fundadores con la
   medición. El tope de 480 s no se mueve por una medición.

## Barrido completo de accesibilidad (decisión 21.2)

Lo lanza el gestor a mano con «Run workflow»: en cada PR que añade pantallas (B, C, D
y E) y **al cerrar P0-3**. Siete anchos, texto al 200 %, teclado completo y objetivos
de 44 px, con la etiqueta `@sweep`. Sus fallos bloquean el cierre de la etapa.

## Qué specs corre cada PR

| PR | Specs E2E | Puntos de control de CI |
| --- | --- | --- |
| A | 1, 2, 3 (no hay pantallas nuevas) | Dos: tras las tablas (`db`) y tras las funciones (`db`); y el gate |
| B | 1, 2, 3, **5** | Uno al nacer la spec 5 (medición `e2e`); y el gate |
| C | 1, 2, 3, **4** | Uno al nacer la spec 4 (medición `e2e`); y el gate |
| D | 1, 2, 3, 4 | Solo el gate |
| E | 1, 2, 3, 4, 5 | Solo el gate |

**Iteración, no CI.** Mientras se desarrolla, todo se itera contra `juntia-dev` con su
bloqueo: solo las pruebas afectadas, y `e2e:dev` completo una vez antes de cada push.
La pasada final de cada PR es la de marcarlo listo, después de la revisión de ChatGPT
con el PR en borrador (`docs/TESTING.md` §3). Ningún spike ni verificación usa runners
ni workflows.
