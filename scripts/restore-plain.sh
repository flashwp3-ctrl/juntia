#!/usr/bin/env bash
# T028 / quickstart §4.3: solo borra la base que creó esta invocación.
set -Eeuo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
source "$ROOT/scripts/restore-progress.sh"
ARCHIVE=${1:?ruta del .tar.gpg}; shift
MODE=production; EXPECTED_SHA=
while (($#)); do
  case "$1" in --mode) MODE=$2; shift 2 ;; --sha) EXPECTED_SHA=$2; shift 2 ;; *) exit 1 ;; esac
done
[[ $MODE = production || ( $MODE = ci && ${GITHUB_ACTIONS:-} = true ) ]]
if [[ $MODE = production ]]; then test -z "${RESTORE_TEST_MIGRATIONS:-}"; fi
PG=${PG:-postgresql://postgres@localhost}; PG=${PG%/}
STAMP=$(date +%Y%m%dT%H%M%S); DBNAME="juntia_restore_${STAMP}_$$"
LOG="$PWD/juntia-restore-${STAMP}-$$.log"
WORK=$(mktemp -d); SRC="$WORK/src"; CREATED_DB=0; VERIFIED=0
cleanup() {
  rc=$?
  trap - ERR
  if [[ $CREATED_DB = 1 ]]; then
    if ${DROPDB:-dropdb} --force --maintenance-db="$PG/postgres" "$DBNAME"; then
      echo "base $DBNAME borrada" >> "$LOG"
    else
      echo "DROP FALLÓ: la base $DBNAME puede tener datos reales; bórrala a mano con dropdb --force $DBNAME" | tee -a "$LOG" >&2
      [[ $rc -ne 0 ]] || rc=1
    fi
  fi
  git -C "$ROOT" worktree remove --force "$SRC" 2>/dev/null || true
  rm -rf "$WORK"
  echo "exit=$rc base=$DBNAME creada_por_este_script=$CREATED_DB" | tee -a "$LOG"
  echo "log=$LOG"
  if [[ $rc = 0 && $VERIFIED = 1 ]]; then echo 'RESTAURACIÓN LISTA' | tee -a "$LOG"; fi
  exit "$rc"
}
trap cleanup EXIT
restore_mark plain.decrypt
if [[ $MODE = ci ]]; then
  : "${JUNTIA_BACKUP_PASSPHRASE:?}"
  gpg --batch --pinentry-mode loopback --passphrase-fd 3 -d -o "$WORK/juntia.tar" "$ARCHIVE" 3<<<"$JUNTIA_BACKUP_PASSPHRASE"
else gpg -d -o "$WORK/juntia.tar" "$ARCHIVE"; fi
restore_mark plain.archive-check
test "$(tar -tf "$WORK/juntia.tar" | sort)" = "$(printf 'data.sql\nmanifest.txt')"
tar -xf "$WORK/juntia.tar" -C "$WORK"
SHA=$(sed -n 's/^sha=//p' "$WORK/manifest.txt")
[[ $SHA =~ ^[0-9a-f]{40}$ ]]
test "$(sed -n 's/^mode=//p' "$WORK/manifest.txt")" = "$MODE"
if [[ $MODE = ci ]]; then test "$SHA" = "$EXPECTED_SHA"; fi
test "$(sha256sum "$WORK/data.sql" | cut -d' ' -f1)" = "$(sed -n 's/^data_sha256=//p' "$WORK/manifest.txt")"
restore_quiet_step plain.checkout "$WORK/worktree.log" git -C "$ROOT" worktree add --detach "$SRC" "$SHA"
test "$(psql "$PG/postgres" -X -qAt -v ON_ERROR_STOP=1 -c 'show server_version_num')" -ge 170000
test "$(psql "$PG/postgres" -X -qAt -v ON_ERROR_STOP=1 -c "select count(*) from pg_database where datname='$DBNAME'")" = 0
restore_quiet_step plain.create "$WORK/create.log" createdb --maintenance-db="$PG/postgres" "$DBNAME"; CREATED_DB=1
restore_quiet_step plain.bootstrap "$WORK/bootstrap.log" psql "$PG/$DBNAME" -X -v VERBOSITY=verbose -v ON_ERROR_STOP=1 -f "$SRC/supabase/restore/plain-postgres-bootstrap.sql"
restore_mark plain.auth-shape
if [[ $MODE = ci ]]; then
  : "${DB_URL:?}"
  columns="select n.nspname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attgenerated from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='auth' and c.relname in ('users','identities') and a.attnum>0 and not a.attisdropped order by c.relname,a.attnum"
  psql "$DB_URL" -X -qAt -v ON_ERROR_STOP=1 -c "$columns" > "$WORK/stack-columns"
  psql "$PG/$DBNAME" -X -qAt -v ON_ERROR_STOP=1 -c "$columns" > "$WORK/plain-columns"
  diff -u "$WORK/stack-columns" "$WORK/plain-columns"
  psql "$DB_URL" -X -qAt -v ON_ERROR_STOP=1 -c "select pg_get_functiondef('auth.uid()'::regprocedure)" > "$WORK/stack-uid"
  psql "$PG/$DBNAME" -X -qAt -v ON_ERROR_STOP=1 -c "select pg_get_functiondef('auth.uid()'::regprocedure)" > "$WORK/plain-uid"
  diff -u "$WORK/stack-uid" "$WORK/plain-uid"
  echo 'Auth: columnas y auth.uid() coinciden con el stack' | tee -a "$LOG"
fi
MIGRATIONS=${RESTORE_TEST_MIGRATIONS:-$SRC/supabase/migrations}
for migration in "$MIGRATIONS"/*.sql; do
  if ! restore_quiet_step "plain.migration.$(basename "$migration")" "$WORK/migration.log" psql "$PG/$DBNAME" -X -v VERBOSITY=verbose -v ON_ERROR_STOP=1 -1 -f "$migration"; then
    echo "Migración rechazada: $(basename "$migration")" | tee -a "$LOG" >&2; exit 1
  fi
  name=$(basename "$migration"); version=${name%%_*}; [[ $version =~ ^[0-9]{14}$ ]]
  psql "$PG/$DBNAME" -X -v ON_ERROR_STOP=1 -q -c "insert into supabase_migrations.schema_migrations(version) values('$version')" > "$WORK/registry.log" 2>&1
done
restore_quiet_step plain.role "$WORK/role.log" psql "$PG/$DBNAME" -X -qAt -v ON_ERROR_STOP=1 -f "$ROOT/supabase/restore/describe-role.sql"
cat "$WORK/role.log"
# Conserva data.sql y su hash: solo se ordena una copia temporal para la carga.
load_files=(-f "$WORK/data.sql")
if [[ -f "$SRC/scripts/order-restore-data.mjs" ]]; then
  node "$SRC/scripts/order-restore-data.mjs" "$WORK/data.sql" "$WORK/ordered.sql"
  load_files=(-f "$WORK/ordered.sql" -f "$SRC/supabase/restore/check-invariants.sql" -c 'set constraints all immediate')
fi
if ! restore_quiet_step plain.load "$WORK/data.log" psql "$PG/$DBNAME" -X -v VERBOSITY=verbose -v ON_ERROR_STOP=1 -1 "${load_files[@]}"; then
  # Solo el marcador constante del validador; nunca SQL/valores de una copia real.
  echo 'Importación rechazada por SQL o restricciones' >&2
  exit 1
fi
ref=(--sha "$SHA")
if [[ $MODE = production ]]; then ref=(--tag "$(sed -n 's/^tag=//p' "$WORK/manifest.txt")"); fi
restore_mark plain.manifest
restore_step plain.manifest bash "$ROOT/scripts/backup-manifest.sh" --verify --mode "$MODE" "${ref[@]}" --manifest "$WORK/manifest.txt" --migrations "$SRC/supabase/migrations" --db "$PG/$DBNAME" --data "$WORK/data.sql" | tee -a "$LOG"
echo 'manifiesto verificado (paso intermedio)' >> "$LOG"; VERIFIED=1
