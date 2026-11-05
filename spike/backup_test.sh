#!/usr/bin/env bash
# SPIKE: copia con pg_dump (no `supabase db dump`), cifrado y restauración (decisión 16.11 + 17).
set -uo pipefail
cd "$RUNNER_TEMP"
BASE="postgresql://postgres:postgres@127.0.0.1:54322"
DB="$BASE/postgres"
counts() { psql "$1" -X -A -t -c "select 'movements='||(select count(*) from juntia_data.movements)||' sum='||(select coalesce(sum(amount_minor),0) from juntia_data.movements)||' allowlist='||(select count(*) from juntia_data.signup_allowlist)||' auth.users='||(select count(*) from auth.users)||' auth.identities='||(select count(*) from auth.identities)" 2>&1; }

echo "=== 4.0 client + server versions"
pg_dump --version; psql "$DB" -X -A -t -c "show server_version"
echo "=== 4.0 counts BEFORE"; counts "$DB"

echo "=== 4.1 FULL logical dump of the postgres database, custom format, as role postgres"
echo '$ pg_dump "postgresql://postgres:***@127.0.0.1:54322/postgres" -Fc -f full.dump'
pg_dump "$DB" -Fc -f full.dump 2> full.err; echo "exit=$?"; head -20 full.err; ls -l full.dump
echo "objects in TOC: $(pg_restore --list full.dump | grep -vc '^;')"

echo "=== 4.2 encrypt (gpg symmetric AES256) with a throwaway passphrase file"
openssl rand -hex 24 > pass.txt
echo '$ gpg --batch --pinentry-mode loopback --passphrase-file pass.txt --symmetric --cipher-algo AES256 -o full.dump.gpg full.dump'
gpg --batch --yes --pinentry-mode loopback --passphrase-file pass.txt --symmetric --cipher-algo AES256 -o full.dump.gpg full.dump 2>&1 | grep -v -i passphrase
gpg --list-packets --batch --pinentry-mode loopback --passphrase-file pass.txt full.dump.gpg 2>/dev/null | grep -E 'symkey|encrypted data' | head -3
rm -f full.dump
echo '$ gpg --batch --pinentry-mode loopback --passphrase-file pass.txt -d -o full.dec.dump full.dump.gpg'
gpg --batch --yes --pinentry-mode loopback --passphrase-file pass.txt -d -o full.dec.dump full.dump.gpg 2>&1 | grep -v -i passphrase
ls -l full.dump.gpg full.dec.dump
echo "--- wrong passphrase must fail:"
echo wrong > bad.txt; gpg --batch --yes --pinentry-mode loopback --passphrase-file bad.txt -d -o /dev/null full.dump.gpg 2>&1 | tail -2

echo "=== 4.3 restore A: full dump into a FRESH database on the same cluster"
psql "$DB" -X -c "create database restore_full"
echo '$ pg_restore -d .../restore_full full.dec.dump'
pg_restore -d "$BASE/restore_full" full.dec.dump 2> restoreA.err; echo "exit=$?"
echo "errors: $(grep -c 'error:' restoreA.err)"; grep 'error:' restoreA.err | sed 's/^pg_restore: //' | sort | uniq -c | sort -rn | head -15
grep -i 'errors ignored' restoreA.err
echo "--- counts in restore_full:"; counts "$BASE/restore_full"

echo "(run 3: -n is ignored when -t is present, so the schema goes as -t juntia_data.*)"
echo "=== 4.4 restore B: data-only dump (app schema + auth users/identities) -> supabase db reset -> load"
echo '$ pg_dump "$DB" --data-only --inserts --on-conflict-do-nothing -t 'juntia_data.*' -t auth.users -t auth.identities -f data.sql'
pg_dump "$DB" --data-only --inserts --on-conflict-do-nothing -t 'juntia_data.*' -t auth.users -t auth.identities -f data.sql 2> dataB.err; echo "exit=$?"; head -5 dataB.err
gpg --batch --yes --pinentry-mode loopback --passphrase-file pass.txt --symmetric --cipher-algo AES256 -o data.sql.gpg data.sql 2>/dev/null; ls -l data.sql.gpg
(cd "$GITHUB_WORKSPACE" && supabase db reset --workdir spike 2>&1 | grep -v -iE 'key|secret|eyJ' | tail -5)
echo "--- counts after reset (should be empty except allowlist seed):"; counts "$DB"
gpg --batch --yes --pinentry-mode loopback --passphrase-file pass.txt -d -o data.dec.sql data.sql.gpg 2>/dev/null
echo '$ psql "$DB" -v ON_ERROR_STOP=1 -1 -f data.dec.sql'
psql "$DB" -X -q -v ON_ERROR_STOP=1 -1 -f data.dec.sql > loadB.out 2>&1; echo "exit=$?"; grep -iE 'error|denied' loadB.out | head -10
echo "--- counts after restore B:"; counts "$DB"
echo "--- can a restored user still sign in?"
curl -s -o /dev/null -w 'signin alice after restore: HTTP %{http_code}\n' "$API_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" -d '{"email":"alice@spike.test","password":"Spike-Throwaway-Pw-123!"}'
rm -f pass.txt bad.txt full.dec.dump data.sql data.dec.sql
