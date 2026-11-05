#!/usr/bin/env bash
# T027: mismo formato y mismas comprobaciones para CI y producción; solo sumas y recuentos.
set -euo pipefail
ACTION= MODE= SHA= TAG= MIGRATIONS= DB= DATA= MANIFEST=
while (($#)); do
  case "$1" in
    --write|--verify) ACTION=${1#--}; shift ;;
    --mode) MODE=$2; shift 2 ;; --sha) SHA=$2; shift 2 ;; --tag) TAG=$2; shift 2 ;;
    --migrations) MIGRATIONS=$2; shift 2 ;; --db) DB=$2; shift 2 ;; --data) DATA=$2; shift 2 ;;
    --manifest) MANIFEST=$2; shift 2 ;; *) echo 'Argumento de manifiesto no válido' >&2; exit 1 ;;
  esac
done
test "$ACTION" = write || test "$ACTION" = verify
test -d "$MIGRATIONS"; test -f "$DATA"; test -n "$DB"
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
if [[ $MODE = production ]]; then
  if [[ $ACTION = verify && -z $TAG ]]; then TAG=$(sed -n 's/^tag=//p' "$MANIFEST"); fi
  [[ $TAG = db-prod-* ]]
  SHA=$(git -C "$ROOT" rev-parse --verify "$TAG^{commit}")
elif [[ $MODE = ci ]]; then
  [[ $SHA =~ ^[0-9a-f]{40}$ ]]
  test "$(git -C "$ROOT" rev-parse --verify "$SHA^{commit}")" = "$SHA"
  test -z "$TAG"
else exit 1; fi
WORK=$(mktemp -d)
trap 'rc=$?; rm -rf "$WORK"; exit "$rc"' EXIT
export PGTZ=UTC PGDATESTYLE=ISO
# Cada fichero debe corresponder exactamente al commit elegido, no basta su nombre.
git -C "$ROOT" ls-tree "$SHA:supabase/migrations" | awk '{print $3 "  " $4}' > "$WORK/git-files"
for file in "$MIGRATIONS"/*.sql; do
  name=$(basename "$file")
  expected=$(awk -v name="$name" '$2==name {print $1}' "$WORK/git-files")
  test -n "$expected"; test "$(git -C "$ROOT" hash-object "$file")" = "$expected"
  printf '%s\n' "${name%%_*}"
done | sort > "$WORK/expected-versions"
test "$(wc -l < "$WORK/git-files")" = "$(wc -l < "$WORK/expected-versions")"
psql "$DB" -X -qAt -v ON_ERROR_STOP=1 -c 'select version from supabase_migrations.schema_migrations order by version' > "$WORK/applied-versions"
cmp "$WORK/expected-versions" "$WORK/applied-versions"
{
  printf 'mode=%s\nsha=%s\n' "$MODE" "$SHA"
  [[ $MODE != production ]] || printf 'tag=%s\n' "$TAG"
  sed 's/^/migration=/' "$WORK/applied-versions"
  printf 'data_sha256=%s\n' "$(sha256sum "$DATA" | cut -d' ' -f1)"
  # La clave primaria completa fija el orden, incluidos los tres campos de idempotencia.
  psql "$DB" -X -qAt -v ON_ERROR_STOP=1 <<'SQL' > "$WORK/table-queries"
select format('select %L || count(*)::text || ''|'' || coalesce(md5(string_agg(t::text, ''|'' order by %s)),md5('''')) from %I.%I t;',
 'table='||n.nspname||'.'||c.relname||'|',
 (select string_agg(format('t.%I',a.attname),',' order by k.ordinality)
  from pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum,ordinality)
  join pg_attribute a on a.attrelid=c.oid and a.attnum=k.attnum
  where i.indrelid=c.oid and i.indisprimary),n.nspname,c.relname)
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and (n.nspname='juntia_data' or (n.nspname='auth' and c.relname in ('users','identities')))
order by n.nspname,c.relname;
SQL
  test -s "$WORK/table-queries"
  psql "$DB" -X -qAt -v ON_ERROR_STOP=1 -f "$WORK/table-queries"
} > "$WORK/actual"
if [[ $ACTION = write ]]; then cat "$WORK/actual";
else
  diff -u "$MANIFEST" "$WORK/actual"
  cat "$WORK/actual"
  echo 'MANIFIESTO COINCIDE'
fi
