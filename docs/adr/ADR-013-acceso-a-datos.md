# ADR-013 — Acceso a datos: `supabase-js` con funciones de Postgres, sin ORM

**Estado:** Aceptado por los fundadores, 4 de noviembre de 2026 (maestro §15.10, decisión 15) · **Propuesto:** 4 de noviembre de 2026 · **Revisión:** tres rondas adversariales del PR #34, 4 de noviembre de 2026 · **Enmienda:** 4 de noviembre de 2026, nota de implementación de §2.3 tras el preflight del plan de P0-1; no cambia la decisión (ver «Enmienda» al final) · **Origen:** pendiente declarado en el maestro §15.10 («el mecanismo de acceso a datos […] necesita su propio ADR antes de P0-1») · **Alcance:** P0 completo, desde P0-1

## Contexto

P0-1 conecta Juntia a una base de datos por primera vez. El maestro ya fija el
destino: Supabase PostgreSQL con RLS y migraciones versionadas, y Supabase Auth
con cookies (§7.1). Lo que no fija es **cómo habla el código con esa base de
datos**. Hay dos familias de respuesta:

- el cliente de Supabase (`supabase-js`), que pasa por su API de datos
  (PostgREST) con la sesión de la persona;
- un ORM o query builder (Drizzle, Prisma) con una conexión directa a Postgres.

La elección es difícil de revertir. Decide la forma de cada migración, de cada
escritura que mueve dinero y de cada test de P0. Por eso va a un ADR antes de
la especificación de P0-1 (`AGENTS.md` punto 17).

### Lo que el maestro exige y condiciona la elección

1. **RLS es una barrera real, probada con acceso directo.** «Nunca filtrar datos
   de privacidad solo en frontend: probar acceso directo por cliente
   autenticado de otro usuario» (§7.4). «RLS en todas las tablas expuestas»,
   con `USING` y `WITH CHECK` por propiedad o membresía.
2. **Escrituras atómicas.** Gasto con sus partes, aceptación de invitación,
   corrección con auditoría, liquidación, aporte o retiro de meta y uso de meta
   con gasto enlazado son transacciones atómicas (§7.3). La conversión
   privado → compartido es una sola transacción (ADR-001).
3. **Idempotencia** de toda escritura que mueve dinero, con
   `idempotency_records` (§7.3, §15.6.3 punto 2).
4. **Validación en servidor y en SQL.** «Todas las escrituras validan
   ownership, membresía, tipo, moneda y fecha en servidor/SQL; RLS es última
   barrera, no sustituto de dominio» (§7.3).
5. **Sin `SECURITY DEFINER` por conveniencia** y sin claves privilegiadas
   expuestas (§7.4).
6. **`domain` no importa Supabase** (§7.2). El dominio financiero es
   TypeScript puro.
7. **Importes en `bigint` de unidades menores** y serializados como strings
   decimales hacia el frontend, nunca como números de punto flotante (§5).
8. **Pruebas:** RLS en pgTAP sobre SQL plano (maestro §15.10, decisión 1);
   atomicidad, idempotencia y concurrencia en integración de servidor sin
   navegador (`docs/TESTING.md`).
9. **Hosting:** Vercel Hobby con funciones serverless, y Supabase Free
   (§7.1, §7.5).

### Lo que se verificó, no se supuso

Documentación oficial consultada el 4 de noviembre de 2026:

- **PostgREST ejecuta cada petición dentro de una transacción.** Un error de
  base de datos, o un `RAISE` dentro de una función, la revierte entera. Por
  tanto, una llamada `rpc()` a una función PL/pgSQL de varios pasos se completa
  entera o no deja nada. `supabase-js` **no** agrupa varias consultas en una
  transacción; la referencia de Supabase remite a una función de base de datos
  para la lógica transaccional de varias sentencias.
  ([PostgREST, Transactions](https://docs.postgrest.org/en/v12/references/transactions.html);
  [Supabase, referencia de JavaScript](https://supabase.com/docs/reference/javascript/introduction))
- **Funciones:** Supabase recomienda `security invoker` por defecto. Una
  función nueva es invocable por cualquier rol, **incluido `anon`**, hasta que
  se le revoca `execute`. Las funciones `security definer` necesitan
  `search_path = ''` y pueden saltarse la RLS.
  Supabase dice además que una función `security definer` **nunca** debe crearse
  en un esquema expuesto por la API, porque la API la llamaría con los
  privilegios de su propietario. Las auxiliares van en un esquema no expuesto.
  ([Database functions](https://supabase.com/docs/guides/database/functions);
  [¿Hay que exponer las funciones `security definer` de las políticas?](https://supabase.com/kb/troubleshooting/do-i-need-to-expose-security-definer-functions-in-row-level-security-policies-iI0uOw);
  [Securing your API](https://supabase.com/docs/guides/api/securing-your-api);
  [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security))
- **Next.js:** `@supabase/ssr` con un cliente de servidor (`createServerClient`,
  cookies vía `next/headers`) y otro de navegador. Un cliente nuevo por
  petición, nunca en una variable global. En Next.js 16 la renovación del token
  va en `proxy.ts`. Para proteger páginas y datos se usa `getClaims()`, no
  `getSession()`.
  ([Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client);
  [migración desde Auth Helpers](https://supabase.com/docs/guides/troubleshooting/how-to-migrate-from-supabase-auth-helpers-to-ssr-package-5NRunM);
  [guía de Next.js 16](https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth))
- **ORM con RLS:** Drizzle documenta un envoltorio que abre una transacción,
  copia los claims del JWT con `set_config` y hace `set local role` en cada
  operación. Si el token no trae rol, su ejemplo cae a `anon`.
  ([Drizzle, RLS](https://orm.drizzle.team/docs/rls);
  [Supabase, Drizzle](https://supabase.com/docs/guides/database/drizzle))
- **Conexiones serverless:** el pooler compartido de Supabase en modo
  transacción no admite sentencias preparadas. Prisma necesita
  `pgbouncer=true`, y Drizzle o Postgres.js necesitan `prepare: false`.
  ([Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres);
  [Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting);
  [Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI))
- **Tipos:** `supabase gen types typescript` genera los tipos de la base, que
  se pasan al cliente como `Database`. Supabase propone un check de PR que
  falle si los tipos versionados no coinciden con el esquema.
  ([Generating TypeScript Types](https://supabase.com/docs/guides/api/rest/generating-types);
  [Generate types using GitHub Actions](https://supabase.com/docs/guides/deployment/ci/generating-types))

- **RLS y propietarios:** las políticas se evalúan con los privilegios de quien
  ejecuta la consulta. Los superusuarios, los roles con `BYPASSRLS` y, salvo
  `FORCE ROW LEVEL SECURITY`, el propietario de la tabla se las saltan. Una
  función `security definer` corre como su propietario. Si ese propietario no
  tiene `BYPASSRLS` ni es dueño de la tabla, las políticas se siguen
  aplicando dentro de la función. En Supabase, `postgres` sí tiene `BYPASSRLS`.
  `select ... for update` necesita privilegio y política de lectura **y** de
  actualización sobre las filas que bloquea.
  ([PostgreSQL, Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html);
  [Supabase, Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security))
- **Identidad dentro de la transacción:** PostgREST deja los claims del JWT en
  la variable de transacción `request.jwt.claims`, que es lo que lee
  `auth.uid()`. Cambiar de rol dentro de una función no cambia esa variable.
  ([PostgREST, Database Authorization](https://docs.postgrest.org/en/v12/explanations/db_authz.html))
- **Aislamiento:** PostgREST usa por defecto el nivel `READ COMMITTED`. Una
  transacción atómica no impide por sí sola que dos peticiones simultáneas
  lean el mismo saldo antes de escribir.
  ([PostgREST, Transactions](https://docs.postgrest.org/en/v12/references/transactions.html))
- **Privilegios y RLS son dos barreras distintas.** Los grants deciden qué
  roles llegan a una tabla, vista o función por la API de datos; la RLS decide
  qué filas ven o modifican. Una política no basta si el rol tiene un grant
  que no debería tener, y al revés. Además de `select`, `insert`, `update` y
  `delete`, una tabla tiene `TRUNCATE`, `REFERENCES` y `TRIGGER`, y las
  secuencias tienen los suyos. Las concesiones automáticas de Supabase varían
  según el proyecto y han cambiado con el tiempo, así que no se dan por
  sabidas: se revocan y se conceden de forma explícita.
- **Otra API:** Supabase puede servir también `/graphql/v1` con `pg_graphql`, que
  refleja las tablas según los privilegios y los esquemas de su `search_path`,
  no según la configuración de PostgREST.
  ([Supabase, GraphQL](https://supabase.com/docs/guides/graphql))
  ([Securing your API](https://supabase.com/docs/guides/api/securing-your-api))

## Opciones

| | **A. `supabase-js` + funciones de Postgres** | **B. Drizzle con conexión directa** | **C. Prisma con conexión directa** |
| --- | --- | --- | --- |
| Identidad en la base | La sesión de la persona viaja en cada petición y la RLS se aplica sin código propio | Drizzle documenta roles de Supabase y un envoltorio transaccional que copia los claims y cambia de rol. No es automático: cada consulta tiene que pasar por él, y una que no pase corre con el rol de la conexión, que se salta la RLS | Igual que B, sin envoltorio documentado; habría que escribirlo |
| Escrituras atómicas | Una función PL/pgSQL por operación crítica | Transacciones en TypeScript, o llamadas a las mismas funciones SQL que en A | Igual que B |
| Dónde viven las invariantes | En SQL: funciones, restricciones y triggers, probados con pgTAP | Pueden vivir también en SQL. Si se escriben en TypeScript, pgTAP no las cubre | Igual que B |
| Ergonomía | Consultas por la API de datos; las uniones complejas van en vistas o funciones | **Mejor:** consultas tipadas, uniones y transacciones de servidor en TS | **Mejor** que A en consultas; más pesada que B |
| Conexiones en Vercel serverless | HTTP a la API de datos, sin pool que gestionar | Pooler en modo transacción con `prepare: false` | `pgbouncer=true` y `connection_limit=1` |
| Tipos y esquema | Tipos generados del esquema real; las migraciones SQL son la única fuente | Esquema en TS con `drizzle-kit`, o migraciones SQL con el esquema TS sincronizado a mano | Esquema propio (`schema.prisma`); la RLS y las funciones como SQL crudo |
| Dependencias nuevas | `@supabase/supabase-js`, `@supabase/ssr` | Las de A para Auth, más `drizzle-orm`, `drizzle-kit` y un driver | Las de A para Auth, más `prisma` y `@prisma/client` |
| Coste de salir de Supabase | El SQL es Postgres estándar; se reescribe la capa fina de `src/lib/db/` | Menor en la capa de consultas; la RLS sigue atada a los roles y claims de Supabase | Igual que B |

**Por qué A, aunque B y C tengan mejor ergonomía.** Las tres opciones pueden
dejar las invariantes de dinero en SQL; A es la única en la que **todo** el
tráfico de la aplicación entra con la identidad de la persona sin código
propio. Además, A no tiene pool de conexiones que operar en Hobby y deja una
sola fuente del esquema. Las pruebas de ADR-011 (pgTAP y la integración de
servidor) cubren el mismo camino que usa la aplicación. Lo que A pierde en
comodidad de consultas lo absorben las vistas y la capa `src/lib/db/`.

**Variante descartada: A para leer y B para escribir.** Suma las dos
superficies, dos formas de identidad y dos fuentes del esquema, sin resolver
nada que A no resuelva.

## Decisión propuesta

**Opción A.** `supabase-js` con `@supabase/ssr`. La API de datos solo ve
proyecciones y funciones de entrada; las tablas y la lógica privilegiada viven
en esquemas que la API no expone. Las tablas de dinero **solo se escriben a
través de funciones de Postgres**, y la RLS se sigue aplicando dentro de ellas.
Sin ORM ni query builder en P0.

### 1. Tres esquemas

| Esquema | ¿Lo expone la API? | Contiene |
| --- | --- | --- |
| `public` | **Sí** | Solo vistas `security_invoker = true`, que exponen los importes como texto, y funciones de entrada `security invoker`. Ninguna tabla y ninguna función `security definer` |
| `juntia_data` | No | Las tablas, con RLS activada en todas |
| `juntia_private` | No | Las funciones que escriben dinero (`security definer`, propiedad de `juntia_writer`), las auxiliares de autorización y las internas |

Supabase prohíbe expresamente crear funciones `security definer` en un esquema
expuesto, porque la API de datos las puede llamar con los privilegios de su
propietario. Con esta separación, nada privilegiado queda en la superficie que
ve un cliente. Los nombres de los esquemas los puede ajustar la especificación
de P0-1; la separación no.

### 2. Tablas de dinero y de autorización: sin escritura directa

Son **tablas controladas** las que guardan importes o deciden quién puede
moverlos:
- `transactions`, `transaction_allocations`, `budgets`, `savings_goals`,
  `goal_ledger_entries`, `goal_usage_allocations`, `goal_usage_confirmations`,
  `idempotency_records` y `audit_events`;
- `groups`, `group_members` y `group_invitations`. `groups` no guarda importes,
  pero su tipo, su moneda y su creador condicionan la validez de toda operación
  del grupo.

La especificación de P0-1 confirma la lista con el esquema real. Ninguna tabla
nueva que guarde importes o membresía queda fuera de ella.

1. **El rol de la petición no tiene ningún privilegio de escritura ni de
   alteración.** La migración revoca **todos** los privilegios de `anon` y
   `authenticated` sobre las tablas y secuencias de `juntia_data`, incluidos
   `TRUNCATE`, `REFERENCES` y `TRIGGER`, sean cuales sean los valores por
   defecto del proyecto. Solo devuelve a `authenticated` el `select` sobre las
   tablas que leen las vistas, siempre filtrado por RLS, y **no** le da `usage`
   sobre `juntia_data`: PostgreSQL no lo exige para consultar una vista
   `security_invoker` situada en `public`, y sin él el rol no puede nombrar las
   tablas desde ninguna otra vía. Así hay dos barreras contra una escritura
   directa: la API no llega al esquema, y aunque llegara no hay privilegio.
2. **Las escribe un rol propio: `juntia_writer`.** No tiene `LOGIN` ni
   `BYPASSRLS` ni es dueño de las tablas. Tiene exactamente los privilegios que
   cada función necesita:
   - **escritura:** sobre las tablas de solo inserción (`goal_ledger_entries`,
     `audit_events`, las correcciones de ADR-007), solo `insert`;
   - **lectura:** `select` sobre las filas que tiene que validar o bloquear
     (la meta, el grupo, la membresía, la idempotencia), con sus propias
     políticas `for select ... to juntia_writer`. Las políticas de
     `authenticated` no le sirven;
   - **bloqueo:** `select ... for update` exige además `update` y su política
     sobre las filas raíz que bloquea.
3. **Cada operación de dinero tiene dos funciones:**
   - una **función de entrada** en `public`, `security invoker`, que es lo
     único que el cliente llama con `rpc()` y que se limita a pasar la petición;
   - la **función que escribe** en `juntia_private`, `security definer`,
     propiedad de `juntia_writer`, con `set search_path = ''` y nombres
     cualificados. Es la que valida y escribe.

   Dentro de la función que escribe:
   - `auth.uid()` sigue devolviendo a la persona que llama, porque los claims
     del JWT son una variable de la transacción;
   - la RLS se sigue aplicando, porque `juntia_writer` no tiene `BYPASSRLS` ni
     es dueño. Sus políticas repiten la regla de propiedad o membresía con
     `auth.uid()`;
   - la función comprueba además, de forma explícita, que hay una persona
     autenticada y que es miembro activo cuando corresponde.

   Esto no es `security definer` «por conveniencia» (§7.4). Es el mecanismo que
   impide escribir dinero fuera del camino validado, sin saltarse ninguna
   política y sin exponer nada privilegiado.
4. **Las invariantes no dependen solo de la función.** Restricciones `check`,
   claves foráneas, índices únicos y triggers protegen lo que debe ser cierto
   llegue la escritura por donde llegue:
   - importes positivos;
   - alcance privado **XOR** grupo;
   - partes que suman exactamente el importe, con un trigger de restricción
     diferido al final de la transacción;
   - meta nunca negativa;
   - registros de solo inserción, con un trigger que rechaza `update` y
     `delete` incluso para `juntia_writer`.
5. **Escrituras sin dinero.** Las preferencias del perfil, por ejemplo, van por
   una función de entrada `security invoker` o una vista actualizable, con
   grants **por columna**. Nunca tocan columnas que concedan permisos, ni la
   identidad o la membresía.

### 3. Concurrencia

Una operación atómica no basta: con `READ COMMITTED`, dos retiros simultáneos
de una meta con 100 000 disponibles pueden leer el mismo saldo y aprobarse los
dos. Toda función de dinero debe dar **el mismo resultado que si las
operaciones concurrentes se hubieran ejecutado una detrás de otra**, al menos
para sus invariantes:

1. **Primero la idempotencia.** La función inserta la clave en
   `idempotency_records` con un índice único `(actor, acción, clave)` y una
   huella de la petición normalizada.
   - **Misma clave y misma huella:** devuelve el resultado guardado y no hace
     nada más. Dos peticiones con la misma clave nunca ejecutan dos veces.
   - **Misma clave con otra huella:** falla con un error propio. Nunca devuelve
     en silencio el resultado de otra intención.
2. **Después, bloquear la raíz del agregado** cuya invariante se comprueba (la
   meta, el grupo o el presupuesto), con `select ... for update`, y **solo
   entonces** leer saldos. Dos operaciones sobre la misma meta se ordenan;
   sobre metas distintas no se esperan.
3. **Varias raíces:** si una operación bloquea más de una, las adquiere en un
   orden determinista que fija la especificación, por ejemplo por
   identificador.
4. **Interbloqueo o fallo de serialización** (`40P01`, `40001`): la función no
   los oculta. La capa de servidor reintenta la misma petición con la misma
   clave de idempotencia, un número acotado de veces, y después falla con un
   error de dominio. La idempotencia hace seguro ese reintento.
5. **Ediciones de presupuesto:** con control de versión
   (`where version = $esperada`). Si la versión cambió, fallan con un error
   propio y la interfaz lo explica. Nunca se sobrescribe en silencio (§15.6.3
   punto 7).

La especificación de P0-1 elige, para cada función, los bloqueos concretos o
el nivel `serializable`. Este ADR fija el resultado exigido y su prueba, no la
técnica de cada caso.

### 4. Importes en la frontera: siempre texto

En la base, los importes son `bigint` en unidades menores (§5). La API de datos
serializa `bigint` como número JSON, y los tipos generados de Supabase lo
tipan como `number`: por encima de 2^53 pierde precisión. Este ADR da **la
garantía de API completa**: ningún importe cruza la frontera SQL ↔ API ↔
TypeScript como número, en ningún sentido y por ningún camino.

1. **Salida:** como las tablas viven en `juntia_data`, que ninguna API expone
   (ni PostgREST ni GraphQL, §5.3), la única forma de leer un importe es una
   vista de `public` o una función de entrada, y las dos lo exponen como
   `text`. No hay columna `bigint` de importe que una petición directa pueda
   leer.
2. **Entrada:** los parámetros de importe de las funciones son `text`,
   también dentro de `jsonb`. La función los valida (solo dígitos, sin signo
   salvo donde el contrato lo permita) y los convierte a `bigint`; un valor no
   válido falla con un error propio.
3. **TypeScript:** los tipos de transporte de `src/lib/db/` declaran los
   importes como `string` y los convierten al tipo `Money` del dominio, sin
   pasar por `number`. Una prueba comprueba que ningún campo de importe de los
   tipos generados de `public` es `number`.
4. **Prueba de ida y vuelta** con `9007199254740993` (2^53 + 1) y con los
   límites de `bigint`, en los dos sentidos.

### 5. Privilegios: modelo explícito y comprobado

1. **Funciones, por esquema:**
   - **funciones de entrada** en `public`: `security invoker`.
     `revoke execute ... from public, anon` y `grant execute ... to authenticated`;
   - **funciones que escriben** en `juntia_private`: `security definer`,
     propiedad de `juntia_writer`. `authenticated` recibe `usage` sobre
     `juntia_private` y `execute` sobre ellas, porque la función de entrada corre
     con sus privilegios. La API de datos no las publica, pero un rol con esos
     permisos podría llamarlas por SQL. Por eso **toda** la autorización, la
     validación y la idempotencia están en la función que escribe, nunca en la
     de entrada: saltarse la función de entrada no salta ninguna regla;
   - **auxiliares de autorización** (por ejemplo, «¿es miembro activo de este
     grupo?») en `juntia_private`. Pueden ser `security definer` cuando hacen
     falta para evitar políticas recursivas entre `groups` y `group_members`,
     como documenta Supabase. En ese caso devuelven solo un booleano, tienen
     `search_path = ''` y conceden `execute` solo a los roles cuyas políticas
     las usan;
   - **funciones internas** (cálculos, validaciones) en `juntia_private`, sin
     `execute` para `anon` ni `authenticated`.
2. **Sin `create` en ningún esquema** para `anon` ni `authenticated`: ni en
   `public`, ni en `juntia_data`, ni en `juntia_private`.
3. **GraphQL:** Juntia no usa `/graphql/v1`. La especificación de P0-1
   desactiva `pg_graphql`. Si alguna vez se usara, sería con una decisión
   aparte, y nunca reflejaría `juntia_data` ni `juntia_private`.
4. **Privilegios por defecto:** la primera migración ajusta
   `alter default privileges` en los tres esquemas. Así, las funciones nuevas no
   son ejecutables por `public`, y las tablas y secuencias nuevas no tienen
   grants hasta que la migración los conceda de forma explícita. Los valores
   por defecto de Supabase varían según la configuración del proyecto, así que
   no se dan por sabidos.
5. **Secuencias:** las claves son identidades o UUID. `anon` y
   `authenticated` no tienen `usage` ni `update` sobre ninguna secuencia.
6. **Vistas** de `public`: siempre `security_invoker = true`.
7. **Cada función `security definer`** lleva en su migración un comentario que
   justifica por qué lo es, y aparece en la prueba de privilegios efectivos de
   la verificación 7.
8. **`service_role`:** ningún camino que atienda a una persona lo usa. Si una
   operación de mantenimiento lo necesita, se decide aparte.

### 6. Lecturas, capas y autenticación

1. **Lecturas** con `supabase-js` desde el servidor (Server Components, Server
   Actions o Route Handlers), con el cliente de servidor de la petición, sobre
   las vistas de `public`. La RLS de las tablas base decide qué filas ve cada
   persona.
2. **Dominio en TypeScript, verificación en SQL.** El cálculo del reparto (el
   algoritmo de mayor residuo de ADR-002) vive en `src/domain/` y es puro. El
   servidor calcula las partes y las envía a la función, que las vuelve a
   comprobar. Así se cumple «RLS es última barrera, no sustituto de dominio»:
   la regla está en el dominio, en la función y en la restricción.
3. **Errores:** cada función falla con `RAISE` y un código propio, que la capa
   de servidor traduce a un error de dominio con su copy en `src/lib/copy/es.ts`.
4. **Ubicación:**
   - `src/lib/supabase/`: los dos clientes y los tipos generados
     (`database.types.ts`);
   - `src/lib/db/`: una función por operación, la única capa que conoce nombres
     de vistas y funciones;
   - `src/domain/` no importa nada de ahí (§7.2).
5. **Autenticación:**
   - `getClaims()` en el servidor para proteger páginas y datos, que valida la
     firma del JWT;
   - `getUser()` cuando haga falta el estado más reciente de la cuenta;
   - `proxy.ts` para renovar la sesión;
   - un cliente nuevo por petición;
   - las respuestas autenticadas no se guardan en cachés compartidas.

## Consecuencias

- **El esquema tiene una sola fuente:** las migraciones SQL de
  `supabase/migrations/`. Tablas, grants, políticas, funciones y triggers se
  revisan en el mismo diff.
- **Cada operación de dinero son dos funciones** (entrada y escritura) y cada
  tabla controlada tiene dos juegos de políticas (`authenticated` para leer y
  `juntia_writer` para validar, bloquear y escribir). Es más código que con una
  sola función `security invoker`, a cambio de que ninguna escritura de dinero
  esquive el camino validado y de que nada privilegiado quede expuesto.
- **Toda lectura de la aplicación pasa por vistas.** Las uniones que la API de
  datos no resuelve bien también van en vistas o en funciones de entrada.
- **La lógica de dinero que debe ser atómica se escribe en PL/pgSQL**, que es
  más verbosa que TypeScript y tiene menos herramientas. Se compensa con
  pgTAP: cada función tiene tests SQL de éxito, de rechazo por RLS, de
  repetición idempotente y de cada validación. La concurrencia y la
  idempotencia de extremo a extremo siguen en integración de servidor
  (`docs/TESTING.md`).
- **Los tipos generados se versionan.** El job SQL/RLS del CI, que entra con
  P0-1 (ADR-011 §5), los regenera contra Supabase local y falla si no
  coinciden con los del repositorio.
- **Hace falta una tabla de códigos de error** de las funciones y su
  traducción a copy. La define la especificación de P0-1.
- **Sin transacciones desde TypeScript.** Si una operación nueva necesita
  atomicidad, se escribe como función, no como varias llamadas seguidas.
- **Supabase Free:** el límite que importa es el de peticiones y
  almacenamiento, no el de conexiones, porque no se abre ninguna conexión
  directa desde Vercel.
- **Salir de Supabase** significaría reescribir `src/lib/supabase/` y
  `src/lib/db/`, y adaptar las políticas que leen `auth.uid()`. Las tablas, las
  funciones, los esquemas y los roles son Postgres estándar.

## Qué no decide este ADR

- El diseño de las tablas, que lo fija la especificación de P0-1 a partir del
  maestro §7.3.
- Si las liquidaciones van en `transactions` o en una tabla propia (§7.3 lo
  deja abierto y pide documentarlo antes de migrar).
- Los bloqueos concretos, su orden y el nivel de aislamiento de cada función
  (§3 fija el resultado y su prueba).
- El uso de TanStack Query en el cliente (§7.1). Es independiente de cómo habla
  el servidor con la base.

## Verificación pendiente [V]

Se ejecutan en P0-1 y su salida se pega en la evidencia del slice. Las
verificaciones 1, 2, 7, 8 y 9 se hacen con la primera migración, **antes** de
escribir la primera función de dinero, porque validan el mecanismo en el que
se apoya todo lo demás.

1. **El mecanismo de `juntia_writer` funciona en la versión de Supabase del
   stack:**
   - la migración puede crear el rol y asignarle la propiedad de las funciones.
     `alter function ... owner to` exige que quien migra pueda asumir el rol y
     que el rol tenga `create` en el esquema de la función;
   - dentro de una de ellas, `auth.uid()` devuelve a quien llama;
   - la RLS se aplica a `juntia_writer`, también a sus `select ... for update`.

   Pruebas: una función que intente escribir en la meta o el grupo de otra
   persona falla. Y la función que escribe, **llamada directamente por SQL**
   con el rol `authenticated` (sin la función de entrada), aplica la misma
   autorización, la misma RLS y las mismas invariantes.
2. **Escritura directa imposible.** Con un JWT de `authenticated` real y la API
   de datos pública, no solo `rpc()`:
   - `insert`, `update` y `delete` sobre cada tabla controlada fallan, también
     sobre filas propias. Por ejemplo, cambiar el importe de un aporte propio
     sin pasar por la función, o cambiar la moneda de un grupo;
   - `juntia_data` y `juntia_private` no son alcanzables ni por PostgREST ni por
     `/graphql/v1`;
   - ni `TRUNCATE` ni ninguna secuencia están al alcance de `anon` ni de
     `authenticated`;
   - el historial de las tablas de solo inserción no se puede modificar, ni
     siquiera desde una función de `juntia_writer`.
3. **Atomicidad:** un `RAISE` a mitad de una función de varias escrituras no
   deja ninguna fila (§15.6.3).
4. **Concurrencia e idempotencia:**
   - dos retiros simultáneos sobre la misma meta que juntos superan el saldo:
     uno se aprueba, el otro falla por saldo insuficiente y la meta nunca queda
     negativa;
   - dos peticiones simultáneas con la **misma** clave y la misma intención
     producen una sola operación;
   - la misma clave con **otra** intención falla con su error propio;
   - dos intenciones **distintas** se evalúan cada una por su cuenta, y la
     segunda puede ser rechazada por saldo.
5. **Edición concurrente de presupuesto:** la segunda edición con versión
   antigua falla con su error propio y no sobrescribe la primera.
6. **Importes:** ida y vuelta de `9007199254740993` y de los límites de
   `bigint`, en entrada y en salida, por función y por vista. Más la prueba de
   que ningún tipo de importe de `public` es `number`.
7. **Privilegios efectivos:** una prueba pgTAP lista los privilegios reales de
   `anon` y `authenticated` y los compara con la lista esperada:
   - sobre tablas, incluidos `TRUNCATE`, `REFERENCES` y `TRIGGER`;
   - sobre vistas, secuencias, esquemas y funciones, incluidos el `usage` y el
     `create` de cada esquema;
   - además, comprueba en el catálogo que no hay ninguna función
     `security definer` en `public`, y que ninguna función de `juntia_private`
     es invocable desde la API de datos.

   Una función nueva sin `revoke` hace fallar la prueba. Además, `pg_graphql`
   está desactivado, o en su defecto ninguna tabla controlada aparece en su
   esquema.
8. **Las vistas** de `public` tienen `security_invoker = true`, comprobado en el
   catálogo, y funcionan para `authenticated` sin `usage` sobre `juntia_data`.
9. **La forma del claim** en la versión de Supabase del stack (condición de la
   decisión 1 del maestro §15.10), que también usan las políticas de
   `juntia_writer`.
10. **Las versiones exactas** de `@supabase/supabase-js`, `@supabase/ssr` y la
    CLI, fijadas en el lockfile y registradas en el plan de P0-1.

Si la verificación 1 falla, por ejemplo porque Supabase no permite que la
migración asigne la propiedad de las funciones a un rol propio, este ADR se
reabre **antes** de seguir con P0-1. No se sustituye en silencio por funciones
propiedad de `postgres`, que tiene `BYPASSRLS`.

## Enmienda del 4 de noviembre de 2026 — nota de implementación de §2.3

**No cambia la decisión.** Precisa cómo se cumple «`auth.uid()` sigue
devolviendo a la persona que llama» dentro de la función que escribe. Origen: el
preflight del plan de P0-1 (ADR-011 §9.4), runs
[41937553460](https://github.com/flashwp3-ctrl/juntia/actions/runs/41937553460),
[41938278390](https://github.com/flashwp3-ctrl/juntia/actions/runs/41938278390) y
[41938774244](https://github.com/flashwp3-ctrl/juntia/actions/runs/41938774244),
con Supabase CLI 2.121.0 y PostgreSQL 17.11. La salida está en
`specs/002-cuentas-y-gastos-privados/research.md`, R1.

- **Lo encontrado.** Un cuerpo PL/pgSQL propiedad de `juntia_writer` que nombra
  `auth.uid()` falla con `42501 permission denied for schema auth`:
  `juntia_writer` no tiene `usage` sobre `auth`, y `grant usage on schema auth`
  no concede nada (`WARNING 01007: no privileges were granted for "auth"`),
  porque el esquema es de `supabase_admin`. Las políticas RLS con
  `(select auth.uid())` no están afectadas: su expresión se guarda resuelta al
  crearlas.
- **Cómo se cumple §2.3.** Las funciones que escriben no nombran `auth.uid()`.
  Llaman a una auxiliar `juntia_private.current_uid()`, `language sql stable
  security invoker` con **cuerpo SQL estándar** (`return auth.uid();`), propiedad
  de `postgres`, sin `execute` para `public`, `anon` ni `authenticated`, y con
  `execute` solo para `juntia_writer`. El cuerpo estándar se resuelve al crear la
  función y en ejecución solo exige `execute` sobre `auth.uid()`, que ya tiene
  `public`. Dentro de la función que escribe devuelve a quien llama, por la API y
  por SQL directo, y `null` sin claims.
- **Lo que no cambia.** `juntia_writer` sigue sin `LOGIN`, sin `BYPASSRLS` y sin
  ser dueño de las tablas; la RLS se le sigue aplicando; no se concede nada
  sobre el esquema `auth`. La auxiliar es `security invoker`: no amplía
  privilegios. La [V] 1 definitiva sigue siendo del PR A de P0-1, con la primera
  migración.

## Referencias

- `docs/JUNTIA_MASTER.md` §5, §7.1–7.5, §10.1, §15.6.3 y §15.10 (decisión 1 y el
  pendiente de acceso a datos)
- `docs/adr/ADR-001-conversion-privado-compartido.md`,
  `docs/adr/ADR-011-estrategia-de-pruebas-y-ci.md`
- `docs/TESTING.md`
- Documentación oficial enlazada en «Lo que se verificó, no se supuso»
