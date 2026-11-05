#!/usr/bin/env bash
# T028 / quickstart §4.1: publicación atómica, nunca sobrescribe, descifra y compara.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
: "${DB:?exporta DB con la conexión directa}"
MODE=production; SHA=; TAG=
while (($#)); do
  case "$1" in --mode) MODE=$2; shift 2 ;; --sha) SHA=$2; shift 2 ;; *) exit 1 ;; esac
done
if [[ $MODE = production ]]; then
  test -z "${BACKUP_NAME:-}${BACKUP_TEST_CORRUPT:-}"
  TAG=$(git describe --tags --match 'db-prod-*' --abbrev=0 origin/main)
  REF=$TAG; manifest_ref=(--tag "$TAG")
elif [[ $MODE = ci && ${GITHUB_ACTIONS:-} = true ]]; then
  [[ $SHA =~ ^[0-9a-f]{40}$ ]]; REF=$SHA; manifest_ref=(--sha "$SHA")
else exit 1; fi
NAME=${BACKUP_NAME:-juntia-$(date +%Y-%m-%dT%H%M%S)}
[[ $NAME =~ ^juntia-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{6}$ ]]
OUT_GPG="$PWD/$NAME.tar.gpg"; OUT_MAN="$PWD/$NAME.manifest.txt"
WORK=$(mktemp -d "$PWD/.juntia-backup.XXXXXX"); SRC="$WORK/src"; PUBLISHED=()
SNAPSHOT_PID= SNAPSHOT_INPUT= SNAPSHOT_OUTPUT=
cleanup() {
  rc=$?
  if [[ -n $SNAPSHOT_PID ]]; then
    # EOF cierra psql y revierte la transacción de solo lectura si hubo fallo.
    if [[ -n $SNAPSHOT_INPUT ]]; then exec {SNAPSHOT_INPUT}>&- || true; fi
    if [[ -n $SNAPSHOT_OUTPUT ]]; then exec {SNAPSHOT_OUTPUT}<&- || true; fi
    wait "$SNAPSHOT_PID" || true
  fi
  if [[ $rc -ne 0 && ${#PUBLISHED[@]} -gt 0 ]]; then rm -f "${PUBLISHED[@]}"; fi
  git -C "$ROOT" worktree remove --force "$SRC" 2>/dev/null || true
  rm -rf "$WORK"
  exit "$rc"
}
trap cleanup EXIT
test ! -e "$OUT_GPG"; test ! -e "$OUT_MAN"
git -C "$ROOT" worktree add --detach "$SRC" "$REF" > "$WORK/worktree.log" 2>&1
# La sesión exportadora debe seguir viva hasta terminar dump Y manifiesto.
# Requiere conexión directa o pooler de sesión, nunca de transacción.
coproc SNAPSHOT_EXPORTER {
  PGAPPNAME="juntia_backup_snapshot_$$" psql "$DB" -X -qAt -v ON_ERROR_STOP=1 2> "$WORK/snapshot.log"
}
SNAPSHOT_PID=$SNAPSHOT_EXPORTER_PID
# Duplicar los descriptores evita depender de la duración de las variables coproc.
exec {SNAPSHOT_INPUT}>&"${SNAPSHOT_EXPORTER[1]}"
exec {SNAPSHOT_OUTPUT}<&"${SNAPSHOT_EXPORTER[0]}"
# El padre solo conserva los duplicados: en el trap EOF debe llegar realmente a psql.
original_input=${SNAPSHOT_EXPORTER[1]}; original_output=${SNAPSHOT_EXPORTER[0]}
exec {original_input}>&-
exec {original_output}<&-
printf 'begin isolation level repeatable read read only;\nselect pg_export_snapshot();\n' >&"$SNAPSHOT_INPUT"
IFS= read -r -t 30 SNAPSHOT <&"$SNAPSHOT_OUTPUT"
[[ $SNAPSHOT =~ ^[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+$ ]]
pg_dump "$DB" --snapshot="$SNAPSHOT" --data-only --column-inserts --on-conflict-do-nothing -t 'juntia_data.*' -t auth.users -t auth.identities -f "$WORK/data.sql" > "$WORK/dump.log" 2>&1
bash "$ROOT/scripts/backup-manifest.sh" --write --mode "$MODE" "${manifest_ref[@]}" --snapshot "$SNAPSHOT" --migrations "$SRC/supabase/migrations" --db "$DB" --data "$WORK/data.sql" > "$WORK/manifest.txt"
printf 'commit;\n\\q\n' >&"$SNAPSHOT_INPUT"
exec {SNAPSHOT_INPUT}>&-
exec {SNAPSHOT_OUTPUT}<&-
wait "$SNAPSHOT_PID"
SNAPSHOT_PID=
tar -cf "$WORK/juntia.tar" -C "$WORK" data.sql manifest.txt
if [[ $MODE = ci ]]; then
  : "${JUNTIA_BACKUP_PASSPHRASE:?solo frase sintética del runner}"
  gpg --batch --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 -o "$WORK/juntia.tar.gpg" "$WORK/juntia.tar" 3<<<"$JUNTIA_BACKUP_PASSPHRASE"
  if [[ ${BACKUP_TEST_CORRUPT:-0} = 1 ]]; then printf 'corrupt synthetic archive' > "$WORK/juntia.tar.gpg"; fi
  gpg --batch --pinentry-mode loopback --passphrase-fd 3 -d -o "$WORK/check.tar" "$WORK/juntia.tar.gpg" 3<<<"$JUNTIA_BACKUP_PASSPHRASE"
else
  gpg --symmetric --cipher-algo AES256 -o "$WORK/juntia.tar.gpg" "$WORK/juntia.tar"
  gpg -d -o "$WORK/check.tar" "$WORK/juntia.tar.gpg"
fi
cmp -s "$WORK/juntia.tar" "$WORK/check.tar"
ln "$WORK/juntia.tar.gpg" "$OUT_GPG"; PUBLISHED+=("$OUT_GPG")
ln "$WORK/manifest.txt" "$OUT_MAN"; PUBLISHED+=("$OUT_MAN")
echo "COPIA LISTA: $NAME.tar.gpg (modo $MODE, referencia $REF)"
