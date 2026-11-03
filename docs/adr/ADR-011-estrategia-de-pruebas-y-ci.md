# ADR-011 — Estrategia de pruebas y CI

**Estado:** Propuesto · **Origen:** decisión de los fundadores, 2 de noviembre de 2026 · **Alcance:** P0 (MVP-1)

## Contexto

El maestro §10.1 ya reparte las pruebas por nivel de riesgo y §7.1 ya fija la fila
de CI («lint, typecheck, unit de dominio, integración RLS, build y pocos E2E
smoke»). Lo que no existe es la regla que decide **dónde vive cada criterio de
aceptación concreto** ni el presupuesto de tiempo que impide que la suite se
degrade. Sin esa regla, el modo de fallo es conocido y no hace falta imaginarlo:
cada slice añade dos o tres pruebas de navegador para cosas que no necesitan
navegador, nadie las quita, y en seis meses el gate de PR dura cuarenta y cinco
minutos sin que nadie haya decidido que durara eso.

El repositorio está en el punto exacto en el que esa decisión todavía es barata:
**no existe scaffold de aplicación** (maestro §15.1), no hay `package.json`, no
hay suite que migrar. La primera especificación de ingeniería de P0 crea el
scaffold y, con él, la forma de la suite. Si la estrategia no está escrita antes,
la escribe por omisión el primer PR que añada un test.

Hay además dos activos que ya existen y que hoy no están siendo tratados como lo
que son:

- La **tabla de DEC-G04** de `docs/design/HANDOFF_CLAUDE_CODE.md` es, literalmente,
  una tabla de casos parametrizados: siete filas con entradas y salida esperada.
- El **caso de octubre** de `docs/design/COMPONENT_SPECIFICATIONS.md` es un dataset
  dorado con totales verificados a mano (2.840.000 de consumo, 900.000 de aporte,
  saldo 429.900, reparto 55/45 del arriendo).

Ambos se escribieron antes que el código. Esa es precisamente la condición que
hace que un test valga algo.

## Decisión

### 1. Principio rector

> Un test E2E solo existe si falla por algo que **ninguna capa inferior** puede
> detectar. Si pasaría igual con la base de datos mockeada, no es un E2E: es un
> test de UI mal ubicado.

Una suite de cuarenta y cinco minutos no aparece por mala suerte. Se produce
probando en el navegador cosas que no necesitan navegador.

Corolario operativo: **los tests derivan de los criterios de aceptación del
handoff y del maestro, nunca de lo que hace la implementación.** Un test escrito
mirando el código afirma el bug además de la función.

### 2. Ubicación de cada criterio de aceptación de P0

La lista es la de «Criterios de aceptación (solo P0)» de
`docs/design/HANDOFF_CLAUDE_CODE.md`, más una regla de negocio de la UI del mismo
documento que es de privacidad y por tanto bloqueante (maestro §15.6).

| # | Criterio de aceptación | Capa | Herramienta | Por qué no una capa superior |
| --- | --- | --- | --- | --- |
| 1 | `total_destinado_neto` reproduce **cada fila** de la tabla de DEC-G04 y nunca se rotula «Total gastado» ni ocupa el número héroe | Dominio puro | Vitest (`test.each`, 7 filas) | Es aritmética de una función pura (§15.4). Un navegador no añade nada y tarda mil veces más. El rótulo y la jerarquía se revisan en la revisión humana del PR, no con un selector |
| 2 | Un gasto compartido existe una vez: total en Nosotros, parte en Yo; ninguna pantalla, export ni agregado suma Yo + Nosotros | Dominio puro | Vitest | Es una invariante de los agregados. Si falla, falla en la función de agregación; verlo en pantalla solo lo descubre más tarde y más caro |
| 3 | Los aportes no cambian `gasto_consumo` ni lo consumido de presupuestos; se atribuyen al aportante real | Dominio puro | Vitest | Separación de dimensiones financieras (§5.1, DEC-G02). Es cálculo, no render |
| 4 | Una liquidación parcial Tomás → Sara 200.000 deja el consumo en 2.840.000 y el saldo en 229.900 | Dominio puro | Vitest | Dos números contra el dataset dorado. No requiere persistencia ni UI |
| 5 | Un retiro nunca se presenta como ingreso | Dominio puro | Vitest | La clasificación del movimiento es del dominio. El componente la refleja; si el dominio la acierta, el componente no puede inventarla |
| 6 | El saldo de la pareja reproduce el caso de octubre incluyendo la liquidación parcial; la sugerencia es única y no crea transferencias | Dominio puro | Vitest (`computeBalance`) | El handoff ya pide `computeBalance(expenses, settlements, members)` como función pura con tests. «No crea transferencias» se prueba por ausencia de efecto en el dominio |
| 7 | Los datos del caso de octubre reproducen exactamente los totales mostrados en el diseño | Dominio puro | Vitest (fixture dorada) | Es el dataset contra la función. Es el test más barato y el que más protege |
| 8 | Usar o retirar aportes ajenos sin confirmación del otro integrante queda bloqueado | Base de datos / RLS | SQL sobre Supabase local | Es autorización. Probarlo por la UI prueba que el botón está escondido, no que la escritura está prohibida. El ataque no usa el botón |
| 9 | No se puede crear un espacio compartido con más de 2 integrantes | Base de datos / RLS | SQL sobre Supabase local | Misma razón: es una restricción del servidor (§15.5). El formulario que no deja añadir un tercero es cortesía, no la regla |
| 10 | Los movimientos privados nunca se renderizan en el contexto Nosotros, ni en los totales ni en las búsquedas | Base de datos / RLS | SQL sobre Supabase local | Es la garantía de privacidad central del producto (`AGENTS.md` 6). Tiene que ser imposible **leerlos**, no solo imposible verlos pintados |
| 11 | La reclasificación privado → compartido deja un único gasto activo y un registro de auditoría | Integración de servidor | Vitest + Supabase local, sin navegador | ADR-001 exige transacción única, idempotencia y auditoría. Eso se verifica llamando a la operación y mirando la base, incluida la concurrencia. El navegador no puede provocar la carrera de forma fiable |
| 12 | Un gasto con meta crea un único gasto real; las asignaciones por aportante suman el uso y son independientes del reparto; la meta nunca queda negativa | Integración de servidor | Vitest + Supabase local, sin navegador | §15.6.3 puntos 5 y 6: dos transacciones atómicas e idempotentes distintas. Es comportamiento de servidor bajo concurrencia y reintento |
| 13 | Una edición concurrente de presupuesto no se pierde en silencio **[V]** | Integración de servidor | Vitest + Supabase local, sin navegador | Hacen falta dos escritores simultáneos. Dos navegadores coordinados para eso son lentos, frágiles y no prueban nada que dos clientes no prueben mejor |
| 14 | Mediana < 10 s para anotar un gasto habitual tras el onboarding (US-12, §15.7) | E2E real | Playwright | Es un criterio sobre la experiencia completa: render, teclado, red y persistencia. Ninguna capa inferior lo puede medir |
| 15 | Mi cuenta: navegación, perfil, pareja, apariencia, privacidad, sesión y acceso (05·9) | E2E real | Playwright | Es navegación entre rutas reales con sesión real. Es exactamente lo que un E2E debe cubrir |
| 16 | Los dos temas pasan axe sin violaciones serias en Inicio, Actividad, Anotar, Balance y Meta | E2E barato por ruta | Playwright + axe (5 rutas × 2 temas) | Necesita un árbol de accesibilidad real, pero no un flujo: se visita la ruta y se pasa axe. Es barato por ruta y no debe convertirse en un recorrido |
| 17 | Todos los momentos de motion respetan `prefers-reduced-motion` | E2E barato por ruta | Playwright (`use: { reducedMotion: 'reduce' }`) | Es una emulación de media feature del navegador. Además se ejercita de continuo por la regla dura nº 3, no solo en su test |

**El criterio «Anotar registra privado o compartido desde un solo flujo»** se parte
en dos mitades que viven en capas distintas: la mitad auditable (reclasificación
atómica) es la fila 11; la mitad de interfaz (un solo flujo para ambos contextos)
viaja en el spec de humo que §10.1 ya exige para «Registro privado». No es un spec
E2E adicional.

### 3. Tope de specs E2E

**4 a 6 specs E2E para TODO P0.** No por slice: en total.

Cada especificación de slice **declara cuántas añade, con un máximo de 2**. Si
quien la escribe cree necesitar más, se detiene y lo plantea; no las añade y lo
menciona después.

El tope no es una preferencia estética. Es el mecanismo que convierte el principio
rector en algo que se puede incumplir visiblemente.

### 4. Presupuestos de tiempo

Son un **contrato**, no una aspiración.

| Suite | Presupuesto |
| --- | --- |
| `verify` (lint + typecheck + unit + RLS) | **< 90 s** |
| Unit de dominio, suite completa | **< 15 s** |
| Tests SQL / RLS | **< 60 s** |
| E2E de humo en PR | **< 3 min** |
| **Gate de PR completo** | **< 6 min** |
| Nocturno / post-merge | **< 15 min** |

**Superar el presupuesto del humo falla el build.** Sin esa consecuencia, cada PR
añade veinte segundos que nadie nota y en seis meses la suite vuelve a durar
cuarenta y cinco minutos sin que nadie lo haya decidido.

### 5. CI en dos niveles

**Nivel 1 — cada push a un PR.** Jobs en paralelo:

1. lint + typecheck + build
2. Vitest, dominio completo
3. Supabase local en contenedor, con migraciones aplicadas y tests SQL de RLS
4. E2E de humo: **3 specs, solo Chromium**

**Nivel 2 — al mergear a `main` y de noche:**

1. E2E completo en **Chromium + WebKit**
2. axe en 5 rutas × 2 temas
3. Snapshots visuales de **las 5 rutas** — no de cada componente
4. Rendimiento contra los umbrales del maestro §15.7

El workflow no se escribe en este ADR. Lo implementa la especificación 001 junto
al scaffold, porque un workflow que no ejecuta nada es ruido que además falla.
La descripción operativa está en `docs/TESTING.md`.

### 6. Siete reglas duras

1. **Sembrar estado por base de datos o API, nunca por la interfaz.** Un helper
   tipo `seedCouple()` inserta directo y devuelve el `storageState`.
2. **Autenticar una vez** y reutilizar `storageState` en todos los proyectos.
3. **`prefers-reduced-motion: reduce` por defecto** en el contexto de Playwright:
   es más rápido, es mucho menos frágil frente a los springs y las View
   Transitions, y ejercita de continuo un criterio de aceptación. **Un** test corre
   con motion activo, para los dos momentos L2.
4. **Cero `waitForTimeout`.** Solo aserciones web-first. Se impone con una regla de
   ESLint, no con buena voluntad.
5. **Retries 0 en local, 1 en CI.** Un test que necesita el segundo intento dos
   veces se saca a cuarentena y se arregla.
6. **Un solo navegador en los PRs.** WebKit solo en el nocturno.
7. **Regla de lint que prohíbe colores hex crudos** fuera de `styles/tokens.css`.

### 7. Relación con §10.1 — refinamiento, no contradicción

§10.1 marca la fila **«Visual y motion»** como **bloqueante para cada flujo
insignia**, con «navegadores reales» como herramienta. **Esa decisión sigue
vigente y este ADR no la toca.**

Lo que este ADR precisa es **dónde se ejecuta ese gate: es humano y queda fuera de
CI.** Se cumple con capturas adjuntas al PR, revisadas por los dos fundadores,
según el procedimiento de §10.3 («el responsable visual revisó capturas del
producto funcionando y registró observaciones») y §10.4.

El motivo es simple: automatizar un criterio subjetivo produce falsos positivos, y
la gente aprende muy rápido a ignorar un check que se pone rojo por una sombra de
un píxel. Un gate que se ignora es peor que ningún gate, porque da cobertura.

Las partes **objetivas** de esa fila sí entran en CI y están en la tabla anterior:
axe en 5 rutas × 2 temas (fila 16), `prefers-reduced-motion` (fila 17), snapshots
visuales de las 5 rutas en el nivel 2 y los umbrales de §15.7.

Este refinamiento no releva de nada más. En particular, **ninguna verificación de
seguridad, autorización o atomicidad se pospone** (maestro §15.6, advertencia de
jerarquía): las filas 8 a 13 son bloqueantes de slice y se ejecutan en CI.

## Consecuencias

- La suite de dominio se convierte en el lugar por defecto. Eso exige que la regla
  de dependencia de §7.2 se cumpla de verdad: `domain` no importa React, Supabase
  ni SDK de Vercel. Si se incumple, el dominio deja de ser testeable en
  milisegundos y toda esta estrategia se cae.
- Los **fixtures tipados** que §15.1 asigna a F0-b dejan de ser material de
  maqueta: pasan a ser el dataset dorado de la suite. La primera especificación de
  ingeniería los produce con esa doble función explícita.
- Hace falta un `verify` único y rápido. Un agente que implementa no debe tener que
  elegir qué ejecutar.
- Hace falta infraestructura de siembra por base de datos (`seedCouple()` y
  equivalentes) **antes** del primer E2E. Esto es trabajo real de la especificación
  001, no un detalle.
- El tope de 4 a 6 specs hace que la cobertura de UI dependa de la revisión humana
  del PR y de la fila «Componentes · RTL selectivo» de §10.1, que **sigue vigente**
  y corre dentro del job de Vitest como proyecto aparte. Este ADR no la sustituye.
- Los presupuestos de tiempo son observables, así que hay que medirlos y
  publicarlos en cada run; un presupuesto que nadie mide no es un contrato.
- Un presupuesto que falla el build puede bloquear un PR por motivos de
  infraestructura y no de código. El procedimiento de cuarentena de
  `docs/TESTING.md` es la válvula, y es deliberadamente incómoda.

## Verificación pendiente [V]

Nada de lo siguiente se ha ejecutado. No existe scaffold, no hay `package.json` y
no se instaló ninguna herramienta durante la redacción de este ADR.

1. **Todos los presupuestos de tiempo.** Son objetivos razonados, no medidas. Se
   confirman o se renegocian con la primera suite real de la especificación 001.
2. **Que el gate de PR completo cabe en 6 minutos** una vez contados el arranque de
   Supabase en contenedor y la instalación de Chromium. La documentación de
   Playwright desaconseja cachear los binarios del navegador (ver Referencias), de
   modo que el coste de instalación se paga en cada run y hay que medirlo.
3. **Que 3 specs de humo caben en 3 minutos** con la recomendación de Playwright de
   `workers: 1` en CI.
4. **La elección de mecanismo para los tests de RLS** (pregunta abierta 1).
5. **El nombre y la configuración exactos de la regla de lint de hex crudos.** No se
   verificó ninguna implementación concreta.
6. **Que `vitest --changed` sirve para el bucle local** en un repositorio sin
   historial de suite.

## Referencias

### Del repositorio

- `docs/JUNTIA_MASTER.md` §7.1 (stack y fila «CI»), §7.2 (estructura y regla de
  dependencia del dominio), §10.1 (pruebas según riesgo), §10.2, §10.3, §10.4,
  §12.2, §15.1, §15.4, §15.5, §15.6.3, §15.7, §15.9
- `docs/design/HANDOFF_CLAUDE_CODE.md` — tabla de DEC-G04, «Criterios de aceptación
  (solo P0)», «Reglas de negocio de la UI», «Rendimiento»
- `docs/design/COMPONENT_SPECIFICATIONS.md` — datos de referencia de octubre
- `docs/adr/ADR-001-conversion-privado-compartido.md`
- `docs/TESTING.md` — el documento operativo derivado de este ADR

### Documentación oficial consultada el 2 de noviembre de 2026

Se consultó para **verificar nombres exactos de opciones y mecanismos
soportados**, no para elegir el stack, que está congelado en §7.1.

**Vitest — docs en v5.1.0** (https://vitest.dev)

- `vitest related <archivos>`: «Run only tests that cover a list of source files».
  Funciona con imports estáticos, no con `import()` dinámico.
- `--changed [since]`: «Run tests that are affected by the changed files
  (default: `false`)». La documentación escribe el argumento como `[since]`, no
  como `[commit]`, y **no** explica qué acepta; la opción análoga
  `coverage.changed` sí dice «since a specified commit or branch (e.g.
  `origin/main` or `HEAD~1`)».
- Proyectos: **`test.projects`** dentro de `vitest.config.ts`. La documentación dice
  explícitamente: «The `workspace` is deprecated since 3.2 and replaced with the
  `projects` configuration». `vitest.workspace.ts` **no** se usa. Cada proyecto
  lleva `test.name` y `test.environment` (`'node'` para dominio). `extends` está
  activo por defecto desde Vitest 5.0. Se ejecuta uno con `vitest --project <name>`.
- `test.each` / `describe.each` existen, con tabla de arrays, de objetos o
  plantilla etiquetada. También existen `test.for` / `describe.for`.

**Playwright — versión verbatim más alta vista en las páginas: v1.64.1**
(https://playwright.dev). Las páginas consultadas no muestran una etiqueta
«Version: 1.xx» explícita; v1.64.1 aparece en el tag del contenedor
`mcr.microsoft.com/playwright:v1.64.1-noble` y «Added in: v1.64» en `TestOptions`.

- Autenticación una sola vez: la documentación recomienda el **proyecto `setup` con
  `dependencies`**, no `globalSetup`. Texto literal: «This is the recommended
  approach, as it integrates better with the Playwright test runner». Claves:
  `projects`, `name`, `testMatch: /.*\.setup\.ts/`, `dependencies: ['setup']`,
  `use: { storageState: 'playwright/.auth/user.json' }`, `testProject.teardown`. El
  test de setup guarda con `await page.context().storageState({ path: authFile })`.
  `globalSetup` se documenta como «Option 2», con la advertencia «Beware that
  `globalSetup` and `globalTeardown` lack some features».
- `fullyParallel`: existe en `testConfig` y en `testProject`. Por defecto «test
  files are run in parallel; tests in a single file are run in order, in the same
  worker process». **El valor por defecto de `fullyParallel` no está indicado** en
  las páginas leídas.
- Sharding: `npx playwright test --shard=x/y`; reporter `'blob'`; mezcla con
  `npx playwright merge-reports --reporter html ./all-blob-reports`.
- **`reducedMotion` confirmado.** Es una propiedad de `TestOptions`, «Added in:
  v1.50». Texto literal: «Emulates `'prefers-reduced-motion'` media feature,
  supported values are `'reduce'`, `'no-preference'`. … Passing `null` resets
  emulation to system defaults. Defaults to `'no-preference'`». Tipo:
  `null | "reduce" | "no-preference"`. Se fija en `use: { reducedMotion: 'reduce' }`
  en `testConfig.use` o `testProject.use`, y se sobreescribe con `test.use()`.
- Aserciones web-first: «web-specific async matchers that will wait until the
  expected condition is met»; timeout por defecto de 5 segundos. La guía de buenas
  prácticas contrapone `await expect(...).toBeVisible()` a
  `expect(await ....isVisible()).toBe(true)`.
- **Advertencia honesta:** las páginas oficiales de Playwright **no mencionan
  `waitForTimeout` ni prohíben las esperas fijas**, y **no recomiendan
  `eslint-plugin-playwright`**. Solo recomiendan ESLint con
  `@typescript-eslint/no-floating-promises`. La regla `playwright/no-wait-for-timeout`
  existe en el plugin **mantenido por la comunidad**
  (`playwright-community/eslint-plugin-playwright`), donde figura en la
  configuración `recommended`. No se verificó su versión ni se instaló. La regla
  dura nº 4 sigue siendo nuestra, no una recomendación oficial.
- CI: `npx playwright install --with-deps`, o `npx playwright install chromium
  --with-deps` para un solo navegador. **Caché de navegadores:** texto literal de la
  página de CI: «Caching browser binaries is not recommended, since the amount of
  time it takes to restore the cache is comparable to the time it takes to download
  the binaries». Es decir, **no hay acción oficial recomendada para cachear
  navegadores de Playwright: la documentación desaconseja hacerlo.**
  La misma página recomienda `workers: process.env.CI ? 1 : undefined`.

**Supabase CLI** (https://supabase.com/docs). Ninguna página consultada indica una
versión concreta del CLI.

- Mecanismo documentado principal: **pgTAP**. «pgTAP is a unit testing framework for
  Postgres». Comandos: `supabase test new <name> -t pgtap` y `supabase test db`,
  que «Runs `pg_prove` in a container with unit test files volume mounted from
  `supabase/tests` directory». Cada test corre en su propia transacción y se hace
  rollback. Flags de `supabase test db`: `--db-url`, `--linked`, `--local`.
- Segundo mecanismo documentado: **tests a nivel de aplicación** con
  `@supabase/supabase-js`, y el ejemplo oficial de la página de RLS **usa Vitest**.
  Las claves se obtienen con `supabase status -o env`, que imprime `API_URL`,
  `PUBLISHABLE_KEY` y `SECRET_KEY`.
- Tercer mecanismo documentado: **helpers de la comunidad**
  (`basejump-supabase_test_helpers`) instalados vía `dbdev`. La documentación los
  llama explícitamente «community-maintained». Exponen
  `tests.create_supabase_user()`, `tests.authenticate_as()`,
  `tests.get_supabase_uid()`, `tests.rls_enabled()`,
  `tests.authenticate_as_service_role()`, `tests.clear_authentication()`,
  `tests.freeze_time()`, `tests.unfreeze_time()`.
- RLS en SQL plano, sin dependencias: el ejemplo oficial usa
  `set local role authenticated;` y `set local request.jwt.claim.sub = '<uuid>';`.
  **Inconsistencia documentada:** la página de overview usa en cambio
  `set local "request.jwt.claims"`. La documentación no reconcilia ambas formas.
- CI documentado por Supabase: workflow `.github/workflows/db-tests.yml` con
  `uses: supabase/setup-cli@v1`, `run: supabase start`, `run: supabase test db`.
  **El snippet oficial no incluye `supabase db reset`**, aunque su propia sección de
  troubleshooting dice «Ensure database migrations are run before tests».
- La página de RLS recomienda además una técnica que adoptamos: «Break each policy
  and watch the suite fail» (añadir temporalmente `using (true)` para comprobar que
  el test realmente falla).

**Acciones de CI** (README oficiales)

- `actions/setup-node`: major actual **v7**. Input `cache` con valores `npm`,
  `yarn`, `pnpm`, e input `cache-dependency-path`. El README dice explícitamente:
  «The action does not cache `node_modules`»; cachea los datos globales del gestor
  de paquetes. El caché de npm se activa solo si `package.json` declara
  `packageManager` o `devEngines.packageManager`.
- `actions/cache`: major actual **v6**. Su README conserva un aviso de obsolescencia
  **caducado** («upgrading to version `v4` or `v3` … before February 1st, 2025»);
  no indica una fecha de retirada vigente para v1/v2/v3.
- `supabase/setup-cli`: major actual **v3**. El README dice: «`supabase/setup-cli@v1`
  and `@v2` are legacy and only receive compatibility fixes». Input único:
  `version`. **Nota:** la documentación de Supabase sigue mostrando `@v1` en su
  ejemplo de CI, lo que contradice al README de la propia acción; usar **v3**.
- La página de CI de Playwright usa en su ejemplo `actions/setup-node@v6`, una
  versión por detrás del major actual.

## Preguntas abiertas

### 1. Mecanismo para los tests de RLS — **única pieza genuinamente abierta**

Hay tres caminos documentados y la decisión no se cierra aquí.

| Opción | Qué es | A favor | En contra |
| --- | --- | --- | --- |
| **A. pgTAP en SQL plano** | `supabase test new -t pgtap` + `supabase test db`, cambiando de identidad con `set local role authenticated` y `set local request.jwt.claim.sub` | Cero dependencias fuera del CLI. CI de dos líneas. Rollback por test. Lo más rápido para el presupuesto de < 60 s | Más código repetido por test. La documentación usa dos formas distintas del claim (`request.jwt.claim.sub` vs `"request.jwt.claims"`) y no las reconcilia |
| **B. pgTAP + `basejump-supabase_test_helpers`** | Lo anterior más los helpers instalados vía `dbdev` | `tests.authenticate_as()` y `tests.create_supabase_user()` quitan mucho ruido. `tests.rls_enabled()` es un check directo | Dependencia **mantenida por la comunidad**, fuera del stack congelado de §7.1. Instalar `dbdev` añade un paso al arranque de CI y, por tanto, tiempo al presupuesto |
| **C. Tests de aplicación con `supabase-js` + Vitest** | Dos clientes (publishable / secret) golpeando la API local | Prueba la ruta real que usa la app, PostgREST incluido. Se escribe en TypeScript, como el resto | Más lento que SQL. Prueba la API además de la política, así que un fallo es más ambiguo. Cabe peor en < 60 s |

**Recomendación: empezar con A, y pasar a B solo si la repetición resulta
intolerable en la práctica.** El motivo es el presupuesto y el principio rector
aplicado una capa más abajo: A prueba exactamente la política y nada más, no añade
dependencias al stack congelado ni pasos al arranque de CI, y los tres o cuatro
helpers que echaríamos de menos caben en un `.sql` propio de veinte líneas que
podemos leer y mantener. C queda reservado para el caso en que haga falta verificar
que PostgREST no amplía lo que la política permite; sería un par de tests, no la
suite.

Si se elige A, hay que **resolver primero cuál de las dos formas del claim usa
nuestra versión del stack**, ejecutándola; la documentación de Supabase no lo
aclara. Decide un humano.

### 2. ¿Qué mide exactamente el presupuesto del humo?

«< 3 min» puede ser el tiempo de los tests o el del job completo (checkout, `npm
ci`, `npx playwright install chromium --with-deps`, arranque del servidor). Como la
documentación de Playwright **desaconseja cachear los binarios**, la instalación se
paga en cada run y la diferencia entre ambas lecturas no es pequeña. Este ADR no lo
decide; hay que medirlo en la especificación 001 y fijar la lectura.

### 3. Tres specs de humo con `workers: 1`

Playwright recomienda `workers: 1` en CI por estabilidad. El presupuesto de 3
minutos supone implícitamente algo de paralelismo. Medir y, si no cabe, decir cuál
de las dos cosas cede: nunca ajustar el presupuesto a la herramienta en silencio.

### 4. Correspondencia entre el tope de 4–6 specs y la lista de humo de §10.1

§10.1 nombra cuatro familias de smoke E2E (registro privado; pareja + 50/50 +
liquidación; meta individual/compartida con aportes y uso; presupuesto
activado/desactivado) y este ADR fija 3 specs de humo en el nivel 1 y 4–6 en total
para P0. La lectura que proponemos es que las cuatro familias viven dentro de las
4–6 specs y que solo un subconjunto de 3 corre en cada PR, quedando el resto para
el nivel 2. **No se da por resuelta:** el reparto concreto lo fija la especificación
que cree cada spec, y si las cuatro familias más las filas 14 y 15 de la tabla no
caben en 6, hay que decirlo y no estirar el tope en silencio.

### 5. La fila «Componentes · RTL selectivo» de §10.1

Sigue vigente y este ADR no la ubica en la tabla, porque la tabla clasifica
criterios de aceptación del handoff y esa fila es una capa, no un criterio. Corre
como un proyecto aparte dentro del job de Vitest. Queda por fijar su presupuesto de
tiempo propio, que hoy está absorbido en los < 90 s de `verify`.

### 6. Regla de lint de colores hex crudos

Está decidida como regla (nº 7); no está decidida su implementación. No se verificó
ninguna. Candidatos razonables: `no-restricted-syntax` de ESLint sobre literales de
plantilla, o Stylelint con `color-no-hex` limitado a todo menos `styles/tokens.css`.
Lo resuelve la especificación 001 al crear el scaffold.
