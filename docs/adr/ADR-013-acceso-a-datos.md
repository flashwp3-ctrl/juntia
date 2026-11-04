# ADR-013 — Acceso a datos: `supabase-js` con funciones de Postgres, sin ORM

**Estado:** Propuesto, 4 de noviembre de 2026. Pendiente de decisión de los fundadores · **Revisión:** primera ronda adversarial del PR #34, 4 de noviembre de 2026 · **Origen:** pendiente declarado en el maestro §15.10 («el mecanismo de acceso a datos […] necesita su propio ADR antes de P0-1») · **Alcance:** P0 completo, desde P0-1

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
  ([Database functions](https://supabase.com/docs/guides/database/functions);
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
  que no debería tener, y al revés.
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

**Opción A.** `supabase-js` con `@supabase/ssr`. Las tablas de dinero **solo se
escriben a través de funciones de Postgres**, y la RLS se sigue aplicando
dentro de ellas. Sin ORM ni query builder en P0.

### 1. Tablas de dinero: sin escritura directa

Son tablas de dinero las que guardan importes o deciden quién puede moverlos:
`transactions`, `transaction_allocations`, `budgets`, `savings_goals`,
`goal_ledger_entries`, `goal_usage_allocations`, `goal_usage_confirmations`,
`group_members`, `group_invitations`, `idempotency_records` y `audit_events`.
La especificación de P0-1 confirma la lista con el esquema real.

1. **El rol de la petición solo puede leerlas.** `authenticated` y `anon` no
   tienen `insert`, `update` ni `delete` sobre ninguna: se revocan
   explícitamente en la migración. `authenticated` tiene `select`, filtrado
   por RLS. Una petición directa de escritura a la API de datos falla por
   privilegios antes de llegar a ninguna política.
2. **Las escribe un rol propio: `juntia_writer`.** No tiene `LOGIN` ni
   `BYPASSRLS` ni es dueño de las tablas. Tiene exactamente los privilegios de
   escritura que cada tabla necesita: sobre las tablas de solo inserción
   (`goal_ledger_entries`, `audit_events`, las correcciones de ADR-007), solo
   `insert`.
3. **Cada operación de dinero es una función `security definer` propiedad de
   `juntia_writer`**, con `set search_path = ''` y nombres cualificados. Corre
   con los privilegios de `juntia_writer`, pero:
   - `auth.uid()` sigue devolviendo a la persona que llama, porque los claims
     del JWT son una variable de la transacción;
   - la RLS se sigue aplicando, porque `juntia_writer` no tiene `BYPASSRLS` ni
     es dueño. Sus políticas `for insert/update ... to juntia_writer` repiten
     la regla de propiedad o membresía con `auth.uid()`;
   - la función comprueba además, de forma explícita, que hay una persona
     autenticada y que es miembro activo cuando corresponde.

   Esto no es `security definer` «por conveniencia» (§7.4). Es el mecanismo que
   impide escribir dinero fuera del camino validado, sin saltarse ninguna
   política.
4. **Las invariantes no dependen solo de la función.** Restricciones `check`,
   claves foráneas, índices únicos y triggers protegen lo que debe ser cierto
   llegue la escritura por donde llegue: importes positivos, alcance privado
   **XOR** grupo, partes que suman exactamente el importe (trigger de
   restricción diferido al final de la transacción), meta nunca negativa y
   registros de solo inserción.
5. **Escrituras sin dinero** de una fila, como las preferencias del perfil,
   pueden ir directas con `insert` o `update` bajo RLS, con su grant explícito.

### 2. Concurrencia

Una operación atómica no basta: con `READ COMMITTED`, dos retiros simultáneos
de una meta con 100 000 disponibles pueden leer el mismo saldo y aprobarse los
dos. Toda función de dinero debe dar **el mismo resultado que si las
operaciones concurrentes se hubieran ejecutado una detrás de otra**, al menos
para sus invariantes:

1. **Primero la idempotencia.** La función inserta la clave en
   `idempotency_records` con un índice único `(actor, acción, clave)`. Si la
   clave ya existe, devuelve el resultado guardado y no hace nada más. Dos
   peticiones con la misma clave nunca ejecutan dos veces.
2. **Después, bloquear la raíz del agregado** cuya invariante se comprueba
   (la meta, el grupo o el presupuesto), con `select ... for update`, antes de
   leer saldos. Dos operaciones sobre la misma meta se ordenan; sobre metas
   distintas no se esperan.
3. **Ediciones de presupuesto:** con control de versión (`where version = $esperada`).
   Si la versión cambió, falla con un error propio y la interfaz lo explica.
   Nunca se sobrescribe en silencio (§15.6.3 punto 7).

La especificación de P0-1 elige, para cada función, los bloqueos concretos o
el nivel `serializable` con reintento. Este ADR fija el resultado exigido y su
prueba, no la técnica de cada caso.

### 3. Importes en la frontera: siempre texto

En la base, los importes son `bigint` en unidades menores (§5). La API de datos
serializa `bigint` como número JSON, y los tipos generados de Supabase lo
tipan como `number`: por encima de 2^53 pierde precisión. Por eso **ningún
importe cruza la frontera SQL ↔ API ↔ TypeScript como número**, en ningún
sentido:

1. **Salida:** los importes se leen a través de vistas `security_invoker = true`
   o de funciones que los exponen como `text`. La capa `src/lib/db/` no
   selecciona columnas de importe de las tablas base.
2. **Entrada:** los parámetros de importe de las funciones son `text`,
   también dentro de `jsonb`. La función los valida (solo dígitos, sin signo
   salvo donde el contrato lo permita) y los convierte a `bigint`; un valor no
   válido falla con un error propio.
3. **TypeScript:** los tipos de transporte de `src/lib/db/` declaran los
   importes como `string` y los convierten al tipo `Money` del dominio, sin
   pasar por `number`. Una prueba comprueba que ningún campo de importe de los
   tipos generados que usa la aplicación es `number`.
4. **Prueba de ida y vuelta** con `9007199254740993` (2^53 + 1) y con los
   límites de `bigint`, en los dos sentidos.

### 4. Privilegios: modelo explícito y comprobado

1. **Tres tipos de función, en esquemas distintos:**
   - **RPC de negocio** en `public`, el esquema expuesto: las operaciones de
     dinero de §1.3. `revoke execute ... from public, anon` y
     `grant execute ... to authenticated`.
   - **Funciones auxiliares de autorización** (por ejemplo, «¿es miembro activo
     de este grupo?») en un esquema propio no expuesto por la API de datos.
     Pueden ser `security definer` cuando hacen falta para evitar políticas
     recursivas entre `groups` y `group_members`, como documenta Supabase. En
     ese caso devuelven solo un booleano, tienen `search_path = ''` y conceden
     `execute` solo a los roles cuyas políticas las usan.
   - **Funciones internas** de las RPC (cálculos, validaciones) en ese mismo
     esquema no expuesto, sin `execute` para `anon` ni `authenticated`.
2. **Privilegios por defecto:** la primera migración ajusta
   `alter default privileges` para que las funciones nuevas no sean ejecutables
   por `public`, y las tablas y secuencias nuevas no tengan grants hasta que la
   migración los conceda de forma explícita. Los valores por defecto de
   Supabase varían según la configuración del proyecto, así que no se dan por
   sabidos.
3. **Vistas** que leen datos protegidos: siempre `security_invoker = true`.
4. **Cada función `security definer`** lleva en su migración un comentario que
   justifica por qué lo es, y aparece en la prueba de privilegios efectivos de
   la verificación 7.
5. **`service_role`:** ningún camino que atienda a una persona lo usa. Si una
   operación de mantenimiento lo necesita, se decide aparte.

### 5. Lecturas, capas y autenticación

1. **Lecturas** con `supabase-js` desde el servidor (Server Components, Server
   Actions o Route Handlers), con el cliente de servidor de la petición. La
   RLS decide qué filas ve cada persona.
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
     de tablas, vistas y funciones;
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
- **La lógica de dinero que debe ser atómica se escribe en PL/pgSQL**, que es
  más verbosa que TypeScript y tiene menos herramientas. Se compensa con
  pgTAP: cada función tiene tests SQL de éxito, de rechazo por RLS, de
  repetición idempotente y de cada validación. La concurrencia y la
  idempotencia de extremo a extremo siguen en integración de servidor
  (`docs/TESTING.md`).
- **Cada tabla de dinero necesita dos juegos de políticas:** `select` para
  `authenticated` y escritura para `juntia_writer`. Son más políticas que con
  `security invoker`, a cambio de que ninguna escritura de dinero esquive las
  funciones.
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
  funciones y los roles son Postgres estándar.

## Qué no decide este ADR

- El diseño de las tablas, que lo fija la especificación de P0-1 a partir del
  maestro §7.3.
- Si las liquidaciones van en `transactions` o en una tabla propia (§7.3 lo
  deja abierto y pide documentarlo antes de migrar).
- Los bloqueos concretos o el nivel de aislamiento de cada función (§2 fija el
  resultado y su prueba).
- El uso de TanStack Query en el cliente (§7.1). Es independiente de cómo habla
  el servidor con la base.

## Verificación pendiente [V]

Se ejecutan en P0-1 y su salida se pega en la evidencia del slice. Las
verificaciones 1, 2, 7, 8 y 9 se hacen con la primera migración, **antes** de
escribir la primera función de dinero, porque validan el mecanismo en el que
se apoya todo lo demás.

1. **El mecanismo de `juntia_writer` funciona en la versión de Supabase del
   stack:** la migración puede crear el rol y hacerlo propietario de las
   funciones; dentro de una de ellas, `auth.uid()` devuelve a quien llama; y
   la RLS se aplica a `juntia_writer`. Prueba: una función que intente
   escribir en la meta o el grupo de otra persona falla.
2. **Escritura directa imposible.** Con un JWT de `authenticated` real y la API
   de datos pública (no solo `rpc()`): `insert`, `update` y `delete` sobre
   cada tabla de dinero fallan, también sobre filas propias. Por ejemplo,
   cambiar el importe de un aporte propio sin pasar por la función.
3. **Atomicidad:** un `RAISE` a mitad de una función de varias escrituras no
   deja ninguna fila (§15.6.3).
4. **Concurrencia:** dos retiros simultáneos sobre la misma meta, que juntos
   superan el saldo. Uno se aprueba y el otro falla, y la meta nunca queda
   negativa. Además, dos peticiones simultáneas con la **misma** clave de
   idempotencia producen una sola operación, y dos con claves **distintas**
   producen dos.
5. **Edición concurrente de presupuesto:** la segunda edición con versión
   antigua falla con su error propio y no sobrescribe la primera.
6. **Importes:** ida y vuelta de `9007199254740993` y de los límites de
   `bigint`, en entrada y en salida, por función y por vista. Más la prueba de
   que ningún tipo de importe de transporte es `number`.
7. **Privilegios efectivos:** una prueba pgTAP lista los grants reales de
   `anon` y `authenticated` sobre tablas, vistas, secuencias y funciones, y
   compara con la lista esperada. Una función nueva sin `revoke` falla la
   prueba. Ninguna función auxiliar ni interna es invocable desde la API de
   datos.
8. **Las vistas** que leen datos protegidos tienen `security_invoker = true`,
   comprobado en el catálogo.
9. **La forma del claim** en la versión de Supabase del stack (condición de la
   decisión 1 del maestro §15.10), que también usan las políticas de
   `juntia_writer`.
10. **Las versiones exactas** de `@supabase/supabase-js`, `@supabase/ssr` y la
    CLI, fijadas en el lockfile y registradas en el plan de P0-1.

Si la verificación 1 falla, por ejemplo porque Supabase no permite que la
migración asigne la propiedad de las funciones a un rol propio, este ADR se
reabre **antes** de seguir con P0-1. No se sustituye en silencio por funciones
propiedad de `postgres`, que tiene `BYPASSRLS`.

## Referencias

- `docs/JUNTIA_MASTER.md` §5, §7.1–7.5, §10.1, §15.6.3 y §15.10 (decisión 1 y el
  pendiente de acceso a datos)
- `docs/adr/ADR-001-conversion-privado-compartido.md`,
  `docs/adr/ADR-011-estrategia-de-pruebas-y-ci.md`
- `docs/TESTING.md`
- Documentación oficial enlazada en «Lo que se verificó, no se supuso»
