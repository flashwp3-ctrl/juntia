# Implementation Plan: 002 · Cuentas y gastos privados (P0-1)

**Branch**: `docs/spec-002-plan` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5) | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-cuentas-y-gastos-privados/spec.md`, mergeada en `main` por el PR #35, más la decisión 17 (ADR-011 §9), sobre la que se corta esta rama.

**Status**: Draft — fase Plan. No avanza a Tasks sin el merge de su PR documental (ADR-012 §3.1). Este archivo no contiene `tasks.md`.

> **Qué es este documento.** Dice **cómo** se construye lo que la spec ya fijó.
> No amplía alcance ni decide nada que no sea local y reversible: lo que es una
> **decisión del plan** se marca así para que el revisor la pueda objetar. En
> este archivo, `[P]` significa **propuesta** y `[V]` **verificación pendiente**
> (maestro §15.9).

## Summary

P0-1 conecta Juntia a Supabase por primera vez: cuentas con correo y
contraseña restringidas a una lista permitida, perfil y tema persistidos,
movimientos privados (gastos e ingresos) con dinero exacto, Anotar E1–E5
conectado al servidor, editar y eliminar con auditoría, Inicio sin presupuesto,
Actividad por mes, Mi cuenta, exportación y la copia de seguridad que habilita
los datos reales. Se entrega en **cuatro PR seguidos (A–D)**, como fijó Clarify
Q1.

Enfoque técnico, con lo verificado en [research.md](research.md):

- **ADR-013 tal cual, con una nota de implementación**: tres esquemas,
  `juntia_writer` dueño de las funciones que escriben y RLS aplicada dentro de
  ellas. El preflight encontró que esas funciones no pueden nombrar
  `auth.uid()`; usan la auxiliar `juntia_private.current_uid()` (research R1;
  enmienda de ADR-013 §2.3 en esta rama).
- **`@supabase/ssr` 0.12.7 + `@supabase/supabase-js` 2.118.0**, sesión validada con
  `getClaims()` (JWT ES256) en `src/proxy.ts`; Server Components para leer y
  Server Actions para escribir; sin ORM, sin TanStack Query, sin RHF ni Zod
  (research R8.12).
- **Dinero en `bigint`**, texto en toda frontera; reglas y totales en
  `src/domain/` puro, probados con el dataset dorado de octubre (412.900).
- **Lista permitida por el hook Before User Created**, validada en la base
  (research R4). La enumeración por la API cruda queda como **riesgo aceptado
  hasta MVP-1** (decisión 16.16); las pantallas no enumeran.
- **Tema en `profiles` y en la cookie `juntia_theme`, leída por el script
  bloqueante**: verificado en local sin destello, CLS = 0 y sin errores de
  hidratación (research R7).
- **Sin Docker en los equipos**: SQL/RLS, integración y E2E corren solo en CI,
  en los jobs `db` (desde el PR A) y `e2e` (desde el PR B); `verify` local los
  declara «SOLO EN CI — pendiente de resultado» (ADR-011 §9).
- **Dos specs E2E**: la 1 nace en el PR B y la 2 en el PR C (tope de ADR-011 §3).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`) sobre Node 24 LTS; SQL y PL/pgSQL sobre PostgreSQL 17.11 (stack local de la CLI).

**Primary Dependencies**: las de la 001 (Next 16.4.4, React 19.3.1, Motion 14.9.0, Phosphor 2.1.10, Radix Dialog 1.3.1, Tailwind 4.3.4), más `@supabase/supabase-js` **2.118.0** (2026-10-15) y `@supabase/ssr` **0.12.7**. Supabase CLI **2.121.0** (2026-10-14) en CI con `supabase/setup-cli@v3` y en los equipos con `npx --yes supabase@2.121.0`. Stack local: Postgres 17.11, PostgREST v16.4, GoTrue v2.197.0 (research R3).

**Storage**: Supabase PostgreSQL. Producción: proyecto Free de la segunda fundadora, São Paulo (Q10). Desarrollo: `juntia-dev` (`itfrhnadovezpahikuol`), sin datos reales (decisión 17). Pruebas: Supabase local dentro del runner de CI. Navegador: cookie `juntia_theme` (no sensible) y `localStorage["juntia:context"]` de la 001.

**Testing**: Vitest 5.1.0 — proyectos `domain`, `components` y, nuevo, `integration` (solo CI). pgTAP con `supabase test db` (solo CI). Playwright 1.64.1 + `@axe-core/playwright` 4.14.0, solo Chromium, proyectos `a11y` y `e2e`.

**Target Platform**: navegadores modernos, móvil (iOS Safari, Chrome Android) y escritorio; Vercel Hobby (maestro §7.1; decisión 13).

**Project Type**: aplicación web, monolito modular Next.js. Sin monorepo.

**Performance Goals**: maestro §15.7 — CLS = 0 en las cargas con Skeleton de Inicio y Actividad y en acceso y Mi cuenta; INP < 200 ms al abrir Anotar y al guardar (laboratorio); mediana < 10 s para un gasto habitual en teléfono real (US-12). Presupuestos de ADR-011 §4, que hasta el cierre de P0-2 avisan.

**Constraints**: sin Docker en los equipos; importes nunca como `number`; ninguna clave de servicio en caminos que atienden a una persona; 360–1440 px sin scroll horizontal (390 y 1440 obligatorios); objetivos táctiles ≥ 44 px; `prefers-reduced-motion`; texto al 200 %; todo el copy en `src/lib/copy/es.ts`; correo integrado de 2 envíos por hora.

**Scale/Scope**: 2 personas; del orden de cientos de movimientos al año por persona. Rutas nuevas: 6 de acceso, Inicio y Actividad reales, detalle de movimiento, 6 de Mi cuenta, 1 route handler de exportación y 1 de confirmación. 3 migraciones, 7 funciones de entrada, 4 vistas.

## Constitution Check — comprobación de jerarquía

*GATE: debe pasar antes de la investigación de la Fase 0 y se repite después del
diseño de la Fase 1.* La constitución es un puntero (ADR-012 §3.4): esta sección
comprueba la jerarquía de `AGENTS.md` §2.

**Fuentes leídas antes de rellenarla:** `AGENTS.md` (§2, §2b), `CLAUDE.md`, el
maestro (§5, §7, §10, §11 P0-1 y §15 con §15.10, decisiones 1–17 y «Dataset
dorado»), ADR-011 con §5, §8 y §9, ADR-012 (§2 y §3), ADR-013, `docs/TESTING.md`,
`docs/CONVENTIONS.md`, `docs/GLOSSARY.md`, `docs/design/HANDOFF_CLAUDE_CODE.md`,
`docs/design/COMPONENT_SPECIFICATIONS.md`, `DESIGN_SYSTEM.md` §1.3, la spec 002,
el plan y la research de la 001, el código actual (`src/`, `scripts/`,
`.github/workflows/ci.yml`, `package.json`) y el SQL del preflight.

### Propuestas `[P]` que toca el slice

Comprobado contra la tabla de 18 elementos del maestro §15.9 y la de la spec.

| Elemento `[P]` | ¿Afecta al alcance? | ¿Requiere aprobación antes de implementar? | Resolución (quién, cuándo, dónde) | ¿Bloquea el plan? |
| --- | --- | --- | --- | --- |
| Anotar gasto E1–E5, `COMPONENT_SPECIFICATIONS.md` §Anotar | Sí — P0-1 | Sí | **Aprobado** en su versión privada por los fundadores, decisión 16.2, 4 nov 2026 (Q2) | No |
| Sección Cuenta completa, §Cuenta | Sí — P0-1 y P0-2 | Sí | **Aprobada** la anatomía, decisión 16.6 (Q6). P0-1 construye todo menos Mi pareja; CoupleStatus y SensitiveActionConfirmation quedan para P0-2 | No |
| Persistencia del tema `[P][V]`, §ThemeSelector | Sí — P0-1 | Sí, y el `[V]` | **Aprobada**, decisión 16.7 (Q7). **`[V]` ejecutado** en research R7 | No |
| Teclado nativo / teclado propio descartado | Sí — P0-1 | Sí | **Aprobados**, decisión 11 (3 nov 2026); `AmountInput` ya existe | No |
| Gasto, ingreso y liquidación en tinta, `DESIGN_SYSTEM.md` §4 | No | Sí — viendo la pantalla | **Pendiente de la revisión del PR C** (fila e ingreso en Anotar y detalle) **y del PR D** (Inicio y Actividad) | No |
| Cuenta reutiliza los fondos de categoría, `DESIGN_SYSTEM.md` §4 | No | Sí — viendo la pantalla | **Pendiente de la revisión del PR B** (AccountMenuItem de Mi cuenta) | No |
| Texto ampliado hasta 200 %, handoff §Accesibilidad | No | No — requisito obligatorio | Se aplica y se prueba en cada PR de interfaz (FR-061) | No |
| Stack de UI sugerido, handoff | No | No — cerrado por §15.2 y §7.1 | Phosphor + `AppIcon`, `motion`, `next/font` tal cual | No |

**Pantallas nuevas no diseñadas** (spec, «Inventario de `[P]`»): se tratan como
`[P]` de aprobación viendo la pantalla. **PR B:** sesión caducada (edge case).
**PR C:** selector «Gasto · Ingreso» (Q3). **PR D:** Inicio en Yo sin bloques
compartidos y sus estados (Q5), «todavía no disponible» de Nosotros en Inicio y
Actividad (Q5) y las flechas de mes (Q8).

No tocados: SharedBalance, GoalStack, ChangePreview, FundingLedger,
ConfirmationBadge, PlanningNote, personas escalables a N, propuestas de paleta ya
visibles desde la 001. **Ningún `[P]` con alcance «Sí» está sin aprobar.**

### Verificaciones `[V]` que toca el slice

**Deciden cómo se construye — ejecutadas antes de cerrar el plan (ADR-012 §2):**

| Elemento `[V]` | Tipo | Salida real | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| Viabilidad de `juntia_writer` (anticipo de ADR-013 [V] 1) | Decide | **Pegada en research R1**, runs 41937553460, 41938278390, 41938774244. Viable con `current_uid()`; enmienda de ADR-013 §2.3 en esta rama. No sustituye la [V] 1 del PR A | No — **verificado** |
| Forma del claim (ADR-013 [V] 9; decisión 1) | Decide | **Research R2**: `request.jwt.claims` con el JSON; `claim.sub` nulo; pgTAP usa `"request.jwt.claims"` | No — **verificado** |
| Versiones exactas (ADR-013 [V] 10) | Decide | **Research R3**: CLI 2.121.0, supabase-js 2.118.0, ssr 0.12.7 y el stack local; el lockfile lo genera el PR A | No — **verificado**; lockfile en el PR A |
| Lista permitida del registro (Q9) | Decide | **Research R4**: hook Before User Created; 403 sin fila, también por `/otp`; la API de administración no pasa por él | No — **verificado**; enumeración por la API aceptada (16.16) |
| Correo de Supabase (Q10) | Decide | **Research R5, evidencia documental (no un run)**: 2 por hora en todo el proyecto y solo a miembros del equipo | No — la comprobación real (correos en el equipo y un correo de verificación recibido) es requisito operativo antes de probar el PR B |
| Copia y restauración (Q11) | Decide | **Research R6**: `pg_dump` 17 de solo datos + `gpg` + restauración en base migrada, recuentos iguales y usuario que entra; `-Fc` descartado. Revisión del PR #37: el esquema va por referencia a las migraciones etiquetadas, no por `pg_dump` | No — decide el comando de datos y el cifrado; los dos caminos de restauración desde vacío los prueba el PR A |
| Persistencia del tema (Q7) | Decide | **Research R7**, en local sin Docker: primer cuadro del tema guardado, CLS = 0, cero errores de hidratación, control negativo que destella | No — **verificado** para la lectura de la cookie |

**Comprueban lo construido — se ejecutan en los PR y su salida va al PR:**

| Elemento `[V]` | PR | Salida real | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| ADR-013 [V] 1, 2, 7, 8 y 9 **definitivas** | **A**, en **dos puntos de control** antes de la primera función de dinero: tras `foundation` (1 y 9, y lo que ya se pueda de 2, 7 y 8) y tras `controlled_tables` (las cinco sobre todas las tablas controladas y vistas) | Pendiente | No |
| ADR-013 [V] 3, 4, 5 (equivalente en movimientos, Q15) y 6 | A | Pendiente | No |
| Rol de login de `db push` alojado, `drop extension pg_graphql` y esquemas expuestos en `juntia-dev` | A | Pendiente | No |
| Restauración desde vacío por los dos caminos (Supabase local con `db reset` al commit etiquetado; PostgreSQL 17 normal con arranque + migraciones), con datos de prueba | A | Pendiente. Hasta tener salida, la copia no es restaurable | No |
| Tema: cookie escrita desde el perfil, dos dispositivos, CLS en acceso y Mi cuenta | B | Pendiente | No |
| Workers con usuarios aislados (ADR-011 [V] 3) | B (medición), C (con dos specs) | Pendiente | No |
| Altura del teclado nativo con la hoja (iPhone y Android) | C | Pendiente | No |
| Teclados de terceros en Android (§15.6.2, 3) | C | Pendiente o excepción documentada | No |
| Umbrales de §15.7 | B (CLS acceso/cuenta), C (INP, US-12 en laboratorio), D (CLS Inicio/Actividad, US-12 en teléfono) | Pendiente | No |
| Presupuestos de tiempo (ADR-011 [V] 1 y 2) | A (`test:db`), B–D (humo y gate) | Pendiente; avisan | No |
| Verificaciones heredadas de la decisión 12 | Tabla de «Verificaciones heredadas» | Pendiente salvo T072 parte 1 | No |

### ADR que necesita el slice

| ADR | Qué decide para este slice | Estado | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| ADR-013 | Acceso a datos, esquemas, `juntia_writer`, concurrencia, importes como texto | Aceptado (decisión 15); **enmienda de nota de implementación de §2.3 en esta rama**, sin cambiar la decisión | No, si el revisor acepta la enmienda como nota y no como decisión nueva |
| ADR-011 | Capas, jobs 3 y 4, siembra, presupuestos, §9 sin Docker | Aceptado; §9 en la rama de la decisión 17, base de esta | No, si la decisión 17 se mergea antes que este plan |
| ADR-012 | Formato y gates | Aceptado | No |
| ADR-001 | Solo referencia (no hay Mover a Pareja en P0-1) | Aceptado (§12.2) | No |

**P0-1 no necesita un ADR nuevo.** Las decisiones de este plan (rutas, nombres,
topes de texto, mecanismo de siembra, forma de la copia, creación perezosa del
perfil) son locales y reversibles. Las que el plan **no** puede tomar se
entregan al gestor aparte y no están escritas aquí como decididas.

### Erratas que afectan al slice

| Errata | Qué afecta | Estado | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| Ninguna pendiente | — | `docs/design/README.md`, «Erratas conocidas» | No |

### Conflictos entre documentos superiores

| Conflicto | Documentos | Qué dice la jerarquía | PR de reconciliación | ¿Bloquea el plan? |
| --- | --- | --- | --- | --- |
| La API de Auth enumera (403 de la lista, 422 de cuenta existente) frente a «Sin enumeración de cuentas» | Maestro §15.5 / research R4 | **Resuelto por decisión** del primer fundador (16.16): riesgo aceptado hasta MVP-1, las pantallas no enumeran. FR-023 y el maestro se enmiendan en esta rama | Este PR | No |
| ADR-013 §2.3 da por hecho que `auth.uid()` funciona dentro de la función de `juntia_writer` | ADR-013 / research R1 | Nota de implementación en ADR-013, sin cambiar la decisión | Este PR | No |
| La tabla de la decisión 17 del maestro dice «`--remote` explícito»; ADR-011 §9.5 (ya corregido) dice `--linked` en la v2 y `--remote` en la v3, y la CLI fijada es la v2 | Maestro §15.10 / ADR-011 §9.5 | Manda el maestro, pero su texto describe la v3. El plan aplica la versión fijada (v2, `--linked`) | **Por corregir** en la rama de la decisión 17, que aún no está en `main` | No, si se corrige antes del merge de la 17 |
| ADR-011 §5 (enmienda de la forma del nivel 1) ponía axe (control 5) solo en el job `app`; desde el PR B las rutas de producto exigen sesión y Supabase, que `app` no tiene | ADR-011 §5 / spec FR-027 | **Resuelto por la enmienda «Axe en dos jobs» de ADR-011 §5** (4 nov 2026, en esta rama): sin sesión en `app`, con sesión en `e2e`, completo en cada PR de código | Este PR | No |
| **Lectura.** `docs/TESTING.md` §9 todavía escribe «`verify` (… + SQL/RLS) < 90 s»; §2 y ADR-011 §9.7 lo miden sin las capas de base de datos | `docs/TESTING.md` / ADR-011 §9 | Manda ADR-011 (TESTING lo dice de sí mismo) | Puede ir en la rama de la decisión 17 | No |

**Resultado del gate (antes de la Fase 0)**: **PASA**, con dos condiciones de
orden: la rama de la decisión 17 se mergea antes que este plan, con la frase
`--remote` de la tabla del maestro corregida.

## Project Structure

### Documentation (this feature)

```text
specs/002-cuentas-y-gastos-privados/
├── spec.md              # Specify + Clarify (PR #35); FR-023 enmendado en este PR
├── plan.md              # Este archivo
├── research.md          # Fase 0: los siete [V] ejecutados y las decisiones del plan
├── data-model.md        # Fase 1: esquema, RLS, grants, vistas, funciones y tipos de dominio
├── quickstart.md        # Fase 1: trabajar sin Docker, juntia-dev, copia y restauración
├── contracts/
│   ├── database.md      # Vistas, funciones de entrada, Auth y exportación
│   ├── errors.md        # Código → error de dominio → clave de copy
│   └── ci.md            # verify, jobs db y e2e, Playwright y lint nuevo
└── tasks.md             # Fase 2: NO lo crea este plan
```

### Source Code (repository root)

Sigue el maestro §7.2. Solo se crea lo que P0-1 llena.

```text
supabase/
├── config.toml                          # api.schemas = ["public"]; auth: confirmaciones, minimum_password_length = 8, hook, plantillas
├── migrations/
│   ├── 20261105000100_foundation.sql    # PR A, 1.ª: esquemas, juntia_writer, default privileges, pg_graphql, current_uid(),
│   │                                    #   profiles, categories, signup_allowlist, hook, vistas my_profile, funciones de perfil
│   ├── 20261105000200_controlled_tables.sql # PR A, 2.ª (tras el punto de control 1): transactions, audit_events,
│   │                                    #   idempotency_records, triggers, políticas, vistas de movimientos; sin funciones de dinero
│   └── 20261105000300_money_functions.sql # PR A, 3.ª (tras el punto de control 2): create/update/void, parse_amount_minor, request_fingerprint
├── seed.sql                             # Solo runner: correos de prueba en la lista y esquema tests con helpers de pgTAP
├── restore/
│   └── plain-postgres-bootstrap.sql     # Roles y objetos mínimos de auth para el camino B (R6)
└── tests/
    ├── 01_privileges.test.sql           # [V] 7: privilegios efectivos, sin definer en public, nada de juntia_private por la API
    ├── 02_claims.test.sql               # [V] 9: forma del claim; current_uid() por SQL
    ├── 03_views.test.sql                # [V] 8 y 6: security_invoker, sin usage, importes como texto
    ├── 04_writer.test.sql               # [V] 1: dueño, RLS a juntia_writer, función llamada por SQL directo
    ├── 05_direct_writes.test.sql        # [V] 2: insert/update/delete/truncate imposibles; auditoría inmutable
    ├── 06_profiles.test.sql
    ├── 07_transactions.test.sql         # Invariantes de FR-007, tipo inmutable, anulado
    ├── 08_money_functions.test.sql      # Éxito, RLS, idempotencia, versión, cada validación
    └── 09_allowlist.test.sql            # Hook: permitido, no permitido, mayúsculas
src/
├── proxy.ts                             # Renovación de sesión, getClaims(), redirección a /entrar, Cache-Control
├── app/
│   ├── layout.tsx                       # Sin cambios salvo el script de tema (lee la cookie)
│   ├── (auth)/                          # Sin shell
│   │   ├── layout.tsx
│   │   ├── entrar/page.tsx              # A1, A1b, A1c, A1d; aviso de verificado; S3
│   │   ├── crear-cuenta/page.tsx        # A2
│   │   ├── verificar-correo/page.tsx    # A3
│   │   ├── recuperar/page.tsx           # A4, A4b
│   │   ├── nueva-contrasena/page.tsx    # A5
│   │   └── primera-entrada/page.tsx     # A6, con sesión
│   ├── auth/confirm/route.ts            # verifyOtp + perfil + cookie de tema
│   ├── api/export/route.ts              # GET JSON/CSV
│   └── (app)/
│       ├── layout.tsx                   # Shell con sesión y perfil; sin aviso de versión base (FR-044)
│       ├── page.tsx                     # Inicio (Yo) o «todavía no disponible» (Nosotros)
│       ├── loading.tsx                  # Skeleton con la geometría final
│       ├── actividad/
│       │   ├── layout.tsx               # Lista o tabla + panel de detalle (≥ 1024)
│       │   ├── page.tsx                 # Mes (?mes=AAAA-MM), búsqueda, filtros
│       │   └── [id]/page.tsx            # Detalle (04·1 DETALLE / panel de 04·7)
│       └── cuenta/
│           ├── page.tsx                 # C1
│           ├── perfil/page.tsx          # P1–P5
│           ├── pareja/page.tsx          # «llega con P0-2»
│           ├── apariencia/page.tsx      # T1
│           ├── privacidad/page.tsx      # D1, Exportar D2–D5, LimitNote de eliminar cuenta
│           └── seguridad/page.tsx       # G1, G2, cerrar sesión S1–S2
├── features/                            # Maestro §7.2; account y home siguen el mismo patrón (decisión del plan)
│   ├── auth/                            # Formularios y Server Actions de acceso; traducción de errores de Auth
│   ├── account/                         # AccountButton, ProfileHeader, AccountMenuItem, ThemeSelector, LimitNote, exportar
│   ├── expenses/                        # Hoja de Anotar E1–E5 (gasto e ingreso), edición, eliminar, Toast con Deshacer
│   ├── home/                            # Inicio en Yo
│   └── activity/                        # Resumen del mes, flechas, búsqueda, filtros, lista por día, tabla
├── components/ui/                       # 001 + ExpenseRow, Toast, Badge de estado si falta, Modal destructivo (alertdialog)
├── domain/
│   ├── money/                           # Money, parse/serialize, formato COP
│   ├── transactions/                    # Tipos, catálogo, validación, mes en Bogotá, resúmenes, recientes, flechas
│   └── golden/october-2026.ts           # Dataset dorado, parte de P0-1
├── lib/
│   ├── supabase/
│   │   ├── server.ts                    # createServerClient por petición (server-only)
│   │   ├── browser.ts                   # createBrowserClient (FR-010)
│   │   ├── proxy.ts                     # updateSession para src/proxy.ts
│   │   └── database.types.ts            # Generado; versionado; comprobado en el job db
│   ├── db/                              # Única capa que conoce vistas y funciones
│   │   ├── types.ts · errors.ts · retry.ts
│   │   ├── profile.ts · transactions.ts · export.ts
│   ├── theme-script.ts                  # + lectura de juntia_theme (R7)
│   └── copy/es.ts                       # + todo el copy nuevo
tests/
├── support/seed.ts                      # Usuarios por worker y rol, storageState, dataset por la función real
├── integration/                         # Vitest `integration`: API real, concurrencia, idempotencia, exportación
├── e2e/
│   ├── access-account.e2e.ts            # Spec E2E 1 (PR B; descarga de Exportar en el PR D)
│   └── annotate.e2e.ts                  # Spec E2E 2 (PR C), cronometrada
└── a11y/routes.a11y.ts                  # + rutas nuevas, con sesión sembrada
scripts/
├── verify.mjs · ci.mjs                  # Filas «SOLO EN CI — pendiente de resultado»
├── backup-manifest.sh                   # Manifiesto de la copia: SHA, migraciones, recuentos, sumas; --verify
└── restore-drill.sh                     # Ensayo de copia y de los dos caminos de restauración desde vacío (job db)
```

Las pruebas de Vitest de dominio y componentes van junto a lo que prueban
(`*.test.ts[x]`), como en la 001.

**Structure Decision**: un único proyecto Next.js con `src/` y una carpeta
`supabase/` en la raíz, según §7.1 y §7.2. Los tests SQL van en `supabase/tests/`
(donde los busca `supabase test db`), no en `supabase/tests/rls/` como sugiere
§7.2, porque cubren más que RLS (**decisión del plan**). Nombres en inglés salvo
los segmentos de URL visibles, que siguen al maestro §15.3 (research R8.7).

## Cómo se construye cada parte

No es `tasks.md`: dice qué decisión técnica aplica a cada requisito.

- **Base de datos y seguridad (FR-001–FR-011):** según
  [data-model.md](data-model.md) §1–§5. Tres migraciones en el orden de la tabla
  de arriba; solo la 3.ª contiene funciones de dinero, y entra después de los dos
  puntos de control del PR A.
- **Dinero (FR-012–FR-020):** `domain/money` y `domain/transactions` puros; las
  mismas reglas repetidas en la función SQL y protegidas por la tabla
  (research R8.3).
- **Acceso (FR-021–FR-029):** Server Actions con el cliente de servidor; errores
  según [contracts/errors.md](contracts/errors.md); `ensure_profile()` al entrar
  (research R8.5); `proxy.ts` con `volver` validado (R8.7).
- **Anotar (FR-030–FR-036):** la hoja de la 001 pasa a ser el flujo real sobre
  `BottomSheet`/`Modal`, añade paradas, arrastre desde el asa y confirmación de
  cambios sin guardar (FR-031a de la 001). La clave de idempotencia nace al abrir
  y se reusa al reintentar; E4 bloquea los campos; E5 cierra, cuenta el total,
  resalta la fila y muestra el Toast con «Deshacer» 6 s, que llama a
  `void_transaction` con `undo`.
- **Editar y eliminar (FR-037–FR-039):** la edición reusa la hoja en modo
  edición con la `version` leída; eliminar usa `Modal` como `alertdialog` con el
  foco inicial en Cancelar.
- **Inicio y Actividad (FR-040–FR-049):** filas por vistas, totales por el
  dominio (R8.9), mes en la URL (R8.7), Skeleton en `loading.tsx` con la
  geometría final.
- **Mi cuenta (FR-050–FR-056):** según `COMPONENT_SPECIFICATIONS.md` §Cuenta; el
  tema según research R7 y R8.6.
- **Exportar (FR-057):** research R8.10; contrato en
  [contracts/database.md](contracts/database.md).
- **Operación (FR-058–FR-059):** [quickstart.md](quickstart.md).

## PR de implementación A–D

Cuatro PR **seguidos**: cada uno sale de `main` con el anterior mergeado (Q1).
Cada uno pasa el gate completo (ADR-011 §9.1: `verify` + jobs de CI del mismo
commit), lleva su evidencia en `specs/002-cuentas-y-gastos-privados/evidence.md`
y para en la revisión humana (`AGENTS.md` 17).

**Paso fijo de todo PR que cambia interfaz (B, C y D):** pasada de Impeccable
(auditoría y crítica) sobre las pantallas del PR a 390 y 1440 en los dos temas,
con los hallazgos y lo que se corrigió en la evidencia. Impeccable verifica, no
decide alcance ni dirección (`CLAUDE.md` 7). El PR A no cambia interfaz.

### PR A · Base de datos, seguridad y dinero

**Alcance.** Supabase en el repositorio, las tres migraciones, el dominio del
dinero y los movimientos, el dataset dorado, la capa `src/lib/db/`, los tipos
generados, el job `db`, el procedimiento de copia y su ensayo, y la adaptación de
`verify` y del resumen del CI. **Sin pantallas.**

**FR y US:** FR-001–FR-020, FR-059 (procedimiento), FR-060 (claves de error),
FR-063 (job 3); US-9 entera y la mitad de servidor de US-2.6, US-4.2, US-4.5,
US-10.

**Orden obligatorio dentro del PR (SC-006; decisión 15):**

Dos puntos de control **antes de cualquier función de dinero** (revisión del PR
#37, F37-2). Cada uno es **un commit propio** con **su propio run** de `gh
workflow run ci.yml --ref <rama>` sobre ese commit, y su salida va a la
evidencia con el enlace al run. **Si la [V] 1 falla en cualquiera de los dos, se
para** y ADR-013 se reabre (decisión 15); no se sustituye por funciones de
`postgres`.

1. **Punto de control 1 — migración `foundation`** (esquemas, `juntia_writer`,
   privilegios por defecto, `pg_graphql`, `current_uid()`, `profiles`,
   `categories`, `signup_allowlist`, el hook, `my_profile` y las funciones de
   perfil; **ninguna tabla controlada ni función de dinero**), con pgTAP `01`,
   `02`, `03`, `04`, `06` y `09` e integración por HTTP. Salida:
   - **[V] 1** con `ensure_profile` (función que escribe sin dinero, de
     `juntia_writer`): devuelve a quien llama por la API y por SQL directo como
     `authenticated`, la RLS se le aplica (insertar el perfil de otra persona
     falla) y `current_uid()` es `null` sin claims;
   - **[V] 9**, forma del claim;
   - lo que de **[V] 2, 7 y 8** ya se puede correr sobre lo que existe:
     escritura directa imposible en `profiles` por la API y por SQL, privilegios
     efectivos de los tres esquemas y de estas tablas, `my_profile` con
     `security_invoker` y sin `usage`.
2. **Comprobaciones en `juntia-dev`** con `db push --linked` de la migración
   `foundation`: qué rol de login usa, si `grant juntia_writer to …`, `alter
   function … owner to juntia_writer` y `drop extension pg_graphql` funcionan, y
   que «Exposed schemas» es solo `public`. Salida (sin claves) en la evidencia.
   **Si `pg_graphql` no se puede quitar o desactivar, el PR A se para y lo
   reporta** (F37-8): no cambia a una alternativa.
3. **Punto de control 2 — migración `controlled_tables`**: `transactions`,
   `audit_events`, `idempotency_records`, sus triggers, políticas y grants, y las
   vistas de movimientos (`my_transactions`, `my_transaction_months`,
   `my_recent_categories`), **todavía sin funciones de dinero**. pgTAP `01`–`05`,
   `07` y `09` completos e integración por HTTP. Salida de **[V] 1, 2, 7, 8 y 9
   definitivas sobre todas las tablas controladas y vistas**: `juntia_writer`
   con sus políticas sobre las tablas nuevas (inserción y `select … for update`
   a nombre de otra persona con `set local role juntia_writer` y los claims de
   quien llama, como en el preflight, 1d.3; nada queda en el esquema); escritura directa imposible en
   cada tabla controlada; la auditoría no se modifica ni desde `juntia_writer`;
   privilegios efectivos completos; las cuatro vistas con `security_invoker` y
   sin `usage`.
4. **Solo entonces, migración `money_functions`** (`create_transaction`,
   `update_transaction`, `void_transaction`, `parse_amount_minor`,
   `request_fingerprint`) con `08_money_functions.test.sql` y el resto de la
   integración ([V] 3, 4, 5, 6).

**Pruebas por capa:**

| Capa | Qué | Dónde |
| --- | --- | --- |
| Dominio (Vitest `domain`) | `Money` sin `number`; pesos → unidades menores exacto; texto ↔ `bigint` con `9007199254740993` y los límites de `bigint`; validación de borrador; `monthKey` y «hoy» en Bogotá con un instante de borde (UTC del 1 de noviembre, aún 31 de octubre en Bogotá); `monthSummary` excluye ingresos; recientes; flechas; **dataset dorado: los gastos suman 41290000 unidades menores (412.900) y el ingreso no suma** | `src/domain/**/*.test.ts` |
| Componentes | Ninguna (no hay interfaz) | — |
| SQL/RLS (pgTAP) | Los nueve archivos de `supabase/tests/`: privilegios efectivos de `anon` y `authenticated` comparados con la lista esperada (incluidos `TRUNCATE`, `REFERENCES`, `TRIGGER`, secuencias, `usage` y `create` por esquema); ninguna función `security definer` en `public`; vistas con `security_invoker`; forma del claim; RLS de cada tabla para cada rol; invariantes de FR-007; trigger de tipo inmutable; auditoría de solo inserción también para `juntia_writer`; cada función con éxito, rechazo por RLS, repetición idempotente, clave reusada con otra intención y cada validación; **[V] 6 según su nota del 4 nov 2026 en ADR-013**: (a) `juntia_private.parse_amount_minor`, el parser texto → `bigint` que usan todas las funciones que escriben, llamado directamente con `9007199254740993`, `9223372036854775807` y los valores no válidos (signo, decimales, letras, `9223372036854775808`, vacío), y (b) una fila con `9007199254740993` sembrada como `postgres` y leída por la vista como texto idéntico; **aparte**, el tope de Anotar (999.999.999 pesos = `99999999900`) en `public.create_transaction`, que acepta `99999999900` y rechaza `100000000000` (1.000.000.000 pesos) con `JT003`; catálogo exacto | `supabase/tests/` |
| Integración de servidor (Vitest `integration`) | Escrituras directas por PostgREST con un JWT real (POST/PATCH/DELETE, perfiles `juntia_data`/`juntia_private`, `/graphql/v1`); dos peticiones simultáneas con la misma clave → un movimiento ([V] 4); misma clave, otra intención → `JT008`; dos ediciones con la misma versión → una gana, la otra `JT011` y nada se sobrescribe ([V] 5 en movimientos, Q15); un `RAISE` a mitad de `create_transaction` no deja filas ([V] 3); importes como `string` por `src/lib/db` (la fila sembrada de `9007199254740993` vuelve idéntica por supabase-js) y test de tipos de que ningún importe de `database.types.ts` es `number` (resto de [V] 6); Tomás no ve ni cambia nada de Sara por vistas ni funciones (SC-007); la siembra del dataset dorado por la función real y los totales de octubre por `src/lib/db` + dominio = 412.900 (SC-008); reintento de `40P01` con la misma clave (simulado con dos transacciones que se bloquean) | `tests/integration/` |
| E2E | **Ninguna**: no hay recorrido de interfaz (spec, tabla de specs E2E) | — |

**CI:** entra el job `db` ([contracts/ci.md](contracts/ci.md)); `verify` y el
resumen del job `app` pasan a «SOLO EN CI — pendiente de resultado · job db» para
SQL/RLS e integración, y E2E queda «NO APLICABLE — nace en el PR B» (ADR-011 §9;
FR-063). El presupuesto de `test:db` (< 60 s) se mide dentro del job.

**Copia (research R6; quickstart §4):** la copia completa es el esquema **por
referencia** (las migraciones del commit etiquetado `db-prod-*` que coincide con
producción), `data.sql` (`--data-only --column-inserts -t 'juntia_data.*' -t
auth.users -t auth.identities`) y un manifiesto (SHA, migraciones, recuentos,
sumas de comprobación y `sha256`). No se vuelca el esquema con `pg_dump`. El PR A
crea `scripts/restore-drill.sh`, `scripts/backup-manifest.sh` y
`supabase/restore/plain-postgres-bootstrap.sql`, y **prueba en el job `db` los
dos caminos desde una base vacía**, con datos de prueba: A, Supabase local con
`db reset` a las migraciones de ese commit y después los datos; B, PostgreSQL 17
normal con el arranque, las migraciones y los datos. El ensayo falla ante
cualquier dependencia que falte. **La copia no se presenta como restaurable hasta
que los dos caminos tienen salida en la evidencia.**

**`[V]` que cierra:** ADR-013 [V] 1–9 (10 ya está en el plan; el lockfile aquí);
rol de `db push` alojado; restauración desde vacío por los caminos A y B;
presupuesto de `test:db`
(medido, avisa).

**Capturas:** ninguna (no hay interfaz). Sí la salida de los runs.

**`[P]` por aprobar viendo la pantalla:** ninguno.

**Criterios de salida:** el job `db` verde en el último commit; las salidas de
los **dos puntos de control**, cada una de su commit y su run, los dos
**anteriores** a la primera función de dinero; `pg_graphql` quitado o
desactivado en local y en `juntia-dev` (si no se puede, el PR se para y lo
reporta); el
dataset dorado da 412.900 en dominio e integración; cero accesos cruzados
(SC-007); cero duplicados (SC-009, mitad de servidor); comprobaciones de
`juntia-dev` registradas; ensayo de restauración verde **en los dos caminos desde
vacío**; `verify` con las filas
nuevas; revisión humana del SQL.

### PR B · Acceso y Mi cuenta

**Alcance.** Supabase Auth con las pantallas de 04·17, `proxy.ts`, perfil, A6,
AccountButton y perfil del sidebar, Mi cuenta completa salvo pareja (con su
estado «llega con P0-2») y Exportar todavía **sin** la descarga real, que es del
PR D; el tema persistido; la siembra por base de datos; el job `e2e` y la spec
E2E 1.

**FR y US:** FR-021–FR-029, FR-050–FR-056, FR-064, FR-065 (spec 1), FR-067; US-1,
US-7.

**Migraciones/funciones:** ninguna nueva (las de perfil y el hook están en el
PR A). Configuración de Auth en `config.toml` y, en los proyectos alojados, por
la dueña (quickstart §3).

**Requisitos operativos antes de probar en `juntia-dev` o producción**
(quickstart §3): correos de los fundadores en la organización de Supabase **y un
correo de verificación recibido de verdad por cada uno** (research R5, que es
evidencia documental); contraseña mínima de 8 en el proyecto; lista permitida y
hook configurados; Preview de Vercel apuntando a `juntia-dev`.

**Pruebas por capa:**

| Capa | Qué |
| --- | --- |
| Dominio | Validación de nombre visible; `volver` solo acepta rutas propias |
| Componentes (RTL) | Las respuestas de registro 200/403/422/429 producen **la misma** salida (FR-023); recuperación siempre A4b; ThemeSelector como `radiogroup` con flechas, aplica y escribe la cookie; P1–P5; LimitNote de eliminar cuenta no es un control |
| SQL/RLS | Ya en el PR A; aquí se añade el caso de `set_theme` y `update_display_name` ajenos si falta |
| Integración | `ensure_profile()` idempotente con el nombre de A2; `/auth/confirm` con enlace válido, caducado y usado; **una llamada directa a `/auth/v1/signup` con una contraseña de 7 caracteres y un correo de la lista es rechazada por Auth** (`weak_password`) y no crea usuario (F37-7) |
| E2E | **Spec 1 nace**: registro de un correo permitido → enlace en Mailpit → A1 con aviso → entrar → A6 sin «Invitar a mi pareja» → Inicio; registro no permitido → misma pantalla y ninguna cuenta; ruta protegida sin sesión → `/entrar` → vuelve a la ruta; Mi cuenta: perfil, apariencia en oscuro y **segundo contexto de navegador que entra y pinta oscuro desde el primer cuadro**; recuperación uniforme; cerrar sesión → S3 y ninguna ruta de producto sin volver a entrar |
| axe | Rutas de acceso y de Mi cuenta, en los dos temas, con sesión sembrada |

**CI:** entra el job `e2e`; `check:theme-script` pide `/entrar`; axe de las rutas
con sesión corre en el job `e2e` y el de las rutas sin sesión sigue en `app`
(ADR-011 §5, enmienda «Axe en dos jobs»).

**`[V]` que cierra:** tema (escritura desde el perfil, dos dispositivos, CLS =
0 con el arnés en acceso y Mi cuenta); workers con usuarios aislados (primera
medición); presupuestos del humo (medidos, avisan).

**Verificaciones heredadas:** **T072 parte 2** con el **primer preview real** de
este PR: la dueña añade un commit a la rama (decisión 13, regla 3), y el gestor
ejecuta el aislamiento con un alias no productivo **antes de que nadie use el
preview**. T073 (contraste en iPhone) se puede adelantar aquí.

**Capturas:** 390 y 1440, claro y oscuro, de las 7 pantallas de acceso y las 6
de Mi cuenta, más la sesión caducada.

**`[P]` por aprobar viendo la pantalla:** «Cuenta reutiliza los fondos de
categoría»; sesión caducada (pantalla nueva).

**Criterios de salida:** spec 1 verde en `e2e`; axe sin violaciones serias o
críticas en las rutas nuevas (SC-002); CLS = 0 en acceso y Mi cuenta (SC-005);
T072 parte 2 con salida real; pasada de Impeccable; aprobación visual de los dos
fundadores (SC-001).

### PR C · Anotar, editar y eliminar

**Alcance.** El Expense Flow conectado: E1–E5 en versión privada con el
selector «Gasto · Ingreso», edición sin cambiar el tipo, eliminar con el diálogo
de 02·1, «Deshacer» 6 s, el detalle del movimiento, ExpenseRow (gasto e
ingreso) y el Toast. La spec E2E 2.

**FR y US:** FR-030–FR-039, FR-062, FR-065 (spec 2); US-2, US-3, US-4.

**Migraciones/funciones:** ninguna nueva (PR A).

**Pruebas por capa:**

| Capa | Qué |
| --- | --- |
| Dominio | Ya en el PR A; se añaden los casos que salgan del flujo (por ejemplo, la fecha por defecto en Bogotá) |
| Componentes (RTL) | Hoja: foco en el monto, Guardar solo con monto y categoría, E2 sin «Pagó», «Participan» ni «Reparto»; selector de tipo cambia título, categoría y botón; E4 bloquea campos; error de guardado deja la hoja abierta con los datos y reintenta **con la misma clave**; `N` fuera de un campo, Enter guarda, Escape cierra; confirmación de cambios sin guardar; **ExpenseRow de ingreso con «+», ficha arena, ícono `arrow-down-left` y tinta, no verde** (ADR-011 fila 5); diálogo de eliminar con foco inicial en Cancelar y Escape |
| SQL/RLS · Integración | Ya en el PR A; aquí, el caso «editar un eliminado» y «Deshacer» de punta a punta por `src/lib/db` si falta |
| E2E | **Spec 2 nace, cronometrada**: con sesión y el dataset sembrados, `N` → monto → categoría reciente → Guardar → total sube, fila resaltada, Toast; doble toque en Guardar → **un solo movimiento** (comprobado por la base, SC-009); el tiempo del recorrido se reporta como laboratorio. Un test con motion activo para los momentos L2 de E5 |

**`[V]` que cierra:** altura del teclado nativo con la hoja (iPhone por los
fundadores; Android o excepción); teclados de terceros en Android (o excepción
documentada); INP < 200 ms al abrir Anotar y al guardar, en laboratorio (SC-004).

**Capturas:** 390 y 1440, claro y oscuro: E1 gasto, E1 ingreso, E2, E3, E4, E5
con el Toast, detalle, edición, diálogo de eliminar.

**`[P]` por aprobar viendo la pantalla:** «Gasto, ingreso y liquidación en tinta»
(fila e ingreso); selector «Gasto · Ingreso» (Q3); la versión privada de E1–E5.

**Criterios de salida:** specs 1 y 2 verdes; axe en Anotar en los dos temas;
INP medido; pasada de Impeccable; aprobación visual; **T075 VoiceOver** se puede
adelantar con el flujo real.

### PR D · Inicio, Actividad, exportación y verificaciones heredadas

**Alcance.** Inicio en Yo (04·1 sin bloques compartidos, escritorio de 04·7),
Nosotros «todavía no disponible» en todos los destinos, Actividad por mes con
flechas, búsqueda, filtros, tabla y panel, estados vacío/cargando/error, la
descarga real de Exportar, la retirada del aviso de versión base y el cierre de
las verificaciones heredadas.

**FR y US:** FR-040–FR-049, FR-057, FR-061; US-5, US-6, US-8, US-11.

**Migraciones/funciones:** ninguna nueva.

**Pruebas por capa:**

| Capa | Qué |
| --- | --- |
| Dominio | Flechas: la siguiente llega al mes más lejano con movimientos futuros y no más (Q13); agrupación por día; búsqueda sin tildes |
| Componentes (RTL) | **Inicio con las filas del dataset dorado muestra 412.900** y el desglose de la tabla (SC-008); sin «presupuesto», «restante», «excedido», «Tu parte compartida» ni barras (FR-041); vacío sin «$0»; error con Reintentar; Nosotros sin ninguna cifra |
| Integración | Exportación: solo movimientos activos propios, importes como texto, sin tokens, sin identificadores, sin anulados, CSV con BOM y sin inyección de fórmulas; Tomás nunca recibe filas de Sara (ADR-011 fila 2) |
| E2E | **La spec 1 suma la descarga de Exportar**: el archivo llega (evento de descarga, nombre y tamaño), sin abrir su contenido (ADR-011 §3, matriz) |
| axe | Inicio, Actividad y detalle, en los dos temas |

**`[V]` que cierra:** CLS = 0 con Skeleton en Inicio y Actividad (arnés R2, SC-005);
sin scroll horizontal en los siete anchos; US-12 en teléfono real (SC-003); las
verificaciones heredadas que queden (tabla de abajo).

**Capturas:** 390 y 1440, claro y oscuro: Inicio con datos, vacío, cargando y
error; Nosotros; Actividad con datos, mes vacío, futuro, búsqueda y filtros;
tabla y panel a 1440; Exportar D2–D5.

**`[P]` por aprobar viendo la pantalla:** «en tinta» en Inicio y Actividad;
Inicio sin pareja y sus estados (Q5); Nosotros «todavía no disponible» (Q5);
flechas de mes (Q8).

**Criterios de salida:** specs 1 y 2 verdes; cada fila de la tabla heredada con
salida real o «EXCEPCIÓN APROBADA» (SC-011); primera copia y restauración real
registradas **antes del primer movimiento real** (SC-010); pasada de Impeccable;
aprobación visual y salida interna de los dos fundadores (SC-001, SC-012).

## Dónde se mide cada criterio de éxito

| SC | Qué | Dónde y cómo | Quién | PR |
| --- | --- | --- | --- | --- |
| SC-001 | Sin scroll horizontal ni solapes, 7 anchos, 2 temas | Capturas 390/1440 en el PR; los demás anchos en el recorrido manual | Agente (capturas), fundadores (aprobación) | B, C, D |
| SC-002 | axe sin serias ni críticas | Proyecto `a11y` en el job `e2e`, todas las rutas implementadas | CI | B, C, D |
| SC-003 | Mediana < 10 s en teléfono real, ≥ 10 registros, con método | Teléfono de un fundador, cronómetro o grabación de pantalla, tras A6; en producción tras la copia (SC-010) o contra `juntia-dev` | Fundadores | D |
| SC-004 | INP < 200 ms al abrir Anotar y al guardar | Playwright con `PerformanceObserver` de `event` y CPU 4×, reportado como laboratorio (maestro §10.2) | Agente | C |
| SC-005 | CLS = 0 con Skeleton y con tema guardado | Arnés de la research R2 de la 001 + R7 | Agente | B (acceso, cuenta), D (Inicio, Actividad) |
| SC-006 | Las diez [V] de ADR-013 | pgTAP e integración en el job `db`; [V] 10 en este plan | Agente + CI | A |
| SC-007 | Cero accesos cruzados | pgTAP + integración (API y SQL directo) | CI | A |
| SC-008 | 412.900 y desglose exactos | Dominio (A), integración (A), RTL de Inicio (D) | CI; los fundadores lo ven en la revisión | A, D |
| SC-009 | Cero duplicados | Integración con la misma clave en paralelo (A); doble toque en la spec 2 (C) | CI | A, C |
| SC-010 | Copia y restauración real antes del primer dato real | Quickstart §4, salida en la evidencia | Un fundador | Después de mergear C y antes de anotar datos reales; registrado en D |
| SC-011 | Verificaciones heredadas | Tabla de abajo | Sus dueños | D |
| SC-012 | Salida interna aprobada | Uso real de los dos fundadores | Fundadores | D |

## Verificaciones heredadas de la decisión 12

Tabla de la spec, con el momento de este plan. Ninguna se presenta como
superada sin salida; las excepciones llevan sus cinco datos y el estado
«EXCEPCIÓN APROBADA».

| Verificación | Dueño | Cuándo en este plan | ¿Excepción posible? |
| --- | --- | --- | --- |
| T072 parte 1 · aislamiento en producción | Gestor | **Hecha el 4 nov 2026**; se repite tras el primer despliegue con Supabase (PR B) porque las rutas pasan a ser dinámicas | No |
| T072 parte 2 · aislamiento en preview | Gestor, con alias `*.vercel.app` no productivo asignado por la dueña | **Primer preview real, en el PR B**, antes de que nadie lo use | No |
| T072 parte 3 · funcionamiento en preview | Fundadores, con sesión en Vercel | PR B o C; obligatoria antes de aceptar (PR D) | No (aplazada, no excepcionable) |
| T073 · contraste en iPhone | Fundadores | Desde el PR B; a más tardar en el PR D | No |
| T074 · sombras táctiles en Android de gama media | Fundadores | PR D | Sí, si no hay Android |
| T075 · VoiceOver con el Anotar real | Fundadores | PR C o D, con el flujo real | No |
| T075 · TalkBack con el Anotar real | Fundadores | PR D | Sí, si no hay Android |
| CLS fuera de Chromium (Firefox y WebKit, arnés R2) | Gestor | PR D, en local con `npx playwright install firefox webkit` (sin Docker) | No |
| CLS en un iPhone real | Fundadores | PR D | Sí, si no hay Mac |
| Respaldo tipográfico de Onest en Android | Fundadores | PR D | Sí, si no hay Android |

## Riesgo aceptado

**Enumeración por la API de Auth (decisión 16.16).** Llamando a la API de Auth
de Supabase directamente se sabe si un correo está en la lista permitida (403) y
si ya tiene cuenta (422). Aceptado por el primer fundador el 4 de noviembre de
2026 hasta MVP-1; la segunda fundadora lo confirma con el merge de este PR.
**Mitigación:** las pantallas no enumeran (FR-023, enmendado), el registro solo
admite dos correos y la lista no se puede leer por la API. **Revalidación:**
antes del lanzamiento MVP-1, junto con la apertura del registro y el servidor de
correo propio.

## Constitution Check — repetición después del diseño

Repasada contra research.md, data-model.md, contracts/ y quickstart.md.

| Comprobación | Resultado |
| --- | --- |
| ¿El diseño introduce algún `[P]` nuevo o amplía uno? | No. Las pantallas nuevas son las que la spec ya lista; Mi pareja no tiene formulario |
| ¿Implementa algo de un `[P]` con alcance sin aprobar? | No |
| ¿Algún `[V]` que decide la construcción quedó sin salida? | No: los siete tienen salida en research R1–R7 |
| ¿Se marcó como resuelto un `[V]` que comprueba lo construido? | No. Las [V] definitivas de ADR-013 son del PR A; el arranque en PostgreSQL normal no está ensayado y se dice |
| ¿Aparece una decisión significativa o difícil de revertir? | La enmienda de ADR-013 es una nota de implementación. Las demás decisiones (perfil perezoso, FK compuesta, topes, rutas, forma de la copia) son locales. Las que no lo son se entregan al gestor aparte |
| ¿Algún importe cruza una frontera como número? | No: vistas, funciones, transporte y exportación usan texto; un test de tipos lo comprueba |
| ¿Algún camino que atiende a una persona usa `service_role`? | No. Solo la siembra de pruebas, en el runner, con regla de lint |
| ¿Algún dato real pasa por CI? | No: siembra y ensayo con datos de prueba |
| ¿Usa el dataset dorado como datos de la app? | No: solo en pruebas y en la siembra del runner |
| ¿Añade specs E2E por encima del tope? | No: dos, la 1 y la 2 |
| ¿Añade dependencias fuera de §7.1 o que P0-1 no usa? | No: solo `@supabase/supabase-js` y `@supabase/ssr` (§7.1, ADR-013). Ninguna de las propuestas de §7.1 que P0-1 no necesita |
| ¿Se salta algún control por ruta o por Docker? | No: `db` y `e2e` corren en todo PR de código; `verify` declara «SOLO EN CI» |
| Conflictos nuevos | Los dos de lectura del primer gate; ninguno bloquea |

**Resultado del gate (después del diseño)**: **PASA**, con las condiciones de
orden del primer gate.

## Puntos para el revisor

Decisiones del plan que el revisor puede querer distintas. Ninguna necesita ADR.

1. **Estado `voided`** para el movimiento anulado: es el literal propuesto de
   `docs/GLOSSARY.md` §10. Si se aprueba con este plan, el PR A quita la marca
   «[propuesta]» de esa fila del glosario. **No** se usa `scope`: el alcance se
   deriva de `owner_user_id` / `group_id` (research R8.1).
2. **Perfil creado al primer acceso verificado** con `ensure_profile()`, no con
   un trigger en `auth.users` (research R8.5). Ya no es solo del plan: lo decidió
   el primer fundador en la revisión del PR #37 (spec Q16 y FR-029; maestro
   16.17).
3. **Tope de 140 caracteres** en la descripción y de 60 en el nombre visible:
   no los fija el diseño.
4. **Contraseña mínima de 8 caracteres**, sin reglas de composición, **aplicada
   por Auth** y no solo por la pantalla (revisión del PR #37, F37-7): en
   `supabase/config.toml` (`[auth] minimum_password_length = 8`, la clave que
   genera la CLI 2.121.0, comprobada en el `config.toml` del preflight, donde
   valía 6) y en los dos proyectos alojados como requisito del quickstart. El
   diseño de A2 no fija el número.
5. **El tema en un segundo dispositivo** se corrige en la carga siguiente a un
   cambio, no en la misma (research R8.6).
6. **Preview de Vercel → `juntia-dev`**: los previews nunca tocan la base de
   producción.
7. **Axe de las rutas con sesión en el job `e2e`**: ya no es decisión del plan;
   la fija la enmienda «Axe en dos jobs» de ADR-011 §5 (revisión del PR #37).
8. **Rutas de acceso** `/entrar`, `/crear-cuenta`, `/verificar-correo`,
   `/recuperar`, `/nueva-contrasena`, `/primera-entrada`, `/auth/confirm` y
   `/api/export`.
9. **Los correos reales de la lista no entran en git**: se insertan con SQL en
   cada proyecto (research R4).
10. **Copia en tres partes** (esquema por referencia a las migraciones
    etiquetadas `db-prod-*`, datos y manifiesto) y el camino B con un arranque
    propio en PostgreSQL normal (research R6; revisión del PR #37, F37-1).
11. **Sin RHF, Zod ni TanStack Query** en P0-1 (research R8.12).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Auxiliar `juntia_private.current_uid()` en lugar de `auth.uid()` en las funciones que escriben | `juntia_writer` no puede usar el esquema `auth` (research R1) | Leer `request.jwt.claims` a mano duplica la lógica de `auth.uid()`; dar `usage` sobre `auth` no es posible; funciones de `postgres` tienen `BYPASSRLS` (ADR-013, prohibido) |
| Dos jobs de CI nuevos con Supabase en el runner | Sin Docker en los equipos (decisión 17), es el único sitio donde corren SQL/RLS, integración y E2E | No hay alternativa sin Docker que pruebe la base real |
