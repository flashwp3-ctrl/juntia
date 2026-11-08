#!/usr/bin/env bash
# Se importa por el drill y el restaurador; los marcadores no incluyen argumentos.
umask 077
RESTORE_STEP=initialise
RESTORE_DIAGNOSTICS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/restore-diagnostics.mjs"
restore_mark() { RESTORE_STEP=$1; printf 'RESTORE step=%s begin\n' "$RESTORE_STEP"; }
restore_on_error() { local rc=$1 line=$2; printf 'RESTORE FAILED step=%s exit=%s line=%s (raw log withheld)\n' "$RESTORE_STEP" "$rc" "$line"; }
trap 'restore_on_error "$?" "$LINENO"' ERR
restore_step() {
  local label=$1 rc=0; shift
  restore_mark "$label"
  "$@" || rc=$?
  printf 'RESTORE step=%s exit=%s\n' "$label" "$rc"
  return "$rc"
}
restore_quiet_step() {
  local label=$1 log=$2 rc=0; shift 2
  restore_mark "$label"
  "$@" > "$log" 2>&1 || rc=$?
  printf 'RESTORE step=%s exit=%s (raw log withheld)\n' "$label" "$rc"
  if [[ $rc -ne 0 ]]; then node "$RESTORE_DIAGNOSTICS" --describe "$log" || true; fi
  return "$rc"
}
