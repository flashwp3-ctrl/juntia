#!/usr/bin/env bash
# SPIKE: pruebas HTTP reales contra PostgREST/GoTrue locales del runner.
# Requiere: API_URL, ANON, SERVICE, DB (ya exportadas y enmascaradas). Escribe ids en $GITHUB_ENV.
set -uo pipefail

req() { # method path token [body] [extra headers...]
  local m="$1" p="$2" tok="$3" body="${4:-}"; shift 4 || shift $#
  local args=(-s -o /tmp/body -w '%{http_code}' -X "$m" "$API_URL$p" -H "apikey: $ANON" -H "Content-Type: application/json")
  [ -n "$tok" ] && args+=(-H "Authorization: Bearer $tok")
  [ -n "$body" ] && args+=(-d "$body")
  for h in "$@"; do args+=(-H "$h"); done
  local code; code=$(curl "${args[@]}")
  echo "HTTP $code $(cat /tmp/body)"
}
admin() { # method path body
  curl -s -w ' HTTP %{http_code}' -X "$1" "$API_URL$2" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" \
    -H "Content-Type: application/json" -d "$3"
  echo
}
jwt_payload() { local p; p=$(echo "$1" | cut -d. -f2 | tr '_-' '/+'); while [ $(( ${#p} % 4 )) -ne 0 ]; do p="$p="; done; echo "$p" | base64 -d; }
jwt_header() { local p; p=$(echo "$1" | cut -d. -f1 | tr '_-' '/+'); while [ $(( ${#p} % 4 )) -ne 0 ]; do p="$p="; done; echo "$p" | base64 -d; }
PW='Spike-Throwaway-Pw-123!'

echo "=== users: admin create (allowlisted alice, bob)"
admin POST /auth/v1/admin/users "{\"email\":\"alice@spike.test\",\"password\":\"$PW\",\"email_confirm\":true}" | jq -c '{id, email, aud, role}' 2>/dev/null || true
admin POST /auth/v1/admin/users "{\"email\":\"bob@spike.test\",\"password\":\"$PW\",\"email_confirm\":true}" >/dev/null

signin() { curl -s "$API_URL/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$1\",\"password\":\"$PW\"}" | jq -r .access_token; }
TA=$(signin alice@spike.test); TB=$(signin bob@spike.test)
echo "::add-mask::$TA"; echo "::add-mask::$TB"
UA=$(jwt_payload "$TA" | jq -r .sub); UB=$(jwt_payload "$TB" | jq -r .sub)
echo "A=$UA"; echo "B=$UB"
echo "UID_A=$UA" >> "$GITHUB_ENV"; echo "UID_B=$UB" >> "$GITHUB_ENV"

echo "=== 2. JWT header + claims of A (decoded, no signature)"
jwt_header "$TA"; echo
jwt_payload "$TA" | jq -c .
echo "=== 2. rpc/spike_whoami as A (what PostgREST sets)"
req POST /rest/v1/rpc/spike_whoami "$TA" '{}'

echo "=== 1a. rpc/spike_add_movement as A (amount 4500000)"
R=$(req POST /rest/v1/rpc/spike_add_movement "$TA" '{"p_amount":4500000}'); echo "$R"
echo "returned == A ? $( [ "$(echo "$R" | sed 's/^HTTP [0-9]* //' | jq -r .)" = "$UA" ] && echo YES || echo NO )"
echo "=== 1a'. rpc/spike_add_movement as A with 9007199254740993 sent as JSON string"
req POST /rest/v1/rpc/spike_add_movement "$TA" '{"p_amount":"9007199254740993"}'
echo "=== 1a''. rpc/spike_add_movement as anon (no user token)"
req POST /rest/v1/rpc/spike_add_movement "" '{"p_amount":1}'
echo "=== 1a'''. rpc/spike_add_movement as A with amount 0 (check constraint)"
req POST /rest/v1/rpc/spike_add_movement "$TA" '{"p_amount":0}'

echo "=== 1b. GET view as A"
req GET '/rest/v1/spike_movements?select=*' "$TA" ''
echo "=== 1b. GET view as B"
req GET '/rest/v1/spike_movements?select=*' "$TB" ''
echo "=== 1b. GET view as anon"
req GET '/rest/v1/spike_movements?select=*' "" ''
MID=$(curl -s "$API_URL/rest/v1/spike_movements?select=id&limit=1" -H "apikey: $ANON" -H "Authorization: Bearer $TA" | jq -r '.[0].id')

echo "=== 1c. direct table access over the API"
echo "-- POST /rest/v1/movements (public)"; req POST /rest/v1/movements "$TA" "{\"owner_id\":\"$UA\",\"amount_minor\":1}"
echo "-- POST movements Content-Profile: juntia_data"; req POST /rest/v1/movements "$TA" "{\"owner_id\":\"$UA\",\"amount_minor\":1}" "Content-Profile: juntia_data"
echo "-- PATCH movements Content-Profile: juntia_data"; req PATCH "/rest/v1/movements?id=eq.$MID" "$TA" '{"amount_minor":2}' "Content-Profile: juntia_data"
echo "-- DELETE movements Content-Profile: juntia_data"; req DELETE "/rest/v1/movements?id=eq.$MID" "$TA" '' "Content-Profile: juntia_data"
echo "-- GET movements Accept-Profile: juntia_data"; req GET '/rest/v1/movements?select=*' "$TA" '' "Accept-Profile: juntia_data"
echo "-- POST rpc/add_movement Content-Profile: juntia_private"; req POST /rest/v1/rpc/add_movement "$TA" '{"p_amount":1}' "Content-Profile: juntia_private"
echo "-- POST view spike_movements (auto-updatable view)"; req POST /rest/v1/spike_movements "$TA" "{\"owner_id\":\"$UA\"}"
echo "-- PATCH view spike_movements"; req PATCH "/rest/v1/spike_movements?id=eq.$MID" "$TA" "{\"owner_id\":\"$UB\"}"
echo "-- DELETE view spike_movements"; req DELETE "/rest/v1/spike_movements?id=eq.$MID" "$TA" ''
echo "-- GraphQL introspection as A (query type fields)"
req POST /graphql/v1 "$TA" '{"query":"{ __schema { queryType { fields { name } } } }"}'

echo "=== 1d. writer variant: A inserts with owner_id = B"
req POST /rest/v1/rpc/spike_add_movement_for "$TA" "{\"p_owner\":\"$UB\",\"p_amount\":100}"
echo "=== 1d. writer variant: A inserts with owner_id = A (control)"
req POST /rest/v1/rpc/spike_add_movement_for "$TA" "{\"p_owner\":\"$UA\",\"p_amount\":100}"
echo "=== 1d'. lock_and_bump A's row as B (select for update + update under RLS)"
req POST /rest/v1/rpc/spike_lock_and_bump "$TB" "{\"p_id\":\"$MID\"}"
echo "=== 1d'. lock_and_bump A's row as A"
req POST /rest/v1/rpc/spike_lock_and_bump "$TA" "{\"p_id\":\"$MID\"}"

echo "=== 3. signup allowlist (Before User Created hook)"
echo "-- signup NOT allowed: mallory@spike.test"
req POST /auth/v1/signup "" "{\"email\":\"mallory@spike.test\",\"password\":\"$PW\"}"
echo "-- signup NOT allowed, uppercase variant: Mallory@Spike.Test"
req POST /auth/v1/signup "" "{\"email\":\"Mallory@Spike.Test\",\"password\":\"$PW\"}"
echo "-- signup allowed: carol@spike.test"
req POST /auth/v1/signup "" "{\"email\":\"carol@spike.test\",\"password\":\"$PW\"}" | cut -c1-120
echo "-- signup allowed but ALREADY REGISTERED: alice@spike.test"
req POST /auth/v1/signup "" "{\"email\":\"alice@spike.test\",\"password\":\"$PW\"}" | cut -c1-300
echo "-- admin API create NOT allowed: dave@spike.test (does the hook apply to admin too?)"
admin POST /auth/v1/admin/users "{\"email\":\"dave@spike.test\",\"password\":\"$PW\",\"email_confirm\":true}"
echo "-- OTP/magic link NOT allowed: POST /auth/v1/otp mallory (create_user default true)"
req POST /auth/v1/otp "" '{"email":"mallory@spike.test","create_user":true}'
echo "-- auth.users rows:"
psql "$DB" -X -A -c "select email from auth.users order by email"
