# ADR-013 — Acceso a datos: `supabase-js` con funciones de Postgres, sin ORM

**Estado:** Propuesto, 4 de noviembre de 2026. Pendiente de decisión de los fundadores · **Origen:** pendiente declarado en el maestro §15.10 («el mecanismo de acceso a datos […] necesita su propio ADR antes de P0-1») · **Alcance:** P0 completo, desde P0-1

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

## Opciones

| | **A. `supabase-js` + funciones de Postgres** | **B. Drizzle con conexión directa** | **C. Prisma con conexión directa** |
| --- | --- | --- | --- |
| Identidad en la base | La sesión de la persona viaja en cada petición: RLS se aplica siempre, sin código propio | El código abre una transacción, copia los claims y cambia de rol **en cada operación**. Si se olvida, la conexión corre como su usuario de base, que se salta la RLS | Igual que B, sin envoltorio documentado; habría que escribirlo |
| Escrituras atómicas | Una función PL/pgSQL por operación crítica: la transacción, las validaciones y la idempotencia viven en SQL y pgTAP las prueba directamente | Transacciones en TypeScript. La lógica de dinero queda repartida entre TS y SQL, y pgTAP no la cubre | Igual que B |
| RLS como barrera probada (§7.4) | El camino de la aplicación y el de los tests usan los mismos roles (`authenticated`, `anon`) | Hay que probar además que el envoltorio nunca se omite | Igual que B |
| Conexiones en Vercel serverless | HTTP a la API de datos; no hay pool que gestionar | Pooler en modo transacción con `prepare: false`; una conexión por invocación | `pgbouncer=true` y `connection_limit=1` |
| Tipos | Generados del esquema real, versionados y comprobados en CI | Esquema escrito en TS; las migraciones salen de él o se escriben a mano y se sincronizan | Esquema propio (`schema.prisma`) y su generador |
| Migraciones | SQL plano en `supabase/migrations/`, el formato que ya prevé el maestro (§7.2) | `drizzle-kit` o SQL a mano: dos fuentes posibles del esquema | `prisma migrate`: la RLS y las funciones se escriben como SQL crudo dentro |
| Dependencias nuevas | `@supabase/supabase-js`, `@supabase/ssr` | Las de A para Auth, más `drizzle-orm`, `drizzle-kit` y un driver | Las de A para Auth, más `prisma` y `@prisma/client` |
| Coste de salir de Supabase | El SQL (tablas, RLS, funciones) es Postgres estándar; se reescribe la capa fina de `src/lib/db/` | Menor en la capa de consultas; la RLS sigue atada a los roles y claims de Supabase | Igual que B |

**Variante descartada: A para leer y B para escribir.** Suma las dos
superficies, dos formas de identidad y dos fuentes del esquema, sin resolver
nada que A no resuelva.

## Decisión propuesta

**Opción A.** `supabase-js` con `@supabase/ssr`, y funciones de Postgres para
cada escritura que mueve dinero o que toca más de una fila. Sin ORM ni query
builder en P0.

1. **Lecturas:** con `supabase-js` desde el servidor (Server Components,
   Server Actions o Route Handlers), con el cliente de servidor de la petición.
   La RLS decide qué filas ve cada persona.
2. **Escrituras críticas:** una función PL/pgSQL por operación del maestro
   §7.3 y §15.6.3: crear gasto con sus partes, convertir privado → compartido,
   corregir con auditoría, liquidar, aceptar invitación, aportar, retirar y
   usar una meta, y autorizar fondos ajenos. Se llaman con
   `supabase.rpc(...)`. Cada función:
   - es `security invoker`, de modo que la RLS se aplica también dentro;
   - recibe la `idempotency_key` y resuelve la repetición en la misma
     transacción, contra `idempotency_records`;
   - valida en SQL lo que no puede quedar solo en TypeScript: membresía activa,
     tipo, moneda, que las partes sumen exactamente el importe y que una meta
     nunca quede negativa;
   - falla con `RAISE` y un código propio que la capa de servidor traduce a un
     error de dominio con su copy en `src/lib/copy/es.ts`.
3. **Escrituras simples** de una fila sin dinero (preferencias del perfil, por
   ejemplo) pueden ir directas con `insert`/`update` bajo RLS.
4. **Privilegios:** cada función se crea con `revoke execute ... from public, anon`
   y `grant execute ... to authenticated`. Ninguna función
   `security definer` sin justificar caso por caso en su migración, con
   `search_path = ''`, y nunca para saltarse una política (§7.4). La clave
   `service_role` no se usa en ningún camino que atienda a una persona; si
   alguna operación de mantenimiento la necesita, se decide aparte.
5. **Dominio en TypeScript, verificación en SQL.** El cálculo del reparto (el
   algoritmo de mayor residuo de ADR-002) vive en `src/domain/` y es puro. El
   servidor calcula las partes y las envía a la función, que las vuelve a
   comprobar. Así se cumple «RLS es última barrera, no sustituto de dominio»:
   las reglas existen en el dominio, en la función y en la política.
6. **Importes:** las funciones y las vistas devuelven los importes `bigint`
   como texto (`::text`). La capa de servidor los convierte al tipo `Money` del
   dominio, sin pasar nunca por `number`. La API de datos serializa `bigint`
   como número JSON, que en JavaScript pierde precisión por encima de 2^53. En
   P0 no se llega a esa cifra, pero el maestro §5 prohíbe que los importes
   pasen por números de punto flotante.
7. **Ubicación:** `src/lib/supabase/` tiene los dos clientes y los tipos
   generados (`database.types.ts`). `src/lib/db/` tiene una función por
   operación, que es la única capa que conoce nombres de tablas y funciones.
   `src/domain/` no importa nada de ahí (§7.2).
8. **Autenticación:** `getClaims()` en el servidor para proteger páginas y
   datos, `proxy.ts` para renovar la sesión y un cliente nuevo por petición.

## Consecuencias

- **El esquema tiene una sola fuente:** las migraciones SQL de
  `supabase/migrations/`. Las tablas, las políticas y las funciones se revisan
  en el mismo diff.
- **La lógica de dinero que debe ser atómica se escribe en PL/pgSQL.** Es más
  verbosa que TypeScript y tiene menos herramientas. Se compensa con pgTAP:
  cada función tiene tests SQL de éxito, de rechazo por RLS, de repetición
  idempotente y de cada validación. La concurrencia y la idempotencia
  extremo a extremo siguen en integración de servidor (`docs/TESTING.md`).
- **Los tipos generados se versionan.** El job SQL/RLS del CI, que entra con
  P0-1 (ADR-011 §5), los regenera contra Supabase local y falla si no
  coinciden con los del repositorio.
- **Errores:** hace falta una tabla de códigos de error de las funciones y su
  traducción a copy. La define la especificación de P0-1.
- **Sin transacciones desde TypeScript.** Si una operación nueva necesita
  atomicidad, se escribe como función, no como varias llamadas seguidas.
- **Supabase Free:** el límite que importa es el de peticiones y
  almacenamiento, no el de conexiones, porque no se abre ninguna conexión
  directa desde Vercel.
- **Salir de Supabase** significaría reescribir `src/lib/supabase/` y
  `src/lib/db/`, y adaptar las políticas que leen `auth.uid()`. Las tablas y
  las funciones son Postgres estándar.

## Qué no decide este ADR

- El diseño de las tablas, que lo fija la especificación de P0-1 a partir del
  maestro §7.3.
- Si las liquidaciones van en `transactions` o en una tabla propia (§7.3 lo
  deja abierto y pide documentarlo antes de migrar).
- El uso de TanStack Query en el cliente (§7.1). Es independiente de cómo habla
  el servidor con la base.

## Verificación pendiente [V]

Se ejecutan en P0-1 y su salida se pega en la evidencia del slice:

1. Que una función `security invoker` llamada con `rpc()` aplica la RLS del
   llamante, con un test pgTAP que intente escribir en la meta o el grupo de
   otra persona y falle.
2. Que una función creada sin `revoke` es invocable por `anon`, y que con el
   `revoke` deja de serlo. Así el patrón queda probado, no solo escrito.
3. Que un `RAISE` a mitad de una función de varias escrituras no deja ninguna
   fila: es la atomicidad de §15.6.3.
4. Que los importes llegan como texto y se reconstruyen sin pérdida, con un
   importe por encima de 2^53 en el test.
5. Las versiones exactas de `@supabase/supabase-js`, `@supabase/ssr` y la CLI,
   fijadas en el lockfile y registradas en el plan de P0-1.
6. La forma del claim en la versión de Supabase del stack (condición de la
   decisión 1 del maestro §15.10), que también usan las funciones.

## Referencias

- `docs/JUNTIA_MASTER.md` §5, §7.1–7.5, §10.1, §15.6.3 y §15.10 (decisión 1 y el
  pendiente de acceso a datos)
- `docs/adr/ADR-001-conversion-privado-compartido.md`,
  `docs/adr/ADR-011-estrategia-de-pruebas-y-ci.md`
- `docs/TESTING.md`
- Documentación oficial enlazada en «Lo que se verificó, no se supuso»
