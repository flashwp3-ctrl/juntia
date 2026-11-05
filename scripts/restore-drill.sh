#!/usr/bin/env bash
# T029–T030 / FR-059: dos restauraciones vacías y nueve fallos que deben ser rechazados.
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
for required in backup-manifest.sh backup.sh restore-plain.sh; do
  test -f "$ROOT/scripts/$required" || { echo "FALTA: scripts/$required" >&2; exit 1; }
done
: "${GITHUB_SHA:?solo en el runner de CI}" "${DB_URL:?}" "${RUNNER_TEMP:?}"
WORK=$(mktemp -d "$RUNNER_TEMP/restore-drill.XXXXXX")
PG=${PG:-postgresql://postgres@127.0.0.1:5432}
export PG JUNTIA_BACKUP_PASSPHRASE
JUNTIA_BACKUP_PASSPHRASE=$(openssl rand -hex 32)
cleanup() { rc=$?; rm -rf "$WORK"; exit "$rc"; }
trap cleanup EXIT
export DRILL_USER_FILE="$WORK/user.json"
node "$ROOT/tests/support/restore-user.mjs" seed
mkdir "$WORK/good"
# F40-1: «una escritura después de exportar la instantánea y antes del manifiesto
# no cambia la copia». Se intercepta solo pg_dump del test, nunca el de producción.
mkdir "$WORK/concurrent-bin"
export DRILL_REAL_PG_DUMP DRILL_SNAPSHOT_MARKER="$WORK/dump-snapshot"
DRILL_REAL_PG_DUMP=$(command -v pg_dump)
cat > "$WORK/concurrent-bin/pg_dump" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
imported=false
for arg in "$@"; do [[ $arg != --snapshot=* ]] || imported=true; done
"$DRILL_REAL_PG_DUMP" "$@"
# Otra conexión confirma una escritura que el manifiesto no debe ver.
psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 -c "insert into juntia_data.signup_allowlist(email) values('snapshot-concurrent@seed.test')"
printf '%s\n' "$imported" > "$DRILL_SNAPSHOT_MARKER"
echo "F40-1: escritura concurrente confirmada después del dump; snapshot importado=$imported" >&2
SH
chmod +x "$WORK/concurrent-bin/pg_dump"
(cd "$WORK/good"; PATH="$WORK/concurrent-bin:$PATH" DB="$DB_URL" bash "$ROOT/scripts/backup.sh" --mode ci --sha "$GITHUB_SHA")
# backup.sh conserva el diagnóstico de pg_dump en su temporal privado; el marcador
# del test confirma fuera de él que la escritura sí se ejecutó (sin esperas fijas).
test -f "$DRILL_SNAPSHOT_MARKER"
echo "F40-1: escritura concurrente confirmada; snapshot importado=$(cat "$DRILL_SNAPSHOT_MARKER")"
ARCHIVE=$(find "$WORK/good" -name 'juntia-*.tar.gpg')
gpg --batch --pinentry-mode loopback --passphrase-fd 3 -d -o "$WORK/copy.tar" "$ARCHIVE" 3<<<"$JUNTIA_BACKUP_PASSPHRASE"
tar -xf "$WORK/copy.tar" -C "$WORK"
# Camino A: db reset destruye los datos anteriores; nunca usa la semilla.
supabase db reset --no-seed
psql "$DB_URL" -X -v ON_ERROR_STOP=1 -1 -f "$WORK/data.sql" > "$WORK/path-a-sql.log" 2>&1
bash "$ROOT/scripts/backup-manifest.sh" --verify --mode ci --sha "$GITHUB_SHA" --manifest "$WORK/manifest.txt" --migrations "$ROOT/supabase/migrations" --db "$DB_URL" --data "$WORK/data.sql"
node "$ROOT/tests/support/restore-user.mjs" login
echo 'Camino A: MANIFIESTO COINCIDE; usuario restaurado entra'
test "$(cat "$DRILL_SNAPSHOT_MARKER")" = true
test "$(psql "$DB_URL" -X -qAt -v ON_ERROR_STOP=1 -c "select count(*) from juntia_data.signup_allowlist where email='snapshot-concurrent@seed.test'")" = 0
echo 'F40-1: dump y manifiesto comparten instantánea; restauración A excluye la escritura concurrente'
(cd "$WORK/good"; bash "$ROOT/scripts/restore-plain.sh" "$ARCHIVE" --mode ci --sha "$GITHUB_SHA")
echo 'Camino B: MANIFIESTO COINCIDE; base temporal borrada'
no_database() { test "$(psql "$PG/postgres" -X -qAt -c "select count(*) from pg_database where datname like 'juntia_restore%'")" = 0; }
negative() {
  local name=$1; shift
  local rc=0
  "$@" > "$WORK/$name.log" 2>&1 || rc=$?
  test "$rc" -ne 0
  ! grep -Eq 'RESTAURACIÓN LISTA|COPIA LISTA' "$WORK/$name.log"
  echo "$name: rechazo esperado, exit=$rc, sin marca de éxito"
}
pack() {
  tar -cf "$WORK/negative.tar" -C "$WORK/altered" data.sql manifest.txt
  gpg --batch --yes --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 -o "$WORK/negative.tar.gpg" "$WORK/negative.tar" 3<<<"$JUNTIA_BACKUP_PASSPHRASE"
}
restore_negative() { (cd "$WORK/altered"; bash "$ROOT/scripts/restore-plain.sh" "$WORK/negative.tar.gpg" --mode ci --sha "$GITHUB_SHA"); }
mkdir "$WORK/altered" "$WORK/broken"
cp "$ROOT"/supabase/migrations/*.sql "$WORK/broken/"
echo 'select deliberately_broken_migration();' > "$WORK/broken/20990101000000_broken.sql"
cp "$WORK/data.sql" "$WORK/manifest.txt" "$WORK/altered/"
pack
export RESTORE_TEST_MIGRATIONS="$WORK/broken"
negative N1-migration restore_negative
unset RESTORE_TEST_MIGRATIONS
no_database
sed -E '0,/^table=.*\|[0-9]+\|/s/\|[0-9]+\|/|999999|/' "$WORK/manifest.txt" > "$WORK/altered/manifest.txt"
pack; negative N2-count restore_negative; no_database
sed 's/^sha=.*/sha=0000000000000000000000000000000000000000/' "$WORK/manifest.txt" > "$WORK/altered/manifest.txt"
pack; negative N3-sha restore_negative; no_database
cp "$WORK/manifest.txt" "$WORK/altered/manifest.txt"
echo '-- altered synthetic dump' >> "$WORK/altered/data.sql"
pack; negative N4-data-hash restore_negative; no_database
cp "$WORK/data.sql" "$WORK/altered/data.sql"; pack
export RESTORE_TEST_MIGRATIONS="$WORK/broken"
negative N5-partial-restore restore_negative
unset RESTORE_TEST_MIGRATIONS
no_database
partial_log=$(sed -n 's/^log=//p' "$WORK/N5-partial-restore.log")
test -f "$partial_log"
grep -Eq 'exit=[1-9][0-9]* base=' "$partial_log"
echo 'N5-cleanup: bases restantes=0; log con exit distinto de cero'
mkdir "$WORK/failed-backup"
(
  cd "$WORK/failed-backup"
  # F40-3: referencia real de foundation; el worktree debe existir y la
  # divergencia de las migraciones aplicadas debe rechazarla en el manifiesto.
  negative N6-backup env DB="$DB_URL" bash "$ROOT/scripts/backup.sh" --mode ci --sha cbccec832d338402bc7262973b8e0b539d6dddff
  if ! grep -F 'MANIFIESTO RECHAZADO: migraciones aplicadas no coinciden' "$WORK/N6-backup.log"; then
    echo 'F40-3: falta diagnóstico de validación del manifiesto en N6' >&2
    exit 1
  fi
  test -z "$(find . -mindepth 1 -maxdepth 1)"
  test "$(psql "$DB_URL" -X -qAt -v ON_ERROR_STOP=1 -c "select count(*) from pg_stat_activity where application_name like 'juntia_backup_snapshot_%'")" = 0
)
echo 'N6-cleanup: sin archivos publicados ni temporales; exportadoras restantes=0'
mkdir "$WORK/existing"
export BACKUP_NAME=juntia-2099-01-01T000000
printf 'existing synthetic archive' > "$WORK/existing/$BACKUP_NAME.tar.gpg"
before=$(sha256sum "$WORK/existing/$BACKUP_NAME.tar.gpg")
(
  cd "$WORK/existing"
  negative N7-existing env DB="$DB_URL" bash "$ROOT/scripts/backup.sh" --mode ci --sha "$GITHUB_SHA"
)
test "$before" = "$(sha256sum "$WORK/existing/$BACKUP_NAME.tar.gpg")"
test ! -e "$WORK/existing/$BACKUP_NAME.manifest.txt"
test -z "$(find "$WORK/existing" -name '.juntia-backup.*')"
unset BACKUP_NAME
echo 'N7-integridad: sha256 del archivo existente idéntico'
restore_drop_failure() { (cd "$WORK/good"; DROPDB=false bash "$ROOT/scripts/restore-plain.sh" "$ARCHIVE" --mode ci --sha "$GITHUB_SHA"); }
negative N8-drop restore_drop_failure
grep -q 'DROP FALLÓ' "$WORK/N8-drop.log"
drop_log=$(sed -n 's/^log=//p' "$WORK/N8-drop.log")
test -f "$drop_log"; grep -q 'DROP FALLÓ' "$drop_log"; grep -q '^exit=1 base=' "$drop_log"
# Se comprueba el log de ESTA ejecución antes de limpiar su base, nunca una base ajena.
failed_db=$(sed -n 's/^exit=1 base=\(juntia_restore_[0-9T_]*\) creada_por_este_script=1$/\1/p' "$WORK/N8-drop.log")
test -n "$failed_db"
dropdb --force --maintenance-db="$PG/postgres" "$failed_db"
no_database
echo 'N8-cleanup: DROP FALLÓ, exit=1; job borró la base propia; bases restantes=0'
mkdir "$WORK/corrupt"
(
  cd "$WORK/corrupt"
  negative N9-decrypt env DB="$DB_URL" BACKUP_TEST_CORRUPT=1 bash "$ROOT/scripts/backup.sh" --mode ci --sha "$GITHUB_SHA"
  test -z "$(find . -mindepth 1 -maxdepth 1)"
)
echo 'N9-cleanup: sin archivos publicados ni temporales'
no_database
echo 'ENSAYO LISTO: A y B, nueve controles negativos rechazados'
