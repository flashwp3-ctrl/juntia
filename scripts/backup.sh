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
cleanup() {
  rc=$?
  if [[ $rc -ne 0 && ${#PUBLISHED[@]} -gt 0 ]]; then rm -f "${PUBLISHED[@]}"; fi
  git -C "$ROOT" worktree remove --force "$SRC" 2>/dev/null || true
  rm -rf "$WORK"
  exit "$rc"
}
trap cleanup EXIT
test ! -e "$OUT_GPG"; test ! -e "$OUT_MAN"
git -C "$ROOT" worktree add --detach "$SRC" "$REF" > "$WORK/worktree.log" 2>&1
pg_dump "$DB" --data-only --column-inserts --on-conflict-do-nothing -t 'juntia_data.*' -t auth.users -t auth.identities -f "$WORK/data.sql" > "$WORK/dump.log" 2>&1
bash "$ROOT/scripts/backup-manifest.sh" --write --mode "$MODE" "${manifest_ref[@]}" --migrations "$SRC/supabase/migrations" --db "$DB" --data "$WORK/data.sql" > "$WORK/manifest.txt"
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
