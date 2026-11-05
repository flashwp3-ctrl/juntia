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
fundadora, **sin datos reales** y con claves propias (ADR-011 §9.5). No lo usa
ninguna prueba automatizada. Está en **East US (North Virginia)**, no en la región
de producción (São Paulo): la región no se puede cambiar sin recrear el proyecto, y
los fundadores la aceptaron el 5 de noviembre de 2026 porque dev no guarda datos
reales y la región no cambia el comportamiento de las migraciones. Las latencias
medidas en dev no representan a producción.

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
- **Ningún equipo se queda enlazado a producción** (ADR-011 §9.5). Las
  migraciones de producción se aplican después del merge, con el mismo
  procedimiento y el `project-ref` de producción, en una sola sesión que termina
  con `unlink` y, en el equipo de trabajo, con volver a enlazar `juntia-dev`. Las
  lanza un fundador, o el gestor (Claude Code) en el equipo de un fundador, con su
  sesión de la CLI y **su confirmación explícita antes de cada paso de escritura**
  (`link`, `db push`, etiqueta, `unlink`); dry-run, listados y consultas de
  lectura no la necesitan. Mientras el equipo está enlazado a producción, ningún
  otro agente trabaja en esa carpeta (ajuste del 5 de noviembre de 2026; antes,
  solo la segunda fundadora desde su equipo). **Después de cada `db push` a
  producción**, el gestor y un fundador comprueban que `pg_graphql` está quitado o desactivado y que
  «Exposed schemas» es solo `public`, y pegan la salida sin claves en la
  evidencia (FR-005 en producción). Producción no recibe datos reales hasta que
  esa comprobación pasa.
- **Recuperación si la sesión se corta.** Si algo falla o se interrumpe entre
  `link` a producción y `unlink` (un `db push` que falla, la terminal cerrada, el
  agente detenido), la carpeta puede seguir enlazada a producción. Por eso, **antes
  de cualquier trabajo con Supabase** en un equipo de trabajo, y después de
  cualquier error o interrupción, se lee `supabase/.temp/project-ref`:
  - si es `itfrhnadovezpahikuol`, se sigue;
  - si es `enwaxmwgldqohfawxhdm` o cualquier otro valor, **se para toda operación
    con `--linked`**, se avisa al fundador y, con su confirmación, se ejecuta
    `npx --yes supabase@2.121.0 unlink`, luego `link --project-ref
    itfrhnadovezpahikuol` y se vuelve a leer `project-ref` antes de continuar. Si
    la interrupción fue a mitad de un `db push` a producción, antes de desenlazar
    se lee `migration list --linked` y se registra en la evidencia qué quedó
    aplicado.

  La sesión de la CLI del fundador alcanza todos los proyectos de la
  organización, producción incluida; el enlace local solo elige el destino por
  defecto. Por eso la confirmación humana antes de cada escritura es la barrera
  principal, no el enlace.
- Nunca `--include-seed`: `supabase/seed.sql` es solo para el runner.
- Con la CLI v3 la sintaxis es `--remote=<ref>` (ADR-011 §9.5); subir de major es
  un PR propio.

### Configuración de Auth en cada proyecto alojado (una vez, la dueña)

1. **Correo:** confirmación obligatoria. **Plantillas: no se tocan** (enmienda
   del 5 de noviembre de 2026, decisión de Alejandro, «Adaptar la app»). En el
   plan Free no se pueden editar sin SMTP propio («Set up custom SMTP to edit
   templates»), así que los proyectos alojados mandan la plantilla por defecto:
   `{{ .ConfirmationURL }}` pasa por `/auth/v1/verify` de Supabase y redirige a
   `/auth/confirm?next=signup|recovery&code=…` (PKCE), el destino que fija la app
   con `emailRedirectTo`/`redirectTo` (`SITE_URL` o el origen de la petición).
   Las plantillas de `supabase/templates/`
   (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`) solo
   aplican al Supabase local y al del runner. `/auth/confirm` acepta los dos
   caminos (`src/features/auth/confirm.ts`). **Limitación aceptada:** con la
   plantilla por defecto, el enlace se abre en el mismo navegador donde se hizo el
   registro o la recuperación; en otro navegador, el registro queda verificado y
   lleva a Entrar, y la recuperación pide un enlace nuevo. El SMTP propio sigue
   previsto antes de MVP-1 (decisión 16.10).
2. **URL del sitio y de redirección:** producción → su dominio; `juntia-dev` →
   `http://localhost:3000` y los previews de Vercel. Las Redirect URLs tienen que
   cubrir `<origen>/auth/confirm?next=…` (con `/**` basta).
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
no se guarda en ningún archivo del repositorio. **Necesita una conexión de sesión:
directa o pooler en modo sesión; nunca pooler en modo transacción.** La sesión
exportadora mantiene abierta una transacción `repeatable read, read only` hasta
que terminen tanto `pg_dump --snapshot` como todas las consultas del manifiesto.
Estas importan esa misma instantánea con `SET TRANSACTION SNAPSHOT`, antes de
consultar migraciones, recuentos o hashes; una escritura o un inicio de sesión
concurrentes no alteran la vista de la copia. El cierre normal y el `trap` cierran
la sesión exportadora ([PostgreSQL 17: instantáneas sincronizadas](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION)). El script es
`scripts/backup.sh` (lo crea el PR A); esto es lo que hace:

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${DB:?exporta DB con la cadena de conexión de producción}"
TAG=$(git describe --tags --match 'db-prod-*' --abbrev=0 origin/main)
# Nombre único con marca de tiempo al segundo; si aun así existe, el script falla (nunca sobrescribe).
NAME="juntia-$(date +%Y-%m-%dT%H%M%S)"
OUT_GPG="$PWD/$NAME.tar.gpg"; OUT_MAN="$PWD/$NAME.manifest.txt"
# Temporal en la misma carpeta de destino: el paso final es un enlace duro, atómico en el mismo sistema de archivos.
WORK=$(mktemp -d "$PWD/.juntia-backup.XXXXXX"); SRC="$WORK/src"; PUBLISHED=()
SNAPSHOT_PID= SNAPSHOT_INPUT= SNAPSHOT_OUTPUT=
cleanup() {
  rc=$?
  if [ -n "$SNAPSHOT_PID" ]; then
    if [ -n "$SNAPSHOT_INPUT" ]; then exec {SNAPSHOT_INPUT}>&- || true; fi
    if [ -n "$SNAPSHOT_OUTPUT" ]; then exec {SNAPSHOT_OUTPUT}<&- || true; fi
    wait "$SNAPSHOT_PID" || true
  fi
  if [ "$rc" -ne 0 ]; then rm -f "${PUBLISHED[@]}"; fi   # solo lo que este script publicó
  git worktree remove --force "$SRC" 2>/dev/null || true
  rm -rf "$WORK"                                          # data.sql en claro, tar, manifiesto y .gpg temporales
  exit "$rc"
}
trap cleanup EXIT
test ! -e "$OUT_GPG" && test ! -e "$OUT_MAN"
git worktree add --detach "$SRC" "$TAG"
coproc SNAPSHOT_EXPORTER { psql "$DB" -X -qAt -v ON_ERROR_STOP=1; }
SNAPSHOT_PID=$SNAPSHOT_EXPORTER_PID
exec {SNAPSHOT_INPUT}>&"${SNAPSHOT_EXPORTER[1]}"
exec {SNAPSHOT_OUTPUT}<&"${SNAPSHOT_EXPORTER[0]}"
original_input=${SNAPSHOT_EXPORTER[1]}; original_output=${SNAPSHOT_EXPORTER[0]}
exec {original_input}>&-; exec {original_output}<&-
printf 'begin isolation level repeatable read read only;\nselect pg_export_snapshot();\n' >&"$SNAPSHOT_INPUT"
IFS= read -r -t 30 SNAPSHOT <&"$SNAPSHOT_OUTPUT"
[[ $SNAPSHOT =~ ^[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+$ ]]
pg_dump "$DB" --snapshot="$SNAPSHOT" --data-only --column-inserts --on-conflict-do-nothing \
  -t 'juntia_data.*' -t auth.users -t auth.identities -f "$WORK/data.sql"
# Bloqueante: falla si la etiqueta no existe o si las migraciones de producción ≠ las de la etiqueta.
bash scripts/backup-manifest.sh --write --mode production --tag "$TAG" \
  --snapshot "$SNAPSHOT" --migrations "$SRC/supabase/migrations" --db "$DB" --data "$WORK/data.sql" > "$WORK/manifest.txt"
printf 'commit;\n\\q\n' >&"$SNAPSHOT_INPUT"
exec {SNAPSHOT_INPUT}>&-; exec {SNAPSHOT_OUTPUT}<&-
wait "$SNAPSHOT_PID"; SNAPSHOT_PID=
tar -cf "$WORK/juntia.tar" -C "$WORK" data.sql manifest.txt
gpg --symmetric --cipher-algo AES256 -o "$WORK/juntia.tar.gpg" "$WORK/juntia.tar"
# Comprobación real: descifrar en la carpeta temporal y comparar con el original. Pide la
# contraseña si el agente de gpg no la tiene en caché; no usa --batch para no fallar sin ella.
gpg -d -o "$WORK/check.tar" "$WORK/juntia.tar.gpg"
cmp -s "$WORK/juntia.tar" "$WORK/check.tar"            # con set -e, si difieren, no se publica nada
# Publicación: solo después de todas las comprobaciones. ln falla si el destino existe.
ln "$WORK/juntia.tar.gpg" "$OUT_GPG"; PUBLISHED+=("$OUT_GPG")
ln "$WORK/manifest.txt" "$OUT_MAN"; PUBLISHED+=("$OUT_MAN")
echo "COPIA LISTA: $NAME.tar.gpg (etiqueta $TAG)"
```

- `-t 'juntia_data.*'` y no `-n juntia_data`: con `-t` presente, `-n` se ignora
  (research R6). `--column-inserts`, para que una columna que falte en el destino
  falle en lugar de desplazar valores.
- **Lo que garantiza** (y nada más):
  - todo se escribe primero en una carpeta temporal `.juntia-backup.*` dentro de
    la carpeta de destino, que el `trap` borra siempre, con éxito o con fallo;
  - el `.gpg` y el manifiesto solo aparecen con su nombre final **después** de
    pasar todas las comprobaciones, cada uno con un enlace duro, que es atómico y
    falla si el nombre ya existe;
  - **nunca sobrescribe** una copia: el nombre lleva fecha y hora al segundo, y si
    aun así existe, el script falla antes de empezar;
  - si algo falla, el código de salida es distinto de 0, `COPIA LISTA` no
    aparece, no queda `data.sql` en claro, y si el fallo llega entre los dos
    enlaces, el `trap` borra el que este script ya había publicado.
  - **No** garantiza nada sobre copias anteriores ni sobre la carpeta donde el
    fundador las guarde después.
- El manifiesto no lleva datos personales y se pega en la evidencia.
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
5. **una restauración que falla a mitad** (camino B con la migración rota): además de fallar, **no debe quedar ninguna base `juntia_restore*`** en el servidor del runner (`select count(*) from pg_database where datname like 'juntia_restore%'` = 0) y el log debe existir con su `exit=` distinto de 0;
6. **una copia que falla** (por ejemplo, el manifiesto rechaza otro SHA): **no debe quedar ningún archivo de salida** (`juntia-*.tar.gpg`, `juntia-*.manifest.txt`) ni carpeta `.juntia-backup.*`;
7. una copia con un nombre de destino que ya existe: falla y el archivo existente queda intacto (mismo `sha256`);
8. **un `dropdb` que falla** después de una restauración correcta (`DROPDB=false`): el script **debe salir con código distinto de 0**, el log debe contener `exit=1` y «DROP FALLÓ» con el nombre de la base, y **no** debe aparecer «RESTAURACIÓN LISTA»; después el job borra esa base y comprueba que no queda ninguna `juntia_restore*`;
9. **un descifrado de comprobación que no coincide** (se altera `juntia.tar.gpg` entre el cifrado y la comprobación): la copia falla y no publica nada.

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
STAMP=$(date +%Y%m%dT%H%M%S); DBNAME="juntia_restore_${STAMP}_$$"
LOG="$PWD/juntia-restore-$STAMP.log"                 # evidencia: recuentos y sumas, sin datos reales
WORK=$(mktemp -d); SRC="$WORK/src"; CREATED_DB=0; VERIFIED=0
cleanup() {
  rc=$?
  if [ "$CREATED_DB" -eq 1 ]; then
    # Borrar la base es parte del éxito: si falla, el script falla y dice qué limpiar a mano.
    if ${DROPDB:-dropdb} --force --maintenance-db="$PG/postgres" "$DBNAME"; then
      echo "base $DBNAME borrada" >> "$LOG"
    else
      echo "DROP FALLÓ: la base $DBNAME puede tener datos reales; bórrala a mano con dropdb --force $DBNAME" | tee -a "$LOG" >&2
      [ "$rc" -eq 0 ] && rc=1
    fi
  fi
  git worktree remove --force "$SRC" 2>/dev/null || true
  rm -rf "$WORK"                                        # tar y data.sql descifrados
  # El código final se registra cuando ya se sabe si la limpieza funcionó.
  echo "exit=$rc base=$DBNAME creada_por_este_script=$CREATED_DB" >> "$LOG"
  # Único marcador de éxito global: solo con el manifiesto verificado y la limpieza completa.
  if [ "$rc" -eq 0 ] && [ "$VERIFIED" -eq 1 ]; then echo "RESTAURACIÓN LISTA" | tee -a "$LOG"; fi
  exit "$rc"
}
trap cleanup EXIT
gpg -d -o "$WORK/juntia.tar" "$ARCHIVE"
tar -xf "$WORK/juntia.tar" -C "$WORK"
SHA=$(sed -n 's/^sha=//p' "$WORK/manifest.txt"); test -n "$SHA"
git worktree add --detach "$SRC" "$SHA"
# La base no debe existir: si existe, falla y no la toca (nunca borra una base que no creó).
test "$(psql "$PG/postgres" -X -A -t -c "select count(*) from pg_database where datname = '$DBNAME'")" = 0
createdb --maintenance-db="$PG/postgres" "$DBNAME"; CREATED_DB=1
psql "$PG/$DBNAME" -X -v ON_ERROR_STOP=1 -f "$SRC/supabase/restore/plain-postgres-bootstrap.sql"
for m in "$SRC"/supabase/migrations/*.sql; do
  psql "$PG/$DBNAME" -X -v ON_ERROR_STOP=1 -1 -f "$m"     # con set -e, la primera que falla detiene todo
done
psql "$PG/$DBNAME" -X -v ON_ERROR_STOP=1 -1 -f "$WORK/data.sql"
# Escribe en el log los recuentos y sumas de origen y de destino; falla si no coinciden.
bash scripts/backup-manifest.sh --verify --mode production --manifest "$WORK/manifest.txt" \
  --migrations "$SRC/supabase/migrations" --db "$PG/$DBNAME" --data "$WORK/data.sql" | tee -a "$LOG"
echo "manifiesto verificado (paso intermedio, no es el éxito final)" >> "$LOG"; VERIFIED=1
```

- **Base temporal propia:** el script crea `juntia_restore_<fecha-hora>_<pid>`,
  apunta que la creó él, y el `trap` la borra **tanto si termina bien como si
  falla**, después de escribir la evidencia en `juntia-restore-<fecha-hora>.log`.
  Si el nombre ya existe, falla sin tocarla: nunca borra una base que no creó.
- **El log** solo lleva recuentos, sumas de comprobación, el SHA, el código de
  salida y el nombre de la base; ningún dato real. Es lo que se pega en la
  evidencia, con `MANIFIESTO COINCIDE`. Si el log termina en `exit=` distinto
  de 0, la restauración **no** cuenta.
- Al terminar, el servicio de PostgreSQL se apaga o se desinstala (ADR-011 §9.6).

## 5. Revisión de un PR de implementación

- Salida de `verify` y enlace al run de CI del último commit, con `app`, `db` y
  `e2e` en verde.
- Capturas a 390 y 1440 px en los dos temas de cada ruta nueva, y la pasada de
  Impeccable (plan, «PR de implementación»).
- La salida de cada `[V]` que comprueba lo construido del PR, o «pendiente:
  motivo». Ninguno se marca resuelto sin salida.
- Specs E2E añadidas por el PR y total acumulado (máximo 2 en la 002).
