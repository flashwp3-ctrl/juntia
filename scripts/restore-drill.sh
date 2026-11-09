#!/usr/bin/env bash
# T029–T030 / FR-059, T026b y 004: dos restauraciones vacías y controles negativos.
# Cambio del protocolo de restauración (AGENTS §17), autorizado por el gestor:
# order-restore-data carga P0-3 con solo cuatro triggers de negocio nombrados
# suspendidos, un arco FK diferido, reactivación explícita y doble comprobación
# de restricciones. check-invariants corre antes del COMMIT de psql -1.
# Nunca se suspenden los triggers de P0-1/P0-2, los de solo inserción ni FK.
set -Eeuo pipefail
ROOT=$(git rev-parse --show-toplevel)
source "$ROOT/scripts/restore-progress.sh"
for required in backup-manifest.sh backup.sh restore-plain.sh; do
  test -f "$ROOT/scripts/$required" || { echo "FALTA: scripts/$required" >&2; exit 1; }
done
: "${GITHUB_SHA:?solo en el runner de CI}" "${DB_URL:?}" "${RUNNER_TEMP:?}"
WORK=$(mktemp -d "$RUNNER_TEMP/restore-drill.XXXXXX")
PG=${PG:-postgresql://postgres@127.0.0.1:5432}
export PG JUNTIA_BACKUP_PASSPHRASE
JUNTIA_BACKUP_PASSPHRASE=$(openssl rand -hex 32)
cleanup() { rc=$?; trap - ERR; rm -rf "$WORK"; printf 'RESTORE drill exit=%s\n' "$rc"; exit "$rc"; }
trap cleanup EXIT
export DRILL_USER_FILE="$WORK/user.json"
restore_quiet_step seed "$WORK/seed.log" node "$ROOT/tests/support/restore-user.mjs" seed
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
backup_copy() { (cd "$WORK/good"; PATH="$WORK/concurrent-bin:$PATH" DB="$DB_URL" bash "$ROOT/scripts/backup.sh" --mode ci --sha "$GITHUB_SHA"); }
restore_step backup backup_copy
# backup.sh conserva el diagnóstico de pg_dump en su temporal privado; el marcador
# del test confirma fuera de él que la escritura sí se ejecutó (sin esperas fijas).
test -f "$DRILL_SNAPSHOT_MARKER"
echo "F40-1: escritura concurrente confirmada; snapshot importado=$(cat "$DRILL_SNAPSHOT_MARKER")"
ARCHIVE=$(find "$WORK/good" -name 'juntia-*.tar.gpg')
restore_quiet_step unpack.decrypt "$WORK/decrypt.log" gpg --batch --pinentry-mode loopback --passphrase-fd 3 -d -o "$WORK/copy.tar" "$ARCHIVE" 3<<<"$JUNTIA_BACKUP_PASSPHRASE"
restore_step unpack.tar tar -xf "$WORK/copy.tar" -C "$WORK"
# El manifiesto dinámico debe cubrir recuento y huella de las seis tablas nuevas.
restore_mark manifest.tables
for table in budgets budget_versions savings_goals goal_ledger_entries goal_usage_allocations goal_usage_confirmations; do
  grep -Eq "^table=juntia_data[.]$table[|][0-9]+[|][0-9a-f]{32}$" "$WORK/manifest.txt"
done
# Camino A: db reset destruye los datos anteriores; nunca usa la semilla.
restore_quiet_step path-a.reset "$WORK/reset.log" supabase db reset --no-seed
restore_step path-a.order node "$ROOT/scripts/order-restore-data.mjs" "$WORK/data.sql" "$WORK/ordered.sql"
restore_quiet_step path-a.role "$WORK/path-a-role.log" psql "$DB_URL" -X -qAt -v ON_ERROR_STOP=1 -f "$ROOT/supabase/restore/describe-role.sql"
cat "$WORK/path-a-role.log"
restore_quiet_step path-a.load "$WORK/path-a-sql.log" psql "$DB_URL" -X -v VERBOSITY=verbose -v ON_ERROR_STOP=1 -1 -f "$WORK/ordered.sql" -f "$ROOT/supabase/restore/check-invariants.sql" -c 'set constraints all immediate'
restore_step path-a.manifest bash "$ROOT/scripts/backup-manifest.sh" --verify --mode ci --sha "$GITHUB_SHA" --manifest "$WORK/manifest.txt" --migrations "$ROOT/supabase/migrations" --db "$DB_URL" --data "$WORK/data.sql"
restore_quiet_step path-a.login "$WORK/login.log" node "$ROOT/tests/support/restore-user.mjs" login
echo 'Camino A: MANIFIESTO COINCIDE; usuario restaurado entra'
restore_mark snapshot.check
test "$(cat "$DRILL_SNAPSHOT_MARKER")" = true
test "$(psql "$DB_URL" -X -qAt -v ON_ERROR_STOP=1 -c "select count(*) from juntia_data.signup_allowlist where email='snapshot-concurrent@seed.test'")" = 0
echo 'F40-1: dump y manifiesto comparten instantánea; restauración A excluye la escritura concurrente'
restore_path_b() { (cd "$WORK/good"; bash "$ROOT/scripts/restore-plain.sh" "$ARCHIVE" --mode ci --sha "$GITHUB_SHA"); }
restore_step path-b.restore restore_path_b
echo 'Camino B: MANIFIESTO COINCIDE; base temporal borrada'
no_database() { test "$(psql "$PG/postgres" -X -qAt -v ON_ERROR_STOP=1 -c "select count(*) from pg_database where datname like 'juntia_restore%'")" = 0; }
negative() {
  local name=$1; shift
  local rc=0
  restore_mark "$name"
  "$@" > "$WORK/$name.log" 2>&1 || rc=$?
  printf 'RESTORE step=%s exit=%s expected=nonzero\n' "$name" "$rc"
  if [[ $rc = 0 ]]; then echo "RESTORE unexpected-success step=$name (raw log withheld)"; return 1; fi
  node "$ROOT/scripts/restore-diagnostics.mjs" --describe "$WORK/$name.log"
  ! grep -Eq 'RESTAURACIÓN LISTA|COPIA LISTA' "$WORK/$name.log"
  echo "$name: rechazo esperado, exit=$rc, sin marca de éxito"
}
pack() {
  restore_quiet_step negative.pack "$WORK/pack.log" tar -cf "$WORK/negative.tar" -C "$WORK/altered" data.sql manifest.txt
  restore_quiet_step negative.encrypt "$WORK/encrypt.log" gpg --batch --yes --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 -o "$WORK/negative.tar.gpg" "$WORK/negative.tar" 3<<<"$JUNTIA_BACKUP_PASSPHRASE"
}
restore_negative() { (cd "$WORK/altered"; bash "$ROOT/scripts/restore-plain.sh" "$WORK/negative.tar.gpg" --mode ci --sha "$GITHUB_SHA"); }
mkdir "$WORK/altered" "$WORK/broken"
cp "$ROOT"/supabase/migrations/*.sql "$WORK/broken/"
echo 'select deliberately_broken_migration();' > "$WORK/broken/20990101000000_broken.sql"
cp "$WORK/data.sql" "$WORK/manifest.txt" "$WORK/altered/"
restore_mark N1.prepare
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
restore_mark N5.cleanup
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
restore_mark N8.cleanup
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
restore_mark N10.prepare
cp "$WORK/data.sql" "$WORK/altered/data.sql"
cp "$WORK/manifest.txt" "$WORK/altered/manifest.txt"
restore_step N10.corrupt node "$ROOT/tests/support/corrupt-restore-couple.mjs" "$WORK/altered/data.sql" "$DRILL_USER_FILE"
bad_hash=$(sha256sum "$WORK/altered/data.sql" | cut -d' ' -f1)
sed -i "s/^data_sha256=.*/data_sha256=$bad_hash/" "$WORK/altered/manifest.txt"
pack
negative N10-couple-invariant restore_negative
restore_step N10.cause node "$ROOT/scripts/restore-diagnostics.mjs" --expect-couple "$WORK/N10-couple-invariant.log"
no_database
echo 'N10: pareja inválida rechazada por invariante o trigger de membresía, con hash de datos correcto'
no_database
# N11: una copia distinta por cada regla P0-3; el hash de datos es correcto.
# El marcador comprueba que rechazó la regla/constraint, no solo el manifiesto.
restore_quiet_step N11.list "$WORK/planning-rules.txt" node "$ROOT/tests/support/corrupt-restore-planning.mjs" --list
planning_controls=0
while IFS='|' read -r rule marker; do
  restore_mark "N11-$rule.prepare"
  cp "$WORK/data.sql" "$WORK/altered/data.sql"
  cp "$WORK/manifest.txt" "$WORK/altered/manifest.txt"
  node "$ROOT/tests/support/corrupt-restore-planning.mjs" "$WORK/altered/data.sql" "$DRILL_USER_FILE" "$rule"
  bad_hash=$(sha256sum "$WORK/altered/data.sql" | cut -d' ' -f1)
  sed -i "s/^data_sha256=.*/data_sha256=$bad_hash/" "$WORK/altered/manifest.txt"
  pack
  name="N11-planning-$rule"
  negative "$name" restore_negative
  if [[ $marker = constraint ]]; then
    restore_step "$name.cause" node "$ROOT/scripts/restore-diagnostics.mjs" --expect-constraint "$WORK/$name.log"
  else
    restore_step "$name.cause" grep -Fq "RESTORE_INVARIANTS: $marker" "$WORK/$name.log"
  fi
  no_database
  planning_controls=$((planning_controls+1))
done < "$WORK/planning-rules.txt"
echo "ENSAYO LISTO: A y B, diez controles previos y $planning_controls controles P0-3 rechazados"
