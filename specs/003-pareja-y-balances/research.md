# Research — 003 · Pareja y balances (P0-2)

**Fase 0 del plan.** Registra la ejecución de los `[V]` cuyo cierre es «antes de
cerrar el plan» (spec, «Inventario de `[V]`», primera tabla) y las decisiones
técnicas del plan. Cada decisión cita la fuente que la obliga; lo que no tiene
fuente superior es una **decisión del plan** —local, reversible y no
significativa— y se marca así para que el revisor la pueda objetar. Lo que no es
local ni reversible va a los fundadores (plan, «Para los fundadores»).

**Dónde se ejecutó.**

- **R1 a R4: preflight en CI** (ADR-011 §9.4 y §9.5: «el preflight y el gate
  siguen en el runner»). Workflow desechable `.github/workflows/spike-p0-2.yml` en
  la rama `spike/p0-2-plan-v`, que nunca se fusiona, con `on: push` limitado a esa
  rama. Supabase local dentro de un runner `ubuntu-24.04`, con **las tres
  migraciones de `main`** (`d2e1c64`) y encima el SQL desechable
  `spike/003_schema.sql`; las sondas son `spike/003_tests.sh`
  (`git show origin/spike/p0-2-plan-v:spike/<archivo>`). Ningún proyecto en la
  nube. **No se usó `juntia-dev`**: la decisión 18 lo reserva para iterar durante la
  implementación, con un solo agente a la vez, y en ese momento lo estaba usando la
  sesión del PR #48.

  | Run | Commit | Qué cambió | Resultado |
  | --- | --- | --- | --- |
  | [42233151689](https://github.com/flashwp3-ctrl/juntia/actions/runs/42233151689) | `d94f8cd` | Primer intento | Verde. Encontró los hallazgos de R1 (no-op silencioso) y R4 (`permission denied for schema juntia_data`); dos errores del arnés |
  | [42233739213](https://github.com/flashwp3-ctrl/juntia/actions/runs/42233739213) | `da46ede` | Sondas por vistas de `public`; descartar el grupo antes de liberar la membresía | Verde; las sondas por vista no corrieron por un error de comillas del arnés |
  | [42234176869](https://github.com/flashwp3-ctrl/juntia/actions/runs/42234176869) | `7535f28` | Comillas corregidas | Verde, **todas las sondas**. Es el run de referencia |

  Las salidas de abajo son las del run 3 salvo que se diga otra cosa, copiadas de
  `gh run view <id> --log` y recortadas solo donde se indica con `…`. Las líneas
  de claims del JWT se omiten. Supabase CLI 2.121.0 (`supabase/setup-cli@v1`) y
  PostgreSQL 17.11, los mismos del stack de la 002.
- **R5: lectura del código** de `main` (`d2e1c64`): `src/lib/routes.ts`,
  `src/lib/supabase/proxy.ts`, `src/domain/account/index.ts`,
  `src/features/auth/actions.ts` y `src/features/auth/confirm.ts`.

---

## R1 · `[V]` Auxiliar de membresía sin recursión

**Fuente.** Spec, «Inventario de `[V]`», primera fila; ADR-013 §5.1; FR-003.

### Lo que se construyó

Las tablas `groups`, `group_members`, `group_invitations`, `settlements` y
`transaction_allocations` de [data-model.md](data-model.md), con RLS. Un rol
`juntia_membership` (`nologin nobypassrls`, no dueño de nada) con `select` y
política `using (true)` sobre `groups`, `group_members` y `group_invitations`. Las
auxiliares `is_group_member`, `is_couple_member` e `is_invited_to` como `security
definer` de `juntia_membership`, y las políticas de `authenticated` y de
`juntia_writer` escritas con ellas. Las funciones que escriben
(`create_invitation`, `cancel_invitation`, `accept_invitation`,
`register_settlement`) son de `juntia_writer`, como en la 002. Siete cuentas en
`auth.users`.

### Salida

```
=== 2. Tomás acepta con H1 (y repite la misma clave)
    {"status": "active", "group_id": "ee258155-dedf-437f-8b1b-7c476bd958e8"}
    {"status": "active", "group_id": "ee258155-dedf-437f-8b1b-7c476bd958e8"}
    active members=2
=== 3. Sin recursión y visibilidad por persona (groups, group_members, invitations)
  -- sara@x.test
    groups=1 members=2 invitations=1 is_member=true
  -- tomas@x.test
    groups=1 members=2 invitations=1 is_member=true
  -- carla@x.test
    groups=0 members=0 invitations=0 is_member=false
=== 5. Privacidad: …
    tomas sees sara private rows=0
    …
    carla sees transactions=0 allocations=0 members=0
=== 14. Tercera persona: Carla intenta aceptar una invitación vieja de la pareja activa
    ERROR:  invitationInvalid
=== 14b. Tomás ve sus partes y las de Sara; Carla nada
    tomas allocations=12
=== 15. Escritura directa imposible para authenticated
    ERROR:  permission denied for schema juntia_data
    LINE 1: insert into juntia_data.group_members(group_id,user_id,role,...
    ERROR:  permission denied for schema juntia_data
    LINE 1: update juntia_data.groups set status='discarded' where id='e...
```

Ninguna sonda dio `infinite recursion detected in policy`, ni con
`authenticated` ni dentro de las funciones de `juntia_writer`.

### Hallazgo: un `update` sin permiso es un no-op silencioso

En el run 1, `cancel_invitation` liberó primero la membresía de la propietaria y
después intentó pasar el grupo a `discarded`. Para entonces la política de
`update` de `juntia_writer` sobre `groups` (`is_group_member(id)`) ya era falsa, y
el `update` afectó a **0 filas sin error**:

```
=== 11. Anular contra aceptar: gana anular (anula primero y espera)   (run 1)
[cancel]     {"status": "discarded", "group_id": "15946e28-…"}
    group provisional
    diana active memberships=0
```

La función devolvió «descartada» y el grupo seguía provisional sin integrantes. En
el run 2 se cambió el orden (descartar el grupo y después liberar) y se añadió la
comprobación de filas; el resultado ya es el correcto (R3, sonda 11).

### Decisión

- **Dueño de las auxiliares: `juntia_membership`.** Es la **nota de implementación
  de ADR-013 §5.1** que propone este plan (añadida a ADR-013 en esta rama, con
  estado «propuesta, pendiente de los fundadores»). La alternativa sin rol nuevo,
  auxiliares de `postgres`, también funciona, pero deja la decisión de membresía en
  un rol con `BYPASSRLS`.
- **Toda `update` dentro de una función que escribe comprueba `row_count`** y
  falla si no es el esperado, y el orden de las escrituras se elige para que las
  políticas sigan siendo verdaderas en cada paso
  ([contracts/database.md](contracts/database.md)). pgTAP incluye una prueba por
  función que rompe a propósito una política y comprueba que la función falla en
  vez de devolver éxito (`docs/TESTING.md`, «Break each policy»).

---

## R2 · Las vistas de la 002 empezarían a devolver gastos compartidos

**Fuente.** Spec FR-037 a FR-039; lección F44-1 de la 002. No era un `[V]` del
inventario: lo encontró la sonda 5.

```
=== 5. Privacidad: Tomás no ve el privado de Sara; la vista my_transactions de P0-1 sí devuelve los compartidos
    tomas sees sara private rows=0
    tomas public.my_transactions rows=6
```

`public.my_transactions` (y `my_transaction_months` y `my_recent_categories`) no
filtran por dueño: se apoyan solo en la RLS. Con la rama de grupo de la RLS, Tomás
recibe por esa vista los seis gastos compartidos. No es una fuga de datos privados
(son compartidos y los puede ver), pero sí rompe Yo: Inicio, Actividad y la
exportación de la 002 los contarían como privados.

**Decisión.** La migración `shared_money_tables` del PR A cambia esas tres vistas
para filtrar **explícitamente** `owner_user_id = (select auth.uid()) and group_id
is null`, en el mismo commit que añade la rama de grupo a la RLS, y pgTAP prueba
que con una pareja activa siguen devolviendo solo lo privado propio. Regla general
del plan: **ninguna vista confía solo en la RLS para decidir el contexto**; la RLS
decide quién puede ver y la vista decide qué contexto pinta.

---

## R3 · `[V]` Bloqueo del grupo, primera creación y enlace recuperable

**Fuente.** Spec, «Inventario de `[V]`», segunda fila; FR-006, FR-010b, FR-012a,
FR-027; ADR-013 §3.

### Salida

```
=== 1. FR-012a: crear invitación con clave K1 y hash H1, repetir igual, repetir con otro hash
    {"group_id": "ee258155-…", "expires_at": "2026-11-13T14:30:28.015035+00:00", "invitation_id": "7d708ccc-…"}
    {"group_id": "ee258155-…", "expires_at": "2026-11-13T14:30:28.015035+00:00", "invitation_id": "7d708ccc-…"}
    ERROR:  idempotencyKeyReused
    1 groups, 1 invitations, token stored as: 0000000000000000000000000000000000000000000000000000000000000001
=== 7. Dos liquidaciones del total a la vez (Tomás y Sara): bloqueo del grupo
[A]     {"amount_minor": "42990000", "settlement_id": "79b4a6a7-…", "pending_before": "42990000"}
[B]     ERROR:  nothingToSettle
    11111111-…=0 22222222-…=0
=== 10. Primera creación concurrente por la misma persona (dos pestañas, claves distintas)
[A]     {"group_id": "0aac1f74-…", "expires_at": "…", "invitation_id": "db4a6b3e-…"}
[B]     ERROR:  alreadyInCouple
    diana active memberships=1
=== 11. Anular contra aceptar: gana anular (anula primero y espera)
[accept]     ERROR:  invitationInvalid
[cancel]     {"status": "discarded", "group_id": "0aac1f74-…"}
    group discarded
    diana active memberships=0
=== 12. Aceptar contra anular: gana aceptar (acepta primero y espera)
[cancel]     ERROR:  invitationAlreadyAccepted
[accept]     {"status": "active", "group_id": "fa40ff93-…"}
    group active members=2
=== 13. Invitaciones cruzadas: Diana y Elena se invitan; Diana no acepta sin anular; anula y acepta
    {"group_id": "229bb747-…", …}
    {"group_id": "13824e2e-…", …}
    ERROR:  alreadyInCouple
    {"status": "discarded", "group_id": "229bb747-…"}
    {"status": "active", "group_id": "13824e2e-…"}
    diana active=1 elena active=1
```

En las sondas 7, 10, 11 y 12, la primera operación espera 3 s **dentro** de su
transacción, con el bloqueo tomado, y la segunda empieza 1 s después. La segunda
espera al bloqueo y, al obtenerlo, ve lo que escribió la primera. En la 7, Sara ve
el saldo ya en 0 y su liquidación del total se rechaza: nunca hay sobrepago. En la
13, Diana no puede aceptar mientras tenga su pareja provisional; la anula, vuelve a
estar libre y acepta.

### Decisiones

- **Raíz por persona para la primera creación (FR-010b).** Antes de que exista la
  pareja no hay fila que bloquear. Las funciones que crean o liberan una membresía
  toman `pg_advisory_xact_lock(hashtextextended('juntia:person:' || user_id, 0))`
  de la persona afectada, y el índice único `group_members_one_couple_per_person`
  queda como segunda barrera. Una colisión del hash solo serializa de más, nunca de
  menos.
- **Raíz del grupo** con `select … for update` sobre `groups` en toda operación que
  cambia el saldo, la membresía o las invitaciones de una pareja que ya existe
  (FR-006).
- **Orden de bloqueo único:** personas (por UUID), después el grupo, después las
  filas de movimiento (por UUID). Ninguna función toma un bloqueo de persona
  después de uno de grupo, así que no hay ciclos entre «aceptar», que toma la
  persona que acepta y el grupo de quien invita, y «anular», que toma la propietaria
  y su grupo.
- **Las funciones que escriben son `volatile`** (la opción por defecto): tras
  esperar un bloqueo, cada sentencia ve una instantánea nueva y por eso la segunda
  liquidación vio el saldo en 0 (R4).
- **Enlace recuperable (FR-012a).** El token lo genera el **navegador** (32 bytes
  de `crypto.getRandomValues`) junto con la clave de idempotencia y lo conserva
  mientras dura la intención; la base solo recibe y guarda su SHA-256. Un reintento
  con la misma clave y el mismo hash devuelve **el mismo resultado guardado**
  (sonda 1), así que el navegador vuelve a mostrar **el mismo enlace**, que sigue
  valiendo. Con otro hash, `JT008`. Se descartó derivar el token en el servidor con
  un secreto (HMAC de la clave): exigiría guardar un secreto nuevo en la base o en
  Vercel sin ninguna ventaja. **Decisión del plan**, comprobable en el PR B.

---

## R4 · `[V]` Lectura consistente de totales y saldo

**Fuente.** Spec, «Inventario de `[V]`», cuarta fila; FR-043 (precisión F47-8).

### Salida

Run 1, con el saldo como función `language sql` normal de `juntia_private`:

```
=== 6. Saldo en una sentencia (beforeSettlement)
    ERROR:  permission denied for schema juntia_data
    LINE 2: with m as (select user_id from juntia_data.group_members whe...
    CONTEXT:  SQL function "couple_balance" during startup
```

Run 3, con el saldo como **vista** `security_invoker` y las sondas de instantánea:

```
=== 6. Saldo en una sentencia (beforeSettlement)
    11111111-1111-4111-8111-111111111111=42990000 22222222-2222-4222-8222-222222222222=-42990000
=== 8. Liquidación parcial 200.000 (afterSettlement)
    {"amount_minor": "20000000", "settlement_id": "3ad3032b-…", "pending_before": "42990000"}
    11111111-…=22990000 22222222-…=-22990000
=== 9. Lectura consistente: STABLE frente a VOLATILE con una inserción concurrente
    atomic body sum=284000000
[spike_probe_stable]     stable first=284000000 second=284000000
[spike_probe_volatile]     volatile first=284000100 second=284000200
```

En la sonda 9, cada función lee la suma, espera 4 s y la vuelve a leer, mientras
otra sesión inserta y confirma un gasto de 100 unidades menores. La función
`stable` ve las dos veces el mismo valor; la `volatile` ve el cambio entre sus dos
lecturas. El saldo reproduce el dataset dorado: +429.900 / −429.900 en
`beforeSettlement` y +229.900 / −229.900 en `afterSettlement`.

### Decisión

- **Totales y Balance como vistas de una sola sentencia** (`couple_month_summary`,
  `me_month_summary`, `couple_balance`; [data-model.md](data-model.md) §7). Una
  sentencia tiene una única instantánea: el total nunca mezcla dos estados.
- Una función `language sql` normal **no sirve** para leer como `authenticated`
  (sin `usage` sobre `juntia_data`, ADR-013 §2.1). Si hace falta una lectura con
  parámetros, la alternativa verificada es el **cuerpo SQL estándar** (`begin
  atomic`), que dio `atomic body sum=284000000` como `authenticated`.
- Una función PL/pgSQL de lectura con varias sentencias se declara `stable`.
- Las listas siguen con `readByCursor` de la 002 y su garantía (FR-042); la
  consistencia entre la lista y el total es la que dice FR-043, no una foto común.

---

## R5 · `[V]` Retorno tras el login con la intención

**Fuente.** Spec, «Inventario de `[V]`», tercera fila; handoff, «Sin sesión:
guardar la intención, autenticar, volver y revalidar»; lección F43-3 de la 002.

### Lo que hay en `main`

- `src/lib/supabase/proxy.ts`: sin sesión, una ruta de producto redirige a
  `/entrar?volver=<ruta>` con `safeReturnPath`, y tras entrar se vuelve a
  `volver`.
- `src/domain/account/index.ts`: `safeReturnPath` acepta solo rutas internas que
  empiezan por una sola `/`, sin `\`, controles ni espacios, antes y después de
  decodificar, y con el mismo origen. Sus pruebas cubren destinos externos y
  codificados.
- `src/features/auth/actions.ts`: el registro y el reenvío fijan
  `emailRedirectTo` en `/auth/confirm?next=signup` **sin** `volver`, y
  `confirm.ts` lleva después a Entrar o a la primera entrada.

### Resultado

- **Entrar** conserva el destino interno: `/entrar?volver=/invitacion` vuelve a
  `/invitacion` sin abrir una redirección a otro origen.
- **Crear la cuenta y verificarla no lo conserva.** El enlace del correo no lleva
  `volver` y además puede abrirse en otra pestaña u otro dispositivo, donde no
  existe la intención.
- Poner el token en `volver` lo dejaría en una query string, que sí aparece en
  registros y en `Referer`.

### Decisión

[contracts/server-actions.md](contracts/server-actions.md) §2 y §3:

- el enlace es `/invitacion#t=<token>`, con el token en el **fragmento**, que el
  navegador no envía al servidor;
- `/invitacion` es una ruta pública que no pinta ningún dato en el servidor;
- la intención se guarda en `localStorage["juntia:invitation"]` del dispositivo,
  con fecha, y se borra al aceptar, al ver M7, con «Ahora no» y al cerrar sesión;
- al entrar con sesión, si existe y tiene menos de 7 días, la app lleva a
  `/invitacion`;
- en otro dispositivo, la persona vuelve a abrir el enlace (spec, caso límite).

**Decisión del plan.** Guardar el token en `localStorage` es aceptable porque solo
sirve una vez, caduca a los 7 días y exige una cuenta verificada con el correo
invitado; se pone en la lista para los fundadores porque toca un secreto en el
dispositivo. La comprobación ejecutada es el caso de la spec E2E 1 del PR B
(entrar, crear la cuenta y verificarla).

---

## R6 · Liquidaciones en una tabla propia (FR-002)

**Fuente.** Maestro §7.3 («también es válida la separación física de
liquidaciones si reduce ambigüedad. Documentar la decisión antes de migrar»);
ADR-013, «Qué no decide».

**Decisión del plan: tabla `settlements`.** Una liquidación no tiene categoría,
pagador, partes ni contexto privado. Tiene dirección, fecha que no puede ser
futura y su propio ciclo de anulación (enmienda de ADR-007). Meterla en
`transactions` exigiría hacer opcionales `category_id` y la clave foránea de
categoría, y que toda consulta de gasto excluyera el tipo, justo el error que
FR-029 prohíbe. Con su propia tabla, sumar una liquidación como gasto es imposible
por construcción. Es reversible mientras no haya datos.

---

## R7 · Ventanas de «Deshacer» en el servidor

**Fuente.** Q15 (6 s para Mover a Pareja), Q11 (6 s para la liquidación) y la 002
(FR-034).

**Decisión del plan.** La ventana visible es el toast de 6 s. El servidor acepta
`undo` hasta **60 s** después de la operación, además de la versión esperada y de
la ausencia de dependencias. Así un «Deshacer» pulsado en el segundo 5 con mala
red no se rechaza por llegar tarde, y la puerta no queda abierta indefinidamente.
`undo_reclassify_to_shared` crea **un privado nuevo** con
`restored_from_transaction_id`; nunca reactiva el anulado (Q15).

---

## R8 · La spec E2E 3 dentro del presupuesto del job `e2e`

**Fuente.** Decisión 19.5 (< 480 s, medido en 421–445 s con las specs 1 y 2);
`docs/TESTING.md` §5, reglas 1 y 2; Q17.

**Decisión del plan.**

- `seedCouple()` por base de datos, una pareja por worker, reutilizada por la spec 3
  y por las auditorías de axe de Nosotros y de Balance.
- Las auditorías de axe agrupadas por ruta.
- Medición obligatoria en el punto de control intermedio del PR C, con la spec 3
  recién nacida.

Si supera 480 s, se para y se lleva a los fundadores: el presupuesto no se mueve
por una medición (`AGENTS.md` 13a).

---

## R9 · Reparto, colores y desempate

**Fuente.** Nota de ADR-002 (decisión 20.8); DESIGN_SYSTEM §1.2; FR-017, FR-019,
FR-019a.

- `splitAmount` trabaja en **pesos enteros**: importe en pesos, cuotas exactas en
  racionales (`bigint` × porcentaje / 100, o la mitad), suelo de cada cuota, y
  reparto del resto de a un peso por mayor residuo, con el desempate por
  `join_order`. Devuelve unidades menores (× 100). Casos obligatorios de FR-019a:
  $100.001 al 50/50 → 50.001 / 50.000; al 33/67 → 33.000 / 67.001.
- `join_order` también da el color: 1 → `person.1` (petróleo), 2 → `person.2`
  (arena), con sus patrones (sólido, rayado).
- En Importe, el cliente envía las partes que escribió la persona; el servidor
  comprueba que suman.

---

## R10 · S1 y S4 con datos reales

**Fuente.** MOTION_SYSTEM §1 y §3; FR-050, FR-051; US-14; decisión 10.

- **S1.** El selector escribe la cookie, pide el RSC y muestra el Skeleton del
  contexto nuevo. La coreografía (Motion for React, `layout` en la perilla, el
  número héroe con el contador de 240 ms y la entrada en escalera de 40 ms) arranca
  cuando el RSC nuevo está montado. Si se vuelve a tocar el selector, se invierte
  desde el estado actual. Con movimiento reducido, cambio inmediato y anuncio
  `aria-live`.
- **S4.** La animación del Balance arranca solo con la respuesta `ok` de
  `register_settlement`. Las barras no se vuelven a montar (`layoutId` por persona)
  y el contador va hasta el saldo nuevo. Con `rejected` o `unknown` no se anima
  nada.
- Sin dependencias nuevas: Motion 14.9.0 ya está desde la 001.

---

## R11 · Lo que ya existe y se reutiliza

- `/cuenta/pareja` existe con «llega con P0-2» (002, FR-054): pasa a M1–M4.
- `/balance` existe con su estado provisional (001): pasa a la pantalla real.
- `LimitNote`, `Modal` (con `alertdialog`), `BottomSheet`, `Toast`, `Skeleton`,
  `Segmented`, `AmountInput`, `ExpenseRow` y `Badge` existen.
- `CoupleStatus`, `SensitiveActionConfirmation`, `SharedBalance` y `ChangePreview`
  son nuevos, con la anatomía aprobada (decisión 16.6 y Q2, Q3).
- El proveedor de Anotar, `readByCursor`, `server-context.ts`, la cookie
  `juntia_context`, `safeReturnPath` y la tabla de errores de la 002 se extienden;
  no se reescriben.

---

## Sin dependencias nuevas

P0-2 no añade paquetes de npm ni cambia versiones: el stack de la 002 (Next
16.4.4, React 19.3.1, Motion 14.9.0, `@supabase/supabase-js` 2.118.0,
`@supabase/ssr` 0.12.7, Supabase CLI 2.121.0, Vitest, Playwright y axe) cubre todo.
SHA-256 del token: `crypto.subtle.digest` en la Server Action (Node 24) y
`crypto.getRandomValues` en el navegador, los dos nativos.
