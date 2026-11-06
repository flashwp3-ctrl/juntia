---

description: "Lista de tareas de la especificación 003 · Pareja y balances (P0-2)"
---

# Tasks: 003 · Pareja y balances (P0-2)

> En este archivo, `[P]` significa **paralelizable** (archivos distintos, sin
> dependencias). **No** es la marca de propuesta del paquete de diseño. Una
> tarea que implementa algo propuesto lo dice en palabras —«propuesta
> §15.9»— y nunca con la etiqueta suelta.

**Input**: `specs/003-pareja-y-balances/` — [spec.md](spec.md) (PR #47), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md) y [contracts/](contracts/) (PR #49).

**Status**: Draft — fase Tasks. No avanza a Implement sin el merge de su PR documental (ADR-012 §3.1).

**Cómo se escribió.** A partir de `.specify/templates/tasks-template.md` y de su override `.specify/templates/overrides/tasks-template.md`, siguiendo la plantilla a mano, **sin invocar la skill `speckit-tasks`**, por decisión de Alejandro del 6 de noviembre de 2026. La skill está marcada `disable-model-invocation` y no se puede invocar desde un agente. La pasada de consistencia que haría `speckit-analyze` está en el [Anexo B](#anexo-b--cobertura-y-consistencia).

**Quién lo ejecuta**: el agente que asigna la tabla de «Implementation Strategy», a partir de este archivo mergeado. Cada tarea se entiende sin la conversación que la escribió: lleva las rutas exactas, el requisito que cumple, **cómo se itera** y **cuál es su prueba**. **Las tareas no deciden y no amplían el alcance**: si una no se puede cumplir sin decidir algo que no está en la spec, el plan o sus auxiliares, la implementación se detiene y lo reporta (`AGENTS.md` 17). Las tareas **Humanas** las ejecuta la persona que nombran; el agente las prepara y pega su salida.

**Tests**: se rigen por `docs/TESTING.md` y ADR-011, que prevalecen sobre
cualquier heurística genérica de generación de tests. Cada criterio de
aceptación va en **la capa más baja que puede detectar su fallo**
(`docs/TESTING.md` §4); cada tarea de test nombra su capa, su archivo y el
criterio que cubre. **No** se genera un contract test por endpoint ni por
interfaz (ADR-012 §4). Las pruebas salen de la tabla «Pruebas por capa» de cada
PR del plan; la auditoría está en el [Anexo A](#anexo-a--auditoría-de-las-tareas-de-test-adr-012-4).

**Specs E2E que añade este slice (obligatorio)**: **1**, la **spec E2E 3 «Pareja 50/50 y liquidación»**. **Nace en el PR C**, con el gasto compartido y los casos «Cambiar Yo/Nosotros» y «Mover a Pareja», y **crece en el PR D** con Balance y la liquidación parcial (precisión F47-1). Además, la spec E2E 1 suma el caso «Invitación → login → volver → aceptar» en el PR B. Total en P0 tras la 003: **3 specs** (`docs/TESTING.md` §4). La pasada de axe no es una spec E2E.

**Organization**: una fase previa de prerrequisitos y una fase por PR de implementación, **A → B → C → D**, en serie (decisión 20.1; plan, «PR de implementación A–D»), con una fase final de aceptación que forma parte del PR D. Dentro de cada fase, grupos en orden; dentro de cada grupo, las tareas `[P]` pueden ir a la vez. Las tareas de historia llevan `[USn]`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo con las demás `[P]` **de su mismo grupo y de su mismo PR**: archivos distintos, ninguna depende de otra del grupo, y **ninguna compite por `juntia-dev`, por el mismo checkout, servidor o puerto, ni por un run de CI**. Una tarea que usa `juntia-dev`, compila, sirve la app, ejecuta `npm ci` o lanza el CI no lleva `[P]`.
- **[Story]**: historia de la spec (US1…US10). Configuración, CI, evidencia y aceptación no llevan etiqueta.
- **Humana**: la ejecuta una persona (fundadora, fundador o gestor, según se diga); nunca un agente por su cuenta.
- Debajo de cada tarea: **Cumple** (requisitos y criterios), **Itera** (dónde se prueba mientras se construye) y **Prueba / terminado cuando** (la comprobación concreta).

## Reglas que aplican a todas las tareas

Se enuncian una vez. Una tarea que las incumpla no está terminada.

1. **Iterar contra `juntia-dev`, nunca contra el CI** (decisión 18; ADR-011 §9.9; [contracts/ci.md](contracts/ci.md)). Las capas de base de datos se iteran con los comandos del PR técnico de la decisión 18 (PR #48): `npm run db:dev:reset`, `npm run test:db:dev`, `npm run test:integration:dev` y `npm run e2e:dev`, siempre con su guardia de destino (`itfrhnadovezpahikuol`) y su **lock**: **un solo agente a la vez**. Si otra sesión tiene el lock, **se espera**; nunca se fuerza con `dev:unlock` un lock ajeno.
2. **Nada de runners ni workflows de GitHub Actions para spikes ni verificaciones** (regla del gestor del 6 de noviembre de 2026). **El CI corre solo** en los puntos de control de este archivo (T012, T016, T053) y en el gate final de cada PR (T027, T039, T056, T070), con `gh workflow run ci.yml --ref <rama>` o al marcar el PR como listo. Las correcciones de una revisión se juntan en **un solo push** (`AGENTS.md` 15a).
3. **Toda evidencia de un `[V]` o de un punto de control sale del CI**, nunca de `juntia-dev` (ADR-011 §9.8). `juntia-dev` sirve para iterar.
4. **Sin Docker en los equipos** (decisión 17) y **sin datos reales en `juntia-dev` ni en el CI**.
5. **Importes nunca como `number`** en ninguna frontera (FR-007; ADR-013 §4). **Ningún camino que atiende a una persona usa `service_role`** (FR-008).
6. **Copy**: toda cadena visible y todo nombre accesible nuevos salen de `src/lib/copy/es.ts` (FR-053). La redacción final la aprueban los fundadores en cada PR. Las claves de error son las de [contracts/errors.md](contracts/errors.md).
7. **Los elementos propuestos se construyen tal como se aprobaron** (decisiones 16.6 y 20.2–20.4; maestro §15.9). Los que solo requieren aprobación viendo la pantalla se listan en la tarea de capturas de su PR.
8. **Los tests se escriben antes que el código que prueban y se ven fallar** (`docs/TESTING.md` §6). Cada test copia como comentario el criterio literal que cubre, con su referencia. En pgTAP, la identidad se fija **solo** con `set local role …` y `set local "request.jwt.claims" = '{"sub":"…","role":"authenticated","email":"…"}'`.
9. **Toda `update` dentro de una función que escribe comprueba `row_count`** (research R1), y cada función tiene una prueba con una política rota a propósito que debe hacerla fallar.
10. **Ninguna espera fija** en pruebas de navegador; `reducedMotion: 'reduce'` por defecto; `retries` 0/1; solo Chromium (ADR-011 §6).
11. **Ninguna afirmación sin salida real** (`AGENTS.md` 12 y 18). Un `[V]` se cierra pegando su salida en `specs/003-pareja-y-balances/evidence.md`.
12. **Producción**: las migraciones a producción las aplica el **gestor** en el equipo de un fundador, con su «sí» antes de cada paso de escritura, y solo con la copia semanal al día (decisión 16.11; ADR-011 §9.5).

## Interpretaciones de ejecución

No son decisiones: son lecturas necesarias para ejecutar una tarea donde el plan no fija el detalle. Si el revisor las objeta, se cambian sin tocar el alcance.

| # | Dónde | Lectura | Por qué |
| --- | --- | --- | --- |
| I1 | T009, T013 | Las partes «sin funciones» de `10_couple` y `11_shared_money` van en archivos propios (`10a_couple_tables.test.sql`, `11a_shared_tables.test.sql`) para que cada punto de control corra su capa sin pruebas en rojo de funciones que aún no existen | El plan pide en cada punto de control «la parte sin funciones» de esos archivos |
| I2 | T031b, T045 | La infraestructura de los tres resultados de escritura (`ok`/`rejected`/`unknown`) y «Comprobar estado» **nace completa en el PR B** (T031b), con las cuatro escrituras de invitación. El PR C la **amplía** a los gastos compartidos y a Mover a Pareja (T045), y el PR D la usa para las liquidaciones. Ningún PR deja a otro una parte por terminar | El plan la describe en contracts/server-actions §1 sin fijar el PR; FR-056 y FR-059 rigen desde la primera escritura compartida, que es la invitación (revisión del PR #50, F50-1) |
| I3 | T047, T061 | El saldo de una línea de Inicio en Nosotros («POR SALDAR · Tomás le debe a Sara $X · Ver balance», FR-044) entra en C con la vista `couple_balance`; la pantalla de Balance con SharedBalance entra en D | El plan pone Inicio en Nosotros en C y Balance en D |
| I4 | T038, T055, T069 | Las **capturas** para la aprobación humana son a 390 y 1440 px en los dos temas. El **barrido sin scroll horizontal** es en los siete anchos (360, 390, 430, 768, 1024, 1280 y 1440) en los dos temas, con prueba automática (F50-3) | `CLAUDE.md` 5 hace obligatorios 390 y 1440; FR-054 y SC-001 piden los siete |
| I5 | T018a, T031c, T044a, T060a | Las pruebas de integración y las E2E se escriben **antes** que el código que prueban y se ven en rojo **contra `juntia-dev`** (`test:integration:dev`, `e2e:dev`). Las tareas que las «hacen pasar» (T022–T024, T036, T051, T065) se quedan donde están, sin runs de CI adicionales | Regla 8; revisión del PR #50, F50-2 |

---

## Phase 0: Prerrequisitos

- [ ] T001 **Humana (gestor)**: comprobar, antes de empezar el PR A, que el PR #48 (comandos de `juntia-dev`, guardia y lock) está en `main`, que el `.env.test` del equipo apunta a `juntia-dev` con su clave secreta y que no hay ninguna clave de producción en él. **Si el PR #48 no está en `main`, el PR A no empieza**: no se itera contra el CI.
  - Cumple: decisión 18; regla 1 y 2.
  - Prueba / terminado cuando: `npm run db:dev:reset` se niega con un destino que no es `itfrhnadovezpahikuol` y funciona con `juntia-dev` (salida pegada sin claves en `evidence.md`).

---

## Phase 1: PR A · Base de datos, seguridad y dinero

**Purpose**: las cuatro migraciones en el orden obligatorio, el dominio del reparto y del saldo, el dataset dorado de P0-2, `src/lib/db/` de pareja y dinero compartido, los errores `JT101`–`JT119`, los tipos generados, pgTAP e integración. **Sin pantallas** (plan, PR A).

**Orden obligatorio** (plan, PR A): `couple_foundation` → **punto de control 1** → `shared_money_tables` → **punto de control 2** → `couple_functions` y `shared_money_functions`. **Si las auxiliares de membresía dan recursión o una tercera cuenta ve filas en el punto de control 1, el PR se para** y se reabre la nota de ADR-013 §5.1.

### Grupo 1A — dominio (tests primero; T002 → T003 en serie; T004, T005, T006, T007 y T008 en paralelo con ellas; T005b después de T002, T003 y T006)

- [ ] T002 Test de **dominio** en `src/domain/allocations/allocations.test.ts` y después `src/domain/allocations/index.ts`: `SplitMode`, `splitAmount` (algoritmo **versión 1**: pesos enteros, mayor residuo, desempate por `joinOrder`), `validateSplit` («Faltan $X», «Sobran $X») y `nextSplitOnParticipantsChange`
  - Casos: propiedades (para cualquier importe hasta 999.999.999 pesos, modo y participantes, las partes son múltiplos de 100 unidades menores, suman exactamente el importe y el resultado es determinista); $150.000 al 70/30 → 105.000/45.000; $100.001 al 50/50 → Sara 50.001 / Tomás 50.000; $100.001 al 33/67 → 33.000/67.001; Tomás paga $100.001 y solo participa Sara → parte de Sara 100.001; Porcentaje 100/0 ≡ un participante; 55/45 → uno → dos = 55/45; 100/0 → uno → dos = 50/50 con los dos.
  - Cumple: FR-019, FR-019a, FR-020; SC-004 (reparto); nota de ADR-002 (decisión 20.8).
  - Itera: `npm run test:unit -- --changed`.
  - Prueba / terminado cuando: el test se vio fallar y después pasa en `npm run test:unit`.

- [ ] T003 Test de **dominio** en `src/domain/balances/balances.test.ts` y después `src/domain/balances/index.ts`: `computeBalance(expenses, settlements, members)` y `settlementSuggestion`
  - Casos: propiedad «la suma de `net` es 0»; sugerencia única deudor → acreedor por `|net|`; saldo invertido tras una corrección cambia la dirección; las liquidaciones anuladas no cuentan.
  - Cumple: FR-025, FR-026, FR-030; SC-004 (saldo).
  - Itera / prueba: como T002.

- [ ] T004 [P] Test de **dominio** en `src/domain/couple/couple.test.ts` y después `src/domain/couple/index.ts`: estados `none | provisional | active`, `InvitationView` e `isExpired(invitation, now)` (vencida exactamente a los 7 días)
  - Cumple: FR-010, FR-011.
  - Itera / prueba: como T002.

- [ ] T005 [P] Preparar el fixture en `src/domain/golden/october-2026.ts`: `sharedOctober2026` (las seis filas de la spec, **copiadas, no recalculadas**), `settlementOctober25` (Tomás → Sara 200.000, 25 oct) y los estados `beforeSettlement` y `afterSettlement`. Solo datos: no llama a ninguna función de T002, T003 ni T006
  - Cumple: maestro §15.10, «Dataset dorado», reglas 1 y 2.
  - Prueba / terminado cuando: `npm run typecheck` pasa y las filas coinciden carácter a carácter con la tabla «Dataset dorado de P0-2» de la spec.

- [ ] T005b Test de **dominio** en `src/domain/golden/october-2026.test.ts` que verifica el fixture de T005 con las funciones de T002, T003 y T006 (**después** de esas tres)
  - Casos: total 2.840.000 y desglose Hogar 1.600.000 · Mercado 640.000 · Servicios 360.000 · Restaurantes 240.000; `beforeSettlement` Sara +429.900 / Tomás −429.900; `afterSettlement` 229.900 con el gasto en 2.840.000; Yo de Sara 1.912.900 (con T006); de Tomás solo su parte compartida, 1.340.000 (precisión F47-9).
  - Cumple: SC-003 (dominio); maestro §15.10, «Dataset dorado», reglas 1, 2 y 4.
  - Prueba / terminado cuando: el test pasa con T002, T003 y T006.

- [ ] T006 [P] Test de **dominio** en `src/domain/transactions/transactions.test.ts` y ampliación de `src/domain/transactions/`: `meMonthSummary` con la parte compartida y `groupByDay` con filas de liquidación
  - Cumple: FR-045 (dominio); DEC-G04 `gasto_consumo` de Yo.
  - Itera / prueba: como T002.

- [ ] T007 [P] Ampliar `src/lib/db/errors.ts` y `src/lib/db/errors.test.ts` (Vitest `domain`) con `JT101`–`JT119` y sus errores de dominio, y añadir sus claves a `src/lib/copy/es.ts` según [contracts/errors.md](contracts/errors.md); `23505` sobre los índices de pareja se traduce a `JT101`
  - Cumple: FR-009, FR-053.
  - Prueba / terminado cuando: cada código de [contracts/errors.md](contracts/errors.md) tiene su error y su clave; `npm run typecheck` pasa; la redacción queda listada en el PR para los fundadores.

- [ ] T008 [P] Actualizar `docs/GLOSSARY.md`: quitar la marca **[propuesta]** de `reclassifyToShared()` (aprobada por este slice, plan, «Conflictos») y añadir las filas de `juntia_membership`, `settlements`, `split_mode`, `join_order`, los estados de pareja (`provisional`, `active`, `discarded`) y `write_status`, citando la 003
  - Cumple: `docs/GLOSSARY.md` §11; plan, PR A.
  - Prueba / terminado cuando: cada identificador nuevo de [data-model.md](data-model.md) que nombra un concepto de negocio tiene su fila.

### Grupo 1B — `couple_foundation` y punto de control 1 (en serie)

- [ ] T009 Tests **SQL/RLS (pgTAP)** antes de la migración: auxiliares de dos sesiones en `supabase/seed.sql` (esquema `tests`); `supabase/tests/01_privileges.test.sql` (rol `juntia_membership` `nologin nobypassrls`, solo `select` en tres tablas, dueño de exactamente las cuatro auxiliares; `pg_has_role(r, 'juntia_membership', 'MEMBER')` y `'USAGE'` falsos para `anon`, `authenticated` y `juntia_writer`; inventario de funciones ejecutables **sin las de extensiones**, F40-2); `03_views.test.sql` (`my_profile` con Sara y Tomás emparejados devuelve solo el propio; `my_couple`; `couple_members` solo con `display_name`, `role` y `join_order`); `05_direct_writes.test.sql` (escritura directa imposible en `groups`, `group_members` y `group_invitations`); `10a_couple_tables.test.sql` (RLS con Sara, Tomás y una tercera cuenta; índices de una pareja por persona y de dos integrantes; política única de `update` de `groups` y triggers `groups_guard_transition` y `groups_check_state`: **como `juntia_writer` con `update` directo** fallan sin efectos activar una provisional de un solo integrante, descartar una activa o devolverla a provisional y reactivar una descartada; política de `insert` de `group_members`)
  - Cumple: FR-001, FR-003, FR-004 (pareja), FR-010; F49-1, F49-5, F49-6; [data-model.md](data-model.md) §2.1, §2.2, §3.4, §3.5 y §5.
  - Itera: `npm run test:db:dev` (deben fallar: no hay migración).
  - Prueba / terminado cuando: los tests fallan por la ausencia de los objetos, no por errores de sintaxis.

- [ ] T010 Migración `supabase/migrations/2026110x000100_couple_foundation.sql` según [data-model.md](data-model.md) §1–§5: `juntia_membership`, `groups`, `group_members`, `group_invitations` (con `inviter_display_name`), índices, auxiliares (`is_group_member`, `is_couple_member`, `is_invited_to`, `shares_couple_with`) y `current_email()`, RLS y políticas, `groups_writer_update`, triggers de transición y de estado, la ampliación de `profiles_read` **y en el mismo commit** `my_profile` con `where user_id = (select auth.uid())`, vistas `my_couple` y `couple_members`. Cada `security definer` lleva su comentario de justificación (ADR-013 §5.7). Regenerar `src/lib/supabase/database.types.ts`
  - Cumple: FR-001, FR-003, FR-004, FR-010; nota de ADR-013 §5.1.
  - Itera: `npm run db:dev:reset` y `npm run test:db:dev` hasta que T009 pasa.
  - Prueba / terminado cuando: T009 pasa en `juntia-dev`.

- [ ] T011 Iteración del punto de control 1 en `juntia-dev`: además de T009, `npm run test:integration:dev` con las pruebas de la 002 (ninguna se rompe con `my_profile` filtrado)
  - Itera / prueba: los dos comandos en verde en `juntia-dev`, salida sin claves.

- [ ] T012 **Punto de control 1 (CI)**: `gh workflow run ci.yml --ref <rama>` sobre el commit de T010, en un commit propio
  - Cumple: ADR-013 [V] 1, 2 y 7 sobre las tablas nuevas; auxiliar sin recursión; tercera cuenta sin filas (spec, «Inventario de `[V]`»: responsable CI, cierre antes del merge del PR A).
  - Prueba / terminado cuando: el job `db` está en verde y su salida, con el enlace al run, está en `evidence.md`.

### Grupo 1C — `shared_money_tables` y punto de control 2 (en serie)

- [ ] T013 Tests **pgTAP** antes de la migración: `03_views.test.sql` (con Sara y Tomás emparejados y gastos compartidos sembrados, las **cuatro vistas de la 002** devuelven solo lo propio y privado; las vistas de pareja no exponen ningún movimiento privado ni `moved_from_transaction_id`; `couple_month_summary`, `me_month_summary` y `couple_balance` reproducen `beforeSettlement`); `05_direct_writes.test.sql` (escritura directa imposible en `transaction_allocations` y `settlements`); `07_transactions.test.sql` (`payer_user_id` obligatorio en grupo, `transactions_group_no_owner`, partes que suman con el trigger diferido, partes múltiplos de 100, solo parejas `active` admiten movimientos y liquidaciones); `11a_shared_tables.test.sql` (liquidaciones: dirección distinta, inmutables salvo la anulación, nunca se borran)
  - Cumple: FR-002, FR-004, FR-005, FR-037, FR-043 (vistas); F49-1; research R2 y R4; [data-model.md](data-model.md) §2.4, §2.5, §3, §6 y §7.
  - Itera / prueba: como T009.

- [ ] T014 Migración `2026110x000200_shared_money_tables.sql`: cambios de `transactions` (retirar `transactions_private_only_p0_1`, clave foránea de grupo, `payer_user_id`, `moved_*`, `restored_from_transaction_id`, `split_mode`, `split_percents`, `updated_by`), `transaction_allocations`, `settlements`, ampliación de `audit_events` e `idempotency_records`, triggers, **la rama de grupo de la RLS de `transactions` en el mismo commit que el filtro explícito de `my_transactions`, `my_transaction_months` y `my_recent_categories`**, vistas `couple_expenses`, `couple_settlements`, `couple_transaction_months`, `my_shared_parts` y las tres de resumen de una sola sentencia. Regenerar los tipos
  - Cumple: FR-002, FR-004, FR-005, FR-029, FR-037, FR-042, FR-043; research R2, R4 y R6.
  - Itera: `npm run db:dev:reset` y `npm run test:db:dev` hasta que T013 pasa.
  - Prueba / terminado cuando: T013 pasa en `juntia-dev`.

- [ ] T015 Iteración del punto de control 2 en `juntia-dev`: `test:db:dev` y `test:integration:dev` completos (la 002 sigue en verde)
  - Prueba: los dos comandos en verde.

- [ ] T016 **Punto de control 2 (CI)**: `gh workflow run ci.yml --ref <rama>` sobre el commit de T014
  - Cumple: vistas de Yo sin compartidos; ninguna vista de pareja con datos privados; escritura directa imposible.
  - Prueba / terminado cuando: el job `db` está en verde y su salida está en `evidence.md`.

### Grupo 1D — funciones, `src/lib/db/` e integración (solo después de T016)

- [ ] T017 Tests **pgTAP** `supabase/tests/10_couple.test.sql`: `create_invitation`, `regenerate_invitation`, `cancel_invitation`, `preview_invitation` y `accept_invitation`, cada una con éxito, rechazo con una tercera cuenta, repetición idempotente (**mismo resultado**, FR-012a), misma clave con otra huella (`JT008`), cada validación (`JT101`–`JT104`, `JT108`, `JT109`), regenerar sube `version` y una segunda regeneración con la misma versión da `JT011` sin reemplazar (F49-3), el hash es lo único guardado y una política rota a propósito que hace fallar la función (regla 9)
  - Cumple: FR-010–FR-014, FR-056, FR-063; precisiones F47-2 y F47-3.
  - Itera / prueba: como T009.

- [ ] T018 Tests **pgTAP** `supabase/tests/11_shared_money.test.sql`: `create_shared_expense`, `update_shared_expense`, `void_shared_expense`, `reclassify_to_shared`, `undo_reclassify_to_shared`, `register_settlement`, `void_settlement` y `write_status`, con los mismos casos que T017 más: versión esperada en editar, eliminar y deshacer la creación (`JT011`, `JT012`); ventana de 60 s y dependencias del deshacer (`JT117`); dirección derivada y límite del saldo (`JT106`, `JT107`), fecha futura (`JT114`); `write_status` de otra persona da `not_found`. **Compatibilidad con la 002** (F49-2): `update_transaction` y `void_transaction` contra un gasto compartido, con la cuenta de cada integrante, fallan con `JT010` sin cambiar el gasto, sus partes, su versión ni la auditoría; las siete funciones de la 002 que escriben fallan con una política rota
  - Cumple: FR-018, FR-022–FR-024, FR-027, FR-028, FR-031, FR-034–FR-036, FR-056, FR-057, FR-063; F49-2, F49-4.
  - Itera / prueba: como T009.

- [ ] T018a Escribir **primero** las pruebas de **integración** de T022, T023 y T024 (`tests/integration/concurrency.test.ts`, `shared-money.test.ts` y `consistency.test.ts`, con todos sus casos) y verlas **en rojo contra `juntia-dev`** con `npm run test:integration:dev`, antes de T019, T020 y T021
  - Cumple: regla 8; F50-2; interpretación I5.
  - Prueba / terminado cuando: las pruebas fallan porque faltan las funciones y la capa `src/lib/db/`, no por errores de sintaxis ni de arnés; la salida del rojo queda en `evidence.md`.

- [ ] T019 Migración `2026110x000300_couple_functions.sql` con las cinco funciones de invitación (entrada en `public` y escritura en `juntia_private`, dueño `juntia_writer`, bloqueos persona → grupo, `row_count`, orden de escritura de `accept_invitation`: membresía, activar, aceptar invitación)
  - Cumple: FR-006, FR-010–FR-014; research R3; [contracts/database.md](contracts/database.md).
  - Itera: `db:dev:reset` y `test:db:dev` hasta que T017 pasa.

- [ ] T020 Migración `2026110x000400_shared_money_functions.sql` con las ocho funciones de dinero compartido y `write_status`, y la **redefinición de `update_transaction` y `void_transaction` de la 002** (solo privados propios) con `row_count` en las seis funciones de la 002 que escriben y en `ensure_profile` ([data-model.md](data-model.md) §3.5)
  - Cumple: FR-006, FR-018–FR-028, FR-031–FR-036, FR-056–FR-058; F49-2, F49-4.
  - Itera: `db:dev:reset` y `test:db:dev` hasta que T018 pasa.

- [ ] T021 `src/lib/db/`: `couple.ts`, `shared-expenses.ts`, `settlements.ts`, `reclassify.ts`, `invitation-token.ts` (SHA-256 con `crypto.subtle`, nunca registra ni devuelve el token), `write-status.ts`, y ampliación de `types.ts` (importes `string`) y de `paginate.ts` para `couple_expenses` y `couple_settlements`
  - Cumple: FR-007, FR-012a, FR-042; [contracts/server-actions.md](contracts/server-actions.md) §1–§2.
  - Itera: `npm run typecheck` y los tests de T022–T024.

- [ ] T022 Hacer pasar la **integración** de `tests/integration/concurrency.test.ts` escrita en T018a (dos sesiones reales): dos aceptaciones; anular contra aceptar y generar enlace contra aceptar, en los dos órdenes; regenerar contra regenerar; invitaciones cruzadas; primera creación desde dos pestañas; dos liquidaciones del total; edición contra edición; editar y luego eliminar y eliminar y luego editar; deshacer la creación contra una edición; edición contra liquidación; Mover a Pareja contra edición; ningún instante con dos gastos activos
  - Cumple: FR-010b, FR-057, FR-064; SC-007, SC-008; §15.6.3 punto 1.
  - Itera: `npm run test:integration:dev`.
  - Prueba / terminado cuando: cada carrera da un ganador y el perdedor no cambia nada (estado, versión, membresías, partes y auditoría comparados antes y después).

- [ ] T023 Hacer pasar la **integración** de `tests/integration/shared-money.test.ts` escrita en T018a: doble envío y reintento de **cada** escritura compartida (una sola escritura); FR-012a: respuesta perdida, reintento con la misma clave, mismo resultado y mismo enlace; `write_status` tras una respuesta perdida de **cada una de las cuatro escrituras de invitación** (crear, regenerar, anular y aceptar) y de las de dinero, sin reejecutar ni duplicar, y `not_found` con la clave de otra persona; las RPC de la 002 contra un gasto compartido **por la API**, sin efectos; `my_profile` y `couple_members` con dos cuentas emparejadas; importes de ida y vuelta con `9007199254740993`; ningún importe es `number` en los tipos generados
  - Cumple: FR-007, FR-012a, FR-056, FR-059 (servidor); SC-006; F49-1, F49-2, F49-4.
  - Itera / prueba: como T022.

- [ ] T024 Hacer pasar la **integración** de `tests/integration/consistency.test.ts` escrita en T018a: un total de `couple_month_summary`, `me_month_summary` o `couple_balance` nunca mezcla dos estados con una inserción concurrente; `couple_balance` = `computeBalance` sobre los mismos datos; `readByCursor` sobre `couple_expenses` con inserciones y anulaciones entre páginas (ninguna fila dos veces; toda fila que existía de principio a fin, una vez); el dataset dorado sembrado **por las funciones reales** da `beforeSettlement` y `afterSettlement`
  - Cumple: FR-042, FR-043; SC-003 (integración), SC-009; research R4.
  - Itera / prueba: como T022.

- [ ] T025 `tests/support/seed.ts` y `tests/e2e/fixtures.ts`: `seedCouple()` por base de datos (una pareja aislada por worker, con el dataset dorado opcional) y un `storageState` por worker y por rol, Sara y Tomás
  - Cumple: FR-066; `docs/TESTING.md` §5, reglas 1 y 2; research R8.
  - Itera: `npm run e2e:dev` con las specs 1 y 2, que siguen en verde.

- [ ] T026 Iteración completa del PR A en `juntia-dev`: `test:db:dev`, `test:integration:dev` y `e2e:dev` en verde
  - Prueba: los tres comandos en verde, salida sin claves.

### Grupo 1E — salida del PR A

- [ ] T027 **Gate final del PR A (CI)**: `verify` local más el run de CI sobre el mismo commit; `evidence.md` con las salidas de T012, T016 y este run, y el cierre de cada `[V]` del PR A con su salida: ADR-013 [V] 1–7 sobre lo nuevo, ciclo de vida y carreras, propiedades del reparto, `computeBalance`, anulación de liquidaciones (SQL), conversión privado → compartido (SQL), idempotencia (SQL) y versión esperada; presupuesto de `test:db` (< 60 s) medido
  - Cumple: SC-006–SC-009, SC-013 (PR A).
  - Prueba / terminado cuando: el gate está en verde y cada `[V]` tiene su salida.

- [ ] T028 **Humana (fundadores)**: revisión del SQL de las cuatro migraciones en el PR A antes del merge
  - Prueba / terminado cuando: aprobación registrada en el PR.

- [ ] T029 **Humana (gestor)**: después del merge del PR A, aplicar las cuatro migraciones a **producción** con la confirmación del fundador en cada paso de escritura y la copia semanal al día (regla 12); comprobar el `project-ref` antes de empezar y desenlazar al terminar
  - Prueba / terminado cuando: `evidence.md` registra las migraciones aplicadas, sin claves.

---

## Phase 2: PR B · Mi pareja e invitaciones

**Purpose**: Mi pareja M1–M7, «Generar enlace nuevo», `/invitacion` pública con el token en el fragmento, retorno tras entrar y tras crear la cuenta, «Invitar a mi pareja» en A6 y en Nosotros sin pareja, colores de persona. **Historia:** US1.

### Grupo 2A — tests primero

- [ ] T030 [P] [US1] Tests de **componentes** en `src/features/couple/couple.test.tsx`: M1–M7 con CoupleStatus (ACTIVA, PENDIENTE, SOLO TÚ, NO VÁLIDA), sin el correo del otro ni saldos; M4 con «Generar enlace nuevo» y «Anular» (SensitiveActionConfirmation con el foco en la opción segura), nunca «Copiar enlace»; M3b y la respuesta de regenerar muestran el enlace una sola vez; la LimitNote de «Salir de la pareja» sin control; `JT103` lleva a M1
  - Cumple: US-1 escenarios 1–4, 8–11; FR-012, FR-015; precisiones F47-2 y F47-3.
  - Itera: `npm run test:components -- --changed`.

- [ ] T031 [P] [US1] Tests de **componentes** en `src/features/couple/intent.test.ts`: el token se genera en el navegador con la clave; un resultado `unknown` y el reintento con la misma clave muestran **el mismo enlace**; la intención de `localStorage["juntia:invitation"]` se borra al aceptar, al ver M7, con «Ahora no», al cerrar sesión y **cuando tiene 7 días o más** (F49-7); el fragmento se limpia con `history.replaceState`; al montar con sesión y una intención vigente se va a `/invitacion`
  - Cumple: FR-012a, FR-014; US-1 escenarios 5 y 10; [contracts/server-actions.md](contracts/server-actions.md) §2–§3; research R5.
  - Itera: como T030.

- [ ] T031a [P] [US1] Tests de **componentes** en `src/features/couple/write-result.test.tsx` para las **cuatro escrituras de invitación** (crear, regenerar, anular y aceptar): `ok`; `rejected` con su `JT`; `unknown` sin afirmar que no se escribió, con los campos bloqueados, «Reintentar» idéntico (misma clave y, en crear y regenerar, el mismo token) y «Comprobar estado» con `write_status` (`completed` lleva al resultado real; `not_found` dice que todavía no consta). Incluye **aceptar con la respuesta perdida**: «Comprobar estado» da `completed` y lleva a M1 sin aceptar otra vez
  - Cumple: FR-056, FR-059 (B); precisión F47-4; revisión del PR #50, F50-1.
  - Itera: `npm run test:components -- --changed`.

- [ ] T031c [US1] Escribir **primero** el caso «Invitación → login → volver → aceptar» de la **spec E2E 1** (`tests/e2e/access-account.e2e.ts`) y verlo **en rojo contra `juntia-dev`** con `npm run e2e:dev`, antes de T032
  - Cumple: regla 8; F50-2; interpretación I5.
  - Prueba / terminado cuando: el caso falla porque faltan Mi pareja e `/invitacion`, no por el arnés; la salida queda en `evidence.md`.

### Grupo 2B — implementación (en serie: comparten `es.ts` y el shell)

- [ ] T031b [US1] Infraestructura **completa** de resultados de escritura en `src/features/shared/write-result.ts` (`ok`/`rejected`/`unknown`, clave por apertura, bloqueo de la intención, «Reintentar» idéntico y «Comprobar estado» con `write_status` de `src/lib/db/write-status.ts`), conectada a las cuatro escrituras de invitación
  - Cumple: FR-056, FR-059; [contracts/server-actions.md](contracts/server-actions.md) §1; interpretación I2.
  - Itera: T031a en verde.

- [ ] T032 [US1] `src/features/couple/` y `src/app/(app)/cuenta/pareja/page.tsx`: Mi pareja M1–M4 sobre `my_couple` y `couple_members`, Server Actions de crear, regenerar y anular (token del navegador, hash en el servidor)
  - Cumple: FR-010–FR-012a, FR-015; US-1.
  - Itera: T030 en verde; `npm run e2e:dev` para probar a mano en `juntia-dev`.

- [ ] T033 [US1] `src/app/invitacion/page.tsx` y `src/lib/routes.ts`: ruta **pública** sin datos en el servidor; M5 sin sesión (con `volver=/invitacion`), M6 con `preview_invitation`, M7 con el mismo texto para todos los motivos, aceptar
  - Cumple: FR-013, FR-014; US-1 escenarios 5–7 y 9.
  - Itera: T031 en verde.

- [ ] T034 [US1] Retorno y puntos de entrada: redirección a `/invitacion` con una intención vigente; «Invitar a mi pareja» en A6 (04·17) y en el estado de Nosotros sin pareja
  - Cumple: FR-014, FR-016; US-3 escenario 7.
  - Itera: componentes y `e2e:dev`.

- [ ] T035 [US1] Colores de persona por `join_order` (`person.1`, `person.2` y sus patrones) en Avatar y CoupleStatus, y el copy de pareja en `src/lib/copy/es.ts`
  - Cumple: FR-017, FR-053, FR-054.
  - Prueba: componentes; revisión visual en T038.

### Grupo 2C — spec E2E 1, axe y salida

- [ ] T036 [US1] Hacer pasar el caso de la **spec E2E 1** escrito en T031c («Invitación → login → volver → aceptar», con Tomás entrando por M5) y comprobar el HTML de `/invitacion` sin ningún dato de la pareja. axe en los dos temas del inventario de estados nuevos del PR B: M1, M2, M3, **M3b** (enlace visible), **M4** (pendiente y vencida), M5, **M6**, **M7** y la **confirmación de anular** (SensitiveActionConfirmation)
  - Cumple: FR-067 (spec 1), FR-068; SC-002 (B); [V] «Retorno tras el login» (prueba ejecutada, responsable implementador, cierre antes del merge del PR B).
  - Itera: `npm run e2e:dev`.

- [ ] T037 Iteración completa del PR B en `juntia-dev`: `e2e:dev` (specs 1 y 2) y `test:integration:dev`
  - Prueba: en verde.

- [ ] T038 Responsive y accesibilidad del PR B, con prueba automática en el proyecto `a11y` (`tests/a11y/couple.a11y.ts`), iterada con `e2e:dev` y ejecutada en el gate:
  - **barrido sin scroll horizontal** (`scrollWidth <= clientWidth`) de Mi pareja (M1–M4), `/invitacion` (M5–M7), A6 y Nosotros sin pareja en **los siete anchos** (360, 390, 430, 768, 1024, 1280 y 1440) y en los dos temas;
  - **teclado**: «Crear invitación», «Generar enlace nuevo», «Copiar enlace» de M3b, «Anular» con el foco inicial en la opción segura y Escape, y «Aceptar invitación», todo operable sin ratón;
  - **texto al 200 %** en esas pantallas: sin pérdida de contenido ni solapamientos;
  - **objetivos de 44 px** en esos controles (`boundingBox`).

  Además, capturas a 390 y 1440 px en los dos temas para la aprobación humana, y pasada de **Impeccable** con hallazgos y correcciones en `evidence.md`. **Impeccable no cuenta como evidencia de FR-054**: la evidencia son las pruebas de arriba. Lista de lo que se aprueba viendo la pantalla: Mi pareja (anatomía aprobada, decisión 16.6), el botón «Generar enlace nuevo» y su copy, y la paleta de personas (propuesta §15.9).
  - Cumple: FR-054, FR-055, SC-001 (B); F50-3.

- [ ] T039 **Gate final del PR B (CI)** sobre el mismo commit que `verify`; `evidence.md` con el run, la salida del barrido de T038 y el cierre de FR-056 y FR-059 para las cuatro escrituras de invitación (T031a y T023)
  - Prueba / terminado cuando: verde con las specs 1 y 2 y el proyecto `a11y`.

- [ ] T040 **Humana (fundadores)**: aprobación visual del PR B viendo las capturas
  - Prueba / terminado cuando: aprobación registrada en el PR.

---

## Phase 3: PR C · Gastos compartidos, Nosotros y Mover a Pareja

**Purpose**: Anotar compartido E1–E5, edición y eliminación compartidas, Inicio y Actividad en Nosotros, la parte compartida en Yo, Mover a Pareja A1–A5 con ChangePreview y deshacer, los tres resultados de escritura con «Comprobar estado» y el estado que sobrevive a la navegación. **Nace la spec E2E 3.** **Historias:** US2, US3, US4, US7 y US8.

### Grupo 3A — tests primero

- [ ] T041 [P] [US2] Tests de **componentes** en `src/features/expenses/annotate-shared.test.tsx`: E1 en Nosotros con el último pagador y reparto de esa persona (o «Pagó: yo» y 50/50 la primera vez), siempre visibles; el selector de participantes (FR-019a: de dos a uno pasa al 100 %; de uno a dos restaura solo un reparto con las dos partes positivas, si no 50/50); Porcentaje e Importe; E3 «Faltan $X» y «Sobran $X»; E5 con el saldo tachado; la ruta mínima de 2 toques; Anotar en Yo sin Pagó, Participan ni Reparto
  - Cumple: US-2 escenarios 1–5, 4a–4f, 7–8; FR-019a, FR-021.
  - Itera: `npm run test:components -- --changed`.

- [ ] T042 [P] [US7] Tests de **componentes** en `src/features/expenses/shared-edit.test.tsx` y `src/features/expenses/write-result.test.tsx`: edición compartida con el aviso y los campos de Q12; conflicto de versión con «{nombre} cambió este gasto antes» y «{nombre} ya lo eliminó»; `ok`/`rejected`/`unknown` (con `unknown` nunca se afirma que no se escribió; «Comprobar estado» con `completed` y con `not_found`); el aviso con «Deshacer» y el resaltado sobreviven a la navegación, y una respuesta tardía no pisa otro aviso; la hoja guarda su contexto aunque cambie el selector (FR-062)
  - Cumple: US-7; FR-057, FR-059–FR-062.
  - Itera: como T041.

- [ ] T043 [P] [US3] Tests de **componentes** en `src/features/home/home-couple.test.tsx` y `src/features/activity/activity-couple.test.tsx`: Inicio y Actividad en Nosotros con el dataset `beforeSettlement` (2.840.000, desglose, «Tomás le debe a Sara $429.900»); sin ningún privado; con el servidor en contexto nulo o sin pareja activa no se pintan datos; Yo con «Solo tuyos» y «Tu parte compartida» y las filas «Compartido · tu parte»; estados vacío, cargando y error
  - Cumple: US-3, US-4; FR-037–FR-041, FR-044–FR-046, FR-048–FR-049.
  - Itera: como T041.

- [ ] T044 [US8] Tests de **componentes** en `src/features/expenses/reclassify.test.tsx`: A1 sin el botón en un ingreso ni sin pareja activa; A2 con importe y pagador fijos; A3 con ChangePreview solo con cifras de Sara; A4 con «movido desde Yo» y «Deshacer»; A5 en sus dos variantes (rechazo confirmado frente a resultado desconocido con «Comprobar estado»)
  - Cumple: US-8; FR-031–FR-036; precisión F47-4.
  - Itera: como T041.

- [ ] T044a Escribir **primero** los casos de la **spec E2E 3** en `tests/e2e/couple-settle.e2e.ts` (gasto compartido 50/50 con el total de Nosotros; «Cambiar Yo/Nosotros» con el HTML, el RSC y el prefetch sin datos privados con la cookie válida, ausente y no válida; «Mover a Pareja») y verlos **en rojo contra `juntia-dev`** con `npm run e2e:dev`, antes de T045
  - Cumple: regla 8; F50-2; interpretación I5.
  - Prueba / terminado cuando: los casos fallan porque falta lo que prueban, no por el arnés; la salida queda en `evidence.md`.

### Grupo 3B — implementación (en serie)

- [ ] T045 **Ampliar** el módulo común de T031b (`src/features/shared/write-result.ts`) a las escrituras de gasto compartido y de Mover a Pareja, y el proveedor de Anotar a avisos por operación y por contexto; `router.refresh()` al volver a la pestaña (Q16). No completa nada de B: B ya lo tiene entero
  - Cumple: FR-059–FR-061; [contracts/server-actions.md](contracts/server-actions.md) §1 y §6; interpretación I2.
  - Itera: T042 en verde.

- [ ] T046 [US2] Anotar compartido en `src/features/expenses/`: contexto, pagó, participan, reparto con `splitAmount`, E3, E5 con el saldo tachado (Anotar compartido aprobado en su forma, decisión 20.4)
  - Cumple: FR-018–FR-021, FR-052; US-2.
  - Itera: T041 en verde; `npm run e2e:dev`.

- [ ] T047 [US7] Edición y eliminación compartidas con `expectedVersion`, «Editado por X · fecha» y el «Deshacer» de la creación
  - Cumple: FR-022–FR-024, FR-057; US-7.
  - Itera: T042 en verde.

- [ ] T048 [US3] `src/lib/server-context.ts` (membresía activa además de la cookie), Inicio en Nosotros con `couple_month_summary` y la línea de saldo de `couple_balance` (interpretación I3), y Yo con `me_month_summary` y `my_shared_parts`; prefetch sin datos del otro contexto y cachés por contexto
  - Cumple: FR-037–FR-041, FR-044, FR-045, FR-048, FR-049; US-3, US-4.
  - Itera: T043 en verde.

- [ ] T049 [US3] Actividad en Nosotros con `couple_expenses` y `couple_settlements` por cursor, filtros, buscador, flechas de mes (`couple_transaction_months`), detalle con «A quién le corresponde» y tabla de escritorio con «Pagó · Reparto»
  - Cumple: FR-042, FR-046; US-3 escenarios 4–6.
  - Itera: T043 en verde.

- [ ] T050 [US8] Mover a Pareja A1–A5 en `src/features/expenses/reclassify-*.tsx`, desde el detalle y desde Editar, con ChangePreview (aprobado en su forma, decisión 20.3) y el deshacer
  - Cumple: FR-031–FR-036; US-8.
  - Itera: T044 en verde; `npm run e2e:dev`.

### Grupo 3C — spec E2E 3, axe, medición y salida

- [ ] T051 [US3] **Spec E2E 3 nace**: hacer pasar los casos escritos en T044a. Más, en el proyecto `a11y` (`tests/a11y/couple-shared.a11y.ts`), agrupado por ruta:
  - **axe** en los dos temas de Inicio, Actividad y Anotar en Nosotros y del **inventario de estados nuevos del PR C**: edición compartida (con el aviso y en conflicto de versión), la **confirmación de eliminar** un gasto compartido, **ChangePreview** (A3) y **A5** de Mover a Pareja en sus dos variantes (rechazo confirmado y resultado desconocido);
  - **teclado**: el selector de participantes, los modos de reparto, los campos de Importe y Porcentaje, Guardar con Enter y Escape para cerrar, y el flujo A1–A4 de Mover a Pareja;
  - **texto al 200 %** y **objetivos de 44 px** en esos controles nuevos
  - Cumple: FR-054, FR-067 (spec 3), FR-068; SC-002 y SC-005 (C); F50-3; [V] «Privacidad por ámbito» y «Conversión privado → compartido» (recorrido), responsable CI, cierre antes del merge del PR C.
  - Itera: `npm run e2e:dev`.

- [ ] T052 Iteración completa del PR C en `juntia-dev`: `e2e:dev` (specs 1, 2 y 3), `test:integration:dev`
  - Prueba: en verde.

- [ ] T053 **Punto de control intermedio (CI)**: `gh workflow run ci.yml --ref <rama>` en cuanto T051 está en verde en `juntia-dev`, para **medir el job `e2e`** con la spec 3. Duración en `evidence.md`
  - Cumple: decisión 19.5; research R8; plan, PR C.
  - Prueba / terminado cuando: la duración está registrada. **Si supera 480 s, el PR se para** y el gestor lo lleva a los fundadores (aprobado el 6 de noviembre de 2026); el presupuesto no se mueve.

- [ ] T054 **Humana (gestor)**: medición en laboratorio de INP al abrir Anotar en Nosotros y al guardar un gasto compartido, y de CLS en las cargas con Skeleton de Inicio y Actividad en Nosotros, reportadas como laboratorio
  - Cumple: SC-010 (C); [V] «Umbrales de §15.7», responsable gestor, cierre antes del merge del PR C.

- [ ] T055 **Barrido sin scroll horizontal** en los siete anchos (360, 390, 430, 768, 1024, 1280 y 1440) y en los dos temas de Anotar compartido, Inicio y Actividad en Nosotros, Yo con la parte compartida, edición compartida y A1–A5, con la prueba del proyecto `a11y` de T051 y su salida en `evidence.md`. Capturas a 390 y 1440 px en los dos temas para la aprobación humana; pasada de **Impeccable** (no cuenta como evidencia de FR-054); lista para aprobar viendo la pantalla: Anotar compartido y ChangePreview (aprobados en su forma)
  - Cumple: FR-054, SC-001 (C); F50-3.

- [ ] T056 **Gate final del PR C (CI)** sobre el mismo commit que `verify`; `evidence.md` con el run y la duración del job `e2e`
  - Prueba / terminado cuando: verde con las specs 1, 2 y 3.

- [ ] T057 **Humana (fundadores)**: aprobación visual del PR C viendo las capturas
  - Prueba / terminado cuando: aprobación registrada en el PR.

---

## Phase 4: PR D · Balance, liquidaciones, S1 y S4

**Purpose**: Balance en móvil y escritorio con SharedBalance, desglose y tabla accesible; hoja de liquidación; detalle con «Anular» y «Deshacer»; saldo invertido; S4 tras la confirmación del servidor; S1 Context Transition. **La spec E2E 3 crece.** **Historias:** US5, US6 y US9.

### Grupo 4A — tests primero

- [ ] T058 [P] [US5] Tests de **componentes** en `src/features/balance/shared-balance.test.tsx`: estados por saldar, al día, sin gastos compartidos (nunca «Al día $0»), cargando, error e invertido; filas «Pagó X · le corresponden Y»; `role="img"` con el `aria-label` de cifras completas; tabla de desglose; «le debe», nunca «está en deuda»
  - Cumple: US-5; FR-025, FR-026, FR-030, FR-047, FR-053.
  - Itera: `npm run test:components -- --changed`.

- [ ] T059 [P] [US6] Tests de **componentes** en `src/features/balance/settle.test.tsx`: hoja con la dirección fija, «Todo» y «Otro», el máximo en el error, fecha futura rechazada; `unknown` sin animación y sin afirmar nada; detalle con «Anular» y el «Deshacer» de 6 s; la liquidación como «Liquidado · no es un gasto» en Actividad
  - Cumple: US-6; FR-027–FR-029; precisión F47-4.
  - Itera: como T058.

- [ ] T060 [P] [US9] Tests de **componentes** en `src/features/context/context-transition.test.tsx`: el Skeleton del contexto nuevo hasta que llega el RSC, nunca cifras del anterior; la interrupción invierte la animación; con movimiento reducido, cambio inmediato con el valor final y el anuncio `aria-live`
  - Cumple: US-9; FR-040, FR-050; SC-011 (S1).
  - Itera: como T058.

- [ ] T060a Escribir **primero** los casos de Balance de la **spec E2E 3** (ver el saldo en Balance, registrar la liquidación parcial de 200.000 y comprobar 229.900 con el gasto en 2.840.000) y el test con motion activo de los dos momentos L2, y verlos **en rojo contra `juntia-dev`** con `npm run e2e:dev`, antes de T061
  - Cumple: regla 8; F50-2; interpretación I5.
  - Prueba / terminado cuando: fallan porque falta Balance, no por el arnés; la salida queda en `evidence.md`.

### Grupo 4B — implementación (en serie)

- [ ] T061 [US5] Balance en `src/app/(app)/balance/page.tsx` y `src/features/balance/`: pantalla propia en móvil desde Inicio, destino del rail y del sidebar desde 1024 px y módulo de Inicio con barras de 16 px; SharedBalance (aprobado en su forma, decisión 20.2) y el desglose filtrable por mes con `couple_balance` y `couple_expenses`
  - Cumple: FR-025, FR-026, FR-030, FR-047; US-5.
  - Itera: T058 en verde; `npm run e2e:dev`.

- [ ] T062 [US6] Hoja de liquidación, detalle de liquidación con «Anular» (SensitiveActionConfirmation) y «Deshacer» de 6 s, con `register_settlement` y `void_settlement`
  - Cumple: FR-027, FR-028; US-6; enmienda de ADR-007.
  - Itera: T059 en verde.

- [ ] T063 [US6] S4 Shared Balance: anima solo con `ok`; barras persistentes (`layoutId` por persona), contador al saldo nuevo, morph del badge; con `rejected` o `unknown`, nada; movimiento reducido con el estado final
  - Cumple: FR-051; MOTION_SYSTEM §3; SC-011 (S4).
  - Itera: T059 en verde.

- [ ] T064 [US9] S1 Context Transition en `src/features/context/`: coreografía de MOTION_SYSTEM §1 tras el RSC nuevo, interrupción reversible y movimiento reducido
  - Cumple: FR-050; US-9; MOTION_SYSTEM §1.
  - Itera: T060 en verde.

### Grupo 4C — spec E2E 3, axe, medición y salida

- [ ] T065 [US6] **Spec E2E 3 crece**: hacer pasar los casos escritos en T060a (saldo en Balance, liquidación parcial de 200.000, 229.900 con el gasto en 2.840.000, `afterSettlement`) y el test con **motion activo** para los dos momentos L2 (`docs/TESTING.md` §5, regla 3)
  - Cumple: FR-067 (spec 3); SC-003 (E2E).
  - Itera: `npm run e2e:dev`.

- [ ] T066 axe en los dos temas de Balance, la hoja de liquidación, el detalle de liquidación y la **confirmación de anular** una liquidación
  - Cumple: FR-068; SC-002 (D).
  - Itera: `npm run e2e:dev`.

- [ ] T067 Iteración completa del PR D en `juntia-dev`: `e2e:dev` (specs 1, 2 y 3) y `test:integration:dev`
  - Prueba: en verde.

- [ ] T068 **Humana (gestor)**: medición en laboratorio de CLS en la carga con Skeleton de Balance
  - Cumple: SC-010 (D).

- [ ] T069 Responsive y accesibilidad del PR D, con prueba automática en el proyecto `a11y` (`tests/a11y/balance.a11y.ts`):
  - **barrido sin scroll horizontal** en los siete anchos (360, 390, 430, 768, 1024, 1280 y 1440) y en los dos temas de Balance (pantalla móvil, destino de escritorio y módulo de Inicio), la hoja de liquidación, el detalle con «Anular» y el saldo invertido;
  - **teclado** en «Registrar liquidación», «Todo»/«Otro», la fecha, «Anular» (foco inicial en la opción segura, Escape) y el selector Yo/Nosotros durante S1;
  - **texto al 200 %** y **objetivos de 44 px** en esos controles.

  Capturas a 390 y 1440 px en los dos temas, con S1 y S4 con movimiento normal y reducido, para la aprobación humana; pasada de **Impeccable** (no cuenta como evidencia de FR-054); lista para aprobar viendo la pantalla: SharedBalance (aprobado en su forma), personas y patrones, liquidación en tinta (propuestas §15.9).
  - Cumple: FR-054, FR-055, SC-001 (D); F50-3.

- [ ] T070 **Gate final del PR D (CI)** sobre el mismo commit que `verify`. **El presupuesto del job `e2e` (< 480 s) pasa a bloquear** con el cierre de P0-2 (Q17)
  - Cumple: [V] «Presupuestos de tiempo», responsable CI, cierre antes del merge del PR D.
  - Prueba / terminado cuando: verde con las specs 1, 2 y 3 dentro del presupuesto.

- [ ] T071 **Humana (fundadores)**: aprobación visual del PR D viendo las capturas
  - Prueba / terminado cuando: aprobación registrada en el PR.

---

## Phase 5: Aceptación de P0-2 (dentro del PR D)

- [ ] T072 **Humana (gestor)**: tabla de cierre de todos los `[V]` del inventario de la spec en `evidence.md`, cada uno con su responsable, su momento de cierre y su salida real; ninguno «verificado» sin salida
  - Cumple: SC-013.

- [ ] T073 **Humana (fundadores)**: salida interna con sus cuentas reales en producción, con las migraciones aplicadas (T029) y la copia semanal al día: forman la pareja, anotan gastos compartidos (uno 70/30 o 55/45), registran una liquidación parcial y otra completa, y explican sin ayuda quién debe cuánto
  - Cumple: SC-012; maestro §11, «Salida interna» de P0-2; US-16.

- [ ] T074 Cerrar el slice: `evidence.md` con el resumen de los cuatro PR, los runs de CI usados (puntos de control y gates) y las aprobaciones; actualizar el estado de P0-2 en el maestro §15 solo si los fundadores lo piden, en un PR documental
  - Prueba / terminado cuando: el resumen está en `evidence.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0** bloquea el PR A (T001).
- **PR A → B → C → D**, cada uno desde `main` con el anterior mergeado (decisión 20.1). La Phase 5 es parte del PR D.
- Dentro del PR A: 1A puede ir a la vez que 1B; **1C solo después de T012**; **1D solo después de T016**.

### User Story Dependencies

- **US10** (seguridad) se completa en el PR A y es requisito de todas.
- **US1** (PR B) es requisito de US2–US9: sin pareja activa no hay nada compartido.
- **US2, US3, US4, US7 y US8** (PR C) son requisito de US5, US6 y US9 (PR D).

### Dentro de cada fase

Tests primero y vistos fallar; después la implementación; después la iteración completa en `juntia-dev`; después el CI (punto de control o gate); después la revisión humana.

### Parallel Opportunities

Las `[P]` de un mismo grupo (T004–T008, sin T005b; T030, T031 y T031a; T041–T043; T058–T060). Ninguna tarea que use `juntia-dev` o el CI es paralela.

---

## Parallel Example: Grupo 3A

```bash
Task: "T041 Tests de componentes de Anotar compartido en src/features/expenses/annotate-shared.test.tsx"
Task: "T042 Tests de componentes de edición compartida y resultados de escritura"
Task: "T043 Tests de componentes de Inicio y Actividad en Nosotros y de Yo con la parte compartida"
```

---

## Implementation Strategy

### Cuatro PR de implementación, en serie (decisión 20.1)

**Quién implementa cada PR** (asignación operativa de los fundadores): un PR que necesita mirar los comps de Claude Design lo implementa **Claude Code**; el resto, **Codex o Claude Code**.

| PR | Contenido | Tareas | Agente |
| --- | --- | ---: | --- |
| Previo | Prerrequisitos de `juntia-dev` | T001 (1) | Gestor |
| **A** · base de datos, seguridad y dinero (sin interfaz) | T002–T029, con T005b y T018a | 30 | **Codex o Claude Code** |
| **B** · Mi pareja e invitaciones | T030–T040, con T031a, T031b y T031c | 14 | **Claude Code** (04·15, 04·17) |
| **C** · gastos compartidos, Nosotros y Mover a Pareja | T041–T057, con T044a | 18 | **Claude Code** (02·5, 02·6, 04·1, 04·7, 04·10, 04·12, 04·13) |
| **D** · Balance, liquidaciones, S1 y S4, más la aceptación | T058–T074, con T060a | 18 | **Claude Code** (02·3, 04·2, 04·5, 04·8, MOTION_SYSTEM) |

### CI por PR (decisión 18: mínimo)

| PR | Runs de CI previstos |
| --- | --- |
| A | 3: punto de control 1 (T012), punto de control 2 (T016) y gate (T027) |
| B | 1: gate (T039) |
| C | 2: punto de control intermedio para medir `e2e` (T053) y gate (T056) |
| D | 1: gate (T070) |

Cualquier run adicional (una revisión que pide cambios) se junta en un solo push.

### Qué no se hace en ningún punto

Docker en un equipo; un runner o workflow de Actions para un spike o una verificación; iterar contra el CI; `service_role` en la app; datos reales en `juntia-dev` o en el CI; una cuarta spec E2E; un `[V]` cerrado sin salida; una decisión nueva dentro de un PR de código; mover el presupuesto del job `e2e` porque una medición lo supere.

---

## Notes

- `[P]` = archivos distintos y ninguna dependencia dentro de su grupo y PR. Nunca significa «propuesta» en este archivo.
- Las tareas que tocan un elemento propuesto lo nombran en palabras: «aprobado en su forma» (decisiones 20.2–20.4) o «propuesta §15.9» (para aprobar viendo la pantalla).
- Un `[V]` cerrado sin salida real es un defecto del PR, no una omisión menor.

---

## Anexo A — Auditoría de las tareas de test (ADR-012 §4)

Las tareas de test salen **de la tabla «Pruebas por capa» de cada PR del plan**, no de una heurística de generación. Se comprobó cada una contra la matriz de `docs/TESTING.md` §4. **No se retira ninguna**, y los cuatro archivos de `contracts/` no tienen contract test propio: lo que fijan lo prueban pgTAP, la integración, los componentes o la E2E.

| Tarea | Archivo | Capa | Criterio | Por qué esta capa es la más baja |
| --- | --- | --- | --- | --- |
| T002–T006 | `src/domain/**` | Dominio | Reparto, saldo, pareja, dataset dorado, consumo de Yo | Funciones puras |
| T007 | `src/lib/db/errors.test.ts` | Dominio | Traducción de errores | Tabla pura |
| T009, T013 | `supabase/tests/01`, `03`, `05`, `07`, `10a`, `11a` | SQL/RLS | Privilegios, RLS, vistas, invariantes, transiciones | Solo la base detecta una política o un trigger mal escrito |
| T017, T018 | `supabase/tests/10`, `11` | SQL/RLS | Funciones: éxito, rechazo, idempotencia, validaciones, política rota, compatibilidad con la 002 | La validación vive en la función |
| T018a (rojo), T022–T024 (verde) | `tests/integration/*` | Integración de servidor | Carreras, doble envío, FR-012a, `write_status`, RPC antiguas por la API, consistencia, cursor | Hacen falta dos sesiones reales o la API |
| T030, T031, T031a, T041–T044, T058–T060 | `src/features/**/*.test.tsx` | Componentes | Estados, textos, selector, resultados de escritura, contexto | Lo que se pinta y la lógica de cliente |
| T031c (rojo), T036 (verde) | `tests/e2e/access-account.e2e.ts` | E2E (spec 1) | Invitación → login → volver → aceptar | Rodeo por el login y la sesión (matriz de recorridos) |
| T044a y T060a (rojo), T051 y T065 (verde) | `tests/e2e/couple-settle.e2e.ts` | E2E (spec 3) | Pareja 50/50, cambio Yo/Nosotros, Mover a Pareja, liquidación | Caché, prefetch y RSC entre rutas (matriz de recorridos) |
| T036, T051, T066 | axe | Accesibilidad | Sin violaciones serias en los dos temas, con el inventario de estados nuevos | Fila 16 de ADR-011 |
| T038, T051, T055, T069 | `tests/a11y/*.a11y.ts` | Navegador (proyecto `a11y`) | FR-054: sin scroll horizontal en siete anchos, teclado, texto al 200 % y 44 px | Medir el layout real exige un navegador; Impeccable no cuenta como evidencia |

---

## Anexo B — Cobertura y consistencia

Pasada hecha a mano en lugar de `speckit-analyze`, con tres comprobaciones: todo
requisito y criterio tiene al menos una tarea; ninguna tarea carece de respaldo en
la spec, el plan o sus auxiliares; y la terminología coincide.

### B.1 Requisitos funcionales

| FR | Tareas |
| --- | --- |
| FR-001 | T009, T010, T014 |
| FR-002 | T013, T014 |
| FR-003 | T009, T010 |
| FR-004 | T009, T010, T013, T014 |
| FR-005 | T013, T014 |
| FR-006 | T019, T020, T022 |
| FR-007 | T021, T023 |
| FR-008 | Regla 5; T023 (sin `service_role` en la app, lint de la 002) |
| FR-009 | T007 |
| FR-010, FR-010a, FR-010b | T004, T009, T010, T017, T019, T022, T030, T032 |
| FR-011 | T004, T017, T019, T032 |
| FR-012, FR-012a | T017, T019, T021, T023, T030, T031, T032 |
| FR-013, FR-014 | T017, T019, T031, T033, T034, T036 |
| FR-015 | T030, T032 |
| FR-016 | T034 |
| FR-017 | T035 |
| FR-018 | T018, T020, T046 |
| FR-019, FR-019a | T002, T041, T046 |
| FR-020 | T002 |
| FR-021 | T041, T046 |
| FR-022–FR-024 | T018, T020, T042, T047 |
| FR-025, FR-026 | T003, T058, T061 |
| FR-027, FR-028 | T018, T020, T059, T062 |
| FR-029 | T013, T014, T059 |
| FR-030 | T003, T058, T061 |
| FR-031–FR-036 | T018, T020, T044, T050 |
| FR-037–FR-041 | T013, T014, T043, T048, T051 |
| FR-042 | T014, T021, T024, T049 |
| FR-043 | T013, T014, T024 |
| FR-044, FR-045 | T006, T043, T048 |
| FR-046 | T043, T049 |
| FR-047 | T058, T061 |
| FR-048, FR-049 | T043, T048 |
| FR-050 | T060, T064 |
| FR-051 | T063 |
| FR-052 | T041, T046 |
| FR-053 | T007, T035, T058 |
| FR-054, FR-055 | T035, T038, T051, T055, T069 |
| FR-056 | T017, T018, T023, T031a, T031b |
| FR-057 | T018, T022, T042, T047 |
| FR-058 | T020, T021 |
| FR-059 | T023, T031a, T031b, T042, T045 |
| FR-060–FR-062 | T042, T045 |
| FR-063 | T009, T013, T017, T018 |
| FR-064 | T022 |
| FR-065 | T002, T003, T005 |
| FR-066 | T025 |
| FR-067 | T036, T051, T065 |
| FR-068 | T036, T051, T066 |

**Todos los FR tienen al menos una tarea.**

### B.2 Criterios de éxito

| SC | Tareas |
| --- | --- |
| SC-001 | T038, T051, T055, T069 |
| SC-002 | T036, T051, T066 |
| SC-003 | T005, T005b, T024, T051, T065 |
| SC-004 | T002, T003 |
| SC-005 | T013, T043, T051 |
| SC-006 | T023, T027 |
| SC-007 | T022 |
| SC-008 | T022 |
| SC-009 | T024 |
| SC-010 | T054, T068 |
| SC-011 | T060, T063, T064 |
| SC-012 | T073 |
| SC-013 | T027, T072 |

**Todos los SC tienen al menos una tarea.**

### B.3 Tareas sin respaldo

Ninguna. Todas citan un FR, un SC, una decisión o una sección del plan o de sus
auxiliares. Las cuatro que podrían parecerlo tienen su origen:

- T001: prerrequisito de la decisión 18.
- T008: glosario, que el plan pide en el PR A.
- T029: migraciones a producción, regla 12.
- T074: cierre del slice.

### B.4 Terminología

Se comprobaron los nombres en spec, plan, data-model, contratos y tasks.
Coinciden:

- `juntia_membership`;
- `reclassify_to_shared` / `reclassifyToShared`;
- `write_status`;
- `groups_writer_update`, `groups_guard_transition` y `groups_check_state`;
- `beforeSettlement` / `afterSettlement`;
- `JT101`–`JT119`;
- los estados `provisional`, `active` y `discarded`;
- «Generar enlace nuevo»;
- spec E2E 3 «Pareja 50/50 y liquidación».

### B.5 Hallazgos

Ninguno exige cambiar la spec ni el plan. Tres observaciones, resueltas dentro de
este archivo:

1. **Los requisitos que la revisión del plan añadió sin FR propio**: la
   compatibilidad con la 002 (F49-1, F49-2), `write_status` (F49-4) y las
   transiciones de `groups` (F49-5). Se cubren dentro de FR-004, FR-005, FR-037,
   FR-059 y FR-010b, y las tareas T009, T013, T018, T020 y T023 los nombran por su
   hallazgo.
2. **La infraestructura de los tres resultados de escritura** no tiene PR fijado
   en el plan. Nace completa en el PR B (T031b), con las cuatro escrituras de
   invitación, y el PR C la amplía (T045): interpretación I2, corregida en la
   revisión del PR #50 (F50-1).
3. **El PR #48** (comandos de `juntia-dev`) seguía abierto al escribir este
   archivo. T001 lo exige antes del PR A: no se itera contra el CI.
