#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mode="${1:---check}"
source_root="${OPENCLAW_SOURCE:?Set OPENCLAW_SOURCE to the tested OpenClaw source checkout}"
source_dist="$source_root/extensions/voice-call/dist"
source_package="$source_root/extensions/voice-call/package.json"
official_root="$(node "$project_root/scripts/resolve-trusted-voice-call-root.mjs")"
official_dist="$official_root/dist"
official_package="$official_root/package.json"
rollback_dist="$official_root/dist.pre-task-call"
staged_dist="$official_root/dist.task-call-staged"

test -f "$source_dist/index.js"
test -f "$source_package"
test -f "$official_package"
test -d "$official_dist"

source_version="$(jq -r '.version' "$source_package")"
official_version="$(jq -r '.version' "$official_package")"
test "$source_version" = "$official_version"

case "$mode" in
  --check)
    if diff -qr "$source_dist" "$official_dist" >/dev/null; then
      printf 'integrated: trusted Voice Call dist matches tested %s build\n' "$official_version"
    else
      printf 'ready: versions match; trusted Voice Call dist differs from tested %s build\n' "$official_version"
    fi
    exit 0
    ;;
  --apply)
    ;;
  *)
    printf 'usage: %s [--check|--apply]\n' "$0" >&2
    exit 2
    ;;
esac

test ! -e "$rollback_dist"
test ! -e "$staged_dist"

cp -a "$source_dist" "$staged_dist"
diff -qr "$source_dist" "$staged_dist"

restore_on_error() {
  if test ! -d "$official_dist" && test -d "$rollback_dist"; then
    mv "$rollback_dist" "$official_dist"
  fi
}

trap restore_on_error ERR
mv "$official_dist" "$rollback_dist"
mv "$staged_dist" "$official_dist"
diff -qr "$source_dist" "$official_dist"
trap - ERR

printf 'Deployed tested Voice Call dist for %s\n' "$official_version"
printf 'Rollback: %s\n' "$rollback_dist"
