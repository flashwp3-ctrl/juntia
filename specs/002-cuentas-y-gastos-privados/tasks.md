---

description: "Lista de tareas de la especificación 002 · Cuentas y gastos privados (P0-1)"
---

# Tasks: 002 · Cuentas y gastos privados (P0-1)

> En este archivo, `[P]` significa **paralelizable** (archivos distintos, sin
> dependencias). **No** es la marca de propuesta del paquete de diseño. Una
> tarea que implementa algo propuesto lo dice en palabras —«propuesta
> §15.9»— y nunca con la etiqueta suelta.

**Input**: `specs/002-cuentas-y-gastos-privados/` — [spec.md](spec.md) (PR #35), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md), [contracts/](contracts/) y [evidence-plan/](evidence-plan/) (PR #37).

**Status**: Draft — fase Tasks. No avanza a Implement sin el merge de su PR documental (ADR-012 §3.1).

**Quién lo ejecuta**: el agente que asigna la tabla de «Estrategia de implementación» (regla operativa de los fundadores), a partir de este archivo mergeado. Cada tarea se entiende sin la conversación que la escribió: lleva las rutas exactas, el requisito que cumple y un criterio de terminado que se comprueba con un comando o una revisión concreta. **Las tareas no deciden y no amplían alcance**: si una tarea no se puede cumplir sin decidir algo que no está en la spec, el plan o sus auxiliares, la implementación se detiene y lo reporta (`AGENTS.md` 17). Las tareas marcadas **Humana** las ejecuta la persona que nombran; el agente las prepara y pega su salida.

**Numeración.** Las tareas de este archivo son T001…T102. Las verificaciones heredadas de la 001 se citan siempre con prefijo, **001-T072 … 001-T075**, para no confundirlas con las tareas de igual número de este archivo.

**Tests**: se rigen por `docs/TESTING.md` y ADR-011, que prevalecen sobre
cualquier heurística genérica de generación de tests. Cada criterio de
aceptación va en **la capa más baja que puede detectar su fallo**
(`docs/TESTING.md` §4); cada tarea de test nombra su capa, su archivo y el
criterio que cubre. **No** se genera un contract test por endpoint ni por
interfaz (ADR-012 §4). Las pruebas salen de la tabla «Pruebas por capa» de cada
PR del plan; la auditoría está en el [Anexo A](#anexo-a--auditoría-de-las-tareas-de-test-adr-012-4).

**Specs E2E que añade este slice (obligatorio)**: **2** — la **spec E2E 1 «Acceso y Mi cuenta»** (nace en el PR B; el PR D le suma el caso de descarga de Exportar) y la **spec E2E 2 «Anotar gasto, cronometrado»** (nace en el PR C) (`docs/TESTING.md` §4; spec, «Specs E2E que añade P0-1»). La pasada de axe por ruta y la prueba de cobertura de axe no son specs E2E.

**Organization**: una fase por PR de implementación, **A → B → C → D**, en serie (Clarify Q1; plan, «PR de implementación A–D»), y una fase final de aceptación. Dentro de cada fase, grupos en orden; dentro de cada grupo, las tareas `[P]` pueden ir a la vez. Las tareas de historia llevan `[USn]`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo con las demás `[P]` **de su mismo grupo y de su mismo PR**: archivos distintos, ninguna depende de otra del grupo y **ninguna compite por el mismo checkout, servidor, puerto o run de CI**. Una tarea que compila, sirve la app, ocupa un puerto, ejecuta `npm ci`, lanza el CI o modifica un archivo de forma temporal no lleva `[P]`. Ninguna tarea de un PR es paralela a otra de otro PR.
- **[Story]**: historia de la spec (US1…US11). Configuración, CI, evidencia y aceptación no llevan etiqueta.
- **Humana**: la ejecuta una persona (fundadora, fundador o gestor, según se diga); nunca un agente por su cuenta.
- Cada tarea dice debajo **Cumple** (requisitos y criterios) y **Terminado cuando** (comprobación concreta).

## Reglas que aplican a todas las tareas

Se enuncian una vez. Una tarea que las incumpla no está terminada.

1. **Sin Docker en los equipos** (decisión 17; ADR-011 §9). Nunca se arranca Docker Desktop ni WSL y nunca se ejecuta `supabase start` en un equipo. Todo lo que necesita Supabase se prueba en CI con `gh workflow run ci.yml --ref <rama>` (quickstart §2). **Ninguna función, política o migración está probada sin la salida del job `db` de ese mismo commit** (ADR-011 §9.8).
2. **Versiones exactas** de research R3, sin `^` ni `~`: `@supabase/supabase-js` 2.118.0, `@supabase/ssr` 0.12.7; CLI 2.121.0 con `supabase/setup-cli@v3` en CI y `npx --yes supabase@2.121.0` en un equipo. Sin RHF, Zod, TanStack Query ni `supabase` como dependencia de npm (research R8.12).
3. **Importes nunca como `number`** en ninguna frontera (FR-008; ADR-013 §4). **Ningún camino que atiende a una persona usa `service_role`** (FR-011): la clave secreta solo existe en `tests/support/**` y en el runner.
4. **Copy**: toda cadena visible y todo nombre accesible nuevo sale de `src/lib/copy/es.ts` (FR-060; `docs/CONVENTIONS.md` B.1). La redacción no está en la spec: **copy en el PR, revisado en `es.ts`** por los fundadores. Las claves de error son las de [contracts/errors.md](contracts/errors.md).
5. **Ninguna tarea implementa un elemento propuesto sin aprobar** (maestro §15.9). Los aprobados (Anotar E1–E5 privado, sección Cuenta, persistencia del tema) se construyen tal como los aprobó la decisión 16; los que solo requieren aprobación viendo la pantalla se listan en la tarea de capturas de su PR.
6. **Los tests se escriben antes que el código que prueban y se ven fallar** (`docs/TESTING.md` §6). Cada test copia como comentario el criterio literal que cubre con su referencia. En pgTAP, la identidad se fija **solo** con `set local role authenticated` y `set local "request.jwt.claims" = '{"sub":"…","role":"authenticated"}'` (research R2), nunca con `request.jwt.claim.sub`.
7. **Ninguna espera fija** en pruebas de navegador; `reducedMotion: 'reduce'` por defecto; `retries` 0/1; solo Chromium (ADR-011 §6).
8. **Ninguna afirmación sin salida real** (`AGENTS.md` 12 y 18). Un `[V]` se cierra pegando su salida en `evidence.md`, nunca escribiendo «verificado». Una verificación sin dispositivo se cierra solo con «EXCEPCIÓN APROBADA» y sus cinco datos (T093).
9. **Sin datos reales en CI**, ni en artefactos ni en logs (ADR-011 §9.6). Sin claves en ningún archivo versionado ni en la salida pegada.

## Interpretaciones de ejecución

No son decisiones: son lecturas necesarias para ejecutar una tarea donde el plan no fija el detalle. Si el revisor las objeta, se cambian sin tocar el alcance.

| # | Dónde | Lectura | Por qué |
| --- | --- | --- | --- |
| I1 | T012 | En el punto de control 1, la escritura directa imposible sobre `profiles` por SQL va en `06_profiles.test.sql`; `05_direct_writes.test.sql` nace en el punto de control 2 con las tablas controladas | El plan corre `01`–`04`, `06` y `09` en el punto 1 y pide ahí lo que ya se pueda de la [V] 2 |
| I2 | T040 | La validación del nombre visible y la de la ruta `volver` son funciones puras probadas en el proyecto `domain`, en `src/domain/account/` | El plan las pone en la capa «Dominio» del PR B pero su árbol no nombra el archivo |
| I3 | T047 | El estado «sesión caducada» se construye en el PR B sobre las acciones de Mi cuenta (perfil y apariencia) y el PR C lo reutiliza en la hoja de Anotar | La spec lo aprueba viendo la pantalla en el PR B; la hoja conectada es del PR C |
| I4 | T056, T071, T083, T095 | Las capturas y mediciones se hacen a 390 y 1440 px salvo donde la tarea pida los siete anchos | `CLAUDE.md` 5 hace obligatorios esos dos |

---

## Phase 1: PR A · Base de datos, seguridad y dinero

**Purpose**: Supabase en el repositorio, las tres migraciones en el orden obligatorio, el dominio del dinero y los movimientos, el dataset dorado, la capa `src/lib/db/`, los tipos generados, el job `db`, la copia con su ensayo y `verify` adaptado. **Sin pantallas** (plan, PR A).

**Orden obligatorio** (plan, PR A; SC-006; decisión 15): `foundation` → **punto de control 1** → comprobaciones en `juntia-dev` → `controlled_tables` → **punto de control 2** → **solo entonces** `money_functions`. **Si la [V] 1 falla en cualquiera de los dos puntos, el PR se para** y ADR-013 se reabre; no se sustituye por funciones de `postgres`.

### Grupo 1A — configuración (en serie)

- [ ] T001 Añadir a `package.json` `@supabase/supabase-js` **2.118.0** y `@supabase/ssr` **0.12.7** en `dependencies`, exactas, y regenerar `package-lock.json`; añadir los scripts `test:db` (`supabase test db`), `test:integration` (`vitest run --project integration`), `db:types:check` y `db:restore-drill` (`bash scripts/restore-drill.sh`) según [contracts/ci.md](contracts/ci.md)
  - Cumple: FR-001, FR-008; ADR-013 [V] 10 (lockfile).
  - Terminado cuando: `npm ci` termina con exit 0; ninguna versión de `package.json` lleva `^` ni `~`; `npm ls --depth=0` muestra las dos versiones exactas y ninguna dependencia de research R8.12; un peer incompatible se dice en el PR y no se cambia la versión en silencio.

- [ ] T002 Crear `supabase/config.toml` con la CLI 2.121.0 (`npx --yes supabase@2.121.0 init`, que no necesita Docker) y ajustarlo: `[api] schemas = ["public"]`; `[auth] enable_signup`, `[auth.email] enable_confirmations = true`, `[auth] minimum_password_length = 8`; `[auth.hook.before_user_created]` con `uri = "pg-functions://postgres/juntia_private/before_user_created_hook"`; plantillas de confirmación y recuperación con `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup|recovery`; `site_url` `http://127.0.0.1:3000`; `[db.seed]` con `./seed.sql`. Añadir `supabase/.temp/` y `supabase/.branches/` a `.gitignore`
  - Cumple: FR-001, FR-002, FR-021, FR-024; quickstart §3 (F37-7: la contraseña mínima la aplica Auth).
  - Terminado cuando: el archivo existe con esos valores; `git check-ignore supabase/.temp` lo imprime; ningún secreto en el archivo (los que la CLI genera usan `env(…)`).

- [ ] T003 Crear `supabase/seed.sql`, **solo para el runner** (nunca se empuja con `--include-seed`, quickstart §3): los correos de prueba `*@seed.test` en `juntia_data.signup_allowlist` y el esquema `tests` con las auxiliares de pgTAP (crear un usuario de prueba y fijar la identidad con `set local role` y `"request.jwt.claims"`)
  - Cumple: FR-024 (lista de prueba); research R4 (los correos reales no van en git); regla 6.
  - Terminado cuando: el archivo no contiene ningún correo que no termine en `@seed.test`; `git grep -n "@" -- supabase/migrations` no devuelve correos.

- [ ] T004 Ampliar `vitest.config.mts` con el proyecto `integration` (entorno `node`, `include: ["tests/integration/**/*.test.ts"]`, excluido de `verify`) y crear `tests/integration/support/env.ts`, que lee `API_URL`, `PUBLISHABLE_KEY` y `SECRET_KEY` del entorno del runner y falla si faltan
  - Cumple: FR-063; `docs/TESTING.md` §2.
  - Terminado cuando: `npx vitest list --project integration` funciona sin red; `npm run verify` no ejecuta el proyecto `integration`.

- [ ] T005 Reglas de lint nuevas en `eslint.config.mjs`, con casos en `tests/lint-fixtures/` y en `tests/lint-rules.test.ts` (Vitest `components`, entorno `node`, como B1 de la 001): (a) en `src/**`, prohibidos `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y la cadena `service_role`; (b) en `src/**` salvo `src/lib/db/**` y `src/lib/supabase/**`, prohibido llamar a `.rpc(` y `.from(`; (c) la regla de dependencia de `src/domain/**` prohíbe además `@/lib/db/*` y `@/lib/supabase/*`
  - Cumple: FR-010, FR-011; [contracts/ci.md](contracts/ci.md), «Lint nuevo».
  - Terminado cuando: `tests/lint-rules.test.ts` marca la línea exacta de cada fixture nuevo y se vio fallar antes de la regla; `npm run lint` pasa sobre el código limpio.

- [ ] T006 Adaptar `scripts/verify.mjs` y `scripts/ci.mjs`: filas «SQL/RLS (pgTAP) — SOLO EN CI — pendiente de resultado · job db», «integración servidor — SOLO EN CI — pendiente de resultado · job db» y «E2E de humo — NO APLICABLE — la spec E2E 1 nace en el PR B de la 002»; el resumen del job `app` nombra el control 3 como «job `db`» y el 4 como no aplicable hasta el PR B. Cabecera `verify · 002`
  - Cumple: FR-063; ADR-011 §9.1; `docs/TESTING.md` §3, regla 1.
  - Terminado cuando: `npm run verify` imprime la tabla con esas filas, con el código de salida independiente de ellas, y ninguna dice «pasó».

- [ ] T007 Crear el job `db` en `.github/workflows/ci.yml` según [contracts/ci.md](contracts/ci.md): `supabase/setup-cli@v3` con `version: 2.121.0`; `supabase start -x studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,supavisor`; claves de `supabase status -o env` enmascaradas con `::add-mask::` y llevadas a `$GITHUB_ENV`; `npm ci`; `test:db` medido; `test:integration`; `db:types:check`; `supabase stop`; `timeout-minutes: 10`; resumen con tiempos contra presupuesto (aviso, no fallo). Sin filtro de rutas propio y sin secretos de GitHub. El paso `db:restore-drill` lo añade T030
  - Cumple: FR-063; ADR-011 §5 y §9.2.
  - Terminado cuando: `gh workflow run ci.yml --ref <rama>` corre `app` y `db`, el log no contiene ninguna clave y el resumen publica la duración de `supabase start` y de `test:db` contra < 60 s.

### Grupo 1B — dominio (tests primero)

- [ ] T008 [P] Test de **dominio** en `src/domain/money/money.test.ts` y después `src/domain/money/` (`Currency`, `Money`, `moneyFromPesos`, `parseAmountMinor`, `serializeAmountMinor`, `formatMoney`, `MAX_COP_PESOS`) según [data-model.md](data-model.md) §6
  - Casos: ningún `number` en la API pública del módulo; pesos → unidades menores exacto; texto ↔ `bigint` con `9007199254740993`, `9223372036854775807` y los no válidos; formato es-CO sin decimales.
  - Cumple: FR-012, FR-008; maestro §5.2.
  - Terminado cuando: el test se vio fallar y después pasa en `npm run test:unit`.

- [ ] T009 [P] Test de **dominio** en `src/domain/transactions/transactions.test.ts` y después `src/domain/transactions/` (tipos, `CATEGORY_CATALOG` con las diez claves y su `kind`, `validateDraft`, `monthKey`, `todayInBogota`, `monthSummary`, `groupByDay`, `fillRecentCategories`, `monthBounds`)
  - Casos: catálogo literal de [data-model.md](data-model.md) §2.2; «Ingresos» solo para ingreso; monto > 0, ≤ máximo, pesos enteros; descripción ≤ 140; «hoy» con un instante de borde (UTC del 1 de noviembre de 2026, aún 31 de octubre en Bogotá); `monthSummary` no suma ingresos al gasto; recientes completadas con el orden del catálogo (research R8.8); la flecha siguiente llega al mes más lejano con movimientos y no más (Q13).
  - Cumple: FR-013, FR-014, FR-015, FR-019; US-6.7.
  - Terminado cuando: el test se vio fallar y después pasa.

- [ ] T010 [P] Test de **dominio** en `src/domain/golden/october-2026.test.ts` y después `src/domain/golden/october-2026.ts` con `ContextKind`, `PersonId`, `GoldenCurrency` y `saraPrivateOctober2026`, **copiado** de la tabla «Dataset dorado de P0-1» de la spec
  - Casos: los ocho gastos suman exactamente `41290000` unidades menores (412.900); el ingreso de 86.000 no suma al gasto; el desglose por categoría coincide con la tabla.
  - Cumple: FR-020; SC-008 (mitad de dominio); maestro §15.10, «Dataset dorado», reglas 1, 2 y 4.
  - Terminado cuando: el test pasa con `monthSummary` de T009.

- [ ] T011 [P] Añadir a `src/lib/copy/es.ts` las claves de error de [contracts/errors.md](contracts/errors.md) y `copy.categories.*` de producto con las diez claves del catálogo (las de la superficie interna se mantienen)
  - Cumple: FR-060; ADR-013 §6.3.
  - Terminado cuando: `npm run typecheck` pasa y cada clave de [contracts/errors.md](contracts/errors.md) existe; la redacción queda listada en el PR para la revisión de los fundadores.

### Grupo 1C — migración `foundation` y punto de control 1 (en serie)

- [ ] T012 [US9] Tests **pgTAP** del punto de control 1, escritos antes de la migración: `supabase/tests/01_privileges.test.sql` (privilegios efectivos de `anon` y `authenticated` sobre los tres esquemas y las tablas que existen, incluidos `TRUNCATE`, `REFERENCES`, `TRIGGER`, secuencias, `usage` y `create`; ninguna función `security definer` en `public`; nada de `juntia_private` invocable por la API), `02_claims.test.sql` ([V] 9 y `current_uid()` por SQL), `03_views.test.sql` (`my_profile` con `security_invoker` y sin `usage`), `04_writer.test.sql` ([V] 1 con `ensure_profile`: devuelve a quien llama, RLS aplicada a `juntia_writer`, perfil de otra persona rechazado, `current_uid()` nulo sin claims), `06_profiles.test.sql` (RLS por dueño; escritura directa imposible por SQL, I1) y `09_allowlist.test.sql` (hook: permitido, no permitido, mayúsculas)
  - Cumple: FR-002, FR-004, FR-024, FR-029; ADR-013 [V] 1, 2, 7, 8 y 9 (parte del punto 1).
  - Terminado cuando: los seis archivos existen y fallan contra un esquema vacío en un run del job `db`.

- [ ] T013 [US9] Crear `supabase/migrations/20261105000100_foundation.sql` según [data-model.md](data-model.md) §1, §2.1, §2.2, §2.6, §3 (filas de estas tablas), §4 (`my_profile`) y §5 (funciones de perfil y hook): esquemas y `revoke`; `juntia_writer` en un `DO` idempotente; `grant juntia_writer to postgres`; `create` temporal en `juntia_private` revocado al final; `alter default privileges`; `drop extension if exists pg_graphql`; `juntia_private.current_uid()` (enmienda de ADR-013 §2.3); `profiles`, `categories` sembrada, `signup_allowlist`, el hook, `my_profile`, `ensure_profile`, `complete_first_entry`, `update_display_name`, `set_theme`. Cada `security definer` lleva el comentario que lo justifica. **Ninguna tabla controlada ni función de dinero**
  - Cumple: FR-001, FR-002, FR-004, FR-005, FR-024, FR-029, FR-052 (columna `theme`).
  - Terminado cuando: los tests de T012 pasan en el job `db`.

- [ ] T014 [US9] Test de **integración de servidor** en `tests/integration/foundation.test.ts`, con usuarios creados en el Supabase del runner (`tests/integration/support/users.ts`): `ensure_profile` por `rpc` devuelve a quien llama; `POST`/`PATCH`/`DELETE` directos sobre `profiles` y los perfiles `juntia_data`/`juntia_private` fallan (`PGRST205`, `PGRST106`, 403); `/graphql/v1` no expone nada; Tomás no lee el perfil de Sara
  - Cumple: FR-002, FR-004, FR-005; ADR-013 [V] 2 (parte del punto 1); ADR-011, condición 2 de la decisión 1 (prueba con el cliente real).
  - Terminado cuando: pasa en el job `db`.

- [ ] T015 **Punto de control 1**: commit propio con T012–T014, `gh workflow run ci.yml --ref <rama>` sobre ese commit y salida pegada en la sección «Punto de control 1» de `evidence.md` (si todavía no existe, esta tarea lo crea con el formato de T031) con el enlace al run: [V] 1 con `ensure_profile`, [V] 9, y lo que ya corre de [V] 2, 7 y 8. **Si la [V] 1 falla, se para el PR y se reporta** (decisión 15)
  - Cumple: SC-006 (punto temprano); plan, PR A, paso 1.
  - Terminado cuando: el commit, el enlace y la salida están en `evidence.md`, o el PR está parado con el motivo.

- [ ] T016 **Humana** (persona con acceso a `juntia-dev`, quickstart §3): aplicar `foundation` a `juntia-dev` con `npx --yes supabase@2.121.0 link --project-ref itfrhnadovezpahikuol` y `db push --linked`, comprobando el destino antes; registrar sin claves qué rol de login usa, si `grant juntia_writer to …`, `alter function … owner to juntia_writer` y `drop extension pg_graphql` funcionan, y que «Exposed schemas» es solo `public`
  - **Salida dura (F37-8):** si `pg_graphql` no se puede quitar o desactivar, **el PR A se para y lo reporta**; no se cambia a ninguna alternativa.
  - Cumple: FR-005; plan, PR A, paso 2; research R1 («Queda para el PR A»).
  - Terminado cuando: la salida está en `evidence.md` con `pg_graphql` ausente, o el PR está parado con el motivo.

### Grupo 1D — migración `controlled_tables` y punto de control 2 (en serie)

- [ ] T017 [US9] Tests **pgTAP** del punto de control 2, antes de la migración: `05_direct_writes.test.sql` (insert, update, delete y truncate imposibles para `authenticated` en cada tabla controlada; `audit_events` no se modifica ni con `set local role juntia_writer`), `07_transactions.test.sql` (las restricciones de [data-model.md](data-model.md) §2.3, la FK compuesta de categoría, el trigger de columnas inmutables `JT013` y de anulado `JT012`, sin `delete`), y la ampliación de `01`, `03` y `04` a `transactions`, `audit_events`, `idempotency_records` y las tres vistas de movimientos (inserción y `select … for update` a nombre de otra persona con `set local role juntia_writer`, como el preflight 1d.3)
  - Cumple: FR-003, FR-004, FR-007, FR-013, FR-018; ADR-013 [V] 1, 2, 7, 8 y 9 definitivas.
  - Terminado cuando: fallan contra el esquema de `foundation` en un run del job `db`.

- [ ] T018 [US9] Crear `supabase/migrations/20261105000200_controlled_tables.sql`: `transactions`, `audit_events`, `idempotency_records`, sus restricciones, índices, triggers, políticas y grants ([data-model.md](data-model.md) §2.3–§2.5 y §3) y las vistas `my_transactions`, `my_transaction_months` y `my_recent_categories` con importes como `text` (§4). **Ninguna función de dinero**
  - Cumple: FR-003, FR-004, FR-007, FR-008, FR-013, FR-015, FR-018.
  - Terminado cuando: T012 y T017 pasan en el job `db`.

- [ ] T019 [US9] Ampliar `tests/integration/foundation.test.ts` (o `tests/integration/controlled-tables.test.ts`) a las tablas controladas y vistas: escritura directa imposible por PostgREST con JWT real en cada tabla; las vistas no admiten `POST`/`PATCH`/`DELETE`; Tomás no ve filas de Sara por las vistas
  - Cumple: FR-002, FR-004; SC-007 (parte); ADR-013 [V] 2.
  - Terminado cuando: pasa en el job `db`.

- [ ] T020 **Punto de control 2**: commit propio con T017–T019 y su run del job `db`; salida de **[V] 1, 2, 7, 8 y 9 definitivas sobre todas las tablas controladas y vistas** pegada en la sección «Punto de control 2» de `evidence.md` con el enlace. Es anterior a cualquier función de dinero. **Si la [V] 1 falla, se para**
  - Cumple: SC-006; ADR-013, nota del 4 de noviembre de 2026 en «Verificación pendiente».
  - Terminado cuando: el commit, el enlace y la salida están en `evidence.md`.

### Grupo 1E — funciones de dinero (solo después de T020)

- [ ] T021 [US2] [US4] Test **pgTAP** `supabase/tests/08_money_functions.test.sql`, antes de la migración: para `create_transaction`, `update_transaction` y `void_transaction`, éxito, rechazo por RLS a nombre de otra persona, repetición idempotente (misma clave, misma intención → mismo resultado y una sola auditoría), misma clave con otra intención → `JT008`, versión distinta → `JT011`, anulado → `JT012`, cada validación (`JT001`–`JT007`, `JT009`, `JT010`, `JT017`); auditoría con actor, instante, `before` y `after`; **[V] 6 según la nota de ADR-013**: (a) `juntia_private.parse_amount_minor` llamado directamente con `9007199254740993`, `9223372036854775807` y los no válidos (signo, decimales, letras, `9223372036854775808`, vacío), (b) una fila con `9007199254740993` sembrada como `postgres` y leída por `my_transactions` como texto idéntico; **aparte**, el tope de Anotar en `public.create_transaction`: acepta `99999999900` y rechaza `100000000000` con `JT003`; catálogo exacto
  - Cumple: FR-006, FR-007, FR-008, FR-013, FR-016, FR-017, FR-018; ADR-013 [V] 6.
  - Terminado cuando: falla contra el esquema de T018 en un run del job `db`.

- [ ] T022 [US2] [US4] Crear `supabase/migrations/20261105000300_money_functions.sql`: `parse_amount_minor`, `request_fingerprint` y las tres operaciones (entrada en `public` `security invoker` y escritura en `juntia_private` `security definer` de `juntia_writer`, `set search_path = ''`, usando `current_uid()`), con el orden de [data-model.md](data-model.md) §5 y la concurrencia de research R8.4
  - Cumple: FR-006, FR-016, FR-017, FR-034 (anular con motivo `undo`), FR-036.
  - Terminado cuando: T021 pasa en el job `db`.

- [ ] T023 Generar `src/lib/supabase/database.types.ts` (`supabase gen types typescript --local --schema public` en el runner), implementar `db:types:check` y crear `src/lib/supabase/server.ts` (cliente por petición, `server-only`) y `src/lib/supabase/browser.ts`. Test de **tipos** en `src/lib/db/types.test.ts` (`expectTypeOf`): ningún campo de importe de `public` es `number`
  - Cumple: FR-008, FR-009, FR-010; ADR-013 §4.3.
  - Terminado cuando: `db:types:check` pasa en el job `db` y falla si se edita a mano el archivo; el test de tipos pasa en `npm run typecheck`.

- [ ] T024 Crear `src/lib/db/` (`types.ts`, `errors.ts`, `retry.ts`, `profile.ts`, `transactions.ts`): única capa que conoce vistas y funciones; importes `string` → `Money`; traducción de códigos según [contracts/errors.md](contracts/errors.md); reintento de `40P01`/`40001` hasta 3 veces con la misma clave. Test de **componentes** (entorno `node`) en `src/lib/db/errors.test.ts`: cada código de la tabla da su error de dominio y un código desconocido da `unexpected`
  - Cumple: FR-006, FR-008, FR-010, FR-060; ADR-013 §3.4, §6.3.
  - Terminado cuando: el test pasa en `verify` y la regla de lint de T005 no marca nada.

- [ ] T025 [US2] [US4] [US9] Test de **integración de servidor** en `tests/integration/money.test.ts`: dos peticiones simultáneas con la misma clave → un movimiento ([V] 4; SC-009); misma clave, otra intención → `JT008`; dos ediciones con la misma versión → una gana y la otra `JT011`, nada se sobrescribe ([V] 5 en movimientos, Q15); un `RAISE` a mitad de `create_transaction` no deja filas ([V] 3); la fila de `9007199254740993` vuelve idéntica por supabase-js (resto de [V] 6); Tomás no ve ni cambia nada de Sara por vistas ni funciones (SC-007); el dataset dorado sembrado **por la función real** da 412.900 por `src/lib/db` + dominio (SC-008); reintento de `40P01` con la misma clave con dos transacciones que se bloquean
  - Cumple: FR-006, FR-016, FR-017, FR-036; US-2.6, US-4.2, US-4.5, US-9.1–9.5; SC-007, SC-008, SC-009.
  - Terminado cuando: pasa en el job `db`.

- [ ] T026 Quitar la marca «[propuesta]» de `voided` en `docs/GLOSSARY.md` §2 y §10 y citar la spec 002 en la columna Fuente (plan, «Puntos para el revisor», 1; `docs/GLOSSARY.md` §11)
  - Cumple: FR-013.
  - Terminado cuando: `git diff docs/GLOSSARY.md` solo toca esas filas; `scope` sigue como propuesta.

### Grupo 1F — copia y ensayo de restauración (en serie)

- [ ] T027 Crear `supabase/restore/plain-postgres-bootstrap.sql` (roles `anon`, `authenticated`, `service_role`, `supabase_auth_admin`; esquema `auth`, `auth.uid()` con la definición del stack y `auth.users` y `auth.identities` con las columnas que vuelca `pg_dump`) y `scripts/backup-manifest.sh` con `--write` y `--verify`, `--mode ci --sha` y `--mode production --tag`, mismas comprobaciones en los dos modos (research R6; quickstart §4)
  - Cumple: FR-059; US-10.
  - Terminado cuando: los dos archivos existen, `bash -n` pasa y el script falla con código distinto de 0 ante cualquier diferencia (lo prueba T030).

- [ ] T028 Crear `scripts/backup.sh` y `scripts/restore-plain.sh` **tal como los describe quickstart §4.1 y §4.3**: `set -euo pipefail`; `git worktree add` en lugar de `checkout`; `trap` que borra lo descifrado y conserva el código de salida; copia escrita en `.juntia-backup.*` y publicada con enlace duro solo al final, con nombre único al segundo y sin sobrescribir; descifrado de comprobación antes de publicar; restauración en una base propia `juntia_restore_<fecha-hora>_<pid>` que el script crea, apunta y borra con éxito o con fallo después de escribir el log, y que hace fallar el script si `dropdb` falla
  - Cumple: FR-059; US-10.1–10.3.
  - Terminado cuando: `bash -n` pasa en los dos y el ensayo de T030 los ejecuta.

- [ ] T029 Crear `scripts/restore-drill.sh` en **modo CI** (`--mode ci --sha "$GITHUB_SHA"`): siembra datos de prueba, copia como en 4.1 contra el Supabase del runner y restaura **desde una base vacía** por los dos caminos: A, `supabase db reset` a las migraciones de ese SHA sin semilla y `data.sql`, con un usuario restaurado que entra; B, PostgreSQL 17 normal de PGDG con el arranque, cada migración con `ON_ERROR_STOP` y `data.sql`, comparando antes las columnas de `auth` del arranque con las del stack. `--verify` obligatorio en los dos
  - Cumple: FR-059; US-10.2; ADR-011 §9.6.
  - Terminado cuando: corre en el job `db` (T030) y termina con la marca de éxito única.

- [ ] T030 Añadir al job `db` el paso `db:restore-drill` (con cliente y servidor PostgreSQL 17 de PGDG) y los **nueve controles negativos** de quickstart §4.2, cada uno ejecutado por el job, que exige código de salida distinto de 0 y la ausencia de la marca de éxito, y falla si alguno «pasa»:
  1. una migración rota en una copia temporal de `supabase/migrations/`;
  2. un manifiesto con un recuento alterado;
  3. un manifiesto con otro SHA;
  4. un `data.sql` modificado (no coincide el `sha256`);
  5. una restauración que falla a mitad: no queda **ninguna** base `juntia_restore*` y el log existe con `exit=` distinto de 0;
  6. una copia que falla: no queda ningún `juntia-*.tar.gpg`, `juntia-*.manifest.txt` ni carpeta `.juntia-backup.*`;
  7. una copia contra un nombre existente: falla y el archivo existente conserva su `sha256`;
  8. un `dropdb` que falla tras una restauración correcta (`DROPDB=false`): código distinto de 0, el log con `exit=1` y «DROP FALLÓ» con el nombre de la base, sin «RESTAURACIÓN LISTA»; después el job borra esa base y comprueba que no queda ninguna `juntia_restore*`;
  9. un descifrado de comprobación que no coincide: la copia falla y no publica nada.
  - Cumple: FR-059; US-10.2, US-10.4.
  - Terminado cuando: el run del job `db` muestra los dos caminos en verde y los nueve controles fallando como deben; la salida va a `evidence.md`. **Hasta entonces la copia no se presenta como restaurable.**

### Grupo 1G — salida del PR A

- [ ] T031 Crear `specs/002-cuentas-y-gastos-privados/evidence.md` con una sección por tarea que pide salida en este archivo (de este PR y de los siguientes), cada una con fecha, commit, comando o procedimiento y salida real o «pendiente: motivo». Capturas en `specs/002-cuentas-y-gastos-privados/evidence/`, nombradas por ruta, estado, ancho y tema
  - Cumple: `AGENTS.md` 12; plan, «PR de implementación A–D».
  - Terminado cuando: el archivo tiene una sección por cada tarea que pide salida en este PR y en los siguientes; las de T015, T016, T020, T030 y T032 rellenas y el resto «pendiente».

- [ ] T032 **Gate completo sobre el mismo commit** (ADR-011 §9.1): `npm run verify` en local y el run de CI (`app` y `db`) del último commit, con la salida de `verify`, el enlace al run, el tiempo de `test:db` contra < 60 s y el de `supabase start` (research R8.13), sin mover ningún techo
  - Cumple: FR-063; ADR-011 [V] 1 (medición, avisa).
  - Terminado cuando: las dos salidas son del mismo SHA y están en `evidence.md`.

- [ ] T033 Descripción del PR A (`AGENTS.md` 15; inglés, `docs/CONVENTIONS.md` B.4) y **revisión humana del SQL**: objetivo, archivos, decisiones, comandos con salida, enlaces a los dos puntos de control y al gate, pruebas añadidas por nombre (Anexo A), «E2E specs added: 0», `[V]` cerradas y pendientes, riesgos. Sin capturas (no hay interfaz). Ningún `[P]` para aprobar viendo la pantalla
  - Cumple: plan, PR A, «Criterios de salida».
  - Terminado cuando: la descripción existe y los fundadores revisaron el SQL; el PR no se mergea sin esa revisión.

**Checkpoint**: PR A mergeado. A partir de aquí, la dueña puede aplicar migraciones a producción (T034).

---

## Phase 2: PR B · Acceso y Mi cuenta

**Purpose**: Supabase Auth con las pantallas de 04·17, `proxy.ts`, el perfil y A6, AccountButton y el perfil del sidebar, Mi cuenta salvo pareja (con su estado «llega con P0-2»), Exportar **sin** la descarga real (es del PR D), el tema persistido, la siembra por base de datos, el job `e2e` y la spec E2E 1 (plan, PR B).

### Grupo 2A — prerrequisitos operativos (Humana; antes de probar en `juntia-dev` o producción)

- [ ] T034 **Humana** (dueña): aplicar las migraciones del PR A a **producción** con el procedimiento de quickstart §3 y el `project-ref` de producción, comprobando el destino; desenlazar al terminar; etiquetar el commit aplicado `db-prod-AAAA-MM-DD` y subir la etiqueta (quickstart §4.0)
  - Cumple: FR-058; quickstart §3 y §4.0.
  - Terminado cuando: `evidence.md` registra fecha, etiqueta y SHA (sin claves).

- [ ] T035 **Humana** (dueña): los correos de los dos fundadores son miembros de la organización de Supabase, y **cada fundador recibe de verdad un correo de verificación** de cada proyecto donde vaya a probar (research R5, que es evidencia documental)
  - Cumple: FR-058; Q10; quickstart §3, paso 6.
  - Terminado cuando: `evidence.md` registra fecha y proyecto de cada correo recibido, sin las direcciones.

- [ ] T036 **Humana** (dueña), en **los dos proyectos** (producción y `juntia-dev`), según quickstart §3: confirmación de correo y plantillas con `/auth/confirm?token_hash=…&type=…`; URL del sitio y de redirección; hook Before User Created → `juntia_private.before_user_created_hook`; «Exposed schemas» solo `public`; **contraseña mínima 8**; las filas de la lista permitida con el SQL de quickstart §3, paso 7
  - Cumple: FR-021, FR-023, FR-024, FR-058; F37-7.
  - Terminado cuando: `evidence.md` tiene una línea por ajuste y proyecto, sin correos ni claves.

- [ ] T037 **Humana** (dueña): variables de entorno de Vercel por nombre (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SITE_URL`): **Production → proyecto de producción; Preview → `juntia-dev`**. Ninguna clave secreta en Vercel (quickstart §3; plan, «Puntos para el revisor», 6)
  - Cumple: FR-058, FR-011.
  - Terminado cuando: `evidence.md` lista los nombres por entorno, sin valores.

### Grupo 2B — tests primero

- [ ] T038 [P] [US1] Test de **componentes** en `src/features/auth/auth-errors.test.ts` y después `src/features/auth/auth-errors.ts`: las respuestas de `signUp` 200, 403 del hook, 422 `user_already_exists` y 429 producen **exactamente la misma** salida de interfaz (A3); la recuperación siempre A4b; el resto según [contracts/errors.md](contracts/errors.md), «Supabase Auth»
  - Cumple: FR-023 (enmendado, decisión 16.16); US-1.2, US-1.5.
  - Terminado cuando: el test se vio fallar y pasa.

- [ ] T039 [P] [US7] Tests de **componentes** en `src/features/account/theme-selector.test.tsx`, `src/features/account/profile-form.test.tsx` y `src/features/account/limit-note.test.tsx`: ThemeSelector es `radiogroup` con flechas, aplica `data-theme` y escribe la cookie `juntia_theme`; P1–P5 del nombre visible; LimitNote de «Eliminar tu cuenta» tiene `role="note"` y no es un control
  - Cumple: FR-051, FR-052, FR-055; US-7.2, US-7.3, US-7.7.
  - Terminado cuando: se vieron fallar.

- [ ] T040 [P] [US1] [US7] Test de **dominio** en `src/domain/account/account.test.ts` y después `src/domain/account/` (I2): validación del nombre visible (recortado, 1–60, sin saltos de línea) y de la ruta `volver` (solo rutas relativas propias, `/^\/(?!\/)/`)
  - Cumple: FR-027, FR-051; research R8.7.
  - Terminado cuando: pasa en `npm run test:unit`.

- [ ] T041 [US1] Test de **integración de servidor** en `tests/integration/auth.test.ts`: `ensure_profile()` idempotente con el `display_name` de A2; `/auth/confirm` con enlace válido, caducado y usado; **una llamada directa a `/auth/v1/signup` con una contraseña de 7 caracteres y un correo de la lista es rechazada** (`weak_password`) y no crea usuario (F37-7); `set_theme` y `update_display_name` no tocan el perfil de otra persona (si no lo cubre ya T012)
  - Cumple: FR-021, FR-024, FR-029; US-1.1, US-1.3.
  - Terminado cuando: pasa en el job `db`.

### Grupo 2C — implementación (en serie: comparten `es.ts`, el layout y el shell)

- [ ] T042 [US1] Crear `src/lib/supabase/proxy.ts` y `src/proxy.ts`: renovación de sesión con `@supabase/ssr`, `getClaims()`, redirección de producto y Mi cuenta a `/entrar?volver=<ruta>` validada con T040, `Cache-Control: private, no-store` en respuestas autenticadas
  - Cumple: FR-026, FR-027; ADR-013 §6.5.
  - Terminado cuando: el build muestra las rutas de producto como dinámicas y el caso «ruta protegida sin sesión → `/entrar` → vuelve» pasa en T049.

- [ ] T043 [US1] Server Actions de acceso en `src/features/auth/` (registro con `options.data.display_name` y `emailRedirectTo`, reenvío, entrar, recuperar, contraseña nueva, cerrar sesión) con `src/lib/supabase/server.ts`, traduciendo errores con T038; tras entrar y en `/auth/confirm`, `ensure_profile()` y copia de `profiles.theme` a la cookie de la respuesta (research R7, R8.5)
  - Cumple: FR-021, FR-023, FR-028, FR-029; US-1.
  - Terminado cuando: T038 y T041 pasan.

- [ ] T044 [US1] Pantallas de 04·17 en `src/app/(auth)/` — `entrar` (A1, A1b, A1c, A1d, aviso de verificado, S3), `crear-cuenta` (A2, con el aviso de versión privada de prueba sin texto legal, Q9), `verificar-correo` (A3), `recuperar` (A4, A4b, enlace caducado), `nueva-contrasena` (A5), `primera-entrada` (A6, solo «Empezar por mi cuenta» y sin presupuesto) — y `src/app/auth/confirm/route.ts`
  - Claude Design: `04 Pantallas`, 04·17.
  - Cumple: FR-022, FR-025; US-1.1–1.7.
  - Terminado cuando: cada estado se puede alcanzar en `npm run dev` contra `juntia-dev` y aparece en el registro de T050.

- [ ] T045 [US7] Tema persistido: `src/lib/theme-script.ts` lee la cookie `juntia_theme` como en `evidence-plan/theme-v-theme-script.ts.txt`; `src/lib/theme-script.test.ts` lo cubre (cookie `light`/`dark`, `system`, valor no válido, sin cookie, cambio del sistema que no pisa el tema guardado); `scripts/check-theme-script.mjs` pide `/entrar`; el layout de `(app)` compara `profiles.theme` con la cookie y la reescribe si difiere (research R8.6)
  - Cumple: FR-052; Q7; US-7.3, US-7.4.
  - Terminado cuando: `npm run check:theme-script` pasa y el HTML servido no lleva `data-theme`.

- [ ] T046 [US7] Mi cuenta: componentes de `src/features/account/` (AccountButton, ProfileHeader, AccountMenuItem, ThemeSelector, LimitNote) y rutas `src/app/(app)/cuenta/` (C1, `perfil` P1–P5, `pareja` «llega con P0-2» sin formulario, `apariencia` T1, `privacidad` D1 con Exportar sin la descarga real y la LimitNote, `seguridad` G1, G2, S1–S2); AccountButton en el encabezado de Inicio, Actividad, Metas y Plan y perfil al pie del sidebar; tablet y escritorio de 04·18 y oscuro de 04·19
  - Claude Design: `02 Componentes` (02·9–02·10) y `04 Pantallas` (04·14, 04·16, 04·18, 04·19).
  - Cumple: FR-050–FR-056 (propuesta §15.9 aprobada, decisión 16.6); US-7.
  - Terminado cuando: T039 pasa y cada ruta está en el registro de T050.

- [ ] T047 Estado «sesión caducada» (I3) con el patrón de error, traduciendo `JT001` y el 401 de PostgREST a `copy.errors.sessionExpired` sin perder lo escrito; se usa en las acciones de Mi cuenta
  - Cumple: spec, caso límite «Sesión caducada»; [contracts/errors.md](contracts/errors.md).
  - Terminado cuando: es visible al caducar la sesión en `perfil` y figura en las capturas de T056.

### Grupo 2D — siembra, axe, spec E2E 1 y CI (en serie)

- [ ] T048 Siembra en `tests/support/seed.ts` (research R8.11): por worker y por rol (Sara; Tomás donde haga falta) crea un usuario confirmado con la API de administración del Supabase **del runner**, entra con `createServerClient` sobre un almacén de cookies en memoria y guarda `playwright/.auth/<parallelIndex>-<rol>.json`; fixture de scope `worker` en `tests/e2e/fixtures.ts`; proyecto `e2e` en `playwright.config.ts`; `playwright/.auth` en `.gitignore`
  - Cumple: FR-064; ADR-011 §6, reglas 1 y 2.
  - Terminado cuando: dos workers siembran usuarios distintos y ninguno comparte su `storageState`.

- [ ] T049 [US1] [US7] **Spec E2E 1** «Acceso y Mi cuenta» en `tests/e2e/access-account.e2e.ts`: registro de un correo permitido → enlace en Mailpit → A1 con aviso → entrar → A6 sin «Invitar a mi pareja» → Inicio; registro no permitido → la misma pantalla y ninguna cuenta; ruta protegida sin sesión → `/entrar` → vuelve a la ruta; Mi cuenta: perfil, apariencia en oscuro y **un segundo contexto que entra y tiene `data-theme="dark"` antes de `<body>`**; recuperación uniforme; cerrar sesión → S3 y ninguna ruta de producto sin volver a entrar
  - Cumple: FR-065; US-1, US-7; ADR-011 §2, fila 15.
  - Terminado cuando: pasa en el job `e2e` (T051) y se vio fallar con una ruta sin protección.

- [ ] T050 Registro y cobertura de axe: `tests/a11y/route-registry.ts` con cada ruta y estado y su `session: 'none' | 'user' | 'recovery'` según la tabla «Axe» de [contracts/ci.md](contracts/ci.md) (A5 con sesión de recuperación y A6 con sesión de usuario, en `e2e`); `tests/a11y/routes.a11y.ts` recorre la lista que toca a cada job, en los dos temas; **prueba de cobertura** en `tests/a11y/route-registry.test.ts` (Vitest `components`, entorno `node`): cada `page.tsx` de `src/app` está en **exactamente una** lista, las dos juntas cubren todas, cada entrada en los dos temas y ninguna entrada con sesión cae en `app`
  - Cumple: FR-067; SC-002; ADR-011 §5, enmienda «Axe en dos jobs».
  - Terminado cuando: la prueba de cobertura se vio fallar con una ruta sin clasificar y pasa; axe sin violaciones serias o críticas en las rutas de este PR en los dos jobs.

- [ ] T051 Crear el job `e2e` en `.github/workflows/ci.yml` ([contracts/ci.md](contracts/ci.md)): `supabase start` con Auth y Mailpit; `npm ci`; build con las variables del Supabase local; `npx playwright install --with-deps --only-shell chromium`; `test:e2e:smoke`; `test:a11y` de las entradas con sesión; tiempos contra < 3 min (aviso). El job `app` corre axe solo de las entradas sin sesión. `verify` y el resumen pasan la fila de E2E a «SOLO EN CI — pendiente de resultado · job e2e»
  - Cumple: FR-065, FR-066, FR-067; ADR-011 §5 y §9.
  - Terminado cuando: un run manual muestra `app`, `db` y `e2e` en verde sobre el mismo SHA.

### Grupo 2E — `[V]` del PR B

- [ ] T052 `[V]` Tema: CLS = 0 y ningún cuadro del tema contrario en las rutas reales de acceso y de Mi cuenta, con el arnés de `evidence-plan/` (cookie contraria al sistema, sin cookie, `system`); la escritura desde el perfil y los dos dispositivos los cubre T049
  - Cumple: SC-005 (acceso y Mi cuenta); US-7.4.
  - Terminado cuando: la salida por ruta, tema y caso está en `evidence.md`.

- [ ] T053 `[V]` Workers con usuarios aislados (ADR-011 [V] 3): ejecutar la spec 1 con 1, 2 y 4 workers en el job `e2e` y reportar duración y fallos
  - Cumple: FR-064.
  - Terminado cuando: la tabla de mediciones está en `evidence.md`; ningún techo se mueve.

- [ ] T054 **Humana** (gestor): 001-T072 parte 1 repetida tras el primer despliegue de producción con Supabase (las rutas pasan a ser dinámicas): `/interno/primitivos` da 404 en producción, en HTML y RSC (plan, «Verificaciones heredadas»)
  - Cumple: SC-011; decisión 12.
  - Terminado cuando: los códigos reales están en `evidence.md`.

- [ ] T055 **Humana** (dueña y después gestor): la dueña añade un commit propio a la rama del PR B (`git commit --allow-empty`, decisión 13, regla 3) para el **primer preview real**; **inmediatamente**, antes de que nadie lo use, el gestor ejecuta **001-T072 parte 2** con un alias `*.vercel.app` no productivo que asigna la dueña: un host no autorizado sobre el preview responde 404. Nunca el dominio de producción
  - Cumple: SC-011; decisión 12 (sin excepción posible).
  - Terminado cuando: los códigos reales están en `evidence.md` antes de que el preview se comparta.

### Grupo 2F — salida del PR B

- [ ] T056 Capturas a **390 y 1440 px en claro y oscuro** de las 7 pantallas de acceso, las 6 de Mi cuenta y la sesión caducada, en `specs/002-cuentas-y-gastos-privados/evidence/`
  - **Para aprobar viendo la pantalla** (propuestas §15.9 y pantallas nuevas): «Cuenta reutiliza los fondos de categoría»; la sesión caducada.
  - Cumple: SC-001 (B).
  - Terminado cuando: las capturas están nombradas por ruta, estado, ancho y tema.

- [ ] T057 **Pasada fija de Impeccable** (auditoría y crítica) sobre las pantallas del PR B a 390 y 1440 en los dos temas; hallazgos y correcciones en `evidence.md`. Impeccable verifica; no decide alcance ni dirección (`CLAUDE.md` 7)
  - Cumple: plan, «Paso fijo».
  - Terminado cuando: la salida y lo corregido están en `evidence.md`; una corrección que cambiaría alcance se reporta y no se aplica.

- [ ] T058 **Gate completo sobre el mismo commit**: `npm run verify` y el run de `app`, `db` y `e2e` del último commit; tiempos del humo y del gate contra presupuesto (avisan)
  - Cumple: ADR-011 §9.1.
  - Terminado cuando: las salidas son del mismo SHA y están en `evidence.md`.

- [ ] T059 Descripción del PR B y **revisión humana**: lo de T033 más capturas (T056), Impeccable (T057), los `[P]` para aprobar, «E2E specs added: 1 (spec 1)» y el copy nuevo listado para revisión en `es.ts`
  - Cumple: plan, PR B, «Criterios de salida»; SC-001 (aprobación de los dos fundadores).
  - Terminado cuando: los dos fundadores aprobaron la revisión visual y los `[P]` del PR, o el PR no se mergea.

**Checkpoint**: PR B mergeado.

---

## Phase 3: PR C · Anotar, editar y eliminar

**Purpose**: el Expense Flow conectado, E1–E5 en versión privada con el selector «Gasto · Ingreso», edición sin cambiar el tipo, eliminar, «Deshacer» de 6 s, detalle, ExpenseRow, Toast y la spec E2E 2 (plan, PR C).

### Grupo 3A — tests primero

- [ ] T060 [P] [US2] [US3] Test de **componentes** en `src/features/expenses/annotate-sheet.test.tsx`: foco en el monto; Guardar solo con monto y categoría; E2 sin «Pagó», «Participan» ni «Reparto» y contexto fijo en Yo; el selector de tipo cambia título, categoría («Ingresos» elegida) y botón; E4 bloquea los campos; un error de guardado deja la hoja abierta con los datos y reintenta **con la misma clave**; `JT001` muestra la sesión caducada sin perder lo escrito; `N` fuera de un campo, Enter guarda, Escape cierra; confirmación de cambios sin guardar
  - Cumple: FR-030–FR-033, FR-035, FR-036; US-2.1–2.3, US-2.7, US-3.1.
  - Terminado cuando: se vio fallar.

- [ ] T061 [P] [US3] Test de **componentes** en `src/components/ui/expense-row.test.tsx`: la fila de ingreso lleva «+», ficha arena, ícono `arrow-down-left` y tinta, no verde; la de gasto, tinta sin signo; nombre accesible completo (ADR-011 §2, fila 5)
  - Cumple: US-3.2; propuesta §15.9 «en tinta» (presentación; se aprueba viendo la pantalla).
  - Terminado cuando: se vio fallar.

- [ ] T062 [P] [US4] Test de **componentes** en `src/features/expenses/delete-dialog.test.tsx` y `src/features/expenses/edit-sheet.test.tsx`: el diálogo es `alertdialog` con foco inicial en Cancelar, Escape cancela y el foco vuelve; la edición no permite cambiar el tipo; `JT011` explica que cambió y ofrece recargar; `JT012` explica que ya se eliminó
  - Cumple: FR-038, FR-039; US-4.1, US-4.4, US-4.5; Q14, Q15.
  - Terminado cuando: se vio fallar.

### Grupo 3B — implementación (en serie)

- [ ] T063 Crear `src/components/ui/expense-row.tsx` y `src/components/ui/toast.tsx` según `COMPONENT_SPECIFICATIONS.md` §ExpenseRow y §Toast (variantes gasto e ingreso; Toast de 6 s con acción, pausa con hover y foco, `role="status"`/`"alert"`)
  - Claude Design: `02 Componentes`, 02·1.
  - Cumple: US-2.4, US-3.2.
  - Terminado cuando: T061 pasa.

- [ ] T064 [US2] [US3] Hoja de Anotar en `src/features/expenses/`, sustituyendo el aviso de la 001: `BottomSheet`/`Modal` con paradas, arrastre desde el asa y confirmación de cambios sin guardar (FR-031a de la 001); AmountInput; selector «Gasto · Ingreso»; categorías recientes por `my_recent_categories` + `fillRecentCategories`; fecha de hoy en Bogotá; clave de idempotencia al abrir; Server Action con `src/lib/db`; E5 con cierre, conteo del total, fila resaltada y Toast «Deshacer» que llama a `void_transaction` con `undo`; motion de `MOTION_SYSTEM.md` con alternativa de movimiento reducido
  - Claude Design: `02 Componentes`, 02·5 y 02·6.
  - Cumple: FR-030–FR-036, FR-062 (propuesta §15.9 aprobada en su versión privada, decisión 16.2; selector Q3).
  - Terminado cuando: T060 pasa.

- [ ] T065 [US4] Detalle del movimiento en `src/app/(app)/actividad/[id]/page.tsx` y `src/app/(app)/actividad/layout.tsx` (en ≥ 1024, panel de 04·7; en móvil, solo el detalle), con «Editar» y «Eliminar gasto»/«Eliminar ingreso»; edición en la hoja en modo edición con la `version` leída; diálogo de eliminar con `Modal` como `alertdialog`, que llama a `void_transaction` con `delete`
  - Claude Design: `04 Pantallas`, 04·1 (DETALLE, edición) y 04·7; `02 Componentes`, 02·1 (diálogo).
  - Cumple: FR-037, FR-038, FR-039; US-4.1–4.4.
  - Terminado cuando: T062 pasa y las rutas están en el registro de T050.

- [ ] T066 [US4] Test de **integración de servidor** en `tests/integration/money.test.ts` (si falta): editar un eliminado → `JT012`; «Deshacer» de punta a punta por `src/lib/db` deja el movimiento anulado con auditoría `reason = 'undo'`
  - Cumple: FR-018, FR-034; US-2.5; spec, caso límite «Editar un movimiento ya eliminado».
  - Terminado cuando: pasa en el job `db`.

### Grupo 3C — spec E2E 2 y `[V]`

- [ ] T067 [US2] **Spec E2E 2** «Anotar gasto, cronometrado» en `tests/e2e/annotate.e2e.ts`: con sesión y dataset sembrados, `N` → monto → categoría reciente → Guardar → total sube, fila resaltada, Toast; doble toque en Guardar → **un solo movimiento**, comprobado por la base (SC-009); el tiempo del recorrido se reporta como laboratorio; **un test con motion activo** para los momentos L2 de E5. Ver la brecha G1 del informe del PR antes de escribir las aserciones de total y fila
  - Cumple: FR-065; US-2; SC-009; ADR-011 §2, fila 14.
  - Terminado cuando: pasa en el job `e2e` junto con la spec 1.

- [ ] T068 Añadir al registro de T050 Anotar (hoja y diálogo), el detalle y la edición, con sesión, en los dos temas
  - Cumple: FR-067; SC-002.
  - Terminado cuando: la prueba de cobertura pasa y axe no tiene violaciones serias o críticas.

- [ ] T069 `[V]` INP < 200 ms al abrir Anotar y al guardar, en laboratorio (Playwright con `PerformanceObserver` de `event` y CPU 4×), a 390 y 1440, **reportado como laboratorio**
  - Cumple: SC-004; maestro §15.7.
  - Terminado cuando: los valores están en `evidence.md`.

- [ ] T070 `[V]` **Humana** (fundadores): altura del teclado nativo con la hoja en iPhone (el teclado no tapa el monto ni Guardar); en Android, la misma comprobación y la máscara de COP con al menos un teclado de terceros (§15.6.2, 3), **o** una excepción formal con el formato de T093 si no hay Android
  - Cumple: `RESPONSIVE_SPECIFICATIONS.md` `[V]`; decisión 11.
  - Terminado cuando: el resultado por dispositivo, o la excepción aprobada, está en `evidence.md`.

### Grupo 3D — salida del PR C

- [ ] T071 Capturas a **390 y 1440 px en claro y oscuro**: E1 gasto, E1 ingreso, E2, E3, E4, E5 con el Toast, detalle, edición y diálogo de eliminar
  - **Para aprobar viendo la pantalla**: «Gasto, ingreso y liquidación en tinta» (fila e ingreso); el selector «Gasto · Ingreso» (Q3); la versión privada de E1–E5.
  - Cumple: SC-001 (C).
  - Terminado cuando: las capturas están en `evidence/`.

- [ ] T072 **Pasada fija de Impeccable** sobre las pantallas del PR C, como T057
  - Terminado cuando: la salida y lo corregido están en `evidence.md`.

- [ ] T073 **Gate completo sobre el mismo commit** (`verify`, `app`, `db`, `e2e` con las specs 1 y 2), como T058
  - Terminado cuando: las salidas son del mismo SHA y están en `evidence.md`.

- [ ] T074 Descripción del PR C y **revisión humana**, como T059, con «E2E specs added: 1 (spec 2); total 2»
  - Cumple: plan, PR C, «Criterios de salida».
  - Terminado cuando: los fundadores aprobaron la revisión visual y los `[P]` del PR.

**Checkpoint**: PR C mergeado. Desde aquí se puede registrar un movimiento real, **pero no antes de T094** (SC-010).

---

## Phase 4: PR D · Inicio, Actividad, exportación y verificaciones heredadas

**Purpose**: Inicio en Yo, Nosotros «todavía no disponible», Actividad por mes, estados, la descarga real de Exportar, la retirada del aviso de versión base y el cierre de las verificaciones heredadas (plan, PR D).

### Grupo 4A — tests primero

- [ ] T075 [P] [US6] Ampliar el test de **dominio** de T009: `monthBounds` con movimientos futuros (llega al más lejano y no más, Q13); `groupByDay`; búsqueda sin distinguir tildes ni mayúsculas
  - Cumple: FR-046, FR-047; US-6.2–6.4.
  - Terminado cuando: se vio fallar y pasa.

- [ ] T076 [P] [US5] Test de **componentes** en `src/features/home/home.test.tsx`: con las filas del dataset dorado, Inicio muestra **412.900** y el desglose de la tabla (SC-008); no aparece «presupuesto», «restante», «excedido», «Tu parte compartida» ni barras de límite; vacío sin «$0»; error con Reintentar; Nosotros sin ninguna cifra
  - Cumple: FR-040, FR-041, FR-042, FR-043; US-5.1–5.4, US-5.6; SC-008.
  - Terminado cuando: se vio fallar.

- [ ] T077 [P] [US8] Test de **integración de servidor** en `tests/integration/export.test.ts`: solo movimientos activos propios, importes como texto, sin tokens ni identificadores ni anulados; CSV RFC 4180 con BOM y `'` delante de `= + - @`; Tomás nunca recibe filas de Sara; sin sesión, 401; formato no válido, 400 (ADR-011 §2, fila 2)
  - Cumple: FR-057; US-8.2.
  - Terminado cuando: se vio fallar en el job `db`.

### Grupo 4B — implementación (en serie)

- [ ] T078 [US5] Inicio en `src/features/home/` y `src/app/(app)/page.tsx`: gasto del mes, desglose por categoría y últimos movimientos (04·1 INICIO · YO sin bloques compartidos), escritorio de 04·7 sin módulos compartidos, `src/app/(app)/loading.tsx` con el Skeleton de la geometría final; Nosotros «todavía no disponible» en Inicio, Actividad, Metas, Plan y Balance; retirar el aviso de versión base de la 001
  - Claude Design: `04 Pantallas`, 04·1, 04·6 y 04·7.
  - Cumple: FR-040–FR-045 (pantallas nuevas de Q5, se aprueban viendo la pantalla); US-5.
  - Terminado cuando: T076 pasa.

- [ ] T079 [US6] Actividad en `src/features/activity/` y `src/app/(app)/actividad/page.tsx`: `?mes=AAAA-MM`, resumen del mes, flechas con los límites de `monthBounds`, lista por día, búsqueda y filtros de tipo y categoría en cliente, tabla de 1440 sin «Pagó·Reparto» con el panel de T065, vacío con texto privado y error
  - Claude Design: `04 Pantallas`, 04·1 (ACTIVIDAD), 04·6 y 04·7.
  - Cumple: FR-046–FR-049 (flechas de Q8, se aprueban viendo la pantalla); US-6.
  - Terminado cuando: T075 pasa y la ruta está en el registro.

- [ ] T080 [US8] Exportación: `src/app/api/export/route.ts` y `src/lib/db/export.ts` según [contracts/database.md](contracts/database.md), «Exportación»; Exportar D2–D5 en `privacidad` con `fetch`, D3, D4 con Descargar y D5 si la respuesta no es 200; la aclaración de que no restaura
  - Claude Design: `04 Pantallas`, 04·16 (D2–D5).
  - Cumple: FR-057; US-8.1, US-8.3.
  - Terminado cuando: T077 pasa.

- [ ] T081 [US8] Añadir a la **spec E2E 1** (`tests/e2e/access-account.e2e.ts`) el caso de **descarga de Exportar**: el archivo llega (evento de descarga, nombre y tamaño), **sin abrir su contenido** (ADR-011 §3, matriz)
  - Cumple: FR-065; `docs/TESTING.md`, «Matriz de recorridos».
  - Terminado cuando: pasa en el job `e2e`.

- [ ] T082 Añadir al registro de T050 Inicio (Yo y Nosotros), Actividad (mes con datos, vacío y futuro), el detalle a 1440 y Exportar, con sesión, en los dos temas
  - Cumple: FR-067; SC-002.
  - Terminado cuando: la prueba de cobertura pasa y axe no tiene violaciones serias o críticas en todas las rutas implementadas.

### Grupo 4C — `[V]` del PR D

- [ ] T083 `[V]` CLS = 0 con el Skeleton en Inicio y Actividad (arnés de `evidence-plan/`, con tema guardado); sin scroll horizontal a 360, 390, 430, 768, 1024, 1280 y 1440 en los dos temas en todas las rutas nuevas; objetivos táctiles ≥ 44 px a 390 y 1440; texto al 200 % sin pérdida
  - Cumple: SC-001, SC-005; FR-061; maestro §15.7.
  - Terminado cuando: la salida por ruta, ancho y tema está en `evidence.md`, o el umbral que no se cumple con su número real.

- [ ] T084 `[V]` **Humana** (fundadores): mediana de US-12 en el teléfono real de un fundador tras A6, con al menos 10 registros de gastos habituales y el método (cronómetro o grabación), en producción después de T094 o contra `juntia-dev`
  - Cumple: SC-003; US-2.8.
  - Terminado cuando: los tiempos, la mediana y el método están en `evidence.md`.

### Grupo 4D — verificaciones heredadas de la decisión 12

Copiadas de la tabla de la spec (y del plan). Ninguna se presenta como superada sin salida.

- [ ] T085 **Humana** (fundadores, con sesión en Vercel): **001-T072 parte 3**, funcionamiento en preview: `/interno/primitivos` da 200 por la URL de despliegue y por la de rama. En el PR B o C; obligatoria antes de aceptar. Sin excepción posible
  - Terminado cuando: los códigos reales están en `evidence.md`.

- [ ] T086 **Humana** (fundadores): **001-T073**, contraste de los pares de texto y fondo en un iPhone, en los dos temas. Se puede adelantar desde el PR B; a más tardar aquí. Sin excepción posible
  - Terminado cuando: los valores medidos y la herramienta están en `evidence.md`.

- [ ] T087 **Humana** (fundadores): **001-T074**, sombras táctiles en un Android de gama media. Admite excepción formal (T093) si no hay Android
  - Terminado cuando: el dispositivo y la observación, o la excepción aprobada, están en `evidence.md`.

- [ ] T088 **Humana** (fundadores): **001-T075 · VoiceOver** con el flujo real de Anotar (apertura, campos, guardado, Toast y Deshacer, retorno del foco). En el PR C o aquí. Sin excepción posible
  - Terminado cuando: lo que anunció el lector, por punto, está en `evidence.md`.

- [ ] T089 **Humana** (fundadores): **001-T075 · TalkBack** con el flujo real de Anotar. Admite excepción formal si no hay Android
  - Terminado cuando: el resultado, o la excepción aprobada, está en `evidence.md`.

- [ ] T090 **Humana** (gestor): **CLS = 0 fuera de Chromium**, Firefox y WebKit con el arnés de R2, en local con `npx playwright install firefox webkit` (sin Docker). Sin excepción posible
  - Terminado cuando: la salida por ruta y navegador está en `evidence.md`.

- [ ] T091 **Humana** (fundadores): **CLS en un iPhone real** con el inspector web de Safari. Admite excepción formal si no hay Mac
  - Terminado cuando: la medición, o la excepción aprobada, está en `evidence.md`.

- [ ] T092 **Humana** (fundadores): **respaldo tipográfico de Onest en Android**. Admite excepción formal si no hay Android
  - Terminado cuando: la observación con captura, o la excepción aprobada, está en `evidence.md`.

- [ ] T093 Registrar cada **excepción formal** que se use (solo T070 en su parte de Android, T087, T089, T091 y T092) en `evidence.md` con sus cinco datos y el estado **«EXCEPCIÓN APROBADA»**, nunca «verificado»: la verificación que no se ejecutó; el motivo; el riesgo residual; la mitigación (por ejemplo, axe y la emulación de Android en Chrome, que no la sustituyen); quién la revalida y cuándo, a más tardar antes del lanzamiento MVP-1. La aprueban **los dos fundadores** antes de aceptar P0-1 (decisión 12)
  - Cumple: SC-011; ADR-011 §8.
  - Terminado cuando: cada excepción tiene los cinco datos y la aprobación de los dos fundadores, o no hay ninguna.

### Grupo 4E — datos reales y salida del PR D

- [ ] T094 **Humana** (un fundador), **después del merge del PR C y antes del primer movimiento real**: primera copia real con `scripts/backup.sh` (quickstart §4.1, modo producción, etiqueta `db-prod-*`) y su **restauración real en un PostgreSQL 17 normal** del equipo con `scripts/restore-plain.sh` (quickstart §4.3), solo si el camino B tiene salida verde del job `db` (T030); se pegan el manifiesto y el log, sin datos. Después, la copia semanal con el mismo comando. **Sin esta salida, no se anota ningún dato real**
  - Cumple: FR-059; US-10.1–10.4; SC-010; Q11.
  - Terminado cuando: el manifiesto, el log con `exit=0` y la base temporal borrada están en `evidence.md` con fecha anterior al primer movimiento real.

- [ ] T095 Capturas a **390 y 1440 px en claro y oscuro**: Inicio con datos, vacío, cargando y error; Nosotros; Actividad con datos, mes vacío, mes futuro, búsqueda y filtros; tabla y panel a 1440; Exportar D2–D5
  - **Para aprobar viendo la pantalla**: «en tinta» en Inicio y Actividad; Inicio sin pareja y sus estados (Q5); Nosotros «todavía no disponible» (Q5); las flechas de mes (Q8).
  - Cumple: SC-001 (D).
  - Terminado cuando: las capturas están en `evidence/`.

- [ ] T096 **Pasada fija de Impeccable** sobre las pantallas del PR D, como T057
  - Terminado cuando: la salida y lo corregido están en `evidence.md`.

- [ ] T097 **Gate completo sobre el mismo commit** (`verify`, `app`, `db`, `e2e` con las specs 1 y 2), como T058
  - Terminado cuando: las salidas son del mismo SHA y están en `evidence.md`.

- [ ] T098 Descripción del PR D y **revisión humana**, como T059, con «E2E specs added: 0 (spec 1 gains the export download case); total 2» y el estado de cada fila de la decisión 12
  - Cumple: plan, PR D, «Criterios de salida».
  - Terminado cuando: los fundadores aprobaron la revisión visual y los `[P]` del PR.

---

## Phase 5: Aceptación de P0-1

**Purpose**: la aceptación del slice con cada criterio de éxito respaldado por salida real, la salida interna de los fundadores y el registro del cierre de F0-b. Se hace en el PR D, antes de su merge, o en un PR documental inmediatamente después si la aprobación de los fundadores llega más tarde.

- [ ] T099 Tabla «Aceptación de la 002» en `evidence.md`: **SC-001 a SC-011**, cada uno con la tarea que lo midió y su salida (SC-001: T056, T071, T083, T095; SC-002: T050, T068, T082; SC-003: T084; SC-004: T069; SC-005: T052, T083; SC-006: T015, T020, T021, T025 y R3 de la research para la [V] 10; SC-007: T019, T025; SC-008: T010, T025, T076; SC-009: T025, T067; SC-010: T094; SC-011: T054, T055, T085–T093)
  - Terminado cuando: ninguna fila queda sin salida real o «EXCEPCIÓN APROBADA» donde la tabla de la decisión 12 la admite.

- [ ] T100 **Humana** (los dos fundadores): **SC-012**, salida interna: registran, editan y eliminan movimientos reales y los entienden sin ayuda (maestro §11); aprobación registrada en `evidence.md` con fecha y observaciones
  - Terminado cuando: los dos aprobaron por escrito.

- [ ] T101 Comprobación final de alcance sobre `package.json`, `src/`, `supabase/` y `tests/`, con la salida pegada: sin dependencias de research R8.12; `git grep -nE "service_role|SUPABASE_SECRET_KEY" -- src` vacío; ningún correo real en `supabase/`; dos specs E2E en `tests/e2e/`; lista de pruebas (`npx vitest list`, `npx playwright test --list`, archivos de `supabase/tests/`) igual a la del Anexo A
  - Cumple: FR-011, FR-065; `docs/TESTING.md` §7.
  - Terminado cuando: cada comando y su salida están en `evidence.md`.

- [ ] T102 Registrar el **cierre de F0-b** en el maestro §15.1 («F0-b se cierra cuando la 001 y la especificación de P0-1 estén aceptadas») y la aceptación de la 002 en su estado, en un commit documental del gestor, solo después de T099 y T100
  - Terminado cuando: §15.1 dice que la 002 está aceptada con fecha y enlace a `evidence.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (PR A)** no depende de nada. Dentro: 1A → 1B → 1C (T012 → T013 → T014 → **T015**) → T016 → 1D (T017 → T018 → T019 → **T020**) → 1E → 1F → 1G. **Ninguna tarea de 1E empieza antes de T020.**
- **Phase 2 (PR B)** empieza con el PR A mergeado. 2A (Humana) antes de cualquier prueba en `juntia-dev` o producción; 2B → 2C → 2D → 2E → 2F. T055 en cuanto exista el primer preview.
- **Phase 3 (PR C)** empieza con el PR B mergeado.
- **Phase 4 (PR D)** empieza con el PR C mergeado. T094 se ejecuta **antes del primer dato real**, que puede ser antes de empezar el PR D.
- **Phase 5** después de T098 y de las tareas humanas de la decisión 12.

### User Story Dependencies

- US9 (aislamiento) y US10 (copia) son del PR A y bloquean el uso real de todas las demás.
- US1 y US7 (PR B) dan la sesión que necesitan US2–US6 y US8.
- US2, US3 y US4 (PR C) dan los movimientos que muestran US5 y US6 (PR D). US8 (exportar) usa los movimientos de C y la pantalla de B.
- US11 (verificaciones heredadas) se reparte entre B, C y D y se cierra en D.

### Dentro de cada fase

Tests antes que la implementación que prueban; migración antes que las pruebas de integración que la usan; ningún punto de control se salta.

### Parallel Opportunities

Solo dentro de un mismo grupo y PR: T008–T011 (dominio y copy); T038–T040 (tests de acceso y cuenta); T060–T062 (tests de Anotar); T075–T077 (tests de D). Las implementaciones de cada PR van en serie: comparten `es.ts`, el layout o el shell. Ninguna tarea que use el CI, sirva la app o ejecute `npm ci` es paralela.

---

## Parallel Example: Grupo 1B

```bash
# A la vez, después del grupo 1A:
Task: "T008 Test de dominio de Money y src/domain/money/"
Task: "T009 Test de dominio de movimientos y src/domain/transactions/"
Task: "T010 Dataset dorado y su test"
Task: "T011 Claves de error y categorías en es.ts"
```

---

## Implementation Strategy

### Cuatro PR de implementación, en serie — decisión de los fundadores (Clarify Q1; decisión 16.1)

**Quién implementa cada PR** (asignación operativa de los fundadores, no alcance): un PR que necesita mirar los comps de Claude Design lo implementa **Claude Code**; el resto, **Codex o Claude Code**.

| PR | Contenido | Agente |
| --- | --- | --- |
| **A** · base de datos, seguridad y dinero (sin interfaz) | T001–T033 | **Codex o Claude Code** |
| **B** · acceso y Mi cuenta | T034–T059 | **Claude Code** (04·14–04·19 y 02·9–02·10, más la pasada de Impeccable) |
| **C** · Anotar, editar y eliminar | T060–T074 | **Claude Code** (02·5, 02·6, 02·1, 04·1 y 04·7, más Impeccable) |
| **D** · Inicio, Actividad, exportación y heredadas | T075–T098 | **Claude Code** (04·1, 04·6, 04·7 y 04·16, más Impeccable) |

Reglas de la partición:

1. **Cada PR parte de `main` actualizado** después del merge del anterior; ninguno depende de una rama sin mergear. Rama propia (`docs/CONVENTIONS.md` B.4).
2. **Ningún PR adelanta tareas de otro** ni deja una suya a medias.
3. **Cada PR pasa el gate completo sobre el mismo commit** (`verify` + jobs de CI, ADR-011 §9.1) y para en la revisión humana (`AGENTS.md` 17).
4. Cada PR de interfaz (B, C, D) lleva capturas a 390 y 1440 en los dos temas, la pasada fija de Impeccable y la lista de `[P]` para aprobar viendo la pantalla.

### Controles de CI por PR

| Control | A | B | C | D |
| --- | --- | --- | --- | --- |
| `verify` (lint, typecheck, `domain`, `components`; SQL/RLS e integración «SOLO EN CI») | Corre | Corre | Corre | Corre |
| `app` (build, axe de estados sin sesión, `check:internal-surface`, `check:theme-script`) | Corre | Corre | Corre | Corre |
| `db` (pgTAP, integración, tipos, ensayo de restauración con sus nueve controles negativos) | **Entra** | Corre | Corre | Corre |
| `e2e` (specs E2E existentes, axe de estados con sesión) | No aplicable, nace en B | **Entra** con la spec 1 | Specs 1 y 2 | Specs 1 y 2 (1 con la descarga) |

### Qué no se hace en ningún punto

Docker en un equipo; `service_role` en la app; datos reales en CI; una tercera spec E2E; una prueba que no está en el Anexo A sin plantearla; un `[V]` cerrado sin salida; una decisión nueva dentro de un PR de código.

---

## Notes

- `[P]` = archivos distintos y ninguna dependencia dentro de su grupo y PR. Nunca significa «propuesta» en este archivo.
- Las tareas que tocan un elemento propuesto lo nombran en palabras: «propuesta §15.9» (aprobados por la decisión 16) o «para aprobar viendo la pantalla» (T056, T071, T095).
- Un `[V]` cerrado sin salida real es un defecto del PR, no una omisión menor.

---

## Anexo A — Auditoría de las tareas de test (ADR-012 §4)

**Cómo se hizo.** Las tareas de test salen **de la tabla «Pruebas por capa» de cada PR del plan**, no de la heurística de la skill («un contract test por contrato»). Se comprobó cada una contra la matriz de `docs/TESTING.md` §4. **No se retira ninguna**: ninguna se generó por la heurística, y los tres archivos de `contracts/` no tienen contract test propio porque lo que fijan ya lo prueban pgTAP, la integración o el lint (A.2). Con esto, la 002 **no** repite el caso de la 001 (retiradas por la heurística) que obligaría a evaluar un preset (ADR-012 §4, punto 3).

### A.1 Tareas de test

| # | Tarea | Archivo | Capa | Criterio | Por qué esta capa es la más baja |
| --- | --- | --- | --- | --- | --- |
| C1 | T005 | `tests/lint-rules.test.ts` | Lint con la API de ESLint | FR-010, FR-011 | La regla es de lint; se prueba linteando fixtures |
| C2 | T008 | `src/domain/money/money.test.ts` | Dominio | FR-008, FR-012 | Aritmética y conversión puras |
| C3 | T009, T075 | `src/domain/transactions/transactions.test.ts` | Dominio | FR-013–FR-015, FR-019, FR-046, FR-047 | Reglas de tipo, mes, resumen y flechas sin persistencia |
| C4 | T010 | `src/domain/golden/october-2026.test.ts` | Dominio | FR-020; SC-008 | Es el dataset contra la función (ADR-011 §2, fila 7) |
| C5 | T040 | `src/domain/account/account.test.ts` | Dominio | FR-027, FR-051 | Validaciones puras |
| C6 | T012, T017, T021 | `supabase/tests/01`–`09_*.test.sql` | SQL/RLS (pgTAP) | FR-002–FR-007, FR-013, FR-016–FR-018, FR-024; ADR-013 [V] 1, 2, 6–9 | Autorización, privilegios e invariantes: «el ataque no usa el botón» |
| C7 | T014, T019 | `tests/integration/foundation.test.ts` (+ `controlled-tables.test.ts`) | Integración de servidor | FR-002, FR-004, FR-005; ADR-013 [V] 2; condición 2 de la decisión 1 | Es la prueba con el cliente real que exige la decisión 1: que PostgREST no amplía lo que la política permite |
| C8 | T025, T066 | `tests/integration/money.test.ts` | Integración de servidor | FR-006, FR-016, FR-017, FR-034, FR-036; SC-007–SC-009; ADR-013 [V] 3–6 | Concurrencia, idempotencia y atomicidad necesitan dos clientes simultáneos (ADR-011 §2, filas 11–13) |
| C9 | T023 | `src/lib/db/types.test.ts` | Tipos | FR-008; ADR-013 §4.3 | Es una afirmación de tipos en compilación |
| C10 | T024 | `src/lib/db/errors.test.ts` | Unidad (`components`, `node`) | FR-060; contracts/errors.md | Traducción pura de códigos |
| C11 | T030 | `scripts/restore-drill.sh` (nueve controles negativos) | Ensayo en el job `db` | FR-059; US-10 | La restauración real solo se ve contra una base; sin Docker, solo en el runner |
| C12 | T038 | `src/features/auth/auth-errors.test.ts` | Componentes | FR-023 | Que respuestas distintas produzcan la misma salida es presentación |
| C13 | T039 | `src/features/account/*.test.tsx` | Componentes (RTL) | FR-051, FR-052, FR-055 | Teclado, ARIA y cookie del selector en el DOM |
| C14 | T041 | `tests/integration/auth.test.ts` | Integración de servidor | FR-021, FR-024, FR-029; F37-7 | La contraseña mínima y el enlace de `/auth/confirm` los aplica Auth, no la pantalla |
| C15 | T045 | `src/lib/theme-script.test.ts` y `scripts/check-theme-script.mjs` | Unidad + HTTP contra el build | FR-052; SC-005 | Lógica del script y su posición en el HTML servido (B17 y B18 de la 001) |
| C16 | T049, T081 | `tests/e2e/access-account.e2e.ts` | **Spec E2E 1** | FR-065; US-1, US-7, US-8 (descarga) | Recorridos con sesión, redirección, correo y dos contextos (ADR-011 §2, fila 15; §3, matriz) |
| C17 | T050, T068, T082 | `tests/a11y/routes.a11y.ts` y `tests/a11y/route-registry.test.ts` | Axe por ruta + cobertura (`node`) | FR-067; SC-002 | axe necesita árbol real; la cobertura es una comparación de listas |
| C18 | T060–T062 | `src/features/expenses/*.test.tsx`, `src/components/ui/expense-row.test.tsx` | Componentes (RTL) | FR-030–FR-039; US-3.2 | Foco, teclado y lo que «se presenta» (ADR-011 §2, fila 5) |
| C19 | T067 | `tests/e2e/annotate.e2e.ts` | **Spec E2E 2** | FR-065; US-2; SC-009 | US-12 y el doble toque son de la experiencia completa (ADR-011 §2, fila 14) |
| C20 | T076 | `src/features/home/home.test.tsx` | Componentes (RTL) | FR-040–FR-043; SC-008 | Que 412.900 **se presenta** y que no aparece ningún límite |
| C21 | T077 | `tests/integration/export.test.ts` | Integración de servidor | FR-057 | El contenido del archivo es serialización con autorización (ADR-011 §2, fila 2) |

### A.2 Lo que no tiene tarea de test propia, a propósito

| Qué | Dónde queda cubierto |
| --- | --- |
| Contract test de `contracts/database.md` | C6, C7, C8, C21 |
| Contract test de `contracts/errors.md` | C10, C12 |
| Contract test de `contracts/ci.md` | La ejecución real del CI y su salida (T032, T058, T073, T097) |
| CLS, INP, scroll horizontal, objetivos táctiles, US-12 en teléfono | Mediciones de PR con salida (T052, T069, T083, T084), no suite (plan; ADR-011 §5, nivel 2) |
| Composición visual, «en tinta», copy | Revisión humana con capturas e Impeccable (ADR-011 §7) |

**Specs E2E que añade la 002: 2** (spec 1 y spec 2). La sexta plaza sigue libre.

---

## Anexo B — Cobertura de requisitos y criterios de éxito

### B.1 Requisitos funcionales

| Req. | Implementan | Verifican |
| --- | --- | --- |
| FR-001 | T001, T002, T013 | T015, T032 |
| FR-002 | T013 | T012, T014, T015 |
| FR-003 | T018, T022 | T017, T020 |
| FR-004 | T013, T018 | T012, T014, T017, T019 |
| FR-005 | T013 | T014, T016 |
| FR-006 | T022, T024 | T021, T025 |
| FR-007 | T018 | T017, T021 |
| FR-008 | T018, T023, T024 | T008, T021, T023, T025 |
| FR-009 | T023 | T023 (`db:types:check`) |
| FR-010 | T023, T024 | T005 |
| FR-011 | T005, T037 | T005, T101 |
| FR-012 | T008 | T008 |
| FR-013 | T018, T022, T026 | T009, T017, T021 |
| FR-014 | T009, T013 | T009, T021 |
| FR-015 | T009, T018 | T009 |
| FR-016 | T022 | T021, T025 |
| FR-017 | T022 | T021, T025 |
| FR-018 | T018, T022 | T017, T021, T066 |
| FR-019 | T009 | T009, T010 |
| FR-020 | T010 | T010, T025 |
| FR-021 | T002, T036, T043 | T041, T049 |
| FR-022 | T044 | T049, T056 |
| FR-023 | T038, T043 | T038, T049 |
| FR-024 | T002, T003, T013, T036 | T012, T041, T049 |
| FR-025 | T044 | T056, T059 |
| FR-026 | T042 | T049 |
| FR-027 | T042 | T040, T049 |
| FR-028 | T043, T046 | T049 |
| FR-029 | T013, T043 | T012, T041 |
| FR-030–FR-033 | T064 | T060, T067 |
| FR-034 | T022, T064 | T021, T066 |
| FR-035 | T064 | T060 |
| FR-036 | T064 | T025, T060, T067 |
| FR-037–FR-039 | T065 | T062 |
| FR-040–FR-045 | T078 | T076, T095 |
| FR-046–FR-049 | T079 | T075, T095 |
| FR-050–FR-056 | T046 | T039, T049, T056 |
| FR-057 | T080 | T077, T081 |
| FR-058 | T034–T037 | T035, T036 |
| FR-059 | T027–T030 | T030, T094 |
| FR-060 | T011, T024 | T024, revisión humana de cada PR |
| FR-061 | T046, T064, T078, T079 | T083 |
| FR-062 | T064 | T067 (test con motion activo) |
| FR-063 | T006, T007 | T032 |
| FR-064 | T048 | T053 |
| FR-065 | T049, T051, T067, T081 | T058, T073, T097 |
| FR-066 | T051 | T073, T097 |
| FR-067 | T045, T050 | T050, T068, T082 |

### B.2 Criterios de éxito

| SC | Tareas |
| --- | --- |
| SC-001 | T056, T071, T083, T095 |
| SC-002 | T050, T068, T082 |
| SC-003 | T084 |
| SC-004 | T069 |
| SC-005 | T052, T083 |
| SC-006 | T015, T020, T021, T025; [V] 10 en research R3 |
| SC-007 | T019, T025 |
| SC-008 | T010, T025, T076 |
| SC-009 | T025, T067 |
| SC-010 | T094 |
| SC-011 | T054, T055, T085–T093 |
| SC-012 | T100 |
