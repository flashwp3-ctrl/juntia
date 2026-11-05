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
5. **Contraseña mínima: 8 caracteres** (Authentication › Providers › Email ›
   «Minimum password length»), igual que `[auth] minimum_password_length = 8` en
   `supabase/config.toml`. Requisito antes de probar el PR B en ese proyecto: Auth
   la aplica también a una llamada directa a la API, no solo la pantalla.
6. **Requisito del correo integrado, antes de probar el PR B** (research R5): los
   correos de los dos fundadores son miembros de la organización de Supabase, y
   **cada fundador recibe de verdad un correo de verificación** de ese proyecto;
   la evidencia del PR B lo registra (fecha y proyecto, sin el correo). Límite:
   **2 correos por hora en todo el proyecto**; cada registro, reenvío o
   recuperación manual cuenta.
7. **Lista permitida:** en el SQL Editor del proyecto,

   ```sql
   insert into juntia_data.signup_allowlist (email) values (lower('<correo>'));
   ```

   Una fila por fundador; quitar es `delete … where email = lower('<correo>')`.

## 4. Copia de seguridad y restauración (Q11; decisión 17)

**No se anota ningún dato real hasta que la primera copia y su restauración
tienen salida registrada** en la evidencia de la 002 (US-10.4, SC-010). **Y la
copia no se considera restaurable hasta que los dos caminos de 4.2 tienen salida
del job `db`** (research R6).

**Qué es una copia completa** (research R6): el **esquema por referencia** (las
migraciones de un commit concreto), los **datos** (`data.sql`) y un
**manifiesto** (modo, SHA y, en producción, la etiqueta; migraciones aplicadas;
recuentos y sumas de comprobación por tabla; `sha256` de `data.sql`). No se
vuelca el esquema con `pg_dump`.

**Dos modos, las mismas comprobaciones** (`scripts/backup-manifest.sh`, que crea
el PR A):

| Modo | Commit del esquema | Qué exige | Quién lo usa |
| --- | --- | --- | --- |
| `--mode ci --sha <sha>` | El **SHA exacto del commit que se verifica** (`$GITHUB_SHA`); no necesita etiqueta | Que las migraciones aplicadas a la base de origen sean exactamente las de ese SHA | El ensayo del job `db` (4.2): prueba el esquema del commit en revisión, no una etiqueta histórica |
| `--mode production --tag <db-prod-…>` | El commit de la **etiqueta de despliegue** | Que la etiqueta exista, y que las migraciones de producción sean exactamente las de ese commit | La copia real (4.1) y su restauración (4.3) |

En los dos modos, el manifiesto se genera y se verifica con el mismo código
(`--write` al copiar, `--verify` al restaurar): SHA, lista de migraciones,
recuentos, sumas de comprobación y `sha256`. Cualquier diferencia termina con
código distinto de 0.

**Fallar pronto, siempre.** Los procedimientos se ejecutan en **Git Bash** (también
en Windows) como scripts con `set -euo pipefail`: el primer comando que falla
detiene todo y su código de salida es el del script. No hay `|| break` ni
comprobaciones opcionales. El esquema de la etiqueta se toma con `git worktree
add` en una carpeta temporal, así que no se cambia la rama de trabajo y no hace
falta un `git checkout -` que pueda ocultar un fallo. Un `trap` de salida borra
los archivos descifrados y la carpeta temporal **y conserva el código de salida
original**.

### 4.0 Etiquetar el commit de producción (la dueña, al aplicar migraciones)

Cada vez que aplica migraciones a producción (§3), la dueña etiqueta el commit de
`main` que aplicó y la sube:

```bash
git tag -a db-prod-AAAA-MM-DD -m "Migraciones aplicadas a producción" <sha-de-main>
git push origin db-prod-AAAA-MM-DD
```

### 4.1 Copia (semanal, y antes del primer dato real) — modo producción

`DB` es la cadena de conexión **directa** de producción del panel (Connect ›
Direct o Session pooler), con la contraseña de la base; se exporta en la sesión y
no se guarda en ningún archivo del repositorio. El script es
`scripts/backup.sh` (lo crea el PR A); esto es lo que hace:

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${DB:?exporta DB con la cadena de conexión de producción}"
TAG=$(git describe --tags --match 'db-prod-*' --abbrev=0 origin/main)
D=$(date +%F); WORK=$(mktemp -d); SRC="$WORK/src"
cleanup() {
  rc=$?
  rm -f "$WORK/data.sql" "$WORK/juntia.tar"
  git worktree remove --force "$SRC" 2>/dev/null || true
  rm -rf "$WORK"
  exit "$rc"
}
trap cleanup EXIT
git worktree add --detach "$SRC" "$TAG"
pg_dump "$DB" --data-only --column-inserts --on-conflict-do-nothing \
  -t 'juntia_data.*' -t auth.users -t auth.identities -f "$WORK/data.sql"
# Bloqueante: falla si la etiqueta no existe o si las migraciones de producción ≠ las de la etiqueta.
bash scripts/backup-manifest.sh --write --mode production --tag "$TAG" \
  --migrations "$SRC/supabase/migrations" --db "$DB" --data "$WORK/data.sql" > "juntia-$D.manifest.txt"
tar -cf "$WORK/juntia.tar" -C "$WORK" data.sql -C "$PWD" "juntia-$D.manifest.txt"
gpg --symmetric --cipher-algo AES256 -o "juntia-$D.tar.gpg" "$WORK/juntia.tar"
echo "COPIA LISTA: juntia-$D.tar.gpg (etiqueta $TAG)"
```

- `-t 'juntia_data.*'` y no `-n juntia_data`: con `-t` presente, `-n` se ignora
  (research R6). `--column-inserts`, para que una columna que falte en el destino
  falle en lugar de desplazar valores.
- Solo quedan el `.gpg` y el manifiesto, que no lleva datos personales y se pega
  en la evidencia. Si algo falla, no queda ni una copia a medias ni `data.sql` en
  claro, y el mensaje `COPIA LISTA` no aparece.
- La frase de paso va en el gestor de contraseñas del fundador, nunca junto al
  archivo. El `.gpg` se guarda **fuera de Supabase y del repositorio**.

### 4.2 Ensayo de los dos caminos, en CI con datos de prueba — modo CI

`npm run db:restore-drill` corre en el job `db` de cada PR de código, con
`set -euo pipefail` y el mismo `trap`. Usa `--mode ci --sha "$GITHUB_SHA"`: el
esquema es **el del commit que se está verificando**. Siembra datos de prueba,
hace la copia como en 4.1 contra el Supabase del runner y la restaura **dos
veces, siempre desde una base vacía**:

- **Camino A · Supabase local:** `supabase db reset` con las migraciones de ese
  SHA y sin la semilla, y después `psql -v ON_ERROR_STOP=1 -1 -f data.sql`.
- **Camino B · PostgreSQL 17 normal** del runner (servidor de PGDG, sin
  Supabase): `createdb`, `plain-postgres-bootstrap.sql`, cada migración de ese
  SHA con `psql -v ON_ERROR_STOP=1 -1` (el bucle se corta con el código de la
  migración que falla), y `data.sql`. Antes, compara las columnas de
  `auth.users` y `auth.identities` del arranque con las del stack local y falla
  si difieren.

En los dos: `backup-manifest.sh --verify` es obligatorio y bloqueante; en el A,
además, un usuario restaurado entra.

**Controles negativos** (PR A, en el mismo job): el ensayo se repite con
fallos inyectados y **debe fallar** en cada uno, sin imprimir nunca el mensaje de
éxito:

1. una migración rota añadida en una copia temporal de `supabase/migrations/`;
2. un manifiesto con un recuento alterado;
3. un manifiesto con otro SHA;
4. un `data.sql` modificado (no coincide el `sha256`).

El job comprueba el código de salida distinto de 0 de cada uno y que la salida no
contiene la marca de éxito; si un control negativo «pasa», el job falla. **Ningún
dato real pasa por CI.**

### 4.3 Restauración real, en el equipo de un fundador (camino B, modo producción)

Solo cuando el camino B tiene salida verde del job `db` del commit de la etiqueta
o posterior. En un PostgreSQL 17 instalado en el equipo (sin Docker), en una base
**vacía**. El script es `scripts/restore-plain.sh` (lo crea el PR A):

```bash
#!/usr/bin/env bash
set -euo pipefail
ARCHIVE=${1:?ruta del .tar.gpg}; PG=${PG:-postgresql://postgres@localhost}
WORK=$(mktemp -d); SRC="$WORK/src"
cleanup() {
  rc=$?
  rm -f "$WORK/data.sql" "$WORK/juntia.tar"
  git worktree remove --force "$SRC" 2>/dev/null || true
  rm -rf "$WORK"
  exit "$rc"
}
trap cleanup EXIT
gpg -d -o "$WORK/juntia.tar" "$ARCHIVE"
tar -xf "$WORK/juntia.tar" -C "$WORK"
MANIFEST=$(ls "$WORK"/juntia-*.manifest.txt)
SHA=$(sed -n 's/^sha=//p' "$MANIFEST"); test -n "$SHA"
git worktree add --detach "$SRC" "$SHA"
createdb --maintenance-db="$PG/postgres" juntia_restore   # falla si ya existe: la base tiene que estar vacía
psql "$PG/juntia_restore" -X -v ON_ERROR_STOP=1 -f "$SRC/supabase/restore/plain-postgres-bootstrap.sql"
for m in "$SRC"/supabase/migrations/*.sql; do
  psql "$PG/juntia_restore" -X -v ON_ERROR_STOP=1 -1 -f "$m"   # con set -e, la primera que falla detiene todo
done
psql "$PG/juntia_restore" -X -v ON_ERROR_STOP=1 -1 -f "$WORK/data.sql"
bash scripts/backup-manifest.sh --verify --mode production --manifest "$MANIFEST" \
  --migrations "$SRC/supabase/migrations" --db "$PG/juntia_restore" --data "$WORK/data.sql"
echo "MANIFIESTO COINCIDE"
```

Se pega en la evidencia: la salida del script (sin datos), `MANIFIESTO COINCIDE`
y la fecha. Si el script termina con otro código, la restauración **no** cuenta.
Después se borra `juntia_restore` (`dropdb`) y el servicio de PostgreSQL se apaga
o se desinstala (ADR-011 §9.6).

## 5. Revisión de un PR de implementación

- Salida de `verify` y enlace al run de CI del último commit, con `app`, `db` y
  `e2e` en verde.
- Capturas a 390 y 1440 px en los dos temas de cada ruta nueva, y la pasada de
  Impeccable (plan, «PR de implementación»).
- La salida de cada `[V]` que comprueba lo construido del PR, o «pendiente:
  motivo». Ninguno se marca resuelto sin salida.
- Specs E2E añadidas por el PR y total acumulado (máximo 2 en la 002).
