# Implementation Plan: 003 · Pareja y balances (P0-2)

**Branch**: `docs/spec-003-plan` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5) | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-pareja-y-balances/spec.md`, mergeada en `main` por el PR #47 (`d2e1c64`), con las decisiones 20.1–20.18 y las precisiones de la revisión del PR #47.

**Status**: Draft — fase Plan. No avanza a Tasks sin el merge de su PR documental (ADR-012 §3.1). Este archivo no contiene `tasks.md`.

> **Qué es este documento.** Dice **cómo** se construye lo que la spec ya fijó.
> No amplía el alcance ni decide nada que no sea local y reversible. Lo que es una
> **decisión del plan** se marca así para que el revisor la pueda objetar; lo que
> no es local ni reversible está en «Para los fundadores», al final. En este
> archivo, `[P]` significa **propuesta** y `[V]` **verificación pendiente**
> (maestro §15.9).

## Summary

P0-2 convierte a dos cuentas privadas en una pareja: invitación por enlace,
gastos compartidos con reparto exacto, Nosotros sin nada privado, Yo con la parte
propia, Balance con S4, liquidaciones declarativas y anulables, Mover a Pareja
(ADR-001) y la Context Transition S1. Se entrega en **cuatro PR seguidos (A–D)**
(decisión 20.1).

Enfoque técnico, con lo verificado en [research.md](research.md):

- **ADR-013 tal cual**, con una **nota de implementación de §5.1**, aprobada por
  los fundadores el 6 de noviembre de 2026: las auxiliares de membresía son de un
  rol propio de solo lectura, `juntia_membership`, sin `BYPASSRLS`. El preflight
  demostró que no hay recursión y que una tercera cuenta no ve nada (R1).
- **Tres estados de la pareja** (`provisional`, `active`, `discarded`) en `groups`,
  con índices únicos parciales que garantizan una pareja por persona y nunca un
  tercer integrante ([data-model.md](data-model.md) §2).
- **Bloqueos en un orden único**: persona (advisory lock), después grupo, después
  movimiento. La primera creación se serializa por persona. Las carreras de crear,
  anular y aceptar dan un solo ganador sin cambios en el perdedor (R3, sondas 10–13).
- **Enlace recuperable**: el navegador genera el token y la base solo guarda su
  hash. El reintento con la misma clave devuelve el mismo resultado y, por tanto,
  el mismo enlace (R3). El token viaja en el fragmento de la URL (R5).
- **Lecturas consistentes**: los totales y el Balance son vistas de una sola
  sentencia; las listas, `readByCursor` de la 002 (R4).
- **Las vistas de la 002 filtran Yo explícitamente**: el preflight mostró que, con
  la rama de grupo de la RLS, `my_transactions` devolvería los compartidos (R2).
- **Liquidaciones en su propia tabla** (R6), anulables con auditoría según la
  enmienda de ADR-007.
- **Una spec E2E nueva**, la 3, que nace en el PR C y crece en el PR D, dentro del
  presupuesto de < 480 s de la decisión 19.5 (R8).
- **Sin dependencias nuevas.**

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`) sobre Node 24 LTS; SQL y PL/pgSQL sobre PostgreSQL 17.11.

**Primary Dependencies**: las de la 002, sin cambios: Next 16.4.4, React 19.3.1, Motion 14.9.0, Phosphor 2.1.10, Radix Dialog 1.3.1, Tailwind 4.3.4, `@supabase/supabase-js` 2.118.0, `@supabase/ssr` 0.12.7, Supabase CLI 2.121.0.

**Storage**: Supabase PostgreSQL. Producción en el proyecto Free de la segunda fundadora; `juntia-dev` (`itfrhnadovezpahikuol`) para iterar (decisión 18); Supabase local en el runner para el gate. Navegador: cookies `juntia_theme` y `juntia_context`, `localStorage["juntia:context"]` y, nuevo, `localStorage["juntia:invitation"]` y `sessionStorage` para la intención de invitación (R5).

**Testing**: Vitest (`domain`, `components`, `integration`), pgTAP con `supabase test db`, Playwright + axe en Chromium.

**Target Platform**: navegadores modernos, móvil y escritorio; Vercel Hobby (decisión 13).

**Project Type**: aplicación web, monolito modular Next.js.

**Performance Goals**: maestro §15.7. CLS = 0 en las cargas con Skeleton de Inicio y Actividad en Nosotros y de Balance; INP < 200 ms al abrir Anotar en Nosotros y al guardar un gasto compartido (laboratorio).

**Constraints**: sin Docker en los equipos; importes nunca como `number`; ningún camino de persona usa `service_role`; nada privado en el HTML, el RSC ni el prefetch de Nosotros; 360–1440 px sin scroll horizontal; 44 px; movimiento reducido; texto al 200 %; todo el copy en `src/lib/copy/es.ts`; job `e2e` < 480 s.

**Scale/Scope**: 2 personas y una pareja. 4 migraciones, 11 funciones de escritura, 1 de lectura con parámetros (`preview_invitation`), 9 vistas nuevas y 3 cambiadas, 1 ruta pública (`/invitacion`), Mi pareja real, Balance real y Anotar, Inicio y Actividad en Nosotros.

## Constitution Check — comprobación de jerarquía

*GATE: debe pasar antes de la investigación de la Fase 0 y se repite después del
diseño de la Fase 1.* La constitución es un puntero (ADR-012 §3.4): esta sección
comprueba la jerarquía de `AGENTS.md` §2.

**Fuentes leídas antes de rellenarla:** `AGENTS.md` (§2, §2b, 13a, 14–15a, 17),
`CLAUDE.md`, el maestro (§5, §7, §10, §11 P0-2, §12.2 y §15 con las decisiones
1–20 y «Dataset dorado»), ADR-001, ADR-002, ADR-003, ADR-007, ADR-011 (§3, §4, §8
y §9 con §9.4, §9.5 y §9.9), ADR-012 y ADR-013, `docs/TESTING.md`,
`docs/CONVENTIONS.md`, `docs/GLOSSARY.md`, `docs/design/HANDOFF_CLAUDE_CODE.md`,
`COMPONENT_SPECIFICATIONS.md`, `MOTION_SYSTEM.md` §1 y §3,
`RESPONSIVE_SPECIFICATIONS.md`, la spec 003, el plan, el data-model, los contratos
y la evidencia de la 002, las migraciones de `main` y el código de `src/`
afectado.

### Propuestas `[P]` que toca el slice

| Elemento `[P]` | ¿Afecta al alcance? | ¿Requiere aprobación antes de implementar? | Resolución (quién, cuándo, dónde) | ¿Bloquea el plan? |
| --- | --- | --- | --- | --- |
| SharedBalance, `COMPONENT_SPECIFICATIONS.md` §SharedBalance | Sí — P0-2 | Sí | **Aprobado en su forma**, decisión 20.2 (6 nov 2026); la aprobación final en pantalla, en el PR D | No |
| ChangePreview, §ChangePreview | Sí — P0-2 | Sí | **Aprobado en su forma**, solo en Mover a Pareja, decisión 20.3; en pantalla, en el PR C | No |
| Anotar E1–E5, versión compartida, §Anotar gasto | Sí | Sí | **Aprobado en su forma**, decisión 20.4; en pantalla, en el PR C | No |
| Sección Cuenta: CoupleStatus, SensitiveActionConfirmation, LimitNote | Sí — P0-2 | Sí | **Aprobada** la anatomía, decisión 16.6; Mi pareja en pantalla, en el PR B | No |
| Personas configurables + patrón, DESIGN_SYSTEM §1.2 | No | Sí | `person.1–2` con sus patrones; en pantalla, en el PR D | No |
| Paleta propuesta (petróleo y demás), DESIGN_SYSTEM §4 | No | Sí | En pantalla, en los PR B a D | No |
| Gasto, ingreso y liquidación en tinta, DESIGN_SYSTEM §4 | No | Sí | En pantalla, en el PR D (primera liquidación visible) | No |
| Texto ampliado hasta 200 % | No | No — requisito obligatorio | Se aplica y se prueba | No |

### Verificaciones `[V]` que toca el slice

| Elemento `[V]` | Tipo | Salida real | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| Auxiliar de membresía sin recursión (ADR-013 §5.1) | Decide cómo se construye | **Hecha**: runs 42233151689, 42233739213 y 42234176869; research R1 | No |
| Bloqueo del grupo como raíz, y anular contra aceptar (ADR-013 §3) | Decide cómo se construye | **Hecha**: research R3, sondas 7, 10, 11, 12 y 13 | No |
| Retorno tras el login con la intención | Decide cómo se construye | **Hecha** por lectura del código de `main`: research R5. La prueba ejecutada del mecanismo es el caso de la spec E2E 1 del PR B | No |
| Lectura consistente de totales y saldo (FR-043) | Decide cómo se construye | **Hecha**: research R4, sondas 6, 8 y 9, y el error del run 1 | No |
| Todas las de «Comprueban lo construido» del inventario de la spec | Comprueba lo construido | Pendiente; responsable y cierre en la spec y en cada PR de abajo | No |

### ADR que necesita el slice

| ADR | Qué decide para este slice | Estado | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| ADR-001 | Mover a Pareja | Aceptado | No |
| ADR-002 + nota de la decisión 20.8 | Pesos enteros, desempate por orden de ingreso | Aceptado | No |
| ADR-003 | Sin salir ni expulsar; una pareja de dos sin carreras | Aceptado | No |
| ADR-007 + enmienda de la decisión 20.11 | Liquidaciones anulables, nunca editables | Aceptado | No |
| ADR-011 | Capas, specs E2E, presupuestos, iteración en `juntia-dev`, preflight en el runner | Aceptado | No |
| ADR-013 | Acceso a datos | Aceptado | No |
| **ADR-013, nota de implementación de §5.1** (`juntia_membership`) | Dueño de las auxiliares de membresía | **Aprobada por los fundadores el 6 de noviembre de 2026** («Aprobamos»); la segunda fundadora la confirma con el merge de este PR | No |

### Erratas que afectan al slice

Ninguna pendiente (`docs/design/README.md`).

### Conflictos entre documentos superiores

| Conflicto | Documentos | Qué dice la jerarquía | PR de reconciliación | ¿Bloquea el plan? |
| --- | --- | --- | --- | --- |
| 02·5 E5 muestra un privado en Nosotros | Comp frente al maestro §5.5 y al handoff | Manda la regla; resuelto por los fundadores (decisión 20) | No hace falta | No |
| 04·10 A5 afirma «No se movió» sin respuesta | Comp frente a la spec (precisión F47-4) | Manda la spec | No hace falta | No |
| 04·15 M4 «Copiar enlace» | Comp frente al token guardado como hash | Manda la spec (precisión F47-3) | No hace falta | No |
| `docs/GLOSSARY.md` propone `reclassifyToShared()` | Glosario frente a este plan | Se usa el del glosario: `reclassifyToShared` en TypeScript y `reclassify_to_shared` en SQL. **Este slice aprueba la propuesta**; el PR A quita la marca en el glosario | PR A | No |

**Resultado del gate**: **PASA.** La nota de implementación de ADR-013 §5.1, que
lo bloqueaba, está aprobada por los fundadores desde el 6 de noviembre de 2026.

## Project Structure

### Documentation (this feature)

```text
specs/003-pareja-y-balances/
├── spec.md              # Specify + Clarify (PR #47)
├── plan.md              # Este archivo
├── research.md          # Fase 0: preflight y decisiones
├── data-model.md        # Fase 1: esquema y tipos
├── quickstart.md        # Fase 1: comprobación manual
├── contracts/
│   ├── database.md      # Vistas y funciones de public
│   ├── errors.md        # JT101–JT118 y rechazo frente a resultado desconocido
│   ├── server-actions.md# Resultado de escritura, token, invitación, contexto, cursor, estado
│   └── ci.md            # Jobs, puntos de control y presupuesto e2e
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks), en su propio PR
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   ├── 2026110x000100_couple_foundation.sql      # PR A · punto de control 1
│   ├── 2026110x000200_shared_money_tables.sql    # PR A · punto de control 2
│   ├── 2026110x000300_couple_functions.sql       # PR A
│   └── 2026110x000400_shared_money_functions.sql # PR A
├── seed.sql                                      # + auxiliares de pgTAP para dos sesiones
└── tests/
    ├── 01_privileges.test.sql   # + juntia_membership, auxiliares, sin funciones de extensiones (F40-2)
    ├── 03_views.test.sql        # + vistas nuevas; las de la 002 sin compartidos
    ├── 05_direct_writes.test.sql# + tablas nuevas
    ├── 10_couple.test.sql       # nuevo
    └── 11_shared_money.test.sql # nuevo
src/
├── domain/
│   ├── allocations/   # splitAmount, validateSplit, nextSplitOnParticipantsChange (v1)
│   ├── balances/      # computeBalance, settlementSuggestion
│   ├── couple/        # estados de pareja e invitación
│   ├── transactions/  # meMonthSummary con parte compartida
│   └── golden/        # sharedOctober2026, beforeSettlement, afterSettlement
├── lib/
│   ├── db/            # couple.ts, shared-expenses.ts, settlements.ts, reclassify.ts, invitation-token.ts; errors.ts y types.ts ampliados
│   └── copy/es.ts     # copy de pareja, balance, mover y errores JT1nn
├── features/
│   ├── couple/        # Mi pareja M1–M7, /invitacion, CoupleStatus
│   ├── expenses/      # Anotar compartido, edición compartida, ReclassifySheet + ChangePreview
│   ├── balance/       # SharedBalance, desglose, hoja de liquidación, detalle de liquidación
│   ├── home/, activity/  # Nosotros y la parte compartida en Yo
│   └── context/       # S1 Context Transition
└── app/
    ├── invitacion/page.tsx          # pública, sin datos en el servidor
    └── (app)/balance/, (app)/cuenta/pareja/, (app)/page.tsx, (app)/actividad/
tests/
├── integration/   # couple.test.ts, shared-money.test.ts, concurrency.test.ts, consistency.test.ts
└── e2e/
    ├── access-account.e2e.ts   # + caso de invitación (PR B)
    ├── couple-settle.e2e.ts    # spec E2E 3 (nace en el PR C, crece en el PR D)
    └── fixtures.ts             # seedCouple(), storageState por worker y rol
```

**Structure Decision**: el monolito de la 001 y la 002. Nada nuevo fuera de
`src/features/` salvo los módulos de dominio que el maestro §7.2 ya prevé
(`allocations`, `balances`) y `couple`.

## Cómo se construye cada parte

| Parte | Cómo | Fuente |
| --- | --- | --- |
| Pareja e invitación | Funciones `create_invitation`, `regenerate_invitation`, `cancel_invitation`, `preview_invitation`, `accept_invitation`; vistas `my_couple`, `couple_members` | [data-model.md](data-model.md) §2; [contracts/database.md](contracts/database.md); R1, R3, R5 |
| Token | Navegador: token y clave; Server Action: SHA-256; base: solo el hash; `/invitacion#t=…`; `localStorage` de la intención | R3, R5; [contracts/server-actions.md](contracts/server-actions.md) §2–§3 |
| Reparto | `splitAmount` v1 en el dominio; la función lo comprueba; trigger diferido | R9; data-model §2.4 |
| Gastos compartidos | `create_shared_expense`, `update_shared_expense`, `void_shared_expense` con `expectedVersion` y bloqueo del grupo | data-model §3, §9 |
| Mover a Pareja | `reclassify_to_shared` y `undo_reclassify_to_shared`; ChangePreview con cifras de Yo, solo para la autora | ADR-001; R7 |
| Saldo y liquidación | Vista `couple_balance`; `register_settlement` deriva la dirección bajo bloqueo; `void_settlement` | R3, R4, R6; enmienda de ADR-007 |
| Lecturas | Vistas de una sola sentencia para totales; `readByCursor` para listas; filtro explícito de contexto en todas | R2, R4 |
| Contexto | `juntia_context` + membresía activa en el servidor; Skeleton hasta el RSC nuevo; cachés por contexto | contracts/server-actions.md §4; R10 |
| Escrituras en el cliente | `ok` / `rejected` / `unknown`; «Comprobar estado» | contracts/server-actions.md §1 |
| S1 y S4 | Motion for React; solo con datos o confirmación del servidor | R10 |

## PR de implementación A–D

Cuatro PR **seguidos**: cada uno sale de `main` con el anterior mergeado
(decisión 20.1). Cada uno pasa el gate completo (`verify` + jobs de CI del mismo
commit, ADR-011 §9.1), lleva su evidencia en
`specs/003-pareja-y-balances/evidence.md` y para en la revisión humana
(`AGENTS.md` 17). **Se itera contra `juntia-dev`** con su guardia y un solo agente
a la vez; **el CI corre solo en los puntos de control y el gate** de cada PR
(decisión 18; [contracts/ci.md](contracts/ci.md)). **Paso fijo de B, C y D:**
pasada de Impeccable a 390 y 1440 px en los dos temas, con los hallazgos en la
evidencia.

### PR A · Base de datos, seguridad y dinero

**Alcance.** Las cuatro migraciones, el dominio (`allocations`, `balances`,
`couple` y el dataset dorado de P0-2), `src/lib/db/` de pareja y dinero
compartido, los errores `JT101`–`JT118`, los tipos generados, pgTAP e integración.
El glosario quita la marca de propuesta a `reclassifyToShared()` y añade las filas
de `juntia_membership`, `settlements`, `split_mode`, `join_order` y los tres
estados de la pareja. **Sin pantallas.**

**FR y US:** FR-001–FR-012a, FR-018–FR-020, FR-022–FR-028, FR-031, FR-034–FR-036,
FR-042–FR-043 (servidor), FR-056–FR-058, FR-063–FR-066; US-10 entera y la mitad de
servidor de US-1, US-2, US-5, US-6, US-7 y US-8.

**Orden obligatorio:**

0. **La nota de ADR-013 §5.1 está aprobada** (fundadores, 6 de noviembre de 2026;
   la confirma el merge de este plan).
1. **Punto de control 1 — `couple_foundation`**: `juntia_membership`, `groups`,
   `group_members`, `group_invitations`, auxiliares, RLS, `my_couple`,
   `couple_members` y la lectura del perfil del otro integrante. **Ninguna tabla de
   dinero ni función que escriba.** pgTAP `01`, `03`, `05` y `10` (la parte sin
   funciones). Salida: ADR-013 [V] 1, 2 y 7 sobre las tablas nuevas, sin recursión y
   tercera cuenta sin filas.
2. **Punto de control 2 — `shared_money_tables`**: cambios de `transactions`,
   `transaction_allocations`, `settlements`, `audit_events`, `idempotency_records`,
   triggers (transiciones de la pareja, partes que suman, solo parejas activas,
   liquidaciones inmutables), **el filtro explícito de las tres vistas de la 002 en
   el mismo commit que la rama de grupo de la RLS** (R2) y las vistas nuevas, entre
   ellas `couple_balance` y los resúmenes de mes. pgTAP `01`, `03`, `05`, `07` y
   `11` (la parte sin funciones). Salida: vistas de Yo sin compartidos, ninguna
   vista de pareja con datos privados, escritura directa imposible.
3. **`couple_functions`** y **`shared_money_functions`**, con
   `10_couple.test.sql` y `11_shared_money.test.sql` completos e integración.

**Pruebas por capa:**

| Capa | Qué |
| --- | --- |
| Dominio | `splitAmount` con propiedades (suma exacta, pesos enteros, determinismo) y los casos de FR-019a; `nextSplitOnParticipantsChange` (55/45 → uno → dos = 55/45; 100/0 → uno → dos = 50/50); `computeBalance` contra `beforeSettlement` (+429.900 / −429.900) y `afterSettlement` (+229.900 / −229.900) y con la propiedad de suma cero; `settlementSuggestion`; `meMonthSummary` = 1.912.900 para Sara; estados de pareja |
| SQL/RLS (pgTAP) | Privilegios efectivos con `juntia_membership` y el inventario sin funciones de extensiones (F40-2); cada tabla nueva con su RLS para Sara, Tomás y una tercera cuenta; las transiciones de `groups` (también para `juntia_writer`); índices de una pareja por persona y de dos integrantes; partes que suman (trigger diferido); cada función con éxito, rechazo por RLS, repetición idempotente, misma clave con otra huella, cada validación y una política rota a propósito que hace fallar la función en vez de devolver éxito (R1) |
| Integración | Las carreras de FR-064 con dos sesiones reales (las sondas del preflight, convertidas en pruebas); FR-012a: la respuesta se pierde, reintento con la misma clave, mismo resultado; lecturas consistentes (R4: un total no mezcla dos estados con una inserción concurrente) y `couple_balance` = `computeBalance`; `readByCursor` sobre `couple_expenses` con inserciones y anulaciones entre páginas; ningún importe es `number` en los tipos generados; HTML/RSC fuera de alcance (no hay pantallas) |
| E2E | Ninguna nueva; corren las specs 1 y 2 |

**`[V]` que cierra:** ADR-013 [V] 1–7 sobre las tablas y funciones nuevas; ciclo
de vida y carreras; propiedades del reparto; `computeBalance`; anulación de
liquidaciones (SQL); conversión privado → compartido (SQL); idempotencia (SQL);
versión esperada.

**Criterios de salida:** job `db` verde en el último commit, con las salidas de los
dos puntos de control, cada una de su commit y su run; dataset dorado de P0-2 en
dominio e integración; cero accesos cruzados; cero duplicados; cero
actualizaciones perdidas; revisión humana del SQL.

### PR B · Mi pareja e invitaciones

**Alcance.** Mi pareja M1–M7 con CoupleStatus, SensitiveActionConfirmation y la
LimitNote de «Salir de la pareja»; «Generar enlace nuevo»; `/invitacion` pública
con el fragmento y la intención en `localStorage`; retorno tras entrar y tras
crear la cuenta; «Invitar a mi pareja» en A6 y en Nosotros sin pareja; los colores
de persona.

**FR y US:** FR-010–FR-017 (interfaz), FR-053–FR-055, FR-059, FR-067 (spec 1);
US-1 entera.

**Pruebas:** componentes de M1–M7, de la intención (crear, reintentar `unknown`
con el mismo token y ver el mismo enlace, borrar al aceptar) y del retorno; caso
nuevo de la spec E2E 1, «Invitación → login → volver → aceptar», con un
`storageState` de Tomás que entra por M5; axe de Mi pareja e `/invitacion` en los
dos temas; HTML de `/invitacion` sin datos.

**`[V]` que cierra:** retorno tras el login (prueba ejecutada); ciclo de vida
(pantallas); revisión visual de Mi pareja.

**`[P]` por aprobar viendo la pantalla:** Mi pareja (anatomía ya aprobada), el
botón «Generar enlace nuevo» y su copy, y la paleta de personas.

**Criterios de salida:** gate verde; spec 1 con el caso nuevo; capturas de 390 y
1440 px en los dos temas; Impeccable; aprobación visual.

### PR C · Gastos compartidos, Nosotros y Mover a Pareja

**Alcance.** Anotar compartido E1–E5 (contexto, pagó, participan, reparto, E3,
E5 con el saldo tachado), la edición y eliminación compartidas, Inicio y Actividad
en Nosotros, la parte compartida en Yo, Mover a Pareja A1–A5 con ChangePreview y el
deshacer, los tres resultados de escritura con «Comprobar estado» y el estado que
sobrevive a la navegación. **Nace la spec E2E 3.**

**FR y US:** FR-018–FR-024 (interfaz), FR-031–FR-041, FR-044–FR-046, FR-048–FR-049,
FR-052–FR-062, FR-067 (spec 3); US-2, US-3, US-4, US-7 y US-8.

**Pruebas:** componentes del selector de participantes y del reparto (FR-019a),
E3, E5, edición con conflicto de versión, A5 en sus dos variantes y «Comprobar
estado», y el aviso que sobrevive a la navegación. **Spec E2E 3 (nace):** gasto
compartido 50/50 con el total de Nosotros; el caso «Cambiar Yo/Nosotros» con el
HTML, el RSC y el prefetch sin datos privados (cookies válida, ausente y no
válida); el caso «Mover a Pareja». Axe de Inicio, Actividad y Anotar en Nosotros.

**Punto de control intermedio:** en cuanto nace la spec 3, `gh workflow run` para
**medir el job `e2e`** y registrarlo. Si supera 480 s, se para y se lleva a los
fundadores (R8).

**`[V]` que cierra:** privacidad por ámbito (spec 3 y componentes); conversión
privado → compartido (recorrido); umbrales de §15.7 de Anotar y Nosotros (gestor,
laboratorio).

**`[P]` por aprobar viendo la pantalla:** Anotar compartido y ChangePreview (los
dos aprobados en su forma).

**Criterios de salida:** gate verde con las specs 1, 2 y 3; medición del job
`e2e`; capturas; Impeccable; aprobación visual.

### PR D · Balance, liquidaciones, S1 y S4

**Alcance.** Balance en móvil (pantalla desde Inicio) y escritorio (destino y
módulo); SharedBalance con barras, leyenda, desglose y tabla accesible; hoja de
liquidación con «Todo» y «Otro», fecha y nota; detalle de liquidación con
«Anular»; «Deshacer» de 6 s; saldo invertido; S4 tras la confirmación del
servidor; S1 Context Transition con la coreografía y la interrupción. **La spec
E2E 3 crece.**

**FR y US:** FR-025–FR-030 (interfaz), FR-047, FR-050–FR-051, FR-054–FR-055,
FR-060, FR-067 (spec 3), FR-068; US-5, US-6 y US-9.

**Pruebas:** componentes de SharedBalance (estados por saldar, al día, vacío,
cargando e invertido; `aria-label` con cifras), de la hoja (máximo, fecha futura,
`unknown`), de la anulación y del S1 con interrupción. **Spec E2E 3 (crece):** el
saldo en Balance y la liquidación parcial, con el saldo nuevo y el gasto intacto.
Un test con motion activo para los dos momentos L2 (`docs/TESTING.md` §5, regla 3).
Axe de Balance y de la hoja.

**`[V]` que cierra:** anulación de liquidaciones (pantalla); presupuestos de tiempo
(el job `e2e` **pasa a bloquear** con el cierre de P0-2, Q17); umbrales de Balance.

**`[P]` por aprobar viendo la pantalla:** SharedBalance (aprobado en su forma),
personas y patrones, liquidación en tinta.

**Criterios de salida:** gate verde con las specs 1, 2 y 3 dentro de < 480 s;
capturas; Impeccable; aprobación visual; **salida interna aprobada por los dos
fundadores (SC-012)**.

## Dónde se mide cada criterio de éxito

| SC | Dónde | PR |
| --- | --- | --- |
| SC-001 | Capturas de 390 y 1440 px en los dos temas; Impeccable | B, C, D |
| SC-002 | axe en el job `e2e` | B, C, D |
| SC-003 | Dominio e integración con el dataset dorado; spec 3 | A, C, D |
| SC-004 | Pruebas de propiedad del dominio | A |
| SC-005 | Spec 3 (HTML, RSC y prefetch) y componentes; pgTAP de vistas | A, C |
| SC-006 | Integración de doble envío por cada escritura | A |
| SC-007 | Integración de carreras; pgTAP de índices | A |
| SC-008 | Integración concurrente de Mover a Pareja | A |
| SC-009 | Integración de cursor y de lectura consistente | A |
| SC-010 | Laboratorio, reportado como tal | C, D |
| SC-011 | Componentes con movimiento reducido; revisión humana | D |
| SC-012 | Uso real de los dos fundadores | D |
| SC-013 | Evidencia de cada `[V]`, con su responsable y su cierre | A–D |

## Riesgos

- **Presupuesto del job `e2e`.** Con la spec 3 y el axe de pareja puede superar
  480 s. Mitigación en R8; si ocurre, se para y se lleva a los fundadores.
- **`juntia-dev` ocupado por otra sesión.** Se espera a que libere el lock. **No
  se usan runners ni workflows de GitHub Actions para spikes ni verificaciones**
  (regla del gestor del 6 de noviembre de 2026); el CI solo corre en los puntos de
  control de `tasks.md` y en el gate final ([contracts/ci.md](contracts/ci.md)).
- **No-op silencioso por RLS.** Mitigado con la comprobación de `row_count` y las
  pruebas de política rota (R1).
- **La intención de invitación en `localStorage`.** Riesgo bajo y acotado (R5);
  está en la lista de los fundadores.

## Constitution Check — repetición después del diseño

- Ningún requisito de la spec queda sin dueño en un PR (tabla anterior y FR de cada
  PR).
- Ninguna decisión nueva significativa se toma en el plan sin pasar por los
  fundadores: la única es la nota de ADR-013 §5.1, aprobada el 6 de noviembre de
  2026. Las decisiones del plan (R3 token, R5 intención, R6 tabla de
  liquidaciones, R7 ventana de 60 s, R8 siembra) son locales y reversibles antes de
  tener datos.
- Ningún `[P]` que afecta al alcance queda abierto.
- `docs/TESTING.md`, `AGENTS.md`, `scripts/` y `package.json` no se tocan en esta
  rama.

**Resultado:** **PASA.**

## Para los fundadores

**Aprobado el 6 de noviembre de 2026** («Aprobamos», comunicado por el gestor en
nombre de los dos; la segunda fundadora lo confirma con el merge de este PR): los
cinco puntos de abajo, tal como están.

**Gate de este PR:**

1. **Nota de implementación de ADR-013 §5.1: el rol `juntia_membership`.** **Aprobada.** Un rol
   nuevo de solo lectura, sin `LOGIN` ni `BYPASSRLS`, dueño de las cuatro
   auxiliares que responden «¿es integrante?». Verificado en el preflight.
   Alternativa: que el dueño sea `postgres`, que funciona pero se salta toda RLS.
   Aprobada tal cual.

**Decisiones del plan, aprobadas junto con la nota:**

2. **El token de invitación en el dispositivo.** Va en el fragmento de la URL y,
   hasta aceptar, en `localStorage` del dispositivo de quien recibe la invitación
   (R5). Sirve una vez, caduca a los 7 días y exige la cuenta verificada con ese
   correo.
3. **«Deshacer» acepta hasta 60 s en el servidor**, aunque el aviso dure 6 s (R7).
4. **Liquidaciones en una tabla propia** (R6).
5. **Si la spec E2E 3 lleva el job `e2e` por encima de 480 s**, el PR C se para y
   se les pregunta. El presupuesto no se mueve solo.

## Complexity Tracking

| Añadido | Por qué hace falta | Alternativa más simple descartada porque |
| --- | --- | --- |
| Rol `juntia_membership` | Auxiliares de membresía sin recursión y sin `BYPASSRLS` | Dueño `postgres`: se salta toda RLS (R1) |
| Advisory lock por persona | Serializar la primera creación, cuando aún no hay fila de grupo | Solo el índice único: da un `23505` en vez de un error de dominio claro, y no ordena los bloqueos (R3) |
| Tabla `settlements` aparte | Imposible sumar una liquidación como gasto | Una columna de tipo en `transactions`: obliga a excluirla en cada consulta (R6) |
| Vistas de resumen de una sola sentencia | Totales y saldo consistentes | Sumar páginas en la aplicación: mezcla estados (R4) |
