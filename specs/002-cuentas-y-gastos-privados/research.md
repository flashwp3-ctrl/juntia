# Research — 002 · Cuentas y gastos privados (P0-1)

**Fase 0 del plan.** Registra la ejecución de los `[V]` que **deciden cómo se
construye** (ADR-012 §2; spec, «Inventario de `[V]`») y las decisiones técnicas
del plan. Cada decisión cita la fuente que la obliga; lo que no tiene fuente
superior es una **decisión del plan** —local, reversible y no significativa— y
se marca así para que el revisor la pueda objetar.

**Dónde se ejecutó.**

- **R1 a R6: preflight en CI** (ADR-011 §9.4). Workflow desechable
  `.github/workflows/spike-p0-1.yml` en la rama `spike/p0-1-plan-v`, que nunca se
  fusiona, con `on: push` limitado a esa rama. Supabase local dentro de un runner
  `ubuntu-24.04` de GitHub; ningún proyecto en la nube. El SQL desechable vive en
  `spike/` de esa rama (`git show origin/spike/p0-1-plan-v:spike/<archivo>`). Tres
  runs, los tres en verde:

  | Run | Commit | Qué cambió | Duración del job |
  | --- | --- | --- | ---: |
  | [41937553460](https://github.com/flashwp3-ctrl/juntia/actions/runs/41937553460) | `6ec1333` | Primer intento: `auth.uid()` dentro del cuerpo de `juntia_writer` | 162 s |
  | [41938278390](https://github.com/flashwp3-ctrl/juntia/actions/runs/41938278390) | `0749867` | Auxiliar `current_uid()` y `enable_confirmations = true` | 147 s |
  | [41938774244](https://github.com/flashwp3-ctrl/juntia/actions/runs/41938774244) | `6d093b8` | Copia de solo datos con `-t juntia_data.*` | 173 s |

  Las salidas de abajo son las del run 3 salvo que se diga otra cosa, copiadas de
  `gh run view <id> --log` y recortadas solo donde se indica con `…`. Ninguna
  clave aparece en el log: el workflow las enmascara.
- **R7: en local, sin Docker**, el 4 de noviembre de 2026, en Windows 11 con
  Node v24.22.1, en una copia desechable de la app **fuera del repositorio**
  (`…\scratchpad\theme-v`). Ningún archivo de esa copia entra al repositorio.

---

## R1 · `[V]` Viabilidad de `juntia_writer` (anticipo de ADR-013 [V] 1)

**Fuente.** Spec, «Inventario de `[V]`», primera fila; ADR-013 §2 y [V] 1; ADR-011
§9.4. Informa el plan; **no sustituye** la [V] 1 definitiva del PR A.

### Lo que se construyó

Migración desechable `spike/supabase/migrations/20261104000000_spike_writer.sql`:
los tres esquemas, el rol `juntia_writer` (`nologin nobypassrls`, no dueño), una
tabla `juntia_data.movements` con RLS para `authenticated` (select) y para
`juntia_writer` (select, insert, update), funciones que escriben en
`juntia_private` (`security definer`, propiedad de `juntia_writer`,
`search_path = ''`), funciones de entrada en `public` (`security invoker`) y una
vista `security_invoker` que expone el importe como texto.

### Salida: quién migra y qué exige `alter function … owner to`

```
== e.0b who ran the migration (table created inside the migration)
    cu    |    su    | is_super | bypassrls | pg_version
 postgres | postgres | f        | t         | PostgreSQL 17.11 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit
== e.2 alter owner WITHOUT explicit membership and WITHOUT create on schema
psql:spike/probe_e.sql:23: ERROR:  42501: must be able to SET ROLE "spike_probe_owner"
== e.3 grant spike_probe_owner to postgres; retry (still no create on schema)
psql:spike/probe_e.sql:30: ERROR:  42501: permission denied for schema spike_probe
== e.4 grant create on schema spike_probe to spike_probe_owner; retry
ALTER FUNCTION
== e.5 after transfer: can create be revoked again without breaking the function?
REVOKE
 still_callable
              1
== e.6 real juntia_private functions: owner, secdef, config
 juntia_private | add_movement_v2          | juntia_writer | t         | {"search_path=\"\""}
 juntia_private | current_uid              | postgres      | f         |
 …
```

Lectura: en local migra `postgres` (sin superusuario, con `BYPASSRLS`). Para
asignar la propiedad hacen falta **dos** cosas: `grant juntia_writer to postgres`
(PG 17 exige poder hacer `SET ROLE`) y `create` en el esquema para
`juntia_writer`, que **se puede revocar** después sin romper la función.
`create role` necesita un bloque `DO` idempotente: los roles son del clúster y
sobreviven a un `db reset`.

### Salida: la sorpresa — `auth.uid()` dentro de la función que escribe

```
=== 1a. v1 (auth.uid() named inside definer body) as A — expected to fail (run 1)
HTTP 403 {"code":"42501","details":null,"hint":null,"message":"permission denied for schema auth"}
== e.7 juntia_writer reachability of auth.uid()
 writer_usage_auth | writer_exec_uid | public_usage_auth
 f                 | t               | f
== e.7b direct attempt (outside the DO block) to grant usage on auth to juntia_writer
psql:spike/probe_e.sql:55: WARNING:  01007: no privileges were granted for "auth"
GRANT
== e.7c helper with SQL-standard body (RETURN auth.uid()): prosqlbody set?
   proname   | has_sqlbody |  owner
 current_uid | t           | postgres
 auth | {supabase_admin=UC/supabase_admin,anon=U/supabase_admin,authenticated=U/supabase_admin,…,postgres=U/supabase_admin}
 uid  | {=X/supabase_auth_admin,supabase_auth_admin=X/supabase_auth_admin,dashboard_user=X/supabase_auth_admin}
```

Lectura: `juntia_writer` no tiene `usage` sobre `auth` y `postgres` no puede
dárselo (el esquema es de `supabase_admin`). **Cambio de diseño:** las funciones
que escriben llaman a `juntia_private.current_uid()`, `language sql stable
security invoker` con cuerpo SQL estándar (`return auth.uid();`). El cuerpo se
resuelve al crearse y en ejecución solo exige `execute` sobre `auth.uid()`, que
tiene `public`. Las políticas con `(select auth.uid())` no están afectadas.
Registrado como **nota de implementación de ADR-013 §2.3** en la enmienda del 4
de noviembre de 2026 de ese ADR, en esta misma rama: no cambia la decisión.

### Salida: identidad, RLS y escritura directa por la API

```
=== 1a. v2 (helper current_uid, SQL-standard body) as A (amount 4500000)
HTTP 200 "59a23d07-6cf7-4b07-a6ff-3c33950c37bf"
returned == A ? YES
=== 1a''. v2 as anon (no user token)
HTTP 401 {"code":"42501",…,"message":"permission denied for function spike_add_movement_v2"}
=== 1a'''. v2 as A with amount 0 (check constraint)
HTTP 400 {"code":"23514",…,"message":"new row for relation \"movements\" violates check constraint \"movements_amount_minor_check\""}
=== 1b. GET view as B
HTTP 200 [{"id":"c5ce4c03-…","owner_id":"e4209a52-…","amount_minor":"555"}]
=== 1b. supabase-js-style count: GET view as B with filter on A's id
HTTP 200 []
=== 1c. direct table access over the API
-- POST /rest/v1/movements (public)
HTTP 404 {"code":"PGRST205",…,"message":"Could not find the table 'public.movements' in the schema cache"}
-- POST movements Content-Profile: juntia_data
HTTP 406 {"code":"PGRST106",…,"hint":"Only the following schemas are exposed: public, graphql_public","message":"Invalid schema: juntia_data"}
-- PATCH / DELETE / GET movements (juntia_data) → HTTP 406 PGRST106 (igual)
-- POST rpc/add_movement Content-Profile: juntia_private
HTTP 406 {"code":"PGRST106",…,"message":"Invalid schema: juntia_private"}
-- POST / PATCH / DELETE view spike_movements (auto-updatable view)
HTTP 403 {"code":"42501",…,"message":"permission denied for view spike_movements"}
-- GraphQL introspection as A (query type fields)
HTTP 200 {"errors": [{"message": "pg_graphql extension is not enabled."}]}
=== 1d. writer variant: A inserts with owner_id = B
HTTP 403 {"code":"42501",…,"message":"new row violates row-level security policy for table \"movements\""}
=== 1d'. lock_and_bump A's row as B (select for update + update under RLS)
HTTP 200 {"locked": 0, "updated": 0, "current_user": "juntia_writer"}
=== 1d'. lock_and_bump A's row as A
HTTP 200 {"locked": 1, "updated": 1, "current_user": "juntia_writer"}
```

### Salida: por SQL directo como `authenticated`, sin la función de entrada

```
== 1c.0 effective privileges anon/authenticated on juntia_data / juntia_private
 authenticated | juntia_data  | movements  | SELECT
 juntia_writer | juntia_data  | movements  | INSERT,SELECT,UPDATE
 anon          | juntia_data    | f     | f
 authenticated | juntia_data    | f     | f
 authenticated | juntia_private | t     | f
 juntia_writer | juntia_private | t     | t
== 1c.1–1c.4 authenticated + claims: direct INSERT / UPDATE / DELETE / TRUNCATE
psql:spike/sql_tests.sql:44: ERROR:  permission denied for schema juntia_data   (× 4)
== 1c.5 INSERT/UPDATE/DELETE through the public view
psql:spike/sql_tests.sql:60: ERROR:  permission denied for view spike_movements
== 1f.1 authenticated SELECT on table name directly (has SELECT, no USAGE on juntia_data)
psql:spike/sql_tests.sql:68: ERROR:  permission denied for schema juntia_data
== 1f.2 authenticated SELECT through security_invoker view without USAGE on juntia_data
 e7cb5f5a-… | 59a23d07-… | 12345            | text
 f1804f12-… | 59a23d07-… | 9007199254740993 | text
== 1f.3 view options in catalog
 spike_movements | {security_invoker=true}
== 1d.1b v2 (helper current_uid) DIRECTLY by SQL as authenticated: own row
 v2_returns_caller
 t
== 1d.1e v2 with NO claims: expect not authenticated (28000)
psql:spike/sql_tests.sql:97: ERROR:  not authenticated
== 1d.2 writer fn variant DIRECTLY by SQL as authenticated: owner = other user (expect RLS error)
psql:spike/sql_tests.sql:105: ERROR:  new row violates row-level security policy for table "movements"
== 1d.3 set role juntia_writer directly (as postgres member): insert for other user
psql:spike/sql_tests.sql:109: ERROR:  new row violates row-level security policy for table "movements"
```

**Resultado del `[V]`: viable**, con la auxiliar `current_uid()`. ADR-013 no se
reabre: la RLS se aplica a `juntia_writer` (insert y `for update`), la escritura
directa es imposible por la API y por SQL, y las vistas funcionan sin `usage`.
**Queda para el PR A** (con el esquema real y en `juntia-dev`): qué rol de login
usa `supabase db push` en un proyecto alojado y si puede hacer `grant
juntia_writer to …` y `alter function … owner to juntia_writer`; si `drop
extension pg_graphql` está permitido allí; y la lista de esquemas expuestos del
proyecto.

---

## R2 · `[V]` Forma del claim (ADR-013 [V] 9; decisión 1)

```
=== 2. JWT header + claims of A (decoded, no signature)
{"alg":"ES256","kid":"b81269f1-21d8-4f2e-b719-c2240a840d90","typ":"JWT"}
{"iss":"http://127.0.0.1:54321/auth/v1","sub":"59a23d07-…","aud":"authenticated","exp":…,"email":"alice@spike.test",…,"role":"authenticated","aal":"aal1",…,"session_id":"b3ba6367-…","is_anonymous":false}
=== 2. rpc/spike_whoami_v2 as A (what PostgREST sets; invoker + definer view)
HTTP 200 {"claims": "{…\"role\":\"authenticated\",…,\"sub\":\"59a23d07-…\",…}", "definer": {"claims": "{…}", "current_user": "juntia_writer", "claim_sub_legacy": null, "current_uid_helper": "59a23d07-…"}, "claim_sub_legacy": null, "invoker_auth_uid": "59a23d07-…", "invoker_current_user": "authenticated", "invoker_role_setting": "authenticated"}
== 2.0 auth.uid() definition in this stack
   coalesce(
     nullif(current_setting('request.jwt.claim.sub', true), ''),
     (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
   )::uuid
== 2.1 set local request.jwt.claim.sub (legacy, single claim)   → uid_via_claim_sub = 59a23d07-…
== 2.2 set local "request.jwt.claims" = json                     → uid_via_claims_json = 59a23d07-…
== 2.3 set_config(request.jwt.claims, json, true)                → uid_via_set_config = 59a23d07-…
```

**Resultado:** PostgREST v16.4 deja el JSON completo en `request.jwt.claims`;
`request.jwt.claim.sub` es `null`. `auth.uid()` acepta las dos formas, así que un
test con la forma antigua **pasaría igual** sin probar lo que hace PostgREST.
**Decisión:** pgTAP fija la identidad solo con `set local "request.jwt.claims" =
'{"sub":"…","role":"authenticated"}'` y `set local role authenticated`. Los JWT
son **ES256** con `kid` (asimétricos): `getClaims()` los valida con la clave
pública (ADR-013 §6.5).

---

## R3 · `[V]` Versiones exactas (ADR-013 [V] 10)

Preferidas con al menos dos semanas de antigüedad. Se fijan sin `^` ni `~` en
`package.json` (las de npm) y en el workflow (la CLI).

| Pieza | Versión | Publicada | Dónde |
| --- | --- | --- | --- |
| Supabase CLI | **2.121.0** | 2026-10-14 | `supabase/setup-cli@v3` con `version: 2.121.0` en CI; `npx --yes supabase@2.121.0` en los equipos (solo `link` y `db push` a `juntia-dev`, que no necesitan Docker) |
| `@supabase/supabase-js` | **2.118.0** | 2026-10-15 | `dependencies` |
| `@supabase/ssr` | **0.12.7** | — | `dependencies` |
| Postgres del stack local | 17.11 (`supabase/postgres:17.11.0.004`) | — | La trae la CLI |
| PostgREST | v16.4 | — | Ídem |
| GoTrue | v2.197.0 | — | Ídem |
| Kong · Mailpit | 2.8.1 · v1.31.3 | — | Ídem |
| Cliente `pg_dump`/`psql` | 17.11 (PGDG) | — | CI de restauración; equipos de los fundadores |

```
2.121.0
A new version of Supabase CLI is available: v3.0.0 (currently installed v2.121.0)
=== 6. container images
public.ecr.aws/supabase/gotrue:v2.197.0
public.ecr.aws/supabase/kong:2.8.1
public.ecr.aws/supabase/mailpit:v1.31.3
public.ecr.aws/supabase/postgres:17.11.0.004
public.ecr.aws/supabase/postgrest:v16.4
=== 6. server version
PostgreSQL 17.11 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit
```

Dos notas. **La CLI v3 ya existe** y cambia el destino por defecto de `db push`
(ADR-011 §9.5): se queda la v2 fijada y subir de major es un PR propio que
revisa la sintaxis del quickstart. **El preflight usó `supabase/setup-cli@v1`**;
ADR-011 dice v3 y el log de GitHub avisa de que v1 corre sobre Node 20 retirado.
El job 3 usa `@v3`. La [V] 10 queda cerrada para el lockfile cuando el PR A lo
genere con estas versiones; si `npm ci` muestra un peer incompatible, se dice en
el PR y no se cambia la versión en silencio.

---

## R4 · `[V]` Lista permitida del registro (Q9; FR-024)

**Mecanismo:** el hook de Auth **Before User Created**, apuntado a una función de
Postgres (`pg-functions://postgres/juntia_private/before_user_created_hook`). La
función es `security invoker` (corre como `supabase_auth_admin`), mira
`juntia_data.signup_allowlist` y devuelve `{}` o un error 403. Necesita `usage`
en los dos esquemas, `execute` sobre la función y `select` con una política
propia sobre la tabla para `supabase_auth_admin`. Está disponible en el plan Free
([Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks)).

```
-- signup NOT allowed: mallory@spike.test
HTTP 403 {"code":403,"error_code":"unknown","msg":"No fue posible completar el registro."}
-- signup NOT allowed, uppercase variant: Mallory@Spike.Test
HTTP 403 {"code":403,"error_code":"unknown","msg":"No fue posible completar el registro."}
(run 2: enable_confirmations = true, as on hosted by default)
-- signup allowed: carol@spike.test
HTTP 200 {"id":"a453d55f-…","aud":"authenticated",…,"confirmation_sent_at":"2026-11-05T00:08:31…",…}
-- signup allowed but ALREADY REGISTERED (confirmed): alice@spike.test
HTTP 422 {"code":422,"error_code":"user_already_exists","msg":"User already registered"}
-- signup allowed, ALREADY REGISTERED but unconfirmed: carol@spike.test again
HTTP 429 {"code":429,"error_code":"over_email_send_rate_limit","msg":"For security purposes, you can only request this after 0 seconds."}
-- recover for NOT allowed / unknown email: mallory   → HTTP 200 {}
-- recover for existing: alice                        → HTTP 200 {}
-- admin API create NOT allowed: dave@spike.test (does the hook apply to admin too?)
{"id":"0c4ec466-…","email":"dave@spike.test","email_confirmed_at":"2026-11-05T00:08:31…",…} HTTP 200
-- OTP/magic link NOT allowed: POST /auth/v1/otp mallory (create_user default true)
HTTP 403 {"code":403,"error_code":"unknown","msg":"No fue posible completar el registro."}
-- auth.users rows: alice, bob, carol, dave   (4 rows)
3 auth logs (hook)
{"action":"run_hook",…,"error":"403: No fue posible completar el registro.","hook":"pg-functions://postgres/juntia_private/before_user_created_hook",…,"path":"/signup",…}
{"action":"run_hook",…,"error":null,…,"msg":"Hook ran successfully","path":"/signup",…}
```

**Resultado:** la lista la valida la base de datos **antes** de crear el usuario,
también por `/otp`, y no queda ninguna fila. La API de administración (clave de
servicio) no pasa por el hook; ningún camino que atiende a una persona la usa
(FR-011) y solo la usan la siembra de pruebas y las operaciones documentadas.

**Enumeración.** La API de Auth llamada directamente revela la pertenencia a la
lista (403) y si un correo ya tiene cuenta (422). **Decisión del primer
fundador, 4 de noviembre de 2026: riesgo aceptado hasta MVP-1** (decisión 16.16
del maestro, en esta rama). FR-023 se enmienda en el mismo PR: **las pantallas
de Juntia siguen sin enumerar**. La capa de servidor traduce 200, 403, 422 y 429
del registro al mismo resultado de interfaz (A3) y a la misma copy
([contracts/errors.md](contracts/errors.md)).

**Correos de la lista.** **Decisión del plan:** los dos correos reales no van en
una migración (no entran a git). Se insertan con el SQL documentado del
quickstart en cada proyecto; los de prueba van en `supabase/seed.sql`, que solo
corre en local y en CI. La tabla guarda el correo en minúsculas (`check`) y el
hook compara en minúsculas.

---

## R5 · `[V]` Correo de Supabase (Q10) — evidencia documental

**Tipo de evidencia: documental**, de la documentación oficial de Supabase
consultada el 4 de noviembre de 2026. **No es un run**: ningún correo se envió a
un proyecto alojado. El único dato ejecutado es el valor del stack local, que
refleja el límite pero no lo prueba en un proyecto Free. La comprobación real
(los dos correos en el equipo de la organización y un correo de verificación
recibido de verdad) es un **requisito operativo antes de probar el PR B** (punto
1 de abajo; quickstart §3, paso 6).

- **Límite:** el correo integrado envía **2 correos por hora en todo el
  proyecto** ([Rate limits](https://supabase.com/docs/guides/auth/rate-limits)).
  El stack local lo refleja (`[auth.rate_limit] email_sent = 2`).
- **Destinatarios:** el servidor integrado **solo entrega a miembros del equipo
  del proyecto** ([Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)).

**Consecuencias para el plan:**

1. **Requisito operativo antes de probar el PR B en `juntia-dev` o producción:**
   los correos de los dos fundadores son miembros de la organización de
   Supabase de la segunda fundadora, **y cada fundador recibe de verdad un correo
   de verificación** de ese proyecto. Si no, la verificación y la recuperación no
   llegan. Lo hace la dueña; el PR B registra las dos cosas en su evidencia.
2. **Ninguna prueba automatizada usa el correo real.** Las E2E leen el enlace en
   Mailpit, dentro del runner.
3. **Pruebas manuales:** con 2 correos por hora, cada registro, reenvío o
   recuperación cuenta. El quickstart lo avisa.
4. El servidor de correo propio sigue siendo un pendiente antes de MVP-1
   (decisión 16.10).

---

## R6 · `[V]` Copia y restauración (Q11; decisión 17)

```
=== 4.0 client + server versions
pg_dump (PostgreSQL) 17.11 (Ubuntu 17.11-1.pgdg24.04+2)
17.11
=== 4.0 counts BEFORE
movements=5 sum=9007199259253994 allowlist=3 auth.users=4 auth.identities=4
=== 4.1 FULL logical dump of the postgres database, custom format, as role postgres
$ pg_dump "postgresql://postgres:***@127.0.0.1:54322/postgres" -Fc -f full.dump
exit=0
objects in TOC: 714
=== 4.2 encrypt (gpg symmetric AES256) with a throwaway passphrase file
:symkey enc packet: version 4, cipher 9, aead 0, s2k 3, hash 10
gpg: AES256.CFB encrypted data
--- wrong passphrase must fail:
gpg: decryption failed: Bad session key
=== 4.3 restore A: full dump into a FRESH database on the same cluster
exit=1
errors: 167
     41 error: could not execute query: ERROR:  must be able to SET ROLE "supabase_auth_admin"
     31 error: could not execute query: ERROR:  must be able to SET ROLE "supabase_storage_admin"
     …
      7 error: could not execute query: ERROR:  permission denied for schema juntia_private
pg_restore: warning: errors ignored on restore: 167
--- counts in restore_full:
movements=5 sum=9007199259253994 allowlist=3 auth.users=4 auth.identities=4
=== 4.4 restore B: data-only dump (app schema + auth users/identities) -> supabase db reset -> load
$ pg_dump "$DB" --data-only --inserts --on-conflict-do-nothing -t juntia_data.* -t auth.users -t auth.identities -f data.sql
exit=0
--- counts after reset (should be empty except allowlist seed):
movements=0 sum=0 allowlist=3 auth.users=0 auth.identities=0
$ psql "$DB" -v ON_ERROR_STOP=1 -1 -f data.dec.sql
exit=0
--- counts after restore B:
movements=5 sum=9007199259253994 allowlist=3 auth.users=4 auth.identities=4
--- can a restored user still sign in?
signin alice after restore: HTTP 200
```

Run 3 corrigió el 2: con `-t` presente, `-n` se ignora, así que el esquema de
la app va como `-t 'juntia_data.*'`.

**Decisión del plan — qué es una «copia completa»** (ADR-011 §9.6 lo deja al
plan; rehecha en la revisión del PR #37, F37-1). La primera versión metía un
`schema.sql` hecho con `pg_dump --schema-only -n juntia_data -n juntia_private
… -t …`; como `-n` se ignora cuando hay `-t`, **ese archivo no contenía los
esquemas de Juntia**. Se descarta el volcado de esquema. La fuente del esquema es
la misma que en todo lo demás (FR-001): **las migraciones del repositorio**.

Una copia completa son tres cosas:

1. **El esquema, por referencia:** las migraciones de `supabase/migrations/` en
   un commit concreto, según el **modo** (segunda revisión del PR #37, R2-2). Los
   dos modos comparten el mismo código de comprobación:
   - **modo CI** (`--mode ci --sha <sha>`): el **SHA exacto del commit que se
     verifica** (`$GITHUB_SHA`), sin etiqueta. El ensayo prueba así el esquema del
     commit en revisión, no uno histórico;
   - **modo producción** (`--mode production --tag <db-prod-…>`): cada vez que la
     dueña aplica migraciones a producción, etiqueta ese commit de `main`
     (`db-prod-AAAA-MM-DD`). La copia exige la etiqueta y comprueba que la lista
     de `supabase_migrations.schema_migrations` de producción es **exactamente**
     la de ese commit; si no lo es, no hay copia válida y el script falla.
2. **Los datos:** `pg_dump --data-only --column-inserts --on-conflict-do-nothing
   -t 'juntia_data.*' -t auth.users -t auth.identities -f data.sql`. Es el
   comando probado en el run 3 con `--column-inserts` en lugar de `--inserts`:
   con los nombres de columna, una columna que falte en el destino falla con un
   error en vez de desplazar valores en silencio.
3. **El manifiesto:** modo, SHA del commit (y la etiqueta en producción), lista de migraciones aplicadas,
   recuento de filas y suma de comprobación por tabla
   (`md5(string_agg(t::text, '|' order by <clave>))`) y `sha256` de `data.sql`.

Se empaqueta (`data.sql` + `manifest.txt`), se cifra con `gpg --symmetric
--cipher-algo AES256` y se guarda fuera de Supabase y del repositorio. La copia
con `-Fc` sigue descartada: restaura los datos con 167 errores de roles
ignorados, y una restauración que necesita ignorar errores no prueba nada.

**Restauración, siempre desde una base vacía y por dos caminos:**

- **A · Supabase local (CI):** `supabase start` vacío, el SHA del
  manifiesto, `supabase db reset` con las migraciones de ese commit y sin la
  semilla, y después `psql -v ON_ERROR_STOP=1 -1 -f data.sql`. Recuentos, sumas
  de comprobación y `sha256` contra el manifiesto, y un usuario restaurado entra.
  Es lo que demostró el run 3, ahora con la versión exacta del esquema.
- **B · PostgreSQL 17 normal:** una base vacía, sin roles ni esquemas de
  Supabase. Un **arranque** versionado
  (`supabase/restore/plain-postgres-bootstrap.sql`) crea los roles que nombran
  las migraciones (`anon`, `authenticated`, `service_role`, `supabase_auth_admin`;
  `juntia_writer` lo crea la propia migración) y los objetos mínimos de `auth`
  que necesitan las migraciones y los datos: el esquema, `auth.uid()` con la
  misma definición que el stack (research R2) y las tablas `auth.users` y
  `auth.identities` con las columnas que vuelca el `pg_dump`. Después, las
  migraciones del SHA en orden con `ON_ERROR_STOP`, y por último `data.sql`. Un
  paso del ensayo compara las columnas del arranque con las del stack local de
  esa versión de la CLI y **falla** si GoTrue cambió las suyas.

**Fallar pronto** (segunda revisión del PR #37, R2-1). La copia, el ensayo y la
restauración real son scripts de Git Bash con `set -euo pipefail`: el primer
fallo detiene todo y su código de salida es el del script. Sin `|| break` ni
pasos opcionales: la comprobación del manifiesto (`--verify`) es obligatoria y
bloqueante. El esquema de otro commit se toma con `git worktree add` en una
carpeta temporal, no con `git checkout`, y un `trap` de salida borra los
archivos descifrados y esa carpeta **conservando el código de salida original**
(quickstart §4).

**Salidas y base temporal** (tercera revisión del PR #37, R3-1 y R3-2). La copia
escribe el manifiesto y el `.gpg` dentro de su carpeta temporal y solo los publica
con su nombre final después de pasar todas las comprobaciones, con un enlace duro
(atómico y que falla si el nombre existe). El nombre lleva fecha y hora al
segundo y, si aun así existe, el script falla: **nunca sobrescribe** una copia.
La restauración real crea **su propia** base temporal con nombre único
(`juntia_restore_<fecha-hora>_<pid>`), apunta que la creó, escribe la evidencia
(recuentos, sumas, SHA y código de salida, sin datos reales) en un log local y
la borra en el `trap` **tanto con éxito como con fallo**. Si el nombre ya existe,
falla sin tocarla: nunca borra una base que no creó.

**Controles negativos** (PR A): el ensayo del job `db` se repite con fallos
inyectados —una migración rota, un recuento alterado en el manifiesto, otro SHA
en el manifiesto y un `data.sql` modificado— y cada repetición **debe**
terminar con código distinto de 0 y sin la marca de éxito. Además: una
restauración que falla a mitad no deja **ninguna base `juntia_restore*`** y sí su
log con `exit=` distinto de 0; una copia que falla no deja **ningún archivo de
salida** ni carpeta temporal; y una copia contra un nombre que ya existe falla
y deja el archivo existente intacto; un `dropdb` que falla tras una
restauración correcta hace salir al script con código distinto de 0 y deja en
el log qué base borrar a mano; y una comprobación de descifrado que no coincide
impide publicar la copia. La comprobación del cifrado descifra de verdad y
compara con el original: `gpg --list-packets --batch` no sirve, porque falla sin
la contraseña disponible aunque el archivo sea válido. Si una de ellas
«pasa», el job falla. Así se demuestra que el ensayo puede fallar, no solo que
pasa.

**Qué está probado hoy:** solo el camino A con el esquema de la migración
desechable (run 3). **El camino B no se ha ejecutado.** El PR A ensaya **los dos
caminos desde una base vacía** en el job `db`, con datos de prueba, y el ensayo
falla ante cualquier dependencia que falte (`ON_ERROR_STOP`, `--column-inserts`,
comparación de columnas del arranque). **La copia no se presenta como
restaurable hasta que los dos caminos tienen salida en la evidencia**, y la copia
real se restaura en el equipo de un fundador solo por el camino B ya ensayado.

En los equipos con Windows hacen falta las herramientas de línea de comandos de
PostgreSQL 17 (y el servidor, para la restauración real) y Gpg4win.

---

## R7 · `[V]` Persistencia del tema: cookie leída por el script bloqueante (Q7)

**Fuente.** `COMPONENT_SPECIFICATIONS.md` §ThemeSelector («Persistencia [P][V]:
`profiles` + cookie leída por el script bloqueante»); spec, Q7 y US-7.4; SC-005.
ADR-012 exige su salida antes de cerrar el plan. **Se pudo ejecutar en local sin
Docker:** la parte que decide cómo se construye (que el script lea la cookie
antes del primer pintado) no necesita base de datos.

### Decisión

1. **Cookie `juntia_theme`**, valores `light | dark | system`; `Path=/`,
   `SameSite=Lax`, `Secure` en producción, un año, **sin `HttpOnly`**: el script
   la tiene que leer con `document.cookie`. No es un dato sensible. El nombre
   lleva `_` y no `:` porque `:` no vale en el nombre de una cookie.
2. **El script de `src/lib/theme-script.ts` la lee primero**; con `light` o
   `dark` pone ese `data-theme` y **deja de seguir** a `prefers-color-scheme`; con
   `system`, sin cookie o con un valor no válido, sigue al sistema como en la 001.
   El servidor **no** pone `data-theme`: las páginas siguen sin depender de la
   cookie para renderizar, y `check:theme-script` sigue valiendo.
3. **Quién escribe la cookie** (se construye en el PR B; comprueba lo
   construido): el ThemeSelector, al elegir, pone `data-theme`, escribe la cookie
   y llama a `set_theme` para el perfil; la acción de entrar y `/auth/confirm`
   copian `profiles.theme` a la cookie de la respuesta, así que un dispositivo
   nuevo pinta bien desde la primera página de producto. Ver R8.6 para el caso
   de dos dispositivos.

### Cómo se midió (corregido en la revisión del PR #37, F37-4)

El arnés de la research R2 de la 001 (screencast con `Page.startScreencast`, CPU
6× y red de 400 kbit/s y 400 ms; atributo en el instante en que se crea
`<body>`), más CLS con `PerformanceObserver`. La cookie se pone con
`context.addCookies` y el sistema se emula **al contrario**: si el script no la
leyera, algún cuadro sería del tema del sistema.

**Lo que cambió tras la revisión.** La primera versión solo miraba el primer
cuadro con marca «≥ first-paint − 1 ms», y su control negativo no mostraba el
destello: terminaba antes de que el efecto aplicara el tema. Al rehacerlo con la
línea de tiempo completa apareció la causa: **el reloj del screencast y el de
`performance` difieren unos milisegundos**, y el primer cuadro pintado puede
llevar una marca anterior a `first-paint` (en `/ system=dark cookie=light`,
`-4 ms`). Ese filtro podía saltarse justo el cuadro que importa. Desde ahora:

- se decodifican **todos** los cuadros y se publica su línea de tiempo relativa
  a `first-paint`;
- la superficie del navegador antes del documento (blanca, o `#121212` con el
  sistema en oscuro) se separa por tiempo y se exige que **no** aparezca después
  de `first-paint`;
- se exige que el primer cuadro con contenido sea del tema esperado y que
  **ningún** cuadro tenga el color del tema contrario (sidebar o lienzo).

A 1280 px el píxel inferior izquierdo es el sidebar del shell: `#EEE7DA` =
`[238,231,218]` en claro y `#0F1112` = `[15,17,18]` en oscuro. El control
`/control` no tiene shell: su píxel es el lienzo, `[247,243,235]` y `[18,20,22]`.

**Reproducible.** El arnés, la página de control, el script modificado y la
configuración están en
[`evidence-plan/`](evidence-plan/) como `.txt`, igual que la evidencia de la 001;
la salida completa, en `evidence-plan/theme-v-run-output.txt`.

### Salida (`next build` + `next start`, Next 16.4.4)

```
$ npx playwright test -c playwright.theme.config.ts --reporter=line
/ system=light cookie=dark: {"themeAtBody":"dark","finalTheme":"dark","firstContentFrame":"[15,17,18]","contentFrames":3,"framePixels":["[15,17,18]"],"timeline":["[255,255,255]@-2516ms","[15,17,18]@+0ms","[15,17,18]@+67ms","[15,17,18]@+850ms"],"blanksAfterPaint":0,"cls":0,"consoleProblems":[]}
/ system=dark cookie=light: {"themeAtBody":"light","finalTheme":"light","firstContentFrame":"[238,231,218]","contentFrames":3,"framePixels":["[238,231,218]"],"timeline":["[18,18,18]@-2540ms","[238,231,218]@-4ms","[238,231,218]@+63ms","[238,231,218]@+846ms"],"blanksAfterPaint":0,"cls":0,"consoleProblems":[]}
/ system=dark cookie=system: … "framePixels":["[15,17,18]"],"timeline":["[18,18,18]@-2423ms","[15,17,18]@+1ms",…],"blanksAfterPaint":0,"cls":0,"consoleProblems":[]}
/ system=light cookie=bogus: … "framePixels":["[238,231,218]"],"timeline":["[255,255,255]@-2466ms","[238,231,218]@+4ms",…],"blanksAfterPaint":0,"cls":0,"consoleProblems":[]}
/ system=dark cookie=-: … "framePixels":["[15,17,18]"],"timeline":["[255,255,255]@-2399ms","[18,18,18]@-2361ms","[15,17,18]@+6ms",…],"blanksAfterPaint":0,"cls":0,"consoleProblems":[]}
/actividad system=light cookie=dark: … "framePixels":["[15,17,18]"],"timeline":["[255,255,255]@-2458ms","[15,17,18]@+3ms",…],"blanksAfterPaint":0,"cls":0,"consoleProblems":[]}
/actividad system=dark cookie=light: … "framePixels":["[238,231,218]"],"timeline":["[18,18,18]@-2318ms","[238,231,218]@+4ms",…],"blanksAfterPaint":0,"cls":0,"consoleProblems":[]}
/actividad (system, bogus, sin cookie): framePixels solo del tema esperado, blanksAfterPaint 0, cls 0, consoleProblems []
/cuenta system=light cookie=dark: … "framePixels":["[15,17,18]"],"timeline":["[255,255,255]@-2482ms","[15,17,18]@+4ms",…],"blanksAfterPaint":0,"cls":0,"consoleProblems":[]}
/cuenta system=dark cookie=light: … "framePixels":["[238,231,218]"],"timeline":["[18,18,18]@-2486ms","[238,231,218]@+7ms",…],"blanksAfterPaint":0,"cls":0,"consoleProblems":[]}
/cuenta (system, bogus, sin cookie): framePixels solo del tema esperado, blanksAfterPaint 0, cls 0, consoleProblems []
system flip with cookie=dark: data-theme stays dark
served <html>: <html lang="es-CO" class="R_a3Gq_variable ZJly0G_variable _ttCGa_variable _9N-dia_variable">
  18 passed (1.9m)

$ npx playwright test -c playwright.theme.config.ts --reporter=line tests/theme/theme-control.theme.ts
t0 = first-paint (performance) · 1793842648546 epoch ms
data-theme -> light at -150 ms
data-theme -> dark at +5192 ms
frame at -2061 ms pixel=[255,255,255]
frame at +6 ms pixel=[247,243,235]
frame at +223 ms pixel=[247,243,235]
frame at +1173 ms pixel=[247,243,235]
frame at +5222 ms pixel=[18,20,22]
first content frame: +6 ms [247,243,235] · first dark frame after apply: +5222 ms [18,20,22]
  1 passed (8.7s)

$ BASE_URL=http://localhost:3201 npx playwright test … -g "cookie (dark|light)$"   (next dev, arnés anterior: hidratación)
/ · /actividad · /cuenta, cookie dark y light: "cls":0,"consoleProblems":[]
  6 passed (2.4m)
```

Las líneas resumidas con «…» están completas en
`evidence-plan/theme-v-run-output.txt`.

Lectura:

- **Recuento:** 18 tests aprobados, incluidos 15 escenarios parametrizados de
  tema; el control negativo se repitió y pasó por separado.
- **Control negativo, validado.** El script bloqueante pone `light` 150 ms antes
  del primer pintado; el primer cuadro con contenido (+6 ms) es **claro**, siguen
  claros a +223 y +1173 ms, el efecto aplica `dark` a +5192 ms y el siguiente
  cuadro (+5222 ms) es **oscuro**. El detector ve las dos fases cuando existe un
  destello.
- **Con la cookie contraria al sistema**, el atributo ya está antes de `<body>`,
  **todos** los cuadros con contenido son del tema guardado, la superficie del
  navegador solo aparece antes del primer pintado y CLS = 0, en las tres rutas.
- `system`, un valor no válido y la ausencia de cookie siguen al sistema; un
  cambio del sistema con la app abierta no pisa el tema guardado; el HTML servido
  no lleva `data-theme` aunque llegue la cookie.
- La comprobación de hidratación en `next dev` es de la primera corrida (mismo
  script, arnés anterior): cero errores y avisos.

**Resultado del `[V]`: verificado** en Next 16.4.4 y React 19.3.1, para la lectura
de la cookie, con un detector validado por su control. **No cubre** (comprueba lo
construido, en el PR B): la escritura de la cookie desde el perfil al entrar, el
caso de dos dispositivos con la spec E2E 1 y dos contextos, y CLS = 0 con el
arnés en las rutas de acceso y Mi cuenta reales (SC-005). El PR B usa este arnés
(el de `evidence-plan/`), no el de la research de la 001.

---

## R8 · Decisiones del plan

Locales y reversibles (ADR-012 §2, primera fila). Las que el revisor puede
querer distintas están además en «Puntos para el revisor» del plan.

### R8.1 Una tabla `transactions` con `type`, XOR preparado y sin grupos

**Fuente:** maestro §7.3 («Scope privado XOR grupo»; «si se utiliza una única
tabla con columnas opcionales, CHECK constraints fuerzan combinaciones
legales… Documentar la decisión antes de migrar»); spec, supuesto «Una persona,
un perfil, un espacio privado».

**Decisión:** una sola tabla con `type in ('expense','income')`,
`owner_user_id` y `group_id` con `check` XOR, y otro `check` propio de P0-1 que
exige `group_id is null`. P0-2 quita ese `check`, añade la FK a `groups` y decide
si las liquidaciones van aquí o en tabla propia (ADR-013, «Qué no decide»). **No
hay columna `scope`**: el alcance se deriva de qué columna está puesta, así que
no hace falta aprobar los literales propuestos de `docs/GLOSSARY.md` §10. **Sí
se usa el literal `voided`** propuesto por el glosario para el estado anulado
(ver «Puntos para el revisor»).

**Alternativa descartada:** tablas separadas para gastos e ingresos. Duplica
políticas, funciones y vistas para dos tipos que comparten todo en P0-1.

### R8.2 Categorías: tabla canónica con FK compuesta

**Fuente:** maestro §7.3 (`categories`, catálogo canónico); FR-014; los diez
identificadores que ya usa `CategoryIcon` en la 001 (`market`, `restaurants`,
`home`, `transport`, `health`, `entertainment`, `shopping`, `services`, `income`,
`other`).

**Decisión:** `juntia_data.categories (id, kind)` sembrada por la migración, con
`unique (id, kind)`, y en `transactions` una FK compuesta `(category_id, type)
→ categories (id, kind)`. Así «Ingresos solo para ingresos» lo garantiza la base
por cualquier camino, sin trigger. Los nombres visibles viven en `es.ts`
(`copy.categories.*`), con la misma clave. El catálogo existe dos veces (TS y
migración), así que las dos pruebas afirman la **misma lista literal**: pgTAP la
de la tabla y Vitest la del dominio.

### R8.3 Topes de importe: positivo en la tabla, el resto en la función

**Fuente:** FR-007 (importes positivos por cualquier camino); edge cases «Monto
0, negativo o con decimales» y «Monto máximo»; ADR-013 §4 y [V] 6.

**Decisión:** la tabla exige `amount_minor > 0`. La función exige además pesos
enteros (`amount_minor % 100 = 0`) y el máximo de AmountInput (999.999.999
pesos = `99999999900`). Así la prueba de ida y vuelta de `9007199254740993` por
la **vista** se puede sembrar (como `postgres`, en pgTAP) sin violar la tabla,
y la regla de negocio sigue en la función y en el dominio. Ningún límite se
relaja.

**Cómo se prueba la precisión ([V] 6), según la nota del 4 de noviembre de 2026
en ADR-013** (decisión de los fundadores en la revisión del PR #37, F37-5):

- **(a) En el parser** `juntia_private.parse_amount_minor(text)`, el único que
  usan todas las funciones que escriben para pasar de texto a `bigint`, llamado
  directamente en pgTAP con `9007199254740993` y los límites de `bigint`
  (`9223372036854775807` acepta; `9223372036854775808`, signo, decimales, letras
  y vacío fallan con `JT002`).
- **(b) En la lectura por vista** de una fila con `9007199254740993` sembrada
  como `postgres`, que vuelve como texto idéntico por SQL y por supabase-js.
- **Aparte**, el tope de negocio de Anotar (999.999.999 pesos) se prueba en la
  función pública `create_transaction`: acepta `99999999900` y rechaza
  `100000000000` con `JT003`. Las funciones que escriben nunca aceptan
  `9007199254740993`, y eso es correcto.

### R8.4 Concurrencia, por función (ADR-013 §3)

| Función | Idempotencia | Raíz que se bloquea | Invariante | Reintento |
| --- | --- | --- | --- | --- |
| `create_transaction` | Inserta `(actor, 'create_transaction', clave)`; si choca, espera al primero y compara huellas | Ninguna: crear no valida un agregado | La tabla y la FK | Servidor, hasta 3 intentos ante `40P01`/`40001`, misma clave |
| `update_transaction` | Igual, acción `update_transaction` | La fila del movimiento (`for update`) | `version` esperada; no anulado; tipo inmutable | Ídem |
| `void_transaction` | Igual, acción `void_transaction` | La fila del movimiento | `version` esperada; no anulado | Ídem |

Nivel `READ COMMITTED` (el de PostgREST). La huella es `sha256` del `jsonb`
normalizado de los argumentos, salvo la clave. «Deshacer» es
`void_transaction` con motivo `undo` y su propia clave; «Eliminar», el mismo con
motivo `delete`. El registro de idempotencia guarda el resultado y la misma
clave devuelve ese resultado **sin escribir auditoría otra vez**.

### R8.5 Perfil: se crea al primer acceso, no con un trigger en `auth.users`

**Fuente:** FR-029, enmendado tras la revisión del PR #37 por decisión del primer
fundador (Q16; maestro 16.17): «el perfil se crea en el primer acceso verificado,
con el nombre visible de A2». ADR-013 §2.5; R1 (el esquema `auth` no es de
`postgres`). `ensure_profile()` solo corre con una sesión, y Auth solo da sesión
a una cuenta verificada.

**Decisión:** el nombre visible viaja en `user_metadata.display_name` al
registrarse. La primera petición autenticada (la acción de entrar o
`/auth/confirm`) llama a `ensure_profile()`, idempotente, que crea la fila con
ese nombre. **Alternativa descartada:** un trigger sobre `auth.users`. Supabase
lo documenta, pero añade un objeto nuestro en un esquema que no es nuestro, corre
dentro de la petición de registro de GoTrue y fallaría allí con un error
opaco. `user_metadata` es editable por la persona, pero solo da el valor
**inicial** de un nombre visible y no autoriza nada (maestro §7.4).

### R8.6 Tema en dos dispositivos

Gana el último elegido (edge case). La cookie la reescriben el selector, la
acción de entrar y `/auth/confirm`. Si en otro dispositivo cambió el perfil, el
layout de `(app)`, que ya lee el perfil para AccountButton, compara
`profiles.theme` con la cookie y, si difieren, reescribe la cookie y aplica el
tema con la transición de 180 ms. Ese primer cargue pinta todavía el tema de la
cookie; los siguientes ya salen bien desde el primer cuadro. **Alternativa
descartada:** leer el perfil en `proxy.ts` en cada petición para fijar la
cookie antes del HTML: una consulta más por petición en Free para un caso raro.
Ver «Puntos para el revisor».

### R8.7 Rutas, sesión y caché

- **Rutas de acceso** (español, por el precedente de la 001, research R6):
  `/entrar`, `/crear-cuenta`, `/verificar-correo`, `/recuperar`,
  `/nueva-contrasena` y `/primera-entrada`, en el grupo `(auth)` sin shell.
  `/auth/confirm` es técnica (un route handler con `verifyOtp({ token_hash,
  type })`) y termina en `/entrar` con el aviso de verificado, o en
  `/nueva-contrasena` para la recuperación.
- **`src/proxy.ts`** renueva la sesión con `@supabase/ssr`, valida con
  `getClaims()` y redirige las rutas de producto y de Mi cuenta a
  `/entrar?volver=<ruta>`. `volver` solo acepta un **destino interno**
  (corregido en la revisión del PR #38, F38-1: la expresión `/^\/(?!\/)/` dejaba
  pasar `/\evil.example`, que `new URL()` resuelve a `https://evil.example/`):
  empieza por una sola `/` seguida de algo que no es `/` ni `\`; no contiene
  ninguna barra invertida, ni caracteres de control ni espacios; se decodifica
  una vez y se vuelven a aplicar las mismas reglas (así se rechazan `%2F%2F`,
  `%5C`, `%09` y similares); y por último `new URL(value, base).origin ===
  base.origin`, quedándose solo con `pathname + search + hash`. Cualquier otro
  valor, incluido el vacío, cae a `/`.
- **Caché:** las respuestas autenticadas llevan `Cache-Control: private,
  no-store`; nada autenticado es estático. Las rutas de producto dejan de
  prerenderizarse; las de acceso pueden seguir estáticas.
- **Mes de Actividad** en la URL: `/actividad?mes=AAAA-MM` (spec US-6.2 lo deja al
  plan). Al recargar se conserva y se puede compartir entre pestañas. La flecha
  anterior llega hasta el primer mes con movimientos (o el actual); la siguiente,
  hasta el más lejano con movimientos o el actual (Q13).
- **Detalle:** `/actividad/[id]`, con `actividad/layout.tsx` que en ≥ 1024 deja la
  tabla a la izquierda y el detalle en el panel (04·7) y en móvil muestra solo el
  detalle. Editar abre la hoja de Anotar en modo edición; no tiene ruta propia.

### R8.8 Categorías recientes sin historial

Spec, supuestos: «Qué se muestra sin historial lo decide el plan». **Decisión:**
las cinco categorías de gasto más recientes de la persona (por último uso en un
movimiento activo); si hay menos de cinco, se completan con el orden del
catálogo (`DESIGN_SYSTEM.md` §1.3: Mercado, Restaurantes, Hogar, Transporte,
Salud…), sin repetir. En modo Ingreso solo existe «Ingresos» y queda elegida.

### R8.9 Cálculos de mes en el dominio, filas desde vistas

FR-019 y SC-008. Las vistas devuelven filas activas del mes; **los totales y el
desglose los calcula `src/domain/transactions/`**, función pura con `bigint`,
probada con el dataset dorado. Una sola implementación de la regla «el gasto del
mes no incluye ingresos». El mes de cada fila es el de `transaction_date` (una
fecha, sin hora); «hoy» se calcula con `Intl` en `America/Bogota`, no en la zona
del dispositivo. Búsqueda y filtros de Actividad, en cliente sobre las filas del
mes (pocas por mes; INP), sin distinguir tildes ni mayúsculas.

### R8.10 Exportación

Route handler `GET /api/export?format=json|csv` con el cliente de servidor de la
petición sobre la vista de movimientos activos. Campos: fecha, tipo, categoría
(clave y nombre), descripción, `amount_minor` como texto, moneda, creado y
actualizado. **Sin identificadores** (ni el propio, ni versiones). CSV RFC 4180,
UTF-8 con BOM para Excel, y las celdas que empiezan por `= + - @` llevan un `'`
delante (inyección de fórmulas). `Content-Disposition: attachment`, nombre
`juntia-movimientos-AAAA-MM-DD.{json,csv}`, `Cache-Control: no-store`. D3–D5 los
pinta el cliente alrededor de un `fetch` (D5 si la respuesta no es 200).

### R8.11 Siembra y sesiones de prueba

Regla dura 1 y 2 de ADR-011. `tests/support/seed.ts` crea por worker y por rol
(Sara; Tomás para los tests de aislamiento) un usuario confirmado con la API de
administración del Supabase **local del runner** y entra con contraseña usando
`createServerClient` sobre un almacén de cookies en memoria: así el formato de la
cookie lo escribe la propia librería y no un test. El resultado se guarda como
`storageState` en `playwright/.auth/<parallelIndex>-<rol>.json`. Los movimientos
del dataset se siembran **por la función real** (`create_transaction`) con la
sesión sembrada, no por SQL directo: la siembra pasa por la autorización. Los
correos sembrados son `*@seed.test`, en la lista de `seed.sql`.

### R8.12 Dependencias que P0-1 no instala

- **Sin React Hook Form ni Zod** (el maestro §7.1 los propone para formularios):
  los formularios de P0-1 son pocos y pequeños; la validación vive en el dominio
  (TS puro, probado) y se repite en la función SQL. Entran cuando un slice tenga
  formularios que lo justifiquen (`AGENTS.md` 13 y 19).
- **Sin TanStack Query:** lecturas en Server Components y escrituras por Server
  Actions con `revalidatePath`; el estado optimista de E5 es local a la hoja.
- **Sin `supabase` como dependencia de npm:** la CLI se fija en el workflow y se
  invoca con `npx --yes supabase@2.121.0` donde haga falta en un equipo.

### R8.13 CI: coste de levantar Supabase

`supabase start` tardó **96 a 118 s** en los tres runs, con reintentos por
`toomanyrequests` del registro de imágenes de ECR. Con `npm ci`, build y
Chromium, el job E2E superará casi seguro los 3 min de ADR-011 §4. Hasta el hito
de bloqueo (cierre de P0-2) solo avisa; la cláusula anticliquet impide subir el
techo. Se mide desde el PR A y se reporta; las opciones (caché de imágenes,
servicios mínimos) son decisión de los fundadores, no del plan (ver preguntas
abiertas).

---

## Resumen de incógnitas

| Incógnita del contexto técnico | Resuelta en |
| --- | --- |
| Viabilidad de `juntia_writer` | R1 (verificado, con la auxiliar; enmienda de ADR-013) |
| Forma del claim | R2 (verificado) |
| Versiones | R3 (fijadas; lockfile en el PR A) |
| Lista permitida | R4 (verificado; enumeración por la API, riesgo aceptado 16.16) |
| Correo de Supabase | R5 (documentado; requisito operativo) |
| Copia y restauración | R6 (comandos de datos y cifrado verificados en CI; esquema por migraciones etiquetadas; los dos caminos de restauración desde vacío, por ensayar en el PR A) |
| Persistencia del tema | R7 (verificado en local para la lectura de la cookie) |
| Modelo, concurrencia, rutas, siembra | R8 |

No queda ningún `NEEDS CLARIFICATION`. Lo que queda abierto son decisiones que
el plan no puede tomar, listadas en el plan.
