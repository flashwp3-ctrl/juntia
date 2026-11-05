# Quickstart — trabajar en la 002 sin Docker

Para quien implementa y para quien revisa los PR A–D. **Sin Docker en los
equipos** (decisión 17; ADR-011 §9): nunca se arranca Docker Desktop ni WSL, y
`supabase start` no se ejecuta en un equipo. Requisitos: Node 24, npm 11 y `gh`
con sesión. Para la copia y la restauración, además: herramientas de línea de
comandos de PostgreSQL 17 (y el servidor, para la restauración real) y Gpg4win.

## 1. Bucle local: `verify`

```bash
npm ci
npm run verify
```

Esperado: lint, typecheck, dominio y componentes pasan; las filas de SQL/RLS e
integración dicen «SOLO EN CI — pendiente de resultado · job db» y la de E2E,
«NO APLICABLE» (PR A) o «SOLO EN CI» (desde el PR B). Pegar la salida real en el
PR. **Que `verify` pase no prueba ninguna migración, política ni función**
(ADR-011 §9.8).

## 2. La base de datos se prueba en CI

Antes de abrir el PR (o en un borrador):

```bash
git push -u origin <rama>
gh workflow run ci.yml --ref <rama>
gh run list --workflow ci.yml --branch <rama> --limit 1
gh run watch <run-id>
gh run view <run-id> --log-failed
```

El lanzamiento manual corre **los mismos jobs** que un push (`app`, `db` y,
desde el PR B, `e2e`). Una migración, política o función está probada solo con
la salida del job `db` **de ese mismo commit**; el PR enlaza el run.

Para escribir un test pgTAP: un archivo por tema en `supabase/tests/`, la
identidad con `set local role authenticated;` y `set local "request.jwt.claims"
= '{"sub":"<uuid>","role":"authenticated"}';` (research R2; **nunca**
`request.jwt.claim.sub`). Míralo fallar: rompe la política a propósito en un
commit de prueba y comprueba que el job se pone rojo (TESTING §6, paso 5).

## 3. Usar la app en desarrollo: `juntia-dev`

`juntia-dev` (`itfrhnadovezpahikuol`) es un proyecto Free de la segunda
fundadora, en la región de producción, **sin datos reales** y con claves propias
(ADR-011 §9.5). No lo usa ninguna prueba automatizada.

### Variables de entorno (solo nombres; los valores, del panel del proyecto)

| Variable | Dónde | Nota |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` y Vercel | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` y Vercel | Clave publicable (`sb_publishable_…`) |
| `SITE_URL` | `.env.local` y Vercel | Base de los enlaces de correo (`http://localhost:3000` en local) |
| `JUNTIA_INTERNAL_SURFACE` | Solo local o CI | De la 001 |

**Ninguna clave de servicio ni secreta** en `.env.local`, en Vercel ni en ninguna
ruta de la app (FR-011, FR-058). En Vercel, **Production** apunta al proyecto de
producción y **Preview** a `juntia-dev` (plan, punto para el revisor). `.env.local`
no se versiona.

### Aplicar migraciones a `juntia-dev` (CLI v2 fijada)

```bash
npx --yes supabase@2.121.0 login
npx --yes supabase@2.121.0 link --project-ref itfrhnadovezpahikuol
npx --yes supabase@2.121.0 projects list      # el proyecto enlazado lleva la marca ●
cat supabase/.temp/project-ref                 # debe decir itfrhnadovezpahikuol
npx --yes supabase@2.121.0 db push --linked --dry-run
npx --yes supabase@2.121.0 db push --linked
```

- **Comprobar el destino antes de aplicar**, siempre: si `project-ref` no es
  `itfrhnadovezpahikuol`, parar.
- **Ningún equipo enlaza producción** (ADR-011 §9.5). Las migraciones de
  producción las aplica la segunda fundadora desde su equipo con el mismo
  procedimiento y el `project-ref` de producción, después del merge, y desenlaza
  al terminar.
- Nunca `--include-seed`: `supabase/seed.sql` es solo para el runner.
- Con la CLI v3 la sintaxis es `--remote=<ref>` (ADR-011 §9.5); subir de major es
  un PR propio.

### Configuración de Auth en cada proyecto alojado (una vez, la dueña)

1. **Correo:** confirmación obligatoria; plantillas de confirmación y
   recuperación con `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
   y `…&type=recovery`.
2. **URL del sitio y de redirección:** producción → su dominio; `juntia-dev` →
   `http://localhost:3000` y los previews de Vercel.
3. **Hook Before User Created** → Postgres → `juntia_private.before_user_created_hook`.
4. **API › Exposed schemas:** solo `public`.
5. **Requisito del correo integrado** (research R5): los correos de los dos
   fundadores son miembros de la organización de Supabase. Límite: **2 correos
   por hora en todo el proyecto**; cada registro, reenvío o recuperación manual
   cuenta.
6. **Lista permitida:** en el SQL Editor del proyecto,

   ```sql
   insert into juntia_data.signup_allowlist (email) values (lower('<correo>'));
   ```

   Una fila por fundador; quitar es `delete … where email = lower('<correo>')`.

## 4. Copia de seguridad y restauración (Q11; decisión 17)

**No se anota ningún dato real hasta que la primera copia y su restauración
tienen salida registrada** en la evidencia de la 002 (US-10.4, SC-010). La hace
un fundador desde su equipo, con PowerShell o Git Bash; los comandos son los
mismos.

### 4.1 Copia (semanal, y antes del primer dato real)

`$DB` es la cadena de conexión **directa** de producción del panel (Connect ›
Direct o Session pooler), con la contraseña de la base. No se guarda en ningún
archivo del repositorio ni del historial de la terminal compartida.

```bash
D=$(date +%F)
pg_dump "$DB" --data-only --inserts --on-conflict-do-nothing \
  -t 'juntia_data.*' -t auth.users -t auth.identities -f data.sql
pg_dump "$DB" --schema-only -n juntia_data -n juntia_private \
  -t 'public.my_*' -t auth.users -t auth.identities -f schema.sql
psql "$DB" -X -A -t -c "select version from supabase_migrations.schema_migrations order by 1" > migrations.txt
psql "$DB" -X -A -t -f supabase/restore/counts.sql > counts.txt
tar -cf "juntia-$D.tar" data.sql schema.sql migrations.txt counts.txt
gpg --symmetric --cipher-algo AES256 -o "juntia-$D.tar.gpg" "juntia-$D.tar"
rm data.sql schema.sql "juntia-$D.tar"        # solo queda el cifrado
```

- `-n` se ignora cuando hay `-t`: por eso el esquema de la app va como
  `-t 'juntia_data.*'` en la copia de datos (research R6). La lista exacta de
  `public` (`-t 'public.my_*'` y las funciones de entrada) la fija el PR A con
  los nombres reales.
- La frase de paso va en el gestor de contraseñas del fundador, nunca junto al
  archivo.
- El `.gpg` se guarda **fuera de Supabase y del repositorio** (por ejemplo, en el
  almacenamiento personal del fundador) y `counts.txt` se pega en la evidencia.

### 4.2 Ensayo del procedimiento, en CI con datos de prueba

`npm run db:restore-drill` corre en el job `db` de cada PR de código: siembra
datos de prueba, hace la copia con los comandos de 4.1, la cifra, y la restaura
dos veces: en una base recién migrada (`supabase db reset` + `psql -v
ON_ERROR_STOP=1 -1 -f data.sql`, como en el preflight) y en un **PostgreSQL 17
normal del runner** con el arranque de 4.3. Compara recuentos y sumas, y
comprueba que un usuario restaurado entra. **Ningún dato real pasa por CI.**

### 4.3 Restauración real, en el equipo de un fundador

En un PostgreSQL 17 instalado en el equipo (sin Docker), en una base nueva:

```bash
gpg -d -o juntia.tar "juntia-$D.tar.gpg"
tar -xf juntia.tar
createdb -h localhost -U postgres juntia_restore
psql -h localhost -U postgres -d juntia_restore -v ON_ERROR_STOP=1 -f supabase/restore/plain-postgres-bootstrap.sql
psql -h localhost -U postgres -d juntia_restore -v ON_ERROR_STOP=1 -1 -f schema.sql
psql -h localhost -U postgres -d juntia_restore -v ON_ERROR_STOP=1 -1 -f data.sql
psql -h localhost -U postgres -d juntia_restore -X -A -t -f supabase/restore/counts.sql > restored-counts.txt
diff counts.txt restored-counts.txt && echo "RECUENTOS IGUALES"
```

Se pega en la evidencia: la salida de cada comando (sin datos), `RECUENTOS
IGUALES` y la fecha. Después se borran `juntia_restore`, los `.sql` descifrados
y el `.tar`, y el servicio de PostgreSQL se apaga o se desinstala (ADR-011 §9.6).
`plain-postgres-bootstrap.sql` y `counts.sql` los crea el PR A y se ensayan en
4.2 antes de este paso.

## 5. Revisión de un PR de implementación

- Salida de `verify` y enlace al run de CI del último commit, con `app`, `db` y
  `e2e` en verde.
- Capturas a 390 y 1440 px en los dos temas de cada ruta nueva, y la pasada de
  Impeccable (plan, «PR de implementación»).
- La salida de cada `[V]` que comprueba lo construido del PR, o «pendiente:
  motivo». Ninguno se marca resuelto sin salida.
- Specs E2E añadidas por el PR y total acumulado (máximo 2 en la 002).
